import PropTypes from "prop-types";
import { createContext, useContext, useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
const PwaContext = createContext(null);
export function PwaProvider({ children }) {
  const [install, setInstall] = useState(null);
  const [installed, setInstalled] = useState(
    () =>
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true,
  );
  const {
    needRefresh: [needsUpdate],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const prompt = (e) => {
      e.preventDefault();
      setInstall(e);
    };
    const done = () => {
      setInstalled(true);
      setInstall(null);
    };
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", prompt);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  return (
    <PwaContext.Provider
      value={{ install, installed, needsUpdate, updateServiceWorker }}
    >
      {children}
    </PwaContext.Provider>
  );
}
export function InstallPanel() {
  const { install, installed, needsUpdate, updateServiceWorker } =
    useContext(PwaContext);
  const [message, setMessage] = useState("");
  async function run() {
    try {
      await install.prompt();
      const choice = await install.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Installation requested."
          : "You can install later from your browser menu.",
      );
    } catch {
      setMessage("Use your browser menu to install SecurMask.");
    }
  }
  return (
    <section className="install-panel">
      <h3>SecurMask, at home on your device.</h3>
      <p>
        {installed
          ? "You’re using the installed app."
          : "Add SecurMask to your Home Screen or Dock for a focused app experience."}
      </p>
      {!installed &&
        (install ? (
          <button className="button secondary" onClick={run}>
            Install SecurMask
          </button>
        ) : (
          <p>
            iPhone or iPad: Share → Add to Home Screen.
            <br />
            Mac Safari: File → Add to Dock.
            <br />
            Chrome or Edge: use the install option in the address bar or browser
            menu.
          </p>
        ))}
      <p>
        Sign-in, masking, and recovery need an internet connection. Your file
        library is linked to your account.
      </p>
      {message && <p role="status">{message}</p>}
      {needsUpdate && (
        <div className="info-strip">
          <span>
            A new version is ready. Finish your current task before updating.
          </span>
          <button
            className="text-link"
            onClick={() => {
              if (
                window.confirm(
                  "Reload to update? Unsaved work and recovered previews will be lost.",
                )
              )
                updateServiceWorker(true);
            }}
          >
            Update app
          </button>
        </div>
      )}
    </section>
  );
}

PwaProvider.propTypes = { children: PropTypes.node.isRequired };
