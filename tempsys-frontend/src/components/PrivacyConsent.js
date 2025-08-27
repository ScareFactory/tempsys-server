// src/components/PrivacyConsent.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { FaLock } from "react-icons/fa";

export default function PrivacyConsent() {
  const { token, companyId } = useContext(AuthContext);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // Versionierung (bei Textänderungen hochzählen)
  const POLICY_VERSION = "v1.0";
  const POLICY_DATE = "2025-08-08";

  // Lade-/Speicherzustände
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type: 'success'|'error'|'info', text: string}

  // Serverzustand
  const [acceptedInfo, setAcceptedInfo] = useState(null); // {accepted: bool, version: string, acceptedAt: ISO}

  // THEME – an AdminPanel angelehnt
  const t = {
    bg: "#0f1115",
    surface: "#1b2130",
    surface2: "#10141c",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    border: "#2a3040",
    focus: "#5ab0ff",
    good: "#10b981",
    bad: "#ef4444",
    info: "#3b82f6",
  };

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/privacy-consent`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.accepted === "boolean") {
            setAcceptedInfo(data);
          }
        }
      } catch (e) {
        console.error("Consent laden fehlgeschlagen:", e);
        setMsg({ type: "error", text: "Zustimmungsstatus konnte nicht geladen werden." });
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, headers]);

  const accept = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        accepted: true,
        version: POLICY_VERSION,
        acceptedAt: new Date().toISOString(),
      };
      const res = await fetch(`/api/companies/${companyId}/privacy-consent`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setAcceptedInfo(payload);
      setMsg({ type: "success", text: "Vielen Dank! Deine Zustimmung wurde gespeichert." });
    } catch (e) {
      console.error("Consent speichern fehlgeschlagen:", e);
      setMsg({ type: "error", text: "Zustimmung konnte nicht gespeichert werden." });
    } finally {
      setSaving(false);
    }
  };

  // Kleine Hilfskomponenten (mit Dark-Styles)
  const Section = ({ title, icon, children, info }) => (
    <div className="pc-section">
      <div className="pc-section-head">
        {icon}
        <h3 className="pc-h3">{title}</h3>
      </div>
      <div className="pc-section-body">{children}</div>
      {info && <div className="pc-section-info">{info}</div>}
    </div>
  );

  const InfoRow = ({ label, children }) => (
    <div className="pc-info-row">
      <span className="pc-info-label">{label}</span>
      <span className="pc-info-value">{children}</span>
    </div>
  );

  return (
    <Card className="pc-card">
      <style>{css(t)}</style>

      <h2 className="pc-h2">
        <FaLock /> Datenschutzhinweise & Einwilligung
      </h2>

      {msg && (
        <div
          className={
            "pc-banner " +
            (msg.type === "success"
              ? "pc-banner--success"
              : msg.type === "info"
              ? "pc-banner--info"
              : "pc-banner--error")
          }
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="pc-dim">Lade …</div>
      ) : (
        <div className="pc-grid">
          <Section
            title={`Datenschutzhinweise (${POLICY_VERSION} • ${POLICY_DATE})`}
            icon={<FaLock className="pc-icon" />}
            info="Bitte lies dir die Hinweise sorgfältig durch. Mit Klick auf „Ich stimme zu“ erteilst du deine Einwilligung."
          >
            <div className="pc-scroll">
              {/* ——— Langer, formeller Datenschutztext (TempSys GbR + Haftung) ——— */}
              <p><strong>0. Verantwortliche Stelle</strong><br />
                Diese Datenschutzhinweise informieren dich darüber, wie personenbezogene Daten im Zusammenhang mit der
                Nutzung unserer Zeiterfassungslösungen verarbeitet werden. Verantwortliche Stelle ist die
                <strong> TempSys GbR</strong> (<em>„TempSys“, „wir“, „uns“</em>). Verbindliche Kontaktdaten und die vertretungsberechtigten
                Personen findest du im Impressum der Anwendung/Website. Für Datenschutzanfragen nutze bitte die im
                Impressum genannten Kontaktmöglichkeiten (<em>z.&nbsp;B. Datenschutzkontakt/Support</em>).
              </p>

              <p><strong>1. Begriffsbestimmungen</strong><br />
                Wir verwenden die Begriffe im Sinne von Art. 4 DSGVO, insbesondere „personenbezogene Daten“, „Verarbeitung“,
                „Verantwortlicher“, „Auftragsverarbeiter“ und „Empfänger“. Soweit in diesen Hinweisen von „Nutzern“ die Rede
                ist, sind hiermit die bei TempSys registrierten natürlichen Personen gemeint, die unsere Systeme einsetzen
                (z.&nbsp;B. Mitarbeitende, Administratoren, Vorgesetzte).
              </p>

              <p><strong>2. Kategorien personenbezogener Daten</strong><br />
                (a) <em>Stammdaten &amp; Kontodaten:</em> Name, Benutzername, Rollen/Rechte, Firmenzuordnung, Tag‑ID (NFC/Badge).<br />
                (b) <em>Nutzungs-/Protokolldaten:</em> IP‑Adresse, Zeitstempel, Logins/Logout, API‑Aufrufe, Fehlerprotokolle, User‑Agent,
                ggf. Session‑IDs, Cookie‑IDs.<br />
                (c) <em>Arbeitszeitdaten:</em> Kommt/Geht‑Buchungen, Pausen, Korrekturanträge, Kommentare, Gerätekennung der Stempeluhr.<br />
                (d) <em>Geräte-/Netzwerkdaten:</em> MAC/Seriennummern angeschlossener Geräte (z.&nbsp;B. Stempeluhren), Online‑Status, letzte
                Kontaktzeit, Softwareversion.<br />
                (e) <em>Standortdaten:</em> Ungefähre Standortinformationen können sich aus IP‑Adressen ergeben. Präzise Standortdaten
                (z.&nbsp;B. GPS) werden nur erhoben, wenn das Endgerät dies aktiv übermittelt und du dem zuvor zugestimmt hast.
              </p>

              <p><strong>3. Zwecke der Verarbeitung</strong><br />
                (i) Bereitstellung und Betrieb der Zeiterfassung, Auswertung, Exportfunktionen und Administrationsoberflächen.<br />
                (ii) IT‑Sicherheit, Betrugs-/Missbrauchsprävention, Zugriffsschutz, Nachvollziehbarkeit von Änderungen (Audit).<br />
                (iii) Support, Qualitätssicherung, Stabilität und Weiterentwicklung unserer Systeme.<br />
                (iv) Erfüllung gesetzlicher Pflichten (z.&nbsp;B. handels‑/steuerrechtliche Aufbewahrungspflichten, Nachweispflichten).<br />
                (v) Soweit erforderlich: Einholung, Dokumentation und Verwaltung von Einwilligungen.
              </p>

              <p><strong>4. Rechtsgrundlagen</strong><br />
                Je nach Kontext stützt sich die Verarbeitung auf:<br />
                • Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw. vorvertragliche Maßnahmen),<br />
                • Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung),<br />
                • Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen, insbesondere Sicherheit, Stabilität, Produktverbesserung),<br />
                • Art. 6 Abs. 1 lit. a DSGVO (Einwilligung), soweit z.&nbsp;B. präzise Standortdaten verarbeitet werden.
              </p>

              <p><strong>5. Empfänger &amp; Auftragsverarbeitung</strong><br />
                Innerhalb von TempSys erhalten nur die Stellen Zugriff auf Daten, die diese zur Erfüllung ihrer Aufgaben benötigen
                (z.&nbsp;B. Support/Operations/Administration). Externe Dienstleister (z.&nbsp;B. Hosting, E‑Mail‑Versand, Monitoring) werden,
                soweit sie in unserem Auftrag handeln, vertraglich gemäß Art. 28 DSGVO verpflichtet. Eine Datenübermittlung in
                Drittländer erfolgt nur, wenn die Anforderungen der Art. 44 ff. DSGVO (z.&nbsp;B. EU‑Standardvertragsklauseln) erfüllt sind.
              </p>

              <p><strong>6. Cookies, Protokolle &amp; Sicherheit</strong><br />
                Wir verwenden technisch erforderliche Cookies/ähnliche Technologien für Session‑Management und Sicherheit.
                Protokolle (z.&nbsp;B. Login‑Ereignisse, API‑Zugriffe, Fehlermeldungen) dienen der Stabilität, Fehleranalyse und
                Sicherheitsüberwachung. Wir setzen angemessene technische und organisatorische Maßnahmen ein (z.&nbsp;B. Zugriffskontrollen,
                Verschlüsselung, Trennung von Rollen/Rechten, Protokollierung).
              </p>

              <p><strong>7. Speicherdauer</strong><br />
                Arbeitszeitdaten werden grundsätzlich für die Dauer gesetzlicher Nachweis‑/Aufbewahrungspflichten gespeichert.
                Protokolle und Diagnosedaten werden so lange vorgehalten, wie dies für Sicherheit, Stabilität und Nachvollziehbarkeit
                erforderlich ist. Danach werden Daten gelöscht, anonymisiert oder in ihrer Verarbeitung eingeschränkt.
              </p>

              <p><strong>8. Erforderlichkeit der Bereitstellung</strong><br />
                Bestimmte Daten sind für die Nutzung technisch oder vertraglich erforderlich (z.&nbsp;B. Nutzerkonto, Buchungen).
                Ohne diese Daten ist die Nutzung ganz oder teilweise nicht möglich. Die Bereitstellung präziser Standortdaten
                ist stets freiwillig und erfolgt nur bei separater Einwilligung.
              </p>

              <p><strong>9. Betroffenenrechte</strong><br />
                Du hast – im Rahmen der gesetzlichen Voraussetzungen – folgende Rechte: Auskunft (Art. 15 DSGVO), Berichtigung
                (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie
                Widerspruch (Art. 21). Einwilligungen kannst du jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3).
                Zudem hast du das Recht, dich bei einer zuständigen Datenschutzaufsichtsbehörde zu beschweren (Art. 77).
              </p>

              <p><strong>10. Verantwortlichkeit mehrerer Parteien</strong><br />
                Soweit dein Unternehmen (Arbeitgeber) Administratoren bestimmt, Nutzer anlegt, Rollen vergibt oder Inhalte erfasst,
                verarbeitet es personenbezogene Daten in eigener Verantwortlichkeit. TempSys stellt die Plattform bereit und verarbeitet
                Daten im Rahmen der oben beschriebenen Zwecke. Bitte wende dich bei arbeitsorganisatorischen Fragen an den Verantwortlichen
                in deinem Unternehmen (z.&nbsp;B. HR/Administration).
              </p>

              <p><strong>11. Haftungsausschluss / Keine Rechtsberatung</strong><br />
                (a) <em>Keine Rechtsberatung:</em> Diese Datenschutzhinweise stellen keine Rechtsberatung dar und ersetzen diese nicht.<br />
                (b) <em>Betriebsverantwortung deines Unternehmens:</em> Die inhaltliche Richtigkeit von Eingaben, Buchungen und Konfigurationen,
                welche von Nutzern, Admins oder Dritten innerhalb der Systeme vorgenommen werden, liegt in der Verantwortung deines
                Unternehmens. TempSys stellt die vereinbarte Plattformfunktionalität bereit.<br />
                (c) <em>Haftungsbeschränkung:</em> Soweit gesetzlich zulässig, ist die Haftung der TempSys GbR auf Vorsatz und grobe
                Fahrlässigkeit beschränkt. Bei leichter Fahrlässigkeit haften wir nur bei Verletzung wesentlicher Vertragspflichten
                (Kardinalpflichten), begrenzt auf den vorhersehbaren, typischerweise eintretenden Schaden. Die Haftung für Schäden aus
                der Verletzung des Lebens, des Körpers oder der Gesundheit sowie nach dem Produkthaftungsgesetz bleibt unberührt.<br />
                (d) <em>Externe Inhalte &amp; Integrationen:</em> Für Inhalte, Daten oder Systeme, die von Dritten bereitgestellt werden
                (z.&nbsp;B. E‑Mail‑Gateways, Unternehmensschnittstellen), ist TempSys nicht verantwortlich; es gelten deren Bedingungen.
              </p>

              <p><strong>12. Änderungen dieser Hinweise</strong><br />
                Wir können diese Hinweise anpassen, wenn sich rechtliche, technische oder organisatorische Rahmenbedingungen ändern.
                Maßgeblich ist die oben angegebene Versions‑ und Datumsangabe. Bei wesentlichen Änderungen informieren wir in der App
                oder auf geeignete Weise. Soweit eine Einwilligung betroffen ist, holen wir – falls erforderlich – eine neue Zustimmung ein.
              </p>

              <p><strong>13. Kontakt</strong><br />
                Verantwortliche Stelle: <strong>TempSys GbR</strong>.<br />
                Verbindliche Kontaktangaben entnimm bitte dem Impressum der Anwendung/Website (<em>z.&nbsp;B. Kontaktformular oder
                ausgewiesene E‑Mail‑Adresse</em>). Für Datenschutzanfragen nutze bitte die dort angegebenen Wege.
              </p>

              <hr className="pc-hr" />

              <p className="pc-note">
                TempSys GbR Datenschutzerklärung
              </p>
            </div>

            {/* Meta-Infos */}
            <div className="pc-meta">
              <InfoRow label="Version">{POLICY_VERSION}</InfoRow>
              <InfoRow label="Stand">{POLICY_DATE}</InfoRow>
              {acceptedInfo?.accepted && (
                <InfoRow label="Zugestimmt am">
                  {new Date(acceptedInfo.acceptedAt).toLocaleString("de-DE")} ({acceptedInfo.version})
                </InfoRow>
              )}
            </div>

            {/* Buttons */}
            <div className="pc-actions">
              <Button onClick={accept} disabled={saving || acceptedInfo?.accepted}>
                {saving ? "Speichere …" : acceptedInfo?.accepted ? "Bereits zugestimmt" : "Ich stimme zu"}
              </Button>
            </div>
          </Section>
        </div>
      )}
    </Card>
  );
}

/* ---------------- Scoped CSS: Dark/Glass wie AdminPanel ---------------- */
function css(t) {
  return `
  .pc-card {
    background: transparent;
    border: 1px solid ${t.border};
    box-shadow: 0 20px 50px rgba(0,0,0,.35);
    border-radius: 14px;
    padding: 16px;
    color: ${t.text};
  }

  .pc-h2{
    display:flex; align-items:center; gap:8px; margin:0 0 14px;
    font-size:1.25rem; color:${t.text};
  }
  .pc-h3{ margin:0; font-size:1.05rem; color:${t.text}; }

  .pc-icon{ color:${t.textDim}; }

  .pc-dim{ color:${t.textDim}; }

  .pc-banner{
    margin: 0 0 12px; padding: 10px 12px; border-radius: 10px;
    font-weight:600; color:#0b1220;
  }
  .pc-banner--success{ background: rgba(16,185,129,.85); }
  .pc-banner--info{ background: rgba(59,130,246,.85); }
  .pc-banner--error{ background: rgba(239,68,68,.85); }

  .pc-grid{
    display:grid; grid-template-columns: 1fr; gap:16px; align-items:start;
  }

  .pc-section{
    background: linear-gradient(180deg, rgba(27,33,48,.75), rgba(16,20,28,.65));
    border:1px solid ${t.border};
    border-radius:14px;
    padding:16px;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    color:${t.text};
  }
  .pc-section-head{
    display:flex; align-items:center; gap:10px; margin-bottom:10px;
  }
  .pc-section-info{
    margin-top:10px; color:${t.textDim}; font-size:.85rem; line-height:1.4;
  }
  .pc-section-body{ }

  .pc-scroll{
    max-height: 420px; overflow:auto;
    padding: 12px;
    border:1px solid ${t.border};
    border-radius:10px;
    background: rgba(15,17,21,.6);
    color:${t.text};
  }
  .pc-scroll p{ margin: 0 0 10px; }
  .pc-scroll strong{ color:${t.text}; }
  .pc-hr{
    margin: 12px 0; border: 0; border-top: 1px solid ${t.border};
  }
  .pc-note{ font-size:.9rem; color:${t.textDim}; }

  .pc-meta{ margin-top:12px; }
  .pc-info-row{
    display:flex; gap:8px; margin-bottom:6px; align-items:baseline;
  }
  .pc-info-label{ width:180px; color:${t.textDim}; }
  .pc-info-value{ color:${t.text}; }

  .pc-actions{ display:flex; gap:8px; margin-top:12px; }

  /* Fokus-Styles für Inputs (falls Button/Inputs aus UI-Kit hier landen) */
  .pc-card :where(input,textarea,select,button):focus {
    outline:2px solid ${t.focus}; outline-offset:2px;
  }
  `;
}
