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
  await page.getByRole("link", { name: "Files", exact: true }).click();
  const upload = page.getByLabel("Choose a spreadsheet", { exact: true });
  await page.getByRole("button", {name: "Try a sample", exact: true}).click();
  await page.getByRole("cell", {name: "Aina Example", exact: true}).waitFor();
  await page.getByText("Fictional workshop sample", {exact: true}).waitFor();
  assert.equal(await page.getByRole("button", {name: "Try a sample", exact: true}).count(), 0);
  await page.getByLabel("Email", {exact: true}).selectOption("keep");
  await page.getByRole("button", {name: "Suggest sensitive fields", exact: true}).click();
  await page.getByRole("button", {name: "Apply 4 selected suggestions", exact: true}).click();
  await page.getByRole("button", {name: "Review file", exact: true}).click();
  await page.getByRole("cell", {name: "Name 0001", exact: true}).waitFor();
  await page.getByText("Keep only what the task needs, rather than aiming for 100%.", {exact: true}).waitFor();
  await page.getByLabel("I reviewed the result and the details that remain.").check();
  const sampleDownload = page.waitForEvent("download");
  await page.getByRole("button", {name: "Download masked CSV", exact: true}).click();
  const sampleCsv = await readFile(await (await sampleDownload).path(), "utf8");
  assert.ok(sampleCsv.includes("Name 0001") && sampleCsv.includes("Morning") && !sampleCsv.includes("Aina Example"));
  await page.getByRole("button", {name: "Undo applied suggestions", exact: true}).click();
  assert.equal(await page.getByLabel("Name", {exact: true}).inputValue(), "keep");
  assert.equal(await page.getByLabel("Email", {exact: true}).inputValue(), "keep");
  assert.equal(await page.getByRole("button", {name: "Download masked CSV", exact: true}).count(), 0);
  assert.equal(await page.getByRole("status", {name: "Masking protection report"}).count(), 0);
  await page.getByRole("button", {name: "Suggest sensitive fields", exact: true}).click();
  assert.ok(await page.getByLabel("Suggest Email", {exact: true}).isDisabled());
  assert.ok(await page.getByLabel("Suggest Name", {exact: true}).isChecked());
  await page.getByRole("button", {name: "Apply 4 selected suggestions", exact: true}).click();
  // Undo applies only to the latest batch, including explicitly replaced rules.
  await page.getByRole("button", {name: "Suggest sensitive fields", exact: true}).click();
  await page.getByLabel("Replace existing column rules when selected").check();
  await page.getByRole("button", {name: "Select all suggestions", exact: true}).click();
  await page.getByRole("button", {name: "Apply 6 selected suggestions", exact: true}).click();
  assert.equal(await page.getByLabel("Email", {exact: true}).inputValue(), "email");
  await page.getByRole("button", {name: "Undo applied suggestions", exact: true}).click();
  assert.equal(await page.getByLabel("Email", {exact: true}).inputValue(), "keep");
  assert.equal(await page.getByLabel("Name", {exact: true}).inputValue(), "id");
  await page.getByRole("button", {name: "Suggest sensitive fields", exact: true}).click();
  await page.getByLabel("Suggest Notes", {exact: true}).check();
  await page.getByRole("button", {name: "Apply 1 selected suggestions", exact: true}).click();
  await page.getByLabel("Name", {exact: true}).selectOption("redact");
  assert.equal(await page.getByRole("button", {name: "Undo applied suggestions", exact: true}).count(), 0);
  await page.getByRole("button", {name: "Clear file", exact: true}).click();
  assert.equal(await page.getByText("Fictional workshop sample", {exact: true}).count(), 0);
  const fixture = {
    name: "actual.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Name,Age,Note\nTest Person,34,Asthma\nSecond Person,57,Follow-up",
    ),
  };
  await upload.setInputFiles(fixture);
  await page.getByRole("cell", { name: "Test Person", exact: true }).waitFor();
  await page.getByLabel("Name", { exact: true }).selectOption("id");
  await page.getByLabel("Age", { exact: true }).selectOption("age");
  await page.getByRole("button", { name: "Review file", exact: true }).click();
  await page.getByRole("cell", { name: "30–39", exact: true }).waitFor();
  await page
    .getByLabel("I reviewed the result and the details that remain.")
    .check();
  const fileDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download masked CSV", exact: true })
    .click();
  const exported = await readFile(await (await fileDownload).path(), "utf8");
  assert.ok(
    exported.includes("Name 0001") &&
      exported.includes("Asthma") &&
      !exported.includes("Test Person"),
  );
  await page.getByRole("link", { name: "Field guide", exact: true }).click();
  await page.getByRole("link", { name: "Files", exact: true }).click();
  await page.getByRole("cell", { name: "Name 0001", exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: out + "/files-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: out + "/files-desktop.png", fullPage: true });
  await upload.setInputFiles({
    name: "partial.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Email,Phone,Code,Secret\nalice@example.com,+60 12-345 6789,ABC1234567,Private"),
  });
  await page.getByRole("cell", { name: "alice@example.com", exact: true }).waitFor();
  for (const [column, rule] of [["Email", "email"], ["Phone", "phone"], ["Code", "last4"], ["Secret", "redact"]]) {
    await page.getByLabel(column, { exact: true }).selectOption(rule);
  }
  await page.getByRole("button", { name: "Review file", exact: true }).click();
  for (const value of ["aXXXX@example.com", "+XX XX-XXX 6789", "XXXXXX4567", "XXXXXXX"]) {
    await page.getByRole("cell", { name: value, exact: true }).waitFor();
  }
  await page.getByLabel("I reviewed the result and the details that remain.").check();
  const partialDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download masked CSV", exact: true }).click();
  const partialCsv = await readFile(await (await partialDownload).path(), "utf8");
  assert.ok(partialCsv.includes("aXXXX@example.com") && partialCsv.includes("+XX XX-XXX 6789"));
  assert.ok(!partialCsv.includes("alice@") && !partialCsv.includes("Private"));
  await page.getByLabel("Email", { exact: true }).selectOption("remove");
  assert.equal(await page.getByRole("button", { name: "Download masked CSV", exact: true }).count(), 0);
  await page.getByRole("button", { name: "Review file", exact: true }).click();
  assert.ok(await page.getByRole("button", { name: "Download masked CSV", exact: true }).isDisabled());
  await upload.setInputFiles({
    name: "smart.csv", mimeType: "text/csv",
    buffer: Buffer.from("Name,Email,Phone,Alamat,Notes,Product\nAlice,alice@example.com,0123456789,10 Jalan Aman,Follow up,Widget"),
  });
  await page.getByRole("cell", { name: "Alice", exact: true }).waitFor();
  await page.getByLabel("Email", { exact: true }).selectOption("keep");
  await page.getByRole("button", { name: "Suggest sensitive fields", exact: true }).click();
  await page.getByRole("heading", { name: "5 likely sensitive columns found" }).waitFor();
  assert.ok(await page.getByLabel("Suggest Email", { exact: true }).isDisabled());
  assert.ok(!(await page.getByLabel("Suggest Notes", { exact: true }).isChecked()));
  assert.equal(await page.getByText("85% confidence", {exact: true}).count(), 2);
  await page.getByRole("button", { name: "Apply 3 selected suggestions", exact: true }).click();
  assert.equal(await page.getByLabel("Email", {exact: true}).inputValue(), "keep");
  await page.getByLabel("Show likely sensitive columns only (5)").check();
  assert.equal(await page.getByLabel("Product", {exact: true}).count(), 0);
  await page.getByRole("button", {name: "Review file", exact: true}).click();
  await page.getByRole("heading", {name: "Protection score: 50%", exact: true}).waitFor();
  await page.getByRole("button", { name: "Suggest sensitive fields", exact: true }).click();
  await page.getByLabel("Replace existing column rules when selected").check();
  await page.getByRole("button", { name: "Select all suggestions", exact: true }).click();
  await page.getByLabel("Suggested rule for Email", {exact: true}).selectOption("remove");
  await page.setViewportSize({width: 390, height: 844});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("region", {name: "Sensitive field suggestions"}).scrollIntoViewIfNeeded();
  await page.screenshot({path: out + "/smart-mobile.png"});
  await page.getByRole("button", { name: "Apply 5 selected suggestions", exact: true }).click();
  assert.equal(await page.getByRole("heading", {name: "Protection score: 50%", exact: true}).count(), 0);
  await page.getByRole("button", {name: "Review file", exact: true}).click();
  await page.getByRole("heading", {name: "Protection score: 90%", exact: true}).waitFor();
  assert.ok(await page.getByRole("button", {name: "Download masked CSV", exact: true}).isDisabled());
  await page.setViewportSize({width: 1440, height: 1100});
  await page.screenshot({path: out + "/smart-desktop.png", fullPage: true});
  await upload.setInputFiles({name: "plain.csv", mimeType: "text/csv", buffer: Buffer.from("Product,Quantity\nWidget,12")});
  await page.getByRole("cell", {name: "Widget", exact: true}).waitFor();
  assert.equal(await page.getByRole("heading", {name: "Protection score: 90%", exact: true}).count(), 0);
  await page.getByRole("button", {name: "Suggest sensitive fields", exact: true}).click();
  await page.getByRole("heading", {name: "0 likely sensitive columns found"}).waitFor();
  await page.getByRole("button", {name: "Review file", exact: true}).click();
  await page.getByRole("heading", {name: "Protection score: not available", exact: true}).waitFor();
  const workshopRequire = createRequire(
    new URL("../workshop/package.json", import.meta.url),
  );
  const ExcelJS = workshopRequire("exceljs");
  const book = new ExcelJS.Workbook();
  book.addWorksheet("First").addRows([
    ["Name", "Age"],
    ["Excel Person", 42],
  ]);
  book.addWorksheet("Second").addRows([
    ["Name", "Age"],
    ["Other Person", 68],
  ]);
  await upload.setInputFiles({
    name: "actual.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(await book.xlsx.writeBuffer()),
  });
  await page.getByRole("cell", { name: "Excel Person", exact: true }).waitFor();
  await page.getByLabel("Worksheet", { exact: true }).selectOption("1");
  await page.getByRole("cell", { name: "Other Person", exact: true }).waitFor();
  await page.getByRole("button", { name: "Clear file", exact: true }).click();
  await page.getByRole("heading", { name: "A fresh workspace." }).waitFor();
  await page.getByRole("link", { name: "Practice", exact: true }).click();
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
  await page.getByRole("link", { name: "Files", exact: true }).click();
  await page.getByRole("button", {name: "Try a sample", exact: true}).click();
  await page.getByRole("cell", {name: "Aina Example", exact: true}).waitFor();
  await page.getByRole("button", {name: "Clear file", exact: true}).click();
  await upload.setInputFiles(fixture);
  await page.getByRole("cell", { name: "Test Person", exact: true }).waitFor();
  const cachesText = await page.evaluate(async () => {
    const output = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      for (const request of await cache.keys()) {
        output.push(await (await cache.match(request)).text());
      }
    }
    return output.join("");
  });
  assert.ok(!cachesText.includes("Test Person"));
  assert.equal(errors.length, 0, errors.join("\n"));
  console.log(
    "PASS: desktop/mobile layout, selection, actual age bands, comparison, export review gate, CSV, fictional sample including offline loading, undo suggestions, smart suggestions, confidence, coverage scores, manual-rule preservation, reset, hash history, restart, offline exercise, no browser errors.",
  );
} finally {
  await browser?.close();
  server.close();
}
