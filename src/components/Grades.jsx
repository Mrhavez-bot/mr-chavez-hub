import { useData } from "../context/DataContext";
import { computeGrade, fmtPct, medalIcon, medalLabel, medalPillClass, projectForGroupPeriod } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

export default function Grades({ ui, setUi }) {
  const data = useData();
  const { students, projects } = data;
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const proj = projectForGroupPeriod(projects, g, p);
  const hasProject = !!proj;
  const formulaText = hasProject
    ? `Period ${p} — Project Included: Attendance 20% · Tasks 20% · Scores 30% · Project 30%`
    : `Period ${p} — No Project: Attendance 30% · Tasks 30% · Scores 40%`;

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
              <tr><th>Student</th><th>Attendance</th><th>Tasks</th><th>Scores</th><th>Project</th><th>Final Grade</th><th>Medal</th></tr>
              {list.map((s) => {
                const gr = computeGrade(data, s.id, g, p);
                return (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>{fmtPct(gr.attendance)}</td>
                    <td>{fmtPct(gr.tasks)}</td>
                    <td>{fmtPct(gr.scores)}</td>
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
