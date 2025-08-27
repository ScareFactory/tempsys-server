// src/components/SecurityInteractive.jsx
import React, { useId, useRef, useState } from "react";
import { Shield, Lock, Server, Wifi, Zap } from "lucide-react";

/** ===== Konfiguration ===== */
const BASE = { width: 576, height: 576 };                 // Bildgröße (px)
const IMG  = { normal: "/normal.png", safemode: "/safemode.png" };

/** Hotspots – finale Koordinaten in % */
const HOTSPOTS = [
  { key: "power",   label: "Stromversorgung", x: "24%", y: "35%", short: "Schutz bei Stromereignissen", long: "Bei Stromunterbrechung oder Manipulation wird der Datenbereich sofort sicher geschlossen." },
  { key: "usbhdmi", label: "USB / HDMI",      x: "52%", y: "85%", short: "Anschlüsse abgesichert",     long: "Externe Ports erlauben keinen direkten Datenzugriff. Unautorisierte Nutzung aktiviert den Schutzmodus." },
  { key: "display", label: "Display & Web",   x: "71%", y: "57%", short: "Geschützte Schnittstelle",   long: "Interaktion nur nach autorisierter Server-Freigabe – temporär, nachvollziehbar und entziehbar." },
  { key: "sd",      label: "SD-Karte",        x: "30%", y: "22%", short: "Datenträger verschlüsselt",  long: "Auf Speichermedien liegen ausschließlich verschlüsselte Inhalte. Ohne Freigabe bleiben sie unlesbar." },
];

/** Stichpunkte rechts (mit Unterstichpunkten) */
const POINTS = [
  {
    icon: Shield,
    text: "Mehrschichtiges Schutzkonzept mit serverseitiger Freigabe",
    sub: [
      "Aktionen nur nach AuthZ im Backend (rollenbasiert).",
      "Least-Privilege: Freigaben sind eng begrenzt."
    ]
  },
  {
    icon: Lock,
    text: "Verschlüsselung at rest & nur temporäre Entschlüsselung",
    sub: [
      "Schlüsselverwaltung serverseitig – keine Klartext-Keys am Gerät.",
      "Session-Keys mit Timeout & Auto-Widerruf."
    ]
  },
  {
    icon: Server,
    text: "Zentral gesteuerte Richtlinien & Audit-Fähigkeit",
    sub: [
      "Policy-Rollouts & Remote-Disable möglich.",
      "Manipulationssichere Logs für Nachvollziehbarkeit."
    ]
  },
  {
    icon: Wifi,
    text: "Härtung von Schnittstellen und Kommunikation",
    sub: [
      "TLS-gesichert, signierte Payloads & Replay-Schutz.",
      "Nur whitelisted Endpunkte, keine offenen Ports."
    ]
  },
  {
    icon: Zap,
    text: "Ereignisgesteuerter Schutzmodus bei Auffälligkeiten",
    sub: [
      "Port-/Zugriffsereignisse triggern Lockdown.",
      "Automatische Rückkehr nach Freigabe."
    ]
  }
];

/**
 * Standalone-Komponente:
 * - Bild-Card im Glaslook mit mittigem, pulsierendem roten Glow darunter
 * - Rote animierte Punkte (Hotspots) auf dem Bild
 * - Details erscheinen UNTER den Stichpunkten (rechte Spalte)
 * - Solange Details offen sind → safemode.png sichtbar
 * - Theme per Prop `theme` (wie auf deiner Produkte-Seite) + `scale`-Prop für Größe
 */
