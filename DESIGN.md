---
name: Stillwater
description: A quiet guide to a readable terminal palette.
colors:
  primary: "#74cde2"
  page: "#1f222e"
  background: "#1f222e"
  surface: "#2b303f"
  foreground: "#dfe3ed"
  muted: "#b0b7cb"
  rule: "#464d66"
  comments: "#9da5bf"
  coral: "#ec7368"
  mint: "#70d689"
  sand: "#eec96e"
  periwinkle: "#8994e5"
  orchid: "#ec8ac7"
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "3rem"
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.5rem"
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.65
  code:
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace'
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  control: "4px"
  specimen: "6px"
spacing:
  tight: "12px"
  inset: "24px"
  group: "32px"
  section: "64px"
components:
  download:
    backgroundColor: "{colors.page}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  download-hover:
    backgroundColor: "{colors.surface}"
  view-button:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    padding: "12px"
  specimen:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.specimen}"
---

# Design System: Stillwater

## Overview

**Creative North Star: "Stillwater"**

Quiet, readable, and suited to long coding sessions. An indigo-slate ground holds the page together. Periwinkle, orchid, and frost accents sit at different lightness levels, so they identify syntax, state, and actions without relying on hue alone. The orchid cursor is the one element meant to stand out.

The guide is a document with live color specimens, not a simulated terminal application. The code samples demonstrate the palette; the surrounding frame uses familiar document controls.

**Key Characteristics:**
- Cool, flat surfaces.
- Readable text and comments.
- Rich, non-pastel color with clear roles.
- Native controls and no decorative motion.

## Colors

The guide frame matches the terminal ground. Comparison samples use each theme’s own colors.

### Primary

Cool cyan identifies links and keyboard focus. Orchid marks the selected specimen view and the wordmark’s waterline, echoing the cursor.

### Secondary

Coral marks removed text and errors. Mint marks added text and success. Sand marks warnings and numeric literals. Periwinkle marks operations; orchid marks keywords and speaker labels.

### Neutral

The page matches the terminal background, so the preview reads as dark as the real theme. The raised surface holds terminal controls. Soft white is the default text color; muted blue-gray is used for supporting prose. Borders and selection backgrounds use a slate between Nord’s and Dracula’s.

The complete terminal palette, including selection and cursor pairs and every ANSI entry, is defined in `palette.js`. Do not derive export values from screenshots or this guide’s frame colors.

**The Readable Quiet Rule.** Do not make comments quiet by dimming them below 4.5:1 against the terminal background.

**The Fixed Sample Rule.** Compare palettes with identical sample content. Parent themes keep their own ground, because the ground is part of what is being compared.

**The Depth Rule.** Keep at least 0.15 of OKLCH lightness between the lightest and darkest of ANSI 1–6, and test separation under simulated color-vision deficiency. Hue alone does not keep accents apart.

## Orca

The Orca plugin extends the same palette to app surfaces and code. The canvas stays indigo-slate; cards, menus, and sidebars use the raised surface. Cyan identifies primary actions, links, and sidebar focus. Orchid marks the editor cursor and app focus rings because Orca links those two roles. Editor selection is Orca's 30% orchid tint, not the terminal's opaque selection color. Active controls and menu rows use the selection slate so they remain distinct from panel and control backgrounds. Orca also uses this accent for the editor's current-line fill.

Syntax follows the Neovim roles: comments use ANSI 8, strings mint, constants sand, keywords orchid, functions periwinkle, and types frost. Diff and Git colors retain the palette's semantic roles. The plugin changes colors only, with no fonts, layout, background image, or executable code. All exported values come from `palette.js`.

## Tern

The CSS theme uses the same ground, raised surfaces, text, ANSI colors, orchid cursor, and slate selection fill. The tabs and sessions sidebar uses the raised surface to separate it from the terminal ground. Cyan marks interface focus and links. Code uses the Neovim syntax roles. Filled controls use darker palette blends so their white labels stay readable. Tern keeps its selection-text behavior and any native omp chat tokens not set by the theme. The export changes colors only; fonts, layout, and key bindings stay unchanged. All values come from `palette.js`.

## Typography

System sans is the reading face and heading face. System monospace is reserved for code, hex values, paths, and contrast ratios. This keeps all fonts local.

The display heading reduces to 2.5rem on small screens. Section headings use the headline token. Minor headings use 1.0625rem. Body paragraphs stay within 72ch, with a narrower introduction. Labels and code use the sizes in the frontmatter.

**The Reading First Rule.** Use monospace for literal or measured data, not as a costume for technical prose.

## Layout

Desktop uses a fixed 226px contents rail and a reading area with 64px horizontal padding. At 1100px, the rail reduces to 190px and content padding to 36px. At 760px and below, navigation moves above the document, content padding becomes 24px, and sections are separated by 48px.

Swatches use four columns on desktop and two on mobile. Comparison specimens use three columns on desktop and stack at 1100px and below. Long terminal lines and import commands scroll inside focusable containers; they do not widen the document.

## Elevation & Depth

No shadows. Surface tone and thin rules separate regions. Controls do not float above the page. There are no entrance effects or blinking cursors.

## Shapes

Small, gently rounded corners identify the terminal specimen and download actions. Swatches and comparison blocks are square. Most boundaries use a single thin line. The wordmark has two short horizontal orchid rules.

## Components

### Buttons

Specimen controls are plain buttons on the raised surface. An underline and `aria-pressed` identify the selected view. Hover uses the terminal background. Keyboard focus uses a two-pixel cyan outline, inset within the toolbar.

### Download links

Outlined actions have a main name and a small label. Hover adds the raised surface. They save files; they never call Rex. Offline Blob downloads and on-disk exports use the same serializer.

### Navigation

A slim desktop rail becomes wrapped links above the mobile document. Supporting text uses the muted color. Hover adds an underline. All links retain visible keyboard focus.

### Specimens and swatches

Preview content is explicitly illustrative. Color changes do not change that content. Each swatch has a readable label and exact hex value outside the color field. ANSI swatches also show their indices.

### Contrast details

Use numeric ratios and text pass/fail labels, not color alone. Native details/summary holds the full ANSI table. Report real-use pairs too: accents on the raised surface, reverse badges, and estimated dim text. A separation table compares accents with each other. Low-contrast ANSI 0 is an explicit exception, never counted as readable text.

## Do's and Don'ts

### Do:
- **Do** keep comments readable.
- **Do** keep the guide usable offline.
- **Do** label illustrative terminal output.
- **Do** warn that a Rex import also selects the theme.

### Don't:
- **Don't** introduce neon, glow, or decorative motion.
- **Don't** use ANSI 0 as text on the main background.
- **Don't** imply terminal colors control application truecolor output.
- **Don't** change the active Rex theme without approval.
