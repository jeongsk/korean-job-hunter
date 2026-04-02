/**
 * Test: Production dedup script (scripts/dedup-jobs.js) has Korean↔English company equivalents
 * EXP-080: Verifies dedup-jobs.js is synced with test_cross_source_dedup.js company map
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const dedupPath = path.join(__dirname, 'scripts', 'dedup-jobs.js');
const dedupCode = fs.readFileSync(dedupPath, 'utf8');

// Extract companyKoEnMap from dedup script
const mapMatch = dedupCode.match(/const companyKoEnMap = \{([^}]+)\}/s);
assert(mapMatch, 'companyKoEnMap should exist in dedup-jobs.js');

const entries = mapMatch[1].match(/'[^']+'\s*:\s*'[^']+'/g);
assert(entries && entries.length > 0, 'companyKoEnMap should have entries');

// Test 1: Essential Korean companies are present
const essentialCompanies = ['카카오', '네이버', '라인', '토스', '삼성', '쿠팡'];
for (const ko of essentialCompanies) {
  const hasEntry = entries.some(e => e.includes(`'${ko}'`));
  assert(hasEntry, `${ko} should be in companyKoEnMap`);
}

// Test 2: companyToCanonical function exists
assert(dedupCode.includes('function companyToCanonical'), 'companyToCanonical should exist');

// Test 3: companyMatch uses canonical matching
assert(dedupCode.includes('companyToCanonical(a)'), 'companyMatch should use companyToCanonical for a');
assert(dedupCode.includes('companyToCanonical(b)'), 'companyMatch should use companyToCanonical for b');
assert(dedupCode.includes('ca === cb'), 'companyMatch should compare canonical forms');

// Test 4: Skill inference is used in all post-processors
const wantedPath = path.join(__dirname, 'scripts', 'post-process-wanted.js');
const jkPath = path.join(__dirname, 'scripts', 'post-process-jobkorea.js');
const liPath = path.join(__dirname, 'scripts', 'post-process-linkedin.js');

const wantedCode = fs.readFileSync(wantedPath, 'utf8');
const jkCode = fs.readFileSync(jkPath, 'utf8');
const liCode = fs.readFileSync(liPath, 'utf8');

assert(wantedCode.includes("require('./skill-inference')"), 'Wanted post-processor should use skill-inference');
assert(jkCode.includes("require('./skill-inference')"), 'JobKorea post-processor should use skill-inference');
assert(liCode.includes("require('./skill-inference')"), 'LinkedIn post-processor should use skill-inference');

// Test 5: Wanted post-processor calls inferSkills on title
assert(wantedCode.includes('inferSkills(r.title)'), 'Wanted should infer skills from title');

// Test 6: JobKorea post-processor includes skills in output
assert(jkCode.includes('inferSkills(title)'), 'JobKorea should infer skills from title');

console.log('✅ test_dedup_production_sync.js: 6 passed');
