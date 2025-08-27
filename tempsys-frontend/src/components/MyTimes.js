// src/components/MyTimes.js

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import {
  FaClock,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaPencilAlt,
} from "react-icons/fa";

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}
function toMonthStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
function monthRangeFromStr(ym) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { from: isoDate(first), to: isoDate(last) };
}

export default function MyTimes() {
  const { token, userId } = useContext(AuthContext);
  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
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
    success: "#2e7d32",
    danger: "#b3261e",
    focus: "#5ab0ff",
  };

  // Monat steuern (nur ausgewählter Monat)
  const [month, setMonth] = useState(() => toMonthStr(new Date()));
  const [{ from, to }, setRange] = useState(() => monthRangeFromStr(toMonthStr(new Date())));

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // pending Korrekturen (als Set von YYYY-MM-DD)
  const [pendingDates, setPendingDates] = useState(() => new Set());

  // Zeitkorrektur-Modal
  const [isOpen, setOpen] = useState(false);
  const [selDate, setSelDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitState, setSubmitState] = useState("idle");
  const [submitMsg, setSubmitMsg] = useState("");

  const esRef = useRef(null);

  // Wenn Monat geändert → Range neu berechnen
  useEffect(() => {
    setRange(monthRangeFromStr(month));
  }, [month]);

  async function loadTimes() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/users/${userId}/times?${qs.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fehler beim Laden der Zeiten:", e);
    } finally {
      setLoading(false);
    }
  }

  async function loadPending() {
    try {
      const res = await fetch(`/api/time-corrections/mine?status=pending`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const set = new Set((Array.isArray(data) ? data : []).map((r) => String(r.date).slice(0, 10)));
      setPendingDates(set);
    } catch (e) {
      console.error("Fehler beim Laden der offenen Korrekturen:", e);
    }
  }

  // Laden bei user/range
  useEffect(() => {
    if (userId) {
      loadTimes();
      loadPending();
    }
  }, [userId, token, from, to]);

  // Live-Refresh via SSE
  useEffect(() => {
    if (!userId || !token) return;
    try {
      const url = `/api/users/${userId}/times/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data || "{}");
          if (data?.type === "times_update") {
            loadTimes();
            loadPending();
          }
        } catch {}
      };
      return () => {
        try {
          es.close();
        } catch {}
      };
    } catch (e) {
      console.error("SSE konnte nicht gestartet werden:", e);
    }
  }, [userId, token]);

  // Monatsnavigation
  const goPrevMonth = () => {
    const [y, m] = month.split("-").map(Number);
    setMonth(toMonthStr(new Date(y, m - 2, 1)));
  };
  const goNextMonth = () => {
    const [y, m] = month.split("-").map(Number);
    setMonth(toMonthStr(new Date(y, m, 1)));
  };

  const openCorrection = (datePrefill = "") => {
    setSelDate(datePrefill || `${month}-01`);
    setNewStart("");
    setNewEnd("");
    setReason("");
    setSubmitState("idle");
    setSubmitMsg("");
    setOpen(true);
  };

  const submitCorrection = async () => {
    if (!selDate || (!newStart && !newEnd)) {
      setSubmitState("error");
      setSubmitMsg("Bitte Datum und mindestens eine Zeit (Start oder Ende) ausfüllen.");
      return;
    }
    try {
      setSubmitState("sending");
      setSubmitMsg("Sende Antrag …");
      const body = { date: selDate, newStart: newStart || null, newEnd: newEnd || null, reason };
      const res = await fetch(`/api/time-corrections`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // direkt markieren
      setPendingDates((prev) => new Set(prev).add(selDate));

      setSubmitState("success");
      setSubmitMsg("Antrag gesendet. Nach Genehmigung erscheint die geänderte Zeit hier.");
      setTimeout(() => {
        setOpen(false);
      }, 1200);
    } catch (e) {
      console.error("Zeitkorrektur fehlgeschlagen:", e);
      setSubmitState("error");
      setSubmitMsg("Senden fehlgeschlagen. Bitte später erneut versuchen.");
    }
  };

  return (
    <div className="mt-shell">
      <style>{css(t)}</style>

      {/* Kopfzeile */}
      <div className="mt-head">
        <div className="mt-title">
          <FaClock />
          <span>Meine Zeiten</span>
        </div>

        <div className="mt-controls">
          <Button variant="secondary" onClick={goPrevMonth} title="Voriger Monat">
            <FaChevronLeft />
          </Button>

          <input
            className="mt-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />

          <Button variant="secondary" onClick={goNextMonth} title="Nächster Monat">
            <FaChevronRight />
          </Button>

          <Button onClick={() => { loadTimes(); loadPending(); }}>
            <FaSync style={{ marginRight: 6 }} />
            Aktualisieren
          </Button>
        </div>

        <div className="mt-actions">
          <Button onClick={() => openCorrection()}>Zeitkorrektur</Button>
        </div>
      </div>

      {/* Inhalt */}
{loading ? (
  <div className="mt-card mt-center">Lade …</div>
) : items.length === 0 ? (
  <div className="mt-card mt-center">
    Keine Zeiten im ausgewählten Monat gefunden.
    <div className="mt-dim" style={{ marginTop: 6 }}>
      Falls die Uhr ausfiel, kannst du oben rechts eine Zeitkorrektur beantragen.
    </div>
  </div>
) : (
  <div className="mt-list">
    {items.map((it) => {
      const day = String(it.date).slice(0, 10);
      const isPending = pendingDates.has(day);

      // kleine Helper fürs Format
      const mm = (n) => Math.max(0, Number(n || 0));
      const fmtMin = (m) => `${mm(m)} min`;

      const breakMin = (it.breakMinutes != null)
        ? mm(it.breakMinutes)
        // Fallback: wenn Backend nur workedMinutesRaw/Net mitgibt
        : Math.max(0, mm(it.workedMinutesRaw) - mm(it.workedMinutesNet));

      return (
        <div
          key={it.id}
          className={`mt-item ${isPending ? "pending" : ""}`}
          title={isPending ? "Für diesen Tag ist eine Zeitkorrektur beantragt." : undefined}
        >
          <div className="mt-rows">
            <div className="mt-row">
              <span className="mt-label">Datum</span>
              <strong>{new Date(it.date).toLocaleDateString("de-DE")}</strong>
            </div>

            <div className="mt-row">
              <span className="mt-label">Zeit</span>
              <strong>
                {it.start} – {it.end}
              </strong>
            </div>

            <div className="mt-row">
              <span className="mt-label">Pause</span>
              <span>{fmtMin(breakMin)}</span>
            </div>

            <div className="mt-row">
              <span className="mt-label">Quelle</span>
              <span>{it.source}</span>
            </div>

            {isPending && (
              <div className="mt-chip mt-chip--warn">Korrektur beantragt</div>
            )}
          </div>
        </div>
      );
    })}
  </div>
)}

      {/* Zeitkorrektur-Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        title={
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <FaClock />
            Zeitkorrektur beantragen
          </span>
        }
      >
        <div className="mt-modal">
          {/* Datum */}
          <div className="mt-field-3">
            <label>Datum</label>
            <div className="field-wrap">
              <FaCalendarAlt className="field-ico" />
              <input
                type="date"
                value={selDate}
                onChange={(e) => setSelDate(e.target.value)}
                className="input-ico"
              />
            </div>
          </div>

          {/* Neue Zeit */}
          <div className="mt-field-2x">
            <label>Neue Zeit</label>
            <div className="field-wrap">
              <FaClock className="field-ico" />
              <input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
                className="input-ico"
                placeholder="Start"
              />
            </div>
            <div className="field-wrap">
              <FaClock className="field-ico" />
              <input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="input-ico"
                placeholder="Ende"
              />
            </div>
          </div>

          {/* Begründung */}
          <div className="mt-field-3">
            <label>Begründung</label>
            <div className="field-wrap">
              <FaPencilAlt className="field-ico" />
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="textarea-ico"
                placeholder="Optional – kurz begründen (z. B. Uhr defekt, vergessen auszustempeln …)"
              />
            </div>
          </div>

          {submitState !== "idle" && (
            <div
              className={
                "mt-alert " +
                (submitState === "success"
                  ? "mt-alert--success"
                  : submitState === "error"
                  ? "mt-alert--error"
                  : "mt-alert--info")
              }
            >
              {submitMsg}
            </div>
          )}

          <div className="mt-actions-bar">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={submitState === "sending"}>
              Schließen
            </Button>
            <Button onClick={submitCorrection} disabled={submitState === "sending"}>
              {submitState === "sending" ? "Senden…" : "Senden"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Look + Glas) ---------------- */
function css(t) {
  return `
  .mt-shell{ color:${t.text}; }

  /* Kopf */
  .mt-head{
    display:grid; gap:12px; align-items:center; margin-bottom:14px;
    grid-template-columns: 1fr auto auto;
  }
  @media (max-width: 900px){
    .mt-head{ grid-template-columns: 1fr; }
    .mt-actions{ justify-self: start; }
  }
  .mt-title{
    display:inline-flex; align-items:center; gap:10px; font-weight:600; color:${t.text};
    font-size:1.1rem;
  }
  .mt-controls{
    display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-self:center;
  }
  .mt-month{
    background:#0b0e13; color:${t.text}; border:1px solid ${t.border};
    border-radius:8px; padding:6px 8px;
  }
  .mt-actions{ justify-self:end; }

  /* Cards / List */
  .mt-card{
    border:1px solid ${t.border}; border-radius:14px; padding:18px;
    background:${t.panel};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: 0 10px 24px rgba(0,0,0,.28);
  }
  .mt-center{ text-align:center; }
  .mt-dim{ color:${t.textDim}; }

  .mt-list{ display:grid; gap:12px; }
  .mt-item{
    border:1px solid ${t.borderSoft}; border-radius:12px; padding:14px;
    background:${t.panelSoft};
    backdrop-filter: blur(8px) saturate(140%);
    -webkit-backdrop-filter: blur(8px) saturate(140%);
    box-shadow: 0 6px 14px rgba(0,0,0,.20);
  }
  .mt-item.pending{
    background-image: repeating-linear-gradient(
      135deg,
      rgba(179,38,30,.45) 0px,
      rgba(179,38,30,.45) 10px,
      rgba(27,33,48,.55) 10px,
      rgba(27,33,48,.55) 20px
    );
    border:1px solid rgba(239,68,68,.55);
  }

  .mt-rows{ display:grid; gap:8px; }
  .mt-row{ display:grid; grid-template-columns: 140px 1fr; gap:10px; align-items:baseline; }
  .mt-label{ color:${t.textDim}; }

  .mt-chip{
    margin-top:4px; display:inline-flex; padding:2px 10px; border-radius:999px;
    border:1px solid ${t.border};
    font-size:12px; width:fit-content;
  }
  .mt-chip--warn{ background:rgba(239,68,68,.15); border-color:rgba(239,68,68,.35); }

  /* Modal */
  .mt-modal{ display:grid; gap:12px; color:${t.text}; }
  .mt-field-3{ display:grid; grid-template-columns: 140px 1fr; gap:10px; align-items:center; }
  .mt-field-2x{ display:grid; grid-template-columns: 140px 1fr 1fr; gap:10px; align-items:center; }
  @media (max-width: 640px){
    .mt-field-3{ grid-template-columns: 1fr; }
    .mt-field-2x{ grid-template-columns: 1fr; }
  }

  .field-wrap{ position:relative; width:100%; }
  .field-ico{
    position:absolute; left:10px; top:50%; transform:translateY(-50%);
    opacity:.7; pointer-events:none;
  }
  .input-ico, .textarea-ico{
    width:100%; box-sizing:border-box; padding-left:34px; color:${t.text};
    background:#0b0e13; border:1px solid ${t.border}; border-radius:8px; padding-top:8px; padding-bottom:8px;
  }
  .textarea-ico{ resize:vertical; min-height:90px; }

  .mt-alert{
    padding:10px 12px; border-radius:10px; border:1px solid ${t.border};
    background:rgba(90,176,255,.12); border-color:rgba(90,176,255,.35);
  }
  .mt-alert--success{ background:rgba(46,125,50,.15); border-color:rgba(46,125,50,.35); }
  .mt-alert--error{ background:rgba(179,38,30,.15); border-color:rgba(179,38,30,.35); }

  .mt-actions-bar{ display:flex; gap:10px; justify-content:flex-end; margin-top:4px; }
  `;
}
