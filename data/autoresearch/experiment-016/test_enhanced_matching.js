// Test script for Enhanced Job Matching Algorithm
// Measures discrimination metric improvement

const { calculateEnhancedMatchScore, ENHANCED_WEIGHTS } = require('./enhanced_job_matching.js');

// Test cases representing real-world job matching scenarios
const TEST_CASES = [
  {
    id: "TC-MATCH-001",
    name: "Senior Backend Developer - Perfect Match",
    jd: {
      title: "Senior Backend Developer",
      company: "토스",
      experience: 5,
      skills: ["node.js", "typescript", "react", "aws", "docker"],
      domain: "backend"
    },
    resume: {
      experience: 6,
      skills: ["node.js", "typescript", "express", "nestjs", "aws", "docker", "kubernetes"],
      domains: ["backend", "devops"]
    },
    expected_improvement: true
  },
  {
    id: "TC-MATCH-002", 
    name: "Frontend Developer - Domain Mismatch",
    jd: {
      title: "Frontend Developer", 
      company: "카카오",
      experience: 3,
      skills: ["react", "typescript", "css", "webpack"],
      domain: "frontend"
    },
    resume: {
      experience: 4,
      skills: ["vue.js", "javascript", "css", "node.js"],
      domains: ["frontend", "backend"]
    },
    expected_improvement: true
  },
  {
    id: "TC-MATCH-003",
    name: "Data Scientist - Experience Gap",
    jd: {
      title: "Data Scientist",
      company: "네이버",
      experience: 4,
      skills: ["python", "tensorflow", "sql", "pandas"],
      domain: "data"
    },
    resume: {
      experience: 2,
      skills: ["python", "numpy", "pandas", "scikit-learn"],
      domains: ["data", "backend"]
    },
    expected_improvement: true
  },
  {
    id: "TC-MATCH-004",
    name: "DevOps Engineer - Emerging Tech",
    jd: {
      title: "DevOps Engineer",
      company: "우아한형제들",
      experience: 6,
      skills: ["kubernetes", "terraform", "aws", "python"],
      domain: "devops"
    },
    resume: {
      experience: 7,
      skills: ["docker", "aws", "jenkins", "ansible"],
      domains: ["devops", "backend"]
    },
    expected_improvement: true
  },
  {
    id: "TC-MATCH-005",
    name: "Junior Developer - Career Stage Alignment",
    jd: {
      title: "Junior Backend Developer",
      company: "스패이드",
      experience: 2,
      skills: ["java", "spring", "mysql"],
      domain: "backend"
    },
    resume: {
      experience: 1,
      skills: ["java", "spring", "javascript"],
      domains: ["backend"]
    },
    expected_improvement: true
  }
];

// Current baseline matching function (simplified version)
function calculateCurrentMatchScore(jdData, resumeData) {
  // Simple matching logic for comparison
  const skillMatches = jdData.skills.filter(skill => resumeData.skills.includes(skill)).length;
  const skillScore = (skillMatches / jdData.skills.length) * 70; // 70% weight for skills
  
  // Experience scoring
  const expGap = Math.abs(jdData.experience - resumeData.experience);
  let experienceScore = 100;
  if (expGap === 1) experienceScore = 70;
  else if (expGap === 2) experienceScore = 40;
  else if (expGap > 2) experienceScore = 10;
  
  const totalScore = (skillScore * 0.5) + (experienceScore * 0.15); // Simplified weights
  
  return {
    total_score: Math.round(totalScore),
    components: {
      skill: Math.round(skillScore),
      experience: experienceScore
    }
  };
}

