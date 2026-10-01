import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { attendanceApi } from "../lib/api";
import GroupPeriodPicker from "./GroupPeriodPicker";

function today() { return new Date().toISOString().slice(0, 10); }

export default function Attendance({ ui, setUi }) {
  const { students, attendance, reload } = useData();
  const [date, setDate] = useState(ui.attDate || today());
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);

  const [pending, setPending] = useState({}); // {studentId: status}
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  // Reload the working copy whenever the group/period/date changes, or
  // after this component's own save brings back fresh data.
  useEffect(() => {
    const map = {};
    attendance
      .filter((a) => a.group_name === g && a.period === p && a.date === date)
      .forEach((a) => (map[a.student_id] = a.status));
    setPending(map);
    setDirty(false);
    setMsg(null);
  }, [g, p, date, attendance]);

  // Warn before leaving the browser tab/page with unsaved changes.
  useEffect(() => {
    function handler(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function setLocal(sid, status) {
    setPending((prev) => ({ ...prev, [sid]: status }));
    setDirty(true);
  }
  function markAllPresentLocal() {
    const map = {};
    list.forEach((s) => (map[s.id] = "present"));
    setPending(map);
    setDirty(true);
  }
  async function save() {
    setSaving(true);
    setMsg(null);
    const rows = Object.entries(pending).map(([student_id, status]) => ({ student_id, group_name: g, period: p, date, status }));
    try {
      await attendanceApi.bulkUpsert(rows);
      setMsg({ type: "ok", text: "Asistencia guardada." });
      setDirty(false);
      reload();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setSaving(false);
  }

  const c = { present: 0, late: 0, absent: 0 };
  Object.values(pending).forEach((v) => { if (c[v] != null) c[v]++; });

  return (
    <div>
      <h2>Attendance</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="teal" onClick={markAllPresentLocal}>✓ Mark all present</button>
        <button className="primary" disabled={!dirty || saving} onClick={save}>
          {saving ? "Guardando…" : "💾 Guardar asistencia"}
        </button>
      </div>
      {dirty && <div className="banner warn">Tienes cambios sin guardar en esta pantalla.</div>}
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
      {list.length ? (
        <>
          <div className="stats">
            <div className="stat"><b style={{ color: "#2dd4bf" }}>{c.present}</b><span>Present</span></div>
            <div className="stat"><b style={{ color: "#ffc145" }}>{c.late}</b><span>Late</span></div>
            <div className="stat"><b style={{ color: "#ff6b6b" }}>{c.absent}</b><span>Absent</span></div>
          </div>
          {list.map((s) => {
            const v = pending[s.id];
            return (
              <div className="att" key={s.id}>
                <span>{s.name}</span>
                <div className="status">
                  <button className={v === "present" ? "sel" : ""} onClick={() => setLocal(s.id, "present")}>Present</button>
                  <button className={v === "late" ? "sel" : ""} onClick={() => setLocal(s.id, "late")}>Late</button>
                  <button className={v === "absent" ? "sel" : ""} onClick={() => setLocal(s.id, "absent")}>Absent</button>
                </div>
              </div>
            );
          })}
        </>
      ) : <div className="empty"><h3>No students in {g}</h3>Add students on the Students tab first.</div>}
    </div>
  );
}
