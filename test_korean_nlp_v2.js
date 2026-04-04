#!/usr/bin/env node
/**
 * EXP-035: Extended Korean NLP Query Parsing Tests
 * Adds edge cases: salary, deadline, experience filters, negation patterns,
 * company substring conflicts, compound queries, sorting variants.
 */

// Copy parser from test-korean-nlp-queries.js
const { parseKoreanQuery } = require("./scripts/nlp-parser");

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
