export const MASK_RULES = [
  { value: "keep", label: "Keep unchanged", help: "Keep the original value." },
  { value: "remove", label: "Remove values", help: "Leave the cell empty." },
  { value: "id", label: "Replace with row ID", help: "Use the column heading + row number, e.g. Name 0001." },
  { value: "redact", label: "Hide all with X", help: "Replace every character with X; the length remains visible." },
  { value: "email", label: "Email → partial hide", help: "alice@example.com → aXXXX@example.com. The domain remains visible; invalid emails are fully hidden." },
  { value: "phone", label: "Phone → last 4 digits", help: "+60 12-345 6789 → +XX XX-XXX 6789. Separators stay visible." },
  { value: "last4", label: "Text → last 4 characters", help: "ABC1234567 → XXXXXX4567. Values of 4 characters or fewer are fully hidden." },
  { value: "age", label: "Age → 10-year band", help: "34 → 30–39. Accepts whole ages from 0 to 120." },
];

export const MAX_ROWS = 10000;
export const MAX_COLUMNS = 100;
const isBlank = (value) => String(value ?? "").trim() === "";
function columnLetter(index) {
  let n = index + 1, letters = "";
  while (n) {
    n--;
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26);
  }
  return letters;
}
export function normaliseTable(matrix) {
  const rows = matrix.filter((row) => row.some((value) => !isBlank(value)));
  if (rows.length < 2)
    throw new Error("Include a header row and at least one data row.");
  if (rows.length - 1 > MAX_ROWS)
    throw new Error("Use a file with at most 10,000 data rows.");
  // A CSV row longer than its header usually means an unquoted comma shifted values.
  if (rows.slice(1).some((row) => row.length > rows[0].length))
    throw new Error(
      "Some rows have more values than the header. Check the file layout.",
    );
  // Spacer and trailing columns that are empty in every row are dropped.
  const columns = rows[0]
    .map((_, i) => i)
    .filter((i) => rows.some((row) => !isBlank(row[i])));
  if (columns.length > MAX_COLUMNS) throw new Error("Use at most 100 columns.");
  // Blank headings take the column letter; repeated headings get a number.
  const used = new Set();
  const headers = columns.map((i) => {
    const base = String(rows[0][i] ?? "").trim() || `Column ${columnLetter(i)}`;
    let header = base;
    for (let n = 2; used.has(header); n++) header = `${base} (${n})`;
    used.add(header);
    return header;
  });
  return {
    headers,
    rows: rows.slice(1).map((row) => columns.map((i) => String(row[i] ?? ""))),
  };
}
// Use the value the spreadsheet app saved for a formula; formulas are never evaluated here.
// A missing result is shown blank: Excel saves formulas that return "" without a value.
export function formulaResultText({ result }) {
  return result === undefined || result === null ? "" : cellValueText(result);
}
export function cellValueText(value) {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value.richText))
    return value.richText.map((part) => part.text).join("");
  if ("formula" in value || "sharedFormula" in value)
    return formulaResultText(value);
  if ("hyperlink" in value) return cellValueText(value.text);
  if ("error" in value) return String(value.error);
  return "";
}
// Read an ExcelJS worksheet without cell.text, which throws on merged empty cells.
export function worksheetRows(sheet) {
  const rows = [];
  let formulas = 0, blankFormulas = 0;
  sheet.eachRow((row) => {
    const values = [];
    row.eachCell((cell, col) => {
      // Cells covered by a merge stay blank; the value lives in the top-left cell.
      if (cell.master !== cell) return;
      const value = cell.value;
      if (value && typeof value === "object" && ("formula" in value || "sharedFormula" in value)) {
        formulas++;
        if (value.result === undefined || value.result === null) blankFormulas++;
      }
      values[col - 1] = cellValueText(value);
    });
    rows.push(values);
  });
  // Pad to the widest row so cells beyond the header row are kept, not rejected.
  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return {
    rows: rows.map((row) => Array.from({ length: width }, (_, i) => row[i] ?? "")),
    formulas,
    blankFormulas,
  };
}
export function transformTable(data, rules) {
  return data.rows.map((row, index) =>
    row.map((value, col) => {
      const rule = rules[col] || "keep";
      if (rule === "keep" || value.trim() === "") return value;
      if (rule === "remove") return "";
      if (rule === "id") return `${data.headers[col]} ${String(index + 1).padStart(4, "0")}`;
      if (rule === "redact") return Array.from(value, () => "X").join("");
      if (rule === "last4") {
        const chars = Array.from(value);
        return chars.map((char, i) =>
          chars.length > 4 && i >= chars.length - 4 ? char : "X",
        ).join("");
      }
      if (rule === "email") {
        // Malformed addresses are fully hidden; never pass them through.
        const match = /^([^\s@]+)@([^\s@]+\.[^\s@]+)$/.exec(value.trim());
        if (!match) return Array.from(value, () => "X").join("");
        const local = Array.from(match[1]);
        const masked = local.map((char, i) =>
          i === 0 && local.length > 1 ? char : "X",
        ).join("");
        return `${masked}@${match[2]}`;
      }
      if (rule === "phone") {
        const digits = value.match(/[0-9]/g) || [];
        let position = 0;
        return Array.from(value, (char) => {
          if (/[0-9]/.test(char)) {
            position += 1;
            return digits.length > 4 && position > digits.length - 4 ? char : "X";
          }
          // Preserve separators, but hide names and extension labels.
          return /[+()\s.\-]/.test(char) ? char : "X";
        }).join("");
      }
      if (rule === "age") {
        if (!/^\d{1,3}$/.test(value.trim()) || Number(value) > 120)
          throw new Error(
            `“${data.headers[col]}” contains an invalid age at data row ${index + 1}. Choose another rule or correct the file.`,
          );
        const start = Math.floor(Number(value) / 10) * 10;
        return `${start}–${start + 9}`;
      }
      throw new Error("Unknown masking rule.");
    }),
  );
}
export function exportCsv(headers, rows) {
  // Neutralise spreadsheet formulas, including values disguised with whitespace.
  const quote = (value) => {
    let text = String(value);
    if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text))
      text = "'" + text;
    return '"' + text.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [headers, ...rows].map((row) => row.map(quote).join(",")).join("\r\n")
  );
}
