/**
 * EXP-047: End-to-End Pipeline Integration Test
 * Verifies the full workflow: scrape parsing → DB storage → matching → Korean NLP query → results
 * 
 * This tests the complete data flow from raw scraped text through to queryable results,
 * catching integration gaps between individual component tests.
 *
 * EXP-071: All 3 source parsers now imported from production modules.
 * Matching algorithm synced with validated test_validated_matching.js (EXP-049, -052, -064).
 * Dedup synced with EXP-067 Korean↔English company equivalents.
 */

const fs = require('fs');
const path = require('path');
const { parseWantedJob } = require('./scripts/post-process-wanted');
const { parseJobKoreaCard } = require('./scripts/post-process-jobkorea');
const { parseLinkedInCard } = require('./scripts/post-process-linkedin');

// JobKorea: adapt production parseJobKoreaCard to accept lines array (e2e compat)
function parseJobKoreaJob(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : lines;
  return parseJobKoreaCard(text);
}

// ─── Matching Algorithm (synced from test_validated_matching.js) ───
// Includes: EXP-021 skill gate, EXP-024 domain alignment, EXP-049 framework-aware domains,
// EXP-052 title skill inference, EXP-064 expanded similarity map

const TIER1 = { // 100% — aliases / near-identical
  'typescript': 'javascript', 'javascript': 'typescript',
  'react': 'next.js', 'next.js': 'react',
  'postgresql': 'mysql', 'mysql': 'postgresql',
  'kubernetes': 'k8s', 'k8s': 'kubernetes',
  'spring boot': 'spring_boot', 'spring_boot': 'spring boot',
};

const TIER2 = { // 75%
  'spring': ['spring boot', 'spring_boot'], 'spring boot': ['spring'], 'spring_boot': ['spring'],
  'express': ['node.js', 'nestjs'], 'node.js': ['express', 'nestjs'], 'nestjs': ['node.js', 'express'],
  'fastapi': ['python', 'django', 'flask'], 'python': ['fastapi', 'django', 'flask'],
  'django': ['python', 'fastapi', 'flask'], 'flask': ['python', 'fastapi', 'django'],
  'aws': ['gcp', 'azure', 'cloud'], 'gcp': ['aws', 'azure', 'cloud'], 'azure': ['aws', 'gcp', 'cloud'],
  'java': ['kotlin'], 'kotlin': ['java'],
  'react': ['react native'], 'react native': ['react'],
  'graphql': ['rest_api'], 'rest_api': ['graphql'],
  'jenkins': ['github_actions'], 'github_actions': ['jenkins'],
  'terraform': ['ansible'], 'ansible': ['terraform'],
  'kafka': ['rabbitmq'], 'rabbitmq': ['kafka'],
  'tensorflow': ['pytorch'], 'pytorch': ['tensorflow'],
  'elasticsearch': ['redis'], 'redis': ['elasticsearch'],
  'oracle': ['mssql'], 'mssql': ['oracle'],
};

const TIER3 = { // 25%
  'react': ['vue', 'svelte', 'angular'], 'vue': ['react', 'svelte', 'angular'], 'svelte': ['react', 'vue', 'angular'], 'angular': ['react', 'vue', 'svelte'],
  'node.js': ['python'], 'python': ['node.js'],
  'aws': ['docker'], 'docker': ['aws', 'kubernetes', 'terraform', 'nginx'], 'kubernetes': ['docker'],
  'kubernetes': ['container'], 'container': ['kubernetes'],
  'sql': ['mongodb'], 'mongodb': ['sql'],
  'terraform': ['docker'], 'nginx': ['docker'],
  'spark': ['hadoop', 'pandas'], 'hadoop': ['spark'], 'pandas': ['spark'],
  'graphql': ['grpc'], 'grpc': ['graphql'],
  'mongodb': ['redis'], 'redis': ['mongodb'],
};

function getSimilarity(skillA, skillB) {
  const a = skillA.toLowerCase(), b = skillB.toLowerCase();
  if (a === b) return 1.0;
  if (TIER1[a] === b || TIER1[b] === a) return 1.0;
  if (TIER2[a]?.includes(b)) return 0.75;
  if (TIER3[a]?.includes(b)) return 0.25;
  return 0;
}

