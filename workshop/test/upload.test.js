import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseTable,
  transformTable,
  exportCsv,
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
    ["Row 0001", "30–39", ""],
    ["Row 0002", "", ""],
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
