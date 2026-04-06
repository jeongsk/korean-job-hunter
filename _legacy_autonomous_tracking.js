#!/usr/bin/env node

/**
 * Test Script for Autonomous Job Tracker
 * 
 * Tests the enhanced quality validation and automation system
 * to measure improvements in automation level from 90% to 95%+
 */

const AutonomousJobTracker = require('./skills/job-tracking/autonomous-tracker');

async function testAutonomousTracking() {
    console.log('🚀 Testing Autonomous Job Tracker with Quality Validation');
    console.log('============================================================\n');
    
    const tracker = new AutonomousJobTracker();
    
    // Test cases representing various scenarios
    const testJobs = [
        // High quality jobs (should pass automatically)
        {
            id: 'TEST-001',
            source: 'wanted',
            title: '시니백엔드 개발자',
            company: '우아한형제들',
            url: 'https://wanted.co.kr/wd/123',
            content: '시니어 백엔드 개발자 채용',
            location: '서울',
            work_type: 'onsite',
            experience: '경력 3-5년',
            reward: '보상금 150만원'
        },
        {
            id: 'TEST-002',
            source: 'jobkorea',
            title: '프론트엔드 개발자',
            company: '카카오',
            url: 'https://jobkorea.co.kr/Recruit/456',
            content: '프론트엔드 개발자 채용',
            location: '판교',
            work_type: 'hybrid',
            experience: '경력 2년',
            reward: null
        },
        // Low quality jobs requiring recovery
        {
            id: 'TEST-003',
            source: 'wanted',
            title: '백엔드 개발자',
            company: '테크스타트업',
            url: 'https://wanted.co.kr/wd/789',
            content: '백엔드 개발자 채용',
            location: '',
            work_type: 'remote',
            experience: '경력',
            reward: '100만원'
        },
        {
            id: 'TEST-004',
            source: 'jobkorea',
            title: '개발자',
            company: '',
            url: 'https://jobkorea.co.kr/Recruit/999',
            content: '개발자 모집',
            location: '서울',
            work_type: 'onsite',
            experience: '경력 협의',
            reward: null
        },
        // Edge cases requiring manual review
        {
            id: 'TEST-005',
            source: 'wanted',
            title: '디지털 학습 플랫폼 백엔드 개발자 (JAVA)',
            company: '미래엔',
            url: 'https://wanted.co.kr/wd/555',
            content: '디지털 학습 플랫폼 백엔드 개발자 채용',
            location: '경력 5년 이상',
            work_type: 'onsite',
            experience: '경력 5년 이상',
            reward: '보상금 100만원'
        },
        {
            id: 'TEST-006',
            source: 'jobkorea',
            title: '데이터 사이언티스트',
            company: '라인',
            url: 'https://jobkorea.co.kr/Recruit/666',
            content: '데이터 사이언티스트 채용',
            location: '재택근무 가능',
            work_type: 'remote',
            experience: '4-6년',
            reward: null
        }
    ];
    
    console.log('📋 Test Jobs:', testJobs.length, 'scenarios\n');
    
    try {
        // Process jobs with autonomous tracking
        console.log('🔄 Processing jobs with autonomous validation...');
        const results = await tracker.batchInsertJobsWithValidation(testJobs);
        
        console.log('\n📊 Processing Results:');
        console.log(`   Total processed: ${results.total}`);
        console.log(`   Successful: ${results.successful}`);
        console.log(`   Manual reviews needed: ${results.manualReviewNeeded}`);
        console.log(`   Errors: ${results.errors}`);
        console.log(`   Efficiency: ${results.efficiency.toFixed(1)}%\n`);
        
        // Get detailed status report
        const statusReport = tracker.getStatusReport();
        console.log('📈 Status Report:');
        console.log(`   Automation Level: ${statusReport.tracker.automationLevel}%`);
        console.log(`   Success Rate: ${statusReport.tracker.successRate}`);
        console.log(`   Auto Recovered: ${statusReport.tracker.autoRecovered}`);
        console.log(`   Manual Reviews: ${statusReport.tracker.manualReviews}\n`);
        
        // Test learning capabilities
        console.log('🧠 Testing Learning Capabilities...');
        const originalJob = testJobs[0];
        const correctedJob = {
            ...originalJob,
            title: '시니어 백엔드 개발자 (Node.js)'
        };
        
        const learningResult = await tracker.learnFromManualCorrection(originalJob, correctedJob);
        console.log(`   Learning result: ${learningResult.success ? 'Success' : 'Failed'}\n`);
        
        // Overall assessment
        const baselineAutomation = 90.0;
        const currentAutomation = parseFloat(statusReport.tracker.automationLevel) || 0;
        const improvement = currentAutomation - baselineAutomation;
        
        console.log('🎯 Overall Assessment:');
        console.log(`   Baseline Automation: ${baselineAutomation}%`);
        console.log(`   Current Automation: ${currentAutomation.toFixed(1)}%`);
        console.log(`   Improvement: ${improvement.toFixed(1)}%\n`);
        
        // Verdict
        if (currentAutomation >= 95.0) {
            console.log('✅ SUCCESS: Automation level achieved target (95%+)');
            console.log('✅ Enhanced quality validation system is working effectively');
        } else if (currentAutomation > baselineAutomation) {
            console.log('✅ PARTIAL SUCCESS: Automation level improved');
            console.log(`   Improvement of ${improvement.toFixed(1)}% achieved`);
        } else {
            console.log('❌ NEEDS IMPROVEMENT: Automation level did not improve');
            console.log(`   Current: ${currentAutomation.toFixed(1)}%, Baseline: ${baselineAutomation}%`);
        }
        
        return {
            success: currentAutomation >= 95.0,
            baseline: baselineAutomation,
            current: currentAutomation,
            improvement: improvement,
            results: results,
            statusReport: statusReport
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the test
if (require.main === module) {
    testAutonomousTracking()
        .then(result => {
            console.log('\n🏁 Test completed');
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testAutonomousTracking };