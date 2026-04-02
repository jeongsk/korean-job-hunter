#!/usr/bin/env node
/**
 * EXP-070: LinkedIn Post-Processor Tests
 * Tests parseLinkedInCard enrichment: experience level, skills, salary, work_type
 */

const assert = require('assert');
const {
  parseLinkedInCard, normalizeLocation, extractExperienceLevel,
  inferSkillsFromText, extractSalary, detectWorkType
} = require('./scripts/post-process-linkedin');

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`✅ ${name}`); }
  catch(e) { failed++; console.log(`❌ ${name}: ${e.message}`); }
}

// === Experience Level ===
test('EXP-LI-001: senior title', () => {
  const r = extractExperienceLevel('Senior Frontend Engineer');
  assert.strictEqual(r.level, 'senior');
  assert.strictEqual(r.minYears, 5);
});

test('EXP-LI-002: junior title', () => {
  const r = extractExperienceLevel('Junior Developer');
  assert.strictEqual(r.level, 'junior');
  assert.strictEqual(r.minYears, 0);
});

test('EXP-LI-003: lead title', () => {
  const r = extractExperienceLevel('Lead Software Engineer');
  assert.strictEqual(r.level, 'senior');
});

test('EXP-LI-004: no seniority', () => {
  const r = extractExperienceLevel('Frontend Developer');
  assert.strictEqual(r.level, '');
});

test('EXP-LI-005: Korean 신입', () => {
  const r = extractExperienceLevel('프론트엔드 개발자 (신입)');
  assert.strictEqual(r.level, 'junior');
});

test('EXP-LI-006: intern', () => {
  const r = extractExperienceLevel('Software Engineering Intern');
  assert.strictEqual(r.level, 'intern');
});

test('EXP-LI-007: mid-senior', () => {
  const r = extractExperienceLevel('Product Designer (Mid-Senior)');
  assert.strictEqual(r.level, 'mid');
});

test('EXP-LI-008: principal', () => {
  const r = extractExperienceLevel('Principal Engineer');
  assert.strictEqual(r.level, 'senior');
});

test('EXP-LI-009: Korean N년차 in description', () => {
  const r = extractExperienceLevel('개발자', '5년차 이상');
  assert.strictEqual(r.level, 'mid');
  assert.strictEqual(r.minYears, 5);
});

// === Skill Inference ===
test('SKILL-LI-001: React Native from title', () => {
  const skills = inferSkillsFromText('Senior Mobile Developer (React Native)');
  assert.ok(skills.includes('react native'));
});

test('SKILL-LI-002: multiple skills', () => {
  const skills = inferSkillsFromText('Full Stack Developer', 'Node.js, Python, AWS, Docker');
  assert.ok(skills.includes('nodejs'));
  assert.ok(skills.includes('python'));
  assert.ok(skills.includes('aws'));
  assert.ok(skills.includes('docker'));
});

test('SKILL-LI-003: no skills', () => {
  const skills = inferSkillsFromText('Product Manager');
  assert.strictEqual(skills.length, 0);
});

test('SKILL-LI-004: k8s normalizes to kubernetes', () => {
  const skills = inferSkillsFromText('DevOps Engineer (k8s, Docker)');
  assert.ok(skills.includes('kubernetes'));
  assert.ok(!skills.includes('k8s'));
});

test('SKILL-LI-005: golang normalizes to go', () => {
  const skills = inferSkillsFromText('Backend Developer (Golang)');
  assert.ok(skills.includes('go'));
});

test('SKILL-LI-006: Spring Boot detected', () => {
  const skills = inferSkillsFromText('Backend Developer', 'Spring Boot, JPA');
  assert.ok(skills.includes('spring boot'));
});

test('SKILL-LI-007: TypeScript + Next.js', () => {
  const skills = inferSkillsFromText('Frontend Developer (TypeScript, Next.js)');
  assert.ok(skills.includes('typescript'));
  assert.ok(skills.includes('nextjs'));
});

// === Salary Extraction ===
test('SAL-LI-001: annual range in description', () => {
  const r = extractSalary('연봉 5000~8000만원 협상 가능');
  assert.strictEqual(r.salary_min, 5000);
  assert.strictEqual(r.salary_max, 8000);
});

test('SAL-LI-002: 면접후결정', () => {
  const r = extractSalary('면접후결정');
  assert.strictEqual(r.salary, '면접후결정');
});

test('SAL-LI-003: no salary info', () => {
  const r = extractSalary('React, Node.js experience required');
  assert.strictEqual(r.salary, '');
  assert.strictEqual(r.salary_min, null);
});

