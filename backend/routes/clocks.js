// routes/clocks.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireAdmin } = require('../middleware/auth');

// GET /api/clocks  -> listet ALLE Uhren global (Admin)
router.get('/api/clocks', authMiddleware, requireAdmin, async (req, res) => {
  const rows = await db.any(`
    SELECT c.id, c.company_id, c.online, c.version, c.channel
    FROM clocks c
    ORDER BY c.company_id, c.id
  `);
  res.json(rows);
});

module.exports = router;
