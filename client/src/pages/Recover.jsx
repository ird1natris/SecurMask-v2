import { useState } from "react";
import { KeyRound, Upload, Download, ArrowRight } from "lucide-react";
import Workspace from "../components/Workspace";
import DataPreview from "../components/DataPreview";
import { request, parse, download } from "../utils/workbench";
export default function Recover() {
  const [file, setFile] = useState(null);
  const [key, setKey] = useState("");
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function recover(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    setResult("");
    try {
      if (!file || file.size > 5 * 1024 * 1024)
        throw new Error("Choose a signed CSV no larger than 5 MiB.");
      const match = file.name.match(/^masked-file-([a-f0-9-]+)\.csv$/i);
      if (!match)
        throw new Error(
          "Use the original masked-file filename from your SecurMask download.",
        );
      const parts = (await file.text()).split("\n\n--DIGITAL-SIGNATURE--\n");
      if (parts.length !== 2)
        throw new Error(
          "The digital signature is missing. Choose an unchanged SecurMask export.",
        );
      await request("/verify-signature", {
        fileId: match[1],
        fileContent: parts[0],
        signature: parts[1],
      });
      const { content } = await request("/file", {
        fileId: match[1],
        decryptionKey: key,
      });
      setResult(content);
      setKey("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Workspace title="Recover">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BACK TO THE ORIGINAL</p>
          <h1>
            The details, <span>when you need them.</span>
          </h1>
          <p>
            Recover your original dataset with its signed export and your file
            key.
          </p>
        </div>
      </div>
      <div className="recovery-layout">
        <section className="panel">
          <form onSubmit={recover} className="form-stack">
            <span className="subtle-icon">
              <KeyRound size={28} />
            </span>
            <h2>Unlock your original</h2>
            <p className="muted">
              Use your most recent signed SecurMask download, unchanged.
            </p>
            <label className="recovery-upload">
              <Upload size={25} />
              <span>{file ? file.name : "Choose a signed CSV"}</span>
              <small>masked-file-….csv · Maximum 5 MiB</small>
              <input
                type="file"
                accept=".csv"
                required
                aria-label="Signed CSV file"
                disabled={busy}
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setResult("");
                  setError("");
                }}
              />
            </label>
            <label>
              File encryption key
              <input
                type="password"
                autoComplete="off"
                minLength={8}
                required
                value={key}
                disabled={busy}
                onChange={(e) => setKey(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button className="button" disabled={busy || !file}>
              {busy ? "Verifying and recovering…" : "Recover original"}
              <ArrowRight size={17} />
            </button>
          </form>
        </section>
        <aside className="workflow-note">
          <p className="eyebrow">WORTH KEEPING IN MIND</p>
          <h2>
            Same data.
            <br />
            Your key.
          </h2>
          <p>
            Your file key is separate from the code you use to sign in. We can’t
            recover a lost key.
          </p>
          <p>
            The original must still be stored in your account. Deleted files
            cannot be recovered.
          </p>
          <p>
            Keep the signed file’s name and contents unchanged. A newer signed
            download replaces the previous signature.
          </p>
        </aside>
      </div>
      {result && (
        <section className="panel preview-panel">
          <div className="section-heading">
            <div>
              <h2>Your original is ready.</h2>
              <p className="muted">
                These values are unmasked. Take care when sharing.
              </p>
            </div>
            <button
              className="button"
              onClick={() => download(result, "recovered-original.csv")}
            >
              <Download size={17} />
              Download original
            </button>
          </div>
          <DataPreview rows={parse(result)} />
          <p className="preview-caption">
            First 8 rows · Download includes the full dataset.
          </p>
        </section>
      )}
    </Workspace>
  );
}
