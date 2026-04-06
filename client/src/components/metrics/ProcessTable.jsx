export default function ProcessTable({ processes }) {
  return (
    <div className="bg-surface-card border border-surface-border rounded-xl p-4">
      <p className="text-xs font-mono text-white/40 uppercase tracking-wider mb-3">Top Processes</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-white/30 text-xs font-mono">
            <th className="text-left pb-2">PID</th>
            <th className="text-left pb-2">Name</th>
            <th className="text-right pb-2">CPU%</th>
            <th className="text-right pb-2">MEM%</th>
          </tr>
        </thead>
        <tbody>
          {processes.map(p => (
            <tr key={p.pid} className="border-t border-surface-border">
              <td className="py-1.5 font-mono text-white/40 text-xs">{p.pid}</td>
              <td className="py-1.5 text-white/80">{p.name}</td>
              <td className="py-1.5 text-right font-mono text-xs text-accent">{p.cpu}%</td>
              <td className="py-1.5 text-right font-mono text-xs text-accent-green">{p.mem}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
