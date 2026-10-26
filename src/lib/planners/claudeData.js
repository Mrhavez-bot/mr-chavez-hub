// Pure helpers: build what we send to Claude and merge what comes back.
import { mondayOf, dayName, LEARNER_ATTRS, ATL_GROUPS, WEEK_FIELDS } from "./plannerData";

export const blank = (v) => v == null || String(v).trim() === "";
export const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

export function daysPayload(plan, dates = Object.keys(plan.days).sort()) {
  return dates.map((d) => ({ date: d, weekday: dayName(d), monday: mondayOf(d), topic: plan.days[d].topic || "", weekTopic: plan.weekTopics ? plan.weekTopics[mondayOf(d)] || "" : "" }));
}

// days that still need text (or all of them when overwriting)
export function pendingDays(plan, fields, overwrite) {
  return Object.keys(plan.days).sort().filter((d) => overwrite || fields.some((k) => blank(plan.days[d][k])));
}

const related = (plan) => [...(plan.relatedConcepts || []), plan.otherRelated].filter(Boolean);

export function soiPayload(plan) {
  return {
    unitTitle: plan.unitTitle, keyConcept: plan.keyConcept, relatedConcepts: related(plan),
    globalContext: plan.globalContext, exploration: plan.exploration,
    soi: blank(plan.soi) ? "(empty: propose three options from scratch)" : plan.soi,
    topics: [...Object.values(plan.weekTopics || {}), ...Object.values(plan.days).map((d) => d.topic)].filter(Boolean)
  };
}

export function unit10Payload(plan) {
  return {
    unitTitle: plan.unitTitle, period: plan.period, gradeGroup: plan.gradeGroup, mypYear: plan.mypYear, phase: plan.phase,
    keyConcept: plan.keyConcept, relatedConcepts: related(plan), globalContext: plan.globalContext, exploration: plan.exploration,
    statementOfInquiry: plan.soi, summativeAssessment: plan.summative, priorReflection: plan.reflectionPrior,
    days: daysPayload(plan)
  };
}

export function sessions10Payload(plan, dates, previous = []) {
  return {
    unitTitle: plan.unitTitle, phase: plan.phase, keyConcept: plan.keyConcept, relatedConcepts: related(plan),
    statementOfInquiry: plan.soi, summativeAssessment: plan.summative,
    objectives: { A: plan.objA, B: plan.objB, C: plan.objC, D: plan.objD },
    allDaysOfTheUnit: Object.keys(plan.days).sort(),
    previousSessions: previous,
    days: daysPayload(plan, dates)
  };
}

export function popPayload(plan, dates, previous = []) {
  return {
    grade: plan.grade, unitTitle: plan.unitTitle, purpose: plan.purpose, centralIdea: plan.centralIdea, period: plan.period,
    summativeAssessment: plan.summative,
    learnerProfile: LEARNER_ATTRS.filter(([k]) => !blank(plan.attrs[k])).map(([k, label]) => ({ attribute: label, how: plan.attrs[k] })),
    approachesToLearning: ATL_GROUPS.flatMap(([skill, items]) => items.filter(([k]) => !blank(plan.atl[k])).map(([k, label]) => ({ skill, indicator: label, how: plan.atl[k] }))),
    allDaysOfTheUnit: Object.keys(plan.days).sort(),
    previousSessions: previous,
    days: daysPayload(plan, dates)
  };
}

const put = (cur, val, overwrite) => (typeof val === "string" && val.trim() && (overwrite || blank(cur)) ? val.trim() : cur);

export function applyUnit10(plan, r, overwrite) {
  const next = { ...plan, weekTopics: { ...plan.weekTopics } };
  ["objA", "objB", "objC", "objD", "iqFactual", "iqConceptual", "iqDebatable", "atl", "compGen", "compBasica", "compExtendida", "formative", "differentiation", "resources"]
    .forEach((k) => { next[k] = put(plan[k], r[k], overwrite); });
  (r.weekTopics || []).forEach((w) => { if (w && w.monday) next.weekTopics[w.monday] = put(plan.weekTopics[w.monday], w.topic, overwrite); });
  return next;
}

function applySessions(plan, r, fields, overwrite) {
  const days = { ...plan.days };
  (r.sessions || []).forEach((s) => {
    const cur = days[s.date];
    if (!cur) return;
    const upd = { ...cur };
    fields.forEach((k) => { upd[k] = put(cur[k], s[k], overwrite); });
    days[s.date] = upd;
  });
  return { ...plan, days };
}
export const SESSION_FIELDS_10 = ["objective", "opening", "ts", "le", "closing"];
export const SESSION_FIELDS_POP = ["name", "objective", "dev"];
export const applySessions10 = (plan, r, overwrite) => applySessions(plan, r, SESSION_FIELDS_10, overwrite);
export const applySessionsPOP = (plan, r, overwrite) => applySessions(plan, r, SESSION_FIELDS_POP, overwrite);

export function applyWeeksPOP(plan, r, overwrite) {
  const weekFields = { ...plan.weekFields };
  (r.weeks || []).forEach((w) => {
    if (!w || !w.monday) return;
    const cur = weekFields[w.monday] || {};
    const upd = { ...cur };
    WEEK_FIELDS.forEach(([k]) => { upd[k] = put(cur[k], w[k], overwrite); });
    weekFields[w.monday] = upd;
  });
  const next = { ...plan, weekFields };
  ["linkLang", "linkHPP", "linkAS", "linkOther"].forEach((k) => { next[k] = put(plan[k], r[k], overwrite); });
  return next;
}
