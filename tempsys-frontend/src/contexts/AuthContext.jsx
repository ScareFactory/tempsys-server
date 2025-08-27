import React, { createContext, useState, useEffect } from "react";

// Initialer Context mit allen Werten, die wir brauchen
export const AuthContext = createContext({
  isAuthenticated: false,
  role: null,
  token: null,
  username: null,
  companyId: null,
  userId: null,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [role, setRole]         = useState(null);
  const [token, setToken]       = useState(null);
  const [username, setUsername] = useState(null);
  const [companyId, setCompanyId] = useState(null);
  const [userId, setUserId]     = useState(null);

  useEffect(() => {
    // Werte aus localStorage wiederherstellen
    const t = localStorage.getItem("token");
    const r = localStorage.getItem("role");
    const u = localStorage.getItem("username");
    const c = localStorage.getItem("companyId");
    const id = localStorage.getItem("userId");
    if (t && r && u && c && id) {
      setToken(t);
      setRole(r);
      setUsername(u);
      setCompanyId(c);
      setUserId(id);
      setAuthenticated(true);
    }
  }, []);

  // Login speichert jetzt alle fünf Werte
  const login = (newToken, newRole, newUsername, newCompanyId, newUserId) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", newRole);
    localStorage.setItem("username", newUsername);
    localStorage.setItem("companyId", newCompanyId);
    localStorage.setItem("userId", newUserId);

    setToken(newToken);
    setRole(newRole);
    setUsername(newUsername);
    setCompanyId(newCompanyId);
    setUserId(newUserId);
    setAuthenticated(true);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setUsername(null);
    setCompanyId(null);
    setUserId(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        token,
        username,
        companyId,
        userId,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
