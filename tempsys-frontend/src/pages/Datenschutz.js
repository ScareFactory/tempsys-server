// tempsys-frontend/src/pages/Datenschutz.js
import React, { useEffect } from "react";

export default function Datenschutz() {
  useEffect(() => {
    document.title = "Datenschutz – TempSys";
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

  const sections = [
    { id: "einleitung", title: "1. Einleitung & Verantwortlicher" },
    { id: "begriffe", title: "2. Begriffsbestimmungen" },
    { id: "quellen", title: "3. Datenquellen" },
    { id: "kategorien", title: "4. Kategorien personenbezogener Daten" },
    { id: "zwecke", title: "5. Zwecke der Verarbeitung" },
    { id: "rechtsgrundlagen", title: "6. Rechtsgrundlagen (Art. 6 DSGVO)" },
    { id: "empfaenger", title: "7. Empfänger & Weitergabe" },
    { id: "drittland", title: "8. Drittlandübermittlung" },
    { id: "speicherdauer", title: "9. Speicherdauer & Löschung" },
    { id: "cookies", title: "10. Cookies & Local Storage" },
    { id: "serverlogs", title: "11. Server-Logs & Sicherheit" },
    { id: "kontakt", title: "12. Kontaktaufnahme" },
    { id: "kundenbereich", title: "13. Registrierte Nutzer / Login" },
    { id: "geraete", title: "14. Geräte (Stempeluhr) & Telemetrie" },
    { id: "offline", title: "15. Offline-Fallback & Warteschlangen" },
    { id: "newsletter", title: "16. Newsletter" },
    { id: "support", title: "17. Support/Help-Widget" },
    { id: "analytics", title: "18. Webanalyse" },
    { id: "rechte", title: "19. Betroffenenrechte" },
    { id: "widerruf", title: "20. Widerruf von Einwilligungen" },
    { id: "aufsicht", title: "21. Beschwerderecht" },
    { id: "bereitstellung", title: "22. Pflicht zur Bereitstellung" },
    { id: "automatisierung", title: "23. Automatisierte Entscheidungen" },
    { id: "toms", title: "24. Technische & organisatorische Maßnahmen" },
    { id: "aenderungen", title: "25. Änderungen dieser Erklärung" },
  ];

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="dp-shell">
      <style>{css(t)}</style>

      <header className="dp-header">
        <div className="dp-badge">
          <span className="dot" />
          Datenschutzinformation (Stand: {lastUpdated})
        </div>
        <h1>Datenschutzerklärung</h1>
      </header>

      <div className="dp-layout">
        {/* TOC */}
        <aside className="dp-toc">
          <div className="dp-toc-title">Inhalt</div>
          <nav className="dp-toc-list">
            {sections.map((s) => (
              <button key={s.id} type="button" onClick={() => scrollToId(s.id)}>
                {s.title}
              </button>
            ))}
          </nav>
          <div className="dp-toc-hint">
            Tipp: Unten findest du je Abschnitt Hinweise, was ggf. zu entfernen
            oder zu ergänzen ist.
          </div>
        </aside>

        {/* Main content */}
        <main className="dp-main">
          {/* 1 */}
          <section id="einleitung" className="card">
            <h2 className="card-title">1. Einleitung & Verantwortlicher</h2>
            <p className="text">
              Diese Datenschutzerklärung informiert dich über Art, Umfang und Zwecke der
              Verarbeitung personenbezogener Daten innerhalb unseres Online-Angebots,
              unserer Anwendungen und ggf. angeschlossener Geräte.
            </p>
            <p className="text">
              <span className="strong">Verantwortlicher (Art. 4 Nr. 7 DSGVO):</span> TempSys 
              <br />
              E-Mail: <a href="mailto:tim.christmann@tempsys.de">tim.christmann@tempsys.de</a>
              <br />
              <span className="dim">Postanschrift, Rechtsform, Vertretungsberechtigte (In Arbeit).</span>
            </p>
          </section>

          {/* 2 */}
          <section id="begriffe" className="card">
            <h2 className="card-title">2. Begriffsbestimmungen</h2>
            <p className="text">
              Es gelten die Definitionen nach Art. 4 DSGVO (z. B. „personenbezogene Daten“,
              „Verarbeitung“, „Verantwortlicher“, „Auftragsverarbeiter“, „Empfänger“,
              „Dritter“, „Einwilligung“).
            </p>
          </section>

          {/* 3 */}
          <section id="quellen" className="card">
            <h2 className="card-title">3. Datenquellen</h2>
            <ul className="list">
              <li>Direkt von Betroffenen (z. B. Login, Eingabe in Formularen, E-Mail-Kontakt).</li>
              <li>Endgeräte/Browser (z. B. technische Metadaten, Cookies, Local/Session Storage).</li>
              <li>Optionale angeschlossene Geräte („Stempeluhren“) – Status-/Ereignisübermittlung.</li>
              <li>Server- und Sicherheitslogs der Hosting-Infrastruktur.</li>
            </ul>
          </section>

          {/* 4 */}
          <section id="kategorien" className="card">
            <h2 className="card-title">4. Kategorien personenbezogener Daten</h2>
            <div className="grid-2">
              <div>
                <h3 className="card-subtitle">4.1 Kontodaten / Verwaltung</h3>
                <ul className="list">
                  <li>Stammdaten: Benutzername, Firmenzuordnung, Rollen/ Rechte.</li>
                  <li>Authentifizierung: Passwort, Token/Session-Informationen.</li>
                  <li>Kommunikation: E-Mail-Adresse; Support-Tickets (Inhalt, Metadaten).</li>
                </ul>
              </div>
              <div>
                <h3 className="card-subtitle">4.2 Nutzungs- & Metadaten</h3>
                <ul className="list">
                  <li>Protokolle: Zeitpunkte, IP-Adresse, User-Agent, Fehlercodes.</li>
                  <li>Optionale Messwerte: z. B. Geräte-Online-Status, Software-Version.</li>
                </ul>
              </div>
            </div>
            <div className="grid-2">
              <div>
                <h3 className="card-subtitle">4.3 Geräte</h3>
                <ul className="list">
                  <li>Gerätekennung (z. B. Seriennummer), ggf. IP/MAC (falls übertragen).</li>
                  <li>Ereignisse: An-/Abmeldung, Heartbeat, optionale Statusmeldungen.</li>
                  <li>
                    Zeitstempel von Kommen/Gehen-Buchungen (NFC-Scan),
                    Fehlerlogs des Geräts.
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="card-subtitle">4.4 Inhalte (vom Nutzer bereitgestellt)</h3>
                <ul className="list">
                  <li>Freitexte in Formularen (z. B. Abwesenheitsgründe, Support-Nachrichten).</li>
                  <li>Upload-Daten (z.B. Krankmeldungen).</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5 */}
          <section id="zwecke" className="card">
            <h2 className="card-title">5. Zwecke der Verarbeitung</h2>
            <ul className="list">
              <li>Bereitstellung der Website, Web-App und ggf. Geräte-Funktionen.</li>
              <li>Benutzerverwaltung, Authentifizierung, Rollen- und Rechtekonzept.</li>
              <li>Fehleranalyse, Stabilität, Sicherheitsmonitoring (Server-/Gerätelog).</li>
              <li>Kommunikation (Support, E-Mail), Termin-/Abwesenheitsverwaltung.</li>
              <li>Optional: Statistiken, Nutzungsanalyse, Produktverbesserung.</li>
              <li>Erfüllung gesetzlicher Aufbewahrungs- und Nachweispflichten.</li>
            </ul>
          </section>

          {/* 6 */}
          <section id="rechtsgrundlagen" className="card">
            <h2 className="card-title">6. Rechtsgrundlagen (Art. 6 Abs. 1 DSGVO)</h2>
            <ul className="list">
              <li><strong>b) Vertragserfüllung</strong>: zur Bereitstellung vertraglicher Funktionen.</li>
              <li><strong>c) Rechtliche Verpflichtung</strong>: z. B. Aufbewahrungspflichten.</li>
              <li><strong>f) Berechtigte Interessen</strong>: Sicherheit, Missbrauchsverhinderung, Produktpflege.</li>
              <li><strong>a) Einwilligung</strong>: für optionale Funktionen (z. B. Newsletter, Analyse, Chat-Widget).</li>
            </ul>
          </section>

          {/* 7 */}
          <section id="empfaenger" className="card">
            <h2 className="card-title">7. Empfänger & Weitergabe</h2>
            <ul className="list">
              <li>Interne Stellen (Administration, Support), nur bei Erforderlichkeit.</li>
              <li>
                Auftragsverarbeiter (Hosting, E-Mail-Versand, ggf. Monitoring), vertraglich gebunden.
              </li>
              <li>
                Weitere Empfänger nur, wenn rechtlich erforderlich oder mit Einwilligung.
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section id="drittland" className="card">
            <h2 className="card-title">8. Drittlandübermittlung</h2>
            <p className="text">
              Eine Übermittlung in Drittländer außerhalb der EU/des EWR erfolgt nur,
              sofern rechtliche Voraussetzungen bestehen (z. B. Angemessenheitsbeschluss,
              Standardvertragsklauseln, zusätzliche Maßnahmen). Details werden je nach
              eingesetztem Dienst in diesem Dokument ergänzt.
            </p>
          </section>

          {/* 9 */}
          <section id="speicherdauer" className="card">
            <h2 className="card-title">9. Speicherdauer & Löschung</h2>
            <ul className="list">
              <li>Grundsatz: nur solange erforderlich für Zwecke/Vertrag/gesetzliche Pflichten.</li>
              <li>Sessions/Tokens: bis Logout/Expiry; Logs: kurze Rotationen, sofern möglich.</li>
              <li>Gesetzliche Fristen (z. B. Handels-/Steuerrecht) können längere Aufbewahrung erfordern.</li>
            </ul>
          </section>

          {/* 10 */}
          <section id="cookies" className="card">
            <h2 className="card-title">10. Cookies & Local Storage</h2>
            <div className="grid-2">
              <div>
                <h3 className="card-subtitle">Essentiell (ohne Einwilligung)</h3>
                <ul className="list">
                  <li>Sitzungsverwaltung, Sicherheitsfunktionen, CSRF-Schutz.</li>
                  <li>Optionale Speicherung von UI-Präferenzen (Theme, Sprache).</li>
                </ul>
              </div>
              <div>
                <h3 className="card-subtitle">Optional (mit Einwilligung)</h3>
                <ul className="list">
                  <li>Analyse/Statistik, Marketing-Tags, externe Medien/Widgets.</li>
                </ul>
              </div>
            </div>
            <div className="note">
              <strong>Hinweis:</strong> Login Tokens werden 2 Stunden gespeichert um ein schnelles anmelden zu ermöglichen.
            </div>
          </section>

          {/* 11 */}
          <section id="serverlogs" className="card">
            <h2 className="card-title">11. Server-Logs & Sicherheit</h2>
            <ul className="list">
              <li>Protokollierung von Anfragen (Datum/Uhrzeit, IP, Pfad, Statuscode, UA).</li>
              <li>Fehler- und Sicherheitslogs zur Störungsanalyse und Angriffserkennung.</li>
              <li>Kurze Rotations-/Löschkonzepte, soweit technisch und rechtlich möglich.</li>
            </ul>
          </section>

          {/* 12 */}
          <section id="kontakt" className="card">
            <h2 className="card-title">12. Kontaktaufnahme</h2>
            <p className="text">
              Bei Kontakt per E-Mail verarbeiten wir die angegebenen Daten zur Bearbeitung
              der Anfrage (Art. 6 Abs. 1 lit. b/f DSGVO).
            </p>
          </section>

          {/* 13 */}
          <section id="kundenbereich" className="card">
            <h2 className="card-title">13. Registrierte Nutzer / Login</h2>
            <ul className="list">
              <li>Nutzerkonto mit Rollen/Rechten (z. B. Mitarbeiter und Firmenadministrator).</li>
              <li>Authentifizierung über Zugangsdaten; Token-basierte Sitzungen möglich.</li>
              <li>Protokollierung von sicherheitsrelevanten Ereignissen (Login/Logout, Fehlversuche).</li>
            </ul>
            <p className="mini dim">
              Diese Daten werden auf unbestimmte Zeit gespeichert mindestens aber bis zur Löschung des Firmenzugangs.
            </p>
          </section>

          {/* 14 */}
          <section id="geraete" className="card">
            <h2 className="card-title">14. Geräte (Stempeluhr) & Telemetrie</h2>
            <ul className="list">
              <li>
                Übermittlung technischer Signale (z. B. Heartbeat, Versionsstände, optionale
                Status-/Fehlercodes) zur Betriebsüberwachung.
              </li>
              <li>
                Optional: Erfassung von Buchungen (Kommen/Gehen) inkl. Zeitstempel und
                Pseudonym (Tag-ID/Nutzer-ID).
              </li>
              <li>
                Minimierungsgrundsatz: Übermittlung nur der für den Zweck erforderlichen Daten.
              </li>
            </ul>
            <div className="note">
              Fehlerlogs werden eine Woche gespeichert und dann gelöscht. 
              Buchungen und Stempelvorgänge werden dauerhaft gespeichert, solange ihr Firmenzugang existiert.
            </div>
          </section>

          {/* 15 */}
          <section id="offline" className="card">
            <h2 className="card-title">15. Offline-Fallback & Warteschlangen</h2>
            <p className="text">
              Sofern Endgeräte zeitweise offline sind, können lokale Zwischenspeicherungen
              („Queue“/„Offline-Fallback“) eingesetzt werden. Nach Wiederverbindung werden
              vorgemerkte Datensätze synchronisiert. Es gelten die gleichen Lösch-/Schutzkonzepte.
            </p>
          </section>

          {/* 16 */}
          <section id="newsletter" className="card">
            <h2 className="card-title">16. Newsletter</h2>
            <ul className="list">
              <li>Versand nur mit Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), Widerruf jederzeit.</li>
              <li>Double-Opt-In, Protokollierung der Anmeldung; Abmeldelink in jeder E-Mail.</li>
            </ul>
          </section>

          {/* 17 */}
          <section id="support" className="card">
            <h2 className="card-title">17. Support/Help-Widget</h2>
            <p className="text">
              Ein eingebettetes Support- oder Chat-Widget kann technisch erforderliche Daten
              (z. B. Browser-Infos, Seiten-URL) und deine Eingaben verarbeiten. Rechtsgrundlage:
              Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) oder berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)
              an effizientem Support.
            </p>
          </section>

          {/* 18 */}
          <section id="analytics" className="card">
            <h2 className="card-title">18. Webanalyse</h2>
            <p className="text">
              Wir analysieren ausschließlich die Nutzung von angemeldeten Nutzern 
              zur Verhinderung von unberechtigtem Zugriff
            </p>
          </section>

          {/* 19 */}
          <section id="rechte" className="card">
            <h2 className="card-title">19. Betroffenenrechte</h2>
            <ul className="list">
              <li>Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18).</li>
              <li>Datenübertragbarkeit (Art. 20), Widerspruch (Art. 21), Beschwerde (Art. 77).</li>
              <li>Bei Einwilligungen: Recht auf Widerruf (Art. 7 Abs. 3) mit Wirkung für die Zukunft.</li>
            </ul>
            <p className="mini dim">
              Anfragen bitte an: <a href="mailto:tim.christmann@tempsys.de">tim.christmann@tempsys.de</a>
            </p>
          </section>

          {/* 20 */}
          <section id="widerruf" className="card">
            <h2 className="card-title">20. Widerruf von Einwilligungen</h2>
            <p className="text">
              Du kannst erteilte Einwilligungen jederzeit mit Wirkung für die Zukunft widerrufen.
              Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt.
            </p>
          </section>

          {/* 21 */}
          <section id="aufsicht" className="card">
            <h2 className="card-title">21. Beschwerderecht</h2>
            <p className="text">
              Du hast das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren
              (Art. 77 DSGVO). Zuständig ist insbesondere die Aufsicht an deinem gewöhnlichen
              Aufenthaltsort, Arbeitsplatz oder dem Ort des mutmaßlichen Verstoßes.
            </p>
          </section>

          {/* 22 */}
          <section id="bereitstellung" className="card">
            <h2 className="card-title">22. Pflicht zur Bereitstellung</h2>
            <p className="text">
              Die Bereitstellung bestimmter Daten kann für Vertragsschluss/-durchführung
              erforderlich sein. Ohne diese Daten sind Funktionen ggf. nicht nutzbar.
            </p>
          </section>

          {/* 23 */}
          <section id="automatisierung" className="card">
            <h2 className="card-title">23. Automatisierte Entscheidungen</h2>
            <p className="text">
              Eine automatisierte Entscheidungsfindung einschließlich Profiling im Sinne
              des Art. 22 DSGVO findet grundsätzlich nicht statt. Sollte dies zukünftig eingeführt
              werden, informieren wir vorab mit gesonderten Hinweisen.
            </p>
          </section>

          {/* 24 */}
          <section id="toms" className="card">
            <h2 className="card-title">24. Technische & organisatorische Maßnahmen (TOMs)</h2>
            <ul className="list">
              <li>Verschlüsselung der Übertragung (HTTPS), Härtung von Servern.</li>
              <li>Rollen-/Rechtemanagement, Need-to-know-Prinzip, Protokollierung.</li>
              <li>Backup-/Recovery-Konzepte, Monitoring, Log-Rotation.</li>
              <li>Datensparsamkeit, Pseudonymisierung, regelmäßige Reviews.</li>
            </ul>
          </section>

          {/* 25 */}
          <section id="aenderungen" className="card">
            <h2 className="card-title">25. Änderungen dieser Erklärung</h2>
            <p className="text">
              Wir passen diese Datenschutzerklärung an, sobald Änderungen an Verfahren,
              Rechtslage oder Systemarchitektur dies erfordern. Es gilt die jeweils aktuelle Version.
            </p>
          </section>

          <div className="foot">
            Zurück nach oben?{" "}
            <button className="linklike" type="button" onClick={() => scrollToId("einleitung")}>
              Einleitung
            </button>
            {" "}•{" "}
            <a href="/impressum">Impressum</a>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Dark + Glas) ---------------- */
