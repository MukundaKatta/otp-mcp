import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { totp, hotp, uri } from '../src/server.js';

// RFC 6238 Appendix B test vectors (SHA1, secret = ASCII "12345678901234567890" → base32 "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"):
//   59       -> "94287082" (digits=8)
//   1111111109 -> "07081804" (digits=8)
const SECRET_B32 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

test('TOTP RFC 6238 vector at t=59', () => {
  const r = totp({ secret: SECRET_B32, digits: 8, period: 30, at: 59 * 1000 });
  assert.equal(r.code, '94287082');
});

test('TOTP at known timestamp', () => {
  const r = totp({ secret: SECRET_B32, digits: 8, period: 30, at: 1111111109 * 1000 });
  assert.equal(r.code, '07081804');
});

test('TOTP default is 6 digits', () => {
  const r = totp({ secret: SECRET_B32 });
  assert.equal(r.code.length, 6);
});

test('HOTP RFC 4226 vector counter=0', () => {
  // RFC 4226 secret = "12345678901234567890" ASCII = same base32 as above (first 16 chars are enough)
  // Known: counter=0 → 755224
  const c = hotp({ secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', counter: 0 });
  assert.equal(c, '755224');
});

test('HOTP RFC 4226 vector counter=1', () => {
  const c = hotp({ secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', counter: 1 });
  assert.equal(c, '287082');
});

test('uri builds otpauth://', () => {
  const u = uri({ secret: SECRET_B32, label: 'alice@example.com', issuer: 'Example' });
  assert.match(u, /^otpauth:\/\/totp\//);
  assert.match(u, /alice/);
  assert.match(u, /Example/);
});

test('uri for hotp includes counter', () => {
  const u = uri({ type: 'hotp', secret: SECRET_B32, label: 'a', counter: 5 });
  assert.match(u, /^otpauth:\/\/hotp\//);
  assert.match(u, /counter=5/);
});
