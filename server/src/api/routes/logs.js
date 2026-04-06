const router = require('express').Router();
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Docker log frames: [stream(1), 0,0,0, size(4 BE)] + payload
function demuxLogs(buffer) {
  const lines = [];
  let offset = 0;
  while (offset + 8 <= buffer.length) {
    const streamType = buffer[offset]; // 1 = stdout, 2 = stderr
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (size === 0) continue;
    if (offset + size > buffer.length) break;
    const text = buffer.slice(offset, offset + size).toString('utf8');
    lines.push({ stream: streamType === 2 ? 'stderr' : 'stdout', text });
    offset += size;
  }
  return lines;
}

// GET /api/logs/container/:id?tail=200
router.get('/container/:id', async (req, res) => {
  const tail = Math.min(parseInt(req.query.tail || '200'), 1000);
  try {
    const container = docker.getContainer(req.params.id);
    const raw = await container.logs({ stdout: true, stderr: true, tail, timestamps: true });
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    res.json(demuxLogs(buf));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
