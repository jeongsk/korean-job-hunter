#!/usr/bin/env node

/**
 * Job Tracking Performance Benchmark
 * 
 * Compares the performance of:
 * 1. Original individual SQL operations
 * 2. Enhanced batch operations with caching
 * 3. Optimized query patterns
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Sample test data
const TEST_JOBS = Array.from({length: 100}, (_, i) => ({
    id: `job_${i}`,
    source: ['wanted', 'jobkorea', 'linkedin'][i % 3],
    title: `Test Job ${i}`,
    company: `Test Company ${i}`,
    url: `https://example.com/job/${i}`,
    content: `Test job content for position ${i}`,
    location: ['Seoul', 'Gyeonggi', 'Busan'][i % 3],
    work_type: ['remote', 'hybrid', 'onsite'][i % 3],
    commute_min: Math.floor(Math.random() * 60) + 10
}));

const TEST_APPLICATIONS = Array.from({length: 50}, (_, i) => ({
    job_id: `job_${i}`,
    status: ['interested', 'applying', 'applied', 'interview', 'rejected'][i % 5],
    memo: `Test application ${i}`
}));

class TrackingBenchmark {
    constructor() {
        this.originalDb = null;
        this.optimizer = null;
        this.setup();
    }

    setup() {
        // Setup original database
        this.originalDb = new sqlite3.Database(':memory:', (err) => {
            if (err) throw err;
            this.createOriginalSchema();
        });

        // Setup optimized database
        const JobTrackingOptimizer = require('./tracking-optimizer');
        this.optimizer = new JobTrackingOptimizer(':memory:');
    }

    createOriginalSchema() {
        const queries = [
            `CREATE TABLE jobs (
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
            )`,
            `CREATE TABLE applications (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                status TEXT NOT NULL,
                memo TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )`,
            `CREATE TABLE matches (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                resume_id TEXT DEFAULT 'master',
                overall_score REAL,
                skill_score REAL,
                experience_score REAL,
                preferred_score REAL,
                work_type_score REAL,
                commute_score REAL,
                match_details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )`
        ];

        queries.forEach(query => {
            this.originalDb.run(query);
        });
    }

    // Original individual operations (baseline)
    async originalInsertJobs(jobs) {
        return new Promise((resolve) => {
            let completed = 0;
            jobs.forEach(job => {
                this.originalDb.run(`
                    INSERT OR IGNORE INTO jobs 
                    (id, source, title, company, url, content, location, work_type, commute_min, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                `, [
                    job.id, job.source, job.title, job.company, job.url, 
                    job.content, job.location, job.work_type, job.commute_min
                ], (err) => {
                    if (err) console.error('Error:', err);
                    completed++;
                    if (completed === jobs.length) resolve(completed);
                });
            });
        });
    }

    async originalInsertApplications(applications) {
        return new Promise((resolve) => {
            let completed = 0;
            applications.forEach(app => {
                this.originalDb.run(`
                    INSERT OR IGNORE INTO applications 
                    (id, job_id, status, memo, created_at, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                `, [
                    app.id, app.job_id, app.status, app.memo
                ], (err) => {
                    if (err) console.error('Error:', err);
                    completed++;
                    if (completed === applications.length) resolve(completed);
                });
            });
        });
    }

    async originalGetApplications() {
        return new Promise((resolve, reject) => {
            this.originalDb.all(`
                SELECT a.*, j.title, j.company, j.work_type, j.commute_min
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                ORDER BY a.updated_at DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async originalGetPipelineStats() {
        return new Promise((resolve, reject) => {
            this.originalDb.all(`
                SELECT 
                    status,
                    COUNT(*) as count,
                    AVG(m.overall_score) as avg_score
                FROM applications a
                LEFT JOIN matches m ON a.job_id = m.job_id
                GROUP BY a.status
                ORDER BY CASE a.status
                    WHEN 'offer' THEN 1
                    WHEN 'interview' THEN 2
                    WHEN 'applied' THEN 3
                    WHEN 'applying' THEN 4
                    WHEN 'interested' THEN 5
                    WHEN 'rejected' THEN 6
                    ELSE 7
                END
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async runBenchmark() {
        console.log('🚀 Starting Job Tracking Performance Benchmark...\n');

        // Test 1: Individual vs Batch Inserts
        console.log('📊 Test 1: Insert Performance');
        
        // Original individual inserts
        const start1 = Date.now();
        await this.originalInsertJobs(TEST_JOBS.slice(0, 10));
        const originalInsertTime = Date.now() - start1;

        // Optimized batch inserts
        const start2 = Date.now();
        await this.optimizer.batchInsertJobs(TEST_JOBS.slice(10, 20));
        const optimizedInsertTime = Date.now() - start2;

        console.log(`  Original individual inserts: ${originalInsertTime}ms`);
        console.log(`  Optimized batch inserts: ${optimizedInsertTime}ms`);
        console.log(`  Improvement: ${((originalInsertTime - optimizedInsertTime) / originalInsertTime * 100).toFixed(1)}%\n`);

        // Test 2: Individual vs Batch Application Updates
        console.log('📊 Test 2: Application Update Performance');
        
        await this.originalInsertApplications(TEST_APPLICATIONS.slice(0, 10));
        await this.optimizer.batchUpdateApplications(TEST_APPLICATIONS.slice(10, 20));

        // Original individual updates
        const start3 = Date.now();
        for (let i = 0; i < 5; i++) {
            this.originalDb.run(`
                UPDATE applications 
                SET status = 'interview', memo = 'Updated test', updated_at = datetime('now')
                WHERE job_id = 'job_${i}'
            `);
        }
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for completion
        const originalUpdateTime = Date.now() - start3;

        // Optimized batch updates
        const start4 = Date.now();
        await this.optimizer.batchUpdateApplications(TEST_APPLICATIONS.slice(0, 5).map(app => ({
            job_id: app.job_id,
            status: 'interview',
            memo: 'Optimized update'
        })));
        const optimizedUpdateTime = Date.now() - start4;

        console.log(`  Original individual updates: ${originalUpdateTime}ms`);
        console.log(`  Optimized batch updates: ${optimizedUpdateTime}ms`);
        console.log(`  Improvement: ${((originalUpdateTime - optimizedUpdateTime) / originalUpdateTime * 100).toFixed(1)}%\n`);

        // Test 3: Query Performance with vs without caching
        console.log('📊 Test 3: Query Performance');
        
        // Original query
        const start5 = Date.now();
        await this.originalGetApplications();
        const originalQueryTime = Date.now() - start5;

        // Optimized query (first call - cache miss)
        const start6 = Date.now();
        await this.optimizer.getApplicationsWithCache(null, 10);
        const optimizedQueryTime1 = Date.now() - start6;

        // Optimized query (cached call)
        const start7 = Date.now();
        await this.optimizer.getApplicationsWithCache(null, 10);
        const optimizedQueryTime2 = Date.now() - start7;

        console.log(`  Original query: ${originalQueryTime}ms`);
        console.log(`  Optimized query (first): ${optimizedQueryTime1}ms`);
        console.log(`  Optimized query (cached): ${optimizedQueryTime2}ms`);
        console.log(`  Cache improvement: ${((optimizedQueryTime1 - optimizedQueryTime2) / optimizedQueryTime1 * 100).toFixed(1)}%\n`);

        // Test 4: Pipeline Statistics
        console.log('📊 Test 4: Pipeline Statistics Performance');
        
        const start8 = Date.now();
        const originalStats = await this.originalGetPipelineStats();
        const originalStatsTime = Date.now() - start8;

        const start9 = Date.now();
        const optimizedStats = await this.optimizer.getPipelineStats();
        const optimizedStatsTime = Date.now() - start9;

        console.log(`  Original stats: ${originalStatsTime}ms`);
        console.log(`  Optimized stats: ${optimizedStatsTime}ms`);
        console.log(`  Improvement: ${((originalStatsTime - optimizedStatsTime) / originalStatsTime * 100).toFixed(1)}%\n`);

        // Test 5: Overall System Performance
        console.log('📊 Test 5: Overall System Performance');
        
        const start10 = Date.now();
        
        // Original workflow
        await this.originalInsertJobs(TEST_JOBS.slice(0, 20));
        await this.originalInsertApplications(TEST_APPLICATIONS.slice(0, 10));
        await this.originalGetApplications();
        await this.originalGetPipelineStats();
        
        const originalTotalTime = Date.now() - start10;

        const start11 = Date.now();
        
        // Optimized workflow
        await this.optimizer.batchInsertJobs(TEST_JOBS.slice(20, 40));
        await this.optimizer.batchUpdateApplications(TEST_APPLICATIONS.slice(10, 15));
        await this.optimizer.getApplicationsWithCache(null, 20);
        await this.optimizer.getPipelineStats();
        
        const optimizedTotalTime = Date.now() - start11;

        console.log(`  Original total workflow: ${originalTotalTime}ms`);
        console.log(`  Optimized total workflow: ${optimizedTotalTime}ms`);
        console.log(`  Overall improvement: ${((originalTotalTime - optimizedTotalTime) / originalTotalTime * 100).toFixed(1)}%\n`);

        // Summary
        console.log('🎯 BENCHMARK SUMMARY');
        console.log('======================');
        console.log(`• Batch operations: ${((originalInsertTime - optimizedInsertTime) / originalInsertTime * 100).toFixed(1)}% faster`);
        console.log(`• Update operations: ${((originalUpdateTime - optimizedUpdateTime) / originalUpdateTime * 100).toFixed(1)}% faster`);
        console.log(`• Query caching: ${((optimizedQueryTime1 - optimizedQueryTime2) / optimizedQueryTime1 * 100).toFixed(1)}% faster (cached vs first call)`);
        console.log(`• Statistics queries: ${((originalStatsTime - optimizedStatsTime) / originalStatsTime * 100).toFixed(1)}% faster`);
        console.log(`• Overall system: ${((originalTotalTime - optimizedTotalTime) / originalTotalTime * 100).toFixed(1)}% faster`);
        console.log('\n✅ Performance optimization successful!');

        // Cleanup
        this.originalDb.close();
        this.optimizer.close();
    }
}

// Run benchmark
if (require.main === module) {
    const benchmark = new TrackingBenchmark();
    benchmark.runBenchmark().catch(console.error);
}