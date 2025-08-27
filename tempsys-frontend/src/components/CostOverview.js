// src/components/CostOverview.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaCalculator, FaSave, FaSyncAlt } from "react-icons/fa";

export default function EmployeeCosts() {
  const { token, companyId } = useContext(AuthContext);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // ——— Labels / Helpers ———
  const MODE_LABELS = {
    uniform: "Einheitlicher Stundensatz",
    department: "Abteilungs-Sätze",
    perUserHourly: "Individuelle Stundensätze",
    perUserMonthly: "Feste Monatslöhne",
  };

  const evtVal = (e) => {
    if (!e) return "";
    if (e.target && typeof e.target.value !== "undefined") return e.target.value;
    if (e.currentTarget && typeof e.currentTarget.value !== "undefined") return e.currentTarget.value;
    if (typeof e.value !== "undefined") return e.value;
    return "";
  };

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [users, setUsers] = useState([]);

  const [cfg, setCfg] = useState({
    mode: "uniform",
    defaultHourlyCents: 0,
    departmentRates: {},
    userDepartments: {},
    userHourlyCents: {},
    userMonthlyCents: {},
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const [costs, setCosts] = useState({
    month: "",
    mode: "",
    items: [],
    totalCents: 0,
  });

  // —— Dark Glass / UI Styles —— 
  const glass = {
    border: "1px solid rgba(255,255,255,0.15)",
    background: "linear-gradient(180deg, rgba(17,24,39,0.65), rgba(17,24,39,0.45))",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: 14,
    color: "#fff",
  };

  const subGlass = {
    border: "1px solid rgba(255,255,255,0.12)",
    background: "linear-gradient(180deg, rgba(17,24,39,0.55), rgba(17,24,39,0.40))",
    borderRadius: 12,
  };

  const labelCol = 190;

  const Section = ({ title, icon, children, info }) => (
    <div style={{ ...glass, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <h3 style={{ margin: 0, fontWeight: 700, color: "#fff" }}>{title}</h3>
      </div>
      <div>{children}</div>
      {info && (
        <div style={{ color: "#D1D5DB", fontSize: 13, lineHeight: 1.35 }}>{info}</div>
      )}
    </div>
  );

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2400);
  };

  const fmtEUR = (cents) =>
    (Number(cents || 0) / 100).toLocaleString("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });

  const toCents = (str) => {
    const v = String(str ?? "").replace(",", ".").trim();
    if (v === "") return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : Math.round(n * 100);
  };

  const fromCents = (c) => (Number(c || 0) / 100).toFixed(2).replace(".", ",");

  // ——— Data ———
  const loadUsers = async () => {
    const r = await fetch(`/api/companies/${companyId}/users`, { headers });
    if (!r.ok) throw new Error("users http " + r.status);
    const data = await r.json();
    setUsers(data || []);
  };

  const loadConfig = async () => {
    const r = await fetch(`/api/companies/${companyId}/compensation-config`, { headers });
    if (!r.ok) return;
    const data = await r.json();
    setCfg({
      mode: data.mode || "uniform",
      defaultHourlyCents: data.defaultHourlyCents || 0,
      departmentRates: data.departmentRates || {},
      userDepartments: data.userDepartments || {},
      userHourlyCents: data.userHourlyCents || {},
      userMonthlyCents: data.userMonthlyCents || {},
    });
  };

  const recalc = async () => {
    setRecalcLoading(true);
    setMsg(null);
    try {
      const r = await fetch(
        `/api/companies/${companyId}/compensation-costs?month=${encodeURIComponent(month)}`,
        { headers }
      );
      if (!r.ok) throw new Error("costs http " + r.status);
      const data = await r.json();
      setCosts(data);
    } catch (e) {
      console.error("recalc failed:", e);
      showMsg("error", "Kosten konnten nicht berechnet werden.");
    } finally {
      setRecalcLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      try {
        setLoading(true);
        await loadUsers();
        await loadConfig();
        await recalc();
      } catch (e) {
        console.error(e);
        showMsg("error", "Daten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/companies/${companyId}/compensation-config`, {
        method: "PUT",
        headers,
        body: JSON.stringify(cfg),
      });
      if (!r.ok) throw new Error("save http " + r.status);
      await r.json().catch(() => ({}));
      showMsg("success", "Einstellungen gespeichert.");
      await recalc();
    } catch (e) {
      console.error("save failed:", e);
      showMsg("error", "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  };

  // ——— UI parts ———
  const ModeSelector = () => (
    <div style={{ display: "grid", gridTemplateColumns: `${labelCol}px 1fr`, gap: 12 }}>
      <label style={{ color: "#E5E7EB" }}>Berechnungsmodus</label>
      <div title={MODE_LABELS[cfg.mode ?? "uniform"]}>
        <Select
          value={cfg.mode ?? "uniform"}
          onChange={(e) => {
            const v = evtVal(e) || "uniform";
            setCfg((s) => ({ ...s, mode: v }));
          }}
          options={[
            { value: "uniform", label: MODE_LABELS.uniform },
            { value: "department", label: MODE_LABELS.department },
            { value: "perUserHourly", label: MODE_LABELS.perUserHourly },
            { value: "perUserMonthly", label: MODE_LABELS.perUserMonthly },
          ]}
          style={{
            width: "100%",
            maxWidth: 380,
            background: "rgba(17,24,39,0.6)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#E5E7EB",
          }}
        />
      </div>
    </div>
  );

  const UniformEditor = () => (
    <div style={{ display: "grid", gridTemplateColumns: `${labelCol}px 260px`, gap: 12, marginTop: 10 }}>
      <label style={{ color: "#E5E7EB" }}>Stundensatz (€/h)</label>
      <input
        type="text"
        inputMode="decimal"
        defaultValue={fromCents(cfg.defaultHourlyCents)}
        onBlur={(e) => {
          const val = evtVal(e);
          setCfg((s) => ({ ...s, defaultHourlyCents: toCents(val) }));
        }}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(17,24,39,0.6)",
          color: "#F3F4F6",
          outline: "none",
        }}
        placeholder="z. B. 12,82"
      />
    </div>
  );

  return (
    <Card>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "#fff" }}>
        <FaCalculator /> Mitarbeiterkosten
      </h2>

      {msg && (
        <div
          style={{
            ...subGlass,
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            color: "#fff",
            background:
              msg.type === "success"
                ? "rgba(12,122,67,0.85)"
                : msg.type === "info"
                ? "rgba(30,64,175,0.85)"
                : "rgba(122,28,28,0.85)",
          }}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#E5E7EB" }}>Lade …</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(440px, 560px) 1.6fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Konfiguration */}
          <Section
            title="Konfiguration"
            icon={<FaSave />}
            info="Wähle den Modus und hinterlege Sätze/Gehälter. Speichern, dann unten die Monatskosten berechnen/anzeigen."
          >
            <div style={{ display: "grid", gap: 12 }}>
              {/* Monat */}
              <div style={{ display: "grid", gridTemplateColumns: `${labelCol}px 260px`, gap: 12 }}>
                <label style={{ color: "#E5E7EB" }}>Monat</label>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(evtVal(e) || month)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(17,24,39,0.6)",
                    color: "#F3F4F6",
                    outline: "none",
                  }}
                />
              </div>

              <ModeSelector />
              {cfg.mode === "uniform" && <UniformEditor />}

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Button onClick={save} disabled={saving}>
                  <FaSave style={{ marginRight: 6 }} />
                  {saving ? "Speichere…" : "Speichern"}
                </Button>
                <Button variant="secondary" onClick={recalc} disabled={recalcLoading}>
                  <FaSyncAlt style={{ marginRight: 6 }} />
                  {recalcLoading ? "Berechne…" : "Kosten neu berechnen"}
                </Button>
              </div>
            </div>
          </Section>

          {/* Monatskosten */}
          <Section
            title="Monatskosten"
            icon={<FaCalculator />}
            info="Für Stundensätze werden die erfassten Zeiten des Monats herangezogen; bei Monatslohn der feste Betrag."
          >
            <div
              style={{
                ...subGlass,
                borderRadius: 12,
                overflow: "auto",
                maxHeight: 640,
              }}
              className="log-scroll"
            >
              {!costs.items?.length ? (
                <div style={{ padding: 12, color: "#D1D5DB" }}>Keine Daten.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                      background: "rgba(17,24,39,0.9)",
                      backdropFilter: "blur(8px)",
                      WebkitBackdropFilter: "blur(8px)",
                      color: "#E5E7EB",
                    }}
                  >
                    <tr>
                      <th style={{ textAlign: "left",  padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Mitarbeiter</th>
                      <th style={{ textAlign: "left",  padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Typ</th>
                      {/* ersetzt: Minuten → Pausen (Min) */}
                      <th style={{ textAlign: "right", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Pausen (Min)</th>
                      <th style={{ textAlign: "right", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Stunden</th>
                      <th style={{ textAlign: "right", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Satz</th>
                      <th style={{ textAlign: "right", padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>Kosten (Monat)</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "#F3F4F6" }}>
                    {costs.items.map((it) => {
                      const raw = Number(it.rawMinutes ?? it.minutesRaw ?? 0);
                      const net = Number(it.minutes ?? it.minutesNet ?? 0);
                      const breakMin = (it.breakMinutes != null)
                        ? Number(it.breakMinutes)
                        : Math.max(0, raw - net);

                      return (
                        <tr key={it.userId} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "10px 14px" }}>{it.username}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {it.type === "monthly" ? "Monatslohn" : "Stundensatz"}
                          </td>
                          {/* nur Pausen-Minuten anzeigen */}
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>{breakMin}</td>
                          <td style={{ padding: "10px 14px", textAlign: "right" }}>
                            {(it.hours || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                            {it.type === "monthly"
                              ? fmtEUR(it.rateCents || 0)
                              : `${fmtEUR(it.rateCents || 0)} /h`}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>
                            {fmtEUR(it.costCents || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot style={{ color: "#E5E7EB" }}>
                    <tr>
                      {/* 6 Spalten → Text über 5 Spalten, Summe in letzter Zelle */}
                      <td colSpan={5} style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700 }}>
                        Summe Kosten
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800 }}>
                        {fmtEUR(costs.totalCents || 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </Section>
        </div>
      )}
    </Card>
  );
}
