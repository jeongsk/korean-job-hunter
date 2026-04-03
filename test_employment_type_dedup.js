#!/usr/bin/env node
/**
 * Test: employment_type in dedup pipeline (EXP-086)
 * Verifies that employment_type is preserved during cross-source dedup merge.
 */
const assert = require('assert');

// ── Inline dedup helpers (mirrors dedup-jobs.js) ──

function fieldScore(job) {
  let score = 0;
  if (job.title) score++;
  if (job.company) score++;
  if (job.salary && job.salary.trim()) score += 2;
  if (job.deadline && job.deadline.trim()) score += 2;
  if (job.experience && job.experience.trim()) score++;
  if (job.work_type && job.work_type.trim()) score++;
  if (job.location && job.location.trim()) score++;
  if (job.content && job.content.trim()) score += 2;
  if (job.skills && job.skills.trim()) score += 3;
  if (job.culture_keywords && job.culture_keywords.trim()) score += 1;
  if (job.employment_type && job.employment_type !== 'regular') score += 1;
  if (job.source === 'wanted') score += 1;
  return score;
}

let passed = 0, total = 0;

function test(name, fn) {
  total++;
  try { fn(); passed++; console.log(`✅ ${name}`); }
  catch (e) { console.log(`❌ ${name}: ${e.message}`); }
}

// ── Tests ──

test('fieldScore: employment_type=contract adds 1 point', () => {
  const regular = { title: 'Dev', company: 'C', source: 'wanted', employment_type: 'regular' };
  const contract = { ...regular, employment_type: 'contract' };
  assert.strictEqual(fieldScore(contract), fieldScore(regular) + 1);
});

test('fieldScore: employment_type=intern adds 1 point', () => {
  const regular = { title: 'Dev', company: 'C', source: 'wanted', employment_type: 'regular' };
  const intern = { ...regular, employment_type: 'intern' };
  assert.strictEqual(fieldScore(intern), fieldScore(regular) + 1);
});

test('fieldScore: employment_type=regular adds 0 points (default)', () => {
  const base = { title: 'Dev', company: 'C', source: 'wanted' };
  const withField = { ...base, employment_type: 'regular' };
  assert.strictEqual(fieldScore(withField), fieldScore(base));
});

test('fieldScore: employment_type=freelance adds 1 point', () => {
  const regular = { title: 'Dev', company: 'C', source: 'wanted', employment_type: 'regular' };
  const freelance = { ...regular, employment_type: 'freelance' };
  assert.strictEqual(fieldScore(freelance), fieldScore(regular) + 1);
});

test('enrichment: employment_type is in enrichFields list', () => {
  // Read dedup-jobs.js and verify
  const fs = require('fs');
  const src = fs.readFileSync('scripts/dedup-jobs.js', 'utf8');
  const match = src.match(/enrichFields\s*=\s*\[([^\]]+)\]/);
  assert(match, 'enrichFields not found');
  assert(match[1].includes('employment_type'), 'employment_type missing from enrichFields');
});

test('SQL query: employment_type in SELECT columns', () => {
  const fs = require('fs');
  const src = fs.readFileSync('scripts/dedup-jobs.js', 'utf8');
  assert(src.includes('employment_type'), 'employment_type not in dedup script');
  // Verify it's in the SELECT
  const selectMatch = src.match(/SELECT[^"]+employment_type/);
  assert(selectMatch, 'employment_type not in SELECT query');
});

test('DB schema: employment_type column exists', () => {
  const { execSync } = require('child_process');
  const cols = execSync('sqlite3 data/jobs.db "PRAGMA table_info(jobs);"', { encoding: 'utf8' });
  assert(cols.includes('employment_type'), 'employment_type column missing from jobs table');
});

test('DB schema: employment_type defaults to regular', () => {
  const { execSync } = require('child_process');
  const cols = execSync('sqlite3 data/jobs.db "PRAGMA table_info(jobs);"', { encoding: 'utf8' });
  const line = cols.split('\n').find(l => l.includes('employment_type'));
  assert(line && line.includes('regular'), 'employment_type default not regular');
});

test('scraper-agent.md: INSERT includes employment_type', () => {
  const fs = require('fs');
  const src = fs.readFileSync('agents/scraper-agent.md', 'utf8');
  const insertMatch = src.match(/INSERT OR IGNORE INTO jobs[^)]+\)/);
  assert(insertMatch, 'INSERT template not found');
  assert(insertMatch[0].includes('employment_type'), 'employment_type missing from INSERT columns');
});

test('post-process-wanted.js: outputs employment_type', () => {
  const fs = require('fs');
  const src = fs.readFileSync('scripts/post-process-wanted.js', 'utf8');
  assert(src.includes("employment_type: 'regular'"), 'Wanted post-processor missing employment_type default');
});

test('post-process-jobkorea.js: outputs employment_type', () => {
  const fs = require('fs');
  const src = fs.readFileSync('scripts/post-process-jobkorea.js', 'utf8');
  assert(src.includes("employment_type = 'regular'") || src.includes("employment_type: 'regular'"), 'JobKorea post-processor missing employment_type');
});

test('post-process-linkedin.js: outputs employment_type', () => {
  const fs = require('fs');
  const src = fs.readFileSync('scripts/post-process-linkedin.js', 'utf8');
  assert(src.includes("employment_type = 'regular'") || src.includes("employment_type: 'regular'"), 'LinkedIn post-processor missing employment_type');
});

// ── Summary ──
console.log(`\n──────────────────────────────────────────────────`);
console.log(`📊 ${passed}/${total} tests passed`);
if (passed !== total) process.exit(1);
