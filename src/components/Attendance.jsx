import { useState } from "react";
import { useData } from "../context/DataContext";
import { attendanceApi } from "../lib/api";
import GroupPeriodPicker from "./GroupPeriodPicker";

function today() { return new Date().toISOString().slice(0, 10); }

export default function Attendance({ ui, setUi }) {
  const { students, attendance, reload } = useData();
  const [date, setDate] = useState(ui.attDate || today());
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);
  const recMap = {};
  attendance.filter((a) => a.group_name === g && a.period === p && a.date === date).forEach((a) => (recMap[a.student_id] = a.status));
  const c = { present: 0, late: 0, absent: 0 };
  Object.values(recMap).forEach((v) => c[v]++);

  async function setAtt(sid, status) {
    await attendanceApi.upsert(sid, g, p, date, status);
    reload();
  }
  async function markAll() {
    await attendanceApi.markAllPresent(g, p, date, list.map((s) => s.id));
    reload();
  }

  return (
    <div>
      <h2>Attendance</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="row">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="teal" onClick={markAll}>✓ Mark all present</button>
      </div>
      {list.length ? (
        <>
          <div className="stats">
            <div className="stat"><b style={{ color: "#2dd4bf" }}>{c.present}</b><span>Present</span></div>
            <div className="stat"><b style={{ color: "#ffc145" }}>{c.late}</b><span>Late</span></div>
            <div className="stat"><b style={{ color: "#ff6b6b" }}>{c.absent}</b><span>Absent</span></div>
          </div>
          {list.map((s) => {
            const v = recMap[s.id];
            return (
              <div className="att" key={s.id}>
                <span>{s.name}</span>
                <div className="status">
                  <button className={v === "present" ? "sel" : ""} onClick={() => setAtt(s.id, "present")}>Present</button>
                  <button className={v === "late" ? "sel" : ""} onClick={() => setAtt(s.id, "late")}>Late</button>
                  <button className={v === "absent" ? "sel" : ""} onClick={() => setAtt(s.id, "absent")}>Absent</button>
                </div>
              </div>
            );
          })}
        </>
      ) : <div className="empty"><h3>No students in {g}</h3>Add students on the Students tab first.</div>}
    </div>
  );
}
