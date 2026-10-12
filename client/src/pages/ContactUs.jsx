import { apiUrl } from "../utils/api.js";
import { useState } from "react";
import { Link } from "react-router-dom";
import Workspace from "../components/Workspace";
const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [formStatus, setFormStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormStatus("");

    try {
      // Send form data to backend
      const response = await fetch(apiUrl("/send-feedback"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormStatus(
          "Thank you for your message! A confirmation email has been sent to your sign-in address.",
        );
        setFormData({ name: "", email: "", message: "" }); // Clear form after submission
      } else {
        setFormStatus("Failed to send your message. Please try again later.");
      }
    } catch (error) {
      console.error("Error submitting the form:", error);
      setFormStatus("An error occurred. Please try again later.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Workspace title="Help & feedback">
      <div className="page-heading">
        <div>
          <p className="eyebrow">WE’RE LISTENING</p>
          <h1>A little help goes a long way.</h1>
          <p>Have a question, an idea, or something that isn’t working?</p>
        </div>
      </div>
      <div className="bottom-grid">
        <section className="panel">
          <form className="form-stack" onSubmit={handleSubmit}>
            <h2>Send us a message</h2>
            {[["name", "Your name", "text"]].map(([name, label, type]) => (
              <label key={name} htmlFor={name}>
                {label}
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleInputChange}
                  required
                />
              </label>
            ))}
            <label htmlFor="message">
              How can we help?
              <textarea
                id="message"
                name="message"
                maxLength={2000}
                rows={6}
                value={formData.message}
                onChange={handleInputChange}
                required
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Sending…" : "Send message"}
            </button>
            {formStatus && (
              <p role="status" className="info-strip">
                {formStatus}
              </p>
            )}
          </form>
        </section>
        <aside className="key-note">
          <h2>Before you send</h2>
          <p>
            Please leave out file encryption keys and sensitive dataset
            contents. A description of what happened is a good place to start.
          </p>
          <h3>Looking for the basics?</h3>
          <p>Learn how uploads, masking, and file recovery fit together.</p>
          <Link className="text-link" to="/about-us">
            How SecurMask works →
          </Link>
        </aside>
      </div>
    </Workspace>
  );
};
export default ContactUs;
