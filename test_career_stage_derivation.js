/**
 * EXP-077: Career Stage Derivation Tests
 *
 * The matching algorithm's career_stage component (15% weight) was always
 * returning 50 because post-processors never populated career_stage.
 *
 * This test validates deriveCareerStage() which maps experience text
 * to career_stage values: entry, junior, mid, senior, lead.
 */

let passed = 0, failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

// === deriveCareerStage implementation ===
function deriveCareerStage(experience) {
  if (!experience) return null;

  const exp = experience.trim();

  // 신입·경력 / 신입/경력 → entry (broad match, leans entry-friendly)
  if (/신입[·/].*경력|경력[·/].*신입/.test(exp)) return 'entry';

  // 신입 (entry-level) — only when 경력 is NOT present
  if (/신입/.test(exp) && !/경력/.test(exp)) return 'entry';

  // 경력 무관 → null (no stage preference)
  if (/무관/.test(exp)) return null;

  // Extract years from patterns
  const rangeMatch = exp.match(/(\d+)\s*[~-]\s*(\d+)\s*년/);
  const minMatch = exp.match(/(\d+)\s*년\s*이상/);
  const upMatch = exp.match(/(\d+)\s*년\s*↑/);
  const singleMatch = exp.match(/(\d+)\s*년/);

  let years = null;
  if (rangeMatch) {
    years = parseInt(rangeMatch[2]); // use upper bound for stage classification
  } else if (minMatch) {
    years = parseInt(minMatch[1]);
  } else if (upMatch) {
    years = parseInt(upMatch[1]);
  } else if (singleMatch) {
    years = parseInt(singleMatch[1]);
  }

  if (years === null) return null;

  if (years <= 3) return 'junior';
  if (years <= 7) return 'mid';
  if (years <= 12) return 'senior';
  return 'lead';
}

// === Tests ===

console.log('📋 Career Stage Derivation Tests\n');

// 신입 patterns
console.log('--- 신입 (entry-level) ---');
assert(deriveCareerStage('신입') === 'entry', '신입 → entry');
assert(deriveCareerStage('  신입  ') === 'entry', 'padded 신입 → entry');

// 신입·경력
console.log('--- 신입·경력 ---');
assert(deriveCareerStage('신입·경력') === 'entry', '신입·경력 → entry');
assert(deriveCareerStage('신입/경력') === 'entry', '신입/경력 → entry');
assert(deriveCareerStage('경력·신입') === 'entry', '경력·신입 → entry');

// 경력 무관
console.log('--- 경력 무관 ---');
assert(deriveCareerStage('경력 무관') === null, '경력 무관 → null');
assert(deriveCareerStage('경력무관') === null, '경력무관 (no space) → null');

// Range patterns (use upper bound)
console.log('--- Range patterns ---');
assert(deriveCareerStage('경력 1~3년') === 'junior', '경력 1~3년 → junior (upper=3)');
assert(deriveCareerStage('경력 3-5년') === 'mid', '경력 3-5년 → mid (upper=5)');
assert(deriveCareerStage('경력 5~10년') === 'senior', '경력 5~10년 → senior (upper=10)');
assert(deriveCareerStage('경력 10-15년') === 'lead', '경력 10-15년 → lead (upper=15)');

// Minimum patterns
console.log('--- Minimum (이상) patterns ---');
assert(deriveCareerStage('경력 3년 이상') === 'junior', '경력 3년 이상 → junior');
assert(deriveCareerStage('경력 5년 이상') === 'mid', '경력 5년 이상 → mid');
assert(deriveCareerStage('경력 10년 이상') === 'senior', '경력 10년 이상 → senior');
assert(deriveCareerStage('경력 15년 이상') === 'lead', '경력 15년 이상 → lead');

// Up arrow
console.log('--- Up arrow (↑) patterns ---');
assert(deriveCareerStage('경력 5년↑') === 'mid', '경력 5년↑ → mid');
assert(deriveCareerStage('경력 3년 ↑') === 'junior', '경력 3년 ↑ → junior');

// Single year
console.log('--- Single year patterns ---');
assert(deriveCareerStage('경력 1년') === 'junior', '경력 1년 → junior');
assert(deriveCareerStage('경력 7년') === 'mid', '경력 7년 → mid');
assert(deriveCareerStage('경력 8년') === 'senior', '경력 8년 → senior');
assert(deriveCareerStage('경력 12년') === 'senior', '경력 12년 → senior');
assert(deriveCareerStage('경력 13년') === 'lead', '경력 13년 → lead');

// Edge cases
console.log('--- Edge cases ---');
assert(deriveCareerStage('') === null, 'empty string → null');
assert(deriveCareerStage(null) === null, 'null → null');
assert(deriveCareerStage(undefined) === null, 'undefined → null');
assert(deriveCareerStage('경력') === null, 'bare 경력 → null (no year info)');
assert(deriveCareerStage('some random text') === null, 'random text → null');

// === Integration: career_stage impact on matching ===
console.log('\n--- Integration: career_stage scoring impact ---');

// Stages: entry(0), junior(1), mid(2), senior(3), lead(4)
function calculateCareerStageScore(jobStage, candidateYears) {
  const stages = ['entry', 'junior', 'mid', 'senior', 'lead'];
  const candidateStage = candidateYears <= 1 ? 'entry' : candidateYears <= 3 ? 'junior' : candidateYears <= 7 ? 'mid' : candidateYears <= 12 ? 'senior' : 'lead';
  if (!jobStage) return 50;
  const gap = Math.abs(stages.indexOf(jobStage) - stages.indexOf(candidateStage));
  if (gap === 0) return 95;
  if (gap === 1) return 75;
  return 40;
}

// 5-year candidate (mid) applying to various stages
const candidate5yr = 5;
const scoreWithStage = (exp) => calculateCareerStageScore(deriveCareerStage(exp), candidate5yr);

// mid(2) vs mid(2) = gap 0 → 95
assert(scoreWithStage('경력 3-5년') === 95, '5yr(mid) vs mid job → 95 (exact)');
assert(scoreWithStage('경력 5-7년') === 95, '5yr(mid) vs mid job(5-7) → 95');

// mid(2) vs entry(0) = gap 2 → 40
assert(scoreWithStage('신입') === 40, '5yr(mid) vs entry job → 40 (2 gap)');

// mid(2) vs senior(3) = gap 1 → 75
assert(scoreWithStage('경력 7-10년') === 75, '5yr(mid) vs senior(7-10) → 75 (1 gap)');

// mid(2) vs lead(4) = gap 2 → 40
assert(scoreWithStage('경력 15년 이상') === 40, '5yr(mid) vs lead job → 40 (2 gap)');

// Before fix: all return 50 (null career_stage)
const beforeFix = calculateCareerStageScore(null, candidate5yr);
assert(beforeFix === 50, 'Before fix: null stage → 50');

// Discrimination improvement
const afterMid = scoreWithStage('경력 3-5년');
const afterEntry = scoreWithStage('신입');
const spread = afterMid - afterEntry;
assert(spread === 55, `After fix: spread ${spread}pts (95-40=55)`);

// 15% weight impact: 55 * 0.15 = 8.25 points difference in overall score
const weightedImpact = spread * 0.15;
assert(weightedImpact > 8, `Weighted impact: ${weightedImpact.toFixed(1)}pts (15% of ${spread})`);

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
if (failed === 0) console.log('✅ All career stage derivation tests passed!');
else console.log('❌ Some tests failed');
