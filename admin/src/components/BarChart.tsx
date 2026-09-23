export function BarChart({
  data,
  labelKey,
  valueKey,
}: {
  data: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
}) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="bar-chart">
      {data.slice(-14).map((d) => (
        <div key={String(d[labelKey])} className="bar-row">
          <span className="bar-label">{String(d[labelKey]).slice(5)}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${(Number(d[valueKey]) / max) * 100}%` }}
            />
          </div>
          <span className="bar-value">{d[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}
