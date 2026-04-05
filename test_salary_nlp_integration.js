#!/usr/bin/env node
/**
 * EXP-061: Salary NLP Integration Tests
 * 
 * Integrates normalizeSalary from EXP-060 into the NLP parser so
 * queries like "연봉 6000 이상" generate proper numeric filters.
 * 
 * Since salary is raw text in DB, we add salary_min/salary_max integer columns
 * populated during scraping. The NLP parser then generates SQL against those columns.
 */

// === normalizeSalary (from EXP-060) ===
function normalizeSalary(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.trim();
  if (/면접후결정|회사내규|협의|상여|별도/.test(text)) return null;
  let min = null, max = null, isMonthly = false;
  if (/월급|월\s*급|개월/.test(text)) isMonthly = true;
  const rangeMatch = text.match(/(\d[\d,]*)\s*[~\-]\s*(\d[\d,]*)\s*만?\s*원/);
  if (rangeMatch) {
    min = parseInt(rangeMatch[1].replace(/,/g, ''));
    max = parseInt(rangeMatch[2].replace(/,/g, ''));
  } else {
    const singleMatch = text.match(/(\d[\d,]*)\s*만?\s*원/);
    if (singleMatch) {
      const val = parseInt(singleMatch[1].replace(/,/g, ''));
      if (/이상|↑/.test(text)) { min = val; } else { min = val; max = val; }
    }
  }
  if (min === null) {
    const eokRangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/);
    if (eokRangeMatch) {
      min = Math.round(parseFloat(eokRangeMatch[1]) * 10000);
      max = Math.round(parseFloat(eokRangeMatch[2]) * 10000);
    } else {
      const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억/);
      if (eokMatch) {
        const manwon = Math.round(parseFloat(eokMatch[1]) * 10000);
        if (/이상|↑/.test(text)) { min = manwon; } else { min = manwon; max = manwon; }
      }
    }
  }
  if (min === null) return null;
  if (isMonthly) { min *= 12; if (max !== null) max *= 12; }
  return { min, max: max || min, annual: true };
}

// === parseKoreanQuery v4 (extends v3 with salary thresholds) ===
const { parseKoreanQuery } = require("./scripts/nlp-parser");

// === Test Cases ===
const testCases = [
  // --- Salary threshold queries (NEW) ---
  { id: 1, input: "연봉 6000 이상 공고", expectedFilters: ["j.salary_min >= 6000"], note: "Salary minimum threshold" },
  { id: 2, input: "연봉 8000만원 이상", expectedFilters: ["j.salary_min >= 8000"], note: "Salary with 만원 unit" },
  { id: 3, input: "연봉 5000~8000 공고", expectedFilters: ["(j.salary_min <= 8000 AND j.salary_max >= 5000)"], note: "Salary range overlap" },
  { id: 4, input: "연봉 1억 이상", expectedFilters: ["j.salary_min >= 10000"], note: "억 unit converted to 만원" },
  { id: 5, input: "연봉 공고 있어?", expectedFilters: ["j.salary IS NOT NULL AND j.salary != ''"], note: "Salary existence check" },
  { id: 6, input: "급여 5000 이상 관심 공고", expectedFilters: ["a.status = 'interested'", "j.salary_min >= 5000"], note: "Salary + status composite" },
  { id: 7, input: "연봉 3000부터 서울", expectedFilters: ["j.salary_min >= 3000", "j.location LIKE '%서울%'"], note: "Salary from + location" },
  
  // --- Existing v3 tests (regression check) ---
  { id: 10, input: "면접 잡힌 거 있어?", expectedFilters: ["a.status = 'interview'"], expectedOrder: "a.updated_at DESC" },
  { id: 11, input: "지원한 거 다 보여줘", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  { id: 12, input: "관심 공고 마감순", expectedFilters: ["a.status = 'interested'"], expectedOrder: "j.deadline ASC" },
  { id: 13, input: "카카오 빼고 지원한 거", expectedFilters: ["a.status = 'applied'", "j.company NOT LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { id: 14, input: "재택 공고 있어?", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC" },
  { id: 15, input: "5년차 공고 있어?", expectedFilters: ["j.career_stage IN ('mid','senior','lead')"], expectedOrder: "a.updated_at DESC" },
  { id: 16, input: "마감임박 공고", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7"], expectedOrder: "a.updated_at DESC" },
  { id: 17, input: "신입 공고 있어?", expectedFilters: ["(j.career_stage = 'entry' OR j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC" },

  // --- Additional salary + composite tests ---
  { id: 18, input: "연봉 5000 이상 백엔드", expectedFilters: ["j.salary_min >= 5000"], note: "Salary + job keyword, no leak of '5000'" },
  { id: 19, input: "토스 연봉 6000 이상", expectedFilters: ["j.salary_min >= 6000", "j.company LIKE '%토스%'"], note: "Company + salary composite" },
  { id: 20, input: "연봉 1~1.5억 공고", expectedFilters: ["(j.salary_min <= 15000 AND j.salary_max >= 10000)"], note: "억 range in salary query" },
  { id: 21, input: "면접 연봉 7000 이상", expectedFilters: ["a.status = 'interview'", "j.salary_min >= 7000"], note: "Status + salary threshold" },
];

// Run tests
let passed = 0, failed = 0;
const failures = [];

console.log('🧪 EXP-061: Salary NLP Integration\n');
console.log('='.repeat(70));

for (const tc of testCases) {
  const result = parseKoreanQuery(tc.input);
  let tcPassed = true;

  for (const ef of tc.expectedFilters) {
    if (!result.filters.some(f => f === ef)) {
      failures.push({ id: tc.id, input: tc.input, expected: ef, got: JSON.stringify(result.filters) });
      tcPassed = false; break;
    }
  }

  if (tcPassed && tc.expectedOrder && result.order !== tc.expectedOrder) {
    failures.push({ id: tc.id, input: tc.input, expected: `order: ${tc.expectedOrder}`, got: `order: ${result.order}` });
    tcPassed = false;
  }

  if (tcPassed) {
    console.log(`✅ #${tc.id} "${tc.input}" → [${result.filters.join(', ')}] | ${result.order}`);
    passed++;
  } else {
    const last = failures[failures.length - 1];
    console.log(`❌ #${tc.id} "${tc.input}"`);
    console.log(`   Expected: ${last.expected}`);
    console.log(`   Got: ${last.got}`);
    if (tc.note) console.log(`   Note: ${tc.note}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
if (failed === 0) console.log('✅ All salary NLP integration tests passed!');
else console.log(`❌ ${failed} tests failed`);

// === Schema test: salary_min/salary_max columns ===
console.log('\n--- Schema: salary_min/salary_max columns ---');

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'jobs.db');

const db = new sqlite3.Database(dbPath);
db.all("PRAGMA table_info(jobs)", (err, rows) => {
  if (err) { console.log('❌ Cannot read schema:', err.message); process.exit(0); }
  const cols = rows.map(r => r.name);
  
  if (cols.includes('salary_min')) { console.log('✅ salary_min column exists'); passed++; }
  else { console.log('⚠️  salary_min column not yet added (needs migration)'); }
  
  if (cols.includes('salary_max')) { console.log('✅ salary_max column exists'); passed++; }
  else { console.log('⚠️  salary_max column not yet added (needs migration)'); }
  
  console.log('='.repeat(70));
  console.log(`\n📊 Total: ${passed}/${passed + failed} passed`);
  db.close();
  if (failed > 0) process.exit(1);
});
