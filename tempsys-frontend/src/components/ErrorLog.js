// src/components/ErrorLog.js
import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaBug, FaFilter, FaSyncAlt, FaExclamationTriangle, FaTimes } from "react-icons/fa";

export default function DeviceLogs() {
  const { token, companyId } = useContext(AuthContext);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [logs, setLogs] = useState([]);
  const [level, setLevel] = useState("all");
  const [limit, setLimit] = useState(200);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [showErrorsModal, setShowErrorsModal] = useState(false);

  const esRef = useRef(null);

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
    padding: "4px 10px",
    borderRadius: 999,
    background: bg,
    color: fg,
    fontWeight: 700,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,.2)",
    whiteSpace: "nowrap",
  });

  const badgeColors = {
    error: pill("#ff0000", "#ffffff"),
    warn: pill("#ffedd5", "#92400e"),
    info: pill("#dbeafe", "#1e40af"),
    default: pill("#f3f4f6", "#1f2937"),
    selftest_ok: pill("#dcfce7", "#065f46"),
    unknown: pill("#e5e7eb", "#374151"),
  };

  const Section = ({ title, icon, children, info }) => (
    <div style={{ ...glass, padding: 16, display: "flex", flexDirection: "column", minHeight: 0, color: "#fff" }}>
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
        <div style={{ marginTop: 10, color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: 1.35 }}>{info}</div>
      )}
    </div>
  );

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const fmtTime = (iso) => {
    try {
      return new Date(iso).toLocaleString("de-DE");
    } catch {
      return iso || "";
    }
  };

  const isError = (log) => log?.level === "error";
  const errorCount = logs.filter(isError).length;

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const u = `/api/companies/${companyId}/device-logs?level=${encodeURIComponent(
        level
      )}&limit=${encodeURIComponent(String(limit))}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const r = await fetch(u, { headers });
      if (!r.ok) throw new Error("http " + r.status);
      const data = await r.json();
      setLogs(data || []);
    } catch (e) {
      console.error("load logs failed:", e);
      showMsg("error", "Logs konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!companyId || !token) return;
    try { esRef.current?.close?.(); } catch {}
    const es = new EventSource(
      `/api/companies/${companyId}/device-logs/stream?token=${encodeURIComponent(token)}`
    );
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data || "{}");
        if (payload?.type === "log" && payload.log) {
          setLogs((prev) => {
            const next = [payload.log, ...prev];
            if (next.length > limit) next.length = limit;
            return next;
          });
        }
      } catch {}
    };
    return () => {
      try { es.close(); } catch {}
    };
  }, [companyId, token, limit]);

  useEffect(() => {
    if (!companyId) return;
    load();
  }, [companyId, token, level]); // eslint-disable-line

  const listRow = (l) => {
    const codeKey = l.code?.toLowerCase();
    const codeBadge = badgeColors[codeKey] || null;
    const levelBadge = badgeColors[l.level] || badgeColors.default;

    return (
      <div
        key={l.id}
        style={{
          ...glass,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "minmax(180px, 220px) 1fr auto",
          gap: 10,
          alignItems: "center",
          color: "#fff",
          minWidth: 0,
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}>{fmtTime(l.createdAt)}</div>

        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong>{l.serial || `#${l.deviceId || "?"}`}</strong>
            {l.code && <span style={codeBadge || badgeColors.default}>{l.code}</span>}
          </div>

          {l.message && (
            <div style={{ marginTop: 6, whiteSpace: "pre-wrap", lineHeight: 1.4, wordBreak: "break-word" }}>
              {l.message}
            </div>
          )}

          {l.meta && (
            <pre
              style={{
                margin: "8px 0 0 0",
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 10,
                padding: 8,
                fontSize: 12,
                color: "#fff",
                maxHeight: 200,
                overflowY: "auto",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
              className="log-scroll"
            >
              {JSON.stringify(l.meta, null, 2)}
            </pre>
          )}
        </div>

        <div>
          <span style={levelBadge}>{l.level.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <style>{`
        .log-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.45) transparent;
        }
        .log-scroll::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .log-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .log-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.45);
          border-radius: 4px;
        }
        .log-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(255,255,255,0.65);
        }
      `}</style>

      <h2 style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, color: "#fff" }}>
        <FaBug /> Logs
      </h2>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 10,
            background: msg.type === "success" ? "#0c7a43" : msg.type === "info" ? "#1e40af" : "#7a1c1c",
            color: "#fff",
          }}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ color: "#fff" }}>Lade …</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          <Section
            title="Filter & Aktionen"
            icon={<FaFilter />}
            info="Live-Updates via SSE. Der Fehler-Button zeigt nur Einträge mit Level 'error'."
          >
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <label>Level</label>
                <Select
                  value={level}
                  onChange={(e) => setLevel(e?.target?.value || "all")}
                  options={[
                    { value: "all", label: "Alle" },
                    { value: "info", label: "Info" },
                    { value: "warn", label: "Warnung" },
                    { value: "error", label: "Fehler" },
                  ]}
                  style={{ width: 200 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <label>Limit</label>
                <Select
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e?.target?.value || "200"))}
                  options={[
                    { value: "100", label: "100" },
                    { value: "200", label: "200" },
                    { value: "500", label: "500" },
                    { value: "1000", label: "1000" },
                  ]}
                  style={{ width: 200 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                <label>Suche</label>
                <input
                  type="text"
                  placeholder="serial, code, message…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  style={{ ...inputBase }}
                />
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button variant="secondary" onClick={load}>
                  <FaSyncAlt style={{ marginRight: 6 }} />
                  Neu laden
                </Button>
                <Button onClick={() => setShowErrorsModal(true)} title="Nur Fehler anzeigen">
                  <FaExclamationTriangle style={{ marginRight: 6 }} />
                  Fehler
                  <span
                    style={{
                      marginLeft: 8,
                      background: "#b91c1c",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: 999,
                      fontWeight: 700,
                    }}
                  >
                    {errorCount}
                  </span>
                </Button>
              </div>
            </div>
          </Section>

          <Section title="Logs" icon={<FaBug />} info="Neue Einträge erscheinen automatisch oben (SSE).">
            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: 640,
                overflowY: "auto",
                overflowX: "hidden",
              }}
              className="log-scroll"
            >
              {logs.length === 0 ? (
                <div style={{ opacity: 0.7 }}>Keine Einträge.</div>
              ) : (
                logs.map((l) => listRow(l))
              )}
            </div>
          </Section>
        </div>
      )}

      {showErrorsModal && (
        <div
          onClick={() => setShowErrorsModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(100%, 980px)",
              maxHeight: "80vh",
              overflow: "auto",
              ...glass,
              padding: 16,
              color: "#fff",
            }}
            className="log-scroll"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <FaExclamationTriangle style={{ color: "#ff0000" }} /> Alle Fehler ({errorCount})
              </h3>
              <Button variant="secondary" onClick={() => setShowErrorsModal(false)}>
                <FaTimes style={{ marginRight: 6 }} /> Schließen
              </Button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              {logs.filter(isError).length === 0 ? (
                <div style={{ opacity: 0.7 }}>Keine Fehler vorhanden.</div>
              ) : (
                logs.filter(isError).map((l) => listRow(l))
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
