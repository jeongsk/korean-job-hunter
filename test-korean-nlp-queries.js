#!/usr/bin/env node
/**
 * EXP-026: Korean NLP Query Parsing Test
 * Tests the Korean natural language to SQL filter translation
 */

const testCases = [
  // Status queries
  { input: "면접 잡힌 거 있어?", expectedFilters: ["a.status = 'interview'"], expectedOrder: "a.updated_at DESC" },
  { input: "지원한 거 다 보여줘", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  { input: "찜해둔 공고", expectedFilters: ["a.status = 'interested'"], expectedOrder: "a.updated_at DESC" },
  { input: "합격한 곳", expectedFilters: ["a.status = 'offer'"], expectedOrder: "a.updated_at DESC" },
  { input: "탈락한 거 빼고", expectedFilters: ["a.status NOT IN ('rejected','declined')"], expectedOrder: "a.updated_at DESC" },
  { input: "지원할 거", expectedFilters: ["a.status = 'applying'"], expectedOrder: "a.updated_at DESC" },
  
  // Composite queries
  { input: "지원한 거 중에 카카오 빼고", expectedFilters: ["a.status = 'applied'", "j.company NOT LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { input: "재택으로 할 수 있는 관심 공고", expectedFilters: ["a.status = 'interested'", "j.work_type = 'remote'"], expectedOrder: "a.updated_at DESC" },
  { input: "면접보는 곳 점수순으로", expectedFilters: ["a.status = 'interview'"], expectedOrder: "m.score DESC" },
  
  // Company/keyword queries
  { input: "카카오 공고 있어?", expectedFilters: ["j.company LIKE '%카카오%'"], expectedOrder: "a.updated_at DESC" },
  { input: "백엔드 관심 공고", expectedFilters: ["a.status = 'interested'", "(j.title LIKE '%백엔드%' OR j.company LIKE '%백엔드%')"], expectedOrder: "a.updated_at DESC" },
  
  // EXP-035: Edge cases — company substring, location negation, compound queries
  { input: "카카오뱅크 공고", expectedFilters: ["j.company LIKE '%카카오뱅크%'"], expectedOrder: "a.updated_at DESC" },
  { input: "지원한 거 중에 판교 빼고", expectedFilters: ["a.status = 'applied'", "j.location NOT LIKE '%판교%'"], expectedOrder: "a.updated_at DESC" },
  { input: "토스 서울 면접 공고", expectedFilters: ["a.status = 'interview'", "j.company LIKE '%토스%'", "j.location LIKE '%서울%'"], expectedOrder: "a.updated_at DESC" },
  { input: "지원한 거 최신순", expectedFilters: ["a.status = 'applied'"], expectedOrder: "a.updated_at DESC" },
  { input: "하이브리드 네이버 공고", expectedFilters: ["j.work_type = 'hybrid'", "j.company LIKE '%네이버%'"], expectedOrder: "a.updated_at DESC" },
  { input: "카카오 지원한 거 중에 토스 빼고", expectedFilters: ["a.status = 'applied'", "j.company LIKE '%카카오%'", "j.company NOT LIKE '%토스%'"], expectedOrder: "a.updated_at DESC" },
];

// Korean NLP Query Parser
function parseKoreanQuery(input) {
  const filters = [];
  let order = "a.updated_at DESC";
  const text = input.trim();
  let negateNext = false;
  const consumedWords = new Set();
  
  // Status detection
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
  
  // Negation for "빼고/제외/말고" — check if it applies to status or company
  const negationMatch = text.match(/(빼고|제외|말고)/);
  const negationIdx = negationMatch ? text.indexOf(negationMatch[0]) : -1;
  let appliedNegation = false; // Track if negation was consumed by a specific filter
  
  // Work type
  if (/재택|원격|리모트/.test(text)) {
    filters.push("j.work_type = 'remote'");
  }
  if (/하이브리드/.test(text)) {
    filters.push("j.work_type = 'hybrid'");
  }
  
  // Sorting
  if (/(점수|매칭)순/.test(text)) {
    order = "m.score DESC";
  }
  
  // Known companies — sort by length (longest first) to avoid substring collisions (카카오뱅크 vs 카카오)
  const companies = ['카카오뱅크', '우아한형제들', '당근마켓', '배달의민족', '엔씨소프트', '네오위즈', '토스뱅크', '마이플레이스', '카카오', '네이버', '삼성', '라인', '토스', '쿠팡', '야놀자', '크몽', '배민', '넥슨', '한컴', '위메프'];
  for (const company of companies) {
    if (consumedWords.has(company)) continue; // Skip substrings of already-consumed companies
    if (text.includes(company)) {
      // Check if any already-consumed word contains this company as substring
      let isSubstring = false;
      for (const cw of consumedWords) {
        if (cw.includes(company) && cw !== company) { isSubstring = true; break; }
      }
      if (isSubstring) continue;
      
      if (negationMatch) {
        const beforeNeg = text.substring(0, negationIdx);
        // Only negate the entity immediately preceding the negation marker
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
  
  // Location keywords — support negation like companies
  const locations = ['영등포', '서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '수원', '이천', '판교', '강남', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌'];
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
  
  // Job title keywords (remaining Korean words 2+ chars that aren't status/work/sort words)
  const stopWords = new Set(['면접', '면접보는', '면접잡힌', '지원', '지원한', '지원할', '지원예정', '지원완료', '관심', '북마크', '찜', '찜해둔', '합격', '합격한', '오퍼', '탈락', '탈락한', '거절', '불합격', '재택', '재택으로', '원격', '리모트', '하이브리드', '점수', '점수순으로', '매칭', '최신', '최신순', '빼고', '제외', '말고', '있어', '보여', '보여줘', '공고', '거', '곳', '다', '중에', '할', '한', '수', '있는', '순으로', '보는', '잡힌', '해둔', '예정', '완료', '했', '을', '를', '이', '가', '에서', '의', '에']);
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];
  for (const word of koreanWords) {
    if (!stopWords.has(word) && !consumedWords.has(word)) {
      filters.push(`(j.title LIKE '%${word}%' OR j.company LIKE '%${word}%')`);
      consumedWords.add(word);
    }
  }
  
  // Handle "빼고" for status — only if negation wasn't consumed by company/location
  if (negationMatch && !appliedNegation && !filters.some(f => f.includes('NOT'))) {
    // The negation wasn't applied to anything specific; apply to status if exists
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

// Run tests
let passed = 0;
let failed = 0;

console.log('🧪 EXP-026: Korean NLP Query Parsing Tests\n');
console.log('=' .repeat(60));

for (const tc of testCases) {
  const result = parseKoreanQuery(tc.input);
  
  // Check that all expected filters are present
  let tcPassed = true;
  for (const expectedFilter of tc.expectedFilters) {
    if (!result.filters.some(f => f === expectedFilter)) {
      console.log(`❌ "${tc.input}"`);
      console.log(`   Expected filter: ${expectedFilter}`);
      console.log(`   Got filters: ${JSON.stringify(result.filters)}`);
      tcPassed = false;
      break;
    }
  }
  
  if (tcPassed && result.order !== tc.expectedOrder) {
    console.log(`❌ "${tc.input}"`);
    console.log(`   Expected order: ${tc.expectedOrder}`);
    console.log(`   Got order: ${result.order}`);
    tcPassed = false;
  }
  
  if (tcPassed) {
    console.log(`✅ "${tc.input}" → filters: [${result.filters.join(', ')}] order: ${result.order}`);
    passed++;
  } else {
    failed++;
  }
}

console.log('=' .repeat(60));
console.log(`\n📊 Results: ${passed}/${testCases.length} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All Korean NLP query parsing tests passed!');
} else {
  console.log(`❌ ${failed} tests failed`);
}

process.exit(failed === 0 ? 0 : 1);