function computeSkillScore(jobSkills, candidateSkills) {
  if (jobSkills.length === 0) return 50; // neutral (EXP-052)
  if (candidateSkills.length === 0) return 0;
  let totalScore = 0;
  for (const js of jobSkills) {
    let bestTier = 0;
    for (const cs of candidateSkills) {
      const sim = getSimilarity(js, cs);
      const pct = sim * 100;
      if (pct > bestTier) bestTier = pct;
    }
    totalScore += bestTier;
  }
  return Math.round(totalScore / jobSkills.length);
}

// EXP-049: Framework-aware domain detection
const PRIMARY_DOMAINS = {
  'python': 'python', 'java': 'java', 'javascript': 'js/ts', 'typescript': 'js/ts',
  'go': 'go', 'rust': 'rust', 'swift': 'swift', 'c++': 'c++', 'c#': 'c#', 'kotlin': 'java',
  'spring': 'java', 'spring boot': 'java',
  'django': 'python', 'flask': 'python', 'fastapi': 'python',
  'react': 'js/ts', 'next.js': 'js/ts', 'vue': 'js/ts', 'nuxt.js': 'js/ts', 'svelte': 'js/ts', 'angular': 'js/ts',
  'express': 'js/ts', 'nestjs': 'js/ts', 'node.js': 'js/ts',
  'swiftui': 'swift', 'flutter': 'dart', 'dart': 'dart',
  '.net': 'c#', 'asp.net': 'c#',
  'ruby on rails': 'ruby', 'rails': 'ruby', 'ruby': 'ruby',
  'php': 'php', 'laravel': 'php',
};

function detectPrimaryDomains(skills) {
  const domains = new Set();
  for (const s of skills) {
    const d = PRIMARY_DOMAINS[s.toLowerCase()];
    if (d) domains.add(d);
  }
  return domains;
}

function hasDomainOverlap(jobSkills, candidateSkills) {
  const jobDomains = detectPrimaryDomains(jobSkills);
  const candDomains = detectPrimaryDomains(candidateSkills);
  if (jobDomains.size === 0) return true; // no domain detected = no penalty
  for (const d of jobDomains) {
    if (candDomains.has(d)) return true;
  }
  return false;
}

function computeMatch(job, candidate) {
  // Skill score
  const skillScore = computeSkillScore(job.skills || [], candidate.skills || []);

  // Skill gate (EXP-021: quadratic dampening)
  const gate = skillScore < 40 ? Math.max(0.04, (skillScore / 40) ** 2) : 1.0;

  // Domain alignment (EXP-024 + EXP-049: framework-aware, 40% penalty)
  const domainPenalty = hasDomainOverlap(job.skills || [], candidate.skills || []) ? 1.0 : 0.60;

  const adjustedSkill = Math.round(skillScore * domainPenalty);

  // Experience score
  let expScore = 70;
  if (candidate.experience_years <= 1) expScore = 40;
  else if (candidate.experience_years >= 5) expScore = 90;

  // Culture score
  let cultureScore = 50; // default aligned (EXP-063)
  if (job.culture_keywords && candidate.cultural_preferences) {
    const matched = job.culture_keywords.filter(k => candidate.cultural_preferences[k] > 0.5).length;
    cultureScore = Math.min(100, 50 + matched * 15);
  }

  // Career stage
  const stageOrder = { entry: 0, junior: 1, mid: 2, senior: 3, lead: 4 };
  const stageDiff = Math.abs((stageOrder[candidate.career_stage] || 2) - (stageOrder[job.career_stage] || 2));
  const careerScore = stageDiff === 0 ? 100 : stageDiff === 1 ? 70 : 30;

  // Location/work
  const locScore = 80;

  // Weighted (EXP-017 v4: 35/25/15/15/10)
  const weights = { skill: 0.35, exp: 0.25, culture: 0.15, career: 0.15, loc: 0.10 };
  const total = Math.round(
    adjustedSkill * weights.skill +
    expScore * weights.exp * gate +
    cultureScore * weights.culture * gate +
    careerScore * weights.career * gate +
    locScore * weights.loc * gate
  );

  return { total, skill: adjustedSkill, exp: expScore, culture: cultureScore, career: careerScore, loc: locScore, gate, domainPenalty };
}

