const router = require('express').Router();
const { getDB } = require('../../db/database');

// GET /api/metrics/history?hours=1
router.get('/history', (req, res) => {
  const hours = Math.min(parseInt(req.query.hours || '1'), 24);
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const rows = getDB().prepare(
    'SELECT * FROM metrics_history WHERE ts >= ? ORDER BY ts ASC'
  ).all(since);
  res.json(rows);
});

module.exports = router;
