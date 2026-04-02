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
function parseKoreanQuery(input) {
  const filters = [];
  let order = "a.updated_at DESC";
  const text = input.trim();
  if (!text) return { filters, order };

  const consumedWords = new Set();

  if (/최신순/.test(text)) { order = "a.updated_at DESC"; consumedWords.add('최신순'); }
  if (/(점수|매칭)순|(점수|매칭).*순/.test(text)) { order = "m.score DESC"; consumedWords.add('점수순'); consumedWords.add('매칭순'); }
  if (/마감(순| 빠른순)/.test(text)) { order = "j.deadline ASC"; consumedWords.add('마감순'); }

  const statusPatterns = [
    { regex: /면접(잡힌|보는)?/, status: 'interview', words: ['면접', '면접보는', '면접잡힌'] },
    { regex: /지원(완료|한|했)/, status: 'applied', words: ['지원완료', '지원한', '지원했'] },
    { regex: /(관심|북마크|찜해둔|찜)/, status: 'interested', words: ['관심', '북마크', '찜해둔', '찜'] },
    { regex: /(합격|오퍼)/, status: 'offer', words: ['합격', '합격한', '오퍼'] },
    { regex: /불합격/, status: 'declined', words: ['불합격'] },
    { regex: /(탈락|거절|떨어)/, status: 'rejected,declined', words: ['탈락', '탈락한', '거절', '떨어진'] },
    { regex: /지원(예정|할)/, status: 'applying', words: ['지원예정', '지원할'] },
  ];
  for (const { regex, status, words } of statusPatterns) {
    if (regex.test(text)) {
      if (status.includes(',')) filters.push(`a.status IN ('${status.split(',').join("','")}')`);
      else filters.push(`a.status = '${status}'`);
      for (const w of words) consumedWords.add(w);
      break;
    }
  }

  const negationMatch = text.match(/(빼고|제외|말고)/);
  const negationIdx = negationMatch ? text.indexOf(negationMatch[0]) : -1;
  let appliedNegation = false;

  if (/(재택|원격|리모트)/.test(text)) { filters.push("j.work_type = 'remote'"); consumedWords.add('재택'); consumedWords.add('원격'); consumedWords.add('리모트'); }
  if (/하이브리드/.test(text)) { filters.push("j.work_type = 'hybrid'"); consumedWords.add('하이브리드'); }

  if (negationMatch && !appliedNegation) {
    // Look BEFORE the negation word for the entity to exclude
    const before = text.substring(0, negationIdx).trim();
    const after = text.substring(negationIdx + negationMatch[0].length).trim();
    
    // Check for company negation in text before AND after 빼고
    const negCompanyMatch = before.match(/(카카오뱅크|카카오페이|카카오엔터|카카오|네이버|라인|토스뱅크|토스|쿠팡|배달의민족|우아한형제들|당근마켓|야놀자)$/)
      || after.match(/(카카오뱅크|카카오페이|카카오엔터|카카오|네이버|라인|토스뱅크|토스|쿠팡|배달의민족|우아한형제들|당근마켓|야놀자)/);
    if (negCompanyMatch) {
      filters.push(`j.company NOT LIKE '%${negCompanyMatch[1]}%'`);
      consumedWords.add(negCompanyMatch[1]);
      appliedNegation = true;
    } else if (filters.length > 0) {
      // Negate the last status filter (e.g., "탈락한 거 빼고" → NOT status IN rejected,declined)
      const lastIdx = filters.length - 1;
      const f = filters[lastIdx];
      const statusMatch = f.match(/a\.status\s*(=\s*'([^']+)'|IN\s*\(([^)]+)\))/);
      if (statusMatch) {
        if (statusMatch[2]) {
          filters[lastIdx] = `a.status != '${statusMatch[2]}'`;
        } else if (statusMatch[3]) {
          filters[lastIdx] = `a.status NOT IN (${statusMatch[3]})`;
        }
        appliedNegation = true;
      }
    }
  }

  const companies = ['카카오뱅크','카카오페이','카카오엔터','카카오','네이버','라인','토스뱅크','토스','쿠팡','배달의민족','우아한형제들','당근마켓','야놀자','크몽','배민','넥슨','엔씨소프트','네오위즈','한컴','위메프','마이플레이스'];
  companies.sort((a, b) => b.length - a.length);
  if (!appliedNegation) {
    for (const c of companies) {
      if (consumedWords.has(c)) continue;
      if (text.includes(c)) { filters.push(`j.company LIKE '%${c}%'`); consumedWords.add(c); break; }
    }
  }

  const locations = ['서울','경기','부산','대전','인천','광주','대구','울산','수원','이천','판교','강남','영등포','송파','성수','역삼','잠실','마포','용산','구로','분당','일산','평촌'];
  for (const loc of locations) {
    if (consumedWords.has(loc)) continue;
    if (text.includes(loc)) { filters.push(`j.location LIKE '%${loc}%'`); consumedWords.add(loc); break; }
  }

  const salaryMatch = text.match(/(?:연봉|급여|연수입)\s*(\d{1,5})(억|천|만)?\s*(이상|부터)?/);
  if (salaryMatch) {
    let val = parseInt(salaryMatch[1]);
    const unit = salaryMatch[2];
    if (unit === '억') val *= 10000;
    else if (unit === '천') val *= 1000;
    filters.push(`j.salary_min >= ${val}`);
    consumedWords.add('연봉'); consumedWords.add('급여'); consumedWords.add('연수입');
  } else if (/(연봉|급여|연수입)/.test(text) && !consumedWords.has('연봉')) {
    filters.push("j.salary IS NOT NULL AND j.salary != '' AND j.salary_min IS NOT NULL");
    consumedWords.add('연봉'); consumedWords.add('급여'); consumedWords.add('연수입');
  }

  if (/(마감임박|곧마감|마감 임박)/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND j.deadline != '' AND CAST(julianday(j.deadline) - julianday('now') AS INTEGER) BETWEEN 0 AND 7");
    consumedWords.add('마감임박'); consumedWords.add('곧마감'); consumedWords.add('마감 임박');
  } else if (/오늘 마감/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND ROUND(julianday(j.deadline) - julianday(date('now')), 4) BETWEEN -0.5 AND 0.5");
    consumedWords.add('오늘 마감');
  } else if (/내일 마감/.test(text)) {
    filters.push("j.deadline IS NOT NULL AND ROUND(julianday(j.deadline) - julianday(date('now')), 4) BETWEEN 0.5 AND 1.5");
    consumedWords.add('내일 마감');
  } else if ((/N일 남은/.test(text) || /(\d+)일 남은/.test(text))) {
    const dm = text.match(/(\d+)일 남은/);
    if (dm) {
      const days = parseInt(dm[1]);
      filters.push(`j.deadline IS NOT NULL AND CAST(julianday(j.deadline) - julianday('now') AS INTEGER) BETWEEN 0 AND ${days}`);
      consumedWords.add('일 남은');
    }
  } else if (/(기한 있는|데드라인 있는|마감$)/.test(text) || (/마감/.test(text) && !/마감임박|마감순|마감 빠른순|마감 임박/.test(text))) {
    if (!consumedWords.has('마감임박') && !consumedWords.has('마감순')) {
      filters.push("j.deadline IS NOT NULL AND j.deadline != ''");
      consumedWords.add('마감');
    }
  }

  const expMatch = text.match(/(\d+)년\s*이상/);
  if (expMatch) { filters.push(`j.experience LIKE '%${expMatch[1]}%'`); consumedWords.add('년 이상'); }

  const yearMatch = text.match(/(\d+)년차/);
  if (yearMatch) { filters.push(`j.experience LIKE '%${yearMatch[1]}%'`); consumedWords.add('년차'); consumedWords.add('년차'); }

  if (/경력/.test(text) && !consumedWords.has('년 이상') && !consumedWords.has('년차')) {
    filters.push("(j.experience NOT LIKE '%신입%' OR j.experience LIKE '%무관%')");
    consumedWords.add('경력');
  }

  if (/신입/.test(text)) {
    filters.push("j.experience LIKE '%신입%'");
    consumedWords.add('신입');
  }

  // === Skill-based filtering (EXP-078) ===
  const skillPatterns = [
    { canonical: 'react native', patterns: [/react\s*native/i, /리액트\s*네이티브/i] },
    { canonical: 'react', patterns: [/react(?!ive)|리액트/i] },
    { canonical: 'typescript', patterns: [/typescript|타입스크립트/i] },
    { canonical: 'javascript', patterns: [/javascript|자바스크립트/i] },
    { canonical: 'python', patterns: [/python|파이썬/i] },
    { canonical: 'java', patterns: [/java(?!script)|자바(?!스크립트)/i] },
    { canonical: 'go', patterns: [/golang|고언어|go언어/i] },
    { canonical: 'rust', patterns: [/rust|러스트/i] },
    { canonical: 'kotlin', patterns: [/kotlin|코틀린/i] },
    { canonical: 'swift', patterns: [/swift|스위프트/i] },
    { canonical: 'spring boot', patterns: [/spring\s*boot|스프링\s*부트/i] },
    { canonical: 'spring', patterns: [/spring|스프링/i] },
    { canonical: 'django', patterns: [/django|장고/i] },
    { canonical: 'docker', patterns: [/docker|도커/i] },
    { canonical: 'kubernetes', patterns: [/kubernetes|k8s|쿠버네티스/i] },
    { canonical: 'aws', patterns: [/aws|아마존웹서비스/i] },
    { canonical: 'node.js', patterns: [/node\.?js|노드/i] },
    { canonical: 'vue', patterns: [/vue\.?js?|뷰/i] },
    { canonical: 'next.js', patterns: [/next\.?js|넥스트/i] },
    { canonical: 'flutter', patterns: [/flutter|플러터/i] },
    { canonical: 'kafka', patterns: [/kafka/i] },
    { canonical: 'redis', patterns: [/redis|레디스/i] },
    { canonical: 'graphql', patterns: [/graphql/i] },
  ];

  let skillMatched = false;
  for (const { canonical, patterns } of skillPatterns) {
    for (const p of patterns) {
      if (p.test(text) && !consumedWords.has(canonical)) {
        filters.push(`j.skills LIKE '%${canonical}%'`);
        consumedWords.add(canonical);
        const koMatch = text.match(new RegExp(p.source.includes('가-힣') ? '[가-힣]+' : ''));
        skillMatched = true;
        break;
      }
    }
    if (skillMatched) break;
  }

  // === Keyword / title filter (fallback) ===
  const keywordMatch = text.match(/(백엔드|프론트엔드|프론트|데이터|AI|머신러닝|DevOps|devops|인프라|모바일|안드로이드|iOS|ios|풀스택|PM|기획|마케팅|디자인|QA|SRE|보안|블록체인|로스쿨)/);
  if (keywordMatch && !consumedWords.has(keywordMatch[1])) {
    filters.push(`j.title LIKE '%${keywordMatch[1]}%'`);
    consumedWords.add(keywordMatch[1]);
  }

  return { filters, order };
}

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
  { id: 'j1', source: 'wanted', title: '백엔드 엔지니어', company: '카카오', location: '서울 영등포구', work_type: 'hybrid', experience: '경력 5년 이상', salary: '8000~12000만원', salary_min: 8000, salary_max: 12000, deadline: nextWeek, skills: 'spring boot,java,kubernetes,aws' },
  { id: 'j2', source: 'wanted', title: '프론트엔드 개발자', company: '네이버', location: '경기 성남시', work_type: 'remote', experience: '경력 3년 이상', salary: '6000~9000만원', salary_min: 6000, salary_max: 9000, deadline: tomorrow, skills: 'react,typescript,next.js' },
  { id: 'j3', source: 'jobkorea', title: '데이터 엔지니어', company: '토스', location: '서울 강남구', work_type: 'onsite', experience: '경력 2년 이상', salary: '5000~8000만원', salary_min: 5000, salary_max: 8000, deadline: today, skills: 'python,kafka,redis,postgresql' },
  { id: 'j4', source: 'linkedin', title: 'DevOps Engineer', company: '라인', location: '서울 영등포구', work_type: 'hybrid', experience: '경력 무관', salary: null, salary_min: null, salary_max: null, deadline: null, skills: 'docker,kubernetes,terraform,aws' },
  { id: 'j5', source: 'wanted', title: 'iOS 개발자', company: '카카오뱅크', location: '서울 강남구', work_type: 'onsite', experience: '신입 가능', salary: '4000~6000만원', salary_min: 4000, salary_max: 6000, deadline: null, skills: 'swift,swiftui,kotlin' },
  { id: 'j6', source: 'jobkorea', title: '백엔드 시니어', company: '쿠팡', location: '서울 송파구', work_type: 'hybrid', experience: '경력 7년 이상', salary: '1억~1억5천', salary_min: 10000, salary_max: 15000, deadline: nextWeek, skills: 'java,spring boot,kafka,elasticsearch' },
];

