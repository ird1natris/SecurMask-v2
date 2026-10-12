import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Upload,
  ArrowRight,
  ArrowUpRight,
  FileSpreadsheet,
  KeyRound,
  Check,
  X,
  Download,
  Columns3,
  FolderOpen,
} from "lucide-react";
import Workspace from "../components/Workspace";
import DataPreview from "../components/DataPreview";
import { useTask } from "../utils/taskContext";
import { request, parse, validUpload, exportMasked } from "../utils/workbench";
export default function Home() {
  const { task, setTask } = useTask();
  const [recent, setRecent] = useState([]);
  const [libraryError, setLibraryError] = useState(false);
  useEffect(() => {
    request("/files")
      .then(({ files }) => setRecent(files.slice(0, 3)))
      .catch(() => setLibraryError(true));
  }, [task?.id, task?.masked]);
  const input = useRef(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState("masked");
  const [exported, setExported] = useState(false);
  const stage = !task ? 0 : !task.id ? 1 : !task.masked ? 2 : 3;
  async function choose(file) {
    if (!file || busy) return;
    setError("");
    const invalid = validUpload(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy("Reading your columns…");
    try {
      const data = new FormData();
      data.append("file", file);
      const { columns } = await request("/detect_columns", data);
      if (!columns?.length) throw new Error("No columns found in this file.");
      setTask({ file, name: file.name, columns, selected: [] });
      setKey("");
      setSaved(false);
      setExported(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function protect(e) {
    e.preventDefault();
    setError("");
    setBusy(task.id ? "Opening your original…" : "Protecting your original…");
    try {
      let id = task.id;
      if (!id) {
        const form = new FormData();
        form.append("file", task.file);
        form.append("key", key);
        const result = await request("/upload", form);
        id = result.fileId;
        setTask((prev) => ({ ...prev, id, needsPreview: true }));
      }
      const { content } = await request("/file", {
        fileId: id,
        decryptionKey: key,
      });
      const rows = parse(content);
      setTask((prev) => ({
        ...prev,
        id,
        rows,
        columns: Object.keys(rows[0] || {}).length
          ? Object.keys(rows[0])
          : prev.columns,
        needsPreview: false,
      }));
      setKey("");
      setSaved(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function mask(e) {
    e.preventDefault();
    setError("");
    setBusy("Masking selected columns…");
    try {
      const { content } = await request("/mask", {
        fileId: task.id,
        key,
        columnsToMask: task.selected,
      });
      setTask((prev) => ({ ...prev, masked: content }));
      setKey("");
      setView("masked");
      setExported(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function exportFile() {
    setBusy("Preparing your download…");
    setError("");
    try {
      await exportMasked(task.id, task.masked);
      setExported(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  function reset() {
    if (
      !window.confirm(
        "Close this task? Uploaded files remain in Files. Unsaved selections will be discarded.",
      )
    )
      return;
    setTask(null);
    setKey("");
    setError("");
    setSaved(false);
    setExported(false);
  }
  const activeStage = task?.needsPreview ? 1 : stage;
  return (
    <Workspace title="Workspace">
      <div className="page-heading workspace-title">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1>Data masking</h1>
          <p>
            Remove sensitive details from a spreadsheet before you share it.
          </p>
        </div>
        <Link className="text-link" to="/folder">
          Open file library <ArrowUpRight size={15} />
        </Link>
      </div>
      {task && (
        <div className="stepper" aria-label="Masking progress">
          {[
            "Choose a file",
            "Protect original",
            "Select columns",
            "Review & export",
          ].map((label, i) => (
            <div
              key={label}
              className={
                activeStage === i
                  ? "current"
                  : activeStage > i
                    ? "complete"
                    : ""
              }
            >
              <span>
                {activeStage > i ? (
                  <Check size={13} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              {label}
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {busy && (
        <p className="info-strip" role="status">
          <span className="loading-spinner" />
          {busy}
        </p>
      )}
      {!task ? (
        <>
          <div className="import-workspace">
            <section
              className={`import-surface ${drag ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                if (e.dataTransfer.files.length > 1) {
                  setError("Choose one file at a time.");
                  return;
                }
                choose(e.dataTransfer.files[0]);
              }}
            >
              <header className="surface-toolbar">
                <span>
                  <span className="tab-marker" />
                  New file
                </span>
                <span className="toolbar-meta">CSV / XLSX</span>
              </header>
              <div className="import-target">
                <div className="import-symbol" aria-hidden="true">
                  <Upload size={27} strokeWidth={1.4} />
                </div>
                <h2>Drop a spreadsheet here</h2>
                <p>or select one from your device</p>
                <input
                  ref={input}
                  type="file"
                  accept=".csv,.xlsx"
                  className="sr-only"
                  aria-label="Choose spreadsheet"
                  onChange={(e) => {
                    choose(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  className="button"
                  disabled={!!busy}
                  onClick={() => input.current.click()}
                >
                  Choose a file <ArrowRight size={16} />
                </button>
                <span className="import-limit">Up to 5 MiB per file</span>
              </div>
              <div className="surface-status">
                <span className="status-light" />
                No file selected<span>Files are processed on the server</span>
              </div>
            </section>
            <aside className="import-inspector">
              <h2>Before you start</h2>
              <dl>
                <div>
                  <dt>File format</dt>
                  <dd>CSV or Excel (.xlsx)</dd>
                </div>
                <div>
                  <dt>Upload limit</dt>
                  <dd>5 MiB · 5 files per day</dd>
                </div>
                <div>
                  <dt>Export format</dt>
                  <dd>Signed CSV</dd>
                </div>
              </dl>
              <div className="inspector-note">
                <KeyRound size={18} />
                <h3>Keep your file key</h3>
                <p>
                  You’ll create a key for your original file. Save it somewhere
                  safe; it can’t be reset.
                </p>
              </div>
              <Link to="/about-us" className="text-link">
                How masking works <ArrowUpRight size={14} />
              </Link>
            </aside>
          </div>
          <section className="recent-section">
            <div className="section-heading">
              <h2>
                Recent files <span>{recent.length}</span>
              </h2>
              <Link to="/folder">
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="recent-table">
              <div className="recent-columns">
                <span>NAME</span>
                <span>STATUS</span>
                <span>UPLOADED</span>
              </div>
              {recent.length ? (
                recent.map((file) => (
                  <Link to="/folder" className="recent-data-row" key={file.id}>
                    <span>
                      <FileSpreadsheet size={18} />
                      {file.name || "Untitled file"}
                    </span>
                    <span className="status">
                      {file.status === "mask" ? "Masked" : "Ready to mask"}
                    </span>
                    <span>
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </Link>
                ))
              ) : (
                <div className="recent-empty">
                  <FolderOpen size={22} strokeWidth={1.3} />
                  <div>
                    <h3>
                      {libraryError
                        ? "File library unavailable"
                        : "No files yet"}
                    </h3>
                    <p>
                      {libraryError
                        ? "Open the library to retry."
                        : "Your uploaded files will appear here."}
                    </p>
                  </div>
                  <Link to="/folder" aria-label="Open file library">
                    <ArrowUpRight size={18} />
                  </Link>
                </div>
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="panel task-panel">
          <div className="section-heading">
            <div className="file-title">
              <FileSpreadsheet size={25} />
              <div>
                <h2>{task.name}</h2>
                <p>
                  {task.columns.length} columns{" "}
                  {task.rows
                    ? ` · ${task.rows.length.toLocaleString()} rows`
                    : ""}
                </p>
              </div>
            </div>
            <button
              className="icon-button"
              disabled={!!busy}
              onClick={reset}
              aria-label="Close current task"
            >
              <X size={20} />
            </button>
          </div>
          {activeStage === 1 ? (
            <form className="key-form form-stack" onSubmit={protect}>
              <span className="subtle-icon">
                <KeyRound size={25} />
              </span>
              <h2>
                {task.id ? "Open your original" : "Set an encryption key"}
              </h2>
              <p className="muted">
                {task.id
                  ? "Enter the file key you used for this upload."
                  : "Create a file key to encrypt your original. Keep it somewhere safe — your email code cannot replace it."}
              </p>
              <div className="column-chips">
                {task.columns.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </div>
              <label>
                File encryption key
                <input
                  type="password"
                  autoComplete="off"
                  value={key}
                  minLength={8}
                  required
                  onChange={(e) => setKey(e.target.value)}
                />
                <small>
                  At least 8 characters. This key is never saved in your
                  browser.
                </small>
              </label>
              {!task.id && (
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={saved}
                    onChange={(e) => setSaved(e.target.checked)}
                    required
                  />
                  I have saved my key somewhere safe.
                </label>
              )}
              <button
                className="button"
                disabled={!!busy || (!task.id && !saved)}
              >
                Continue to columns <ArrowRight size={17} />
              </button>
            </form>
          ) : activeStage === 2 ? (
            <>
              <div className="editor-layout">
                <div className="column-selector">
                  <p className="eyebrow">CHOOSE WHAT TO MASK</p>
                  <h2>Select columns</h2>
                  <p className="muted">
                    Selected columns use the existing automatic masking rules.
                    Unselected columns stay unchanged.
                  </p>
                  <button
                    className="text-link"
                    disabled={!!busy}
                    onClick={() =>
                      setTask({
                        ...task,
                        selected:
                          task.selected.length === task.columns.length
                            ? []
                            : task.columns,
                      })
                    }
                  >
                    {task.selected.length === task.columns.length
                      ? "Clear selection"
                      : "Select all columns"}
                  </button>
                  <div className="column-list">
                    {task.columns.map((c) => (
                      <label
                        key={c}
                        className={
                          task.selected.includes(c)
                            ? "column-option chosen"
                            : "column-option"
                        }
                      >
                        <input
                          type="checkbox"
                          disabled={!!busy}
                          checked={task.selected.includes(c)}
                          onChange={(e) =>
                            setTask({
                              ...task,
                              selected: e.target.checked
                                ? [...task.selected, c]
                                : task.selected.filter((x) => x !== c),
                            })
                          }
                        />
                        <span>{c}</span>
                        <small>
                          {task.selected.includes(c) ? "Mask" : "Keep"}
                        </small>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="preview-area">
                  <div className="section-heading">
                    <h3>Original preview</h3>
                    <span className="sample-tag">FIRST 8 ROWS</span>
                  </div>
                  <DataPreview
                    rows={task.rows || []}
                    selected={task.selected}
                  />
                  <p className="preview-caption">
                    Highlighted columns will be masked. Rules may retain partial
                    values; review the result.
                  </p>
                </div>
              </div>
              <form className="task-actions" onSubmit={mask}>
                <span>
                  <Columns3 size={17} />
                  {task.selected.length} of {task.columns.length} columns
                  selected
                </span>
                <label className="inline-key">
                  File key
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Re-enter your key"
                    minLength={8}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    required
                  />
                </label>
                <button
                  className="button"
                  disabled={!!busy || !task.selected.length}
                >
                  Mask selected columns <ArrowRight size={17} />
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="review-heading">
                <div>
                  <span className="status masked">
                    <Check size={13} /> Masking complete
                  </span>
                  <h2>Review masked data</h2>
                  <p className="muted">
                    Inspect the values before sharing. Masking can retain
                    partial information.
                  </p>
                </div>
                <div className="segmented">
                  <button
                    aria-pressed={view === "original"}
                    onClick={() => setView("original")}
                  >
                    Original
                  </button>
                  <button
                    aria-pressed={view === "masked"}
                    onClick={() => setView("masked")}
                  >
                    Masked
                  </button>
                </div>
              </div>
              <DataPreview
                rows={view === "masked" ? parse(task.masked) : task.rows || []}
                selected={task.selected}
              />
              <p className="preview-caption">
                Showing the first 8 rows. The download contains the full
                dataset.
              </p>
              <div className="task-actions">
                <p>Keep the signed filename and your file key for recovery.</p>
                <button
                  className="button secondary"
                  disabled={!!busy}
                  onClick={() => {
                    setTask({ ...task, masked: null });
                    setExported(false);
                  }}
                >
                  Adjust columns
                </button>
                <button
                  className="button"
                  disabled={!!busy}
                  onClick={exportFile}
                >
                  <Download size={17} />
                  Download masked CSV
                </button>
              </div>
              {exported && (
                <p className="info-strip" role="status">
                  Download started. Your masked file is also available in Files.
                </p>
              )}
            </>
          )}
        </section>
      )}
    </Workspace>
  );
}
