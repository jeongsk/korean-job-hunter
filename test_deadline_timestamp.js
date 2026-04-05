// test_deadline_timestamp.js — Tests for Unix timestamp and ISO datetime deadline normalization
// EXP-120: normalizeDeadline previously rejected non-string and ISO datetime inputs,
// causing null deadlines for Wanted API-sourced jobs (due_time is a Unix timestamp)

const assert = require('assert');
const { normalizeDeadline } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('=== Deadline Timestamp Normalization Tests ===\n');

// --- Unix timestamp (number, seconds) ---
console.log('Unix Timestamp (seconds):');

test('Unix seconds (Apr 30, 2025) normalizes correctly', () => {
  const result = normalizeDeadline(1746000000);
  assert.strictEqual(result, '2025-04-30', `Got ${result}`);
});

test('Unix seconds (Jan 1, 2026) normalizes correctly', () => {
  const result = normalizeDeadline(1767225600);
  assert.strictEqual(result, '2026-01-01', `Got ${result}`);
});

test('Zero timestamp returns null (invalid)', () => {
  const result = normalizeDeadline(0);
  assert.strictEqual(result, null);
});

// --- Unix timestamp (number, milliseconds) ---
console.log('\nUnix Timestamp (milliseconds):');

test('Unix ms (Apr 30, 2025) normalizes correctly', () => {
  const result = normalizeDeadline(1746000000000);
  assert.strictEqual(result, '2025-04-30', `Got ${result}`);
});

test('Unix ms (Jan 1, 2026) normalizes correctly', () => {
  const result = normalizeDeadline(1767225600000);
  assert.strictEqual(result, '2026-01-01', `Got ${result}`);
});

// --- Numeric string ---
console.log('\nNumeric String:');

test('String Unix seconds (Apr 30, 2025)', () => {
  const result = normalizeDeadline('1746000000');
  assert.strictEqual(result, '2025-04-30', `Got ${result}`);
});

test('String Unix ms (Jan 1, 2026)', () => {
  const result = normalizeDeadline('1767225600000');
  assert.strictEqual(result, '2026-01-01', `Got ${result}`);
});

// --- ISO 8601 datetime ---
console.log('\nISO 8601 Datetime:');

test('ISO datetime with Z', () => {
  const result = normalizeDeadline('2026-04-30T23:59:59Z');
  assert.strictEqual(result, '2026-04-30');
});

test('ISO datetime with timezone offset', () => {
  const result = normalizeDeadline('2026-04-30T23:59:59+09:00');
  assert.strictEqual(result, '2026-04-30');
});

test('ISO datetime without timezone', () => {
  const result = normalizeDeadline('2026-12-31T00:00:00');
  assert.strictEqual(result, '2026-12-31');
});

// --- Backward compatibility: existing formats still work ---
console.log('\nBackward Compatibility:');

test('D-3 still works', () => {
  const result = normalizeDeadline('D-3');
  assert.ok(result, 'D-3 should still normalize');
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(result), `Expected date format, got ${result}`);
});

test('상시모집 still returns null', () => {
  assert.strictEqual(normalizeDeadline('상시모집'), null);
});

test('YYYY-MM-DD still works', () => {
  assert.strictEqual(normalizeDeadline('2026-04-30'), '2026-04-30');
});

test('YYYY.MM.DD still works', () => {
  assert.strictEqual(normalizeDeadline('2026.04.30'), '2026-04-30');
});

test('null returns null', () => {
  assert.strictEqual(normalizeDeadline(null), null);
});

test('undefined returns null', () => {
  assert.strictEqual(normalizeDeadline(undefined), null);
});

test('empty string returns null', () => {
  assert.strictEqual(normalizeDeadline(''), null);
});

// --- Edge cases ---
console.log('\nEdge Cases:');

test('Very old timestamp (< 2000) returns null', () => {
  assert.strictEqual(normalizeDeadline(946684799), null);
});

test('Negative number returns null', () => {
  assert.strictEqual(normalizeDeadline(-1000), null);
});

test('Short numeric string (not a timestamp) passes through to string parsing', () => {
  // 8-digit string like "20260430" should NOT match the 9-13 digit pattern
  const result = normalizeDeadline('20260430');
  // This won't match any pattern, should return null
  assert.strictEqual(result, null);
});

console.log(`\n📊 ${passed} passed | ${failed} failed`);
if (failed > 0) process.exit(1);
console.log('✅ All deadline timestamp tests passed!');
