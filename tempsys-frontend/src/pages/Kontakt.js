// src/pages/Kontakt.js
import React from "react";

export default function Kontakt() {
  const t = {
    bg: "#0f1115",
    surface: "#151923",
    surface2: "#1b2130",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    primary600: "#c42727",
    border: "#2a3040",
    focus: "#5ab0ff",
  };

  return (
    <main className="ts-contact">
      <style>{css(t)}</style>

      {/* HERO */}
      <section className="ct-hero">
        <div className="container">
          <h1>Kontakt</h1>
          <p className="lead">
            Ob Fragen, Feedback oder Ideen – wir freuen uns von Ihnen zu hören.
          </p>
        </div>
      </section>

      {/* FORM */}
      <section className="section">
        <div className="container">
          <div className="formCard">
            <h2>Schreiben Sie uns</h2>
            <form>
              <label className="ts-label">
                Name
                <input type="text" className="ts-input" placeholder="Ihr Name" />
              </label>
              <label className="ts-label">
                E-Mail
                <input type="email" className="ts-input" placeholder="Ihre E-Mail" />
              </label>
              <label className="ts-label">
                Nachricht
                <textarea className="ts-input" rows="5" placeholder="Ihre Nachricht"></textarea>
              </label>
              <button type="button" className="btn btn-primary">Senden</button>
            </form>
          </div>
        </div>
      </section>

      {/* INFO */}
      <section className="section">
        <div className="container infoGrid">
          <div className="infoBox">
            <h3>Adresse</h3>
            <p>TempSys GmbH<br/>Startupstraße 1<br/>12345 Musterstadt</p>
          </div>
          <div className="infoBox">
            <h3>E-Mail</h3>
            <p>kontakt@tempsys.de</p>
          </div>
          <div className="infoBox">
            <h3>Telefon</h3>
            <p>+49 123 456 7890</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function css(t) {
  return `
  .ts-contact{ background:${t.bg}; color:${t.text}; min-height:100vh; }
  .container{ max-width:1200px; margin:0 auto; padding:0 20px; }

  .ct-hero{
    padding: 80px 0 48px;
    text-align:center;
    background:
      radial-gradient(600px 300px at 70% -50%, rgba(224,49,49,.20) 0%, rgba(224,49,49,0) 70%),
      radial-gradient(500px 240px at 10% 10%, rgba(90,176,255,.15) 0%, rgba(90,176,255,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, #0c0f14 100%);
    border-bottom:1px solid ${t.border};
  }
  .ct-hero h1{ font-size: clamp(2.1rem, 5vw, 3.2rem); margin:0; }
  .lead{ color:${t.textDim}; margin-top:10px; }

  .section{ padding: 64px 0; border-bottom:1px solid ${t.border}; }
  .formCard{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:16px;
    padding:20px; box-shadow:0 8px 20px rgba(0,0,0,.25);
    max-width:600px; margin:0 auto;
    display:grid; gap:14px;
  }
  .ts-label{ display:grid; gap:6px; font-weight:600; }
  .ts-input{
    width:100%; padding:10px 12px; border-radius:10px;
    border:1px solid ${t.border}; background:${t.surface}; color:${t.text};
    outline:none;
  }
  .ts-input:focus{ outline:2px solid ${t.focus}; outline-offset:2px; }

  .btn{
    display:inline-flex; align-items:center; justify-content:center;
    border-radius:10px; padding:12px 18px; font-weight:700;
    border:1px solid transparent; cursor:pointer;
    transition: all .15s ease;
  }
  .btn-primary{ background:${t.primary}; color:#fff; box-shadow:0 6px 16px rgba(224,49,49,.25); }
  .btn-primary:hover{ background:${t.primary600}; }

  .infoGrid{
    display:grid; gap:16px; grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width:720px){ .infoGrid{ grid-template-columns: 1fr; } }
  .infoBox{
    background:${t.surface2}; border:1px solid ${t.border}; border-radius:12px; padding:18px;
    box-shadow:0 8px 20px rgba(0,0,0,.25);
  }
  .infoBox h3{ margin:0 0 6px; }
  .infoBox p{ margin:0; color:${t.textDim}; }
  `;
}
