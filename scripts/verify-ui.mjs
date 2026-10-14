// Run after client build: node scripts/verify-ui.mjs
// Uses isolated PGlite/storage, real auth/encryption/API, and a deterministic processor.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../server/app.js";
import { createStorage } from "../server/storage.js";
import { migrate } from "../server/migrate.js";
const clientRequire = createRequire(
  new URL("../client/package.json", import.meta.url),
);
const serverRequire = createRequire(
  new URL("../server/package.json", import.meta.url),
);
const { chromium } = clientRequire("@playwright/test");
const { PGlite } = serverRequire("@electric-sql/pglite");
const express = serverRequire("express");
const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = join(root, ".artifacts/revamp");
await mkdir(artifacts, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), "securmask-ui-"));
const engine = new PGlite();
const query = async (sql, params) => {
  const result = params
    ? await engine.query(sql, params)
    : (await engine.exec(sql)).at(-1);
  return {
    ...result,
    rowCount: result?.affectedRows ?? result?.rows?.length ?? 0,
  };
};
const db = { query, connect: async () => ({ query, release() {} }) };
await migrate(await db.connect());
const storage = createStorage(temporary);
await storage.init();
const messages = [];
const config = {
  production: false,
  secret: "ui-test-only-secret-at-least-32-characters",
  origin: "",
};
const fixture =
  "name,email,department\nAmira Hassan,amira@example.test,Research\nDaniel Tan,daniel@example.test,Finance\n";
