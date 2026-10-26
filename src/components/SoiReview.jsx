import { useState } from "react";
import { askClaude } from "../lib/planners/claude";

export default function SoiReview({ getPayload, onUse }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);

  async function run() {
    setBusy(true); setErr(null);
    try {
      const payload = getPayload();
      if (!payload.unitTitle || !String(payload.unitTitle).trim()) throw new Error("Escribe primero el título de la unidad.");
      setRes(await askClaude("soi_review", payload));
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 8 }}>
      <button className="teal" disabled={busy} onClick={run}>{busy ? "Revisando…" : "✨ Revisar con Claude"}</button>
      {err && <div className="banner err" style={{ marginTop: 8 }}>{err}</div>}
      {res && (
        <div className="card" style={{ marginTop: 10 }}>
          <div>{res.verdict}</div>
          <div style={{ marginTop: 8 }}>
            {res.checks.map((c, i) => (
              <div className="small" key={i} style={{ marginBottom: 3 }}>{c.ok ? "✅" : "⚠️"} <b>{c.criterion}:</b> {c.comment}</div>
            ))}
          </div>
          <b style={{ display: "block", marginTop: 10 }}>Sugerencias</b>
          {res.suggestions.map((s, i) => (
            <div className="att" key={i}><span>{s}</span><button className="teal" onClick={() => onUse(s)}>Usar</button></div>
          ))}
        </div>
      )}
    </div>
  );
}
