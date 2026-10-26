import { useEffect, useState } from "react";
import { fillDocx } from "../lib/planners/fillDocx";
import {
  weeksBetween, shortDate, dayName, mondayOf, longDate, buildPopData,
  LEARNER_ATTRS, ATL_GROUPS, COMP_GEN, COMP_DISC, WEEK_FIELDS
} from "../lib/planners/plannerData";
import { saveDraft, loadDraft, clearDraft } from "../lib/draftStorage";

const EMPTY_DAY = { topic: "", name: "", objective: "", dev: "" };

const emptyPlan = (grade) => ({
  grade, subject: "English Language Acquisition", teacher: "Mario Chavez Calderon", groups: "", period: "", elabDate: "",
  unitTitle: "", purpose: "", centralIdea: "",
  compGen: [], compGenOther: "", compDisc: [], compDiscOther: "",
  attrs: {}, atl: {}, reflInitial: "", reflMid: "", reflFinal: "",
  start: "", end: "", days: {}, weekFields: {},
  summative: "", linkLang: "", linkHPP: "", linkAS: "", linkOther: ""
});

function Field({ label, children }) {
  return <div><label className="flabel">{label}</label>{children}</div>;
}

export default function PlannerPOP({ grade }) {
  const key = `planner:${grade}`;
  const [plan, setPlan] = useState(() => ({ ...emptyPlan(grade), ...(loadDraft(key) || {}), grade }));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { saveDraft(key, plan); }, [plan, key]);

  const set = (k, v) => setPlan((p) => ({ ...p, [k]: v }));
  const T = (k, label, rows = 2) => (
    <Field label={label}><textarea rows={rows} value={plan[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  );
  const I = (k, label, type = "text") => (
    <Field label={label}><input type={type} value={plan[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  );
  const toggleIn = (k, v) => set(k, plan[k].includes(v) ? plan[k].filter((x) => x !== v) : [...plan[k], v]);
  const setMap = (k, sub, v) => setPlan((p) => ({ ...p, [k]: { ...p[k], [sub]: v } }));
  const setWeek = (mon, k, v) => setPlan((p) => ({ ...p, weekFields: { ...p.weekFields, [mon]: { ...(p.weekFields[mon] || {}), [k]: v } } }));
  const toggleDay = (d) => setPlan((p) => {
    const days = { ...p.days };
    if (days[d]) delete days[d]; else days[d] = { ...EMPTY_DAY };
    return { ...p, days };
  });
  const setDay = (d, k, v) => setPlan((p) => ({ ...p, days: { ...p.days, [d]: { ...p.days[d], [k]: v } } }));

  function reset() {
    if (!confirm("¿Empezar un plan nuevo? Se borra lo que hay en pantalla.")) return;
    clearDraft(key);
    setPlan(emptyPlan(grade));
    setMsg(null);
  }

  const weeks = weeksBetween(plan.start, plan.end);
  const dates = Object.keys(plan.days).sort();
  const byWeek = {};
  dates.forEach((d) => { const m = mondayOf(d); (byWeek[m] = byWeek[m] || []).push(d); });
  let sessionNo = 0;

  async function download() {
    setBusy(true); setMsg(null);
    try {
      if (!plan.unitTitle.trim()) throw new Error("Escribe el título de la unidad.");
      if (!dates.length) throw new Error("Selecciona al menos un día de clase en el calendario.");
      const res = await fetch(`/templates/planner_${grade}.docx`);
      if (!res.ok) throw new Error(`No se encontró la plantilla planner_${grade}.docx en el sitio.`);
      const blob = await fillDocx(await res.arrayBuffer(), buildPopData(plan));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Planner_${grade}_${plan.unitTitle.replace(/[^\w]+/g, "_").slice(0, 40)}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
      setMsg({ type: "ok", text: "Documento descargado." });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="row">
        <button className="primary" disabled={busy} onClick={download}>{busy ? "Generando…" : "⬇ Descargar Word"}</button>
        <button className="ghost" onClick={reset}>Nuevo plan</button>
        <span className="small">Tu avance se guarda solo en este navegador.</span>
      </div>
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <b>1. Datos de la unidad</b>
        <div className="fgrid" style={{ marginTop: 8 }}>
          {I("subject", "Asignatura")}
          {I("teacher", "Nombre del docente")}
          {I("groups", "Grupo(s)")}
          {I("period", "Periodo")}
          {I("elabDate", "Fecha de elaboración (ej. Sep 2026)")}
          {I("unitTitle", "Título de la unidad")}
        </div>
        {T("purpose", "Propósito de la unidad", 3)}
        {T("centralIdea", "Idea central", 3)}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>2. Competencias</b>
        <label className="flabel" style={{ marginTop: 8 }}>Competencias genéricas</label>
        <div className="chips" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {COMP_GEN.map((c) => (
            <button key={c} type="button" style={{ textAlign: "left", borderRadius: 10 }} className={plan.compGen.includes(c) ? "on" : ""} onClick={() => toggleIn("compGen", c)}>{c}</button>
          ))}
        </div>
        {T("compGenOther", "Otra competencia genérica (opcional)")}
        <label className="flabel" style={{ marginTop: 8 }}>Competencias disciplinares básicas / extendidas</label>
        <div className="chips" style={{ flexDirection: "column", alignItems: "stretch" }}>
          {COMP_DISC.map((c) => (
            <button key={c} type="button" style={{ textAlign: "left", borderRadius: 10 }} className={plan.compDisc.includes(c) ? "on" : ""} onClick={() => toggleIn("compDisc", c)}>{c}</button>
          ))}
        </div>
        {T("compDiscOther", "Otra competencia disciplinar (opcional)")}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>3. Atributos del perfil de la comunidad IB</b>
        <div className="small">Escribe cómo se desarrollará solo en los atributos que trabajarás.</div>
        {LEARNER_ATTRS.map(([k, label]) => (
          <Field key={k} label={label}><input value={plan.attrs[k] || ""} onChange={(e) => setMap("attrs", k, e.target.value)} /></Field>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>4. Enfoques del aprendizaje</b>
        <div className="small">Escribe cómo se logrará solo en los indicadores que trabajarás.</div>
        {ATL_GROUPS.map(([skill, items]) => (
          <div className="section" key={skill}>
            <b>{skill}</b>
            {items.map(([k, label]) => (
              <Field key={k} label={label}><input value={plan.atl[k] || ""} onChange={(e) => setMap("atl", k, e.target.value)} /></Field>
            ))}
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>5. Reflexión inicial</b>
        {T("reflInitial", "Reflexión inicial", 3)}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>6. Calendario de clases</b>
        <div className="fgrid" style={{ marginTop: 8 }}>
          {I("start", "Fecha de inicio", "date")}
          {I("end", "Fecha de término", "date")}
        </div>
        {!weeks.length && <div className="muted">Elige la fecha de inicio y de término para ver el calendario.</div>}
        {weeks.map((w) => (
          <div className="calGrid" key={w.monday}>
            <span className="small">{longDate(w.monday)}</span>
            {w.days.map((d) => (
              <button key={d} type="button" className={plan.days[d] ? "on" : ""} disabled={d < plan.start || d > plan.end} onClick={() => toggleDay(d)}>
                {dayName(d)} {shortDate(d).split(" ")[1]}
              </button>
            ))}
          </div>
        ))}
        <div className="small">Días con clase: {dates.length}</div>
      </div>

      {Object.keys(byWeek).sort().map((mon, wi) => (
        <div className="card" style={{ marginBottom: 12 }} key={mon}>
          <b>Semana {wi + 1}: {longDate(mon)}</b>
          {WEEK_FIELDS.map(([k, label]) => (
            <Field key={k} label={label}>
              <textarea rows={2} value={(plan.weekFields[mon] || {})[k] || ""} onChange={(e) => setWeek(mon, k, e.target.value)} />
            </Field>
          ))}
          {byWeek[mon].map((d) => {
            sessionNo += 1;
            const s = plan.days[d];
            return (
              <div className="section" key={d}>
                <b>Sesión {sessionNo} · {dayName(d)}, {shortDate(d)}</b>
                <Field label="Tema del día (la IA lo usará para completar la sesión)"><input value={s.topic} onChange={(e) => setDay(d, "topic", e.target.value)} /></Field>
                <Field label="Nombre de la sesión"><input value={s.name} onChange={(e) => setDay(d, "name", e.target.value)} /></Field>
                <Field label="Objective"><textarea value={s.objective} onChange={(e) => setDay(d, "objective", e.target.value)} /></Field>
                <Field label="Desarrollo y duración (actividades con minutos)"><textarea rows={3} value={s.dev} onChange={(e) => setDay(d, "dev", e.target.value)} /></Field>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card" style={{ marginBottom: 12 }}>
        <b>7. Cierre del planificador</b>
        {T("reflMid", "Reflexión intermedia", 3)}
        {T("reflFinal", "Reflexión final", 3)}
        {T("summative", "Evaluación sumativa (porcentajes y criterios, uno por línea)", 5)}
        <div className="fgrid" style={{ marginTop: 8 }}>
          {T("linkLang", "Vínculo: Desarrollo de la Lengua y materias de DP", 3)}
          {T("linkHPP", "Vínculo: HPP", 3)}
          {T("linkAS", "Vínculo: AS", 3)}
          {T("linkOther", "Vínculo: Otros", 3)}
        </div>
      </div>

      <div className="row">
        <button className="primary" disabled={busy} onClick={download}>{busy ? "Generando…" : "⬇ Descargar Word"}</button>
      </div>
    </div>
  );
}
