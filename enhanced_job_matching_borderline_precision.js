// Enhanced Job Matching with Improved Borderline Precision
// Integration of EXP-180: borderline-case-precision-improvement

const fs = require('fs');
const path = require('path');

// Enhanced borderline detection with graduated thresholds and context-aware adjustments
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

// Enhanced scoring function with precision improvements
function enhancedJobScore(job, candidate) {
  // Calculate base components
  const skillComponent = calculateSkillComponent(job, candidate);
  const experienceComponent = calculateExperienceComponent(job, candidate);
  const cultureComponent = calculateCultureComponent(job, candidate);
  const careerStageComponent = calculateCareerStageComponent(job, candidate);
  const locationWorkComponent = calculateLocationWorkComponent(job, candidate);
  
  // Calculate raw scores
  const skillScore = skillComponent.score;
  const experienceScore = experienceComponent.score;
  
  // Apply existing skill-gate logic
  const skillGate = calculateSkillGate(skillScore);
  const gatedExperienceScore = experienceScore * skillGate;
  const gatedCultureScore = cultureComponent.score * skillGate;
  const gatedCareerStageScore = careerStageComponent.score * skillGate;
  const gatedLocationWorkScore = locationWorkComponent.score * skillGate;
  
  // Calculate weighted total
  const totalScore = 
    (skillScore * 0.4) +
    (gatedExperienceScore * 0.2) +
    (gatedCultureScore * 0.15) +
    (gatedCareerStageScore * 0.15) +
    (gatedLocationWorkScore * 0.1);
  
  // Get context information
  const context = getContextInfo(job, candidate);
  
  // Apply enhanced borderline detection
  const borderlineInfo = enhancedBorderlineDetection(totalScore, skillScore, experienceScore, context);
  
  // Apply graduated adjustments for borderline cases
  let finalScore = totalScore;
  if (borderlineInfo.isBorderline) {
    // Smoother transition for borderline cases
    const experienceBonus = Math.min(5, (experienceScore - 70) * 0.1);
    const domainBonus = context.jobDomain === candidate.primaryDomain ? 2 : 0;
    finalScore = totalScore + experienceBonus + domainBonus;
  }
  
  return {
    totalScore: Math.round(finalScore * 100) / 100,
    components: {
      skill: skillComponent,
      experience: experienceComponent,
      culture: cultureComponent,
      careerStage: careerStageComponent,
      locationWork: locationWorkComponent
    },
    skillGate: skillGate,
    borderlineInfo: borderlineInfo,
    context: context,
    isBorderline: borderlineInfo.isBorderline
  };
}

// Enhanced component calculation functions (simplified for testing)
function calculateSkillComponent(job, candidate) {
  // Simplified skill calculation - would use existing logic in practice
  const jobSkills = job.skills || [];
  const candidateSkills = candidate.skills || [];
  
  if (jobSkills.length === 0 || candidateSkills.length === 0) {
    return { score: 50, matched: [], missing: [], notes: 'No skills data' };
  }
  
  // Calculate skill overlap
  let matched = 0;
  jobSkills.forEach(jobSkill => {
    if (candidateSkills.some(candidateSkill => isSkillMatch(jobSkill, candidateSkill))) {
      matched++;
    }
  });
  
  const score = Math.round((matched / jobSkills.length) * 100);
  return {
    score: score,
    matched: jobSkills.filter(skill => candidateSkills.some(cSkill => isSkillMatch(skill, cSkill))),
    missing: jobSkills.filter(skill => !candidateSkills.some(cSkill => isSkillMatch(skill, cSkill))),
    notes: `${matched}/${jobSkills.length} skills matched`
  };
}

