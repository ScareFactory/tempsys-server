const os = require('node:os');
const { exec } = require('node:child_process');
const { query } = require('../utils/db');

const MONITOR_HOUR       = Number(process.env.MONITOR_HOUR || 3);     // 03:00 local time
const RAM_WARN_PCT       = Number(process.env.RAM_WARN_PCT || 85);
const DISK_WARN_PCT      = Number(process.env.DISK_WARN_PCT || 85);
const CPU_LOAD_WARN_PCNT = Number(process.env.CPU_LOAD_WARN_PCNT || 120);

function bytes(n) { return (n / (1024 * 1024)).toFixed(1) + ' MB'; }

function getDiskUsage(mount = '/') {
  return new Promise((resolve, reject) => {
    exec(`df -kP ${mount}`, (err, stdout) => {
      if (err) return reject(err);
      const lines = stdout.trim().split('\n');
      const row = lines[lines.length - 1].split(/\s+/);
      const usedKB = Number(row[2] || 0);
      const availKB = Number(row[3] || 0);
      const usedPctStr = row[4] || '0%';
      const usedPct = Number(usedPctStr.replace('%', ''));
      resolve({ usedKB, availKB, usedPct, mount });
    });
  });
}

async function logSystemSnapshot() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usedPct = Math.round((used / total) * 100);

  const rss = process.memoryUsage().rss;
  const cores = os.cpus()?.length || 1;
  const load1 = os.loadavg()[0];
  const loadPct = Math.round((load1 / cores) * 100);

  let disk = { usedPct: 0, usedKB: 0, availKB: 0, mount: '/' };
  try { disk = await getDiskUsage('/'); } catch (e) { console.error('[monitor] df error:', e.message); }

  console.log(
    `[monitor] RAM ${usedPct}% (${bytes(used)} / ${bytes(total)}), ` +
    `PROC ${bytes(rss)}, ` +
    `CPU load1 ${load1.toFixed(2)} (~${loadPct}% von ${cores} cores), ` +
    `DISK ${disk.usedPct}% (/ used)`
  );

  if (usedPct >= RAM_WARN_PCT) {
    console.warn(`[monitor][WARN] RAM hoch: ${usedPct}% belegt (Grenze ${RAM_WARN_PCT}%).`);
  }
  if (disk.usedPct >= DISK_WARN_PCT) {
    console.warn(`[monitor][WARN] Disk hoch: ${disk.usedPct}% von ${disk.mount} (Grenze ${DISK_WARN_PCT}%).`);
  }
  if (loadPct >= CPU_LOAD_WARN_PCNT) {
    console.warn(`[monitor][WARN] CPU-Last hoch: load1=${load1.toFixed(2)} (~${loadPct}% von ${cores} Cores).`);
  }
}

function scheduleDailySystemMonitor() {
  const now = new Date();
  const first = new Date(now);
  first.setHours(MONITOR_HOUR, 0, 0, 0);
  if (first <= now) first.setDate(first.getDate() + 1);
  const delay = first - now;

  console.log(`[monitor] daily snapshot geplant für ${first.toString()} (in ${Math.round(delay/1000)}s)`);

  setTimeout(() => {
    logSystemSnapshot();
    setInterval(logSystemSnapshot, 24 * 60 * 60 * 1000);
  }, delay);
}

const LOG_RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS || 7);
const LOG_CLEANUP_HOUR   = Number(process.env.LOG_CLEANUP_HOUR || 3);

async function cleanupOldLogs() {
  try {
    const sql = `
      DELETE FROM device_logs
      WHERE created_at < NOW() - INTERVAL '${LOG_RETENTION_DAYS} days'
    `;
    const res = await query(sql);
    console.log(`[logs] Cleanup OK: ${res.rowCount || 0} alte Einträge entfernt`);
  } catch (err) {
    console.error('[logs] Cleanup ERROR:', err.message || err);
  }
}

function scheduleDailyLogCleanup() {
  const now = new Date();
  const first = new Date(now);
  first.setHours(LOG_CLEANUP_HOUR, 0, 0, 0);
  if (first <= now) first.setDate(first.getDate() + 1);
  const delay = first.getTime() - now.getTime();

  console.log(
    `[logs] Daily cleanup geplant für ${first.toString()} (in ${Math.round(delay/1000)}s)`
  );

  const startTimer = setTimeout(() => {
    cleanupOldLogs();
    const DAY_MS = 24 * 60 * 60 * 1000;
    setInterval(cleanupOldLogs, DAY_MS);
  }, delay);

  return startTimer;
}

function startMonitoring() {
  setInterval(() => {
    logSystemSnapshot().catch(() => {});
  }, 5 * 60 * 1000);

  scheduleDailySystemMonitor();
  scheduleDailyLogCleanup();
}

module.exports = {
  startMonitoring,
  scheduleDailySystemMonitor,
  scheduleDailyLogCleanup,
  cleanupOldLogs,
  logSystemSnapshot
};
