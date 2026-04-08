/**
 * EXP-165: Work type qualifier leak and negation fix
 * 
 * Tests for:
 * 1. 가능/불가/출근 not leaking into job titles
 * 2. 재택불가/원격불가 correctly classified as onsite (not remote)
 * 3. 출근 가능 correctly classified as onsite
 */
const { parseWantedJob } = require('./scripts/post-process-wanted');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.error('FAIL:', name, e.message); }
}

// === 가능 leak prevention ===
test('가능 does not leak into title (remote 가능)', () => {
  const r = parseWantedJob('버티고우게임즈경력3년 이상연봉 5000~7000만원원격근무 가능프론트엔드 개발자');
  assert.ok(!r.title.includes('가능'), `Title should not contain 가능: ${r.title}`);
  assert.strictEqual(r.work_type, 'remote');
  assert.ok(r.title.includes('프론트엔드'), `Title should contain 프론트엔드: ${r.title}`);
});

test('가능 does not leak into title (재택 가능)', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000~7000만원재택근무 가능백엔드 개발자');
  assert.ok(!r.title.includes('가능'), `Title should not contain 가능: ${r.title}`);
  assert.strictEqual(r.work_type, 'remote');
});

test('가능 does not leak with hybrid', () => {
  const r = parseWantedJob('토스경력5년 이상연봉 6000~8000만원하이브리드 가능Senior Backend Engineer');
  assert.ok(!r.title.includes('가능'), `Title should not contain 가능: ${r.title}`);
  assert.strictEqual(r.work_type, 'hybrid');
});

// === 재택불가 negation ===
test('재택불가 classified as onsite', () => {
  const r = parseWantedJob('네이버경력무관면접후결정재택불가안드로이드 개발자');
  assert.strictEqual(r.work_type, 'onsite', '재택불가 should be onsite');
  assert.ok(!r.title.includes('불가'), `Title should not contain 불가: ${r.title}`);
});

test('원격불가 classified as onsite', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000~7000만원원격불가백엔드 개발자');
  assert.strictEqual(r.work_type, 'onsite', '원격불가 should be onsite');
  assert.ok(!r.title.includes('불가'), `Title should not contain 불가: ${r.title}`);
});

test('리모트불가 classified as onsite', () => {
  const r = parseWantedJob('라인경력5년 이상연봉 8000만원리모트불가iOS 개발자');
  assert.strictEqual(r.work_type, 'onsite', '리모트불가 should be onsite');
});

// === 출근 keyword ===
test('출근 가능 classified as onsite', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000만원출근 가능백엔드 개발자');
  assert.strictEqual(r.work_type, 'onsite', '출근 가능 should be onsite');
  assert.ok(!r.title.includes('출근'), `Title should not contain 출근: ${r.title}`);
  assert.ok(!r.title.includes('가능'), `Title should not contain 가능: ${r.title}`);
});

test('출근필수 does not leak', () => {
  const r = parseWantedJob('삼성경력5년 이상연봉 6000~8000만원출근필수백엔드 개발자');
  assert.ok(!r.title.includes('출근'), `Title should not contain 출근: ${r.title}`);
});

// === Positive work_type still works ===
test('재택근무 without qualifier still remote', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000~7000만원재택근무백엔드 개발자');
  assert.strictEqual(r.work_type, 'remote');
});

test('원격근무 still remote', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000~7000만원원격근무백엔드 개발자');
  assert.strictEqual(r.work_type, 'remote');
});

test('하이브리드 still hybrid', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000~7000만원하이브리드백엔드 개발자');
  assert.strictEqual(r.work_type, 'hybrid');
});

test('no work type keyword defaults to onsite', () => {
  const r = parseWantedJob('카카오경력3년 이상연봉 5000~7000만원백엔드 개발자');
  assert.strictEqual(r.work_type, 'onsite');
});

// === Regression: 합격/보상금 not affected ===
test('합격/보상금 still stripped', () => {
  const r = parseWantedJob('카카오경력3년 이상보상금 50만원합격백엔드 개발자');
  assert.ok(!r.title.includes('합격'), `Title should not contain 합격: ${r.title}`);
  assert.ok(r.reward.includes('보상금'), `Reward should contain 보상금: ${r.reward}`);
});

console.log(`\n${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
