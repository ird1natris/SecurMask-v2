import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import axios from "axios";
import { apiUrl } from "../utils/api";
import {
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  KeyRound,
} from "lucide-react";
import { Brand } from "../components/Workspace";

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const send = async (resend = false) => {
    setBusy(true);
    setError("");
    try {
      const address = resend ? sentTo : email.trim().toLowerCase();
      await axios.post(
        apiUrl(resend ? "/resend-otp" : "/login"),
        { email: address },
        { withCredentials: true },
      );
      setSentTo(address);
      setOtp("");
      setCooldown(60);
    } catch (err) {
      setError(
        err.response?.data?.Error || "Unable to send a code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!sentTo) return send();
    setBusy(true);
    setError("");
    try {
      await axios.post(
        apiUrl("/verify-otp-login"),
        { email: sentTo, otp },
        { withCredentials: true },
      );
      await onLoginSuccess();
    } catch (err) {
      setError(
        err.response?.data?.Error || "Unable to sign in. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="auth-page">
      <div className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <span className="pill">A LITTLE MORE PRIVATE.</span>
          <h1>
            Share the data.
            <br />
            <span>
              Keep the details
              <br />
              to yourself.
            </span>
          </h1>
          <p>
            Your everyday workspace for masking sensitive information in
            spreadsheets.
          </p>
          <div className="auth-example">
            <div>
              <FileSpreadsheet size={20} /> customer-data.csv{" "}
              <span>EXAMPLE</span>
            </div>
            <dl>
              <dt>Email address</dt>
              <dd>j***@example.com</dd>
              <dt>Phone number</dt>
              <dd>••• ••• 4821</dd>
              <dt>Personal details</dt>
              <dd>
                <ShieldCheck size={15} /> Masked
              </dd>
            </dl>
          </div>
        </div>
        <p className="auth-credit">
          SecurMask · Thoughtful sharing starts here.
        </p>
      </div>
      <div className="auth-form-side">
        <div className="auth-top">
          <ShieldCheck size={17} /> Your privacy workspace
        </div>
        <form onSubmit={submit} className="auth-form form-stack">
          <span className="auth-icon">
            <KeyRound size={25} />
          </span>
          <p className="eyebrow">LET’S GET YOU STARTED</p>
          <h2>{sentTo ? "Check your inbox." : "Welcome to SecurMask."}</h2>
          <p className="muted">
            {sentTo
              ? "Enter the six-digit code sent to " +
                sentTo +
                ". It expires in five minutes."
              : "A little less friction. Sign in or create an account with your email — no password to remember."}
          </p>
          {sentTo ? (
            <label htmlFor="code">
              Sign-in code
              <input
                id="code"
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                required
                className="otp-input"
              />
            </label>
          ) : (
            <label htmlFor="email">
              Email address
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={255}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <button disabled={busy} className="button auth-submit">
            {busy
              ? "Please wait…"
              : sentTo
                ? "Verify and sign in"
                : "Continue with email"}
            <ArrowRight size={18} />
          </button>
          {sentTo && (
            <div className="auth-actions">
              <button
                type="button"
                disabled={busy || cooldown > 0}
                onClick={() => send(true)}
              >
                {cooldown ? "Resend in " + cooldown + "s" : "Resend code"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSentTo("");
                  setOtp("");
                  setError("");
                }}
              >
                Use another email
              </button>
            </div>
          )}
          <div className="auth-note">
            <ShieldCheck size={19} />
            <p>
              Your file encryption key is separate from your sign-in code. Keep
              it safe to recover your originals.
            </p>
          </div>
        </form>
        <p className="auth-footer">Good data. Less exposure.</p>
      </div>
    </section>
  );
}

Login.propTypes = { onLoginSuccess: PropTypes.func.isRequired };
