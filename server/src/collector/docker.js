const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

async function collectDockerMetrics() {
  try {
    const containers = await docker.listContainers({ all: true });

    const stats = await Promise.all(
      containers.map(async (info) => {
        const container = docker.getContainer(info.Id);
        let cpuPct = 0;
        let memUsed = 0;
        let memLimit = 0;

        if (info.State === 'running') {
          try {
            const rawStats = await container.stats({ stream: false });
            const cpuDelta = rawStats.cpu_stats.cpu_usage.total_usage - rawStats.precpu_stats.cpu_usage.total_usage;
            const systemDelta = rawStats.cpu_stats.system_cpu_usage - rawStats.precpu_stats.system_cpu_usage;
            const numCpus = rawStats.cpu_stats.online_cpus || 1;
            cpuPct = parseFloat(((cpuDelta / systemDelta) * numCpus * 100).toFixed(2));
            memUsed  = rawStats.memory_stats.usage || 0;
            memLimit = rawStats.memory_stats.limit || 0;
          } catch {
            // container might have stopped mid-query
          }
        }

        return {
          id:      info.Id.slice(0, 12),
          name:    info.Names[0]?.replace('/', '') || 'unknown',
          image:   info.Image,
          status:  info.State,
          created: info.Created,
          ports:   info.Ports,
          cpu:     cpuPct,
          memUsed,
          memLimit,
          memPct:  memLimit > 0 ? parseFloat(((memUsed / memLimit) * 100).toFixed(1)) : 0,
        };
      })
    );

    return stats;
  } catch (err) {
    console.error('Docker collector error:', err.message);
    return [];
  }
}

module.exports = { collectDockerMetrics };