function calculateExperienceComponent(job, candidate) {
  // Simplified experience calculation
  const jobExperience = job.experience || '경력';
  const candidateYears = candidate.experienceYears || 0;
  
  // Existing experience scoring logic
  if (jobExperience === '신입') {
    if (candidateYears <= 1) return { score: 95, notes: 'Perfect match for new graduate' };
    if (candidateYears <= 3) return { score: 65, notes: 'Junior overqualified' };
    return { score: 40, notes: 'Senior overqualified' };
  }
  
  if (jobExperience === '신입가능' || jobExperience === '신입 가능') {
    if (candidateYears <= 1) return { score: 95, notes: 'Perfect match' };
    if (candidateYears <= 3) return { score: 80, notes: 'Good match' };
    if (candidateYears <= 7) return { score: 70, notes: 'Acceptable match' };
    return { score: 50, notes: 'Senior overqualified' };
  }
  
  if (jobExperience === '경력무관') {
    return { score: 80, notes: 'Experience not a factor' };
  }
  
  // Default case
  return { score: Math.min(95, 50 + candidateYears * 10), notes: 'Experience match' };
}

function calculateCultureComponent(job, candidate) {
  // Simplified culture calculation
  const jobCulture = job.cultureKeywords || [];
  const candidateCulture = candidate.culturalPreferences || [];
  
  if (jobCulture.length === 0 || candidateCulture.length === 0) {
    return { score: 50, notes: 'No culture data' };
  }
  
  const matched = jobCulture.filter(culture => candidateCulture.includes(culture));
  const score = Math.round((matched.length / jobCulture.length) * 100);
  
  return {
    score: score,
    matched: matched,
    missing: jobCulture.filter(culture => !candidateCulture.includes(culture)),
    notes: `${matched.length}/${jobCulture.length} culture preferences matched`
  };
}

function calculateCareerStageComponent(job, candidate) {
  // Simplified career stage calculation
  const jobStage = job.careerStage || 'mid';
  const candidateStage = candidate.careerStage || 'mid';
  
  if (jobStage === candidateStage) {
    return { score: 95, notes: 'Perfect career stage match' };
  }
  
  // Allow some flexibility
  if ((jobStage === 'entry' && candidateStage === 'junior') ||
      (jobStage === 'junior' && candidateStage === 'mid') ||
      (jobStage === 'mid' && candidateStage === 'senior')) {
    return { score: 80, notes: 'Adjacent career stage match' };
  }
  
  return { score: 60, notes: 'Career stage mismatch' };
}

function calculateLocationWorkComponent(job, candidate) {
  // Simplified location/work calculation
  const jobLocation = job.location || '';
  const jobWorkType = job.workType || 'regular';
  const candidateLocation = candidate.preferences?.location || '';
  const candidateWorkType = candidate.preferences?.workType || 'regular';
  
  let locationScore = 50;
  let workTypeScore = 50;
  
  // Location scoring (simplified)
  if (candidateLocation && jobLocation.includes(candidateLocation)) {
    locationScore = 100;
  }
  
  // Work type scoring
  if (candidateWorkType === jobWorkType) {
    workTypeScore = 100;
  }
  
  return {
    score: Math.round((locationScore + workTypeScore) / 2),
    notes: 'Location and work type match'
  };
}

// Helper functions
function calculateSkillGate(skillScore) {
  if (skillScore >= 40) return 1.0;
  return 0.12 + 0.88 * Math.pow(skillScore / 40, 2);
}

function getContextInfo(job, candidate) {
  return {
    jobDomain: detectJobDomain(job),
    candidatePrimaryDomain: detectCandidateDomain(candidate),
    isCareerTransition: detectCareerTransition(job, candidate),
    salaryMisalignment: detectSalaryMisalignment(job, candidate)
  };
}

function detectJobDomain(job) {
  const infrastructureSkills = ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'Ansible'];
  const jsSkills = ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js'];
  const pythonSkills = ['Python', 'Django', 'Flask', 'FastAPI'];
  
  if (job.skills?.some(skill => infrastructureSkills.includes(skill))) {
    return 'infrastructure';
  }
  if (job.skills?.some(skill => jsSkills.includes(skill))) {
    return 'javascript';
  }
  if (job.skills?.some(skill => pythonSkills.includes(skill))) {
    return 'python';
  }
  return 'general';
}

