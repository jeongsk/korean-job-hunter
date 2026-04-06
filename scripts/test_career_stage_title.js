#!/usr/bin/env node
// test_career_stage_title.js — Test deriveCareerStageFromTitle from skill-inference.js
// EXP-139: Title-based career stage override for Wanted API jobs

const { deriveCareerStageFromTitle, deriveCareerStage } = require('./skill-inference');

let pass = 0, fail = 0;

function assert(condition, msg) {
  if (condition) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

function assertEq(actual, expected, msg) {
  assert(actual === expected, `${msg} — expected "${expected}", got "${actual}"`);
}

// --- Korean titles ---
assertEq(deriveCareerStageFromTitle('시니어 프론트엔드 개발자'), 'senior', '시니어 프론트엔드 개발자');
assertEq(deriveCareerStageFromTitle('시니어 백엔드 개발'), 'senior', '시니어 백엔드 개발');
assertEq(deriveCareerStageFromTitle('주니어 개발자'), 'junior', '주니어 개발자');
assertEq(deriveCareerStageFromTitle('신입 프론트엔드'), 'junior', '신입 프론트엔드');

// --- English titles ---
assertEq(deriveCareerStageFromTitle('Senior Frontend Developer'), 'senior', 'Senior Frontend Developer');
assertEq(deriveCareerStageFromTitle('Sr. Full Stack Engineer'), 'senior', 'Sr. Full Stack Engineer');
assertEq(deriveCareerStageFromTitle('Junior Backend Developer'), 'junior', 'Junior Backend Developer');
assertEq(deriveCareerStageFromTitle('Jr. DevOps Engineer'), 'junior', 'Jr. DevOps Engineer');
assertEq(deriveCareerStageFromTitle('Lead Engineer'), 'lead', 'Lead Engineer');
assertEq(deriveCareerStageFromTitle('Staff Engineer'), 'lead', 'Staff Engineer');
assertEq(deriveCareerStageFromTitle('Principal Engineer'), 'lead', 'Principal Engineer');
assertEq(deriveCareerStageFromTitle('Tech Lead'), 'lead', 'Tech Lead');
assertEq(deriveCareerStageFromTitle('Team Lead'), 'lead', 'Team Lead');
assertEq(deriveCareerStageFromTitle('Frontend Engineer Lead'), 'lead', 'Frontend Engineer Lead');

// --- No seniority indicator ---
assertEq(deriveCareerStageFromTitle('프론트엔드 개발자'), null, '프론트엔드 개발자 (no indicator)');
assertEq(deriveCareerStageFromTitle('Backend Developer'), null, 'Backend Developer (no indicator)');
assertEq(deriveCareerStageFromTitle('Product Engineer'), null, 'Product Engineer (no indicator)');

// --- False positives ---
assertEq(deriveCareerStageFromTitle('Leading Product Designer'), null, 'Leading Product Designer (should not match lead)');
// "leading" at start of word should NOT match \blead\b — but our regex uses (^|[\s]) prefix
// Let's check: "Leading" starts at position 0, no space/bracket before it
assertEq(deriveCareerStageFromTitle('Leads generation engineer'), null, 'Leads generation engineer (false positive)');

// --- Combined with deriveCareerStage for fallback ---
// When title has no indicator, fall back to experience-based
assertEq(
  deriveCareerStageFromTitle('프론트엔드 개발자') || deriveCareerStage('경력'),
  'mid',
  'Title fallback → 경력 → mid'
);
assertEq(
  deriveCareerStageFromTitle('시니어 프론트엔드 개발자') || deriveCareerStage('경력'),
  'senior',
  'Title overrides 경력 → senior'
);
assertEq(
  deriveCareerStageFromTitle('시니어 프론트엔드 개발자') || deriveCareerStage('3~5년'),
  'senior',
  'Title overrides 3~5년 → senior (title takes precedence)'
);

// --- Edge cases ---
assertEq(deriveCareerStageFromTitle(''), null, 'empty string');
assertEq(deriveCareerStageFromTitle(null), null, 'null');
assertEq(deriveCareerStageFromTitle(undefined), null, 'undefined');
assertEq(deriveCareerStageFromTitle('[미리캔버스] 시니어 프론트엔드 개발자'), 'senior', '[prefix] 시니어 title');
assertEq(deriveCareerStageFromTitle('Associate Product Manager'), 'junior', 'Associate → junior');
assertEq(deriveCareerStageFromTitle('Entry-Level Developer'), 'junior', 'Entry-Level → junior');

console.log(`\n${pass}/${pass+fail} tests passed`);
if (fail > 0) process.exit(1);
