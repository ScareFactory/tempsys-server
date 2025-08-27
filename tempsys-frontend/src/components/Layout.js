// src/components/Layout.jsx
import React, { useContext, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.svg";
import LoginModal from "./LoginModal";
import { AuthContext } from "../contexts/AuthContext";

export default function Layout() {
  const { isAuthenticated, role, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);

  const theme = {
    bgGradient: "linear-gradient(180deg, #151923 0%, rgba(21,25,35,.92) 100%)",
    border: "#2a3040",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    focus: "#5ab0ff",
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <style>{css(theme)}</style>

      <nav className="ts-navbar" aria-label="Hauptnavigation">
        {/* volle Breite – bewusst ohne zentrierte Containerbegrenzung */}
        <div className="ts-navbar-inner">
          {/* Links neben Logo */}
          <div className="ts-nav left">
            <Link to="/produkte" className="ts-nav-link">Produkte</Link>
            <Link to="/services" className="ts-nav-link">Services</Link>
            <Link to="/newsletter" className="ts-nav-link">Newsletter</Link>
          </div>

          {/* Logo mit begrenztem roten Glow */}
          <Link to="/" className="ts-logo" aria-label="Startseite">
            <span className="ts-logo-glow" aria-hidden="true" />
            <img src={Logo} alt="TempSys Logo" />
          </Link>

          {/* Rechts vom Logo */}
          <div className="ts-nav right">
            <Link to="/shop" className="ts-nav-link">Shop</Link>
            <Link to="/ueber-uns" className="ts-nav-link">Über uns</Link>
            <Link to="/kontakt" className="ts-nav-link">Kontakt</Link>

            {/* Login/Logout ganz rechts */}
            <div className="ts-login-wrapper">
              {!isAuthenticated && (
                <button
                  className="ts-nav-link ts-login-btn"
                  onClick={() => setShowLogin(true)}
                  type="button"
                >
                  Login
                </button>
              )}
              {isAuthenticated && role === "user" && (
                <Link to="/dashboard" className="ts-nav-link">Dashboard</Link>
              )}
              {isAuthenticated && role === "companyAdmin" && (
                <Link to="/company-dashboard" className="ts-nav-link">Company Dashboard</Link>
              )}
              {isAuthenticated && role === "admin" && (
                <Link to="/admin" className="ts-nav-link">Admin Panel</Link>
              )}
              {isAuthenticated && (
                <button
                  className="ts-nav-link ts-login-btn"
                  onClick={handleLogout}
                  type="button"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />
      <Outlet />
    </>
  );
}

function css(t) {
  return `
  .ts-navbar{
    position: sticky;
    top: 0;
    z-index: 1000;
    background: ${t.bgGradient};
    border-bottom: 1px solid ${t.border};
    backdrop-filter: blur(8px);
  }
  /* volle Breite */
  .ts-navbar-inner{
    height: 64px;
    padding: 0 20px;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto 1fr; /* links | logo | rechts */
    align-items: center;
    gap: 8px;
  }

  .ts-logo{
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 64px;         /* koppelt Glow an Navbar-Höhe */
    width: 140px;
    text-decoration: none;
    border-bottom: 0;
  }
  .ts-logo img{
    height: 40px;
    display: block;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }
  .ts-logo .ts-logo-glow{
    position: absolute;
    top: 50%; left: 50%;
    width: 120px; height: 120px;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(224,49,49,0.28) 0%, rgba(224,49,49,0) 70%);
    filter: blur(4px);
    z-index: 0;
    pointer-events: none;
  }

  .ts-nav{
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }
  .ts-nav.left{  justify-content: flex-end; }
  .ts-nav.right{ justify-content: flex-start; }

  .ts-login-wrapper{
    margin-left: auto;  /* schiebt Login bis ganz rechts */
    display: flex;
    align-items: center;
    gap: 12px;
  }

  /* --- NAV-LINKS: kein globaler Balken, nur animierte Linie innerhalb Navbar --- */
  .ts-navbar a,
  .ts-navbar .ts-nav-link{
    color: ${t.textDim};
    text-decoration: none;
    border-bottom: 0; /* neutralisiert evtl. globale Regeln */
  }

  .ts-nav-link{
    background: none;
    border: none;
    padding: 6px 10px;
    font-size: 0.95rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: color .15s ease, background-color .15s ease;
    position: relative;             /* für die animierte Linie */
    outline: none;
  }

  /* animierte rote Linie nur hier */
  .ts-nav-link::after{
    content: '';
    position: absolute;
    left: 8px;                      /* etwas eingerückt, wirkt hochwertiger */
    right: 8px;
    bottom: 4px;
    height: 2px;
    background-color: ${t.primary};
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform .25s ease;
    pointer-events: none;
  }

  .ts-nav-link:hover{
    color: ${t.text};
    background: rgba(255,255,255,0.05);
  }
  .ts-nav-link:hover::after{
    transform: scaleX(1);
  }

  /* Tastaturfokus sichtbar, ohne Unterstreichungsbalken */
  .ts-nav-link:focus-visible{
    outline: 2px solid ${t.focus};
    outline-offset: 2px;
  }

  /* Login/Logout als Button-Style in der Navbar – ohne Balken */
  .ts-login-btn{
    color: ${t.primary};
    font-weight: 600;
  }
  .ts-login-btn:hover{
    color: #fff;
    background: ${t.primary};
  }
  .ts-login-btn::after{ content: none !important; } /* sicherheitshalber */

  @media (max-width: 760px){
    .ts-navbar-inner{
      grid-template-columns: auto 1fr auto;
      gap: 6px;
    }
    .ts-logo{ width: 120px; }
    .ts-nav{ gap: 8px; }
    .ts-nav-link{ padding: 6px 8px; }
    .ts-nav-link::after{ left: 6px; right: 6px; }
  }
  `;
}
