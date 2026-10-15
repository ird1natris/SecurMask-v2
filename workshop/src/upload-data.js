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
