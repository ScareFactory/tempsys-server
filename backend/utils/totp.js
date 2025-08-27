const crypto = require('crypto');

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds

function base32Decode(b32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = String(b32 || '').toUpperCase().replace(/[^A-Z2-7]/g, '').replace(/=+$/, '');
  let bits = '';
  for (const ch of clean) {
    const val = alphabet.indexOf(ch);
    if (val < 0) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function base32Encode(buf) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5);
    out += alphabet[parseInt(chunk.padEnd(5, '0'), 2)];
  }
  return out;
}

function hotp(secretBuf, counter) {
  const b = Buffer.alloc(8);
  for (let i = 7; i >= 0; i--) { b[i] = counter & 0xff; counter >>= 8; }
  const hmac = crypto.createHmac('sha1', secretBuf).update(b).digest();
  const offset = hmac[19] & 0x0f;
  const bin = ((hmac[offset] & 0x7f) << 24) |
              ((hmac[offset + 1] & 0xff) << 16) |
              ((hmac[offset + 2] & 0xff) << 8) |
              (hmac[offset + 3] & 0xff);
  return String(bin % (10 ** TOTP_DIGITS)).padStart(TOTP_DIGITS, '0');
}

function totpCheck(code, secretBase32, window = 1) {
  if (!code || !secretBase32) return false;
  const sec = base32Decode(secretBase32);
  const now = Math.floor(Date.now() / 1000);
  const cur = Math.floor(now / TOTP_PERIOD);
  const want = String(code).padStart(TOTP_DIGITS, '0');
  for (let w = -window; w <= window; w++) {
    if (hotp(sec, cur + w) === want) return true;
  }
  return false;
}

function randomSecretBase32(bytes = 20) {
  const buf = crypto.randomBytes(bytes);
  return base32Encode(buf);
}

module.exports = {
  TOTP_DIGITS,
  TOTP_PERIOD,
  totpCheck,
  randomSecretBase32
};
