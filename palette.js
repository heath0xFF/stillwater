/* Source of truth, shared by the offline guide, theme exporters, and tests. */
(function () {
  "use strict";

  const palette = {
    name: "Stillwater",
    blend: "Nord × Dracula",
    file: "Stillwater",
    description: "Each ANSI slot starts near the OKLCH midpoint of its parents, then moves for contrast and separation. The ground is darker than either parent, with a hue between the two.",
    background: "#1f222e",
    foreground: "#dfe3ed",
    surface: "#2b303f",
    "selection-background": "#464d66",
    "selection-foreground": "#eef0f6",
    "cursor-color": "#ec8ac7",
    "cursor-text": "#1f222e",
    ansi: [
      "#2b303f", "#ec7368", "#70d689", "#eec96e",
      "#8994e5", "#ec8ac7", "#74cde2", "#d5d9e4",
      "#9da5bf", "#f38a7f", "#89de9c", "#f6da8e",
      "#a2a9ee", "#f5a3d4", "#95dded", "#eef0f6",
    ],
  };

  // Parent values as shipped in Ghostty's bundled Nord and Dracula themes.
  const references = {
    nord: {
      name: "Nord",
      blend: "Parent",
      description: "Gives the frost blues and the calm. Its accents are muted and its comments are hard to read.",
      background: "#2e3440",
      foreground: "#d8dee9",
      surface: "#3b4252",
      ansi: [
        "#3b4252", "#bf616a", "#a3be8c", "#ebcb8b",
        "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0",
        "#596377", "#bf616a", "#a3be8c", "#ebcb8b",
        "#81a1c1", "#b48ead", "#8fbcbb", "#eceff4",
      ],
    },
    dracula: {
      name: "Dracula",
      blend: "Parent",
      description: "Gives the purple-for-blue and pink-for-magenta moves. Its accents run far hotter than a long session wants.",
      background: "#282a36",
      foreground: "#f8f8f2",
      surface: "#21222c",
      ansi: [
        "#21222c", "#ff5555", "#50fa7b", "#f1fa8c",
        "#bd93f9", "#ff79c6", "#8be9fd", "#f8f8f2",
        "#6272a4", "#ff6e6e", "#69ff94", "#ffffa5",
        "#d6acff", "#ff92df", "#a4ffff", "#ffffff",
      ],
    },
  };

  const ansiNames = [
    "Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White",
    "Bright black / comments", "Bright red", "Bright green", "Bright yellow",
    "Bright blue", "Bright magenta", "Bright cyan", "Bright white",
  ];

  function linearRgb(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error("Expected a six-digit hex color.");
    return hex.slice(1).match(/../g).map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  }

  function luminance(hex) {
    const rgb = linearRgb(hex);
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  }

  function oklab([r, g, b]) {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
  }

  function oklch(hex) {
    const [L, a, b] = oklab(linearRgb(hex));
    return { L, C: Math.hypot(a, b), H: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360 };
  }

  // Machado, Oliveira & Fernandes 2009, severity 1.0.
  const visionMatrices = {
    deuteranopia: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
    protanopia: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    tritanopia: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
  };

  // Distance between two colors in OKLab x 100, optionally under simulated color vision.
  function separation(a, b, vision) {
    const view = (hex) => {
      const rgb = linearRgb(hex);
      if (!vision) return rgb;
      return visionMatrices[vision].map((row) =>
        Math.max(0, Math.min(1, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
    };
    const [A, B] = [oklab(view(a)), oklab(view(b))];
    return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) * 100;
  }

  // Text faded toward its background, as a terminal fades dim text.
  function fade(foreground, background, opacity) {
    const channels = (hex) => hex.slice(1).match(/../g).map((part) => parseInt(part, 16));
    const [F, B] = [channels(foreground), channels(background)];
    return "#" + F.map((value, i) =>
      Math.round(value * opacity + B[i] * (1 - opacity)).toString(16).padStart(2, "0")).join("");
  }

  function contrast(a, b) {
    const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (values[0] + 0.05) / (values[1] + 0.05);
  }

  function serialize(palette) {
    const keys = [
      "background", "foreground", "cursor-color", "cursor-text",
      "selection-background", "selection-foreground",
    ];
    return [
      `# ${palette.name} — ${palette.blend}`,
      "# Generated from palette.js. Run node scripts/export-themes.cjs to update.",
      "# ANSI 8 is the comment color; applications must choose to use it.",
      ...keys.map((key) => `${key} = ${palette[key]}`),
      ...palette.ansi.map((color, index) => `palette = ${index}=${color}`),
      "",
    ].join("\n");
  }

  // Editor colors: the palette by name, plus backgrounds derived from it.
  function neovimColors(p) {
    const names = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"];
    const colors = {
      bg: p.background,
      fg: p.foreground,
      surface: p.surface,
      selection: p["selection-background"],
      selection_fg: p["selection-foreground"],
      cursor: p["cursor-color"],
      cursor_text: p["cursor-text"],
      comment: p.ansi[8],
      cursor_line: fade(p.surface, p.background, 0.5),
      line_nr: fade(p.ansi[8], p.background, 0.7),
      non_text: fade(p.ansi[8], p.background, 0.3),
      diff_add: fade(p.ansi[2], p.background, 0.16),
      diff_change: fade(p.ansi[4], p.background, 0.16),
      diff_delete: fade(p.ansi[1], p.background, 0.16),
      diff_text: fade(p.ansi[4], p.background, 0.32),
    };
    names.forEach((name, index) => {
      colors[name] = p.ansi[index];
      colors[`bright_${name}`] = p.ansi[index + 8];
    });
    return colors;
  }

  function serializeNeovim(p) {
    const colors = neovimColors(p);
    return [
      "-- Generated from palette.js. Run node scripts/export-themes.cjs to update.",
      "return {",
      ...Object.keys(colors).sort().map((key) => `  ${key} = "${colors[key]}",`),
      "  ansi = {",
      ...p.ansi.map((color) => `    "${color}",`),
      "  },",
      "}",
      "",
    ].join("\n");
  }

  function serializeTern(p) {
    const c = neovimColors(p);
    const colors = {
      "tv-bg": c.bg,
      "tv-fg": c.fg,
      "tv-cur": c.cursor,
      "tv-cur-ink": c.cursor_text,
      "tv-sel": c.selection,
      "tv-sel-a": c.selection,
      "tv-sel-b": c.selection,
      page: c.bg,
      panel: c.bg,
      card: c.surface,
      raise: c.surface,
      "pop-bg": c.surface,
      "code-bg": c.bg,
      "tbl-head": c.surface,
      ink: c.fg,
      t1: c.fg,
      t2: c.white,
      t3: c.comment,
      t4: c.comment,
      accent: c.cyan,
      "accent-ink": c.cyan,
      // Tern paints white labels on these fills, so use dark palette blends.
      "accent-fill": fade(c.cyan, c.bg, 0.4),
      a1: c.cyan,
      a2: c.blue,
      "grad-ink": c.bg,
      ok: c.green,
      "ok-fill": fade(c.green, c.bg, 0.4),
      bad: c.red,
      "bad-fill": fade(c.red, c.bg, 0.4),
      warn: c.yellow,
      live: c.magenta,
      "live-fill": fade(c.magenta, c.bg, 0.4),
      "tk-comment": c.comment,
      "tk-doc": c.comment,
      "tk-keyword": c.magenta,
      "tk-function": c.blue,
      "tk-macro": c.magenta,
      "tk-variable": c.fg,
      "tk-property": c.cyan,
      "tk-string": c.green,
      "tk-escape": c.cyan,
      "tk-number": c.yellow,
      "tk-constant": c.yellow,
      "tk-type": c.cyan,
      "tk-tag": c.magenta,
      "tk-heading": c.magenta,
      "tk-link": c.cyan,
      "tk-operator": c.white,
      "tk-punct": c.white,
      "tk-inserted": c.green,
      "tk-deleted": c.red,
    };
    return [
      "/* Generated from palette.js. Run node scripts/export-themes.cjs to update. */",
      ":root {",
      "  color-scheme: dark;",
      ...Object.entries(colors).map(([key, value]) => `  --${key}: ${value};`),
      ...p.ansi.map((color, index) => `  --ansi${index}: ${color};`),
      "}",
      "",
      "#sidebar {",
      "  background-color: var(--card);",
      "}",
      "",
      "/* shortcut: .tn-div is internal to Tern; recheck after layout changes. */",
      ".tn-div::before {",
      "  display: block;",
      `  background: ${c.line_nr};`,
      "}",
      "",
      ".tn-div:hover::before,",
      ".tn-div.dragging::before {",
      "  background: var(--accent);",
      "}",
      "",
    ].join("\n");
  }

  function serializeHunk(p) {
    const c = neovimColors(p);
    const selected = fade(c.blue, c.bg, 0.1);
    const colors = {
      background: c.bg,
      panel: c.surface,
      panelAlt: c.surface,
      border: c.selection,
      accent: c.cyan,
      accentMuted: selected,
      text: c.fg,
      muted: c.comment,
      addedBg: fade(c.green, c.bg, 0.08),
      removedBg: fade(c.red, c.bg, 0.08),
      movedAddedBg: fade(c.blue, c.bg, 0.08),
      movedRemovedBg: fade(c.magenta, c.bg, 0.08),
      contextBg: c.bg,
      // Dark word fills keep syntax readable and clear Hunk's emphasis threshold.
      addedContentBg: fade(c.green, "#000000", 0.18),
      removedContentBg: fade(c.red, "#000000", 0.18),
      contextContentBg: c.bg,
      addedSignColor: c.green,
      removedSignColor: c.red,
      lineNumberBg: c.bg,
      lineNumberFg: c.comment,
      selectedHunk: selected,
      badgeAdded: c.green,
      badgeRemoved: c.red,
      badgeNeutral: c.comment,
      fileNew: c.green,
      fileDeleted: c.red,
      fileRenamed: c.blue,
      fileModified: c.yellow,
      fileUntracked: c.cyan,
      noteBorder: c.magenta,
      noteBackground: c.surface,
      noteTitleBackground: c.surface,
      noteTitleText: c.magenta,
    };
    const scopes = [
      [c.fg, ["source", "text", "variable", "variable.other", "variable.parameter.function",
        "meta.jsx.children", "meta.block", "meta.tag.attributes", "meta.object.member",
        "meta.embedded.expression", "markup.bold", "markup.italic"]],
      [c.comment, ["comment", "punctuation.definition.comment", "string.comment"]],
      [c.green, ["string", "punctuation.definition.string", "markup.inline.raw", "markup.quote",
        "markup.inserted", "meta.diff.header.to-file", "punctuation.definition.inserted"]],
      [c.yellow, ["constant", "constant.character", "constant.other.placeholder", "entity.name.constant",
        "variable.other.constant", "variable.other.enummember", "support.constant",
        "markup.changed", "punctuation.definition.changed"]],
      [c.magenta, ["keyword", "storage", "storage.type", "storage.type.java", "storage.modifier.package",
        "storage.modifier.import", "variable.language", "entity.name.tag", "support.class.component",
        "markup.heading", "markup.heading entity.name"]],
      [c.blue, ["entity.name.function", "support.function", "variable.function"]],
      [c.cyan, ["entity", "entity.name", "entity.name.type", "entity.name.class", "support",
        "support.type", "support.class", "entity.other.attribute-name", "meta.property-name",
        "support.type.property-name.json", "variable.other.property", "support.variable",
        "constant.character.escape", "string variable", "source.regexp", "string.regexp",
        "string.regexp.character-class", "string.regexp constant.character.escape",
        "string.regexp source.ruby.embedded", "string.regexp string.regexp.arbitrary-repitition",
        "constant.other.reference.link", "string.other.link", "markup.underline.link",
        "meta.module-reference", "meta.diff.header", "meta.separator", "meta.output"]],
      [c.fg, ["meta.export.default", "meta.definition.variable", "string punctuation.section.embedded source"]],
      [c.white, ["keyword.operator", "punctuation", "punctuation.section.embedded",
        "punctuation.definition.list.begin.markdown"]],
      [c.red, ["invalid", "invalid.broken", "invalid.deprecated", "invalid.illegal", "invalid.unimplemented",
        "message.error", "markup.deleted", "meta.diff.header.from-file", "punctuation.definition.deleted"]],
    ];
    return [
      "# Generated from palette.js. Run node scripts/export-themes.cjs to update.",
      "# Merge these tables into your Hunk config; select with --theme stillwater.",
      "[themes.stillwater]",
      'base = "github-dark-default"',
      `label = ${JSON.stringify(p.name)}`,
      ...Object.entries(colors).map(([key, value]) => `${key} = "${value}"`),
      "",
      "[themes.stillwater.syntax_scopes]",
      ...scopes.flatMap(([color, names]) => names.map((scope) => `"${scope}" = "${color}"`)),
      "",
    ].join("\n");
  }

  function serializeOrcaTerminal(p) {
    const names = [
      "black", "red", "green", "yellow", "blue", "magenta", "cyan", "white",
      "brightBlack", "brightRed", "brightGreen", "brightYellow", "brightBlue", "brightMagenta", "brightCyan", "brightWhite",
    ];
    return JSON.stringify({
      schemaVersion: 1,
      mode: "dark",
      terminal: {
        background: p.background,
        foreground: p.foreground,
        cursor: p["cursor-color"],
        cursorAccent: p["cursor-text"],
        selectionBackground: p["selection-background"],
        selectionForeground: p["selection-foreground"],
        ...Object.fromEntries(names.map((name, index) => [name, p.ansi[index]])),
      },
    }, null, 2) + "\n";
  }

  function serializeOrcaApp(p) {
    const c = neovimColors(p);
    return JSON.stringify({
      schemaVersion: 1,
      base: "dark",
      tokens: {
        "--background": c.bg,
        "--foreground": c.fg,
        "--card": c.surface,
        "--primary": c.cyan,
        "--primary-foreground": c.bg,
        "--secondary": c.surface,
        "--muted": c.surface,
        "--muted-foreground": c.comment,
        "--accent": c.selection,
        "--border": c.selection,
        // Orca uses the ring for both the editor cursor and its selection tint.
        "--ring": c.cursor,
        "--sidebar": c.surface,
        "--sidebar-accent": c.selection,
        "--sidebar-accent-foreground": c.selection_fg,
        "--sidebar-ring": c.cyan,
        "--worktree-sidebar-active": c.selection,
        "--worktree-sidebar-active-border": c.cyan,
        "--tab-bar": c.bg,
        "--tab-active": c.surface,
        "--tab-active-indicator": c.cyan,
        "--tab-inactive": c.bg,
        "--split-divider": c.selection,
        "--split-divider-hover": c.cyan,
        "--chat-user-message": c.surface,
        "--text-link": c.cyan,
        "--diff-added": c.green,
        "--diff-removed": c.red,
        "--git-decoration-added": c.green,
        "--git-decoration-modified": c.yellow,
        "--git-decoration-deleted": c.red,
        "--git-decoration-renamed": c.blue,
        "--git-decoration-untracked": c.cyan,
        "--git-decoration-copied": c.magenta,
        "--git-decoration-ignored": c.comment,
      },
      tokenColors: [
        { scope: "comment", settings: { foreground: c.comment } },
        { scope: "string", settings: { foreground: c.green } },
        { scope: ["constant", "variable.other.constant"], settings: { foreground: c.yellow } },
        { scope: ["keyword", "storage"], settings: { foreground: c.magenta } },
        { scope: "keyword.operator", settings: { foreground: c.white } },
        { scope: ["entity.name.function", "support.function"], settings: { foreground: c.blue } },
        { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class"], settings: { foreground: c.cyan } },
        { scope: "variable", settings: { foreground: c.fg } },
        { scope: "variable.language", settings: { foreground: c.magenta } },
        { scope: "punctuation", settings: { foreground: c.white } },
        { scope: "entity.name.tag", settings: { foreground: c.magenta } },
        { scope: "entity.other.attribute-name", settings: { foreground: c.cyan } },
        { scope: "constant.character.escape", settings: { foreground: c.cyan } },
        { scope: "markup.heading", settings: { foreground: c.magenta, fontStyle: "bold" } },
        { scope: "markup.bold", settings: { fontStyle: "bold" } },
        { scope: "markup.italic", settings: { fontStyle: "italic" } },
        { scope: "markup.underline.link", settings: { foreground: c.cyan, fontStyle: "underline" } },
        { scope: "markup.inline.raw", settings: { foreground: c.green } },
        { scope: "markup.inserted", settings: { foreground: c.green } },
        { scope: ["markup.deleted", "invalid"], settings: { foreground: c.red } },
        { scope: "markup.changed", settings: { foreground: c.yellow } },
      ],
    }, null, 2) + "\n";
  }

  const api = {
    palette, references, ansiNames, contrast, oklch, separation, fade, serialize,
    neovimColors, serializeNeovim, serializeTern, serializeHunk, serializeOrcaTerminal, serializeOrcaApp,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.Stillwater = api;
})();
