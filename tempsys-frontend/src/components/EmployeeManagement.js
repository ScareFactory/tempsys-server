// src/components/EmployeeManagement.js
import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Select from "./ui/Select";
import { FaUser, FaUserShield } from "react-icons/fa";

export default function EmployeeManagement({ companyId }) {
  const { token } = useContext(AuthContext);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    tagId: "",
    role: "user",
  });

  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({ username: "", tagId: "", role: "" });

  // Mehrere geschützte Tags
  const PROTECTED_TAGS = ["IT", "FOUNDER"];
  const isProtectedUser = (u) => PROTECTED_TAGS.includes(u?.tagId);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/users`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.sort((a, b) => a.username.localeCompare(b.username));
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Fehler beim Laden der Mitarbeiter");
    } finally {
      setLoading(false);
    }
  }

  const handleCreate = async () => {
    const { username, password, tagId, role } = newUser;
    if (!username || !password || !tagId) return;
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers,
        body: JSON.stringify({ companyId, username, password, tagId, role }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setNewUser({ username: "", password: "", tagId: "", role: "user" });
      fetchUsers();
    } catch {
      alert("Fehler beim Erstellen");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Mitarbeiter wirklich löschen?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchUsers();
    } catch {
      alert("Fehler beim Löschen");
    }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditValues({ username: u.username, tagId: u.tagId, role: u.role });
  };
  const cancelEdit = () => setEditingId(null);
  const saveEdit = async (id) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(editValues),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      cancelEdit();
      fetchUsers();
    } catch {
      alert("Fehler beim Speichern");
    }
  };

  const admins = users.filter((u) => u.role === "companyAdmin");
  const normals = users.filter((u) => u.role === "user");

  const t = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    surface: "rgba(16,20,28,.55)",
    border: "rgba(255,255,255,.14)",
    fieldBg: "rgba(27,33,48,.55)",
    fieldBorder: "rgba(255,255,255,.12)",
    focus: "#5ab0ff",
    danger: "#e03131",
  };

  const ProtectedNote = () => (
    <span style={{ color: t.danger, fontSize: "0.85rem" }}>
      Nutzer kann aus Sicherheitsgründen nicht gelöscht werden
    </span>
  );

  return (
    <Card className="em-card">
      <style>{css(t)}</style>

      <h2 className="em-title">Mitarbeiter verwalten</h2>

      {/* Create Form */}
      <div className="em-form">
        <h3 className="em-subtitle">Neuen Mitarbeiter erstellen</h3>
        <div className="em-form-grid">
          <div>
            <label className="em-label">Benutzername</label>
            <input
              className="em-input"
              placeholder="z.B. Max Mustermann"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            />
          </div>
          <div>
            <label className="em-label">Passwort</label>
            <input
              className="em-input"
              type="password"
              placeholder="Passwort"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            />
          </div>
          <div>
            <label className="em-label">Tag-ID</label>
            <input
              className="em-input"
              placeholder="z.B. A0:4C:AC:A5"
              value={newUser.tagId}
              onChange={(e) => setNewUser({ ...newUser, tagId: e.target.value })}
            />
          </div>
          <div>
            <label className="em-label">Rolle</label>
            <Select
              style={{ width: "100%" }}
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              options={[
                { value: "user", label: "Normaler Nutzer" },
                { value: "companyAdmin", label: "Firmen-Admin" },
              ]}
            />
          </div>
          <Button style={{ height: 42 }} onClick={handleCreate}>
            Erstellen
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="em-dim">Lade…</p>
      ) : error ? (
        <p style={{ color: t.danger }}>{error}</p>
      ) : (
        <>
          <h3 className="em-subtitle">Firmen-Administratoren</h3>
          {admins.length === 0 && <p className="em-dim">Keine Firmen-Admins.</p>}
          {admins.map((u) => (
            <div key={u.id} className="em-row">
              <div className="em-row-inner">
                <div className="em-left">
                  {u.role === "companyAdmin" ? <FaUserShield /> : <FaUser />}
                  <span>{u.username}</span>
                  <span className="em-badge">Tag: {u.tagId}</span>
                </div>

                {editingId === u.id ? (
                  <div className="em-edit">
                    <input
                      className="em-input"
                      value={editValues.username}
                      onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
                    />
                    <input
                      className="em-input"
                      value={editValues.tagId}
                      onChange={(e) => setEditValues({ ...editValues, tagId: e.target.value })}
                    />
                    <Select
                      style={{ minWidth: 140 }}
                      value={editValues.role}
                      onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                      options={[
                        { value: "user", label: "Normaler Nutzer" },
                        { value: "companyAdmin", label: "Firmen-Admin" },
                      ]}
                    />
                    <Button onClick={() => saveEdit(u.id)}>Speichern</Button>
                    <Button
                      style={{ backgroundColor: t.danger, borderColor: t.danger, color: "#fff" }}
                      onClick={cancelEdit}
                    >
                      Abbrechen
                    </Button>
                  </div>
                ) : isProtectedUser(u) ? (
                  <ProtectedNote />
                ) : (
                  <div className="em-edit">
                    <Button size="small" onClick={() => startEdit(u)}>
                      Bearbeiten
                    </Button>
                    <Button
                      size="small"
                      style={{ backgroundColor: t.danger, borderColor: t.danger, color: "#fff" }}
                      onClick={() => handleDelete(u.id)}
                    >
                      Löschen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <h3 className="em-subtitle">Normale Nutzer</h3>
          {normals.length === 0 && <p className="em-dim">Keine Nutzer.</p>}
          {normals.map((u) => (
            <div key={u.id} className="em-row">
              <div className="em-row-inner">
                <div className="em-left">
                  {u.role === "companyAdmin" ? <FaUserShield /> : <FaUser />}
                  <span>{u.username}</span>
                  <span className="em-badge">Tag: {u.tagId}</span>
                </div>

                {editingId === u.id ? (
                  <div className="em-edit">
                    <input
                      className="em-input"
                      value={editValues.username}
                      onChange={(e) => setEditValues({ ...editValues, username: e.target.value })}
                    />
                    <input
                      className="em-input"
                      value={editValues.tagId}
                      onChange={(e) => setEditValues({ ...editValues, tagId: e.target.value })}
                    />
                    <Select
                      style={{ minWidth: 140 }}
                      value={editValues.role}
                      onChange={(e) => setEditValues({ ...editValues, role: e.target.value })}
                      options={[
                        { value: "user", label: "Normaler Nutzer" },
                        { value: "companyAdmin", label: "Firmen-Admin" },
                      ]}
                    />
                    <Button onClick={() => saveEdit(u.id)}>Speichern</Button>
                    <Button
                      style={{ backgroundColor: t.danger, borderColor: t.danger, color: "#fff" }}
                      onClick={cancelEdit}
                    >
                      Abbrechen
                    </Button>
                  </div>
                ) : isProtectedUser(u) ? (
                  <ProtectedNote />
                ) : (
                  <div className="em-edit">
                    <Button size="small" onClick={() => startEdit(u)}>
                      Bearbeiten
                    </Button>
                    <Button
                      size="small"
                      style={{ backgroundColor: t.danger, borderColor: t.danger, color: "#fff" }}
                      onClick={() => handleDelete(u.id)}
                    >
                      Löschen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

/* ------------- Scoped CSS ------------- */
function css(t) {
  return `
  .em-card { position: relative; }
  .em-title { margin: 0 0 12px; font-size: 1.2rem; }
  .em-subtitle { margin: 14px 0 10px; font-size: 1.05rem; }
  .em-dim { color: ${t.textDim}; }
  .em-form{
    background: ${t.surface};
    border: 1px solid ${t.border};
    border-radius: 12px;
    padding: 16px;
    backdrop-filter: blur(10px) saturate(140%);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    margin-bottom: 18px;
  }
  .em-label{ display:block; font-weight:600; margin-bottom:6px; color:${t.text}; }
  .em-input{
    width:100%; padding:10px 12px; border-radius:10px;
    background:${t.fieldBg}; color:${t.text};
    border:1px solid ${t.fieldBorder};
    outline:none;
  }
  .em-input:focus{ outline:2px solid ${t.focus}; outline-offset:2px; }
  .em-form-grid{
    display:grid; grid-template-columns: 1fr 1fr 1fr 1fr auto;
    gap:12px; align-items:end;
  }
  @media (max-width:1100px){
    .em-form-grid{ grid-template-columns: 1fr 1fr; }
  }
  @media (max-width:640px){
    .em-form-grid{ grid-template-columns: 1fr; }
  }
  .em-row{
    background:${t.surface};
    border:1px solid ${t.border};
    border-radius:12px;
    padding:12px 16px; margin-bottom:12px;
    transition: background .15s ease, border-color .15s ease;
    backdrop-filter: blur(8px) saturate(140%);
    -webkit-backdrop-filter: blur(8px) saturate(140%);
  }
  .em-row:hover{ background: rgba(27,33,48,.62); border-color: rgba(224,49,49,.28); }
  .em-row-inner{ display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
  .em-left{ display:flex; align-items:center; gap:12px; }
  .em-badge{ font-size:.85rem; color:${t.textDim}; }
  .em-edit{ display:flex; gap:8px; flex-wrap:wrap; }
  `;
}
