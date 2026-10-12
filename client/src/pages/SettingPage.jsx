import PropTypes from "prop-types";
import { useState } from "react";
import { Save, ShieldCheck, UserRound } from "lucide-react";
import Workspace from "../components/Workspace";
import { InstallPanel } from "../components/Pwa";
import { clearCachedFiles } from "../utils/indexedDBUtils";
import { cacheKey } from "../utils/indexedDBUtils";
export default function Settings({ onLogout }) {
  const [tab, setTab] = useState("profile");
  const [info, setInfo] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem(cacheKey("userInfo"))) || {
          name: "",
          email: "",
          phone: "",
          job: "",
        }
      );
    } catch {
      return { name: "", email: "", phone: "", job: "" };
    }
  });
  const [photo, setPhoto] = useState(
    () => localStorage.getItem(cacheKey("profileImage")) || "",
  );
  const [status, setStatus] = useState("");
  const save = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem(cacheKey("userInfo"), JSON.stringify(info));
      setStatus("Profile saved in this browser.");
    } catch {
      setStatus("Unable to save. Your browser storage may be full.");
    }
  };
  const upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      setStatus("Choose an image smaller than 2 MiB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        localStorage.setItem(cacheKey("profileImage"), reader.result);
        setPhoto(reader.result);
        setStatus("Profile picture saved.");
      } catch {
        setStatus("Unable to save this image. Try a smaller file.");
      }
    };
    reader.readAsDataURL(file);
  };
  return (
    <Workspace title="Settings" onLogout={onLogout}>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE YOURSELF AT HOME</p>
          <h1>Settings</h1>
          <p>Manage your local profile and understand your account security.</p>
        </div>
      </div>
      <div className="settings-layout">
        <nav aria-label="Settings sections">
          {[
            ["profile", UserRound, "Profile"],
            ["security", ShieldCheck, "Security"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-link ${tab === id ? "selected" : ""}`}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <section className="panel">
          {tab === "profile" ? (
            <form className="form-stack" onSubmit={save}>
              <h2>Personal profile</h2>
              <p className="muted">
                These details stay in this browser and do not change your
                sign-in email.
              </p>
              <div className="profile-photo">
                {photo ? (
                  <img src={photo} alt="Your profile" />
                ) : (
                  <span className="account-avatar">
                    <UserRound size={28} />
                  </span>
                )}
                <label className="button secondary">
                  Change picture
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={upload}
                  />
                </label>
              </div>
              <div className="form-grid">
                {[
                  ["name", "Full name", "text"],
                  ["email", "Contact email", "email"],
                  ["phone", "Phone number", "tel"],
                  ["job", "Job title", "text"],
                ].map(([name, label, type]) => (
                  <label key={name}>
                    {label}
                    <input
                      type={type}
                      name={name}
                      value={info[name] || ""}
                      onChange={(e) => {
                        setInfo({ ...info, [name]: e.target.value });
                        setStatus("");
                      }}
                    />
                  </label>
                ))}
              </div>
              <button className="button" type="submit">
                <Save size={17} />
                Save changes
              </button>
            </form>
          ) : (
            <div className="prose">
              <ShieldCheck className="green" size={32} />
              <h2>Email sign-in</h2>
              <p>
                Sign in with a one-time code sent to your email. Codes expire
                after five minutes.
              </p>
              <h2>Your file encryption key</h2>
              <p>
                Your file key is separate from your sign-in code. Keep it
                somewhere safe: an email code cannot recover a lost key.
              </p>
            </div>
          )}
          <InstallPanel />
          <div className="profile-actions">
            <button
              className="button secondary"
              onClick={async () => {
                if (
                  !window.confirm(
                    "Clear legacy dataset caches in this browser? Your server files will remain.",
                  )
                )
                  return;
                try {
                  await clearCachedFiles();
                  setStatus("Local dataset caches cleared.");
                } catch {
                  setStatus("Unable to clear local caches. Please try again.");
                }
              }}
            >
              Clear local dataset cache
            </button>
            <button
              className="button secondary"
              onClick={async () => {
                try {
                  await onLogout();
                } catch {
                  setStatus(
                    "Unable to sign out. Check your connection and try again.",
                  );
                }
              }}
            >
              Sign out
            </button>
          </div>
          {status && (
            <p role="status" className="info-strip">
              {status}
            </p>
          )}
        </section>
      </div>
    </Workspace>
  );
}

Settings.propTypes = { onLogout: PropTypes.func.isRequired };
