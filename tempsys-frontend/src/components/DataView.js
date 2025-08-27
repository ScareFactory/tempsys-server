// src/components/DataView.js

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaDatabase, FaSyncAlt, FaDownload, FaSearch } from "react-icons/fa";

export default function DataView() {
  const { token, companyId } = useContext(AuthContext);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null); // {type:'success'|'error'|'info', text:string}
  const [tables, setTables] = useState({}); // { tableName: Array|Object }
  const [counts, setCounts] = useState({});
  const [selected, setSelected] = useState(null);
  const [limit, setLimit] = useState(100);
  const [filter, setFilter] = useState("");

  const Section = ({ title, icon, children, info }) => (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: 16,
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {icon}
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
      {info && (
        <div style={{ marginTop: 10, color: "#6b7280", fontSize: 13, lineHeight: 1.3 }}>
          {info}
        </div>
      )}
    </div>
  );

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 2500);
  };

  const KNOWN_ENDPOINTS = [
    { key: "users", url: (cid) => `/api/companies/${cid}/users` },
    { key: "devices", url: (cid) => `/api/companies/${cid}/clocks` }, // kompatibel
    { key: "absences", url: (cid) => `/api/companies/${cid}/absences?status=all` },
    { key: "time_corrections", url: (cid) => `/api/companies/${cid}/time-corrections?status=all` },
    { key: "export_settings", url: (cid) => `/api/companies/${cid}/export-settings` },
    // optional weitere je nach Bedarf
  ];

  const normalizeMap = (raw) => {
    if (!raw) return {};
    if (raw.tables && typeof raw.tables === "object") return raw.tables;
    return raw;
  };

  const loadAll = async () => {
    if (!companyId) return;
    setLoading(true);
    setMsg(null);
    try {
      // 1) bevorzugt: Sammel-Endpoint
      const dumpRes = await fetch(
        `/api/companies/${companyId}/data-dump?limit=${encodeURIComponent(limit ?? "")}`,
        { headers }
      );
      if (dumpRes.ok) {
        const data = await dumpRes.json();
        const map = normalizeMap(data);
        setTables(map || {});
        if (data.counts) setCounts(data.counts);
        const firstKey = Object.keys(map || {})[0] || null;
        setSelected((prev) => prev ?? firstKey);
        setLoading(false);
        return;
      }

      // 2) Fallback: bekannte Einzeltabellen laden
      const out = {};
      const cnt = {};
      await Promise.all(
        KNOWN_ENDPOINTS.map(async (e) => {
          try {
            const r = await fetch(e.url(companyId), { headers });
            if (!r.ok) return;
            const j = await r.json();
            const val = Array.isArray(j) ? j : (j ? [j] : []);
            out[e.key] = val;
            cnt[e.key] = Array.isArray(j) ? j.length : j ? 1 : 0;
          } catch {}
        })
      );

      if (Object.keys(out).length === 0) {
        throw new Error("Kein Dump-Endpoint und keine bekannten Tabellen erreichbar.");
      }

      setTables(out);
      setCounts(cnt);
      setSelected((prev) => prev ?? Object.keys(out)[0]);
    } catch (e) {
      console.error("Firmendaten laden fehlgeschlagen:", e);
      showMsg("error", "Firmendaten konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, token, limit]);

  const allTableNames = Object.keys(tables);

  const rows = useMemo(() => {
    const data = tables[selected] || [];
    const arr = Array.isArray(data) ? data : [data].filter(Boolean);
    if (!filter) return arr;
    const f = filter.toLowerCase();
    return arr.filter((r) => JSON.stringify(r).toLowerCase().includes(f));
  }, [tables, selected, filter]);

  const allColumns = useMemo(() => {
    const set = new Set();
    const data = tables[selected] || [];
    const arr = Array.isArray(data) ? data : [data].filter(Boolean);
    arr.forEach((r) => {
      if (r && typeof r === "object") Object.keys(r).forEach((k) => set.add(k));
    });
    return Array.from(set);
  }, [tables, selected]);

  const fmt = (v) => {
    if (v === null || v === undefined) return "—";
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
    return JSON.stringify(v);
  };

  const downloadFile = (filename, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = () => {
    const data = tables[selected] ?? [];
    downloadFile(`${selected || "data"}.json`, "application/json", JSON.stringify(data, null, 2));
  };

  const exportCSV = () => {
    const data = tables[selected] ?? [];
    const arr = Array.isArray(data) ? data : [data].filter(Boolean);
    if (arr.length === 0) return;
    const cols = allColumns.length ? allColumns : Object.keys(arr[0] || {});
    const esc = (s) => {
      const str = s === null || s === undefined ? "" : String(s);
      if (/[",\n;]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const rowsCsv = [
      cols.join(";"),
      ...arr.map((row) =>
        cols
          .map((c) => {
            const v = row?.[c];
            if (v === null || v === undefined) return "";
            if (typeof v === "object") return esc(JSON.stringify(v));
            return esc(v);
          })
          .join(";")
      ),
    ].join("\n");
    downloadFile(`${selected || "data"}.csv`, "text/csv;charset=utf-8", rowsCsv);
  };

  const listItemStyle = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 10,
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  };

  return (
    <Card>
      <h2 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <FaDatabase /> Firmendaten (Data View)
      </h2>

      {msg && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 10px",
            borderRadius: 6,
            color: "#fff",
            background:
              msg.type === "success" ? "#0c7a43" : msg.type === "info" ? "#1e40af" : "#7a1c1c",
          }}
        >
          {msg.text}
        </div>
      )}

      {loading ? (
        <div>Lade …</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(260px, 340px) 1fr",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Linke Spalte: Tabellenliste + Steuerung */}
          <div style={{ display: "grid", gap: 16 }}>
            <Section
              title="Tabellen"
              icon={<FaDatabase />}
              info="Wähle eine Tabelle aus. Inhalte sind auf die aktuelle Firma gefiltert."
            >
              <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                <Select
                  value={String(limit)}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  options={[
                    { value: "50", label: "Limit 50" },
                    { value: "100", label: "Limit 100" },
                    { value: "500", label: "Limit 500" },
                    { value: "0", label: "Kein Limit" },
                  ]}
                  style={{ width: 160 }}
                />
                <Button variant="secondary" onClick={loadAll}>
                  <FaSyncAlt style={{ marginRight: 6 }} />
                  Neu laden
                </Button>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {Object.keys(tables).length === 0 ? (
                  <div style={{ opacity: 0.7 }}>Keine Tabellen gefunden.</div>
                ) : (
                  Object.keys(tables).map((name) => {
                    const count =
                      counts?.[name] ??
                      (Array.isArray(tables[name]) ? tables[name].length : tables[name] ? 1 : 0);
                    const isSel = selected === name;
                    return (
                      <div
                        key={name}
                        onClick={() => setSelected(name)}
                        style={{
                          ...listItemStyle,
                          borderColor: isSel ? "#2563eb" : "#e5e7eb",
                          boxShadow: isSel ? "0 0 0 3px rgba(37,99,235,0.12)" : listItemStyle.boxShadow,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>{name}</span>
                          <span style={{ color: "#6b7280", fontSize: 12 }}>({count})</span>
                        </div>
                        {isSel && <span style={{ color: "#2563eb", fontSize: 12 }}>ausgewählt</span>}
                      </div>
                    );
                  })
                )}
              </div>
            </Section>
          </div>

          {/* Rechte Spalte: Tabelleninhalt */}
          <Section
            title={selected ? `Inhalt: ${selected}` : "Inhalt"}
            icon={<FaDatabase />}
            info="Filtert JSON-String, Export als JSON/CSV."
          >
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 240 }}>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Filter (durchsucht JSON)…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{ flex: 1, padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
                />
              </div>
              <Button variant="secondary" onClick={exportJSON} disabled={!selected}>
                <FaDownload style={{ marginRight: 6 }} />
                JSON
              </Button>
              <Button onClick={exportCSV} disabled={!selected}>
                <FaDownload style={{ marginRight: 6 }} />
                CSV
              </Button>
            </div>

            {/* Tabelle */}
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                overflow: "auto",
                maxHeight: 520,
              }}
            >
              {!selected ? (
                <div style={{ padding: 12, opacity: 0.7 }}>Bitte wähle eine Tabelle links aus.</div>
              ) : rows.length === 0 ? (
                <div style={{ padding: 12, opacity: 0.7 }}>Keine Daten (ggf. Filter zu streng?).</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f9fafb", zIndex: 1 }}>
                    <tr>
                      {allColumns.map((c) => (
                        <th
                          key={c}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderBottom: "1px solid #e5e7eb",
                            fontWeight: 600,
                            fontSize: 13,
                            color: "#374151",
                            whiteSpace: "nowrap",
                          }}
                          title={c}
                        >
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        {allColumns.map((c) => (
                          <td
                            key={c}
                            style={{
                              padding: "8px 12px",
                              borderBottom: "1px solid #f3f4f6",
                              verticalAlign: "top",
                              fontSize: 13,
                            }}
                            title={fmt(r?.[c])}
                          >
                            {fmt(r?.[c])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Section>
        </div>
      )}
    </Card>
  );
}
