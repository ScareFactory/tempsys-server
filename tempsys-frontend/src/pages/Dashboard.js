// src/pages/Dashboard.js

import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import MyAppointments from "../components/MyAppointments";
import MyAbsences from "../components/MyAbsences";
import MyTimes from "../components/MyTimes";
import MyLoginData from "../components/LoginData";
import MyMessages from "../components/MyMessages";
import MyZeitkonto from "../components/MyZeitkonto"; // ✅ Zeitkonto
import {
  FaCalendarAlt,
  FaBed,
  FaClock,
  FaKey,
  FaEnvelope,
  FaChartLine,
} from "react-icons/fa";

export default function Dashboard() {
  const { token } = useContext(AuthContext);
  const [activeKey, setActiveKey] = useState("appointments");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetch("/api/schedule/swap-requests", {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setPendingCount(Array.isArray(data) ? data.length : 0))
      .catch((err) => {
        console.error("Fehler beim Laden der Nachrichten:", err);
      });
  }, [token]);

  const modules = [
    { key: "appointments", label: "Meine Termine",  icon: <FaCalendarAlt size={18} />, Component: MyAppointments },
    { key: "absences",     label: "Meine Abwesenheiten", icon: <FaBed size={18} />,       Component: MyAbsences },
    { key: "times",        label: "Meine Zeiten",   icon: <FaClock size={18} />,         Component: MyTimes },
    { key: "zeitkonto",    label: "Zeitkonto",      icon: <FaChartLine size={18} />,     Component: MyZeitkonto },
    {
      key: "messages",
      label: "Meine Nachrichten",
      icon: <FaEnvelope size={18} style={{ color: pendingCount > 0 ? "#e03131" : "inherit" }} />,
      Component: MyMessages,
    },
    { key: "logindata", label: "Logindaten", icon: <FaKey size={18} />, Component: MyLoginData },
  ];

  const ActiveComponent = modules.find((m) => m.key === activeKey)?.Component || null;

  // Theme wie CompanyAdminDashboard
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
  };

  return (
    <div className="cad-shell">
      <style>{css(t)}</style>

      {/* Sidebar */}
      <nav className="cad-sidebar">
        <div className="cad-side-title">Bereiche</div>

        {modules.map((m) => {
          const active = m.key === activeKey;
          return (
            <button
              key={m.key}
              type="button"
              className={`cad-item ${active ? "active" : ""}`}
              onClick={() => setActiveKey(m.key)}
            >
              <span className="cad-icon">{m.icon}</span>
              <span>{m.label}</span>

              {m.key === "messages" && pendingCount > 0 && (
                <span className="cad-badge">{pendingCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Main */}
      <main className="cad-main">
        <div className="cad-content">
          {ActiveComponent ? <ActiveComponent /> : <div className="cad-dim">Modul nicht gefunden.</div>}
        </div>
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

  .cad-item{
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 12px; margin:6px 0; border-radius:10px;
    color:${t.textDim}; background:transparent; border:1px solid transparent;
    cursor:pointer; transition:background .15s ease, color .15s ease, border-color .15s ease;
    text-align:left; position:relative;
  }
  .cad-item:hover{ background:${t.itemHover}; color:${t.text}; border-color:${t.border}; }
  .cad-item.active{
    color:${t.text};
    background: linear-gradient(180deg, rgba(224,49,49,.16), rgba(224,49,49,.08));
    border:1px solid ${t.itemActiveBorder};
  }
  .cad-icon{ width:20px; display:inline-flex; justify-content:center; }

  .cad-badge{
    margin-left:auto;
    font-size:.75rem; line-height:1;
    color:#fff; background:${t.primary};
    border-radius:999px; padding:2px 7px;
    border:1px solid rgba(255,255,255,.15);
  }

  /* Main */
  .cad-main{ flex:1; overflow:auto; padding:18px; }
  .cad-content{ max-width:1200px; margin:0 auto; }
  .cad-dim{ color:${t.textDim}; }
  `;
}
