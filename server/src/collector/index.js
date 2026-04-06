const { collectSystemMetrics } = require('./system');
const { collectDockerMetrics } = require('./docker');
const { getDB, pruneOldMetrics } = require('../db/database');
const { broadcast } = require('../ws/wsServer');

const INTERVAL = parseInt(process.env.COLLECTOR_INTERVAL || '3000');
let intervalId = null;

async function collect() {
  try {
    const [system, docker] = await Promise.all([
      collectSystemMetrics(),
      collectDockerMetrics(),
    ]);

    const snapshot = { ts: Date.now(), system, docker };

    // Persist to SQLite
    const db = getDB();
    db.prepare(`
      INSERT INTO metrics_history (ts, cpu_usage, mem_used, mem_total, disk_used, disk_total, net_rx, net_tx)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      Math.floor(snapshot.ts / 1000),
      system.cpu.usage,
      system.mem.used,
      system.mem.total,
      system.disk.used,
      system.disk.total,
      system.net.rx,
      system.net.tx,
    );

    // Broadcast to all WS clients
    broadcast({ type: 'metrics', payload: snapshot });

    // Prune old data every ~5 minutes
    if (Math.random() < 0.01) pruneOldMetrics(24);

  } catch (err) {
    console.error('Collector error:', err.message);
  }
}

function startCollector() {
  collect(); // immediate first run
  intervalId = setInterval(collect, INTERVAL);
}

function stopCollector() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startCollector, stopCollector };
