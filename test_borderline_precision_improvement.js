// Borderline Case Precision Improvement Experiment
// Hypothesis: Graduated borderline detection with context-aware adjustments improves precision

const fs = require('fs');
const path = require('path');

// Enhanced borderline detection with graduated thresholds
function enhancedBorderlineDetection(jobScore, skillScore, experienceScore, context) {
  const baseThreshold = 25; // LOW group maximum
    
  // Context-aware borderline adjustments
  let borderlineAdjustment = 0;
  
  // 1. Skill-based adjustment: Low skill scores with some experience get more lenient borderline
  if (skillScore < 30 && experienceScore >= 70) {
    borderlineAdjustment = -3; // Allow slightly higher borderline for experienced candidates with limited skills
  }
  
  // 2. Domain-specific adjustments for common borderline scenarios
  if (context.jobDomain === 'infrastructure' && context.candidatePrimaryDomain !== 'infrastructure') {
    borderlineAdjustment = -2; // Infrastructure-only jobs get more lenient for non-infrastructure candidates
  }
  
  // 3. Experience-based adjustment for career transition scenarios
  if (context.isCareerTransition && experienceScore >= 80) {
    borderlineAdjustment = -2; // Career transitions with high experience get more lenient
  }
  
  // 4. Salary-based adjustment for compensation misalignment
  if (context.salaryMisalignment && skillScore >= 40) {
    borderlineAdjustment = +2; // Skill inflation from high salary but domain mismatch
  }
  
  // Apply adjustment with bounds
  const adjustedThreshold = Math.max(20, Math.min(28, baseThreshold + borderlineAdjustment));
  
  return {
    isBorderline: jobScore > adjustedThreshold && jobScore < 65,
    borderlineThreshold: adjustedThreshold,
    adjustment: borderlineAdjustment,
    contextFactors: {
      skillAdjustment: skillScore < 30 && experienceScore >= 70 ? -3 : 0,
      domainAdjustment: context.jobDomain === 'infrastructure' ? -2 : 0,
      transitionAdjustment: context.isCareerTransition ? -2 : 0,
      salaryAdjustment: context.salaryMisalignment ? +2 : 0
    }
  };
}

// Enhanced scoring with precision improvements
function enhancedScoring(job, candidate) {
  const baseScore = calculateBaseScore(job, candidate);
  const skillScore = calculateSkillScore(job, candidate);
  const experienceScore = calculateExperienceScore(job, candidate);
  
  // Get context information
  const context = getContextInfo(job, candidate);
  
  // Apply enhanced borderline detection
  const borderlineInfo = enhancedBorderlineDetection(baseScore, skillScore, experienceScore, context);
  
  // Apply graduated skill gate for borderline cases
  let finalScore = baseScore;
  if (borderlineInfo.isBorderline) {
    // Smoother transition for borderline cases
    const skillGate = calculateSkillGate(skillScore);
    const experienceBonus = Math.min(5, (experienceScore - 70) * 0.1);
    finalScore = baseScore * skillGate + experienceBonus;
  }
  
  return {
    score: finalScore,
    borderlineInfo: borderlineInfo,
    context: context
  };
}

// Helper functions
function calculateBaseScore(job, candidate) {
  // Simplified base score calculation for testing
  return Math.random() * 100; // Placeholder
}

function calculateSkillScore(job, candidate) {
  // Simplified skill score calculation
  return Math.random() * 100; // Placeholder
}

function calculateExperienceScore(job, candidate) {
  // Simplified experience score calculation
  return Math.random() * 100; // Placeholder
}

function calculateSkillGate(skillScore) {
  if (skillScore >= 40) return 1.0;
  return 0.12 + 0.88 * Math.pow(skillScore / 40, 2);
}

function getContextInfo(job, candidate) {
  // Extract context information
  return {
    jobDomain: detectJobDomain(job),
    candidatePrimaryDomain: detectCandidateDomain(candidate),
    isCareerTransition: detectCareerTransition(job, candidate),
    salaryMisalignment: detectSalaryMisalignment(job, candidate)
  };
}

function detectJobDomain(job) {
  // Simplified domain detection
  if (job.skills?.some(skill => ['Docker', 'Kubernetes', 'AWS'].includes(skill))) {
    return 'infrastructure';
  }
  return 'general';
}

function detectCandidateDomain(candidate) {
  // Simplified candidate domain detection
  if (candidate.skills?.some(skill => ['Docker', 'Kubernetes', 'AWS'].includes(skill))) {
    return 'infrastructure';
  }
  return 'general';
}

function detectCareerTransition(job, candidate) {
  // Simplified career transition detection
  return job.careerStage !== candidate.careerStage && candidate.experienceYears >= 5;
}

function detectSalaryMisalignment(job, candidate) {
  // Simplified salary misalignment detection
  if (job.salary_max && candidate.preferences?.salary_range) {
    const jobAvg = (job.salary_min + job.salary_max) / 2;
    const candidateMax = candidate.preferences.salary_range.max;
    return jobAvg > candidateMax * 1.5;
  }
  return false;
}

// Test the enhanced borderline detection
function runTests() {
  const testCases = [
    {
      name: 'Experienced candidate with limited skills',
      job: { skills: ['HTML', 'CSS'], careerStage: 'mid' },
      candidate: { skills: ['HTML', 'CSS'], experienceYears: 8, careerStage: 'senior' },
      expectedBorderline: true
    },
    {
      name: 'Infrastructure job for non-infrastructure candidate',
      job: { skills: ['Docker', 'Kubernetes'], careerStage: 'mid' },
      candidate: { skills: ['React', 'JavaScript'], experienceYears: 5, careerStage: 'mid' },
      expectedBorderline: true
    },
    {
      name: 'Clear low match',
      job: { skills: ['Java', 'Spring'], careerStage: 'mid' },
      candidate: { skills: ['Python', 'Django'], experienceYears: 2, careerStage: 'junior' },
      expectedBorderline: false
    },
    {
      name: 'Clear high match',
      job: { skills: ['React', 'TypeScript'], careerStage: 'mid' },
      candidate: { skills: ['React', 'TypeScript', 'Next.js'], experienceYears: 4, careerStage: 'mid' },
      expectedBorderline: false
    }
  ];
  
  console.log('🧪 Testing Enhanced Borderline Detection...');
  
  testCases.forEach((testCase, index) => {
    const result = enhancedScoring(testCase.job, testCase.candidate);
    const isBorderline = result.borderlineInfo.isBorderline;
    
    console.log(`\nTest ${index + 1}: ${testCase.name}`);
    console.log(`Score: ${result.score.toFixed(2)}`);
    console.log(`Is Borderline: ${isBorderline} (Expected: ${testCase.expectedBorderline})`);
    console.log(`Borderline Threshold: ${result.borderlineInfo.borderlineThreshold}`);
    console.log(`Adjustment: ${result.borderlineInfo.adjustment}`);
    console.log('Context Factors:', result.borderlineInfo.contextFactors);
    
    if (isBorderline === testCase.expectedBorderline) {
      console.log('✅ PASS');
    } else {
      console.log('❌ FAIL');
    }
  });
}

// Run the tests
runTests();