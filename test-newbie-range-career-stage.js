// test_newbie_range_career_stage.js — EXP-151→EXP-179: 신입-N년 range career stage
// EXP-179: Lowered newbie range thresholds — 신입-inclusive jobs skew junior/mid
// 신입~5년 → junior (was mid), 신입~8년 → mid (was senior), 신입~10년 → mid (was senior)
const { describe, it } = require('node:test');
const assert = require('assert');
const { deriveCareerStageFromTitle } = require('./scripts/skill-inference');

describe('EXP-179: newbie-to-N-year range career stage (lowered thresholds)', () => {
  const cases = [
    // 신입-N년 patterns — stage from upper bound with 신입-aware lower thresholds
    // EXP-179: 신입~5년 now correctly → junior (newbie-friendly job targeting juniors)
    { title: '프론트엔드 개발자(신입-5년, Next.js/React/Typescript)', expected: 'junior' },
    { title: '백엔드 개발자 신입~3년', expected: 'junior' },
    // EXP-179: 신입~10년 → mid (was senior; wide range but 신입-inclusive = mid-target)
    { title: '개발자(신입-10년)', expected: 'mid' },
    { title: '개발자 신입-2년', expected: 'junior' },
    // 신입~7년 → mid (upper 7 ≤ 10)
    { title: '백엔드 개발자(신입~7년)', expected: 'mid' },
    // 신입~15년 → senior (upper 15 ≤ 15)
    { title: '개발자(신입-15년)', expected: 'senior' },
    // 0-N년 patterns — same lowered thresholds
    { title: '개발자(0-3년)', expected: 'junior' },
    { title: '개발자 0~7년', expected: 'mid' },
    // EXP-179: 0-10년 → mid (was senior)
    { title: '프론트엔드 개발자(0-10년)', expected: 'mid' },
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

describe('EXP-179: edge cases', () => {
  it('신입-15년 → senior (upper 15 ≤ 15, newbie-aware)', () => {
    assert.strictEqual(deriveCareerStageFromTitle('개발자(신입-15년)'), 'senior');
  });
  it('신입-20년 → lead (upper 20 > 15)', () => {
    assert.strictEqual(deriveCareerStageFromTitle('개발자(신입-20년)'), 'lead');
  });
});
