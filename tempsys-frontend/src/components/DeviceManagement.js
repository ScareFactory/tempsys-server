// src/components/DeviceManagement.js
import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Button from "./ui/Button";
import Card from "./ui/Card";
import {
  FaSync,
  FaSave,
  FaSearch,
  FaPlug,
  FaWifi,
  FaMicrochip,
  FaTag,
  FaStickyNote,
} from "react-icons/fa";

export default function DeviceManagement({ companyId }) {
  const { token } = useContext(AuthContext);
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(null); // id, die gerade gespeichert wird

  // —— Glas-Design Tokens (gleich wie bei den anderen Cards) ——
  const glass = {
    bg: "rgba(17, 25, 40, 0.65)",
    border: "1px solid rgba(255,255,255,0.08)",
    shadow:
      "0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
    blur: "saturate(180%) blur(14px)",
    text: "#e5e7eb",
    sub: "#9ca3af",
    inputBg: "rgba(255,255,255,0.06)",
    inputBorder: "1px solid rgba(255,255,255,0.12)",
    chipBg: "rgba(255,255,255,0.05)",
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/clocks`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await res.json();
      setDevices(
        (Array.isArray(list) ? list : []).map((x) => ({
          id: x.id,
          name: x.name ?? "",
          serial: x.serial ?? "",
          mac: x.mac ?? "",
          ip: x.ip ?? "",
          version: x.version ?? "",
          online: !!x.online,
          lastSeen: x.lastSeen ?? x.last_seen ?? null,
          notes: x.notes ?? "",
        }))
      );
    } catch (e) {
      console.error("Geräte laden fehlgeschlagen:", e);
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) load();
  }, [companyId, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onChangeField = (id, field, value) => {
    setDevices((ds) => ds.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  };

  const saveMeta = async (id) => {
    const d = devices.find((x) => x.id === id);
    if (!d) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ name: d.name, notes: d.notes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      console.error("Speichern fehlgeschlagen:", e);
      alert("Konnte nicht speichern.");
    } finally {
      setSaving(null);
      load();
    }
  };

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return devices;
    return devices.filter((d) =>
      [d.name, d.serial, d.mac, d.ip, d.version].some((v) =>
        (v || "").toLowerCase().includes(q)
      )
    );
  }, [devices, filter]);

  return (
    <Card>
      {/* Header + Suche */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          color: glass.text,
        }}
      >
        <h2 style={{ margin: 0 }}>Geräte verwalten</h2>
        <Button
          variant="secondary"
          onClick={load}
          title="Neu laden"
          style={{ padding: "6px 10px" }}
        >
          <FaSync />
        </Button>

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            background: glass.inputBg,
            border: glass.inputBorder,
            boxShadow: glass.shadow,
            backdropFilter: glass.blur,
            WebkitBackdropFilter: glass.blur,
            minWidth: 320,
          }}
        >
          <FaSearch style={{ color: glass.sub }} />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Suche: Name, Seriennr., MAC, IP…"
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              width: "100%",
              color: glass.text,
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ color: glass.sub }}>lade …</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: glass.sub }}>Keine Geräte gefunden.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 18,
          }}
        >
          {filtered.map((d) => (
            <div
              key={d.id}
              style={{
                borderRadius: 14,
                padding: 14,
                background: glass.bg,
                border: glass.border,
                boxShadow: glass.shadow,
                backdropFilter: glass.blur,
                WebkitBackdropFilter: glass.blur,
                color: glass.text,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Kopfzeile */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  title={d.online ? "Online" : "Offline"}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: d.online ? "#10b981" : "rgba(255,255,255,0.25)",
                    boxShadow: d.online
                      ? "0 0 0 6px rgba(16,185,129,.15)"
                      : "none",
                  }}
                />
                <strong
                  style={{
                    fontSize: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <FaPlug />
                  {d.name?.trim() || "— Unbenannt —"}
                </strong>
                <div
                  style={{
                    marginLeft: "auto",
                    color: glass.sub,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  v{d.version || "—"}
                </div>
              </div>

              {/* Bearbeitbare Felder */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FaTag />
                  <span style={{ width: 90, color: glass.sub }}>Name</span>
                  <input
                    value={d.name}
                    onChange={(e) => onChangeField(d.id, "name", e.target.value)}
                    placeholder="Anzeigename"
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: glass.inputBg,
                      border: glass.inputBorder,
                      color: glass.text,
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <FaStickyNote style={{ marginTop: 8 }} />
                  <span style={{ width: 90, color: glass.sub }}>Notizen</span>
                  <textarea
                    value={d.notes}
                    onChange={(e) => onChangeField(d.id, "notes", e.target.value)}
                    placeholder="Optionale Notiz (Standort, Ansprechpartner …)"
                    rows={3}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: glass.inputBg,
                      border: glass.inputBorder,
                      color: glass.text,
                      resize: "vertical",
                      minHeight: 92,
                    }}
                  />
                </label>
              </div>

              {/* Readonly Infos */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  fontSize: 13,
                  color: glass.sub,
                }}
              >
                <div title="Seriennummer" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FaMicrochip />{" "}
                  <code
                    style={{
                      background: glass.chipBg,
                      padding: "3px 8px",
                      borderRadius: 8,
                      border: glass.inputBorder,
                      color: glass.text,
                    }}
                  >
                    {d.serial || "—"}
                  </code>
                </div>
                <div title="MAC" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <FaWifi />{" "}
                  <code
                    style={{
                      background: glass.chipBg,
                      padding: "3px 8px",
                      borderRadius: 8,
                      border: glass.inputBorder,
                      color: glass.text,
                    }}
                  >
                    {d.mac || "—"}
                  </code>
                </div>
                <div title="IP" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>IP</span>
                  <code
                    style={{
                      background: glass.chipBg,
                      padding: "3px 8px",
                      borderRadius: 8,
                      border: glass.inputBorder,
                      color: glass.text,
                    }}
                  >
                    {d.ip || "—"}
                  </code>
                </div>
                <div title="Zuletzt gesehen" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Last seen</span>
                  <span style={{ color: glass.text }}>
                    {d.lastSeen ? new Date(d.lastSeen).toLocaleString() : "—"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <Button variant="secondary" onClick={load}>
                  <FaSync style={{ marginRight: 6 }} />
                  Aktualisieren
                </Button>
                <Button onClick={() => saveMeta(d.id)} disabled={saving === d.id}>
                  {saving === d.id ? (
                    "Speichere…"
                  ) : (
                    <>
                      <FaSave style={{ marginRight: 6 }} />
                      Speichern
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
