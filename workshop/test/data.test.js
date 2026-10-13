import test from "node:test";
import assert from "node:assert/strict";
import { records, maskRecords, toCsv } from "../src/data.js";
test("unselected fields retain the original values without modifying the source", () => {
  const before = structuredClone(records);
  const masked = maskRecords(["name", "phone"]);
  assert.deepEqual(records, before);
  masked.forEach((row, i) => {
    assert.equal(row.name, `Person ${String(i + 1).padStart(2, "0")}`);
    assert.equal(row.phone, "Removed");
    assert.equal(row.age, records[i].age);
    assert.equal(row.condition, records[i].condition);
  });
});
test("age bands preserve actual ages; all supplied towns map to Pahang", () => {
  maskRecords(["age", "area", "condition"]).forEach((row, i) => {
    const [low, high] = row.age.split("–").map(Number);
    assert.ok(records[i].age >= low && records[i].age <= high);
    assert.equal(high - low, 9);
    assert.equal(row.area, "Pahang");
    assert.equal(row.condition, "Removed");
  });
});
test("empty selection preserves source and CSV quotes values", () => {
  assert.deepEqual(maskRecords([]), records);
  assert.match(
    toCsv([
      { name: 'A "name", here', phone: "", age: 20, area: "", condition: "" },
    ]),
    /"A ""name"", here"/,
  );
  assert.equal(toCsv(maskRecords(["name"])).split("\r\n").length, 7);
});
