import { useState } from "react";
import { askClaude } from "../lib/planners/claude";
import { readFileText, prepareAttachment, ATTACH_EXTS, TEXT_EXTS, extOf } from "../lib/readFileText";
import { rangeLabel } from "../lib/rubric";

// Paste or upload a rubric (text, Word, Excel, PDF or image) -> Claude turns it into
// criteria with points and level descriptors -> the teacher reviews -> onApply(criteria, replace)
export default function RubricImport({ hasCriteria, onApply, onClose }) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null);
  const [replace, setReplace] = useState(false);

  async function onFile(e) {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setErr(null);
    try {
      if (ATTACH_EXTS.includes(extOf(f.name))) { setAttachment(await prepareAttachment(f)); }
      else { setText(await readFileText(f)); setAttachment(null); }
    } catch (x) { setErr(x.message); }
  }
  async function run() {
    setErr(null); setRes(null);
    if (!attachment && text.trim().length < 20) { setErr("Pega el texto de tu rúbrica o carga un archivo primero."); return; }
    setBusy(true);
    try {
      const r = await askClaude("rubric", { text: text.slice(0, 20000), attachment: attachment ? { mediaType: attachment.mediaType, data: attachment.data } : undefined });
      if (!r.criteria || !r.criteria.length) throw new Error("No encontré criterios. Revisa que el archivo muestre la rúbrica completa.");
      setRes({ ...r, criteria: r.criteria.map((c) => ({ ...c, maxPoints: Number(c.maxPoints) || 5, levels: c.levels || [] })) });
    } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  const setCrit = (i, k, v) => setRes((r) => ({ ...r, criteria: r.criteria.map((c, j) => (j === i ? { ...c, [k]: v } : c)) }));
  const setLevel = (i, li, v) => setRes((r) => ({ ...r, criteria: r.criteria.map((c, j) => (j === i ? { ...c, levels: c.levels.map((l, k) => (k === li ? { ...l, descriptor: v } : l)) } : c)) }));
  const dropCrit = (i) => setRes((r) => ({ ...r, criteria: r.criteria.filter((_, j) => j !== i) }));

  async function apply() {
    const clean = res.criteria
      .filter((c) => c.name.trim() && Number(c.maxPoints) > 0)
      .map((c) => ({ name: c.name.trim(), maxPoints: Number(c.maxPoints), description: (c.reference || "").trim(), levels: (c.levels || []).filter((l) => l.descriptor && l.descriptor.trim()) }));
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
      <div className="small">Carga tu rúbrica en Word, Excel, PDF, foto o imagen, o pega el texto. Claude detecta los criterios, sus puntos y los descriptores de cada nivel; tú lo revisas antes de agregarlo.</div>
      <textarea rows={4} style={{ marginTop: 8 }} placeholder="Pega aquí tu rúbrica (opcional si cargas un archivo)…" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="row" style={{ marginTop: 8 }}>
        <input type="file" accept={[...TEXT_EXTS, ...ATTACH_EXTS].join(",")} onChange={onFile} style={{ flex: "none" }} />
        {attachment && <span className="pill pillNA">📎 {attachment.name} <button className="ghost" style={{ padding: "0 6px" }} onClick={() => setAttachment(null)}>✕</button></span>}
        <button className="teal" disabled={busy} onClick={run}>{busy && !res ? "Claude está leyendo…" : "✨ Generar criterios"}</button>
      </div>
      {err && <div className="banner err">{err}</div>}
      {res && (
        <div className="section">
          {res.scaleNote && <div className="banner warn">{res.scaleNote}</div>}
          <b>Revisa y ajusta</b>
          {res.criteria.map((c, i) => (
            <div className="att" key={i} style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <input value={c.name} onChange={(e) => setCrit(i, "name", e.target.value)} />
                {c.reference && <div className="small" style={{ marginTop: 4 }}>{c.reference}</div>}
                {c.levels.length > 0 && (
                  <details style={{ marginTop: 6 }}>
                    <summary className="small">Descriptores ({c.levels.length} niveles)</summary>
                    {c.levels.map((l, li) => (
                      <div key={li} style={{ marginTop: 6 }}>
                        <span className="small"><b>{rangeLabel({ from: Number(l.from), to: Number(l.to) })}</b> {l.label}</span>
                        <textarea rows={2} value={l.descriptor} onChange={(e) => setLevel(i, li, e.target.value)} />
                      </div>
                    ))}
                  </details>
                )}
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
