// src/components/LoginModal.js
import React, { useState, useContext, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function LoginModal({ isOpen, onClose }) {
  // --- STATE (Credentials) ---
  const [company, setCompany]   = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // --- STEP handling ---
  // credentials | email_input | email_otp | totp
  const [step, setStep]           = useState("credentials");
  const [tempToken, setTempToken] = useState(null);

  // --- Email flow ---
  const [email, setEmail] = useState(""); // for first login email capture
  const [code, setCode]   = useState(""); // for otp/totp input

  // --- Auto-Send E-Mail-OTP nach Folgelogins ---
  const [autoSendEmailOtp, setAutoSendEmailOtp] = useState(false);
  const autoSentRef = useRef(false); // verhindert mehrfaches Senden je Modal-Session

  // --- UI ---
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login }  = useContext(AuthContext);

  const t = {
    bgOverlay: "rgba(0,0,0,.6)",
    surfaceGlass: "rgba(21,25,35,0.55)",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    border: "rgba(255,255,255,0.15)",
    primary: "#e03131",
    primary600: "#c42727",
    focus: "#5ab0ff",
  };

  // Reset bei Öffnen des Modals
  useEffect(() => {
    if (isOpen) {
      setCompany("");
      setUsername("");
      setPassword("");
      setEmail("");
      setCode("");
      setTempToken(null);
      setStep("credentials");
      setError("");
      setLoading(false);

      // Auto-Send Flags zurücksetzen
      setAutoSendEmailOtp(false);
      autoSentRef.current = false;
    }
  }, [isOpen]);

  // === Auto-Send für Folgelogins (email_otp & E-Mail bereits in DB) ===
  // WICHTIG: Dieser Hook MUSS VOR einem early return stehen.
  useEffect(() => {
    if (step === "email_otp" && autoSendEmailOtp && tempToken && !autoSentRef.current) {
      autoSentRef.current = true;
      // sendet an die DB-E-Mail (da kein email-Feld im Body)
      startEmailOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, autoSendEmailOtp, tempToken]);

  if (!isOpen) return null;

  // ============ ACTIONS ============
  const handleLogin = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, username, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || "Login fehlgeschlagen");
        return;
      }

      // Falls Backend direkt token + role liefert (kein weiterer Schritt nötig)
      if (!data.next) {
        login(data.token, data.role, data.username, data.companyId, data.userId);
        onClose();
        if (data.role === "admin") navigate("/admin");
        else if (data.role === "companyAdmin") navigate("/company-dashboard");
        else navigate("/dashboard");
        return;
      }

      // Step-basierter Flow
      setTempToken(data.temp_token || null);
      setCode("");
      setEmail("");

      // Wenn der nächste Schritt "email_otp" ist, automatisch Code versenden
      // (an die in der DB hinterlegte E-Mail) – kein Klick nötig.
      setAutoSendEmailOtp(data.next === "email_otp");

      setStep(data.next); // "email_input" | "email_otp" | "totp"
    } catch {
      setError("Server nicht erreichbar");
    } finally {
      setLoading(false);
    }
  };

  const startEmailOtp = async () => {
    // Verwendet für: email_input (mit email) ODER erneut senden in email_otp (ohne email)
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_token: tempToken,
          // nur mitsenden, wenn wir gerade in email_input sind:
          email: step === "email_input" ? email : undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Fehler beim Senden des Codes");
        return;
      }
      setStep("email_otp");
    } catch {
      setError("Server nicht erreichbar");
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailOtp = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: tempToken, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Code ungültig oder abgelaufen");
        return;
      }
      // Erfolgreich -> volle Session
      login(data.token, data.role, data.username, data.companyId, data.userId);
      onClose();
      if (data.role === "admin") navigate("/admin");
      else if (data.role === "companyAdmin") navigate("/company-dashboard");
      else navigate("/dashboard");
    } catch {
      setError("Server nicht erreichbar");
    } finally {
      setLoading(false);
    }
  };

  const verifyTotp = async () => {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temp_token: tempToken, code }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Code ungültig");
        return;
      }
      // Erfolgreich -> volle Session
      login(data.token, data.role, data.username, data.companyId, data.userId);
      onClose();
      if (data.role === "admin") navigate("/admin");
      else if (data.role === "companyAdmin") navigate("/company-dashboard");
      else navigate("/dashboard");
    } catch {
      setError("Server nicht erreichbar");
    } finally {
      setLoading(false);
    }
  };

  // ============ RENDER ============
  return (
    <div className="ts-login-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <style>{css(t)}</style>
      <div className="ts-login-modal" onClick={(e) => e.stopPropagation()}>
        {step === "credentials" && (
          <>
            <h2 className="ts-login-title">Login</h2>
            <p className="ts-login-sub">Melden Sie sich mit Ihren Firmendaten an.</p>

            <label className="ts-label">
              Firmenname
              <input
                type="text"
                placeholder="Firmenname"
                className="ts-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>

            <label className="ts-label">
              Benutzername
              <input
                type="text"
                placeholder="Ihr Benutzername"
                className="ts-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>

            <label className="ts-label">
              Passwort
              <input
                type="password"
                placeholder="••••••••"
                className="ts-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error && <div className="ts-error">{error}</div>}

            <div className="ts-actions">
              <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
                {loading ? "Anmelden…" : "Anmelden"}
              </button>
              <button className="btn btn-ghost" onClick={onClose}>Schließen</button>
            </div>
          </>
        )}

        {step === "email_input" && (
          <>
            <h2 className="ts-login-title">E-Mail verknüpfen</h2>
            <p className="ts-login-sub">Erster Login erkannt. Bitte E-Mail angeben, wir senden einen Code zur Bestätigung.</p>

            <label className="ts-label">
              E-Mail-Adresse
              <input
                type="email"
                placeholder="name@domain.tld"
                className="ts-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>

            {error && <div className="ts-error">{error}</div>}

            <div className="ts-actions">
              <button className="btn btn-primary" onClick={startEmailOtp} disabled={loading || !email}>
                {loading ? "Sende Code…" : "Code senden"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setStep("credentials"); setError(""); }}>
                Zurück
              </button>
            </div>
          </>
        )}

        {step === "email_otp" && (
          <>
            <h2 className="ts-login-title">E-Mail-Code eingeben</h2>
            <p className="ts-login-sub">Wir haben dir einen Bestätigungscode per E-Mail gesendet.</p>

            <label className="ts-label">
              6-stelliger Code
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                className="ts-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>

            {error && <div className="ts-error">{error}</div>}

            <div className="ts-actions">
              <button className="btn btn-primary" onClick={verifyEmailOtp} disabled={loading || !code}>
                {loading ? "Prüfe…" : "Bestätigen"}
              </button>
              <button className="btn btn-ghost" onClick={startEmailOtp} disabled={loading}>
                Code neu senden
              </button>
            </div>
          </>
        )}

        {step === "totp" && (
          <>
            <h2 className="ts-login-title">2FA-App Code</h2>
            <p className="ts-login-sub">Bitte den 6-stelligen Code aus deiner Authenticator-App eingeben.</p>

            <label className="ts-label">
              6-stelliger Code
              <input
                type="text"
                inputMode="numeric"
                placeholder="123456"
                className="ts-input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>

            {error && <div className="ts-error">{error}</div>}

            <div className="ts-actions">
              <button className="btn btn-primary" onClick={verifyTotp} disabled={loading || !code}>
                {loading ? "Prüfe…" : "Bestätigen"}
              </button>
              <button className="btn btn-ghost" onClick={() => { setStep("credentials"); setError(""); }}>
                Zurück
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function css(t) {
  return `
  .ts-login-overlay{
    position: fixed; inset: 0; z-index: 2000;
    background: ${t.bgOverlay};
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
  }
  .ts-login-modal{
    width: min(420px, 100%);
    border-radius: 16px;
    background: ${t.surfaceGlass};
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    border: 1px solid ${t.border};
    color: ${t.text};
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    padding: 22px;
    display: grid; gap: 14px;
  }
  .ts-login-title{ margin: 0; font-size: 1.45rem; font-weight: 800; }
  .ts-login-sub{ margin: -4px 0 8px; color: ${t.textDim}; font-size: .95rem; }

  .ts-label{ display: grid; gap: 6px; font-weight: 600; }
  .ts-input{
    width: 100%; padding: 10px 12px; border-radius: 10px;
    border: 1px solid ${t.border}; background: rgba(0,0,0,0.3); color: ${t.text};
    outline: none;
  }
  .ts-input:focus{ outline: 2px solid ${t.focus}; outline-offset: 2px; }

  .ts-error{
    background: rgba(224,49,49,.12);
    border: 1px solid rgba(224,49,49,.4);
    color: ${t.text};
    border-radius: 10px;
    padding: 10px 12px;
    font-size: .95rem;
  }

  .ts-actions{ display: flex; gap: 10px; margin-top: 2px; flex-wrap: wrap; }
  .btn{
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 10px; padding: 12px 18px; font-weight: 700;
    border: 1px solid transparent; cursor: pointer;
    transition: all .15s ease;
  }
  .btn:disabled{ opacity: .7; cursor: default; }
  .btn-primary{ background: ${t.primary}; color: #fff; box-shadow: 0 6px 16px rgba(224,49,49,.25); }
  .btn-primary:hover{ background: ${t.primary600}; }
  .btn-ghost{ background: transparent; color: ${t.text}; border: 1px solid ${t.border}; }
  .btn-ghost:hover{ background: rgba(255,255,255,0.05); }
  `;
}
