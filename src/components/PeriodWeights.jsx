import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { periodWeightsApi, extraApi } from "../lib/api";
import { PERIODS, GROUPS } from "../lib/constants";
import { generalWeightSets } from "../lib/calc";

const BASE = [["att", "Attendance"], ["tsk", "Tasks"], ["scr", "Exam"], ["lp", "Language Portfolio"]];
const toStr = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v ?? 0)]));

export default function PeriodWeights() {
  const { config, periodWeights, extraCriteria, refreshPeriodWeights, refreshExtras } = useData();
  const [period, setPeriod] = useState(PERIODS[0]);
  const [noProj, setNoProj] = useState({});
  const [withProj, setWithProj] = useState({});
  const [msg, setMsg] = useState(null);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState("100");
  const [newGroup, setNewGroup] = useState("");
  const [copyFrom, setCopyFrom] = useState("");

  const row = periodWeights.find((r) => r.period === period);
  const own = !!(row && Object.keys(row.no_project || {}).length);
  const extras = extraCriteria.filter((c) => c.period === period);
  const general = generalWeightSets(config);

  useEffect(() => {
    setNoProj(toStr({ ...general.no_project, ...(own ? row.no_project : {}) }));
    setWithProj(toStr({ ...general.with_project, ...(own ? row.with_project : {}) }));
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, periodWeights, config]);

  const keysNo = [...BASE.map(([k]) => k), ...extras.map((c) => "x_" + c.id)];
  const keysWith = [...keysNo, "proj"];
  const sum = (o, keys) => keys.reduce((a, k) => a + (Number(o[k]) || 0), 0);
  const sumNo = sum(noProj, keysNo), sumWith = sum(withProj, keysWith);
  const pick = (o, keys) => Object.fromEntries(keys.map((k) => [k, Number(o[k]) || 0]));

  async function save() {
    const all = [...Object.values(pick(noProj, keysNo)), ...Object.values(pick(withProj, keysWith))];
    if (all.some((n) => n < 0)) { setMsg({ type: "err", text: "Los porcentajes no pueden ser negativos." }); return; }
    if (Math.round(sumNo * 100) !== 10000) { setMsg({ type: "err", text: `Sin proyecto suma ${sumNo}%, debe sumar 100%.` }); return; }
    if (Math.round(sumWith * 100) !== 10000) { setMsg({ type: "err", text: `Con proyecto suma ${sumWith}%, debe sumar 100%.` }); return; }
    try {
      await periodWeightsApi.save(period, pick(noProj, keysNo), pick(withProj, keysWith));
      await refreshPeriodWeights();
      setMsg({ type: "ok", text: `Ponderaciones de ${period} guardadas. Se aplican de inmediato.` });
    } catch (e) { setMsg({ type: "err", text: e.message }); }
  }
  async function reset() {
    if (!confirm(`¿Regresar ${period} a las ponderaciones generales?`)) return;
    try { await periodWeightsApi.remove(period); await refreshPeriodWeights(); setMsg({ type: "ok", text: `${period} vuelve a usar las ponderaciones generales.` }); }
    catch (e) { setMsg({ type: "err", text: e.message }); }
  }
  function copy() {
    const src = periodWeights.find((r) => r.period === copyFrom);
    if (!src) return;
    const upd = (cur, from) => ({ ...cur, ...toStr(Object.fromEntries(["att", "tsk", "scr", "lp", "proj"].filter((k) => k in from).map((k) => [k, from[k]]))) });
    setNoProj((cur) => upd(cur, src.no_project));
    setWithProj((cur) => upd(cur, src.with_project));
    setMsg({ type: "warn", text: `Se copiaron los porcentajes base de ${copyFrom}. Ajusta los criterios extra y guarda.` });
  }

  async function addExtra() {
    const max = Number(newMax);
    if (!newName.trim()) { alert("Escribe el nombre del criterio."); return; }
    if (!(max > 0)) { alert("El valor máximo debe ser mayor que 0."); return; }
    try {
      await extraApi.createCriterion(period, newName.trim(), max, newGroup);
      setNewName("");
      await refreshExtras();
      setMsg({ type: "warn", text: "Criterio creado con 0%. Dale su porcentaje abajo y guarda para que cuente." });
    } catch (e) { setMsg({ type: "err", text: e.message }); }
  }
  async function saveExtra(c, fields) {
    if ("name" in fields && !fields.name.trim()) { refreshExtras(); return; }
    if ("max_points" in fields && !(fields.max_points > 0)) { refreshExtras(); return; }
    try { await extraApi.updateCriterion(c.id, fields); await refreshExtras(); } catch (e) { setMsg({ type: "err", text: e.message }); }
  }
  async function removeExtra(c) {
    if (!confirm(`¿Borrar el criterio «${c.name}» y sus calificaciones?`)) return;
    try { await extraApi.removeCriterion(c.id); await refreshExtras(); } catch (e) { setMsg({ type: "err", text: e.message }); }
  }

  const input = (state, setState, k) => (
    <input type="number" min="0" step="1" style={{ width: 80, minWidth: 0, flex: "none" }} value={state[k] ?? "0"} onChange={(e) => setState((s) => ({ ...s, [k]: e.target.value }))} />
  );
  const sumBadge = (n) => <span className={"pill " + (Math.round(n * 100) === 10000 ? "pillGold" : "pillSad")}>Suma {n}%</span>;
  const withPeriods = periodWeights.filter((r) => r.period !== period && Object.keys(r.no_project || {}).length);

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <b>Ponderaciones por periodo y criterios extra</b>
      <div className="small" style={{ marginTop: 6 }}>
        Cada periodo puede pesar distinto. Si un periodo no tiene ponderaciones propias, usa las generales de arriba. Aquí también puedes agregar criterios extra (por ejemplo Participation) y darles su porcentaje; se capturan en la pestaña Extras.
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className={"pill " + (own ? "pillGold" : "pillNA")}>{own ? "Ponderaciones propias" : "Usa las generales"}</span>
        {withPeriods.length > 0 && (
          <>
            <select value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
              <option value="">Copiar de…</option>
              {withPeriods.map((r) => <option key={r.period} value={r.period}>{r.period}</option>)}
            </select>
            <button className="ghost" disabled={!copyFrom} onClick={copy}>Copiar</button>
          </>
        )}
      </div>

      <div className="section">
        <b>Criterios extra de {period}</b>
        {extras.length === 0 && <div className="muted" style={{ marginTop: 6 }}>Todavía no hay criterios extra en este periodo.</div>}
        {extras.map((c) => (
          <div className="att" key={`${c.id}-${c.name}-${c.max_points}-${c.group_name}`}>
            <input defaultValue={c.name} style={{ flex: 2, minWidth: 140 }} onBlur={(e) => e.target.value.trim() !== c.name && saveExtra(c, { name: e.target.value.trim() })} />
            <select style={{ maxWidth: 160 }} value={c.group_name || ""} onChange={(e) => saveExtra(c, { group_name: e.target.value || null })}>
              <option value="">Todos los grupos</option>
              {GROUPS.map((g) => <option key={g} value={g}>Solo {g}</option>)}
            </select>
            <span className="small">máx.</span>
            <input type="number" min="1" step="1" style={{ width: 80, minWidth: 0, flex: "none" }} defaultValue={Number(c.max_points)} onBlur={(e) => Number(e.target.value) !== Number(c.max_points) && saveExtra(c, { max_points: Number(e.target.value) })} />
            <button className="danger" onClick={() => removeExtra(c)}>✕</button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <input placeholder="Nuevo criterio (ej. Participation)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <select style={{ maxWidth: 170 }} value={newGroup} onChange={(e) => setNewGroup(e.target.value)}>
            <option value="">Todos los grupos</option>
            {GROUPS.map((g) => <option key={g} value={g}>Solo {g}</option>)}
          </select>
          <span className="small">máx.</span>
          <input type="number" min="1" step="1" style={{ width: 80, minWidth: 0, flex: "none" }} value={newMax} onChange={(e) => setNewMax(e.target.value)} />
          <button className="teal" onClick={addExtra}>＋ Agregar</button>
        </div>
        <div className="small">Un criterio de un solo grupo no cuenta para los demás: su porcentaje se reparte proporcionalmente entre el resto.</div>
      </div>

      <div className="section">
        <div className="row" style={{ marginBottom: 6 }}><b style={{ flex: 1 }}>SIN proyecto</b>{sumBadge(sumNo)}</div>
        {BASE.map(([k, label]) => <div className="att" key={k}><span>{label}</span><span>{input(noProj, setNoProj, k)} %</span></div>)}
        {extras.map((c) => <div className="att" key={c.id}><span>{c.name}{c.group_name ? ` (solo ${c.group_name})` : ""}</span><span>{input(noProj, setNoProj, "x_" + c.id)} %</span></div>)}
      </div>
      <div className="section">
        <div className="row" style={{ marginBottom: 6 }}><b style={{ flex: 1 }}>CON proyecto</b>{sumBadge(sumWith)}</div>
        {BASE.map(([k, label]) => <div className="att" key={k}><span>{label}</span><span>{input(withProj, setWithProj, k)} %</span></div>)}
        {extras.map((c) => <div className="att" key={c.id}><span>{c.name}{c.group_name ? ` (solo ${c.group_name})` : ""}</span><span>{input(withProj, setWithProj, "x_" + c.id)} %</span></div>)}
        <div className="att"><span>Project</span><span>{input(withProj, setWithProj, "proj")} %</span></div>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <button className="primary" onClick={save}>Guardar ponderaciones de {period}</button>
        {own && <button className="ghost" onClick={reset}>Usar las generales</button>}
      </div>
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
    </div>
  );
}
