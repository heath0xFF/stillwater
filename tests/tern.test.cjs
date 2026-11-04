const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { palette, contrast, serializeTern } = require("../palette.js");
const css = serializeTern(palette);
const colors = Object.fromEntries([...css.matchAll(/--([\w-]+): (#[0-9a-f]{6});/g)]
  .map((match) => [match[1], match[2]]));

test("Tern export is current, self-contained, and preserves pane geometry", () => {
  assert.equal(fs.readFileSync(path.join(__dirname, "../themes/tern/Stillwater.css"), "utf8"), css);
  assert.match(css, /:root \{\n  color-scheme: dark;/);
  assert.doesNotMatch(css, /@import|url\(|font|opacity|padding/);
  for (const line of css.split("\n}")[0].split("\n").slice(3)) {
    assert.match(line, /^  --[\w-]+: #[0-9a-f]{6};$/);
  }
});

test("Tern sidebar is distinct from the terminal with readable labels", () => {
  assert.match(css, /#sidebar \{\n  background-color: var\(--card\);\n\}/);
  assert.equal(colors.card, palette.surface);
  assert.equal(colors["tv-bg"], palette.background);
  assert.ok(contrast(colors.card, colors["tv-bg"]) >= 1.2);
  for (const key of ["t1", "t2", "t3", "t4"]) {
    assert.ok(contrast(colors[key], colors.card) >= 4.5, key);
  }
});

test("Tern split dividers are visible without changing their resize targets", () => {
  const divider = css.match(/\.tn-div::before \{\n  display: block;\n  background: (#[0-9a-f]{6});\n\}/);
  assert.ok(divider, "show the native divider, including tiles and islands");
  assert.ok(contrast(divider[1], palette.background) >= 3, "divider on terminal ground");
  assert.ok(contrast(divider[1], palette.surface) >= 3, "divider on raised surface");
  assert.match(css, /\.tn-div:hover::before,\n\.tn-div\.dragging::before \{\n  background: var\(--accent\);\n\}/);
  assert.doesNotMatch(css, /(?:width|height|padding|margin|pointer-events|z-index):/);
});

test("Tern preserves ANSI, cursor, and selection background colors", () => {
  for (const [key, source] of [
    ["tv-bg", "background"], ["tv-fg", "foreground"],
    ["tv-cur", "cursor-color"], ["tv-cur-ink", "cursor-text"],
    ["tv-sel", "selection-background"], ["tv-sel-a", "selection-background"],
    ["tv-sel-b", "selection-background"],
  ]) assert.equal(colors[key], palette[source], key);
  assert.equal(Object.keys(colors).filter((key) => /^ansi\d+$/.test(key)).length, 16);
  palette.ansi.forEach((color, index) => assert.equal(colors[`ansi${index}`], color));
  assert.ok(contrast(colors["tv-fg"], colors["tv-sel"]) >= 4.5);
});

test("Tern interface and syntax colors remain readable", () => {
  const textKeys = ["ink", "t1", "t2", "t3", "t4", "accent", "accent-ink", "ok", "bad", "warn", "live",
    ...Object.keys(colors).filter((key) => key.startsWith("tk-"))];
  for (const surface of ["page", "panel", "card", "raise", "pop-bg", "code-bg", "tbl-head"]) {
    for (const key of textKeys) {
      assert.ok(contrast(colors[key], colors[surface]) >= 4.5, `${key} on ${surface}`);
    }
  }
  for (const key of ["accent-fill", "ok-fill", "bad-fill", "live-fill"]) {
    assert.ok(contrast("#ffffff", colors[key]) >= 4.5, key);
  }
  for (const [key, color] of [
    ["tk-comment", palette.ansi[8]], ["tk-string", palette.ansi[2]],
    ["tk-keyword", palette.ansi[5]], ["tk-function", palette.ansi[4]],
    ["tk-type", palette.ansi[6]], ["tk-number", palette.ansi[3]],
  ]) assert.equal(colors[key], color, key);
});
