/**
 * EXP-111: Test that skills and culture_keywords are MERGED (unioned) during dedup,
 * not just enriched when empty. Different sources may extract partial skill sets
 * from the same job — union preserves all extracted skills.
 */

const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

function simulateMerge(keeper, dupes) {
  const enrichUpdates = {};
  const mergeFields = ['skills', 'culture_keywords'];

  for (const field of mergeFields) {
    const keeperSet = new Set(
      (keeper[field] || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    );
    let changed = false;
    for (const d of dupes) {
      if (d[field] && d[field].trim()) {
        for (const item of d[field].split(',')) {
          const normalized = item.trim();
          if (normalized && !keeperSet.has(normalized.toLowerCase())) {
            keeperSet.add(normalized.toLowerCase());
            changed = true;
          }
        }
      }
    }
    if (changed) {
      const result = (keeper[field] || '').split(',').map(s => s.trim()).filter(Boolean);
      const resultLower = new Set(result.map(s => s.toLowerCase()));
      for (const d of dupes) {
        if (d[field] && d[field].trim()) {
          for (const item of d[field].split(',')) {
            const trimmed = item.trim();
            if (trimmed && !resultLower.has(trimmed.toLowerCase())) {
              result.push(trimmed);
              resultLower.add(trimmed.toLowerCase());
            }
          }
        }
      }
      enrichUpdates[field] = result.join(',');
    }
  }
  return enrichUpdates;
}

console.log('🧪 EXP-111: Dedup skills/culture MERGE (union) enrichment\n');

test('skills merged when keeper has partial set', () => {
  const keeper = { skills: 'React, TypeScript' };
  const dupes = [{ skills: 'React, TypeScript, AWS, Docker' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'skills should be merged');
  const merged = updates.skills.split(',');
  assert.ok(merged.length >= 4, `expected 4+ skills, got ${merged.length}: ${updates.skills}`);
  assert.ok(updates.skills.includes('AWS'), 'AWS should be in merged skills');
  assert.ok(updates.skills.includes('Docker'), 'Docker should be in merged skills');
});

test('skills enriched from duplicate when keeper has no skills', () => {
  const keeper = { skills: '' };
  const dupes = [{ skills: 'Java, Spring Boot, MySQL' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'skills should be enriched');
  assert.ok(updates.skills.includes('Java'));
});

test('no merge when keeper has same skills as duplicate', () => {
  const keeper = { skills: 'React, TypeScript, Node.js' };
  const dupes = [{ skills: 'React, TypeScript, Node.js' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(!updates.skills, 'no merge needed when skills are identical');
});

test('skills merged from multiple duplicates', () => {
  const keeper = { skills: 'React' };
  const dupes = [
    { skills: 'React, TypeScript, AWS' },
    { skills: 'React, Docker, Kubernetes' }
  ];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'skills should be merged from multiple dupes');
  const skills = updates.skills.split(',');
  assert.ok(skills.length >= 5, `expected 5+ skills, got ${skills.length}: ${updates.skills}`);
});

test('case-insensitive merge prevents duplicates', () => {
  const keeper = { skills: 'react, typescript' };
  const dupes = [{ skills: 'React, TypeScript, AWS' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'skills should be merged');
  const skills = updates.skills.split(',');
  const reactCount = skills.filter(s => s.trim().toLowerCase() === 'react').length;
  assert.strictEqual(reactCount, 1, 'react should appear only once');
});

test('culture_keywords merged when keeper has partial set', () => {
  const keeper = { culture_keywords: 'innovative' };
  const dupes = [{ culture_keywords: 'innovative, collaborative, fast-paced' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.culture_keywords, 'culture_keywords should be merged');
  assert.ok(updates.culture_keywords.includes('collaborative'), 'collaborative should be in merged keywords');
});

test('empty duplicate skills ignored', () => {
  const keeper = { skills: 'React, TypeScript' };
  const dupes = [{ skills: '' }, { skills: '   ' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(!updates.skills, 'empty dupes should not trigger merge');
});

test('original casing preserved from keeper', () => {
  const keeper = { skills: 'React, TypeScript, Node.js' };
  const dupes = [{ skills: 'react, typescript, aws' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'should merge new skill');
  assert.ok(updates.skills.includes('React'), 'React casing preserved');
  assert.ok(updates.skills.includes('TypeScript'), 'TypeScript casing preserved');
  assert.ok(updates.skills.includes('aws'), 'aws from dupe included');
});

test('skills with whitespace variations handled', () => {
  const keeper = { skills: 'React ,  TypeScript ' };
  const dupes = [{ skills: ' React,AWS ' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'should merge');
  assert.ok(updates.skills.includes('AWS'), 'AWS merged');
  const skills = updates.skills.split(',');
  assert.ok(skills.length >= 3, `expected 3+ skills, got ${skills.length}`);
});

test('keeper with null skills gets all from dupes', () => {
  const keeper = { skills: null };
  const dupes = [{ skills: 'Python, Django, PostgreSQL' }];
  const updates = simulateMerge(keeper, dupes);
  assert.ok(updates.skills, 'skills should be enriched from null');
  assert.ok(updates.skills.includes('Python'));
});

console.log(`\n📊 ${passed} passed | ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
