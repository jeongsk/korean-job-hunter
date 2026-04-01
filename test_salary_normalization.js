/**
 * EXP-060: Salary Normalization Tests
 * 
 * Salary is stored as raw strings ("연봉 5000~8000만원", "월급 300~500만원", "면접후결정").
 * Without normalization, NLP queries like "연봉 6000 이상" can't match salary fields,
 * and salary-based sorting/comparison is impossible.
 * 
 * Hypothesis: Normalizing Korean salary formats to a canonical annual-만원 numeric range
 * enables salary-based NLP filtering and comparison.
 */

import assert from 'assert';

// === Salary Normalization ===

function normalizeSalary(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const text = raw.trim();
  
  // Negotiable / not specified
  if (/면접후결정|회사내규|협의|상여|별도/.test(text)) return null;
  
  let min = null, max = null, isMonthly = false;
  
  // Detect monthly vs annual
  if (/월급|월\s*급|개월/.test(text)) isMonthly = true;
  
  // Extract numbers with 만원/만 원 suffix
  // Patterns: 5000~8000만원, 5000-8000만원, 5000~8000 만원
  const rangeMatch = text.match(/(\d[\d,]*)\s*[~\-]\s*(\d[\d,]*)\s*만?\s*원/);
  if (rangeMatch) {
    min = parseInt(rangeMatch[1].replace(/,/g, ''));
    max = parseInt(rangeMatch[2].replace(/,/g, ''));
  } else {
    // Single value: 6000만원 이상, 6000만원↑, 6000만원
    const singleMatch = text.match(/(\d[\d,]*)\s*만?\s*원/);
    if (singleMatch) {
      const val = parseInt(singleMatch[1].replace(/,/g, ''));
      if (/이상|↑|이상/.test(text)) {
        min = val;
      } else {
        min = val;
        max = val;
      }
    }
  }
  
  // Try 억 range patterns first (Korean large salary)
  if (min === null) {
    const eokRangeMatch = text.match(/(\d+(?:\.\d+)?)\s*[~\-]\s*(\d+(?:\.\d+)?)\s*억/);
    if (eokRangeMatch) {
      min = Math.round(parseFloat(eokRangeMatch[1]) * 10000);
      max = Math.round(parseFloat(eokRangeMatch[2]) * 10000);
    } else {
      const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억/);
      if (eokMatch) {
        const manwon = Math.round(parseFloat(eokMatch[1]) * 10000);
        if (/이상|↑/.test(text)) {
          min = manwon;
        } else {
          min = manwon;
          max = manwon;
        }
      }
    }
  }
  
  if (min === null) return null;
  
  // Convert monthly to annual (×12)
  if (isMonthly) {
    if (min !== null) min *= 12;
    if (max !== null) max *= 12;
  }
  
  return { min, max: max || min, annual: true };
}

// Test if a normalized salary meets a minimum threshold (in 만원, annual)
function salaryMeetsThreshold(normalized, threshold) {
  if (!normalized) return false; // negotiable/unknown never meets threshold
  return normalized.min >= threshold;
}

// Test if salary overlaps with a desired range
function salaryInRange(normalized, wantMin, wantMax) {
  if (!normalized) return true; // unknown salary passes filter (not excluded)
  if (wantMin !== null && normalized.max < wantMin) return false;
  if (wantMax !== null && normalized.min > wantMax) return false;
  return true;
}

// === Test Cases ===

