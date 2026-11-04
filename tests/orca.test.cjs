const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { palette, contrast, fade, serializeOrcaTerminal, serializeOrcaApp } = require("../palette.js");
const root = path.join(__dirname, "..");
const app = JSON.parse(serializeOrcaApp(palette));
const terminal = JSON.parse(serializeOrcaTerminal(palette));

const ansiKeys = [
  "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
  "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
];

test("Orca exports are current and the manifest grants no execution", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "orca-plugin.json"), "utf8"));
  assert.equal(manifest.manifestVersion, 2);
  assert.equal(manifest.execution, "data");
  assert.equal(manifest.engines.orca, ">=1.4.246");
  assert.equal(manifest.main, undefined);
  assert.equal(manifest.capabilities, undefined);
  assert.deepEqual(Object.keys(manifest.contributes).sort(), ["terminalThemes", "themes"]);
  for (const [kind, serialize] of [["themes", serializeOrcaApp], ["terminalThemes", serializeOrcaTerminal]]) {
    assert.equal(manifest.contributes[kind].length, 1);
    const contribution = manifest.contributes[kind][0];
    assert.equal(contribution.title, palette.name);
    const content = fs.readFileSync(path.join(root, contribution.path), "utf8");
    assert.equal(content, serialize(palette));
    assert.ok(Buffer.byteLength(content) <= 16 * 1024, contribution.path);
    assert.equal(JSON.parse(content).schemaVersion, 1);
  }
});

test("Orca preserves all 22 terminal colors, including cursor and selection text", () => {
  assert.equal(terminal.mode, "dark");
  const expected = {
    background: palette.background,
    foreground: palette.foreground,
    cursor: palette["cursor-color"],
    cursorAccent: palette["cursor-text"],
    selectionBackground: palette["selection-background"],
    selectionForeground: palette["selection-foreground"],
  };
  ansiKeys.forEach((key, index) => { expected[key] = palette.ansi[index]; });
  assert.deepEqual(terminal.terminal, expected);
});

test("Orca app text and focus remain readable on their resolved surfaces", () => {
  assert.equal(app.base, "dark");
  const t = app.tokens;
  for (const value of Object.values(t)) assert.match(value, /^#[0-9a-f]{6}$/);
  const fg = t["--foreground"];
  const muted = t["--muted-foreground"];
  assert.equal(t["--background"], palette.background);
  assert.equal(fg, palette.foreground);
  assert.equal(muted, palette.ansi[8]);
  assert.equal(t["--ring"], palette["cursor-color"]);

  // Unset text tokens inherit foreground; menus and worktree sidebars inherit card and sidebar.
  for (const surface of ["--background", "--card", "--secondary", "--muted", "--accent",
    "--sidebar", "--worktree-sidebar-active", "--tab-active", "--tab-inactive", "--chat-user-message"]) {
    assert.ok(contrast(fg, t[surface]) >= 4.5, `${surface}: body text`);
  }
  for (const surface of ["--background", "--card", "--muted", "--sidebar", "--tab-inactive"]) {
    assert.ok(contrast(muted, t[surface]) >= 4.5, `${surface}: secondary text`);
  }
  for (const [text, surface] of [
    ["--primary-foreground", "--primary"],
    ["--sidebar-accent-foreground", "--sidebar-accent"],
    ["--text-link", "--background"],
    ["--ring", "--background"],
    ["--sidebar-ring", "--sidebar"],
    ["--tab-active-indicator", "--tab-active"],
  ]) {
    assert.ok(contrast(t[text], t[surface]) >= 4.5, `${text} on ${surface}`);
  }
  for (const [key, value] of Object.entries(t)) {
    if (key.startsWith("--git-decoration-")) {
      assert.ok(contrast(value, t["--sidebar"]) >= 4.5, key);
    }
  }

  // Orca paints selection and diff tints, rather than opaque terminal selection colors.
  assert.ok(contrast(fg, fade(t["--ring"], t["--background"], 0.3)) >= 4.5, "editor selection");
  const chatCanvas = fade(fg, t["--background"], 0.05);
  const chatText = fade(fg, chatCanvas, 0.9);
  assert.ok(contrast(chatText, t["--chat-user-message"]) >= 4.5, "chat bubble");
  for (const [key, lineOpacity, emphasisOpacity] of [["--diff-added", 0.16, 0.2], ["--diff-removed", 0.18, 0.2]]) {
    for (const opacity of [lineOpacity, emphasisOpacity]) {
      assert.ok(contrast(fg, fade(t[key], t["--background"], opacity)) >= 4.5, `${key}: ${opacity}`);
    }
    const chatDiffText = fade(fg, t[key], 0.3);
    assert.ok(contrast(chatDiffText, fade(t[key], chatCanvas, lineOpacity)) >= 4.5, `${key}: chat`);
  }
});

test("Orca selected controls stay distinct from their tracks and menu surfaces", () => {
  const t = app.tokens;
  // Orca's settings control paints background/50 over the panel beneath it.
  const track = fade(t["--background"], t["--card"], 0.5);
  for (const surface of [track, t["--card"], t["--background"]]) {
    assert.ok(contrast(t["--accent"], surface) >= 1.5, `selected fill on ${surface}`);
  }
  assert.ok(contrast(t["--foreground"], t["--accent"]) >= 4.5, "selected label");
});

test("Orca syntax uses readable Stillwater roles and supported TextMate rules", () => {
  const scopes = new Map();
  for (const rule of app.tokenColors) {
    for (const scope of [rule.scope].flat()) {
      assert.match(scope, /^[a-z]+(?:\.[a-z-]+)*$/);
      assert.ok(!scopes.has(scope), `duplicate scope: ${scope}`);
      scopes.set(scope, rule.settings);
    }
    assert.ok(Object.keys(rule.settings).every((key) => ["foreground", "fontStyle"].includes(key)));
    if (rule.settings.foreground) {
      assert.ok(contrast(rule.settings.foreground, palette.background) >= 4.5, String(rule.scope));
    }
    if (rule.settings.fontStyle) assert.match(rule.settings.fontStyle, /^(bold|italic|underline)$/);
  }
  for (const [scope, color] of [
    ["comment", palette.ansi[8]], ["string", palette.ansi[2]], ["constant", palette.ansi[3]],
    ["keyword", palette.ansi[5]], ["keyword.operator", palette.ansi[7]],
    ["entity.name.function", palette.ansi[4]], ["entity.name.type", palette.ansi[6]],
    ["variable", palette.foreground], ["invalid", palette.ansi[1]],
  ]) assert.equal(scopes.get(scope).foreground, color, scope);
  assert.equal(scopes.get("comment").fontStyle, undefined, "comments are not italic by default");
});
