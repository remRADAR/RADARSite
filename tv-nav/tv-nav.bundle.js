"use strict";
var TvNav = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tv-nav/src/tv-nav.ts
  var tv_nav_exports = {};
  __export(tv_nav_exports, {
    TvNav: () => TvNav,
    createTvNav: () => createTvNav
  });
  var KEY_MAP = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    // Android TV / leanback key codes that some OEM remotes emit instead of arrows.
    Up: "up",
    Down: "down",
    Left: "left",
    Right: "right"
  };
  var KEYCODE_MAP = {
    19: "up",
    // KEYCODE_DPAD_UP
    20: "down",
    // KEYCODE_DPAD_DOWN
    21: "left",
    // KEYCODE_DPAD_LEFT
    22: "right"
    // KEYCODE_DPAD_RIGHT
  };
  var TvNav = class {
    constructor(opts = {}) {
      this.current = null;
      this.lastMoveAt = 0;
      this.heldKey = null;
      this.rowMemory = /* @__PURE__ */ new Map();
      this.bound = false;
      var _a, _b, _c, _d, _e;
      this.opts = {
        focusableAttr: (_a = opts.focusableAttr) != null ? _a : "data-tv-focusable",
        containerAttr: (_b = opts.containerAttr) != null ? _b : "data-tv-container",
        railAttr: (_c = opts.railAttr) != null ? _c : "data-tv-rail",
        trapAttr: (_d = opts.trapAttr) != null ? _d : "data-tv-trap",
        repeatThrottleMs: (_e = opts.repeatThrottleMs) != null ? _e : 90,
        onFocusChange: opts.onFocusChange,
        onEdge: opts.onEdge
      };
      this.onKeyDown = (e) => this.handleKey(e);
      this.onFocusIn = (e) => {
        const t = e.target;
        if (t && t.hasAttribute(this.opts.focusableAttr)) this.current = t;
      };
    }
    /** Attach listeners and focus the first focusable element. */
    start(root = document) {
      if (this.bound) return;
      this.bound = true;
      document.addEventListener("keydown", this.onKeyDown, true);
      document.addEventListener("focusin", this.onFocusIn, true);
      const first = this.focusables(root)[0];
      if (first) this.focus(first, "init");
    }
    stop() {
      if (!this.bound) return;
      this.bound = false;
      document.removeEventListener("keydown", this.onKeyDown, true);
      document.removeEventListener("focusin", this.onFocusIn, true);
    }
    /** All currently visible focusables, in DOM order. */
    focusables(root = document) {
      const nodes = Array.from(
        root.querySelectorAll(`[${this.opts.focusableAttr}]`)
      );
      return nodes.filter((el) => this.isVisible(el) && !this.isDisabled(el));
    }
    get focused() {
      return this.current;
    }
    /** Programmatically focus an element and scroll it into view. */
    focus(el, dir = "init") {
      var _a, _b;
      if (!el) return;
      this.current = el;
      el.focus({ preventScroll: true });
      el.setAttribute("data-tv-focused", "true");
      this.scrollIntoView(el);
      (_b = (_a = this.opts).onFocusChange) == null ? void 0 : _b.call(_a, el, dir);
    }
    /** Move focus one step in `dir`. Returns true if focus actually moved. */
    move(dir) {
      var _a, _b, _c, _d, _e;
      const from = (_a = this.current) != null ? _a : this.focusables()[0];
      if (!from) return false;
      const candidates = this.candidatesFor(from, dir);
      if (candidates.length === 0) {
        (_c = (_b = this.opts).onEdge) == null ? void 0 : _c.call(_b, dir);
        return false;
      }
      const next = this.pickBest(from, candidates, dir);
      if (!next || next === from) {
        (_e = (_d = this.opts).onEdge) == null ? void 0 : _e.call(_d, dir);
        return false;
      }
      if (dir === "up" || dir === "down") {
        this.rowMemory.set(this.bandKey(from), from);
      }
      from.removeAttribute("data-tv-focused");
      this.focus(next, dir);
      return true;
    }
    // ---------------------------------------------------------------- internals
    handleKey(e) {
      var _a;
      const dir = (_a = KEY_MAP[e.key]) != null ? _a : KEYCODE_MAP[e.keyCode];
      if (!dir) return;
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
    candidatesFor(from, dir) {
      const fromRect = this.rect(from);
      const all = this.focusables().filter((el) => el !== from);
      const vertical = dir === "up" || dir === "down";
      const inDirection = all.filter((el) => {
        const r = this.rect(el);
        switch (dir) {
          case "left":
            return r.right <= fromRect.left + 1;
          case "right":
            return r.left >= fromRect.right - 1;
          case "up":
            return r.bottom <= fromRect.top + 1;
          case "down":
            return r.top >= fromRect.bottom - 1;
        }
      });
      const rail = from.closest(`[${this.opts.railAttr}]`);
      if (rail && !vertical) {
        const inRail = inDirection.filter((el) => rail.contains(el));
        if (inRail.length) return inRail;
      }
      const container = from.closest(`[${this.opts.containerAttr}]`);
      if (container) {
        if (container.hasAttribute(this.opts.trapAttr)) {
          return inDirection.filter((el) => container.contains(el));
        }
        const inContainer = inDirection.filter((el) => container.contains(el));
        if (inContainer.length) return inContainer;
      }
      if (vertical) return inDirection;
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
    pickBest(from, candidates, dir) {
      const f = this.rect(from);
      const vertical = dir === "up" || dir === "down";
      if (vertical) {
        const bands = /* @__PURE__ */ new Map();
        for (const el of candidates) {
          const key = this.bandKey(el);
          const list = bands.get(key);
          if (list) list.push(el);
          else bands.set(key, [el]);
        }
        let bestBand = null;
        let bestGap = Infinity;
        for (const [key, list] of bands) {
          let gap = Infinity;
          for (const el of list) {
            const r = this.rect(el);
            const g = dir === "down" ? r.top - f.bottom : f.top - r.bottom;
            if (g < gap) gap = g;
          }
          if (gap < bestGap) {
            bestGap = gap;
            bestBand = key;
          }
        }
        if (bestBand === null) return null;
        const band = bands.get(bestBand);
        const remembered = this.rowMemory.get(bestBand);
        const hasMemory = !!remembered && this.isVisible(remembered) && band.includes(remembered);
        if (!hasMemory) {
          return band[0];
        }
        const refCx = this.rect(remembered).cx;
        let best2 = null;
        let bestScore2 = Infinity;
        for (const el of band) {
          const r = this.rect(el);
          const score = Math.abs(r.cx - refCx) * 4 + Math.abs(r.cy - f.cy);
          if (score < bestScore2) {
            bestScore2 = score;
            best2 = el;
          }
        }
        return best2;
      }
      let best = null;
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
    bandKey(el) {
      const c = el.closest(`[${this.opts.containerAttr}]`);
      if (c) return "c:" + (c.id || c.getAttribute(this.opts.containerAttr) || "");
      return "e:" + (el.id || el.textContent || "");
    }
    overlap(a1, a2, b1, b2) {
      return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
    }
    rect(el) {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        cx: r.left + r.width / 2,
        cy: r.top + r.height / 2,
        width: r.width,
        height: r.height
      };
    }
    isVisible(el) {
      if (el.hidden) return false;
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }
    isDisabled(el) {
      return el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled");
    }
    /**
     * Scroll only the nearest scrollable ancestor, and only as far as needed.
     * `block:'nearest'` keeps a horizontal rail from yanking the page vertically.
     */
    scrollIntoView(el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
    }
  };
  function createTvNav(opts) {
    return new TvNav(opts);
  }
  return __toCommonJS(tv_nav_exports);
})();
