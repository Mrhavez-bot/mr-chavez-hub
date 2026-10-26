import { useEffect, useState } from "react";
import { fillDocx } from "../lib/planners/fillDocx";
import {
  KEY_CONCEPTS, RELATED_BY_PHASE, GLOBAL_CONTEXTS,
  weeksBetween, shortDate, dayName, mondayOf, longDate, build10thData
} from "../lib/planners/plannerData";
import { saveDraft, loadDraft, clearDraft } from "../lib/draftStorage";
import PlannerPOP from "./PlannerPOP";

const EMPTY_DAY = { topic: "", objective: "", opening: "", ts: "", le: "", closing: "" };

const emptyPlan = () => ({
  teacher: "Mario Chavez Calderon", date: "", subjectGroup: "Language Acquisition", subject: "English",
  period: "", gradeGroup: "10th", mypYear: "5", minutes: 50, duration: "", unitTitle: "",
  objA: "", objB: "", objC: "", objD: "",
  keyConcept: "", phase: "3–4", relatedConcepts: [], otherRelated: "", globalContext: "", exploration: "",
  soi: "", iqFactual: "", iqConceptual: "", iqDebatable: "",
  specificObjectives: "", summative: "", atl: "",
  compGen: "", compBasica: "", compExtendida: "", reflectionPrior: "",
  start: "", end: "", days: {}, weekTopics: {},
  formative: "", differentiation: "", resources: "", reflDuring: "", reflAfter: ""
});

function Field({ label, children }) {
  return <div><label className="flabel">{label}</label>{children}</div>;
}