const processor = {
  detect: async () => ({ columns: ["name", "email", "department"] }),
  process: async (bytes) => bytes.toString(),
  mask: async (content, columns) => {
    const [header, ...lines] = content.trimEnd().split("\n");
    const names = header.split(",");
    return (
      header +
      "\n" +
      lines
        .map((line) =>
          line
            .split(",")
            .map((v, i) => (columns.includes(names[i]) ? "XXXXXX" : v))
            .join(","),
        )
        .join("\n") +
      "\n"
    );
  },
};
const host = express();
host.use(
  "/api",
  createApp({
    db,
    storage,
    config,
    processor,
    limits: false,
    sendMail: async (message) => messages.push(message),
  }),
);
host.use(express.static(join(root, "client/dist")));
host.get("*", (_req, res) =>
  res.sendFile(join(root, "client/dist/index.html")),
);
const server = host.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
config.origin = "http://127.0.0.1:" + server.address().port;
let browser;
try {
  browser = await chromium.launch(
    process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : { channel: "chrome" },
  );
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1060 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("dialog", (dialog) => dialog.accept());
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(config.origin);
  await page.getByLabel("Email address").waitFor();
  await page.screenshot({
    path: join(artifacts, "login-desktop.png"),
    fullPage: true,
  });
  await page.getByLabel("Email address").fill("ui-test@example.test");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await page.getByLabel("Sign-in code").waitFor();
  await page
    .getByLabel("Sign-in code")
    .fill(messages.at(-1).text.match(/\b\d{6}\b/)[0]);
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await page
    .getByRole("button", { name: "Choose a file", exact: true })
    .waitFor();
  await page.screenshot({
    path: join(artifacts, "workspace-desktop.png"),
    fullPage: true,
  });
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "Workspace horizontal overflow",
    );
    await page.screenshot({
      path: join(artifacts, `workspace-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1440, height: 1060 });
  await page.getByLabel("Choose spreadsheet").setInputFiles({
    name: "team.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(fixture),
  });
  await page.getByLabel("File encryption key").fill("test-file-key");
  await page.getByLabel("I have saved my key somewhere safe.").check();
  await page.getByRole("button", { name: "Continue to columns" }).click();
  await page.getByRole("heading", { name: "Original preview" }).waitFor();
  await page.getByRole("checkbox", { name: /^name/ }).check();
  await page.screenshot({
    path: join(artifacts, "columns-desktop.png"),
    fullPage: true,
  });
  // Navigation preserves selections but not the key input.
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("link", { name: "Workspace", exact: true }).click();
  assert.equal(
    await page.getByRole("checkbox", { name: /^name/ }).isChecked(),
    true,
  );
  await page.getByLabel("File key", { exact: true }).fill("test-file-key");
  await page.getByRole("button", { name: "Mask selected columns" }).click();
  await page.getByRole("button", { name: "Download masked CSV" }).waitFor();
  assert.equal(
    await page.getByRole("cell", { name: "XXXXXX", exact: true }).count(),
    2,
  );
  assert.equal(
    await page.getByRole("cell", { name: "Research", exact: true }).count(),
    1,
  );
  await page.screenshot({
    path: join(artifacts, "review-desktop.png"),
    fullPage: true,
  });
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download masked CSV" }).click();
  const downloaded = await pending;
  const signed = await readFile(await downloaded.path(), "utf8");
  assert.match(signed, /--DIGITAL-SIGNATURE--/);
  assert.match(signed, /XXXXXX,amira@example.test,Research/);
  // A fresh browser context has no IndexedDB catalog, but sees the server library.
  const second = await browser.newContext({
    storageState: await context.storageState(),
    viewport: { width: 390, height: 844 },
  });
  const secondPage = await second.newPage();
  await secondPage.goto(config.origin + "/folder");
  await secondPage.locator(".file-name").waitFor();
  assert.equal(
    await secondPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
    "Files horizontal overflow",
  );
  await secondPage.screenshot({
    path: join(artifacts, "files-mobile.png"),
    fullPage: true,
  });
  await second.close();
  await page.getByRole("link", { name: "Recover", exact: true }).click();
  await page.getByLabel("Signed CSV file").setInputFiles({
    name: downloaded.suggestedFilename(),
    mimeType: "text/csv",
    buffer: Buffer.from(signed),
  });
  await page.getByLabel("File encryption key").fill("wrong-key");
  await page.getByRole("button", { name: "Recover original" }).click();
  await page.getByRole("alert").waitFor();
  await page.getByLabel("File encryption key").fill("test-file-key");
  await page.getByRole("button", { name: "Recover original" }).click();
  await page
    .getByRole("heading", { name: "Your original is ready." })
    .waitFor();
  assert.equal(
    await page.getByRole("cell", { name: "Amira Hassan", exact: true }).count(),
    1,
  );
  assert.equal(await page.getByLabel("File encryption key").inputValue(), "");
  await page.screenshot({
    path: join(artifacts, "recover-desktop.png"),
    fullPage: true,
  });
  for (const route of ["folder", "recover", "setting", "about-us", "contact"]) {
    await page.goto(config.origin + "/" + route);
    await page.locator(".workspace-main").waitFor();
    await page.setViewportSize({ width: 360, height: 800 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      route + " horizontal overflow",
    );
  }
  await page.goto(config.origin + "/setting");
  await page.getByLabel("Full name").fill("Irdina");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("status").waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.locator(".workspace-main").waitFor();
  const caches = await page.evaluate(async () => {
    const names = await window.caches.keys();
    return (
      await Promise.all(
        names.map(async (name) =>
          (await (await window.caches.open(name)).keys()).map(
            (request) => request.url,
          ),
        ),
      )
    ).flat();
  });
  assert.ok(caches.length > 0);
  assert.ok(
    caches.every((url) => !new URL(url).pathname.startsWith("/api")),
    "Sensitive API entered service worker cache",
  );
  const manifest = await (
    await page.request.get(config.origin + "/manifest.webmanifest")
  ).json();
  assert.equal(manifest.display, "standalone");
  for (const icon of manifest.icons)
    assert.equal(
      (await page.request.get(config.origin + icon.src)).status(),
      200,
    );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByLabel("Email address").waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("heading", { name: "You’re offline." }).waitFor();
  assert.equal(
    await page.getByText("Amira Hassan", { exact: true }).count(),
    0,
  );
  await page.screenshot({
    path: join(artifacts, "offline-mobile.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: email sign-in, upload, selections, navigation persistence, mask/export, account library in a fresh context, wrong-key handling, recovery, profile save, mobile layouts, manifest/icons, cache exclusion, logout and offline launch.",
  );
  console.log("Screenshots: " + artifacts);
} catch (error) {
  const page = browser?.contexts()[0]?.pages()[0];
  if (page) {
    await page.screenshot({
      path: join(artifacts, "failure.png"),
      fullPage: true,
    });
    console.error(await page.locator("body").innerText());
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
  await engine.close();
  await rm(temporary, { recursive: true, force: true });
}