function detectCandidateDomain(candidate) {
  const infrastructureSkills = ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'Ansible'];
  const jsSkills = ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Node.js'];
  const pythonSkills = ['Python', 'Django', 'Flask', 'FastAPI'];
  
  if (candidate.skills?.some(skill => infrastructureSkills.includes(skill))) {
    return 'infrastructure';
  }
  if (candidate.skills?.some(skill => jsSkills.includes(skill))) {
    return 'javascript';
  }
  if (candidate.skills?.some(skill => pythonSkills.includes(skill))) {
    return 'python';
  }
  return 'general';
}

function detectCareerTransition(job, candidate) {
  const jobStage = job.careerStage || 'mid';
  const candidateStage = candidate.careerStage || 'mid';
  const candidateYears = candidate.experienceYears || 0;
  
  return jobStage !== candidateStage && candidateYears >= 5;
}

function detectSalaryMisalignment(job, candidate) {
  if (job.salary_max && candidate.preferences?.salary_range) {
    const jobAvg = (job.salary_min + job.salary_max) / 2;
    const candidateMax = candidate.preferences.salary_range.max;
    return jobAvg > candidateMax * 1.5;
  }
  return false;
}

function isSkillMatch(skill1, skill2) {
  // Simplified skill matching - would use sophisticated mapping in practice
  return skill1.toLowerCase() === skill2.toLowerCase() ||
         skillSynonyms[skill1.toLowerCase()]?.includes(skill2.toLowerCase()) ||
         skillSynonyms[skill2.toLowerCase()]?.includes(skill1.toLowerCase());
}

const skillSynonyms = {
  'react': ['reactjs', 'react.js'],
  'vue': ['vuejs', 'vue.js'],
  'angular': ['angularjs'],
  'node': ['node.js', 'nodejs'],
  'typescript': ['ts', 'tsx'],
  'javascript': ['js', 'ecmascript'],
  'python': ['py'],
  'java': ['jdk'],
  'docker': ['docker.io', 'docker-ce'],
  'kubernetes': ['k8s', 'kubernetes.io'],
  'aws': ['amazon web services', 'amazonaws']
};

