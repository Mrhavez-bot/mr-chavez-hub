import { useState } from "react";

// Row of "ask Claude" buttons. Each action: { key, label, run(overwrite, progress) -> message }
export default function ClaudeBar({ actions }) {
  const [busy, setBusy] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [msg, setMsg] = useState(null);

  async function go(a) {
    setBusy(a.key); setMsg(null);
    try {
      const text = await a.run(overwrite, (t) => setMsg({ type: "ok", text: t }));
      setMsg({ type: "ok", text });
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setBusy("");
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <b>✨ Claude te ayuda a completar</b>
      <div className="small" style={{ margin: "4px 0 10px" }}>
        Escribe primero tus datos (título, conceptos, temas y días). Claude solo llena los campos vacíos y todo queda editable.
      </div>
      <div className="row" style={{ marginBottom: 6 }}>
        {actions.map((a) => (
          <button key={a.key} className="teal" disabled={!!busy} onClick={() => go(a)}>
            {busy === a.key ? "Claude está escribiendo…" : a.label}
          </button>
        ))}
        <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" style={{ flex: "none", minWidth: 0, width: "auto" }} checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} />
          Reemplazar también lo que ya escribí
        </label>
      </div>
      {msg && <div className={"banner " + msg.type} style={{ marginBottom: 0 }}>{msg.text}</div>}
    </div>
  );
}
