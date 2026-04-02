// EXP-075: Cross-source culture keyword parity tests
// Verifies that culture_keywords and work_type are extracted from all 3 sources
const assert = require('assert');
const { parseJobKoreaCard } = require('./scripts/post-process-jobkorea');
const { parseLinkedInCard } = require('./scripts/post-process-linkedin');
const { parseWantedJob, extractCultureKeywords } = require('./scripts/post-process-wanted');

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

// === extractCultureKeywords shared function ===
test('extractCultureKeywords detects 혁신', () => {
  const kws = extractCultureKeywords('혁신적인 제품을 만듭니다');
  assert(kws.includes('innovative'));
});

test('extractCultureKeywords detects 워라밸', () => {
  const kws = extractCultureKeywords('워라밸 좋은 회사');
  assert(kws.includes('work_life_balance'));
});

test('extractCultureKeywords detects 협업', () => {
  const kws = extractCultureKeywords('팀워크와 협업을 중시합니다');
  assert(kws.includes('collaborative'));
});

test('extractCultureKeywords returns empty for no match', () => {
  const kws = extractCultureKeywords('정상적인 회사');
  assert.deepStrictEqual(kws, []);
});

test('extractCultureKeywords detects multiple', () => {
  const kws = extractCultureKeywords('혁신과 성장, 워라밸을 추구합니다');
  assert(kws.includes('innovative'));
  assert(kws.includes('learning_focused'));
  assert(kws.includes('work_life_balance'));
});

// === JobKorea culture_keywords ===
test('JobKorea: culture_keywords extracted from card text', () => {
  const raw = `프론트엔드 개발자
㈜카카오
서울
경력 3~5년
연봉 5000~8000만원
혁신적이고 자율적인 문화
03/31 마감`;
  const job = parseJobKoreaCard(raw);
  assert(job.culture_keywords.includes('innovative'));
  assert(job.culture_keywords.includes('autonomous'));
});

test('JobKorea: culture_keywords empty when no culture signals', () => {
  const raw = `백엔드 개발자
㈜테스트
서울
경력 무관
면접후결정`;
  const job = parseJobKoreaCard(raw);
  assert.deepStrictEqual(job.culture_keywords, []);
});

test('JobKorea: work_type detected as hybrid', () => {
  const raw = `개발자
㈜회사
서울
경력 3년
하이브리드 근무`;
  const job = parseJobKoreaCard(raw);
  assert.strictEqual(job.work_type, 'hybrid');
});

test('JobKorea: work_type defaults to onsite', () => {
  const raw = `개발자
㈜회사
서울
신입`;
  const job = parseJobKoreaCard(raw);
  assert.strictEqual(job.work_type, 'onsite');
});

test('JobKorea: work_type remote', () => {
  const raw = `개발자
㈜회사
서울
경력 5년
전면재택`;
  const job = parseJobKoreaCard(raw);
  assert.strictEqual(job.work_type, 'remote');
});

// === LinkedIn culture_keywords ===
test('LinkedIn: culture_keywords extracted from title+description', () => {
  const job = parseLinkedInCard({
    title: 'Senior Software Engineer',
    company: 'Kakao',
    location: 'Seoul, South Korea',
    description: 'Join our innovative team. We value work-life balance and continuous learning.',
    link: 'https://linkedin.com/jobs/view/123'
  });
  assert(job.culture_keywords.includes('innovative'));
  assert(job.culture_keywords.includes('work_life_balance'));
  assert(job.culture_keywords.includes('learning_focused'));
});

test('LinkedIn: culture_keywords from Korean description', () => {
  const job = parseLinkedInCard({
    title: 'Backend Developer',
    company: 'Naver',
    location: '대한민국',
    description: '자율적이고 수평적인 조직 문화에서 협업하세요',
  });
  assert(job.culture_keywords.includes('autonomous'));
  assert(job.culture_keywords.includes('collaborative'));
});

test('LinkedIn: culture_keywords empty when no signals', () => {
  const job = parseLinkedInCard({
    title: 'Developer',
    company: 'Test',
    location: 'Seoul',
    description: 'Write code',
  });
  assert.deepStrictEqual(job.culture_keywords, []);
});

// === Cross-source parity: same culture text produces same keywords ===
test('Parity: same culture text yields same keywords across all 3 sources', () => {
  const cultureText = '혁신적인 스타트업에서 성장과 워라밸을 경험하세요';

  // Wanted
  const wanted = parseWantedJob({ title: `프론트엔드개발자카카오경력 3년${cultureText}보상금 70만원`, id: '1', link: '' });
  // JobKorea
  const jk = parseJobKoreaCard(`프론트엔드 개발자\n㈜카카오\n서울\n경력 3년\n${cultureText}`);
  // LinkedIn
  const li = parseLinkedInCard({ title: 'Frontend Developer', company: 'Kakao', location: 'Seoul', description: cultureText });

  // All should detect innovative, learning_focused, work_life_balance
  for (const [name, job] of [['wanted', wanted], ['jobkorea', jk], ['linkedin', li]]) {
    assert(job.culture_keywords.includes('innovative'), `${name}: expected innovative`);
    assert(job.culture_keywords.includes('learning_focused'), `${name}: expected learning_focused`);
    assert(job.culture_keywords.includes('work_life_balance'), `${name}: expected work_life_balance`);
  }
});

// === Ensure existing fields not broken ===
test('JobKorea: salary still works after culture addition', () => {
  const raw = `개발자\n㈜회사\n서울\n경력 3년\n연봉 5000~8000만원`;
  const job = parseJobKoreaCard(raw);
  assert.strictEqual(job.salary_min, 5000);
  assert.strictEqual(job.salary_max, 8000);
});

test('LinkedIn: skills still work after culture addition', () => {
  const job = parseLinkedInCard({ title: 'React Developer', company: 'Test', location: 'Seoul' });
  assert(job.skills.includes('react'));
});

console.log(`\n📊 Cross-source culture parity: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
