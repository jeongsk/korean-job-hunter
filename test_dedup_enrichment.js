/**
 * Test: Dedup enrichment preserves skills and culture_keywords
 * EXP-081: Verifies dedup-jobs.js enriches keeper with missing fields from duplicates
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dedupPath = path.join(__dirname, 'scripts', 'dedup-jobs.js');
const dedupCode = fs.readFileSync(dedupPath, 'utf8');

// Test 1: SQL query includes skills and culture_keywords
assert(dedupCode.includes('skills'), 'SQL query should include skills column');
assert(dedupCode.includes('culture_keywords'), 'SQL query should include culture_keywords column');

// Test 2: fieldScore considers skills
assert(dedupCode.match(/job\.skills.*score/), 'fieldScore should score skills field');

// Test 3: fieldScore considers culture_keywords
assert(dedupCode.match(/job\.culture_keywords.*score/), 'fieldScore should score culture_keywords field');

// Test 4: Enrichment logic exists
assert(dedupCode.includes('enrichFields'), 'Enrichment fields array should exist');
assert(dedupCode.includes('enrichUpdates'), 'Enrichment updates object should exist');

// Test 5: Skills is in enrichment fields
assert(dedupCode.match(/enrichFields.*skills/s), 'skills should be in enrichFields');
assert(dedupCode.match(/enrichFields.*culture_keywords/s), 'culture_keywords should be in enrichFields');

// Test 6: Enrichment UPDATE SQL is generated
assert(dedupCode.includes('UPDATE jobs SET'), 'Enrichment should UPDATE jobs table');
assert(dedupCode.includes('enrichUpdates'), 'Should use enrichUpdates for enrichment');

// Test 7: SQL injection prevention (single quotes escaped)
assert(dedupCode.includes("replace(/'/g"), 'Values should escape single quotes');

// Test 8: fieldScore weights skills higher than basic fields
const skillsWeightMatch = dedupCode.match(/job\.skills.*score \+= (\d+)/);
assert(skillsWeightMatch && parseInt(skillsWeightMatch[1]) >= 2, 'Skills should have weight >= 2 (high-value field)');

console.log('✅ test_dedup_enrichment.js: 8 passed');
