const router = require('express').Router();
const { getDB } = require('../../db/database');

router.get('/', (req, res) => {
  const alerts = getDB().prepare('SELECT * FROM alerts ORDER BY ts DESC LIMIT 50').all();
  res.json(alerts);
});

router.get('/rules', (req, res) => {
  res.json(getDB().prepare('SELECT * FROM alert_rules').all());
});

router.put('/rules/:metric', (req, res) => {
  const { threshold, enabled } = req.body;
  getDB().prepare('UPDATE alert_rules SET threshold = ?, enabled = ? WHERE metric = ?')
    .run(threshold, enabled ? 1 : 0, req.params.metric);
  res.json({ ok: true });
});

module.exports = router;
