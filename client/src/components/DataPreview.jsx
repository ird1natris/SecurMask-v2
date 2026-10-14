import PropTypes from "prop-types";
export default function DataPreview({ rows, selected = [] }) {
  const columns = Object.keys(rows[0] || {});
  return (
    <div
      className="data-preview"
      tabIndex={0}
      role="region"
      aria-label="Dataset preview, scroll horizontally for more columns"
    >
      {rows.length ? (
        <table>
          <thead>
            <tr>
              <th className="row-number">#</th>
              {columns.map((c) => (
                <th key={c} className={selected.includes(c) ? "highlight" : ""}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((row, i) => (
              <tr key={i}>
                <td className="row-number">{String(i + 1).padStart(2, "0")}</td>
                {columns.map((c) => (
                  <td
                    key={c}
                    className={selected.includes(c) ? "highlight" : ""}
                  >
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="empty-state">No data rows to preview.</p>
      )}
    </div>
  );
}

DataPreview.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string),
};
