// src/components/Homepage.jsx
import React from "react";
import GlyphPanel from "./GlyphPanel"; // rein visuell, ohne Live-Daten

export default function Homepage({ onOpenKonfigurator }) {
  const t = {
    bg: "linear-gradient(180deg, #0F131B 0%, #0B0F16 100%)",
    glass: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
    border: "rgba(255,255,255,.16)",
    text: "#E6E8EE",
    dim: "#B4B9C7",
    red: "#E03131",
    blue: "#4CC3FF",
    cyan: "#5DE1FF",
    glowRed: "rgba(224,49,49,.55)",
    glowBlue: "rgba(80,190,255,.45)",
  };

  return (
    <>
      <style>{css(t)}</style>
      <main className="hp">
        {/* ---------------- HERO (zweispaltig, ohne sensible Infos) ---------------- */}
        <section className="hero">
          <div className="bg-halo" />
          <div className="wrap">
            <div className="hero__left">
              <div className="badge">
                <span className="dot" />
                Zeiterfassung, die sich an dich anpasst
              </div>

              <h1>
                TempSys<span className="accent">.</span>
                <br />
                Smarte Stempeluhr im <span className="grad">Glas‑Look</span>
              </h1>

              <p className="lead">
                Ein modernes System für zuverlässiges Stempeln und klare Auswertungen.
                Fokus auf Alltagstauglichkeit, Übersicht und Datenschutz.
              </p>

              <div className="cta">
                <button className="btn btn-primary" onClick={onOpenKonfigurator}>
                  Jetzt konfigurieren
                </button>
                <a className="btn btn-ghost" href="/impressum">Über TempSys</a>
              </div>

              {/* kurzes, unverfängliches Highlight-Band */}
              <ul className="ribbon">
                <li>Intuitive Bedienung</li>
                <li>Klares Design</li>
                <li>Flexible Konfiguration</li>
                <li>Transparente Exporte</li>
              </ul>
            </div>

            <div className="hero__right">
              {/* Gestapelte, neutrale Glas-Karten */}
              <div className="card-stack">
                <div className="card big">
                  <h3>Interaktive Visuals</h3>
                  <p className="muted">Rein visuelle Animation – keine Systemdaten</p>
                  <div className="visWrap">
                    <GlyphPanel pattern="sync" intensity={1} />
                  </div>
                </div>

                <div className="card small usp3">
                  <div>
                    <span className="kpi">Klar</span>
                    <small>Übersichtliche Oberfläche</small>
                  </div>
                  <div>
                    <span className="kpi">Fokus</span>
                    <small>Auf das Wesentliche reduziert</small>
                  </div>
                  <div>
                    <span className="kpi">Modular</span>
                    <small>Features nach Bedarf</small>
                  </div>
                </div>

                <div className="card tag">
                  <span className="pill">Clean UI</span>
                  <span className="pill pill--cyan">Glas‑Optik</span>
                  <span className="pill pill--red">Dark Mode</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- INFO‑MOSAIC (neutral formuliert) ---------------- */}
        <section className="mosaic">
          <div className="wrap grid">
            <article className="tile a">
              <h4>Einfach starten</h4>
              <p>Schritt‑für‑Schritt eingerichtet und sofort nutzbar.</p>
              <ul>
                <li>Klare Oberfläche</li>
                <li>Kurze Einweisung ausreichend</li>
              </ul>
            </article>

            <article className="tile b">
              <h4>Flexibel anpassbar</h4>
              <p>Optionen, die du wirklich brauchst – ohne Ballast.</p>
              <ul>
                <li>Konfigurierbare Regeln</li>
                <li>Individuelle Rollen</li>
              </ul>
            </article>

            <article className="tile c">
              <h4>Saubere Exporte</h4>
              <p>Klare Dateien für Auswertung und Archiv.</p>
              <ul>
                <li>Monatliche Zusammenfassungen</li>
                <li>Transparente Struktur</li>
              </ul>
            </article>

            <article className="tile d">
              <h4>Klare Kommunikation</h4>
              <p>Hinweise und Statusmeldungen, die verständlich sind.</p>
              <ul>
                <li>Deutliches Feedback</li>
                <li>Sinnvolle Bestätigungen</li>
              </ul>
            </article>

            <article className="tile e">
              <h4>Wert auf Datenschutz</h4>
              <p>Zurückhaltende Datendarstellung und klare Verantwortlichkeiten.</p>
              <ul>
                <li>Nur notwendige Informationen</li>
                <li>Transparente Prozesse</li>
              </ul>
            </article>
          </div>
        </section>

        {/* ---------------- SECTION: Für wen ist TempSys? ---------------- */}
        <section className="target">
          <div className="wrap tgrid">
            <div className="tcard">
              <h3>Teams</h3>
              <p className="muted">Schnell verstanden, schnell im Alltag akzeptiert.</p>
              <ul>
                <li>Klare Anzeige beim Stempeln</li>
                <li>Wenige, sinnvolle Schritte</li>
              </ul>
            </div>
            <div className="tcard">
              <h3>Leitung</h3>
              <p className="muted">Ein Blick genügt: Was ist wichtig, was fehlt.</p>
              <ul>
                <li>Übersichtliche Auswertungen</li>
                <li>Konfigurierbare Freigaben</li>
              </ul>
            </div>
            <div className="tcard">
              <h3>Organisation</h3>
              <p className="muted">Läuft ruhig im Hintergrund – ohne Aufsehen.</p>
              <ul>
                <li>Verlässliche Routinen</li>
                <li>Konsistente Ergebnisse</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ---------------- SECTION: Kurze Feature‑Liste (ohne Tech‑Details) ---------------- */}
        <section className="features">
          <div className="wrap">
            <h2>Das bringt dir TempSys</h2>
            <div className="fgrid">
              {[
                "Intuitiver Stempel‑Flow",
                "Übersichtliche Monats‑Übersichten",
                "Klare Verantwortungsrollen",
                "Sinnvolle Hinweise & Bestätigungen",
                "Klares Design mit Glas‑Look",
                "Modular erweiterbar",
              ].map((f) => (
                <div key={f} className="fitem">
                  <span className="dot" /> {f}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------- SECTION: Testimonial‑Stil (neutral) ---------------- */}
        <section className="quotes">
          <div className="wrap qwrap">
            <figure className="qcard">
              <blockquote>
                „Wir wollten weniger Klicks und mehr Klarheit – genau das liefert TempSys.“
              </blockquote>
              <figcaption>– Ein Pilotkunde</figcaption>
            </figure>
            <figure className="qcard">
              <blockquote>
                „Die Oberfläche ist ruhig und verständlich. Nach dem ersten Tag sitzt es.“
              </blockquote>
              <figcaption>– Team‑Rückmeldung</figcaption>
            </figure>
          </div>
        </section>

        {/* ---------------- SECTION: FAQ (ohne Interna) ---------------- */}
        <section className="faq">
          <div className="wrap">
            <h2>Häufige Fragen</h2>
            <div className="faqGrid">
              <details className="faqItem">
                <summary>Was brauche ich zum Start?</summary>
                <p>Nur wenige Grundangaben und die gewünschten Optionen. Der Rest ist geführt.</p>
              </details>
              <details className="faqItem">
                <summary>Wie exportiere ich Daten?</summary>
                <p>Über eine klare Export‑Ansicht. Formate sind so aufgebaut, dass sie gut weiterverarbeitet werden können.</p>
              </details>
              <details className="faqItem">
                <summary>Kann ich später etwas anpassen?</summary>
                <p>Ja. Du kannst Einstellungen jederzeit prüfen und behutsam nachjustieren.</p>
              </details>
            </div>
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="ctaSection">
          <div className="wrap">
            <div className="ctaCard">
              <div>
                <h3>Loslegen – ohne Umwege</h3>
                <p className="muted">
                  Stelle dir deine Lösung im Konfigurator zusammen. Klar, ruhig, übersichtlich.
                </p>
              </div>
              <button className="btn btn-primary" onClick={onOpenKonfigurator}>
                Konfigurator öffnen
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function css(t) {
  return `
  :root {
    --text: ${t.text};
    --dim: ${t.dim};
    --border: ${t.border};
    --glass: ${t.glass};
    --red: ${t.red};
    --blue: ${t.blue};
    --cyan: ${t.cyan};
    --glowR: ${t.glowRed};
    --glowB: ${t.glowBlue};
  }

  .hp{ color: var(--text); background: ${t.bg}; }
  .wrap{ width:min(1180px,92vw); margin:0 auto; position:relative; z-index:2; }

  /* ---------- HERO ---------- */
  .hero{ position:relative; padding:110px 0 70px; overflow:hidden; }
  .bg-halo{
    position:absolute; inset:-20% -30% auto -30%; height:280px;
    background:
      radial-gradient(55% 60% at 20% 30%, var(--glowB), transparent 60%),
      radial-gradient(45% 55% at 90% 80%, var(--glowR), transparent 60%);
    filter: blur(28px); opacity:.95; z-index:0;
  }
  .hero .wrap{ display:grid; grid-template-columns: 1.1fr .9fr; gap:24px; align-items: center; }

  .badge{
    display:inline-flex; align-items:center; gap:10px; padding:8px 12px; border-radius:999px;
    border:1px solid var(--border); background: var(--glass); color: var(--dim); font-size:14px;
    backdrop-filter: blur(8px);
  }
  .dot{ width:8px; height:8px; border-radius:999px; background: var(--cyan);
    box-shadow:0 0 0 0 rgba(93,225,255,.6); animation:pulse 2.4s infinite; }
  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(93,225,255,.6)} 70%{box-shadow:0 0 0 12px rgba(93,225,255,0)} 100%{box-shadow:0 0 0 0 rgba(93,225,255,0)} }

  h1{ font-size: clamp(36px,6vw,60px); line-height:1.05; margin:14px 0 10px; letter-spacing:-.02em; }
  .accent{ color: var(--red); }
  .grad{ background: linear-gradient(90deg, var(--cyan), #9adfff); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .lead{ color: var(--dim); font-size: clamp(16px,2.2vw,20px); max-width: 60ch; }

  .cta{ display:flex; flex-wrap:wrap; gap:12px; margin:20px 0 16px; }
  .btn{ border:1px solid var(--border); border-radius:12px; padding:12px 16px; background: var(--glass); color:var(--text); backdrop-filter: blur(6px); cursor:pointer; transition:transform .15s, box-shadow .15s; }
  .btn:hover{ transform:translateY(-1px); }
  .btn-primary{ border-color: rgba(224,49,49,.5); box-shadow: 0 12px 34px -18px var(--glowR); }
  .btn-ghost{ color: var(--dim); }

  .ribbon{ display:flex; gap:10px; flex-wrap:wrap; margin-top:6px; }
  .ribbon li{ border:1px solid var(--border); background: var(--glass); border-radius:10px; padding:8px 12px; color:var(--dim); font-size:14px; }

  .hero__right .card-stack{ position:relative; display:grid; gap:14px; }
  .card{ border:1px solid var(--border); border-radius:18px; background: var(--glass); backdrop-filter: blur(10px); padding:14px; position:relative; overflow:hidden; }
  .card.big{ box-shadow: 0 30px 80px -40px var(--glowB); }
  .visWrap{ display:flex; align-items:center; justify-content:center; margin-top:8px; }
  .usp3{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
  .kpi{ font-size:22px; font-weight:700; }
  .usp3 small{ display:block; color:var(--dim); font-size:12px; margin-top:2px; }
  .tag{ display:flex; flex-wrap:wrap; gap:8px; }
  .pill{ border:1px solid var(--border); border-radius:999px; padding:6px 10px; color:var(--dim); background: var(--glass); }
  .pill--red{ border-color: rgba(224,49,49,.5); color:#ffd8d8; }
  .pill--cyan{ border-color: rgba(80,190,255,.5); color:#d8f5ff; }

  /* ---------- MOSAIC GRID ---------- */
  .mosaic{ padding: 54px 0 24px; }
  .grid{
    display:grid; gap:16px;
    grid-template-columns: 1.1fr .9fr 1fr;
    grid-template-areas:
      "a b c"
      "a d e";
  }
  .tile{ border:1px solid var(--border); border-radius:16px; background: var(--glass); backdrop-filter: blur(8px); padding:16px; position:relative; overflow:hidden; transition:transform .15s, box-shadow .2s; }
  .tile:hover{ transform: translateY(-2px); box-shadow: 0 24px 60px -30px var(--glowB); }
  .tile h4{ margin:0 0 6px; font-size:18px; }
  .tile p{ margin:0 0 8px; color:var(--dim); }
  .tile ul{ margin:0; padding-left:18px; color:var(--dim); }
  .a{ grid-area:a; min-height: 170px; }
  .b{ grid-area:b; }
  .c{ grid-area:c; }
  .d{ grid-area:d; }
  .e{ grid-area:e; }

  /* ---------- TARGET GROUPS ---------- */
  .target{ padding: 36px 0 12px; background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)); }
  .tgrid{ display:grid; gap:14px; grid-template-columns: repeat(3, 1fr); }
  .tcard{ border:1px solid var(--border); border-radius:16px; background: var(--glass); backdrop-filter: blur(8px); padding:16px; }
  .tcard h3{ margin:0 0 6px; }
  .tcard p{ margin:0 0 8px; color:var(--dim); }
  .tcard ul{ margin:0; padding-left:18px; color:var(--dim); }

  /* ---------- FEATURES ---------- */
  .features{ padding: 42px 0; }
  .features h2{ margin:0 0 8px; }
  .fgrid{ display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .fitem{ display:flex; align-items:center; gap:10px; border:1px solid var(--border); background: var(--glass); border-radius:12px; padding:10px 12px; color:var(--dim); }
  .fitem .dot{ width:8px; height:8px; border-radius:999px; background: var(--cyan); box-shadow: 0 0 14px var(--glowB); }

  /* ---------- QUOTES ---------- */
  .quotes{ padding: 36px 0; }
  .qwrap{ display:grid; gap:14px; grid-template-columns: 1fr 1fr; }
  .qcard{ border:1px solid var(--border); border-radius:16px; background: var(--glass); backdrop-filter: blur(8px); padding:16px; }
  .qcard blockquote{ margin:0; font-size:18px; line-height:1.4; }
  .qcard figcaption{ margin-top:8px; color:var(--dim); font-size:12px; }

  /* ---------- FAQ ---------- */
  .faq{ padding: 36px 0; }
  .faqGrid{ display:grid; gap:10px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .faqItem{ border:1px solid var(--border); border-radius:12px; padding:12px 14px; background: var(--glass); backdrop-filter: blur(7px); }
  .faqItem summary{ cursor:pointer; }
  .faqItem p{ color:var(--dim); margin:.5rem 0 0; }

  /* ---------- CTA ---------- */
  .ctaSection{ padding: 54px 0 80px; }
  .ctaCard{
    border:1px solid var(--border); border-radius:18px; background: var(--glass); backdrop-filter: blur(8px);
    padding:18px; display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
    box-shadow: 0 30px 80px -40px var(--glowR);
  }
  .ctaCard h3{ margin:0; font-size: clamp(20px,3.3vw,28px); }
  .ctaCard p{ margin:0; }

  /* ---------- Responsive ---------- */
  @media (max-width: 1020px){
    .hero .wrap{ grid-template-columns: 1fr; }
    .grid{ grid-template-columns: 1fr 1fr; grid-template-areas: "a b" "c d" "e e"; }
    .tgrid{ grid-template-columns: 1fr; }
    .qwrap{ grid-template-columns: 1fr; }
  }
  @media (max-width: 720px){
    .grid{ grid-template-columns: 1fr; grid-template-areas: "a" "b" "c" "d" "e"; }
  }
  `;
}
