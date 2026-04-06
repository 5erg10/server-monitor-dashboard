const router = require('express').Router();
const Docker = require('dockerode');
const path   = require('path');
const fs     = require('fs');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const DEPLOY_LOGS_DIR = process.env.DEPLOY_LOGS_DIR || '/host/servers';

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

// Prevent path traversal — only allow safe container names
function safeName(name) {
  return /^[a-zA-Z0-9_-]+$/.test(name) ? name : null;
}

// ── Activity logs (Docker) ────────────────────────────────────────────────────

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

// ── Deploy logs (file) ────────────────────────────────────────────────────────

// GET /api/logs/deploy/:name/exists
router.get('/deploy/:name/exists', (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: 'Invalid container name' });
  const filePath = path.join(DEPLOY_LOGS_DIR, `deploy-${name}.log`);
  res.json({ exists: fs.existsSync(filePath) });
});

// GET /api/logs/deploy/:name
router.get('/deploy/:name', (req, res) => {
  const name = safeName(req.params.name);
  if (!name) return res.status(400).json({ error: 'Invalid container name' });
  const filePath = path.join(DEPLOY_LOGS_DIR, `deploy-${name}.log`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No deploy log found' });
  try {
    res.type('text').send(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
