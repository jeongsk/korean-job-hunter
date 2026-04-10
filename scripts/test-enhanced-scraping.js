#!/usr/bin/env node
// test-enhanced-scraping.js — Test enhanced scraping with retry logic and error handling
// Validates improvements in success rate and reliability compared to baseline.

const { scrapeWantedJobs, performHealthCheck } = require('./scrape-wanted-api-enhanced');
const fs = require('fs');
const path = require('path');

// Test keywords from the real-world scraping report
const TEST_KEYWORDS = [
  '백엔드 개발자',
  '프론트엔드 엔지니어', 
  'Node.js 개발자',
  'React 개발자'
];

// Configuration
const TEST_CONFIG = {
  limit: 10,
  timeout: 30000,
  maxRetries: 4
};

async function runEnhancedScrapingTest() {
  console.log('🧪 Starting Enhanced Scraping Test');
  console.log('================================');
  
  const results = {
    timestamp: new Date().toISOString(),
    test_type: 'enhanced_scraping',
    baseline_stats: {
      success_rate: 71.79,
      field_completeness: 100.0,
      total_tests: 39,
      passed_tests: 28,
      failed_tests: 11
    },
    enhanced_results: {
      total_tests: 0,
      successful_tests: 0,
      failed_tests: 0,
      jobs_collected: 0,
      field_completeness: 0,
      success_rate: 0,
      test_details: []
    }
  };
  
  // Health check first (proceed even if it fails)
  console.log('🔍 Performing pre-test health check...');
  const healthCheck = await performHealthCheck();
  if (!healthCheck) {
    console.log('⚠️  Health check failed - but proceeding with test anyway...');
  } else {
    console.log('✅ Health check passed\n');
  }
  
  // Run tests for each keyword
  for (const keyword of TEST_KEYWORDS) {
    console.log(`🎯 Testing keyword: "${keyword}"`);
    
    const testStart = Date.now();
    let testResult = {
      keyword,
      attempts: 0,
      success: false,
      jobs_collected: 0,
      error: null,
      duration: 0,
      retry_attempts: 0
    };
    
    try {
      const jobs = await scrapeWantedJobs(keyword, TEST_CONFIG.limit, 0, true);
      
      testResult.success = true;
      testResult.jobs_collected = jobs.length;
      testResult.duration = Date.now() - testStart;
      testResult.field_completeness = calculateFieldCompleteness(jobs);
      
      console.log(`✅ Success: ${jobs.length} jobs collected in ${testResult.duration}ms`);
      
    } catch (error) {
      testResult.success = false;
      testResult.error = error.message;
      testResult.duration = Date.now() - testStart;
      console.log(`❌ Failed: ${error.message}`);
    }
    
    results.enhanced_results.test_details.push(testResult);
    results.enhanced_results.total_tests++;
    
    if (testResult.success) {
      results.enhanced_results.successful_tests++;
      results.enhanced_results.jobs_collected += testResult.jobs_collected;
    } else {
      results.enhanced_results.failed_tests++;
    }
    
    // Calculate running averages
    results.enhanced_results.success_rate = 
      (results.enhanced_results.successful_tests / results.enhanced_results.total_tests) * 100;
    
    console.log(`\nProgress: ${results.enhanced_results.successful_tests}/${results.enhanced_results.total_tests} successful\n`);
    
    // Add delay between tests to be polite
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Final calculations
  if (results.enhanced_results.test_details.length > 0) {
    const avgFieldCompleteness = results.enhanced_results.test_details
      .filter(detail => detail.success)
      .reduce((sum, detail) => sum + (detail.field_completeness || 0), 0) / 
      results.enhanced_results.successful_tests;
    
    results.enhanced_results.field_completeness = avgFieldCompleteness;
  }
  
  // Generate summary
  generateTestSummary(results);
  
  return results;
}

function calculateFieldCompleteness(jobs) {
  if (jobs.length === 0) return 0;
  
  const requiredFields = ['id', 'title', 'company', 'url', 'source'];
  const optionalFields = ['experience', 'work_type', 'location', 'salary', 'skills'];
  
  let completenessScore = 0;
  let totalPossibleFields = requiredFields.length + (optionalFields.length * jobs.length);
  
  jobs.forEach(job => {
    // Required fields
    requiredFields.forEach(field => {
      if (job[field] !== undefined && job[field] !== null && job[field] !== '') {
        completenessScore++;
      }
    });
    
    // Optional fields
    optionalFields.forEach(field => {
      if (job[field] !== undefined && job[field] !== null && job[field] !== '') {
        completenessScore++;
      }
    });
  });
  
  return (completenessScore / totalPossibleFields) * 100;
}

function generateTestSummary(results) {
  console.log('\n📊 Enhanced Scraping Test Summary');
  console.log('==================================');
  
  const baseline = results.baseline_stats;
  const enhanced = results.enhanced_results;
  
  console.log(`Baseline Performance:`);
  console.log(`  Success Rate: ${baseline.success_rate.toFixed(2)}% (${baseline.passed_tests}/${baseline.total_tests})`);
  console.log(`  Field Completeness: ${baseline.field_completeness.toFixed(2)}%`);
  console.log(`  Failed Tests: ${baseline.failed_tests}\n`);
  
  console.log(`Enhanced Performance:`);
  console.log(`  Success Rate: ${enhanced.success_rate.toFixed(2)}% (${enhanced.successful_tests}/${enhanced.total_tests})`);
  console.log(`  Field Completeness: ${enhanced.field_completeness.toFixed(2)}%`);
  console.log(`  Jobs Collected: ${enhanced.jobs_collected}`);
  console.log(`  Failed Tests: ${enhanced.failed_tests}\n`);
  
  // Calculate improvement
  if (enhanced.success_rate > 0) {
    const improvement = enhanced.success_rate - baseline.success_rate;
    console.log(`📈 Improvement:`);
    console.log(`  Success Rate: ${improvement > 0 ? '+' : ''}${improvement.toFixed(2)} percentage points`);
    
    if (improvement > 0) {
      console.log(`  ✅ Enhanced scraping shows ${improvement.toFixed(2)}% improvement in success rate`);
    } else {
      console.log(`  ⚠️  Enhanced scraping shows ${Math.abs(improvement).toFixed(2)}% decrease in success rate`);
    }
  }
  
  // Detailed test results
  console.log('\n🔍 Detailed Test Results:');
  results.enhanced_results.test_details.forEach((detail, index) => {
    const status = detail.success ? '✅' : '❌';
    console.log(`  ${index + 1}. ${status} "${detail.keyword}" - ${detail.success ? `${detail.jobs_collected} jobs` : detail.error}`);
    if (detail.success && detail.field_completeness) {
      console.log(`     Field Completeness: ${detail.field_completeness.toFixed(2)}% | Duration: ${detail.duration}ms`);
    }
  });
  
  // Save results
  const resultsFile = path.join(__dirname, '../data/autoresearch/enhanced-scraping-test-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
}

// Run the test
if (require.main === module) {
  runEnhancedScrapingTest()
    .then(results => {
      const successRate = results.enhanced_results.success_rate;
      const baselineRate = results.baseline_stats.success_rate;
      
      if (successRate > baselineRate) {
        console.log('\n🎉 ENHANCED SCRAPING IMPROVEMENT VERIFIED!');
        console.log(`Success rate improved from ${baselineRate.toFixed(2)}% to ${successRate.toFixed(2)}%`);
        process.exit(0);
      } else {
        console.log('\n⚠️  Enhanced scraping did not improve success rate');
        console.log(`Expected >${baselineRate.toFixed(2)}%, got ${successRate.toFixed(2)}%`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runEnhancedScrapingTest, calculateFieldCompleteness };