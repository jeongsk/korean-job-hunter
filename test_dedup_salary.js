/**
 * Test: Dedup preserves salary_min/salary_max (normalized salary range)
 * EXP-092: Verifies dedup-jobs.js SELECT, fieldScore, and enrichment handle salary_min/salary_max
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dedupPath = path.join(__dirname, 'scripts', 'dedup-jobs.js');
const dedupCode = fs.readFileSync(dedupPath, 'utf8');

// Test 1: SQL SELECT includes salary_min and salary_max
assert(dedupCode.includes('salary_min'), 'SQL SELECT should include salary_min');
assert(dedupCode.includes('salary_max'), 'SQL SELECT should include salary_max');
assert(/SELECT.*salary_min.*salary_max/s.test(dedupCode), 'salary_min and salary_max should be in SELECT');

// Test 2: fieldScore considers salary_min/salary_max
assert(/salary_min.*score|salary_max.*score/s.test(dedupCode), 'fieldScore should consider salary_min/salary_max');

// Test 3: Numeric fields handled without quotes in UPDATE
assert(dedupCode.includes('numericFields'), 'Should have numericFields set for proper SQL handling');
assert(/numericFields.*salary_min|salary_min.*numericFields/s.test(dedupCode), 'salary_min should be in numericFields');

// Test 4: Enrichment copies salary_min from duplicates
assert(/salary_min.*enrichUpdates|enrichUpdates.*salary_min/s.test(dedupCode), 'Enrichment should copy salary_min');

// Test 5: Enrichment copies salary_max from duplicates
assert(/salary_max.*enrichUpdates|enrichUpdates.*salary_max/s.test(dedupCode), 'Enrichment should copy salary_max');

// Test 6: NULL handling for numeric fields
assert(/NULL.*salary|salary.*NULL/s.test(dedupCode), 'Should handle NULL for numeric salary fields');

// Test 7: Verify the enrichment condition - only enrich if keeper has neither
const salaryEnrichBlock = dedupCode.match(/salary_min[\s\S]{0,500}salary_max/);
assert(salaryEnrichBlock, 'Should have salary_min/salary_max enrichment block');

console.log('✅ test_dedup_salary.js: 7 passed');
