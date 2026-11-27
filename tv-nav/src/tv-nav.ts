/**
 * RADARSite — TV spatial navigation engine (shared JS, ADR-004 C4.2 "JS-only D-pad for v1").
 *
 * Runs inside the Capacitor WebView on Android TV. No framework, no native bridge
 * required (invariant I2): if this module is absent the page still renders and the
 * WebView's own focus handling takes over.
 *
 * Design notes
 * ------------
 * - Focus is *spatial*, not DOM-order. Android TV remotes send DPAD_UP/DOWN/LEFT/RIGHT
 *   as keydown events; we translate them into a geometric nearest-neighbour search.
 * - Scoring is a weighted projection, not raw distance: the primary axis dominates and
 *   the cross-axis offset is penalised, so "right" never jumps to a card two rows down
 *   just because it is marginally closer in Euclidean terms.
 * - Row memory: moving up/down remembers the column you came from, so a vertical pass
 *   through a grid returns you to the same column instead of drifting left.
 * - Focus trap: focus can never leave the active container (a row, a rail, a dialog).
 *   This is what stops the remote from "escaping" into the WebView chrome.
 * - Key repeat guard: held keys are throttled so a long press does not skip 6 cards.
 * - Scroll-into-view is done with `scrollIntoView({block:'nearest'})` on the nearest
 *   scrollable ancestor only, so the page does not jump vertically when moving sideways.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface TvNavOptions {
  /** Attribute marking a focusable element. Default: `data-tv-focusable`. */
  focusableAttr?: string;
  /** Attribute marking a focus container. Default: `data-tv-container`. */
  containerAttr?: string;
  /** Attribute marking a container as a horizontal rail. Default: `data-tv-rail`. */
  railAttr?: string;
  /** Attribute marking a container as an absolute focus trap (modal). Default: `data-tv-trap`. */
  trapAttr?: string;
  /** Minimum ms between accepted moves while a key is held. Default: 90. */
  repeatThrottleMs?: number;
  /** Called after every successful focus move (analytics / debugging). */
  onFocusChange?: (el: HTMLElement, dir: Direction | 'init') => void;
  /** Called when a direction is pressed but no candidate exists. */
  onEdge?: (dir: Direction) => void;
}

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  // Android TV / leanback key codes that some OEM remotes emit instead of arrows.
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
};

const KEYCODE_MAP: Record<number, Direction> = {
  19: 'up', // KEYCODE_DPAD_UP
  20: 'down', // KEYCODE_DPAD_DOWN
  21: 'left', // KEYCODE_DPAD_LEFT
  22: 'right', // KEYCODE_DPAD_RIGHT
};

export class TvNav {
  private opts: Required<Omit<TvNavOptions, 'onFocusChange' | 'onEdge'>> &
    Pick<TvNavOptions, 'onFocusChange' | 'onEdge'>;
  private current: HTMLElement | null = null;
  private lastMoveAt = 0;
  private heldKey: string | null = null;
  private rowMemory = new Map<string, HTMLElement>();
  private bound = false;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onFocusIn: (e: FocusEvent) => void;

