// src/components/WorkingHoursConfig.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { FaSave, FaSync, FaClock, FaUsersCog, FaStore } from "react-icons/fa";

// Wochentage
const WD = [
  { i: 0, label: "Montag" },
  { i: 1, label: "Dienstag" },
  { i: 2, label: "Mittwoch" },
  { i: 3, label: "Donnerstag" },
  { i: 4, label: "Freitag" },
  { i: 5, label: "Samstag" },
  { i: 6, label: "Sonntag" },
];

// ===== shared glass styles
const glassPanel = {
  border: "1px solid rgba(255,255,255,0.15)",
  background: "linear-gradient(180deg, rgba(17, 24, 39, 0.65), rgba(17, 24, 39, 0.45))",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: 14,
  color: "#fff",
};

const softTitle = { margin: 0, color: "#eef2f7", fontWeight: 600 };

const fieldBorder = "1px solid rgba(255,255,255,0.20)";

const inputBase = {
  padding: "10px 12px",
  borderRadius: 10,
  border: fieldBorder,
  background: "rgba(255,255,255,0.06)",
  color: "#eef2f7",
  outline: "none",
};

// neutrale Section im Glas-Stil
function Section({ title, icon, children, info }) {
  return (
    <div style={{ ...glassPanel, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        {icon}
        <h3 style={softTitle}>{title}</h3>
      </div>
      {children}
      {info && (
        <div style={{ marginTop: 10, color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 1.35 }}>
          {info}
        </div>
      )}
    </div>
  );
}

export default function WorkingHoursConfig({ companyId: propCompanyId }) {
  const { token, companyId: ctxCompanyId } = useContext(AuthContext);
  const companyId = propCompanyId || ctxCompanyId;

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);
  const [error, setError] = useState(null);

  // Config state (Backend: /working-hours-config)
  const [mode, setMode] = useState("none"); // 'none' | 'uniform' | 'perEmployee'
  const [uniformMinutes, setUniformMinutes] = useState(0);
  const [openingHours, setOpeningHours] = useState(
    WD.map((w) => ({ weekday: w.i, open: null, close: null }))
  );

  // Per-Employee
  const [targets, setTargets] = useState([]); // [{userId, username, role, weeklyTargetMinutes}]
  const [targetsLoading, setTargetsLoading] = useState(false);

  const showFlash = (type, text) => {
    setFlash({ type, text });
    setTimeout(() => setFlash(null), 2500);
  };

  // ===== Helpers
  const minutesToHM = (m) => {
    m = Number(m || 0);
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return { h, m: mm };
  };
  const setUniformHM = (h, m) => {
    const hh = Math.max(0, Number(h || 0));
    const mm = Math.max(0, Math.min(59, Number(m || 0)));
    setUniformMinutes(hh * 60 + mm);
  };
  const minutesToTime = (m) => {
    if (m == null || isNaN(m)) return "";
    const mm = Number(m);
    const h = Math.floor(mm / 60);
    const rest = mm % 60;
    return `${String(h).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  };
  const timeToMinutes = (t) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const setDay = (idx, patch) => {
    setOpeningHours((prev) =>
      prev.map((d) => (d.weekday === idx ? { ...d, ...patch } : d))
    );
  };

  // ===== Load
  const loadConfig = async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/working-hours-config`,
        { headers }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setMode(data.mode || "none");
      setUniformMinutes(data.uniformWeeklyTargetMinutes ?? 0);

      const map = new Map((data.openingHours || []).map((h) => [Number(h.weekday), h]));
      setOpeningHours(
        WD.map((w) => {
          const h = map.get(w.i);
          return { weekday: w.i, open: h?.open || null, close: h?.close || null };
        })
      );

      // Targets laden (mit Fallback)
      setTargetsLoading(true);
      try {
        const rT = await fetch(
          `/api/companies/${companyId}/employee-weekly-targets`,
          { headers }
        );
        if (rT.ok) {
          const list = await rT.json();
          setTargets(list.filter((u) => u.role !== "admin"));
        } else {
          const [rUsers, rOnlyTargets] = await Promise.all([
            fetch(`/api/companies/${companyId}/users`, { headers }),
            fetch(`/api/companies/${companyId}/employee-weekly-targets`, { headers }),
          ]);
          const users = rUsers.ok ? await rUsers.json() : [];
          const only = rOnlyTargets.ok ? await rOnlyTargets.json() : [];
          const tMap = only.reduce((a, x) => ((a[x.userId] = x.weeklyTargetMinutes ?? null), a), {});
          setTargets(
            users
              .filter((u) => u.role !== "admin")
              .map((u) => ({
                userId: u.id,
                username: u.username,
                role: u.role,
                weeklyTargetMinutes: tMap[u.id] ?? null,
              }))
          );
        }
      } finally {
        setTargetsLoading(false);
      }
    } catch (e) {
      console.error("Config laden fehlgeschlagen:", e);
      setError("Konfiguration konnte nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId || !token) return;
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, token]);

  // ===== Save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        mode,
        uniformWeeklyTargetMinutes:
          mode === "uniform" ? Number(uniformMinutes || 0) : null,
        openingHours,
      };

      const r = await fetch(
        `/api/companies/${companyId}/working-hours-config`,
        { method: "PUT", headers, body: JSON.stringify(payload) }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);

      if (mode === "perEmployee") {
        const items = targets.map((t) => ({
          userId: t.userId,
          weeklyTargetMinutes:
            t.weeklyTargetMinutes == null ? null : Number(t.weeklyTargetMinutes),
        }));
        const r2 = await fetch(
          `/api/companies/${companyId}/employee-weekly-targets`,
          { method: "PUT", headers, body: JSON.stringify({ items }) }
        );
        if (!r2.ok) throw new Error(`Targets HTTP ${r2.status}`);
      }

      showFlash("success", "Konfiguration gespeichert.");
    } catch (e) {
      console.error("Speichern fehlgeschlagen:", e);
      setError("Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  // ===== Styles (helle Inputs, Glas-Container)
  const timeInputStyle = { ...inputBase, width: "100%" };

  const gridRowHdr = {
    display: "grid",
    gridTemplateColumns: "minmax(120px,1fr) 160px 160px 120px",
    gap: 10,
    fontWeight: 600,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
  };
  const gridRow = {
    display: "grid",
    gridTemplateColumns: "minmax(120px,1fr) 160px 160px 120px",
    gap: 10,
    alignItems: "center",
  };
  const pill = (bg, fg = "#111827") => ({
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    background: bg,
    color: fg,
    fontWeight: 700,
    border: fieldBorder,
    display: "inline-block",
    textAlign: "center",
  });

  const { h: uniH, m: uniM } = minutesToHM(uniformMinutes);

  return (
    <Card style={{ ...glassPanel, padding: 20 }}>
      <h2 style={{ ...softTitle, display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <FaClock /> Arbeitszeiten konfigurieren
      </h2>

      {/* Feedback */}
      {flash && (
        <div
          style={{
            margin: "8px 0 12px",
            padding: "10px 12px",
            borderRadius: 10,
            background: flash.type === "success" ? "#0c7a43" : "#7a1c1c",
            color: "#fff",
          }}
        >
          {flash.text}
        </div>
      )}
      {error && (
        <div
          style={{
            margin: "8px 0 12px",
            padding: "10px 12px",
            borderRadius: 10,
            background: "#7a1c1c",
            color: "#fff",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div> Lade …</div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "1fr",
            // breite skalierend; auf großen Screens 2 Spalten
          }}
        >
          {/* Öffnungszeiten */}
          <Section
            title="Öffnungszeiten pro Tag"
            icon={<FaStore />}
            info="Lege die Standard‑Öffnungszeiten für jeden Wochentag fest. Leere Felder bedeuten 'geschlossen'."
          >
            <div style={gridRowHdr}>
              <div>Wochentag</div>
              <div>Öffnet</div>
              <div>Schließt</div>
              <div>Status</div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {openingHours.map((d) => (
                <div key={d.weekday} style={gridRow}>
                  <div style={{ color: "rgba(255,255,255,0.9)" }}>{WD[d.weekday].label}</div>
                  <input
                    type="time"
                    value={d.open ?? ""}
                    onChange={(e) => setDay(d.weekday, { open: e.target.value || null })}
                    style={timeInputStyle}
                  />
                  <input
                    type="time"
                    value={d.close ?? ""}
                    onChange={(e) => setDay(d.weekday, { close: e.target.value || null })}
                    style={timeInputStyle}
                  />
                  <div>
                    {d.open && d.close ? (
                      <span style={pill("#d1fae5", "#065f46")}>offen</span>
                    ) : (
                      <span style={pill("rgba(255,255,255,0.15)", "#eef2f7")}>geschlossen</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                onClick={() =>
                  setOpeningHours(WD.map((w) => ({ weekday: w.i, open: null, close: null })))
                }
              >
                Alle schließen
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  setOpeningHours(
                    WD.map((w) => ({ weekday: w.i, open: "09:00", close: "18:00" }))
                  )
                }
              >
                9–18 für alle
              </Button>
            </div>
          </Section>

          {/* Sollzeit */}
          <Section
            title="Soll‑Arbeitszeit"
            icon={<FaUsersCog />}
            info="Lege fest, wie die wöchentliche Sollzeit bestimmt wird: keine, einheitlich für alle oder individuell pro Mitarbeiter."
          >
            <div style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "none"}
                  onChange={() => setMode("none")}
                />
                Keine Sollzeiten (z. B. nur geringfügig Beschäftigte)
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "uniform"}
                  onChange={() => setMode("uniform")}
                />
                Einheitlich für alle
              </label>

              {mode === "uniform" && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 28, flexWrap: "wrap" }}>
                  <span>Wöchentlich:</span>
                  <input
                    type="number"
                    min={0}
                    value={Math.floor((uniformMinutes || 0) / 60)}
                    onChange={(e) => setUniformHM(e.target.value, (uniformMinutes || 0) % 60)}
                    style={{ ...inputBase, width: 110, textAlign: "right" }}
                  />
                  Std
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={(uniformMinutes || 0) % 60}
                    onChange={(e) => setUniformHM(Math.floor((uniformMinutes || 0) / 60), e.target.value)}
                    style={{ ...inputBase, width: 110, textAlign: "right" }}
                  />
                  Min
                </div>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === "perEmployee"}
                  onChange={() => setMode("perEmployee")}
                />
                Individuell pro Mitarbeiter
              </label>
            </div>

            {mode === "perEmployee" && (
              <div style={{ marginTop: 14 }}>
                {targetsLoading ? (
                  <div style={{ color: "rgba(255,255,255,0.8)" }}>Lade Mitarbeiter …</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 220px",
                        gap: 10,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      <div>Name</div>
                      <div>Wöchentliche Sollzeit (hh:mm)</div>
                    </div>

                    {targets.map((u) => (
                      <div
                        key={u.userId}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 220px",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <div>
                          {u.username}{" "}
                          {u.role === "companyAdmin" ? (
                            <span style={{ color: "rgba(255,255,255,0.7)" }}>(companyAdmin)</span>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="time"
                            step={300}
                            value={minutesToTime(u.weeklyTargetMinutes)}
                            onChange={(e) => {
                              const m = timeToMinutes(e.target.value);
                              setTargets((prev) =>
                                prev.map((x) =>
                                  x.userId === u.userId ? { ...x, weeklyTargetMinutes: m } : x
                                )
                              );
                            }}
                            style={{ ...inputBase, width: 150 }}
                          />
                          <Button
                            variant="secondary"
                            onClick={() =>
                              setTargets((prev) =>
                                prev.map((x) =>
                                  x.userId === u.userId ? { ...x, weeklyTargetMinutes: null } : x
                                )
                              )
                            }
                          >
                            Reset
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button onClick={handleSave} disabled={saving}>
              <FaSave style={{ marginRight: 6 }} />
              {saving ? "Speichere …" : "Speichern"}
            </Button>
            <Button variant="secondary" onClick={loadConfig}>
              <FaSync style={{ marginRight: 6 }} />
              Neu laden
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