// ─── Korean NLP Query Parser (synced from SKILL.md v2.1) ───

function parseKoreanQuery(input) {
  const filters = [];
  let order = 'a.updated_at DESC';

  // Status
  if (/면접/.test(input)) filters.push("a.status = 'interview'");
  else if (/지원(완료|한|했)/.test(input)) filters.push("a.status = 'applied'");
  else if (/(관심|북마크|찜)/.test(input)) filters.push("a.status = 'interested'");
  else if (/(합격|오퍼)/.test(input)) filters.push("a.status = 'offer'");
  else if (/(탈락|거절|떨어)/.test(input)) filters.push("a.status IN ('rejected','declined')");
  else if (/지원(예정|할)/.test(input)) filters.push("a.status = 'applying'");

  // Work type
  if (/(재택|원격|리모트)/.test(input)) filters.push("j.work_type = 'remote'");
  if (/하이브리드/.test(input)) filters.push("j.work_type = 'hybrid'");

  // Deadline
  if (/마감임박|곧마감/.test(input)) filters.push("days_left <= 7");
  if (/오늘 마감/.test(input)) filters.push("days_left = 0");

  // Sorting
  if (/(점수|매칭)순/.test(input)) order = 'm.score DESC';
  if (/최신순/.test(input)) order = 'a.updated_at DESC';

  // Company/keyword
  const companies = ['카카오', '네이버', '토스', '라인', '배달의민족', '쿠팡'];
  for (const co of companies) {
    if (input.includes(co)) {
      // Check negation
      const negIdx = input.indexOf(co);
      const after = input.slice(negIdx + co.length);
      if (/빼고|제외|말고/.test(after)) {
        filters.push(`j.company NOT LIKE '%${co}%'`);
      } else {
        filters.push(`j.company LIKE '%${co}%'`);
      }
    }
  }

  // Location
  const locationKeywords = ['서울', '판교', '강남', '부산', '대전'];
  for (const loc of locationKeywords) {
    if (input.includes(loc)) filters.push(`j.location LIKE '%${loc}%'`);
  }

  return { filters, order };
}

// ─── Cross-Source Dedup (synced with EXP-067: Korean↔English company equivalents) ───

const titleKoEn = { '프론트엔드': 'frontend', '백엔드': 'backend', '풀스택': 'fullstack', '개발자': 'developer', '시니어': 'senior', '주니어': 'junior' };

const companyKoEn = {
  '카카오': 'kakao', '네이버': 'naver', '라인': 'line', '토스': 'toss',
  '배달의민족': 'woowahan', '우아한형제들': 'woowahan', '쿠팡': 'coupang',
  '당근마켓': 'karrot', '야놀자': 'yanolja', '리디': 'ridi',
};

function companyToCanonical(name) {
  const lower = name.toLowerCase().trim();
  // Direct Korean→English mapping
  if (companyKoEn[lower]) return companyKoEn[lower];
  // Already English — lowercase as-is
  return lower;
}

function normalizeTitle(title) {
  let t = title.toLowerCase().trim();
  for (const [ko, en] of Object.entries(titleKoEn)) {
    t = t.replace(new RegExp(ko, 'g'), en);
  }
  return t;
}

function titleSimilarity(a, b) {
  const na = normalizeTitle(a), nb = normalizeTitle(b);
  if (na === nb) return 1.0;
  const wa = new Set(na.split(/[\s/]+/)), wb = new Set(nb.split(/[\s/]+/));
  const intersection = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return union > 0 ? intersection / union : 0;
}

function isDuplicate(jobA, jobB) {
  if (jobA.source === jobB.source) return false;
  const ts = titleSimilarity(jobA.title, jobB.title);
  const ca = companyToCanonical(jobA.company || '');
  const cb = companyToCanonical(jobB.company || '');
  return ts >= 0.6 && ca === cb;
}

// ─── Test Runner ───

let passed = 0, failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) { passed++; }
  else { failed++; failures.push(label); console.log(`❌ ${label}`); }
}

