// src/components/MonthlyMailSetup.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaDownload, FaEnvelope, FaSave, FaCogs, FaCalendarAlt } from "react-icons/fa";

export default function MonthlyMailSetup() {
  const { token, companyId } = useContext(AuthContext);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [cfg, setCfg] = useState({
    recipients: [],
    useGmail: true,
    active: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const res = await fetch(`/api/companies/${companyId}/export-settings`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setCfg({
          recipients: data.recipients || [],
          useGmail: !!data.useGmail,
          active: !!data.active,
        });
      } catch (e) {
        console.error("load settings failed", e);
        setMsg({ type: "error", text: "Einstellungen konnten nicht geladen werden." });
      } finally {
        setLoading(false);
      }
    })();
  }, [companyId, headers]);

  const download = async (format) => {
    setMsg(null);
    try {
      const res = await fetch(
        `/api/companies/${companyId}/export?month=${month}&format=${format}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `times_${month}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("download failed", e);
      setMsg({ type: "error", text: "Download fehlgeschlagen." });
    }
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/export-settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(cfg),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setMsg({ type: "success", text: "Einstellungen gespeichert." });
    } catch (e) {
      console.error("save failed", e);
      setMsg({ type: "error", text: "Speichern fehlgeschlagen." });
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/companies/${companyId}/export-send-now`, {
        method: "POST",
        headers,
        body: JSON.stringify({ month }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setMsg({ type: "success", text: "E-Mail wurde angestoßen." });
    } catch (e) {
      console.error("send now failed", e);
      setMsg({ type: "error", text: `Senden fehlgeschlagen: ${e.message}` });
    } finally {
      setSending(false);
    }
  };

  // ===== shared glass styles =====
  const glass = {
  border: "1px solid rgba(255,255,255,0.15)",
  background: "linear-gradient(180deg, rgba(17,24,39,0.65), rgba(17,24,39,0.45))",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: 14,
  };

  const inputBase = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.25)",
  background: "rgba(255,255,255,.06)",
  color: "#fff",
  outline: "none",
  };

  const pill = (bg, fg) => ({
    padding: "6px 10px",
    borderRadius: 999,
    background: bg,
    color: fg,
    fontWeight: 700,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,.2)",
  });

  const Section = ({ title, icon, children, info }) => (
    <div style={{ ...glass, padding: 16, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div
          style={{
            ...glass,
            padding: 8,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
      {info && (
        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13, lineHeight: 1.35 }}>{info}</div>
      )}
    </div>
  );

  const chipBox = (label, arrKey) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontWeight: 600 }}>{label}</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        {cfg[arrKey].map((v, idx) => (
          <span
            key={`${v}-${idx}`}
            style={{
              ...glass,
              borderRadius: 18,
              padding: "4px 10px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {v}
            <button
              onClick={() =>
                setCfg((s) => ({ ...s, [arrKey]: s[arrKey].filter((_, i) => i !== idx) }))
              }
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
              title="entfernen"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          type="email"
          placeholder="E-Mail hinzufügen"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = e.currentTarget.value.trim();
              if (val) {
                setCfg((s) => ({ ...s, [arrKey]: [...s[arrKey], val] }));
                e.currentTarget.value = "";
              }
            }
          }}
          style={{ ...inputBase, flex: 1 }}
        />
        <Button
          variant="secondary"
          onClick={(e) => {
            const inp = e.currentTarget.parentElement.querySelector('input[type="email"]');
            const val = inp.value.trim();
            if (val) {
              setCfg((s) => ({ ...s, [arrKey]: [...s[arrKey], val] }));
              inp.value = "";
            }
          }}
        >
          Hinzufügen
        </Button>
      </div>
    </div>
  );

  const canSend = cfg.useGmail && (cfg.recipients?.length || 0) > 0;

  return (
    <Card>
      <h2 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <FaCogs /> Datenexport & Monatsmail
      </h2>

      {loading ? (
        <div>Lade Einstellungen …</div>
      ) : (
        <div
          style={{
            display: "grid",
            // etwas breiter & responsive; beide Spalten skalieren mit
            gridTemplateColumns: "minmax(380px, 520px) 1.1fr",
            gap: 20,
            alignItems: "stretch",
          }}
        >
          {/* LEFT: Monat + Download */}
          <div
            style={{
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: 16,
              alignContent: "start",
              minHeight: 0,
            }}
          >
            <Section
              title="Monat wählen"
              icon={<FaCalendarAlt />}
              info="Wähle den Monat, dessen Zeiten exportiert oder per E-Mail versendet werden sollen."
            >
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ ...inputBase, width: 240 }}
              />
              <div style={{ marginTop: 10 }}>
                <span style={pill("rgba(209, 250, 229, .6)", "#065f46")}>
                  ausgewählt: {month}
                </span>
              </div>
            </Section>

            <Section
              title="Download"
              icon={<FaDownload />}
              info="Lädt alle Zeiten des gewählten Monats herunter. Excel eignet sich für Auswertungen; CSV ist roh und universell."
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button onClick={() => download("xlsx")}>
                  <FaDownload style={{ marginRight: 6 }} /> Als Excel (.xlsx)
                </Button>
                <Button variant="secondary" onClick={() => download("csv")}>
                  <FaDownload style={{ marginRight: 6 }} /> Als CSV
                </Button>
              </div>
            </Section>
          </div>

          {/* RIGHT: E-Mail Einstellungen */}
          <Section
            title="E-Mail Einstellungen"
            icon={<FaEnvelope />}
            info="Beim automatischen Versand wird am 1. des Monats um 03:00 Uhr der Vormonat verschickt."
          >
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
              <label>Versand-Methode</label>
              <Select
                value="smtp"
                onChange={() => {}} // keine Änderung mehr möglich
                options={[
                  { value: "smtp", label: "TempSys-Mailserver" }
                ]}
                style={{ width: 320 }}
              />

              <label>Automatisch jeden Monat senden</label>
              <div>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={cfg.active}
                    onChange={(e) => setCfg((s) => ({ ...s, active: e.target.checked }))}
                  />
                  Aktiv
                </label>
                <div style={{ color: "#666", fontSize: 13, marginTop: 4 }}>
                  Läuft am 1. des Monats um 03:00 für den Vormonat.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16 }}>{chipBox("Empfänger (To)", "recipients")}</div>

            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <Button onClick={save} disabled={saving}>
                <FaSave style={{ marginRight: 6 }} /> {saving ? "Speichere…" : "Speichern"}
              </Button>
              <Button onClick={sendNow} disabled={sending || !canSend}>
                <FaEnvelope style={{ marginRight: 6 }} /> {sending ? "Sende…" : "Jetzt E-Mail senden"}
              </Button>
            </div>

            {msg && (
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: msg.type === "success" ? "#0c7a43" : "#7a1c1c",
                  color: "#fff",
                }}
              >
                {msg.text}
              </div>
            )}
          </Section>
        </div>
      )}
    </Card>
  );
}
