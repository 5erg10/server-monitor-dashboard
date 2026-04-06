const si = require('systeminformation');

async function collectSystemMetrics() {
  const [
    cpuLoad,
    mem,
    fsSize,
    networkStats,
    processes,
  ] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.processes(),
  ]);

  // CPU
  const cpu = {
    usage:   parseFloat(cpuLoad.currentLoad.toFixed(1)),
    cores:   cpuLoad.cpus.map(c => parseFloat(c.load.toFixed(1))),
  };

  // Memory
  const memData = {
    total:   mem.total,
    used:    mem.active,
    free:    mem.available,
    usedPct: parseFloat(((mem.active / mem.total) * 100).toFixed(1)),
  };

  // Disk (aggregate all real filesystems)
  const realFS = fsSize.filter(f => f.type !== 'squashfs' && f.size > 0);
  const disk = realFS.reduce((acc, f) => ({
    total: acc.total + f.size,
    used:  acc.used + f.used,
  }), { total: 0, used: 0 });
  disk.usedPct = parseFloat(((disk.used / disk.total) * 100).toFixed(1));
  disk.partitions = realFS.map(f => ({
    mount:   f.mount,
    total:   f.size,
    used:    f.used,
    usedPct: parseFloat(((f.used / f.size) * 100).toFixed(1)),
  }));

  // Network (first active interface)
  const net = networkStats[0] || { rx_sec: 0, tx_sec: 0 };
  const netData = {
    rx:    Math.max(0, net.rx_sec || 0),
    tx:    Math.max(0, net.tx_sec || 0),
    iface: net.iface,
  };

  // Top processes
  const topProcs = processes.list
    .sort((a, b) => b.cpu - a.cpu)
    .slice(0, 10)
    .map(p => ({
      pid:  p.pid,
      name: p.name,
      cpu:  parseFloat(p.cpu.toFixed(1)),
      mem:  parseFloat(p.mem.toFixed(1)),
    }));

  return { cpu, mem: memData, disk, net: netData, processes: topProcs };
}

module.exports = { collectSystemMetrics };
