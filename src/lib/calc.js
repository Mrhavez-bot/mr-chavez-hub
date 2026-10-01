// Pure calculation engine — no Supabase, no DOM. Same functions are used by
// the Grades tab, Dashboard, Reports, and Excel/PDF export, so there is a
// single source of truth for every number the app shows.
import { SKILLS, TASK_PCT } from "./constants.js";

function round1(n) {
  return Math.round(n * 10) / 10;
}

// attendance: array of {student_id, group_name, period, date, status}
export function attendanceStats(attendance, studentId, group, period) {
  const recs = attendance.filter(
    (a) => a.student_id === studentId && a.group_name === group && a.period === period
  );
  if (!recs.length) return null;
  let p = 0, l = 0, ab = 0;
  recs.forEach((r) => {
    if (r.status === "present") p++;
    else if (r.status === "late") l++;
    else if (r.status === "absent") ab++;
  });
  const total = recs.length;
  return {
    present: p, late: l, absent: ab, total,
    presentPct: round1((p / total) * 100),
    latePct: round1((l / total) * 100),
    absentPct: round1((ab / total) * 100),
    // grading value: present = full credit, late = half credit, absent = none
    score: round1(((p + l * 0.5) / total) * 100)
  };
}
export function attendancePct(attendance, studentId, group, period) {
  const s = attendanceStats(attendance, studentId, group, period);
  return s ? s.score : null;
}

// tasks: [{id, group_name, period}], taskResults: [{task_id, student_id, status}]
export function taskPct(tasks, taskResults, studentId, group, period) {
  const groupTasks = tasks.filter((t) => t.group_name === group && t.period === period);
  if (!groupTasks.length) return null;
  const taskIds = groupTasks.map((t) => t.id);
  const results = taskResults.filter((r) => r.student_id === studentId && taskIds.includes(r.task_id));
  if (!results.length) return null;
  const sum = results.reduce((a, r) => a + (TASK_PCT[r.status] ?? 0), 0);
  return round1(sum / results.length);
}

