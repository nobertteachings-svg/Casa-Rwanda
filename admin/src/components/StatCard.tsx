interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "gold" | "red" | "blue" | "neutral";
}

export default function StatCard({ label, value, sub, accent = "neutral" }: StatCardProps) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="stat-sub">{sub}</p>}
    </div>
  );
}
