/**
 * EXP-172: Monthly salary prefix (월급), 에서~사이 range format, and 경력무관 fix
 * Tests for NLP parser salary and experience query improvements.
 */
const { parseKoreanQuery } = require('./scripts/nlp-parser.js');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, query, checkFn) {
  try {
    const result = parseKoreanQuery(query);
    checkFn(result);
    passed++;
    console.log(`✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`❌ ${name}: ${e.message}`);
  }
}

// === 월급 prefix tests ===
test('월급 500 이상 → annual 6000 min', '월급 500 이상', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min >= 6000')),
    `Expected salary_min >= 6000, got: ${JSON.stringify(r.filters)}`);
  // Should not leak 월급 or 이상 as keywords
  assert.ok(!r.filters.some(f => f.includes('LIKE') && f.includes('월급')),
    '월급 should not leak into LIKE keyword search');
});

test('월급 300~500 → annual range 3600~6000', '월급 300~500', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min <= 6000') && f.includes('salary_max >= 3600')),
    `Expected range 3600-6000, got: ${JSON.stringify(r.filters)}`);
});

test('월급 200 이상 백엔드', '월급 200 이상 백엔드', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min >= 2400')),
    `Expected salary_min >= 2400, got: ${JSON.stringify(r.filters)}`);
  assert.ok(r.filters.some(f => f.includes('skills')),
    'Should also have skill filter');
});

test('연봉 5000 이상 still works (regression)', '연봉 5000 이상', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min >= 5000')),
    `Expected salary_min >= 5000, got: ${JSON.stringify(r.filters)}`);
});

// === 에서~사이 range format ===
test('연봉 5000에서 8000 사이 → range filter', '연봉 5000에서 8000 사이', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min <= 8000') && f.includes('salary_max >= 5000')),
    `Expected range 5000-8000, got: ${JSON.stringify(r.filters)}`);
  // Should not leak '사이' as keyword
  assert.ok(!r.filters.some(f => f.includes("LIKE '%사이%'")),
    '사이 should not leak into LIKE keyword search');
});

test('연봉 3에서 5억 → 억 range with 에서', '연봉 3에서 5억', r => {
  assert.ok(r.filters.some(f => f.includes('30000') && f.includes('50000')),
    `Expected range 30000-50000, got: ${JSON.stringify(r.filters)}`);
});

// === 경력무관 fix ===
test('경력무관 공고 → all stages, no keyword leak', '경력무관 공고', r => {
  assert.ok(r.filters.some(f => f.includes("entry") && f.includes("lead")),
    `Expected all stages filter, got: ${JSON.stringify(r.filters)}`);
  assert.ok(!r.filters.some(f => f.includes("LIKE '%경력무관%'")),
    '경력무관 should not leak into LIKE keyword search');
});

// === No regression: existing patterns ===
test('연봉 5000~8000 range still works', '연봉 5000~8000', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min <= 8000') && f.includes('salary_max >= 5000')),
    `Expected range, got: ${JSON.stringify(r.filters)}`);
});

test('연봉 1억 이상 → 10000 min', '연봉 1억 이상', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min >= 10000')),
    `Expected salary_min >= 10000, got: ${JSON.stringify(r.filters)}`);
});

test('월수입 400 이상 → annual 4800 min', '월수입 400 이상', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min >= 4800')),
    `Expected salary_min >= 4800, got: ${JSON.stringify(r.filters)}`);
});

// === Combined queries ===
test('백엔드 월급 400 이상 서울', '백엔드 월급 400 이상 서울', r => {
  assert.ok(r.filters.some(f => f.includes('salary_min >= 4800')),
    `Expected monthly→annual conversion, got: ${JSON.stringify(r.filters)}`);
  assert.ok(r.filters.some(f => f.includes('skills')),
    'Should have skill filter');
  assert.ok(r.filters.some(f => f.includes('location')),
    'Should have location filter');
});

console.log(`\n📊 ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