function css(t) {
  return `
  .dp-shell{
    min-height:100vh; color:${t.text};
    background:
      radial-gradient(900px 420px at 70% -30%, rgba(224,49,49,.18) 0%, rgba(224,49,49,0) 70%),
      radial-gradient(700px 340px at 10% 10%, rgba(90,176,255,.14) 0%, rgba(90,176,255,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, ${t.gradientTo} 100%);
    padding: 18px;
  }

  .dp-header{ max-width:1200px; margin:0 auto 16px auto; }
  .dp-badge{
    display:inline-flex; align-items:center; gap:8px;
    background:${t.glass}; border:1px solid ${t.border};
    padding:6px 10px; border-radius:999px; color:${t.textDim};
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
    font-size:.8rem;
  }
  .dp-badge .dot{
    width:8px; height:8px; border-radius:999px; background:${t.focus};
    box-shadow: 0 0 16px ${t.focus};
    animation: pulse 1.8s ease-in-out infinite;
  }
  @keyframes pulse { 0%,100%{transform:scale(1);opacity:.9;} 50%{transform:scale(1.2);opacity:1;} }
  .dp-header h1{ margin:8px 0 6px 0; font-size: 2rem; letter-spacing:.3px; }
  .dp-header .stand{ color:${t.textDim}; max-width:1200px; }

  .dp-layout{ display:grid; grid-template-columns: 260px 1fr; gap:16px; max-width:1200px; margin:0 auto; }
  @media (max-width: 980px){ .dp-layout{ grid-template-columns: 1fr; } }

  .dp-toc{
    background:${t.glass}; border:1px solid ${t.border}; border-radius:14px; padding:14px;
    position: sticky; top:12px; height:fit-content;
    backdrop-filter: blur(10px) saturate(140%); -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
  }
  .dp-toc-title{ color:${t.textDim}; margin:2px 2px 8px; font-size:.95rem; }
  .dp-toc-list{ display:flex; flex-direction:column; gap:6px; }
  .dp-toc-list button{
    width:100%; text-align:left; border:1px solid transparent; background:transparent; color:${t.textDim};
    padding:8px 10px; border-radius:10px; cursor:pointer;
  }
  .dp-toc-list button:hover{
    color:${t.text}; background: rgba(255,255,255,.05); border-color:${t.border};
  }
  .dp-toc-hint{ color:${t.textDim}; font-size:.8rem; margin-top:10px; }

  .dp-main{ display:flex; flex-direction:column; gap:14px; }
  .card{
    background:${t.glass}; border:1px solid ${t.border}; border-radius:14px; padding:16px;
    backdrop-filter: blur(10px) saturate(140%); -webkit-backdrop-filter: blur(10px) saturate(140%);
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.06);
  }
  .card-title{ font-size:1.15rem; margin:0 0 10px; }
  .card-subtitle{ font-size:1rem; margin:0 0 8px; }
  .text{ color:${t.text}; opacity:.95; line-height:1.6; }
  .dim{ color:${t.textDim}; }
  .mini{ color:${t.textDim}; font-size:.8rem; margin-top:6px; }
  .strong{ font-weight:600; }

  .grid-2{ display:grid; grid-template-columns: 1fr 1fr; gap:12px; }
  @media (max-width: 820px){ .grid-2{ grid-template-columns: 1fr; } }

  .list{ margin:6px 0 0 18px; padding-left:10px; }
  .list li{ margin:4px 0; }

  .note{
    border:1px solid rgba(255,255,255,.18); background:${t.glassSoft}; color:${t.text};
    padding:10px; border-radius:10px; margin-top:10px;
  }

  a{ color:${t.focus}; text-decoration:none; }
  a:hover{ text-decoration:underline; }
  .linklike{ background:none; border:none; color:${t.focus}; cursor:pointer; padding:0; }
  .linklike:hover{ text-decoration:underline; }

  .foot{ color:${t.textDim}; margin:8px 2px 18px; }
  `;
}
