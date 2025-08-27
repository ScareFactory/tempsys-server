// src/components/SystemActivity.jsx
import React, { useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";

export default function SystemActivity({
  pollMs = 8000,           // Poll-Intervall
  className = "",
  compact = false,
}) {
  const { token, companyId } = React.useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(0);
  const [total, setTotal]   = useState(0);
  const [err, setErr]       = useState("");
  const [hist, setHist]     = useState([]); // Verlauf Online-Anzahl für Sparkline

  const t = useMemo(() => ({
    bgGlass: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
    border: "rgba(255,255,255,.16)",
    text: "#e6e8ee",
    dim: "#b4b9c7",
    cyan: "#5de1ff",
    blue: "#4cc3ff",
    red: "#e03131",
  }), []);

  useEffect(() => {
    let dead = false;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    async function load() {
      try {
        if (!companyId) return;
        setErr("");
        const r = await fetch(`/api/companies/${companyId}/clocks`, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const arr = await r.json(); // [{id, online, version}]
        if (dead) return;
        const on = Array.isArray(arr) ? arr.filter(x => x?.online).length : 0;
        const tot = Array.isArray(arr) ? arr.length : 0;
        setOnline(on);
        setTotal(tot);
        setHist((h) => {
          const nx = [...h, on].slice(-40); // letzte 40 Samples
          return nx;
        });
      } catch (e) {
        if (!dead) setErr(String(e?.message || e));
      } finally {
        if (!dead) setLoading(false);
      }
    }

    load();
    const id = setInterval(load, Math.max(2000, pollMs));
    return () => { dead = true; clearInterval(id); };
  }, [token, companyId, pollMs]);

  const pct = useMemo(() => {
    const p = total > 0 ? (online / total) * 100 : 0;
    return Math.max(0, Math.min(100, Math.round(p)));
  }, [online, total]);

  return (
    <>
      <style>{css(t, compact)}</style>

      <div className={`ts-activity ${compact ? "is-compact" : ""} ${className}`}>
        <div className="bg-halo" />

        <header className="head">
          <div className="badge">
            <span className="dot" />
            System Activity
          </div>
          <div className="spacer" />
          <small className="muted">{loading ? "lädt…" : "live"}</small>
        </header>

        <div className="wrap">
          {/* Linke Seite: animierter Ring + KPI */}
          <div className="ringCard">
            <svg viewBox="0 0 120 120" className="ringSvg" aria-hidden>
              {/* Hintergrund-Kreis (glasig) */}
              <circle cx="60" cy="60" r="48" className="bg" />
              {/* Fortschrittsbogen (eigener Stil) */}
              <circle
                cx="60" cy="60" r="48"
                className="fg"
                style={{
                  ["--pct"]: pct,
                }}
              />
              {/* Core-Pulse */}
              <circle cx="60" cy="60" r="8" className="core" />
            </svg>

            <div className="kpis">
              <div className="kpi">
                <div className="v">{online}/{total}</div>
                <div className="l">Clocks online</div>
              </div>
              <div className="kpi">
                <div className="v">{pct}<span className="sm">%</span></div>
                <div className="l">Verfügbarkeit (live)</div>
              </div>
            </div>
          </div>

          {/* Rechte Seite: Activity Bars + Sparkline */}
          <div className="barsCard">
            <div className="bars">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className="bar" style={{ ["--i"]: i }} />
              ))}
            </div>

            <Sparkline data={hist} t={t} />

            {err ? <div className="err">Fehler: {err}</div> : null}
            {loading ? <div className="ske">Lade Live‑Daten…</div> : null}
          </div>
        </div>

        <footer className="foot">
          <div className="hint">
            Eigene TempSys‑Visuals (kein Nothing/ASUS): Ring‑Pulse • Sweep‑Bars • Sparkline.
          </div>
        </footer>
      </div>
    </>
  );
}

function Sparkline({ data = [], t }) {
  const w = 260, h = 56, pad = 6;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-label="Aktivitätsverlauf">
      <polyline points={pts} className="sp-line" vectorEffect="non-scaling-stroke" />
      <rect x="0" y="0" width={w} height={h} className="sp-glass" />
    </svg>
  );
}

