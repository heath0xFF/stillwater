const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { palette, contrast, serializeNeovim, neovimColors } = require("../palette.js");
const root = path.join(__dirname, "..");

test("the generated Neovim palette is current", () => {
  const content = fs.readFileSync(path.join(root, "lua/stillwater/palette.lua"), "utf8");
  assert.equal(content, serializeNeovim(palette));
});

test("derived Neovim backgrounds keep text readable", () => {
  const c = neovimColors(palette);
  for (const key of ["cursor_line", "diff_add", "diff_change", "diff_delete", "diff_text"]) {
    assert.ok(contrast(c.fg, c[key]) >= 7, `${key}: body text`);
    assert.ok(contrast(c.comment, c[key]) >= 3, `${key}: comments`);
  }
  assert.ok(contrast(c.line_nr, c.bg) >= 3, "line numbers");
  assert.ok(contrast(c.non_text, c.bg) < 3, "whitespace stays quiet");
});

const nvim = spawnSync("nvim", ["--version"]).status === 0;

test("the colorscheme loads in Neovim with readable highlights", { skip: !nvim && "nvim not installed" }, () => {
  const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "stillwater-")), "highlights.json");
  const run = spawnSync("nvim", ["--clean", "--headless", "--cmd", `set rtp^=${root}`,
    "-l", path.join(__dirname, "neovim-dump.lua"), output], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(result.ok, true, result.error);
  assert.equal(result.colors_name, "stillwater");
  assert.equal(result.terminal_color_1, palette.ansi[1]);
  assert.equal(result.terminal_color_15, palette.ansi[15]);
  assert.equal(result.groups.Normal.bg, palette.background);
  assert.equal(result.groups.Normal.fg, palette.foreground);
  assert.equal(result.groups.Cursor.bg, palette["cursor-color"]);
  assert.equal(result.transparent_bg, null, "transparent option clears the ground");

  // Deliberately quiet groups: gutters, whitespace, and a parked progress bar.
  const quiet = new Set(["LineNr", "LineNrAbove", "LineNrBelow", "FoldColumn", "NonText", "Whitespace",
    "EndOfBuffer", "SpecialKey", "Ignore", "IblIndent", "WinSeparator", "LazyProgressTodo"]);
  const low = [];
  for (const [group, { fg, bg }] of Object.entries(result.groups)) {
    if (!fg || quiet.has(group)) continue;
    const ratio = contrast(fg, bg || palette.background);
    if (ratio < 4.5) low.push(`${group} ${ratio.toFixed(2)}`);
  }
  assert.deepEqual(low, []);

  for (const [mode, sections] of Object.entries(result.lualine)) {
    for (const [section, { fg, bg }] of Object.entries(sections)) {
      assert.ok(contrast(fg, bg) >= 4.5, `lualine ${mode}.${section}`);
    }
  }
});
