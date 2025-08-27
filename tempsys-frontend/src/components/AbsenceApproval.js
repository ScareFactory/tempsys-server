// src/components/AbsenceApproval.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import {
  FaFileMedical,
  FaUmbrellaBeach,
  FaClock,
  FaEye,
  FaCheck,
  FaTimes,
} from "react-icons/fa";

export default function AbsenceApproval() {
  const { token, companyId } = useContext(AuthContext);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // ── Theme Tokens (TempSys) ────────────────────────────────────────────────
  const t = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    panel: "rgba(16,20,28,.55)",
    panelSoft: "rgba(27,33,48,.55)",
    border: "rgba(255,255,255,.14)",
    borderSoft: "rgba(255,255,255,.10)",
    accent: "rgba(224,49,49,1)", // #e03131
    success: "#0c7a43",
    danger: "#7a1c1c",
  };

  // ---- Zeitkorrekturen (pending) ----
  const [tcLoading, setTcLoading] = useState(true);
  const [tcRequests, setTcRequests] = useState([]);

  // ---- Abwesenheiten (open) ----
  const [absLoading, setAbsLoading] = useState(true);
  const [absences, setAbsences] = useState([]);

  // ---- Urlaubs-/Wunschfrei-Anträge (pending) ----
  const [vacLoading, setVacLoading] = useState(true);
  const [vacRequests, setVacRequests] = useState([]);

  // ---- Policy-Konfigurator ----
  const [polLoading, setPolLoading] = useState(true);
  const [mode, setMode] = useState("uniform"); // 'uniform' | 'perUser'
  const [uniformDays, setUniformDays] = useState(null);
  const [perUser, setPerUser] = useState({}); // { userId: number }
  const [users, setUsers] = useState([]);

  // ---- Inline Feedback ----
  const [flash, setFlash] = useState(null); // {type:'success'|'error', msg:string}
  const showFlash = (type, msg) => { setFlash({ type, msg }); setTimeout(() => setFlash(null), 2600); };

  // ---- Responsive ----
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    const check = () => setIsNarrow(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Loaders
  const loadTimeCorrections = async () => {
    setTcLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/time-corrections?status=pending`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTcRequests(await res.json());
    } catch (e) {
      console.error("Fehler beim Laden der Zeitkorrekturen:", e);
      showFlash("error", "Zeitkorrekturen konnten nicht geladen werden.");
    } finally { setTcLoading(false); }
  };

  const loadAbsences = async () => {
    setAbsLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/absences?status=open`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAbsences(await res.json());
    } catch (e) {
      console.error("Fehler beim Laden der Abwesenheiten:", e);
      showFlash("error", "Abwesenheiten konnten nicht geladen werden.");
    } finally { setAbsLoading(false); }
  };

  const loadVacationRequests = async () => {
    setVacLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/vacation-requests?status=pending`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setVacRequests(await res.json());
    } catch (e) {
      console.error("Fehler beim Laden der Urlaubsanträge:", e);
      showFlash("error", "Urlaubsanträge konnten nicht geladen werden.");
    } finally { setVacLoading(false); }
  };

  const loadPolicy = async () => {
    setPolLoading(true);
    try {
      // Policy
      const pr = await fetch(`/api/companies/${companyId}/vacation-policy`, { headers });
      if (!pr.ok) throw new Error(`HTTP ${pr.status}`);
      const p = await pr.json();
      setMode(p?.mode === "perUser" ? "perUser" : "uniform");
      setUniformDays(p?.uniformDays ?? null);
      setPerUser(p?.perUser || {});
      // Users (für perUser-Modus)
      const ur = await fetch(`/api/companies/${companyId}/users`, { headers });
      if (ur.ok) setUsers(await ur.json());
    } catch (e) {
      console.error("Urlaubspolicy konnte nicht geladen werden:", e);
      showFlash("error", "Urlaubspolicy konnte nicht geladen werden.");
    } finally { setPolLoading(false); }
  };

  useEffect(() => {
    if (!companyId) return;
    loadTimeCorrections();
    loadAbsences();
    loadVacationRequests();
    loadPolicy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, token]);

  // Aktionen
  const decideTimeCorrection = async (id, action) => {
    try {
      const res = await fetch(`/api/time-corrections/${id}/${action}`, { method: "POST", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTcRequests((r) => r.filter((x) => x.id !== id));
      showFlash("success", action === "approve" ? "Zeitkorrektur wurde genehmigt." : "Zeitkorrektur wurde abgelehnt.");
    } catch (e) {
      console.error("Entscheidung fehlgeschlagen:", e);
      showFlash("error", "Aktion fehlgeschlagen.");
    }
  };

  const excuseAbsence = async (id) => {
    try {
      const res = await fetch(`/api/absences/${id}/excuse`, { method: "POST", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAbsences((arr) => arr.filter((a) => a.id !== id));
      showFlash("success", "Abwesenheit wurde entschuldigt.");
    } catch (e) {
      console.error("Entschuldigen fehlgeschlagen:", e);
      showFlash("error", "Abwesenheit konnte nicht entschuldigt werden.");
    }
  };

  const declineAbsence = async (id) => {
    try {
      const res = await fetch(`/api/absences/${id}/decline`, { method: "POST", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAbsences((arr) => arr.filter((a) => a.id !== id));
      showFlash("success", "Abwesenheit wurde abgelehnt.");
    } catch (e) {
      console.error("Ablehnen fehlgeschlagen:", e);
      showFlash("error", "Abwesenheit konnte nicht abgelehnt werden.");
    }
  };

  const openSickNote = async (absenceId) => {
    try {
      const r = await fetch(`/api/absences/${absenceId}/sick-note`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error("Öffnen der Krankmeldung fehlgeschlagen:", e);
      showFlash("error", "Krankmeldung konnte nicht geöffnet werden.");
    }
  };

  const approveVacation = async (id) => {
    try {
      const r = await fetch(`/api/vacation-requests/${id}/approve`, { method: "POST", headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setVacRequests((arr) => arr.filter((x) => x.id !== id));
      showFlash("success", "Antrag genehmigt.");
    } catch (e) {
      console.error("Approve failed:", e);
      showFlash("error", "Genehmigen fehlgeschlagen.");
    }
  };

  const declineVacation = async (id) => {
    try {
      const r = await fetch(`/api/vacation-requests/${id}/decline`, { method: "POST", headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setVacRequests((arr) => arr.filter((x) => x.id !== id));
      showFlash("success", "Antrag abgelehnt.");
    } catch (e) {
      console.error("Decline failed:", e);
      showFlash("error", "Ablehnen fehlgeschlagen.");
    }
  };

  const savePolicy = async () => {
    try {
      const payload = { mode, uniformDays: uniformDays === "" ? null : (uniformDays == null ? null : Number(uniformDays)), perUser };
      const r = await fetch(`/api/companies/${companyId}/vacation-policy`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.message || `HTTP ${r.status}`);
      }
      showFlash("success", "Urlaubspolicy gespeichert.");
      await loadPolicy();
    } catch (e) {
      console.error("Policy speichern fehlgeschlagen:", e);
      showFlash("error", e.message || "Speichern fehlgeschlagen.");
    }
  };

  // ── UI wrappers ─────────────────────────────────────────────────────────────
  const Section = ({ title, icon, children, info }) => (
    <div
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding: 16,
        background: t.panel,
        backdropFilter: "blur(10px) saturate(140%)",
        WebkitBackdropFilter: "blur(10px) saturate(140%)",
        boxShadow: "0 8px 18px rgba(0,0,0,.25)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: t.text,
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: t.accent, display: "inline-flex", alignItems: "center" }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: "1.05rem", color: t.text }}>{title}</h3>
      </div>
      <div>{children}</div>
      {info && (
        <div style={{ marginTop: 4, color: t.textDim, fontSize: 13, lineHeight: 1.35 }}>
          {info}
        </div>
      )}
    </div>
  );

  const listItemStyle = {
    border: `1px solid ${t.borderSoft}`,
    borderRadius: 10,
    padding: 14,
    background: t.panelSoft,
    backdropFilter: "blur(8px) saturate(140%)",
    WebkitBackdropFilter: "blur(8px) saturate(140%)",
    boxShadow: "0 6px 14px rgba(0,0,0,.20)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    alignItems: "start",
    color: t.text,
  };

  const labelStyle = { width: 130, color: t.textDim };
  const rowStyle = { display: "flex", gap: 8, marginBottom: 6, alignItems: "baseline" };

  return (
    <Card>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: t.text }}>
        Abwesenheiten & Anträge
      </h2>

      {/* Flash */}
      {flash && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 6,
            color: "#fff",
            background: flash.type === "success" ? t.success : t.danger,
          }}
        >
          {flash.msg}
        </div>
      )}

      {/* 2-Spalten-Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isNarrow ? "1fr" : "minmax(420px, 1.1fr) 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* Linke Spalte */}
        <div style={{ display: "grid", gap: 20 }}>
          {/* Offene Abwesenheiten */}
          <Section
            title="Offene Abwesenheiten"
            icon={<FaFileMedical />}
            info="Prüfe und entscheide über gemeldete Abwesenheiten. Krankmeldungen können direkt geöffnet werden."
          >
            {absLoading ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Lade …</div>
            ) : absences.length === 0 ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Keine offenen Abwesenheiten.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {absences.map((a) => (
                  <div key={a.id} style={listItemStyle}>
                    <div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Mitarbeiter:</span>
                        <strong>{a.username}</strong>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Datum:</span>
                        <strong>{new Date(a.date).toLocaleDateString("de-DE")}</strong>
                      </div>

                      {a.userMessage && (
                        <div style={rowStyle}>
                          <span style={labelStyle}>Nachricht:</span>
                          <span style={{ whiteSpace: "pre-wrap" }}>{a.userMessage}</span>
                        </div>
                      )}

                      <div style={rowStyle}>
                        <span style={labelStyle}>Krankmeldung:</span>
                        {a.sickNotePath ? (
                          <Button variant="secondary" onClick={() => openSickNote(a.id)} title="Krankmeldung ansehen">
                            <FaEye style={{ marginRight: 6 }} />
                            ansehen / herunterladen
                          </Button>
                        ) : (
                          <span style={{ opacity: 0.8, color: t.textDim }}>keine Datei hinterlegt</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Button onClick={() => excuseAbsence(a.id)}>
                        <FaCheck style={{ marginRight: 6 }} />
                        Entschuldigen
                      </Button>
                      <Button variant="secondary" onClick={() => declineAbsence(a.id)}>
                        <FaTimes style={{ marginRight: 6 }} />
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Urlaubsanträge (pending) */}
          <Section
            title="Urlaubs-/Wunschfrei-Anträge"
            icon={<FaUmbrellaBeach />}
            info="Offene Anträge prüfen und genehmigen/ablehnen. Bei genehmigtem Urlaub werden Tage automatisch abgezogen."
          >
            {vacLoading ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Lade …</div>
            ) : vacRequests.length === 0 ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Keine offenen Urlaubs-/Wunschfrei-Anträge.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {vacRequests.map((r) => (
                  <div key={r.id} style={listItemStyle}>
                    <div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Mitarbeiter:</span>
                        <strong>{r.username}</strong>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Typ:</span>
                        <strong>{r.kind === "vacation" ? "Urlaub" : "Wunschfrei"}</strong>
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
                      {r.reason && (
                        <div style={rowStyle}>
                          <span style={labelStyle}>Begründung:</span>
                          <span style={{ whiteSpace: "pre-wrap" }}>{r.reason}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button onClick={() => approveVacation(r.id)}>
                        <FaCheck style={{ marginRight: 6 }} />
                        Genehmigen
                      </Button>
                      <Button variant="secondary" onClick={() => declineVacation(r.id)}>
                        <FaTimes style={{ marginRight: 6 }} />
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Rechte Spalte: Zeitkorrekturen + Policy-Konfigurator */}
        <div style={{ display: "grid", gap: 20 }}>
          <Section
            title="Zeitkorrektur Anträge"
            icon={<FaClock />}
            info="Offene Anträge auf Korrektur von Arbeitszeiten (Start/Ende) prüfen und entscheiden."
          >
            {tcLoading ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Lade …</div>
            ) : tcRequests.length === 0 ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Keine offenen Anträge.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {tcRequests.map((r) => (
                  <div key={r.id} style={listItemStyle}>
                    <div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Mitarbeiter:</span>
                        <strong>{r.username}</strong>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Datum:</span>
                        <strong>{new Date(r.date).toLocaleDateString("de-DE")}</strong>
                      </div>
                      <div style={rowStyle}>
                        <span style={labelStyle}>Neuer Zeitraum:</span>
                        <strong>{(r.newStart ?? "—")} – {(r.newEnd ?? "—")}</strong>
                      </div>
                      {r.reason && (
                        <div style={rowStyle}>
                          <span style={labelStyle}>Begründung:</span>
                          <span style={{ whiteSpace: "pre-wrap" }}>{r.reason}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Button onClick={() => decideTimeCorrection(r.id, "approve")}>
                        <FaCheck style={{ marginRight: 6 }} />
                        Annehmen
                      </Button>
                      <Button variant="secondary" onClick={() => decideTimeCorrection(r.id, "decline")}>
                        <FaTimes style={{ marginRight: 6 }} />
                        Ablehnen
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Urlaubskonfiguration */}
          <Section
            title="Urlaubskonfiguration"
            icon={<FaUmbrellaBeach />}
            info="Entweder alle Mitarbeiter erhalten denselben Urlaubsanspruch (Uniform) oder du definierst individuelle Werte pro Mitarbeiter. 0 oder null = Urlaub deaktiviert (nur Wunschfrei möglich)."
          >
            {polLoading ? (
              <div style={{ opacity: 0.7, color: t.textDim }}>Lade …</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {/* Modus */}
                <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="mode"
                      value="uniform"
                      checked={mode === "uniform"}
                      onChange={() => setMode("uniform")}
                    />
                    Alle gleich (Uniform)
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="radio"
                      name="mode"
                      value="perUser"
                      checked={mode === "perUser"}
                      onChange={() => setMode("perUser")}
                    />
                    Pro Mitarbeiter
                  </label>
                </div>

                {/* Uniform */}
                {mode === "uniform" && (
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ color: t.textDim, fontSize: 13 }}>Urlaubstage pro Jahr (0/leer = deaktiviert)</label>
                    <input
                      type="number"
                      min="0"
                      value={uniformDays ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setUniformDays(v === "" ? null : Number(v));
                      }}
                      placeholder="z.B. 24"
                      style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ccc" }}
                    />
                  </div>
                )}

                {/* Per User */}
                {mode === "perUser" && (
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={{ color: t.textDim, fontSize: 13 }}>
                      Trage Urlaubstage pro Mitarbeiter ein (0/leer = deaktiviert).
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {users.map((u) => (
                        <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10, alignItems: "center" }}>
                          <div>{u.username}</div>
                          <input
                            type="number"
                            min="0"
                            value={perUser[u.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPerUser((prev) => ({ ...prev, [u.id]: v === "" ? null : Number(v) }));
                            }}
                            style={{ padding: "6px 8px", borderRadius: 8, border: "1px solid #ccc" }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                  <Button onClick={savePolicy}>Speichern</Button>
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </Card>
  );
}
