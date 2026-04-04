/**
 * EXP-102: Extended Salary Format Tests
 * 
 * normalizeSalary previously missed common Korean/international salary formats:
 * - Bare number ranges after 연봉 (연봉 5000~8000)
 * - ₩ absolute won notation (₩50,000,000)
 * - 천만 unit (연봉 5천만원)
 * These formats appear on LinkedIn Korea and some Korean job aggregators.
 */

const { normalizeSalary } = require('./scripts/post-process-wanted');

const tests = [
  // Bare number range with 연봉 prefix
  { name: '연봉 bare range 5000~8000', input: '연봉 5000~8000', expected: { min: 5000, max: 8000 } },
  { name: '연봉 bare range with dash', input: '연봉 3000-5000', expected: { min: 3000, max: 5000 } },
  { name: '연봉 bare range with commas', input: '연봉 5,000~8,000', expected: { min: 5000, max: 8000 } },
  { name: '연봉 bare range single value', input: '연봉 6000', expected: null },  // bare single number ambiguous without suffix → null

  // ₩ absolute won notation
  { name: '₩ range', input: '₩50,000,000 - ₩80,000,000', expected: { min: 5000, max: 8000 } },
  { name: '₩ single', input: '₩50,000,000', expected: { min: 5000, max: 5000 } },
  { name: '₩ without space', input: '₩30000000 - ₩50000000', expected: { min: 3000, max: 5000 } },
  { name: '₩ single minimum', input: '₩60,000,000 이상', expected: { min: 6000, max: 6000 } },

  // 천만 unit
  { name: '천만원', input: '연봉 5천만원', expected: { min: 5000, max: 5000 } },
  { name: '천만 이상', input: '연봉 3천만 이상', expected: { min: 3000, max: 3000 } },
  { name: '천만 without 원', input: '연봉 5천만', expected: { min: 5000, max: 5000 } },

  // Existing formats still work (regression)
  { name: 'regression: 만원 range', input: '연봉 5000~8000만원', expected: { min: 5000, max: 8000 } },
  { name: 'regression: 억 range', input: '연봉 1~1.5억', expected: { min: 10000, max: 15000 } },
  { name: 'regression: 면접후결정', input: '면접후결정', expected: null },
  { name: 'regression: 월급 conversion', input: '월급 300~500만원', expected: { min: 3600, max: 6000 } },

  // Ambiguous without context → null
  { name: 'bare numbers no prefix', input: '5000 - 8000', expected: null },
  { name: 'empty string', input: '', expected: null },
];

let passed = 0, failed = 0;

for (const test of tests) {
  const result = normalizeSalary(test.input);
  const ok = JSON.stringify(result) === JSON.stringify(test.expected);
  if (ok) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
}

console.log(`\n📊 Extended salary formats: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
