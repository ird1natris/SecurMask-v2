import { useLocation, Link } from "react-router-dom";
import { Download } from "lucide-react";
import Papa from "papaparse";
import Workspace from "../components/Workspace";
import DataPreview from "../components/DataPreview";
import { download } from "../utils/workbench";
export default function FileDisplay() {
  const rows = useLocation().state?.fileData || [];
  return (
    <Workspace title="Recovered file">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR ORIGINAL DATA</p>
          <h1>Recovered file</h1>
          <p>These values are unmasked. Take care when sharing.</p>
        </div>
        <button
          className="button"
          disabled={!rows.length}
          onClick={() => download(Papa.unparse(rows), "recovered-original.csv")}
        >
          <Download size={18} />
          Download CSV
        </button>
      </div>
      <section className="panel">
        {rows.length ? (
          <DataPreview rows={rows} />
        ) : (
          <div className="empty-state">
            <h2>No recovered file in this session.</h2>
            <Link to="/recover" className="button secondary">
              Recover a file
            </Link>
          </div>
        )}
      </section>
    </Workspace>
  );
}
