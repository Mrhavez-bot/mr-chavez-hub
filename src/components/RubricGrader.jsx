import { levelsOf, rangeLabel, scoreOptions } from "../lib/rubric";

// The full rubric for one team (or student): pick a score right on the descriptors.
export default function RubricGrader({ rows, activeId, setActiveId, criteria, values, onChange, final, mode }) {
  const idx = rows.findIndex((r) => r.id === activeId);
  const active = rows[idx];
  const go = (d) => { const n = rows[(idx + d + rows.length) % rows.length]; if (n) setActiveId(n.id); };
  const maxOf = (c) => Number(c.max_points ?? 5);

  return (
    <div style={{ marginTop: 10 }}>
      <div className="row">
        <button className="ghost" onClick={() => go(-1)}>◀</button>
        <select value={activeId} onChange={(e) => setActiveId(e.target.value)}>
          {rows.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button className="ghost" onClick={() => go(1)}>▶</button>
        <div className="stat" style={{ padding: "6px 14px" }}><b style={{ fontSize: 18 }}>{final == null ? "Missing" : final + "%"}</b></div>
      </div>
      {active && active.sub && <div className="small" style={{ marginBottom: 8 }}>{mode === "team" ? "Integrantes: " : ""}{active.sub}</div>}

      {criteria.map((c) => {
        const levels = levelsOf(c);
        const cur = values[c.id];
        return (
          <div className="card" key={c.id} style={{ marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <div className="name">{c.name}</div>
                {c.description && <div className="small">{c.description}</div>}
              </div>
              <span style={{ color: "#ffc145", fontWeight: "bold" }}>{cur === "" || cur == null ? "—" : cur} / {maxOf(c)}</span>
              <button className="ghost" onClick={() => onChange(c.id, 0)}>0</button>
              <button className="ghost" onClick={() => onChange(c.id, "")}>Quitar</button>
            </div>
            {levels ? (
              <div className="rubGrid">
                {levels.map((l, i) => {
                  const sel = cur !== "" && cur != null && Number(cur) >= l.from && Number(cur) <= l.to;
                  return (
                    <div key={i} className={"rubCell" + (sel ? " on" : "")}>
                      <div className="small"><b>{rangeLabel(l)}</b> {l.label}</div>
                      <div className="rubText">{l.descriptor}</div>
                      <div className="rubBtns">
                        {scoreOptions(l).map((n) => (
                          <button key={n} className={Number(cur) === n && cur !== "" ? "on" : ""} onClick={() => onChange(c.id, n)}>{n}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="row" style={{ marginBottom: 0 }}>
                <span className="small">Este criterio no tiene descriptores; escribe el puntaje.</span>
                <input type="number" min="0" max={maxOf(c)} step="0.5" style={{ width: 80, minWidth: 0, flex: "none" }} value={cur ?? ""} onChange={(e) => onChange(c.id, e.target.value)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
