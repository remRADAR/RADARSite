"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RADARME_URL } from "@/lib/ia-content";
import {
  getSiteOverridesServerSnapshot,
  getSiteOverridesSnapshot,
  parseSiteOverrides,
  subscribeToSiteOverrides,
} from "@/lib/site-overrides";
import styles from "./SiteHeader.module.css";

const groups = [
  {
    number: "01",
    label: "THE RADARMusic",
    href: "/radarmusic",
    children: [
      { href: "/radarmusic/artists", label: "Artists" },
      { href: "/radarmusic/releases", label: "Releases" },
    ],
  },
  {
    number: "02",
    label: "ON THE RADAR",
    href: "/ontheradar",
    children: [
      { href: "/ontheradar/articles", label: "Articles" },
      { href: "/ontheradar/magazine", label: "Magazine" },
      { href: "/ontheradar/projects", label: "Projects" },
      { href: "/stayaktiv", label: "stayAKTiV" },
    ],
  },
  {
    number: "03",
    label: "THE REM ORIGIN",
    href: "/remradar",
    children: [
      { href: "/about", label: "About RADARCharts" },
      { href: "/about/ecosystem", label: "Ecosystem" },
    ],
  },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: -28 });
  const snapshot = useSyncExternalStore(
    subscribeToSiteOverrides,
    getSiteOverridesSnapshot,
    getSiteOverridesServerSnapshot,
  );
  const overrides = parseSiteOverrides(snapshot);
  const radarMeUrl = overrides.radarMeUrl || RADARME_URL;
  const socials = overrides.socialLinks.filter((link) => link.enabled);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const revealFrames = useRef<number[]>([]);

  const cancelRevealFrames = () => {
    revealFrames.current.forEach((frame) => window.cancelAnimationFrame(frame));
    revealFrames.current = [];
  };

  const openMenu = () => {
    cancelRevealFrames();
    const buttonRect = menuButtonRef.current?.getBoundingClientRect();
    const overlayTop = overlayRef.current?.getBoundingClientRect().top ?? 56;
    if (buttonRect) {
      setOrigin({
        x: Math.round(buttonRect.left + buttonRect.width / 2),
        y: Math.round(buttonRect.top + buttonRect.height / 2 - overlayTop),
      });
    }
    // Give the closed clip-path one paint at the measured button origin before revealing it.
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(() => setMenuOpen(true));
      revealFrames.current = [secondFrame];
    });
    revealFrames.current = [firstFrame];
  };

  const closeMenu = () => {
    cancelRevealFrames();
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    if (menuOpen) closeMenu();
    else openMenu();
  };

  useEffect(() => {
    if (!menuOpen) {
      if (wasOpen.current) {
        wasOpen.current = false;
        window.requestAnimationFrame(() =>
          menuButtonRef.current?.focus({ preventScroll: true }),
        );
      }
      return;
    }

    wasOpen.current = true;
    const frame = window.requestAnimationFrame(() => {
      overlayRef.current
        ?.querySelector<HTMLElement>("[data-menu-first='true']")
        ?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.motionMenuOpen = "true";
    window.dispatchEvent(new CustomEvent("radar:menu-scroll-lock", { detail: true }));

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      delete document.documentElement.dataset.motionMenuOpen;
      window.dispatchEvent(new CustomEvent("radar:menu-scroll-lock", { detail: false }));
    };
  }, [menuOpen]);

  useEffect(
    () => () => {
      revealFrames.current.forEach((frame) => window.cancelAnimationFrame(frame));
    },
    [],
  );

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== "Tab" || !overlayRef.current) return;

    const focusable = Array.from(
      overlayRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getAttribute("aria-hidden") !== "true");
    if (menuButtonRef.current) focusable.unshift(menuButtonRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === overlayRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || active === overlayRef.current)) {
      event.preventDefault();
      first.focus();
    }
  };

  const overlayStyle = {
    "--menu-origin-x": `${origin.x}px`,
    "--menu-origin-y": `${origin.y}px`,
  } as CSSProperties;

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b-2 border-ink bg-paper">
      <div className={styles.headerRow}>
        <div inert={menuOpen} aria-hidden={menuOpen} className="flex min-w-0 items-stretch">
          <Logo className="min-w-0 shrink border-r-2 border-ink px-3 sm:px-4 md:px-6" />
        </div>
        <div className={styles.controls}>
          <div inert={menuOpen} aria-hidden={menuOpen} className="flex items-stretch">
            <a
              href={radarMeUrl}
              target="_blank"
              rel="noreferrer"
              className={`${styles.radarMe} hidden sm:flex`}
            >
              RADARMe <ArrowUpRight aria-hidden size={13} />
            </a>
            <ThemeToggle />
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={menuOpen ? "Close site navigation" : "Open site navigation"}
            aria-expanded={menuOpen}
            aria-controls="site-navigation-overlay"
            onClick={toggleMenu}
            className={styles.menuButton}
          >
            <span className={styles.menuLabel} aria-hidden="true">
              {menuOpen ? "Close" : "Menu"}
            </span>
            <span
              aria-hidden="true"
              className={`${styles.menuIcon} ${menuOpen ? styles.menuIconOpen : ""}`}
            >
              <span className={`${styles.menuLine} ${styles.menuLineTop}`} />
              <span className={`${styles.menuLine} ${styles.menuLineBottom}`} />
            </span>
          </button>
        </div>
      </div>

      <div
        ref={overlayRef}
        id="site-navigation-overlay"
        role="dialog"
        aria-modal={menuOpen ? "true" : undefined}
        aria-label="Site navigation"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
        data-state={menuOpen ? "open" : "closed"}
        onKeyDown={handleOverlayKeyDown}
        className={`${styles.overlay} ${menuOpen ? styles.overlayOpen : ""}`}
        style={overlayStyle}
      >
        <div className={styles.overlayFrame}>
          <div className={styles.overlayHeader}>
            <p className={styles.kicker}>remRADAR <span aria-hidden="true">/</span> Global navigation</p>
            <p className={styles.headerNote}>Protecting the music as remRADAR.</p>
          </div>

          <div className={styles.content}>
            <nav aria-label="Primary navigation" className={styles.primaryNav}>
              {groups.map((group, index) => (
                <section
                  key={group.href}
                  className={`${styles.group} ${styles.entrance}`}
                  style={{ "--menu-delay": `${120 + index * 70}ms` } as CSSProperties}
                >
                  <span className={styles.groupNumber} aria-hidden="true">{group.number}</span>
                  <div className={styles.groupBody}>
                    <Link
                      href={group.href}
                      data-menu-first={index === 0 ? "true" : undefined}
                      onClick={closeMenu}
                      className={styles.primaryLink}
                    >
                      {group.label}
                      <ArrowUpRight aria-hidden size={16} className={styles.primaryArrow} />
                    </Link>
                    <ul className={styles.subLinks}>
                      {group.children.map((child) => (
                        <li key={child.href}>
                          <Link href={child.href} onClick={closeMenu} className={styles.subLink}>
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </nav>

            <aside
              className={`${styles.support} ${styles.entrance}`}
              style={{ "--menu-delay": "400ms" } as CSSProperties}
            >
              <p className={styles.supportLabel}>RADARCharts by REM</p>
              <p className={styles.supportText}>
                A music ecosystem for artists, releases, stories, projects, and the people moving
                culture forward.
              </p>
              <a href={radarMeUrl} target="_blank" rel="noreferrer" onClick={closeMenu} className={styles.radarMeCta}>
                Open RADARMe <ArrowUpRight aria-hidden size={14} />
              </a>
              <ul aria-label="Social links" className={styles.socials}>
                {socials.map((social) => (
                  <li key={social.label}>
                    <a href={social.href} target="_blank" rel="noreferrer" onClick={closeMenu} className={styles.socialLink}>
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          <div className={styles.overlayFooter}>
            <span>© REM 2026</span>
            <span>All rights reserved</span>
          </div>
        </div>
      </div>
    </header>
  );
}
