// src/components/ProtectedRoute.js

import React, { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { isAuthenticated, role } = useContext(AuthContext);
  const location = useLocation();

  // 1) Nicht eingeloggt → zur Home (Login)
  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // 2) Rolle nicht erlaubt → je nach Rolle weiterleiten
  if (!allowedRoles.includes(role)) {
    switch (role) {
      case "admin":
        return <Navigate to="/admin" replace />;
      case "companyAdmin":
        return <Navigate to="/company-dashboard" replace />;
      default:
        return <Navigate to="/dashboard" replace />;
    }
  }

  // 3) Alles gut → Kinder als React-Elemente zurückgeben
  return <>{children}</>;
}
