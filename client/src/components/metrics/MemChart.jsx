import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function MemChart({ history }) {
  const data = history.map(h => ({ mem: h.system?.mem?.usedPct ?? 0 }));

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">RAM Usage</p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="mem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide />
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            contentStyle={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, fontSize: 12 }}
            formatter={v => [`${v}%`, 'RAM']}
            labelFormatter={() => ''}
          />
          <Area type="monotone" dataKey="mem" stroke="#22c55e" fill="url(#mem)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
