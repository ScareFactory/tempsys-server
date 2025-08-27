// src/components/MyZeitkonto.js
// Seite "Zeitkonto": zeigt Über-/Minusstunden für den gewählten Monat sowie Resturlaub.
// Verwendet: 
//  - GET /api/working-hours/my-target  → { mode, weeklyTargetMinutes }  (Minuten/Woche; uniform oder pro Mitarbeiter)
//  - GET /api/users/:userId/times?from=YYYY-MM-DD&to=YYYY-MM-DD → [{start,end},…]
//  - GET /api/vacation-policy/mine → { remainingDays, myAllowance, vacationEnabled }

import React, { useContext, useEffect, useMemo, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import Card from "./ui/Card";
import Button from "./ui/Button";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaUmbrellaBeach } from "react-icons/fa";

// ----- Helpers -----
function iso(d){ return new Date(d).toISOString().slice(0,10); }
function toMonthStr(date){ const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,"0"); return `${y}-${m}`; }
function rangeFromMonth(ym){ const [y,m]=ym.split("-").map(Number); return { from: iso(new Date(y,m-1,1)), to: iso(new Date(y,m,0)) }; }
function parseHHMM(s){ if(!s) return null; const [h,m]=s.split(":").map(Number); if(isNaN(h)||isNaN(m)) return null; return h*60+m; }
function diffMin(start,end){ const a=parseHHMM(start), b=parseHHMM(end); if(a==null||b==null) return 0; let d=b-a; if(d<0) d+=1440; return d; }
function fmtH(min){ const sign=min<0?"-":""; const abs=Math.abs(min); const h=Math.floor(abs/60); const m=abs%60; return `${sign}${h}h ${String(m).padStart(2,"0")}m`; }
// Zählt Mo–Fr im Monat (YYYY-MM)
function countWeekdaysInMonth(monthStr){
  const [Y, M] = monthStr.split("-").map(Number);
  const days = new Date(Y, M, 0).getDate();
  let cnt = 0;
  for (let d = 1; d <= days; d++){
    const wd = new Date(Y, M-1, d).getDay(); // 0=So ... 6=Sa
    if (wd >= 1 && wd <= 5) cnt++;
  }
  return cnt;
}

