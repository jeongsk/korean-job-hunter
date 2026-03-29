// Enhanced Job Tracking System with Automated Pipeline Management
// Hypothesis: Improve tracking efficiency by 40% and reduce manual updates by 60%

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EnhancedJobTracker {
    constructor(dbPath = 'data/jobs.db') {
        this.db = new sqlite3.Database(dbPath);
        this.isInitialized = false;
    }

    setupDatabase(callback) {
        this.db.serialize(() => {
            this.db.run(`CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                source TEXT NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                url TEXT,
                content TEXT,
                location TEXT,
                work_type TEXT,
                commute_min INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);
            
            this.db.run(`CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                status TEXT NOT NULL,
                priority_score INTEGER DEFAULT 0,
                memo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )`);
            
            this.db.run(`CREATE TABLE IF NOT EXISTS matches (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                resume_id TEXT DEFAULT 'master',
                score REAL NOT NULL,
                skill_match REAL DEFAULT 0,
                experience_match REAL DEFAULT 0,
                work_type_match REAL DEFAULT 0,
                commute_match REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )`);
            
            this.db.run(`CREATE TABLE IF NOT EXISTS status_transitions (
                id TEXT PRIMARY KEY,
                application_id TEXT NOT NULL,
                from_status TEXT NOT NULL,
                to_status TEXT NOT NULL,
                trigger_type TEXT NOT NULL,
                trigger_value TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (application_id) REFERENCES applications (id)
            )`);
            
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status, priority_score)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_matches_job_id ON matches(job_id, score)`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_transitions_application_id ON status_transitions(application_id)`);
            
            callback();
        });
    }

    // Enhanced Job Processing with Automatic Application Creation
    async processJobWithAutoApplication(job, matchScore = null) {
        return new Promise((resolve, reject) => {
            this.ensureInitialized(() => {
                this.db.serialize(() => {
                // Insert or update job
                const jobQuery = `INSERT OR REPLACE INTO jobs 
                    (id, source, title, company, url, content, location, work_type, commute_min, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
                
                this.db.run(jobQuery, [
                    job.id,
                    job.source || 'unknown',
                    job.title,
                    job.company,
                    job.url,
                    job.content || '',
                    job.location || '',
                    job.work_type || '',
                    job.commute_min || null
                ], function(err) {
                    if (err) return reject(err);
                    
                    // Calculate priority score based on match and job characteristics
                    const priorityScore = calculatePriorityScore(job, matchScore);
                    
                    // Auto-create application if not exists
                    const appQuery = `INSERT OR IGNORE INTO applications 
                        (id, job_id, status, priority_score, created_at, updated_at)
                        VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`;
                    
                    this.db.run(appQuery, [
                        `app_${job.id}`,
                        job.id,
                        'interested',
                        priorityScore
                    ], function(err) {
                        if (err) return reject(err);
                        
                        // Apply automated status transitions based on rules
                        applyAutomatedTransitions.call(this, job.id, priorityScore)
                            .then(resolve)
                            .catch(reject);
                    });
                });
            });
        });
    }

    // Intelligent Query System
    getApplicationsByFilter(filters = {}) {
        return new Promise((resolve, reject) => {
            this.ensureInitialized(() => {
                let query = `SELECT a.*, j.title, j.company, j.work_type, j.commute_min, m.score
                    FROM applications a
                    JOIN jobs j ON a.job_id = j.id
                    LEFT JOIN matches m ON a.job_id = m.job_id`;
                
                const conditions = [];
                const params = [];
                
                if (filters.status) {
                    conditions.push('a.status = ?');
                    params.push(filters.status);
                }
                
                if (filters.priority_min !== undefined) {
                    conditions.push('a.priority_score >= ?');
                    params.push(filters.priority_min);
                }
                
                if (filters.priority_max !== undefined) {
                    conditions.push('a.priority_score <= ?');
                    params.push(filters.priority_max);
                }
                
                if (filters.company) {
                    conditions.push('j.company LIKE ?');
                    params.push(`%${filters.company}%`);
                }
                
                if (filters.work_type) {
                    conditions.push('j.work_type = ?');
                    params.push(filters.work_type);
                }
                
                if (filters.min_score !== undefined) {
                    conditions.push('COALESCE(m.score, 0) >= ?');
                    params.push(filters.min_score);
                }
                
                if (conditions.length > 0) {
                    query += ' WHERE ' + conditions.join(' AND ');
                }
                
                query += ' ORDER BY ';
                if (filters.order_by === 'priority') {
                    query += 'a.priority_score DESC';
                } else if (filters.order_by === 'score') {
                    query += 'COALESCE(m.score, 0) DESC';
                } else {
                    query += 'a.updated_at DESC';
                }
                
                if (filters.limit) {
                    query += ` LIMIT ${filters.limit}`;
                }
                
                this.db.all(query, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
        });
    }

    // Automated Status Transition System
    async applySmartStatusUpdates() {
        return new Promise((resolve, reject) => {
            this.ensureInitialized(() => {
                this.db.serialize(() => {
                // Rule 1: Auto-progress high-priority jobs
                this.db.run(`UPDATE applications 
                    SET status = 'applying', 
                        updated_at = datetime('now'),
                        memo = COALESCE(memo, '') || ' ' || datetime('now', '+1 day') || ' 예정 지원'
                    WHERE status = 'interested' 
                    AND priority_score >= 80
                    AND datetime(updated_at) < datetime('now', '-3 days')`, 
                function(err) {
                    if (err) return reject(err);
                    
                    // Rule 2: Auto-flag old applications for review
                    this.db.run(`UPDATE applications 
                        SET memo = COALESCE(memo, '') || ' ' || datetime('now') || ' 오래된 지원서 확인 필요'
                        WHERE status = 'applied' 
                        AND datetime(updated_at) < datetime('now', '-14 days')`, 
                    function(err) {
                        if (err) return reject(err);
                        
                        // Rule 3: Auto-demote low-score jobs
                        this.db.run(`UPDATE applications 
                            SET status = 'interested',
                                updated_at = datetime('now')
                            WHERE status = 'applying' 
                            AND priority_score < 30
                            AND datetime(updated_at) < datetime('now', '-1 day')`, 
                        function(err) {
                            if (err) return reject(err);
                            
                            // Record transitions
                            recordTransitions.call(this);
                            resolve();
                        });
                    });
                });
            });
        });
    }

    // Pipeline Efficiency Analytics
    getPipelineAnalytics() {
        return new Promise((resolve, reject) => {
            this.ensureInitialized(() => {
                this.db.serialize(() => {
                const queries = [
                    `SELECT status, COUNT(*) as count FROM applications GROUP BY status`,
                    `SELECT AVG(priority_score) as avg_priority, COUNT(*) as total FROM applications`,
                    `SELECT AVG(score) as avg_match_score, COUNT(*) as total FROM matches`,
                    `SELECT COUNT(*) as total_transitions FROM status_transitions 
                     WHERE datetime(created_at) >= datetime('now', '-7 days')`
                ];
                
                const results = {};
                let completed = 0;
                
                queries.forEach((query, index) => {
                    this.db.all(query, (err, rows) => {
                        if (err) return reject(err);
                        
                        const keys = ['status_counts', 'priority_stats', 'match_stats', 'transition_count'];
                        results[keys[index]] = rows;
                        
                        completed++;
                        if (completed === queries.length) {
                            resolve(results);
                        }
                    });
                });
            });
        });
    }

    ensureInitialized(callback) {
        if (this.isInitialized) {
            callback();
            return;
        }
        
        this.setupDatabase(() => {
            this.isInitialized = true;
            callback();
        });
    }

    close() {
        this.db.close();
    }
}

// Helper Functions
function calculatePriorityScore(job, matchScore = null) {
    let score = 0;
    
    // Base score from job characteristics
    if (job.work_type === 'remote') score += 30;
    else if (job.work_type === 'hybrid') score += 20;
    
    if (!job.commute_min || job.commute_min <= 30) score += 20;
    else if (job.commute_min <= 60) score += 10;
    
    // Add match score if available
    if (matchScore !== null) {
        score += Math.round(matchScore * 0.5); // 50% weight from match
    }
    
    // Company-based scoring
    const highPriorityCompanies = ['카카오', '네이버', '삼성', '토스', '우아한형제들'];
    if (highPriorityCompanies.some(company => job.company.includes(company))) {
        score += 20;
    }
    
    return Math.min(100, score);
}

function applyAutomatedTransitions(jobId, priorityScore) {
    return new Promise((resolve, reject) => {
        // For high-priority jobs, auto-advance to applying status
        if (priorityScore >= 80) {
            const transitionQuery = `INSERT INTO status_transitions 
                (id, application_id, from_status, to_status, trigger_type, trigger_value, created_at)
                VALUES (?, ?, 'interested', 'applying', 'auto_priority', ?, datetime('now'))`;
            
            this.db.run(transitionQuery, [
                `transition_${Date.now()}`,
                `app_${jobId}`,
                priorityScore.toString()
            ], (err) => {
                if (err) return reject(err);
                
                // Update application status
                this.db.run(`UPDATE applications 
                    SET status = 'applying', updated_at = datetime('now')
                    WHERE job_id = ?`, [jobId], (err) => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        } else {
            resolve();
        }
    });
}

function recordTransitions() {
    return new Promise((resolve, reject) => {
        this.db.all(`SELECT * FROM status_transitions 
            WHERE datetime(created_at) >= datetime('now', '-24 hours')`, 
        (err, rows) => {
            if (err) return reject(err);
            console.log(`Recorded ${rows.length} automated transitions in last 24 hours`);
            resolve(rows);
        });
    });
}

// Export for testing
module.exports = EnhancedJobTracker;

// Test the enhanced system
async function testEnhancedTracking() {
    const tracker = new EnhancedJobTracker();
    
    try {
        // Test sample job data
        const sampleJobs = [
            {
                id: 'job_001',
                source: 'wanted',
                title: '백엔드 개발자',
                company: '카카오',
                work_type: 'hybrid',
                commute_min: 35,
                matchScore: 85
            },
            {
                id: 'job_002', 
                source: 'jobkorea',
                title: '프론트엔드 개발자',
                company: '네이버',
                work_type: 'remote',
                commute_min: 0,
                matchScore: 75
            },
            {
                id: 'job_003',
                source: 'linkedin',
                title: 'iOS 개발자',
                company: '모바일스타트업',
                work_type: 'onsite',
                commute_min: 90,
                matchScore: 45
            }
        ];
        
        console.log('Testing enhanced job processing...');
        
        // Process jobs with auto-application
        for (const job of sampleJobs) {
            await tracker.processJobWithAutoApplication(job);
        }
        
        console.log('Testing intelligent query system...');
        
        // Test filtering
        const highPriorityJobs = await tracker.getApplicationsByFilter({
            priority_min: 70,
            order_by: 'priority'
        });
        
        console.log(`Found ${highPriorityJobs.length} high-priority jobs`);
        
        // Test analytics
        const analytics = await tracker.getPipelineAnalytics();
        console.log('Pipeline Analytics:', JSON.stringify(analytics, null, 2));
        
        console.log('Enhanced tracking test completed successfully!');
        
    } catch (error) {
        console.error('Error in enhanced tracking test:', error);
    } finally {
        tracker.close();
    }
}

// Run test if called directly
if (require.main === module) {
    testEnhancedTracking();
}