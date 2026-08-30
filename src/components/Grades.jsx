import { useData } from "../context/DataContext";
import { computeGrade, fmtPct, medalIcon, medalLabel, medalPillClass, projectForGroupPeriod, gradeWeights } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

export default function Grades({ ui, setUi }) {
  const data = useData();
  const { students, projects } = data;
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const proj = projectForGroupPeriod(projects, g, p);
  const hasProject = !!proj;
  const w = gradeWeights(data.config, hasProject);
  const pct = (n) => Math.round(n * 100);
  const formulaText = hasProject
    ? `Period ${p} — Project Included: Attendance ${pct(w.att)}% · Tasks ${pct(w.tsk)}% · Scores ${pct(w.scr)}%${w.lp > 0 ? ` · Language Portfolio ${pct(w.lp)}%` : ""} · Project ${pct(w.proj)}%`
    : `Period ${p} — No Project: Attendance ${pct(w.att)}% · Tasks ${pct(w.tsk)}% · Scores ${pct(w.scr)}%${w.lp > 0 ? ` · Language Portfolio ${pct(w.lp)}%` : ""}`;
  const showLP = w.lp > 0;

  return (
    <div>
      <h2>Grades</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="formula">{formulaText}{hasProject ? ` · Project: "${proj.name}"` : ""}</div>
      {!list.length ? (
        <div className="empty"><h3>No students in {g}</h3></div>
      ) : (
        <>
          <table>
            <tbody>
              <tr><th>Student</th><th>Attendance</th><th>Tasks</th><th>Scores</th>{showLP && <th>Language Portfolio</th>}<th>Project</th><th>Final Grade</th><th>Medal</th></tr>
              {list.map((s) => {
                const gr = computeGrade(data, s.id, g, p);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{fmtPct(gr.attendance)}</td>
                    <td>{fmtPct(gr.tasks)}</td>
                    <td>{fmtPct(gr.scores)}</td>
                    {showLP && <td>{fmtPct(gr.languagePortfolio)}</td>}
                    <td>{hasProject ? (gr.project == null ? <span className="muted">Missing</span> : gr.project + "%") : <span className="muted">N/A</span>}</td>
                    <td><b>{gr.final == null ? <span className="pill pillNA" title={"Missing: " + gr.missing.join(", ")}>Incomplete</span> : fmtPct(gr.final)}</b></td>
                    <td>{gr.final == null ? <span className="pill pillNA">N/A</span> : <span className={"pill " + medalPillClass(gr.medal)}>{medalIcon(gr.medal)} {medalLabel(gr.medal)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="small" style={{ marginTop: 10 }}>
            Attendance credit: Present = full, Late = half, Absent = none. "Incomplete" means one or more required components have no data yet for this student in this period — it is never silently scored as 0.
          </div>
        </>
      )}
    </div>
  );
}