const applications = [
  { id: 'a1', job_id: 'j1', status: 'interview', memo: '1차 면접 예정', updated_at: '2026-04-01' },
  { id: 'a2', job_id: 'j2', status: 'applied', memo: '', updated_at: '2026-03-30' },
  { id: 'a3', job_id: 'j3', status: 'interested', memo: '', updated_at: '2026-04-01' },
  { id: 'a4', job_id: 'j4', status: 'rejected', memo: '', updated_at: '2026-03-28' },
  { id: 'a5', job_id: 'j5', status: 'applying', memo: '', updated_at: '2026-04-02' },
  { id: 'a6', job_id: 'j6', status: 'applied', memo: '', updated_at: '2026-03-25' },
];

const matches = [
  { id: 'm1', job_id: 'j1', score: 87, skill_score: 85, location_score: 90 },
  { id: 'm2', job_id: 'j2', score: 72, skill_score: 70, location_score: 75 },
  { id: 'm3', job_id: 'j3', score: 65, skill_score: 60, location_score: 70 },
  { id: 'm4', job_id: 'j4', score: 45, skill_score: 40, location_score: 50 },
  { id: 'm5', job_id: 'j5', score: 30, skill_score: 25, location_score: 35 },
  { id: 'm6', job_id: 'j6', score: 91, skill_score: 90, location_score: 92 },
];

for (const j of jobs) {
  sqlRun(`INSERT INTO jobs (id, source, title, company, location, work_type, experience, salary, salary_min, salary_max, deadline, skills)
    VALUES ('${j.id}', '${j.source}', '${j.title}', '${j.company}', '${j.location}', '${j.work_type}', '${j.experience}', ${j.salary ? `'${j.salary}'` : 'NULL'}, ${j.salary_min || 'NULL'}, ${j.salary_max || 'NULL'}, ${j.deadline ? `'${j.deadline}'` : 'NULL'}, '${j.skills || ''}')`);
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
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '토스', `expected 토스, got ${rows[0].company}`);
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
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '토스', `expected 토스, got ${rows[0].company}`);
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
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '카카오뱅크', `expected 카카오뱅크, got ${rows[0].company}`);
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
  assert(rows.length === 1, `expected 1, got ${rows.length}`);
  assert(rows[0].company === '토스', `expected 토스, got ${rows[0].company}`);
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
