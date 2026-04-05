/**
 * EXP-138: Test Wanted API company name cleanup
 * Verifies that (주), 주식회사, ㈜, 유한회사 prefixes are stripped
 * from company names returned by the Wanted API.
 */

const fs = require('fs');
const path = require('path');

// Load the script and extract cleanCompanyName
const scriptPath = path.join(__dirname, 'scripts', 'scrape-wanted-api.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Extract cleanCompanyName function
const fnMatch = scriptContent.match(/function cleanCompanyName\(name\)\s*\{[\s\S]*?\n\}/);
if (!fnMatch) {
  console.error('❌ cleanCompanyName not found in scrape-wanted-api.js');
  process.exit(1);
}
eval(fnMatch[0]);

const tests = [
  // Basic prefix stripping
  { input: '(주)카카오', expected: '카카오' },
  { input: '(주)네이버', expected: '네이버' },
  { input: '주식회사 토스', expected: '토스' },
  { input: '㈜배달의민족', expected: '배달의민족' },
  { input: '(유)테스트', expected: '테스트' },
  { input: '유한회사 에이비씨', expected: '에이비씨' },
  
  // No prefix
  { input: 'Google Korea', expected: 'Google Korea' },
  { input: 'Samsung Electronics', expected: 'Samsung Electronics' },
  { input: '카카오', expected: '카카오' },
  
  // Edge cases
  { input: '(주)당근마켓', expected: '당근마켓' },
  { input: '㈜카카오게임즈', expected: '카카오게임즈' },
  { input: '주식회사당근', expected: '당근' },  // no space after 주식회사
  
  // Null/empty/undefined
  { input: null, expected: '회사명 미상' },
  { input: undefined, expected: '회사명 미상' },
  { input: '', expected: '회사명 미상' },
  
  // Prefix-only (would become empty after strip)
  { input: '(주)', expected: '회사명 미상' },
  { input: '주식회사', expected: '회사명 미상' },
];

let passed = 0, failed = 0;
for (const { input, expected } of tests) {
  const result = cleanCompanyName(input);
  const ok = result === expected;
  if (ok) {
    passed++;
    console.log(`✅ cleanCompanyName(${JSON.stringify(input)}) → "${result}"`);
  } else {
    failed++;
    console.log(`❌ cleanCompanyName(${JSON.stringify(input)}) → "${result}" (expected "${expected}")`);
  }
}

console.log(`\n📊 API Company Cleanup: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// Verify parsePosition uses cleanCompanyName
if (!scriptContent.includes('cleanCompanyName(pos.company')) {
  console.error('❌ parsePosition does not use cleanCompanyName');
  process.exit(1);
}
console.log('✅ parsePosition uses cleanCompanyName');