// Comprehensive test suite
function runComprehensiveTests() {
  const testJobs = [
    {
      id: 'BORDERLINE-1',
      title: '중급 백엔드 개발자',
      company: '테크스타트',
      skills: ['JavaScript', 'Node.js', 'Express'],
      experience: '경력',
      careerStage: 'mid',
      location: '서울',
      workType: 'regular',
      salary_min: 4000,
      salary_max: 6000
    },
    {
      id: 'BORDERLINE-2',
      title: 'DevOps 엔지니어',
      company: '인프라테크',
      skills: ['Docker', 'Kubernetes', 'AWS'],
      experience: '경력',
      careerStage: 'mid',
      location: '판교',
      workType: 'regular',
      salary_min: 5500,
      salary_max: 8000
    },
    {
      id: 'LOW-1',
      title: '주니어 프론트엔드 개발자',
      company: '스타트업A',
      skills: ['HTML', 'CSS', 'jQuery'],
      experience: '신입',
      careerStage: 'entry',
      location: '서울',
      workType: 'regular'
    },
    {
      id: 'HIGH-1',
      title: '시니어 React 개발자',
      company: '테크코퍼레이션',
      skills: ['React', 'TypeScript', 'Next.js', 'GraphQL'],
      experience: '경력',
      careerStage: 'senior',
      location: '강남',
      workType: 'hybrid',
      salary_min: 7000,
      salary_max: 10000
    }
  ];

  const testCandidates = [
    {
      id: 'CAND-1',
      name: '이개발',
      skills: ['JavaScript', 'Node.js', 'MongoDB'],
      experienceYears: 4,
      careerStage: 'mid',
      culturalPreferences: ['혁신', '협업'],
      preferences: {
        location: '서울',
        workType: 'regular',
        salary_range: { min: 4000, max: 6000 }
      }
    },
    {
      id: 'CAND-2',
      name: '김인프라',
      skills: ['Docker', 'Jenkins', 'Linux'],
      experienceYears: 6,
      careerStage: 'mid',
      culturalPreferences: ['체계', '학습'],
      preferences: {
        location: '판교',
        workType: 'regular',
        salary_range: { min: 5000, max: 7000 }
      }
    },
    {
      id: 'CAND-3',
      name: '초보개발자',
      skills: ['HTML', 'CSS', 'JavaScript'],
      experienceYears: 1,
      careerStage: 'junior',
      culturalPreferences: ['학습'],
      preferences: {
        location: '서울',
        workType: 'regular',
        salary_range: { min: 3000, max: 4000 }
      }
    },
    {
      id: 'CAND-4',
      name: '시니리액트',
      skills: ['React', 'TypeScript', 'Next.js', 'GraphQL', 'Redux'],
      experienceYears: 8,
      careerStage: 'senior',
      culturalPreferences: ['자율', '성장'],
      preferences: {
        location: '강남',
        workType: 'hybrid',
        salary_range: { min: 6000, max: 9000 }
      }
    }
  ];

  console.log('🧪 Enhanced Job Matching with Borderline Precision Improvement\n');
  
  const results = [];
  
  testJobs.forEach(job => {
    console.log(`\n📋 Job: ${job.title} (${job.company})`);
    console.log('='.repeat(50));
    
    testCandidates.forEach(candidate => {
      const result = enhancedJobScore(job, candidate);
      console.log(`\n👤 Candidate: ${candidate.name}`);
      console.log(`Total Score: ${result.totalScore}`);
      console.log(`Borderline: ${result.isBorderline ? 'Yes' : 'No'}`);
      if (result.isBorderline) {
        console.log(`Borderline Threshold: ${result.borderlineInfo.borderlineThreshold}`);
        console.log(`Adjustment: ${result.borderlineInfo.adjustment}`);
        console.log('Context Factors:', result.borderlineInfo.contextFactors);
      }
      console.log('-'.repeat(30));
      
      results.push({
        job: job.id,
        candidate: candidate.id,
        score: result.totalScore,
        borderline: result.isBorderline,
        context: result.context
      });
    });
  });
  
  // Analyze results
  analyzeResults(results);
}

function analyzeResults(results) {
  console.log('\n📊 Analysis Results');
  console.log('='.repeat(50));
  
  const borderlineCases = results.filter(r => r.borderline);
  const lowScores = results.filter(r => r.score <= 25);
  const highScores = results.filter(r => r.score >= 70);
  
  console.log(`Total matches: ${results.length}`);
  console.log(`Borderline cases: ${borderlineCases.length} (${Math.round(borderlineCases.length/results.length*100)}%)`);
  console.log(`Low scores (≤25): ${lowScores.length} (${Math.round(lowScores.length/results.length*100)}%)`);
  console.log(`High scores (≥70): ${highScores.length} (${Math.round(highScores.length/results.length*100)}%)`);
  
  if (borderlineCases.length > 0) {
    const avgBorderlineScore = borderlineCases.reduce((sum, r) => sum + r.score, 0) / borderlineCases.length;
    console.log(`\nAverage borderline score: ${avgBorderlineScore.toFixed(2)}`);
    console.log('Borderline cases:', borderlineCases.map(r => `${r.job}-${r.candidate}: ${r.score}`));
  }
  
  // Check discrimination rules
  const highestScore = Math.max(...results.map(r => r.score));
  const lowestScore = Math.min(...results.map(r => r.score));
  const spread = highestScore - lowestScore;
  
  console.log(`\nDiscrimination Analysis:`);
  console.log(`Score range: ${lowestScore.toFixed(2)} - ${highestScore.toFixed(2)}`);
  console.log(`Spread: ${spread.toFixed(2)}`);
  
  if (spread >= 60) {
    console.log('✅ Good spread - HIGH and LOW groups are well separated');
  } else {
    console.log('⚠️  Limited spread - groups may overlap too much');
  }
}

// Run the comprehensive test
runComprehensiveTests();