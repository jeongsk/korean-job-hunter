// EXP-027: Test schema completeness - experience, salary, deadline, reward fields
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'jobs_test_exp027.db');

// Create test database with new schema
const { execSync } = require('child_process');
execSync(`rm -f "${dbPath}"`);
execSync(`sqlite3 "${dbPath}" "
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  url TEXT,
  content TEXT,
  location TEXT,
  work_type TEXT,
  experience TEXT,
  salary TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  deadline TEXT,
  reward TEXT,
  commute_min INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
"`);

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('Insert job with all new fields', () => {
  execSync(`sqlite3 "${dbPath}" "INSERT INTO jobs (id, source, title, company, url, experience, salary, deadline, reward, work_type, location) VALUES ('t1', 'wanted', 'Backend Engineer', 'Kakao', 'https://wanted.co.kr/wd/123', '경력 5년 이상', '5000~8000만원', '2026-04-15', '합격보상금 100만원', 'hybrid', '서울 영등포구')"`);
});

test('Insert job with minimal fields (experience/salary optional)', () => {
  execSync(`sqlite3 "${dbPath}" "INSERT INTO jobs (id, source, title, company) VALUES ('t2', 'linkedin', 'DevOps Engineer', 'Naver')"`);
});

test('Query jobs by experience range', () => {
  const result = execSync(`sqlite3 "${dbPath}" "SELECT title, experience FROM jobs WHERE experience LIKE '%5년%'"`).toString().trim();
  if (!result.includes('Backend Engineer')) throw new Error('Expected to find Backend Engineer: ' + result);
});

test('Query jobs with salary info', () => {
  const result = execSync(`sqlite3 "${dbPath}" "SELECT title, salary FROM jobs WHERE salary IS NOT NULL AND salary != ''"`).toString().trim();
  if (!result.includes('5000')) throw new Error('Expected salary data: ' + result);
});

test('Query jobs by deadline', () => {
  const result = execSync(`sqlite3 "${dbPath}" "SELECT title, deadline FROM jobs WHERE deadline IS NOT NULL AND deadline != ''"`).toString().trim();
  if (!result.includes('04-15')) throw new Error('Expected deadline data: ' + result);
});

test('Tracker query with new fields', () => {
  // Simulate tracker query with all fields
  const result = execSync(`sqlite3 -json "${dbPath}" "SELECT j.title, j.company, j.experience, j.salary, j.deadline, j.reward, j.work_type, j.location FROM jobs j WHERE j.work_type = 'hybrid'"`).toString();
  const rows = JSON.parse(result);
  if (rows.length !== 1 || rows[0].experience !== '경력 5년 이상') throw new Error('Expected hybrid job with experience: ' + JSON.stringify(rows));
});

test('Update existing job with new fields', () => {
  execSync(`sqlite3 "${dbPath}" "UPDATE jobs SET experience='경력 3년 이상', salary='4000만원', deadline='2026-04-30' WHERE id='t2'"`);
  const result = execSync(`sqlite3 "${dbPath}" "SELECT experience, salary FROM jobs WHERE id='t2'"`).toString().trim();
  if (!result.includes('3년') || !result.includes('4000')) throw new Error('Expected updated fields: ' + result);
});

// Run tests
let passed = 0, failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`✅ ${t.name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${t.name}: ${e.message}`);
    failed++;
  }
}

console.log(`\n${passed}/${tests.length} passed`);

// Also verify the actual DB has the new columns
const actualCols = execSync(`sqlite3 "${path.join(__dirname, 'data', 'jobs.db')}" "PRAGMA table_info(jobs)"`).toString();
const requiredCols = ['experience', 'salary', 'deadline', 'reward', 'culture_keywords'];
let schemaOk = true;
for (const col of requiredCols) {
  if (!actualCols.includes(col)) {
    console.log(`❌ jobs.db missing column: ${col}`);
    schemaOk = false;
  }
}
if (schemaOk) console.log('✅ jobs.db has all columns (experience, salary, deadline, reward, culture_keywords)');

// Cleanup
execSync(`rm -f "${dbPath}"`);

if (failed > 0) process.exit(1);
