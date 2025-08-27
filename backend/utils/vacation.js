const { query } = require('./db');

async function loadVacationPolicy(companyId) {
  const rows = await query(
    `SELECT mode,
            uniform_days AS "uniformDays",
            per_user     AS "perUser"
       FROM vacation_policy
      WHERE company_id=$1`,
    [companyId]
  );
  if (!rows.length) return { mode: 'uniform', uniformDays: null, perUser: {} };
  const r = rows[0];
  return {
    mode: r.mode || 'uniform',
    uniformDays: r.uniformDays ?? null,
    perUser: r.perUser || {}
  };
}

async function upsertVacationPolicy(companyId, payload) {
  const mode = (payload?.mode === 'perUser') ? 'perUser' : 'uniform';
  const uniformDays = (payload?.uniformDays != null) ? Number(payload.uniformDays) : null;
  const perUser = payload?.perUser || {};
  const rows = await query(
    `INSERT INTO vacation_policy(company_id, mode, uniform_days, per_user, updated_at)
     VALUES($1,$2,$3,$4, now())
     ON CONFLICT (company_id) DO UPDATE
       SET mode=EXCLUDED.mode,
           uniform_days=EXCLUDED.uniform_days,
           per_user=EXCLUDED.per_user,
           updated_at=now()
     RETURNING mode, uniform_days AS "uniformDays", per_user AS "perUser"`,
    [companyId, mode, (uniformDays != null ? Math.max(0, uniformDays) : null), perUser]
  );
  return rows[0];
}

function daysInclusive(startDate, endDate) {
  const d1 = new Date(String(startDate).slice(0, 10));
  const d2 = new Date(String(endDate).slice(0, 10));
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
}

async function getEffectiveAllowance(companyId, userId) {
  const p = await loadVacationPolicy(companyId);
  if (p.mode === 'perUser') {
    const v = Number((p.perUser || {})[String(userId)]);
    return Number.isFinite(v) ? Math.max(0, v) : 0;
  }
  return Math.max(0, Number(p.uniformDays || 0));
}

async function getBalance(companyId, userId) {
  const rows = await query(
    `SELECT remaining_days AS "remainingDays"
       FROM vacation_balances
      WHERE company_id=$1 AND user_id=$2`,
    [companyId, userId]
  );
  return rows[0]?.remainingDays ?? null;
}

async function setBalance(companyId, userId, remainingDays) {
  await query(
    `INSERT INTO vacation_balances(company_id, user_id, remaining_days)
     VALUES($1,$2,$3)
     ON CONFLICT (company_id,user_id) DO UPDATE
       SET remaining_days=EXCLUDED.remaining_days`,
    [companyId, userId, Math.max(0, Number(remainingDays || 0))]
  );
}

async function ensureBalance(companyId, userId) {
  const b = await getBalance(companyId, userId);
  if (b != null) return b;
  const init = await getEffectiveAllowance(companyId, userId);
  await setBalance(companyId, userId, init);
  return init;
}

module.exports = {
  loadVacationPolicy,
  upsertVacationPolicy,
  daysInclusive,
  getEffectiveAllowance,
  getBalance,
  setBalance,
  ensureBalance
};
