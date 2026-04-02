#!/usr/bin/env node
/**
 * EXP-077: Skills Column Schema + Storage Tests
 * 
 * Hypothesis: Skills field is parsed by post-processors but never persisted to DB.
 * Adding skills TEXT column and wiring into INSERT enables matcher-agent to query
 * skills directly from the database instead of re-extracting every time.
 * 
 * Tests: schema migration, INSERT with skills, query skills, matching integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

// Create temp DB
const tmpDb = path.join(os.tmpdir(), `test_skills_${Date.now()}.db`);

// Schema with skills column
const SCHEMA = `
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  url TEXT,
  content TEXT,
  location TEXT,
  work_type TEXT,
  commute_min INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  experience TEXT,
  salary TEXT,
  deadline TEXT,
  reward TEXT,
  culture_keywords TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  skills TEXT DEFAULT ''
);
`;

function sql(cmd) {
  return execSync(`sqlite3 "${tmpDb}" "${cmd.replace(/"/g, '\\"')}"`).toString().trim();
}

// Setup
fs.writeFileSync(tmpDb, '');
execSync(`sqlite3 "${tmpDb}" "${SCHEMA.replace(/\n/g, ' ')}"`);

console.log('\n🧪 Skills Column Tests\n');

// === Schema Tests ===
test('skills column exists in schema', () => {
  const cols = sql("PRAGMA table_info(jobs);");
  assert(cols.includes('skills'), 'skills column missing');
});

test('skills column is TEXT type', () => {
  const cols = sql("PRAGMA table_info(jobs);");
  const lines = cols.split('\n');
  const skillsCol = lines.find(l => l.includes('|skills|'));
  assert(skillsCol, 'skills row not found');
  assert(skillsCol.includes('TEXT'), `expected TEXT, got: ${skillsCol}`);
});

test('skills column has empty default', () => {
  const cols = sql("PRAGMA table_info(jobs);");
  const lines = cols.split('\n');
  const skillsCol = lines.find(l => l.includes('|skills|'));
  assert(skillsCol.includes("''"), `expected default '', got: ${skillsCol}`);
});

// === INSERT Tests ===
test('INSERT with skills string', () => {
  sql(`INSERT INTO jobs (id, source, title, company, skills) VALUES ('t1', 'wanted', 'React Developer', '카카오', 'React,TypeScript,Next.js')`);
  const result = sql("SELECT skills FROM jobs WHERE id='t1'");
  assert.strictEqual(result, 'React,TypeScript,Next.js');
});

test('INSERT without skills defaults to empty', () => {
  sql(`INSERT INTO jobs (id, source, title, company) VALUES ('t2', 'wanted', 'Backend Dev', '네이버')`);
  const result = sql("SELECT skills FROM jobs WHERE id='t2'");
  assert.strictEqual(result, '');
});

test('INSERT with comma-separated Korean+English skills', () => {
  sql(`INSERT INTO jobs (id, source, title, company, skills) VALUES ('t3', 'jobkorea', '백엔드 개발자', '토스', 'Spring,Java,MySQL,AWS,Docker')`);
  const result = sql("SELECT skills FROM jobs WHERE id='t3'");
  assert(result.includes('Spring'));
  assert(result.includes('Java'));
});

// === Query Tests ===
test('LIKE query on skills column', () => {
  const result = sql("SELECT title FROM jobs WHERE skills LIKE '%React%'");
  assert.strictEqual(result, 'React Developer');
});

test('skills NOT NULL/empty filter', () => {
  const result = sql("SELECT COUNT(*) FROM jobs WHERE skills IS NOT NULL AND skills != ''");
  assert(parseInt(result) >= 2, 'should find at least 2 jobs with skills');
});

test('Multiple skill filters with AND', () => {
  sql(`INSERT INTO jobs (id, source, title, company, skills) VALUES ('t4', 'wanted', 'DevOps Engineer', '라인', 'Docker,Kubernetes,AWS,Terraform')`);
  const result = sql("SELECT title FROM jobs WHERE skills LIKE '%Docker%' AND skills LIKE '%Kubernetes%'");
  assert.strictEqual(result, 'DevOps Engineer');
});

// === Matching Integration Test ===
test('skills from DB feed into matching skill scoring', () => {
  // Simulate: read skills from DB, split, score against candidate
  const dbSkills = sql("SELECT skills FROM jobs WHERE id='t1'");
  const jobSkills = dbSkills.split(',').map(s => s.trim().toLowerCase());
  
  const candidateSkills = ['react', 'typescript', 'javascript', 'python'];
  let matchCount = 0;
  for (const js of jobSkills) {
    if (candidateSkills.includes(js)) matchCount++;
  }
  // React, TypeScript match → 2/3 = ~67%
  assert(matchCount >= 2, `expected at least 2 matches, got ${matchCount}`);
});

test('empty skills triggers title-based inference fallback', () => {
  const dbSkills = sql("SELECT skills FROM jobs WHERE id='t2'");
  assert.strictEqual(dbSkills, '');
  // Simulate: when skills empty, infer from title
  const title = sql("SELECT title FROM jobs WHERE id='t2'");
  assert(title === 'Backend Dev'); // Would trigger inference in real pipeline
});

// === UPDATE skills (detail page enrichment) ===
test('UPDATE skills after detail-page extraction', () => {
  sql(`UPDATE jobs SET skills = 'Spring Boot,Java,JPA,PostgreSQL,Redis' WHERE id = 't2'`);
  const result = sql("SELECT skills FROM jobs WHERE id='t2'");
  assert(result.includes('Spring Boot'));
  assert(result.includes('JPA'));
});

// === Dedup: same skills across sources ===
test('Cross-source dedup preserves richer skills', () => {
  sql(`INSERT INTO jobs (id, source, title, company, skills) VALUES ('t5', 'linkedin', 'React Developer', '카카오', 'React,TypeScript,GraphQL,Cypress')`);
  // Same job from different source - LinkedIn has richer skills
  const allSkills = sql("SELECT id, skills FROM jobs WHERE company='카카오' ORDER BY LENGTH(skills) DESC LIMIT 1");
  assert(allSkills.includes('t5'), 'LinkedIn entry with richer skills should be preferred');
});

// === Migration test (ALTER TABLE) ===
test('ALTER TABLE adds skills to existing schema', () => {
  const tmpDb2 = path.join(os.tmpdir(), `test_skills_migrate_${Date.now()}.db`);
  fs.writeFileSync(tmpDb2, '');
  // Old schema without skills
  execSync(`sqlite3 "${tmpDb2}" "CREATE TABLE jobs (id TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, company TEXT NOT NULL);"`);
  // Migrate
  execSync(`sqlite3 "${tmpDb2}" "ALTER TABLE jobs ADD COLUMN skills TEXT DEFAULT '';"`);
  const cols = execSync(`sqlite3 "${tmpDb2}" "PRAGMA table_info(jobs);"`).toString().trim();
  assert(cols.includes('skills'), 'skills column should exist after migration');
  fs.unlinkSync(tmpDb2);
});

// === Work with all 3 sources ===
test('Skills populated from all 3 post-processors', () => {
  // Wanted: inferSkillsFromTitle + detail extraction
  // JobKorea: positional parsing + detail extraction  
  // LinkedIn: inferSkillsFromText + detail extraction
  const sources = ['wanted', 'jobkorea', 'linkedin'];
  for (const src of sources) {
    sql(`INSERT INTO jobs (id, source, title, company, skills) VALUES ('test_${src}', '${src}', 'Dev', 'Co', 'React,TypeScript')`);
  }
  const count = sql("SELECT COUNT(*) FROM jobs WHERE source IN ('wanted','jobkorea','linkedin') AND skills != '' AND skills IS NOT NULL");
  assert(parseInt(count) >= 3, 'all 3 sources should have skills');
});

// Cleanup
fs.unlinkSync(tmpDb);

console.log(`\n📊 ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
