export const MAX_ROWS = 10000;
export const MAX_COLUMNS = 100;
export function normaliseTable(matrix) {
  const rows = matrix.filter((row) =>
    row.some((value) => String(value ?? "").trim() !== ""),
  );
  if (rows.length < 2)
    throw new Error("Include a header row and at least one data row.");
  if (rows.length - 1 > MAX_ROWS)
    throw new Error("Use a file with at most 10,000 data rows.");
  const headers = rows[0].map((value) => String(value ?? "").trim());
  if (headers.length > MAX_COLUMNS) throw new Error("Use at most 100 columns.");
  if (
    headers.some((value) => !value) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("Every column needs a unique, non-empty header.");
  if (rows.slice(1).some((row) => row.length > headers.length))
    throw new Error(
      "Some rows have more values than the header. Check the file layout.",
    );
  return {
    headers,
    rows: rows
      .slice(1)
      .map((row) => headers.map((_, i) => String(row[i] ?? ""))),
  };
}
export function transformTable(data, rules) {
  return data.rows.map((row, index) =>
    row.map((value, col) => {
      const rule = rules[col] || "keep";
      if (rule === "keep" || value.trim() === "") return value;
      if (rule === "remove") return "";
      if (rule === "id") return `Row ${String(index + 1).padStart(4, "0")}`;
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
