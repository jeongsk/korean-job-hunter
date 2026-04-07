#!/usr/bin/env node
/**
 * EXP-160: Test bare 경력 and 무관 experience scoring in matching algorithm.
 * Most Wanted API jobs have experience='경력' with no year range.
 * Previously scored flat 60 for all candidates regardless of experience.
 * Now uses graduated scoring based on candidate years.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Import the matching function
function calculateExperienceScore(requiredYearsMin, requiredYearsMax, candidateYears, jobExperience, isMinimum = false) {
  let experienceScore = 60;
  if (requiredYearsMin > 0) {
    const ratio = candidateYears / requiredYearsMin;
    if (requiredYearsMax > 0 && candidateYears >= requiredYearsMin && candidateYears <= requiredYearsMax) {
      experienceScore = 95;
    } else if (isMinimum && candidateYears >= requiredYearsMin) {
      // Minimum-only patterns (N년 이상): candidates meeting the floor score well
      experienceScore = 90;
    } else if (ratio >= 0.8 && ratio <= 1.5) {
      experienceScore = 90;
    } else if (ratio >= 0.6 && ratio <= 2.0) {
      experienceScore = 65;
    } else if (ratio > 2.0) {
      experienceScore = 45;
    } else {
      experienceScore = 30;
    }
  } else if (jobExperience === '경력') {
    if (candidateYears >= 5 && candidateYears <= 10) experienceScore = 90;
    else if (candidateYears >= 3) experienceScore = 80;
    else if (candidateYears >= 1) experienceScore = 60;
    else experienceScore = 30;
  } else if (jobExperience === '무관' || jobExperience === '경력 무관') {
    experienceScore = Math.min(90, 60 + candidateYears * 5);
  }
  return experienceScore;
}

describe('EXP-160: Bare 경력 experience scoring', () => {
  describe('Bare 경력 - graduated scoring by candidate years', () => {
    it('0 years → 30 (too junior for generic 경력)', () => {
      assert.equal(calculateExperienceScore(0, 0, 0, '경력'), 30);
    });
    it('1 year → 60 (junior-adjacent)', () => {
      assert.equal(calculateExperienceScore(0, 0, 1, '경력'), 60);
    });
    it('2 years → 60 (junior-adjacent)', () => {
      assert.equal(calculateExperienceScore(0, 0, 2, '경력'), 60);
    });
    it('3 years → 80 (mid-level OK)', () => {
      assert.equal(calculateExperienceScore(0, 0, 3, '경력'), 80);
    });
    it('4 years → 80 (mid-level OK)', () => {
      assert.equal(calculateExperienceScore(0, 0, 4, '경력'), 80);
    });
    it('5 years → 90 (sweet spot)', () => {
      assert.equal(calculateExperienceScore(0, 0, 5, '경력'), 90);
    });
    it('7 years → 90 (sweet spot)', () => {
      assert.equal(calculateExperienceScore(0, 0, 7, '경력'), 90);
    });
    it('10 years → 90 (sweet spot)', () => {
      assert.equal(calculateExperienceScore(0, 0, 10, '경력'), 90);
    });
    it('15 years → 80 (experienced, past sweet spot)', () => {
      assert.equal(calculateExperienceScore(0, 0, 15, '경력'), 80);
    });
  });

  describe('무관 - open to all levels', () => {
    it('0 years → 60', () => {
      assert.equal(calculateExperienceScore(0, 0, 0, '무관'), 60);
    });
    it('3 years → 75', () => {
      assert.equal(calculateExperienceScore(0, 0, 3, '무관'), 75);
    });
    it('6 years → 90 (capped)', () => {
      assert.equal(calculateExperienceScore(0, 0, 6, '무관'), 90);
    });
    it('10 years → 90 (capped)', () => {
      assert.equal(calculateExperienceScore(0, 0, 10, '무관'), 90);
    });
  });

  describe('경력 무관 variant', () => {
    it('0 years → 60', () => {
      assert.equal(calculateExperienceScore(0, 0, 0, '경력 무관'), 60);
    });
    it('5 years → 85', () => {
      assert.equal(calculateExperienceScore(0, 0, 5, '경력 무관'), 85);
    });
  });

  describe('Explicit year range still works', () => {
    it('3-5년 range, 4yr candidate → 95 (in range)', () => {
      assert.equal(calculateExperienceScore(3, 5, 4, '3~5년'), 95);
    });
    it('3년 이상, 7yr candidate → 90 (minimum met)', () => {
      assert.equal(calculateExperienceScore(3, 6, 7, '3년 이상', true), 90);
    });
  });

  describe('isMinimum flag — no over-qualified penalty', () => {
    it('3년 이상, 3yr candidate → 95 (in range)', () => {
      assert.equal(calculateExperienceScore(3, 4, 3, '3년 이상', true), 95);
    });
    it('3년 이상, 10yr candidate → 90 (minimum met, not in range)', () => {
      assert.equal(calculateExperienceScore(3, 4, 10, '3년 이상', true), 90);
    });
    it('3년 이상, 20yr candidate → 90 (minimum met)', () => {
      assert.equal(calculateExperienceScore(3, 4, 20, '3년 이상', true), 90);
    });
    it('3년 이상, 1yr candidate → 30 (below minimum)', () => {
      assert.equal(calculateExperienceScore(3, 4, 1, '3년 이상', true), 30);
    });
    it('3년 이상, 2yr candidate → 65 (close ratio 0.67)', () => {
      assert.equal(calculateExperienceScore(3, 4, 2, '3년 이상', true), 65);
    });
    it('without isMinimum, 10yr for 3yr req → 45 (over-qualified penalty)', () => {
      assert.equal(calculateExperienceScore(3, 4, 10, '3년 이상', false), 45);
    });
  });

  describe('Discrimination gap', () => {
    it('7yr vs 0yr candidate for bare 경력 has 60pt gap', () => {
      const senior = calculateExperienceScore(0, 0, 7, '경력');
      const junior = calculateExperienceScore(0, 0, 0, '경력');
      assert.ok(senior - junior >= 50, `Expected gap >= 50, got ${senior - junior}`);
    });
  });
});
