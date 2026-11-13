/*
 * Runtime adaptation of BuiltByKern's Kern_LanyardPass Framer component.
 * Original component: https://framer.com/m/Kern-LanyardPass-757vlY.js@jSV3hL2dUOzozFMHWoEz
 * The original Three.js pass geometry, materials, rope physics, pointer/touch drag,
 * settling, WebGL fallback and art rendering are retained. Framer editor controls are
 * removed; reduced-motion handling is implemented with the platform media query.
 */
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, startTransition } from "react";
import * as THREE from "three";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    if (query.addEventListener) query.addEventListener("change", update);
    else query.addListener(update);
    return () => {
      if (query.removeEventListener) query.removeEventListener("change", update);
      else query.removeListener(update);
    };
  }, []);
  return reduced;
}
const FONT = '"IBM Plex Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
const SWING_STRENGTH = 1;
const PAPER = "#131417";
const INK = "#F2F1EC";
const ACCENT = "#5B6B86";
const STRAP = "#1A1A1A";
const DEMO_LOGO = "";
const DEMO_PHOTO = "/images/founder/tarzaa-gerald-caesar.webp";
const PAD_MIN = 28;
const PAD_MAX = 88;
const NAME_MIN = 48;
const NAME_MAX = 140;
const META_MIN = 14;
const META_MAX = 36;
const NUM_MIN = 24;
const NUM_MAX = 96;
const PRINT_PAD = 48;
const CARD_DEPTH = 0.1;
const MM_PER_UNIT = 54;
const THICK_MIN = 0.8;
const THICK_MAX = 12;
const THICK_DEFAULT = Math.round(CARD_DEPTH * MM_PER_UNIT * 10) / 10;
const SIZE_MIN = 240;
const SIZE_MAX = 560;
const NARROW_AT = 420;
const JOINTS = 3;
const SEG_LEN = 0.82;
const CARD_W = 1.58;
const CARD_H = 2.12;
const SLEEVE_PAD_W = 0.08;
const SLEEVE_LIP = 0.05;
const SLEEVE_HEAD = 0.16;
const SLEEVE_PAD_H = SLEEVE_LIP + SLEEVE_HEAD;
const SLEEVE_PAD_D = 0.03;
const SLEEVE_SHIFT = (SLEEVE_HEAD - SLEEVE_LIP) / 2;
const HOLE = 0.09;
const ROPE_ITERS = 18;
const GRAVITY = -22;
const AIR = 0.986;
const DT = 1 / 60;
const STRAP_SEGS = 40;
const STRAP_RADIAL = 10;
const STRAP_HALF_W = 0.07;
const STRAP_HALF_T = 0.02;
const CORD_R = 0.032;
const CORD_REPEAT = 14;
const TEX_W = 768;
const TEX_H = 1024;
const STRAP_TEX_W = 256;
const STRAP_TEX_H = 1024;
const STRAP_REPEAT = 3;
const CAM_X = 0.7;
const CAM_Y = -0.7;
const CAM_Z = 7.1;
const CAM_LOOK_Y = -1.05;
const IDLE_SPRING = 6;
const IDLE_DAMP = 0.9;
const DEFAULT_CONTENT = {
  attendeeName: "Alex Rivera",
  ticketType: "General admission",
  ticketNumber: "A-0842",
  eventName: "North Dock Sessions",
  eventDate: "12 Mar 2027",
  barcodeValue: "NDS2027A0842",
  backText: "",
  strapText: "",
};
const DEFAULT_NAME_FONT = {
  fontSize: "108px",
  fontWeight: 600,
  fontStyle: "normal",
  letterSpacing: "-0.045em",
  lineHeight: "1em",
};
const DEFAULT_META_FONT = {
  fontSize: "22px",
  fontWeight: 400,
  fontStyle: "normal",
  letterSpacing: "0.01em",
  lineHeight: "1.2em",
};
const DEFAULT_NUMBER_FONT = {
  fontSize: "48px",
  fontWeight: 600,
  fontStyle: "normal",
  letterSpacing: "-0.04em",
  lineHeight: "1em",
};
const DEFAULT_LOOK = {
  paper: PAPER,
  ink: INK,
  accent: ACCENT,
  strapColor: STRAP,
  strapStyle: "flat",
  foil: true,
  photoFit: "cover",
  finish: "gloss",
  sleeve: false,
  sleeveTexture: "clear",
  nameFont: DEFAULT_NAME_FONT,
  metaFont: DEFAULT_META_FONT,
  numberFont: DEFAULT_NUMBER_FONT,
};
const DEFAULT_LIGHT = { angle: 25, height: 55, intensity: 1, rim: true };
const TYPE_GAP_MIN = 8;
const TYPE_GAP_MAX = 48;
const TYPE_GAP_DEFAULT = 12;
const DEFAULT_LAYOUT = {
  size: 360,
  padding: PRINT_PAD,
  stackGap: TYPE_GAP_DEFAULT,
  thickness: THICK_DEFAULT,
};
const DEFAULT_ENTRANCE = { entrance: "none", entrancePlay: "load" }; // The drop starts this far left of the clip, so the strap catches it into a swing (right first,
// away from copy on the left) instead of a dead stop.
const ENTRY_SIDE = -0.45; // The card starts just this far above the stage's top edge, out of sight, and falls in through it.
const ENTRY_GAP = 0.06; // How long the drop waits, once the stage is showing, for its art and type before it gives up.
const ART_WAIT = 1500; // "Once per session" remembers the drop here; the page hears "lanyard-pass:catch" when the strap
// catches the card ({ dropped: true }) or at once when this instance won't drop ({ dropped: false }).
const ENTRANCE_KEY = "lanyard-pass:entrance";
const CATCH_EVENT = "lanyard-pass:catch"; // Storage can throw (private mode, blocked site data): then the drop plays.
function entrancePlayed() {
  try {
    return window.sessionStorage.getItem(ENTRANCE_KEY) === "1";
  } catch {
    return false;
  }
}
function markEntrance() {
  try {
    window.sessionStorage.setItem(ENTRANCE_KEY, "1");
  } catch {
    /* blocked: nothing to remember */
  }
}
function signalCatch(dropped) {
  window.dispatchEvent(new CustomEvent(CATCH_EVENT, { detail: { dropped } }));
} // Probes for WebGL before the engine starts, then frees the probe's context.
function webglAvailable() {
  try {
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") ?? probe.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
const ART_LABEL = { logo: "Logo", photo: "Photo", backArt: "Back art" }; // Shown on the Framer canvas only, so the editor can see why the pass looks wrong.
function failureNote(failure) {
  if (failure.reason === "no-webgl")
    return "Lanyard Pass: this browser has no WebGL, so visitors see a flat pass instead of the 3D one.";
  if (failure.reason === "context-lost")
    return "Lanyard Pass: the browser dropped the WebGL context (GPU reset or too many 3D views). The flat pass shows until it comes back.";
  const detail = failure.detail.replace(/\.+$/, "");
  return `Lanyard Pass: the 3D pass failed to start${detail ? ` (${detail})` : ""}. Visitors see a flat pass.`;
} // What the status region tells screen readers while the flat pass stands in for the 3D one.
function fallbackStatus(failure) {
  if (failure?.reason === "context-lost")
    return "3D view paused. Showing the flat pass until it recovers.";
  return "3D view unavailable. Showing the flat pass.";
}
function artNote(key, failure) {
  return failure === "cors"
    ? `${ART_LABEL[key]} didn't load: its host blocks cross-origin use. Upload the image to Framer instead.`
    : `${ART_LABEL[key]} didn't load: the link is broken or unreachable.`;
}
function motionEnabled(value) {
  if (typeof value === "boolean") return value;
  if (value && typeof value === "object" && "physics" in value) {
    return Boolean(value.physics);
  }
  return true;
}
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
function clampSize(value) {
  if (!Number.isFinite(value)) return DEFAULT_LAYOUT.size;
  return Math.round(clamp(value, SIZE_MIN, SIZE_MAX));
}
function clampPad(value) {
  if (!Number.isFinite(value)) return DEFAULT_LAYOUT.padding;
  return Math.round(clamp(value, PAD_MIN, PAD_MAX));
}
function clampStackGap(value) {
  if (!Number.isFinite(value)) return DEFAULT_LAYOUT.stackGap;
  return Math.round(clamp(value, TYPE_GAP_MIN, TYPE_GAP_MAX));
}
function asText(value) {
  return typeof value === "string" ? value : "";
}
function visibleText(value) {
  const text = asText(value).trim();
  return text.length > 0 ? text : null;
}
function parsePx(value, fallback, min, max) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(clamp(value, min, max));
  }
  if (typeof value === "string") {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return Math.round(clamp(n, min, max));
  }
  return fallback;
}
function asPrintFont(value, fallback) {
  if (!value || typeof value !== "object") return fallback;
  return { ...fallback, ...value };
}
function fontFamilyOf(font) {
  const family = asText(font.fontFamily).trim();
  return family.length > 0 ? family : FONT;
}
function fontWeightOf(font, fallback) {
  if (typeof font.fontWeight === "number" && Number.isFinite(font.fontWeight)) {
    return font.fontWeight;
  }
  if (typeof font.fontWeight === "string") {
    const n = parseFloat(font.fontWeight);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}
function fontStyleOf(font) {
  return font.fontStyle === "italic" ? "italic" : "normal";
}
function letterSpacingOf(font, fallback) {
  if (typeof font.letterSpacing === "number") return `${font.letterSpacing}px`;
  const text = asText(font.letterSpacing).trim();
  return text.length > 0 ? text : fallback;
}
function lineHeightOf(font, size, fallbackRatio) {
  const raw = font.lineHeight;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 4 ? raw : size * raw;
  }
  if (typeof raw === "string") {
    const n = parseFloat(raw);
    if (!Number.isFinite(n)) return size * fallbackRatio;
    if (raw.includes("%")) return size * (n / 100);
    if (raw.includes("px")) return n;
    if (raw.includes("em")) return size * n;
    return n > 4 ? n : size * n;
  }
  return size * fallbackRatio;
}
function typeGap(fromPx, toPx, pad) {
  return Math.round(
    clamp(Math.max(pad * 0.28, fromPx * 0.16, toPx * 0.6), 10, 72),
  );
}
function lineAdvance(ctx, text, px, lead) {
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const ink =
    typeof ascent === "number" &&
    Number.isFinite(ascent) &&
    typeof descent === "number" &&
    Number.isFinite(descent)
      ? ascent + descent
      : px;
  return Math.round(Math.max(lead, ink + px * 0.08, px));
}
function inkAdvance(ctx, text, px) {
  const m = ctx.measureText(text);
  const ascent = m.actualBoundingBoxAscent;
  const descent = m.actualBoundingBoxDescent;
  const ink =
    typeof ascent === "number" &&
    Number.isFinite(ascent) &&
    typeof descent === "number" &&
    Number.isFinite(descent)
      ? ascent + descent
      : px * 0.8;
  return Math.round(clamp(ink, px * 0.7, px));
}
function setPrintFont(ctx, font, px, weight = fontWeightOf(font, 400)) {
  ctx.font = `${fontStyleOf(font)} ${weight} ${px}px ${fontFamilyOf(font)}`;
}
function imageSrc(value) {
  if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  if (!value || typeof value !== "object") return null;
  const rec = value;
  if (typeof rec.src === "string" && rec.src.length > 0) return rec.src;
  if (typeof rec.url === "string" && rec.url.length > 0) return rec.url;
  return null;
}
function asFoil(value) {
  switch (value) {
    case false:
    case "off":
      return "off";
    case "edges":
      return "edges";
    case "marks+edges":
    case "both":
      return "marks+edges";
    case "holo":
    case "marks":
      return "marks";
    case true:
    default:
      return "marks+edges";
  }
}
function asStrapStyle(value) {
  return value === "cord" ? "cord" : "flat";
}
function asFinish(value) {
  if (value === "matte" || value === "linen") return value;
  return "gloss";
}
function asSleeveTexture(value) {
  if (value === "frosted" || value === "textured") return value;
  return "clear";
}
function asPhotoFit(value) {
  return value === "inset" ? "inset" : "cover";
}
function foilHasMarks(mode) {
  return mode === "marks" || mode === "marks+edges";
}
function foilHasEdges(mode) {
  return mode === "edges" || mode === "marks+edges";
}
function reverseLine(custom, legacy, ticketNumber, attendeeName, eventName) {
  if (custom) return custom;
  switch (legacy) {
    case "name":
      return attendeeName;
    case "event":
      return eventName;
    case "none":
      return null;
    default:
      return ticketNumber;
  }
}
function drawContained(ctx, img, x, y, w, h, focusY = 0.5) {
  if (img.width < 1 || img.height < 1) return;
  const ir = img.width / img.height;
  const r = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (ir > r) {
    dw = h * ir;
    dx = x - (dw - w) / 2;
  } else {
    dh = w / ir;
    dy = y - (dh - h) * focusY;
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}
function makeStudioEnvironment(three, renderer) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#3a3b40");
  sky.addColorStop(0.42, "#1c1d21");
  sky.addColorStop(0.55, "#101114");
  sky.addColorStop(1, "#050506");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);
  const softbox = (x, y, w, h, a) => {
    const g = ctx.createRadialGradient(
      x + w / 2,
      y + h / 2,
      0,
      x + w / 2,
      y + h / 2,
      Math.max(w, h) / 2,
    );
    g.addColorStop(0, `rgba(255,252,246,${a})`);
    g.addColorStop(0.6, `rgba(255,252,246,${a * 0.55})`);
    g.addColorStop(1, "rgba(255,252,246,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
  };
  softbox(70, 20, 150, 90, 1);
  softbox(210, 40, 120, 70, 0.85);
  softbox(200, 150, 220, 40, 0.3);
  softbox(394, 28, 4, 204, 2.3);
  const equirect = new three.Texture(canvas);
  equirect.mapping = three.EquirectangularReflectionMapping;
  equirect.colorSpace = three.SRGBColorSpace;
  equirect.needsUpdate = true;
  const pmrem = new three.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(equirect).texture;
  equirect.dispose();
  pmrem.dispose();
  return env;
}
function makeFoilMaterial(three, map, alphaMap) {
  const mat = new three.MeshPhysicalMaterial({
    color: 2105894,
    map,
    emissive: 16777215,
    emissiveMap: map,
    emissiveIntensity: 0.5,
    ...(alphaMap ? { alphaMap } : {}),
    transparent: true,
    opacity: 0.55,
    roughness: 0.2,
    metalness: 0.85,
    depthWrite: false,
    envMapIntensity: 1.6,
  });
  mat.iridescence = 1;
  mat.iridescenceIOR = 1.5;
  mat.iridescenceThicknessRange = [120, 520];
  return mat;
}
function parseColor(color) {
  const hex = color.trim();
  if (hex.startsWith("#") && hex.length === 7) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  }
  const m = /rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(hex);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function isDark(color) {
  const rgb = parseColor(color);
  if (!rgb) return true;
  const [r, g, b] = rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}
