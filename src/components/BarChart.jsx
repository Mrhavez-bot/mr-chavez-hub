export default function BarChart({ pairs, maxVal = 100, colors }) {
  return (
    <div className="bars">
      {pairs.map((pr, i) => {
        const h = Math.max(2, ((pr[1] == null ? 0 : pr[1]) / maxVal) * 100);
        const col = (colors && colors[i]) || "#ffc145";
        return (
          <div className="bar" key={pr[0]} style={{ height: h + "%", background: col }}>
            <span>{pr[1] == null ? "—" : pr[1]}</span>
            <em>{pr[0]}</em>
          </div>
        );
      })}
    </div>
  );
}