export default function MyZeitkonto(){
  const { token, userId, companyId } = useContext(AuthContext);
  const headers = useMemo(()=>({ Authorization:`Bearer ${token}` }), [token]);

  // --- Theme wie in AbsenceApproval/MyAbsences ---
  const t = {
    text: "#e6e8ee",
    textDim: "#b4b9c7",
    panel: "rgba(16,20,28,.55)",
    panelSoft: "rgba(27,33,48,.55)",
    border: "rgba(255,255,255,.14)",
    borderSoft: "rgba(255,255,255,.10)",
    accent: "rgba(224,49,49,1)",
    success: "#0c7a43",
    danger: "#7a1c1c",
  };

  // Zeitraum (Monat)
  const [month, setMonth] = useState(()=>toMonthStr(new Date()));
  const [{from,to}, setRange] = useState(()=>rangeFromMonth(toMonthStr(new Date())));
  useEffect(()=>{ setRange(rangeFromMonth(month)); }, [month]);

  // Datenzustände
  const [loading, setLoading] = useState(true);
  const [actualMin, setActualMin] = useState(0);
  const [targetMin, setTargetMin] = useState(0);

  const [vacLoading, setVacLoading] = useState(true);
  const [vac, setVac] = useState({ remainingDays: 0, myAllowance: 0, vacationEnabled: false });

  // ---- Loader: Monats-Soll aus Wochen-Soll (Mo–Fr) ----
  async function loadTargetMinutes(){
    const r = await fetch(`/api/working-hours/my-target`, { headers });
    if(!r.ok) throw new Error(`target ${r.status}`);
    const j = await r.json();

    const weekly = Number(j.weeklyTargetMinutes || 0); // Minuten pro Woche (z.B. 2400 = 40h)
    if (weekly <= 0) return 0;

    // Wochen-Soll wird auf 5 Werktage verteilt; Monats-Soll = pro-Workday * (Workdays in Month)
    const perWorkday = weekly / 5;
    const workdaysInMonth = countWeekdaysInMonth(month);
    return Math.round(perWorkday * workdaysInMonth);
  }

  // ---- Loader: Ist-Minuten im Monat aus Work Times ----
  async function loadActualMinutes(){
    const qs = new URLSearchParams({ from, to });
    const r = await fetch(`/api/users/${userId}/times?${qs}`, { headers });
    if(!r.ok) throw new Error(`times ${r.status}`);
    const rows = await r.json();
    let sum = 0;
    for (const w of rows) sum += diffMin(w.start, w.end);
    return sum;
  }

  // ---- Urlaub (Resttage) ----
  async function loadVacation(){
    setVacLoading(true);
    try{
      const r = await fetch(`/api/vacation-policy/mine`, { headers });
      if(!r.ok) throw new Error(`vac ${r.status}`);
      const j = await r.json();
      setVac({
        remainingDays: Number(j.remainingDays || 0),
        myAllowance: Number(j.myAllowance || 0),
        vacationEnabled: !!j.vacationEnabled
      });
    }catch(e){
      console.error("Vacation load error:", e);
      setVac({ remainingDays: 0, myAllowance: 0, vacationEnabled: false });
    }finally{
      setVacLoading(false);
    }
  }

  async function loadAll(){
    if(!userId || !companyId) return;
    setLoading(true);
    try{
      const [act, tgt] = await Promise.all([loadActualMinutes(), loadTargetMinutes()]);
      setActualMin(act);
      setTargetMin(tgt);
    }catch(e){
      console.error("Zeitkonto laden fehlgeschlagen:", e);
      setActualMin(0);
      setTargetMin(0);
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ loadAll(); loadVacation(); /* eslint-disable-next-line */ }, [userId, companyId, token, from, to]);

  const goPrev = ()=>{ const [y,m]=month.split("-").map(Number); setMonth(toMonthStr(new Date(y,m-2,1))); };
  const goNext = ()=>{ const [y,m]=month.split("-").map(Number); setMonth(toMonthStr(new Date(y,m,1))); };

  const diff = actualMin - targetMin;
  const isOver = diff >= 0;

  // --- UI Helpers ---
  const Section = ({ title, children, right }) => (
    <div
      style={{
        border: `1px solid ${t.border}`,
        borderRadius: 14,
        padding: 18,
        background: t.panel,
        backdropFilter: "blur(10px) saturate(140%)",
        WebkitBackdropFilter: "blur(10px) saturate(140%)",
        boxShadow: "0 8px 18px rgba(0,0,0,.25)",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        color: t.text,
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <h3 style={{ margin:0, fontSize:"1.05rem", color:t.text }}>{title}</h3>
        {right}
      </div>
      <div>{children}</div>
    </div>
  );

  const pill = (text, tone) => (
    <span style={{
      borderRadius: 999,
      padding: "4px 10px",
      fontSize: 13,
      border: "1px solid rgba(255,255,255,.15)",
      background: tone === "ok" ? "rgba(16,185,129,.18)" :
                 tone === "warn" ? "rgba(245,158,11,.18)" :
                 tone === "bad" ? "rgba(239,68,68,.18)" : t.panelSoft,
      color: t.text
    }}>{text}</span>
  );

  return (
    <Card>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
          <h2 style={{ margin:0, color:t.text, display:"flex", alignItems:"center", gap:8 }}>
            <FaCalendarAlt/> Zeitkonto
          </h2>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <Button variant="secondary" onClick={goPrev} title="Voriger Monat"><FaChevronLeft/></Button>
            <input
              type="month"
              value={month}
              onChange={(e)=>setMonth(e.target.value)}
              style={{ background:"#fff", border:"1px solid #ccc", borderRadius:8, padding:"8px 10px" }}
            />
            <Button variant="secondary" onClick={goNext} title="Nächster Monat"><FaChevronRight/></Button>
          </div>
        </div>
        <div/>
      </div>

      {/* Inhalt */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:22, alignItems:"start" }}>
        <Section
          title="Arbeitszeit (Monat)"
          right={
            <div style={{ display:"flex", gap:8 }}>
              {pill(`Soll: ${fmtH(targetMin)}`, "ok")}
              {pill(`Ist: ${fmtH(actualMin)}`, "ok")}
            </div>
          }
        >
          {loading ? (
            <div style={{ opacity:.7, color:t.textDim }}>Lade …</div>
          ) : (
            <div style={{ display:"grid", gap:10 }}>
              <div style={{ fontSize:28, fontWeight:700, color:isOver ? t.success : t.accent }}>
                {isOver ? "Überstunden" : "Minusstunden"}: {fmtH(diff)}
              </div>
              <div style={{ color:t.textDim, fontSize:13 }}>
                * Ist-Zeit basiert auf abgeschlossenen Stempelungen im ausgewählten Zeitraum (Monat).
              </div>
            </div>
          )}
        </Section>

        <Section title="Urlaub">
          {vacLoading ? (
            <div style={{ opacity:.7, color:t.textDim }}>Lade …</div>
          ) : (
            <div style={{ display:"grid", gap:12 }}>
              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                {pill(`Resturlaub: ${vac.remainingDays} Tag(e)`, vac.remainingDays > 0 ? "ok" : "warn")}
                {pill(`Jahresanspruch: ${vac.myAllowance} Tag(e)`, "ok")}
                {!vac.vacationEnabled && (
                  pill("Urlaub deaktiviert (nur Wunschfrei möglich)", "warn")
                )}
              </div>
              <div style={{ color:t.textDim, fontSize:13, display:"flex", alignItems:"center", gap:8 }}>
                <FaUmbrellaBeach/> Stand bezieht sich auf das laufende Jahr.
              </div>
            </div>
          )}
        </Section>
      </div>
    </Card>
  );
}
