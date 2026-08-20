import { useState } from "react";
import { useData } from "../context/DataContext";
import { studentsApi } from "../lib/api";
import { GROUPS } from "../lib/constants";

export default function GroupTxPanel({ defaultGroup }) {
  const { config, students, reload } = useData();
  const currency = config?.currency_name || "Celtix";
  const [group, setGroup] = useState(defaultGroup || GROUPS[0]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("add");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState(null);

  async function apply() {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setMsg({ type: "err", text: "Enter a positive amount." }); return; }
    const count = students.filter((s) => s.group_name === group).length;
    if (!count) { setMsg({ type: "err", text: `No students in ${group}.` }); return; }
    if (!confirm(`Apply ${type === "add" ? "+" : "-"}${amt} ${currency} to all ${count} students in ${group}?`)) return;
    await studentsApi.applyToGroup(group, amt, type, reason || "Group transaction");
    setMsg({ type: "ok", text: `Applied to ${count} students in ${group}.` });
    reload();
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <b>Assign {currency} to the whole group</b>
      <div className="row" style={{ marginTop: 10 }}>
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <input type="number" placeholder="Amount (e.g. 10)" style={{ maxWidth: 140 }} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <select style={{ maxWidth: 110 }} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="add">Add</option>
          <option value="subtract">Subtract</option>
        </select>
        <input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="primary" onClick={apply}>Apply</button>
      </div>
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
    </div>
  );
}
