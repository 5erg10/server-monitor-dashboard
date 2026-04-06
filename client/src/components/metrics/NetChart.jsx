import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatBytes } from '../../lib/format';

export default function NetChart({ history }) {
  const data = history.map(h => ({
    rx: h.system?.net?.rx ?? 0,
    tx: h.system?.net?.tx ?? 0,
  }));

  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">Network I/O</p>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="rx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="tx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{ background: '#161b27', border: '1px solid #1e2535', borderRadius: 8, fontSize: 12 }}
            formatter={(v, name) => [`${formatBytes(v)}/s`, name === 'rx' ? '↓ Download' : '↑ Upload']}
            labelFormatter={() => ''}
          />
          <Area type="monotone" dataKey="rx" stroke="#3b82f6" fill="url(#rx)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Area type="monotone" dataKey="tx" stroke="#eab308" fill="url(#tx)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
