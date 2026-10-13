import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  SlidersHorizontal,
  BookOpen,
  Download,
  MonitorSmartphone,
  RotateCcw,
  ShieldCheck,
  Table2,
  WifiOff,
  X,
  Info,
  Files as FilesIcon,
} from "lucide-react";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import { fields, records, maskRecords, toCsv } from "./data";
import "./style.css";
import Files from "./Files";
const sections = ["practice", "files", "guide", "install"];
function currentPage() {
  return sections.includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "practice";
}
function Icon({ as: Component, ...props }) {
  return (
    <Component size={19} strokeWidth={1.6} aria-hidden="true" {...props} />
  );
}
function App() {
  const [page, setPage] = useState(currentPage),
    [step, setStep] = useState(0),
    [selected, setSelected] = useState(["name", "phone"]),
    [view, setView] = useState("masked"),
    [ack, setAck] = useState(false),
    [downloaded, setDownloaded] = useState(false),
    [install, setInstall] = useState(null),
    [installed, setInstalled] = useState(
      matchMedia("(display-mode: standalone)").matches,
    ),
    [online, setOnline] = useState(navigator.onLine),
    [notice, setNotice] = useState("");
  const heading = useRef(null),
    first = useRef(true);
  const {
    offlineReady: [ready],
    needRefresh: [update],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const hash = () => setPage(currentPage());
    const prompt = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    const done = () => {
      setInstalled(true);
      setInstall(null);
    };
    const network = () => setOnline(navigator.onLine);
    window.addEventListener("hashchange", hash);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      window.removeEventListener("hashchange", hash);
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, []);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page, step]);
  const masked = maskRecords(selected),
    remaining = fields.filter((f) => !selected.includes(f.key));
  function toggle(key) {
    setSelected((s) =>
      s.includes(key) ? s.filter((k) => k !== key) : [...s, key],
    );
    setAck(false);
    setDownloaded(false);
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([toCsv(masked)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "securmask-fictional-practice.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
  }
  function reset() {
    setStep(0);
    setSelected(["name", "phone"]);
    setAck(false);
    setDownloaded(false);
    setView("masked");
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a href="#practice" className="brand" aria-label="SecurMask practice">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          SecurMask<span className="edition">WORKSHOP</span>
        </a>
        <div className="header-right">
          <span className="local">
            <i />
            {online ? "On your device" : "Offline mode"}
          </span>
          <a className="quiet-link" href="#guide">
            A little guidance <Icon as={ArrowUpRight} />
          </a>
        </div>
      </header>
      <main id="main">
        <div className="eyebrow">
          <span>THE PRIVACY PRACTICE</span>
          <span>LEARN BY DOING / 01</span>
        </div>
        <Files active={page === "files"} />
        {page === "files" ? null : page === "practice" ? (
          <>
            <div className="intro">
              <div>
                <h1 ref={heading} tabIndex={-1}>
                  {step === 0 ? (
                    <>
                      A little less data.
                      <br />
                      <span>A little more care.</span>
                    </>
                  ) : step === 1 ? (
                    <>
                      Choose what
                      <br />
                      <span>stays private.</span>
                    </>
                  ) : (
                    <>
                      Take a closer look.
                      <br />
                      <span>Then decide.</span>
                    </>
                  )}
                </h1>
                <p>
                  {step === 0
                    ? "A short exercise in sharing thoughtfully. Explore a fictional dataset, mask personal details, and see what still needs your attention."
                    : step === 1
                      ? "Every column tells a story. Choose which details to change, and leave only what the task actually needs."
                      : "Masking changes the details. Your judgement still matters. Review the result before taking a copy."}
                </p>
              </div>
              <div className="chapter">
                <span>0{step + 1}</span>
                <p>
                  {
                    ["Meet the data", "Make your choices", "Review the result"][
                      step
                    ]
                  }
                  <br />
                  <small>ABOUT 5 MINUTES · SELF-PACED</small>
                </p>
              </div>
            </div>
            <a className="upload-shortcut" href="#files">
              Have a spreadsheet? Open your own file <Icon as={ArrowUpRight} />
            </a>
            <ol className="steps" aria-label="Exercise progress">
              {["Explore", "Mask", "Review"].map((name, i) => (
                <li key={name} aria-current={step === i ? "step" : undefined}>
                  <span>
                    {step > i ? (
                      <Icon as={Check} size={15} />
                    ) : (
                      String(i + 1).padStart(2, "0")
                    )}
                  </span>
                  {name}
                </li>
              ))}
            </ol>
            <section className="workbench">
              <div className="sheet">
                <div className="sheet-header">
                  <div className="file-title">
                    <Icon as={Table2} />
                    <div>
                      <h2>Community clinic</h2>
                      <span>Fictional practice dataset</span>
                    </div>
                  </div>
                  <span className="pill">6 records</span>
                </div>
                {step === 2 && (
                  <div className="table-tabs" aria-label="Dataset view">
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
                  className="table-wrap"
                  tabIndex={0}
                  role="region"
                  aria-label="Fictional dataset, scroll horizontally to view all columns"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col" className="row-num">
                          #
                        </th>
                        {fields.map((f) => (
                          <th scope="col" key={f.key}>
                            {f.label}
                            {step > 0 && selected.includes(f.key) && (
                              <span className="column-status">
                                {step === 2 && view === "masked"
                                  ? "CHANGED"
                                  : "SELECTED"}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(step === 2 && view === "masked" ? masked : records).map(
                        (row, i) => (
                          <tr key={i}>
                            <td className="row-num">0{i + 1}</td>
                            {fields.map((f) => (
                              <td
                                key={f.key}
                                className={
                                  step > 0 && selected.includes(f.key)
                                    ? "selected-cell"
                                    : ""
                                }
                              >
                                {row[f.key]}
                              </td>
                            ))}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="sheet-foot">
                  <span>
                    <Icon as={ShieldCheck} size={16} /> Fictional people. No
                    patient records.
                  </span>
                  <span>CSV / SAMPLE 01</span>
                </div>
                <div className="lesson">
                  <span className="lesson-number">
                    {step === 2 ? "↳" : "?"}
                  </span>
                  <div>
                    <h3>
                      {step === 0
                        ? "What could identify someone here?"
                        : step === 1
                          ? "Names are only part of the picture."
                          : "Would you share this as it is?"}
                    </h3>
                    <p>
                      {step === 0
                        ? "A name is an obvious clue. Age, location and a clinical note can also reveal a person when combined."
                        : step === 1
                          ? "Tap a field on the right to apply its rule. On a phone, your field controls are just below this table."
                          : "An age band, location or unusual condition can still be revealing. A changed dataset is not automatically anonymous or appropriate to share."}
                    </p>
                  </div>
                </div>
              </div>
              <aside className="inspector">
                {step === 0 ? (
                  <>
                    <span className="kicker">YOUR FIRST EXERCISE</span>
                    <h2>
                      Before you
                      <br />
                      press send.
                    </h2>
                    <p>
                      Imagine preparing this spreadsheet for a teaching
                      discussion. What information does your audience really
                      need?
                    </p>
                    <div className="exercise-facts">
                      <div>
                        <span>Dataset</span>
                        <strong>6 fictional people</strong>
                      </div>
                      <div>
                        <span>Task</span>
                        <strong>Review & mask</strong>
                      </div>
                      <div>
                        <span>Uploads</span>
                        <strong>None needed</strong>
                      </div>
                    </div>
                    <button className="primary" onClick={() => setStep(1)}>
                      Start the exercise <Icon as={ArrowRight} />
                    </button>
                    <p className="micro">
                      No account. No upload. Just practice.
                    </p>
                  </>
                ) : step === 1 ? (
                  <>
                    <div className="inspector-heading">
                      <span className="kicker">FIELD CONTROLS</span>
                      <span>{selected.length} / 5</span>
                    </div>
                    <h2>Less, but enough.</h2>
                    <p className="small">
                      Select a field to apply its masking rule.
                    </p>
                    <div className="field-list">
                      {fields.map((f) => (
                        <label
                          className={`field ${selected.includes(f.key) ? "checked" : ""}`}
                          key={f.key}
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(f.key)}
                            onChange={() => toggle(f.key)}
                          />
                          <span>
                            <strong>{f.label}</strong>
                            <small>{f.kind}</small>
                            <span className="rule">
                              {selected.includes(f.key)
                                ? f.rule
                                : "Keep original value"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    <button
                      className="primary"
                      onClick={() => {
                        setView("masked");
                        setStep(2);
                      }}
                    >
                      Review{" "}
                      {selected.length === 0 ? "unchanged data" : "changes"}{" "}
                      <Icon as={ArrowRight} />
                    </button>
                    <button className="text-button" onClick={() => setStep(0)}>
                      <Icon as={ArrowLeft} size={16} /> Back to explore
                    </button>
                  </>
                ) : (
                  <>
                    <span className="kicker">THE HUMAN CHECK</span>
                    <h2>
                      {selected.length} of 5 fields
                      <br />
                      changed.
                    </h2>
                    <p className="small">
                      {remaining.length
                        ? `Still unchanged: ${remaining.map((f) => f.label.toLowerCase()).join(", ")}.`
                        : "All fields changed. Combinations and context may still reveal information."}
                    </p>
                    <div className="review-note">
                      <Icon as={Info} />
                      <p>
                        This is a masking exercise, not a guarantee of
                        anonymity. Real data needs permission and a review of
                        what remains.
                      </p>
                    </div>
                    <label className="ack">
                      <input
                        type="checkbox"
                        checked={ack}
                        onChange={(e) => setAck(e.target.checked)}
                      />
                      <span>
                        I reviewed the remaining details. This download contains
                        fictional practice data.
                      </span>
                    </label>
                    <button
                      className="primary"
                      disabled={!ack}
                      onClick={download}
                    >
                      <Icon as={downloaded ? CheckCheck : Download} />
                      {downloaded ? "Download again" : "Download practice CSV"}
                    </button>
                    {downloaded && (
                      <p role="status" className="micro">
                        Your fictional CSV is ready. Discuss what you would
                        change next.
                      </p>
                    )}
                    <button className="text-button" onClick={() => setStep(1)}>
                      <Icon as={ArrowLeft} size={16} /> Edit masking choices
                    </button>
                    <button className="text-button" onClick={reset}>
                      <Icon as={RotateCcw} size={16} /> Start again
                    </button>
                  </>
                )}
              </aside>
            </section>
            <div className="bottom-note">
              <span>Small decisions. Better data habits.</span>
              <span>Everything in this exercise stays in your browser.</span>
            </div>
          </>
        ) : page === "guide" ? (
          <>
            <div className="intro">
              <div>
                <h1 ref={heading} tabIndex={-1}>
                  Share with
                  <br />
                  <span>intention.</span>
                </h1>
                <p>
                  Three questions to take with you, long after this exercise.
                </p>
              </div>
              <Icon as={BookOpen} size={60} />
            </div>
            <div className="guide-list">
              {[
                [
                  "01",
                  "Do they need this detail?",
                  "Begin with the purpose. Remove personal details that do not help the task, rather than sending the whole record.",
                ],
                [
                  "02",
                  "Could someone still be recognised?",
                  "Removing a name is a start. Consider combinations of age, location and unusual circumstances, including what the recipient already knows.",
                ],
                [
                  "03",
                  "Is this the right place to share?",
                  "Before using a messaging app or AI tool, check your organisation’s rules, the recipient and the permission to share. Masking does not replace those checks.",
                ],
              ].map(([n, title, body]) => (
                <article key={n}>
                  <span>{n}</span>
                  <div>
                    <h2>{title}</h2>
                    <p>{body}</p>
                  </div>
                  <Icon as={ArrowUpRight} />
                </article>
              ))}
            </div>
            <section className="guide-detail">
              <h2>What the practice rules do</h2>
              {fields.map((f) => (
                <div key={f.key}>
                  <strong>{f.label}</strong>
                  <span>
                    {f.rule}. {f.description}
                  </span>
                </div>
              ))}
              <p>
                This exercise replaces names, not clinical facts. Unselected
                fields remain exactly as they were. There is no recovery key in
                this demo.
              </p>
            </section>
            <a className="primary inline" href="#practice">
              Return to the exercise <Icon as={ArrowRight} />
            </a>
            <p className="credit">
              SecurMask began as a student project by Irdina Batrisyia. This
              workshop builds on that work.
            </p>
          </>
        ) : (
          <>
            <div className="intro">
              <div>
                <h1 ref={heading} tabIndex={-1}>
                  Keep it
                  <br />
                  <span>within reach.</span>
                </h1>
                <p>
                  Add SecurMask to your home screen or desktop for a focused,
                  app-like experience.
                </p>
              </div>
              <Icon as={MonitorSmartphone} size={60} />
            </div>
            <section className="install-layout">
              <div className="install-card">
                <span className="large-mark">
                  <Icon as={ShieldCheck} size={44} />
                </span>
                <h2>SecurMask Workshop</h2>
                <p>
                  {installed
                    ? "You’re using the installed app."
                    : ready
                      ? "Ready for offline practice on this device."
                      : "Open once online to prepare offline practice."}
                </p>
                {install && !installed ? (
                  <button
                    className="primary"
                    onClick={async () => {
                      try {
                        await install.prompt();
                        const result = await install.userChoice;
                        setNotice(
                          result.outcome === "accepted"
                            ? "Installation requested."
                            : "You can install later from your browser menu.",
                        );
                        setInstall(null);
                      } catch {
                        setNotice(
                          "Use your browser menu to install SecurMask.",
                        );
                      }
                    }}
                  >
                    Add to this device <Icon as={Download} />
                  </button>
                ) : (
                  <span className="pill">
                    {installed ? "Installed" : "Install from your browser menu"}
                  </span>
                )}
                <p className="micro">
                  Installation is optional. The exercise works in your browser.
                </p>
              </div>
              <div className="install-instructions">
                <h2>A place on your home screen.</h2>
                <h3>iPhone & iPad</h3>
                <p>Open in Safari, tap Share, then Add to Home Screen.</p>
                <h3>Android</h3>
                <p>
                  Open your browser menu and choose Install app or Add to Home
                  screen.
                </p>
                <h3>Desktop</h3>
                <p>
                  Use the install icon in Chrome or Edge. In Safari on Mac,
                  choose File → Add to Dock.
                </p>
                <hr />
                <p>
                  Your files and choices stay in memory and reset when you
                  reload. Only the app and its fictional sample are cached.
                </p>
                {update && (
                  <button
                    className="secondary"
                    onClick={() => {
                      if (
                        window.confirm(
                          "Update SecurMask? This will reset your current practice choices.",
                        )
                      )
                        updateServiceWorker(true);
                    }}
                  >
                    Update app & restart
                  </button>
                )}
              </div>
            </section>
          </>
        )}
      </main>
      <footer className="footer">
        <span>SECURMASK</span>
        <span>A practice space for thoughtful sharing.</span>
        <span>Processed on your device</span>
      </footer>
      <nav className="dock" aria-label="Main navigation">
        {[
          ["practice", SlidersHorizontal, "Practice"],
          ["files", FilesIcon, "Files"],
          ["guide", BookOpen, "Field guide"],
          ["install", MonitorSmartphone, "Get the app"],
        ].map(([id, icon, label]) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={page === id ? "page" : undefined}
          >
            <Icon as={icon} />
            <span>{label}</span>
          </a>
        ))}
      </nav>
      {(!online || notice) && (
        <div className="toast" role="status">
          {!online ? (
            <>
              <Icon as={WifiOff} /> Offline — practice still works
            </>
          ) : (
            notice
          )}
          {notice && (
            <button aria-label="Dismiss message" onClick={() => setNotice("")}>
              <Icon as={X} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
