import { useState } from "react";
import { useData } from "../context/DataContext";
import { tasksApi } from "../lib/api";
import { TASK_STATUSES } from "../lib/constants";
import { taskPct, fmtPct } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

export default function Tasks({ ui, setUi }) {
  const data = useData();
  const { students, tasks, taskResults, reload } = data;
  const [title, setTitle] = useState("");
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const groupTasks = tasks.filter((t) => t.group_name === g && t.period === p);

  async function addTask() {
    if (!title.trim()) { alert("Enter a task title."); return; }
    await tasksApi.create(title.trim(), g, p);
    setTitle("");
    reload();
  }
  async function removeTask(id) {
    if (!confirm("Delete this task and its results? This cannot be undone.")) return;
    await tasksApi.remove(id);
    reload();
  }
  async function setResult(taskId, studentId, status) {
    await tasksApi.setResult(taskId, studentId, status || null);
    reload();
  }

  return (
    <div>
      <h2>Tasks</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="row">
        <input placeholder="New task / activity title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="primary" onClick={addTask}>＋ Add task</button>
      </div>
      <div className="formula">
        Status → % mapping: {TASK_STATUSES.map(([n, v]) => `${n} = ${v}%`).join(" · ")}. Task Completion % is the average across all evaluated tasks for the selected group and period.
      </div>
      {!list.length ? (
        <div className="empty"><h3>No students in {g}</h3>Add students on the Students tab first.</div>
      ) : !groupTasks.length ? (
        <div className="empty"><h3>No tasks yet for {g} · {p}</h3>Add one above.</div>
      ) : (
        <div className="grid">
          {groupTasks.map((t) => (
            <div className="card" key={t.id}>
              <div className="name">{t.title}</div>
              <div className="muted">{t.created_at?.slice(0, 10)}</div>
              {list.map((s) => {
                const r = taskResults.find((x) => x.task_id === t.id && x.student_id === s.id);
                return (
                  <div className="att" key={s.id}>
                    <span>{s.name}</span>
                    <select style={{ maxWidth: 170 }} value={r ? r.status : ""} onChange={(e) => setResult(t.id, s.id, e.target.value)}>
                      <option value="">— not set —</option>
                      {TASK_STATUSES.map(([n]) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                );
              })}
              <div style={{ textAlign: "right", marginTop: 8 }}>
                <button className="danger" onClick={() => removeTask(t.id)}>Delete task</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!!list.length && (
        <div className="section">
          <b>Task Completion % — {g} · {p}</b>
          <table>
            <tbody>
              <tr><th>Student</th><th>Completion</th></tr>
              {list.map((s) => (
                <tr key={s.id}><td>{s.name}</td><td>{fmtPct(taskPct(tasks, taskResults, s.id, g, p))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
