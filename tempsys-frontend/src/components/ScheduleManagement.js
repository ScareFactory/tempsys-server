// src/components/ScheduleManagement.js

import React, { useState, useEffect, useContext, useRef, useMemo } from "react";
import { AuthContext } from "../contexts/AuthContext";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Card from "./ui/Card";
import Modal from "./ui/Modal";
import Select from "./ui/Select";
import Button from "./ui/Button";

function ymd(v) {
  if (!v) return "";
  if (typeof v === "string") return v.slice(0, 10);
  return String(v).slice(0, 10);
}

export default function ScheduleManagement({ companyId }) {
  const { token } = useContext(AuthContext);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [employees, setEmployees] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const calendarRef = useRef(null);

  // Genehmigte Urlaube/Wunschfrei der Firma
  const [approvedVacations, setApprovedVacations] = useState([]);

  // Modal-State
  const [isOpen, setOpen] = useState(false);
  const [modalDate, setModalDate] = useState(""); // YYYY-MM-DD
  const [addUserId, setAddUserId] = useState("");
  const [status, setStatus] = useState({ state: "idle", msg: "" }); // idle|sending|success|error

  // Theme
  const t = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    bgGlass: "rgba(16,20,28,.55)",
    bgGlassSoft: "rgba(27,33,48,.55)",
    border: "rgba(255,255,255,.14)",
    borderSoft: "rgba(255,255,255,.12)",
    accent: "rgba(224,49,49,1)",
  };

  // Nur Mitarbeitende (keine Admins)
  const allowedEmployees = useMemo(
    () => employees.filter((u) => u.role === "user"),
    [employees]
  );

  const userById = useMemo(() => {
    const m = new Map();
    for (const u of employees) m.set(u.id, u);
    return m;
  }, [employees]);

  // Plan laden
  const loadSchedule = async () => {
    const r = await fetch(`/api/companies/${companyId}/schedule`, { headers });
    if (!r.ok) throw new Error(`Schedule HTTP ${r.status}`);
    const data = await r.json();
    setAssignments(
      (Array.isArray(data) ? data : []).map((a) => {
        const d = ymd(a.date);
        return {
          id: a.id,
          title: a.username,
          date: d,
          start: d,
          allDay: true,
          extendedProps: { userId: a.userId },
        };
      })
    );
  };

  // Genehmigte Urlaube/Wunschfrei laden (Frontend-Filter; Server blockt sowieso)
  const loadApprovedVacations = async () => {
    const r = await fetch(
      `/api/companies/${companyId}/vacation-requests?status=approved`,
      { headers }
    );
    if (!r.ok) throw new Error(`VacationRequests HTTP ${r.status}`);
    const data = await r.json();
    const rows = (Array.isArray(data) ? data : []).filter(
      (v) =>
        (v.kind === "vacation" || v.kind === "wish") &&
        v.status === "approved"
    );
    setApprovedVacations(rows);
  };

  useEffect(() => {
    if (!companyId) return;
    let alive = true;
    (async () => {
      try {
        const ru = await fetch(`/api/companies/${companyId}/users`, { headers });
        if (!ru.ok) throw new Error(`Users HTTP ${ru.status}`);
        const users = await ru.json();
        if (!alive) return;
        setEmployees(Array.isArray(users) ? users : []);
        await Promise.all([loadSchedule(), loadApprovedVacations()]);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, token]);

  // Tag-Klick → Modal
  const onDateClick = (arg) => {
    setModalDate(ymd(arg.dateStr));
    setAddUserId("");
    setStatus({ state: "idle", msg: "" });
    setOpen(true);
  };

  // Event-Klick → Modal
  const onEventClick = (info) => {
    const d = ymd(info.event.startStr);
    setModalDate(d);
    setAddUserId("");
    setStatus({ state: "idle", msg: "" });
    setOpen(true);
  };

  // Tage mit Einträgen markieren
  const dayCellClassNames = (arg) => {
    const day = ymd(arg.dateStr || arg.date);
    return assignments.some((a) => a.date === day) ? ["fc-day--has-assignment"] : [];
  };

  // Entfernen
  const removeAssignment = async (id) => {
    try {
      setStatus({ state: "sending", msg: "Entferne Eintrag …" });
      const res = await fetch(`/api/companies/${companyId}/schedule/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAssignments((prev) => prev.filter((e) => e.id !== id));
      setStatus({ state: "success", msg: "Eintrag entfernt." });
      setTimeout(() => setStatus({ state: "idle", msg: "" }), 700);
    } catch (e) {
      console.error(e);
      setStatus({ state: "error", msg: "Löschen fehlgeschlagen." });
    }
  };

  // Hinzufügen (mit Guards)
  const addAssignment = async () => {
    if (!addUserId) {
      setStatus({ state: "error", msg: "Bitte Mitarbeiter auswählen." });
      return;
    }
    const user = userById.get(addUserId);
    if (!user || user.role !== "user") {
      setStatus({
        state: "error",
        msg: "Nur Mitarbeitende mit Rolle „user“ können zugewiesen werden.",
      });
      return;
    }
    const dup = assignments.some(
      (a) => a.date === modalDate && String(a.extendedProps.userId) === String(addUserId)
    );
    if (dup) {
      setStatus({ state: "error", msg: "Mitarbeiter ist an dem Tag bereits eingeteilt." });
      return;
    }

    // Zusätzlicher Schutz – wenn Urlaub/Wunschfrei geblockt
    if (isUserOnVacation(String(addUserId), modalDate, approvedVacations)) {
      setStatus({ state: "error", msg: "Mitarbeiter ist an diesem Tag nicht verfügbar." });
      return;
    }

    try {
      setStatus({ state: "sending", msg: "Speichere …" });
      const res = await fetch(`/api/companies/${companyId}/schedule`, {
        method: "POST",
        headers,
        body: JSON.stringify({ date: modalDate, userId: addUserId }),
      });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const body = await res.json();
          if (body?.message) msg = body.message;
        } catch {}
        throw new Error(msg);
      }
      await loadSchedule();
      setAddUserId("");
      setStatus({ state: "success", msg: "Gespeichert." });
      setTimeout(() => setStatus({ state: "idle", msg: "" }), 700);
    } catch (e) {
      console.error(e);
      setStatus({ state: "error", msg: e.message || "Speichern fehlgeschlagen." });
    }
  };

  const events = assignments;

  const entriesForModalDate = useMemo(
    () =>
      assignments
        .filter((a) => a.date === modalDate)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [assignments, modalDate]
  );

  // Set mit bereits zugewiesenen UserIds
  const assignedIdsForModalDate = useMemo(
    () => new Set(entriesForModalDate.map((e) => String(e.extendedProps.userId))),
    [entriesForModalDate]
  );

  // Set mit UserIds, die am modalDate im Urlaub/Wunschfrei sind
  const vacationBlockedIds = useMemo(() => {
    if (!modalDate) return new Set();
    const ids = approvedVacations
      .filter(
        (v) =>
          (v.kind === "vacation" || v.kind === "wish") &&
          v.status === "approved" &&
          modalDate >= v.startDate &&
          modalDate <= v.endDate
      )
      .map((v) => String(v.userId));
    return new Set(ids);
  }, [approvedVacations, modalDate]);

  function isUserOnVacation(userId, dateYmd, rows) {
    return rows.some(
      (v) =>
        String(v.userId) === String(userId) &&
        (v.kind === "vacation" || v.kind === "wish") &&
        v.status === "approved" &&
        dateYmd >= v.startDate &&
        dateYmd <= v.endDate
    );
  }

  // Dropdown-Optionen: nur Mitarbeitende ohne Zuweisung und ohne Urlaub/Wunschfrei
  const selectableOptions = useMemo(
    () => [
      { value: "", label: "– Mitarbeiter auswählen –" },
      ...allowedEmployees
        .filter((u) => !assignedIdsForModalDate.has(String(u.id)))
        .filter((u) => !vacationBlockedIds.has(String(u.id)))
        .sort((a, b) => a.username.localeCompare(b.username))
        .map((u) => ({ value: u.id, label: u.username })),
    ],
    [allowedEmployees, assignedIdsForModalDate, vacationBlockedIds]
  );

  // Infozeile, wer im Urlaub ist
  const vacationNamesForModalDate = useMemo(() => {
    if (!modalDate) return [];
    const ids = vacationBlockedIds;
    return allowedEmployees
      .filter((u) => ids.has(String(u.id)))
      .map((u) => u.username)
      .sort((a, b) => a.localeCompare(b));
  }, [allowedEmployees, vacationBlockedIds, modalDate]);

  return (
    <Card>
      <style>{scopedStyles(t)}</style>

      <h2 className="sched-title">Dienstplan verwalten</h2>
      <div className="schedule-container">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          displayEventTime={false}
          events={events}
          dateClick={onDateClick}
          eventClick={onEventClick}
          dayCellClassNames={dayCellClassNames}
          firstDay={1} // Montag als Wochenstart
        />

        <div className="employee-list">
          <h3>Verfügbare Mitarbeiter</h3>
          <div style={{ display: "grid", gap: 6 }}>
            {allowedEmployees.map((u) => (
              <div
                key={u.id}
                className="employee-item"
                data-id={u.id}
                data-name={u.username}
              >
                {u.username}
              </div>
            ))}
            {allowedEmployees.length === 0 && (
              <div style={{ opacity: 0.7, color: t.textDim }}>
                Keine zuteilbaren Mitarbeiter vorhanden.
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        title={`Dienstplan am ${modalDate || "-"}`}
        maxWidth={720}
        centerY
      >
        <div style={{ display: "grid", gap: 12, color: t.text }}>
          <div>
            <strong>Aktuelle Einteilungen</strong>
            {entriesForModalDate.length === 0 ? (
              <div style={{ padding: "8px 10px", opacity: 0.8 }}>
                Keine Einträge an diesem Tag.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 6 }}>
                {entriesForModalDate.map((e) => (
                  <div
                    key={e.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      border: `1px solid ${t.border}`,
                      background: t.bgGlassSoft,
                      borderRadius: 8,
                    }}
                  >
                    <span>{e.title}</span>
                    <Button variant="danger" onClick={() => removeAssignment(e.id)}>
                      Entfernen
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 6 }}>
            <strong>Mitarbeiter hinzufügen</strong>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                marginTop: 6,
              }}
            >
              <Select
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
                options={selectableOptions}
              />
              <Button onClick={addAssignment} disabled={status.state === "sending"}>
                {status.state === "sending" ? "Speichere…" : "Hinzufügen"}
              </Button>
            </div>
            {vacationNamesForModalDate.length > 0 && (
              <div style={{ fontSize: 12, color: t.textDim, marginTop: 6 }}>
                Nicht verfügbar: {vacationNamesForModalDate.join(", ")}
              </div>
            )}
            <div style={{ fontSize: 12, color: t.textDim, marginTop: 4 }}>
              Hinweis: Admins und Company-Admins sind hier absichtlich ausgeblendet und nicht zuweisbar.
            </div>
          </div>

          {status.state !== "idle" && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 6,
                background:
                  status.state === "success" ? "#0c7a43" :
                  status.state === "error"   ? "#7a1c1c" : "#555",
                color: "#fff",
                textAlign: "center",
              }}
            >
              {status.msg}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={status.state === "sending"}
            >
              Schließen
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

/* ===== Scoped CSS (in JS) – TempSys Glas/Dark + FullCalendar ===== */
function scopedStyles(t) {
  return `
  .sched-title{
    margin: 0 0 12px;
    color: ${t.text};
  }

  .schedule-container{
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 16px;
  }
  @media (max-width: 1024px){
    .schedule-container{ grid-template-columns: 1fr; }
  }

  .employee-list{
    background: ${t.bgGlass};
    border: 1px solid ${t.border};
    border-radius: 12px;
    padding: 12px;
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    color: ${t.text};
  }
  .employee-list h3{ margin: 4px 0 10px; color: ${t.text}; }
  .employee-item{
    background: ${t.bgGlassSoft};
    border: 1px solid ${t.borderSoft};
    color: ${t.text};
    border-radius: 8px;
    padding: 8px 10px;
  }

  /* FullCalendar – Dark + TempSys Akzente */
  .fc { color: ${t.text}; }

  /* GLASS-Toolbar oben */
  .fc .fc-toolbar.fc-header-toolbar{
    background: ${t.bgGlass};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    border: 1px solid ${t.border};
    border-radius: 12px;
    padding: 8px 10px;
    margin-bottom: 10px;
  }
  .fc .fc-button{
    background: ${t.bgGlassSoft};
    border: 1px solid ${t.borderSoft};
    color: ${t.text};
    border-radius: 8px;
    padding: 6px 10px;
  }
  .fc .fc-button:hover{
    background: rgba(224,49,49,.16);
    border-color: rgba(224,49,49,.28);
  }
  .fc .fc-toolbar-title { color: ${t.text}; font-weight: 600; }

  /* WICHTIG: Rundung auf die gesamte Scrollgrid (verhindert weiße Ecken) */
  .fc .fc-scrollgrid{
    border: 1px solid ${t.border};
    border-radius: 12px;
    overflow: hidden;
    background: rgba(16,20,28,.35);
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
  }

  /* Wochentagszeile im Glass-Look – KEINE Rundung hier */
  .fc .fc-col-header{
    background: ${t.bgGlass};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
  }
  .fc .fc-col-header-cell,
  .fc .fc-col-header-cell-cushion{
    color: #fff !important; /* weiße Labels (Mon/Tue/…) */
    background: transparent;
  }

  /* Grid-Linien */
  .fc .fc-scrollgrid,
  .fc-theme-standard td,
  .fc-theme-standard th {
    border-color: ${t.borderSoft};
    background: transparent;
  }

  .fc .fc-daygrid-day-number{ color: ${t.textDim}; }
  .fc .fc-daygrid-day:hover{ background: rgba(255,255,255,.03); }

  .fc .fc-event, .fc .fc-event .fc-event-main{
    background: linear-gradient(180deg, rgba(224,49,49,.85), rgba(224,49,49,.7));
    border: 1px solid rgba(224,49,49,.45);
    color: #fff;
    border-radius: 8px;
    padding: 2px 6px;
  }
  .fc-day--has-assignment{
    background: radial-gradient(140px 60px at 50% 20%, rgba(224,49,49,.10), transparent);
  }
  `;
}
