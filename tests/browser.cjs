const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { palette } = require("../palette.js");

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const output = path.join(__dirname, "../.impeccable/review");
  fs.mkdirSync(output, { recursive: true });
  const errors = [];
  const remoteRequests = [];
  try {
    for (const [name, width, height] of [["desktop", 1440, 1000], ["mobile", 390, 844], ["narrow", 320, 740]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      await page.route(/^https?:/, (route) => {
        remoteRequests.push(route.request().url());
        return route.abort();
      });
      await page.goto(pathToFileURL(path.join(__dirname, "../index.html")).href);
      await page.waitForSelector("#ansi-swatches .swatch-color");
      assert.equal(await page.locator("#ansi-swatches .swatch-color").count(), 16);
      assert.equal(await page.locator("#role-swatches .swatch-color").count(), 8);
      assert.equal(await page.locator("#comparison article").count(), 3);
      assert.equal(await page.locator("#separation-rows tr").count(), 5);
      assert.equal(await page.locator("#contrast-rows tr").count(), 16);
      assert.equal(await page.locator("#contrast-rows .fail").count(), 1);

      assert.equal(await page.locator("#ansi-swatches .swatch-value").nth(1).textContent(), palette.ansi[1]);
      const accent = await page.locator("#specimen").evaluate((el) => el.style.getPropertyValue("--ansi-1"));
      assert.equal(accent, palette.ansi[1]);

      await page.getByRole("button", { name: "Agent session", exact: true }).focus();
      await page.keyboard.press("Enter");
      assert.equal(await page.locator("#agent-view").isVisible(), true);
      assert.equal(await page.locator("#terminal-view").isVisible(), false);
      assert.equal(await page.getByRole("button", { name: "Agent session", exact: true }).getAttribute("aria-pressed"), "true");
      await page.getByRole("button", { name: "Hard cases", exact: true }).click();
      assert.equal(await page.locator("#stress-view").isVisible(), true);
      assert.equal(await page.locator("#agent-view").isVisible(), false);
      await page.getByRole("button", { name: "Terminal", exact: true }).click();
      assert.equal(await page.locator("#terminal-view").isVisible(), true);

      await page.locator("summary").click();
      assert.equal(await page.locator("details").getAttribute("open"), "");
      if (name === "mobile") {
        // Capture from the top so offscreen fixed controls cannot enter section crops.
        await page.evaluate(() => window.scrollTo(0, 0));
        for (const [id, file] of [["contrast", "contrast"], ["compare", "comparison"], ["import", "import"]]) {
          const clip = await page.locator(`#${id}`).boundingBox();
          await page.screenshot({ path: path.join(output, `mobile-${file}.png`), fullPage: true, clip });
        }
      }
      await page.locator("summary").click();
      await page.locator('nav a[href="#import"]').click();
      assert.equal(new URL(page.url()).hash, "#import");
      for (const [filename, file] of [[palette.file, palette.file], ["stillwater.toml", "hunk/stillwater.toml"]]) {
        const link = page.locator(`a[download="${filename}"]`);
        const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
        assert.equal(download.suggestedFilename(), filename);
        assert.equal(await download.failure(), null);
        assert.equal(fs.readFileSync(await download.path(), "utf8"),
          fs.readFileSync(path.join(__dirname, "../themes", file), "utf8"));
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name);
      await page.evaluate(() => { history.replaceState(null, "", location.pathname); window.scrollTo(0, 0); });
      if (name !== "narrow") {
        await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
        await page.screenshot({ path: path.join(output, `${name}-viewport.png`) });
      }
      await context.close();
      console.log(`PASS ${name}: controls, keyboard, downloads, offline assets, no page overflow`);
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remoteRequests, []);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