function css(t, compact) {
  return `
  .ts-activity{
    position: relative;
    border:1px solid ${t.border};
    background:${t.bgGlass};
    border-radius:18px;
    backdrop-filter: blur(10px);
    padding:${compact ? "12px" : "16px"};
    color:${t.text};
    overflow:hidden;
    box-shadow: 0 30px 80px -40px rgba(80,190,255,.25);
  }
  .bg-halo{
    position:absolute; inset:-20% -30% auto -30%;
    height:220px; background:
      radial-gradient(50% 60% at 20% 30%, rgba(80,190,255,.25), transparent 60%),
      radial-gradient(40% 50% at 90% 80%, rgba(224,49,49,.22), transparent 60%);
    filter: blur(26px);
    z-index:0; opacity:.9;
  }
  .head{ position:relative; z-index:2; display:flex; align-items:center; gap:10px; margin-bottom:${compact ? "10px" : "14px"}; }
  .badge{
    display:inline-flex; align-items:center; gap:8px;
    border:1px solid ${t.border}; border-radius:999px; padding:6px 10px;
    background:${t.bgGlass}; color:${t.dim}; font-size:13px;
  }
  .badge .dot{
    width:8px; height:8px; border-radius:999px; background:${t.cyan};
    box-shadow:0 0 0 0 rgba(93,225,255,.6); animation: pulse 2.4s infinite;
  }
  .muted{ color:${t.dim}; }
  .spacer{ flex:1; }

  .wrap{ position:relative; z-index:2; display:grid; gap:14px; grid-template-columns: ${compact ? "1fr" : "300px 1fr"}; }
  .ringCard, .barsCard{
    border:1px solid ${t.border}; border-radius:16px; background:${t.bgGlass};
    padding:${compact ? "10px" : "14px"}; backdrop-filter: blur(8px);
  }

  .ringSvg{ width:${compact ? "160px" : "200px"}; height:${compact ? "160px" : "200px"}; display:block; margin:${compact ? "0 auto 8px" : "0 0 8px"}; }
  .ringSvg .bg{ fill:none; stroke: rgba(255,255,255,.15); stroke-width:10; }
  .ringSvg .fg{
    fill:none; stroke: ${t.blue}; stroke-width:10; stroke-linecap:round;
    transform: rotate(-90deg); transform-origin: 60px 60px;
    stroke-dasharray: 0 999; /* animiert per keyframes */
    animation: progress 2.2s ease-in-out infinite;
  }
  .ringSvg .core{
    fill:${t.blue};
    filter: drop-shadow(0 0 6px ${t.blue});
    animation: corePulse 2.6s ease-in-out infinite;
  }

  .kpis{ display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
  .kpi .v{ font-size:${compact ? "18px" : "22px"}; font-weight:700; }
  .kpi .v .sm{ font-size: .7em; margin-left: 2px; }
  .kpi .l{ color:${t.dim}; font-size: 12px; }

  .bars{ display:flex; align-items:flex-end; gap:6px; height:${compact ? "56px" : "82px"}; margin-bottom: 10px; }
  .bar{
    width:${compact ? "8px" : "10px"};
    background: ${t.cyan};
    box-shadow: 0 0 12px ${t.cyan};
    border-radius: 6px;
    height: 12px;
    animation: barMove 1.8s ease-in-out infinite;
    animation-delay: calc(var(--i) * .12s);
  }

  .spark{ width:100%; height:auto; display:block; }
  .sp-line{ fill:none; stroke:${t.red}; stroke-width:2; opacity:.85; }
  .sp-glass{ fill: url(#none); }

  .err{ color:${t.red}; font-size:12px; margin-top:6px; }
  .ske{ color:${t.dim}; font-size:12px; }

  .foot{ margin-top:${compact ? "8px" : "10px"}; color:${t.dim}; font-size:12px; }

  @keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(93,225,255,.6)} 70%{box-shadow:0 0 0 12px rgba(93,225,255,0)} 100%{box-shadow:0 0 0 0 rgba(93,225,255,0)} }
  @keyframes corePulse{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
  @keyframes barMove { 0%,100%{ height: 12px; opacity:.5 } 50%{ height: 100%; opacity: 1 } }
  @keyframes progress {
    0%   { stroke-dasharray: calc(var(--pct) * 3.02) 999; opacity:.6 }
    50%  { stroke-dasharray: calc(var(--pct) * 3.02 + 30) 999; opacity:1 }
    100% { stroke-dasharray: calc(var(--pct) * 3.02) 999; opacity:.6 }
  }
  `;
}
