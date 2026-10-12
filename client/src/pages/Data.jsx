import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  FileSpreadsheet,
  ArrowUpRight,
  Trash2,
  Download,
  X,
  FolderOpen,
} from "lucide-react";
import Workspace from "../components/Workspace";
import DataPreview from "../components/DataPreview";
import { useTask } from "../utils/taskContext";
import { request, parse, exportMasked } from "../utils/workbench";
export default function Data() {
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("Loading your files…");
  const [preview, setPreview] = useState(null);
  const { task, setTask } = useTask();
  const navigate = useNavigate();
  const load = () => {
    setBusy("Loading your files…");
    setError("");
    request("/files")
      .then((data) => setFiles(data.files))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(""));
  };
  useEffect(load, []);
  async function open(file) {
    setError("");
    if (file.status !== "mask") {
      if (
        task &&
        !window.confirm(
          "Replace your current task? Unsaved selections will be lost.",
        )
      )
        return;
      setTask({ ...file, columns: [], selected: [], needsPreview: true });
      navigate("/homepage");
      return;
    }
    setBusy("Opening masked file…");
    try {
      const { content } = await request(
        "/masked-file?id=" + encodeURIComponent(file.id),
      );
      setPreview({ ...file, content });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function remove(file) {
    if (
      !window.confirm(
        `Delete “${file.name}” and its stored original? This cannot be undone.`,
      )
    )
      return;
    setBusy("Deleting file…");
    setError("");
    try {
      await request("/deleteFile", { id: file.id }, "DELETE");
      setFiles(files.filter((f) => f.id !== file.id));
      if (task?.id === file.id) setTask(null);
      if (preview?.id === file.id) setPreview(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  async function save() {
    setBusy("Preparing download…");
    setError("");
    try {
      await exportMasked(preview.id, preview.content);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  const shown = files.filter(
    (f) =>
      (f.name || "Untitled file")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" || f.status === filter),
  );
  return (
    <Workspace title="Files">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A PLACE FOR YOUR WORK</p>
          <h1>
            Your files, <span>in order.</span>
          </h1>
          <p>Pick up where you left off. Your library follows your account.</p>
        </div>
        <Link className="button" to="/homepage">
          <Plus size={17} />
          New task
        </Link>
      </div>
      {error && (
        <div className="form-error" role="alert">
          {error}{" "}
          <button className="text-link" onClick={load}>
            Try again
          </button>
        </div>
      )}
      {busy && (
        <p role="status" className="info-strip">
          {busy}
        </p>
      )}
      <section className="panel library">
        <div className="library-toolbar">
          <label className="search-field">
            <Search size={18} />
            <input
              aria-label="Search files"
              placeholder="Find a file…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter file status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All files</option>
            <option value="unmask">Ready to mask</option>
            <option value="mask">Masked</option>
          </select>
          <span className="muted">{shown.length} files</span>
        </div>
        {shown.length ? (
          <div className="file-table">
            <table>
              <thead>
                <tr>
                  <th>File name</th>
                  <th>Uploaded</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <button
                        className="file-name"
                        disabled={!!busy}
                        onClick={() => open(f)}
                      >
                        <FileSpreadsheet size={23} />
                        <span>
                          {f.name || "Untitled file"}
                          <small>
                            {f.name?.split(".").pop()?.toUpperCase() ||
                              "DATASET"}
                          </small>
                        </span>
                      </button>
                    </td>
                    <td>
                      {new Date(f.uploadedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <span
                        className={
                          "status " + (f.status === "mask" ? "masked" : "")
                        }
                      >
                        {f.status === "mask" ? "Masked" : "Ready to mask"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={"Open " + f.name}
                          onClick={() => open(f)}
                        >
                          <ArrowUpRight size={19} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={!!busy}
                          aria-label={"Delete " + f.name}
                          onClick={() => remove(f)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !busy && (
            <div className="empty-state">
              <FolderOpen size={35} strokeWidth={1.3} />
              <h2>
                {files.length
                  ? "No matching files."
                  : "A fresh start for your files."}
              </h2>
              <p>
                {files.length
                  ? "Try another name or filter."
                  : "Your uploaded spreadsheets will appear here."}
              </p>
              {!files.length && (
                <Link className="button secondary" to="/homepage">
                  Choose your first file <ArrowUpRight size={16} />
                </Link>
              )}
            </div>
          )
        )}
      </section>
      {preview && (
        <section className="panel preview-panel">
          <div className="section-heading">
            <h2>{preview.name}</h2>
            <div className="row-actions">
              <button className="button" disabled={!!busy} onClick={save}>
                <Download size={16} />
                Download CSV
              </button>
              <button
                className="icon-button"
                aria-label="Close preview"
                onClick={() => setPreview(null)}
              >
                <X size={19} />
              </button>
            </div>
          </div>
          <DataPreview rows={parse(preview.content)} />
          <p className="preview-caption">
            Masked preview · First 8 rows. Recover the original from the Recover
            tab with your signed export and file key.
          </p>
        </section>
      )}
      <p className="privacy-footnote">
        Encrypted originals and masked outputs are stored on the server.
        Deleting a file removes both.
      </p>
    </Workspace>
  );
}