const tests = [
  // Annual range
  {
    name: '연봉 range: 5000~8000만원',
    input: '연봉 5000~8000만원',
    expected: { min: 5000, max: 8000 },
  },
  {
    name: '연봉 range with dash: 5000-8000만원',
    input: '연봉 5000-8000만원',
    expected: { min: 5000, max: 8000 },
  },
  {
    name: '연봉 range with space: 5000 ~ 8000 만원',
    input: '연봉 5000 ~ 8000 만원',
    expected: { min: 5000, max: 8000 },
  },
  // Annual single value
  {
    name: '연봉 single + 이상: 6000만원 이상',
    input: '연봉 6000만원 이상',
    expected: { min: 6000, max: 6000 },
  },
  {
    name: '연봉 exact: 5500만원',
    input: '연봉 5500만원',
    expected: { min: 5500, max: 5500 },
  },
  // Monthly → annual conversion
  {
    name: '월급 range → annual: 300~500만원',
    input: '월급 300~500만원',
    expected: { min: 3600, max: 6000 },
  },
  {
    name: '월급 single: 400만원',
    input: '월급 400만원',
    expected: { min: 4800, max: 4800 },
  },
  // Negotiable
  {
    name: '면접후결정 → null',
    input: '면접후결정',
    expected: null,
  },
  {
    name: '회사내규에 따름 → null',
    input: '회사내규에 따름',
    expected: null,
  },
  {
    name: '협의 → null',
    input: '협의',
    expected: null,
  },
  // Edge cases
  {
    name: 'empty string → null',
    input: '',
    expected: null,
  },
  {
    name: 'null → null',
    input: null,
    expected: null,
  },
  {
    name: '연봉 with commas: 8,000~12,000만원',
    input: '연봉 8,000~12,000만원',
    expected: { min: 8000, max: 12000 },
  },
  {
    name: '억 unit: 1억',
    input: '연봉 1억',
    expected: { min: 10000, max: 10000 },
  },
  {
    name: '억 range: 1~1.5억',
    input: '연봉 1~1.5억',
    expected: { min: 10000, max: 15000 },
  },
];

let passed = 0, failed = 0;

for (const test of tests) {
  const result = normalizeSalary(test.input);
  
  if (test.expected === null) {
    if (result === null) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}: expected null, got ${JSON.stringify(result)}`);
      failed++;
    }
  } else if (result === null) {
    console.log(`❌ ${test.name}: expected ${JSON.stringify(test.expected)}, got null`);
    failed++;
  } else if (result.min === test.expected.min && result.max === test.expected.max) {
    console.log(`✅ ${test.name}`);
    passed++;
  } else {
    console.log(`❌ ${test.name}: expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(result)}`);
    failed++;
  }
}

// === Threshold Tests ===
console.log('\n--- Threshold Tests ---');

const thresholdTests = [
  { salary: normalizeSalary('연봉 6000~8000만원'), threshold: 5000, expected: true, name: '6000min >= 5000' },
  { salary: normalizeSalary('연봉 3000~4000만원'), threshold: 5000, expected: false, name: '3000min < 5000' },
  { salary: normalizeSalary('면접후결정'), threshold: 5000, expected: false, name: 'negotiable never meets threshold' },
  { salary: normalizeSalary('연봉 5000만원 이상'), threshold: 5000, expected: true, name: '5000min >= 5000' },
];

for (const t of thresholdTests) {
  const result = salaryMeetsThreshold(t.salary, t.threshold);
  if (result === t.expected) {
    console.log(`✅ ${t.name}`);
    passed++;
  } else {
    console.log(`❌ ${t.name}: expected ${t.expected}, got ${result}`);
    failed++;
  }
}

// === Range Filter Tests ===
console.log('\n--- Range Filter Tests ---');

const rangeTests = [
  { salary: normalizeSalary('연봉 5000~8000만원'), wantMin: 4000, wantMax: 6000, expected: true, name: '5000-8000 overlaps 4000-6000' },
  { salary: normalizeSalary('연봉 5000~8000만원'), wantMin: 8000, wantMax: 10000, expected: true, name: '5000-8000 overlaps 8000-10000' },
  { salary: normalizeSalary('연봉 3000~4000만원'), wantMin: 5000, wantMax: 8000, expected: false, name: '3000-4000 no overlap with 5000-8000' },
  { salary: normalizeSalary('면접후결정'), wantMin: 5000, wantMax: 8000, expected: true, name: 'negotiable passes range filter' },
];

for (const t of rangeTests) {
  const result = salaryInRange(t.salary, t.wantMin, t.wantMax);
  if (result === t.expected) {
    console.log(`✅ ${t.name}`);
    passed++;
  } else {
    console.log(`❌ ${t.name}: expected ${t.expected}, got ${result}`);
    failed++;
  }
}

console.log(`\n📊 Salary normalization: ${passed}/${passed + failed} passed`);
if (failed > 0) process.exit(1);
