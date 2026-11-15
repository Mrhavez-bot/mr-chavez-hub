// Builds the detailed "Group Results" report (Project, Exam, Tasks) for one
// group and period. Pure functions, so the screen and the Excel export share
// exactly the same numbers. Students with no data are left out of averages,
// never counted as 0.
import { SKILLS, TASK_STATUSES, TASK_PCT } from "./constants.js";
import { projectForGroupPeriod, projectPct, scoresDetail, scoresPct, taskPct } from "./calc.js";

const round1 = (n) => Math.round(n * 10) / 10;
export function avg(arr) {
  const vals = arr.filter((v) => v != null && !isNaN(v));
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
}

// same formula as the grade engine: points obtained / max of the graded criteria
function pctFrom(rawCriteria, values) {
  const graded = rawCriteria.filter((c) => values[c.id] != null);
  if (!graded.length) return null;
  const total = graded.reduce((a, c) => a + Number(values[c.id]), 0);
  const max = graded.reduce((a, c) => a + Number(c.max_points ?? 5), 0);
  return round1((total / max) * 100);
}

export function buildGroupResults(data, group, period) {
  const students = data.students.filter((s) => s.group_name === group).sort((a, b) => a.name.localeCompare(b.name));
  const nameOf = (id) => (students.find((s) => s.id === id) || {}).name;

  // ---------------- Project
  let project = { exists: false };
  const proj = projectForGroupPeriod(data.projects, group, period);
  if (proj) {
    const raw = data.criteria.filter((c) => c.project_id === proj.id);
    const criteria = raw.map((c) => ({ id: c.id, name: c.name, max: Number(c.max_points ?? 5) }));
    const teamArgs = { teamMembers: data.projectTeamMembers, teamResults: data.projectTeamResults };
    const studentFinals = students.map((s) => projectPct(data.projects, data.criteria, data.projectResults, s.id, group, period, teamArgs).value);
    const members = (data.projectTeamMembers || []).filter((m) => m.project_id === proj.id);
    let rows, noTeam = [];
    if (proj.mode === "team") {
      rows = (data.projectTeams || []).filter((t) => t.project_id === proj.id).map((t) => {
        const values = {};
        (data.projectTeamResults || []).filter((r) => r.team_id === t.id).forEach((r) => { values[r.criterion_id] = Number(r.value); });
        const names = members.filter((m) => m.team_id === t.id).map((m) => nameOf(m.student_id)).filter(Boolean);
        return { id: t.id, label: t.name, members: names.join(", "), size: names.length, values, final: pctFrom(raw, values) };
      });
      noTeam = students.filter((s) => !members.some((m) => m.student_id === s.id)).map((s) => s.name);
    } else {
      rows = students.map((s) => {
        const values = {};
        data.projectResults.filter((r) => r.project_id === proj.id && r.student_id === s.id).forEach((r) => { values[r.criterion_id] = Number(r.value); });
        return { id: s.id, label: s.name, members: "", size: 1, values, final: pctFrom(raw, values) };
      });
    }
    project = {
      exists: true, name: proj.name, mode: proj.mode || "individual", criteria, rows, noTeam,
      avgByCriterion: criteria.map((c) => avg(rows.map((r) => (r.values[c.id] == null ? null : r.values[c.id])))),
      avgFinal: avg(studentFinals),
      gradedStudents: studentFinals.filter((v) => v != null).length
    };
  }

  // ---------------- Exam
  const examRows = students.map((s) => ({ id: s.id, label: s.name, values: scoresDetail(data.scores, s.id, group, period), avg: scoresPct(data.scores, s.id, group, period) }));
  const exam = {
    skills: SKILLS, rows: examRows,
    avgBySkill: SKILLS.map((sk) => avg(examRows.map((r) => (r.values[sk] == null ? null : r.values[sk])))),
    avg: avg(examRows.map((r) => r.avg))
  };

  // ---------------- Tasks
  const groupTasks = data.tasks.filter((t) => t.group_name === group && t.period === period);
  const statusOf = (tid, sid) => { const r = data.taskResults.find((x) => x.task_id === tid && x.student_id === sid); return r ? r.status : null; };
  const taskRows = students.map((s) => ({
    id: s.id, label: s.name,
    statuses: Object.fromEntries(groupTasks.map((t) => [t.id, statusOf(t.id, s.id)])),
    pct: taskPct(data.tasks, data.taskResults, s.id, group, period)
  }));
  const summary = groupTasks.map((t) => {
    const counts = Object.fromEntries(TASK_STATUSES.map(([n]) => [n, 0]));
    const pcts = [];
    students.forEach((s) => { const st = statusOf(t.id, s.id); if (st != null) { counts[st] = (counts[st] || 0) + 1; pcts.push(TASK_PCT[st] ?? 0); } });
    return { id: t.id, title: t.title, counts, notGraded: students.length - pcts.length, avgPct: avg(pcts) };
  });
  const tasks = { list: groupTasks.map((t) => ({ id: t.id, title: t.title })), rows: taskRows, summary, avgPct: avg(taskRows.map((r) => r.pct)) };

  return { group, period, studentCount: students.length, project, exam, tasks };
}
