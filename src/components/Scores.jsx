import { useEffect, useState } from "react";
import { useData } from "../context/DataContext";
import { scoresApi } from "../lib/api";
import { SKILLS } from "../lib/constants";
import { scoresDetail } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

function round1(n) { return Math.round(n * 10) / 10; }

export default function Scores({ ui, setUi }) {
  const { students, scores, reload } = useData();
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);

  // pending[studentId][skill] = value (0-100) or "" for not evaluated
  const [pending, setPending] = useState({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    const map = {};
    list.forEach((s) => {
      const detail = scoresDetail(scores, s.id, g, p);
      map[s.id] = {};
      SKILLS.forEach((sk) => { map[s.id][sk] = detail[sk] == null ? "" : detail[sk]; });
    });
    setPending(map);
    setDirty(false);
    setMsg(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g, p, scores, students]);

  useEffect(() => {
    function handler(e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function setLocal(studentId, skill, value) {
    setPending((prev) => ({ ...prev, [studentId]: { ...prev[studentId], [skill]: value } }));
    setDirty(true);
  }
  function liveAvg(studentId) {
    const map = pending[studentId] || {};
    const vals = SKILLS.map((sk) => map[sk]).filter((v) => v !== "" && v != null).map(Number);
    if (!vals.length) return null;
    return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  async function save() {
    setSaving(true);
    setMsg(null);
    const rows = [];
    Object.entries(pending).forEach(([studentId, bySkill]) => {
      Object.entries(bySkill).forEach(([skill, value]) => {
        rows.push({ student_id: studentId, group_name: g, period: p, skill, value: value === "" ? null : value });
      });
    });
    try {
      await scoresApi.bulkSetScores(rows);
      setMsg({ type: "ok", text: "Exam guardado." });
      setDirty(false);
      reload();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
    }
    setSaving(false);
  }

  return (
    <div>
      <h2>Exam</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="row">
        <div className="formula" style={{ flex: 1, marginBottom: 0 }}>
          Overall Average = mean of skills that HAVE been entered. Unevaluated skills are excluded, never counted as 0.
        </div>
        <button className="primary" disabled={!dirty || saving} onClick={save}>
          {saving ? "Guardando…" : "💾 Guardar scores"}
        </button>
      </div>
      {dirty && <div className="banner warn">Tienes cambios sin guardar en esta pantalla.</div>}
      {msg && <div className={"banner " + msg.type}>{msg.text}</div>}
      {!list.length ? (
        <div className="empty"><h3>No students in {g}</h3>Add students on the Students tab first.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <tbody>
              <tr><th className="stickyCol">Student</th>{SKILLS.map((s) => <th key={s}>{s}</th>)}<th>Overall Avg</th><th>Status</th></tr>
              {list.map((s) => {
                const map = pending[s.id] || {};
                const avg = liveAvg(s.id);
                const missing = SKILLS.filter((sk) => map[sk] === "" || map[sk] == null);
                return (
                  <tr key={s.id}>
                    <td className="stickyCol">{s.name}</td>
                    {SKILLS.map((sk) => (
                      <td key={sk}>
                        <input
                          type="number" min="0" max="100" style={{ maxWidth: 70 }} placeholder="—"
                          value={map[sk] ?? ""}
                          onChange={(e) => setLocal(s.id, sk, e.target.value)}
                        />
                      </td>
                    ))}
                    <td><b>{avg == null ? "—" : avg + "%"}</b></td>
                    <td className="muted">{missing.length ? `${missing.length} not evaluated` : "complete"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
