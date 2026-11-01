(() => {
  "use strict";

  const { palette: stillwater, references, ansiNames, contrast, oklch, separation, fade, serialize } = globalThis.Stillwater;
  const roles = [
    ["Background", "background"], ["Foreground", "foreground"],
    ["Raised surface / ANSI 0", "surface"], ["Comments / ANSI 8", "comments"],
    ["Selection background", "selection-background"], ["Selection text", "selection-foreground"],
    ["Cursor", "cursor-color"], ["Cursor text", "cursor-text"],
  ];

  const accentPairs = [[1, 2, "Red / green"], [2, 3, "Green / yellow"], [4, 5, "Blue / magenta"], [4, 6, "Blue / cyan"], [1, 5, "Red / magenta"]];
  const visions = [undefined, "deuteranopia", "protanopia", "tritanopia"];

  function applyPalette(element, palette) {
    for (const [, key] of roles) {
      if (key !== "comments" && palette[key]) element.style.setProperty(`--${key}`, palette[key]);
    }
    palette.ansi.forEach((color, index) => element.style.setProperty(`--ansi-${index}`, color));
  }

  function swatch(name, color, index) {
    const item = document.createElement("div");
    const chip = document.createElement("div");
    chip.className = "swatch-color";
    chip.style.backgroundColor = color;
    chip.setAttribute("aria-hidden", "true");
    const label = document.createElement("div");
    label.className = "swatch-name";
    if (index !== undefined) {
      const number = document.createElement("span");
      number.className = "swatch-index";
      number.textContent = String(index).padStart(2, "0");
      label.append(number);
    }
    label.append(name);
    const value = document.createElement("span");
    value.className = "swatch-value";
    value.textContent = color;
    item.append(chip, label, value);
    return item;
  }

  function renderPalette(palette) {
    applyPalette(document.querySelector("#specimen"), palette);
    document.querySelector("#specimen-label").textContent = palette.name;
    document.querySelector("#palette-label").textContent = palette.blend;
    document.querySelector("#role-swatches").replaceChildren(...roles.map(([name, key]) =>
      swatch(name, key === "comments" ? palette.ansi[8] : palette[key])));
    document.querySelector("#ansi-swatches").replaceChildren(...palette.ansi.map((color, index) =>
      swatch(ansiNames[index], color, index)));

    const { background, surface, foreground } = palette;
    const accents = palette.ansi.slice(1, 7);
    const lowest = (ground) => accents.reduce((worst, color) =>
      contrast(color, ground) < contrast(worst, ground) ? color : worst);
    const lowestBadge = lowest(background);
    const checks = [
      ["Body text", foreground, background, "On the main background"],
      ["Comments", palette.ansi[8], background, "ANSI 8, without dimming"],
      ["Selected text", palette["selection-foreground"], palette["selection-background"], "Explicit selection colors"],
      ["Cursor text", palette["cursor-text"], palette["cursor-color"], "Inside a block cursor"],
      ["Lowest accent", lowest(background), background, "Minimum of ANSI 1–6"],
      ["Accent on raised surface", lowest(surface), surface, "Status bars and panels"],
      ["Lowest reverse badge", background, lowestBadge, "Background on an accent"],
      ["Dim body text", fade(foreground, background, 0.5), background, "Estimate at 50% opacity"],
      ["Dim comments", fade(palette.ansi[8], background, 0.5), background, "Estimate at 50% opacity"],
    ];
    document.querySelector("#contrast-summary").replaceChildren(...checks.map(([label, fg, bg, detail]) => {
      const ratio = contrast(fg, bg);
      const item = document.createElement("div");
      item.className = "contrast-check";
      const heading = document.createElement("h3");
      heading.textContent = label;
      const result = document.createElement("span");
      result.className = "ratio";
      result.textContent = `${ratio.toFixed(2)}:1`;
      const note = document.createElement("small");
      note.textContent = `${ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Below AA"} · ${detail}`;
      item.append(heading, result, note);
      return item;
    }));
    document.querySelector("#contrast-rows").replaceChildren(...palette.ansi.map((color, index) => {
      const ratio = contrast(color, palette.background);
      const row = document.createElement("tr");
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = `${index} · ${ansiNames[index]}`;
      const value = document.createElement("td");
      value.textContent = `${ratio.toFixed(2)}:1`;
      const result = document.createElement("td");
      result.className = ratio >= 4.5 ? "pass" : "fail";
      result.textContent = ratio >= 4.5 ? "Pass" : "Below 4.5:1 — surface only";
      row.append(name, value, result);
      return row;
    }));
    document.querySelector("#contrast-ground").textContent = palette.background;
    document.querySelector("#comment-color").textContent = palette.ansi[8];
    document.querySelector("#separation-rows").replaceChildren(...accentPairs.map(([a, b, label]) => {
      const row = document.createElement("tr");
      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = label;
      row.append(name, ...visions.map((vision) => {
        const distance = separation(palette.ansi[a], palette.ansi[b], vision);
        const cell = document.createElement("td");
        cell.textContent = distance.toFixed(1);
        if (distance < 5) {
          cell.className = "fail";
          cell.textContent += " close";
        }
        return cell;
      }));
      return row;
    }));
  }

  function ranges(palette) {
    const accents = palette.ansi.slice(1, 7).map(oklch);
    const span = (key) => {
      const values = accents.map((color) => color[key]);
      return `${Math.min(...values).toFixed(2)}–${Math.max(...values).toFixed(2)}`;
    };
    return `Accent lightness ${span("L")}\nAccent chroma ${span("C")}\nGround hue ${oklch(palette.background).H.toFixed(0)}°`;
  }

  // Blob downloads work offline where browsers block file-to-file downloads.
  const file = new Blob([serialize(stillwater)], { type: "application/octet-stream" });
  document.querySelector(`a[download="${stillwater.file}"]`).href = URL.createObjectURL(file);

  for (const palette of [references.nord, stillwater, references.dracula]) {
    const sample = document.createElement("article");
    sample.className = "compare-sample themed";
    applyPalette(sample, palette);
    const heading = document.createElement("h3");
    heading.textContent = palette.name;
    const blend = document.createElement("span");
    blend.className = "meta";
    blend.textContent = palette.blend;
    const code = document.createElement("pre");
    code.innerHTML = '<span class="comment">// A value worth keeping.</span>\n<span class="purple">const</span> mode = <span class="green">"quiet"</span>;\n<span class="blue">review</span>({ mode, ttl: <span class="yellow">0</span> });\n\n<span class="red">− discard the explicit zero</span>\n<span class="green">+ keep the caller’s intent</span>\n<span class="cyan">ready</span>  <span class="comment">waiting for your review</span>';
    const strip = document.createElement("div");
    strip.className = "accent-strip";
    strip.setAttribute("aria-hidden", "true");
    for (const color of palette.ansi.slice(1, 7)) {
      const chip = document.createElement("span");
      chip.style.backgroundColor = color;
      strip.append(chip);
    }
    const description = document.createElement("p");
    description.textContent = palette.description;
    const measures = document.createElement("pre");
    measures.className = "measures";
    measures.textContent = ranges(palette);
    sample.append(heading, blend, code, strip, description, measures);
    document.querySelector("#comparison").append(sample);
  }

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-view]").forEach((item) => {
        const selected = item === button;
        item.setAttribute("aria-pressed", String(selected));
        document.getElementById(`${item.dataset.view}-view`).hidden = !selected;
      });
    });
  });

  document.querySelector("#agent-view").hidden = true;
  document.querySelector("#stress-view").hidden = true;
  renderPalette(stillwater);
})();
