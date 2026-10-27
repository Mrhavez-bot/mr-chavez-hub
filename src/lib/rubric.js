// Helpers for rubric level descriptors stored in project_criteria.levels:
// [{ label, from, to, descriptor }]

export function levelsOf(c) {
  if (!c || !Array.isArray(c.levels) || !c.levels.length) return null;
  const out = c.levels
    .map((x) => ({ label: x.label || "", from: Number(x.from), to: Number(x.to ?? x.from), descriptor: x.descriptor || "" }))
    .filter((x) => !isNaN(x.from) && !isNaN(x.to))
    .sort((a, b) => b.to - a.to || b.from - a.from);
  return out.length ? out : null;
}

export const rangeLabel = (l) => (l.from === l.to ? String(l.from) : `${l.from}–${l.to}`);

// whole-number scores available inside a level
export function scoreOptions(l) {
  const out = [];
  for (let n = Math.ceil(l.from); n <= Math.floor(l.to); n++) out.push(n);
  return out.length ? out : [l.from];
}

// the level that contains a given score (null if none)
export function bandOf(c, value) {
  const levels = levelsOf(c);
  if (!levels || value === "" || value == null) return null;
  const v = Number(value);
  return levels.find((l) => v >= l.from && v <= l.to) || null;
}

// text for tooltips: "4 Excellent: ...\n3 Good: ..."
export function levelsText(c) {
  const levels = levelsOf(c);
  if (!levels) return c && c.description ? c.description : "";
  return levels.map((l) => `${rangeLabel(l)}${l.label ? " " + l.label : ""}: ${l.descriptor}`).join("\n");
}
