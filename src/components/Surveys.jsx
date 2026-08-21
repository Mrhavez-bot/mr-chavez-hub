import { useState } from "react";
import { useData } from "../context/DataContext";
import { surveysApi } from "../lib/api";
import { GROUPS } from "../lib/constants";
import BarChart from "./BarChart";

function resultsFor(survey, surveyVotes) {
  const votes = surveyVotes.filter((v) => v.survey_id === survey.id);
  return survey.options.map((opt, i) => [opt, votes.filter((v) => v.option_index === i).length]);
}

export default function Surveys({ mode = "teacher", myStudentId, myGroup }) {
  const { surveys, surveyVotes, reload } = useData();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [groups, setGroups] = useState([]);

  function toggleGroup(g) { setGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g])); }
  function setOption(i, val) { setOptions((o) => o.map((x, idx) => (idx === i ? val : x))); }
  function addOption() { setOptions((o) => [...o, ""]); }
  function removeOption(i) { setOptions((o) => o.filter((_, idx) => idx !== i)); }

  async function create() {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) { alert("Escribe la pregunta."); return; }
    if (cleanOptions.length < 2) { alert("Agrega al menos 2 opciones."); return; }
    if (!groups.length) { alert("Selecciona al menos un grupo."); return; }
    await surveysApi.create(question.trim(), cleanOptions, groups);
    setQuestion(""); setOptions(["", ""]); setGroups([]);
    reload();
  }
  async function toggleActive(s) { await surveysApi.update(s.id, { active: !s.active }); reload(); }
  async function remove(id) {
    if (!confirm("¿Eliminar esta encuesta y sus votos?")) return;
    await surveysApi.remove(id);
    reload();
  }
  async function vote(surveyId, idx) {
    try {
      await surveysApi.castVote(surveyId, idx);
      reload();
    } catch (e) {
      alert(e.message);
    }
  }

  if (mode === "student") {
    const visible = surveys.filter((s) => s.active && s.groups.includes(myGroup));
    return (
      <div>
        <h2>Surveys</h2>
        {visible.length ? visible.map((s) => {
          const myVote = surveyVotes.find((v) => v.survey_id === s.id && v.student_id === myStudentId);
          const results = resultsFor(s, surveyVotes);
          return (
            <div className="card" key={s.id} style={{ marginBottom: 12 }}>
              <div className="name">{s.question}</div>
              {myVote ? (
                <>
                  <div className="muted" style={{ marginTop: 6 }}>Ya votaste — gracias.</div>
                  <div style={{ marginTop: 10 }}><BarChart pairs={results} maxVal={Math.max(1, ...results.map((p) => p[1]))} /></div>
                </>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {s.options.map((opt, i) => (
                    <button key={i} className="teal" style={{ width: "100%" }} onClick={() => vote(s.id, i)}>{opt}</button>
                  ))}
                </div>
              )}
            </div>
          );
        }) : <div className="empty"><h3>No hay encuestas activas por ahora</h3></div>}
      </div>
    );
  }

  return (
    <div>
      <h2>Surveys</h2>
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="flabel">Pregunta</label>
        <input value={question} onChange={(e) => setQuestion(e.target.value)} />
        <label className="flabel" style={{ marginTop: 10 }}>Opciones</label>
        {options.map((o, i) => (
          <div className="row" key={i}>
            <input value={o} onChange={(e) => setOption(i, e.target.value)} placeholder={`Opción ${i + 1}`} />
            {options.length > 2 && <button className="danger" onClick={() => removeOption(i)}>✕</button>}
          </div>
        ))}
        <button className="ghost" onClick={addOption}>＋ Agregar opción</button>
        <label className="flabel" style={{ marginTop: 10 }}>¿A qué grupos les aparece?</label>
        <div className="row" style={{ marginTop: 6 }}>
          {GROUPS.map((g) => (
            <button key={g} type="button" className={groups.includes(g) ? "teal" : "ghost"} onClick={() => toggleGroup(g)}>{g}</button>
          ))}
        </div>
        <div style={{ marginTop: 12 }}><button className="primary" onClick={create}>＋ Crear encuesta</button></div>
      </div>
      {surveys.length ? surveys.map((s) => {
        const results = resultsFor(s, surveyVotes);
        return (
          <div className="card" key={s.id} style={{ marginBottom: 12, opacity: s.active ? 1 : 0.6 }}>
            <div className="row" style={{ marginBottom: 0 }}>
              <div style={{ flex: 1 }}>
                <div className="name">{s.question}{!s.active && " (cerrada)"}</div>
                <div className="muted">{s.groups.join(", ")}</div>
              </div>
              <button className="ghost" onClick={() => toggleActive(s)}>{s.active ? "Cerrar" : "Reabrir"}</button>
              <button className="danger" onClick={() => remove(s.id)}>Eliminar</button>
            </div>
            <div style={{ marginTop: 10 }}><BarChart pairs={results} maxVal={Math.max(1, ...results.map((p) => p[1]))} /></div>
          </div>
        );
      }) : <div className="empty"><h3>No hay encuestas todavía</h3></div>}
    </div>
  );
}
