// src/pages/Shop.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../assets/Logo.svg";
import {
  FaClock,
  FaMobileAlt,
  FaIdCard,
  FaTags,
  FaServer,
  FaChargingStation,
  FaPlug,
  FaMicrochip,
  FaBroadcastTower,
  FaCartPlus,
} from "react-icons/fa";

export default function Shop() {
  // Theme identisch zu Homepage.jsx
  const t = {
    bg: "linear-gradient(180deg, #0F131B 0%, #0B0F16 100%)",
    glass: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
    border: "rgba(255,255,255,.16)",
    text: "#E6E8EE",
    dim: "#B4B9C7",
    red: "#E03131",
    blue: "#4CC3FF",
    cyan: "#5DE1FF",
    glowRed: "rgba(224,49,49,.55)",
    glowBlue: "rgba(80,190,255,.45)",
  };

  const [cart, setCart] = useState(0);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("main"); // main | tools | addons

  // Produkte nach Kategorien (nur Fakten, keine erfundenen Preise/Texte)
  const mainProducts = useMemo(
    () => [
      {
        id: "core",
        section: "Core",
        title: "TempSys Core",
        subtitle: "Stationäre Haupt‑Stempeluhr",
        priceEUR: 799,
        desc:
          "Das Herzstück der TempSys‑Lösung. Robuste Stempeluhr für Büros, Werkstätten und Betriebe.",
        Icon: FaClock,
      },
      {
        id: "go",
        section: "Go",
        title: "TempSys Go",
        subtitle: "Mobile Basestation",
        priceEUR: 1299,
        desc:
          "Die mobile Lösung für Außendienst, Baustellen und Events. Mit Basestation und 12 tragbaren Scannern.",
        Icon: FaMobileAlt,
      },
    ],
    []
  );

  const helperTools = useMemo(
    () => [
      {
        id: "wizard",
        section: "Wizard",
        title: "TempWizard",
        subtitle: "NFC‑Onboarding‑Scanner",
        priceEUR: 199,
        desc:
          "Der smarte Assistent für schnelles Einpflegen neuer Mitarbeiter. Einfach NFC scannen und hinzufügen.",
        Icon: FaIdCard,
      },
      {
        id: "tagger",
        section: "Tagger",
        title: "TempSys Tagger",
        subtitle: "NFC‑Tag Tool",
        // keine Preisangabe geliefert → optional
        desc: "", // keine zusätzlichen Texte erfunden
        Icon: FaTags,
      },
      {
        id: "hub",
        section: "Hub",
        title: "TempSys Hub",
        subtitle: "Zentrale Einheit",
        // keine Preisangabe geliefert → optional
        desc: "",
        Icon: FaServer,
      },
    ],
    []
  );

  const addOns = useMemo(
    () => [
      {
        id: "dock",
        section: "Dock",
        title: "TempSys Dock",
        subtitle: "Andockstation / Mount",
        priceEUR: 79,
        desc:
          "Praktische Andockstation für Core oder Wizard. Stabil, elegant und zuverlässig.",
        Icon: FaChargingStation,
      },
      {
        id: "powerdock",
        section: "PowerDock",
        title: "TempSys PowerDock",
        subtitle: "Dock + USV",
        priceEUR: 149,
        desc:
          "Dockingstation mit integrierter USV. Sicherheit bei Stromausfällen.",
        Icon: FaPlug,
      },
      {
        id: "mini",
        section: "Mini",
        title: "TempSys Mini",
        subtitle: "Kompakte Basiseinheit",
        priceEUR: 399,
        desc:
          "Die kompakte Einstiegslösung für kleinere Firmen oder dezentrale Standorte.",
        Icon: FaMicrochip,
      },
      {
        id: "beacon",
        section: "Beacon",
        title: "TempSys Beacon",
        subtitle: "Mobiles NFC‑Gerät",
        priceEUR: 249,
        desc:
          "Mobiles, batteriebetriebenes NFC‑Gerät für Orte ohne feste Core/Go‑Abdeckung.",
        Icon: FaBroadcastTower,
      },
    ],
    []
  );

  function addToCart(p) {
    setCart((c) => c + 1);
    setToast({ title: "Zum Warenkorb hinzugefügt", text: p.title });
    clearTimeout(window.__ts_shop_toast);
    window.__ts_shop_toast = setTimeout(() => setToast(null), 1800);
  }

  const groups = {
    main: { emoji: "🏆", title: "Hauptprodukte", items: mainProducts },
    tools: { emoji: "🛠", title: "Hilfstools", items: helperTools },
    addons: { emoji: "🔌", title: "Add‑ons", items: addOns },
  };

  return (
    <>
      <style>{css(t)}</style>

      <main className="shop">
        {/* Header */}
        <section className="sh-hero">
          <div className="bg-halo" />
          <div className="wrap head-row">
            <div className="brand">
              <img src={Logo} alt="TempSys" />
              <h1>TempSys<span className="accent">.</span> Shop</h1>
            </div>
            <div className="cart">
              <span className="pill">Warenkorb</span>
              {cart > 0 && <span className="badge">{cart}</span>}
            </div>
          </div>

          {/* Tabs */}
          <div className="wrap tabs">
            <Tab label="Main Line" active={tab === "main"} onClick={() => setTab("main")} />
            <Tab label="Helpers" active={tab === "tools"} onClick={() => setTab("tools")} />
            <Tab label="Add‑ons" active={tab === "addons"} onClick={() => setTab("addons")} />
          </div>
        </section>

        {/* Cards Grid */}
        <section className="section">
          <div className="wrap">
            <header className="sec-head">
              <h2>
                <span className="emoji">{groups[tab].emoji}</span> {groups[tab].title}
              </h2>
            </header>

            <div className="cards">
              {groups[tab].items.map((p) => (
                <ProductCard key={p.id} p={p} onAdd={addToCart} />
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="sh-foot">
          <div className="wrap foot-row">
            <span>© {new Date().getFullYear()} TempSys</span>
            <div className="links">
              <Link to="/impressum">Impressum</Link>
              <Link to="/datenschutz">Datenschutz</Link>
            </div>
          </div>
        </footer>
      </main>

      {/* Toast */}
      {toast && (
        <div className="toast">
          <div className="toast-card">
            <strong>✅ {toast.title}</strong>
            <div className="muted">{toast.text}</div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Bausteine ---------- */

function Tab({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`tab ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function ProductCard({ p, onAdd }) {
  const Icon = p.Icon;
  const hasPrice = typeof p.priceEUR === "number";
  return (
    <article className="p-card">
      <div className="badge-sec">{p.section}</div>

      <div className="media">
        <div className="media-circle">
          <Icon className="media-icon" />
          <div className="media-glow" />
        </div>
        <div className="under-glow" />
      </div>

      <div className="p-content">
        <h3 className="p-title">{p.title}</h3>
        {p.subtitle && <p className="p-sub muted">{p.subtitle}</p>}
        {p.desc && <p className="muted">{p.desc}</p>}

        <div className="p-row">
          <div className="price">
            {hasPrice
              ? p.priceEUR.toLocaleString("de-DE", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 0,
                })
              : <span className="pill alt">Preis auf Anfrage</span>}
          </div>
          <div className="actions">
            <button className="btn btn-primary" onClick={() => onAdd(p)}>
              <FaCartPlus style={{ marginRight: 8 }} />
              In den Warenkorb
            </button>
            <Link to="/kontakt" className="btn btn-ghost">
              Anfragen
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- Styles (Theme wie Homepage.jsx) ---------- */

function css(t) {
  return `
  :root{
    --text:${t.text};
    --dim:${t.dim};
    --border:${t.border};
    --glass:${t.glass};
    --red:${t.red};
    --blue:${t.blue};
    --cyan:${t.cyan};
    --glowR:${t.glowRed};
    --glowB:${t.glowBlue};
  }

  .shop{ color:var(--text); background:${t.bg}; min-height:100vh; }
  .wrap{ width:min(1180px,92vw); margin:0 auto; position:relative; z-index:2; }

  /* Header/Hero */
  .sh-hero{ position:relative; padding:24px 0 6px; overflow:hidden; }
  .bg-halo{
    position:absolute; inset:-20% -30% auto -30%; height:200px;
    background:
      radial-gradient(55% 60% at 20% 30%, var(--glowB), transparent 60%),
      radial-gradient(45% 55% at 90% 80%, var(--glowR), transparent 60%);
    filter:blur(26px); opacity:.9; z-index:0;
  }
  .head-row{
    display:flex; align-items:center; justify-content:space-between; gap:12px;
    border-bottom:1px solid var(--border); padding-bottom:12px;
  }
  .brand{ display:flex; align-items:center; gap:10px; }
  .brand img{ height:28px; display:block; }
  .brand h1{ margin:0; font-size: clamp(24px,3.8vw,34px); letter-spacing:-.01em; }
  .accent{ color:var(--red); }

  .cart{ position:relative; display:flex; align-items:center; gap:8px; }
  .pill{
    display:inline-flex; align-items:center; gap:8px; padding:8px 12px;
    border:1px solid var(--border); border-radius:999px; background:var(--glass);
    color:var(--text); backdrop-filter:blur(8px); font-size:14px;
  }
  .pill.alt{ color:var(--dim); }
  .badge{
    position:absolute; right:-8px; top:-8px; min-width:18px; height:18px; padding:0 5px;
    display:grid; place-items:center; font-size:11px; font-weight:700; color:#071218;
    background: var(--cyan); border-radius:999px; box-shadow:0 8px 22px -10px var(--glowB);
  }

  /* Tabs */
  .tabs{ display:flex; gap:10px; padding-top:12px; }
  .tab{
    border:1px solid var(--border); border-radius:999px; padding:8px 12px;
    background:var(--glass); color:var(--dim); cursor:pointer;
    transition:transform .15s, box-shadow .15s, color .15s, border-color .15s;
    backdrop-filter: blur(8px);
  }
  .tab:hover{ transform:translateY(-1px); color:var(--text); }
  .tab.active{ color:var(--text); border-color: rgba(80,190,255,.5); box-shadow: 0 12px 34px -18px var(--glowB); }

  /* Section */
  .section{ padding: 22px 0 28px; }
  .sec-head h2{ margin:0 0 8px; font-size: clamp(18px,3.2vw,24px); display:flex; align-items:center; gap:8px; }
  .emoji{ font-size: 1.2em; }
  .cards{
    display:grid; gap:16px;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }

  /* Card */
  .p-card{
    position:relative; overflow:hidden;
    border:1px solid var(--border); border-radius:18px; background:var(--glass); backdrop-filter:blur(10px);
    box-shadow: 0 0 60px -28px var(--glowB);
  }
  .badge-sec{
    position:absolute; left:14px; top:12px;
    padding:6px 10px; border-radius:999px;
    border:1px solid rgba(80,190,255,.4); background:rgba(6,12,20,.6);
    color:#d8f5ff; font-size:10px; letter-spacing:.12em; text-transform:uppercase;
  }
  .media{ position:relative; display:flex; align-items:center; justify-content:center; padding:22px 22px 8px; }
  .media-circle{
    position:relative; width:150px; height:150px; border-radius:999px;
    border:1px solid var(--border); background:var(--glass); backdrop-filter:blur(12px);
    display:grid; place-items:center;
  }
  .media-icon{ width:56px; height:56px; color:#bfefff; opacity:.95; }
  .media-glow{ position:absolute; inset:0; border-radius:999px; background: rgba(93,225,255,.12); filter: blur(8px); pointer-events:none; }
  .under-glow{
    position:absolute; left:50%; top:100%; transform:translate(-50%,-10px);
    width:200px; height:24px; border-radius:999px; background: rgba(93,225,255,.25); filter: blur(20px);
    pointer-events:none;
  }

  .p-content{ padding:16px 18px 18px; }
  .p-title{ margin:0 0 2px; font-size: clamp(18px,3vw,22px); }
  .p-sub{ margin:0 0 6px; color:var(--dim); }
  .p-row{ display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-top:12px; }
  .price{ font-size:22px; font-weight:700; }

  .btn{
    border:1px solid var(--border); border-radius:12px; padding:10px 14px;
    background:var(--glass); color:var(--text); backdrop-filter:blur(6px);
    cursor:pointer; transition:transform .15s, box-shadow .15s, background-color .15s;
  }
  .btn:hover{ transform:translateY(-1px); }
  .btn-primary{ border-color: rgba(80,190,255,.5); box-shadow: 0 12px 34px -18px var(--glowB); }
  .btn-ghost{ color:var(--dim); }

  /* Footer */
  .sh-foot{ margin-top:26px; padding:16px 0 24px; border-top:1px solid var(--border); background:linear-gradient(180deg, rgba(255,255,255,.03), rgba(255,255,255,0)); }
  .foot-row{ display:flex; align-items:center; justify-content:space-between; gap:12px; color:var(--dim); }
  .links a{ color:var(--text); text-decoration:none; border-bottom:0; }
  .links a:hover{ text-decoration:underline; }

  /* Toast */
  .toast{
    position:fixed; inset: 16px 0 auto 0; display:flex; justify-content:center; z-index:9999;
    animation: slideIn .25s ease-out;
  }
  .toast-card{
    max-width:560px; padding:10px 14px; border-radius:14px;
    border:1px solid var(--border); background:rgba(6,12,20,.85); color:var(--text);
    backdrop-filter: blur(8px); box-shadow: 0 10px 30px rgba(0,0,0,.35);
  }
  @keyframes slideIn{ from{ transform: translateY(-8px); opacity:0 } to{ transform: translateY(0); opacity:1 } }

  /* Responsive */
  @media (max-width: 680px){
    .head-row{ flex-direction:column; align-items:flex-start; gap:6px; }
    .tabs{ flex-wrap:wrap; }
    .price{ font-size:20px; }
  }
  `;
}
