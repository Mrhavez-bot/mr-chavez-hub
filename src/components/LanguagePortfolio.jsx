import { useData } from "../context/DataContext";
import { languagePortfolioApi } from "../lib/api";
import { fmtPct } from "../lib/calc";
import GroupPeriodPicker from "./GroupPeriodPicker";

export default function LanguagePortfolio({ ui, setUi }) {
  const { students, languagePortfolio, reload } = useData();
  const g = ui.group, p = ui.period;
  const list = students.filter((s) => s.group_name === g);

  async function setValue(sid, val) {
    await languagePortfolioApi.setValue(sid, g, p, val === "" ? null : val);
    reload();
  }

  return (
    <div>
      <h2>Language Portfolio</h2>
      <GroupPeriodPicker ui={ui} setUi={setUi} />
      <div className="formula">
        Un valor de 0 a 100 por alumno y periodo. Si no se captura, no cuenta como 0 — el alumno queda excluido del
        cálculo hasta que se evalúe (a menos que su peso en Settings esté en 0%, en cuyo caso este componente no
        afecta la calificación final en absoluto).
      </div>
      {!list.length ? (
        <div className="empty"><h3>No students in {g}</h3></div>
      ) : (
        <table>
          <tbody>
            <tr><th>Student</th><th>Language Portfolio</th></tr>
            {list.map((s) => {
              const rec = languagePortfolio.find((r) => r.student_id === s.id && r.group_name === g && r.period === p);
              return (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>
                    <input
                      type="number" min="0" max="100" style={{ maxWidth: 90 }} placeholder="—"
                      defaultValue={rec ? rec.value : ""}
                      onBlur={(e) => setValue(s.id, e.target.value)}
                    />
                    <span className="muted" style={{ marginLeft: 8 }}>{fmtPct(rec ? rec.value : null)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
