import { clsx } from 'clsx';

const colorMap = {
  green:  'text-accent-green border-accent-green/20 bg-accent-green/5',
  yellow: 'text-accent-yellow border-accent-yellow/20 bg-accent-yellow/5',
  red:    'text-red-400 border-red-400/20 bg-red-400/5',
  blue:   'text-accent border-accent/20 bg-accent/5',
};

export default function MetricCard({ label, value, sub, color = 'blue' }) {
  return (
    <div className={clsx('rounded-xl border p-4', colorMap[color])}>
      <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-mono font-medium">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60 font-mono">{sub}</p>}
    </div>
  );
}
