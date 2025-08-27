// tempsys-frontend/src/pages/Impressum.js
import React, { useEffect } from "react";

export default function Impressum() {
  useEffect(() => {
    document.title = "Impressum – TempSys";
  }, []);

  const t = {
    bg: "#0f1115",
    gradientTo: "#0c0f14",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    border: "#2a3040",
    primary: "#e03131",
    glass: "rgba(21,25,35,.55)",
    glassSoft: "rgba(255,255,255,.04)",
    itemActiveBorder: "rgba(224,49,49,.30)",
    focus: "#5ab0ff",
  };

  const now = new Date();
  const lastUpdated = now.toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <div className="imp-shell">
      <style>{css(t)}</style>

      <header className="imp-header">
        <div className="imp-badge">
          <span className="dot" />
          In Gründung / Daten werden ergänzt
        </div>
        <h1>Impressum</h1>
        <p className="stand">Stand: {lastUpdated}</p>
      </header>

      <main className="imp-main">
        {/* Angaben gemäß § 5 TMG */}
        <section className="card">
          <h2 className="card-title">Angaben gemäß § 5 TMG</h2>
          <dl className="def-grid">
            <dt>Diensteanbieter</dt>
            <dd className="strong">TempSys</dd>

            <dt>Anschrift</dt>
            <dd>
              <div className="note">
                <strong>Hinweis:</strong> Postanschrift folgt.
              </div>
            </dd>

            <dt>Kontakt</dt>
            <dd>
              E-Mail:{" "}
              <a href="mailto:tim.christmann@tempsys.de">
                tim.christmann@tempsys.de
              </a>
              <div className="dim">Telefon: <em>0174-7952993</em></div>
            </dd>

            <dt>Vertretungsberechtigt</dt>
            <dd><em>Tim Christmann</em></dd>

            <dt>Rechtsform</dt>
            <dd><em>Gemeinschaft bürgerlichen Rechts</em></dd>

            <dt>Registereintrag</dt>
            <dd><em>N/A</em></dd>

            <dt>Umsatzsteuer-ID</dt>
            <dd><em>N/A</em></dd>

            <dt>Redaktionell verantwortlich</dt>
            <dd><em>Tim Christmann</em></dd>
          </dl>
        </section>

        {/* Rechtliches */}
        <section className="grid">
          <article className="card">
            <h3 className="card-subtitle">Haftung für Inhalte</h3>
            <p className="text">
              Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die
              Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine
              Gewähr übernehmen. Als Diensteanbieter sind wir für eigene Inhalte auf diesen
              Seiten nach den allgemeinen Gesetzen verantwortlich. Wir sind jedoch nicht
              verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
              oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach
              den allgemeinen Gesetzen bleiben hiervon unberührt.
            </p>
          </article>

          <article className="card">
            <h3 className="card-subtitle">Haftung für Links</h3>
            <p className="text">
              Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte
              wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch
              keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der
              jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Bei Bekanntwerden
              von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
            </p>
          </article>

          <article className="card">
            <h3 className="card-subtitle">Urheberrecht</h3>
            <p className="text">
              Die durch uns erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
              deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Die
              Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb
              der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen
              Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den
              privaten, nicht kommerziellen Gebrauch gestattet, sofern nicht anders angegeben.
            </p>
          </article>

          <article className="card">
            <h3 className="card-subtitle">Verbraucher­streit­beilegung / OS-Plattform</h3>
            <p className="text">
              Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor
              einer Verbraucherschlichtungsstelle teilzunehmen. Die Europäische Kommission
              stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
              <a
                href="https://ec.europa.eu/consumers/odr"
                target="_blank"
                rel="noreferrer noopener"
              >
                https://ec.europa.eu/consumers/odr
              </a>.
            </p>
          </article>
        </section>
      </main>

      {/* JSON-LD schema.org (optional) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "TempSys",
            url: "https://tempsys.de",
            email: "tim.christmann@tempsys.de",
            address: {
              "@type": "PostalAddress",
              streetAddress: "",
              postalCode: "",
              addressLocality: "",
              addressCountry: "DE",
            },
          }),
        }}
      />
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Dark + Glas wie CompanyAdminDashboard) ---------------- */
function css(t) {
  return `
  .imp-shell{
    min-height:100vh; color:${t.text};
    background:
      radial-gradient(900px 420px at 70% -30%, rgba(224,49,49,.18) 0%, rgba(224,49,49,0) 70%),
      radial-gradient(700px 340px at 10% 10%, rgba(90,176,255,.14) 0%, rgba(90,176,255,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, ${t.gradientTo} 100%);
    padding: 18px;
  }

  .imp-header{
    max-width:1200px; margin:0 auto 14px auto;
  }
  .imp-badge{
    display:inline-flex; align-items:center; gap:8px;
    background:${t.glass}; border:1px solid ${t.border};
    padding:6px 10px; border-radius:999px; color:${t.textDim};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
    font-size:.8rem;
  }
  .imp-badge .dot{
    width:8px; height:8px; border-radius:999px; background:${t.focus};
    box-shadow: 0 0 16px ${t.focus};
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: .9; }
    50% { transform: scale(1.2); opacity: 1; }
  }
  .imp-header h1{ margin:8px 0 4px 0; font-size: 2rem; letter-spacing:.3px; }
  .imp-header .stand{ color:${t.textDim}; font-size:.9rem; }

  .imp-main{ max-width:1200px; margin:0 auto; }

  .grid{
    display:grid; gap:14px;
    grid-template-columns: 1fr;
  }

  .card{
    background:${t.glass};
    border:1px solid ${t.border};
    border-radius:14px;
    padding:16px;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
  }
  .card.warn{
    background: linear-gradient(180deg, rgba(224,49,49,.12), rgba(224,49,49,.06));
    border-color:${t.itemActiveBorder};
  }
  .card-title{ font-size:1.15rem; margin:0 0 10px; }
  .card-subtitle{ font-size:1rem; margin:0 0 8px; }

  .text{ color:${t.text}; opacity:.95; line-height:1.5; }
  .dim{ color:${t.textDim}; }
  .mini{ color:${t.textDim}; font-size:.8rem; margin-top:6px; }

  .def-grid{
    display:grid; gap:10px; grid-template-columns: 180px 1fr;
  }
  .def-grid dt{ color:${t.textDim}; }
  .def-grid dd{ margin:0; }
  .strong{ font-weight:600; }

  .note{
    border:1px solid rgba(255,255,255,.18);
    background:${t.glassSoft};
    color:${t.text};
    padding:10px; border-radius:10px;
  }

  a{ color:${t.focus}; text-decoration: none; }
  a:hover{ text-decoration: underline; }

  .list{ margin:6px 0 0 16px; padding-left:10px; }
  .list li{ margin:4px 0; }

  .foot{ color:${t.textDim}; margin:14px 2px; }
  `;
}
