/**
 * Static contrast checker for hard-coded colours in CSS modules.
 *
 * For each rule block it finds the declared `color` and the nearest declared
 * `background`/`background-color` in the SAME block, then computes the WCAG
 * ratio. Blocks that only set one of the two are reported separately, because
 * their pairing depends on inheritance and cannot be judged statically.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const hex2rgb = (h) => {
  h = h.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 8) h = h.slice(0, 6);
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};

const lum = ({ r, g, b }) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const ratio = (a, b) => {
  const l1 = lum(a), l2 = lum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const files = execSync(
  `grep -rl "#[0-9a-fA-F]\\{3,8\\}" src --include="*.module.css" --include="*.css" | grep -v globals.css`,
  { cwd: "/workspace/radarsite", encoding: "utf8" }
)
  .trim()
  .split("\n")
  .filter(Boolean);

const problems = [];
const unpaired = [];

for (const file of files) {
  const css = readFileSync("/workspace/radarsite/" + file, "utf8");
  // Split into rule blocks: selector { body }
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = blockRe.exec(css))) {
    const selector = m[1].trim().replace(/\s+/g, " ").slice(0, 80);
    const body = m[2];

    const colorM = body.match(/(?:^|[;\s])color:\s*(#[0-9a-fA-F]{3,8})\b/);
    const bgM = body.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,8})\b/);

    if (colorM && bgM) {
      const fg = hex2rgb(colorM[1]);
      const bg = hex2rgb(bgM[1]);
      const cr = ratio(fg, bg);
      const sizeM = body.match(/font-size:\s*([\d.]+)(rem|px)/);
      let size = 16;
      if (sizeM) size = sizeM[2] === "rem" ? parseFloat(sizeM[1]) * 16 : parseFloat(sizeM[1]);
      const weightM = body.match(/font-weight:\s*(\d+)/);
      const weight = weightM ? parseInt(weightM[1], 10) : 400;
      const isLarge = size >= 24 || (size >= 18.66 && weight >= 700);
      const min = isLarge ? 3 : 4.5;
      if (cr < min) {
        problems.push({ file, selector, fg: colorM[1], bg: bgM[1], ratio: Math.round(cr * 100) / 100, min, size: Math.round(size) });
      }
    } else if (colorM || bgM) {
      unpaired.push({ file, selector, color: colorM?.[1], bg: bgM?.[1] });
    }
  }
}

console.log(`\n=== PAIRED FAILURES (${problems.length}) ===`);
for (const p of problems.sort((a, b) => a.ratio - b.ratio)) {
  console.log(`  ${p.ratio}:1 (min ${p.min}, ${p.size}px) ${p.fg} on ${p.bg}  ${p.file}  «${p.selector}»`);
}

console.log(`\n=== UNPAIRED (${unpaired.length}) — need inheritance check ===`);
for (const u of unpaired) {
  console.log(`  ${u.color ? "color:" + u.color : "bg:" + u.bg}  ${u.file}  «${u.selector}»`);
}
