#!/usr/bin/env node
// test_parsing_edge_cases.js — EXP-133: Edge cases for company/location/title extraction
// Tests: ㈜ prefix company names, parenthetical role levels, parenthetical tech skills,
//        and city-name-as-company-suffix false positives

const { parseWantedJob } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; }
  else { console.error(`❌ ${msg}`); failed++; }
}

// Test 1: ㈜삼성전자 — company suffix guard (삼성 not treated as location)
{
  const r = parseWantedJob('㈜삼성전자 백엔드 엔지니어 경력 5년 이상 합격금 200만원');
  assert(r.company === '삼성전자', `㈜삼성전자 company: got "${r.company}", expected "삼성전자"`);
  assert(r.title === '백엔드 엔지니어', `㈜삼성전자 title: got "${r.title}", expected "백엔드 엔지니어"`);
  assert(r.location === '', `㈜삼성전자 location: got "${r.location}", expected ""`);
}

// Test 2: (Senior) in title preserved
{
  const r = parseWantedJob('Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원');
  assert(r.title.includes('Senior'), `(Senior) title: got "${r.title}", expected to include "Senior"`);
  assert(r.company === '웨이브릿지', `(Senior) company: got "${r.company}", expected "웨이브릿지"`);
}

// Test 3: (JAVA) in title preserved
{
  const r = parseWantedJob('디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원');
  assert(r.title.includes('JAVA'), `(JAVA) title: got "${r.title}", expected to include "JAVA"`);
  assert(r.company === '미래엔', `(JAVA) company: got "${r.company}", expected "미래엔"`);
}

// Test 4: 주식회사 with multi-word company
{
  const r = parseWantedJob('주식회사 카카오엔터테인먼트 프론트엔드 개발자 경력 3~5년 보상금 200만원');
  assert(r.company === '카카오엔터테인먼트', `주식회사 company: got "${r.company}"`);
  assert(r.title === '프론트엔드 개발자', `주식회사 title: got "${r.title}"`);
}

// Test 5: Real company name still has English parenthetical removed
{
  const r = parseWantedJob('버티고우게임즈 (Vertigo Games) 시니어 백엔드 개발자 경력 5년 이상 보상금 100만원');
  assert(r.company === '버티고우게임즈', `Vertigo Games company: got "${r.company}"`);
  assert(!r.title.includes('Vertigo Games'), `Vertigo Games removed from title: "${r.title}"`);
}

// Test 6: 삼성 as location when it's actually 삼성동 (standalone, not part of company)
{
  const r = parseWantedJob('네이버 백엔드 개발자 경력 3년 삼성');
  assert(r.location.includes('삼성'), `삼성 standalone location: got "${r.location}"`);
}

// Test 7: (Junior) preserved in title
{
  const r = parseWantedJob('Frontend Developer (Junior)스타트업경력 1-3년합격보상금 50만원');
  assert(r.title.includes('Junior'), `(Junior) title: got "${r.title}"`);
}

// Test 8: (Python) preserved in title
{
  const r = parseWantedJob('백엔드 개발자 (Python)토스경력 3년 이상보상금 200만원');
  assert(r.title.includes('Python'), `(Python) title: got "${r.title}"`);
  assert(r.company === '토스', `(Python) company: got "${r.company}"`);
}

// Test 9: ㈜LG전자
{
  const r = parseWantedJob('㈜LG전자 소프트웨어 엔지니어 경력 5년 이상 보상금 300만원');
  assert(r.company.includes('LG'), `㈜LG전자 company: got "${r.company}"`);
  assert(!r.title.includes('㈜'), `㈜ not in title: got "${r.title}"`);
}

// Test 10: 여의도 as location (not part of company)
{
  const r = parseWantedJob('카카오 백엔드 개발자 경력 3년 여의도');
  assert(r.location.includes('여의도'), `여의도 location: got "${r.location}"`);
}

console.log(`\n📊 EXP-133 Edge Cases: ${passed}/${passed + failed} passed`);
if (failed === 0) console.log('✅ All edge case tests passed!');
else console.log(`❌ ${failed} test(s) failed`);
