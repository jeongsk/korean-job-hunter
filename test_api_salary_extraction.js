#!/usr/bin/env node
// test_api_salary_extraction.js — Tests for salary extraction from JD descriptions via API detail
// EXP-126: API detail enrichment salary extraction

let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; }
  else { failed++; console.error(`  ❌ ${msg}`); }
}

function assertEquals(actual, expected, msg) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) { passed++; }
  else { failed++; console.error(`  ❌ ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }
}

const { extractSalaryLine, normalizeSalary } = require('./scripts/post-process-wanted');

console.log('🧪 extractSalaryLine + normalizeSalary from JD descriptions');

// Test 1: 연봉 range in JD
{
  const jd = '[자격요건]\n- 경력 3년 이상\n- React, TypeScript\n[복리후생]\n- 연봉 5000~8000만원\n- 주 5일 근무';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('5000') && line.includes('8000'), '연봉 range extracted from JD');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 5000, max: 8000 }, '연봉 range normalized');
}

// Test 2: 연봉 single value
{
  const jd = '연봉 6000만원 이상\n- 경력무관';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('6000'), '연봉 single value extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 6000, max: 6000 }, '연봉 single normalized');
}

// Test 3: 면접후결정
{
  const jd = '자격요건\n- 3년 이상\n혜택\n- 면접후결정';
  const line = extractSalaryLine(jd);
  assertEquals(line, '면접후결정', '면접후결정 extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, null, '면접후결정 normalizes to null');
}

// Test 4: 회사내규
{
  const jd = '연봉은 회사내규에 따름';
  const line = extractSalaryLine(jd);
  assert(line === '면접후결정', '회사내규에 따름 → 면접후결정');
}

// Test 5: ₩ notation
{
  const jd = 'Salary: ₩50,000,000 ~ ₩80,000,000';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('50,000,000'), '₩ range extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 5000, max: 8000 }, '₩ range normalized to 만원');
}

// Test 6: 억 notation
{
  const jd = '연봉 1~2억';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('1') && line.includes('2억'), '억 range extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 10000, max: 20000 }, '억 range normalized');
}

// Test 7: No salary in JD
{
  const jd = '[자격요건]\n- 경력 5년 이상\n- Python, Django\n[업무내용]\n- 백엔드 개발';
  const line = extractSalaryLine(jd);
  assertEquals(line, null, 'No salary → null');
}

// Test 8: 월급 notation
{
  const jd = '월급 300~500만원\n- 경력무관';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('300') && line.includes('500'), '월급 range extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 3600, max: 6000 }, '월급 converted to 연봉');
}

// Test 9: 연봉 with colon
{
  const jd = '연봉: 7000만원';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('7000'), '연봉 with colon extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 7000, max: 7000 }, '연봉 colon normalized');
}

// Test 10: 만원 without 연봉/월급 prefix (standalone range)
{
  const jd = '보상\n- 5000 ~ 8000만 원';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('5000'), 'standalone 만원 range extracted');
  const norm = normalizeSalary(line);
  assertEquals(norm, { min: 5000, max: 8000 }, 'standalone 만원 normalized');
}

// Test 11: Empty/null description
{
  assertEquals(extractSalaryLine(''), null, 'Empty string → null');
  assertEquals(extractSalaryLine(null), null, 'null → null');
}

// Test 12: Multiple salary mentions (first match wins)
{
  const jd = '연봉 5000~7000만원\n참고로 업계 평균은 4000~6000만원';
  const line = extractSalaryLine(jd);
  assert(line && line.includes('5000') && line.includes('7000'), 'First salary match wins');
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
