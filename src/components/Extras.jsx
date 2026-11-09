import { useEffect, useRef, useState } from "react";
import { useData } from "../context/DataContext";
import { extraApi } from "../lib/api";
import { resolveWeights, projectForGroupPeriod } from "../lib/calc";
import { saveDraft, loadDraft, clearDraft } from "../lib/draftStorage";
import GroupPeriodPicker from "./GroupPeriodPicker";

const norm = (v) => (v === "" || v == null ? "" : Number(v));

export default function Extras({ ui, setUi }) {
  const data = useData();
  const { students, extraCriteria, extraResults, projects, refreshExtras } = data;
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const crits = extraCriteria.filter((c) => c.period === p && (c.group_name == null || c.group_name === g));
  const w = resolveWeights(data, g, p, !!projectForGroupPeriod(projects, g, p));
  const draftKey = `extras:${g}:${p}`;

  const [name, setName] = useState("");
  const [max, setMax] = useState("100");
  const [onlyThis, setOnlyThis] = useState(false);
  const [pending, setPending] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const baselineRef = useRef({});

  useEffect(() => {
    const baseline = {};
    list.forEach((s) => {
      baseline[s.id] = {};
      crits.forEach((c) => {
        const r = extraResults.find((x) => x.criterion_id === c.id && x.student_id === s.id);
        baseline[s.id][c.id] = r ? Number(r.value) : "";
      });
    });
    baselineRef.current = baseline;
    const draft = loadDraft(draftKey);
    if (draft) {
      const merged = {};
      list.forEach((s) => { merged[s.id] = { ...baseline[s.id], ...(draft[s.id] || {}) }; });
      setPending(merged); setDirty(true);
      setMsg({ type: "warn", text: "Se recuperó un borrador sin guardar de esta sesión anterior." });
    } else { setPending(baseline); setDirty(false); setMsg(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, p, extraCriteria, extraResults, students]);

  useEffect(() => {
    function handler(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function addCriterion() {
    const m = Number(max);
    if (!name.trim()) { alert("Escribe el nombre del criterio."); return; }
    if (!(m > 0)) { alert("El valor máximo debe ser mayor que 0."); return; }
    if (dirty && !confirm("Tienes cambios sin guardar. ¿Agregar el criterio de todos modos?")) return;
    try {
      await extraApi.createCriterion(p, name.trim(), m, onlyThis ? g : null);
      setName("");
      await refreshExtras();
    } catch (e) { setMsg({ type: "err", text: e.message }); }
  }
  function setLocal(sid, cid, value) {
    setPending((prev) => {
      const next = { ...prev, [sid]: { ...prev[sid], [cid]: value } };
      saveDraft(draftKey, next);
      return next;
    });
    setDirty(true);
  }
  async function save() {
    setSaving(true); setMsg(null);
    try {
      const rows = [];
      Object.entries(pending).forEach(([sid, byCrit]) => {
        Object.entries(byCrit).forEach(([cid, value]) => {
          if (norm(value) === norm((baselineRef.current[sid] || {})[cid])) return;
          const c = crits.find((x) => x.id === cid);
          if (value !== "") {
            const n = Number(value);
            if (!c || isNaN(n) || n < 0 || n > Number(c.max_points)) {
              const who = (students.find((s) => s.id === sid) || {}).name;
              throw new Error(`El valor de «${c ? c.name : "criterio"}» para «${who}» debe estar entre 0 y ${c ? Number(c.max_points) : "?"}.`);
            }
          }
          rows.push({ criterion_id: cid, student_id: sid, value: value === "" ? null : value });
        });
      });
      if (!rows.length) { clearDraft(draftKey); setMsg({ type: "ok", text: "No había cambios nuevos que guardar." }); setDirty(false); }
      else {
        await extraApi.bulkSetResults(rows);
        clearDraft(draftKey);
        setMsg({ type: "ok", text: "Criterios extra guardados." });
        setDirty(false);
        refreshExtras();
      }
    } catch (e) { setMsg({ type: "err", text: e.message }); }
    setSaving(false);
  }
  const pctOf = (n) => Math.round((n || 0) * 1000) / 10;

  return (
    <div>
      <h2>Extras</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="formula">
        Criterios extra de {g} · {p}. Captura los puntos de cada alumno; el porcentaje se calcula contra el valor máximo de cada criterio.
        {w.custom ? " Su peso en la calificación sale de las ponderaciones de este periodo." : " Para que cuenten en la calificación, asigna su peso en Settings → Ponderaciones por periodo."}
      </div>
      <div className="row">
        <input placeholder="Nuevo criterio (ej. Participation)" value={name} onChange={(e) => setName(e.target.value)} />
        <span className="small">máx.</span>
        <input type="number" min="1" step="1" style={{ width: 80, minWidth: 0, flex: "none" }} value={max} onChange={(e) => setMax(e.target.value)} />
        <label className="small" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" style={{ flex: "none", minWidth: 0, width: "auto" }} checked={onlyThis} onChange={(e) => setOnlyThis(e.target.checked)} />Solo {g}
        </label>
        <button className="teal" onClick={addCriterion}>＋ Agregar criterio</button>
        <button className="primary" disabled={!dirty || saving || !crits.length} onClick={save}>{saving ? "Guardando…" : "💾 Guardar extras"}</button>
      </div>
      {dirty && <div className="banner warn">Tienes cambios sin guardar en esta pantalla.</div>}
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
      {!list.length ? <div className="empty"><h3>No students in {g}</h3></div>
        : !crits.length ? <div className="empty"><h3>No hay criterios extra para {g} · {p}</h3>Agrégalos arriba.</div>
        : (
          <div style={{ overflowX: "auto" }}>
            <table><tbody>
              <tr>
                <th className="stickyCol">Student</th>
                {crits.map((c) => (
                  <th key={c.id}>{c.name} <span className="muted">(/{Number(c.max_points)})</span>
                    <div className="small">{w.custom ? `Peso: ${pctOf(w.extras[c.id])}%` : "Sin peso"}</div>
                  </th>
                ))}
              </tr>
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="stickyCol">{s.name}</td>
                  {crits.map((c) => (
                    <td key={c.id}>
                      <input type="number" min="0" max={Number(c.max_points)} step="0.5" placeholder="—" style={{ width: 80, minWidth: 0, flex: "none" }}
                        value={(pending[s.id] && pending[s.id][c.id]) ?? ""} onChange={(e) => setLocal(s.id, c.id, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody></table>
          </div>
        )}
    </div>
  );
}