// scores: [{student_id, group_name, period, skill, value}]
export function scoresDetail(scores, studentId, group, period) {
  const recs = scores.filter((s) => s.student_id === studentId && s.group_name === group && s.period === period);
  const map = {};
  recs.forEach((r) => (map[r.skill] = r.value));
  return map;
}
export function scoresPct(scores, studentId, group, period) {
  const map = scoresDetail(scores, studentId, group, period);
  const vals = SKILLS.map((sk) => map[sk]).filter((v) => v != null);
  if (!vals.length) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// projects: [{id, group_name, period}], criteria: [{id, project_id, name}]
// projectResults: [{project_id, student_id, criterion_id, value}]
export function projectForGroupPeriod(projects, group, period) {
  const list = projects.filter((p) => p.group_name === group && p.period === period);
  return list.length ? list[list.length - 1] : null;
}
export function projectPct(projects, criteria, projectResults, studentId, group, period) {
  const proj = projectForGroupPeriod(projects, group, period);
  if (!proj) return { exists: false, value: null, project: null };
  const projCriteria = criteria.filter((c) => c.project_id === proj.id);
  if (!projCriteria.length) return { exists: true, value: null, project: proj, criteria: projCriteria };
  const results = projectResults.filter((r) => r.project_id === proj.id && r.student_id === studentId);
  if (!results.length) return { exists: true, value: null, project: proj, criteria: projCriteria };
  const map = {};
  results.forEach((r) => (map[r.criterion_id] = r.value));
  const graded = projCriteria.filter((c) => map[c.id] != null);
  if (!graded.length) return { exists: true, value: null, project: proj, criteria: projCriteria };
  const total = graded.reduce((a, c) => a + map[c.id], 0);
  const max = graded.length * 5;
  return {
    exists: true,
    value: round1((total / max) * 100),
    project: proj,
    criteria: projCriteria,
    partial: graded.length < projCriteria.length
  };
}

// Default weights match the original spec exactly. Language Portfolio
// defaults to 0% so adding it never changes existing grades on its own —
// it only counts once the teacher gives it a nonzero weight in Settings.
const DEFAULT_WEIGHTS_NO_PROJECT = { att: 0.3, tsk: 0.3, scr: 0.4, lp: 0, proj: 0 };
const DEFAULT_WEIGHTS_PROJECT = { att: 0.2, tsk: 0.2, scr: 0.3, lp: 0, proj: 0.3 };

export function gradeWeights(config, hasProject) {
  if (hasProject) {
    if (config && config.weight_attendance_project != null) {
      return {
        att: config.weight_attendance_project / 100,
        tsk: config.weight_tasks_project / 100,
        scr: config.weight_scores_project / 100,
        lp: (config.weight_language_portfolio_project ?? 0) / 100,
        proj: config.weight_project_project / 100
      };
    }
    return DEFAULT_WEIGHTS_PROJECT;
  }
  if (config && config.weight_attendance_no_project != null) {
    return {
      att: config.weight_attendance_no_project / 100,
      tsk: config.weight_tasks_no_project / 100,
      scr: config.weight_scores_no_project / 100,
      lp: (config.weight_language_portfolio_no_project ?? 0) / 100,
      proj: 0
    };
  }
  return DEFAULT_WEIGHTS_NO_PROJECT;
}

// Language Portfolio: one directly-entered percentage per student/period —
// simpler than Scores (no sub-skills) or Project (no rubric criteria).
export function languagePortfolioPct(languagePortfolio, studentId, group, period) {
  const rec = (languagePortfolio || []).find(
    (r) => r.student_id === studentId && r.group_name === group && r.period === period
  );
  return rec ? rec.value : null;
}

// The core Grades engine — dynamically decides which formula applies, and
// uses the teacher's configured weights (or the spec defaults if unset).
// A component with 0% weight is excluded entirely: it neither contributes
// to the score nor blocks the grade from being computed if it has no data.
export function computeGrade(data, studentId, group, period) {
  const { attendance, tasks, taskResults, scores, projects, criteria, projectResults, languagePortfolio, config } = data;
  const att = attendancePct(attendance, studentId, group, period);
  const tsk = taskPct(tasks, taskResults, studentId, group, period);
  const scr = scoresPct(scores, studentId, group, period);
  const lp = languagePortfolioPct(languagePortfolio, studentId, group, period);
  const proj = projectPct(projects, criteria, projectResults, studentId, group, period);
  const hasProject = proj.exists;
  const weights = gradeWeights(config, hasProject);
  const components = [
    ["att", att, weights.att],
    ["tsk", tsk, weights.tsk],
    ["scr", scr, weights.scr],
    ["lp", lp, weights.lp]
  ];
  if (hasProject) components.push(["proj", proj.value, weights.proj]);
  const parts = components.filter((c) => c[2] > 0);
  const missing = parts.filter((p) => p[1] == null).map((p) => p[0]);
  let final = null;
  if (!missing.length) {
    final = round1(parts.reduce((a, p) => a + p[1] * p[2], 0));
  }
  let medal = null;
  if (final != null) {
    medal = final >= 90 ? "gold" : final >= 75 ? "silver" : final >= 60 ? "bronze" : "sad";
  }
  return {
    attendance: att, tasks: tsk, scores: scr, languagePortfolio: lp, project: proj.value,
    hasProject, weights, final, medal, missing
  };
}

export function medalIcon(m) {
  return m === "gold" ? "🥇" : m === "silver" ? "🥈" : m === "bronze" ? "🥉" : m === "sad" ? "😢" : "—";
}
export function medalLabel(m) {
  return m === "gold" ? "Gold" : m === "silver" ? "Silver" : m === "bronze" ? "Bronze" : m === "sad" ? "Sad Face" : "N/A";
}
export function medalPillClass(m) {
  return m === "gold" ? "pillGold" : m === "silver" ? "pillSilver" : m === "bronze" ? "pillBronze" : m === "sad" ? "pillSad" : "pillNA";
}
export function fmtPct(v) {
  return v == null ? "—" : v + "%";
}
