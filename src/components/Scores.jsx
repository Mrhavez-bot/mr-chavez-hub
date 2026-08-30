import { useData } from "../context/DataContext";
import { scoresApi } from "../lib/api";
import { SKILLS } from "../lib/constants";
import { scoresDetail, scoresPct, fmtPct } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

export default function Scores({ ui, setUi }) {
  const { students, scores, reload } = useData();
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);

  async function setScore(sid, skill, val) {
    await scoresApi.setScore(sid, g, p, skill, val === "" ? null : val);
    reload();
  }

  return (
    <div>
      <h2>Scores</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="formula">Overall Average = mean of skills that HAVE been entered. Unevaluated skills are excluded, never counted as 0.</div>
      {!list.length ? (
        <div className="empty"><h3>No students in {g}</h3>Add students on the Students tab first.</div>
      ) : (
        <table>
          <tbody>
            <tr><th>Student</th>{SKILLS.map((s) => <th key={s}>{s}</th>)}<th>Overall Avg</th><th>Status</th></tr>
            {list.map((s) => {
              const map = scoresDetail(scores, s.id, g, p);
              const avg = scoresPct(scores, s.id, g, p);
              const missing = SKILLS.filter((sk) => map[sk] == null);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  {SKILLS.map((sk) => (
                    <td key={sk}>
                      <input type="number" min="0" max="100" style={{ maxWidth: 70 }} placeholder="—"
                        defaultValue={map[sk] == null ? "" : map[sk]}
                        onBlur={(e) => setScore(s.id, sk, e.target.value)} />
                    </td>
                  ))}
                  <td><b>{fmtPct(avg)}</b></td>
                  <td className="muted">{missing.length ? `${missing.length} not evaluated` : "complete"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
