const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.join(__dirname, "..");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const files = Object.fromEntries(["index.html", "guide.css", "palette.js", "guide.js"].map((file) =>
      [file, fs.readFileSync(path.join(root, file), "utf8")]));

    // Inline previews embed local assets; inline classic scripts do not honor defer.
    const html = await page.evaluate((files) => {
      const doc = new DOMParser().parseFromString(files["index.html"], "text/html");
      for (const script of doc.querySelectorAll("script[src]")) {
        script.textContent = files[script.getAttribute("src")];
        script.removeAttribute("src");
      }
      const link = doc.querySelector('link[rel="stylesheet"]');
      const style = doc.createElement("style");
      style.textContent = files[link.getAttribute("href")];
      link.replaceWith(style);
      const csp = doc.createElement("meta");
      csp.httpEquiv = "Content-Security-Policy";
      csp.content = "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
      doc.head.prepend(csp);
      return "<!doctype html>" + doc.documentElement.outerHTML;
    }, files);
    const escaped = html.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
    await page.setContent(`<iframe title="Preview" sandbox="allow-scripts" srcdoc="${escaped}"></iframe>`);
    assert.deepEqual(errors, [], "Preview initialization must not throw");
    const frame = page.frameLocator("iframe");
    assert.equal(await frame.locator("#ansi-swatches .swatch-color").count(), 16);
    assert.equal(await frame.locator("#contrast-rows tr").count(), 16);
    assert.equal(await frame.locator("#comparison article").count(), 3);
    await frame.getByRole("button", { name: "Agent session", exact: true }).click();
    assert.equal(await frame.locator("#agent-view").isVisible(), true);
    assert.equal(await frame.locator("#terminal-view").isVisible(), false);
    assert.deepEqual(errors, []);
    console.log("PASS isolated inline preview: initialization, swatches, contrast, comparison, and controls");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
