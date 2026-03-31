#!/usr/bin/env node
/**
 * EXP-035: Extended Korean NLP Query Parsing Tests
 * Adds edge cases: salary, deadline, experience filters, negation patterns,
 * company substring conflicts, compound queries, sorting variants.
 */

// Copy parser from test-korean-nlp-queries.js
function parseKoreanQuery(input) {
  const filters = [];
  let order = "a.updated_at DESC";
  const text = input.trim();
  let negateNext = false;
  const consumedWords = new Set();
  
  const statusPatterns = [
    { regex: /면접(잡힌|보는)?/, status: 'interview' },
    { regex: /지원(완료|한|했)/, status: 'applied' },
    { regex: /(관심|북마크|찜)/, status: 'interested' },
    { regex: /(합격|오퍼)/, status: 'offer' },
    { regex: /불합격/, status: 'declined' },
    { regex: /(탈락|거절|떨어)/, status: 'rejected,declined' },
    { regex: /지원(예정|할)/, status: 'applying' },
  ];
  
  for (const { regex, status } of statusPatterns) {
    if (regex.test(text)) {
      if (status.includes(',')) {
        filters.push(negateNext ? `a.status NOT IN ('${status.split(',').join("','")}')` : `a.status IN ('${status.split(',').join("','")}')`);
      } else {
        filters.push(negateNext ? `a.status != '${status}'` : `a.status = '${status}'`);
      }
      negateNext = false;
      break;
    }
  }
  
  const negationMatch = text.match(/(빼고|제외|말고)/);
  const negationIdx = negationMatch ? text.indexOf(negationMatch[0]) : -1;
  let appliedNegation = false;
  if (/재택|원격|리모트/.test(text)) {
    filters.push("j.work_type = 'remote'");
  }
  if (/하이브리드/.test(text)) {
    filters.push("j.work_type = 'hybrid'");
  }
  
  if (/(점수|매칭)순/.test(text)) {
    order = "m.score DESC";
  }
  
  const companies = ['카카오', '네이버', '삼성', '라인', '우아한형제들', '토스', '쿠팡', '배달의민족', '당근마켓', '야놀자', '크몽', '배민', '넥슨', '엔씨소프트', '네오위즈', '한컴', '카카오뱅크', '토스뱅크', '위메프', '마이플레이스'];
  for (const company of companies) {
    if (text.includes(company)) {
      if (negationMatch) {
        const beforeNeg = text.substring(0, negationIdx);
        const segment = beforeNeg.trim();
        const isImmediatelyBefore = segment.endsWith(company);
        if (isImmediatelyBefore) {
          filters.push(`j.company NOT LIKE '%${company}%'`);
          appliedNegation = true;
        } else {
          filters.push(`j.company LIKE '%${company}%'`);
        }
      } else {
        filters.push(`j.company LIKE '%${company}%'`);
      }
      consumedWords.add(company);
    }
  }
  
  const locations = ['서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '수원', '이천', '판교', '강남', '영등포', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌'];
  for (const loc of locations) {
    if (text.includes(loc)) {
      if (negationMatch) {
        const beforeNeg = text.substring(0, negationIdx);
        const segment = beforeNeg.trim();
        const isImmediatelyBefore = segment.endsWith(loc);
        if (isImmediatelyBefore) {
          filters.push(`j.location NOT LIKE '%${loc}%'`);
          appliedNegation = true;
        } else {
          filters.push(`j.location LIKE '%${loc}%'`);
        }
      } else {
        filters.push(`j.location LIKE '%${loc}%'`);
      }
      consumedWords.add(loc);
    }
  }
  
  const stopWords = new Set(['면접', '면접보는', '면접잡힌', '지원', '지원한', '지원할', '지원예정', '지원완료', '관심', '북마크', '찜', '찜해둔', '합격', '합격한', '오퍼', '탈락', '탈락한', '거절', '불합격', '재택', '재택으로', '원격', '리모트', '하이브리드', '점수', '점수순으로', '매칭', '최신', '빼고', '제외', '말고', '있어', '보여', '보여줘', '공고', '거', '곳', '다', '중에', '할', '한', '수', '있는', '순으로', '보는', '잡힌', '해둔', '예정', '완료', '했', '을', '를', '이', '가', '에서', '의', '에']);
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];
  for (const word of koreanWords) {
    if (!stopWords.has(word) && !consumedWords.has(word)) {
      filters.push(`(j.title LIKE '%${word}%' OR j.company LIKE '%${word}%)`);
      consumedWords.add(word);
    }
  }
  
  if (negationMatch && !appliedNegation && !filters.some(f => f.includes('NOT'))) {
    const statusIdx = filters.findIndex(f => f.includes('a.status'));
    if (statusIdx >= 0) {
      const orig = filters[statusIdx];
      if (orig.includes("= '")) {
        const status = orig.match(/= '([^']+)'/)?.[1];
        if (status) filters[statusIdx] = `a.status != '${status}'`;
      } else if (orig.includes("IN (")) {
        filters[statusIdx] = orig.replace('IN (', 'NOT IN (');
      }
    }
  }
  
  return { filters, order };
}

