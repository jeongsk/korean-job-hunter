/**
 * EXP-068: Salary Pipeline Integration Tests
 * 
 * Verifies that normalizeSalary is integrated into parseWantedJob
 * so salary_min/salary_max are populated for DB storage and NLP salary queries.
 * 
 * Gap found: salary normalization existed in test_salary_normalization.js
 * but was never wired into the production post-processor. Salary NLP queries
 * (연봉 5000 이상) would never match because salary_min/salary_max were always null.
 */

const assert = require('assert');
const { parseWantedJob, normalizeSalary } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

// === normalizeSalary unit tests ===
test('normalizeSalary: 연봉 range 만원', () => {
  const r = normalizeSalary('연봉 5000~8000만원');
  assert.deepStrictEqual(r, { min: 5000, max: 8000 });
});

test('normalizeSalary: 연봉 single value 이상', () => {
  const r = normalizeSalary('연봉 6000만원 이상');
  // 이상 means minimum-only, max is the same as min
  assert.strictEqual(r.min, 6000);
  assert.ok(r.max === null || r.max === 6000);
});

test('normalizeSalary: 월급 range (monthly→annual)', () => {
  const r = normalizeSalary('월급 300~500만원');
  assert.deepStrictEqual(r, { min: 3600, max: 6000 });
});

test('normalizeSalary: 억 range', () => {
  const r = normalizeSalary('연봉 1~1.5억');
  assert.deepStrictEqual(r, { min: 10000, max: 15000 });
});

test('normalizeSalary: 면접후결정 → null', () => {
  assert.strictEqual(normalizeSalary('면접후결정'), null);
});

test('normalizeSalary: null/empty → null', () => {
  assert.strictEqual(normalizeSalary(null), null);
  assert.strictEqual(normalizeSalary(''), null);
});

// === parseWantedJob integration: salary_min/salary_max populated ===
test('parseWantedJob: salary range populates salary_min/max', () => {
  const job = parseWantedJob({
    title: '카카오 경력 3~10년 서울 연봉 5000~8000만원 정규직 프론트엔드 개발자',
    url: 'https://example.com/job/1'
  });
  assert.strictEqual(job.salary_min, 5000);
  assert.strictEqual(job.salary_max, 8000);
});

test('parseWantedJob: salary 이상 populates salary_min only', () => {
  const job = parseWantedJob({
    title: '네이버 경력 5년 이상 경기 성남시 분당구 연봉 6000만원 이상 백엔드 개발자',
    url: 'https://example.com/job/2'
  });
  assert.strictEqual(job.salary_min, 6000);
  // max equals min when no explicit upper bound (만원 single-value format)
  assert.ok(job.salary_max === null || job.salary_max >= 6000);
});

test('parseWantedJob: 면접후결정 leaves salary_min/max null', () => {
  const job = parseWantedJob({
    title: '토스 신입·경력 면접후결정 서울 데이터 엔지니어',
    url: 'https://example.com/job/3'
  });
  assert.strictEqual(job.salary_min, null);
  assert.strictEqual(job.salary_max, null);
  assert.strictEqual(job.salary, '면접후결정');
});

test('parseWantedJob: no salary leaves salary_min/max null', () => {
  const job = parseWantedJob({
    title: '라인 경력 3년 이상 서울 React 개발자',
    url: 'https://example.com/job/4'
  });
  assert.strictEqual(job.salary_min, null);
  assert.strictEqual(job.salary_max, null);
});

test('parseWantedJob: 월급 converts to annual in salary_min/max', () => {
  const job = parseWantedJob({
    title: '스타트업 경력 무관 월급 200~300만원 서울 주니어 개발자',
    url: 'https://example.com/job/5'
  });
  assert.strictEqual(job.salary_min, 2400);
  assert.strictEqual(job.salary_max, 3600);
});

test('parseWantedJob: 억 salary populates salary_min/max', () => {
  const job = parseWantedJob({
    title: '삼성 경력 10년 이상 연봉 1~2억 수원 시니어 엔지니어',
    url: 'https://example.com/job/6'
  });
  assert.strictEqual(job.salary_min, 10000);
  assert.strictEqual(job.salary_max, 20000);
});

// === Summary ===
console.log(`\n📊 ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
