// src/components/MyAppointments.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import deLocale from "@fullcalendar/core/locales/de";

import {
  FaExchangeAlt,
  FaCalendarDay,
  FaUserPlus,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

import Button from "./ui/Button";
import Select from "./ui/Select";
import Modal from "./ui/Modal";
// ❌ CSS-Import entfernt: import "../styles/MyAppointments.css";

function ymd(v) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  return String(v).slice(0, 10);
}

export default function MyAppointments() {
  const { token, companyId, userId } = useContext(AuthContext);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [events, setEvents] = useState([]);
  const [colleagues, setColleagues] = useState([]);

  // eigene pending Requests (vom eingeloggten User gestellt)
  const [pendingSet, setPendingSet] = useState(() => new Set());

  // Swap modal state
  const [swapOpen, setSwapOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [swapStatus, setSwapStatus] = useState({ state: "idle", msg: "" }); // idle|sending|success|error

  // Theme (TempSys)
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

  // Load my events
  useEffect(() => {
    if (!companyId || !userId) return;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/schedule`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const myEvents = (Array.isArray(data) ? data : [])
          .filter((row) => row.userId === userId)
          .map((row) => ({
            id: row.id,
            title: "Dienst",
            start: ymd(row.date),
            allDay: true,
            backgroundColor: t.accent,
            borderColor: t.accent,
            textColor: "#fff",
            extendedProps: { date: ymd(row.date) },
          }));

        setEvents(myEvents);
      } catch (err) {
        console.error("Fehler beim Laden der Termine:", err);
      }
    })();
  }, [companyId, userId, headers]);

  // Load colleagues
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/users`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const users = await res.json();
        setColleagues(users.filter((u) => u.id !== userId));
      } catch (err) {
        console.error("Fehler beim Laden der Kollegen:", err);
      }
    })();
  }, [companyId, userId, headers]);

  // Load my outgoing pending swap requests
  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const r = await fetch(`/api/schedule/my-swap-requests`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const rows = await r.json(); // [{date:'YYYY-MM-DD'}]
        const s = new Set(rows.map((x) => ymd(x.date)));
        setPendingSet(s);
      } catch (e) {
        console.error("Fehler beim Laden eigener Anfragen:", e);
      }
    })();
  }, [token, companyId, userId, headers]);

  // Event-Klick: Popup nur öffnen, wenn nicht pending
  const onEventClick = (info) => {
    const d = ymd(info.event.startStr);
    if (pendingSet.has(d)) return; // blockieren
    setSelectedEvent(info.event);
    setTargetUserId("");
    setSwapStatus({ state: "idle", msg: "" });
    setSwapOpen(true);
  };

  // Event-Klasse für gestreifte Darstellung bei pending
  const eventClassNames = (arg) => {
    const d = ymd(arg.event.startStr);
    return pendingSet.has(d) ? ["event--pending-swap"] : [];
  };

  // Swap senden
  const sendSwapRequest = async () => {
    if (!selectedEvent || !targetUserId) {
      setSwapStatus({ state: "error", msg: "Bitte Kollegin/Kollegen auswählen." });
      return;
    }
    try {
      setSwapStatus({ state: "sending", msg: "Sende Anfrage …" });
      const dateIso = ymd(selectedEvent.startStr);
      const res = await fetch("/api/schedule/swap-request", {
        method: "POST",
        headers,
        body: JSON.stringify({
          date: dateIso,
          from: userId,
          to: targetUserId,
        }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.message) msg = body.message;
        } catch {}
        throw new Error(msg);
      }

      // Markiere das Datum direkt als pending
      setPendingSet((prev) => {
        const copy = new Set(prev);
        copy.add(dateIso);
        return copy;
      });

      setSwapStatus({ state: "success", msg: "Anfrage gesendet." });
      setTimeout(() => setSwapOpen(false), 900);
    } catch (err) {
      console.error("Übergabe fehlgeschlagen:", err);
      setSwapStatus({ state: "error", msg: err.message || "Anfrage konnte nicht gesendet werden." });
    }
  };

  const selectedDateDE = selectedEvent
    ? new Date(selectedEvent.start).toLocaleDateString("de-DE", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "-";

  return (
    <div className="ap-shell">
      <style>{css(t)}</style>

      <div className="ap-card">
        <div className="ap-head">
          <h3>Meine Termine</h3>
          <div className="ap-legend">
            <span className="ap-dot" /> Dein Dienst
            <span className="ap-dot ap-dot--striped" style={{ marginLeft: 12 }} />
            Anfrage offen
          </div>
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locales={[deLocale]}
          locale="de"
          firstDay={1}
          height="auto"
          headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
          buttonText={{ today: "Heute" }}
          dayMaxEventRows={3}
          displayEventTime={false}
          events={events}
          eventClassNames={eventClassNames}
          eventClick={onEventClick}
        />
      </div>

      {/* Swap-Modal im gleichen Look */}
      {swapOpen && (
        <Modal isOpen={swapOpen} onClose={() => setSwapOpen(false)} title={null} size="lg">
          <div className="swap-modal">
            <header className="swap-head">
              <div className="swap-badge">
                <FaExchangeAlt />
              </div>
              <div className="swap-head-text">
                <h4>Dienst übergeben</h4>
                <p>Schicke eine Übergabeanfrage an eine Kollegin/einen Kollegen.</p>
              </div>
            </header>

            <div className="swap-row swap-row--center">
              <span className="chip chip--date">
                <FaCalendarDay className="chip__icon" />
                {selectedDateDE}
              </span>
            </div>

            <div className="swap-field">
              <label className="swap-label">
                <FaUserPlus className="swap-label__icon" />
                Empfänger*in auswählen
              </label>
              <Select
                className="swap-select"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                options={[
                  { value: "", label: "– Kollegin/Kollegen auswählen –" },
                  ...colleagues.map((u) => ({ value: u.id, label: u.username })),
                ]}
                style={{ width: "100%" }}
              />
              {targetUserId && (
                <div className="swap-hint">
                  <FaCheckCircle className="swap-hint__icon" />
                  <span>Ausgewählt: {colleagues.find((c) => c.id === targetUserId)?.username}</span>
                </div>
              )}
            </div>

            {swapStatus.state !== "idle" && (
              <div
                className={
                  "alert " +
                  (swapStatus.state === "success"
                    ? "alert--success"
                    : swapStatus.state === "error"
                    ? "alert--error"
                    : "alert--info")
                }
              >
                {swapStatus.state === "success" ? (
                  <FaCheckCircle className="alert__icon" />
                ) : swapStatus.state === "error" ? (
                  <FaTimesCircle className="alert__icon" />
                ) : null}
                <span>{swapStatus.msg}</span>
              </div>
            )}

            <div className="swap-footer">
              <Button onClick={sendSwapRequest} disabled={swapStatus.state === "sending" || !targetUserId}>
                {swapStatus.state === "sending" ? "Senden…" : "Anfrage senden"}
              </Button>
              <Button variant="secondary" onClick={() => setSwapOpen(false)} disabled={swapStatus.state === "sending"}>
                Abbrechen
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Look + Glas) ---------------- */
function css(t) {
  return `
  .ap-shell {
    color: ${t.text};
  }

  .ap-card{
    border:1px solid ${t.border};
    border-radius:14px;
    padding:18px;
    background:${t.panel};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: 0 10px 24px rgba(0,0,0,.28);
  }

  .ap-head{
    display:flex; align-items:center; justify-content:space-between;
    gap:14px; margin-bottom:14px;
  }
  .ap-head h3{ margin:0; font-size:1.1rem; color:${t.text}; }
  .ap-legend{ display:flex; align-items:center; gap:10px; color:${t.textDim}; font-size:.9rem; }

  .ap-dot{
    width:10px; height:10px; border-radius:50%;
    display:inline-block; background:${t.accent}; border:1px solid rgba(255,255,255,.25);
  }
  .ap-dot--striped{
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(224,49,49,.85) 0,
      rgba(224,49,49,.85) 6px,
      rgba(224,49,49,.45) 6px,
      rgba(224,49,49,.45) 12px
    );
  }

  /* FullCalendar Tweaks */
  .fc .fc-toolbar-title{ color:${t.text}; font-weight:600; }
  .fc .fc-button{
    background:${t.panelSoft}; border:1px solid ${t.border};
    color:${t.text}; border-radius:8px;
  }
  .fc .fc-button:disabled{ opacity:.65; }
  .fc .fc-button-primary:hover{ filter:brightness(1.05); }
  .fc-theme-standard .fc-scrollgrid,
  .fc-theme-standard td, .fc-theme-standard th{
    border-color:${t.borderSoft};
  }
  .fc .fc-daygrid-day-number{ color:${t.textDim}; }
  .fc .fc-day-today{ background:rgba(90,176,255,.08); }
  .fc .fc-event{
    border-radius:8px; padding:2px 4px;
    box-shadow:0 3px 10px rgba(0,0,0,.25);
  }
  /* Pending Swap: gestreift */
  .fc .event--pending-swap .fc-event-main{
    background-image:repeating-linear-gradient(
      -45deg,
      rgba(255,255,255,.25) 0,
      rgba(255,255,255,.25) 6px,
      rgba(255,255,255,.12) 6px,
      rgba(255,255,255,.12) 12px
    );
  }

  /* Modal – Swap */
  .swap-modal{
    background:${t.panel};
    border:1px solid ${t.border};
    border-radius:14px;
    padding:18px;
    color:${t.text};
  }
  .swap-head{ display:flex; align-items:center; gap:12px; margin-bottom:10px; }
  .swap-badge{
    width:38px; height:38px; border-radius:10px;
    background:linear-gradient(180deg, rgba(224,49,49,.22), rgba(224,49,49,.12));
    border:1px solid rgba(224,49,49,.35);
    display:inline-flex; align-items:center; justify-content:center; color:${t.text};
  }
  .swap-head-text h4{ margin:0 0 4px; font-size:1.05rem; }
  .swap-head-text p{ margin:0; color:${t.textDim}; font-size:.92rem; }

  .swap-row--center{ display:flex; justify-content:center; margin:12px 0; }

  .chip{
    display:inline-flex; align-items:center; gap:8px;
    padding:6px 10px; border-radius:999px;
    color:${t.text}; background:${t.panelSoft}; border:1px solid ${t.border};
  }
  .chip__icon{ opacity:.9; }

  .swap-field{ display:grid; gap:8px; margin:12px 0; }
  .swap-label{
    display:flex; align-items:center; gap:8px; color:${t.textDim};
  }
  .swap-select select{ width:100%; }

  .swap-hint{ display:flex; align-items:center; gap:8px; color:${t.textDim}; }
  .swap-hint__icon{ color:${t.success}; }

  .alert{
    margin:10px 0; padding:10px 12px; border-radius:10px;
    border:1px solid ${t.border};
    display:flex; align-items:center; gap:10px;
  }
  .alert__icon{ flex:0 0 auto; }
  .alert--success{ background:rgba(46,125,50,.15); border-color:rgba(46,125,50,.35); }
  .alert--error{ background:rgba(179,38,30,.15); border-color:rgba(179,38,30,.35); }
  .alert--info{ background:rgba(90,176,255,.12); border-color:rgba(90,176,255,.35); }

  .swap-footer{ display:flex; gap:10px; justify-content:flex-end; margin-top:12px; }
  `;
}