test('SAL-LI-004: 억 range', () => {
  const r = extractSalary('연봉 1~2억');
  assert.strictEqual(r.salary_min, 10000);
  assert.strictEqual(r.salary_max, 20000);
});

test('SAL-LI-005: single annual value', () => {
  const r = extractSalary('연봉 6000만원 이상');
  assert.strictEqual(r.salary_min, 6000);
});

// === Work Type ===
test('WT-LI-001: remote detected', () => {
  assert.strictEqual(detectWorkType('Fully Remote Position'), 'remote');
});

test('WT-LI-002: hybrid detected', () => {
  assert.strictEqual(detectWorkType('Hybrid work model, 3 days office'), 'hybrid');
});

test('WT-LI-003: onsite default', () => {
  assert.strictEqual(detectWorkType('Frontend Developer'), 'onsite');
});

test('WT-LI-004: Korean 재택근무', () => {
  assert.strictEqual(detectWorkType('재택근무 가능'), 'remote');
});

// === Full parseLinkedInCard ===
test('FULL-LI-001: basic card', () => {
  const r = parseLinkedInCard({
    title: 'Frontend Developer',
    company: 'Toss',
    location: '서울, 대한민국',
    link: 'https://kr.linkedin.com/jobs/view/123?refId=abc',
    description: 'React, TypeScript. 연봉 5000~8000만원'
  });
  assert.strictEqual(r.company, 'Toss');
  assert.strictEqual(r.location, '서울');
  assert.strictEqual(r.source, 'linkedin');
  assert.ok(r.skills.includes('react'));
  assert.ok(r.skills.includes('typescript'));
  assert.strictEqual(r.salary_min, 5000);
  assert.strictEqual(r.salary_max, 8000);
  assert.ok(!r.link.includes('refId='));
});

test('FULL-LI-002: senior with skills', () => {
  const r = parseLinkedInCard({
    title: 'Senior Backend Engineer (Python/Django)',
    company: '카카오',
    location: 'Pangyo, Gyeonggi-do, South Korea',
    link: 'https://linkedin.com/jobs/view/456'
  });
  assert.strictEqual(r.experience, 'senior');
  assert.strictEqual(r.experience_min_years, 5);
  assert.ok(r.location.includes('판교'));
  assert.ok(r.skills.includes('python'));
  assert.ok(r.skills.includes('django'));
});

test('FULL-LI-003: minimal card', () => {
  const r = parseLinkedInCard({
    title: 'Data Analyst',
    company: 'Some Startup',
    location: 'Seoul, South Korea',
    link: 'https://linkedin.com/jobs/view/789'
  });
  assert.strictEqual(r.title, 'Data Analyst');
  assert.strictEqual(r.experience, '');
  assert.strictEqual(r.source, 'linkedin');
  assert.strictEqual(r.work_type, 'onsite');
});

test('FULL-LI-004: JSON string input', () => {
  const input = JSON.stringify({ title: 'Dev', company: 'Co', location: 'Seoul', link: '#' });
  const r = parseLinkedInCard(input);
  assert.strictEqual(r.title, 'Dev');
  assert.strictEqual(r.location, '서울');
});

test('FULL-LI-005: tracking params stripped', () => {
  const r = parseLinkedInCard({
    title: 'Dev', company: 'Co', location: '',
    link: 'https://kr.linkedin.com/jobs/view/dev-at-co-123?position=1&pageNum=0&refId=abc'
  });
  assert.strictEqual(r.link, 'https://kr.linkedin.com/jobs/view/dev-at-co-123');
});

test('FULL-LI-006: 원격근무 work type', () => {
  const r = parseLinkedInCard({
    title: 'Full Stack Developer (원격근무)',
    company: 'RemoteCo',
    location: '대한민국',
    link: '#'
  });
  assert.strictEqual(r.work_type, 'remote');
  assert.strictEqual(r.location, '');
});

test('FULL-LI-007: Spring Boot in description', () => {
  const r = parseLinkedInCard({
    title: 'Backend Developer',
    company: 'Naver',
    location: 'Gyeonggi-do',
    link: '#',
    description: 'Spring Boot, MySQL, Kubernetes 경험자 우대'
  });
  assert.ok(r.skills.includes('spring boot'));
  assert.ok(r.skills.includes('kubernetes'));
});

// ── Summary ──
console.log('\n' + '='.repeat(50));
console.log(`LinkedIn Post-Processor Tests: ${passed}/${passed + failed} passed`);
if (failed > 0) { console.log(`❌ ${failed} FAILED`); process.exit(1); }
else console.log('✅ ALL PASS');
