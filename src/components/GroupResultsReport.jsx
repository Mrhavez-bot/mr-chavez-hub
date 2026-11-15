import { buildGroupResults } from "../lib/groupResults";
import { fmtPct } from "../lib/calc";
import { TASK_STATUSES } from "../lib/constants";
import BarChart from "./BarChart";

const num = (v) => (v == null ? "—" : v);
const statusColor = (st) => (st === "Complete" ? "#2dd4bf" : st === "Not Submitted" ? "#ff6b6b" : "#ffc145");

export default function GroupResultsReport({ data, group, period }) {
  const r = buildGroupResults(data, group, period);
  if (!r.studentCount) return <div className="empty"><h3>No students in {group}</h3></div>;
  const { project, exam, tasks } = r;
  const isTeam = project.exists && project.mode === "team";

  return (
    <>
      <h3>Group Results — {group} · {period}</h3>
      <div className="small" style={{ marginBottom: 10 }}>
        Detalle de Project, Exam y Tasks. Los promedios solo incluyen a quienes ya tienen datos; lo que falta no se cuenta como 0.
      </div>
      <div className="stats">
        <div className="stat"><b>{r.studentCount}</b><span>Students</span></div>
        <div className="stat"><b>{project.exists ? fmtPct(project.avgFinal) : "N/A"}</b><span>Project average</span></div>
        <div className="stat"><b>{fmtPct(exam.avg)}</b><span>Exam average</span></div>
        <div className="stat"><b>{fmtPct(tasks.avgPct)}</b><span>Tasks completion</span></div>
      </div>

      {/* ---------------- PROJECT */}
      <div className="section">
        <b>Project{project.exists ? ` — ${project.name}` : ""}</b>
        {!project.exists ? (
          <div className="muted" style={{ marginTop: 8 }}>No hay proyecto para {group} · {period}.</div>
        ) : !project.criteria.length ? (
          <div className="muted" style={{ marginTop: 8 }}>Este proyecto todavía no tiene criterios.</div>
        ) : (
          <>
            <div className="small" style={{ margin: "6px 0 8px" }}>
              {isTeam ? "Por equipos: la calificación del equipo aplica a todos sus integrantes." : "Individual."} Se muestran los puntos de cada criterio; entre paréntesis, su valor máximo.
            </div>
            {project.noTeam.length > 0 && <div className="banner warn">Sin equipo asignado: {project.noTeam.join(", ")}.</div>}
            <div style={{ overflowX: "auto" }}>
              <table><tbody>
                <tr>
                  <th className="stickyCol">{isTeam ? "Team" : "Student"}</th>
                  {isTeam && <th>Members</th>}
                  {project.criteria.map((c) => <th key={c.id}>{c.name} <span className="muted">(/{c.max})</span></th>)}
                  <th>Final Score</th>
                </tr>
                {project.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="stickyCol">{row.label}</td>
                    {isTeam && <td className="small">{row.members || "—"}</td>}
                    {project.criteria.map((c) => <td key={c.id}>{num(row.values[c.id])}</td>)}
                    <td><b>{row.final == null ? "Missing" : row.final + "%"}</b></td>
                  </tr>
                ))}
                <tr>
                  <td className="stickyCol"><b>{isTeam ? "Team average" : "Group average"}</b></td>
                  {isTeam && <td />}
                  {project.avgByCriterion.map((v, i) => <td key={i}><b>{num(v)}</b></td>)}
                  <td><b>{fmtPct(project.avgFinal)}</b></td>
                </tr>
              </tbody></table>
            </div>
            <div className="small" style={{ marginTop: 6 }}>{project.gradedStudents} de {r.studentCount} alumnos con calificación de proyecto{isTeam ? " (el promedio final cuenta a cada alumno con la nota de su equipo)" : ""}.</div>
          </>
        )}
      </div>

      {/* ---------------- EXAM */}
      <div className="section">
        <b>Exam</b>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table><tbody>
            <tr><th className="stickyCol">Student</th>{exam.skills.map((sk) => <th key={sk}>{sk}</th>)}<th>Exam %</th></tr>
            {exam.rows.map((row) => (
              <tr key={row.id}>
                <td className="stickyCol">{row.label}</td>
                {exam.skills.map((sk) => <td key={sk}>{num(row.values[sk])}</td>)}
                <td><b>{fmtPct(row.avg)}</b></td>
              </tr>
            ))}
            <tr>
              <td className="stickyCol"><b>Group average</b></td>
              {exam.avgBySkill.map((v, i) => <td key={i}><b>{num(v)}</b></td>)}
              <td><b>{fmtPct(exam.avg)}</b></td>
            </tr>
          </tbody></table>
        </div>
        <div className="section">
          <b>Average by skill</b>
          <BarChart pairs={exam.skills.map((sk, i) => [sk.split(" ")[0], exam.avgBySkill[i]])} colors={exam.skills.map(() => "#ff6b6b")} />
        </div>
      </div>

      {/* ---------------- TASKS */}
      <div className="section">
        <b>Tasks</b>
        {!tasks.list.length ? (
          <div className="muted" style={{ marginTop: 8 }}>No hay tasks para {group} · {period}.</div>
        ) : (
          <>
            <div style={{ overflowX: "auto", marginTop: 8 }}>
              <table><tbody>
                <tr><th className="stickyCol">Student</th>{tasks.list.map((t) => <th key={t.id}>{t.title}</th>)}<th>Completion</th></tr>
                {tasks.rows.map((row) => (
                  <tr key={row.id}>
                    <td className="stickyCol">{row.label}</td>
                    {tasks.list.map((t) => {
                      const st = row.statuses[t.id];
                      return <td key={t.id} style={st ? { color: statusColor(st) } : undefined}>{st || <span className="muted">—</span>}</td>;
                    })}
                    <td><b>{fmtPct(row.pct)}</b></td>
                  </tr>
                ))}
                <tr>
                  <td className="stickyCol"><b>Group average</b></td>
                  {tasks.summary.map((s) => <td key={s.id}><b>{fmtPct(s.avgPct)}</b></td>)}
                  <td><b>{fmtPct(tasks.avgPct)}</b></td>
                </tr>
              </tbody></table>
            </div>
            <div className="section">
              <b>Summary by task</b>
              <div style={{ overflowX: "auto", marginTop: 8 }}>
                <table><tbody>
                  <tr><th>Task</th>{TASK_STATUSES.map(([n]) => <th key={n}>{n}</th>)}<th>Not graded</th><th>Average</th></tr>
                  {tasks.summary.map((s) => (
                    <tr key={s.id}>
                      <td>{s.title}</td>
                      {TASK_STATUSES.map(([n]) => <td key={n}>{s.counts[n]}</td>)}
                      <td>{s.notGraded}</td>
                      <td><b>{fmtPct(s.avgPct)}</b></td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
            </div>
            <div className="section">
              <b>Average % by task</b>
              <BarChart pairs={tasks.summary.map((s) => [s.title.length > 12 ? s.title.slice(0, 11) + "…" : s.title, s.avgPct])} colors={tasks.summary.map(() => "#2dd4bf")} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
