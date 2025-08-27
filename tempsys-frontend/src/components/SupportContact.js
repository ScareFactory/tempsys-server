// src/components/SupportContact.js
import React, { useContext, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { FaPaperPlane, FaLifeRing } from "react-icons/fa";

export default function SupportContact() {
  const { token, companyId } = useContext(AuthContext);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("question"); // question | incident | billing | feature
  const [priority, setPriority] = useState("normal");   // low | normal | high | urgent
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [includeLogs, setIncludeLogs] = useState(true);

  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null); // {type: 'success'|'error'|'info', text}

  const reset = () => {
    setSubject("");
    setCategory("question");
    setPriority("normal");
    setMessage("");
    setContactEmail("");
    setIncludeLogs(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);

    const payload = {
      companyId,
      subject: subject.trim(),
      category,
      priority,
      message: message.trim(),
      contactEmail: contactEmail.trim() || undefined,
      includeLogs: !!includeLogs,
    };

    if (!payload.subject || !payload.message) {
      setMsg({ type: "error", text: "Bitte Betreff und Nachricht ausfüllen." });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/support/messages", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || `HTTP ${res.status}`);
      setMsg({ type: "success", text: "Nachricht erfolgreich an den Support gesendet." });
      reset();
    } catch (err) {
      console.error("Support senden fehlgeschlagen:", err);
      setMsg({ type: "error", text: "Senden fehlgeschlagen. Bitte später erneut versuchen." });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="sc-card">
      <style>{css()}</style>

      <h2 className="sc-h2">
        <FaLifeRing /> Support & Kontakt
      </h2>

      {msg && (
        <div className={`sc-banner sc-banner--${msg.type}`}>{msg.text}</div>
      )}

      <form onSubmit={submit} className="sc-form">
        <div className="sc-grid">
          <label className="sc-field">
            <span className="sc-label">Betreff *</span>
            <input
              className="sc-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Kurzer Titel deines Anliegens"
            />
          </label>

          <label className="sc-field">
            <span className="sc-label">Kategorie</span>
            <select
              className="sc-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="question">Frage</option>
              <option value="incident">Störung/Fehler</option>
              <option value="billing">Abrechnung</option>
              <option value="feature">Feature‑Wunsch</option>
            </select>
          </label>

          <label className="sc-field">
            <span className="sc-label">Priorität</span>
            <select
              className="sc-input"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="low">Niedrig</option>
              <option value="normal">Normal</option>
              <option value="high">Hoch</option>
              <option value="urgent">Dringend</option>
            </select>
          </label>

          <label className="sc-field">
            <span className="sc-label">Kontakt‑E‑Mail (optional)</span>
            <input
              className="sc-input"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="z. B. support@deinefirma.de"
            />
          </label>

          <label className="sc-field sc-col-span">
            <span className="sc-label">Nachricht *</span>
            <textarea
              className="sc-input"
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Beschreibe dein Anliegen möglichst genau …"
            />
          </label>

          <label className="sc-check">
            <input
              type="checkbox"
              checked={includeLogs}
              onChange={(e) => setIncludeLogs(e.target.checked)}
            />
            System‑Infos/Logs beifügen (hilft beim Debugging)
          </label>
        </div>

        <div className="sc-actions">
          <Button type="submit" disabled={sending}>
            <FaPaperPlane style={{ marginRight: 6 }} />
            {sending ? "Sende …" : "An Support senden"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function css() {
  const c = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    border: "#2a3040",
    surfaceA: "rgba(27,33,48,.75)",
    surfaceB: "rgba(16,20,28,.65)",
    focus: "#5ab0ff",
    success: "rgba(16,185,129,.9)",
    error: "rgba(239,68,68,.9)",
    info: "rgba(59,130,246,.9)",
  };
  return `
  .sc-card{ background:transparent; border:1px solid ${c.border}; border-radius:14px; padding:16px; color:${c.text}; }
  .sc-h2{ display:flex; gap:8px; align-items:center; margin:0 0 12px; font-size:1.2rem; }
  .sc-banner{ margin:0 0 12px; padding:10px 12px; border-radius:10px; color:#0b1220; font-weight:600; }
  .sc-banner--success{ background:${c.success}; }
  .sc-banner--error{ background:${c.error}; }
  .sc-banner--info{ background:${c.info}; }
  .sc-form{ }
  .sc-grid{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
  .sc-col-span{ grid-column: 1 / -1; }
  @media (max-width: 920px){ .sc-grid{ grid-template-columns: 1fr; } }
  .sc-field{ display:grid; gap:6px; }
  .sc-label{ color:${c.textDim}; font-weight:600; }
  .sc-input{
    width:100%; padding:10px 12px; border-radius:10px; color:${c.text};
    background: linear-gradient(180deg, ${c.surfaceA}, ${c.surfaceB});
    border:1px solid ${c.border};
  }
  .sc-input:focus{ outline:2px solid ${c.focus}; outline-offset:2px; }
  .sc-check{ display:flex; align-items:center; gap:10px; color:${c.textDim}; }
  .sc-actions{ display:flex; gap:10px; margin-top:12px; }
  `;
}
