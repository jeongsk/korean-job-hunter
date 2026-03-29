// Simple Enhanced Job Tracking System Test
const sqlite3 = require('sqlite3').verbose();

class SimpleTracker {
    constructor() {
        this.db = new sqlite3.Database('data/jobs.db');
        this.initDatabase();
    }

    initDatabase() {
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                work_type TEXT,
                commute_min INTEGER
            )`);
            
            this.db.run(`CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                status TEXT NOT NULL,
                priority_score INTEGER DEFAULT 0,
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )`);
            
            console.log('Database initialized successfully');
        });
    }

    addJob(job) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR REPLACE INTO jobs 
                (id, source, title, company, work_type, commute_min)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [job.id, job.source, job.title, job.company, job.work_type, job.commute_min],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    addApplication(jobId, priorityScore) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR IGNORE INTO applications 
                (id, job_id, status, priority_score)
                VALUES (?, ?, 'interested', ?)`,
                [`app_${jobId}`, jobId, priorityScore],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }

    getApplications() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT a.*, j.title, j.company, j.work_type, j.commute_min 
                FROM applications a 
                JOIN jobs j ON a.job_id = j.id 
                ORDER BY a.priority_score DESC`, 
                (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    close() {
        this.db.close();
    }
}

// Test function
async function testTracking() {
    console.log('🚀 Testing Simple Enhanced Tracking System...');
    
    const tracker = new SimpleTracker();
    
    try {
        // Test sample jobs
        const sampleJobs = [
            {
                id: 'job_001',
                source: 'wanted',
                title: '백엔드 개발자',
                company: '카카오',
                work_type: 'hybrid',
                commute_min: 35
            },
            {
                id: 'job_002', 
                source: 'jobkorea',
                title: '프론트엔드 개발자',
                company: '네이버',
                work_type: 'remote',
                commute_min: 0
            },
            {
                id: 'job_003',
                source: 'linkedin',
                title: 'iOS 개발자',
                company: '모바일스타트업',
                work_type: 'onsite',
                commute_min: 90
            }
        ];
        
        console.log('📊 Adding jobs...');
        
        // Add jobs and calculate priority scores
        for (const job of sampleJobs) {
            const priorityScore = calculatePriorityScore(job);
            await tracker.addJob(job);
            await tracker.addApplication(job.id, priorityScore);
            console.log(`✅ Added job: ${job.title} (Priority: ${priorityScore})`);
        }
        
        console.log('📋 Retrieving applications...');
        
        // Get all applications
        const applications = await tracker.getApplications();
        
        console.log(`📊 Found ${applications.length} applications:`);
        applications.forEach(app => {
            console.log(`  - ${app.title} @ ${app.company} (Priority: ${app.priority_score}, Status: ${app.status})`);
        });
        
        // Calculate efficiency metrics
        const totalApps = applications.length;
        const highPriorityApps = applications.filter(app => app.priority_score >= 70).length;
        const avgPriority = Math.round(applications.reduce((sum, app) => sum + app.priority_score, 0) / totalApps);
        
        console.log('\n📈 Efficiency Analysis:');
        console.log(`  Total applications: ${totalApps}`);
        console.log(`  High priority applications: ${highPriorityApps} (${Math.round(highPriorityApps/totalApps*100)}%)`);
        console.log(`  Average priority score: ${avgPriority}`);
        
        // Success criteria
        const baselineEfficiency = 80; // from baseline.json test_pass_rate
        const currentEfficiency = Math.round(avgPriority);
        
        console.log('\n🎯 Performance Comparison:');
        console.log(`  Baseline test pass rate: ${baselineEfficiency}%`);
        console.log(`  Current tracking efficiency: ${currentEfficiency}%`);
        
        if (currentEfficiency > baselineEfficiency) {
            console.log('🎉 SUCCESS: Tracking efficiency improved!');
        } else {
            console.log('⚠️ NEEDS IMPROVEMENT: Tracking efficiency below baseline');
        }
        
        console.log('\n✅ Simple tracking test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error in tracking test:', error);
    } finally {
        tracker.close();
    }
}

function calculatePriorityScore(job) {
    let score = 0;
    
    // Work type scoring
    if (job.work_type === 'remote') score += 40;
    else if (job.work_type === 'hybrid') score += 25;
    
    // Commute scoring
    if (!job.commute_min || job.commute_min <= 30) score += 30;
    else if (job.commute_min <= 60) score += 15;
    
    // Company scoring
    const highPriorityCompanies = ['카카오', '네이버', '삼성'];
    if (highPriorityCompanies.some(company => job.company.includes(company))) {
        score += 15;
    }
    
    return Math.min(100, score);
}

// Run the test
if (require.main === module) {
    testTracking();
}

module.exports = { SimpleTracker, calculatePriorityScore };