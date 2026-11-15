import * as XLSX from "xlsx";
import { GROUPS, TASK_PCT } from "./constants";
import { PERIODS } from "./constants";
import { computeGrade, medalLabel } from "./calc";
import { buildGroupResults } from "./groupResults";

export function exportStudentsExcel(students) {
  const rows = students.map((s) => ({ "Student ID": s.id, "Student Name": s.name, Group: s.group_name, "Celtix Balance": s.coins }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  XLSX.writeFile(wb, "MrChavezHub_Students.xlsx");
}

export async function importStudentsExcel(file, existingStudents) {
  const { studentsApi } = await import("./api");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const errors = [];
  let added = 0, skipped = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r["Student Name"] || r["Name"] || "").trim();
    const group = String(r["Group"] || "").trim();
    if (!name) { errors.push(`Row ${i + 2}: missing name`); continue; }
    if (!GROUPS.includes(group)) { errors.push(`Row ${i + 2} (${name}): invalid group "${group}"`); continue; }
    const dup = existingStudents.some((s) => s.name.toLowerCase() === name.toLowerCase() && s.group_name === group);
    if (dup) { skipped++; continue; }
    await studentsApi.create(name, group);
    added++;
  }
  return { added, skipped, errors };
}

export function exportReportExcel(data) {
  const { students, attendance, tasks, taskResults, scores, projects, criteria, projectResults, projectTeams, projectTeamMembers, projectTeamResults, extraCriteria, extraResults, languagePortfolio, transactions, purchases } = data;
  const wb = XLSX.utils.book_new();
  const byId = (id) => students.find((s) => s.id === id);

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    students.map((s) => ({ "Student ID": s.id, Name: s.name, Group: s.group_name, Celtix: s.coins }))
  ), "Students");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    attendance.map((a) => ({ Student: byId(a.student_id)?.name || a.student_id, Group: a.group_name, Period: a.period, Date: a.date, Status: a.status }))
  ), "Attendance");

  const taskRows = [];
  taskResults.forEach((r) => {
    const t = tasks.find((x) => x.id === r.task_id);
    const s = byId(r.student_id);
    if (t && s) taskRows.push({ Student: s.name, Group: t.group_name, Period: t.period, Task: t.title, Status: r.status, Percent: TASK_PCT[r.status] });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "Tasks");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    scores.map((s) => ({ Student: byId(s.student_id)?.name || s.student_id, Group: s.group_name, Period: s.period, Skill: s.skill, Value: s.value }))
  ), "Exam");

  const projRows = [];
  projectResults.forEach((r) => {
    const p = projects.find((x) => x.id === r.project_id);
    const s = byId(r.student_id);
    const c = criteria.find((x) => x.id === r.criterion_id);
    if (p && s && c) projRows.push({ Student: s.name, Group: p.group_name, Period: p.period, Project: p.name, Criterion: c.name, Value: r.value, "Max points": c.max_points ?? 5 });
  });
  const teamRows = [];
  (projectTeamResults || []).forEach((r) => {
    const t = (projectTeams || []).find((x) => x.id === r.team_id);
    const p = t && projects.find((x) => x.id === t.project_id);
    const c = criteria.find((x) => x.id === r.criterion_id);
    if (!p || !c) return;
    const members = (projectTeamMembers || []).filter((m) => m.team_id === t.id).map((m) => byId(m.student_id)?.name).filter(Boolean).join(", ");
    teamRows.push({ Team: t.name, Members: members, Group: p.group_name, Period: p.period, Project: p.name, Criterion: c.name, Value: r.value, "Max points": c.max_points ?? 5 });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(teamRows), "Project teams");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), "Projects");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    (languagePortfolio || []).map((r) => ({ Student: byId(r.student_id)?.name || r.student_id, Group: r.group_name, Period: r.period, Value: r.value }))
  ), "Language Portfolio");

  const gradeRows = [];
  students.forEach((s) => {
    PERIODS.forEach((p) => {
      const g = computeGrade(data, s.id, s.group_name, p);
      gradeRows.push({
        Student: s.name, Group: s.group_name, Period: p,
        Attendance: g.attendance, Tasks: g.tasks, Exam: g.scores,
        "Language Portfolio": g.weights.lp > 0 ? g.languagePortfolio : "N/A",
        ...Object.fromEntries(g.extras.filter((x) => x.weight > 0).map((x) => [x.name, x.value])),
        Project: g.hasProject ? g.project : "N/A",
        "Final Grade": g.final == null ? "Incomplete" : g.final,
        Medal: g.final == null ? "" : medalLabel(g.medal)
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gradeRows), "Grades");

  const extraRows = [];
  (extraResults || []).forEach((r) => {
    const c = (extraCriteria || []).find((x) => x.id === r.criterion_id);
    const s = byId(r.student_id);
    if (c && s) extraRows.push({ Student: s.name, Group: s.group_name, Period: c.period, Criterion: c.name, Value: r.value, "Max points": c.max_points });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(extraRows), "Extra criteria");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    transactions.map((t) => ({ Student: byId(t.student_id)?.name || t.student_id, Group: t.group_name, Amount: t.amount, Type: t.type, Reason: t.reason, Date: t.created_at?.slice(0, 10) }))
  ), "Celtix Transactions");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
    purchases.map((p) => ({ Student: byId(p.student_id)?.name || p.student_id, Group: p.group_name, Reward: p.reward_name, Cost: p.cost, Date: p.purchased_at?.slice(0, 10) }))
  ), "Rewards");

  XLSX.writeFile(wb, "MrChavezHub_Report.xlsx");
}

