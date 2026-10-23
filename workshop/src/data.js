export const fields = [
  {
    key: "name",
    label: "Full name",
    kind: "Direct identifier",
    rule: "Replace with participant ID",
    description: "Use a different ID for each fictional person.",
  },
  {
    key: "phone",
    label: "Phone number",
    kind: "Direct identifier",
    rule: "Remove value",
    description: "Contact details are not needed for this exercise.",
  },
  {
    key: "age",
    label: "Age",
    kind: "Indirect identifier",
    rule: "Use a 10-year band",
    description: "Keep the real age band, rather than inventing a new age.",
  },
  {
    key: "area",
    label: "Area",
    kind: "Indirect identifier",
    rule: "Generalise to state",
    description: "Reduce location detail from town to state.",
  },
  {
    key: "condition",
    label: "Clinical note",
    kind: "Sensitive information",
    rule: "Remove value",
    description: "Consider whether this information is needed at all.",
  },
];
export const records = [
  {
    name: "Aina Rahman",
    phone: "012-555 0101",
    age: 34,
    area: "Kuantan",
    condition: "Asthma",
  },
  {
    name: "Daniel Lim",
    phone: "013-555 0102",
    age: 57,
    area: "Pekan",
    condition: "Type 2 diabetes",
  },
  {
    name: "Siti Nadia",
    phone: "017-555 0103",
    age: 26,
    area: "Temerloh",
    condition: "Migraine",
  },
  {
    name: "Arun Kumar",
    phone: "019-555 0104",
    age: 42,
    area: "Bentong",
    condition: "Hypertension",
  },
  {
    name: "Nur Farah",
    phone: "016-555 0105",
    age: 68,
    area: "Raub",
    condition: "Osteoarthritis",
  },
  {
    name: "Marcus Tan",
    phone: "014-555 0106",
    age: 31,
    area: "Kuantan",
    condition: "Eczema",
  },
];
export function maskRecords(selected) {
  return records.map((row, i) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        !selected.includes(key)
          ? value
          : key === "name"
            ? `Person ${String(i + 1).padStart(2, "0")}`
            : key === "age"
              ? `${Math.floor(value / 10) * 10}–${Math.floor(value / 10) * 10 + 9}`
              : key === "area"
                ? "Pahang"
                : "Removed",
      ]),
    ),
  );
}
export function toCsv(rows) {
  return [
    fields.map((f) => f.label),
    ...rows.map((row) => fields.map((f) => row[f.key])),
  ]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
    )
    .join("\r\n");
}
