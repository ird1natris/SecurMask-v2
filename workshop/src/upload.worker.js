import Papa from "papaparse";
import ExcelJS from "exceljs";
import { normaliseTable } from "./upload-data";
self.onmessage = async ({ data: { file } }) => {
  try {
    let sheets;
    if (/\.csv$/i.test(file.name)) {
      const result = Papa.parse(await file.text(), {
        skipEmptyLines: "greedy",
      });
      if (result.errors.some((error) => error.code !== "UndetectableDelimiter"))
        throw new Error(
          "The CSV has malformed quotes or rows. Save a clean CSV and try again.",
        );
      sheets = [{ name: "CSV", ...normaliseTable(result.data) }];
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      sheets = workbook.worksheets
        .filter((sheet) => sheet.state === "visible")
        .map((sheet) => {
          try {
            if (sheet.rowCount > 10001 || sheet.columnCount > 100)
              throw new Error(
                "Use at most 10,000 rows and 100 columns per sheet.",
              );
            const rows = [];
            sheet.eachRow({ includeEmpty: true }, (row) => {
              const values = [];
              row.eachCell({ includeEmpty: true }, (cell, col) => {
                const value = cell.value;
                if (
                  value &&
                  typeof value === "object" &&
                  ("formula" in value || "sharedFormula" in value)
                )
                  throw new Error(
                    "This sheet contains formulas. Export it as values-only CSV first.",
                  );
                values[col - 1] =
                  value instanceof Date ? value.toISOString() : cell.text;
              });
              rows.push(Array.from(values, (value) => value ?? ""));
            });
            return { name: sheet.name, ...normaliseTable(rows) };
          } catch (error) {
            return { name: sheet.name, error: error.message };
          }
        });
      if (!sheets.length) throw new Error("No visible worksheets found.");
    }
    self.postMessage({ sheets });
  } catch (error) {
    self.postMessage({
      error:
        error.message ||
        "This file could not be read. Try a CSV or unencrypted XLSX file.",
    });
  }
};
