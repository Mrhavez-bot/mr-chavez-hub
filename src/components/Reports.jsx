import { useState } from "react";
import { useData } from "../context/DataContext";
import { GROUPS, PERIODS, SKILLS } from "../lib/constants";
import { attendanceStats, taskPct, scoresDetail, scoresPct, projectPct, computeGrade, fmtPct, medalIcon } from "../lib/calc";
import { exportReportExcel } from "../lib/excel";
import BarChart from "./BarChart";

function avg(arr) {
  const vals = arr.filter((v) => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export default function Reports() {
  const data = useData();
  const { students, config } = data;
  const [type, setType] = useState("group");
  const [group, setGroup] = useState(GROUPS[0]);
  const [period, setPeriod] = useState(PERIODS[0]);
  const [studentId, setStudentId] = useState("");
  const appName = config?.app_name || "Mr. Chavez's Hub";
  const today = new Date().toISOString().slice(0, 10);

  // "By Period" report: attendance / tasks / scores averaged per group, for one period.
  function PeriodSummaryReport() {
    const rows = GROUPS.map((g) => {
      const list = students.filter((s) => s.group_name === g);
      const att = avg(list.map((s) => {
        const stats = attendanceStats(data.attendance, s.id, g, period);
        return stats ? stats.score : null;
      }));
      const tsk = avg(list.map((s) => taskPct(data.tasks, data.taskResults, s.id, g, period)));
      const scr = avg(list.map((s) => scoresPct(data.scores, s.id, g, period)));
      return { group: g, count: list.length, att, tsk, scr };
    });
    return (
      <>
        <h3>Group Summary — {period}</h3>
        <div className="small" style={{ marginBottom: 10 }}>
          Each column is the average across students in that group who have data for this period — students with no
          records yet are excluded from the average rather than counted as 0%.
        </div>
        <table><tbody>
          <tr><th>Group</th><th>Students</th><th>Attendance %</th><th>Tasks %</th><th>Scores %</th></tr>
          {rows.map((r) => (
            <tr key={r.group}>
              <td><b>{r.group}</b></td>
              <td>{r.count}</td>
              <td>{fmtPct(r.att)}</td>
              <td>{fmtPct(r.tsk)}</td>
              <td>{fmtPct(r.scr)}</td>
            </tr>
          ))}
        </tbody></table>
        <div className="section">
          <b>Attendance by group</b>
          <BarChart pairs={rows.map((r) => [r.group, r.att])} />
        </div>
        <div className="section">
          <b>Tasks by group</b>
          <BarChart pairs={rows.map((r) => [r.group, r.tsk])} colors={rows.map(() => "#2dd4bf")} />
        </div>
        <div className="section">
          <b>Scores by group</b>
          <BarChart pairs={rows.map((r) => [r.group, r.scr])} colors={rows.map(() => "#ff6b6b")} />
        </div>
      </>
    );
  }

  function GroupReport() {
    const list = students.filter((s) => s.group_name === group);
    if (!list.length) return <div className="empty"><h3>No students in {group}</h3></div>;
    const medalCounts = { gold: 0, silver: 0, bronze: 0, sad: 0 };
    const rows = list.map((s) => {
      const att = attendanceStats(data.attendance, s.id, group, period);
      const tsk = taskPct(data.tasks, data.taskResults, s.id, group, period);
      const scr = scoresPct(data.scores, s.id, group, period);
      const proj = projectPct(data.projects, data.criteria, data.projectResults, s.id, group, period);
      const gr = computeGrade(data, s.id, group, period);
      if (gr.medal) medalCounts[gr.medal]++;
      return { s, att, tsk, scr, proj, gr };
    });
    return (
      <>
        <h3>Complete Group Report — {group} · {period}</h3>
        <table><tbody>
          <tr><th>Student</th><th>Attendance</th><th>Tasks</th><th>Scores</th><th>Project</th><th>Final Grade</th><th>Medal</th></tr>
          {rows.map(({ s, att, tsk, scr, proj, gr }) => (
            <tr key={s.id}>
              <td>{s.name}</td>
              <td>{att ? `${att.presentPct}% P / ${att.latePct}% L / ${att.absentPct}% A` : "—"}</td>
              <td>{fmtPct(tsk)}</td><td>{fmtPct(scr)}</td>
              <td>{proj.exists ? (proj.value == null ? "Missing" : proj.value + "%") : "N/A"}</td>
              <td><b>{gr.final == null ? "Incomplete" : gr.final + "%"}</b></td>
              <td>{medalIcon(gr.medal)}</td>
            </tr>
          ))}
        </tbody></table>
        <div className="section">
          <b>Medal distribution</b>
          <BarChart pairs={[["Gold", medalCounts.gold], ["Silver", medalCounts.silver], ["Bronze", medalCounts.bronze], ["Sad", medalCounts.sad]]} maxVal={Math.max(1, list.length)} colors={["#ffc145", "#c7c7e0", "#e0a25f", "#ff6b6b"]} />
        </div>
      </>
    );
  }

  function StudentReport() {
    const s = students.find((x) => x.id === studentId);
    if (!s) return <div className="empty"><h3>Select a student</h3></div>;
    const g = s.group_name;
    const att = attendanceStats(data.attendance, s.id, g, period);
    const tsk = taskPct(data.tasks, data.taskResults, s.id, g, period);
    const map = scoresDetail(data.scores, s.id, g, period);
    const scr = scoresPct(data.scores, s.id, g, period);
    const proj = projectPct(data.projects, data.criteria, data.projectResults, s.id, g, period);
    const gr = computeGrade(data, s.id, g, period);
    return (
      <>
        <h3>Complete Student Report — {s.name} ({g}) · {period}</h3>
        <div className="stats">
          <div className="stat"><b>{att ? att.score + "%" : "—"}</b><span>Attendance</span></div>
          <div className="stat"><b>{fmtPct(tsk)}</b><span>Tasks</span></div>
          <div className="stat"><b>{fmtPct(scr)}</b><span>Scores</span></div>
          <div className="stat"><b>{proj.exists ? (proj.value == null ? "Missing" : proj.value + "%") : "N/A"}</b><span>Project</span></div>
          <div className="stat"><b>{gr.final == null ? "Incomplete" : gr.final + "%"} {gr.final == null ? "" : medalIcon(gr.medal)}</b><span>Final Grade</span></div>
        </div>
        <div className="section"><b>Skill scores</b><BarChart pairs={SKILLS.map((sk) => [sk.split(" ")[0], map[sk] == null ? null : map[sk]])} /></div>
        {att && <div className="section"><b>Attendance breakdown</b><BarChart pairs={[["Present", att.presentPct], ["Late", att.latePct], ["Absent", att.absentPct]]} colors={["#2dd4bf", "#ffc145", "#ff6b6b"]} /></div>}
      </>
    );
  }

  return (
    <div>
      <h2>Reports</h2>
      <div className="tabs2">
        <button className={type === "group" ? "active" : ""} onClick={() => setType("group")}>By Group</button>
        <button className={type === "student" ? "active" : ""} onClick={() => setType("student")}>By Student</button>
        <button className={type === "period" ? "active" : ""} onClick={() => setType("period")}>All Groups (by Period)</button>
      </div>
      <div className="row">
        {type === "group" && (
          <select value={group} onChange={(e) => setGroup(e.target.value)}>{GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
        )}
        {type === "student" && (
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">Select a student…</option>
            {[...students].sort((a, b) => a.name.localeCompare(b.name)).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.group_name})</option>)}
          </select>
        )}
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        <button className="teal" onClick={() => window.print()}>🖨 Download PDF</button>
        <button className="teal" onClick={() => exportReportExcel(data)}>⬇ Export to Excel</button>
      </div>
      <div>
        <div className="muted">{appName} · {period} · Generated {today}</div>
        {type === "group" && <GroupReport />}
        {type === "student" && <StudentReport />}
        {type === "period" && <PeriodSummaryReport />}
      </div>
    </div>
  );
}
