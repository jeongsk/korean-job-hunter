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
const { parseKoreanQuery } = require("./scripts/nlp-parser");

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
