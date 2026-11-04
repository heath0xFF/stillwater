const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { palette, contrast, serializeHunk } = require("../palette.js");
const toml = serializeHunk(palette);
const sections = {};
let section;

// Check the export's fixed TOML subset without adding a parser dependency.
for (const line of toml.trim().split("\n")) {
  if (!line || line.startsWith("#")) continue;
  if (line.startsWith("[")) {
    assert.match(line, /^\[themes\.stillwater(?:\.syntax_scopes)?\]$/);
    assert.ok(!sections[line], `duplicate table: ${line}`);
    section = sections[line] = {};
    continue;
  }
  const match = line.match(/^(\w+|"[^"\n]+") = ("[^"\n]+")$/);
  assert.ok(match, `invalid assignment: ${line}`);
  assert.ok(section, "assignment before a theme table");
  const key = match[1].startsWith('"') ? JSON.parse(match[1]) : match[1];
  assert.ok(!Object.hasOwn(section, key), `duplicate key: ${key}`);
  section[key] = JSON.parse(match[2]);
}
const colors = sections["[themes.stillwater]"];
const scopes = sections["[themes.stillwater.syntax_scopes]"];

const semanticKeys = [
  "background", "panel", "panelAlt", "border", "accent", "accentMuted", "text", "muted",
  "addedBg", "removedBg", "movedAddedBg", "movedRemovedBg", "contextBg", "addedContentBg",
  "removedContentBg", "contextContentBg", "addedSignColor", "removedSignColor", "lineNumberBg",
  "lineNumberFg", "selectedHunk", "badgeAdded", "badgeRemoved", "badgeNeutral", "fileNew",
  "fileDeleted", "fileRenamed", "fileModified", "fileUntracked", "noteBorder", "noteBackground",
  "noteTitleBackground", "noteTitleText",
];

test("Hunk export is current and defines only named theme tables", () => {
  assert.equal(fs.readFileSync(path.join(__dirname, "../themes/hunk/stillwater.toml"), "utf8"), toml);
  assert.equal(Object.keys(sections).length, 2);
  assert.equal(colors.label, palette.name);
  assert.equal(colors.base, "github-dark-default");
  assert.deepEqual(Object.keys(colors).sort(), [...semanticKeys, "base", "label"].sort());
  for (const key of semanticKeys) assert.match(colors[key], /^#[0-9a-f]{6}$/, key);
  for (const [scope, color] of Object.entries(scopes)) assert.match(color, /^#[0-9a-f]{6}$/, scope);
});

test("Hunk preserves Stillwater surfaces and semantic roles", () => {
  for (const [key, value] of Object.entries({
    background: palette.background, text: palette.foreground, panel: palette.surface,
    panelAlt: palette.surface, muted: palette.ansi[8], lineNumberFg: palette.ansi[8],
    accent: palette.ansi[6], noteBorder: palette.ansi[5], noteTitleText: palette.ansi[5],
    addedSignColor: palette.ansi[2], removedSignColor: palette.ansi[1],
    badgeAdded: palette.ansi[2], badgeRemoved: palette.ansi[1],
    fileNew: palette.ansi[2], fileDeleted: palette.ansi[1], fileRenamed: palette.ansi[4],
    fileModified: palette.ansi[3], fileUntracked: palette.ansi[6],
  })) assert.equal(colors[key], value, key);
});

test("Hunk text and syntax stay readable on panels, diffs, notes, and selected rows", () => {
  const backgrounds = [
    "background", "panel", "panelAlt", "accentMuted", "selectedHunk", "addedBg", "removedBg",
    "movedAddedBg", "movedRemovedBg", "contextBg", "addedContentBg", "removedContentBg",
    "contextContentBg", "lineNumberBg", "noteBackground", "noteTitleBackground",
  ];
  const foregrounds = [
    "text", "muted", "accent", "lineNumberFg", "addedSignColor", "removedSignColor",
    "badgeAdded", "badgeRemoved", "badgeNeutral", "fileNew", "fileDeleted", "fileRenamed",
    "fileModified", "fileUntracked", "noteTitleText",
  ];
  for (const background of backgrounds) {
    for (const foreground of foregrounds) {
      assert.ok(contrast(colors[foreground], colors[background]) >= 4.5, `${foreground} on ${background}`);
    }
    for (const color of new Set(Object.values(scopes))) {
      assert.ok(contrast(color, colors[background]) >= 4.5, `${color} syntax on ${background}`);
    }
  }
});

test("Hunk word-change fills clear its automatic emphasis threshold", () => {
  const rgb = (hex) => hex.slice(1).match(/../g).map((part) => parseInt(part, 16));
  for (const kind of ["added", "removed"]) {
    const line = rgb(colors[`${kind}Bg`]);
    const word = rgb(colors[`${kind}ContentBg`]);
    assert.ok(line.reduce((sum, value, i) => sum + Math.abs(value - word[i]), 0) >= 28, kind);
    assert.notEqual(colors[`${kind}Bg`], colors.contextBg);
  }
  assert.notEqual(colors.movedAddedBg, colors.addedBg);
  assert.notEqual(colors.movedRemovedBg, colors.removedBg);
});

test("Hunk uses exact TextMate scopes, including common base-theme overrides", () => {
  for (const [scope, color] of [
    ["source", palette.foreground], ["variable.other", palette.foreground],
    ["comment", palette.ansi[8]], ["punctuation.definition.comment", palette.ansi[8]],
    ["string.comment", palette.ansi[8]], ["string", palette.ansi[2]],
    ["constant", palette.ansi[3]], ["entity.name.constant", palette.ansi[3]],
    ["keyword", palette.ansi[5]], ["storage.type", palette.ansi[5]],
    ["keyword.operator", palette.ansi[7]], ["entity.name.function", palette.ansi[4]],
    ["entity.name.type", palette.ansi[6]], ["support.type.property-name.json", palette.ansi[6]],
    ["constant.character.escape", palette.ansi[6]], ["invalid.illegal", palette.ansi[1]],
  ]) assert.equal(scopes[scope], color, scope);
});
