import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { maskWorkbook } from "../src/xlsx-export.js";

async function roundTrip(book) {
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await book.xlsx.writeBuffer());
  return loaded;
}

test("masked XLSX keeps safe formulas and formatting, and never keeps original data", async () => {
  const book = new ExcelJS.Workbook();
  const cases = book.addWorksheet("Cases");
  cases.addRows([
    ["Name", "Status", "Phone", "Label", "Count", "Lookup", "VIP"],
    ["Alice Tan", "Open", "012-555 0101", null, null, null, null],
    ["Bob Lee", "Closed", "013-555 0102", null, null, null, null],
  ]);
  cases.getCell("D2").value = { formula: 'A2&" ("&B2&")"', result: "Alice Tan (Open)" };
  cases.getCell("D3").value = { sharedFormula: "D2", result: "Bob Lee (Closed)" };
  cases.getCell("D2").value = { formula: 'A2&" ("&B2&")"', result: "Alice Tan (Open)", shareType: "shared", ref: "D2:D3" };
  cases.getCell("E2").value = { formula: 'COUNTIF(B:B,"Open")', result: 1 };
  cases.getCell("F2").value = { formula: "Secret!A1", result: "hidden value" };
  cases.getCell("G2").value = { formula: 'IF(A2="Alice Tan","VIP","")', result: "VIP" };
  cases.getCell("C3").value = { formula: '"013-555 0102"', result: "013-555 0102" };
  cases.getCell("A1").font = { bold: true };
  cases.getCell("A2").note = "Prefers email";
  book.addWorksheet("Secret").getCell("A1").value = "hidden value";

  const loaded = await roundTrip(book);
  const counts = maskWorkbook(loaded, "Cases", { 0: "id", 2: "phone" });
  const out = await roundTrip(loaded);
  const sheet = out.getWorksheet("Cases");

  assert.deepEqual(out.worksheets.map((s) => s.name), ["Cases"]);
  assert.equal(sheet.getCell("A2").value, "Name 0001");
  assert.equal(sheet.getCell("A2").note, undefined);
  assert.equal(sheet.getCell("C2").value, "XXX-XXX 0101");
  assert.equal(sheet.getCell("C3").value, "XXX-XXX 0102");
  assert.ok(sheet.getCell("A1").font.bold);
  // Same-sheet formulas stay, without saved results, and recalculate from masked cells.
  assert.deepEqual(sheet.getCell("D2").value, { formula: 'A2&" ("&B2&")"' });
  assert.deepEqual(sheet.getCell("D3").value, { formula: 'A3&" ("&B3&")"' });
  assert.deepEqual(sheet.getCell("E2").value, { formula: 'COUNTIF(B:B,"Open")' });
  // Other sheets and literals that spell out masked data become values.
  assert.equal(sheet.getCell("F2").value, "hidden value");
  assert.equal(sheet.getCell("G2").value, "VIP");
  assert.deepEqual(counts, { kept: 3, values: 3 });
  assert.ok(loaded.calcProperties.fullCalcOnLoad);

  const text = JSON.stringify(sheet.getSheetValues());
  for (const original of ["Alice", "Bob", "555 0101", "555 0102"])
    assert.ok(!text.includes(original), original);
});
