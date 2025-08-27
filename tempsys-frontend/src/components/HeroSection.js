// src/components/HeroSection.js
import React from "react";

const HeroSection = ({ onClickButton }) => {
  const theme = {
    bg: "#0f1115",
    surface: "#151923",
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    primary: "#e03131",
    primary600: "#c42727",
    border: "#2a3040",
    focus: "#5ab0ff",
  };

  return (
    <section className="ts-hero">
      {/* Scoped CSS nur für diese Section */}
      <style>{css(theme)}</style>

      <div className="ts-container">
        <h1 className="ts-title">Digitale Zeiterfassung neu gedacht.</h1>
        <p className="ts-sub">
          Einfach. Effizient. Rechtssicher. Für kleine und große Teams.
        </p>

        <div className="ts-cta">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClickButton}
          >
            Jetzt konfigurieren
          </button>

          {/* Pfeil direkt unter dem Button */}
          <span className="ts-down" aria-hidden="true">↓</span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

/* ----------------- Scoped CSS ----------------- */
function css(t) {
  return `
  .ts-hero{
    padding: 88px 0 48px;
    background:
      radial-gradient(600px 300px at 70% -50%, ${hexA(t.primary,.20)} 0%, rgba(0,0,0,0) 70%),
      radial-gradient(500px 240px at 10% 10%, ${hexA(t.focus,.15)} 0%, rgba(0,0,0,0) 70%),
      linear-gradient(180deg, ${t.bg} 0%, #0c0f14 100%);
    border-bottom: 1px solid ${t.border};
    color: ${t.text};
    text-align: center;
  }
  .ts-container{ max-width: 1200px; margin: 0 auto; padding: 0 20px; }
  .ts-title{
    font-size: clamp(2rem, 4.8vw, 3.2rem);
    line-height: 1.08; letter-spacing: -0.02em; margin: 0;
  }
  .ts-sub{
    margin: 12px auto 0;
    max-width: 720px;
    font-size: clamp(1rem, 2.2vw, 1.2rem);
    color: ${t.textDim};
  }

  /* CTA vertikal, damit der Pfeil direkt unter dem Button sitzt */
  .ts-cta{
    margin-top: 26px;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }

  .btn{
    display:inline-flex; align-items:center; justify-content:center;
    border-radius: 10px; padding: 12px 18px; font-weight: 700;
    border: 1px solid transparent; cursor: pointer;
    transition: transform .05s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, color .15s ease;
  }
  .btn:focus{ outline:2px solid ${t.focus}; outline-offset:2px; }
  .btn-primary{ background:${t.primary}; color:#fff; box-shadow:0 6px 16px rgba(224,49,49,.25); }
  .btn-primary:hover{ background:${t.primary600}; }
  .btn-primary:active{ transform: translateY(1px); }

  .ts-down{
    display:block;
    margin-top: 2px;
    line-height: 1;
    font-size: clamp(2.25rem, 6.5vw, 3.75rem); /* größer skaliert */
    color: ${t.primary};
    animation: tsFloat 1.6s ease-in-out infinite;
    user-select: none;
  }
  @keyframes tsFloat {
    0%,100%{ transform: translateY(0); opacity: .95; }
    50%{ transform: translateY(6px); opacity: .7; }
  }
  `;
}

/* --------- kleine Helfer --------- */
function hexA(hex, a) {
  const c = hex.replace("#", "");
  const bigint = parseInt(c, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
