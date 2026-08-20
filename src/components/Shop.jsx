import { useState } from "react";
import { useData } from "../context/DataContext";
import { rewardsApi } from "../lib/api";

export default function Shop() {
  const { students, rewards, purchases, config, reload } = useData();
  const currency = config?.currency_name || "Celtix";
  const [redeemStudent, setRedeemStudent] = useState("");
  const [rewardName, setRewardName] = useState("");
  const [rewardCost, setRewardCost] = useState(10);
  const [msg, setMsg] = useState(null);

  const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));

  async function redeem(reward) {
    const s = students.find((x) => x.id === redeemStudent);
    if (!s) { setMsg({ type: "err", text: "Pick a student first." }); return; }
    if (!reward.active) { setMsg({ type: "err", text: "This reward is inactive." }); return; }
    if (s.coins < reward.cost) { setMsg({ type: "err", text: `${s.name} needs ${reward.cost - s.coins} more ${currency}.` }); return; }
    await rewardsApi.redeemAsTeacher(s.id, reward);
    setMsg({ type: "ok", text: `${s.name} redeemed "${reward.name}".` });
    reload();
  }
  async function addReward() {
    if (!rewardName.trim()) { alert("Enter a reward name."); return; }
    if (!(rewardCost > 0)) { alert("Cost must be a positive number."); return; }
    await rewardsApi.create(rewardName.trim(), Number(rewardCost));
    setRewardName(""); setRewardCost(10);
    reload();
  }
  async function editReward(r) {
    const n = prompt("Reward name:", r.name);
    if (n === null) return;
    if (!n.trim()) { alert("Name cannot be empty."); return; }
    const c = Number(prompt("Cost:", r.cost));
    if (!(c > 0)) { alert("Cost must be a positive number."); return; }
    await rewardsApi.update(r.id, { name: n.trim(), cost: c });
    reload();
  }
  async function toggleReward(r) { await rewardsApi.update(r.id, { active: !r.active }); reload(); }
  async function removeReward(id) {
    if (!confirm("Delete this reward? This cannot be undone.")) return;
    await rewardsApi.remove(id);
    reload();
  }

  return (
    <div>
      <h2>Reward Shop</h2>
      <div className="row">
        <select value={redeemStudent} onChange={(e) => setRedeemStudent(e.target.value)}>
          <option value="">Select a student to redeem for…</option>
          {sorted.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.group_name}) — {s.coins} {currency}</option>)}
        </select>
      </div>
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
      {rewards.length ? (
        <div className="grid">
          {rewards.map((r) => (
            <div className="card" key={r.id} style={{ opacity: r.active ? 1 : 0.5 }}>
              <div style={{ fontSize: 24 }}>🎁</div>
              <div className="name">{r.name}{r.active ? "" : " (inactive)"}</div>
              <div style={{ color: "#ffc145", margin: "6px 0" }}>¢ {r.cost}</div>
              <button className="teal" style={{ width: "100%" }} disabled={!r.active} onClick={() => redeem(r)}>Redeem for student</button>
              <div className="row" style={{ marginTop: 8, marginBottom: 0 }}>
                <button className="ghost" style={{ flex: 1 }} onClick={() => editReward(r)}>✎ Edit</button>
                <button className="ghost" style={{ flex: 1 }} onClick={() => toggleReward(r)}>{r.active ? "Deactivate" : "Activate"}</button>
              </div>
              <div style={{ textAlign: "right", marginTop: 8 }}><button className="danger" onClick={() => removeReward(r.id)}>Delete</button></div>
            </div>
          ))}
        </div>
      ) : <div className="empty"><h3>No rewards yet</h3>Add one below.</div>}
      <div className="section">
        <b>Add a reward</b>
        <div className="row" style={{ marginTop: 12 }}>
          <input placeholder="Reward name" value={rewardName} onChange={(e) => setRewardName(e.target.value)} />
          <input type="number" min="1" style={{ maxWidth: 110 }} value={rewardCost} onChange={(e) => setRewardCost(e.target.value)} />
          <button className="primary" onClick={addReward}>＋ Add</button>
        </div>
      </div>
      <div className="section">
        <b>Purchase history</b>
        {purchases.length ? (
          <table><tbody>
            <tr><th>Reward</th><th>Student</th><th>Group</th><th>Cost</th><th>Date</th></tr>
            {purchases.slice(0, 15).map((p) => {
              const s = students.find((x) => x.id === p.student_id);
              return <tr key={p.id}><td>{p.reward_name}</td><td>{s ? s.name : "—"}</td><td>{s ? s.group_name : p.group_name}</td><td>¢ {p.cost}</td><td>{p.purchased_at?.slice(0, 10)}</td></tr>;
            })}
          </tbody></table>
        ) : <div className="muted" style={{ marginTop: 8 }}>No purchases yet.</div>}
      </div>
    </div>
  );
}
