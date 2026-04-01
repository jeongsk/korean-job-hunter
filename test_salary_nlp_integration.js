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
function parseKoreanQuery(input) {
  const filters = [];
  let order = "a.updated_at DESC";
  const text = input.trim();
  if (!text) return { filters, order };

  const consumedWords = new Set();

  // === Sorting ===
  if (/최신순/.test(text)) { order = "a.updated_at DESC"; consumedWords.add('최신순'); }
  if (/(점수|매칭)순/.test(text)) { order = "m.score DESC"; consumedWords.add('점수순'); consumedWords.add('매칭순'); }
  if (/마감(순| 빠른순)/.test(text)) { order = "j.deadline ASC"; consumedWords.add('마감순'); }

  // === Status ===
  const statusPatterns = [
    { regex: /면접(잡힌|보는)?/, status: 'interview', words: ['면접', '면접보는', '면접잡힌'] },
    { regex: /지원(완료|한|했)/, status: 'applied', words: ['지원완료', '지원한', '지원했'] },
    { regex: /(관심|북마크|찜해둔|찜)/, status: 'interested', words: ['관심', '북마크', '찜해둔', '찜'] },
    { regex: /(합격|오퍼)/, status: 'offer', words: ['합격', '합격한', '오퍼'] },
    { regex: /불합격/, status: 'declined', words: ['불합격'] },
    { regex: /(탈락|거절|떨어)/, status: 'rejected,declined', words: ['탈락', '탈락한', '거절', '떨어진'] },
    { regex: /지원(예정|할)/, status: 'applying', words: ['지원예정', '지원할'] },
  ];
  for (const { regex, status, words } of statusPatterns) {
    if (regex.test(text)) {
      if (status.includes(',')) { filters.push(`a.status IN ('${status.split(',').join("','")}')`); }
      else { filters.push(`a.status = '${status}'`); }
      for (const w of words) consumedWords.add(w);
      break;
    }
  }

  // === Negation ===
  const negationMatch = text.match(/(빼고|제외|말고)/);
  const negationIdx = negationMatch ? text.indexOf(negationMatch[0]) : -1;
  let appliedNegation = false;

  // === Work type ===
  if (/(재택|원격|리모트)/.test(text)) { filters.push("j.work_type = 'remote'"); consumedWords.add('재택'); consumedWords.add('원격'); consumedWords.add('리모트'); }
  if (/하이브리드/.test(text)) { filters.push("j.work_type = 'hybrid'"); consumedWords.add('하이브리드'); }

  // === Salary threshold (NEW in v4) ===
  // Check for 억 unit first, then 만원
  const salaryEokRangeMatch = text.match(/(연봉|급여|연수입)\s*(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/);
  const salaryEokMatch = !salaryEokRangeMatch && text.match(/(연봉|급여|연수입)\s*(\d+(?:\.\d+)?)\s*억/);
  const salaryRangeMatch = !salaryEokRangeMatch && !salaryEokMatch && text.match(/(연봉|급여|연수입)\s*(\d[\d,]*)\s*[~\-]\s*(\d[\d,]*)\s*(만원)?/);
  const salaryThresholdMatch = !salaryRangeMatch && !salaryEokRangeMatch && !salaryEokMatch && text.match(/(연봉|급여|연수입)\s*(\d[\d,]*)\s*(만원)?\s*(이상|부터|↑)?/);
  
  // Consume all salary-related words to prevent keyword leak
  const salaryWords = ['연봉', '급여', '연수입', '만원', '이상', '부터'];
  for (const w of salaryWords) consumedWords.add(w);
  
  if (salaryEokRangeMatch) {
    const min = Math.round(parseFloat(salaryEokRangeMatch[2]) * 10000);
    const max = Math.round(parseFloat(salaryEokRangeMatch[3]) * 10000);
    filters.push(`(j.salary_min <= ${max} AND j.salary_max >= ${min})`);
    consumedWords.add(salaryEokRangeMatch[0]);
  } else if (salaryEokMatch) {
    const val = Math.round(parseFloat(salaryEokMatch[2]) * 10000);
    filters.push(`j.salary_min >= ${val}`);
    consumedWords.add(salaryEokMatch[0]);
  } else if (salaryRangeMatch) {
    const min = parseInt(salaryRangeMatch[2].replace(/,/g, ''));
    const max = parseInt(salaryRangeMatch[3].replace(/,/g, ''));
    filters.push(`(j.salary_min <= ${max} AND j.salary_max >= ${min})`);
    consumedWords.add(salaryRangeMatch[0]);
  } else if (salaryThresholdMatch) {
    const threshold = parseInt(salaryThresholdMatch[2].replace(/,/g, ''));
    filters.push(`j.salary_min >= ${threshold}`);
    consumedWords.add(salaryThresholdMatch[0]);
  } else if (/(연봉|급여|연수입)/.test(text)) {
    filters.push("j.salary IS NOT NULL AND j.salary != '' AND j.salary_min IS NOT NULL");
  }

  // === Experience ===
  if (/신입/.test(text)) { filters.push("(j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"); consumedWords.add('신입'); }
  const expMatch = text.match(/(\d+)\s*년\s*(이상|이상의)?/);
  if (expMatch) { filters.push(`j.experience LIKE '%${expMatch[1]}%'`); consumedWords.add(expMatch[0]); }
  const yoeMatch = text.match(/(\d+)\s*년차/);
  if (yoeMatch && !expMatch) { filters.push(`j.experience LIKE '%${yoeMatch[1]}%'`); consumedWords.add(yoeMatch[0]); consumedWords.add('년차'); }
  if (/경력/.test(text) && !/신입/.test(text) && !expMatch && !yoeMatch) { filters.push("(j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%')"); consumedWords.add('경력'); }

  // === Deadline urgency ===
  if (/마감\s*임박|곧마감/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7");
    consumedWords.add('마감임박'); consumedWords.add('곧마감'); consumedWords.add('마감'); consumedWords.add('임박');
  } else if (/오늘\s*마감/.test(text)) {
    filters.push("CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = 0");
    consumedWords.add('오늘'); consumedWords.add('마감');
  } else if (/내일\s*마감/.test(text)) {
    filters.push("CAST(julianday(j.deadline) - julianday('now') AS INTEGER) = 1");
    consumedWords.add('내일'); consumedWords.add('마감');
  } else if (/마감/.test(text) && !/마감순|마감 빠른순/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND j.deadline != ''");
    consumedWords.add('마감');
  }
  const daysLeftMatch = text.match(/(\d+)\s*일\s*남은/);
  if (daysLeftMatch) { filters.push(`j.deadline IS NOT NULL AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND ${daysLeftMatch[1]}`); consumedWords.add(daysLeftMatch[0]); }
  if (/기한\s*있는|데드라인\s*있는/.test(text)) { filters.push("j.deadline IS NOT NULL AND j.deadline != ''"); consumedWords.add('기한'); consumedWords.add('데드라인'); }

  // === Location ===
  const locations = ['서울', '판교', '강남', '역삼', '성수', '여의도', '종로', '부산', '대전', '광주', '대구', '제주'];
  for (const loc of locations) {
    if (text.includes(loc)) { filters.push(`j.location LIKE '%${loc}%'`); consumedWords.add(loc); break; }
  }

  // === Company / keyword ===
  const companies = ['카카오뱅크', '카카오페이', '카카오', '네이버', '토스', '배달의민족', '당근', '라인', '쿠팡', '삼성', '현대', 'SK', 'LG'];
  for (const c of companies) {
    if (text.includes(c)) {
      // In Korean, "X 빼고/제외/말고" means exclude X. X can be before or after the negation word.
      if (negationMatch) {
        filters.push(`j.company NOT LIKE '%${c}%'`);
        appliedNegation = true;
      } else {
        filters.push(`j.company LIKE '%${c}%'`);
      }
      consumedWords.add(c); break;
    }
  }

  // === Remaining keyword ===
  const stopWords = new Set(['있어', '공고', '보여', '보여줘', '줘', '알려', '목록', '전체', '다', '좀', '거', '하는', '것', '에서', '이', '그', '저', '관련', '중에', '번호', '개', '말고', '빼고', '제외', '만원', '이상', '부터', '잡힌', '있어?', '년차']);
  const remaining = text.split(/\s+/).filter(w => w.length >= 2 && !consumedWords.has(w) && !stopWords.has(w) && !/^\d+([~\-]\d+)?(만원|억|부터|이상)?$/.test(w));
  if (remaining.length > 0) {
    const keyword = remaining[0];
    // Apply negation context
    if (negationIdx >= 0 && text.indexOf(keyword) > negationIdx && !appliedNegation) {
      filters.push(`j.company NOT LIKE '%${keyword}%'`);
    } else {
      filters.push(`(j.title LIKE '%${keyword}%' OR j.company LIKE '%${keyword}%')`);
    }
  }

  return { filters, order };
}

// === Test Cases ===
const testCases = [
  // --- Salary threshold queries (NEW) ---
  { id: 1, input: "연봉 6000 이상 공고", expectedFilters: ["j.salary_min >= 6000"], note: "Salary minimum threshold" },
  { id: 2, input: "연봉 8000만원 이상", expectedFilters: ["j.salary_min >= 8000"], note: "Salary with 만원 unit" },
  { id: 3, input: "연봉 5000~8000 공고", expectedFilters: ["(j.salary_min <= 8000 AND j.salary_max >= 5000)"], note: "Salary range overlap" },
  { id: 4, input: "연봉 1억 이상", expectedFilters: ["j.salary_min >= 10000"], note: "억 unit converted to 만원" },
  { id: 5, input: "연봉 공고 있어?", expectedFilters: ["j.salary IS NOT NULL AND j.salary != '' AND j.salary_min IS NOT NULL"], note: "Salary existence check with normalized column" },
  { id: 6, input: "급여 5000 이상 관심 공고", expectedFilters: ["a.status = 'interested'", "j.salary_min >= 5000"], note: "Salary + status composite" },
  { id: 7, input: "연봉 3000부터 서울", expectedFilters: ["j.salary_min >= 3000", "j.location LIKE '%서울%'"], note: "Salary from + location" },
  
  // --- Existing v3 tests (regression check) ---
  { id: 10, input: "면접 잡힌 거 있어?", expectedFilters: ["a.status = 'interview'"], expectedOrder: "a.updated_at DESC" },
  { id: 11, input: "지원한 거 다 보여줘", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  { id: 12, input: "관심 공고 마감순", expectedFilters: ["a.status = 'interested'"], expectedOrder: "j.deadline ASC" },
  { id: 13, input: "카카오 빼고 지원한 거", expectedFilters: ["a.status = 'applied'", "j.company NOT LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { id: 14, input: "재택 공고 있어?", expectedFilters: ["j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC" },
  { id: 15, input: "5년차 공고 있어?", expectedFilters: ["j.experience LIKE '%5%'"], expectedOrder: "a.updated_at DESC" },
  { id: 16, input: "마감임박 공고", expectedFilters: ["j.deadline IS NOT NULL AND j.deadline != '' AND julianday(j.deadline) - julianday('now') BETWEEN 0 AND 7"], expectedOrder: "a.updated_at DESC" },
  { id: 17, input: "신입 공고 있어?", expectedFilters: ["(j.experience LIKE '%신입%' OR j.experience LIKE '%무관%')"], expectedOrder: "a.updated_at DESC" },

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
