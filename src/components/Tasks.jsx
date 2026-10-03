import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { tasksApi } from "../lib/api";
import { TASK_STATUSES, TASK_PCT } from "../lib/constants";
import { saveDraft, loadDraft, clearDraft } from "../lib/draftStorage";
import GroupPeriodPicker from "./GroupPeriodPicker";

function round1(n) { return Math.round(n * 10) / 10; }

export default function Tasks({ ui, setUi }) {
  const data = useData();
  const { students, tasks, taskResults, refreshTasks } = data;
  const [title, setTitle] = useState("");
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const groupTasks = tasks.filter((t) => t.group_name === g && t.period === p);
  const draftKey = `tasks:${g}:${p}`;

  // pending[taskId][studentId] = status ("" means not set)
  const [pending, setPending] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const baseline = {};
    groupTasks.forEach((t) => {
      baseline[t.id] = {};
      list.forEach((s) => {
        const r = taskResults.find((x) => x.task_id === t.id && x.student_id === s.id);
        baseline[t.id][s.id] = r ? r.status : "";
      });
    });
    const draft = loadDraft(draftKey);
    if (draft) {
      const merged = {};
      groupTasks.forEach((t) => {
        merged[t.id] = { ...baseline[t.id], ...(draft[t.id] || {}) };
      });
      setPending(merged);
      setDirty(true);
      setMsg({ type: "warn", text: "Se recuperó un borrador sin guardar de esta sesión anterior." });
    } else {
      setPending(baseline);
      setDirty(false);
      setMsg(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, p, tasks, taskResults, students]);

  useEffect(() => {
    function handler(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function addTask() {
    if (!title.trim()) { alert("Enter a task title."); return; }
    if (dirty && !confirm("Tienes cambios sin guardar. ¿Agregar el task de todos modos? (tus cambios actuales se perderán)")) return;
    await tasksApi.create(title.trim(), g, p);
    setTitle("");
    refreshTasks();
  }
  async function removeTask(id) {
    if (!confirm("Delete this task and its results? This cannot be undone.")) return;
    await tasksApi.remove(id);
    refreshTasks();
  }
  function setLocal(taskId, studentId, status) {
    setPending((prev) => {
      const next = { ...prev, [taskId]: { ...prev[taskId], [studentId]: status } };
      saveDraft(draftKey, next);
      return next;
    });
    setDirty(true);
  }
  function liveCompletion(studentId) {
    const vals = groupTasks.map((t) => pending[t.id] && pending[t.id][studentId]).filter(Boolean);
    if (!vals.length) return null;
    const sum = vals.reduce((a, v) => a + (TASK_PCT[v] ?? 0), 0);
    return round1(sum / vals.length);
  }
  async function save() {
    setSaving(true);
    setMsg(null);
    const rows = [];
    Object.entries(pending).forEach(([taskId, byStudent]) => {
      Object.entries(byStudent).forEach(([studentId, status]) => {
        rows.push({ task_id: taskId, student_id: studentId, status });
      });
    });
    try {
      await tasksApi.bulkSetResults(rows);
      clearDraft(draftKey);
      setMsg({ type: "ok", text: "Tasks guardados." });
      setDirty(false);
      refreshTasks();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setSaving(false);
  }

  return (
    <div>
      <h2>Tasks</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="row">
        <input placeholder="New task / activity title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="primary" onClick={addTask}>＋ Add task</button>
        <button className="primary" disabled={!dirty || saving} onClick={save}>
          {saving ? "Guardando…" : "💾 Guardar tasks"}
        </button>
      </div>
      <div className="formula">
        Status → % mapping: {TASK_STATUSES.map(([n, v]) => `${n} = ${v}%`).join(" · ")}. Task Completion % es el
        promedio de los tasks evaluados para este grupo y periodo. Llena las columnas y da clic en "Guardar tasks".
      </div>
      {dirty && <div className="banner warn">Tienes cambios sin guardar en esta pantalla.</div>}
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
      {!list.length ? (
        <div className="empty"><h3>No students in {g}</h3>Add students on the Students tab first.</div>
      ) : !groupTasks.length ? (
        <div className="empty"><h3>No tasks yet for {g} · {p}</h3>Add one above.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <tbody>
              <tr>
                <th className="stickyCol">Student</th>
                {groupTasks.map((t) => (
                  <th key={t.id}>
                    {t.title}
                    <button className="danger" style={{ marginLeft: 6, padding: "2px 6px", fontSize: 11 }} onClick={() => removeTask(t.id)}>✕</button>
                  </th>
                ))}
                <th>Completion</th>
              </tr>
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="stickyCol">{s.name}</td>
                  {groupTasks.map((t) => (
                    <td key={t.id}>
                      <select
                        value={(pending[t.id] && pending[t.id][s.id]) || ""}
                        onChange={(e) => setLocal(t.id, s.id, e.target.value)}
                      >
                        <option value="">— not set —</option>
                        {TASK_STATUSES.map(([n]) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}
                  <td><b>{liveCompletion(s.id) == null ? "—" : liveCompletion(s.id) + "%"}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
