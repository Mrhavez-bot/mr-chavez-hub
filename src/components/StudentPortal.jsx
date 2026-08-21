import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import { rewardsApi } from "../lib/api";
import { PERIODS, SKILLS } from "../lib/constants";
import { computeGrade, fmtPct, medalIcon, medalLabel, attendanceStats, taskPct, scoresDetail, scoresPct, projectForGroupPeriod, projectPct } from "../lib/calc";
import SpotifyPlayer from "./SpotifyPlayer";
import WelcomeVideoModal from "./WelcomeVideoModal";
import Announcements from "./Announcements";
import Surveys from "./Surveys";

const TABS = [
  ["sdashboard", "🏠 My Dashboard"],
  ["sannouncements", "📢 Announcements"],
  ["sshop", "🎁 Reward Shop"],
  ["sattendance", "📅 My Attendance"],
  ["stasks", "✓ My Tasks"],
  ["sscores", "📝 My Scores"],
  ["sproject", "📁 My Project"],
  ["sgrades", "🎯 My Grades"],
  ["ssurveys", "🗳 Surveys"]
];

function PeriodPicker({ period, setPeriod }) {
  return (
    <div className="row">
      <select value={period} onChange={(e) => setPeriod(e.target.value)}>
        {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}

export default function StudentPortal({ ui, setUi }) {
  const { profile } = useAuth();
  const data = useData();
  const { students, rewards, purchases, config, reload } = data;
  const [tab, setTab] = useState("sdashboard");
  const [period, setPeriod] = useState(PERIODS[0]);
  const [msg, setMsg] = useState(null);

  const me = students.find((s) => s.id === profile.student_id);
  const currency = config?.currency_name || "Celtix";
  const [showWelcome, setShowWelcome] = useState(me && !me.welcome_seen && !!config?.welcome_video_url);

  if (!me) return <div className="empty"><h3>Your student record could not be found.</h3></div>;

  async function studentRedeem(reward) {
    if (!reward.active || me.coins < reward.cost) return;
    if (!confirm(`Redeem "${reward.name}" for ${reward.cost} ${currency}?`)) return;
    try {
      await rewardsApi.redeemAsStudent(reward.id);
      setMsg({ type: "ok", text: `Redeemed "${reward.name}".` });
      reload();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
  }

  const gr = computeGrade(data, me.id, me.group_name, period);

  return (
    <div>
      {showWelcome && <WelcomeVideoModal videoUrl={config.welcome_video_url} onClose={() => setShowWelcome(false)} />}
      <SpotifyPlayer url={config?.spotify_playlist_url} />
      <nav className="nav">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>
        ))}
      </nav>
      <main>
        {tab === "sannouncements" && <Announcements mode="student" myGroup={me.group_name} />}
        {tab === "ssurveys" && <Surveys mode="student" myStudentId={me.id} myGroup={me.group_name} />}
        {tab === "sdashboard" && (
          <div>
            <h2>My Dashboard</h2>
            <PeriodPicker period={period} setPeriod={setPeriod} />
            <div className="stats">
              <div className="stat"><b>{me.coins}</b><span>{currency} balance</span></div>
              <div className="stat"><b>{me.group_name}</b><span>Group</span></div>
              <div className="stat"><b>{gr.final == null ? "—" : gr.final + "%"} {gr.final == null ? "" : medalIcon(gr.medal)}</b><span>Final grade ({period})</span></div>
            </div>
            <div className="grid">
              <div className="card"><b>Attendance</b><div style={{ fontSize: 22, color: "#ffc145", marginTop: 6 }}>{fmtPct(gr.attendance)}</div></div>
              <div className="card"><b>Tasks</b><div style={{ fontSize: 22, color: "#ffc145", marginTop: 6 }}>{fmtPct(gr.tasks)}</div></div>
              <div className="card"><b>Scores</b><div style={{ fontSize: 22, color: "#ffc145", marginTop: 6 }}>{fmtPct(gr.scores)}</div></div>
              <div className="card"><b>Project</b><div style={{ fontSize: 22, color: "#ffc145", marginTop: 6 }}>{gr.hasProject ? (gr.project == null ? "Missing" : gr.project + "%") : "N/A"}</div></div>
            </div>
          </div>
        )}

        {tab === "sshop" && (
          <div>
            <h2>Reward Shop</h2>
            <div className="stats"><div className="stat"><b>{me.coins}</b><span>Your {currency}</span></div></div>
            {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
            {rewards.filter((r) => r.active).length ? (
              <div className="grid">
                {rewards.filter((r) => r.active).map((r) => {
                  const can = me.coins >= r.cost;
                  return (
                    <div className="card" key={r.id}>
                      <div style={{ fontSize: 24 }}>🎁</div>
                      <div className="name">{r.name}</div>
                      <div style={{ color: "#ffc145", margin: "6px 0" }}>¢ {r.cost}</div>
                      <button className="teal" style={{ width: "100%" }} disabled={!can} onClick={() => studentRedeem(r)}>{can ? "Redeem" : `Not enough ${currency}`}</button>
                    </div>
                  );
                })}
              </div>
            ) : <div className="empty"><h3>No rewards available right now</h3></div>}
            <div className="section">
              <b>My purchase history</b>
              {purchases.filter((p) => p.student_id === me.id).length ? (
                <table><tbody>
                  <tr><th>Reward</th><th>Cost</th><th>Date</th></tr>
                  {purchases.filter((p) => p.student_id === me.id).map((p) => (
                    <tr key={p.id}><td>{p.reward_name}</td><td>¢ {p.cost}</td><td>{p.purchased_at?.slice(0, 10)}</td></tr>
                  ))}
                </tbody></table>
              ) : <div className="muted" style={{ marginTop: 8 }}>No purchases yet.</div>}
            </div>
          </div>
        )}

        {tab === "sattendance" && (() => {
          const att = attendanceStats(data.attendance, me.id, me.group_name, period);
          const recs = data.attendance.filter((a) => a.student_id === me.id && a.group_name === me.group_name && a.period === period).sort((a, b) => (a.date < b.date ? 1 : -1));
          return (
            <div>
              <h2>My Attendance</h2>
              <PeriodPicker period={period} setPeriod={setPeriod} />
              {att ? (
                <div className="stats">
                  <div className="stat"><b style={{ color: "#2dd4bf" }}>{att.presentPct}%</b><span>Present</span></div>
                  <div className="stat"><b style={{ color: "#ffc145" }}>{att.latePct}%</b><span>Late</span></div>
                  <div className="stat"><b style={{ color: "#ff6b6b" }}>{att.absentPct}%</b><span>Absent</span></div>
                </div>
              ) : <div className="empty"><h3>No attendance recorded yet for {period}</h3></div>}
              {!!recs.length && <table><tbody><tr><th>Date</th><th>Status</th></tr>{recs.map((r) => <tr key={r.id}><td>{r.date}</td><td>{r.status}</td></tr>)}</tbody></table>}
            </div>
          );
        })()}

        {tab === "stasks" && (() => {
          const groupTasks = data.tasks.filter((t) => t.group_name === me.group_name && t.period === period);
          return (
            <div>
              <h2>My Tasks</h2>
              <PeriodPicker period={period} setPeriod={setPeriod} />
              <div className="stats"><div className="stat"><b>{fmtPct(taskPct(data.tasks, data.taskResults, me.id, me.group_name, period))}</b><span>Completion</span></div></div>
              {groupTasks.length ? (
                <table><tbody>
                  <tr><th>Task</th><th>Result</th></tr>
                  {groupTasks.map((t) => {
                    const r = data.taskResults.find((x) => x.task_id === t.id && x.student_id === me.id);
                    return <tr key={t.id}><td>{t.title}</td><td>{r ? r.status : "Not graded yet"}</td></tr>;
                  })}
                </tbody></table>
              ) : <div className="empty"><h3>No tasks yet for {period}</h3></div>}
            </div>
          );
        })()}

        {tab === "sscores" && (() => {
          const map = scoresDetail(data.scores, me.id, me.group_name, period);
          return (
            <div>
              <h2>My Scores</h2>
              <PeriodPicker period={period} setPeriod={setPeriod} />
              <div className="stats"><div className="stat"><b>{fmtPct(scoresPct(data.scores, me.id, me.group_name, period))}</b><span>Overall Average</span></div></div>
              <table><tbody>
                <tr><th>Skill</th><th>Score</th></tr>
                {SKILLS.map((sk) => <tr key={sk}><td>{sk}</td><td>{map[sk] == null ? <span className="muted">Not evaluated</span> : map[sk] + "%"}</td></tr>)}
              </tbody></table>
            </div>
          );
        })()}

        {tab === "sproject" && (() => {
          const proj = projectForGroupPeriod(data.projects, me.group_name, period);
          if (!proj) return <div><h2>My Project</h2><PeriodPicker period={period} setPeriod={setPeriod} /><div className="empty"><h3>No project assigned for {period}</h3></div></div>;
          const pp = projectPct(data.projects, data.criteria, data.projectResults, me.id, me.group_name, period);
          const projCriteria = data.criteria.filter((c) => c.project_id === proj.id);
          return (
            <div>
              <h2>My Project</h2>
              <PeriodPicker period={period} setPeriod={setPeriod} />
              <div className="name" style={{ fontSize: 18 }}>{proj.name}</div>
              <div className="stats" style={{ marginTop: 10 }}><div className="stat"><b>{pp.value == null ? "Missing" : pp.value + "%"}</b><span>Final Score</span></div></div>
              <table><tbody>
                <tr><th>Criterion</th><th>Score</th></tr>
                {projCriteria.map((c) => {
                  const r = data.projectResults.find((x) => x.project_id === proj.id && x.student_id === me.id && x.criterion_id === c.id);
                  return <tr key={c.id}><td>{c.name}</td><td>{r ? r.value + " / 5" : <span className="muted">Not graded</span>}</td></tr>;
                })}
              </tbody></table>
            </div>
          );
        })()}

        {tab === "sgrades" && (
          <div>
            <h2>My Grades</h2>
            <PeriodPicker period={period} setPeriod={setPeriod} />
            <div className="formula">{gr.hasProject ? "Attendance 20% · Tasks 20% · Scores 30% · Project 30%" : "Attendance 30% · Tasks 30% · Scores 40%"}</div>
            <table><tbody>
              <tr><th>Component</th><th>Value</th></tr>
              <tr><td>Attendance</td><td>{fmtPct(gr.attendance)}</td></tr>
              <tr><td>Tasks</td><td>{fmtPct(gr.tasks)}</td></tr>
              <tr><td>Scores</td><td>{fmtPct(gr.scores)}</td></tr>
              {gr.hasProject && <tr><td>Project</td><td>{gr.project == null ? "Missing" : gr.project + "%"}</td></tr>}
              <tr><td><b>Final Grade</b></td><td><b>{gr.final == null ? "Incomplete — some data missing" : gr.final + "%"}</b></td></tr>
            </tbody></table>
            {gr.final != null && <div className="stats" style={{ marginTop: 12 }}><div className="stat"><b>{medalIcon(gr.medal)}</b><span>{medalLabel(gr.medal)}</span></div></div>}
          </div>
        )}
      </main>
    </div>
  );
}
