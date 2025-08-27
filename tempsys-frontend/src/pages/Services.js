// src/pages/Services.js
import React from "react";

export default function Services() {
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

  const services = [
    { icon: "⚙️", title: "Einrichtung & Rollout", desc: "Beratung, Geräteeinrichtung, Standortplanung und Go‑Live‑Begleitung." },
    { icon: "🛡️", title: "Wartung & Support", desc: "Regelmäßige Updates, Monitoring und direkter Ansprechpartner." },
    { icon: "☁️", title: "Cloud‑Hosting", desc: "Betrieb in der TempSys‑Cloud inkl. Backup & Updates." },
    { icon: "🏷️", title: "Branding & Custom UI", desc: "Startbildschirm, Logo, Farben und Touch‑Workflows nach Wunsch." },
    { icon: "🧭", title: "Prozessberatung", desc: "Arbeitszeit‑Regeln, Pausenmodelle, Abwesenheiten, Monatsläufe." },
    { icon: "🔗", title: "Schnittstellen", desc: "Export in Lohn/Buchhaltung, Webhooks, CSV/Excel, API‑Anbindung." },
  ];

  const steps = [
    { n: 1, title: "Kickoff", desc: "Ziele, Standorte, Nutzer‑Rollen und Daten klären." },
    { n: 2, title: "Setup", desc: "Geräte konfigurieren, Web‑UI & Rechte einrichten." },
    { n: 3, title: "Pilot", desc: "Kleiner Start, Feedbackschleife, Feintuning." },
    { n: 4, title: "Rollout", desc: "Ausrollen, Schulung, Übergabe an Betrieb." },
  ];

  return (
    <main className="ts-sv">
      <style>{css(t)}</style>

      {/* HERO */}
      <section className="sv-hero">
        <div className="container">
          <h1>Services</h1>
          <p className="lead">
            Von der Einrichtung bis zur Integration – wir begleiten Ihren gesamten Weg mit TempSys.
          </p>
          <div className="cta">
            <a href="/#kontakt" className="btn btn-primary">Beratung anfragen</a>
            <a href="/produkte" className="btn btn-ghost">Produkte ansehen</a>
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="section">
        <div className="container">
          <h2>Was wir anbieten</h2>
          <p className="lead">Ein Auszug typischer Pakete – individuell kombinierbar.</p>

          <div className="grid">
            {services.map((s, i) => (
              <article key={i} className="card">
                <div className="icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ABLAUF */}
      <section className="section">
        <div className="container">
          <h2>Roadmap</h2>
          <div className="steps">
            {steps.map((st) => (
              <div key={st.n} className="step">
                <div className="bullet">{st.n}</div>
                <div>
                  <h4>{st.title}</h4>
                  <p>{st.desc}</p>
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
              <h3>Nächster Schritt?</h3>
              <p className="lead">Wir schnüren Ihnen ein passendes Service‑Paket – schnell & transparent.</p>
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
  .ts-sv{ background:${t.bg}; color:${t.text}; min-height:100vh; }
  .container{ max-width:1200px; margin:0 auto; padding:0 20px; }

  .sv-hero{
    padding: 80px 0 48px;
    background:
      radial-gradient(600px 300px at 70% -50%, rgba(224,49,49,.20) 0%, rgba(224,49,49,0) 70%),
      radial-gradient(500px 240px at 10% 10%, rgba(90,176,255,.15) 0%, rgba(90,176,255,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, #0c0f14 100%);
    border-bottom:1px solid ${t.border};
    text-align:center;
  }
  .sv-hero h1{ font-size: clamp(2.1rem, 5vw, 3.2rem); margin:0; letter-spacing:-.02em; }
  .lead{ color:${t.textDim}; margin-top:10px; }
  .cta{ margin-top:22px; display:inline-flex; gap:12px; flex-wrap:wrap; }

  .section{ padding: 64px 0; border-bottom:1px solid ${t.border}; }
  .section h2{ margin:0 0 8px; font-size: clamp(1.6rem, 3.2vw, 2rem); }
  .grid{
    margin-top:18px;
    display:grid; gap:16px;
    grid-template-columns: repeat(3, 1fr);
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

  .steps{ display:grid; gap:12px; margin-top:10px; }
  .step{ display:flex; gap:12px; align-items:flex-start; background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px; padding:12px; }
  .bullet{
    width:28px; height:28px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    background:${t.primary}; color:#fff; font-weight:800;
    box-shadow:0 6px 16px rgba(224,49,49,.25);
  }
  .step h4{ margin:0 0 4px; }
  .step p{ margin:0; color:${t.textDim}; }

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

  .btn-primary{
    background:${t.primary};
    color:#fff;
    box-shadow:0 6px 16px rgba(224,49,49,.25);
    border:1px solid transparent; /* <<< Fix gegen roten Balken */
  }
  .btn-primary:hover{ background:${t.primary600}; }
  .btn-primary:active{
    transform: translateY(1px);
    border:1px solid transparent; /* Sicherheit: auch aktiv kein Balken */
  }

  .btn-ghost{
    background:transparent;
    color:${t.text};
    border:1px solid ${t.border};
  }
  .btn-ghost:hover{ background:${t.surface}; }
  `;
}
