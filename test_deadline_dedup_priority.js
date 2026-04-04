#!/usr/bin/env node
/**
 * EXP-107: Deadline quality-aware dedup scoring and enrichment
 * Tests that actual ISO dates score higher than 상시모집 and enrichment prefers real dates.
 */

const assert = require('assert');

// ── Extract fieldScore and logic from dedup-jobs.js ──

function fieldScore(job) {
  let score = 0;
  if (job.title) score++;
  if (job.company) score++;
  if (job.salary && job.salary.trim()) score += 2;
  if (job.salary_min || job.salary_max) score += 1;
  if (job.deadline && job.deadline.trim()) {
    const dl = job.deadline.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(dl)) score += 3;  // Actual date
    else if (dl === '상시모집') score += 1;  // Rolling recruitment
    else score += 2;  // Other format
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
  if (job.source === 'wanted') score += 1;
  return score;
}

// Simulate deadline enrichment logic
function enrichDeadline(keeper, dupes) {
  const enrichUpdates = {};
  if (!keeper.deadline || !keeper.deadline.trim() || keeper.deadline.trim() === '상시모집') {
    for (const d of dupes) {
      if (d.deadline && d.deadline.trim() && /^\d{4}-\d{2}-\d{2}/.test(d.deadline.trim())) {
        enrichUpdates.deadline = d.deadline.trim();
        break;
      }
    }
    if (!enrichUpdates.deadline && (!keeper.deadline || !keeper.deadline.trim())) {
      for (const d of dupes) {
        if (d.deadline && d.deadline.trim()) {
          enrichUpdates.deadline = d.deadline.trim();
          break;
        }
      }
    }
  }
  return enrichUpdates;
}

// ── Tests ──

let passed = 0, failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

console.log('🧪 Deadline dedup priority tests (EXP-107)\n');

// fieldScore tests
test('ISO date scores +3', () => {
  const s1 = fieldScore({ title: 'Dev', company: 'Co', deadline: '2026-04-30' });
  const s2 = fieldScore({ title: 'Dev', company: 'Co', deadline: '상시모집' });
  assert.ok(s1 > s2, `ISO date score ${s1} should be > 상시모집 score ${s2}`);
});

test('상시모집 scores +1 (less than other formats)', () => {
  const s1 = fieldScore({ title: 'Dev', company: 'Co', deadline: '상시모집' });
  const s2 = fieldScore({ title: 'Dev', company: 'Co' });
  assert.strictEqual(s1 - s2, 1);
});

test('Other deadline format scores +2', () => {
  const s1 = fieldScore({ title: 'Dev', company: 'Co', deadline: '04/30' });
  const s2 = fieldScore({ title: 'Dev', company: 'Co' });
  assert.strictEqual(s1 - s2, 2);
});

test('Full ISO datetime scores +3', () => {
  const s1 = fieldScore({ title: 'Dev', company: 'Co', deadline: '2026-04-30T23:59:59' });
  const s2 = fieldScore({ title: 'Dev', company: 'Co' });
  assert.strictEqual(s1 - s2, 3);
});

test('Empty deadline scores 0', () => {
  const s1 = fieldScore({ title: 'Dev', company: 'Co', deadline: '' });
  const s2 = fieldScore({ title: 'Dev', company: 'Co' });
  assert.strictEqual(s1, s2);
});

// Keeper selection tests
test('Entry with ISO date chosen over 상시모집 (otherwise equal)', () => {
  const a = { title: 'Dev', company: 'Co', source: 'wanted', deadline: '상시모집' };
  const b = { title: 'Dev', company: 'Co', source: 'jobkorea', deadline: '2026-04-30' };
  // b has +1 from source=wanted for a, but b has +3 deadline vs +1 for a → net b wins
  assert.ok(fieldScore(b) > fieldScore(a));
});

// Enrichment tests
test('상시모집 keeper enriched with ISO date from duplicate', () => {
  const result = enrichDeadline({ deadline: '상시모집' }, [
    { deadline: '2026-04-30' }
  ]);
  assert.strictEqual(result.deadline, '2026-04-30');
});

test('Empty deadline enriched with ISO date', () => {
  const result = enrichDeadline({ deadline: '' }, [
    { deadline: '2026-04-30' }
  ]);
  assert.strictEqual(result.deadline, '2026-04-30');
});

test('Null deadline enriched with ISO date', () => {
  const result = enrichDeadline({ deadline: null }, [
    { deadline: '2026-04-30' }
  ]);
  assert.strictEqual(result.deadline, '2026-04-30');
});

test('ISO date keeper NOT overwritten by duplicate', () => {
  const result = enrichDeadline({ deadline: '2026-04-15' }, [
    { deadline: '2026-04-30' }
  ]);
  assert.strictEqual(result.deadline, undefined);
});

test('상시모집 enriched from first ISO date when multiple duplicates', () => {
  const result = enrichDeadline({ deadline: '상시모집' }, [
    { deadline: '상시모집' },
    { deadline: '2026-05-01' },
    { deadline: '2026-04-01' }
  ]);
  assert.strictEqual(result.deadline, '2026-05-01');
});

test('Empty deadline falls back to 상시모집 when no ISO dates available', () => {
  const result = enrichDeadline({ deadline: '' }, [
    { deadline: '상시모집' }
  ]);
  assert.strictEqual(result.deadline, '상시모집');
});

test('상시모집 keeper NOT overwritten by 상시모집 duplicate', () => {
  const result = enrichDeadline({ deadline: '상시모집' }, [
    { deadline: '상시모집' }
  ]);
  assert.strictEqual(result.deadline, undefined);
});

// ── Summary ──
console.log(`\n📊 ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
