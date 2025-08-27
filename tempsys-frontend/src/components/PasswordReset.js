// tempsys-frontend/src/components/PasswordReset.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaKey, FaSyncAlt, FaLock, FaUnlock, FaClipboard } from "react-icons/fa";

export default function PasswordReset() {
  const { token } = useContext(AuthContext);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  // Firmen laden
  const loadCompanies = async () => {
    try {
      const r = await fetch(`/api/companies`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setCompanies(Array.isArray(data) ? data : []);
    } catch (e) {
      setCompanies([]);
      setMsg({ type: "error", text: "Firmenliste konnte nicht geladen werden." });
    }
  };

  // Nutzer der Firma laden
  const loadUsers = async (cid) => {
    if (!cid) return;
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/companies/${cid}/users`, { headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const list = await r.json();
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      setMsg({ type: "error", text: "Nutzerliste konnte nicht geladen werden." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (companyId) loadUsers(companyId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  // Einzel-Reset
  const resetOne = async (userId) => {
    setMsg(null);
    try {
      const r = await fetch(`/api/users/${userId}/password-reset`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMsg({ type: "success", text: "Passwort auf pass1234 gesetzt." });
      loadUsers(companyId);
    } catch {
      setMsg({ type: "error", text: "Zurücksetzen fehlgeschlagen." });
    }
  };

  // Alle einer Firma zurücksetzen
  const resetAll = async () => {
    if (!companyId) return;
    if (!window.confirm("Alle Nutzer dieser Firma auf pass1234 setzen?")) return;
    setMsg(null);
    try {
      const r = await fetch(`/api/companies/${companyId}/password-reset-all`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setMsg({ type: "success", text: "Alle Nutzerpasswörter auf pass1234 gesetzt." });
      loadUsers(companyId);
    } catch {
      setMsg({ type: "error", text: "Massen-Reset fehlgeschlagen." });
    }
  };

  // Lock (64-Zeichen-Token generieren & setzen)
  const lockUser = async (userId) => {
    setMsg(null);
    try {
      const r = await fetch(`/api/users/${userId}/lock`, {
        method: "PUT",
        headers,
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const token = data?.token || "";
      setMsg({ type: "success", text: "Account gelockt. Token unten sichtbar." });
      await loadUsers(companyId);

      // Optional: Token kurz hervorheben (copy to clipboard anbieten)
      try {
        await navigator.clipboard.writeText(token);
        setMsg({ type: "success", text: "Account gelockt. Token kopiert." });
      } catch {
        // Clipboard kann verweigert werden – halb so wild
      }
    } catch {
      setMsg({ type: "error", text: "Sperren fehlgeschlagen." });
    }
  };

  // Token kopieren (bei bereits gelockten Accounts)
  const copyToken = async (token) => {
    try {
      await navigator.clipboard.writeText(String(token || ""));
      setMsg({ type: "success", text: "Token in Zwischenablage kopiert." });
    } catch {
      setMsg({ type: "error", text: "Kopieren nicht möglich." });
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <FaKey />
        <h2 style={{ margin: 0 }}>Passwort-Reset / Account-Lock</h2>
      </div>

      <p>Wähle eine Firma, setze Passwörter auf <b>pass1234</b> oder sperre Accounts mit einem zufälligen 64‑Zeichen‑Token.</p>

      {/* Firmen-Auswahl + Alle-Reset */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 12 }}>
        <Select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          options={[
            { value: "", label: "— Firma auswählen —" },
            ...companies.map(c => ({ value: c.id, label: c.name })),
          ]}
        />
        <Button onClick={resetAll} disabled={!companyId}>
          <FaSyncAlt style={{ marginRight: 6 }} /> Alle auf pass1234
        </Button>
      </div>

      {/* Statusmeldung */}
      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid",
            borderColor: msg.type === "success" ? "rgba(60,200,120,.4)" : "rgba(224,49,49,.4)",
            background: msg.type === "success" ? "rgba(60,200,120,.08)" : "rgba(224,49,49,.08)",
            color: msg.type === "success" ? "#a6f4c5" : "#ffc9c9",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Nutzerliste */}
      {!companyId ? (
        <div style={{ color: "#b4b9c7" }}>Bitte eine Firma auswählen.</div>
      ) : loading ? (
        <div style={{ color: "#b4b9c7" }}>Lade Nutzer…</div>
      ) : (
        <Card>
          {users.length === 0 ? (
            <div style={{ color: "#b4b9c7" }}>Keine Nutzer gefunden.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {users.map(u => (
                <div key={u.id} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  padding: "10px 12px",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 10,
                  background: "rgba(255,255,255,.03)",
                }}>
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <strong>{u.username}</strong>
                      <span style={{ opacity: .7 }}>({u.role})</span>
                      {u.isLocked ? (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          border: "1px solid rgba(224,49,49,.35)",
                          color: "#ffc9c9",
                          background: "rgba(224,49,49,.08)"
                        }}>
                          Account locked (TOS Violation/ Safety)
                        </span>
                      ) : null}
                    </div>

                    {/* Lock-Info + Token-Anzeige (nur wenn gelockt) */}
                    {u.isLocked && (
                        <div style={{ display: "grid", gap: 6 }}>
                            <label style={{ fontSize: 12, opacity: .8 }}>Lock-Token (64 Zeichen):</label>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                            <input
                                className="ap-input"
                                readOnly
                                value={u.lockToken || ""}  // <<— KLARTEXT aus Backend
                                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
                            />
                            <Button variant="secondary" onClick={() => copyToken(u.lockToken)}>
                                <FaClipboard style={{ marginRight: 6 }} /> Kopieren
                            </Button>
                            </div>
                        </div>
                        )}
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "start", justifyContent: "end" }}>
                    <Button onClick={() => resetOne(u.id)} title="Passwort auf pass1234 setzen">
                      <FaKey style={{ marginRight: 6 }} /> Reset
                    </Button>
                    {!u.isLocked ? (
                      <Button variant="destructive" onClick={() => lockUser(u.id)} title="Account sperren (64 Zeichen)">
                        <FaLock style={{ marginRight: 6 }} /> Sperren
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={() => resetOne(u.id)} title="Entsperrt effektiv, weil pass1234 gesetzt und Lock-Token entfernt">
                        <FaUnlock style={{ marginRight: 6 }} /> Entsperren
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
