const crypto = require('crypto');

function hashPw(pw) {
  return crypto.createHash('sha256').update(String(pw)).digest('hex');
}

function randomToken64() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(48); // 64 Zeichen ~= 48 Bytes * 4/3
  let out = '';
  for (let i = 0; i < 64; i++) {
    out += alphabet[bytes[i % bytes.length] % alphabet.length];
  }
  return out;
}

module.exports = {
  hashPw,
  randomToken64,
};
