// src/components/MyMessages.js

import React, { useState, useEffect, useContext, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Button from "./ui/Button";

function parsePayload(p) {
  if (!p) return {};
  if (typeof p === "string") {
    try { return JSON.parse(p); } catch { return {}; }
  }
  return p;
}

function variantForMessage(msg) {
  const payload = parsePayload(msg.payload);
  if (msg.type === "handoff_response") {
    if (payload.status === "accepted") return "success";
    if (payload.status === "declined") return "danger";
  }
  // optionale Erweiterung: vacation_response approved/declined
  if (msg.type === "vacation_response") {
    if (payload.status === "approved") return "success";
    if (payload.status === "declined") return "danger";
  }
  return "neutral";
}

function formatDateTime(dt) {
  try {
    return new Date(dt).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt;
  }
}

export default function MyMessages() {
  const { token } = useContext(AuthContext);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const t = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    panel: "rgba(16,20,28,.55)",
    panelSoft: "rgba(27,33,48,.55)",
    border: "rgba(255,255,255,.14)",
    borderSoft: "rgba(255,255,255,.10)",
    accent: "#e03131",
    success: "rgba(46,125,50,.35)",
    danger: "rgba(179,38,30,.35)",
    focus: "#5ab0ff",
  };

  // Übergabe-Anfragen (du bist Empfänger)
  const [requests, setRequests] = useState([]);
  // System-/Antwort-Nachrichten
  const [messages, setMessages] = useState([]);

  const [loadingReq, setLoadingReq] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState(true);
  const [errorReq, setErrorReq] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function loadRequests() {
    setLoadingReq(true);
    setErrorReq("");
    try {
      const r = await fetch("/api/schedule/swap-requests", { headers });
      if (!r.ok) throw new Error(`Swap-Requests HTTP ${r.status}`);
      const data = await r.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorReq(e.message || "Fehler beim Laden");
    } finally {
      setLoadingReq(false);
    }
  }

  async function loadMessages() {
    setLoadingMsg(true);
    setErrorMsg("");
    try {
      const r = await fetch("/api/messages", { headers });
      if (!r.ok) throw new Error(`Messages HTTP ${r.status}`);
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || "Fehler beim Laden");
    } finally {
      setLoadingMsg(false);
    }
  }

  useEffect(() => {
    loadRequests();
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function respond(id, accept) {
    try {
      const r = await fetch(`/api/schedule/swap-requests/${id}/${accept ? "accept" : "decline"}`, {
        method: "POST",
        headers,
      });
      if (!r.ok) {
        let msg = `HTTP ${r.status}`;
        try {
          const body = await r.json();
          if (body?.message) msg = body.message;
        } catch {}
        throw new Error(msg);
      }
      setRequests((rs) => rs.filter((rq) => rq.id !== id));
      setTimeout(loadMessages, 250);
    } catch (e) {
      console.error("Fehler beim Antworten auf Anfrage:", e);
      alert(`Antwort fehlgeschlagen: ${e.message}`);
    }
  }

  async function markRead(id) {
    try {
      const r = await fetch(`/api/messages/${id}/read`, { method: "POST", headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMessages((ms) => ms.filter((m) => m.id !== id));
    } catch (e) {
      console.error(e);
      alert("Konnte Nachricht nicht als gelesen markieren.");
    }
  }

  return (
    <div className="mm-shell">
      <style>{css(t)}</style>

      <div className="mm-head">
        <h3>Nachrichten</h3>
        <div className="mm-actions">
          <Button variant="secondary" onClick={() => { loadRequests(); loadMessages(); }}>
            Neu laden
          </Button>
        </div>
      </div>

      {/* Übergabe-Anfragen */}
      <section className="mm-section">
        <div className="mm-section-head">
          <h4>Offene Übergaben</h4>
        </div>

        {loadingReq ? (
          <div className="mm-card mm-center mm-dim">Lade Anfragen …</div>
        ) : errorReq ? (
          <div className="mm-card mm-error">{errorReq}</div>
        ) : requests.length === 0 ? (
          <div className="mm-card mm-center mm-dim">Keine offenen Übergaben.</div>
        ) : (
          <div className="mm-list">
            {requests.map((rq) => (
              <div key={rq.id} className="mm-item">
                <div className="mm-item-main">
                  <p className="mm-title">
                    <strong>{rq.requesterName}</strong> möchte seinen Dienst am{" "}
                    <strong>{new Date(rq.date).toLocaleDateString("de-DE")}</strong>{" "}
                    an dich übergeben.
                  </p>
                  <p className="mm-meta">Eingegangen: {formatDateTime(rq.createdAt)}</p>
                </div>
                <div className="mm-item-actions">
                  <Button onClick={() => respond(rq.id, true)}>Annehmen</Button>
                  <Button variant="danger" onClick={() => respond(rq.id, false)}>Ablehnen</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* System-/Antwort-Nachrichten */}
      <section className="mm-section">
        <div className="mm-section-head">
          <h4>Eingang</h4>
        </div>

        {loadingMsg ? (
          <div className="mm-card mm-center mm-dim">Lade Nachrichten …</div>
        ) : errorMsg ? (
          <div className="mm-card mm-error">{errorMsg}</div>
        ) : messages.length === 0 ? (
          <div className="mm-card mm-center mm-dim">Keine neuen Nachrichten.</div>
        ) : (
          <div className="mm-list">
            {messages.map((m) => {
              const v = variantForMessage(m);
              const payload = parsePayload(m.payload);
              const cls =
                "mm-item " +
                (v === "success" ? "mm-ok" : v === "danger" ? "mm-warn" : "mm-neutral");
              return (
                <div key={m.id} className={cls}>
                  <div className="mm-item-main">
                    <p className="mm-title">{m.title || "Nachricht"}</p>
                    {m.body && <p className="mm-body">{m.body}</p>}
                    <p className="mm-meta">
                      {formatDateTime(m.createdAt)}
                      {payload?.date ? ` • Betreff: ${new Date(payload.date).toLocaleDateString("de-DE")}` : ""}
                    </p>
                  </div>
                  <div className="mm-item-actions">
                    <Button variant="secondary" onClick={() => markRead(m.id)}>Gelesen</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Look + Glas) ---------------- */
function css(t) {
  return `
  .mm-shell{ color:${t.text}; }
  .mm-head{
    display:flex; align-items:center; justify-content:space-between;
    margin-bottom:16px;
  }
  .mm-head h3{ margin:0; font-size:1.1rem; color:${t.text}; }
  .mm-actions{ display:flex; gap:8px; }

  .mm-section{ margin-bottom:18px; }
  .mm-section-head{ margin:0 0 10px 2px; color:${t.textDim}; }

  .mm-card{
    border:1px solid ${t.border}; border-radius:14px; padding:18px;
    background:${t.panel};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: 0 10px 24px rgba(0,0,0,.28);
  }
  .mm-center{ text-align:center; }
  .mm-dim{ color:${t.textDim}; }
  .mm-error{ color:#ffd3d3; background:rgba(179,38,30,.18); border-color:${t.danger}; }

  .mm-list{ display:grid; gap:12px; }
  .mm-item{
    border:1px solid ${t.borderSoft}; border-radius:12px; padding:14px;
    background:${t.panelSoft};
    backdrop-filter: blur(8px) saturate(140%);
    -webkit-backdrop-filter: blur(8px) saturate(140%);
    box-shadow: 0 6px 14px rgba(0,0,0,.20);
    display:grid; grid-template-columns: 1fr auto; gap:12px; align-items:start;
  }
  .mm-item.mm-ok{
    background:
      linear-gradient(180deg, rgba(46,125,50,.2), rgba(46,125,50,.08)),
      ${t.panelSoft};
    border-color:${t.success};
  }
  .mm-item.mm-warn{
    background:
      linear-gradient(180deg, rgba(179,38,30,.22), rgba(179,38,30,.08)),
      ${t.panelSoft};
    border-color:${t.danger};
  }
  .mm-item.mm-neutral{
    /* default look already applied */
  }

  .mm-title{ margin:0 0 6px 0; }
  .mm-body{ margin:0 0 6px 0; white-space:pre-wrap; }
  .mm-meta{ margin:0; color:${t.textDim}; font-size:.9rem; }

  .mm-item-actions{ display:flex; gap:8px; align-items:center; }
  `;
}