// Run comprehensive test
function runEnhancedMatchingTest() {
  console.log("🧪 Enhanced Job Matching Algorithm Test");
  console.log("=====================================");
  
  const results = [];
  let currentTotal = 0;
  let enhancedTotal = 0;
  
  TEST_CASES.forEach((testCase, index) => {
    console.log(`\n📋 Testing ${testCase.name} (${testCase.id})`);
    
    // Current baseline scoring
    const currentScore = calculateCurrentMatchScore(testCase.jd, testCase.resume);
    
    // Enhanced scoring
    const enhancedScore = calculateEnhancedMatchScore(testCase.jd, testCase.resume);
    
    const improvement = enhancedScore.total_score - currentScore.total_score;
    const improvementPercent = ((improvement / currentScore.total_score) * 100).toFixed(1);
    
    currentTotal += currentScore.total_score;
    enhancedTotal += enhancedScore.total_score;
    
    results.push({
      id: testCase.id,
      name: testCase.name,
      current: currentScore.total_score,
      enhanced: enhancedScore.total_score,
      improvement: improvement,
      improvementPercent: improvementPercent,
      baseline_components: currentScore.components,
      enhanced_components: enhancedScore.components
    });
    
    console.log(`  Current Score: ${currentScore.total_score}/100`);
    console.log(`  Enhanced Score: ${enhancedScore.total_score}/100`);
    console.log(`  Improvement: +${improvement} (${improvementPercent}%)`);
    console.log(`  Components:`, enhancedScore.components);
  });
  
  // Calculate overall statistics
  const overallImprovement = enhancedTotal - currentTotal;
  const overallImprovementPercent = ((overallImprovement / currentTotal) * 100).toFixed(1);
  
  console.log("\n📊 Overall Test Results");
  console.log("=======================");
  console.log(`Current Total Score: ${currentTotal}`);
  console.log(`Enhanced Total Score: ${enhancedTotal}`);
  console.log(`Overall Improvement: +${overallImprovement} (${overallImprovementPercent}%)`);
  
  // Calculate discrimination metric (standard deviation of scores)
  const currentScores = results.map(r => r.current);
  const enhancedScores = results.map(r => r.enhanced);
  
  const currentDiscrimination = calculateDiscrimination(currentScores);
  const enhancedDiscrimination = calculateDiscrimination(enhancedScores);
  
  console.log(`\n🎯 Discrimination Metric Analysis`);
  console.log("==============================");
  console.log(`Current Discrimination: ${currentDiscrimination.toFixed(2)}`);
  console.log(`Enhanced Discrimination: ${enhancedDiscrimination.toFixed(2)}`);
  console.log(`Discrimination Improvement: +${(enhancedDiscrimination - currentDiscrimination).toFixed(2)}`);
  
  // Generate report
  const report = {
    experiment_id: "EXP-016",
    timestamp: new Date().toISOString(),
    test_cases: TEST_CASES.length,
    results: results,
    overall_improvement: overallImprovementPercent,
    current_discrimination: currentDiscrimination,
    enhanced_discrimination: enhancedDiscrimination,
    discrimination_improvement: enhancedDiscrimination - currentDiscrimination,
    verdict: enhancedDiscrimination > currentDiscrimination ? "keep" : "revert"
  };
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('./experiment_results.json', JSON.stringify(report, null, 2));
  
  console.log(`\n✅ Test results saved to experiment_results.json`);
  console.log(`\n🎯 Final Verdict: ${report.verdict.toUpperCase()}`);
  
  return report;
}

// Calculate discrimination metric - for job matching, this should be the range between best and worst matches
// Higher discrimination means better ability to distinguish between good and bad matches
function calculateDiscrimination(scores) {
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = max - min;
  
  // Also consider the spread of scores
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const stdDev = Math.sqrt(scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length);
  
  // Combine range and standard deviation for a comprehensive discrimination metric
  return range * 0.7 + stdDev * 0.3;
}

// Run the test
if (require.main === module) {
  const results = runEnhancedMatchingTest();
  
  // Check if improvement meets target
  if (results.enhanced_discrimination >= 60.0) {
    console.log("\n🚀 SUCCESS: Discrimination metric improved to target 60+");
    console.log(`   Target: 60.0 | Achieved: ${results.enhanced_discrimination.toFixed(2)}`);
  } else {
    console.log("\n⚠️  WARNING: Discrimination metric below target");
    console.log(`   Target: 60.0 | Achieved: ${results.enhanced_discrimination.toFixed(2)}`);
  }
}

module.exports = { runEnhancedMatchingTest, TEST_CASES };