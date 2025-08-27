// src/components/KonfiguratorModal.js
import React, { useState } from "react";
import { FaClock, FaPaintBrush, FaHeadset, FaCloud } from "react-icons/fa";

const KonfiguratorModal = ({ isOpen, onClose }) => {
  const [anzahl, setAnzahl] = useState(1);
  const [version, setVersion] = useState("wand");
  const [support, setSupport] = useState("basis");
  const [hosting, setHosting] = useState("cloud");
  const [branding, setBranding] = useState(false);
  const [kundeName, setKundeName] = useState("");
  const [logo, setLogo] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Angebot angefordert! (Simulation)");
    onClose();
  };

  const handleLogoChange = (e) => setLogo(e.target.files[0]);

  // Preise (unverändert zur bisherigen Logik)
  const gerätePreis = version === "quickfix" ? 839 : 799;
  const brandingPreis = branding ? 49 : 0;
  const supportPreis = support === "premium" ? 149 : 0;
  const hostingPreis = hosting === "cloud" ? 15 : 0; // monatlich, Anzeige unten
  const gesamt = anzahl * gerätePreis + brandingPreis + supportPreis;

  // ---- TempSys Theme (nur für dieses Modal) ----
  const theme = {
    bgOverlay: "rgba(0,0,0,.6)",
    modalBg: "#151923",
    surface: "#1b2130",
    surface2: "#0f1115",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    border: "#2a3040",
    primary: "#e03131",
    primary600: "#c42727",
    focus: "#5ab0ff",
  };

  // ---- Styles (scoped) ----
  const overlayStyle = {
    position: "fixed",
    inset: 0,
    backgroundColor: theme.bgOverlay,
    backdropFilter: "blur(2px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
    padding: "24px",
  };

  const modalStyle = {
    width: "900px",
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: "16px",
    background: `linear-gradient(180deg, ${theme.modalBg} 0%, ${theme.surface2} 100%)`,
    border: `1px solid ${theme.border}`,
    boxShadow: "0 20px 60px rgba(0,0,0,.45)",
    color: theme.text,
    padding: "24px",
  };

  const headerStyle = {
    marginBottom: "18px",
    fontSize: "1.6rem",
    fontWeight: 700,
    letterSpacing: "-.01em",
    color: theme.primary,
  };

  const formStyle = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  };

  const leftColStyle = { display: "grid", gap: "14px", alignContent: "start" };

  const labelStyle = {
    display: "block",
    fontWeight: 600,
    color: theme.text,
    marginBottom: "6px",
  };

  const inputBase = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    background: theme.surface,
    color: theme.text,
    outline: "none",
  };

  const inputStyle = {
    ...inputBase,
  };

  const checkboxRow = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px",
    borderRadius: "10px",
    border: `1px solid ${theme.border}`,
    background: theme.surface,
  };

  const fileInputStyle = {
    ...inputBase,
    padding: "8px 10px",
    background: theme.surface,
  };

  const buttonRow = { display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" };

  const submitButton = {
    backgroundColor: theme.primary,
    color: "#fff",
    border: "1px solid transparent",
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    boxShadow: "0 6px 16px rgba(224,49,49,.25)",
  };

  const cancelButton = {
    backgroundColor: "transparent",
    color: theme.text,
    border: `1px solid ${theme.border}`,
    padding: "12px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
  };

  const summaryStyle = {
    background: `linear-gradient(180deg, rgba(224,49,49,.08) 0%, rgba(224,49,49,.04) 100%), ${theme.surface}`,
    padding: "16px",
    borderRadius: "12px",
    border: `1px solid ${theme.border}`,
    color: theme.text,
    alignSelf: "start",
  };

  const liStyle = { listStyle: "none", padding: 0, lineHeight: 1.9, color: theme.textDim };
  const iconStyle = { marginRight: "10px", color: theme.primary };
  const h3Style = { marginBottom: "10px", fontSize: "1.1rem", color: theme.text };

  const hintStyle = { marginTop: 6, fontSize: ".85rem", color: theme.textDim };

  return (
    <div style={overlayStyle} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <h2 style={headerStyle}>TempSys‑Paket konfigurieren</h2>

        <form onSubmit={handleSubmit} style={formStyle}>
          {/* Linke Spalte */}
          <div style={leftColStyle}>
            <div>
              <label style={labelStyle}>Anzahl Uhren</label>
              <input
                type="number"
                name="anzahl"
                min="1"
                value={anzahl}
                onChange={(e) => setAnzahl(Number(e.target.value))}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Version</label>
              <select
                name="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                style={inputStyle}
              >
                <option value="wand">Wandmontage</option>
                <option value="quickfix">QuickFix</option>
              </select>
            </div>

            <div style={checkboxRow}>
              <input
                type="checkbox"
                id="branding"
                name="branding"
                checked={branding}
                onChange={(e) => setBranding(e.target.checked)}
              />
              <label htmlFor="branding" style={{ margin: 0, color: theme.text }}>
                Kundenspezifisches Branding
              </label>
            </div>

            {branding && (
              <>
                <div>
                  <label style={labelStyle}>Kundenname</label>
                  <input
                    type="text"
                    name="kundenname"
                    value={kundeName}
                    onChange={(e) => setKundeName(e.target.value)}
                    style={inputStyle}
                  />
                  <div style={hintStyle}>Wird für Startbildschirm & Angebot verwendet.</div>
                </div>

                <div>
                  <label style={labelStyle}>Logo hochladen</label>
                  <input
                    type="file"
                    name="logo"
                    onChange={handleLogoChange}
                    accept=".png, .jpg, .jpeg, .svg"
                    style={fileInputStyle}
                  />
                </div>
              </>
            )}

            <div>
              <label style={labelStyle}>Support</label>
              <select
                name="support"
                value={support}
                onChange={(e) => setSupport(e.target.value)}
                style={inputStyle}
              >
                <option value="basis">Basis</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Hosting</label>
              <select
                name="hosting"
                value={hosting}
                onChange={(e) => setHosting(e.target.value)}
                style={inputStyle}
              >
                <option value="cloud">Cloud</option>
                <option value="local">Eigenes Netzwerk</option>
              </select>
              <div style={hintStyle}>
                Cloud‑Hosting zzgl. {hostingPreis} €/Monat (nur Anzeige, nicht im Gesamtpreis enthalten).
              </div>
            </div>

            <div style={buttonRow}>
              <button type="submit" style={submitButton}>Angebot anfordern</button>
              <button type="button" onClick={onClose} style={cancelButton}>Abbrechen</button>
            </div>
          </div>

          {/* Rechte Spalte: Preisübersicht */}
          <div style={summaryStyle}>
            <h3 style={h3Style}>Preisübersicht</h3>
            <ul style={liStyle}>
              <li>
                <FaClock style={iconStyle} />
                {anzahl}× Gerät ({version === "quickfix" ? "QuickFix" : "Wand"}) –{" "}
                {anzahl * gerätePreis} €
              </li>
              {branding && (
                <li>
                  <FaPaintBrush style={iconStyle} />
                  Branding – 49 €
                </li>
              )}
              {support === "premium" && (
                <li>
                  <FaHeadset style={iconStyle} />
                  Premium Support – 149 €
                </li>
              )}
              {hosting === "cloud" && (
                <li>
                  <FaCloud style={iconStyle} />
                  Cloud‑Hosting – 15 €/Monat
                </li>
              )}
            </ul>
            <h4 style={{ marginTop: "12px", fontSize: "1.1rem" }}>
              Gesamt: <strong>{gesamt} €</strong> zzgl. MwSt.
            </h4>
          </div>
        </form>
      </div>
    </div>
  );
};

export default KonfiguratorModal;
