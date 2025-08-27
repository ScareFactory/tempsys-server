// routes/updates.js
const express = require('express');
const router = express.Router();
const db = require('../dbx');
const { authMiddleware } = require('../middleware/auth');

// GET /api/clocks/:id/update  -> Uhr prüft Update für ihren Channel
router.get('/api/clocks/:id/update', authMiddleware, async (req, res) => {
  const { id } = req.params;

  const clock = await db.oneOrNone(
    `SELECT id, company_id, version, channel FROM clocks WHERE id = $1`,
    [id]
  );
  if (!clock) return res.status(404).json({ error: 'clock not found' });

  const channel = clock.channel || 'stable';

  // current_releases ist die View mit jeweils der neuesten Release pro Channel
  const rel = await db.oneOrNone(
    `SELECT channel, version, url, sha256, mandatory
       FROM current_releases
      WHERE channel = $1`,
    [channel]
  );

  if (!rel) return res.json({ updateAvailable: false, channel });

  const current = (clock.version || '').split('+')[0] || '';
  const target  = rel.version;
  const updateAvailable = current !== target;

  return res.json({
    updateAvailable,
    channel,
    currentVersion: current,
    targetVersion: target,
    url: rel.url,
    sha256: rel.sha256,
    mandatory: rel.mandatory
  });
});

// POST /api/clocks/:id/heartbeat  Body: { version, online, companyId?, channel? }
router.post('/api/clocks/:id/heartbeat', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { version, online, companyId, channel } = req.body || {};

  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress || null;

  if (channel && !['stable','beta'].includes(channel)) {
    return res.status(400).json({ error: 'invalid channel' });
  }

  try {
    // ⬇️ Legt Eintrag an, wenn er fehlt – sonst Update.
    const row = await db.one(
      `INSERT INTO clocks (id, company_id, online, version, channel, last_seen)
       VALUES ($1, $2, COALESCE($3, TRUE), COALESCE($4, ''), COALESCE($5, 'stable'), NOW())
       ON CONFLICT (id) DO UPDATE SET
         online    = COALESCE(EXCLUDED.online, clocks.online),
         version   = COALESCE(EXCLUDED.version, clocks.version),
         channel   = COALESCE(EXCLUDED.channel, clocks.channel),
         last_seen = NOW()
       RETURNING id, company_id, online, version, channel, last_seen`,
      [
        id,
        companyId || null,
        typeof online === 'boolean' ? online : true,
        version || '',
        channel || null,
      ]
    );

    if (ip) console.log(`[heartbeat] clock=${id} ip=${ip} v=${version || ''}`);
    return res.json({ ok: true, clock: row });
  } catch (err) {
    const msg = `${err?.message || err}`;
    if (/invalid input syntax for type uuid/i.test(msg)) {
      return res.status(400).json({
        error: 'clock id must be a UUID per schema',
        hint:  'Setze eine UUID als CLOCK_ID (ENV) oder passe das Schema an.',
      });
    }
    console.error('heartbeat upsert failed:', err);
    return res.status(500).json({ error: 'heartbeat failed' });
  }
});

module.exports = router;
