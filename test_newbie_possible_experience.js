/**
 * EXP-169: 신입가능 experience scoring test
 * 
 * Wanted API sets experience='신입가능' for jobs that welcome new graduates.
 * Previously fell through to default score=60 for all candidates.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Inline the scoring logic from run-match-tests.js for testing
function scoreExperience(jobExperience, candidateYears, expMin = null) {
  let requiredYearsMin = 0;
  let requiredYearsMax = 0;
  
  const expMinMatch = expMin;
  if (expMinMatch) {
    requiredYearsMin = parseInt(expMinMatch);
    requiredYearsMax = requiredYearsMin * 2;
  }
  
  let experienceScore = 60;
  
  if (requiredYearsMin > 0) {
    const ratio = candidateYears / requiredYearsMin;
    if (requiredYearsMax > 0 && candidateYears >= requiredYearsMin && candidateYears <= requiredYearsMax) {
      experienceScore = 95;
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
    if (candidateYears >= 3) experienceScore = 90;
    else if (candidateYears >= 1) experienceScore = 70;
    else experienceScore = 30;
  } else if (jobExperience === '신입가능' || jobExperience === '신입 가능' || jobExperience === '신입·경력' || jobExperience === '신입/경력') {
    if (candidateYears <= 1) experienceScore = 95;
    else if (candidateYears <= 3) experienceScore = 80;
    else if (candidateYears <= 7) experienceScore = 70;
    else experienceScore = 50;
  } else if (jobExperience === '무관' || jobExperience === '경력 무관') {
    experienceScore = Math.min(90, 60 + candidateYears * 5);
  }
  
  return experienceScore;
}

describe('EXP-169: 신입가능 experience scoring', () => {
  it('신입가능: 0yr candidate scores 95 (perfect)', () => {
    assert.equal(scoreExperience('신입가능', 0), 95);
  });
  
  it('신입가능: 1yr candidate scores 95', () => {
    assert.equal(scoreExperience('신입가능', 1), 95);
  });
  
  it('신입가능: 2yr candidate scores 80 (junior, good)', () => {
    assert.equal(scoreExperience('신입가능', 2), 80);
  });
  
  it('신입가능: 3yr candidate scores 80', () => {
    assert.equal(scoreExperience('신입가능', 3), 80);
  });
  
  it('신입가능: 5yr candidate scores 70 (mid, acceptable)', () => {
    assert.equal(scoreExperience('신입가능', 5), 70);
  });
  
  it('신입가능: 7yr candidate scores 70', () => {
    assert.equal(scoreExperience('신입가능', 7), 70);
  });
  
  it('신입가능: 10yr candidate scores 50 (senior, overqualified)', () => {
    assert.equal(scoreExperience('신입가능', 10), 50);
  });
  
  it('신입가능: 15yr candidate scores 50', () => {
    assert.equal(scoreExperience('신입가능', 15), 50);
  });
  
  it('신입 가능 (with space) works same as 신입가능', () => {
    assert.equal(scoreExperience('신입 가능', 0), 95);
    assert.equal(scoreExperience('신입 가능', 5), 70);
    assert.equal(scoreExperience('신입 가능', 10), 50);
  });
  
  it('신입가능 discriminates: 0yr vs 10yr gap is 45pts', () => {
    const gap = scoreExperience('신입가능', 0) - scoreExperience('신입가능', 10);
    assert.ok(gap >= 40, `Expected gap >= 40, got ${gap}`);
  });
  
  it('신입가능 0yr (95) > 경력 0yr (30): entry job prefers new grad', () => {
    assert.ok(scoreExperience('신입가능', 0) > scoreExperience('경력', 0));
  });
  
  it('신입가능 10yr (50) < 경력 10yr (90): entry job penalizes senior', () => {
    assert.ok(scoreExperience('신입가능', 10) < scoreExperience('경력', 10));
  });
});