function drawCord(ctx, w, h, color) {
  const dark = isDark(color);
  const hi = dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.4)";
  const lo = dark ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.18)";
  const strands = 6;
  const pitch = h / 2;
  ctx.lineCap = "butt";
  for (let s = 0; s < strands; s++) {
    const x0 = (s / strands) * w;
    ctx.lineWidth = w / strands;
    ctx.strokeStyle = s % 2 === 0 ? hi : lo;
    for (const off of [-w, 0, w]) {
      ctx.beginPath();
      ctx.moveTo(x0 + off, 0);
      ctx.lineTo(x0 + off + w, pitch);
      ctx.moveTo(x0 + off, pitch);
      ctx.lineTo(x0 + off + w, h);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  for (let s = 0; s <= strands; s++) {
    const x0 = (s / strands) * w;
    for (const off of [-w, 0, w]) {
      ctx.beginPath();
      ctx.moveTo(x0 + off, 0);
      ctx.lineTo(x0 + off + w, pitch);
      ctx.moveTo(x0 + off, pitch);
      ctx.lineTo(x0 + off + w, h);
      ctx.stroke();
    }
  }
}
function drawStrap(canvas, ticket) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = ticket.strapColor;
  ctx.fillRect(0, 0, w, h);
  switch (ticket.strapStyle) {
    case "cord":
      drawCord(ctx, w, h, ticket.strapColor);
      return;
    case "flat":
      break;
    default: {
      const exhaustive = ticket.strapStyle;
      return exhaustive;
    }
  }
  const dark = isDark(ticket.strapColor);
  const lightHatch = dark ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.28)";
  const darkHatch = dark ? "rgba(0,0,0,0.32)" : "rgba(0,0,0,0.12)";
  ctx.lineWidth = 1.2;
  for (let i = -h; i < w + h; i += 5) {
    ctx.strokeStyle = i % 10 === 0 ? lightHatch : darkHatch;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + h, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i + h, 0);
    ctx.lineTo(i, h);
    ctx.stroke();
  }
  const selvedge = dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.2)";
  ctx.fillStyle = selvedge;
  for (const u of [0, 0.5]) {
    ctx.fillRect(Math.round(w * u) - 3, 0, 6, h);
  }
  const text = ticket.strapText;
  if (!text) return;
  const print = `${text.toUpperCase()}   \xb7   `;
  ctx.fillStyle = dark ? "rgba(244,243,240,0.9)" : "rgba(10,10,10,0.82)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const spaced = ctx;
  spaced.letterSpacing = "0.18em";
  ctx.font = `${fontStyleOf(ticket.metaFont)} ${fontWeightOf(ticket.metaFont, 600)} 50px ${fontFamilyOf(ticket.metaFont)}`;
  const runW = Math.max(1, ctx.measureText(print).width);
  const runs = Math.max(1, Math.round(h / runW));
  const stretch = h / (runs * runW);
  const bandU = [0.25, 0.75];
  for (const u of bandU) {
    ctx.save();
    ctx.translate(w * u, 0);
    ctx.rotate(Math.PI / 2);
    ctx.scale(stretch, -1);
    for (let i = 0; i < runs; i++) {
      ctx.fillText(print, i * runW, 0);
    }
    ctx.restore();
  }
  spaced.letterSpacing = "0px";
}
function edgeTone(three, paper) {
  const color = new three.Color(paper);
  if (isDark(paper)) {
    color.lerp(new three.Color(16777215), 0.16);
  } else {
    color.multiplyScalar(0.9);
  }
  return color;
}
function makeNormalTexture(three, size, heightAt, scale, repeatX, repeatY) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      height[y * size + x] = heightAt(
        (x / size) * Math.PI * 2,
        (y / size) * Math.PI * 2,
      );
    }
  }
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = height[y * size + ((x + size - 1) % size)];
      const r = height[y * size + ((x + 1) % size)];
      const t = height[((y + size - 1) % size) * size + x];
      const b = height[((y + 1) % size) * size + x];
      const nx = (l - r) * scale;
      const ny = (t - b) * scale;
      const len = Math.hypot(nx, ny, 1);
      const o = (y * size + x) * 4;
      img.data[o] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      img.data[o + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      img.data[o + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const map = new three.CanvasTexture(canvas);
  map.wrapS = three.RepeatWrapping ?? 1e3;
  map.wrapT = three.RepeatWrapping ?? 1e3;
  map.repeat.set(repeatX, repeatY);
  map.colorSpace = three.NoColorSpace;
  map.needsUpdate = true;
  return map;
}
function softWobble(u, v) {
  return (
    Math.sin(u + Math.cos(v * 2) * 1.1) * 0.6 +
    Math.sin(v * 2 - Math.sin(u) * 0.9) * 0.4
  );
}
function crispWobble(u, v) {
  return (
    Math.sin(u * 1.6 + Math.cos(v * 2) * 1.1) * 0.55 +
    Math.sin(v * 2 - Math.sin(u * 1.5) * 0.9) * 0.32 +
    Math.sin((u + v) * 3.2 + Math.cos(u * 2.4) * 0.6) * 0.08
  );
}
function linenWeave(u, v) {
  const warp = Math.sin(u * 16);
  const weft = Math.sin(v * 16);
  const over = Math.sign(Math.sin(u * 8) * Math.sin(v * 8));
  return (
    warp * warp * 0.42 * (1 + over * 0.22) +
    weft * weft * 0.42 * (1 - over * 0.22)
  );
}
function makeHoloTexture(three) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const w = canvas.width;
    const h = canvas.height;
    const g = ctx.createLinearGradient(0, 0, w, h * 0.35);
    g.addColorStop(0, "#ff4fa3");
    g.addColorStop(0.16, "#ffb347");
    g.addColorStop(0.3, "#e9ff5a");
    g.addColorStop(0.46, "#3cf2c8");
    g.addColorStop(0.62, "#3aa0ff");
    g.addColorStop(0.8, "#b06cff");
    g.addColorStop(1, "#ff4fa3");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "overlay";
    ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += 3) {
      ctx.strokeStyle =
        i % 6 === 0 ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h * 0.6, h);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "soft-light";
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 14;
    for (let i = -h; i < w + h; i += 96) {
      ctx.beginPath();
      ctx.moveTo(i, h);
      ctx.lineTo(i + h * 0.9, 0);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
    for (let n = 0; n < 220; n++) {
      const x = (n * 137) % w;
      const y = (n * 89) % h;
      ctx.fillStyle = `rgba(255,255,255,${n % 3 === 0 ? 0.95 : 0.5})`;
      ctx.fillRect(x, y, n % 4 === 0 ? 2 : 1, 1);
    }
  }
  const map = new three.CanvasTexture(canvas);
  map.wrapS = three.RepeatWrapping ?? 1e3;
  map.wrapT = three.RepeatWrapping ?? 1e3;
  map.repeat.set(1.4, 1.9);
  map.anisotropy = 4;
  map.needsUpdate = true;
  return map;
}
function drawDefaultPhoto(ctx, x, y, w, h, accent) {
  ctx.save();
  ctx.beginPath();
  const rr = 14;
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, accent);
  g.addColorStop(0.55, "#1a1a1a");
  g.addColorStop(1, "#0A0A0A");
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const lights = [
    [0.22, 0.28, 18, 0.35],
    [0.7, 0.22, 26, 0.28],
    [0.48, 0.55, 14, 0.4],
    [0.18, 0.72, 22, 0.22],
    [0.8, 0.68, 16, 0.3],
    [0.4, 0.38, 10, 0.45],
  ];
  for (const [px, py, r, a] of lights) {
    const lg = ctx.createRadialGradient(
      x + w * px,
      y + h * py,
      0,
      x + w * px,
      y + h * py,
      r,
    );
    lg.addColorStop(0, `rgba(244,243,240,${a})`);
    lg.addColorStop(1, "rgba(244,243,240,0)");
    ctx.fillStyle = lg;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}
function drawNdMark(ctx, x, y, size, accent, paper, font) {
  ctx.fillStyle = accent;
  fillRoundRect(ctx, x, y, size, size, Math.round(size * 0.16));
  ctx.fillStyle = paper;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  setPrintFont(ctx, font, Math.round(size * 0.36), fontWeightOf(font, 600));
  ctx.fillText("ND", x + size / 2, y + size / 2 + size * 0.02);
}
function barcodeBars(value) {
  const src = value.length > 0 ? value : "PASS";
  const bars = [];
  let hash = 2166136261;
  for (let i = 0; i < src.length; i++) {
    hash ^= src.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
    const bits = Math.abs(hash);
    bars.push({ width: (bits % 3) + 1, ink: true });
    bars.push({ width: ((bits >>> 3) % 2) + 1, ink: false });
    bars.push({ width: ((bits >>> 5) % 3) + 1, ink: true });
    bars.push({ width: 1, ink: false });
  }
  return bars;
}
function muteInk(ink) {
  return inkAlpha(ink, 0.55);
}
function inkAlpha(ink, alpha) {
  const rgb = parseColor(ink);
  if (!rgb) return ink;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}
