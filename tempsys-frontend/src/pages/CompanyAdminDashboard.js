// src/pages/CompanyAdminDashboard.js
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

import {
  FaUsers,
  FaCalendarAlt,
  FaUserTimes,
  FaMoneyBillWave,
  FaDesktop,
  FaClock,
  FaEnvelopeOpenText,
  FaBug,
  FaUserCheck,
  FaShieldAlt,
  FaDatabase,
  FaQuestion,
  FaKey,
} from "react-icons/fa";

import EmployeeManagement      from "../components/EmployeeManagement";
import ScheduleManagement      from "../components/ScheduleManagement";
import AbsenceApproval         from "../components/AbsenceApproval";
import CostOverview            from "../components/CostOverview";
import DeviceManagement        from "../components/DeviceManagement";
import WorkingHoursConfig      from "../components/WorkingHoursConfig";
import MonthlyMailSetup        from "../components/MonthlyMailSetup";
import ErrorLog                from "../components/ErrorLog";
import AttendanceOverview      from "../components/AttendanceOverview";
import PrivacyConsent          from "../components/PrivacyConsent";
import DataView                from "../components/DataView";
import LoginData               from "../components/LoginData"; // Passwort ändern
import SupportContact          from "../components/SupportContact";

const ICONS = {
  manage_employees: <FaUsers size={18} />,
  schedule:         <FaCalendarAlt size={18} />,
  absences:         <FaUserTimes size={18} />,
  costs:            <FaMoneyBillWave size={18} />,
  devices:          <FaDesktop size={18} />,
  hours_config:     <FaClock size={18} />,
  monthly_mail:     <FaEnvelopeOpenText size={18} />,
  error_log:        <FaBug size={18} />,
  present:          <FaUserCheck size={18} />,
  privacy:          <FaShieldAlt size={18} />,
  data_view:        <FaDatabase size={18} />,
  login:            <FaKey size={18} />,
  support:          <FaEnvelopeOpenText size={18} />,
};

