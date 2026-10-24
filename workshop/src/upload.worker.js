import Papa from "papaparse";
import ExcelJS from "exceljs";
import { normaliseTable, worksheetRows } from "./upload-data";
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
            const { rows, formulas, blankFormulas } = worksheetRows(sheet);
            return { name: sheet.name, formulas, blankFormulas, ...normaliseTable(rows) };
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
