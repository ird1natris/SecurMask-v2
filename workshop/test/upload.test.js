import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseTable,
  transformTable,
  exportCsv,
  formulaResultText,
  worksheetRows,
} from "../src/upload-data.js";
test("uploaded values remain unchanged unless explicitly selected", () => {
  const data = normaliseTable([
    ["Name", "Age", "Note"],
    ["Example", 34, "Asthma"],
    ["Other", "", "Follow-up"],
  ]);
  const original = structuredClone(data);
  assert.deepEqual(transformTable(data, {}), data.rows);
  assert.deepEqual(transformTable(data, { 0: "id", 1: "age", 2: "remove" }), [
    ["Name 0001", "30–39", ""],
    ["Name 0002", "", ""],
  ]);
  assert.deepEqual(data, original);
});
test("invalid ages fail instead of silently retaining or inventing values", () => {
  assert.throws(
    () => transformTable(normaliseTable([["Age"], ["unknown"]]), { 0: "age" }),
    /invalid age/,
  );
});
test("headers, ragged rows, and formula export are handled explicitly", () => {
  assert.deepEqual(
    normaliseTable([
      ["A", "A", "", "", ""],
      [1, 2, "", "x", ""],
    ]),
    { headers: ["A", "A (2)", "Column D"], rows: [["1", "2", "x"]] },
  );
  assert.throws(() => normaliseTable([["A"], [1, 2]]), /more values/);
  assert.match(exportCsv(["=header"], [["  =1+1"]]), /"'=header"/);
  assert.match(exportCsv(["A"], [["  =1+1"]]), /"'  =1\+1"/);
});

test("IDs use each column heading and the source row number, preserving blanks", () => {
  const data = normaliseTable([["Customer Name", "Account"], ["Alice", "001"], ["", "002"], ["Alice", "003"]]);
  assert.deepEqual(transformTable(data, {0: "id", 1: "id"}), [
    ["Customer Name 0001", "Account 0001"], ["", "Account 0002"], ["Customer Name 0003", "Account 0003"],
  ]);
});

test("partial masks hide email, phone and text while retaining only intended details", () => {
  const data = normaliseTable([
    ["Email", "Phone", "Code", "Secret"],
    ["alice@example.com", "+60 12-345 6789", "ABC1234567", "A😀 B"],
    ["a@example.com", "1234", "1234", ""],
    ["invalid email", "call me", "😀12", "  "],
  ]);
  const original = structuredClone(data);
  const output = transformTable(data, {0: "email", 1: "phone", 2: "last4", 3: "redact"});
  assert.deepEqual(output, [
    ["aXXXX@example.com", "+XX XX-XXX 6789", "XXXXXX4567", "XXXX"],
    ["X@example.com", "XXXX", "XXXX", ""],
    ["XXXXXXXXXXXXX", "XXXX XX", "XXX", "  "],
  ]);
  assert.deepEqual(data, original);
  const csv = exportCsv(data.headers, output);
  assert.ok(csv.includes('aXXXX@example.com'));
  assert.ok(!csv.includes('alice@'));
  assert.ok(!csv.includes('345'));
});

test("formula cells use the saved result, showing blanks and errors as saved", () => {
  assert.equal(formulaResultText({ formula: "A1&B1", result: "Alice Tan" }, "C2"), "Alice Tan");
  assert.equal(formulaResultText({ sharedFormula: "C2", result: 42 }, "C3"), "42");
  assert.equal(formulaResultText({ formula: "A1=\"\"", result: false }, "C4"), "false");
  assert.equal(formulaResultText({ formula: "T(A1)", result: "" }, "C5"), "");
  assert.equal(formulaResultText({ formula: "DATE(2026,1,2)", result: new Date("2026-01-02T00:00:00Z") }, "C6"), "2026-01-02T00:00:00.000Z");
  assert.equal(formulaResultText({ formula: "A1", result: { richText: [{ text: "Al" }, { text: "ice" }] } }, "C7"), "Alice");
  assert.equal(formulaResultText({ formula: "IF(A1=\"\",\"\",A1)" }, "D2"), "");
  assert.equal(formulaResultText({ formula: "Z99/0", result: { error: "#REF!" } }, "D3"), "#REF!");
});

test("multi-sheet workbooks with merged cells, spacer columns and uncached formulas load", async () => {
  const ExcelJS = (await import("exceljs")).default;
  const book = new ExcelJS.Workbook();
  const dashboard = book.addWorksheet("Dashboard");
  dashboard.getCell("A1").value = "Case dashboard";
  dashboard.mergeCells("A1:D1");
  dashboard.mergeCells("A3:B3");
  dashboard.getCell("C3").value = { formula: "COUNTA(Master!A:A)" };
  dashboard.getCell("A4").value = "Open";
  dashboard.getCell("C4").value = { formula: "1+1", result: 2 };
  dashboard.getCell("D4").value = { text: "Link", hyperlink: "https://example.com" };
  const lists = book.addWorksheet("Lists");
  lists.addRows([["Status", "", "Priority"], ["Open", "", "High"], ["Closed", "", "Low"]]);
  lists.getCell("F1").style = { font: { bold: true } };
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(await book.xlsx.writeBuffer());

  const dash = worksheetRows(loaded.getWorksheet("Dashboard"));
  assert.equal(dash.formulas, 2);
  assert.equal(dash.blankFormulas, 1);
  assert.deepEqual(normaliseTable(dash.rows), {
    headers: ["Case dashboard", "Column C", "Column D"],
    rows: [["Open", "2", "Link"]],
  });
  assert.deepEqual(normaliseTable(worksheetRows(loaded.getWorksheet("Lists")).rows), {
    headers: ["Status", "Priority"],
    rows: [["Open", "High"], ["Closed", "Low"]],
  });
});
