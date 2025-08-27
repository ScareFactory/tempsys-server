// src/pages/Produkte.js
import React from "react";
import { Check, Cloud, Wifi, Shield, Cpu, Zap } from "lucide-react";
import SecurityInteractive from "../components/SecurityInteractive"; // <— wichtig

export default function Produkte() {
  const theme = {
    bg: "#0f1115", surface: "#151923", surface2: "#1b2130",
    text: "#e6e8ee", textDim: "#b4b9c7", primary: "#e03131",
    primary600: "#c42727", border: "#2a3040", focus: "#5ab0ff",
  };

  const features = [
    { icon: TouchIcon, title: "Touchscreen-Interface", desc: "Bedienung direkt am Gerät – keine App nötig." },
    { icon: Wifi,      title: "Weboberfläche",         desc: "Alle Funktionen laufen im Browser (Admin & Nutzer)." },
    { icon: Cloud,     title: "Server-Sync",           desc: "Synchronisation mit zentralem Server." },
    { icon: Shield,    title: "Offline-Fallback",      desc: "Lokales Logging bei Ausfall, automatische Nachsync." },
    { icon: Cpu,       title: "Modulare Architektur",  desc: "Gerät, Web-Modul und Admin-Panel klar getrennt." },
    { icon: Zap,       title: "Schnelles Setup",       desc: "Einschalten, verbinden, loslegen." },
  ];

  return (
    <div className="ts-prod">
      <style>{css(theme)}</style>

      {/* HERO */}
      <section className="tsp-hero">
        {/* Absolutes Hero-Bild: skaliert leicht, fix an rechts/unten */}
        <div className="tsp-hero-img-abs">
          <img src="/hero_v2.png" alt="TempSys V2 – Render" />
        </div>

        <div className="tsp-container">
          <div className="tsp-hero-grid">
            <div className="tsp-hero-copy">
              <h1>TempSys Stempeluhr <span className="tsp-accent">V2</span></h1>
              <p className="tsp-lead">
                Touchscreen. Webinterface. Präzise Zeiterfassung – intuitiv bedienbar und bereit für Ihr Unternehmen.
              </p>
              <div className="tsp-cta">
                <a href="/#konfigurator" className="btn btn-primary">Jetzt konfigurieren</a>
                <a href="#features" className="btn btn-ghost">Mehr erfahren</a>
              </div>
            </div>

            {/* rechte Spalte bleibt leer – Bild liegt absolut */}
            <div aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section">
        <div className="tsp-container">
          <h2>Wichtigste Features</h2>
          <p className="tsp-lead">Kurz, präzise und auf einen Blick.</p>
          <div className="tsp-grid">
            {features.map((f, i) => (
              <div key={i} className="tsp-card">
                <div className="tsp-card-head"><f.icon className="tsp-icon" /><h3>{f.title}</h3></div>
                <p className="tsp-card-text">{f.desc}</p>
                <div className="tsp-proof"><Check className="tsp-proof-icon" /><span>{f.proof}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SICHERHEIT – Interaktive Demo */}
      <section className="section">
        <div className="tsp-container">
          <SecurityInteractive />
        </div>
      </section>

      {/* CTA Abschluss */}
      <section className="section">
        <div className="tsp-container">
          <div className="tsp-cta-card">
            <div>
              <h3>Bereit für V2?</h3>
              <p className="tsp-lead">Fragen Sie eine Demo an oder sprechen Sie mit uns über Ihren Rollout.</p>
            </div>
            <div className="tsp-cta-actions">
              <a href="/#kontakt" className="btn btn-primary">Demo anfragen</a>
              <a href="/#services" className="btn btn-ghost">Services ansehen</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function TouchIcon(props) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
      <circle cx="12" cy="18" r="1.5" />
    </svg>
  );
}

/* ---------- Scoped CSS (Generator) ---------- */
function css(t) {
  return `
    .ts-prod{ background:${t.bg}; color:${t.text}; min-height:100vh; }
    .tsp-container{ max-width:1200px; margin:0 auto; padding:0 20px; }

    /* HERO höher + weicher Verlauf */
    .tsp-hero{
      --hero-img-scale: .90;              /* Desktop: leichte Verkleinerung */
      position:relative;
      overflow:hidden;
      background:
        radial-gradient(600px 300px at 70% -50%, ${hexA(t.primary, .20)} 0%, rgba(0,0,0,0) 70%),
        radial-gradient(500px 240px at 10% 10%, ${hexA(t.focus, .15)} 0%, rgba(0,0,0,0) 70%),
        linear-gradient(180deg, ${t.bg} 0%, #0c0f14 100%);
      border-bottom:1px solid ${t.border};
      padding:120px 0 80px;               /* vorher 80px 0 40px */
      min-height: 520px;                   /* mehr Platz für das Bild */
    }

    /* ABSOLUTES HERO-BILD – fix an rechts/unten, skaliert von unten rechts */
    .tsp-hero-img-abs{
      position:absolute;
      right:0;
      bottom:0;
      z-index:0;
      line-height:0;
      pointer-events:none;
    }
    .tsp-hero-img-abs img{
      display:block;
      width:auto;
      height:auto;
      max-width:none;
      max-height:none;
      transform-origin: bottom right;
      transform: scale(var(--hero-img-scale)); /* dezente Skalierung */
    }

    /* Text über dem Bild halten */
    .tsp-hero .tsp-container{ position:relative; z-index:1; }

    .tsp-hero-grid{ display:grid; grid-template-columns: 1.1fr 1fr; gap:40px; align-items:center; }
    @media (max-width: 1280px){
      .tsp-hero{ --hero-img-scale:.84; padding:110px 0 72px; }
    }
    @media (max-width: 1024px){
      .tsp-hero{ --hero-img-scale:.78; padding:100px 0 64px; }
    }
    @media (max-width: 960px){
      .tsp-hero-grid{ grid-template-columns: 1fr; }
      .tsp-hero-img-abs{ display:none; } /* optional: auf kleinen Screens ausblenden */
    }

    .tsp-hero-copy h1{
      font-size: clamp(2.2rem, 5vw, 3.4rem);
      line-height: 1.05; letter-spacing: -0.02em; margin:0;
    }
    .tsp-accent{ color:${t.primary}; }
    .tsp-lead{ color:${t.textDim}; margin-top:12px; }
    .tsp-cta{ margin-top:24px; display:flex; gap:12px; flex-wrap:wrap; }

    .section{ padding:56px 0; border-bottom:1px solid ${t.border}; }
    .section h2{ font-size: clamp(1.6rem, 3.2vw, 2rem); margin:0 0 8px; }

    .tsp-grid{ margin-top:18px; display:grid; gap:16px; grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 1080px){ .tsp-grid{ grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 720px){ .tsp-grid{ grid-template-columns: 1fr; } }

    .tsp-card{ background:${t.surface2}; border:1px solid ${t.border}; border-radius:16px; padding:16px;
               transition: transform .05s ease, box-shadow .15s ease, background-color .2s ease, border-color .2s ease;
               box-shadow: 0 8px 20px rgba(0,0,0,.25); }
    .tsp-card:hover{ background:${t.surface}; transform: translateY(-1px); }

    .tsp-card-head{ display:flex; align-items:center; gap:10px; }
    .tsp-card-head h3{ margin:0; font-size:1.05rem; }
    .tsp-card-text{ margin:8px 0 0; color:${t.textDim}; }

    .tsp-icon{ width:20px; height:20px; }
    .tsp-proof{ margin-top:10px; display:inline-flex; align-items:center; gap:8px; color:${mix(t.primary, "#ffffff", .35)}; }
    .tsp-proof-icon{ width:16px; height:16px; }

    .tsp-cta-card{
      display:flex; gap:18px; align-items:center; justify-content:space-between;
      background: linear-gradient(90deg, ${hexA(t.primary,.16)} 0%, ${hexA(t.primary,.08)} 100%);
      border:1px solid ${hexA(t.primary,.25)};
      border-radius:18px; padding:20px;
    }
    .tsp-cta-card h3{ margin:0 0 6px; font-size:1.25rem; }
    .tsp-cta-actions{ display:flex; gap:12px; flex-wrap:wrap; }

    .btn{ display:inline-flex; align-items:center; justify-content:center; border-radius:10px; padding:12px 18px;
          font-weight:600; border:1px solid transparent; cursor:pointer;
          transition: transform .05s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, color .15s ease; }
    .btn:focus{ outline:2px solid ${t.focus}; outline-offset:2px; }
    .btn-primary{ background:${t.primary}; color:#fff; box-shadow:0 6px 16px rgba(224,49,49,.25); }
    .btn-primary:hover{ background:${t.primary600}; }
    .btn-primary:active{ transform: translateY(1px); }
    .btn-ghost{ background:transparent; color:${t.text}; border-color:${t.border}; }
    .btn-ghost:hover{ background:${t.surface}; }
  `;
}

function hexA(hex,a){const c=hex.replace("#","");const b=parseInt(c,16);const r=(b>>16)&255;const g=(b>>8)&255;const d=b&255;return `rgba(${r}, ${g}, ${d}, ${a})`}
function mix(h1,h2,w=0.5){const c1=hexToRgb(h1),c2=hexToRgb(h2);const r=Math.round(c1.r*(1-w)+c2.r*w);const g=Math.round(c1.g*(1-w)+c2.g*w);const b=Math.round(c1.b*(1-w)+c2.b*w);return rgbToHex(r,g,b)}
function hexToRgb(hex){const c=hex.replace("#","");return { r:parseInt(c.substr(0,2),16), g:parseInt(c.substr(2,2),16), b:parseInt(c.substr(4,2),16) } }
function rgbToHex(r,g,b){ return "#"+[r,g,b].map(x=>x.toString(16).padStart(2,"0")).join(""); }
