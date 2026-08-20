import { useState } from "react";
import { useData } from "../context/DataContext";
import { studentsApi } from "../lib/api";
import { GROUPS } from "../lib/constants";
import GroupTxPanel from "./GroupTxPanel";
import { exportStudentsExcel, importStudentsExcel } from "../lib/excel";

export default function Students({ ui, setUi }) {
  const data = useData();
  const { students, config, reload } = useData();
  const [newName, setNewName] = useState("");
  const [importMsg, setImportMsg] = useState(null);
  const currency = config?.currency_name || "Celtix";

  async function addStudent() {
    const n = newName.trim();
    if (!n) { alert("Enter a student's name."); return; }
    await studentsApi.create(n, ui.selectedGroup);
    setNewName("");
    reload();
  }
  async function removeStudent(id) {
    if (!confirm("Delete this student and ALL their records? This cannot be undone.")) return;
    await studentsApi.remove(id);
    reload();
  }
  async function renameStudent(s) {
    const n = prompt("Student name:", s.name);
    if (n === null) return;
    if (!n.trim()) { alert("Name cannot be empty."); return; }
    await studentsApi.rename(s.id, n.trim());
    reload();
  }
  async function moveStudent(id, group_name) {
    if (!group_name) return;
    await studentsApi.move(id, group_name);
    reload();
  }
  async function adjust(id, delta) {
    await studentsApi.adjustCoins(id, delta, "Manual adjustment");
    reload();
  }

  if (!ui.selectedGroup) {
    return (
      <div>
        <h2>Groups</h2>
        <div className="groupTiles">
          {GROUPS.map((g) => {
            const list = students.filter((s) => s.group_name === g);
            const coins = list.reduce((a, s) => a + s.coins, 0);
            return (
              <div className="groupTile" key={g} onClick={() => setUi({ ...ui, selectedGroup: g })}>
                <b>{g}</b>
                <div>{list.length} students</div>
                <div className="muted">{coins} {currency}</div>
              </div>
            );
          })}
        </div>
        <div className="section">
          <div className="row">
            <input type="file" accept=".xlsx,.xls" id="importFile" style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files[0];
                if (!f) return;
                setImportMsg({ type: "ok", text: "Reading file…" });
                try {
                  const res = await importStudentsExcel(f, students);
                  setImportMsg({ type: res.errors.length ? "warn" : "ok", text: `Imported ${res.added}. ${res.skipped} duplicate(s) skipped. ${res.errors.length ? res.errors.length + " row(s) had errors." : ""}` });
                  reload();
                } catch {
                  setImportMsg({ type: "err", text: "Could not read this file. Make sure it is a valid .xlsx file." });
                }
              }} />
            <button className="teal" onClick={() => document.getElementById("importFile").click()}>⬆ Import Students from Excel</button>
            <button className="teal" onClick={() => exportStudentsExcel(students)}>⬇ Export All Students to Excel</button>
          </div>
          {importMsg && <div className={"banner " + importMsg.type}>{importMsg.text}</div>}
          <div className="small">Import expects columns: Student Name, Group. Valid groups: {GROUPS.join(", ")}.</div>
        </div>
      </div>
    );
  }

  const g = ui.selectedGroup;
  const list = students.filter((s) => s.group_name === g && (!ui.search || s.name.toLowerCase().includes(ui.search.toLowerCase())));
  const total = students.filter((s) => s.group_name === g).reduce((a, s) => a + s.coins, 0);

  return (
    <div>
      <div className="row">
        <button className="ghost" onClick={() => setUi({ ...ui, selectedGroup: null })}>← All groups</button>
        <h2 style={{ margin: 0 }}>Group {g}</h2>
      </div>
      <div className="row">
        <input placeholder={`Add a student's name to ${g}`} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="primary" onClick={addStudent}>＋ Add student</button>
      </div>
      <GroupTxPanel defaultGroup={g} />
      <div className="row">
        <input placeholder={`Search in ${g}…`} value={ui.search} onChange={(e) => setUi({ ...ui, search: e.target.value })} />
      </div>
      {list.length ? (
        <>
          <div className="stats">
            <div className="stat"><b>{students.filter((s) => s.group_name === g).length}</b><span>Students</span></div>
            <div className="stat"><b>{total}</b><span>Total {currency}</span></div>
          </div>
          <div className="grid">
            {list.map((s) => (
              <div className="card" key={s.id}>
                <div className="name">{s.name}</div>
                <div className="muted">ID: {s.id.slice(0, 8)} · ¢ {s.coins}</div>
                {s.claimed ? <div className="small" style={{ color: "#2dd4bf" }}>Account linked</div> : <div className="small">Claim code: {s.claim_code}</div>}
                <div className="controls">
                  <button className="minus" onClick={() => adjust(s.id, -5)}>−5</button>
                  <button className="minus" onClick={() => adjust(s.id, -1)}>−1</button>
                  <button className="plus" onClick={() => adjust(s.id, 1)}>＋1</button>
                  <button className="plus" onClick={() => adjust(s.id, 5)}>＋5</button>
                </div>
                <div className="row" style={{ marginTop: 10, marginBottom: 0 }}>
                  <button className="ghost" style={{ flex: 1 }} onClick={() => renameStudent(s)}>✎ Rename</button>
                  <select style={{ flex: 1 }} onChange={(e) => moveStudent(s.id, e.target.value)} defaultValue="">
                    <option value="">Move to…</option>
                    {GROUPS.filter((x) => x !== g).map((x) => <option key={x} value={x}>{x}</option>)}
                  </select>
                </div>
                <div style={{ textAlign: "right", marginTop: 8 }}>
                  <button className="danger" onClick={() => removeStudent(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="empty"><h3>No students in {g} yet</h3>Add students above.</div>
      )}
    </div>
  );
}
