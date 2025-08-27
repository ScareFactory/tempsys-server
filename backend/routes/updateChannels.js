// routes/updateChannels.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

function assertChannel(ch) {
  if (!['stable','beta'].includes(ch)) {
    const err = new Error('invalid channel'); err.status = 400; throw err;
  }
}

// PUT /api/clocks/:id/channel   Body: { channel: "stable"|"beta" }
router.put('/api/clocks/:id/channel', authMiddleware, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { channel } = req.body || {};
  assertChannel(channel);

  const r = await db.result(
    `UPDATE clocks SET channel = $1 WHERE id = $2`,
    [channel, id]
  );
  if (r.rowCount === 0) return res.status(404).json({ error: 'clock not found' });
  res.json({ ok: true, id, channel });
});

// PUT /api/clocks/channel  Body: { channel: "stable"|"beta", companyId?: UUID }
router.put('/api/clocks/channel', authMiddleware, requireAdmin, async (req, res) => {
  const { channel, companyId } = req.body || {};
  assertChannel(channel);

  const sql = companyId
    ? `UPDATE clocks SET channel = $1 WHERE company_id = $2`
    : `UPDATE clocks SET channel = $1`;
  const params = companyId ? [channel, companyId] : [channel];

  const r = await db.result(sql, params);
  res.json({ ok: true, updated: r.rowCount, channel, scope: companyId ? 'company' : 'global' });
});

module.exports = router;