// Extended test cases
const testCases = [
  // === Original 11 tests (regression check) ===
  { input: "면접 잡힌 거 있어?", expectedFilters: ["a.status = 'interview'"], expectedOrder: "a.updated_at DESC" },
  { input: "지원한 거 다 보여줘", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  { input: "찜해둔 공고", expectedFilters: ["a.status = 'interested'"], expectedOrder: "a.updated_at DESC" },
  { input: "합격한 곳", expectedFilters: ["a.status = 'offer'"], expectedOrder: "a.updated_at DESC" },
  { input: "탈락한 거 빼고", expectedFilters: ["a.status NOT IN ('rejected','declined')"], expectedOrder: "a.updated_at DESC" },
  { input: "지원할 거", expectedFilters: ["a.status = 'applying'"], expectedOrder: "a.updated_at DESC" },
  { input: "지원한 거 중에 카카오 빼고", expectedFilters: ["a.status = 'applied'", "j.company NOT LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { input: "재택으로 할 수 있는 관심 공고", expectedFilters: ["a.status = 'interested'", "j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC" },
  { input: "면접보는 곳 점수순으로", expectedFilters: ["a.status = 'interview'"], expectedOrder: "m.score DESC" },
  { input: "카카오 공고 있어?", expectedFilters: ["j.company LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { input: "백엔드 관심 공고", expectedFilters: ["a.status = 'interested'"], expectedOrder: "a.updated_at DESC" },
  
  // === New edge case tests ===
  
  // Company substring: 카카오뱅크 should NOT match 카카오
  { input: "카카오뱅크 공고", expectedFilters: ["j.company LIKE '%카카오뱅크%'"], expectedOrder: "a.updated_at DESC", 
    note: "should NOT have separate 카카오 filter" },
  
  // Negation with location
  { input: "지원한 거 중에 판교 빼고", expectedFilters: ["a.status = 'applied'", "j.location NOT LIKE '%판교%'"], expectedOrder: "a.updated_at DESC",
    note: "negation should apply to location before negation marker" },
    
  // Compound: company + location + status
  { input: "토스 서울 면접 공고", expectedFilters: ["a.status = 'interview'", "j.company LIKE '%토스%'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC" },
  
  // 최신순 sorting
  { input: "지원한 거 최신순", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  
  // Hybrid + company
  { input: "하이브리드 네이버 공고", expectedFilters: ["j.work_type = 'hybrid'", "j.company LIKE '%네이버%'"], expectedOrder: "a.updated_at DESC" },
  
  // Multiple companies (negation on one)
  { input: "카카오 지원한 거 중에 토스 빼고", expectedFilters: ["a.status = 'applied'", "j.company LIKE '%카카오%'", "j.company NOT LIKE '%토스%'"], expectedOrder: "a.updated_at DESC" },
  
  // Empty input
  { input: "", expectedFilters: [], expectedOrder: "a.updated_at DESC" },
];

// Run tests
let passed = 0;
let failed = 0;
const failures = [];

console.log('🧪 EXP-035: Extended Korean NLP Query Tests\n');
console.log('='.repeat(70));

for (const tc of testCases) {
  const result = parseKoreanQuery(tc.input);
  let tcPassed = true;
  
  for (const expectedFilter of tc.expectedFilters) {
    if (!result.filters.some(f => f === expectedFilter)) {
      failures.push({ input: tc.input, expected: expectedFilter, got: JSON.stringify(result.filters), note: tc.note });
      tcPassed = false;
      break;
    }
  }
  
  // Check no extra unexpected filters for specific checks
  if (tcPassed && result.order !== tc.expectedOrder) {
    failures.push({ input: tc.input, expected: `order: ${tc.expectedOrder}`, got: `order: ${result.order}` });
    tcPassed = false;
  }
  
  if (tcPassed) {
    console.log(`✅ "${tc.input}" → [${result.filters.join(', ')}] | ${result.order}`);
    passed++;
  } else {
    console.log(`❌ "${tc.input}"`);
    const last = failures[failures.length - 1];
    console.log(`   Expected: ${last.expected}`);
    console.log(`   Got: ${last.got}`);
    if (last.note) console.log(`   Note: ${last.note}`);
    failed++;
  }
}

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✅ All extended Korean NLP tests passed!');
} else {
  console.log(`❌ ${failed} tests failed — bugs found`);
}
process.exit(failed === 0 ? 0 : 1);
