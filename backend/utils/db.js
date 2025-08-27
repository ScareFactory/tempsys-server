const pool = require('../db');

async function query(sql, params) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
}

async function notify({ companyId, recipient, type, title, body, payload }, clientOrPool = pool) {
  const sql = `
    INSERT INTO messages(company_id, recipient, type, title, body, payload)
    VALUES($1,$2,$3,$4,$5,$6)
    RETURNING id, company_id AS "companyId", recipient, type, title, body, payload,
              created_at AS "createdAt", read_at AS "readAt"
  `;
  const params = [companyId, recipient, type, title, body, payload || null];
  const { rows } = await clientOrPool.query(sql, params);
  return rows[0];
}

module.exports = {
  query,
  withTransaction,
  notify,
};
