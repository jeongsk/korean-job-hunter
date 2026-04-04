/**
 * EXP-109: Test that content and office_address are enriched during dedup merge.
 * These fields carry full JD text and commute-relevant addresses that must not be lost.
 */

const assert = require('assert');

// ── Inline dedup logic (mirrored from dedup-jobs.js) ──

function fieldScore(job) {
  let score = 0;
  if (job.title) score++;
  if (job.company) score++;
  if (job.salary && job.salary.trim()) score += 2;
  if (job.salary_min || job.salary_max) score += 1;
  if (job.deadline && job.deadline.trim()) {
    const dl = job.deadline.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(dl)) score += 3;
    else if (dl === '상시모집') score += 1;
    else score += 2;
  }
  if (job.experience && job.experience.trim()) score++;
  if (job.work_type && job.work_type.trim()) score++;
  if (job.location && job.location.trim()) score++;
  if (job.content && job.content.trim()) score += 2;
  if (job.skills && job.skills.trim()) score += 3;
  if (job.culture_keywords && job.culture_keywords.trim()) score += 1;
  if (job.employment_type && job.employment_type !== 'regular') score += 1;
  if (job.career_stage && job.career_stage.trim()) score += 2;
  if (job.reward && job.reward.trim()) score += 1;
  if (job.office_address && job.office_address.trim()) score += 1;
  if (job.source === 'wanted') score += 1;
  return score;
}

// Simulate enrichment
function simulateEnrichment(keeper, dupes) {
  const enrichFields = ['skills', 'culture_keywords', 'employment_type', 'salary', 'experience', 'work_type', 'location', 'career_stage', 'reward', 'content', 'office_address'];
  const enrichUpdates = {};
  for (const field of enrichFields) {
    if ((!keeper[field] || !keeper[field].trim?.()) && !enrichUpdates[field]) {
      for (const d of dupes) {
        if (d[field] && d[field].trim?.()) {
          enrichUpdates[field] = d[field].trim();
          break;
        }
      }
    }
  }
  return enrichUpdates;
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('🧪 EXP-109: Dedup content + office_address enrichment\n');

test('content enriched from duplicate when keeper has no content', () => {
  const keeper = { title: '프론트엔드 개발자', company: '카카오', content: '', skills: 'react' };
  const dupes = [{ title: '프론트엔드', company: '카카오', content: 'React, TypeScript 포지션입니다. 3년 이상 경력 요구.' }];
  const updates = simulateEnrichment(keeper, dupes);
  assert.ok(updates.content, 'content should be enriched');
  assert.ok(updates.content.includes('React'), 'content should contain JD text');
});

test('office_address enriched from duplicate', () => {
  const keeper = { title: '백엔드 개발자', company: '토스', office_address: '', skills: 'java' };
  const dupes = [{ title: '백엔드', company: '토스', office_address: '서울시 강남구 테헤란로 123' }];
  const updates = simulateEnrichment(keeper, dupes);
  assert.strictEqual(updates.office_address, '서울시 강남구 테헤란로 123');
});

test('content NOT overwritten when keeper already has content', () => {
  const keeper = { title: 'DevOps', company: '네이버', content: '상세 JD', skills: '' };
  const dupes = [{ title: 'DevOps Engineer', company: '네이버', content: '다른 JD', skills: 'kubernetes' }];
  const updates = simulateEnrichment(keeper, dupes);
  assert.ok(!updates.content, 'keeper content should not be overwritten');
  assert.strictEqual(updates.skills, 'kubernetes', 'but missing skills should be enriched');
});

test('both content and office_address enriched simultaneously', () => {
  const keeper = { title: '데이터 엔지니어', company: '라인', content: '', office_address: '' };
  const dupes = [
    { title: 'Data Engineer', company: '라인', content: 'Spark/Kafka 경험자 우대', office_address: '서울 영등포구' }
  ];
  const updates = simulateEnrichment(keeper, dupes);
  assert.ok(updates.content);
  assert.ok(updates.office_address);
});

test('fieldScore includes office_address bonus', () => {
  const without = fieldScore({ title: 't', company: 'c' });
  const with_addr = fieldScore({ title: 't', company: 'c', office_address: '서울시 강남구' });
  assert.strictEqual(with_addr, without + 1, 'office_address should add 1 to fieldScore');
});

test('fieldScore content bonus unchanged', () => {
  const without = fieldScore({ title: 't', company: 'c' });
  const with_content = fieldScore({ title: 't', company: 'c', content: '상세 JD 내용' });
  assert.strictEqual(with_content, without + 2, 'content should add 2 to fieldScore');
});

console.log(`\n📊 ${passed} passed | ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
