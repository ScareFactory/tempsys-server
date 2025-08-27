// src/components/MyAbsences.js

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import {
  FaCalendarAlt,
  FaFileUpload,
  FaPaperPlane,
  FaChevronLeft,
  FaChevronRight,
  FaUmbrellaBeach,
  FaPlus,
} from "react-icons/fa";

function iso(d) { return new Date(d).toISOString().slice(0, 10); }
function toMonthStr(date) { const y = date.getFullYear(); const m = String(date.getMonth() + 1).padStart(2, "0"); return `${y}-${m}`; }
function rangeFromMonth(ym) { const [y, m] = ym.split("-").map(Number); return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }; }

export default function MyAbsences() {
  const { token, userId } = useContext(AuthContext);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  // ── Theme (gleich wie AbsenceApproval) ──────────────────────────────────────
  const t = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    panel: "rgba(16,20,28,.55)",
    panelSoft: "rgba(27,33,48,.55)",
    border: "rgba(255,255,255,.14)",
    borderSoft: "rgba(255,255,255,.10)",
    accent: "rgba(224,49,49,1)",
    success: "#0c7a43",
    danger: "#7a1c1c",
  };

  // ── State: Abwesenheiten (mit Monatsfilter) ─────────────────────────────────
  const [month, setMonth] = useState(() => toMonthStr(new Date()));
  const [{ from, to }, setRange] = useState(() => rangeFromMonth(toMonthStr(new Date())));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── State: Eigene Urlaubs-/Wunschfrei-Anträge ───────────────────────────────
  const [reqLoading, setReqLoading] = useState(true);
  const [requests, setRequests] = useState([]); // pending + approved

  // ── State: Policy/Balance ───────────────────────────────────────────────────
  const [policy, setPolicy] = useState({ mode: "uniform", uniformDays: null, myAllowance: 0, remainingDays: 0, vacationEnabled: false });
  const [policyLoading, setPolicyLoading] = useState(true);

  // ── Inline Feedback ─────────────────────────────────────────────────────────
  const [flash, setFlash] = useState(null); // {type:'success'|'error', msg}
  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 2600); };

  useEffect(() => { setRange(rangeFromMonth(month)); }, [month]);

  // ── Laden: Abwesenheiten (mit Monatsrange) ──────────────────────────────────
  async function loadAbsences() {
    if (!userId) return;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to });
      const r = await fetch(`/api/users/${userId}/absences?${qs}`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fehler beim Laden der Abwesenheiten:", e);
      showFlash("error", "Abwesenheiten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }

  // ── Laden: Eigene Anträge ───────────────────────────────────────────────────
  async function loadMyRequests() {
    setReqLoading(true);
    try {
      const r = await fetch(`/api/vacation-requests/mine`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Fehler beim Laden der Anträge:", e);
      showFlash("error", "Anträge konnten nicht geladen werden.");
    } finally {
      setReqLoading(false);
    }
  }

  // ── Laden: Policy/Balances des eingeloggten Users ───────────────────────────
  async function loadMyPolicy() {
    setPolicyLoading(true);
    try {
      const r = await fetch(`/api/vacation-policy/mine`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPolicy({
        mode: data.mode,
        uniformDays: data.uniformDays ?? null,
        myAllowance: Number(data.myAllowance || 0),
        remainingDays: Number(data.remainingDays || 0),
        vacationEnabled: !!data.vacationEnabled,
      });
    } catch (e) {
      console.error("Urlaubspolicy konnte nicht geladen werden:", e);
      showFlash("error", "Policy konnte nicht geladen werden.");
    } finally {
      setPolicyLoading(false);
    }
  }

  useEffect(() => {
    if (!userId) return;
    loadAbsences();
    loadMyRequests();
    loadMyPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token, from, to]);

  const goPrev = () => { const [y, m] = month.split("-").map(Number); setMonth(toMonthStr(new Date(y, m - 2, 1))); };
  const goNext = () => { const [y, m] = month.split("-").map(Number); setMonth(toMonthStr(new Date(y, m, 1))); };

  // ── Upload Krankmeldung ─────────────────────────────────────────────────────
  const fileRefs = useRef({});
  const onPick = (id) => fileRefs.current[id]?.click();
  const onFile = async (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/absences/${id}/upload-sick-note`, { method: "POST", headers, body: fd });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      showFlash("success", "Krankmeldung hochgeladen.");
      await loadAbsences();
    } catch (err) {
      console.error("Upload fehlgeschlagen:", err);
      showFlash("error", "Upload fehlgeschlagen.");
    } finally { e.target.value = ""; }
  };

  // ── Nachricht zur Abwesenheit ───────────────────────────────────────────────
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [activeAbsenceId, setActiveAbsenceId] = useState(null);
  const openMsg = (id) => { setActiveAbsenceId(id); setMsgText(""); setMsgOpen(true); };
  const sendMsg = async () => {
    try {
      const r = await fetch(`/api/absences/${activeAbsenceId}/message`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgText })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMsgOpen(false);
      showFlash("success", "Nachricht gesendet.");
      await loadAbsences();
    } catch (err) {
      console.error("Nachricht fehlgeschlagen:", err);
      showFlash("error", "Senden fehlgeschlagen.");
    }
  };

  // ── Antrag stellen (Modal) ──────────────────────────────────────────────────
  const [reqOpen, setReqOpen] = useState(false);
  const [kind, setKind] = useState("vacation"); // 'vacation' | 'wish'
  const [startDate, setStartDate] = useState(iso(new Date()));
  const [endDate, setEndDate] = useState(iso(new Date()));
  const [reason, setReason] = useState("");

  const submitRequest = async () => {
    try {
      const res = await fetch(`/api/vacation-requests`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ kind, startDate, endDate, reason })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `HTTP ${res.status}`);
      }
      setReqOpen(false);
      showFlash("success", "Antrag eingereicht.");
      setReason("");
      await Promise.all([loadMyRequests(), loadMyPolicy()]);
    } catch (e) {
      console.error("Antrag fehlgeschlagen:", e);
      showFlash("error", e.message || "Antrag fehlgeschlagen.");
    }
  };

  // ── Kleine UI-Bausteine im gleichen Stil wie AbsenceApproval ───────────────
  const Section = ({ title, icon, children, info, right }) => (
    <div
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: 18,
        background: t.panel,
        backdropFilter: "blur(10px) saturate(140%)",
        WebkitBackdropFilter: "blur(10px) saturate(140%)",
        boxShadow: "0 8px 18px rgba(0,0,0,.25)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        color: t.text,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: t.accent, display: "inline-flex", alignItems: "center" }}>{icon}</span>
          <h3 style={{ margin: 0, fontSize: "1.05rem", color: t.text }}>{title}</h3>
        </div>
        {right}
      </div>
      <div>{children}</div>
      {info && <div style={{ marginTop: 4, color: t.textDim, fontSize: 13, lineHeight: 1.35 }}>{info}</div>}
    </div>
  );

  const listItemStyle = {
    border: `1px solid ${t.borderSoft}`,
    borderRadius: 12,
    padding: 16,
    background: t.panelSoft,
    backdropFilter: "blur(8px) saturate(140%)",
    WebkitBackdropFilter: "blur(8px) saturate(140%)",
    boxShadow: "0 6px 14px rgba(0,0,0,.20)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 14,
    alignItems: "start",
    color: t.text,
  };
  const labelStyle = { width: 130, color: t.textDim };
  const rowStyle = { display: "flex", gap: 10, marginBottom: 6, alignItems: "baseline" };

  // Badges
  const statusBadge = (st) => ({
    open: { bg: "rgba(245,158,11,.15)", br: "1px solid rgba(245,158,11,.35)", text: "Offen" },
    excused: { bg: "rgba(16,185,129,.15)", br: "1px solid rgba(16,185,129,.35)", text: "Entschuldigt" },
    declined: { bg: "rgba(239,68,68,.15)", br: "1px solid rgba(239,68,68,.35)", text: "Abgelehnt" },
  }[st] || { bg: "#555", br: "1px solid #666", text: st });

  const reqKindText = (k) => k === "vacation" ? "Urlaub" : "Wunschfrei";

  return (
    <Card>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, color: t.text, display: "flex", alignItems: "center", gap: 8 }}>
            <FaCalendarAlt /> Meine Abwesenheiten
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="secondary" onClick={goPrev} title="Voriger Monat"><FaChevronLeft /></Button>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ background: "#fff", border: "1px solid #ccc", borderRadius: 8, padding: "8px 10px" }}
            />
            <Button variant="secondary" onClick={goNext} title="Nächster Monat"><FaChevronRight /></Button>
          </div>
        </div>
        <div>
          <Button onClick={() => setReqOpen(true)} title="Urlaub/Wunschfrei beantragen">
            <FaPlus style={{ marginRight: 6 }} /> Antrag
          </Button>
        </div>
      </div>

      {/* Flash */}
      {flash && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 8,
            color: "#fff",
            background: flash.type === "success" ? t.success : t.danger,
          }}
        >
          {flash.msg}
        </div>
      )}

      {/* Grid: links Abwesenheiten, rechts eigene Anträge + Policy */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(420px, 1.1fr) 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* Linke Spalte: Abwesenheiten */}
        <div style={{ display: "grid", gap: 22 }}>
          <Section
            title="Meine Abwesenheiten"
            icon={<FaCalendarAlt />}
            info="Abwesenheiten im gewählten Monat. Offene Abwesenheiten können mit Krankmeldung und Nachricht ergänzt werden."
          >
            {loading ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Lade …</div>
            ) : items.length === 0 ? (
              <div style={{ opacity: 0.85, color: t.textDim }}>Keine Abwesenheiten im ausgewählten Monat. 🎉</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {items.map((a) => {
                  const b = statusBadge(a.status);
                  const locked = a.status !== "open";
                  return (
                    <div key={a.id} style={listItemStyle}>
                      <div>
                        <div style={rowStyle}>
                          <span style={labelStyle}>Datum:</span>
                          <strong>{new Date(a.date).toLocaleDateString("de-DE")}</strong>
                        </div>
                        <div style={rowStyle}>
                          <span style={labelStyle}>Status:</span>
                          <span style={{ background: b.bg, border: b.br, borderRadius: 999, padding: "2px 10px" }}>
                            {b.text}
                          </span>
                        </div>
                        {a.sickNotePath && (
                          <div style={rowStyle}>
                            <span style={labelStyle}>Krankmeldung:</span>
                            <a
                              href={`/api/absences/${a.id}/sick-note?token=${encodeURIComponent(token)}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#a5b4fc" }}
                            >
                              ansehen / herunterladen
                            </a>
                          </div>
                        )}
                        {a.userMessage && (
                          <div style={rowStyle}>
                            <span style={labelStyle}>Nachricht:</span>
                            <span style={{ whiteSpace: "pre-wrap" }}>{a.userMessage}</span>
                          </div>
                        )}
                      </div>

                      {!locked && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            ref={(el) => (fileRefs.current[a.id] = el)}
                            style={{ display: "none" }}
                            onChange={(e) => onFile(a.id, e)}
                          />
                          <Button onClick={() => onPick(a.id)}>
                            <FaFileUpload style={{ marginRight: 6 }} /> Krankmeldung
                          </Button>
                          <Button variant="secondary" onClick={() => openMsg(a.id)}>
                            <FaPaperPlane style={{ marginRight: 6 }} /> Nachricht
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* Rechte Spalte: Eigene Anträge + Policy Info */}
        <div style={{ display: "grid", gap: 22 }}>
          <Section
            title="Meine Anträge (Urlaub / Wunschfrei)"
            icon={<FaUmbrellaBeach />}
            right={
              !policyLoading && (
                <div style={{ color: t.textDim, fontSize: 13 }}>
                  Resturlaub: <b>{policy.remainingDays}</b> / Soll: <b>{policy.myAllowance}</b>
                </div>
              )
            }
            info="Hier siehst du eingereichte (offene und genehmigte) Urlaubs- oder Wunschfrei-Anträge."
          >
            {reqLoading ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Lade …</div>
            ) : requests.length === 0 ? (
              <div style={{ opacity: 0.85, color: t.textDim }}>Keine Anträge vorhanden.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {requests.map((r) => (
                  <div key={r.id} style={listItemStyle}>
                    <div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Typ:</span>
                        <strong>{reqKindText(r.kind)}</strong>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Zeitraum:</span>
                        <strong>
                          {new Date(r.startDate).toLocaleDateString("de-DE")} – {new Date(r.endDate).toLocaleDateString("de-DE")}
                        </strong>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Tage:</span>
                        <span>{r.days}</span>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Status:</span>
                        <span
                          style={{
                            background:
                              r.status === "pending"
                                ? "rgba(245,158,11,.15)"
                                : "rgba(16,185,129,.15)",
                            border:
                              r.status === "pending"
                                ? "1px solid rgba(245,158,11,.35)"
                                : "1px solid rgba(16,185,129,.35)",
                            borderRadius: 999,
                            padding: "2px 10px",
                          }}
                        >
                          {r.status === "pending" ? "Offen" : "Genehmigt"}
                        </span>
                      </div>
                    </div>
                    <div style={{ color: t.textDim, fontSize: 12 }}>
                      {new Date(r.createdAt).toLocaleDateString("de-DE")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>

      {/* Message Modal */}
      <Modal isOpen={msgOpen} onClose={() => setMsgOpen(false)} title="Nachricht an Admin" centerY>
        <div style={{ display: "grid", gap: 12 }}>
          <textarea
            rows={4}
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            placeholder="Kurze Begründung oder Info…"
            style={{ width: "100%", resize: "vertical", minHeight: 120 }}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setMsgOpen(false)}>Abbrechen</Button>
            <Button onClick={sendMsg} disabled={!msgText.trim()}>Senden</Button>
          </div>
        </div>
      </Modal>

      {/* Antrag Modal */}
      <Modal isOpen={reqOpen} onClose={() => setReqOpen(false)} title="Urlaub / Wunschfrei beantragen" centerY> 
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: t.text }}>
              <input
                type="radio"
                name="kind"
                value="vacation"
                checked={kind === "vacation"}
                onChange={() => setKind("vacation")}
                disabled={!policy.vacationEnabled}
              />
              Urlaub
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, color: t.text }}>
              <input
                type="radio"
                name="kind"
                value="wish"
                checked={kind === "wish"}
                onChange={() => setKind("wish")}
              />
              Wunschfrei
            </label>
            {!policyLoading && !policy.vacationEnabled && (
              <span style={{ color: t.textDim, fontSize: 12 }}>
                Urlaub ist derzeit deaktiviert.
              </span>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ color: t.textDim, fontSize: 13, marginBottom: 4 }}>Start</div>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: "100%", padding: "8px 10px" }} />
            </div>
            <div>
              <div style={{ color: t.textDim, fontSize: 13, marginBottom: 4 }}>Ende</div>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: "100%", padding: "8px 10px" }} />
            </div>
          </div>

          <div>
            <div style={{ color: t.textDim, fontSize: 13, marginBottom: 4 }}>Grund (optional)</div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Kurze Begründung oder Info…"
              style={{ width: "100%", resize: "vertical", minHeight: 80, padding: "8px 10px" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <Button variant="secondary" onClick={() => setReqOpen(false)}>Abbrechen</Button>
            <Button
              onClick={submitRequest}
              disabled={!startDate || !endDate || (kind === "vacation" && !policy.vacationEnabled)}
            >
              <FaUmbrellaBeach style={{ marginRight: 6 }} />
              Senden
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
