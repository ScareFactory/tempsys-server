// src/pages/UeberUns.js
import React from "react";

export default function UeberUns() {
  const t = {
    bg: "#0f1115",
    surface: "#151923",
    surface2: "#1b2130",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    primary600: "#c42727",
    border: "#2a3040",
    focus: "#5ab0ff",
  };

  const values = [
    { icon: "⚡", title: "Tempo & Pragmatismus", desc: "Wir liefern schnell, testen früh und verbessern kontinuierlich." },
    { icon: "🔒", title: "Sicherheit by Design", desc: "Datenschutz ist kein Add‑on, sondern Teil unserer Architektur." },
    { icon: "🤝", title: "Partnerschaftlich", desc: "Wir bauen mit Kunden, nicht nur für sie – ehrlich & transparent." },
    { icon: "🧩", title: "Modular & offen", desc: "Schnittstellen, Export, Web‑UI – Systeme müssen miteinander sprechen." },
  ];

  const team = [
    { icon: "🧑‍💻", name: "Dev/Backend", blurb: "APIs, Auth, Stabilität." },
    { icon: "🎨", name: "Design/Frontend", blurb: "UX, Komponenten, Micro‑Interactions." },
    { icon: "🛠️", name: "Hardware/IoT", blurb: "Clock‑Firmware & Updates." },
    { icon: "📞", name: "Success", blurb: "Onboarding, Support, Schulung." },
  ];

  const milestones = [
    { y: "Mai 2025", t: "Gründung", d: "Start mit dem Ziel: Zeiterfassung ohne Frust." },
    { y: "August 2025", t: "Stempeluhr V2", d: "Touchscreen + Webinterface, modulare Plattform." },
    { y: "Heute", t: "Skalierung", d: "Rollouts, Integrationen & SLA‑Pakete." },
  ];

  return (
    <main className="ts-about">
      <style>{css(t)}</style>

      {/* HERO */}
      <section className="ab-hero">
        <div className="container">
          <h1>Über uns</h1>
          <p className="lead">
            Jung, fokussiert, produktverliebt. Wir bauen Zeiterfassung, die Teams wirklich gern benutzen.
          </p>
          <div className="cta">
            <a href="/#kontakt" className="btn btn-primary">Mit uns sprechen</a>
            <a href="/produkte" className="btn btn-ghost">Produkte ansehen</a>
          </div>
        </div>
      </section>

      {/* MISSION */}
      <section className="section">
        <div className="container mission">
          <div className="mission-card">
            <h2>Unsere Mission</h2>
            <p>
              Wir entfernen Reibung aus der Arbeitszeiterfassung. Keine Insellösungen,
              keine kryptischen Oberflächen. Stattdessen klare Workflows, starke
              Sicherheit und ein Web‑Interface, das sofort verstanden wird.
            </p>
          </div>
          <ul className="stats">
            <li><strong>~5 Min</strong><span>bis zum Go‑Live</span></li>
            <li><strong>100%</strong><span>Web‑Interface</span></li>
            <li><strong>Modular</strong><span>Features & Integrationen</span></li>
          </ul>
        </div>
      </section>

      {/* VALUES */}
      <section className="section">
        <div className="container">
          <h2>Werte</h2>
          <div className="grid">
            {values.map((v, i) => (
              <article key={i} className="card">
                <div className="icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="section">
        <div className="container">
          <h2>Team</h2>
          <div className="team">
            {team.map((m, i) => (
              <div key={i} className="member">
                <div className="avatar">{m.icon}</div>
                <div>
                  <h4>{m.name}</h4>
                  <p>{m.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MILESTONES */}
      <section className="section">
        <div className="container">
          <h2>Meilensteine</h2>
          <div className="timeline">
            {milestones.map((ms, i) => (
              <div key={i} className="lineItem">
                <div className="dot" />
                <div className="lineContent">
                  <span className="year">{ms.y}</span>
                  <h4>{ms.t}</h4>
                  <p>{ms.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <div className="ctaCard">
            <div>
              <h3>Lust, mit uns zu bauen?</h3>
              <p className="lead">Wir lieben schnelle Iteration und ehrliches Feedback.</p>
            </div>
            <div className="actions">
              <a href="/#kontakt" className="btn btn-primary">Kontakt aufnehmen</a>
              <a href="/#konfigurator" className="btn btn-ghost">Jetzt konfigurieren</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/* ---------- Scoped CSS ---------- */
function css(t) {
  return `
  .ts-about{ background:${t.bg}; color:${t.text}; min-height:100vh; }
  .container{ max-width:1200px; margin:0 auto; padding:0 20px; }

  .ab-hero{
    padding: 80px 0 48px;
    text-align:center;
    background:
      radial-gradient(600px 300px at 70% -50%, rgba(224,49,49,.20) 0%, rgba(224,49,49,0) 70%),
      radial-gradient(500px 240px at 10% 10%, rgba(90,176,255,.15) 0%, rgba(90,176,255,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, #0c0f14 100%);
    border-bottom:1px solid ${t.border};
  }
  .ab-hero h1{ font-size: clamp(2.1rem, 5vw, 3.2rem); margin:0; letter-spacing:-.02em; }
  .lead{ color:${t.textDim}; margin-top:10px; }
  .cta{ margin-top:22px; display:inline-flex; gap:12px; flex-wrap:wrap; }

  .section{ padding: 64px 0; border-bottom:1px solid ${t.border}; }
  .section h2{ margin:0 0 8px; font-size: clamp(1.6rem, 3.2vw, 2rem); }

  .mission{ display:grid; gap:16px; grid-template-columns: 1.3fr .7fr; }
  @media (max-width:900px){ .mission{ grid-template-columns: 1fr; } }
  .mission-card{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:16px; padding:18px;
    box-shadow:0 8px 20px rgba(0,0,0,.25);
  }
  .stats{ list-style:none; margin:0; padding:0; display:grid; gap:12px; }
  .stats li{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:14px; padding:14px; text-align:center;
  }
  .stats strong{ font-size:1.3rem; display:block; }
  .stats span{ color:${t.textDim}; }

  .grid{
    margin-top:18px;
    display:grid; gap:16px;
    grid-template-columns: repeat(4, 1fr);
  }
  @media (max-width:1080px){ .grid{ grid-template-columns: repeat(2, 1fr); } }
  @media (max-width:720px){ .grid{ grid-template-columns: 1fr; } }

  .card{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:16px; padding:18px;
    box-shadow:0 8px 20px rgba(0,0,0,.25);
    transition: transform .05s ease, background-color .2s ease, border-color .2s ease;
    text-align:left;
  }
  .card:hover{ background:${t.surface}; transform: translateY(-1px); }
  .card .icon{ font-size:1.6rem; margin-bottom:8px; color:${t.primary}; }
  .card h3{ margin:0 0 6px; font-size:1.1rem; }
  .card p{ margin:0; color:${t.textDim}; line-height:1.55; }

  .team{ display:grid; gap:12px; grid-template-columns: repeat(2, 1fr); }
  @media (max-width:720px){ .team{ grid-template-columns: 1fr; } }
  .member{
    display:flex; gap:12px; align-items:flex-start;
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px; padding:12px;
  }
  .avatar{
    width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center;
    background:${t.primary}; color:#fff; font-size:1.2rem; font-weight:800;
    box-shadow:0 6px 16px rgba(224,49,49,.25);
    flex:0 0 42px;
  }
  .member h4{ margin:0 0 4px; }
  .member p{ margin:0; color:${t.textDim}; }

  .timeline{ position:relative; margin-top:10px; }
  .lineItem{ position:relative; padding-left:28px; margin:14px 0; }
  .lineItem .dot{
    position:absolute; left:0; top:8px; width:12px; height:12px; border-radius:50%;
    background:${t.primary};
    box-shadow:0 0 0 4px rgba(224,49,49,.18);
  }
  .lineContent .year{ color:${t.textDim}; font-weight:700; margin-right:6px; }
  .lineContent h4{ margin:0 0 4px; }
  .lineContent p{ margin:0; color:${t.textDim}; }

  .ctaCard{
    display:flex; gap:18px; align-items:center; justify-content:space-between;
    background: linear-gradient(90deg, rgba(224,49,49,.16) 0%, rgba(224,49,49,.08) 100%);
    border:1px solid rgba(224,49,49,.25);
    border-radius:18px; padding:20px;
  }
  .actions{ display:flex; gap:12px; flex-wrap:wrap; }

  .btn{
    display:inline-flex; align-items:center; justify-content:center;
    border-radius:10px; padding:12px 18px; font-weight:700;
    border:1px solid transparent; cursor:pointer;
    transition: transform .05s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, color .15s ease;
  }
  .btn:focus{ outline:2px solid ${t.focus}; outline-offset:2px; }
  .btn-primary{ background:${t.primary}; color:#fff; box-shadow:0 6px 16px rgba(224,49,49,.25); }
  .btn-primary:hover{ background:${t.primary600}; }
  .btn-primary:active{ transform: translateY(1px); }
  .btn-ghost{ background:transparent; color:${t.text}; border:1px solid ${t.border}; }
  .btn-ghost:hover{ background:${t.surface}; }
  `;
}
