// tempsys-frontend/src/pages/AdminPanel.js
import React, { useState, useEffect, useContext, useMemo } from "react";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import { AuthContext } from "../contexts/AuthContext";
import LoginData from "../components/LoginData"; // wird im Main gerendert
import UpdateManagement from "../components/UpdateManagement";
import PasswordReset from "../components/PasswordReset";

// Icons
import {
  FaPlusCircle,
  FaBuilding,
  FaUserCog,
  FaServer,
  FaClock,
  FaSyncAlt,
  FaCircle,
  FaUnlink,
  FaSave,
  FaFilter,
  FaUser,
  FaUserShield,
  FaEnvelopeOpenText,
  FaKey,
} from "react-icons/fa";

export default function AdminPanel() {
  const { token } = useContext(AuthContext);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ─── Sidebar-Module mit Icons ────────────────────────────────────────────────
  const modules = [
    { key: "createCompany",   label: "Firma erstellen",        icon: <FaPlusCircle /> },
    { key: "manageCompanies", label: "Firmen verwalten",       icon: <FaBuilding /> },
    { key: "manageUsers",     label: "Logins verwalten",       icon: <FaUserCog /> },
    { key: "devicesRegistry", label: "Geräte-Registry",        icon: <FaServer /> },
    { key: "clockOverview",   label: "Uhren-Übersicht",        icon: <FaClock /> },
    { key: "update_management", label: "Update‑Management (global)", Component: UpdateManagement, icon: <FaSyncAlt /> },
    { key: "supportMessages", label: "Support / Nachrichten",  icon: <FaEnvelopeOpenText /> }, // ⬅️ Support
    { key: "loginData",       label: "Login-Daten",            icon: <FaUser /> },             // nur Button
    { key: "password_reset",  label: "Passwort-Reset", Component: PasswordReset, icon: <FaKey /> },
  ];
  const [activeModule, setActiveModule] = useState("createCompany");

  // ─── Stammdaten ──────────────────────────────────────────────────────────────
  const [companies, setCompanies] = useState([]);
  const [features,  setFeatures]  = useState([]);

  // Create Company
  const [newCompanyName, setNewCompanyName] = useState("");

  // Edit Company Features
  const [companyToEdit, setCompanyToEdit] = useState("");
  const [editFeatures,  setEditFeatures]  = useState([]);

  // Manage Users
  const [selectedCompany, setSelectedCompany] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    tagId: "",
    role: "user",
  });
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ username: "", tagId: "", role: "user" });

  // Clock Overview
  const [clocks, setClocks] = useState([]);

  // Update Channel
  const [channel, setChannel] = useState("stable");

  // Devices Registry
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesFilter, setDevicesFilter] = useState("unassigned"); // "unassigned" | "all"
  const [assignTo, setAssignTo] = useState({});   // deviceId -> companyId
  const [editDevice, setEditDevice] = useState({}); // deviceId -> { name, notes }

  // Support / Nachrichten (Admin)
  const [supportMsgs, setSupportMsgs] = useState([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError, setSupportError] = useState(null);
  const [supportStatusFilter, setSupportStatusFilter] = useState("open"); // open | in_progress | closed | all

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const isFounderTag = (tag) => ((tag || "").trim().toUpperCase() === "FOUNDER");

  // JWT payload aus token lesen (laut Doku enthält { companyId, username, role })
  const decodeJwt = (tkn) => {
    try {
      const base64Url = tkn.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload || "{}");
    } catch {
      return {};
    }
  };
  const jwtPayload = useMemo(() => decodeJwt(token || ""), [token]);
  const currentUsername = jwtPayload?.username;

  // Abhängig von geladener Userliste ermitteln, ob **aktueller** Nutzer FOUNDER ist
  const currentUser = useMemo(
    () => users.find((u) => u.username === currentUsername),
    [users, currentUsername]
  );
  const canCreateSystemAdmin = isFounderTag(currentUser?.tagId);

  // ─── API Helpers ─────────────────────────────────────────────────────────────
  const fetchCompanies = async () => {
    const res = await fetch("/api/companies", { headers });
    if (res.ok) setCompanies(await res.json());
  };

  const fetchFeatures = async () => {
    const res = await fetch("/api/features", { headers });
    if (res.ok) setFeatures(await res.json());
  };

  const fetchCompanyFeatures = async (companyId) => {
    const res = await fetch(`/api/companies/${companyId}/features`, { headers });
    if (res.ok) {
      const list = await res.json();
      setEditFeatures(list.map((f) => f.id));
    }
  };

  const updateCompanyFeatures = async (companyId, featureIds) => {
    await fetch(`/api/companies/${companyId}/features`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ featureIds }),
    });
  };

  // Users
  const fetchUsers = async (companyId) => {
    if (!companyId) return;
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/users`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.sort((a, b) => a.username.localeCompare(b.username));
      setUsers(data);
      setUsersError(null);
    } catch (err) {
      console.error(err);
      setUsersError("Fehler beim Laden der Nutzer");
    } finally {
      setUsersLoading(false);
    }
  };

  const createUser = async () => {
    const { username, password } = newUser;
    const tagId = (newUser.tagId || "").trim().replace(/\s+/g, "").toUpperCase();

    if (!(selectedCompany && username && password && tagId)) {
      alert("Bitte Firma wählen und Username/Passwort/Tag-ID ausfüllen.");
      return;
    }

    // ⛔ Nur FOUNDER darf System-Admin erstellen
    if (newUser.role === "admin" && !canCreateSystemAdmin) {
      alert("Nur Nutzer mit FOUNDER-Tag dürfen einen System-Admin anlegen.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({
          companyId: selectedCompany,
          username,
          password,
          tagId,
          role: newUser.role,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status} – ${txt}`);
      }
      setNewUser({ username: "", password: "", tagId: "", role: "user" });
      fetchUsers(selectedCompany);
    } catch (e) {
      console.error(e);
      alert("Fehler beim Anlegen des Logins.");
    }
  };

  const deleteUser = async (id) => {
    // UI verhindert Löschen von FOUNDER; zusätzliche serverseitige Prüfung empfohlen
    if (!window.confirm("Login wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchUsers(selectedCompany);
    } catch {
      alert("Fehler beim Löschen.");
    }
  };

  const startEdit = (u) => {
    if (isFounderTag(u.tagId)) {
      alert("Dieser Nutzer kann nicht bearbeitet werden (FOUNDER).");
      return;
    }
    setEditingId(u.id);
    setEditValues({ username: u.username, tagId: u.tagId || "", role: u.role || "user" });
  };
  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (id) => {
    // ⛔ Nur FOUNDER darf Rolle auf "admin" ändern
    if (editValues.role === "admin" && !canCreateSystemAdmin) {
      alert("Nur Nutzer mit FOUNDER-Tag dürfen die Rolle 'System-Admin' zuweisen.");
      return;
    }
    try {
      const payload = {
        username: (editValues.username || "").trim(),
        tagId: (editValues.tagId || "").trim().replace(/\s+/g, "").toUpperCase(),
        role: editValues.role || "user",
      };
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cancelEdit();
      fetchUsers(selectedCompany);
    } catch {
      alert("Fehler beim Speichern.");
    }
  };

  const fetchClocks = async (companyId) => {
    const res = await fetch(`/api/companies/${companyId}/clocks`, { headers });
    if (res.ok) setClocks(await res.json());
  };

  // Devices API
  const fetchDevices = async () => {
    setDevicesLoading(true);
    try {
      const query = devicesFilter === "unassigned" ? "?unassigned=true" : "";
      const res = await fetch(`/api/devices${query}`, { headers });
      if (!res.ok) throw new Error(`Devices HTTP ${res.status}`);
      setDevices(await res.json());
    } catch (e) {
      console.error("Load devices failed:", e);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  };

  const assignDevice = async (id) => {
    const cid = assignTo[id];
    if (!cid) return;
    try {
      const res = await fetch(`/api/devices/${id}/assign-company`, {
        method: "POST",
        headers,
        body: JSON.stringify({ companyId: cid }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDevices();
      setAssignTo((m) => ({ ...m, [id]: "" }));
    } catch (e) {
      console.error("Assign failed:", e);
    }
  };

  const unassignDevice = async (id) => {
    try {
      const res = await fetch(`/api/devices/${id}/unassign`, { method: "POST", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDevices();
    } catch (e) {
      console.error("Unassign failed:", e);
    }
  };

  const saveDeviceMeta = async (id) => {
    const payload = editDevice[id] || {};
    if (!payload.name && !payload.notes) return;
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchDevices();
    } catch (e) {
      console.error("Save device failed:", e);
    } finally {
      setEditDevice((m) => ({ ...m, [id]: {} }));
    }
  };

  const fmtTime = (iso) => {
    if (!iso) return "–";
    const d = new Date(iso);
    return d.toLocaleString("de-DE");
  };

  // Support API (mit Logs)
  const fetchSupportMessages = async () => {
    setSupportLoading(true);
    setSupportError(null);
    try {
      const params = [];
      if (supportStatusFilter && supportStatusFilter !== "all") {
        params.push(`status=${encodeURIComponent(supportStatusFilter)}`);
      }
      // Logs mitbringen (Limit bei Bedarf anpassen)
      params.push("withLogs=true", "logsLimit=100");
      const query = params.length ? `?${params.join("&")}` : "";

      const res = await fetch(`/api/support/messages${query}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSupportMsgs(data);
    } catch (e) {
      console.error("Support-Nachrichten laden fehlgeschlagen:", e);
      setSupportError("Support-Nachrichten konnten nicht geladen werden.");
    } finally {
      setSupportLoading(false);
    }
  };

  const updateSupportStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/support/messages/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchSupportMessages();
    } catch (e) {
      console.error("Status-Update fehlgeschlagen:", e);
      alert("Status konnte nicht geändert werden.");
    }
  };

  // ─── Actions (Companies) ──────────────────────────────────────────────────────
  const createCompany = async () => {
    const name = (newCompanyName || "").trim();
    if (!name) return;
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers,
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewCompanyName("");
      fetchCompanies();
    } catch (e) {
      console.error(e);
      alert("Firma konnte nicht erstellt werden.");
    }
  };

  const deleteCompany = async (id) => {
    if (!id) return;
    if (!window.confirm("Firma wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (companyToEdit === id) setCompanyToEdit("");
      if (selectedCompany === id) setSelectedCompany("");
      fetchCompanies();
    } catch (e) {
      console.error(e);
      alert("Firma konnte nicht gelöscht werden.");
    }
  };

  // ─── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCompanies();
    fetchFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (activeModule === "manageUsers" && selectedCompany) {
      fetchUsers(selectedCompany);
    }
    if (activeModule === "clockOverview" && selectedCompany) {
      fetchClocks(selectedCompany);
    }
    if (activeModule === "devicesRegistry") {
      fetchCompanies();
      fetchDevices();
    }
    if (activeModule === "supportMessages") {
      fetchSupportMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, selectedCompany]);

  useEffect(() => {
    if (activeModule === "devicesRegistry") {
      fetchDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devicesFilter]);

  useEffect(() => {
    if (companyToEdit) {
      fetchCompanyFeatures(companyToEdit);
    } else {
      setEditFeatures([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyToEdit]);

  // ─── Derive view data ────────────────────────────────────────────────────────
  const admins = users.filter((u) => u.role === "companyAdmin" || u.role === "admin");
  const normals = users.filter((u) => u.role !== "companyAdmin" && u.role !== "admin");
  const renderIcon = (role) => (role === "companyAdmin" || role === "admin" ? <FaUserShield /> : <FaUser />);

  // Rollen-Optionen (admin nur, wenn aktueller Nutzer FOUNDER ist)
  const roleOptions = useMemo(() => {
    const base = [
      { value: "user",         label: "Normaler Nutzer" },
      { value: "companyAdmin", label: "Firmen-Admin" },
    ];
    return canCreateSystemAdmin
      ? [...base, { value: "admin", label: "System-Admin" }]
      : base;
  }, [canCreateSystemAdmin]);

  // ─── THEME / STYLES (scoped) ─────────────────────────────────────────────────
  const t = {
    bg: "#0f1115",
    sidebar: "#151923",
    sidebarHover: "#1b2130",
    surface: "#1b2130",
    surface2: "#10141c",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    primary600: "#c42727",
    border: "#2a3040",
    focus: "#5ab0ff",
    good: "#10b981",
    bad: "#ef4444",
  };

  return (
    <div className="ap-shell">
      <style>{css(t)}</style>

      {/* Sidebar mit Icons */}
      <nav className="ap-sidebar">
        <div className="ap-sidebar-title">ADMIN</div>
        {modules.map((m) => {
          const active = activeModule === m.key;
          return (
            <button
              key={m.key}
              className={`ap-nav-item ${active ? "active" : ""}`}
              onClick={() => setActiveModule(m.key)}
              type="button"
            >
              <span className="ap-nav-icon">{m.icon}</span>
              <span>{m.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Main Content */}
      <main className="ap-main">
        {/* 1) Firma erstellen */}
        {activeModule === "createCompany" && (
          <Card className="ap-card">
            <h2 className="ap-h2">Firma erstellen</h2>
            <input
              type="text"
              placeholder="Name der Firma"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              className="ap-input"
            />
            <div className="ap-row-gap">
              <Button onClick={createCompany}>Erstellen</Button>
            </div>
          </Card>
        )}

        {/* 2) Firmen verwalten */}
        {activeModule === "manageCompanies" && (
          <Card className="ap-card">
            <h2 className="ap-h2">Firmen verwalten</h2>

            <Select
              value={companyToEdit}
              onChange={(e) => setCompanyToEdit(e.target.value)}
              options={[
                { value: "", label: "Firma wählen" },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              style={{ marginBottom: 16, width: 320 }}
            />

            {companyToEdit && (
              <>
                <h3 className="ap-h3">Feature-Zugriffe bearbeiten</h3>
                <div className="ap-grid-2">
                  {features.map((f) => {
                    const isChecked = editFeatures.includes(f.id);
                    return (
                      <label
                        key={f.id}
                        className={`ap-check ${isChecked ? "checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          value={f.id}
                          checked={isChecked}
                          onChange={() => {
                            setEditFeatures((prev) =>
                              prev.includes(f.id)
                                ? prev.filter((x) => x !== f.id)
                                : [...prev, f.id]
                            );
                          }}
                        />
                        <span>{f.label}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="ap-row-gap">
                  <Button
                    onClick={async () => {
                      await updateCompanyFeatures(companyToEdit, editFeatures);
                      alert("Features aktualisiert!");
                    }}
                  >
                    Speichern
                  </Button>

                  <Button variant="destructive" onClick={() => deleteCompany(companyToEdit)}>
                    Firma löschen
                  </Button>
                </div>
              </>
            )}
          </Card>
        )}

        {/* 3) Logins verwalten */}
        {activeModule === "manageUsers" && (
          <Card className="ap-card">
            <h2 className="ap-h2">Logins & Tags</h2>

            <Select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                fetchUsers(e.target.value);
              }}
              options={[
                { value: "", label: "Firma wählen" },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              style={{ marginBottom: 16, width: 320 }}
            />

            {selectedCompany ? (
              <>
                {/* Create Form */}
                <div className="ap-form">
                  <h3 className="ap-h3">Login anlegen</h3>
                  <div className="ap-form-grid">
                    <div>
                      <label className="ap-label">Benutzername</label>
                      <input
                        className="ap-input"
                        placeholder="z.B. Max Mustermann"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ap-label">Passwort</label>
                      <input
                        className="ap-input"
                        type="password"
                        placeholder="Passwort"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="ap-label">Tag-ID (Pflicht)</label>
                      <input
                        className="ap-input"
                        placeholder="z.B. A0:4C:AC:A5"
                        value={newUser.tagId}
                        onChange={(e) =>
                          setNewUser({ ...newUser, tagId: e.target.value })
                        }
                        onBlur={(e) =>
                          setNewUser((prev) => ({
                            ...prev,
                            tagId: (e.target.value || "").trim().replace(/\s+/g, "").toUpperCase(),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="ap-label">Rolle</label>
                      <Select
                        style={{ width: "100%" }}
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        options={roleOptions}
                      />
                    </div>
                    <Button onClick={createUser}>Erstellen</Button>
                  </div>
                </div>

                {usersLoading ? (
                  <p>Lade …</p>
                ) : usersError ? (
                  <p style={{ color: "#ef4444" }}>{usersError}</p>
                ) : (
                  <>
                    <h3 className="ap-h3">Firmen-Administratoren</h3>
                    {admins.length === 0 && <p className="ap-dim">Keine Firmen-Admins.</p>}
                    {admins.map((u) => {
                      const isFounder = isFounderTag(u.tagId);
                      return (
                        <div key={u.id} className="ap-row">
                          <div className="ap-row-inner">
                            <div className="ap-left">
                              {renderIcon(u.role)}
                              <span>{u.username}</span>
                              <span className="ap-badge">Tag: {u.tagId || "—"}</span>
                            </div>

                            {isFounder ? (
                              <div className="ap-dim" style={{ fontStyle: "italic" }}>
                                Dieser Nutzer kann nicht gelöscht/ bearbeitet werden (FOUNDER).
                              </div>
                            ) : (
                              editingId === u.id ? (
                                <div className="ap-edit-controls">
                                  <input
                                    className="ap-input"
                                    value={editValues.username}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, username: e.target.value })
                                    }
                                  />
                                  <input
                                    className="ap-input"
                                    value={editValues.tagId}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, tagId: e.target.value })
                                    }
                                    onBlur={(e) =>
                                      setEditValues((prev) => ({
                                        ...prev,
                                        tagId: (e.target.value || "")
                                          .trim()
                                          .replace(/\s+/g, "")
                                          .toUpperCase(),
                                      }))
                                    }
                                  />
                                  <Select
                                    style={{ minWidth: 160 }}
                                    value={editValues.role}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, role: e.target.value })
                                    }
                                    options={roleOptions}
                                  />
                                  <Button onClick={() => saveEdit(u.id)}>Speichern</Button>
                                  <Button variant="destructive" onClick={cancelEdit}>
                                    Abbrechen
                                  </Button>
                                </div>
                              ) : (
                                <div className="ap-edit-controls">
                                  <Button size="small" onClick={() => startEdit(u)}>
                                    Bearbeiten
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="destructive"
                                    onClick={() => deleteUser(u.id)}
                                  >
                                    Löschen
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <h3 className="ap-h3">Normale Nutzer</h3>
                    {normals.length === 0 && <p className="ap-dim">Keine Nutzer.</p>}
                    {normals.map((u) => {
                      const isFounder = isFounderTag(u.tagId);
                      return (
                        <div key={u.id} className="ap-row">
                          <div className="ap-row-inner">
                            <div className="ap-left">
                              {renderIcon(u.role)}
                              <span>{u.username}</span>
                              <span className="ap-badge">Tag: {u.tagId || "—"}</span>
                            </div>

                            {isFounder ? (
                              <div className="ap-dim" style={{ fontStyle: "italic" }}>
                                Dieser Nutzer kann nicht gelöscht/ bearbeitet werden (FOUNDER).
                              </div>
                            ) : (
                              editingId === u.id ? (
                                <div className="ap-edit-controls">
                                  <input
                                    className="ap-input"
                                    value={editValues.username}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, username: e.target.value })
                                    }
                                  />
                                  <input
                                    className="ap-input"
                                    value={editValues.tagId}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, tagId: e.target.value })
                                    }
                                    onBlur={(e) =>
                                      setEditValues((prev) => ({
                                        ...prev,
                                        tagId: (e.target.value || "")
                                          .trim()
                                          .replace(/\s+/g, "")
                                          .toUpperCase(),
                                      }))
                                    }
                                  />
                                  <Select
                                    style={{ minWidth: 160 }}
                                    value={editValues.role}
                                    onChange={(e) =>
                                      setEditValues({ ...editValues, role: e.target.value })
                                    }
                                    options={roleOptions}
                                  />
                                  <Button onClick={() => saveEdit(u.id)}>Speichern</Button>
                                  <Button variant="destructive" onClick={cancelEdit}>
                                    Abbrechen
                                  </Button>
                                </div>
                              ) : (
                                <div className="ap-edit-controls">
                                  <Button size="small" onClick={() => startEdit(u)}>
                                    Bearbeiten
                                  </Button>
                                  <Button
                                    size="small"
                                    variant="destructive"
                                    onClick={() => deleteUser(u.id)}
                                  >
                                    Löschen
                                  </Button>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            ) : (
              <p className="ap-dim">Bitte oben eine Firma wählen.</p>
            )}
          </Card>
        )}

        {/* 4) Geräte-Registry */}
        {activeModule === "devicesRegistry" && (
          <Card className="ap-card">
            <div className="ap-head-row">
              <h2 className="ap-h2 ap-head">
                <FaServer /> Geräte-Registry
              </h2>
              <div className="ap-head-actions">
                <FaFilter title="Filter" className="ap-dim" />
                <Select
                  value={devicesFilter}
                  onChange={(e) => setDevicesFilter(e.target.value)}
                  options={[
                    { value: "unassigned", label: "Nur unzugewiesene" },
                    { value: "all",        label: "Alle Geräte" },
                  ]}
                  style={{ width: 220 }}
                />
                <Button onClick={fetchDevices}>
                  <FaSyncAlt style={{ marginRight: 6 }} />
                  Aktualisieren
                </Button>
              </div>
            </div>

            {devicesLoading ? (
              <div className="ap-dim">Lade …</div>
            ) : devices.length === 0 ? (
              <div className="ap-dim">
                Keine Geräte vorhanden. Die Uhren melden sich automatisch per <code>/api/devices/heartbeat</code>.
              </div>
            ) : (
              <div className="ap-device-list">
                {devices.map((d) => {
                  const online = !!d.isOnline;
                  return (
                    <div key={d.id} className="ap-device-card">
                      <div className="ap-device-top">
                        <div className="ap-device-id">
                          <FaServer />
                          <strong>{d.name || d.serial}</strong>
                          <span className={`ap-pill ${online ? "ok" : "bad"}`}>
                            <FaCircle className="ap-pill-dot" />
                            {online ? "Online" : "Offline"}
                          </span>
                        </div>
                        <div className="ap-device-actions">
                          {d.companyId && (
                            <Button variant="secondary" onClick={() => unassignDevice(d.id)}>
                              <FaUnlink style={{ marginRight: 6 }} />
                              Zuweisung lösen
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="ap-device-grid">
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
                          <div className="ap-field">
                            <label className="ap-label">Anzeige-Name</label>
                            <input
                              className="ap-input"
                              type="text"
                              defaultValue={d.name || ""}
                              onChange={(ev) =>
                                setEditDevice((m) => ({
                                  ...m,
                                  [d.id]: { ...m[d.id], name: ev.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="ap-field">
                            <label className="ap-label">Notizen</label>
                            <textarea
                              className="ap-input"
                              rows={2}
                              defaultValue={d.notes || ""}
                              onChange={(ev) =>
                                setEditDevice((m) => ({
                                  ...m,
                                  [d.id]: { ...m[d.id], notes: ev.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="ap-row-gap">
                            <Button onClick={() => saveDeviceMeta(d.id)}>
                              <FaSave style={{ marginRight: 6 }} />
                              Speichern
                            </Button>
                          </div>
                        </div>
                      </div>

                      {!d.companyId && (
                        <div className="ap-assign-row">
                          <Select
                            value={assignTo[d.id] || ""}
                            onChange={(e) =>
                              setAssignTo((m) => ({ ...m, [d.id]: e.target.value }))
                            }
                            options={[
                              { value: "", label: "– Firma wählen –" },
                              ...companies.map((c) => ({ value: c.id, label: c.name })),
                            ]}
                            style={{ width: 280 }}
                          />
                          <Button onClick={() => assignDevice(d.id)}>Firma zuweisen</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* 5) Uhren-Übersicht */}
        {activeModule === "clockOverview" && (
          <Card className="ap-card">
            <h2 className="ap-h2">Uhren-Übersicht</h2>
            <Select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                fetchClocks(e.target.value);
              }}
              options={[
                { value: "", label: "Firma wählen" },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              style={{ marginBottom: 16, width: 320 }}
            />
            {clocks.map((clk) => (
              <div key={clk.id} className="ap-clock-row">
                <span>{clk.id}</span>
                <span>{clk.online ? "Online" : "Offline"}</span>
                <span>{clk.version}</span>
              </div>
            ))}
          </Card>
        )}

        {/* 6) Update-Management */}
        {activeModule === "updateChannel" && (
          <Card className="ap-card">
            <h2 className="ap-h2">Update-Management</h2>
            <Select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              options={[
                { value: "", label: "Firma wählen" },
                ...companies.map((c) => ({ value: c.id, label: c.name })),
              ]}
              style={{ marginBottom: 16, width: 320 }}
            />
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              options={[
                { value: "stable", label: "Stable Channel" },
                { value: "beta",   label: "Beta Channel" },
              ]}
              style={{ marginBottom: 16, width: 320 }}
            />
            <Button onClick={async () => {
              if (!selectedCompany) return;
              await fetch(`/api/companies/${selectedCompany}/update-channel`, {
                method: "POST",
                headers,
                body: JSON.stringify({ channel }),
              });
              fetchClocks(selectedCompany);
            }}>
              Update senden
            </Button>
          </Card>
        )}

        {/* 7) Support / Nachrichten */}
        {activeModule === "supportMessages" && (
          <Card className="ap-card">
            <div className="ap-head-row">
              <h2 className="ap-h2 ap-head"><FaEnvelopeOpenText /> Support / Nachrichten</h2>
              <div className="ap-head-actions">
                <select
                  className="ap-input"
                  style={{ width: 220 }}
                  value={supportStatusFilter}
                  onChange={(e) => { setSupportStatusFilter(e.target.value); fetchSupportMessages(); }}
                >
                  <option value="open">Offen</option>
                  <option value="in_progress">In Bearbeitung</option>
                  <option value="closed">Geschlossen</option>
                  <option value="all">Alle</option>
                </select>
                <Button onClick={fetchSupportMessages}>
                  <FaSyncAlt style={{ marginRight: 6 }} />
                  Aktualisieren
                </Button>
              </div>
            </div>

            {supportLoading ? (
              <div className="ap-dim">Lade …</div>
            ) : supportError ? (
              <div style={{ color: "#ef4444" }}>{supportError}</div>
            ) : supportMsgs.length === 0 ? (
              <div className="ap-dim">Keine Nachrichten.</div>
            ) : (
              <div className="ap-support-list">
                {supportMsgs.map((m) => (
                  <div key={m.id} className="ap-support-item">
                    <div className="ap-support-top">
                      <div className="ap-support-left">
                        <strong>{m.subject}</strong>
                        <span className="ap-badge">Firma: {m.companyName || m.companyId || "—"}</span>
                        <span className="ap-badge">Kategorie: {m.category}</span>
                        <span className="ap-badge">Prio: {m.priority}</span>
                      </div>
                      <div className="ap-support-right">
                        <select
                          className="ap-input"
                          value={m.status || "open"}
                          onChange={(e) => updateSupportStatus(m.id, e.target.value)}
                        >
                          <option value="open">Offen</option>
                          <option value="in_progress">In Bearbeitung</option>
                          <option value="closed">Geschlossen</option>
                        </select>
                      </div>
                    </div>

                    <div className="ap-support-body">
                      <pre className="ap-support-text">{m.message}</pre>
                    </div>

                    {/* Logs nur anzeigen, wenn vorhanden */}
                    {Array.isArray(m.logs) && m.logs.length > 0 && (
                      <details className="ap-logs">
                        <summary>Geräte-Logs anzeigen ({m.logs.length})</summary>
                        <div className="ap-loglist">
                          {m.logs.map((l, idx) => (
                            <div key={idx} className="ap-logrow">
                              <span className="ap-logtime">{new Date(l.createdAt).toLocaleString("de-DE")}</span>
                              <span className="ap-logdev">{l.deviceId}</span>
                              <span className="ap-logmsg">{l.logMessage}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    <div className="ap-support-meta">
                      <span>Erstellt: {m.createdAt ? new Date(m.createdAt).toLocaleString("de-DE") : "–"}</span>
                      {m.contactEmail && <span>Kontakt: {m.contactEmail}</span>}
                      {m.includeLogs && <span>Logs: beigelegt</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* 8) Login-Daten (nur via Sidebar-Button sichtbar) */}
        {activeModule === "loginData" && (
          <Card className="ap-card">
            <h2 className="ap-h2">Login-Daten</h2>
            <LoginData />
          </Card>
        )}

        {/* 9) Dynamischer Renderer für Module mit Component */}
{(() => {
  const Mod = modules.find((m) => m.key === activeModule && m.Component)?.Component;
  return Mod ? (
    <Card className="ap-card">
      <Mod />
    </Card>
  ) : null;
})()}
      </main>
    </div>
  );
}

/* ---------------- Scoped CSS (TempSys Look) ---------------- */
function css(t) {
  return `
  .ap-shell{
    display:flex; height:100vh; background:${t.bg}; color:${t.text};
  }
  .ap-sidebar{
    width:240px; background:${t.sidebar}; padding:16px; border-right:1px solid ${t.border};
    display:flex; flex-direction:column;
  }
  .ap-sidebar-title{
    font-size:12px; letter-spacing:1px; color:${t.textDim}; margin-bottom:10px;
  }
  .ap-nav-item{
    width:100%; display:flex; align-items:center; gap:10px;
    padding:10px 12px; border-radius:10px; color:${t.textDim};
    background:transparent; border:1px solid transparent;
    cursor:pointer; transition:background .15s ease, color .15s ease, border-color .15s ease;
    text-align:left;
  }
  .ap-nav-item:hover{ background:${t.sidebarHover}; color:${t.text}; border-color:${t.border}; }
  .ap-nav-item.active{ background: linear-gradient(180deg, rgba(224,49,49,.18), rgba(224,49,49,.10));
    color:${t.text}; border:1px solid rgba(224,49,49,.3); }
  .ap-nav-icon{ width:18px; display:inline-flex; justify-content:center; }

  .ap-main{
    flex:1; padding:16px; overflow:auto;
  }
  .ap-card :where(h2,h3){ margin-top:0; }
  .ap-h2{ margin:0 0 12px; font-size:1.2rem; }
  .ap-h3{ margin:12px 0 8px; font-size:1.05rem; }

  /* Inputs / Labels */
  .ap-label{ display:block; font-weight:600; margin-bottom:6px; }
  .ap-input{
    width:100%; padding:10px 12px; border-radius:10px;
    border:1px solid ${t.border}; background:${t.surface}; color:${t.text};
    outline:none;
  }
  .ap-input:focus{ outline:2px solid ${t.focus}; outline-offset:2px; }
  .ap-row-gap{ display:flex; gap:10px; margin-top:10px; }

  /* Feature grid */
  .ap-grid-2{
    display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin:10px 0 16px;
  }
  @media (max-width:900px){ .ap-grid-2{ grid-template-columns: 1fr; } }
  .ap-check{
    display:flex; align-items:center; gap:10px; padding:10px 12px;
    border-radius:10px; border:1px solid ${t.border}; background:${t.surface};
    cursor:pointer;
  }
  .ap-check.checked{ border-color:${t.primary}; box-shadow:0 0 0 2px rgba(224,49,49,.15) inset; }

  /* Create form */
  .ap-form{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px; padding:16px; margin-bottom:16px;
  }
  .ap-form-grid{
    display:grid; grid-template-columns: 1fr 1fr 1fr 1fr auto; gap:12px; align-items:end;
  }
  @media (max-width:1100px){
    .ap-form-grid{ grid-template-columns: 1fr 1fr; }
  }

  /* Rows (Users) */
  .ap-row{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px;
    padding:12px 16px; margin-bottom:12px;
  }
  .ap-row-inner{
    display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  }
  .ap-left{ display:flex; align-items:center; gap:12px; }
  .ap-badge{ font-size:.85rem; color:${t.textDim}; }

  .ap-edit-controls{ display:flex; gap:8px; flex-wrap:wrap; }

  .ap-dim{ color:${t.textDim}; }

  /* Devices */
  .ap-head-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .ap-head{ display:flex; align-items:center; gap:8px; margin:0; }
  .ap-head-actions{ display:flex; align-items:center; gap:8px; }
  .ap-device-list{ display:grid; gap:12px; margin-top:12px; }
  .ap-device-card{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px; padding:16px;
    box-shadow:0 8px 20px rgba(0,0,0,.25);
  }
  .ap-device-top{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; gap:12px; }
  .ap-device-id{ display:flex; align-items:center; gap:10px; }
  .ap-pill{
    display:inline-flex; align-items:center; gap:6px; padding:2px 8px; border-radius:999px; font-size:12px;
    border:1px solid;
  }
  .ap-pill.ok{ background:rgba(16,185,129,.15); color:${t.good}; border-color:rgba(16,185,129,.35); }
  .ap-pill.bad{ background:rgba(239,68,68,.15); color:${t.bad}; border-color:rgba(239,68,68,.35); }
  .ap-pill-dot{ font-size:8px; }

  .ap-device-grid{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
  @media (max-width:1000px){ .ap-device-grid{ grid-template-columns:1fr; } }
  .ap-field{ display:grid; gap:6px; margin-top:6px; }

  .ap-assign-row{ display:flex; align-items:center; gap:8px; margin-top:12px; }

  /* Clocks */
  .ap-clock-row{
    display:flex; justify-content:space-between; padding:10px 12px; border-bottom:1px solid ${t.border};
  }

  /* Support */
  .ap-support-list{ display:grid; gap:12px; margin-top:12px; }
  .ap-support-item{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px; padding:12px;
  }
  .ap-support-top{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .ap-support-left{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .ap-support-body{ margin-top:8px; }
  .ap-support-text{
    white-space:pre-wrap; background:${t.surface}; border:1px solid ${t.border};
    padding:10px; border-radius:8px; margin:0; color:${t.text};
  }
  .ap-support-meta{ margin-top:8px; display:flex; gap:12px; color:${t.textDim}; font-size:.9rem; flex-wrap:wrap; }

  /* Support Logs */
  .ap-logs { margin-top: 8px; }
  .ap-logs > summary {
    cursor: pointer;
    color: ${t.text};
    font-weight: 600;
    padding: 6px 8px;
    border: 1px solid ${t.border};
    border-radius: 8px;
    background: ${t.surface};
  }
  .ap-loglist {
    margin-top: 8px;
    border: 1px solid ${t.border};
    background: ${t.surface2};
    border-radius: 8px;
    overflow: hidden;
  }
  .ap-logrow {
    display: grid;
    grid-template-columns: 180px 160px 1fr;
    gap: 8px;
    padding: 8px 10px;
    border-top: 1px solid ${t.border};
  }
  .ap-logrow:first-child { border-top: 0; }
  .ap-logtime { color: ${t.textDim}; }
  .ap-logdev  { color: ${t.textDim}; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ap-logmsg  { white-space: pre-wrap; }
  `;
}