// Group Results report -> one workbook with Project, Exam and Tasks sheets.
export function exportGroupResultsExcel(data, group, period) {
  const r = buildGroupResults(data, group, period);
  const wb = XLSX.utils.book_new();
  const add = (rows, name) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: "Sin datos" }]), name);

  if (r.project.exists) {
    const p = r.project;
    const isTeam = p.mode === "team";
    const rows = p.rows.map((row) => ({
      [isTeam ? "Team" : "Student"]: row.label,
      ...(isTeam ? { Members: row.members } : {}),
      ...Object.fromEntries(p.criteria.map((c) => [`${c.name} (/${c.max})`, row.values[c.id] ?? ""])),
      "Final Score %": row.final == null ? "Missing" : row.final
    }));
    rows.push({
      [isTeam ? "Team" : "Student"]: isTeam ? "Team average" : "Group average",
      ...(isTeam ? { Members: "" } : {}),
      ...Object.fromEntries(p.criteria.map((c, i) => [`${c.name} (/${c.max})`, p.avgByCriterion[i] ?? ""])),
      "Final Score %": p.avgFinal ?? ""
    });
    add(rows, "Project");
  } else add([{ Info: `No hay proyecto para ${group} · ${period}` }], "Project");

  const exam = r.exam.rows.map((row) => ({ Student: row.label, ...Object.fromEntries(r.exam.skills.map((sk) => [sk, row.values[sk] ?? ""])), "Exam %": row.avg ?? "" }));
  exam.push({ Student: "Group average", ...Object.fromEntries(r.exam.skills.map((sk, i) => [sk, r.exam.avgBySkill[i] ?? ""])), "Exam %": r.exam.avg ?? "" });
  add(exam, "Exam");

  const tasks = r.tasks.rows.map((row) => ({ Student: row.label, ...Object.fromEntries(r.tasks.list.map((t) => [t.title, row.statuses[t.id] || ""])), "Completion %": row.pct ?? "" }));
  if (r.tasks.list.length) tasks.push({ Student: "Group average", ...Object.fromEntries(r.tasks.summary.map((s) => [s.title, s.avgPct ?? ""])), "Completion %": r.tasks.avgPct ?? "" });
  add(tasks, "Tasks");

  XLSX.writeFile(wb, `MrChavezHub_Results_${group}_${period.replace(/\s+/g, "")}.xlsx`);
}
