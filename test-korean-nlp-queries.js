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
  
  // Known companies
  const companies = ['카카오', '네이버', '삼성', '라인', '우아한형제들', '토스', '쿠팡', '배달의민족', '당근마켓', '야놀자', '크몽', '배민', '넥슨', '엔씨소프트', '네오위즈', '한컴', '카카오뱅크', '토스뱅크', '위메프', '마이플레이스'];
  for (const company of companies) {
    if (text.includes(company)) {
      if (negationMatch) {
        // Check if negation applies to this company (pattern: "X 빼고")
        const beforeNeg = text.substring(0, text.indexOf(negationMatch[0]));
        if (beforeNeg.includes(company)) {
          filters.push(`j.company NOT LIKE '%${company}%'`);
        } else {
          filters.push(`j.company LIKE '%${company}%'`);
        }
      } else {
        filters.push(`j.company LIKE '%${company}%'`);
      }
      consumedWords.add(company);
    }
  }
  
  // Location keywords
  const locations = ['서울', '경기', '부산', '대전', '인천', '광주', '대구', '울산', '수원', '이천', '판교', '강남', '영등포', '송파', '성수', '역삼', '잠실', '마포', '용산', '구로', '분당', '일산', '평촌'];
  for (const loc of locations) {
    if (text.includes(loc)) {
      filters.push(`j.location LIKE '%${loc}%'`);
      consumedWords.add(loc);
    }
  }
  
  // Job title keywords (remaining Korean words 2+ chars that aren't status/work/sort words)
  const stopWords = new Set(['면접', '면접보는', '면접잡힌', '지원', '지원한', '지원할', '지원예정', '지원완료', '관심', '북마크', '찜', '찜해둔', '합격', '합격한', '오퍼', '탈락', '탈락한', '거절', '불합격', '재택', '재택으로', '원격', '리모트', '하이브리드', '점수', '점수순으로', '매칭', '최신', '빼고', '제외', '말고', '있어', '보여', '보여줘', '공고', '거', '곳', '다', '중에', '할', '한', '수', '있는', '순으로', '보는', '잡힌', '해둔', '예정', '완료', '했', '을', '를', '이', '가', '에서', '의', '에']);
  const koreanWords = text.match(/[가-힣]{2,}/g) || [];
  for (const word of koreanWords) {
    if (!stopWords.has(word) && !consumedWords.has(word)) {
      filters.push(`(j.title LIKE '%${word}%' OR j.company LIKE '%${word}%')`);
      consumedWords.add(word);
    }
  }
  
  // Handle "빼고" for status — if no status was set and negation exists
  if (negationMatch && !filters.some(f => f.includes('NOT'))) {
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
