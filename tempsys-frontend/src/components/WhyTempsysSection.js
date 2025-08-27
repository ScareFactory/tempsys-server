// src/components/WhyTempsysSection.js
import React from "react";

const features = [
  { title: "Schnell & einfach", description: "In nur 5 Minuten einsatzbereit – keine Vorkenntnisse nötig.", icon: "⏱️" },
  { title: "DSGVO-konform", description: "Alle Daten bleiben sicher und lokal auf deutschen Servern.", icon: "🔒" },
  { title: "Live-Dashboard", description: "Behalten Sie jederzeit den Überblick über alle Zeiten.", icon: "🖥️" },
  { title: "Modular anpassbar", description: "Funktionen wie Urlaub, Dienstgang, Abwesenheit integrierbar.", icon: "⚙️" },
  { title: "Cloudbasiert", description: "Zugriff von überall – egal ob im Büro oder Homeoffice.", icon: "☁️" },
  { title: "Sichere Backups", description: "Automatische Sicherungen schützen Ihre Daten zuverlässig.", icon: "💾" },
];

const WhyTempsysSection = () => {
  const t = {
    bg: "#0f1115",
    surface: "#151923",
    surface2: "#1b2130",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    border: "#2a3040",
  };

  return (
    <section className="ts-why">
      {/* Scoped CSS nur für diese Section – kein externer CSS-Import */}
      <style>{css(t)}</style>

      <div className="ts-container">
        <h2 className="ts-title">Warum TempSys?</h2>
        <p className="ts-lead">
          Skalierbar, sicher und sofort einsatzbereit – perfekt für Teams jeder Größe.
        </p>

        <div className="ts-grid">
          {features.map((f, i) => (
            <article key={i} className="ts-card">
              <div className="ts-icon">{f.icon}</div>
              <h3 className="ts-card-title">{f.title}</h3>
              <p className="ts-card-desc">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyTempsysSection;

/* ---------------- Scoped CSS ---------------- */
function css(t) {
  return `
  /* MEHR VERTIKALER PLATZ */
  .ts-why{
    padding: 96px 0; /* vorher 56px */
    background:
      radial-gradient(420px 220px at 10% 0%, rgba(224,49,49,.12) 0%, rgba(0,0,0,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, #0c0f14 100%);
    border-top: 1px solid ${t.border};
    border-bottom: 1px solid ${t.border};
    color: ${t.text};
  }
  .ts-container{ max-width: 1200px; margin: 0 auto; padding: 0 20px; }
  .ts-title{
    text-align: center; margin: 0; font-size: clamp(1.9rem, 3.8vw, 2.3rem);
  }
  .ts-lead{
    text-align: center;
    margin: 14px auto 28px; /* mehr Abstand unter dem Untertitel */
    max-width: 820px;
    color: ${t.textDim};
  }

  .ts-grid{
    display: grid;
    gap: 24px; /* vorher 16px */
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 1080px){ .ts-grid{ grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 720px){
    .ts-grid{ grid-template-columns: 1fr; }
    .ts-why{ padding: 80px 0; } /* mobil etwas kompakter, aber immer noch höher */
  }

  /* HÖHERE KARTEN */
  .ts-card{
    background: ${t.surface2};
    border: 1px solid ${t.border};
    border-radius: 16px; /* minimal größer */
    padding: 26px;       /* vorher 18px */
    min-height: 190px;   /* sorgt für mehr vertikale Höhe */
    text-align: center;
    box-shadow: 0 8px 20px rgba(0,0,0,.25);
    transition: transform .05s ease, background-color .2s ease, border-color .2s ease;
    display: flex; flex-direction: column; justify-content: center; /* Inhalt mittig */
  }
  .ts-card:hover{ background: ${t.surface}; transform: translateY(-1px); }

  .ts-icon{ font-size: 2rem; margin-bottom: 12px; color: ${t.primary}; }
  .ts-card-title{ margin: 0 0 8px; font-size: 1.12rem; }
  .ts-card-desc{ margin: 0; color: ${t.textDim}; line-height: 1.55; }
  `;
}
