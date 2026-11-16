import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  escapeLike,
  generateCode,
  generateToken,
  hashCode,
  hashesEqual,
  hashToken,
} from '../src/lib/security.js';

test('OTP hashes are bound to both email and secret', () => {
  const original = hashCode('one@example.com', '000001', 'secret-one');
  assert.notEqual(original, hashCode('two@example.com', '000001', 'secret-one'));
  assert.notEqual(original, hashCode('one@example.com', '000001', 'secret-two'));
  assert.equal(hashesEqual(original, original), true);
  assert.equal(hashesEqual(original, 'ff'), false);
});
test('tokens have 256 bits of randomness and hashes do not expose the token', () => {
  const tokens = new Set(Array.from({ length: 100 }, generateToken));
  assert.equal(tokens.size, 100);
  for (const token of tokens) {
    assert.match(token, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(hashToken(token).length, 64);
    assert.notEqual(hashToken(token), token);
  }
});
test('OTP generation includes leading zeroes and always returns six digits', () => {
  for (let index = 0; index < 100; index++) assert.match(generateCode(), /^\d{6}$/);
});
test('partial search treats SQL LIKE wildcards as literal characters', () => {
  assert.equal(escapeLike('100%_done\\today'), '100\\%\\_done\\\\today');
});
