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

  const api = { palette, references, ansiNames, contrast, oklch, separation, fade, serialize, neovimColors, serializeNeovim };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else globalThis.Stillwater = api;
})();
