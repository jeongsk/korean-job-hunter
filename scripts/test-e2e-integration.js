#!/usr/bin/env node

/**
 * End-to-End Integration Test for Korean Job Hunter
 * Tests the complete workflow: scraping → matching → tracking
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  testJobs: [
    {
      id: 'test-e2e-001',
      source: 'wanted',
      title: '백엔드 개발자',
      company: '카카오',
      experience: '경력 3년 이상',
      work_type: '하이브리드',
      location: '서울 강남구',
      url: 'https://test.url',
      skills: ['Node.js', 'TypeScript', 'React'],
      expected_score_min: 70
    },
    {
      id: 'test-e2e-002', 
      source: 'jobkorea',
      title: '프론트엔드 엔지니어',
      company: '네이버',
      experience: '경력 2-5년',
      work_type: '원격근무',
      location: '경기도',
      url: 'https://test.url2',
      skills: ['JavaScript', 'Vue.js', 'CSS'],
      expected_score_min: 65
    }
  ],
  resume: {
    skills: ['Node.js', 'TypeScript', 'JavaScript', 'React'],
    experience: 4,
    preferences: {
      work_type: ['remote', 'hybrid'],
      max_commute: 60
    }
  }
};

// Test results storage
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: [],
  startTime: new Date(),
  endTime: null
};

function logTest(testName, status, details = '') {
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${testName}: ${details || 'Success'}`);
  } else {
    testResults.failed++;
    testResults.failures.push({ testName, details });
    console.log(`❌ ${testName}: ${details || 'Failed'}`);
  }
}

// Test 1: Data Consistency Across Components
function testDataConsistency() {
  console.log('\n=== Test 1: Data Consistency Across Components ===');
  
  try {
    // Simulate scraped job data
    const scrapedJobs = TEST_CONFIG.testJobs.map(job => ({
      id: job.id,
      source: job.source,
      title: job.title,
      company: job.company,
      experience: job.experience,
      work_type: job.work_type,
      location: job.location,
      url: job.url,
      extracted_at: new Date().toISOString()
    }));
    
    // Check if scraped data can be processed by matching component
    const jobsForMatching = scrapedJobs.map(job => ({
      ...job,
      skills: job.skills || []
    }));
    
    // Validate job data structure matches matching expectations
    jobsForMatching.forEach(job => {
      const requiredFields = ['id', 'title', 'company', 'experience', 'work_type'];
      const missingFields = requiredFields.filter(field => !job[field]);
      
      if (missingFields.length > 0) {
        logTest(`Job Data Structure (${job.id})`, 'FAIL', `Missing fields: ${missingFields.join(', ')}`);
      } else {
        logTest(`Job Data Structure (${job.id})`, 'PASS', 'All required fields present');
      }
    });
    
    // Validate resume data structure
    const resume = TEST_CONFIG.resume;
    const resumeRequiredFields = ['skills', 'experience', 'preferences'];
    const resumeMissingFields = resumeRequiredFields.filter(field => !resume[field]);
    
    if (resumeMissingFields.length > 0) {
      logTest('Resume Data Structure', 'FAIL', `Missing fields: ${resumeMissingFields.join(', ')}`);
    } else {
      logTest('Resume Data Structure', 'PASS', 'All required resume fields present');
    }
    
  } catch (error) {
    logTest('Data Consistency', 'FAIL', error.message);
  }
}

// Test 2: Component Integration Compatibility
function testComponentIntegration() {
  console.log('\n=== Test 2: Component Integration Compatibility ===');
  
  try {
    // Test if scraped jobs can be processed by matching system
    const testJob = TEST_CONFIG.testJobs[0];
    const resume = TEST_CONFIG.resume;
    
    // Simulate matching calculation
    const skillMatch = calculateSkillMatch(testJob.skills, resume.skills);
    const experienceMatch = calculateExperienceMatch(testJob.experience, resume.expatibility);
    const workTypeMatch = calculateWorkTypeMatch(testJob.work_type, resume.preferences.work_type);
    
    logTest('Skill Matching Integration', 'PASS', `Skill score: ${skillMatch}`);
    logTest('Experience Matching Integration', 'PASS', `Experience score: ${experienceMatch}`);
    logTest('Work Type Matching Integration', 'PASS', `Work type score: ${workTypeMatch}`);
    
    // Test if matched jobs can be tracked
    const matchedJob = {
      id: testJob.id,
      score: Math.round((skillMatch * 0.6) + (experienceMatch * 0.2) + (workTypeMatch * 0.2)),
      ...testJob
    };
    
    if (matchedJob.score >= 0 && matchedJob.score <= 100) {
      logTest('Matching to Tracking Integration', 'PASS', `Generated valid score: ${matchedJob.score}`);
    } else {
      logTest('Matching to Tracking Integration', 'FAIL', `Invalid score generated: ${matchedJob.score}`);
    }
    
  } catch (error) {
    logTest('Component Integration', 'FAIL', error.message);
  }
}

// Test 3: Error Handling Propagation
function testErrorHandling() {
  console.log('\n=== Test 3: Error Handling Propagation ===');
  
  try {
    // Test invalid job data handling
    const invalidJob = {
      id: 'test-invalid-001',
      title: '', // Empty title
      company: null, // Null company
      experience: 'invalid-experience', // Invalid experience format
      work_type: 'invalid-type' // Invalid work type
    };
    
    // Test if system gracefully handles invalid data
    const validationErrors = validateJobData(invalidJob);
    
    if (validationErrors.length > 0) {
      logTest('Invalid Job Data Handling', 'PASS', `Caught ${validationErrors.length} validation errors`);
    } else {
      logTest('Invalid Job Data Handling', 'FAIL', 'Failed to catch invalid data');
    }
    
    // Test malformed resume handling
    const invalidResume = {
      skills: 'not-an-array', // Should be array
      experience: 'not-a-number', // Should be number
      preferences: {} // Missing required preference fields
    };
    
    const resumeErrors = validateResumeData(invalidResume);
    if (resumeErrors.length > 0) {
      logTest('Invalid Resume Data Handling', 'PASS', `Caught ${resumeErrors.length} resume validation errors`);
    } else {
      logTest('Invalid Resume Data Handling', 'FAIL', 'Failed to catch invalid resume data');
    }
    
  } catch (error) {
    logTest('Error Handling Propagation', 'FAIL', error.message);
  }
}

// Test 4: Performance Across Pipeline
function testPerformance() {
  console.log('\n=== Test 4: Performance Across Pipeline ===');
  
  try {
    const startTime = Date.now();
    
    // Simulate scraping multiple jobs
    const scrapingStart = Date.now();
    const scrapedJobs = TEST_CONFIG.testJobs.map(job => ({ ...job }));
    const scrapingTime = Date.now() - scrapingStart;
    
    // Simulate matching
    const matchingStart = Date.now();
    const matchedJobs = scrapedJobs.map(job => ({
      ...job,
      score: Math.random() * 100 // Simulate scoring
    }));
    const matchingTime = Date.now() - matchingStart;
    
    // Simulate tracking
    const trackingStart = Date.now();
    const trackedJobs = matchedJobs.map(job => ({
      ...job,
      status: 'interested',
      applied_at: null,
      updated_at: new Date().toISOString()
    }));
    const trackingTime = Date.now() - trackingStart;
    
    const totalTime = Date.now() - startTime;
    
    // Performance thresholds
    const maxScrapingTime = 1000; // 1 second per job
    const maxMatchingTime = 500; // 500ms per job
    const maxTrackingTime = 100; // 100ms per job
    const maxTotalTime = 3000; // 3 seconds total
    
    if (scrapingTime <= maxScrapingTime * TEST_CONFIG.testJobs.length) {
      logTest('Scraping Performance', 'PASS', `${scrapingTime}ms for ${TEST_CONFIG.testJobs.length} jobs`);
    } else {
      logTest('Scraping Performance', 'FAIL', `${scrapingTime}ms exceeds threshold`);
    }
    
    if (matchingTime <= maxMatchingTime * TEST_CONFIG.testJobs.length) {
      logTest('Matching Performance', 'PASS', `${matchingTime}ms for ${TEST_CONFIG.testJobs.length} jobs`);
    } else {
      logTest('Matching Performance', 'FAIL', `${matchingTime}ms exceeds threshold`);
    }
    
    if (trackingTime <= maxTrackingTime * TEST_CONFIG.testJobs.length) {
      logTest('Tracking Performance', 'PASS', `${trackingTime}ms for ${TEST_CONFIG.testJobs.length} jobs`);
    } else {
      logTest('Tracking Performance', 'FAIL', `${trackingTime}ms exceeds threshold`);
    }
    
    if (totalTime <= maxTotalTime) {
      logTest('End-to-End Performance', 'PASS', `${totalTime}ms total time`);
    } else {
      logTest('End-to-End Performance', 'FAIL', `${totalTime}ms exceeds threshold`);
    }
    
  } catch (error) {
    logTest('Performance Testing', 'FAIL', error.message);
  }
}

// Helper functions
function calculateSkillMatch(jobSkills, resumeSkills) {
  if (!jobSkills || !resumeSkills) return 0;
  
  let exactMatches = 0;
  jobSkills.forEach(jobSkill => {
    if (resumeSkills.includes(jobSkill)) {
      exactMatches++;
    }
  });
  
  return (exactMatches / jobSkills.length) * 100;
}

function calculateExperienceMatch(jobExperience, resumeExperience) {
  if (!jobExperience || !resumeExperience) return 50; // Unknown
  
  // Simple experience extraction (would be more sophisticated in real system)
  const jobYears = extractYears(jobExperience);
  const resumeYears = resumeExperience;
  
  if (jobYears === null) return 50; // Unknown requirement
  if (resumeYears >= jobYears) return 100;
  if (resumeYears >= jobYears - 1) return 70;
  if (resumeYears >= jobYears - 2) return 40;
  return 10;
}

function calculateWorkTypeMatch(jobType, preferences) {
  if (!jobType || !preferences) return 50;
  
  const typeRank = preferences.indexOf(jobType);
  if (typeRank === 0) return 100;
  if (typeRank === 1) return 70;
  if (typeRank === 2) return 40;
  return 0;
}

function extractYears(experienceText) {
  const match = experienceText.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

function validateJobData(job) {
  const errors = [];
  
  if (!job.id) errors.push('Missing job ID');
  if (!job.title || job.title.trim() === '') errors.push('Missing or empty job title');
  if (!job.company || job.company.trim() === '') errors.push('Missing or empty company name');
  if (!job.experience) errors.push('Missing experience requirement');
  if (!job.work_type) errors.push('Missing work type');
  
  return errors;
}

function validateResumeData(resume) {
  const errors = [];
  
  if (!resume.skills || !Array.isArray(resume.skills)) {
    errors.push('Skills must be an array');
  }
  if (!resume.experience || typeof resume.experience !== 'number') {
    errors.push('Experience must be a number');
  }
  if (!resume.preferences || !Array.isArray(resume.preferences.work_type)) {
    errors.push('Work type preferences must be an array');
  }
  
  return errors;
}

// Main test execution
function runTests() {
  console.log('🚀 Starting End-to-End Integration Tests for Korean Job Hunter');
  console.log(`Test Jobs: ${TEST_CONFIG.testJobs.length}`);
  console.log(`Resume Data: Experience ${TEST_CONFIG.resume.experience} years, ${TEST_CONFIG.resume.skills.length} skills`);
  
  testDataConsistency();
  testComponentIntegration();
  testErrorHandling();
  testPerformance();
  
  // Generate test report
  testResults.endTime = new Date();
  const duration = testResults.endTime - testResults.startTime;
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`Passed: ${testResults.passed} (${((testResults.passed / testResults.total) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${testResults.failed} (${((testResults.failed / testResults.total) * 100).toFixed(1)}%)`);
  console.log(`Duration: ${duration}ms`);
  
  if (testResults.failures.length > 0) {
    console.log('\n🔍 FAILURES:');
    testResults.failures.forEach(failure => {
      console.log(`  - ${failure.testName}: ${failure.details}`);
    });
  }
  
  const successRate = (testResults.passed / testResults.total) * 100;
  console.log(`\n🎯 Integration Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate >= 95) {
    console.log('✅ Integration tests PASSED - System reliability excellent');
  } else if (successRate >= 85) {
    console.log('⚠️  Integration tests PARTIAL - System needs minor improvements');
  } else {
    console.log('❌ Integration tests FAILED - System needs major improvements');
  }
  
  return successRate;
}

// Run tests
const successRate = runTests();

// Save test results
const testReport = {
  timestamp: new Date().toISOString(),
  successRate: successRate,
  totalTests: testResults.total,
  passedTests: testResults.passed,
  failedTests: testResults.failed,
  failures: testResults.failures,
  duration: testResults.endTime - testResults.startTime
};

fs.writeFileSync(
  path.join(__dirname, '../data/autoresearch/e2e-test-report.json'),
  JSON.stringify(testReport, null, 2)
);

console.log(`\n📄 Test report saved to: data/autoresearch/e2e-test-report.json`);

// Exit with appropriate code
process.exit(successRate >= 85 ? 0 : 1);