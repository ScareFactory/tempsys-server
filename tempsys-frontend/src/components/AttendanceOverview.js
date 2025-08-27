// src/components/AttendanceOverview.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Button from "./ui/Button";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaExclamationTriangle,
  FaSync,
  FaCalendarDay,
} from "react-icons/fa";

export default function AttendanceOverview({ companyId: propCompanyId }) {
  const { token, companyId: ctxCompanyId } = useContext(AuthContext);
  const companyId = propCompanyId || ctxCompanyId;

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // lokales ISO-Datum (kein UTC-Versatz)
  const todayLocalISO = useMemo(() => {
    const d = new Date();
    const tzAdjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return tzAdjusted.toISOString().slice(0, 10);
  }, []);

  const [date, setDate] = useState(todayLocalISO);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [expected, setExpected] = useState([]);     // geplant (schedule)
  const [unexpected, setUnexpected] = useState([]); // eingestempelt ohne Plan

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/attendance?date=${encodeURIComponent(date)}`,
        { headers }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setExpected(Array.isArray(data.expected) ? data.expected : []);
      setUnexpected(Array.isArray(data.unexpected) ? data.unexpected : []);
    } catch (e) {
      console.error("Attendance laden fehlgeschlagen:", e);
      setErr("Konnte Anwesenheiten nicht laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && token) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, token, date]);

  // ====== Glas-/UI-Styles (konsistent zu ErrorLog/LoginData) ======
  const glass = {
  border: "1px solid rgba(255,255,255,0.15)",
  background: "linear-gradient(180deg, rgba(17, 24, 39, 0.65), rgba(17, 24, 39, 0.45))",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: 14,
  color: "#fff",
};

  const inputBase = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.25)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    outline: "none",
  };

  const pill = (bg, fg = "#0b0b0b") => ({
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    background: bg,
    color: fg,
    fontWeight: 700,
    justifySelf: "end",
    whiteSpace: "nowrap",
    border: "1px solid rgba(255,255,255,.2)",
  });

  const badgeGreen = pill("#34d399", "#063a2c");
  const badgeRed   = pill("#ff0000", "#ffffff"); // knalliges Rot
  const badgeAmber = pill("#fbbf24", "#78350f");

  const wrap = { padding: 16 };
  const container = { ...glass, padding: 16, display: "grid", gap: 16 };

  const headerBar = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const rightControls = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };

  const sectionCard = { ...glass, padding: 14, display: "grid", gap: 10 };
  const sectionTitle = { margin: 0, display: "flex", alignItems: "center", gap: 8 };

  const list = { display: "grid", gap: 8, maxHeight: 420, overflowY: "auto" };

  const row = {
    display: "grid",
    gridTemplateColumns: "minmax(160px, 1fr) auto auto",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,.06)",
    padding: "10px 12px",
    borderRadius: 10,
    color: "#fff",
  };

  return (
    <div style={wrap}>
      {/* Scrollbar-Styling wie in den anderen Modulen */}
      <style>{`
        .log-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.45) transparent; }
        .log-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .log-scroll::-webkit-scrollbar-track { background: transparent; }
        .log-scroll::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.45); border-radius: 4px; }
        .log-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.65); }
      `}</style>

      <div style={container}>
        <div style={headerBar}>
          <h2 style={{ margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <FaUsers /> Anwesende Mitarbeiter – Schnellcheck
          </h2>

          <div style={rightControls}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FaCalendarDay />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputBase }}
              />
            </div>
            <Button onClick={load}>
              <FaSync style={{ marginRight: 6 }} />
              Aktualisieren
            </Button>
          </div>
        </div>

        {loading ? (
          <div style={{ ...sectionCard, textAlign: "center" }}>Lade …</div>
        ) : err ? (
          <div style={{ ...sectionCard, background: "#7a1c1c" }}>{err}</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {/* Geplant & eingestempelt */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>
                <FaUserCheck /> Geplant & eingestempelt
                <span style={{ ...badgeGreen, marginLeft: "auto" }}>
                  {expected.filter((e) => e.clockedIn).length}
                </span>
              </h3>

              {expected.filter((e) => e.clockedIn).length === 0 ? (
                <div style={{ opacity: 0.85 }}>Niemand eingestempelt.</div>
              ) : (
                <div style={list} className="log-scroll">
                  {expected
                    .filter((e) => e.clockedIn)
                    .map((e) => (
                      <div key={e.userId} style={row}>
                        <strong>{e.username}</strong>
                        <span style={{ justifySelf: "end", opacity: 0.9 }}>
                          {e.start ? `${e.start} – ${e.end || "…"}` : "—"}
                        </span>
                        <span style={badgeGreen}>eingestempelt</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Geplant, aber NICHT eingestempelt */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>
                <FaUserTimes /> Geplant, aber nicht eingestempelt
                <span style={{ ...badgeRed, marginLeft: "auto" }}>
                  {expected.filter((e) => !e.clockedIn).length}
                </span>
              </h3>

              {expected.filter((e) => !e.clockedIn).length === 0 ? (
                <div style={{ opacity: 0.85 }}>Alle Anwesenden haben eingestempelt.</div>
              ) : (
                <div style={list} className="log-scroll">
                  {expected
                    .filter((e) => !e.clockedIn)
                    .map((e) => (
                      <div key={e.userId} style={row}>
                        <strong>{e.username}</strong>
                        <span style={{ justifySelf: "end", opacity: 0.8 }}>—</span>
                        <span style={badgeRed}>fehlt</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* NICHT geplant, aber eingestempelt */}
            <div style={sectionCard}>
              <h3 style={sectionTitle}>
                <FaExclamationTriangle /> Eingestempelt ohne Plan
                <span style={{ ...badgeAmber, marginLeft: "auto" }}>{unexpected.length}</span>
              </h3>

              {unexpected.length === 0 ? (
                <div style={{ opacity: 0.85 }}>Keine unerwarteten Stempelungen.</div>
              ) : (
                <div style={list} className="log-scroll">
                  {unexpected.map((e) => (
                    <div key={e.userId} style={row}>
                      <strong>{e.username}</strong>
                      <span style={{ justifySelf: "end", opacity: 0.9 }}>
                        {e.start ? `${e.start} – ${e.end || "…"}` : "—"}
                      </span>
                      <span style={badgeAmber}>unerwartet</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
