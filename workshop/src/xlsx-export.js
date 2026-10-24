import { tableLayout, transformTable, worksheetRows } from "./upload-data.js";

const isFormula = (value) =>
  value && typeof value === "object" && ("formula" in value || "sharedFormula" in value);
const literals = (formula) =>
  [...formula.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'));

// Mask one worksheet of a loaded ExcelJS workbook in place and drop every other sheet.
// Formulas are kept only when they cannot reveal original data once Excel recalculates.
export function maskWorkbook(workbook, sheetName, rules) {
  const sheet = workbook.getWorksheet(sheetName);
  const { rows: matrix, rowNumbers } = worksheetRows(sheet);
  const layout = tableLayout(matrix);
  const masked = transformTable(layout, rules);
  const names = workbook.definedNames.model.map(({ name }) => name.toLowerCase());
  // Original values of masked columns, to catch formulas that spell them out.
  const hidden = new Set();
  layout.rows.forEach((row) =>
    row.forEach((value, col) => {
      if ((rules[col] || "keep") !== "keep" && value.trim().length > 1)
        hidden.add(value.trim().toLowerCase());
    }),
  );
  const unsafe = (cell) => {
    const value = cell.value;
    if (value.shareType === "array") return true;
    const formula = cell.formula;
    // Other sheets and files are not exported, and their values were never masked.
    if (/[![]/.test(formula.replace(/"(?:[^"]|"")*"/g, ""))) return true;
    const words = formula.replace(/"(?:[^"]|"")*"/g, "").toLowerCase().match(/[a-z_\\][\w.]*/g) || [];
    if (words.some((word) => names.includes(word))) return true;
    return literals(formula).some((text) => {
      const lower = text.trim().toLowerCase();
      return lower && [...hidden].some((value) => lower.includes(value));
    });
  };
  const counts = { kept: 0, values: 0 };
  // Masked columns: write the masked text over values and formulas alike.
  masked.forEach((row, r) =>
    row.forEach((text, c) => {
      if ((rules[c] || "keep") === "keep") return;
      const cell = sheet.getCell(
        rowNumbers[layout.rowIndex[r + 1]],
        layout.columns[c] + 1,
      );
      if (cell.master !== cell) return;
      if (isFormula(cell.value)) counts.values++;
      cell.value = text === "" ? null : text;
      // Notes can name the person too; ExcelJS has no public API to remove one.
      delete cell._comment;
    }),
  );
  // Every remaining formula: keep it without its saved result, or replace it with that result.
  sheet.eachRow((row) =>
    row.eachCell((cell) => {
      const value = cell.value;
      if (cell.master !== cell || !isFormula(value)) return;
      if (unsafe(cell)) {
        counts.values++;
        cell.value = value.result ?? null;
      } else {
        counts.kept++;
        cell.value = { formula: cell.formula };
      }
    }),
  );
  for (const other of [...workbook.worksheets])
    if (other !== sheet) workbook.removeWorksheet(other.id);
  workbook.definedNames.model = [];
  // Drop dropdowns and highlight rules that point at removed sheets.
  const model = sheet.dataValidations.model;
  for (const address of Object.keys(model))
    if ((model[address].formulae || []).some((f) => /[![]/.test(String(f)) || names.includes(String(f).toLowerCase())))
      delete model[address];
  sheet.conditionalFormattings = (sheet.conditionalFormattings || []).filter(
    (cf) => !cf.rules.some((rule) => (rule.formulae || []).some((f) => /[![]/.test(String(f)))),
  );
  workbook.calcProperties = { ...workbook.calcProperties, fullCalcOnLoad: true };
  return counts;
}
