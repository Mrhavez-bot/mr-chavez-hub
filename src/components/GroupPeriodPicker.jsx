import { GROUPS, PERIODS } from "../lib/constants";

export default function GroupPeriodPicker({ ui, setUi }) {
  return (
    <div className="row">
      <select value={ui.group} onChange={(e) => setUi({ ...ui, group: e.target.value })}>
        {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select value={ui.period} onChange={(e) => setUi({ ...ui, period: e.target.value })}>
        {PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}