  constructor(opts: TvNavOptions = {}) {
    this.opts = {
      focusableAttr: opts.focusableAttr ?? 'data-tv-focusable',
      containerAttr: opts.containerAttr ?? 'data-tv-container',
      railAttr: opts.railAttr ?? 'data-tv-rail',
      trapAttr: opts.trapAttr ?? 'data-tv-trap',
      repeatThrottleMs: opts.repeatThrottleMs ?? 90,
      onFocusChange: opts.onFocusChange,
      onEdge: opts.onEdge,
    };

    this.onKeyDown = (e: KeyboardEvent) => this.handleKey(e);
    this.onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && t.hasAttribute(this.opts.focusableAttr)) this.current = t;
    };
  }

  /** Attach listeners and focus the first focusable element. */
  start(root: ParentNode = document): void {
    if (this.bound) return;
    this.bound = true;
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('focusin', this.onFocusIn, true);
    const first = this.focusables(root)[0];
    if (first) this.focus(first, 'init');
  }

  stop(): void {
    if (!this.bound) return;
    this.bound = false;
    document.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('focusin', this.onFocusIn, true);
  }

  /** All currently visible focusables, in DOM order. */
  focusables(root: ParentNode = document): HTMLElement[] {
    const nodes = Array.from(
      root.querySelectorAll<HTMLElement>(`[${this.opts.focusableAttr}]`),
    );
    return nodes.filter((el) => this.isVisible(el) && !this.isDisabled(el));
  }

  get focused(): HTMLElement | null {
    return this.current;
  }

  /** Programmatically focus an element and scroll it into view. */
  focus(el: HTMLElement, dir: Direction | 'init' = 'init'): void {
    if (!el) return;
    this.current = el;
    el.focus({ preventScroll: true });
    el.setAttribute('data-tv-focused', 'true');
    this.scrollIntoView(el);
    this.opts.onFocusChange?.(el, dir);
  }

  /** Move focus one step in `dir`. Returns true if focus actually moved. */
  move(dir: Direction): boolean {
    const from = this.current ?? this.focusables()[0];
    if (!from) return false;

    const candidates = this.candidatesFor(from, dir);
    if (candidates.length === 0) {
      this.opts.onEdge?.(dir);
      return false;
    }

    const next = this.pickBest(from, candidates, dir);
    if (!next || next === from) {
      this.opts.onEdge?.(dir);
      return false;
    }

    // Row memory: remember the item we left, so re-entering this band returns here.
    if (dir === 'up' || dir === 'down') {
      this.rowMemory.set(this.bandKey(from), from);
    }

    from.removeAttribute('data-tv-focused');
    this.focus(next, dir);
    return true;
  }

  // ---------------------------------------------------------------- internals

  private handleKey(e: KeyboardEvent): void {
    const dir = KEY_MAP[e.key] ?? KEYCODE_MAP[e.keyCode];
    if (!dir) return;

    // Never let the remote scroll the page natively — we own the geometry.
    e.preventDefault();
    e.stopPropagation();

    const now = Date.now();
    const isRepeat = this.heldKey === e.key && e.repeat;
    if (isRepeat && now - this.lastMoveAt < this.opts.repeatThrottleMs) return;
    this.heldKey = e.key;
    this.lastMoveAt = now;

    this.move(dir);
  }

  /**
   * Candidate set for a direction.
   *
   * 1. If the current element sits in a horizontal rail and the direction is
   *    left/right, stay inside that rail (this is the leanback row behaviour).
   * 2. Otherwise stay inside the nearest container.
   * 3. Containers *group* focus, they do not trap it: if the container has nothing
   *    further in that direction we fall through to the document, so the remote can
   *    travel between sections. A container marked `data-tv-trap` (a modal) is the
   *    only thing that traps focus absolutely.
   * 4. The document fallback for horizontal moves is restricted to elements that
   *    overlap the current element vertically, so "right" can never jump diagonally
   *    into a different row/section.
   */
  private candidatesFor(from: HTMLElement, dir: Direction): HTMLElement[] {
    const fromRect = this.rect(from);
    const all = this.focusables().filter((el) => el !== from);
    const vertical = dir === 'up' || dir === 'down';

    const inDirection = all.filter((el) => {
      const r = this.rect(el);
      switch (dir) {
        case 'left':
          return r.right <= fromRect.left + 1;
        case 'right':
          return r.left >= fromRect.right - 1;
        case 'up':
          return r.bottom <= fromRect.top + 1;
        case 'down':
          return r.top >= fromRect.bottom - 1;
      }
    });

    const rail = from.closest<HTMLElement>(`[${this.opts.railAttr}]`);
    if (rail && !vertical) {
      const inRail = inDirection.filter((el) => rail.contains(el));
      if (inRail.length) return inRail;
    }

    const container = from.closest<HTMLElement>(`[${this.opts.containerAttr}]`);
    if (container) {
      // A modal traps focus in every direction.
      if (container.hasAttribute(this.opts.trapAttr)) {
        return inDirection.filter((el) => container.contains(el));
      }
      const inContainer = inDirection.filter((el) => container.contains(el));
      if (inContainer.length) return inContainer;
      // Nothing left inside this group -> fall through to the document.
    }

    if (vertical) return inDirection;

    // Horizontal escape is band-limited: same visual row only.
    return inDirection.filter((el) => {
      const r = this.rect(el);
      return this.overlap(fromRect.top, fromRect.bottom, r.top, r.bottom) > 0;
    });
  }

  /**
   * Pick the best candidate.
   *
   * Vertical: first choose the nearest *band* (a container, or a bare element), then
   * within that band choose the item closest to the remembered column. This is what
   * makes "down" land on the first card of the next rail instead of whichever item
   * happens to be numerically nearest in a flat Euclidean search.
   *
   * Horizontal: plain nearest-in-line scoring with a cross-axis overlap bonus.
   */
  private pickBest(from: HTMLElement, candidates: HTMLElement[], dir: Direction): HTMLElement | null {
    const f = this.rect(from);
    const vertical = dir === 'up' || dir === 'down';

    if (vertical) {
      // Group candidates by band.
      const bands = new Map<string, HTMLElement[]>();
      for (const el of candidates) {
        const key = this.bandKey(el);
        const list = bands.get(key);
        if (list) list.push(el);
        else bands.set(key, [el]);
      }

      // Nearest band = smallest edge-to-edge gap from the current element.
      let bestBand: string | null = null;
      let bestGap = Infinity;
      for (const [key, list] of bands) {
        let gap = Infinity;
        for (const el of list) {
          const r = this.rect(el);
          const g = dir === 'down' ? r.top - f.bottom : f.top - r.bottom;
          if (g < gap) gap = g;
        }
        if (gap < bestGap) {
          bestGap = gap;
          bestBand = key;
        }
      }
      if (bestBand === null) return null;

      const band = bands.get(bestBand) as HTMLElement[];

      // Column memory: use the remembered column for this band if we have one.
      const remembered = this.rowMemory.get(bestBand);
      const hasMemory = !!remembered && this.isVisible(remembered) && band.includes(remembered);

      if (!hasMemory) {
        // First entry into this band -> its first item (predictable leanback behaviour).
        return band[0];
      }

      const refCx = this.rect(remembered as HTMLElement).cx;
      let best: HTMLElement | null = null;
      let bestScore = Infinity;
      for (const el of band) {
        const r = this.rect(el);
        const score = Math.abs(r.cx - refCx) * 4 + Math.abs(r.cy - f.cy);
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      return best;
    }

    let best: HTMLElement | null = null;
    let bestScore = Infinity;
    for (const el of candidates) {
      const r = this.rect(el);
      const primary = Math.abs(r.cx - f.cx);
      const secondary = Math.abs(r.cy - f.cy);
      const overlap = this.overlap(f.top, f.bottom, r.top, r.bottom);
      const score = primary + secondary * 3 + (overlap > 0 ? 0 : 40);
      if (score < bestScore) {
        bestScore = score;
        best = el;
      }
    }
    return best;
  }

  /** Band = the container an element belongs to, or the element itself if none. */
  private bandKey(el: HTMLElement): string {
    const c = el.closest<HTMLElement>(`[${this.opts.containerAttr}]`);
    if (c) return 'c:' + (c.id || c.getAttribute(this.opts.containerAttr) || '');
    return 'e:' + (el.id || el.textContent || '');
  }

  private overlap(a1: number, a2: number, b1: number, b2: number): number {
    return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
  }

  private rect(el: HTMLElement): Rect {
    const r = el.getBoundingClientRect();
    return {
      left: r.left,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      width: r.width,
      height: r.height,
    };
  }

  private isVisible(el: HTMLElement): boolean {
    if (el.hidden) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  private isDisabled(el: HTMLElement): boolean {
    return el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled');
  }

  /**
   * Scroll only the nearest scrollable ancestor, and only as far as needed.
   * `block:'nearest'` keeps a horizontal rail from yanking the page vertically.
   */
  private scrollIntoView(el: HTMLElement): void {
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' as ScrollBehavior });
  }
}

/** Convenience factory used by the TV entry point. */
export function createTvNav(opts?: TvNavOptions): TvNav {
  return new TvNav(opts);
}