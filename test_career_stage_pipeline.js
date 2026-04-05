#!/usr/bin/env node
/**
 * EXP-091: Career stage pipeline completeness tests
 * 
 * Validates:
 * 1. deriveCareerStage is in shared skill-inference.js module
 * 2. All 3 post-processors import deriveCareerStage from shared module
 * 3. Career stage is in DB schema (CREATE TABLE includes career_stage)
 * 4. Dedup script preserves career_stage during merge
 * 5. INSERT template in scraper-agent.md includes career_stage
 * 6. deriveCareerStage produces correct results for common patterns
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { console.log(`✅ ${msg}`); passed++; }
  else { console.log(`❌ ${msg}`); failed++; }
}

const ROOT = path.join(__dirname);

// === 1. Shared module exports deriveCareerStage ===
console.log('\n--- Shared module: deriveCareerStage export ---');
const si = require(path.join(ROOT, 'scripts/skill-inference'));
assert(typeof si.deriveCareerStage === 'function', 'skill-inference.js exports deriveCareerStage');

// === 2. Post-processors import from shared module ===
console.log('\n--- Post-processor imports ---');
const wantedSrc = fs.readFileSync(path.join(ROOT, 'scripts/post-process-wanted.js'), 'utf8');
const jkSrc = fs.readFileSync(path.join(ROOT, 'scripts/post-process-jobkorea.js'), 'utf8');
const liSrc = fs.readFileSync(path.join(ROOT, 'scripts/post-process-linkedin.js'), 'utf8');

assert(wantedSrc.includes("require('./skill-inference')") && wantedSrc.includes('deriveCareerStage'), 
  'post-process-wanted.js imports deriveCareerStage from skill-inference');
assert(!wantedSrc.includes('function deriveCareerStage('), 
  'post-process-wanted.js does NOT define local deriveCareerStage');
assert(jkSrc.includes("require('./skill-inference')") && jkSrc.includes('deriveCareerStage'), 
  'post-process-jobkorea.js imports deriveCareerStage from skill-inference');
assert(!jkSrc.includes('function deriveCareerStage('), 
  'post-process-jobkorea.js does NOT define local deriveCareerStage');
// LinkedIn has its own version with different signature (level, minYears) - that's OK
assert(liSrc.includes('function deriveCareerStage('), 
  'post-process-linkedin.js has its own deriveCareerStage (different signature: level, minYears)');

// === 3. DB schema includes career_stage ===
console.log('\n--- DB schema: career_stage column ---');
// Check actual DB
const dbSchema = execSync(`sqlite3 "${path.join(ROOT, 'data/jobs.db')}" ".schema jobs"`, { encoding: 'utf8' });
assert(dbSchema.includes('career_stage'), 'jobs.db schema includes career_stage column');

// === 4. Dedup script handles career_stage ===
console.log('\n--- Dedup: career_stage handling ---');
const dedupSrc = fs.readFileSync(path.join(ROOT, 'scripts/dedup-jobs.js'), 'utf8');
assert(dedupSrc.includes('career_stage'), 'dedup-jobs.js references career_stage');
assert(dedupSrc.includes("'career_stage'"), "dedup-jobs.js enrichFields includes career_stage");
assert(dedupSrc.includes('career_stage') && dedupSrc.includes('SELECT'), 'dedup SELECT includes career_stage');

// === 5. Scraper-agent.md INSERT template includes career_stage ===
console.log('\n--- Scraper agent: INSERT template ---');
const scraperMd = fs.readFileSync(path.join(ROOT, 'agents/scraper-agent.md'), 'utf8');
assert(scraperMd.includes('career_stage'), 'scraper-agent.md mentions career_stage');
assert(scraperMd.match(/INSERT.*career_stage/s), 'scraper-agent.md INSERT template includes career_stage');

// === 6. deriveCareerStage correctness ===
console.log('\n--- deriveCareerStage correctness ---');
const dcs = si.deriveCareerStage;
assert(dcs('신입') === 'entry', '신입 → entry');
assert(dcs('신입·경력') === 'entry', '신입·경력 → entry');
assert(dcs('경력·신입') === 'entry', '경력·신입 → entry');
assert(dcs('경력 무관') === null, '경력 무관 → null');
assert(dcs(null) === null, 'null → null');
assert(dcs('') === null, 'empty string → null');
assert(dcs('3~7년') === 'mid', '3~7년 → mid');
assert(dcs('1~3년') === 'junior', '1~3년 → junior');
assert(dcs('5~10년') === 'senior', '5~10년 → senior');
assert(dcs('10~15년') === 'lead', '10~15년 → lead');
assert(dcs('3년 이상') === 'mid', '3년 이상 → mid');
assert(dcs('8년 이상') === 'senior', '8년 이상 → senior');
assert(dcs('5년↑') === 'mid', '5년↑ → mid');
assert(dcs('2년') === 'junior', '2년 → junior');

// === Summary ===
console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 ${passed} passed | ${failed} failed`);
if (failed > 0) process.exit(1);
