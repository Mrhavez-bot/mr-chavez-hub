import { useEffect, useRef, useState } from "react";
import { useData } from "../context/DataContext";
import { projectsApi } from "../lib/api";
import { projectForGroupPeriod } from "../lib/calc";
import { saveDraft, loadDraft, clearDraft } from "../lib/draftStorage";
import GroupPeriodPicker from "./GroupPeriodPicker";
import RubricImport from "./RubricImport";
import RubricGrader from "./RubricGrader";
import { levelsOf, levelsText, rangeLabel } from "../lib/rubric";

const round1 = (n) => Math.round(n * 10) / 10;
const norm = (v) => (v === "" || v == null ? "" : Number(v));
const maxOf = (c) => Number(c.max_points ?? 5);

export default function Project({ ui, setUi }) {
  const data = useData();
  const { students, projects, criteria, projectResults, projectTeams, projectTeamMembers, projectTeamResults, refreshProjects } = data;
  const [projName, setProjName] = useState("");
  const [projMode, setProjMode] = useState("individual");
  const [critName, setCritName] = useState("");
  const [critMax, setCritMax] = useState("5");
  const [teamName, setTeamName] = useState("");
  const [showRubric, setShowRubric] = useState(false);
  const [viewPref, setViewPref] = useState(null);
  const [activeId, setActiveId] = useState("");
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const proj = projectForGroupPeriod(projects, g, p);
  const mode = proj?.mode || "individual";
  const projCriteria = proj ? criteria.filter((c) => c.project_id === proj.id) : [];
  const teams = proj ? projectTeams.filter((t) => t.project_id === proj.id) : [];
  const members = proj ? projectTeamMembers.filter((m) => m.project_id === proj.id) : [];
  const teamOf = {};
  members.forEach((m) => { teamOf[m.student_id] = m.team_id; });
  const nameOf = (id) => (students.find((s) => s.id === id) || {}).name;
  const rows = mode === "team"
    ? teams.map((t) => ({ id: t.id, label: t.name, sub: members.filter((m) => m.team_id === t.id).map((m) => nameOf(m.student_id)).filter(Boolean).join(", ") }))
    : list.map((s) => ({ id: s.id, label: s.name, sub: "" }));
  const draftKey = `project:${g}:${p}:${mode}`;

  // pending[rowId][criterionId] = points or "" (not graded). rowId = student id, or team id in team mode.
  const [pending, setPending] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const baselineRef = useRef({});

  useEffect(() => {
    const baseline = {};
    rows.forEach((r) => {
      baseline[r.id] = {};
      projCriteria.forEach((c) => {
        const res = mode === "team"
          ? projectTeamResults.find((x) => x.team_id === r.id && x.criterion_id === c.id)
          : projectResults.find((x) => x.project_id === proj?.id && x.student_id === r.id && x.criterion_id === c.id);
        baseline[r.id][c.id] = res ? Number(res.value) : "";
      });
    });
    baselineRef.current = baseline;
    const draft = loadDraft(draftKey);
    if (draft) {
      const merged = {};
      rows.forEach((r) => { merged[r.id] = { ...baseline[r.id], ...(draft[r.id] || {}) }; });
      setPending(merged);
      setDirty(true);
      setMsg({ type: "warn", text: "Se recuperó un borrador sin guardar de esta sesión anterior." });
    } else {
      setPending(baseline);
      setDirty(false);
      setMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, p, proj?.id, mode, projCriteria.length, teams.length, projectResults, projectTeamResults, projectTeamMembers, students]);

  useEffect(() => {
    function handler(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---------- project
  async function createProject() {
    if (!projName.trim()) { alert("Enter a project name."); return; }
    await projectsApi.create(projName.trim(), g, p, projMode);
    setProjName("");
    refreshProjects();
  }
  async function removeProject(id) {
    if (!confirm("Delete this project, its criteria, teams and all scores? This cannot be undone.")) return;
    await projectsApi.remove(id);
    refreshProjects();
  }
  async function changeMode(newMode) {
    if (newMode === mode) return;
    if (!confirm("Al cambiar el modo, las calificaciones capturadas en el modo anterior dejan de contar (no se borran). ¿Continuar?")) return;
    await projectsApi.update(proj.id, { mode: newMode });
    refreshProjects();
  }

  // ---------- criteria
  async function addCriterion() {
    const max = Number(critMax);
    if (!critName.trim()) { alert("Escribe el nombre del criterio."); return; }
    if (!(max > 0)) { alert("El valor del criterio debe ser mayor que 0."); return; }
    await projectsApi.addCriterion(proj.id, critName.trim(), max);
    setCritName("");
    refreshProjects();
  }
  async function saveCrit(c, fields) {
    if ("name" in fields && !fields.name.trim()) { alert("El nombre no puede estar vacío."); refreshProjects(); return; }
    if ("max_points" in fields && !(fields.max_points > 0)) { alert("El valor debe ser mayor que 0."); refreshProjects(); return; }
    if (("name" in fields && fields.name.trim() === c.name) || ("max_points" in fields && fields.max_points === maxOf(c))) return;
    await projectsApi.updateCriterion(c.id, "name" in fields ? { name: fields.name.trim() } : fields);
    refreshProjects();
  }
  async function removeCriterion(id) {
    if (!confirm("¿Borrar este criterio y sus calificaciones?")) return;
    await projectsApi.removeCriterion(id);
    refreshProjects();
  }
  async function applyRubric(items, replace) {
    if (replace) await Promise.all(projCriteria.map((c) => projectsApi.removeCriterion(c.id)));
    await projectsApi.addCriteria(items.map((c) => ({
      project_id: proj.id, name: c.name, max_points: Number(c.maxPoints),
      description: c.description || null, levels: c.levels && c.levels.length ? c.levels : null
    })));
    await refreshProjects();
    setShowRubric(false);
    setMsg({ type: "ok", text: `Se agregaron ${items.length} criterios a la rúbrica.` });
  }

  // ---------- teams
  async function addTeam() {
    if (!teamName.trim()) { alert("Escribe el nombre del equipo."); return; }
    await projectsApi.createTeams(proj.id, [teamName.trim()]);
    setTeamName("");
    refreshProjects();
  }
  async function renameTeam(t) {
    const n = prompt("Nombre del equipo:", t.name);
    if (n === null) return;
    if (!n.trim()) { alert("El nombre no puede estar vacío."); return; }
    await projectsApi.renameTeam(t.id, n.trim());
    refreshProjects();
  }
  async function removeTeam(t) {
    if (!confirm(`¿Borrar el equipo «${t.name}» y sus calificaciones? Sus integrantes quedan sin equipo.`)) return;
    await projectsApi.removeTeam(t.id);
    refreshProjects();
  }
  async function assign(studentId, teamId) {
    if (!teamId) await projectsApi.unassignMember(proj.id, studentId);
    else await projectsApi.assignMembers([{ project_id: proj.id, team_id: teamId, student_id: studentId }]);
    refreshProjects();
  }
  async function randomTeams() {
    const size = Number(prompt("¿Cuántos integrantes por equipo (aproximadamente)?", "4"));
    if (!(size >= 1)) return;
    if (teams.length && !confirm("Esto reemplaza los equipos actuales y sus calificaciones. ¿Continuar?")) return;
    if (!list.length) { alert("No hay alumnos en este grupo."); return; }
    await Promise.all(teams.map((t) => projectsApi.removeTeam(t.id)));
    const count = Math.ceil(list.length / size);
    const created = await projectsApi.createTeams(proj.id, Array.from({ length: count }, (_, i) => `Team ${i + 1}`));
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    await projectsApi.assignMembers(shuffled.map((s, i) => ({ project_id: proj.id, team_id: created[i % count].id, student_id: s.id })));
    refreshProjects();
  }

  // ---------- scoring
  function setLocal(rowId, criterionId, value) {
    setPending((prev) => {
      const next = { ...prev, [rowId]: { ...prev[rowId], [criterionId]: value } };
      saveDraft(draftKey, next);
      return next;
    });
    setDirty(true);
  }
  function liveFinalScore(rowId) {
    const map = pending[rowId] || {};
    const graded = projCriteria.filter((c) => map[c.id] !== "" && map[c.id] != null);
    if (!graded.length) return null;
    const total = graded.reduce((a, c) => a + Number(map[c.id]), 0);
    const max = graded.reduce((a, c) => a + maxOf(c), 0);
    return round1((total / max) * 100);
  }
  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const out = [];
      Object.entries(pending).forEach(([rowId, byCrit]) => {
        Object.entries(byCrit).forEach(([criterionId, value]) => {
          if (norm(value) === norm((baselineRef.current[rowId] || {})[criterionId])) return;
          const c = projCriteria.find((x) => x.id === criterionId);
          if (value !== "") {
            const n = Number(value);
            if (!c || isNaN(n) || n < 0 || n > maxOf(c)) {
              const who = (rows.find((r) => r.id === rowId) || {}).label;
              throw new Error(`El valor de «${c ? c.name : "criterio"}» para «${who}» debe estar entre 0 y ${c ? maxOf(c) : "?"}.`);
            }
          }
          out.push(mode === "team"
            ? { project_id: proj.id, team_id: rowId, criterion_id: criterionId, value: value === "" ? null : value }
            : { project_id: proj.id, student_id: rowId, criterion_id: criterionId, value: value === "" ? null : value });
        });
      });
      if (!out.length) {
        clearDraft(draftKey);
        setMsg({ type: "ok", text: "No había cambios nuevos que guardar." });
        setDirty(false);
      } else {
        if (mode === "team") await projectsApi.bulkSetTeamResults(out); else await projectsApi.bulkSetResults(out);
        clearDraft(draftKey);
        setMsg({ type: "ok", text: "Calificaciones del proyecto guardadas." });
        setDirty(false);
        refreshProjects();
      }
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setSaving(false);
  }

  const totalMax = projCriteria.reduce((a, c) => a + maxOf(c), 0);
  const unassigned = mode === "team" ? list.filter((s) => !teamOf[s.id]) : [];
  const hasLevels = projCriteria.some((c) => levelsOf(c));
  const view = viewPref || (hasLevels ? "rubric" : "table");
  const active = rows.find((r) => r.id === activeId) || rows[0];

  return (
    <div>
      <h2>Project</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="formula">Final Project Score = puntos obtenidos ÷ puntos máximos de los criterios calificados × 100. Cada criterio vale lo que tú definas. Si falta calificar, aparece como Missing, nunca como 0.</div>
      {!proj ? (
        <>
          <div className="empty"><h3>No project for {g} · {p}</h3>Créalo abajo. Mientras no exista, las calificaciones usan la fórmula sin proyecto.</div>
          <div className="row">
            <input placeholder="Project name (e.g. Environmental Campaign)" value={projName} onChange={(e) => setProjName(e.target.value)} />
            <select style={{ maxWidth: 200 }} value={projMode} onChange={(e) => setProjMode(e.target.value)}>
              <option value="individual">Individual</option>
              <option value="team">Por equipos</option>
            </select>
            <button className="primary" onClick={createProject}>＋ Create project</button>
          </div>
        </>
      ) : (
        <>
          <div className="card">
            <div className="row" style={{ marginBottom: 0 }}>
              <div className="name" style={{ flex: 2 }}>{proj.name}</div>
              <select style={{ maxWidth: 200 }} value={mode} onChange={(e) => changeMode(e.target.value)}>
                <option value="individual">Individual</option>
                <option value="team">Por equipos</option>
              </select>
              <button className="danger" onClick={() => removeProject(proj.id)}>Delete project</button>
            </div>
            <div className="section">
              <div className="row" style={{ marginBottom: 6 }}>
                <b style={{ flex: 1 }}>Rúbrica · {projCriteria.length} criterios · {totalMax} puntos en total</b>
                <button className="teal" onClick={() => setShowRubric(true)}>✨ Cargar rúbrica con Claude</button>
              </div>
              {projCriteria.length ? projCriteria.map((c) => (
                <div key={`${c.id}-${c.name}-${c.max_points}`} style={{ marginBottom: 6 }}>
                  <div className="crit">
                    <input defaultValue={c.name} style={{ flex: 1, maxWidth: "none" }} onBlur={(e) => saveCrit(c, { name: e.target.value })} />
                    <input type="number" min="0.5" step="0.5" defaultValue={maxOf(c)} onBlur={(e) => saveCrit(c, { max_points: Number(e.target.value) })} />
                    <span className="small">pts</span>
                    <button className="danger" onClick={() => removeCriterion(c.id)}>✕</button>
                  </div>
                  {c.description && <div className="small">{c.description}</div>}
                  {levelsOf(c) && (
                    <details>
                      <summary className="small">Ver descriptores ({levelsOf(c).length} niveles)</summary>
                      {levelsOf(c).map((l, i) => (
                        <div className="small" key={i} style={{ marginTop: 4 }}><b>{rangeLabel(l)}</b> {l.label}: {l.descriptor}</div>
                      ))}
                    </details>
                  )}
                </div>
              )) : <div className="muted">Aún no hay criterios.</div>}
              <div className="row" style={{ marginTop: 10 }}>
                <input placeholder="Nuevo criterio (ej. Content)" value={critName} onChange={(e) => setCritName(e.target.value)} />
                <input type="number" min="0.5" step="0.5" style={{ maxWidth: 90, minWidth: 0 }} value={critMax} onChange={(e) => setCritMax(e.target.value)} />
                <span className="small">pts</span>
                <button className="teal" onClick={addCriterion}>＋ Add criterion</button>
              </div>
            </div>
          </div>

          {showRubric && (
            <div style={{ marginTop: 12 }}>
              <RubricImport hasCriteria={!!projCriteria.length} onApply={applyRubric} onClose={() => setShowRubric(false)} />
            </div>
          )}

          {mode === "team" && (
            <div className="card" style={{ marginTop: 12 }}>
              <div className="row" style={{ marginBottom: 6 }}>
                <b style={{ flex: 1 }}>Equipos · {teams.length}</b>
                <button className="teal" onClick={randomTeams}>🎲 Equipos al azar</button>
              </div>
              <div className="row">
                <input placeholder="Nombre del equipo (ej. Team Eco)" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <button className="teal" onClick={addTeam}>＋ Crear equipo</button>
              </div>
              {teams.length > 0 && (
                <div className="row" style={{ marginBottom: 6 }}>
                  {teams.map((t) => (
                    <span key={t.id} className="pill pillNA">{t.name} <button className="ghost" style={{ padding: "0 6px" }} onClick={() => renameTeam(t)}>✎</button><button className="ghost" style={{ padding: "0 6px" }} onClick={() => removeTeam(t)}>✕</button></span>
                  ))}
                </div>
              )}
              {unassigned.length > 0 && <div className="banner warn">{unassigned.length} alumno(s) sin equipo: aparecen como Missing en el proyecto hasta que los asignes.</div>}
              {teams.length === 0 ? <div className="muted">Crea equipos para poder asignar a los alumnos.</div> : list.map((s) => (
                <div className="att" key={s.id}>
                  <span>{s.name}</span>
                  <select style={{ maxWidth: 220 }} value={teamOf[s.id] || ""} onChange={(e) => assign(s.id, e.target.value)}>
                    <option value="">— sin equipo —</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}

          {!!projCriteria.length && !!rows.length && (
            <div className="section">
              <div className="row">
                <b style={{ flex: 1 }}>Calificaciones — máx. {totalMax} pts{mode === "team" ? " · la calificación del equipo aplica a todos sus integrantes" : ""}</b>
                <button className="primary" disabled={!dirty || saving} onClick={save}>
                  {saving ? "Guardando…" : "💾 Guardar calificaciones"}
                </button>
              </div>
              {dirty && <div className="banner warn">Tienes cambios sin guardar en esta pantalla.</div>}
              {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
              <div className="tabs2" style={{ marginTop: 8 }}>
                <button className={view === "rubric" ? "active" : ""} onClick={() => setViewPref("rubric")}>Rúbrica completa</button>
                <button className={view === "table" ? "active" : ""} onClick={() => setViewPref("table")}>Tabla</button>
              </div>
              {view === "rubric" ? (
                <RubricGrader
                  rows={rows} activeId={active ? active.id : ""} setActiveId={setActiveId} criteria={projCriteria}
                  values={(active && pending[active.id]) || {}}
                  onChange={(cid, v) => active && setLocal(active.id, cid, v)}
                  final={active ? liveFinalScore(active.id) : null} mode={mode}
                />
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table>
                    <tbody>
                      <tr>
                        <th className="stickyCol">{mode === "team" ? "Team" : "Student"}</th>
                        {projCriteria.map((c) => <th key={c.id} title={levelsText(c)}>{c.name} <span className="muted">(/{maxOf(c)})</span></th>)}
                        <th>Final Score</th>
                      </tr>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          <td className="stickyCol">{r.label}{r.sub && <div className="small">{r.sub}</div>}</td>
                          {projCriteria.map((c) => (
                            <td key={c.id}>
                              <input
                                type="number" min="0" max={maxOf(c)} step="0.5" placeholder="—"
                                style={{ width: 70, minWidth: 0, flex: "none" }}
                                value={(pending[r.id] && pending[r.id][c.id]) ?? ""}
                                onChange={(e) => setLocal(r.id, c.id, e.target.value)}
                              />
                            </td>
                          ))}
                          <td><b>{liveFinalScore(r.id) == null ? "Missing" : liveFinalScore(r.id) + "%"}</b></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {!!projCriteria.length && !rows.length && mode === "team" && <div className="empty" style={{ marginTop: 12 }}><h3>Aún no hay equipos</h3>Crea equipos y asigna alumnos para calificar.</div>}
        </>
      )}
    </div>
  );
}
