// src/components/LoginData.js
import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Button from "./ui/Button";
import { FaUser, FaBuilding, FaKey, FaMobileAlt, FaQrcode, FaCheck, FaTimes } from "react-icons/fa";

export default function LoginData() {
  const { username, companyId, userId, token } = useContext(AuthContext);

  // ---------- Shared Styles ----------
  const glass = {
    border: "1px solid rgba(255,255,255,0.15)",
    background: "linear-gradient(180deg, rgba(17, 24, 39, 0.65), rgba(17, 24, 39, 0.45))",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    borderRadius: 14,
    color: "#fff",
  };

  const pageWrap = { ...glass, padding: 20, maxWidth: 1200, margin: "0 auto" };
  const gridOne = { display: "grid", gridTemplateColumns: "1fr", gap: 16 };
  const subCard = { ...glass, padding: "12px 14px" };

  const infoRow = {
    ...subCard,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minWidth: 0,
  };

  const infoLeft  = { display: "inline-flex", alignItems: "center", gap: 8, opacity: 0.95 };
  const infoRight = {
    fontWeight: 700,
    textAlign: "right",
    marginLeft: "auto",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "60%",
  };

  const inputBase = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.25)",
    background: "rgba(255,255,255,.06)",
    color: "#fff",
    outline: "none",
    width: "100%",
  };

  // ---------- Left: Passwort ändern ----------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword]         = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus]                   = useState(null);
  const [saving, setSaving]                   = useState(false);

  const handlePasswordChange = async () => {
    setStatus(null);
    if (!currentPassword || !newPassword) {
      setStatus({ type: "error", message: "Bitte alle Felder ausfüllen." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus({ type: "error", message: "Passwörter stimmen nicht überein." });
      return;
    }
    try {
      setSaving(true);
      const res = await fetch(`/api/users/${userId}/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: "success", message: "Passwort erfolgreich geändert." });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setStatus({ type: "error", message: data.message || "Fehler beim Ändern." });
      }
    } catch {
      setStatus({ type: "error", message: "Server nicht erreichbar." });
    } finally {
      setSaving(false);
    }
  };

  // ---------- Right: TOTP (Authenticator) ----------
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loadingTotp, setLoadingTotp] = useState(false);
  const [setup, setSetup]             = useState(null); // { qrDataUrl, secret }
  const [totpCode, setTotpCode]       = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [totpMsg, setTotpMsg]         = useState(null);

  const fetchStatus = async () => {
    try {
      setLoadingTotp(true);
      const res = await fetch("/api/auth/2fa/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (j.ok) {
        setTotpEnabled(!!j.enabled);
      } else {
        setTotpMsg({ type: "error", message: j.message || "Status konnte nicht geladen werden." });
      }
    } catch {
      setTotpMsg({ type: "error", message: "Server nicht erreichbar." });
    } finally {
      setLoadingTotp(false);
    }
  };

  useEffect(() => { fetchStatus(); /* eslint-disable-line react-hooks/exhaustive-deps */ }, []);

  const startSetup = async () => {
    try {
      setTotpMsg(null);
      setLoadingTotp(true);
      const res = await fetch("/api/auth/2fa/setup/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const j = await res.json();
      if (!j.ok) {
        setTotpMsg({ type: "error", message: j.message || "Setup konnte nicht gestartet werden." });
        return;
      }
      // Backend liefert: { ok, secret, otpauthUrl, qrDataUrl }
      setSetup({ qrDataUrl: j.qrDataUrl, secret: j.secret });
      setTotpCode("");
    } catch {
      setTotpMsg({ type: "error", message: "Server nicht erreichbar." });
    } finally {
      setLoadingTotp(false);
    }
  };

  const verifySetup = async () => {
    try {
      setTotpMsg(null);
      setLoadingTotp(true);
      const res = await fetch("/api/auth/2fa/setup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: totpCode }),
      });
      const j = await res.json();
      if (!j.ok) {
        setTotpMsg({ type: "error", message: j.message || "Code ungültig." });
        return;
      }
      setSetup(null);
      setTotpEnabled(true);
      setTotpMsg({ type: "success", message: "Authenticator erfolgreich aktiviert." });
      setTotpCode("");
    } catch {
      setTotpMsg({ type: "error", message: "Server nicht erreichbar." });
    } finally {
      setLoadingTotp(false);
    }
  };

  const cancelSetup = () => {
    setSetup(null);
    setTotpCode("");
    setTotpMsg(null);
  };

  const disableTotp = async () => {
    if (!disableCode) {
      setTotpMsg({ type: "error", message: "Bitte 6-stelligen App-Code eingeben." });
      return;
    }
    try {
      setTotpMsg(null);
      setLoadingTotp(true);
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: disableCode }),
      });
      const j = await res.json();
      if (!j.ok) {
        setTotpMsg({ type: "error", message: j.message || "Deaktivieren fehlgeschlagen." });
        return;
      }
      setTotpEnabled(false);
      setDisableCode("");
      setSetup(null);
      setTotpMsg({ type: "success", message: "Authenticator deaktiviert." });
    } catch {
      setTotpMsg({ type: "error", message: "Server nicht erreichbar." });
    } finally {
      setLoadingTotp(false);
    }
  };

  return (
    <div style={pageWrap} className="log-scroll">
      <style>{`
        .log-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.45) transparent; }
        .log-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .log-scroll::-webkit-scrollbar-track { background: transparent; }
        .log-scroll::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.45); border-radius: 4px; }
        .log-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.65); }

        @media (min-width: 900px){
          .two-col { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
        }
      `}</style>

      <h3 style={{ margin: 0 }}>Login-Daten</h3>

      <div className="two-col" style={gridOne}>
        {/* LEFT COLUMN */}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={infoRow}>
              <span style={infoLeft}><FaUser /> Benutzername</span>
              <strong style={infoRight}>{username || "—"}</strong>
            </div>

            <div style={infoRow}>
              <span style={infoLeft}><FaBuilding /> Firma (ID)</span>
              <strong style={infoRight}>{companyId || "—"}</strong>
            </div>
          </div>

          <div style={{ ...subCard, display: "grid", gap: 12 }}>
            <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <FaKey style={{ opacity: 0.85 }} /> Passwort ändern
            </h4>

            <input
              type="password"
              placeholder="Aktuelles Passwort"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={inputBase}
            />
            <input
              type="password"
              placeholder="Neues Passwort"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputBase}
            />
            <input
              type="password"
              placeholder="Neues Passwort wiederholen"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputBase}
            />

            <div style={{ display: "flex", gap: 10 }}>
              <Button onClick={handlePasswordChange} disabled={saving}>
                {saving ? "Speichere …" : "Passwort ändern"}
              </Button>
            </div>

            {status && (
              <div
                style={{
                  marginTop: 2,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: status.type === "success" ? "#0c7a43" : "#ff0000",
                  color: "#fff",
                }}
              >
                {status.message}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN — AUTHENTICATOR */}
        <div style={{ ...subCard, display: "grid", gap: 12 }}>
          <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <FaMobileAlt style={{ opacity: 0.9 }} /> Authenticator-App
          </h4>

          <div style={{ fontSize: 14, opacity: 0.9 }}>
            {totpEnabled ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FaCheck /> Aktiviert
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <FaTimes /> Nicht aktiviert
              </span>
            )}
          </div>

          {!totpEnabled && !setup && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={startSetup} disabled={loadingTotp}>
                {loadingTotp ? "Starte …" : (<><FaQrcode />&nbsp;Authenticator einrichten</>)}
              </Button>
            </div>
          )}

          {!totpEnabled && setup && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div>Schritt 1: Öffne deine Authenticator-App und scanne den QR-Code:</div>
                <img
                  src={setup.qrDataUrl}
                  alt="QR"
                  style={{ width: 220, height: 220, alignSelf: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,.2)" }}
                />
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Alternativ Key manuell eingeben: <code>{setup.secret}</code>
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div>Schritt 2: 6-stelligen Code eingeben</div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  style={inputBase}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <Button onClick={verifySetup} disabled={loadingTotp || !totpCode}>Bestätigen</Button>
                  <Button onClick={cancelSetup}>Abbrechen</Button>
                </div>
              </div>
            </div>
          )}

          {totpEnabled && (
            <div style={{ display: "grid", gap: 8 }}>
              <div>2FA deaktivieren (6-stelliger App-Code erforderlich)</div>
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                style={inputBase}
              />
              <div style={{ display: "flex", gap: 10 }}>
                <Button onClick={disableTotp} disabled={loadingTotp || !disableCode}>Deaktivieren</Button>
              </div>
            </div>
          )}

          {totpMsg && (
            <div
              style={{
                marginTop: 2,
                padding: "8px 10px",
                borderRadius: 10,
                background: totpMsg.type === "success" ? "#0c7a43" : "#ff0000",
                color: "#fff",
              }}
            >
              {totpMsg.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
