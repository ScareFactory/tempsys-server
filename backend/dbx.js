// backend/dbx.js
const db = require('./db'); // dein bestehendes DB-Objekt (Pool oder pg-promise)

async function any(sql, params = []) {
  if (typeof db.any === 'function') return db.any(sql, params);
  const res = await db.query(sql, params);
  return res.rows;
}
async function one(sql, params = []) {
  if (typeof db.one === 'function') return db.one(sql, params);
  const res = await db.query(sql, params);
  if (res.rows.length !== 1) throw new Error(`Expected 1 row, got ${res.rows.length}`);
  return res.rows[0];
}
async function oneOrNone(sql, params = []) {
  if (typeof db.oneOrNone === 'function') return db.oneOrNone(sql, params);
  const res = await db.query(sql, params);
  if (res.rows.length === 0) return null;
  if (res.rows.length > 1) throw new Error(`Expected 0..1 rows, got ${res.rows.length}`);
  return res.rows[0];
}
async function result(sql, params = []) {
  if (typeof db.result === 'function') return db.result(sql, params);
  const res = await db.query(sql, params);
  return { rowCount: res.rowCount };
}
module.exports = { any, one, oneOrNone, result };
