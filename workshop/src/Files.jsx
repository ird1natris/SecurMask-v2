import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  ArrowRight,
  Download,
  Trash2,
  FileSpreadsheet,
  ShieldCheck,
} from "lucide-react";
import { transformTable, exportCsv, MASK_RULES } from "./upload-data";
import { detectSensitive, protectionSummary } from './sensitive-data';
import SensitiveSuggestions, { ProtectionReport } from './SensitiveSuggestions';
export default function Files({ active }) {
  const [file, setFile] = useState(null),
    [sheets, setSheets] = useState([]),
    [sheetIndex, setSheetIndex] = useState(0),
    [rules, setRules] = useState({}),
    [showSuggestions, setShowSuggestions] = useState(false),
    [onlySensitive, setOnlySensitive] = useState(false),
    [appliedMessage, setAppliedMessage] = useState(''),
    [result, setResult] = useState(null),
    [view, setView] = useState("masked"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [ack, setAck] = useState(false),
    [done, setDone] = useState(false);
  const worker = useRef(null),
    timer = useRef(null),
    input = useRef(null),
    heading = useRef(null);
  const data = sheets[sheetIndex];
  const detections = useMemo(() => data && !data.error ? detectSensitive(data) : [], [data]);
  const report = useMemo(() => result ? protectionSummary(data, result, rules, detections) : null, [data, result, rules, detections]);
  function resetReview() {
    setResult(null);
    setAck(false);
    setDone(false);
    setError('');
    setAppliedMessage('');
  }
  function applySuggestions(next) {
    setRules(current => ({ ...current, ...next }));
    resetReview();
    setShowSuggestions(false);
    setAppliedMessage(`${Object.keys(next).length} suggestions applied. Review your file to see the result and protection score.`);
  }
  useEffect(
    () => () => {
      worker.current?.terminate();
      clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (active) heading.current?.focus();
  }, [active]);
  useEffect(() => {
    if (!file) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [file]);
  function clear() {
    worker.current?.terminate();
    clearTimeout(timer.current);
    setFile(null);
    setSheets([]);
    setSheetIndex(0);
    setRules({});
    setShowSuggestions(false);
    setOnlySensitive(false);
    setAppliedMessage('');
    setResult(null);
    setError("");
    setAck(false);
    setDone(false);
    setBusy(false);
    if (input.current) input.current.value = "";
  }
  function load(next) {
    if (!next) return;
    clear();
    if (!/\.(csv|xlsx)$/i.test(next.name)) {
      setError(
        "Choose a CSV or XLSX spreadsheet. PDF, Word and images are not supported.",
      );
      return;
    }
    if (next.size > 5 * 1024 * 1024) {
      setError("Choose a file smaller than 5 MB.");
      return;
    }
    setFile(next);
    setBusy(true);
    const task = new Worker(new URL("./upload.worker.js", import.meta.url), {
      type: "module",
    });
    worker.current = task;
    const finish = () => {
      clearTimeout(timer.current);
      task.terminate();
      setBusy(false);
    };
    timer.current = setTimeout(() => {
      finish();
      setError(
        "Reading took too long. Try a smaller file or export it as CSV.",
      );
    }, 20000);
    task.onmessage = ({ data: message }) => {
      finish();
      if (message.error) setError(message.error);
      else setSheets(message.sheets);
    };
    task.onerror = () => {
      finish();
      setError(
        "Unable to read this file. Try an unencrypted XLSX or a UTF-8 CSV.",
      );
    };
    task.postMessage({ file: next });
  }
  function review() {
    try {
      setResult(transformTable(data, rules));
      setView("masked");
      setAck(false);
      setDone(false);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([exportCsv(data.headers, result)], {
        type: "text/csv;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "securmask-masked.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDone(true);
  }
  return (
    <section hidden={!active} aria-label="Your files">
      <div className="intro">
        <div>
          <h1 ref={heading} tabIndex={-1}>
            Your file.
            <br />
            <span>Your choices.</span>
          </h1>
          <p>
            Open a spreadsheet, choose what to mask, and review the result. Your
            file is processed on this device and is never sent to a server.
          </p>
        </div>
        <FileSpreadsheet size={58} strokeWidth={1.3} aria-hidden="true" />
      </div>
      <div className="upload-bar">
        <label className="primary inline upload-label">
          <Upload size={18} aria-hidden="true" />
          {file ? "Choose another file" : "Choose a spreadsheet"}
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx"
            aria-label="Choose a spreadsheet"
            onChange={(e) => load(e.target.files[0])}
          />
        </label>
        <span>CSV or XLSX · Up to 5 MB · 10,000 rows</span>
        {file && (
          <button className="secondary" onClick={clear}>
            <Trash2 size={16} aria-hidden="true" /> Clear file
          </button>
        )}
      </div>
      {busy && (
        <p className="upload-message" role="status">
          Reading your spreadsheet on this device…
        </p>
      )}
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
      {!file && (
        <div className="empty-upload">
          <FileSpreadsheet size={42} strokeWidth={1.2} aria-hidden="true" />
          <h2>A fresh workspace.</h2>
          <p>
            Use a sample or a file you have permission to process. The first row
            should contain column names. PDF, Word and images are not supported.
          </p>
          <div>
            <ShieldCheck size={17} aria-hidden="true" /> No account. No cloud
            upload.
          </div>
        </div>
      )}
      {data && (
        <>
          <div className="file-summary">
            <strong>{file.name}</strong>
            <label>
              Worksheet{" "}
              <select
                aria-label="Worksheet"
                value={sheetIndex}
                onChange={(e) => {
                  setSheetIndex(Number(e.target.value));
                  setRules({});
                  setShowSuggestions(false);
                  setOnlySensitive(false);
                  resetReview();
                }}
              >
                {sheets.map((sheet, i) => (
                  <option key={i} value={i}>
                    {sheet.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {data.error ? (
            <p className="upload-error" role="alert">
              {data.error}
            </p>
          ) : (
            <section className="workbench">
              <div className="sheet">
                <div className="sheet-header">
                  <div className="file-title">
                    <FileSpreadsheet size={22} aria-hidden="true" />
                    <div>
                      <h2>
                        {result ? "Review your result" : "Original spreadsheet"}
                      </h2>
                      <span>
                        {data.rows.length.toLocaleString()} rows ·{" "}
                        {data.headers.length} columns
                      </span>
                    </div>
                  </div>
                  <span className="pill">Preview: first 20 rows</span>
                </div>
                {result && (
                  <div className="table-tabs">
                    {["masked", "original"].map((v) => (
                      <button
                        key={v}
                        aria-pressed={view === v}
                        onClick={() => setView(v)}
                      >
                        {v === "masked" ? "Masked result" : "Original data"}
                      </button>
                    ))}
                  </div>
                )}
                <div
                  className="table-wrap uploaded-table"
                  role="region"
                  tabIndex={0}
                  aria-label="Uploaded spreadsheet preview"
                >
                  <table>
                    <thead>
                      <tr>
                        {data.headers.map((h, i) => (
                          <th scope="col" key={i}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(result && view === "masked" ? result : data.rows)
                        .slice(0, 20)
                        .map((row, i) => (
                          <tr key={i}>
                            {row.map((cell, j) => (
                              <td
                                key={j}
                                className={
                                  rules[j] && rules[j] !== "keep"
                                    ? "selected-cell"
                                    : ""
                                }
                              >
                                {cell === "" ? (
                                  <span className="blank-cell">Empty</span>
                                ) : (
                                  cell
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {report && <ProtectionReport report={report} />}
                <div className="lesson">
                  <ShieldCheck size={22} aria-hidden="true" />
                  <div>
                    <h3>Review what remains.</h3>
                    <p>
                      Pattern detection can miss sensitive fields. Unchanged
                      columns and combinations of details may still identify
                      someone. Download contains the selected worksheet only, as
                      values in CSV format.
                    </p>
                  </div>
                </div>
              </div>
              <aside className="inspector">
                <span className="kicker">COLUMN RULES</span>
                <h2>Keep only what’s needed.</h2>
                <p>
                  Every column starts unchanged. Choose a rule for each field
                  you want to mask.
                </p>
                <button className="secondary" aria-expanded={showSuggestions} onClick={() => setShowSuggestions(value => !value)}>
                  {showSuggestions ? 'Close suggestions' : 'Suggest sensitive fields'}
                </button>
                {showSuggestions && <SensitiveSuggestions detections={detections} rules={rules} onApply={applySuggestions} />}
                {appliedMessage && <p role="status" className="micro">{appliedMessage}</p>}
                <label className="ack"><input type="checkbox" checked={onlySensitive} onChange={e => setOnlySensitive(e.target.checked)} />Show likely sensitive columns only ({detections.length})</label>
                <div className="upload-rules">
                  {data.headers.map((h, i) => (!onlySensitive || detections.some(d => d.column === i)) && (
                    <label key={i}>
                      <span>{h}</span>
                      <select
                        aria-label={h}
                        aria-describedby={`mask-help-${i}`}
                        value={rules[i] || "keep"}
                        onChange={(e) => {
                          setRules((r) => ({ ...r, [i]: e.target.value }));
                          resetReview();
                        }}
                      >
                        {MASK_RULES.map((rule) => (
                          <option key={rule.value} value={rule.value}>{rule.label}</option>
                        ))}
                      </select>
                      <small id={`mask-help-${i}`}>
                        {MASK_RULES.find((rule) => rule.value === (rules[i] || "keep")).help}
                      </small>
                    </label>
                  ))}
                </div>
                <p className="small">
                  Row IDs use column headings and identify rows, not people. Partial
                  hiding keeps some original details visible. Blanks stay blank;
                  phone numbers with 4 digits or fewer are fully hidden.
                </p>
                <button className="primary" onClick={review}>
                  Review file <ArrowRight size={17} aria-hidden="true" />
                </button>
                {result && (
                  <>
                    <label className="ack">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                      />
                      <span>
                        I reviewed the result and the details that remain.
                      </span>
                    </label>
                    <button
                      className="primary"
                      disabled={!ack}
                      onClick={download}
                    >
                      <Download size={17} aria-hidden="true" />
                      Download masked CSV
                    </button>
                    <p className="micro">
                      Spreadsheet formula-like text is escaped in the export.
                      Formatting and other worksheets are not included.
                    </p>
                    {done && (
                      <p role="status" className="micro">
                        Masked CSV downloaded.
                      </p>
                    )}
                  </>
                )}
              </aside>
            </section>
          )}
        </>
      )}
      <p className="files-footnote">
        Files and choices stay in memory while you use the dock. Clear the file
        or close/reload this page to remove them. Downloads remain on your
        device.
      </p>
    </section>
  );
}
