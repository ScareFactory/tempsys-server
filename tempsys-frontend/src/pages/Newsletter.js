// src/pages/Newsletter.jsx
import React from "react";

/**
 * Newsletter / Changelog Seite
 * - Glaslook Cards
 * - Neueste Einträge oben
 */
export default function Newsletter() {
  const entries = [
    {
      version: "v1.3.0",
      date: "2025-08-24",
      title: "Shop & Newsletter",
      changes: [
        "Neue Shop-Seite mit Glas-/Tech-Look und Produktkarten",
        "Navigation erweitert: Newsletter-Link (links), Shop-Link (rechts)",
        "Newsletter/Changelog-Seite hinzugefügt mit Versionseinträgen",
      ],
    },
    {
      version: "v1.2.0",
      date: "2025-08-22",
      title: "Frontend Erweiterungen",
      changes: [
        "Neue Seiten: Produkte, Services, Über uns, Kontakt",
        "Impressum- und Datenschutz-Seiten erstellt",
        "Navigation optisch verbessert (animierte Linie, Glow am Logo)",
      ],
    },
    {
      version: "v1.1.0",
      date: "2025-08-19",
      title: "Auth & Dashboards",
      changes: [
        "Login-/Logout-Flow implementiert mit AuthContext",
        "Benutzerrollen: user, companyAdmin, admin",
        "Dashboards für User, Company-Admin und Admin eingeführt",
      ],
    },
    {
      version: "v1.0.0",
      date: "2025-08-15",
      title: "Erste Version",
      changes: [
        "Grundlegendes React-Setup mit Routing",
        "Layout & Navbar integriert",
        "Startseite mit Login/Marketing-Inhalten",
      ],
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Hintergrund Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-60px] left-1/2 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-wide">
            TempSys Updates
          </h1>
          <p className="mt-2 text-slate-400">
            Neueste Änderungen, Features & Bugfixes
          </p>
        </header>

        <div className="space-y-8">
          {entries.map((entry, idx) => (
            <article
              key={idx}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-[0_0_60px_-20px_rgba(56,189,248,0.25)]"
            >
              <header className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{entry.title}</h2>
                  <p className="text-slate-400">
                    {entry.version} – {entry.date}
                  </p>
                </div>
              </header>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                {entry.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
