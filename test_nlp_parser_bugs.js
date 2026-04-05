#!/usr/bin/env node
// test_nlp_parser_bugs.js — Tests for EXP-135: 면접후결정 salary filter + N년차 이상 career_stage
const { parseKoreanQuery } = require('./scripts/nlp-parser');

let passed = 0, failed = 0;

function test(name, query, checkFn) {
  const result = parseKoreanQuery(query);
  try {
    checkFn(result);
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}\n   Query: "${query}"\n   Error: ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

function hasFilter(result, substring) {
  return result.filters.some(f => f.includes(substring));
}

// === Bug 1: 면접후결정 should be salary filter, NOT interview status ===

test('면접후결정 → salary filter (not interview)', '면접후결정 공고', (r) => {
  assert(!hasFilter(r, 'interview'), 'Should NOT have interview status filter');
  assert(hasFilter(r, 'salary'), 'Should have salary-related filter');
});

test('면접후결정 → no keyword leak', '면접후결정 공고', (r) => {
  const keywordFilter = r.filters.find(f => f.includes('j.title LIKE') && f.includes('면접'));
  assert(!keywordFilter, 'Should NOT have 면접후결정 as title/company keyword');
});

test('면접보는 → interview status still works', '면접보는 공고', (r) => {
  assert(hasFilter(r, "a.status = 'interview'"), 'Should have interview status');
});

test('면접잡힌 → interview status still works', '면접잡힌 공고 있어?', (r) => {
  assert(hasFilter(r, "a.status = 'interview'"), 'Should have interview status');
});

test('면접 alone → interview status', '면접 공고', (r) => {
  assert(hasFilter(r, "a.status = 'interview'"), 'Should have interview status');
});

test('면접후결정 + skill composite', '면접후결정 리액트 공고', (r) => {
  assert(!hasFilter(r, 'interview'), 'Should NOT have interview status');
  assert(hasFilter(r, 'salary'), 'Should have salary filter');
  assert(hasFilter(r, 'react'), 'Should have react skill filter');
});

// === Bug 2: N년차 이상 should give tighter career_stage filter ===

test('3년차 이상 → mid+', '3년차 이상 리액트', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(!cf.includes('entry'), 'Should NOT include entry');
  assert(!cf.includes('junior'), 'Should NOT include junior');
  assert(cf.includes('mid'), 'Should include mid');
  assert(cf.includes('senior'), 'Should include senior');
});

test('5년차 이상 → mid+', '5년차 이상 백엔드', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(!cf.includes('entry'), 'Should NOT include entry');
  assert(!cf.includes('junior'), 'Should NOT include junior');
  assert(cf.includes('mid'), 'Should include mid');
});

test('10년차 이상 → senior+', '10년차 이상 공고', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(!cf.includes('mid'), 'Should NOT include mid');
  assert(cf.includes('senior'), 'Should include senior');
  assert(cf.includes('lead'), 'Should include lead');
});

test('3년차 alone → inclusive (entry+)', '3년차 공고', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(cf.includes('entry'), 'Should include entry for 3년차 alone');
});

test('5년차 alone → mid+ (no junior)', '5년차 공고 있어?', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(!cf.includes('entry'), 'Should NOT include entry');
  assert(!cf.includes('junior'), 'Should NOT include junior');
  assert(cf.includes('mid'), 'Should include mid');
});

test('10년차 alone → senior+', '10년차 공고 있어?', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(!cf.includes('mid'), 'Should NOT include mid');
  assert(cf.includes('senior'), 'Should include senior');
});

// N년 이상 (without 차) should still work correctly
test('3년 이상 → all stages', '경력 3년 이상 공고', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(cf.includes('entry'), '3년 이상 should include all (old behavior)');
});

test('5년 이상 → mid+', '경력 5년 이상 서울', (r) => {
  const cf = r.filters.find(f => f.includes('career_stage'));
  assert(cf, 'Should have career_stage filter');
  assert(!cf.includes('entry'), 'Should NOT include entry');
  assert(cf.includes('mid'), 'Should include mid');
});

// === Negative: queries should not break ===
test('plain 면접후결정 has no keyword leak', '면접후결정', (r) => {
  const kwFilters = r.filters.filter(f => f.includes('j.title LIKE') && f.includes('면접'));
  assert(kwFilters.length === 0, 'Should have no title LIKE filters with 면접');
});

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed + failed} tests, ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('❌ Some tests failed');
  process.exit(1);
} else {
  console.log('✅ All tests passed!');
}
