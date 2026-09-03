"use client";

import { Component, ReactNode, useEffect, useState } from "react";

class SceneErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
  } catch {
    return false;
  }
}

/**
 * Gates any Three.js scene behind capability checks: skips reduced-motion,
 * touch/mobile (perf + no meaningful pointer reactivity there), and devices
 * without WebGL — and catches render errors so a 3D failure never takes
 * down the page around it. Renders nothing until checks pass client-side.
 */
export function SceneGate({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    if (reduce || coarse || narrow || !supportsWebGL()) return;
    // One-time client-side capability check (matchMedia/WebGL aren't
    // available during SSR) — there's no external-system subscription to
    // model this as; a direct setState here is the correct approach.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEnabled(true);
  }, []);

  if (!enabled) return null;
  return <SceneErrorBoundary>{children}</SceneErrorBoundary>;
}
