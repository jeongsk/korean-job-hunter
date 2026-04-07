#!/usr/bin/env node
/**
 * EXP-159: Region alias NLP queries
 * Tests for 수도권, 지방, 해외 region groupings in Korean NLP parser
 */
const { parseKoreanQuery } = require('./scripts/nlp-parser.js');

let passed = 0, failed = 0;
function test(name, input, expectedFn) {
  const r = parseKoreanQuery(input);
  const ok = expectedFn(r.filters);
  if (ok) { console.log('✅', name); passed++; }
  else { console.log('❌', name, '→', JSON.stringify(r.filters)); failed++; }
}

// === 수도권 (Seoul metropolitan area: 서울 OR 경기 OR 인천) ===
test('수도권 → OR(서울, 경기, 인천)', '수도권 공고', f =>
  f.length === 1 && f[0].includes('서울') && f[0].includes('경기') && f[0].includes('인천') && f[0].includes('OR'));

test('수도권 + skill', '수도권 리액트 공고', f =>
  f.some(x => x.includes('서울') && x.includes('OR')) && f.some(x => x.includes('react')));

test('수도권 + company negation', '수도권 카카오 빼고', f =>
  f.some(x => x.includes('서울') && x.includes('OR')) && f.some(x => x.includes('NOT LIKE') && x.includes('카카오')));

test('수도권 + salary threshold', '수도권 연봉 6000 이상', f =>
  f.some(x => x.includes('서울') && x.includes('OR')) && f.some(x => x.includes('salary_min >= 6000')));

test('수도권 + employment type', '수도권 정규직 공고', f =>
  f.some(x => x.includes('서울') && x.includes('OR')) && f.some(x => x.includes("employment_type = 'regular'")));

test('수도권 no keyword leak', '수도권 공고', f =>
  !f.some(x => x.includes("title LIKE '%수도권%'")));

// === 지방 (non-수도권: NOT 서울 AND NOT 경기 AND NOT 인천) ===
test('지방 → exclusion', '지방 공고', f =>
  f.length === 1 && f[0].includes('NOT LIKE') && f[0].includes('서울') && f[0].includes('경기') && f[0].includes('인천'));

test('지방 + employment', '지방 인턴 공고', f =>
  f.some(x => x.includes('NOT LIKE') && x.includes('서울')) && f.some(x => x.includes("employment_type = 'intern'")));

test('지방 no keyword leak', '지방 공고', f =>
  !f.some(x => x.includes("title LIKE '%지방%'")));

// === 해외 (foreign: keyword search) ===
test('해외 → keyword search', '해외 공고', f =>
  f.some(x => x.includes('해외')));

test('해외 no keyword leak beyond intended', '해외 공고', f =>
  f.filter(x => x.includes('해외')).length === 1);

// === Combined with individual locations ===
test('서울 + 수도권 no duplicate conflict', '서울 수도권 공고', f => {
  const locFilters = f.filter(x => x.includes('location'));
  return locFilters.length <= 2;
});

// === Edge cases ===
test('수도권 + career stage', '수도권 시니어 공고', f =>
  f.some(x => x.includes('서울') && x.includes('OR')) && f.some(x => x.includes("career_stage = 'senior'")));

test('지방 + deadline urgency', '지방 마감임박 공고', f =>
  f.some(x => x.includes('NOT LIKE') && x.includes('서울')) && f.some(x => x.includes('deadline')));

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Region alias NLP: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
