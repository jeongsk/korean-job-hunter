#!/usr/bin/env node

/**
 * Enhanced Job Tracking Optimizer
 * 
 * This module optimizes job tracking efficiency by:
 * 1. Implementing batch operations for common CRUD tasks
 * 2. Adding connection pooling and caching
 * 3. Optimizing SQL queries with proper indexing
 * 4. Implementing transaction-based operations
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class JobTrackingOptimizer {
    constructor(dbPath = 'data/jobs.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.cache = new Map();
        this.cacheTTL = 300000; // 5 minutes cache TTL
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Database connection error:', err);
            } else {
                console.log('Connected to job tracking database');
                this.optimizeDatabase();
            }
        });
    }

    optimizeDatabase() {
        // Enable WAL mode for better concurrent access
        this.db.run("PRAGMA journal_mode = WAL;");
        this.db.run("PRAGMA synchronous = NORMAL;");
        this.db.run("PRAGMA cache_size = -10000;"); // 10MB cache
        this.db.run("PRAGMA temp_store = MEMORY;");
    }

    // Batch insert operations for better performance
    async batchInsertJobs(jobs) {
        return new Promise((resolve, reject) => {
            if (jobs.length === 0) {
                resolve(0);
                return;
            }

            const stmt = this.db.prepare(`
                INSERT OR IGNORE INTO jobs 
                (id, source, title, company, url, content, location, work_type, commute_min, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `);

            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                
                let completed = 0;
                const errors = [];
                
                jobs.forEach((job, index) => {
                    stmt.run(
                        job.id,
                        job.source,
                        job.title,
                        job.company,
                        job.url || '',
                        job.content || '',
                        job.location || '',
                        job.work_type || '',
                        job.commute_min || 0,
                        (err) => {
                            if (err) {
                                console.error(`Insert error for job ${job.id}:`, err);
                                errors.push(err);
                            }
                            completed++;
                            if (completed === jobs.length) {
                                stmt.finalize();
                                if (errors.length === 0) {
                                    this.db.run("COMMIT", (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(jobs.length - errors.length);
                                        }
                                    });
                                } else {
                                    this.db.run("ROLLBACK", () => {
                                        reject(new Error(`Batch insert failed with ${errors.length} errors`));
                                    });
                                }
                            }
                        }
                    );
                });
            });
        });
    }

    // Batch update applications for status changes
    async batchUpdateApplications(updates) {
        return new Promise((resolve, reject) => {
            if (updates.length === 0) {
                resolve(0);
                return;
            }

            const stmt = this.db.prepare(`
                UPDATE applications 
                SET status = ?, memo = ?, updated_at = datetime('now')
                WHERE job_id = ?
            `);

            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                
                let completed = 0;
                const errors = [];
                
                updates.forEach((update, index) => {
                    stmt.run(
                        update.status,
                        update.memo || null,
                        update.job_id,
                        (err) => {
                            if (err) {
                                console.error(`Update error for job ${update.job_id}:`, err);
                                errors.push(err);
                            }
                            completed++;
                            if (completed === updates.length) {
                                stmt.finalize();
                                if (errors.length === 0) {
                                    this.db.run("COMMIT", (err) => {
                                        if (err) {
                                            reject(err);
                                        } else {
                                            resolve(updates.length - errors.length);
                                        }
                                    });
                                } else {
                                    this.db.run("ROLLBACK", () => {
                                        reject(new Error(`Batch update failed with ${errors.length} errors`));
                                    });
                                }
                            }
                        }
                    );
                });
            });
        });
    }

    // Optimized application listing with caching
    async getApplicationsWithCache(status = null, limit = 50) {
        const cacheKey = `applications_${status}_${limit}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }

        return new Promise((resolve, reject) => {
            let query = `
                SELECT a.*, j.title, j.company, j.work_type, j.commute_min, m.overall_score
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                LEFT JOIN matches m ON a.job_id = m.job_id
            `;
            
            const params = [];
            if (status) {
                query += " WHERE a.status = ?";
                params.push(status);
            }
            
            query += " ORDER BY a.updated_at DESC LIMIT ?";

            this.db.all(query, [...params, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const data = rows;
                    this.cache.set(cacheKey, {
                        data,
                        timestamp: Date.now()
                    });
                    resolve(data);
                }
            });
        });
    }

    // Get pipeline statistics with optimized query
    async getPipelineStats() {
        const cacheKey = 'pipeline_stats';
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }

        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    a.status,
                    COUNT(*) as count,
                    AVG(m.overall_score) as avg_match_score
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
                    WHEN 'declined' THEN 7
                    ELSE 8
                END
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const stats = rows;
                    this.cache.set(cacheKey, {
                        data: stats,
                        timestamp: Date.now()
                    });
                    resolve(stats);
                }
            });
        });
    }

    // Get high-priority jobs (interested + applying + applied)
    async getHighPriorityJobs() {
        const cacheKey = 'high_priority_jobs';
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }

        return new Promise((resolve, reject) => {
            const query = `
                SELECT a.*, j.title, j.company, j.work_type, j.commute_min, m.overall_score
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                LEFT JOIN matches m ON a.job_id = m.job_id
                WHERE a.status IN ('interested', 'applying', 'applied')
                ORDER BY 
                    CASE a.status
                        WHEN 'interested' THEN 1
                        WHEN 'applying' THEN 2
                        WHEN 'applied' THEN 3
                    END,
                    a.updated_at DESC
            `;

            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const jobs = rows;
                    this.cache.set(cacheKey, {
                        data: jobs,
                        timestamp: Date.now()
                    });
                    resolve(jobs);
                }
            });
        });
    }

    // Get application trends over time
    async getApplicationTrends(days = 30) {
        const cacheKey = `application_trends_${days}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            return cached.data;
        }

        return new Promise((resolve, reject) => {
            const query = `
                SELECT 
                    DATE(created_at) as date,
                    status,
                    COUNT(*) as count
                FROM applications
                WHERE created_at >= date('now', '-' || ? || ' days')
                GROUP BY DATE(created_at), status
                ORDER BY date, status
            `;

            this.db.all(query, [days], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const trends = rows;
                    this.cache.set(cacheKey, {
                        data: trends,
                        timestamp: Date.now()
                    });
                    resolve(trends);
                }
            });
        });
    }

    // Clean up old cache entries
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTTL) {
                this.cache.delete(key);
            }
        }
    }

    // Get database performance metrics
    async getPerformanceMetrics() {
        return new Promise((resolve, reject) => {
            const queries = [
                "PRAGMA cache_size",
                "PRAGMA journal_mode",
                "PRAGMA synchronous",
                "SELECT COUNT(*) as total_jobs FROM jobs",
                "SELECT COUNT(*) as total_applications FROM applications",
                "SELECT COUNT(*) as total_matches FROM matches"
            ];

            const results = {};
            let completed = 0;

            queries.forEach(query => {
                this.db.get(query, [], (err, row) => {
                    if (err) {
                        console.error('Query error:', err);
                    }
                    results[query] = row;
                    completed++;
                    if (completed === queries.length) {
                        resolve(results);
                    }
                });
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
            console.log('Database connection closed');
        }
    }
}

module.exports = JobTrackingOptimizer;

// Standalone usage for testing
if (require.main === module) {
    const optimizer = new JobTrackingOptimizer();
    
    // Test performance
    setTimeout(async () => {
        console.log('Testing enhanced job tracking system...');
        
        try {
            const stats = await optimizer.getPipelineStats();
            console.log('Pipeline Stats:', stats);
            
            const metrics = await optimizer.getPerformanceMetrics();
            console.log('Performance Metrics:', metrics);
            
            // Test caching
            const start = Date.now();
            await optimizer.getApplicationsWithCache();
            const firstCall = Date.now() - start;
            
            const start2 = Date.now();
            await optimizer.getApplicationsWithCache();
            const cachedCall = Date.now() - start2;
            
            console.log(`First call: ${firstCall}ms, Cached call: ${cachedCall}ms`);
            
        } catch (error) {
            console.error('Test error:', error);
        } finally {
            optimizer.close();
        }
    }, 1000);
}