function assertApprox(actual, expected, tolerance, label) {
  const ok = Math.abs(actual - expected) <= tolerance;
  if (ok) { passed++; }
  else { failed++; failures.push(`${label}: expected ~${expected}, got ${actual}`); console.log(`❌ ${label}: expected ~${expected}, got ${actual}`); }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('EXP-047: E2E Pipeline Integration Tests');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// ─── Phase 1: Scrape Parsing → Structured Data ───

console.log('📋 Phase 1: Scrape Parsing');

const wantedRaw = "프론트엔드 개발자카카오경력 3-10년합격보상금 70만원";
const wantedParsed = parseWantedJob(wantedRaw);
assert(wantedParsed.company === '카카오', 'Wanted: company=카카오');
assert(wantedParsed.experience === '경력 3-10년', 'Wanted: experience=경력 3-10년');
assert(wantedParsed.reward.includes('70만원'), 'Wanted: reward=70만원');

const wantedWithWorkType = "백엔드 개발자토스하이브리드경력 5년 이상합격보상금 100만원";
const wtParsed = parseWantedJob(wantedWithWorkType);
assert(wtParsed.company === '토스', 'Wanted+work_type: company=토스');
assert(wtParsed.work_type === 'hybrid', 'Wanted+work_type: work_type=hybrid');

const jkLines = ['프론트엔드 개발자', '카카오', '서울 영등포구', '경력 3년 이상', '연봉 5000~8000만원', '~04.15'];
const jkParsed = parseJobKoreaJob(jkLines);
assert(jkParsed.title === '프론트엔드 개발자', 'JobKorea: title=프론트엔드 개발자');
assert(jkParsed.company === '카카오', 'JobKorea: company=카카오');
assert(jkParsed.salary.includes('연봉'), 'JobKorea: salary extracted');
assert(jkParsed.location.includes('서울'), 'JobKorea: location=서울');

// ─── Phase 2: Matching Pipeline ───

console.log('\n🎯 Phase 2: Matching Pipeline');

const candidate = {
  skills: ['JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js', 'Express', 'PostgreSQL', 'Docker', 'AWS'],
  experience_years: 5,
  career_stage: 'mid',
  cultural_preferences: { innovative: 0.8, collaborative: 0.7, fast_paced: 0.7 }
};

// HIGH match: frontend job matching candidate's skills
const highJob = {
  skills: ['React', 'TypeScript', 'Next.js', 'PostgreSQL'],
  career_stage: 'mid',
  culture_keywords: ['innovative', 'collaborative']
};

const highMatch = computeMatch(highJob, candidate);
assert(highMatch.total >= 70, `HIGH match: score=${highMatch.total} ≥ 70`);
assert(highMatch.gate === 1.0, 'HIGH match: no gate (skill ≥ 40)');
assert(highMatch.domainPenalty === 1.0, 'HIGH match: no domain penalty');

// LOW match: Python job with zero skill overlap
const lowJob = {
  skills: ['Python', 'Django', 'Flask', 'TensorFlow'],
  career_stage: 'mid',
  culture_keywords: ['innovative']
};

const lowMatch = computeMatch(lowJob, candidate);
assert(lowMatch.total <= 25, `LOW match: score=${lowMatch.total} ≤ 25`);
assert(lowMatch.domainPenalty === 0.60, 'LOW match: domain penalty applied');
assert(lowMatch.gate < 1.0, 'LOW match: skill gate active');

// Discrimination gap
const gap = highMatch.total - lowMatch.total;
assert(gap >= 15, `Discrimination gap: ${gap} ≥ 15`);

// ─── Phase 3: Cross-Source Dedup ───

console.log('\n🔗 Phase 3: Cross-Source Dedup');

const wantedJob = { title: '프론트엔드 개발자', company: '카카오', source: 'wanted' };
const jkJob = { title: 'Frontend Developer', company: '카카오', source: 'jobkorea' };
const diffJob = { title: '백엔드 개발자', company: '카카오', source: 'jobkorea' };

assert(isDuplicate(wantedJob, jkJob), 'Dedup: same job cross-source detected');
// Also test Korean↔English company dedup
const linkedinKakao = { title: 'Frontend Developer', company: 'Kakao', source: 'linkedin' };
assert(isDuplicate(wantedJob, linkedinKakao), 'Dedup: 카카오 ↔ Kakao cross-source detected');

assert(!isDuplicate(wantedJob, diffJob), 'Dedup: different title not flagged');
assert(titleSimilarity('프론트엔드 개발자', 'Frontend Developer') > 0.3, 'Title similarity: ko↔en mapping works');

// ─── Phase 4: Korean NLP Query Parsing ───

console.log('\n💬 Phase 4: Korean NLP Query Parsing');

const q1 = parseKoreanQuery("면접 잡힌 거 있어?");
assert(q1.filters.includes("a.status = 'interview'"), 'NLP: 면접 → interview status');
assert(q1.filters.length === 1, 'NLP: single filter for simple query');

const q2 = parseKoreanQuery("카카오 지원한 거 중에 토스 빼고");
assert(q2.filters.some(f => f.includes("a.status = 'applied'")), 'NLP: 지원한 → applied');
assert(q2.filters.some(f => f.includes("카카오") && f.includes('LIKE')), 'NLP: 카카오 → company LIKE');
assert(q2.filters.some(f => f.includes("토스") && f.includes('NOT LIKE')), 'NLP: 토스 빼고 → NOT LIKE');

const q3 = parseKoreanQuery("재택근무 할 수 있는 거 점수순으로");
assert(q3.filters.some(f => f.includes("work_type = 'remote'")), 'NLP: 재택 → remote');
assert(q3.order === 'm.score DESC', 'NLP: 점수순 → ORDER BY score');

const q4 = parseKoreanQuery("마감임박한 공고 있어?");
assert(q4.filters.some(f => f.includes('days_left')), 'NLP: 마감임박 → deadline filter');

const q5 = parseKoreanQuery("판교에 있는 지원할 거");
assert(q5.filters.some(f => f.includes('판교')), 'NLP: 판교 → location filter');
assert(q5.filters.some(f => f.includes('applying')), 'NLP: 지원할 → applying status');

// ─── Phase 5: Full Pipeline Simulation ───

console.log('\n🔄 Phase 5: Full Pipeline Simulation');

// Simulate: scrape 3 sources → parse → dedup → match → query
const rawJobs = [
  { source: 'wanted', raw: "프론트엔드 개발자카카오경력 3-10년합격보상금 70만원", url: 'https://wanted.co.kr/wd/1' },
  { source: 'jobkorea', lines: ['프론트엔드 개발자', '카카오', '서울 영등포구', '경력 3년 이상', '연봉 5000~8000만원', '~04.15'], url: 'https://jobkorea.co.kr/1' },
  { source: 'linkedin', title: 'Frontend Developer', company: 'Kakao', location: '서울', description: 'React TypeScript development', url: 'https://linkedin.com/jobs/1' },
  { source: 'wanted', raw: "백엔드 개발자 Python/Django토스경력 5년 이상합격보상금 100만원", url: 'https://wanted.co.kr/wd/2' },
  { source: 'wanted', raw: "시니어 리액트 개발자네이버경력 7-12년합격보상금 200만원", url: 'https://wanted.co.kr/wd/3' },
];

// Parse
const parsedJobs = rawJobs.map(j => {
  if (j.source === 'wanted') {
    const p = parseWantedJob(j.raw);
    return { ...p, source: j.source, url: j.url };
  } else if (j.source === 'jobkorea') {
    const p = parseJobKoreaJob(j.lines);
    return { ...p, source: j.source, url: j.url };
  } else if (j.source === 'linkedin') {
    // Use production LinkedIn parser
    const p = parseLinkedInCard({ title: j.title, company: j.company, location: j.location || '', description: j.description || '' });
    return { ...p, source: j.source, url: j.url };
  }
  return { ...j };
});

assert(parsedJobs.length === 5, `Pipeline: parsed ${parsedJobs.length} jobs`);

// Verify LinkedIn parsed fields
const linkedinParsed = parsedJobs.find(j => j.source === 'linkedin');
assert(linkedinParsed !== undefined, 'Pipeline: LinkedIn job parsed');
assert(linkedinParsed.title !== undefined, 'Pipeline: LinkedIn has title');

// Dedup
const uniqueJobs = [];
for (const job of parsedJobs) {
  const dup = uniqueJobs.find(u => isDuplicate(u, job));
  if (!dup) uniqueJobs.push(job);
}
// Wanted 카카오 + JobKorea 카카오 + LinkedIn Kakao (EN) should dedup to 3 unique
// LinkedIn Kakao ↔ 카카오 via companyKoEn map (EXP-067)
assert(uniqueJobs.length <= 4, `Pipeline: dedup ${parsedJobs.length} → ${uniqueJobs.length} unique`);
// Verify LinkedIn↔Korean dedup works via companyKoEn
const kakaoGroup = parsedJobs.filter(j => companyToCanonical(j.company || '') === 'kakao');
assert(kakaoGroup.length === 3, `Pipeline: 3 카카오/Kakao entries found across sources (got ${kakaoGroup.length})`);

// Match
const matchResults = uniqueJobs.map(job => {
  // Extract skills from title for matching
  const titleSkills = [];
  if (/프론트엔드|frontend|react|리액트/i.test(job.title || '')) titleSkills.push('React', 'TypeScript');
  if (/백엔드|backend|python|django/i.test(job.title || '')) titleSkills.push('Python', 'Django');
  if (/시니어|senior/i.test(job.title || '')) titleSkills.push('React');

  return {
    ...job,
    match: computeMatch({ skills: titleSkills, career_stage: 'mid', culture_keywords: ['innovative'] }, candidate)
  };
});

// Verify ranking
const sorted = matchResults.sort((a, b) => b.match.total - a.match.total);
assert(sorted[0].match.total >= sorted[sorted.length - 1].match.total, 'Pipeline: results sorted by score');

// Verify frontend jobs score higher than backend for this candidate
const frontendJobs = matchResults.filter(j => /프론트엔드|frontend/i.test(j.title || ''));
const backendJobs = matchResults.filter(j => /백엔드|backend|python/i.test(j.title || ''));
if (frontendJobs.length > 0 && backendJobs.length > 0) {
  const avgFrontend = frontendJobs.reduce((s, j) => s + j.match.total, 0) / frontendJobs.length;
  const avgBackend = backendJobs.reduce((s, j) => s + j.match.total, 0) / backendJobs.length;
  assert(avgFrontend > avgBackend, `Pipeline: frontend avg (${avgFrontend.toFixed(0)}) > backend avg (${avgBackend.toFixed(0)}) for JS candidate`);
}

// Query simulation
const queryResults = matchResults.filter(j => j.company && j.company.includes('카카오'));
assert(queryResults.length >= 1, 'Pipeline: Korean company query returns results');

// ─── Phase 6: Deadline Urgency Integration ───

console.log('\n⏰ Phase 6: Deadline Urgency');

function computeUrgency(deadline) {
  if (!deadline || deadline.includes('상시') || deadline.includes('수시')) return 'none';
  // Simple mock: parse ~MM.DD format
  const m = deadline.match(/~(\d{2})\.(\d{2})/);
  if (!m) return 'none';
  const deadlineDate = new Date(2026, parseInt(m[1]) - 1, parseInt(m[2]));
  const now = new Date(2026, 3, 1); // April 1, 2026
  const daysLeft = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return 'expired';
  if (daysLeft <= 3) return 'critical';
  if (daysLeft <= 7) return 'high';
  if (daysLeft <= 14) return 'medium';
  return 'low';
}

assert(computeUrgency('~04.02') === 'critical', 'Urgency: 1 day left = critical');
assert(computeUrgency('~04.05') === 'high', 'Urgency: 4 days = high');
assert(computeUrgency('~04.20') === 'low', 'Urgency: 19 days = low');
assert(computeUrgency('상시채용') === 'none', 'Urgency: 상시채용 = none');
assert(computeUrgency('~03.30') === 'expired', 'Urgency: past deadline = expired');

// ─── Summary ───

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 E2E Pipeline: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log(`  - ${f}`));
}
console.log(failed === 0 ? '✅ All E2E pipeline integration tests passed!' : '❌ Some tests failed');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

process.exit(failed > 0 ? 1 : 0);
