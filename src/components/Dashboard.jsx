import { useData } from "../context/DataContext";
import { GROUPS, PERIODS } from "../lib/constants";
import { computeGrade, fmtPct } from "../lib/calc";
import SpotifyPlayer from "./SpotifyPlayer";

export default function Dashboard({ ui, setUi }) {
  const data = useData();
  const { students, rewards, purchases } = data;
  const group = ui.group, period = ui.period;
  const list = students.filter((s) => s.group_name === group);
  const totalCoins = students.reduce((a, s) => a + s.coins, 0);

  const grades = list.map((s) => computeGrade(data, s.id, group, period));
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
  const atts = grades.map((g) => g.attendance).filter((v) => v != null);
  const tsks = grades.map((g) => g.tasks).filter((v) => v != null);
  const scrs = grades.map((g) => g.scores).filter((v) => v != null);
  const projs = grades.map((g) => g.project).filter((v) => v != null);
  const finals = grades.map((g) => g.final).filter((v) => v != null);

  const lowGrades = list.map((s, i) => ({ s, g: grades[i] })).filter((x) => x.g.final != null && x.g.final < 60);
  const recentPurchases = purchases.slice(0, 5);

  return (
    <div>
      <h2>Dashboard</h2>
      <SpotifyPlayer url={data.config?.spotify_playlist_url} />
      <div className="row">
        <select value={group} onChange={(e) => setUi({ ...ui, group: e.target.value })}>
          {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={period} onChange={(e) => setUi({ ...ui, period: e.target.value })}>
          {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="stats">
        <div className="stat"><b>{students.length}</b><span>Total students</span></div>
        <div className="stat"><b>{GROUPS.length}</b><span>Groups</span></div>
        <div className="stat"><b>{totalCoins}</b><span>Total {data.config?.currency_name || "Celtix"}</span></div>
        <div className="stat"><b>{fmtPct(avg(atts))}</b><span>Attendance avg ({group})</span></div>
        <div className="stat"><b>{fmtPct(avg(tsks))}</b><span>Tasks avg ({group})</span></div>
        <div className="stat"><b>{fmtPct(avg(scrs))}</b><span>Scores avg ({group})</span></div>
        <div className="stat"><b>{projs.length ? fmtPct(avg(projs)) : "N/A"}</b><span>Project avg ({group})</span></div>
        <div className="stat"><b>{fmtPct(avg(finals))}</b><span>Overall avg ({group})</span></div>
      </div>
      <div className="grid">
        <div className="card">
          <b>⚠ Students needing attention ({group} · {period})</b>
          {lowGrades.length ? lowGrades.map((x) => (
            <div className="att" key={x.s.id}><span>{x.s.name}</span><span>{fmtPct(x.g.final)}</span></div>
          )) : <div className="muted" style={{ marginTop: 8 }}>No students below 60% for this selection.</div>}
        </div>
        <div className="card">
          <b>🎁 Recent reward purchases</b>
          {recentPurchases.length ? recentPurchases.map((p) => {
            const s = students.find((x) => x.id === p.student_id);
            return <div className="att" key={p.id}><span>{p.reward_name}</span><span className="muted">{s ? s.name : "—"} · {p.purchased_at?.slice(0, 10)}</span></div>;
          }) : <div className="muted" style={{ marginTop: 8 }}>No purchases yet.</div>}
        </div>
      </div>
    </div>
  );
}
