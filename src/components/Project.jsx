import { useState } from "react";
import { useData } from "../context/DataContext";
import { projectsApi } from "../lib/api";
import { projectForGroupPeriod, projectPct } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

export default function Project({ ui, setUi }) {
  const data = useData();
  const { students, projects, criteria, projectResults, reload } = data;
  const [projName, setProjName] = useState("");
  const [critName, setCritName] = useState("");
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const proj = projectForGroupPeriod(projects, g, p);

  async function createProject() {
    if (!projName.trim()) { alert("Enter a project name."); return; }
    await projectsApi.create(projName.trim(), g, p);
    setProjName("");
    reload();
  }
  async function removeProject(id) {
    if (!confirm("Delete this project, its criteria and all scores? This cannot be undone.")) return;
    await projectsApi.remove(id);
    reload();
  }
  async function addCriterion(pid) {
    if (!critName.trim()) { alert("Enter a criterion name."); return; }
    await projectsApi.addCriterion(pid, critName.trim());
    setCritName("");
    reload();
  }
  async function renameCriterion(c) {
    const n = prompt("Criterion name:", c.name);
    if (n === null) return;
    if (!n.trim()) { alert("Name cannot be empty."); return; }
    await projectsApi.renameCriterion(c.id, n.trim());
    reload();
  }
  async function removeCriterion(id) {
    if (!confirm("Delete this criterion and its scores?")) return;
    await projectsApi.removeCriterion(id);
    reload();
  }
  async function setResult(pid, sid, cid, val) {
    await projectsApi.setResult(pid, sid, cid, val === "" ? null : val);
    reload();
  }

  const projCriteria = proj ? criteria.filter((c) => c.project_id === proj.id) : [];

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
              <b>Scores — max {projCriteria.length * 5} pts ({projCriteria.length} criteria × 5)</b>
              <table>
                <tbody>
                  <tr><th>Student</th>{projCriteria.map((c) => <th key={c.id}>{c.name}</th>)}<th>Final Score</th></tr>
                  {list.map((s) => {
                    const pp = projectPct(projects, criteria, projectResults, s.id, g, p);
                    return (
                      <tr key={s.id}>
                        <td>{s.name}</td>
                        {projCriteria.map((c) => {
                          const r = projectResults.find((x) => x.project_id === proj.id && x.student_id === s.id && x.criterion_id === c.id);
                          return (
                            <td key={c.id}>
                              <select style={{ maxWidth: 70 }} value={r ? r.value : ""} onChange={(e) => setResult(proj.id, s.id, c.id, e.target.value)}>
                                <option value="">—</option>
                                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                              </select>
                            </td>
                          );
                        })}
                        <td><b>{pp.value == null ? "Missing" : pp.value + "%"}</b></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
