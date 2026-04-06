import { useMetrics } from '../hooks/useMetrics';
import MetricCard from '../components/metrics/MetricCard';
import CpuChart from '../components/metrics/CpuChart';
import MemChart from '../components/metrics/MemChart';
import NetChart from '../components/metrics/NetChart';
import ProcessTable from '../components/metrics/ProcessTable';
import { formatBytes } from '../lib/format';

export default function DashboardPage() {
  const { latest, history } = useMetrics();

  const cpu    = latest?.system?.cpu;
  const mem    = latest?.system?.mem;
  const disk   = latest?.system?.disk;
  const net    = latest?.system?.net;
  const procs  = latest?.system?.processes || [];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-white font-semibold text-lg">System Overview</h2>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="CPU" value={cpu ? `${cpu.usage}%` : '—'} sub={`${cpu?.cores?.length || 0} cores`} color={cpu?.usage > 85 ? 'red' : cpu?.usage > 60 ? 'yellow' : 'green'} />
        <MetricCard label="RAM" value={mem ? `${mem.usedPct}%` : '—'} sub={mem ? `${formatBytes(mem.used)} / ${formatBytes(mem.total)}` : '—'} color={mem?.usedPct > 90 ? 'red' : mem?.usedPct > 70 ? 'yellow' : 'green'} />
        <MetricCard label="Disk" value={disk ? `${disk.usedPct}%` : '—'} sub={disk ? `${formatBytes(disk.used)} / ${formatBytes(disk.total)}` : '—'} color={disk?.usedPct > 85 ? 'red' : disk?.usedPct > 70 ? 'yellow' : 'green'} />
        <MetricCard label="Network" value={net ? `↑${formatBytes(net.tx)}/s` : '—'} sub={net ? `↓${formatBytes(net.rx)}/s` : '—'} color="blue" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CpuChart history={history} />
        <MemChart history={history} />
        <NetChart history={history} />
      </div>

      {/* Process table */}
      <ProcessTable processes={procs} />
    </div>
  );
}
