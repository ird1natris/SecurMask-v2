import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseTable,
  transformTable,
  exportCsv,
  formulaResultText,
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
  assert.throws(
    () =>
      normaliseTable([
        ["A", "A"],
        [1, 2],
      ]),
    /unique/,
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

test("formula cells use the saved result and fail when it is missing or an error", () => {
  assert.equal(formulaResultText({ formula: "A1&B1", result: "Alice Tan" }, "C2"), "Alice Tan");
  assert.equal(formulaResultText({ sharedFormula: "C2", result: 42 }, "C3"), "42");
  assert.equal(formulaResultText({ formula: "A1=\"\"", result: false }, "C4"), "false");
  assert.equal(formulaResultText({ formula: "T(A1)", result: "" }, "C5"), "");
  assert.equal(formulaResultText({ formula: "DATE(2026,1,2)", result: new Date("2026-01-02T00:00:00Z") }, "C6"), "2026-01-02T00:00:00.000Z");
  assert.equal(formulaResultText({ formula: "A1", result: { richText: [{ text: "Al" }, { text: "ice" }] } }, "C7"), "Alice");
  assert.throws(() => formulaResultText({ formula: "A1+1" }, "D2"), /D2 has a formula with no saved value/);
  assert.throws(() => formulaResultText({ formula: "Z99/0", result: { error: "#REF!" } }, "D3"), /D3 shows #REF!/);
});
