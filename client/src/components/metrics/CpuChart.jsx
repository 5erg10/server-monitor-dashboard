import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CpuChart({ history }) {
  const data = history.map(h => ({ cpu: h.system?.cpu?.usage ?? 0 }));

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">CPU Usage</p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="cpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, fontSize: 12 }}
            formatter={v => [`${v}%`, 'CPU']}
            labelFormatter={() => ''}
          />
          <Area type="monotone" dataKey="cpu" stroke="#3b82f6" fill="url(#cpu)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
