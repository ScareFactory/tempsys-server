import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaDesktop, FaSync, FaPlus, FaUnlink, FaSave, FaServer, FaCircle } from "react-icons/fa";

const card = {
  background: "#1f2937",
  color: "#e5e7eb",
  borderRadius: 10,
  padding: 16,
  boxShadow: "0 8px 18px rgba(0,0,0,.25)",
};

const pill = (ok) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "2px 8px",
  borderRadius: 999,
  fontSize: 12,
  background: ok ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.15)",
  color: ok ? "#10b981" : "#ef4444",
  border: `1px solid ${ok ? "rgba(16,185,129,.35)" : "rgba(239,68,68,.35)"}`
});

export default function DeviceRegistry() {
  const { token, role, companyId } = useContext(AuthContext);

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const [devices, setDevices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignTo, setAssignTo] = useState({}); // deviceId -> companyId
  const [edit, setEdit] = useState({});         // deviceId -> { name, notes }
  const isAdmin = role === "admin";

  async function load() {
    setLoading(true);
    try {
      if (isAdmin) {
        const [dRes, cRes] = await Promise.all([
          fetch(`/api/devices`, { headers }),
          fetch(`/api/companies`, { headers }),
        ]);
        if (!dRes.ok) throw new Error(`Devices HTTP ${dRes.status}`);
        if (!cRes.ok) throw new Error(`Companies HTTP ${cRes.status}`);
        const [d, c] = await Promise.all([dRes.json(), cRes.json()]);
        setDevices(d);
        setCompanies(c);
      } else {
        const dRes = await fetch(`/api/companies/${companyId}/devices`, { headers });
        if (!dRes.ok) throw new Error(`Devices HTTP ${dRes.status}`);
        setDevices(await dRes.json());
      }
    } catch (e) {
      console.error("Load devices failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) load(); }, [token, role, companyId]);

  const assign = async (id) => {
    const cid = assignTo[id];
    if (!cid) return;
    try {
      const res = await fetch(`/api/devices/${id}/assign-company`, {
        method: "POST",
        headers,
        body: JSON.stringify({ companyId: cid }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
      setAssignTo((m) => ({ ...m, [id]: "" }));
    } catch (e) {
      console.error("Assign failed:", e);
    }
  };

  const unassign = async (id) => {
    try {
      const res = await fetch(`/api/devices/${id}/unassign`, {
        method: "POST",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      console.error("Unassign failed:", e);
    }
  };

  const saveEdit = async (id) => {
    const payload = edit[id] || {};
    if (!payload.name && !payload.notes) return;
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
      setEdit((m) => ({ ...m, [id]: {} }));
    } catch (e) {
      console.error("Save device failed:", e);
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return "–";
    const d = new Date(iso);
    return d.toLocaleString("de-DE");
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0, color: "#111827" }}>
          <FaDesktop style={{ marginRight: 8 }} />
          Geräte verwalten
        </h2>
        <Button onClick={load}>
          <FaSync style={{ marginRight: 6 }} />
          Aktualisieren
        </Button>
      </div>

      {loading ? (
        <div style={{ ...card }}>Lade …</div>
      ) : devices.length === 0 ? (
        <div style={{ ...card }}>
          <p style={{ margin: 0 }}>
            Keine Geräte vorhanden. Uhren melden sich automatisch über <code>/api/devices/heartbeat</code> und erscheinen hier.
          </p>
        </div>
      ) : (
        devices.map((d) => {
          const e = edit[d.id] || {};
          const online = !!d.isOnline;
          return (
            <div key={d.id} style={{ ...card, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FaServer />
                  <strong style={{ fontSize: 16 }}>{d.name || d.serial}</strong>
                  <span style={pill(online)}>
                    <FaCircle style={{ fontSize: 8 }} />
                    {online ? "Online" : "Offline"}
                  </span>
                </div>
                <div>
                  {isAdmin && d.companyId ? (
                    <Button variant="secondary" onClick={() => unassign(d.id)}>
                      <FaUnlink style={{ marginRight: 6 }} />
                      Zuweisung lösen
                    </Button>
                  ) : null}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <div>Serial: <code>{d.serial}</code></div>
                  <div>Version: {d.version || "–"}</div>
                  <div>Letzter Kontakt: {fmtTime(d.lastSeen)}</div>
                </div>
                <div>
                  <div>IP: {d.ip || "–"}</div>
                  <div>MAC: {d.mac || "–"}</div>
                  <div>Firma: {d.companyName || (d.companyId ? d.companyId : "—")}</div>
                </div>
                <div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label>Anzeige-Name</label>
                    <input
                      type="text"
                      defaultValue={d.name || ""}
                      onChange={(ev) => setEdit((m) => ({ ...m, [d.id]: { ...m[d.id], name: ev.target.value } }))}
                    />
                  </div>
                  <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                    <label>Notizen</label>
                    <textarea
                      rows={2}
                      defaultValue={d.notes || ""}
                      onChange={(ev) => setEdit((m) => ({ ...m, [d.id]: { ...m[d.id], notes: ev.target.value } }))}
                    />
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Button onClick={() => saveEdit(d.id)}>
                      <FaSave style={{ marginRight: 6 }} />
                      Speichern
                    </Button>
                  </div>
                </div>
              </div>

              {isAdmin && !d.companyId && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Select
                    value={assignTo[d.id] || ""}
                    onChange={(e) => setAssignTo((m) => ({ ...m, [d.id]: e.target.value }))}
                    options={[
                      { value: "", label: "– Firma wählen –" },
                      ...companies.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <Button onClick={() => assign(d.id)}>
                    <FaPlus style={{ marginRight: 6 }} />
                    Firma zuweisen
                  </Button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