function washPaper(ctx, paper, w, h, startY) {
  const g = ctx.createLinearGradient(0, startY, 0, h);
  g.addColorStop(0, inkAlpha(paper, 0));
  g.addColorStop(0.28, inkAlpha(paper, 0.22));
  g.addColorStop(0.58, inkAlpha(paper, 0.88));
  g.addColorStop(1, inkAlpha(paper, 1));
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.max(0, startY), w, Math.max(0, h - startY));
}
function scrimTop(ctx, paper, w, depth) {
  const g = ctx.createLinearGradient(0, 0, 0, depth);
  g.addColorStop(0, inkAlpha(paper, 0.55));
  g.addColorStop(0.55, inkAlpha(paper, 0.18));
  g.addColorStop(1, inkAlpha(paper, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, depth);
}
function pathRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
function fillRoundRect(ctx, x, y, w, h, r) {
  pathRoundRect(ctx, x, y, w, h, r);
  ctx.fill();
}
function paintMaskRect(ctx, x, y, w, h, r, strength = 1) {
  const level = Math.round(clamp(strength, 0, 1) * 255);
  ctx.fillStyle = `rgb(${level}, ${level}, ${level})`;
  fillRoundRect(ctx, x, y, w, h, r);
}
function paintMaskImage(ctx, img, x, y, w, h) {
  const scratch = document.createElement("canvas");
  scratch.width = Math.max(1, Math.round(w));
  scratch.height = Math.max(1, Math.round(h));
  const s = scratch.getContext("2d");
  if (!s) return;
  drawContained(s, img, 0, 0, scratch.width, scratch.height);
  s.globalCompositeOperation = "source-in";
  s.fillStyle = "#ffffff";
  s.fillRect(0, 0, scratch.width, scratch.height);
  ctx.drawImage(scratch, x, y, w, h);
}
function fitFont(ctx, text, font, startPx, minPx, maxW) {
  let px = startPx;
  const weight = fontWeightOf(font, 600);
  while (px > minPx) {
    setPrintFont(ctx, font, px, weight);
    if (ctx.measureText(text).width <= maxW) break;
    px -= 2;
  }
  setPrintFont(ctx, font, px, weight);
  return px;
}
function wrapName(ctx, text, maxW, font, size, minSize) {
  const weight = fontWeightOf(font, 600);
  setPrintFont(ctx, font, size, weight);
  if (ctx.measureText(text).width <= maxW) {
    return { lines: [text], px: size };
  }
  const words = text.split(/\s+/).filter(Boolean);
  let lines = [text];
  if (words.length >= 2) {
    let best = 1;
    let bestBad = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(" ");
      const b = words.slice(i).join(" ");
      const bad = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
      if (bad < bestBad) {
        bestBad = bad;
        best = i;
      }
    }
    lines = [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const px =
    widest <= maxW
      ? size
      : fitFont(
          ctx,
          lines.reduce((a, b) => (a.length >= b.length ? a : b)),
          font,
          size,
          minSize,
          maxW,
        );
  return { lines, px };
}
function hairline(ctx, x, y, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}
function drawFront(canvas, mask, ticket) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = ticket.pad;
  const col = w - pad * 2;
  const mark = Math.round(clamp(pad * 1.7, 64, 104));
  const markX = pad;
  const markY = pad;
  const gap = Math.round(pad * 0.6);
  const nameSize = parsePx(ticket.nameFont.fontSize, 108, NAME_MIN, NAME_MAX);
  const metaSize = parsePx(ticket.metaFont.fontSize, 22, META_MIN, META_MAX);
  const numberSize = parsePx(ticket.numberFont.fontSize, 48, NUM_MIN, NUM_MAX);
  const cap = Math.round(metaSize * 0.78);
  const barH = Math.max(44, Math.round(numberSize * 1.1));
  const footH = Math.max(barH + cap + 8, numberSize) + gap;
  const radius = 4;
  const spaced = ctx;
  const mute = muteInk(ticket.ink);
  const faint = inkAlpha(ticket.ink, 0.38);
  const rule = inkAlpha(ticket.ink, 0.16);
  const headW = col - mark - gap;
  const headGap = typeGap(cap, metaSize, pad);
  const headBand = ticket.eventDate ? cap + headGap + metaSize : cap;
  const cover = ticket.photoFit !== "inset";
  const photoY = pad + Math.max(mark, headBand) + gap;
  const hasRole = Boolean(ticket.ticketType);
  spaced.letterSpacing = letterSpacingOf(ticket.nameFont, "-0.045em");
  const wrapped = wrapName(
    ctx,
    ticket.attendeeName,
    col,
    ticket.nameFont,
    nameSize,
    Math.round(nameSize * 0.55),
  );
  const nameLead = Math.max(
    lineHeightOf(ticket.nameFont, wrapped.px, 1),
    wrapped.px,
  );
  setPrintFont(
    ctx,
    ticket.nameFont,
    wrapped.px,
    fontWeightOf(ticket.nameFont, 600),
  );
  let nameStack = 0;
  wrapped.lines.forEach((line, i) => {
    const last = i === wrapped.lines.length - 1;
    nameStack += last
      ? inkAdvance(ctx, line, wrapped.px)
      : lineAdvance(ctx, line, wrapped.px, nameLead);
  });
  const afterName = Math.round(
    clamp((wrapped.px * clampStackGap(ticket.stackGap)) / 100, 6, 120),
  );
  const metaLead = Math.max(
    lineHeightOf(ticket.metaFont, metaSize, 1.2),
    metaSize,
  );
  const afterRole = hasRole
    ? Math.round(clamp(Math.max(gap * 1.15, metaSize * 1.35), 22, 80))
    : 0;
  const nameBlock = Math.round(
    nameStack + afterName + (hasRole ? metaLead + afterRole : 0),
  );
  const footTop = h - pad - footH + gap;
  let photoH = Math.round(
    clamp(h - photoY - nameBlock - footH - pad, h * 0.18, h * 0.4),
  );
  const nameStart = photoY + photoH + gap;
  if (!cover && nameStart + nameBlock > footTop) {
    photoH = Math.max(Math.round(h * 0.16), footTop - nameBlock - gap - photoY);
  }
  const photoX = cover ? 0 : pad;
  const photoW = cover ? w : col;
  const artY = cover ? 0 : photoY;
  const artH = cover ? h : photoH;
  const typeTop = cover
    ? Math.max(pad + mark + gap, footTop - nameBlock)
    : photoY + photoH + gap;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = ticket.paper;
  ctx.fillRect(0, 0, w, h);
  if (ticket.photo) {
    if (cover) {
      drawContained(ctx, ticket.photo, 0, 0, w, h, 0.28);
    } else {
      ctx.save();
      pathRoundRect(ctx, photoX, artY, photoW, artH, radius);
      ctx.clip();
      drawContained(ctx, ticket.photo, photoX, artY, photoW, artH, 0.22);
      ctx.restore();
    }
  } else {
    drawDefaultPhoto(ctx, photoX, artY, photoW, artH, ticket.accent);
  }
  if (cover) {
    washPaper(
      ctx,
      ticket.paper,
      w,
      h,
      Math.round(Math.min(typeTop - wrapped.px * 0.7, h * 0.52)),
    );
    scrimTop(ctx, ticket.paper, w, pad + mark + gap);
  }
  if (ticket.logo) {
    ctx.save();
    pathRoundRect(ctx, markX, markY, mark, mark, radius);
    ctx.clip();
    drawContained(ctx, ticket.logo, markX, markY, mark, mark);
    ctx.restore();
  } else {
    drawNdMark(
      ctx,
      markX,
      markY,
      mark,
      ticket.accent,
      ticket.paper,
      ticket.metaFont,
    );
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  if (ticket.eventName) {
    ctx.fillStyle = faint;
    setPrintFont(ctx, ticket.metaFont, cap, fontWeightOf(ticket.metaFont, 500));
    spaced.letterSpacing = "0.2em";
    ctx.fillText(ticket.eventName.toUpperCase(), w - pad, pad + 2, headW);
    spaced.letterSpacing = "0px";
  }
  if (ticket.eventDate) {
    ctx.fillStyle = mute;
    setPrintFont(ctx, ticket.metaFont, metaSize);
    spaced.letterSpacing = letterSpacingOf(ticket.metaFont, "0.01em");
    ctx.fillText(ticket.eventDate, w - pad, pad + cap + headGap, headW);
    spaced.letterSpacing = "0px";
  }
  let y = typeTop;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = ticket.ink;
  spaced.letterSpacing = letterSpacingOf(ticket.nameFont, "-0.045em");
  wrapped.lines.forEach((line, i) => {
    const last = i === wrapped.lines.length - 1;
    setPrintFont(
      ctx,
      ticket.nameFont,
      wrapped.px,
      fontWeightOf(ticket.nameFont, 600),
    );
    ctx.fillText(line, pad - Math.round(wrapped.px * 0.04), y);
    y += last
      ? inkAdvance(ctx, line, wrapped.px)
      : lineAdvance(ctx, line, wrapped.px, nameLead);
  });
  spaced.letterSpacing = "0px";
  y += afterName;
  if (ticket.ticketType) {
    ctx.fillStyle = mute;
    setPrintFont(ctx, ticket.metaFont, metaSize);
    spaced.letterSpacing = letterSpacingOf(ticket.metaFont, "0.01em");
    ctx.fillText(ticket.ticketType, pad, y, col);
    spaced.letterSpacing = "0px";
    y += metaLead;
  }
  hairline(
    ctx,
    pad,
    hasRole ? y + Math.round(afterRole * 0.4) : footTop - gap * 0.75,
    col,
    rule,
  );
  let numberW = 0;
  if (ticket.ticketNumber) {
    ctx.fillStyle = ticket.ink;
    setPrintFont(
      ctx,
      ticket.numberFont,
      numberSize,
      fontWeightOf(ticket.numberFont, 600),
    );
    spaced.letterSpacing = letterSpacingOf(ticket.numberFont, "-0.04em");
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    numberW = ctx.measureText(ticket.ticketNumber).width;
    ctx.fillText(ticket.ticketNumber, w - pad, h - pad);
    spaced.letterSpacing = "0px";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
  }
  if (ticket.barcodeValue) {
    const bars = barcodeBars(ticket.barcodeValue);
    const barW = Math.round(
      clamp(col - numberW - gap * 1.5, col * 0.32, col * 0.58),
    );
    const barY = h - pad - cap - 8 - barH;
    const total = bars.reduce((sum, bar) => sum + bar.width, 0) || 1;
    let x = pad;
    for (const bar of bars) {
      const bw = (bar.width / total) * barW;
      if (bar.ink) {
        ctx.fillStyle = ticket.ink;
        ctx.fillRect(x, barY, Math.max(1, bw), barH);
      }
      x += bw;
    }
    ctx.fillStyle = faint;
    setPrintFont(ctx, ticket.metaFont, cap);
    spaced.letterSpacing = "0.14em";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(ticket.barcodeValue, pad, h - pad);
    spaced.letterSpacing = "0px";
    ctx.textBaseline = "top";
  }
  if (mask) {
    const m = mask.getContext("2d");
    if (m) {
      m.clearRect(0, 0, w, h);
      m.fillStyle = "#000000";
      m.fillRect(0, 0, w, h);
      if (ticket.logo) {
        paintMaskImage(m, ticket.logo, markX, markY, mark, mark);
      } else {
        paintMaskRect(m, markX, markY, mark, mark, radius);
      }
    }
  }
}
function drawBack(canvas, mask, ticket) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  const pad = ticket.pad;
  const mark = Math.round(w * 0.42);
  const markX = Math.round((w - mark) / 2);
  const markY = Math.round(h * 0.28);
  const spaced = ctx;
  const darkPaper = isDark(ticket.paper);
  const bg = darkPaper ? ticket.paper : ticket.ink;
  const fg = darkPaper ? ticket.ink : ticket.paper;
  ctx.clearRect(0, 0, w, h);
  if (ticket.backArt) {
    drawContained(ctx, ticket.backArt, 0, 0, w, h);
    ctx.fillStyle = inkAlpha(bg, 0.46);
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = inkAlpha(fg, 0.12);
  ctx.lineWidth = 2;
  ctx.strokeRect(pad * 0.45, pad * 0.45, w - pad * 0.9, h - pad * 0.9);
  if (ticket.eventName) {
    ctx.fillStyle = inkAlpha(fg, 0.55);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    setPrintFont(
      ctx,
      ticket.metaFont,
      parsePx(ticket.metaFont.fontSize, 22, META_MIN, META_MAX),
      fontWeightOf(ticket.metaFont, 500),
    );
    spaced.letterSpacing = "0.2em";
    ctx.fillText(ticket.eventName.toUpperCase(), w / 2, pad, w - pad * 2);
    spaced.letterSpacing = "0px";
  }
  if (ticket.logo) {
    drawContained(ctx, ticket.logo, markX, markY, mark, mark);
  } else {
    drawNdMark(ctx, markX, markY, mark, fg, bg, ticket.metaFont);
  }
  const line = ticket.reverseLine;
  if (line) {
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    spaced.letterSpacing = letterSpacingOf(ticket.numberFont, "0.04em");
    fitFont(ctx, line, ticket.numberFont, 56, 30, w - pad * 2);
    ctx.fillText(line, w / 2, markY + mark + typeGap(mark * 0.12, 56, pad));
    spaced.letterSpacing = "0px";
  }
  if (mask) {
    const m = mask.getContext("2d");
    if (m) {
      m.clearRect(0, 0, w, h);
      m.fillStyle = "#000000";
      m.fillRect(0, 0, w, h);
      if (ticket.backArt) {
        paintMaskRect(m, 0, 0, w, h, 0, 0.28);
      }
      if (ticket.logo) {
        paintMaskImage(m, ticket.logo, markX, markY, mark, mark);
      } else {
        paintMaskRect(m, markX, markY, mark, mark, 32);
      }
    }
  }
}
function applyMaxDist(a, b, maxDist) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist <= maxDist || dist < 1e-8) return;
  const frac = (dist - maxDist) / dist;
  const ox = dx * frac;
  const oy = dy * frac;
  const oz = dz * frac;
  if (a.pinned && b.pinned) return;
  if (a.pinned) {
    b.x -= ox;
    b.y -= oy;
    b.z -= oz;
    return;
  }
  if (b.pinned) {
    a.x += ox;
    a.y += oy;
    a.z += oz;
    return;
  }
  a.x += ox * 0.5;
  a.y += oy * 0.5;
  a.z += oz * 0.5;
  b.x -= ox * 0.5;
  b.y -= oy * 0.5;
  b.z -= oz * 0.5;
}
function applyMinDist(a, b, minDist) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist >= minDist || dist < 1e-8) return;
  const frac = (minDist - dist) / dist;
  const ox = dx * frac;
  const oy = dy * frac;
  const oz = dz * frac;
  if (a.pinned && b.pinned) return;
  if (a.pinned) {
    b.x += ox;
    b.y += oy;
    b.z += oz;
    return;
  }
  if (b.pinned) {
    a.x -= ox;
    a.y -= oy;
    a.z -= oz;
    return;
  }
  a.x -= ox * 0.5;
  a.y -= oy * 0.5;
  a.z -= oz * 0.5;
  b.x += ox * 0.5;
  b.y += oy * 0.5;
  b.z += oz * 0.5;
}
function particle(x, y, z, pinned = false) {
  return { x, y, z, ox: x, oy: y, oz: z, pinned };
}
function integrateParticle(p, dt, grav, damp) {
  if (p.pinned) {
    p.ox = p.x;
    p.oy = p.y;
    p.oz = p.z;
    return;
  }
  const vx = (p.x - p.ox) * damp;
  const vy = (p.y - p.oy) * damp;
  const vz = (p.z - p.oz) * damp;
  p.ox = p.x;
  p.oy = p.y;
  p.oz = p.z;
  p.x += vx;
  p.y += vy + grav * dt * dt;
  p.z += vz;
}
function makeTubeGeometry(three, pathSegs, radialSegs) {
  const geometry = new three.BufferGeometry();
  const rings = pathSegs + 1;
  const cols = radialSegs + 1;
  const positions = new Float32Array(rings * cols * 3);
  const normals = new Float32Array(rings * cols * 3);
  const uvs = new Float32Array(rings * cols * 2);
  const index = [];
  for (let i = 0; i <= pathSegs; i++) {
    for (let j = 0; j <= radialSegs; j++) {
      const u = i * cols + j;
      uvs[u * 2] = j / radialSegs;
      uvs[u * 2 + 1] = i / pathSegs;
    }
  }
  for (let i = 0; i < pathSegs; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * cols + j;
      const b = (i + 1) * cols + j;
      const c = (i + 1) * cols + j + 1;
      const d = i * cols + j + 1;
      index.push(a, b, d, b, c, d);
    }
  }
  geometry.setAttribute("position", new three.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new three.BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new three.BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  return { geometry, positions, normals, pathSegs, radialSegs };
}
function updateWebbing(
  three,
  points,
  camera,
  clipSideWorld,
  halfW,
  halfT,
  strap,
) {
  if (points.length < 2) return;
  const curve = new three.CatmullRomCurve3(points, false, "catmullrom", 0.45);
  const cols = strap.radialSegs + 1;
  const tan = new three.Vector3();
  const view = new three.Vector3();
  const sideCam = new three.Vector3();
  const sideClip = new three.Vector3();
  const side = new three.Vector3();
  const bin = new three.Vector3();
  const n = new three.Vector3();
  for (let i = 0; i <= strap.pathSegs; i++) {
    const t = i / strap.pathSegs;
    const p = curve.getPoint(t);
    tan.copy(curve.getTangent(t));
    if (tan.lengthSq() < 1e-8) tan.set(0, -1, 0);
    else tan.normalize();
    view.subVectors(camera.position, p);
    if (view.lengthSq() < 1e-8) view.set(0, 0, 1);
    else view.normalize();
    sideCam.crossVectors(tan, view);
    if (sideCam.lengthSq() < 1e-8) {
      sideCam.set(1, 0, 0);
      sideCam.cross(tan);
    }
    if (sideCam.lengthSq() < 1e-8) sideCam.set(1, 0, 0);
    else sideCam.normalize();
    sideClip.copy(clipSideWorld);
    sideClip.addScaledVector(tan, -sideClip.dot(tan));
    if (sideClip.lengthSq() < 1e-8) sideClip.copy(sideCam);
    else sideClip.normalize();
    if (sideClip.dot(sideCam) < 0) sideClip.negate();
    const twist = t < 0.55 ? 0 : (t - 0.55) / 0.45;
    const k = twist * twist * (3 - 2 * twist);
    side.lerpVectors(sideCam, sideClip, k);
    if (side.lengthSq() < 1e-8) side.copy(sideCam);
    else side.normalize();
    bin.crossVectors(tan, side).normalize();
    for (let j = 0; j <= strap.radialSegs; j++) {
      const v = (j / strap.radialSegs) * Math.PI * 2;
      const cx = Math.cos(v);
      const sy = Math.sin(v);
      n.set(
        (cx / halfW) * side.x + (sy / halfT) * bin.x,
        (cx / halfW) * side.y + (sy / halfT) * bin.y,
        (cx / halfW) * side.z + (sy / halfT) * bin.z,
      );
      if (n.lengthSq() < 1e-8) n.copy(side);
      else n.normalize();
      const o = (i * cols + j) * 3;
      strap.positions[o] = p.x + cx * side.x * halfW + sy * bin.x * halfT;
      strap.positions[o + 1] = p.y + cx * side.y * halfW + sy * bin.y * halfT;
      strap.positions[o + 2] = p.z + cx * side.z * halfW + sy * bin.z * halfT;
      strap.normals[o] = n.x;
      strap.normals[o + 1] = n.y;
      strap.normals[o + 2] = n.z;
    }
  }
  const pos = strap.geometry.getAttribute("position");
  const nor = strap.geometry.getAttribute("normal");
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  strap.geometry.computeBoundingSphere();
}
/**
 * Lanyard Pass
 *
 * Ticket badge on a hanging rope lanyard. Grab, throw, bounce.
 *
 * @framerIntrinsicWidth 400
 * @framerIntrinsicHeight 640
 *
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */ export default function Kern_LanyardPass(props) {
  const content = { ...DEFAULT_CONTENT, ...props.content };
  const look = { ...DEFAULT_LOOK, ...props.look };
  const light = { ...DEFAULT_LIGHT, ...props.light };
  const layout = { ...DEFAULT_LAYOUT, ...props.layout };
  const entrance = { ...DEFAULT_ENTRANCE, ...props.entrance };
  const { style } = props;
  const attendeeName = visibleText(content.attendeeName) ?? "—";
  const ticketType = visibleText(content.ticketType);
  const ticketNumber = visibleText(content.ticketNumber);
  const eventName = visibleText(content.eventName);
  const eventDate = visibleText(content.eventDate);
  const barcodeValue = visibleText(content.barcodeValue) ?? "";
  const reverse = reverseLine(
    visibleText(content.backText),
    content.backLine,
    ticketNumber,
    attendeeName,
    eventName,
  );
  const strapText = visibleText(content.strapText) ?? eventName;
  const paper = asText(look.paper) || PAPER;
  const ink = asText(look.ink) || INK;
  const accent = asText(look.accent) || ACCENT;
  const strapColor = asText(look.strapColor) || STRAP;
  const strapStyle = asStrapStyle(look.strapStyle);
  const finish = asFinish(look.finish);
  const sleeveTexture = asSleeveTexture(look.sleeveTexture);
  const photoFit = asPhotoFit(look.photoFit);
  const foil = asFoil(look.foil);
  const sleeveOn = Boolean(look.sleeve);
  const lightAngle = clamp(
    typeof light.angle === "number" ? light.angle : DEFAULT_LIGHT.angle,
    -180,
    180,
  );
  const lightHeight = clamp(
    typeof light.height === "number" ? light.height : DEFAULT_LIGHT.height,
    -20,
    85,
  );
  const lightIntensity = clamp(
    typeof light.intensity === "number"
      ? light.intensity
      : DEFAULT_LIGHT.intensity,
    0,
    2,
  );
  const rimOn = light.rim !== false;
  const logoSrc = imageSrc(look.logo) ?? DEMO_LOGO;
  const photoSrc = imageSrc(look.photo) ?? DEMO_PHOTO;
  const backArtSrc = imageSrc(look.backArt);
  const size = clampSize(
    typeof layout.size === "number" ? layout.size : DEFAULT_LAYOUT.size,
  );
  const padding = clampPad(
    typeof layout.padding === "number"
      ? layout.padding
      : DEFAULT_LAYOUT.padding,
  );
  const stackGap = clampStackGap(
    typeof layout.stackGap === "number"
      ? layout.stackGap
      : DEFAULT_LAYOUT.stackGap,
  );
  const nameFont = asPrintFont(look.nameFont, DEFAULT_NAME_FONT);
  const metaFont = asPrintFont(look.metaFont, DEFAULT_META_FONT);
  const numberFont = asPrintFont(look.numberFont, DEFAULT_NUMBER_FONT);
  const typeKey = [
    fontFamilyOf(nameFont),
    nameFont.fontSize,
    fontWeightOf(nameFont, 600),
    fontStyleOf(nameFont),
    letterSpacingOf(nameFont, "-0.045em"),
    nameFont.lineHeight,
    fontFamilyOf(metaFont),
    metaFont.fontSize,
    fontWeightOf(metaFont, 400),
    fontStyleOf(metaFont),
    letterSpacingOf(metaFont, "0.01em"),
    fontFamilyOf(numberFont),
    numberFont.fontSize,
    fontWeightOf(numberFont, 600),
    fontStyleOf(numberFont),
    letterSpacingOf(numberFont, "-0.04em"),
  ].join("|");
  const thicknessMm = clamp(
    typeof layout.thickness === "number"
      ? layout.thickness
      : DEFAULT_LAYOUT.thickness,
    THICK_MIN,
    THICK_MAX,
  );
  const depth = thicknessMm / MM_PER_UNIT;
  const physicsOn = motionEnabled(props.motion);
  const isStatic = false;
  const prefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = Boolean(prefersReducedMotion);
  const freeze = isStatic || !physicsOn || reducedMotion;
  const [status, setStatus] = useState("boot"); // The loading label is client-only, so crawlers and the page's Markdown never read it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    startTransition(() => setMounted(true));
  }, []);
  const [failure, setFailure] = useState(null);
  const [artFailures, setArtFailures] = useState({});
  const [artTick, setArtTick] = useState(0);
  const flatRef = useRef(null);
  const rootRef = useRef(null);
  const engineRef = useRef(null);
  const freezeRef = useRef(freeze);
  freezeRef.current = freeze;
  const staticRef = useRef(isStatic);
  staticRef.current = isStatic;
  const entranceRef = useRef({
    drop: entrance.entrance === "drop",
    once: entrance.entrancePlay === "session",
  });
  entranceRef.current = {
    drop: entrance.entrance === "drop",
    once: entrance.entrancePlay === "session",
  };
  const ticketRef = useRef({
    attendeeName,
    ticketType,
    ticketNumber,
    eventName,
    eventDate,
    barcodeValue,
    paper,
    ink,
    accent,
    pad: padding,
    stackGap,
    nameFont,
    metaFont,
    numberFont,
    reverseLine: reverse,
    strapColor,
    strapStyle,
    strapText,
    logo: null,
    photo: null,
    backArt: null,
    photoFit,
  });
  ticketRef.current = {
    attendeeName,
    ticketType,
    ticketNumber,
    eventName,
    eventDate,
    barcodeValue,
    paper,
    ink,
    accent,
    pad: padding,
    stackGap,
    nameFont,
    metaFont,
    numberFont,
    reverseLine: reverse,
    strapColor,
    strapStyle,
    strapText,
    logo: ticketRef.current.logo,
    photo: ticketRef.current.photo,
    backArt: ticketRef.current.backArt,
    photoFit,
  };
  const artRef = useRef({ logo: null, photo: null, backArt: null }); // The entrance only drops a finished card: every image loaded and the type in.
  const artReadyRef = useRef({
    logo: false,
    photo: false,
    backArt: false,
    type: false,
    failed: false,
  });
  const foilRef = useRef(foil);
  foilRef.current = foil;
  const sleeveRef = useRef(sleeveOn);
  sleeveRef.current = sleeveOn;
  const finishRef = useRef(finish);
  finishRef.current = finish;
  const sleeveTexRef = useRef(sleeveTexture);
  sleeveTexRef.current = sleeveTexture;
  const lightRef = useRef({
    angle: lightAngle,
    height: lightHeight,
    intensity: lightIntensity,
    rim: rimOn,
  });
  lightRef.current = {
    angle: lightAngle,
    height: lightHeight,
    intensity: lightIntensity,
    rim: rimOn,
  };
  const depthRef = useRef(depth);
  depthRef.current = depth; // Without WebGL the front face is still painted, flat, so the pass never goes blank.
  const paintFlat = () => {
    const canvas = flatRef.current;
    if (!canvas) return;
    const ticket = ticketRef.current;
    ticket.logo = artRef.current.logo;
    ticket.photo = artRef.current.photo;
    ticket.backArt = artRef.current.backArt;
    drawFront(canvas, null, ticket);
  };
  const stageH = Math.round(size * 1.72);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = rootRef.current;
    if (!host) return;
    let cancelled = false;
    let dispose;
    let built = null;
    const fail = (reason, detail) => {
      if (cancelled) return;
      startTransition(() => {
        setFailure({ reason, detail });
        setStatus("fail");
      });
    }; // The entrance drop: the card waits at the top of the stage until the loop first runs, then
    // lets itself down on its strap, which pays out (seg) up to its own length; the page is told once.
    const arrival = {
      pending: false,
      started: false,
      told: true,
      seg: SEG_LEN,
      since: 0,
    };
    const tellPage = (dropped) => {
      if (arrival.told) return;
      arrival.told = true;
      signalCatch(dropped);
    };
    void (async () => {
      try {
        const stage = rootRef.current;
        if (cancelled || !stage) return;
        const stageEl = stage; // Framer renders an instance per breakpoint: a hidden copy neither drops, claims the
        // session nor tells the page. The canvas and the static export stay silent too.
        const shown = stageEl.clientWidth > 0 && stageEl.clientHeight > 0;
        const plan = entranceRef.current;
        const willDrop =
          shown &&
          !freezeRef.current &&
          plan.drop &&
          !(plan.once && entrancePlayed());
        if (shown && !staticRef.current && !willDrop) signalCatch(false);
        arrival.told = !willDrop;
        if (!webglAvailable()) {
          fail("no-webgl", "");
          tellPage(false);
          return;
        }
        const clipY = 2.05;
        const cardHalfH = CARD_H / 2;
        function hangY() {
          return cardHalfH + (sleeveRef.current ? SLEEVE_HEAD : 0);
        }
        function drop() {
          return hangY() - HOLE;
        }
        const clip = particle(0, clipY, 0, true);
        const joints = [];
        for (let i = 0; i < JOINTS; i++) {
          joints.push(particle(0, clipY - SEG_LEN * (i + 1), 0));
        }
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
        camera.position.set(CAM_X, CAM_Y, CAM_Z);
        camera.up.set(0, 1, 0);
        camera.lookAt(0, CAM_LOOK_Y, 0);
        camera.updateMatrixWorld(true);
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        });
        built = renderer;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setClearColor(0, 0);
        if ("SRGBColorSpace" in THREE) {
          renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
        renderer.shadowMap.enabled = false;
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.display = "block";
        renderer.domElement.setAttribute("aria-hidden", "true"); // The page scrolls under the stage; only a touch that starts on the card holds it (see onTouch).
        renderer.domElement.style.touchAction = "manipulation";
        stageEl.appendChild(renderer.domElement);
        const envMap = makeStudioEnvironment(THREE, renderer);
        if (envMap) {
          scene.environment = envMap;
          scene.environmentIntensity = 1.05;
        }
        const hemi = new THREE.HemisphereLight(14673650, 723983, 0.22);
        scene.add(hemi);
        const key = new THREE.DirectionalLight(16185599, 1.25);
        key.position.set(1.6, 6.4, 3.8);
        scene.add(key);
        const fill = new THREE.DirectionalLight(10466518, 0.22);
        fill.position.set(-3.4, 0.6, 3.2);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(12375039, 1.4);
        rim.position.set(-3.2, 2.2, -2.6);
        scene.add(rim);
        const kicker = new THREE.DirectionalLight(16777215, 0.55);
        kicker.position.set(2.4, -1.2, -3.4);
        scene.add(kicker);
        const frontCanvas = document.createElement("canvas");
        frontCanvas.width = TEX_W;
        frontCanvas.height = TEX_H;
        const backCanvas = document.createElement("canvas");
        backCanvas.width = TEX_W;
        backCanvas.height = TEX_H;
        const frontMaskCanvas = document.createElement("canvas");
        frontMaskCanvas.width = TEX_W;
        frontMaskCanvas.height = TEX_H;
        const backMaskCanvas = document.createElement("canvas");
        backMaskCanvas.width = TEX_W;
        backMaskCanvas.height = TEX_H;
        drawFront(frontCanvas, frontMaskCanvas, ticketRef.current);
        drawBack(backCanvas, backMaskCanvas, ticketRef.current);
        const frontMap = new THREE.CanvasTexture(frontCanvas);
        const backMap = new THREE.CanvasTexture(backCanvas);
        const frontMaskMap = new THREE.CanvasTexture(frontMaskCanvas);
        const backMaskMap = new THREE.CanvasTexture(backMaskCanvas);
        frontMap.anisotropy = 8;
        backMap.anisotropy = 8;
        frontMap.colorSpace = THREE.SRGBColorSpace;
        backMap.colorSpace = THREE.SRGBColorSpace;
        frontMaskMap.colorSpace = THREE.NoColorSpace;
        backMaskMap.colorSpace = THREE.NoColorSpace;
        frontMap.needsUpdate = true;
        backMap.needsUpdate = true;
        frontMaskMap.needsUpdate = true;
        backMaskMap.needsUpdate = true;
        const edgeMat = new THREE.MeshStandardMaterial({
          color: edgeTone(THREE, ticketRef.current.paper),
          roughness: 0.34,
          metalness: 0.04,
          envMapIntensity: 1.3,
        });
        const frontMat = new THREE.MeshPhysicalMaterial({
          map: frontMap,
          roughness: 0.26,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.55,
        });
        const backMat = new THREE.MeshPhysicalMaterial({
          map: backMap,
          roughness: 0.26,
          metalness: 0,
          clearcoat: 1,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.55,
        });
        let cardGeo = new THREE.BoxGeometry(CARD_W, CARD_H, depthRef.current);
        const cardMesh = new THREE.Mesh(cardGeo, [
          edgeMat,
          edgeMat,
          edgeMat,
          edgeMat,
          frontMat,
          backMat,
        ]);
        scene.add(cardMesh);
        const holoMap = makeHoloTexture(THREE);
        const holoFrontMat = makeFoilMaterial(THREE, holoMap, frontMaskMap);
        const holoBackMat = makeFoilMaterial(THREE, holoMap, backMaskMap);
        const edgeHoloMap = holoMap.clone();
        edgeHoloMap.repeat.set(0.05, 0.12);
        edgeHoloMap.needsUpdate = true;
        const edgeHoloMat = makeFoilMaterial(THREE, edgeHoloMap, null);
        edgeHoloMat.opacity = 0.9;
        edgeHoloMat.depthWrite = true;
        const holoGeo = new THREE.PlaneGeometry(CARD_W * 0.99, CARD_H * 0.99);
        const holoFront = new THREE.Mesh(holoGeo, holoFrontMat);
        holoFront.position.z = depthRef.current / 2 + 0.003;
        holoFront.renderOrder = 1;
        cardMesh.add(holoFront);
        const holoBack = new THREE.Mesh(holoGeo, holoBackMat);
        holoBack.rotation.y = Math.PI;
        holoBack.position.z = -(depthRef.current / 2 + 0.003);
        holoBack.renderOrder = 1;
        cardMesh.add(holoBack);
        const wobble = makeNormalTexture(THREE, 256, softWobble, 3, 0.7, 1);
        const wobbleCrisp = makeNormalTexture(
          THREE,
          256,
          crispWobble,
          3.4,
          1,
          1.25,
        );
        const linen = makeNormalTexture(THREE, 256, linenWeave, 1.4, 4, 6);
        const sleeveMat = new THREE.MeshPhysicalMaterial({
          color: 723983,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
          roughness: 0.07,
          metalness: 0,
          depthWrite: false,
          clearcoat: 1,
          clearcoatRoughness: 0.05,
          envMapIntensity: 1.8,
          specularIntensity: 1,
          normalMap: wobble ?? undefined,
          normalScale: new THREE.Vector2(0.012, 0.012),
          clearcoatNormalMap: wobble ?? undefined,
          clearcoatNormalScale: new THREE.Vector2(0.02, 0.02),
        });
        let sleeveGeo = new THREE.BoxGeometry(
          CARD_W + SLEEVE_PAD_W,
          CARD_H + SLEEVE_PAD_H,
          depthRef.current + SLEEVE_PAD_D,
        );
        const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
        sleeveMesh.position.y = SLEEVE_SHIFT;
        sleeveMesh.renderOrder = 2;
        sleeveMesh.visible = sleeveRef.current;
        cardMesh.add(sleeveMesh);
        const seamW = 0.045;
        const seamOuter = new THREE.Shape();
        const sw = (CARD_W + SLEEVE_PAD_W) / 2;
        const sh = (CARD_H + SLEEVE_PAD_H) / 2;
        seamOuter.moveTo(-sw, -sh);
        seamOuter.lineTo(sw, -sh);
        seamOuter.lineTo(sw, sh);
        seamOuter.lineTo(-sw, sh);
        seamOuter.closePath();
        const seamInner = new THREE.Path();
        seamInner.moveTo(-sw + seamW, -sh + seamW);
        seamInner.lineTo(sw - seamW, -sh + seamW);
        seamInner.lineTo(sw - seamW, sh - seamW);
        seamInner.lineTo(-sw + seamW, sh - seamW);
        seamInner.closePath();
        seamOuter.holes.push(seamInner);
        const openingY = cardHalfH + 0.02 - SLEEVE_SHIFT;
        const opening = new THREE.Shape();
        opening.moveTo(-sw + seamW, openingY - 0.008);
        opening.lineTo(sw - seamW, openingY - 0.008);
        opening.lineTo(sw - seamW, openingY + 0.008);
        opening.lineTo(-sw + seamW, openingY + 0.008);
        opening.closePath();
        const seamGeo = new THREE.ShapeGeometry([seamOuter, opening]);
        const seamMat = new THREE.MeshPhysicalMaterial({
          color: 16777215,
          transparent: true,
          opacity: 0.14,
          roughness: 0.55,
          metalness: 0,
          depthWrite: false,
          clearcoat: 0.4,
          clearcoatRoughness: 0.4,
          envMapIntensity: 0.9,
        });
        const seamFront = new THREE.Mesh(seamGeo, seamMat);
        const seamBack = new THREE.Mesh(seamGeo, seamMat);
        seamBack.rotation.y = Math.PI;
        for (const seam of [seamFront, seamBack]) {
          seam.renderOrder = 3;
          sleeveMesh.add(seam);
        }
        function placeSeams(d) {
          const z = (d + SLEEVE_PAD_D) / 2 + 0.0015;
          seamFront.position.z = z;
          seamBack.position.z = -z;
        }
        placeSeams(depthRef.current);
        const clipMat = new THREE.MeshStandardMaterial({
          color: 14078666,
          metalness: 0.92,
          roughness: 0.2,
        });
        const clipShape = new THREE.Shape();
        const cw = 0.26;
        const ch = 0.078;
        const cr = 0.022;
        clipShape.moveTo(-cw / 2 + cr, -ch / 2);
        clipShape.lineTo(cw / 2 - cr, -ch / 2);
        clipShape.quadraticCurveTo(cw / 2, -ch / 2, cw / 2, -ch / 2 + cr);
        clipShape.lineTo(cw / 2, ch / 2 - cr);
        clipShape.quadraticCurveTo(cw / 2, ch / 2, cw / 2 - cr, ch / 2);
        clipShape.lineTo(-cw / 2 + cr, ch / 2);
        clipShape.quadraticCurveTo(-cw / 2, ch / 2, -cw / 2, ch / 2 - cr);
        clipShape.lineTo(-cw / 2, -ch / 2 + cr);
        clipShape.quadraticCurveTo(-cw / 2, -ch / 2, -cw / 2 + cr, -ch / 2);
        const clipGeo = new THREE.ExtrudeGeometry(clipShape, {
          depth: 0.08,
          bevelEnabled: true,
          bevelThickness: 0.008,
          bevelSize: 0.007,
          bevelSegments: 3,
          curveSegments: 6,
        });
        clipGeo.center();
        const badgeClip = new THREE.Mesh(clipGeo, clipMat);
        badgeClip.position.set(0, cardHalfH + 0.016, 0);
        cardMesh.add(badgeClip);
        const clipSlot = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.018, 0.1),
          new THREE.MeshStandardMaterial({
            color: 1710618,
            metalness: 0.2,
            roughness: 0.8,
          }),
        );
        clipSlot.position.set(0, 0.04, 0);
        badgeClip.add(clipSlot);
        const clipMesh = new THREE.Mesh(
          new THREE.TorusGeometry(0.07, 0.016, 10, 22),
          clipMat,
        );
        clipMesh.position.set(0, clipY, 0);
        clipMesh.rotation.x = Math.PI / 2;
        scene.add(clipMesh);
        const strap = makeTubeGeometry(THREE, STRAP_SEGS, STRAP_RADIAL);
        const strapCanvas = document.createElement("canvas");
        strapCanvas.width = STRAP_TEX_W;
        strapCanvas.height = STRAP_TEX_H;
        drawStrap(strapCanvas, ticketRef.current);
        const strapMap = new THREE.CanvasTexture(strapCanvas);
        strapMap.colorSpace = THREE.SRGBColorSpace;
        strapMap.wrapS = THREE.RepeatWrapping;
        strapMap.wrapT = THREE.RepeatWrapping;
        strapMap.repeat.set(1, STRAP_REPEAT);
        strapMap.anisotropy = 8;
        strapMap.needsUpdate = true;
        const strapMat = new THREE.MeshStandardMaterial({
          map: strapMap,
          roughness: 0.82,
          metalness: 0,
        });
        const strapMesh = new THREE.Mesh(strap.geometry, strapMat);
        scene.add(strapMesh);
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const dragPlane = new THREE.Plane();
        const planeHit = new THREE.Vector3();
        const camDir = new THREE.Vector3();
        const holeWorld = new THREE.Vector3();
        const clipAxis = new THREE.Vector3();
        const faceNormal = new THREE.Vector3();
        const viewDir = new THREE.Vector3();
        const jointPts = [
          new THREE.Vector3(),
          new THREE.Vector3(),
          new THREE.Vector3(),
          new THREE.Vector3(),
        ];
        const grabOff = { x: 0, y: 0, z: 0 };
        const grabState = {
          down: false,
          pointerId: -1,
          lastT: 0,
          lastNdcX: 0,
          vx: 0,
          vy: 0,
          vz: 0,
        };
        let acc = 0;
        let spinY = 0.16;
        let spinVel = 0;
        let simT = 0;
        let lastDepth = depthRef.current;
        function paintTicket() {
          ticketRef.current.logo = artRef.current.logo;
          ticketRef.current.photo = artRef.current.photo;
          ticketRef.current.backArt = artRef.current.backArt;
          drawFront(frontCanvas, frontMaskCanvas, ticketRef.current);
          drawBack(backCanvas, backMaskCanvas, ticketRef.current);
          drawStrap(strapCanvas, ticketRef.current);
          frontMap.needsUpdate = true;
          backMap.needsUpdate = true;
          frontMaskMap.needsUpdate = true;
          backMaskMap.needsUpdate = true;
          strapMap.needsUpdate = true;
          edgeMat.color.copy(edgeTone(THREE, ticketRef.current.paper));
          applyCardLook();
          if (freezeRef.current) presentStill();
        }
        function presentStill() {
          frameCamera(); // A drop that hasn't started waits above the stage until it's in view.
          if (!arrival.pending) poseHang(0);
          syncVisuals();
          renderer.render(scene, camera);
        }
        function applyCardLook() {
          const d = depthRef.current;
          if (Math.abs(d - lastDepth) > 1e-4) {
            lastDepth = d;
            const nextCard = new THREE.BoxGeometry(CARD_W, CARD_H, d);
            cardMesh.geometry.dispose();
            cardMesh.geometry = nextCard;
            cardGeo = nextCard;
            const nextSleeve = new THREE.BoxGeometry(
              CARD_W + SLEEVE_PAD_W,
              CARD_H + SLEEVE_PAD_H,
              d + SLEEVE_PAD_D,
            );
            sleeveMesh.geometry.dispose();
            sleeveMesh.geometry = nextSleeve;
            sleeveGeo = nextSleeve;
            holoFront.position.z = d / 2 + 0.003;
            holoBack.position.z = -(d / 2 + 0.003);
            badgeClip.scale.z = Math.max(1, (d + 0.03) / 0.08);
            placeSeams(d);
          }
          const mode = foilRef.current;
          const marks = foilHasMarks(mode);
          const edges = foilHasEdges(mode);
          holoFront.visible = marks;
          holoBack.visible = marks;
          cardMesh.material = edges
            ? [
                edgeHoloMat,
                edgeHoloMat,
                edgeHoloMat,
                edgeHoloMat,
                frontMat,
                backMat,
              ]
            : [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat];
          applyLight();
          sleeveMesh.visible = sleeveRef.current;
          const sleeved = sleeveRef.current;
          badgeClip.position.y = hangY() + 0.016;
          let clearcoat;
          let roughness;
          let envMapIntensity;
          let faceNormal;
          let faceNormalScale;
          switch (finishRef.current) {
            case "gloss":
              clearcoat = 1;
              roughness = 0.26;
              envMapIntensity = 1.55;
              faceNormal = null;
              faceNormalScale = 0;
              break;
            case "matte":
              clearcoat = 0;
              roughness = 0.82;
              envMapIntensity = 0.7;
              faceNormal = null;
              faceNormalScale = 0;
              break;
            case "linen":
              clearcoat = 0.22;
              roughness = 0.68;
              envMapIntensity = 0.92;
              faceNormal = linen;
              faceNormalScale = 0.18;
              break;
            default: {
              const exhaustive = finishRef.current;
              return exhaustive;
            }
          }
          if (sleeved) {
            clearcoat = Math.min(clearcoat, 0.08);
            roughness = Math.max(roughness, 0.62);
            envMapIntensity = Math.min(envMapIntensity, 0.5);
          }
          for (const face of [frontMat, backMat]) {
            face.clearcoat = clearcoat;
            face.roughness = roughness;
            face.envMapIntensity = envMapIntensity;
            if (face.normalMap !== faceNormal) {
              face.normalMap = faceNormal;
              face.needsUpdate = true;
            }
            face.normalScale.set(faceNormalScale, faceNormalScale);
          }
          let pvcNormal;
          let pvcScale;
          let pvcCoatScale;
          let pvcRough;
          let pvcCoatRough;
          let pvcHaze;
          switch (sleeveTexRef.current) {
            case "clear":
              pvcNormal = wobble;
              pvcScale = 0.012;
              pvcCoatScale = 0.02;
              pvcRough = 0.07;
              pvcCoatRough = 0.05;
              pvcHaze = 723983;
              break;
            case "frosted":
              pvcNormal = wobble;
              pvcScale = 0.012;
              pvcCoatScale = 0.02;
              pvcRough = 0.42;
              pvcCoatRough = 0.5;
              pvcHaze = 1447706;
              break;
            case "textured":
              pvcNormal = wobbleCrisp;
              pvcScale = 0.022;
              pvcCoatScale = 0.03;
              pvcRough = 0.1;
              pvcCoatRough = 0.08;
              pvcHaze = 723983;
              break;
            default: {
              const exhaustive = sleeveTexRef.current;
              return exhaustive;
            }
          }
          if (sleeveMat.normalMap !== pvcNormal) {
            sleeveMat.normalMap = pvcNormal;
            sleeveMat.clearcoatNormalMap = pvcNormal;
            sleeveMat.needsUpdate = true;
          }
          sleeveMat.normalScale.set(pvcScale, pvcScale);
          sleeveMat.clearcoatNormalScale.set(pvcCoatScale, pvcCoatScale);
          sleeveMat.roughness = pvcRough;
          sleeveMat.clearcoatRoughness = pvcCoatRough;
          sleeveMat.color.setHex(pvcHaze);
        }
        let lastLightKey = "";
        function applyLight() {
          const l = lightRef.current;
          const sig = `${l.angle}|${l.height}|${l.intensity}|${l.rim}`;
          if (sig === lastLightKey) return;
          lastLightKey = sig;
          const az = (l.angle * Math.PI) / 180;
          const el = (l.height * Math.PI) / 180;
          const r = 7.5;
          const x = r * Math.cos(el) * Math.sin(az);
          const y = r * Math.sin(el);
          const z = r * Math.cos(el) * Math.cos(az);
          key.position.set(x, y, z);
          key.intensity = 1.25 * l.intensity;
          fill.position.set(
            -x * 0.7,
            Math.max(0.4, y * 0.1),
            Math.abs(z) * 0.85,
          );
          fill.intensity = 0.22 * l.intensity;
          rim.position.set(
            -x * 0.75,
            Math.max(1.2, y * 0.35),
            -Math.abs(z) * 0.7,
          );
          rim.intensity = l.rim ? 1.4 * l.intensity : 0;
          kicker.position.set(x * 0.6, -1.2, -Math.abs(z) * 0.9);
          kicker.intensity = l.rim ? 0.55 * l.intensity : 0.2 * l.intensity;
          hemi.intensity = 0.22 * l.intensity;
          scene.environmentIntensity = 1.05 * l.intensity;
          scene.environmentRotation.set(
            0,
            ((l.angle - DEFAULT_LIGHT.angle) * Math.PI) / 180,
            0,
          );
        }
        function poseHang(angle) {
          for (let i = 0; i < JOINTS; i++) {
            const dist = SEG_LEN * (i + 1);
            const j = joints[i];
            j.x = Math.sin(angle) * dist;
            j.y = clipY - Math.cos(angle) * dist;
            j.z = 0;
            j.ox = j.x;
            j.oy = j.y;
            j.oz = j.z;
            j.pinned = false;
          }
        } // Just above the stage's top edge, out of sight, a little to the side of the clip, the strap
        // strung straight to it, nothing moving. Gravity brings it in through the edge from here.
        function poseEntrance() {
          const ray = raycaster.ray;
          raycaster.setFromCamera(pointer.set(0, 1), camera);
          const top =
            ray.origin.y + ray.direction.y * (-ray.origin.z / ray.direction.z);
          const holeY =
            top +
            drop() +
            CARD_H / 2 +
            (sleeveRef.current ? SLEEVE_LIP : 0) +
            ENTRY_GAP; // On a narrow stage, closer to the clip so the whole card starts in frame.
          raycaster.setFromCamera(pointer.set(-1, 1), camera);
          const left =
            ray.origin.x + ray.direction.x * (-ray.origin.z / ray.direction.z);
          const side = Math.min(
            0,
            Math.max(ENTRY_SIDE, left + (CARD_W + SLEEVE_PAD_W) / 2 + 0.04),
          );
          for (let i = 0; i < JOINTS; i++) {
            const j = joints[i];
            j.x = (side * (i + 1)) / JOINTS;
            j.y = clipY + ((holeY - clipY) * (i + 1)) / JOINTS;
            j.z = 0;
            j.ox = j.x;
            j.oy = j.y;
            j.oz = j.z;
            j.pinned = false;
          }
          arrival.seg = Math.hypot(side, clipY - holeY) / JOINTS; // Already at its resting turn: on the way down only the strap moves it.
          spinY =
            Math.round(spinY / (Math.PI * 2)) * Math.PI * 2 +
            Math.sin(simT * 0.55) * 0.07;
          spinVel = 0;
        } // Its first visible frame is the finished card: draw it once at rest in a frame that never
        // reaches the screen (shaders compiled, textures uploaded), then put it back above the stage.
        function startDrop() {
          poseHang(0);
          syncVisuals();
          renderer.render(scene, camera);
          poseEntrance();
          arrival.pending = false;
          arrival.started = true;
          if (entranceRef.current.once) markEntrance();
        }
        function solveRope() {
          const seg = arrival.seg;
          const min = seg * 0.34;
          const chain = [clip, ...joints];
          for (let n = 0; n < ROPE_ITERS; n++) {
            for (let i = 0; i < chain.length - 1; i++) {
              applyMaxDist(chain[i], chain[i + 1], seg);
              applyMinDist(chain[i], chain[i + 1], min);
            }
          }
          const floor = clipY - SEG_LEN * JOINTS * 1.45;
          for (const joint of joints) {
            if (joint.y > clipY - 0.03) joint.y = clipY - 0.03;
            if (joint.y < floor) joint.y = floor;
            joint.z *= 0.92;
          }
        }
        function simulate() {
          const hole = joints[JOINTS - 1];
          if (arrival.pending) {
            // Waits out of sight for its art and type, then drops; gives up to the rest pose if they
            // fail or don't come in time.
            const art = artReadyRef.current;
            const now = performance.now();
            arrival.since = arrival.since || now;
            if (art.failed || now - arrival.since > ART_WAIT) {
              endEntrance();
              return;
            }
            if (!(art.logo && art.photo && art.backArt && art.type)) return;
            startDrop();
          }
          hole.pinned = grabState.down; // Falling, the card meets no air; the damping returns with the catch.
          const air = arrival.seg < SEG_LEN ? 1 : AIR;
          for (const joint of joints) {
            integrateParticle(joint, DT, GRAVITY, air);
          }
          if (arrival.seg < SEG_LEN) {
            // Paying out: the strap gives the falling card all the length it takes, up to its own,
            // and runs straight from the clip to it without pulling. At full length it goes taut and
            // catches the card.
            const reach = Math.hypot(
              hole.x - clip.x,
              hole.y - clip.y,
              hole.z - clip.z,
            );
            arrival.seg = Math.min(SEG_LEN, reach / JOINTS);
            if (arrival.seg === SEG_LEN) tellPage(true);
            for (let i = 0; i < JOINTS - 1; i++) {
              const t = (i + 1) / JOINTS;
              const j = joints[i];
              j.x = clip.x + (hole.x - clip.x) * t;
              j.y = clip.y + (hole.y - clip.y) * t;
              j.z = clip.z + (hole.z - clip.z) * t;
              j.ox = clip.x + (hole.ox - clip.x) * t;
              j.oy = clip.y + (hole.oy - clip.y) * t;
              j.oz = clip.z + (hole.oz - clip.z) * t;
            }
          }
          if (arrival.seg === SEG_LEN) solveRope();
          simT += DT;
          if (!grabState.down) {
            const turn = Math.PI * 2;
            const home = Math.round(spinY / turn) * turn;
            const sway = Math.sin(simT * 0.55) * 0.07;
            const target = home + sway;
            const fast = Math.abs(spinVel) > 1.6;
            if (fast) {
              spinVel *= 0.985;
            } else {
              spinVel += (target - spinY) * IDLE_SPRING * DT;
              spinVel *= Math.pow(IDLE_DAMP, DT * 60);
            }
            spinY += spinVel * DT;
            hole.x += Math.sin(simT * 0.7) * 45e-5;
          }
        }
        function settle() {
          poseHang(0);
          for (let i = 0; i < 48; i++) simulate();
          spinY = 0.16;
          spinVel = 0;
        }
        function cardCenter() {
          const hole = joints[JOINTS - 1];
          return { x: hole.x, y: hole.y - drop(), z: hole.z };
        }
        function syncVisuals() {
          const hole = joints[JOINTS - 1];
          const reach = SEG_LEN * JOINTS || 1;
          const swing = clamp(hole.x / reach, -1, 1); // Level while the strap pays out: on the way down the card just hangs from it.
          const lift =
            arrival.seg < SEG_LEN
              ? 0
              : clamp((clipY - SEG_LEN * JOINTS - hole.y) / reach, -1, 1);
          cardMesh.position.set(hole.x, hole.y - drop(), hole.z);
          cardMesh.rotation.set(-0.18 + lift * 0.22, spinY, swing * 0.12);
          cardMesh.updateMatrixWorld(true);
          jointPts[0].set(clip.x, clip.y, clip.z);
          jointPts[1].set(joints[0].x, joints[0].y, joints[0].z);
          jointPts[2].set(joints[1].x, joints[1].y, joints[1].z);
          holeWorld.set(0, hangY() + 0.02, 0);
          holeWorld.applyMatrix4(cardMesh.matrixWorld);
          jointPts[3].copy(holeWorld);
          clipAxis.set(1, 0, 0);
          clipAxis.transformDirection(cardMesh.matrixWorld);
          const cord = ticketRef.current.strapStyle === "cord";
          updateWebbing(
            THREE,
            jointPts,
            camera,
            clipAxis,
            cord ? CORD_R : STRAP_HALF_W,
            cord ? CORD_R : STRAP_HALF_T,
            strap,
          ); // While the strap pays out, its print stays with the card and new print comes out at the top.
          const paid = arrival.seg / SEG_LEN;
          const repeat = (cord ? CORD_REPEAT : STRAP_REPEAT) * paid;
          const offset = (cord ? CORD_REPEAT : STRAP_REPEAT) * (1 - paid);
          if (strapMap.repeat.y !== repeat || strapMap.offset.y !== offset) {
            strapMap.repeat.set(1, repeat);
            strapMap.offset.set(0, offset);
            strapMat.roughness = cord ? 0.7 : 0.82;
            badgeClip.scale.x = cord ? 0.6 : 1;
          }
          applyCardLook();
          const mode = foilRef.current;
          if (foilHasMarks(mode) || foilHasEdges(mode)) {
            faceNormal.set(0, 0, 1);
            faceNormal.transformDirection(cardMesh.matrixWorld);
            viewDir.subVectors(camera.position, cardMesh.position).normalize();
            const facing = faceNormal.dot(viewDir);
            const glance = clamp((0.92 - Math.abs(facing)) / 0.6, 0, 1);
            const sweep = glance * glance * (3 - 2 * glance);
            holoMap.offset.x = spinY * 0.35 + facing * 0.9;
            holoMap.offset.y = spinY * 0.12 - facing * 0.25;
            edgeHoloMap.offset.x = holoMap.offset.x * 0.6;
            const foilAlpha = 0.5 + 0.35 * sweep;
            const glow = 0.32 + 0.9 * sweep;
            const thick = [110 + sweep * 120, 460 + Math.abs(spinY) * 24];
            holoFrontMat.opacity = foilAlpha;
            holoBackMat.opacity = foilAlpha;
            holoFrontMat.emissiveIntensity = glow;
            holoBackMat.emissiveIntensity = glow;
            holoFrontMat.iridescenceThicknessRange = thick;
            holoBackMat.iridescenceThicknessRange = thick;
            edgeHoloMat.emissiveIntensity = 0.18 + 0.55 * sweep;
            edgeHoloMat.iridescenceThicknessRange = thick;
          }
        }
        function frameCamera() {
          const w = Math.max(1, stageEl.clientWidth);
          const h = Math.max(1, stageEl.clientHeight);
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.position.set(CAM_X, CAM_Y, CAM_Z);
          camera.lookAt(0, CAM_LOOK_Y, 0);
          camera.updateProjectionMatrix();
          camera.updateMatrixWorld(true);
        }
        function pointerNdc(event) {
          const rect = renderer.domElement.getBoundingClientRect();
          const w = rect.width || 1;
          const h = rect.height || 1;
          pointer.x = ((event.clientX - rect.left) / w) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / h) * 2 + 1;
        }
        function onDown(event) {
          if (freezeRef.current) return;
          pointerNdc(event);
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObject(cardMesh, true);
          if (hits.length === 0) return;
          event.preventDefault();
          renderer.domElement.setPointerCapture(event.pointerId);
          grabState.down = true;
          syncCursor(); // A grab mid-drop takes over: the drop is done as far as the page is concerned.
          if (arrival.started) tellPage(true);
          grabState.pointerId = event.pointerId;
          grabState.lastT = performance.now();
          grabState.vx = 0;
          grabState.vy = 0;
          grabState.vz = 0;
          grabState.lastNdcX = pointer.x;
          const center = cardCenter();
          const hit = hits[0].point;
          grabOff.x = center.x - hit.x;
          grabOff.y = center.y - hit.y;
          grabOff.z = center.z - hit.z;
          camera.getWorldDirection(camDir);
          dragPlane.setFromNormalAndCoplanarPoint(camDir, hit);
        }
        function onMove(event) {
          if (!grabState.down || event.pointerId !== grabState.pointerId)
            return;
          pointerNdc(event);
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.ray.intersectPlane(dragPlane, planeHit);
          if (!hit) return;
          const travel = stageEl.clientWidth < NARROW_AT ? 0.52 : 1;
          const give = 1 + 0.28 * SWING_STRENGTH;
          const maxR = SEG_LEN * JOINTS * 0.85 * travel * give;
          const tx = hit.x + grabOff.x;
          const ty = hit.y + grabOff.y;
          const tz = clamp(hit.z + grabOff.z, -0.4, 0.4);
          const restY = clipY - SEG_LEN * JOINTS - drop();
          const dx = tx;
          const dy = ty - restY;
          const reach = Math.hypot(dx, dy);
          let gx = tx;
          let gy = ty;
          if (reach > maxR) {
            gx = (dx / reach) * maxR;
            gy = restY + (dy / reach) * maxR;
          }
          const now = performance.now();
          const stepDt = Math.max(DT, (now - grabState.lastT) / 1e3);
          const hole = joints[JOINTS - 1];
          const nx = gx;
          const ny = gy + drop();
          const nz = tz;
          grabState.vx = (nx - hole.x) / stepDt;
          grabState.vy = (ny - hole.y) / stepDt;
          grabState.vz = (nz - hole.z) / stepDt;
          const dYaw = (pointer.x - grabState.lastNdcX) * 3.4;
          spinY += dYaw;
          spinVel = dYaw / stepDt;
          grabState.lastNdcX = pointer.x;
          grabState.lastT = now;
          hole.x = nx;
          hole.y = ny;
          hole.z = nz;
          hole.ox = nx;
          hole.oy = ny;
          hole.oz = nz;
        }
        function onUp(event) {
          if (!grabState.down || event.pointerId !== grabState.pointerId)
            return;
          grabState.down = false;
          probeHover();
          syncCursor();
          try {
            renderer.domElement.releasePointerCapture(event.pointerId);
          } catch {
            /* already released */
          }
          const travel = stageEl.clientWidth < NARROW_AT ? 0.55 : 1;
          const scale = 0.55 * SWING_STRENGTH * travel;
          const hole = joints[JOINTS - 1];
          hole.pinned = false;
          const vx = clamp(grabState.vx * scale, -10, 10);
          const vy = clamp(grabState.vy * scale, -12, 12);
          const vz = clamp(grabState.vz * scale, -4, 4);
          hole.ox = hole.x - vx * DT;
          hole.oy = hole.y - vy * DT;
          hole.oz = hole.z - vz * DT;
          spinVel += clamp(-vx * 0.28, -8, 8);
        } // Marks the canvas data-beneath-media="true" while the pointer is on the card, clip
        // or strap, so a page cursor (Beneath Reveal's Over media) can treat them as media.
        const hoverTargets = [cardMesh, clipMesh, strapMesh];
        const hoverPointer = new THREE.Vector2(); // in: a mouse or pen is on the page. touch: the last pointer was a finger, which has no
        // hover to aim with, so the whole stage takes the pointer (a touch screen starts that way).
        const hover = {
          x: 0,
          y: 0,
          in: false,
          on: false,
          mark: "",
          touch: !window.matchMedia("(hover: hover)").matches,
        };
        function aim(clientX, clientY) {
          const rect = renderer.domElement.getBoundingClientRect();
          hoverPointer.x = ((clientX - rect.left) / (rect.width || 1)) * 2 - 1;
          hoverPointer.y = -((clientY - rect.top) / (rect.height || 1)) * 2 + 1;
          raycaster.setFromCamera(hoverPointer, camera);
        }
        function probeHover() {
          let on = grabState.down;
          if (!on && hover.in) {
            aim(hover.x, hover.y); // The pointer can be anywhere on the page; only inside the stage is it on the card.
            on =
              Math.abs(hoverPointer.x) <= 1 &&
              Math.abs(hoverPointer.y) <= 1 &&
              raycaster.intersectObjects(hoverTargets, true).length > 0;
          } // "true" when it can be pulled, "still" when Motion is off or reduced (media, but no pull).
          const mark = on ? (freezeRef.current ? "still" : "true") : "false";
          if (on === hover.on && mark === hover.mark) return;
          hover.on = on;
          hover.mark = mark;
          renderer.domElement.setAttribute("data-beneath-media", mark);
          syncCursor();
        } // Grab only over the card, clip or strap; the rest of the stage keeps the page cursor
        // and lets the pointer through, so links and buttons under the stage stay clickable.
        function syncCursor() {
          const el = renderer.domElement;
          el.style.cursor = freezeRef.current
            ? ""
            : grabState.down
              ? "grabbing"
              : hover.on
                ? "grab"
                : "";
          el.style.pointerEvents =
            hover.touch || hover.on || grabState.down ? "auto" : "none";
        } // Watched on the window: off the card the canvas lets the pointer through, so it sees nothing.
        function onHover(event) {
          if (event.pointerType === "touch") return;
          hover.x = event.clientX;
          hover.y = event.clientY;
          hover.in = true;
          if (hover.touch) {
            hover.touch = false;
            syncCursor();
          }
          probeHover();
        } // After a touch the whole stage takes the pointer again, until a mouse or pen moves.
        function onPress(event) {
          if (event.pointerType !== "touch" || hover.touch) return;
          hover.touch = true;
          hover.in = false;
          probeHover();
          syncCursor();
        } // A touch that starts on the card holds the page still; anywhere else the page scrolls.
        function onTouch(event) {
          if (!event.cancelable || freezeRef.current) return;
          const t = event.touches[0];
          if (!grabState.down && event.type === "touchstart" && t) {
            aim(t.clientX, t.clientY);
            if (raycaster.intersectObject(cardMesh, true).length === 0) return;
          } else if (!grabState.down) return;
          event.preventDefault();
        } // Off the page, not just from one element to the next.
        function onHoverLeave(event) {
          if (event.relatedTarget) return;
          hover.in = false;
          probeHover();
        }
        paintTicket();
        settle();
        frameCamera();
        if (willDrop) {
          poseEntrance();
          arrival.pending = true;
        }
        syncVisuals();
        renderer.render(scene, camera);
        let raf = 0;
        let last = performance.now();
        const running = { on: false };
        function loop(now) {
          raf = requestAnimationFrame(loop);
          const dt = Math.min(0.05, (now - last) / 1e3);
          last = now;
          if (!freezeRef.current) {
            acc += dt;
            let steps = 0;
            while (acc >= DT && steps < 2) {
              simulate();
              acc -= DT;
              steps += 1;
            }
            if (acc >= DT) acc = 0;
          } else {
            acc = 0;
            poseHang(0);
          }
          syncVisuals();
          renderer.render(scene, camera); // The card can swing under a still pointer.
          if (hover.in) probeHover();
        }
        function startLoop() {
          if (running.on) return;
          running.on = true;
          last = performance.now();
          acc = 0;
          raf = requestAnimationFrame(loop);
        }
        function stopLoop() {
          running.on = false;
          if (raf) cancelAnimationFrame(raf);
          raf = 0;
        }
        const live = { inView: true, pageHidden: document.hidden };
        function shouldRun() {
          return !freezeRef.current && live.inView && !live.pageHidden;
        }
        function syncLoop() {
          if (shouldRun()) {
            startLoop();
            return;
          }
          stopLoop();
          presentStill();
        }
        syncLoop();
        const io = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            live.inView = Boolean(entry && entry.isIntersecting);
            syncLoop();
          },
          { threshold: 0.01 },
        );
        io.observe(stageEl);
        function onVis() {
          live.pageHidden = document.hidden;
          syncLoop();
        }
        document.addEventListener("visibilitychange", onVis);
        const ro = new ResizeObserver(() => {
          if (running.on) {
            frameCamera();
            return;
          }
          presentStill();
        });
        ro.observe(stageEl);
        const canvas = renderer.domElement; // A lost context (GPU reset, too many WebGL views) blanks the canvas: show the flat
        // pass until the browser restores it, then repaint and carry on.
        function onContextLost(event) {
          event.preventDefault();
          stopLoop();
          fail("context-lost", "");
          endEntrance();
        } // Lost context or Motion turned off mid-entrance: the pass hangs at rest and the page moves on.
        function endEntrance() {
          if (arrival.pending) {
            arrival.pending = false;
            poseHang(0);
          }
          arrival.seg = SEG_LEN;
          tellPage(false);
        }
        function onContextRestored() {
          if (cancelled) return;
          paintTicket();
          syncLoop();
          startTransition(() => {
            setFailure(null);
            setStatus("ready");
          });
        }
        canvas.addEventListener("webglcontextlost", onContextLost);
        canvas.addEventListener("webglcontextrestored", onContextRestored);
        canvas.addEventListener("pointerdown", onDown);
        stageEl.addEventListener("touchstart", onTouch, { passive: false });
        stageEl.addEventListener("touchmove", onTouch, { passive: false });
        window.addEventListener("pointermove", onHover);
        window.addEventListener("pointerout", onHoverLeave);
        window.addEventListener("pointerdown", onPress);
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
        syncCursor();
        engineRef.current = {
          paint: paintTicket,
          freezeChanged: () => {
            if (freezeRef.current) endEntrance();
            syncLoop();
          },
          nudge: (key) => {
            if (freezeRef.current) return;
            const hole = joints[JOINTS - 1];
            const impulse =
              key === "ArrowLeft"
                ? -1
                : key === "ArrowRight"
                  ? 1
                  : key === "ArrowUp"
                    ? 0.65
                    : -0.65;
            hole.ox = hole.x - impulse * DT;
            spinVel += impulse * 0.16;
          },
        };
        if (!cancelled) startTransition(() => setStatus("ready"));
        dispose = () => {
          engineRef.current = null;
          stopLoop();
          io.disconnect();
          document.removeEventListener("visibilitychange", onVis);
          ro.disconnect();
          canvas.removeEventListener("webglcontextlost", onContextLost);
          canvas.removeEventListener("webglcontextrestored", onContextRestored);
          canvas.removeEventListener("pointerdown", onDown);
          stageEl.removeEventListener("touchstart", onTouch);
          stageEl.removeEventListener("touchmove", onTouch);
          canvas.removeAttribute("data-beneath-media");
          window.removeEventListener("pointermove", onHover);
          window.removeEventListener("pointerout", onHoverLeave);
          window.removeEventListener("pointerdown", onPress);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          window.removeEventListener("pointercancel", onUp);
          cardGeo.dispose();
          strap.geometry.dispose();
          badgeClip.geometry.dispose();
          sleeveGeo.dispose();
          seamGeo.dispose();
          seamMat.dispose();
          wobble?.dispose();
          wobbleCrisp?.dispose();
          linen?.dispose();
          holoGeo.dispose();
          holoMap.dispose();
          edgeHoloMap.dispose();
          holoFrontMat.dispose();
          holoBackMat.dispose();
          edgeHoloMat.dispose();
          frontMaskMap.dispose();
          backMaskMap.dispose();
          frontMap.dispose();
          backMap.dispose();
          edgeMat.dispose();
          frontMat.dispose();
          backMat.dispose();
          clipMat.dispose();
          clipSlot.geometry.dispose();
          clipSlot.material.dispose();
          strapMap.dispose();
          strapMat.dispose();
          sleeveMat.dispose();
          clipMesh.geometry.dispose();
          renderer.dispose();
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        };
        if (cancelled) dispose();
      } catch (error) {
        // A half-built engine must not leave a blank canvas or a live GPU context behind.
        if (built && !dispose) {
          built.forceContextLoss();
          built.dispose();
          built.domElement.remove();
        }
        fail("setup", error instanceof Error ? error.message : String(error));
        tellPage(false);
      }
    })();
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    const settle = (key, failed) => {
      startTransition(() => {
        setArtTick((tick) => tick + 1);
        setArtFailures((prev) => {
          if ((prev[key] ?? null) === failed) return prev;
          const next = { ...prev };
          if (failed) next[key] = failed;
          else delete next[key];
          return next;
        });
      });
    };
    const ready = artReadyRef.current;
    ready.failed = false;
    const load = (src, key) => {
      ready[key] = false;
      if (!src) {
        artRef.current[key] = null;
        engineRef.current?.paint();
        ready[key] = true;
        settle(key, null);
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        if (cancelled) return;
        artRef.current[key] = img;
        engineRef.current?.paint();
        ready[key] = true;
        settle(key, null);
      };
      img.onerror = () => {
        if (cancelled) return;
        artRef.current[key] = null;
        engineRef.current?.paint();
        ready.failed = true; // The same URL without crossOrigin tells a blocked host (CORS) from a broken link.
        const plain = new Image();
        plain.onload = () => {
          if (!cancelled) settle(key, "cors");
        };
        plain.onerror = () => {
          if (!cancelled) settle(key, "unreachable");
        };
        plain.src = src;
      };
      img.src = src;
    };
    load(logoSrc, "logo");
    load(photoSrc, "photo");
    load(backArtSrc, "backArt");
    return () => {
      cancelled = true;
    };
  }, [logoSrc, photoSrc, backArtSrc]);
  useEffect(() => {
    if (status === "fail") paintFlat();
  }, [status, artTick]);
  useEffect(() => {
    engineRef.current?.paint();
    paintFlat();
  }, [
    attendeeName,
    ticketType,
    ticketNumber,
    eventName,
    eventDate,
    barcodeValue,
    paper,
    ink,
    accent,
    reverse,
    strapColor,
    strapStyle,
    strapText,
    foil,
    finish,
    sleeveOn,
    sleeveTexture,
    padding,
    stackGap,
    typeKey,
    photoFit,
    backArtSrc,
    lightAngle,
    lightHeight,
    lightIntensity,
    rimOn,
    depth,
    size,
  ]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!document.fonts?.load) {
      artReadyRef.current.type = true;
      return;
    }
    artReadyRef.current.type = false;
    let cancelled = false;
    const specs = [nameFont, metaFont, numberFont].map((font, i) => {
      const fallback = i === 0 ? 108 : i === 1 ? 22 : 48;
      const min = i === 0 ? NAME_MIN : i === 1 ? META_MIN : NUM_MIN;
      const max = i === 0 ? NAME_MAX : i === 1 ? META_MAX : NUM_MAX;
      const px = parsePx(font.fontSize, fallback, min, max);
      return `${fontStyleOf(font)} ${fontWeightOf(font, 400)} ${px}px ${fontFamilyOf(font)}`;
    });
    void Promise.all(specs.map((spec) => document.fonts.load(spec))).then(
      () => {
        if (cancelled) return;
        engineRef.current?.paint();
        paintFlat();
        artReadyRef.current.type = true;
      },
    );
    return () => {
      cancelled = true;
    };
  // typeKey serializes the font family, weight, style and size used by this loader.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- font objects are recreated on render; typeKey is their stable value key.
  }, [typeKey]);
  useEffect(() => {
    engineRef.current?.freezeChanged();
  }, [freeze]);
  const missing = Object.keys(artFailures).flatMap((key) => {
    const failed = artFailures[key];
    return failed ? [{ key, failed }] : [];
  }); // Notes for the editor: the canvas only, never the published site.
  const notes = isStatic
    ? [
        ...(failure ? [failureNote(failure)] : []),
        ...missing.map(({ key, failed }) => artNote(key, failed)),
      ]
    : []; // Loading is seen and read; the fallback reason is read only (the flat pass already shows it).
  const statusText = !mounted
    ? ""
    : status === "boot"
      ? "Loading pass"
      : status === "fail"
        ? fallbackStatus(failure)
        : "";
  return /*#__PURE__*/ _jsxs("div", {
    ref: rootRef,
    tabIndex: 0,
    role: "group",
    "aria-label": `Interactive founder pass for ${attendeeName}.`,
    "aria-describedby": "founder-portrait-description",
    onClick: typeof props.onClick === "function" ? props.onClick : undefined,
    onKeyDown: (event) => {
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        engineRef.current?.nudge?.(event.key);
        return;
      }
      if (typeof props.onClick === "function" && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        props.onClick(event);
      }
    },
    "data-lanyard-stage": "true",
    "data-lanyard-state": status,
    "data-lanyard-error": failure?.reason,
    "data-lanyard-missing": missing.length
      ? missing.map(({ key, failed }) => `${key}:${failed}`).join(" ")
      : undefined,
    style: {
      ...style,
      position: "relative",
      width: "100%",
      height: "100%",
      minHeight: stageH,
      overflow: "hidden",
      background: "transparent",
      touchAction: "manipulation",
      userSelect: "none",
    },
    children: [
      /*#__PURE__*/ _jsx("div", {
        role: "img",
        "aria-label": `${eventName ?? "Event"} pass for ${attendeeName}`,
        style: { position: "absolute", inset: 0, pointerEvents: "none" },
      }),
      status === "fail"
        ? /*#__PURE__*/ _jsx("canvas", {
            ref: flatRef,
            width: TEX_W,
            height: TEX_H,
            "aria-hidden": "true",
            style: {
              position: "absolute",
              left: "50%",
              top: "50%",
              height: "56%",
              transform: "translate(-50%, -46%)",
              borderRadius: "3.5% / 2.6%",
              boxShadow: "0 18px 40px rgba(0, 0, 0, 0.18)",
              pointerEvents: "none",
            },
          })
        : null,
      notes.length
        ? /*#__PURE__*/ _jsx("div", {
            style: {
              position: "absolute",
              left: 8,
              right: 8,
              bottom: 8,
              zIndex: 4,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "8px 10px",
              borderRadius: 6,
              background: "#1D1D1F",
              color: "#FFFFFF",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: 12,
              lineHeight: 1.4,
              pointerEvents: "none",
            },
            children: notes.map((note) =>
              /*#__PURE__*/ _jsx("span", { children: note }, note),
            ),
          })
        : null,
      /*#__PURE__*/ _jsx("div", {
        role: "status",
        "aria-live": "polite",
        style: {
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          opacity: status === "boot" ? 1 : 0,
          color: ink,
          fontFamily: fontFamilyOf(metaFont),
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "0.12em", // Only the visible label is set in capitals; the read-only reason stays plain.
          textTransform: status === "boot" ? "uppercase" : "none",
        },
        children: statusText,
      }),
    ],
  });
}
Kern_LanyardPass.displayName = "Lanyard Pass";
