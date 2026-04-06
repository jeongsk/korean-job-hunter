// test_newbie_range_career_stage.js — EXP-151: 신입-N년 range career stage
// Verifies that "신입-N년" and "0-N년" patterns derive career_stage from upper bound
const { describe, it } = require('node:test');
const assert = require('assert');
const { deriveCareerStageFromTitle } = require('./scripts/skill-inference');

describe('EXP-151: newbie-to-N-year range career stage', () => {
  const cases = [
    // 신입-N년 patterns — stage from upper bound
    { title: '프론트엔드 개발자(신입-5년, Next.js/React/Typescript)', expected: 'mid' },
    { title: '백엔드 개발자 신입~3년', expected: 'junior' },
    { title: '개발자(신입-10년)', expected: 'senior' },
    { title: '개발자 신입-2년', expected: 'junior' },
    { title: '백엔드 개발자(신입~7년)', expected: 'mid' },
    { title: '개발자(신입-15년)', expected: 'lead' },
    // 0-N년 patterns
    { title: '개발자(0-3년)', expected: 'junior' },
    { title: '개발자 0~7년', expected: 'mid' },
    { title: '프론트엔드 개발자(0-10년)', expected: 'senior' },
    // Plain 신입 without range — still junior
    { title: '신입 개발자', expected: 'junior' },
    { title: '백엔드 개발자 (신입)', expected: 'junior' },
    // Non-newbie ranges should still work
    { title: '개발자(3-7년)', expected: 'mid' },
    { title: '시니어 백엔드 개발자', expected: 'senior' },
    { title: '개발 리드', expected: 'lead' },
  ];

  for (const { title, expected } of cases) {
    it(`${title} → ${expected}`, () => {
      assert.strictEqual(deriveCareerStageFromTitle(title), expected);
    });
  }
});

// Fix the case that should be 'lead' not 'senior'
// Actually let me re-check: 신입-15년 upper=15 → >12 → lead
// Let me verify in the test itself
describe('EXP-151: edge cases', () => {
  it('신입-15년 → lead (upper 15 > 12)', () => {
    assert.strictEqual(deriveCareerStageFromTitle('개발자(신입-15년)'), 'lead');
  });
});
