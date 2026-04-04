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
  assert.strictEqual(r.level, 'lead');
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
  assert.strictEqual(r.level, 'lead');
});

test('EXP-LI-009: staff title', () => {
  const r = extractExperienceLevel('Staff Software Engineer');
  assert.strictEqual(r.level, 'lead');
});

test('EXP-LI-010: tech lead title', () => {
  const r = extractExperienceLevel('Tech Lead - Backend');
  assert.strictEqual(r.level, 'lead');
});

test('EXP-LI-011: senior still senior', () => {
  const r = extractExperienceLevel('Senior Backend Developer');
  assert.strictEqual(r.level, 'senior');
});

test('EXP-LI-012: sr. abbreviation', () => {
  const r = extractExperienceLevel('Sr. Engineer');
  assert.strictEqual(r.level, 'senior');
});

test('EXP-LI-013: leading not lead', () => {
  const r = extractExperienceLevel('Leading Product Designer');
  assert.strictEqual(r.level, '');
});

test('EXP-LI-014: career_stage for lead via parseLinkedInCard', () => {
  const r = parseLinkedInCard({title: 'Lead Developer', company: 'Test', location: 'Seoul', link: 'https://example.com'});
  assert.strictEqual(r.career_stage, 'lead');
});

test('EXP-LI-015: career_stage for staff via parseLinkedInCard', () => {
  const r = parseLinkedInCard({title: 'Staff Engineer', company: 'Test', location: 'Seoul', link: 'https://example.com'});
  assert.strictEqual(r.career_stage, 'lead');
});

test('EXP-LI-016: career_stage for senior stays senior', () => {
  const r = parseLinkedInCard({title: 'Senior Developer', company: 'Test', location: 'Seoul', link: 'https://example.com'});
  assert.strictEqual(r.career_stage, 'senior');
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
  assert.ok(skills.includes('node.js') || skills.includes('nodejs'));
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
  assert.ok(skills.includes('next.js') || skills.includes('nextjs'));
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

// === EXP-114: LinkedIn skill extraction via shared module ===
test('EXP114-001: parseLinkedInCard uses shared skill-inference for Snowflake/Airflow/dbt', () => {
  const r = parseLinkedInCard({ title: 'Senior Data Engineer', company: 'TestCo', description: 'Snowflake, Airflow, dbt, BigQuery' });
  assert.ok(r.skills.includes('snowflake'), 'should detect Snowflake');
  assert.ok(r.skills.includes('airflow'), 'should detect Airflow');
  assert.ok(r.skills.includes('dbt'), 'should detect dbt');
  assert.ok(r.skills.includes('bigquery'), 'should detect BigQuery');
});

test('EXP114-002: LinkedIn detects PostgreSQL, Redis, Linux', () => {
  const r = parseLinkedInCard({ title: 'Backend Developer', company: 'TestCo', description: 'PostgreSQL, Redis, Linux, Docker' });
  assert.ok(r.skills.includes('postgresql'), 'should detect PostgreSQL');
  assert.ok(r.skills.includes('redis'), 'should detect Redis');
  assert.ok(r.skills.includes('linux'), 'should detect Linux');
  assert.ok(r.skills.includes('docker'), 'should detect Docker');
});

test('EXP114-003: LinkedIn detects modern web tools (Tailwind, Vite, Pinia)', () => {
  const r = parseLinkedInCard({ title: 'Frontend Engineer', company: 'TestCo', description: 'Vue.js, Pinia, Tailwind CSS, Vite' });
  assert.ok(r.skills.includes('tailwind'), 'should detect Tailwind');
  assert.ok(r.skills.includes('vite'), 'should detect Vite');
  assert.ok(r.skills.includes('pinia'), 'should detect Pinia');
  assert.ok(r.skills.includes('vue'), 'should detect Vue');
});

test('EXP114-004: LinkedIn detects ML ecosystem (PyTorch, HuggingFace, LangChain, RAG)', () => {
  const r = parseLinkedInCard({ title: 'ML Engineer', company: 'TestCo', description: 'PyTorch, Hugging Face, LangChain, RAG' });
  assert.ok(r.skills.includes('pytorch'), 'should detect PyTorch');
  assert.ok(r.skills.includes('huggingface'), 'should detect HuggingFace');
  assert.ok(r.skills.includes('langchain'), 'should detect LangChain');
  assert.ok(r.skills.includes('rag'), 'should detect RAG');
});

test('EXP114-005: LinkedIn detects monitoring tools (Prometheus, Grafana, Sentry, CI/CD)', () => {
  const r = parseLinkedInCard({ title: 'DevOps Engineer', company: 'TestCo', description: 'CI/CD, Prometheus, Grafana, Sentry' });
  assert.ok(r.skills.includes('prometheus'), 'should detect Prometheus');
  assert.ok(r.skills.includes('grafana'), 'should detect Grafana');
  assert.ok(r.skills.includes('sentry'), 'should detect Sentry');
  assert.ok(r.skills.includes('ci/cd'), 'should detect CI/CD');
});

test('EXP114-006: LinkedIn detects modern stack (Deno, Prisma, Supabase, TRPC)', () => {
  const r = parseLinkedInCard({ title: 'Full Stack Developer', company: 'TestCo', description: 'Deno, Prisma, Supabase, TRPC' });
  assert.ok(r.skills.includes('deno'), 'should detect Deno');
  assert.ok(r.skills.includes('prisma'), 'should detect Prisma');
  assert.ok(r.skills.includes('supabase'), 'should detect Supabase');
  assert.ok(r.skills.includes('trpc'), 'should detect TRPC');
});

test('EXP114-007: LinkedIn detects Korean equivalents from description', () => {
  const r = parseLinkedInCard({ title: '머신러닝 엔지니어', company: '테스트', description: '텐서플로우, 파이토치 경험' });
  assert.ok(r.skills.includes('machine learning'), 'should detect 머신러닝');
  assert.ok(r.skills.includes('tensorflow'), 'should detect 텐서플로우');
  assert.ok(r.skills.includes('pytorch'), 'should detect 파이토치');
});

test('EXP114-008: LinkedIn detects NLP/computer vision/fine-tuning', () => {
  const r = parseLinkedInCard({ title: 'Data Scientist', company: 'TestCo', description: 'TensorFlow, Computer Vision, NLP, Fine-tuning' });
  assert.ok(r.skills.includes('computer vision'), 'should detect Computer Vision');
  assert.ok(r.skills.includes('fine-tuning'), 'should detect Fine-tuning');
  assert.ok(r.skills.includes('tensorflow'), 'should detect TensorFlow');
  assert.ok(r.skills.includes('nlp'), 'should detect NLP');
});

// ── Summary ──
console.log('\n' + '='.repeat(50));
console.log(`LinkedIn Post-Processor Tests: ${passed}/${passed + failed} passed`);
if (failed > 0) { console.log(`❌ ${failed} FAILED`); process.exit(1); }
else console.log('✅ ALL PASS');
