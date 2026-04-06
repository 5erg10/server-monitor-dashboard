const router = require('express').Router();
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

router.get('/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    res.json(containers.map(c => ({
      id:     c.Id.slice(0, 12),
      name:   c.Names[0]?.replace('/', ''),
      image:  c.Image,
      status: c.State,
      ports:  c.Ports,
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const ALLOWED_ACTIONS = ['start', 'stop', 'restart', 'pause', 'unpause'];

router.post('/containers/:id/:action', async (req, res) => {
  const { id, action } = req.params;
  if (!ALLOWED_ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'Invalid action' });
  }
  try {
    const container = docker.getContainer(id);
    await container[action]();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/containers/:id', async (req, res) => {
  try {
    const container = docker.getContainer(req.params.id);
    await container.remove({ force: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
