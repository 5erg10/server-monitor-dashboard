const router = require('express').Router();
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

router.get('/container/:id', async (req, res) => {
  const tail = parseInt(req.query.tail || '100');
  try {
    const container = docker.getContainer(req.params.id);
    const stream = await container.logs({ stdout: true, stderr: true, tail, timestamps: true });
    res.type('text').send(stream.toString());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
