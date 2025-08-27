// src/App.js

import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, AuthContext } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CompanyAdminDashboard from "./pages/CompanyAdminDashboard";
import AdminPanel from "./pages/AdminPanel";
import ProtectedRoute from "./components/ProtectedRoute";

// Öffentliche Seiten
import Produkte from "./pages/Produkte";
import Services from "./pages/Services";
import UeberUns from "./pages/UeberUns";
import Kontakt from "./pages/Kontakt";
import Impressum from "./pages/Impressum";
import Datenschutz from "./pages/Datenschutz";

// Neu hinzugefügt
import Shop from "./pages/Shop";
import Newsletter from "./pages/Newsletter";

/**
 * HomeRedirect leitet abhängig von Auth-Status und Rolle weiter,
 * oder zeigt Home (Login/Marketing) wenn nicht eingeloggt.
 */
function HomeRedirect() {
  const { isAuthenticated, role } = useContext(AuthContext);

  if (!isAuthenticated) return <Home />;

  if (role === "admin") return <Navigate to="/admin" replace />;
  if (role === "companyAdmin") return <Navigate to="/company-dashboard" replace />;

  // default für 'user' oder unbekannte Rollen
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            {/* Startseite: nutzt jetzt HomeRedirect statt direkt Home */}
            <Route index element={<HomeRedirect />} />

            {/* Öffentliche Seiten */}
            <Route path="produkte" element={<Produkte />} />
            <Route path="services" element={<Services />} />
            <Route path="ueber-uns" element={<UeberUns />} />
            <Route path="kontakt" element={<Kontakt />} />
            <Route path="impressum" element={<Impressum />} />
            <Route path="datenschutz" element={<Datenschutz />} />

            {/* Neue Seiten für Navbar */}
            <Route path="shop" element={<Shop />} />
            <Route path="newsletter" element={<Newsletter />} />

            {/* Normale User */}
            <Route
              path="dashboard"
              element={
                <ProtectedRoute allowedRoles={["user"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Firmen-Admins */}
            <Route
              path="company-dashboard"
              element={
                <ProtectedRoute allowedRoles={["companyAdmin"]}>
                  <CompanyAdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* Super-Admins */}
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />

            {/* Fallback: Unbekannte Routen -> Startlogik */}
            <Route path="*" element={<HomeRedirect />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
