#!/usr/bin/env node
/**
 * EXP-072: NLP-to-SQL Integration Test
 * Validates that parseKoreanQuery() output SQL actually executes correctly
 * against a real SQLite database with the production schema.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── NLP Parser (copy from test_korean_nlp_v3.js) ──

const { parseKoreanQuery } = require("./scripts/nlp-parser");


// ── Test Infrastructure ──
const tests = [];
let passed = 0, failed = 0;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nlp-sql-'));
const dbPath = path.join(tmpDir, 'test.db');

function test(name, fn) { tests.push({ name, fn }); }

function sql(cmd) {
  return execSync(`sqlite3 -json "${dbPath}" "${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf8' }).trim();
}

function sqlRun(cmd) {
  execSync(`sqlite3 "${dbPath}" "${cmd.replace(/"/g, '\\"')}"`);
}

// ── Setup DB ──
sqlRun(`CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  source TEXT,
  title TEXT,
  company TEXT,
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
  skills TEXT DEFAULT '',
  culture_keywords TEXT DEFAULT '',
  employment_type TEXT DEFAULT 'regular',
  career_stage TEXT DEFAULT 'mid',
  office_address TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

sqlRun(`CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  resume_hash TEXT,
  score INTEGER,
  skill_score INTEGER,
  location_score INTEGER,
  report TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

sqlRun(`CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  job_id TEXT REFERENCES jobs(id),
  status TEXT,
  memo TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// ── Seed Data ──
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

const jobs = [
  { id: 'j1', source: 'wanted', title: '백엔드 엔지니어', company: '카카오', location: '서울 영등포구', work_type: 'hybrid', experience: '경력 5년 이상', salary: '8000~12000만원', salary_min: 8000, salary_max: 12000, deadline: nextWeek, skills: 'spring boot,java,kubernetes,aws', employment_type: 'regular', career_stage: 'senior' },
  { id: 'j2', source: 'wanted', title: '프론트엔드 개발자', company: '네이버', location: '경기 성남시', work_type: 'remote', experience: '경력 3년 이상', salary: '6000~9000만원', salary_min: 6000, salary_max: 9000, deadline: tomorrow, skills: 'react,typescript,next.js', employment_type: 'regular', career_stage: 'mid' },
  { id: 'j3', source: 'jobkorea', title: '데이터 엔지니어', company: '토스', location: '서울 강남구', work_type: 'onsite', experience: '경력 2년 이상', salary: '5000~8000만원', salary_min: 5000, salary_max: 8000, deadline: today, skills: 'python,kafka,redis,postgresql', employment_type: 'regular', career_stage: 'mid' },
  { id: 'j4', source: 'linkedin', title: 'DevOps Engineer', company: '라인', location: '서울 영등포구', work_type: 'hybrid', experience: '경력 무관', salary: null, salary_min: null, salary_max: null, deadline: null, skills: 'docker,kubernetes,terraform,aws', employment_type: 'contract', career_stage: 'mid' },
  { id: 'j5', source: 'wanted', title: 'iOS 개발자', company: '카카오뱅크', location: '서울 강남구', work_type: 'onsite', experience: '신입 가능', salary: '4000~6000만원', salary_min: 4000, salary_max: 6000, deadline: null, skills: 'swift,swiftui,kotlin', employment_type: 'regular', career_stage: 'junior' },
  { id: 'j6', source: 'jobkorea', title: '백엔드 시니어', company: '쿠팡', location: '서울 송파구', work_type: 'hybrid', experience: '경력 7년 이상', salary: '1억~1억5천', salary_min: 10000, salary_max: 15000, deadline: nextWeek, skills: 'java,spring boot,kafka,elasticsearch', employment_type: 'regular', career_stage: 'lead' },
  { id: 'j7', source: 'wanted', title: '인턴 프로그래머', company: '삼성', location: '서울 강남구', work_type: 'onsite', experience: '신입', salary: null, salary_min: null, salary_max: null, deadline: nextWeek, skills: 'java,python', employment_type: 'intern', career_stage: 'entry' },
];

const applications = [
  { id: 'a1', job_id: 'j1', status: 'interview', memo: '1차 면접 예정', updated_at: '2026-04-01' },
  { id: 'a2', job_id: 'j2', status: 'applied', memo: '', updated_at: '2026-03-30' },
  { id: 'a3', job_id: 'j3', status: 'interested', memo: '', updated_at: '2026-04-01' },
  { id: 'a4', job_id: 'j4', status: 'rejected', memo: '', updated_at: '2026-03-28' },
  { id: 'a5', job_id: 'j5', status: 'applying', memo: '', updated_at: '2026-04-02' },
  { id: 'a6', job_id: 'j6', status: 'applied', memo: '', updated_at: '2026-03-25' },
  { id: 'a7', job_id: 'j7', status: 'interested', memo: '', updated_at: '2026-04-04' },
];

const matches = [
  { id: 'm1', job_id: 'j1', score: 87, skill_score: 85, location_score: 90 },
  { id: 'm2', job_id: 'j2', score: 72, skill_score: 70, location_score: 75 },
  { id: 'm3', job_id: 'j3', score: 65, skill_score: 60, location_score: 70 },
  { id: 'm4', job_id: 'j4', score: 45, skill_score: 40, location_score: 50 },
  { id: 'm5', job_id: 'j5', score: 30, skill_score: 25, location_score: 35 },
  { id: 'm6', job_id: 'j6', score: 91, skill_score: 90, location_score: 92 },
  { id: 'm7', job_id: 'j7', score: 20, skill_score: 15, location_score: 30 },
];

for (const j of jobs) {
  sqlRun(`INSERT INTO jobs (id, source, title, company, location, work_type, experience, salary, salary_min, salary_max, deadline, skills, employment_type, career_stage)
    VALUES ('${j.id}', '${j.source}', '${j.title}', '${j.company}', '${j.location}', '${j.work_type}', '${j.experience}', ${j.salary ? `'${j.salary}'` : 'NULL'}, ${j.salary_min || 'NULL'}, ${j.salary_max || 'NULL'}, ${j.deadline ? `'${j.deadline}'` : 'NULL'}, '${j.skills || ''}', '${j.employment_type || 'regular'}', '${j.career_stage || 'mid'}')`);
}
for (const a of applications) {
  sqlRun(`INSERT INTO applications (id, job_id, status, memo, updated_at) VALUES ('${a.id}', '${a.job_id}', '${a.status}', '${a.memo}', '${a.updated_at}')`);
}
for (const m of matches) {
  sqlRun(`INSERT INTO matches (id, job_id, score, skill_score, location_score) VALUES ('${m.id}', '${m.job_id}', ${m.score}, ${m.skill_score}, ${m.location_score})`);
}

// ── Helper: build and execute query ──
function executeNLPQuery(koreanInput) {
  const { filters, order } = parseKoreanQuery(koreanInput);
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const query = `SELECT j.title, j.company, j.location, j.work_type, j.experience, j.salary_min, j.salary_max, j.deadline, a.status, m.score FROM applications a JOIN jobs j ON a.job_id = j.id LEFT JOIN matches m ON a.job_id = m.job_id ${where} ORDER BY ${order}`;
  const result = sql(query);
  return result ? JSON.parse(result) : [];
}

// ── Tests ──

test('면접 잡힌 거 - returns interview jobs', () => {
  const rows = executeNLPQuery('면접 잡힌 거 있어?');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '카카오', `expected 카카오, got ${rows[0].company}`);
  assert(rows[0].status === 'interview', `expected interview, got ${rows[0].status}`);
});

test('지원한 거 - returns applied jobs', () => {
  const rows = executeNLPQuery('지원한 거 다 보여줘');
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.every(r => r.status === 'applied'), 'all should be applied');
});

test('관심 공고 - returns interested jobs', () => {
  const rows = executeNLPQuery('찜해둔 공고');
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.some(r => r.company === '토스'), '토스 should be in results');
});

test('카카오 공고 - filters by company', () => {
  const rows = executeNLPQuery('카카오 공고 있어?');
  // LIKE '%카카오%' matches both 카카오 and 카카오뱅크
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.every(r => r.company.includes('카카오')), 'all should include 카카오');
});

test('지원한 거 중에 카카오 빼고 - negation filter', () => {
  const rows = executeNLPQuery('지원한 거 중에 카카오 빼고');
  // Applied jobs: j2(네이버), j6(쿠팡) — neither is 카카오, so both pass the NOT LIKE filter
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.every(r => !r.company.includes('카카오')), 'none should include 카카오');
});

test('재택 공고 - work_type remote filter', () => {
  const rows = executeNLPQuery('재택으로 할 수 있는 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '네이버', `expected 네이버, got ${rows[0].company}`);
  assert(rows[0].work_type === 'remote', `expected remote, got ${rows[0].work_type}`);
});

test('서울 공고 - location filter', () => {
  const rows = executeNLPQuery('서울에 있는 공고');
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
  assert(rows.every(r => r.location.includes('서울')), 'all should be 서울');
});

test('연봉 8000 이상 - salary filter', () => {
  const rows = executeNLPQuery('연봉 8000 이상 공고');
  // Both 카카오 (8000) and 쿠팡 (10000) match
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.every(r => r.salary_min >= 8000), 'all should have salary_min >= 8000');
});

test('연봉 있는 공고 - has salary filter', () => {
  const rows = executeNLPQuery('연봉 있는 공고');
  assert(rows.length >= 3, `expected >= 3, got ${rows.length}`);
  assert(rows.every(r => r.salary_min !== null), 'all should have salary_min');
});

test('마감임박 공고 - deadline urgency', () => {
  const rows = executeNLPQuery('마감임박한 공고 있어?');
  // j2 (tomorrow) and j3 (today) have applications, j1 and j6 have deadlines within 7 days
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
});

test('오늘 마감 - today deadline', () => {
  const rows = executeNLPQuery('오늘 마감인 거');
  // j3 (토스, deadline=today) and j1/j6 (deadline=nextWeek) — only today's deadline matches
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
  const toss = rows.find(r => r.company === '토스');
  assert(toss, '토스 should be in results');
});

test('탈락한 거 빼고 - negation of rejected/declined', () => {
  const { filters } = parseKoreanQuery('탈락한 거 빼고 다 보여줘');
  // Status should be NOT IN rejected,declined
  assert(filters.some(f => f.includes('NOT IN')), `expected NOT IN filter, got ${filters}`);
});

test('점수순 정렬 - score ordering', () => {
  const { order } = parseKoreanQuery('점수높은 순으로');
  assert(order === 'm.score DESC', `expected m.score DESC, got ${order}`);
});

test('경력 공고 - standalone 경력 filter', () => {
  const rows = executeNLPQuery('경력 공고 있어?');
  // Should exclude 신입-only, include 경력 or 무관
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
});

test('5년차 공고 - 년차 pattern', () => {
  const rows = executeNLPQuery('5년차 공고 있어?');
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
});

test('신입 공고 - 신입 filter', () => {
  const rows = executeNLPQuery('신입 공고 있어?');
  // j5 (카카오뱅크, "신입 가능") + j4 (라인, "경력 무관") — both match 신입 filter
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
  const kb = rows.find(r => r.company === '카카오뱅크');
  assert(kb, '카카오뱅크 should be in results');
});

test('카카오뱅크 not confused with 카카오 - company substring', () => {
  const rows = executeNLPQuery('카카오뱅크 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '카카오뱅크', `expected 카카오뱅크, got ${rows[0].company}`);
});

test('합격한 공고 - offer status', () => {
  const rows = executeNLPQuery('합격한 곳');
  assert(rows.length === 0, `expected 0 (no offers), got ${rows.length}`);
});

test('백엔드 공고 - title keyword filter', () => {
  const rows = executeNLPQuery('백엔드 공고 있어?');
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
  assert(rows.every(r => r.title.includes('백엔드')), 'all should have 백엔드 in title');
});

test('complex query - 지원한 서울 연봉 마감순', () => {
  const rows = executeNLPQuery('지원한 서울 공고 마감순');
  assert(rows.length >= 1, `expected >= 1, got ${rows.length}`);
});

// EXP-078: Skill-based filtering tests
test('React 공고 - skill filter', () => {
  const rows = executeNLPQuery('React 공고 있어?');
  assert(rows.length === 1, `expected 1, got ${rows.length}: ${JSON.stringify(rows)}`);
  assert(rows[0].company === '네이버', `expected 네이버, got ${rows[0].company}`);
});

test('파이썬 공고 - Korean skill alias', () => {
  const rows = executeNLPQuery('파이썬 공고');
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.some(r => r.company === '토스'), '토스 should be in results');
});

test('도커 쓰는 공고 - Korean alias + stopword', () => {
  const rows = executeNLPQuery('도커 쓰는 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '라인', `expected 라인, got ${rows[0].company}`);
});

test('스프링 부트 지원한 공고 - skill + status', () => {
  const rows = executeNLPQuery('스프링 부트 지원한 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '쿠팡', `expected 쿠팡, got ${rows[0].company}`);
});

test('k8s 서울 공고 - alias + location', () => {
  const rows = executeNLPQuery('k8s 서울 공고');
  assert(rows.length === 2, `expected 2, got ${rows.length}`);
  assert(rows.every(r => r.location.includes('서울')), 'all should be 서울');
});

// ── EXP-079: Multi-skill SQL integration ──
test('React TypeScript 공고 - two skill filters combined', () => {
  const rows = executeNLPQuery('React TypeScript 공고');
  // j2 has react/typescript/next.js
  assert(rows.length === 1, `expected 1 (j2 only), got ${rows.length}: ${JSON.stringify(rows.map(r=>r.title))}`);
  assert(rows[0].title === '프론트엔드 개발자', `expected 프론트엔드 개발자, got ${rows[0].title}`);
  assert(rows[0].skills === undefined, 'j.id not in SELECT - use title');
});

test('도커 k8s 서울 공고 - multi-skill + location', () => {
  const rows = executeNLPQuery('도커 k8s 서울 공고');
  // j4 has docker,kubernetes,terraform,aws at 서울 영등포구
  assert(rows.length === 1, `expected 1 (j4 only), got ${rows.length}: ${JSON.stringify(rows.map(r=>r.title))}`);
  assert(rows[0].title === 'DevOps Engineer', `expected DevOps Engineer, got ${rows[0].title}`);
  assert(rows[0].location.includes('서울'), 'should be 서울');
});

test('파이썬 장고 공고 - two Korean skill aliases', () => {
  const rows = executeNLPQuery('파이썬 장고 공고');
  // j3 has python,kafka,redis,postgresql - has python but not django
  assert(rows.length === 0, `expected 0 (no job has both python AND django), got ${rows.length}: ${JSON.stringify(rows.map(r=>r.title))}`);
});

// ── EXP-118: Employment type, career stage, enhanced SQL integration ──

test('정규직 공고 - employment_type regular filter', () => {
  const rows = executeNLPQuery('정규직 공고 있어?');
  assert(rows.length >= 5, `expected >= 5, got ${rows.length}`);
  // j4(contract) and j7(intern) should be excluded
  assert(!rows.some(r => r.company === '라인'), '라인(contract) should be excluded');
});

test('계약직 공고 - employment_type contract filter', () => {
  const rows = executeNLPQuery('계약직 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '라인', `expected 라인, got ${rows[0].company}`);
});

test('인턴 공고 - employment_type intern filter', () => {
  const rows = executeNLPQuery('인턴 공고 있어?');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '삼성', `expected 삼성, got ${rows[0].company}`);
});

test('시니어 공고 - career_stage senior filter', () => {
  const rows = executeNLPQuery('시니어 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '카카오', `expected 카카오, got ${rows[0].company}`);
});

test('리드 포지션 - career_stage lead filter', () => {
  const rows = executeNLPQuery('리드 포지션');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '쿠팡', `expected 쿠팡, got ${rows[0].company}`);
});

test('주니어 공고 - career_stage junior filter', () => {
  const rows = executeNLPQuery('주니어 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '카카오뱅크', `expected 카카오뱅크, got ${rows[0].company}`);
});

test('정규직 시니어 카카오 - composite employment+career+company', () => {
  const rows = executeNLPQuery('정규직 시니어 카카오 공고');
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '카카오', `expected 카카오, got ${rows[0].company}`);
});

test('블록체인 공고 - skill not in any job returns empty', () => {
  const rows = executeNLPQuery('블록체인 공고');
  assert(rows.length === 0, `expected 0, got ${rows.length}`);
});

test('자바 공고 정규직 - skill + employment_type composite', () => {
  const rows = executeNLPQuery('자바 공고 정규직');
  // j1(kakao, java, regular), j6(coupang, java, regular), j7(samsung, java, regular)
  assert(rows.length >= 2, `expected >= 2, got ${rows.length}`);
  assert(!rows.some(r => r.company === '라인'), '라인 should be excluded (contract)');
});

test('쿠버네티스 공고 서울 - skill + location composite', () => {
  const rows = executeNLPQuery('쿠버네티스 공고 서울');
  // j1(kakao, k8s, 서울), j4(line, k8s, 서울)
  assert(rows.length === 2, `expected 2, got ${rows.length}: ${JSON.stringify(rows.map(r => r.company))}`);
});

// ── Run ──
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

for (const { name, fn } of tests) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err.message}`);
  }
}

// Cleanup
try { fs.unlinkSync(dbPath); fs.rmdirSync(tmpDir); } catch {}

console.log(`\n📊 ${tests.length} tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
