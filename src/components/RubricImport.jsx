import { useState } from "react";
import { askClaude } from "../lib/planners/claude";
import { readFileText } from "../lib/readFileText";

// Paste or upload a rubric -> Claude turns it into criteria with point values ->
// the teacher reviews/edits -> onApply(criteria, replace)
export default function RubricImport({ hasCriteria, onApply, onClose }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null); // { criteria:[{name,maxPoints,description}], scaleNote }
  const [replace, setReplace] = useState(false);

  async function onFile(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    try { setText(await readFileText(f)); } catch (x) { setErr(x.message); }
  }
  async function run() {
    setErr(null); setRes(null);
    if (text.trim().length < 20) { setErr("Pega o carga el texto de tu rúbrica primero."); return; }
    setBusy(true);
    try {
      const r = await askClaude("rubric", { text: text.slice(0, 20000) });
      if (!r.criteria || !r.criteria.length) throw new Error("No encontré criterios en ese texto. Revisa que incluya la rúbrica completa.");
      setRes({ ...r, criteria: r.criteria.map((c) => ({ ...c, maxPoints: Number(c.maxPoints) || 5 })) });
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  const setCrit = (i, k, v) => setRes((r) => ({ ...r, criteria: r.criteria.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));
  const dropCrit = (i) => setRes((r) => ({ ...r, criteria: r.criteria.filter((_, j) => j !== i) }));

  async function apply() {
    const clean = res.criteria.filter((c) => c.name.trim() && Number(c.maxPoints) > 0);
    if (!clean.length) { setErr("No quedó ningún criterio válido."); return; }
    setBusy(true); setErr(null);
    try { await onApply(clean, replace); } catch (x) { setErr(x.message); setBusy(false); }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row" style={{ marginBottom: 6 }}>
        <b style={{ flex: 1 }}>✨ Cargar la rúbrica con Claude</b>
        <button className="ghost" onClick={onClose}>Cerrar</button>
      </div>
      <div className="small">Pega el texto de tu rúbrica o carga un archivo Word (.docx) o .txt. Claude detecta los criterios y cuánto vale cada uno; tú lo revisas antes de agregarlo.</div>
      <textarea rows={6} style={{ marginTop: 8 }} placeholder="Pega aquí tu rúbrica…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row" style={{ marginTop: 8 }}>
        <input type="file" accept=".docx,.txt" onChange={onFile} style={{ flex: "none" }} />
        <button className="teal" disabled={busy} onClick={run}>{busy && !res ? "Claude está leyendo…" : "✨ Generar criterios"}</button>
      </div>
      {err && <div className="banner err">{err}</div>}
      {res && (
        <div className="section">
          {res.scaleNote && <div className="banner warn">{res.scaleNote}</div>}
          <b>Revisa y ajusta</b>
          {res.criteria.map((c, i) => (
            <div className="att" key={i} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <input value={c.name} onChange={(e) => setCrit(i, "name", e.target.value)} />
                <div className="small" style={{ marginTop: 4 }}>{c.description}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="number" min="0.5" step="0.5" style={{ width: 80, minWidth: 0, flex: "none" }} value={c.maxPoints} onChange={(e) => setCrit(i, "maxPoints", e.target.value)} />
                <span className="small">pts</span>
                <button className="danger" onClick={() => dropCrit(i)}>✕</button>
              </div>
            </div>
          ))}
          <div className="small">Total: {res.criteria.reduce((a, c) => a + (Number(c.maxPoints) || 0), 0)} puntos</div>
          {hasCriteria && (
            <label className="small" style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
              <input type="checkbox" style={{ flex: "none", minWidth: 0, width: "auto" }} checked={replace} onChange={(e) => setReplace(e.target.checked)} />
              Reemplazar los criterios actuales (se borran sus calificaciones)
            </label>
          )}
          <div style={{ marginTop: 10 }}><button className="primary" disabled={busy} onClick={apply}>{busy ? "Agregando…" : "＋ Agregar al proyecto"}</button></div>
        </div>
      )}
    </div>
  );
}
