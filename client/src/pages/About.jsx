import { Upload, ShieldCheck, Download, KeyRound } from "lucide-react";
import Workspace from "../components/Workspace";
export default function About() {
  return (
    <Workspace title="About SecurMask">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUILT FOR THOUGHTFUL SHARING</p>
          <h1>Useful data. Fewer personal details.</h1>
          <p>A simple privacy workbench for your CSV and Excel datasets.</p>
        </div>
      </div>
      <section className="panel prose">
        <h2>Privacy, one column at a time.</h2>
        <p>
          SecurMask helps you upload a spreadsheet, choose sensitive columns,
          and download a masked version. Recover the encrypted original later
          with your file key.
        </p>
        <div className="steps-grid">
          {[
            [
              Upload,
              "01",
              "Upload a dataset",
              "Choose a CSV or XLSX file up to 5 MiB and create your file key.",
            ],
            [
              ShieldCheck,
              "02",
              "Choose what to mask",
              "Open the file in My files and select rules for sensitive columns.",
            ],
            [
              Download,
              "03",
              "Review and download",
              "Inspect the output before you share it. Keep the signed download for recovery.",
            ],
          ].map(([Icon, n, title, text]) => (
            <div className="step" key={n}>
              <Icon />
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <h2>Know where your data lives</h2>
        <p>
          Files are processed on the server. Encrypted originals and masked
          outputs are stored there, and your file library is linked to your
          account. Dataset previews stay in memory during your session. Older
          versions may have left local caches; clear those in Settings. Masking
          may retain partial values, so always inspect the result before
          sharing.
        </p>
        <div className="info-strip">
          <KeyRound size={22} />
          <span>
            Your file key is not stored by the API. A sign-in code cannot
            recover a lost file key.
          </span>
        </div>
        <h2>Made with purpose</h2>
        <p>
          Originally developed by Irdina Batrisyia as a student project.
          SecurMask continues that work with improvements to maintenance,
          authentication, storage, and deployment.
        </p>
      </section>
    </Workspace>
  );
}