function Planner10() {
  const [plan, setPlan] = useState(() => ({ ...emptyPlan(), ...(loadDraft("planner:10th") || {}) }));
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { saveDraft("planner:10th", plan); }, [plan]);

  const set = (k, v) => setPlan((p) => ({ ...p, [k]: v }));
  const T = (k, label, rows = 2) => (
    <Field label={label}><textarea rows={rows} value={plan[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  );
  const I = (k, label, type = "text") => (
    <Field label={label}><input type={type} value={plan[k]} onChange={(e) => set(k, e.target.value)} /></Field>
  );

  function toggleRelated(c) {
    set("relatedConcepts", plan.relatedConcepts.includes(c) ? plan.relatedConcepts.filter((x) => x !== c) : [...plan.relatedConcepts, c]);
  }
  function toggleDay(d) {
    setPlan((p) => {
      const days = { ...p.days };
      if (days[d]) delete days[d]; else days[d] = { ...EMPTY_DAY };
      return { ...p, days };
    });
  }
  function setDay(d, k, v) {
    setPlan((p) => ({ ...p, days: { ...p.days, [d]: { ...p.days[d], [k]: v } } }));
  }
  function reset() {
    if (!confirm("¿Empezar un plan nuevo? Se borra lo que hay en pantalla.")) return;
    clearDraft("planner:10th");
    setPlan(emptyPlan());
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
      const res = await fetch("/templates/planner_10th.docx");
      if (!res.ok) throw new Error("No se encontró la plantilla planner_10th.docx en el sitio.");
      const blob = await fillDocx(await res.arrayBuffer(), build10thData(plan));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `Planner_10th_${plan.unitTitle.replace(/[^\w]+/g, "_").slice(0, 40)}.docx`;
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
          {I("teacher", "Teacher’s name")}
          {I("date", "Date (ej. October, 2026)")}
          {I("period", "Period (ej. 2 (Oct 5 – Oct 30))")}
          {I("gradeGroup", "Grade and group(s)")}
          {I("mypYear", "MYP year")}
          {I("minutes", "Minutos por sesión", "number")}
          {I("unitTitle", "Unit title")}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>2. Objetivos</b>
        {T("objA", "A. Analyzing")}
        {T("objB", "B. Comprehending spoken and visual text")}
        {T("objC", "C. Communicating in response to spoken, written, and visual text")}
        {T("objD", "D. Using language in spoken and written form")}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>3. Conceptos y contexto global</b>
        <div className="fgrid" style={{ marginTop: 8 }}>
          <Field label="Key concept">
            <select value={plan.keyConcept} onChange={(e) => set("keyConcept", e.target.value)}>
              <option value="">Selecciona…</option>
              {KEY_CONCEPTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Fase de lengua (lista de conceptos relacionados)">
            <select value={plan.phase} onChange={(e) => set("phase", e.target.value)}>
              {Object.keys(RELATED_BY_PHASE).map((p) => <option key={p} value={p}>Phases {p}</option>)}
            </select>
          </Field>
        </div>
        <label className="flabel">Related concept(s)</label>
        <div className="chips">
          {RELATED_BY_PHASE[plan.phase].map((c) => (
            <button key={c} type="button" className={plan.relatedConcepts.includes(c) ? "on" : ""} onClick={() => toggleRelated(c)}>{c}</button>
          ))}
        </div>
        <Field label="Otro concepto relacionado (opcional)"><input value={plan.otherRelated} onChange={(e) => set("otherRelated", e.target.value)} /></Field>
        <div className="fgrid" style={{ marginTop: 10 }}>
          <Field label="Global context">
            <select value={plan.globalContext} onChange={(e) => setPlan((p) => ({ ...p, globalContext: e.target.value, exploration: "" }))}>
              <option value="">Selecciona…</option>
              {Object.keys(GLOBAL_CONTEXTS).map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Exploration">
            <select value={plan.exploration} disabled={!plan.globalContext} onChange={(e) => set("exploration", e.target.value)}>
              <option value="">{plan.globalContext ? "Selecciona…" : "Primero elige el contexto"}</option>
              {(GLOBAL_CONTEXTS[plan.globalContext] || []).map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>4. Statement of inquiry y preguntas</b>
        {T("soi", "Statement of inquiry", 3)}
        {T("iqFactual", "Inquiry question: Factual")}
        {T("iqConceptual", "Inquiry question: Conceptual")}
        {T("iqDebatable", "Inquiry question: Debatable")}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>5. Evaluación, enfoques y competencias</b>
        {T("specificObjectives", "Specific objectives (criterions)")}
        {T("summative", "Summative assessment (ej. Project: School Tour Video)")}
        {T("atl", "Approaches to learning", 4)}
        {T("compGen", "Competencias genéricas")}
        {T("compBasica", "Competencias disciplinar básica")}
        {T("compExtendida", "Competencias disciplinar extendida")}
        {T("reflectionPrior", "Reflection prior to teaching the unit", 3)}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <b>6. Calendario de clases</b>
        <div className="fgrid" style={{ marginTop: 8 }}>
          {I("start", "Inicio de la unidad", "date")}
          {I("end", "Fin de la unidad", "date")}
        </div>
        {!weeks.length && <div className="muted">Elige la fecha de inicio y de fin para ver el calendario.</div>}
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
          <b>Week {wi + 1}: {longDate(mon)}</b>
          <Field label="Topic of the week">
            <textarea rows={2} value={plan.weekTopics[mon] || ""} onChange={(e) => setPlan((p) => ({ ...p, weekTopics: { ...p.weekTopics, [mon]: e.target.value } }))} />
          </Field>
          {byWeek[mon].map((d) => {
            sessionNo += 1;
            const s = plan.days[d];
            return (
              <div className="section" key={d}>
                <b>Session {sessionNo} · {dayName(d)}, {shortDate(d)}</b>
                <Field label="Tema del día (la IA lo usará para completar la sesión)"><input value={s.topic} onChange={(e) => setDay(d, "topic", e.target.value)} /></Field>
                <Field label="Objective"><textarea value={s.objective} onChange={(e) => setDay(d, "objective", e.target.value)} /></Field>
                <Field label="Opening"><textarea value={s.opening} onChange={(e) => setDay(d, "opening", e.target.value)} /></Field>
                <Field label="TS (teacher’s strategy)"><textarea value={s.ts} onChange={(e) => setDay(d, "ts", e.target.value)} /></Field>
                <Field label="LE (learning experience)"><textarea value={s.le} onChange={(e) => setDay(d, "le", e.target.value)} /></Field>
                <Field label="Closing"><textarea value={s.closing} onChange={(e) => setDay(d, "closing", e.target.value)} /></Field>
              </div>
            );
          })}
        </div>
      ))}

      <div className="card" style={{ marginBottom: 12 }}>
        <b>7. Cierre del planificador</b>
        {T("formative", "Formative assessment", 3)}
        {T("differentiation", "Differentiation")}
        {T("resources", "Resources (uno por línea)", 3)}
        {T("reflDuring", "Reflection: during teaching")}
        {T("reflAfter", "Reflection: after teaching the unit")}
      </div>

      <div className="row">
        <button className="primary" disabled={busy} onClick={download}>{busy ? "Generando…" : "⬇ Descargar Word"}</button>
      </div>
    </div>
  );
}

export default function Planners() {
  const [grade, setGrade] = useState("10th");
  return (
    <div>
      <h2>Planners</h2>
      <div className="tabs2">
        {["10th", "11th", "12th"].map((g) => (
          <button key={g} className={grade === g ? "active" : ""} onClick={() => setGrade(g)}>{g} grade</button>
        ))}
      </div>
      {grade === "10th" ? <Planner10 /> : <PlannerPOP key={grade} grade={grade} />}
    </div>
  );
}