export default function SecurityInteractive({ title = "Sicherheitskonzept – interaktiv", theme, scale = 1.0 }) {
  const t = withFallbackTheme(theme);
  const [activeKey, setActiveKey] = useState(null);
  const descId = useId();
  const stageRef = useRef(null);

  const W = Math.round(BASE.width * scale);
  const H = Math.round(BASE.height * scale);
  const active = HOTSPOTS.find(h => h.key === activeKey) || null;

  // Alt+Klick: %-Koordinaten für Finetuning kopieren
  function handleStageAltClick(e) {
    if (!e.altKey || !stageRef.current) return;
    if (e.target.closest("button")) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%";
    const y = (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%";
    const msg = `{ x: "${x}", y: "${y}" }`;
    console.log("Hotspot @", msg);
    try { navigator.clipboard?.writeText(msg); } catch {}
  }

  return (
    <section className="tsi-wrap">
      <style>{styles(t)}</style>

      <div className="tsi-card">
        {/* Kopf */}
        <div className="tsi-card-head">
          <h2>{title}</h2>
          <p className="lead">
            Klicke auf die Punkte, um zu sehen, wie TempSys unbefugten Zugriff verhindert.
            <span className="dim"> (Alt + Klick zeigt Koordinaten)</span>
          </p>
        </div>

        {/* Inhalt: links Bild-Card (Glass + Glow), rechts Stichpunkte + Detail */}
        <div className="tsi-card-body">
          {/* Bild-Card */}
          <div
            ref={stageRef}
            className="si-stage"
            style={{ width: `${W}px`, height: `${H}px` }}
            onClick={handleStageAltClick}
          >
            <img
              src={active ? IMG.safemode : IMG.normal}
              alt="TempSys-Gerät"
              className="si-img"
            />

            {HOTSPOTS.map((h) => (
              <button
                key={h.key}
                className="si-dot"
                style={{
                  left: h.x, top: h.y,
                  "--dot": t.primary,
                  "--dotRing": hexA(t.primary, .25),
                  "--dotBorder": hexA(t.primary, .6)
                }}
                title={`${h.label}: ${h.short}`}
                aria-describedby={descId}
                onClick={() => setActiveKey(h.key)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setActiveKey(h.key)}
              >
                <span className="vh">{h.label}: {h.short}</span>
              </button>
            ))}
          </div>

          {/* Rechte Spalte */}
          <div className="si-side" id={descId}>
            {/* Stichpunkte mit Unterpunkten */}
            <div className="si-points">
              {POINTS.map((p, i) => (
                <div key={i} className="si-point">
                  <p.icon className="si-point-ico" />
                  <div>
                    <div className="si-point-text">{p.text}</div>
                    {p.sub && p.sub.length > 0 && (
                      <ul className="si-sublist">
                        {p.sub.map((s, j) => (<li key={j}>{s}</li>))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Detail-Card darunter */}
            <div className="si-detail">
              {!active ? (
                <div className="si-detail-empty">
                  Hotspot auf dem Bild anklicken, um Details zu sehen.
                </div>
              ) : (
                <div className="si-detail-content">
                  <div className="si-detail-head">
                    <h3>{active.label}</h3>
                    <button className="si-close" onClick={() => setActiveKey(null)} aria-label="Schließen">✕</button>
                  </div>
                  <div className="si-detail-sub">{active.short}</div>
                  <div className="si-detail-text">{active.long}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== Styles (Theme-angepasst) ===== */
function styles(t) {
  return `
  .tsi-wrap{ color:${t.text}; }
  .tsi-card{
    max-width: 1200px; margin:0 auto;
    background:
      radial-gradient(600px 300px at 70% -50%, ${hexA(t.primary,.12)} 0%, transparent 70%),
      radial-gradient(420px 220px at 10% 10%, ${hexA(t.focus,.10)} 0%, transparent 70%),
      ${t.surface2};
    border:1px solid ${t.border};
    border-radius:18px;
    box-shadow: 0 18px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
    overflow:hidden;
  }
  .tsi-card-head{ padding:22px 22px 0; }
  .tsi-card-head h2{ margin:0 0 6px; font-size: clamp(1.6rem, 3vw, 2rem); }
  .tsi-card-head .lead{ margin:0; color:${t.textDim}; }
  .tsi-card-head .dim{ color:${mix(t.textDim,'#9aa3b2',.6)}; }

  .tsi-card-body{
    display:grid; grid-template-columns: 1.35fr 1fr; gap:22px;
    padding: 16px 16px 18px;
  }
  @media (max-width: 980px){ .tsi-card-body{ grid-template-columns:1fr; } }

  /* —— Bild-Card (Glass) mit mittigem, pulsierendem roten Glow —— */
  .si-stage{
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background:
      radial-gradient(420px 220px at 15% 10%, ${hexA(t.focus,.10)} 0%, transparent 70%),
      radial-gradient(380px 200px at 85% 90%, ${hexA(t.primary,.12)} 0%, transparent 75%),
      ${t.surface};
    border: 1px solid ${hexA('#ffffff',.06)};
    backdrop-filter: blur(8px);
    box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.04);
  }
  .si-stage::after{
    content:"";
    position:absolute; left:50%; bottom:-6px; transform:translateX(-50%);
    width:min(70%,560px); height:28px;
    background: radial-gradient(ellipse at center, ${hexA(t.primary,.55)} 0%, rgba(0,0,0,0) 70%);
    filter: blur(14px); opacity:.75; animation: siGlow 2.8s ease-in-out infinite;
    pointer-events:none;
  }
  @keyframes siGlow { 0%,100%{opacity:.55} 50%{opacity:.9} }

  .si-img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; background:#0f172a; }

  /* —— Rote Dots —— */
  .si-dot{
    position:absolute; transform: translate(-50%, -50%);
    width:14px; height:14px; border-radius:999px;
    background: var(--dot);
    box-shadow: 0 0 0 6px var(--dotRing);
    border:none; cursor:pointer;
  }
  .si-dot::after{
    content:""; position:absolute; inset:-2px; border-radius:inherit;
    border: 2px solid var(--dotBorder);
    animation: siPing 1.8s cubic-bezier(.2,.8,.2,1) infinite;
  }
  .si-dot:focus-visible{ outline:2px solid ${mix(t.primary,'#ffffff',.35)}; outline-offset:4px; }
  @keyframes siPing { 0%{transform:scale(1); opacity:.9} 80%{transform:scale(2.3); opacity:0} 100%{opacity:0} }

  /* —— Rechte Spalte —— */
  .si-side{ display:flex; flex-direction:column; gap:16px; padding-top:4px; }
  .si-points{ display:grid; gap:14px; align-content:start; }
  .si-point{ display:grid; grid-template-columns:22px 1fr; gap:10px; align-items:flex-start; }
  .si-point-ico{ width:18px; height:18px; color:${mix(t.primary,'#ffffff',.25)}; margin-top:2px; }
  .si-point-text{ color:${t.text}; font-weight:600; }
  .si-sublist{ margin-top:6px; margin-left:22px; color:${t.textDim}; display:grid; gap:4px; list-style: disc; }

  .si-detail{
    border:1px solid ${t.border};
    border-radius:14px;
    background: linear-gradient(180deg, ${hexA('#ffffff',.04)}, ${hexA('#ffffff',.01)}), ${t.surface};
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 8px 24px rgba(0,0,0,.25);
    padding:14px; min-height:112px;
  }
  .si-detail-empty{ color:${t.textDim}; font-size:.95rem; }
  .si-detail-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
  .si-detail-head h3{ margin:0; font-size:1.05rem; }
  .si-detail-sub{ margin-top:4px; color:${mix(t.primary,'#ffffff',.35)}; font-weight:600; }
  .si-detail-text{ margin-top:6px; color:${t.textDim}; line-height:1.35; }
  .si-close{ background:transparent; border:none; color:${t.textDim}; cursor:pointer; }
  .si-close:hover{ color:${t.text}; }

  /* SR-only */
  .vh{ position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
  `;
}

/* ===== Utils + Theme-Fallback ===== */
function withFallbackTheme(t){
  return t ?? {
    bg: "#0f1115", surface: "#151923", surface2: "#1b2130",
    text: "#e6e8ee", textDim: "#b4b9c7", primary: "#e03131",
    primary600: "#c42727", border: "#2a3040", focus: "#5ab0ff",
  };
}
function hexA(hex,a){const c=hex.replace("#","");const b=parseInt(c,16);const r=(b>>16)&255;const g=(b>>8)&255;const d=b&255;return `rgba(${r}, ${g}, ${d}, ${a})`;}
function mix(h1,h2,w=0.5){const c1=hexToRgb(h1),c2=hexToRgb(h2);const r=Math.round(c1.r*(1-w)+c2.r*w);const g=Math.round(c1.g*(1-w)+c2.g*w);const b=Math.round(c1.b*(1-w)+c2.b*w);return rgbToHex(r,g,b);}
function hexToRgb(hex){const c=hex.replace("#","");return {r:parseInt(c.substr(0,2),16),g:parseInt(c.substr(2,2),16),b:parseInt(c.substr(4,2),16)};}
function rgbToHex(r,g,b){return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join("");}
