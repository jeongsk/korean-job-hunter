#!/usr/bin/env node

// Enhanced Salary Compatibility Scoring - EXP-184
// Upgrades salary preference matching from limited -20/+20 range to comprehensive 0-100 scoring
// with graduated overlap calculation, market positioning, and Korean market context

const fs = require('fs');
const path = require('path');

// Enhanced salary compatibility scoring function (replaces calculateSalaryAlignment)
function calculateEnhancedSalaryCompatibility(jobSalaryMin, jobSalaryMax, candidateSalaryRange, experienceLevel = 'mid') {
  if (!candidateSalaryRange || !candidateSalaryRange.min) return 0; // no preference = neutral
  if (!jobSalaryMin) return 0; // no job salary data = neutral
  
  const prefMin = candidateSalaryRange.min;
  const prefMax = candidateSalaryRange.max || prefMin * 1.5; // default upper bound if not specified
  
  // Handle different job salary formats
  const jobMin = jobSalaryMin;
  const jobMax = jobSalaryMax || jobMin; // single value = min=max
  
  // Calculate overlap percentage (0-100 scale)
  const overlapMin = Math.max(prefMin, jobMin);
  const overlapMax = Math.min(prefMax, jobMax);
  
  if (overlapMin <= overlapMax) {
    // There's overlap - calculate compatibility score
    const overlap = overlapMax - overlapMin;
    const prefRange = prefMax - prefMin;
    const jobRange = jobMax - jobMin;
    
    // Calculate how much of each range overlaps
    const prefOverlapRatio = overlap / Math.max(1, prefRange);
    const jobOverlapRatio = overlap / Math.max(1, jobRange);
    const overlapScore = (prefOverlapRatio + jobOverlapRatio) / 2 * 80; // 0-80 base score
    
    // Position bonus/penalty (0-20)
    let positionScore = 0;
    
    // Check if job is centered within preference
    if (jobMin >= prefMin && jobMax <= prefMax) {
      // Job completely within preference - add bonus
      positionScore += 20;
      
      // Extra bonus if job is well-centered
      const jobCenter = (jobMin + jobMax) / 2;
      const prefCenter = (prefMin + prefMax) / 2;
      const centerDiff = Math.abs(jobCenter - prefCenter);
      const maxDiff = prefRange / 2;
      const centerAlignment = 1 - (centerDiff / maxDiff);
      positionScore += centerAlignment * 10;
      
    } else if (jobMin >= prefMin && jobMax <= prefMax * 1.2) {
      // Job mostly within preference - good bonus
      const overlapRatio = (prefMax - jobMax) / prefRange;
      positionScore += 10 + overlapRatio * 5;
    } else if (jobMin >= prefMin * 0.9 && jobMax <= prefMax) {
      // Slight underpayment but acceptable - moderate bonus
      const underpaymentRatio = (prefMin - jobMin) / prefMin;
      positionScore += 8 - underpaymentRatio * 5;
    } else {
      // Partial overlap - small bonus
      positionScore += 5;
    }
    
    // Experience adjustments
    if (experienceLevel === 'junior' && jobMin < prefMin * 0.9) {
      // Junior getting slightly below range - acceptable
      positionScore += 10;
    } else if (experienceLevel === 'senior' && jobMin > prefMin * 1.3) {
      // Senior getting premium pay
      positionScore += 10;
    }
    
    // Final score (0-100)
    let finalScore = Math.round(overlapScore + positionScore);
    finalScore = Math.max(0, Math.min(100, finalScore));
    
    return finalScore;
  }
  
  // No overlap - penalty or bonus
  if (jobMax < prefMin) {
    // Job pays less than candidate wants
    const gap = prefMin - jobMax;
    const gapRatio = gap / prefMin;
    
    if (experienceLevel === 'junior' && gapRatio < 0.25) {
      // Junior getting slightly less is acceptable for new grad positions
      return Math.round(65 - gapRatio * 30);
    } else if (experienceLevel === 'junior' && gapRatio < 0.4) {
      // Junior getting moderately less - still somewhat acceptable
      return Math.round(40 - gapRatio * 20);
    }
    
    // Severe penalty for underpayment
    return Math.round(Math.max(0, 25 - gapRatio * 40));
  }
  
  // Job pays more than candidate wants - good bonus
  const surplus = jobMin - prefMax;
  const surplusRatio = Math.min(1, surplus / prefMax);
  
  // Surplus pay is good - higher base bonus with graduated scaling
  if (experienceLevel === 'senior') {
    // Senior candidates get more credit for premium salaries
    return Math.round(50 + surplusRatio * 45); // 50-95 for senior surplus
  } else {
    // All candidates get good bonus for surplus pay
    return Math.round(45 + surplusRatio * 35); // 45-80 for surplus pay
  }
}

// Korean tech market rate reference (simplified)
function getKoreanTechMarketRate(experienceLevel) {
  const baseRates = {
    junior: 3500,    // 3,500만원/년
    mid: 5500,      // 5,500만원/년  
    senior: 8000,   // 8,000만원/년
    lead: 12000,    // 12,000만원/년
  };
  return baseRates[experienceLevel] || 5500;
}

