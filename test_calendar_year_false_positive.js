/**
 * EXP-155: Calendar year false positive in deriveCareerStage
 * 
 * "21년도" (year 2021) was matched as 21 years of experience → lead.
 * Same for "19년도", "20년도" etc. when full description text was
 * passed to deriveCareerStage as a fallback.
 */

const { deriveCareerStage, deriveCareerStageFromTitle } = require('./scripts/skill-inference.js');

let passed = 0, failed = 0;

function assert(label, actual, expected) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.log(`❌ ${label}: expected ${expected}, got ${actual}`);
  }
}

// deriveCareerStage — calendar year false positives
assert('21년도 should be null', deriveCareerStage('경력 21년도부터 매년 60%'), null);
assert('19년도 should be null', deriveCareerStage('경력 19년도에 설립'), null);
assert('24년도 should be null', deriveCareerStage('경력 24년도 매출'), null);
assert('20년도 should be null', deriveCareerStage('경력 20년도부터'), null);
assert('25년 should be null when followed by 도', deriveCareerStage('경력 25년도'), null);

// deriveCareerStage — real patterns still work
assert('5년 이상 → mid', deriveCareerStage('5년 이상'), 'mid');
assert('3년~5년 → junior', deriveCareerStage('3년~5년'), 'junior');
assert('10년 이상 → senior', deriveCareerStage('10년 이상'), 'senior');
assert('plain 경력 → mid', deriveCareerStage('경력'), 'mid');
assert('3년 → junior', deriveCareerStage('3년'), 'junior');
assert('신입 → entry', deriveCareerStage('신입'), 'entry');
assert('7년 → mid', deriveCareerStage('7년'), 'mid');
assert('15년 → lead', deriveCareerStage('15년'), 'lead');

// deriveCareerStage — calendar year in ranges
assert('21년도~24년도 range should be null', deriveCareerStage('경력 21년도~24년도 성장'), null);

// deriveCareerStageFromTitle — calendar year
assert('title 21년도 → null', deriveCareerStageFromTitle('백엔드 21년도'), null);
assert('title 신입-5년 → junior', deriveCareerStageFromTitle('프론트엔드(신입-5년)'), 'junior');
assert('title 12년~20년 → lead', deriveCareerStageFromTitle('개발자(12년~20년)'), 'lead');

// Mixed: real experience after calendar year
assert('경력 3년 after 21년도 → junior', deriveCareerStage('경력 3년 after 21년도'), 'junior');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
