const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { palette, references, ansiNames, contrast, oklch, separation, fade } = require("../palette.js");
const { serialize } = require("../scripts/export-themes.cjs");
const root = path.join(__dirname, "..");

test("contrast uses standard sRGB luminance and rejects invalid input", () => {
  assert.equal(contrast("#000000", "#ffffff"), 21);
  assert.equal(contrast("#abcdef", "#abcdef"), 1);
  assert.equal(contrast("#ffffff", "#000000"), 21);
  assert.ok(Math.abs(contrast("#777777", "#ffffff") - 4.478089) < 0.00001);
  assert.throws(() => contrast("red", "#ffffff"));
  assert.throws(() => contrast("#fff", "#ffffff"));
});

test("Stillwater holds up beyond contrast against the background", () => {
  const p = palette;
  const accents = p.ansi.slice(1, 7);
  const lightness = accents.map((color) => oklch(color).L);
  assert.ok(Math.max(...lightness) - Math.min(...lightness) >= 0.15, "accent lightness spread");
  for (const color of accents) {
    assert.ok(contrast(color, p.surface) >= 4.5, `${color} on surface`);
    assert.ok(contrast(p.background, color) >= 4.5, `${color} badge`);
  }
  assert.ok(contrast(p.ansi[8], p.surface) >= 4.5, "comments on surface");
  assert.ok(contrast(p.surface, p.background) >= 1.2, "raised surface stays visible");
  for (let a = 0; a < 6; a++) {
    for (let b = a + 1; b < 6; b++) {
      assert.ok(separation(accents[a], accents[b]) >= 10, `${accents[a]} / ${accents[b]}`);
    }
  }
  assert.ok(separation(p.ansi[8], p.ansi[4]) >= 7, "comments vs blue");
  assert.ok(separation(p.ansi[1], p.ansi[2], "deuteranopia") >= 8, "red / green");
  assert.ok(separation(p.ansi[4], p.ansi[5], "deuteranopia") >= 8, "blue / magenta");
  assert.ok(contrast(p["cursor-color"], p.background) >= 4.5, "cursor visibility");
});

test("Stillwater sits between its parents", () => {
  const p = palette;
  const { nord, dracula } = references;
  const ground = oklch(p.background).H;
  assert.ok(ground > oklch(nord.background).H && ground < oklch(dracula.background).H);
  const chroma = (palette) => palette.ansi.slice(1, 7).reduce((sum, color) => sum + oklch(color).C, 0) / 6;
  assert.ok(chroma(p) > chroma(nord) && chroma(p) < chroma(dracula));
  assert.ok(contrast(fade(p.foreground, p.background, 0.5), p.background) < contrast(p.foreground, p.background));
});

test("complete palette and readable text", () => {
  assert.equal(palette.ansi.length, 16);
  assert.equal(ansiNames.length, 16);
  assert.equal(new Set(palette.ansi).size, 16);
  for (const color of palette.ansi) assert.match(color, /^#[0-9a-f]{6}$/);
  assert.ok(contrast(palette.foreground, palette.background) >= 7);
  assert.ok(contrast(palette.foreground, palette.surface) >= 7);
  assert.ok(contrast(palette["selection-foreground"], palette["selection-background"]) >= 4.5);
  assert.ok(contrast(palette["cursor-text"], palette["cursor-color"]) >= 4.5);
  assert.ok(contrast(palette.ansi[0], palette.background) < 4.5);
  for (const color of palette.ansi.slice(1)) {
    assert.ok(contrast(color, palette.background) >= 4.5, color);
  }
  for (let i = 0; i < 8; i++) {
    assert.ok(contrast(palette.ansi[i + 8], palette.background) >
      contrast(palette.ansi[i], palette.background));
  }
});

test("checked-in Ghostty export is current and complete", () => {
  const content = fs.readFileSync(path.join(root, "themes", palette.file), "utf8");
  assert.equal(content, serialize(palette));
  const lines = content.trim().split("\n").filter((line) => !line.startsWith("#"));
  assert.equal(lines.length, 22);
  const indices = [];
  for (const line of lines) {
    assert.match(line, /^(background|foreground|cursor-color|cursor-text|selection-background|selection-foreground|palette) = (\d+=)?#[0-9a-f]{6}$/);
    if (line.startsWith("palette")) indices.push(Number(line.match(/= (\d+)=/)[1]));
  }
  assert.deepEqual(indices, Array.from({ length: 16 }, (_, i) => i));
});
test("guide assets and downloads exist without remote runtime resources", () => {
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (/^https:/.test(match[1])) continue;
    assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
  }
  assert.doesNotMatch(html, /<(?:script|link|img)[^>]+(?:src|href)="https?:/);
  const css = fs.readFileSync(path.join(root, "guide.css"), "utf8");
  assert.doesNotMatch(css, /@import|url\(/);
  for (const key of ["background", "foreground", "surface", "selection-background",
    "selection-foreground", "cursor-color", "cursor-text"]) {
    assert.ok(css.includes(`--${key}: ${palette[key]};`), key);
  }
  assert.ok(css.includes(`--page: ${palette.background};`), "page frame matches the terminal");
  for (const index of [1, 2, 3, 4, 5, 6, 8]) {
    assert.ok(css.includes(`--ansi-${index}: ${palette.ansi[index]};`), `ANSI ${index}`);
  }
});
