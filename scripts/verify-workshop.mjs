import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile } from "node:fs/promises";
const require = createRequire(
  new URL("../client/package.json", import.meta.url),
);
const { chromium } = require("@playwright/test");
const serverRequire = createRequire(
  new URL("../server/package.json", import.meta.url),
);
const express = serverRequire("express");
const root = new URL("../", import.meta.url).pathname;
const out = root + ".artifacts/workshop";
await mkdir(out, { recursive: true });
const app = express();
app.use(express.static(root + "workshop/dist"));
const server = app.listen(0, "127.0.0.1");
await new Promise((r) => server.once("listening", r));
let browser;
try {
  browser = await chromium.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out + "/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await page.getByRole("checkbox", { name: /Age/ }).check();
  await page.getByRole("button", { name: "Review changes" }).click();
  assert.equal(
    await page.getByRole("cell", { name: "30–39", exact: true }).count(),
    2,
  );
  assert.equal(
    await page.getByRole("cell", { name: "Removed", exact: true }).count(),
    6,
  );
  assert.ok(
    await page
      .getByRole("button", { name: "Download practice CSV" })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Original data", exact: true })
    .click();
  assert.equal(
    await page.getByRole("cell", { name: "Aina Rahman", exact: true }).count(),
    1,
  );
  await page
    .getByRole("button", { name: "Masked result", exact: true })
    .click();
  await page.getByLabel("I reviewed the remaining details.").check();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download practice CSV" }).click();
  const download = await downloadPromise;
  const csv = await readFile(await download.path(), "utf8");
  assert.ok(csv.includes("Person 01"));
  assert.ok(!csv.includes("Aina Rahman"));
  assert.ok(csv.includes("Asthma"));
  await page.screenshot({ path: out + "/review.png", fullPage: true });
  await page.getByRole("link", { name: "Field guide", exact: true }).click();
  await page.getByRole("heading", { name: "Share with intention." }).waitFor();
  await page.goBack();
  assert.ok(
    await page.getByRole("button", { name: "Download again" }).isVisible(),
  );
  await page.getByRole("button", { name: "Start again" }).click();
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [768, 1024],
    [1024, 768],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow ${width}`,
    );
    if (width === 375)
      await page.screenshot({ path: out + "/mobile.png", fullPage: false });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Start the exercise" }).click();
  await page.getByRole("button", { name: "Review changes" }).click();
  assert.ok(
    await page
      .getByRole("cell", { name: "Person 01", exact: true })
      .isVisible(),
  );
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: desktop/mobile layout, selection, actual age bands, comparison, export review gate, CSV, hash history, restart, offline exercise, no browser errors.",
  );
} finally {
  await browser?.close();
  server.close();
}
