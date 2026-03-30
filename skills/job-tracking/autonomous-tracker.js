#!/usr/bin/env node

/**
 * Autonomous Job Tracker - Enhanced with Quality Validation Automation
 * 
 * Next-generation job tracking system with:
 * - Automated quality validation
 * - Intelligent error recovery
 * - Self-learning capabilities
 * - Reduced manual intervention
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const EnhancedQualityValidator = require('./quality-validator');

class AutonomousJobTracker {
    constructor(dbPath = 'data/jobs.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.qualityValidator = new EnhancedQualityValidator(dbPath);
        this.cache = new Map();
        this.cacheTTL = 300000; // 5 minutes cache TTL
        this.qualityMetrics = {
            totalProcessed: 0,
            autoRecovered: 0,
            manualReviews: 0,
            successRate: 0,
            automationLevel: 0
        };
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Database connection error:', err);
                return;
            }
            this.optimizeDatabase();
            this.initializeTables();
        });
    }

    optimizeDatabase() {
        // Enable WAL mode for better concurrent access
        this.db.run("PRAGMA journal_mode = WAL;");
        this.db.run("PRAGMA synchronous = NORMAL;");
        this.db.run("PRAGMA cache_size = -10000;"); // 10MB cache
        this.db.run("PRAGMA temp_store = MEMORY;");
    }

    initializeTables() {
        // Create quality metrics table if not exists
        this.db.run(`
            CREATE TABLE IF NOT EXISTS quality_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                job_id TEXT,
                validation_score REAL,
                recovery_applied INTEGER,
                manual_review_required INTEGER,
                confidence_score REAL,
                issues_detected INTEGER
            )
        `);
    }

    // Enhanced insert with quality validation and auto-recovery
    async insertJobWithValidation(job) {
        this.qualityMetrics.totalProcessed++;
        
        // Step 1: Quality validation
        const validation = await this.qualityValidator.validateJobQuality(job);
        console.log(`Quality validation for ${job.id}:`, {
            isValid: validation.isValid,
            confidence: validation.confidenceScore.toFixed(2),
            needsManual: validation.needsManualReview,
            issues: validation.qualityIssues.length
        });
        
        // Step 2: Apply automated recovery if possible
        let finalJob = job;
        let recoveryApplied = false;
        
        if (validation.canAutoRecover && validation.recoverySuggestions.length > 0) {
            const recovery = await this.qualityValidator.applyAutoRecovery(job, validation.recoverySuggestions);
            if (recovery.recoverySuccess) {
                finalJob = recovery.recoveredJob;
                recoveryApplied = true;
                this.qualityMetrics.autoRecovered++;
                console.log(`✅ Auto-recovery applied to ${job.id}`);
            }
        }
        
        // Step 3: Handle manual review required cases
        if (validation.needsManualReview) {
            this.qualityMetrics.manualReviews++;
            console.log(`⚠️ Manual review required for ${job.id}`);
            
            // Store in database for manual review
            await this.storeForManualReview(finalJob, validation);
            
            // Return early for manual review
            return {
                success: false,
                message: 'Manual review required',
                job: finalJob,
                validation
            };
        }
        
        // Step 4: Insert validated job
        try {
            const result = await this.insertJob(finalJob);
            
            // Store quality metrics
            await this.storeQualityMetrics(finalJob.id, validation, recoveryApplied);
            
            console.log(`✅ Job ${finalJob.id} processed successfully`);
            return {
                success: true,
                changes: result,
                job: finalJob,
                validation,
                recoveryApplied
            };
        } catch (error) {
            console.error(`❌ Failed to insert job ${finalJob.id}:`, error);
            return {
                success: false,
                message: 'Database insert failed',
                error: error.message
            };
        }
    }

    // Store job for manual review
    async storeForManualReview(job, validation) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO quality_metrics 
                (job_id, validation_score, recovery_applied, manual_review_required, confidence_score, issues_detected)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                job.id,
                validation.confidenceScore,
                0,
                1,
                validation.confidenceScore,
                validation.qualityIssues.length
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Store quality metrics
    async storeQualityMetrics(jobId, validation, recoveryApplied) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO quality_metrics 
                (job_id, validation_score, recovery_applied, manual_review_required, confidence_score, issues_detected)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            this.db.run(query, [
                jobId,
                validation.confidenceScore,
                recoveryApplied ? 1 : 0,
                validation.needsManualReview ? 1 : 0,
                validation.confidenceScore,
                validation.qualityIssues.length
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Batch insert with quality validation
    async batchInsertJobsWithValidation(jobs) {
        if (jobs.length === 0) return 0;
        
        let successful = 0;
        const errors = [];
        const manualReviewNeeded = [];
        
        // Process each job with validation
        for (const job of jobs) {
            try {
                const result = await this.insertJobWithValidation(job);
                if (result.success) {
                    successful++;
                } else if (result.message === 'Manual review required') {
                    manualReviewNeeded.push(result);
                }
            } catch (error) {
                errors.push({
                    job: job.id,
                    error: error.message
                });
            }
        }
        
        // Update automation metrics
        this.updateAutomationMetrics(successful, manualReviewNeeded.length, errors.length);
        
        return {
            successful,
            total: jobs.length,
            manualReviewNeeded: manualReviewNeeded.length,
            errors: errors.length,
            efficiency: (successful / jobs.length) * 100
        };
    }

    // Update automation level metrics
    updateAutomationMetrics(successful, manualReviews, errors) {
        const total = successful + manualReviews + errors;
        const automationLevel = (successful / total) * 100;
        
        this.qualityMetrics.automationLevel = automationLevel;
        this.qualityMetrics.successRate = (successful / total) * 100;
        
        console.log(`📊 Automation Metrics:`);
        console.log(`   Total processed: ${total}`);
        console.log(`   Successful: ${successful}`);
        console.log(`   Manual reviews: ${manualReviews}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Automation level: ${automationLevel.toFixed(1)}%`);
    }

    // Learn from manual corrections
    async learnFromManualCorrection(originalJob, correctedJob) {
        try {
            const corrections = await this.qualityValidator.learnFromCorrection(originalJob, correctedJob);
            console.log(`🧠 Learned from ${corrections.length} corrections`);
            
            // Re-process the corrected job
            return await this.insertJobWithValidation(correctedJob);
        } catch (error) {
            console.error('Learning failed:', error);
            throw error;
        }
    }

    // Get comprehensive status report
    getStatusReport() {
        const qualityMetrics = this.qualityValidator.getQualityMetrics();
        
        return {
            tracker: {
                totalProcessed: this.qualityMetrics.totalProcessed,
                autoRecovered: this.qualityMetrics.autoRecovered,
                manualReviews: this.qualityMetrics.manualReviews,
                successRate: this.qualityMetrics.successRate.toFixed(1) + '%',
                automationLevel: this.qualityMetrics.automationLevel.toFixed(1) + '%'
            },
            validator: qualityMetrics,
            timestamp: new Date().toISOString(),
                database: {
                    path: this.dbPath,
                    status: this.db ? 'connected' : 'disconnected'
                }
        };
    }

    // Enhanced insert method (simplified for compatibility)
    async insertJob(job) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR IGNORE INTO jobs 
                (id, source, title, company, url, content, location, work_type, commute_min, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `;
            
            this.db.run(query, [
                job.id,
                job.source,
                job.title,
                job.company,
                job.url || '',
                job.content || '',
                job.location || '',
                job.work_type || '',
                job.commute_min || 0
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Simple insert for compatibility (fallback)
    async insertJobSimple(job) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR IGNORE INTO jobs 
                (id, source, title, company, url, content, location, work_type, commute_min, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `;

            this.db.run(query, [
                job.id,
                job.source,
                job.title,
                job.company,
                job.url || '',
                job.content || '',
                job.location || '',
                job.work_type || '',
                job.commute_min || 0
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }
}

module.exports = AutonomousJobTracker;