export default function CompanyAdminDashboard() {
  const { token, companyId } = useContext(AuthContext);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Alle potenziellen Module
  const allModules = [
    { key: "manage_employees",  label: "Mitarbeiter verwalten",           Component: EmployeeManagement },
    { key: "schedule",          label: "Dienstplan verwalten",            Component: ScheduleManagement },
    { key: "absences",          label: "Abwesenheiten bestätigen",        Component: AbsenceApproval },
    { key: "costs",             label: "Mitarbeiterkosten einsehen",      Component: CostOverview },
    { key: "devices",           label: "Geräte verwalten",                Component: DeviceManagement },
    { key: "hours_config",      label: "Arbeitszeiten konfigurieren",     Component: WorkingHoursConfig },
    { key: "monthly_mail",      label: "Daten Export",                    Component: MonthlyMailSetup },
    { key: "error_log",         label: "Fehlerlog",                       Component: ErrorLog },
    { key: "present",           label: "Anwesende Mitarbeiter",           Component: AttendanceOverview },
    { key: "privacy",           label: "Datenschutz zustimmen",           Component: PrivacyConsent },
    { key: "data_view",         label: "Gespeicherte Firmendaten sehen",  Component: DataView },
    // immer verfügbar
    { key: "support",          label: "Support & Kontakt",                Component: SupportContact },
    { key: "login",             label: "Login & Passwort",                Component: LoginData },
  ];

  const [activeKeys, setActiveKeys]   = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/companies/${companyId}/features`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const features = await res.json();
        const keys = features.map((f) => f.key);
        setActiveKeys(keys);
        setSelectedKey(keys.length ? keys[0] : "login");
      } catch (err) {
        console.error("Error loading features:", err);
        setLoadError(err.message);
        setSelectedKey("login");
      } finally {
        setLoading(false);
      }
    }
    if (companyId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, token]);

  // Verfügbare Module: alle freigeschalteten + „login“ immer
  const available = allModules.filter(
    (m) => m.key === "login" || m.key === "support" || activeKeys.includes(m.key)
  );
  const ActiveComponent =
    available.find((m) => m.key === selectedKey)?.Component || null;

  // Theme
  const t = {
    bg: "#0f1115",
    gradientTo: "#0c0f14",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    border: "#2a3040",
    primary: "#e03131",
    sidebar: "rgba(21,25,35,.55)",
    itemHover: "rgba(255,255,255,.06)",
    itemActiveBorder: "rgba(224,49,49,.30)",
    focus: "#5ab0ff",
  };

  let content;
  if (loading) {
    content = <div className="cad-dim">Lade Inhalt …</div>;
  } else if (loadError) {
    content = <div style={{ color: "#ef6464" }}>Fehler: {loadError}</div>;
  } else if (available.length === 0) {
    content = <div className="cad-dim">Keine Module freigeschaltet</div>;
  } else if (!ActiveComponent || typeof ActiveComponent !== "function") {
    content = <div style={{ color: "#ef6464" }}>Modul „{selectedKey}“ nicht gefunden.</div>;
  } else {
    content = <ActiveComponent companyId={companyId} />;
  }

  return (
    <div className="cad-shell">
      <style>{css(t)}</style>

      <nav className="cad-sidebar">
        <div className="cad-side-title">Module</div>

        {loading && <div className="cad-side-note">Lade Module …</div>}
        {loadError && <div className="cad-side-error">Error: {loadError}</div>}
        {!loading && available.length === 0 && (
          <div className="cad-side-note">Keine Module freigeschaltet</div>
        )}

        {!loading &&
          available.map((m) => {
            const active = m.key === selectedKey;
            return (
              <button
                key={m.key}
                type="button"
                className={`cad-item ${active ? "active" : ""}`}
                onClick={() => setSelectedKey(m.key)}
              >
                <span className="cad-icon">{ICONS[m.key] || <FaQuestion size={18} />}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
      </nav>

      <main className="cad-main">
        {/* Wrapper gibt Luft & sorgt für konsistente Typo,
           die eigentlichen Sub‑Module bringen ihre eigenen Cards mit */}
        <div className="cad-content">{content}</div>
      </main>
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Look + Glas) ---------------- */
function css(t) {
  return `
  .cad-shell{
    height:100vh; display:flex; color:${t.text};
    background:
      radial-gradient(900px 420px at 70% -30%, rgba(224,49,49,.18) 0%, rgba(224,49,49,0) 70%),
      radial-gradient(700px 340px at 10% 10%, rgba(90,176,255,.14) 0%, rgba(90,176,255,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, ${t.gradientTo} 100%);
  }

  /* Sidebar – Glas */
  .cad-sidebar{
    width:260px; padding:14px;
    background:${t.sidebar};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    border-right:1px solid ${t.border};
    box-shadow: inset -1px 0 0 rgba(255,255,255,.06);
  }
  .cad-side-title{
    font-size:.95rem; color:${t.textDim}; letter-spacing:.04em;
    margin:4px 8px 10px;
  }
  .cad-side-note{ color:${t.textDim}; margin:6px 8px; }
  .cad-side-error{ color:#ef6464; margin:6px 8px; }

  .cad-item{
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 12px; margin:6px 0; border-radius:10px;
    color:${t.textDim}; background:transparent; border:1px solid transparent;
    cursor:pointer; transition:background .15s ease, color .15s ease, border-color .15s ease;
    text-align:left;
  }
  .cad-item:hover{ background:${t.itemHover}; color:${t.text}; border-color:${t.border}; }
  .cad-item.active{
    color:${t.text};
    background: linear-gradient(180deg, rgba(224,49,49,.16), rgba(224,49,49,.08));
    border:1px solid ${t.itemActiveBorder};
  }
  .cad-icon{ width:20px; display:inline-flex; justify-content:center; }

  /* Main */
  .cad-main{ flex:1; overflow:auto; padding:18px; }
  .cad-content{ max-width:1200px; margin:0 auto; }
  .cad-dim{ color:${t.textDim}; }
  `;
}
