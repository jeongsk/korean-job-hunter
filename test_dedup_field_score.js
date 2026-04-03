/**
 * Test: Dedup fieldScore and enrichment cover career_stage and reward
 * EXP-094: Verifies fieldScore values career_stage/reward, enrichFields includes reward
 */
const assert = require('assert');

// ── fieldScore logic (mirrored from dedup-jobs.js) ──
function fieldScore(job) {
  let score = 0;
  if (job.title) score++;
  if (job.company) score++;
  if (job.salary && job.salary.trim()) score += 2;
  if (job.salary_min || job.salary_max) score += 1;
  if (job.deadline && job.deadline.trim()) score += 2;
  if (job.experience && job.experience.trim()) score++;
  if (job.work_type && job.work_type.trim()) score++;
  if (job.location && job.location.trim()) score++;
  if (job.content && job.content.trim()) score += 2;
  if (job.skills && job.skills.trim()) score += 3;
  if (job.culture_keywords && job.culture_keywords.trim()) score += 1;
  if (job.employment_type && job.employment_type !== 'regular') score += 1;
  if (job.career_stage && job.career_stage.trim()) score += 2;
  if (job.reward && job.reward.trim()) score += 1;
  if (job.source === 'wanted') score += 1;
  return score;
}

// ── enrichFields (mirrored) ──
const enrichFields = ['skills', 'culture_keywords', 'employment_type', 'salary', 'deadline', 'experience', 'work_type', 'location', 'career_stage', 'reward'];

let passed = 0;

// Test 1: career_stage increases fieldScore
{
  const without = fieldScore({ title: 'Dev', company: 'Co' });
  const withStage = fieldScore({ title: 'Dev', company: 'Co', career_stage: 'senior' });
  assert.strictEqual(withStage - without, 2, 'career_stage should add 2 to score');
  passed++;
  console.log('✅ career_stage adds 2 to fieldScore');
}

// Test 2: reward increases fieldScore
{
  const without = fieldScore({ title: 'Dev', company: 'Co' });
  const withReward = fieldScore({ title: 'Dev', company: 'Co', reward: '합격보상금 100만원' });
  assert.strictEqual(withReward - without, 1, 'reward should add 1 to score');
  passed++;
  console.log('✅ reward adds 1 to fieldScore');
}

// Test 3: Entry with career_stage preferred over one without
{
  const noStage = { title: 'Dev', company: 'Co', source: 'wanted', skills: 'react' };
  const hasStage = { title: 'Dev', company: 'Co', source: 'wanted', skills: 'react', career_stage: 'mid' };
  assert.ok(fieldScore(hasStage) > fieldScore(noStage), 'Entry with career_stage should score higher');
  passed++;
  console.log('✅ Entry with career_stage wins fieldScore tiebreak');
}

// Test 4: enrichFields includes reward
{
  assert.ok(enrichFields.includes('reward'), 'reward should be in enrichFields');
  passed++;
  console.log('✅ reward in enrichFields');
}

// Test 5: enrichFields includes career_stage
{
  assert.ok(enrichFields.includes('career_stage'), 'career_stage should be in enrichFields');
  passed++;
  console.log('✅ career_stage in enrichFields');
}

// Test 6: Reward enrichment from duplicate
{
  const keeper = { title: 'Dev', company: 'Co', reward: '' };
  const dupe = { title: 'Dev', company: 'Co', reward: '합격보상금 50만원' };
  const updates = {};
  for (const field of enrichFields) {
    if ((!keeper[field] || !keeper[field].trim()) && !updates[field]) {
      if (dupe[field] && dupe[field].trim()) {
        updates[field] = dupe[field].trim();
      }
    }
  }
  assert.strictEqual(updates.reward, '합격보상금 50만원', 'reward should be enriched from duplicate');
  passed++;
  console.log('✅ reward enriched from duplicate');
}

// Test 7: career_stage enrichment from duplicate
{
  const keeper = { title: 'Dev', company: 'Co', career_stage: '' };
  const dupe = { title: 'Dev', company: 'Co', career_stage: 'senior' };
  const updates = {};
  for (const field of enrichFields) {
    if ((!keeper[field] || !keeper[field].trim()) && !updates[field]) {
      if (dupe[field] && dupe[field].trim()) {
        updates[field] = dupe[field].trim();
      }
    }
  }
  assert.strictEqual(updates.career_stage, 'senior', 'career_stage should be enriched from duplicate');
  passed++;
  console.log('✅ career_stage enriched from duplicate');
}

console.log(`\n📊 test_dedup_field_score.js: ${passed} passed`);