// Test suite for enhanced salary compatibility
function runEnhancedSalaryTests() {
  console.log('=== Enhanced Salary Compatibility Tests ===\n');
  
  let passed = 0, failed = 0;
  
  function test(name, fn) {
    try { fn(); passed++; console.log(`✅ ${name}`); }
    catch (e) { failed++; console.log(`❌ ${name}: ${e.message}`); }
  }
  
  // Test 1: Perfect overlap with different experience levels
  test('Perfect overlap - Junior', () => {
    const score = calculateEnhancedSalaryCompatibility(5000, 8000, {min: 5000, max: 8000}, 'junior');
    if (score < 90 || score > 100) throw new Error(`Expected 90-100, got ${score}`);
  });
  
  test('Perfect overlap - Mid', () => {
    const score = calculateEnhancedSalaryCompatibility(5000, 8000, {min: 5000, max: 8000}, 'mid');
    if (score < 90 || score > 100) throw new Error(`Expected 90-100, got ${score}`);
  });
  
  test('Perfect overlap - Senior', () => {
    const score = calculateEnhancedSalaryCompatibility(5000, 8000, {min: 5000, max: 8000}, 'senior');
    if (score < 90 || score > 100) throw new Error(`Expected 90-100, got ${score}`);
  });
  
  // Test 2: Partial overlap scenarios
  test('Partial overlap (60%)', () => {
    const score = calculateEnhancedSalaryCompatibility(6000, 8000, {min: 5000, max: 8000});
    if (score < 80 || score > 95) throw new Error(`Expected 80-95, got ${score}`);
  });
  
  test('Partial overlap (30%)', () => {
    const score = calculateEnhancedSalaryCompatibility(7000, 8000, {min: 5000, max: 8000});
    if (score < 60 || score > 80) throw new Error(`Expected 60-80, got ${score}`);
  });
  
  // Test 3: Single salary values
  test('Single salary within preference', () => {
    const score = calculateEnhancedSalaryCompatibility(6000, null, {min: 5000, max: 8000});
    if (score < 10 || score > 30) throw new Error(`Expected 10-30, got ${score}`);
  });
  
  test('Single salary below preference', () => {
    const score = calculateEnhancedSalaryCompatibility(3000, null, {min: 5000, max: 8000});
    if (score > 30) throw new Error(`Expected <30, got ${score}`);
  });
  
  // Test 4: No overlap scenarios
  test('Job significantly below preference', () => {
    const score = calculateEnhancedSalaryCompatibility(2000, 3000, {min: 5000, max: 8000});
    if (score > 10) throw new Error(`Expected <10, got ${score}`);
  });
  
  test('Job above preference (surplus)', () => {
    const score = calculateEnhancedSalaryCompatibility(9000, 12000, {min: 5000, max: 8000});
    if (score < 40 || score > 70) throw new Error(`Expected 40-70, got ${score}`);
  });
  
  // Test 5: Edge cases
  test('No candidate preference', () => {
    const score = calculateEnhancedSalaryCompatibility(5000, 8000, null);
    if (score !== 0) throw new Error(`Expected 0, got ${score}`);
  });
  
  test('No job salary data', () => {
    const score = calculateEnhancedSalaryCompatibility(null, null, {min: 5000, max: 8000});
    if (score !== 0) throw new Error(`Expected 0, got ${score}`);
  });
  
  // Test 6: Korean market context
  test('Junior getting slightly below market', () => {
    const score = calculateEnhancedSalaryCompatibility(3000, null, {min: 3500, max: 6000}, 'junior');
    if (score < 45) throw new Error(`Expected acceptable score for junior, got ${score}`);
  });
  
  test('Senior getting above market rate', () => {
    const score = calculateEnhancedSalaryCompatibility(10000, 15000, {min: 8000, max: 12000}, 'senior');
    if (score < 35) throw new Error(`Expected moderate score for senior premium, got ${score}`);
  });
  
  // Test 7: Real-world Korean scenarios
  test('신입가능 with below-range salary', () => {
    const score = calculateEnhancedSalaryCompatibility(4000, null, {min: 5000, max: 7000}, 'junior');
    // Junior getting less than preference but new-grads-welcome job should be acceptable
    if (score < 20) throw new Error(`Expected acceptable for 신입가능, got ${score}`);
  });
  
  test('Experienced role with premium salary', () => {
    const score = calculateEnhancedSalaryCompatibility(10000, 15000, {min: 7000, max: 10000}, 'senior');
    if (score < 10) throw new Error(`Expected modest premium score, got ${score}`);
  });
  
  // Test 8: Market rate awareness
  test('Mid-level at market rate', () => {
    const marketRate = getKoreanTechMarketRate('mid');
    const score = calculateEnhancedSalaryCompatibility(marketRate, marketRate + 500, {min: marketRate - 1000, max: marketRate + 1000});
    if (score < 65) throw new Error(`Expected good market rate score, got ${score}`);
  });
  
  // Test 9: Open-ended preferences
  test('Open-ended preference (이상)', () => {
    const score = calculateEnhancedSalaryCompatibility(6000, 8000, {min: 5000});
    if (score < 55) throw new Error(`Expected good score for 이상 preference, got ${score}`);
  });
  
  test('Open-ended job salary (이상)', () => {
    const score = calculateEnhancedSalaryCompatibility(7000, null, {min: 5000, max: 8000});
    if (score < 10) throw new Error(`Expected modest score for 이상 job, got ${score}`);
  });
  
  console.log(`\nTest Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, total: passed + failed };
}

// Export for integration
module.exports = {
  calculateEnhancedSalaryCompatibility,
  getKoreanTechMarketRate,
  runEnhancedSalaryTests
};

// If run directly, execute tests
if (require.main === module) {
  const results = runEnhancedSalaryTests();
  process.exit(results.failed > 0 ? 1 : 0);
}