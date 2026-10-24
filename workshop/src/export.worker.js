import ExcelJS from "exceljs";
import { maskWorkbook } from "./xlsx-export";
self.onmessage = async ({ data: { file, sheetName, rules } }) => {
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const counts = maskWorkbook(workbook, sheetName, rules);
    self.postMessage({ buffer: await workbook.xlsx.writeBuffer(), counts });
  } catch (error) {
    self.postMessage({
      error: error.message || "The masked XLSX could not be created. Download the masked CSV instead.",
    });
  }
};
