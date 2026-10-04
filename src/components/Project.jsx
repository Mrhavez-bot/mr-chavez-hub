import { useEffect, useRef, useState } from "react";
import { useData } from "../context/DataContext";
import { projectsApi } from "../lib/api";
import { projectForGroupPeriod } from "../lib/calc";
import { saveDraft, loadDraft, clearDraft } from "../lib/draftStorage";
import GroupPeriodPicker from "./GroupPeriodPicker";

function round1(n) { return Math.round(n * 10) / 10; }

export default function Project({ ui, setUi }) {
  const data = useData();
  const { students, projects, criteria, projectResults, refreshProjects } = data;
  const [projName, setProjName] = useState("");
  const [critName, setCritName] = useState("");
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const proj = projectForGroupPeriod(projects, g, p);
  const projCriteria = proj ? criteria.filter((c) => c.project_id === proj.id) : [];
  const draftKey = `project:${g}:${p}`;

  // pending[studentId][criterionId] = value (1-5) or "" for not graded
  const [pending, setPending] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  // What's actually saved right now — used at save time so we only send
  // cells that truly changed, instead of one request per untouched cell.
  const baselineRef = useRef({});

  useEffect(() => {
    const baseline = {};
    list.forEach((s) => {
      baseline[s.id] = {};
      projCriteria.forEach((c) => {
        const r = projectResults.find((x) => x.project_id === proj?.id && x.student_id === s.id && x.criterion_id === c.id);
        baseline[s.id][c.id] = r ? r.value : "";
      });
    });
    baselineRef.current = baseline;
    const draft = loadDraft(draftKey);
    if (draft) {
      const merged = {};
      list.forEach((s) => { merged[s.id] = { ...baseline[s.id], ...(draft[s.id] || {}) }; });
      setPending(merged);
      setDirty(true);
      setMsg({ type: "warn", text: "Se recuperó un borrador sin guardar de esta sesión anterior." });
    } else {
      setPending(baseline);
      setDirty(false);
      setMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, p, proj?.id, projCriteria.length, projectResults, students]);

  useEffect(() => {
    function handler(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function createProject() {
    if (!projName.trim()) { alert("Enter a project name."); return; }
    await projectsApi.create(projName.trim(), g, p);
    setProjName("");
    refreshProjects();
  }
  async function removeProject(id) {
    if (!confirm("Delete this project, its criteria and all scores? This cannot be undone.")) return;
    await projectsApi.remove(id);
    refreshProjects();
  }
  async function addCriterion(pid) {
    if (!critName.trim()) { alert("Enter a criterion name."); return; }
    if (dirty && !confirm("Tienes cambios sin guardar. ¿Agregar el criterio de todos modos? (tus cambios actuales se perderán)")) return;
    await projectsApi.addCriterion(pid, critName.trim());
    setCritName("");
    refreshProjects();
  }
  async function renameCriterion(c) {
    const n = prompt("Criterion name:", c.name);
    if (n === null) return;
    if (!n.trim()) { alert("Name cannot be empty."); return; }
    await projectsApi.renameCriterion(c.id, n.trim());
    refreshProjects();
  }
  async function removeCriterion(id) {
    if (!confirm("Delete this criterion and its scores?")) return;
    await projectsApi.removeCriterion(id);
    refreshProjects();
  }
  function setLocal(studentId, criterionId, value) {
    setPending((prev) => {
      const next = { ...prev, [studentId]: { ...prev[studentId], [criterionId]: value } };
      saveDraft(draftKey, next);
      return next;
    });
    setDirty(true);
  }
  function liveFinalScore(studentId) {
    const map = pending[studentId] || {};
    const graded = projCriteria.filter((c) => map[c.id] !== "" && map[c.id] != null);
    if (!graded.length) return null;
    const total = graded.reduce((a, c) => a + Number(map[c.id]), 0);
    return round1((total / (graded.length * 5)) * 100);
  }
  async function save() {
    setSaving(true);
    setMsg(null);
    const rows = [];
    Object.entries(pending).forEach(([studentId, byCrit]) => {
      Object.entries(byCrit).forEach(([criterionId, value]) => {
        const before = (baselineRef.current[studentId] || {})[criterionId] ?? "";
        if (value !== before) rows.push({ project_id: proj.id, student_id: studentId, criterion_id: criterionId, value: value === "" ? null : value });
      });
    });
    if (!rows.length) {
      clearDraft(draftKey);
      setMsg({ type: "ok", text: "No había cambios nuevos que guardar." });
      setDirty(false);
      setSaving(false);
      return;
    }
    try {
      await projectsApi.bulkSetResults(rows);
      clearDraft(draftKey);
      setMsg({ type: "ok", text: "Calificaciones del proyecto guardadas." });
      setDirty(false);
      refreshProjects();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setSaving(false);
  }

  return (
    <div>
      <h2>Project</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="formula">Final Project Score = (sum of graded criteria ÷ (graded criteria × 5)) × 100. A student with no criteria graded shows as Missing, never 0.</div>
      {!proj ? (
        <>
          <div className="empty"><h3>No project for {g} · {p}</h3>Create one below. Grades will use the 30/30/40 formula until a project exists here.</div>
          <div className="row">
            <input placeholder="Project name (e.g. Environmental Campaign)" value={projName} onChange={(e) => setProjName(e.target.value)} />
            <button className="primary" onClick={createProject}>＋ Create project</button>
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <div className="row" style={{ marginBottom: 0 }}>
              <div className="name" style={{ flex: 2 }}>{proj.name}</div>
              <button className="danger" onClick={() => removeProject(proj.id)}>Delete project</button>
            </div>
            <div className="section">
              <b>Criteria (graded 1–5)</b>
              {projCriteria.length ? projCriteria.map((c) => (
                <div className="crit" key={c.id}>
                  <span>{c.name}</span>
                  <div><button className="ghost" onClick={() => renameCriterion(c)}>✎</button> <button className="danger" onClick={() => removeCriterion(c.id)}>✕</button></div>
                </div>
              )) : <div className="muted">No criteria yet.</div>}
              <div className="row" style={{ marginTop: 10 }}>
                <input placeholder="New criterion (e.g. Content)" value={critName} onChange={(e) => setCritName(e.target.value)} />
                <button className="teal" onClick={() => addCriterion(proj.id)}>＋ Add criterion</button>
              </div>
            </div>
          </div>
          {!!projCriteria.length && !!list.length && (
            <div className="section">
              <div className="row">
                <b style={{ flex: 1 }}>Scores — max {projCriteria.length * 5} pts ({projCriteria.length} criteria × 5)</b>
                <button className="primary" disabled={!dirty || saving} onClick={save}>
                  {saving ? "Guardando…" : "💾 Guardar calificaciones"}
                </button>
              </div>
              {dirty && <div className="banner warn">Tienes cambios sin guardar en esta pantalla.</div>}
              {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
              <div style={{ overflowX: "auto" }}>
                <table>
                  <tbody>
                    <tr><th className="stickyCol">Student</th>{projCriteria.map((c) => <th key={c.id}>{c.name}</th>)}<th>Final Score</th></tr>
                    {list.map((s) => (
                      <tr key={s.id}>
                        <td className="stickyCol">{s.name}</td>
                        {projCriteria.map((c) => (
                          <td key={c.id}>
                            <select
                              style={{ maxWidth: 70 }}
                              value={(pending[s.id] && pending[s.id][c.id]) ?? ""}
                              onChange={(e) => setLocal(s.id, c.id, e.target.value)}
                            >
                              <option value="">—</option>
                              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                        ))}
                        <td><b>{liveFinalScore(s.id) == null ? "Missing" : liveFinalScore(s.id) + "%"}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
