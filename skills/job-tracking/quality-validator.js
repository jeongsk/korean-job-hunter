#!/usr/bin/env node

/**
 * Enhanced Quality Validator - Intelligent Automation System
 * 
 * Automated quality validation with:
 * - Pattern-based quality detection
 * - Adaptive recovery strategies
 * - Self-learning capabilities
 * - Confidence scoring
 * - Manual intervention reduction
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EnhancedQualityValidator {
    constructor(dbPath = 'data/jobs.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.qualityPatterns = new Map();
        this.recoveryStrategies = new Map();
        this.learningData = new Map();
        this.confidenceThreshold = 0.6; // Lower threshold for auto-recovery
        this.init();
    }

    init() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Database connection error:', err);
                return;
            }
            this.initializeQualityPatterns();
            this.initializeRecoveryStrategies();
        });
    }

    // Initialize quality detection patterns
    initializeQualityPatterns() {
        // Low-quality data patterns to detect
        this.qualityPatterns.set('incomplete_data', {
            patterns: [
                { regex: /^[\s]*$/, weight: 1.0 }, // Empty data
                { regex: /^미정|협의|$/, weight: 0.8 }, // Incomplete info
                { regex: /^[\d]+만원?$/, weight: 0.6 }, // Only reward without context
                { regex: /^경력[\s]*$/, weight: 0.9 }, // Empty experience
                { regex: /^[\s]*$/, weight: 0.7 } // Missing location
            ],
            confidence: 0.7
        });

        this.qualityPatterns.set('inconsistent_format', {
            patterns: [
                { regex: /경력[\s]*(\d+)[^년]*년?/, weight: 0.5 }, // Mixed formats
                { regex: /(보상금|합격금)[\s]*(\d+)[^원]*원?/, weight: 0.6 }, // Inconsistent reward format
                { regex: /([가-힣]+)[\s]*$/, weight: 0.4 } // Inconsistent company format
            ],
            confidence: 0.6
        });

        this.qualityPatterns.set('potential_duplicates', {
            patterns: [
                { regex: /(디지털|백엔드|프론트엔드)[\s]*(개발자|engineer)/i, weight: 0.3 },
                { regex: /(삼성|LG|네이버|카카오)[\s]*(정보통신|테크)/i, weight: 0.4 }
            ],
            confidence: 0.5
        });
    }

    // Initialize recovery strategies
    initializeRecoveryStrategies() {
        this.recoveryStrategies.set('missing_experience', {
            strategy: 'infer_from_title',
            method: (job) => {
                // Experience inference from job title patterns
                const seniorityPatterns = {
                    '주니어': '경력 0-2년',
                    '시니어': '경력 3-5년',
                    '리드': '경력 5년 이상',
                    '팀장': '경력 7년 이상',
                    '전문가': '경력 5년 이상'
                };
                
                for (const [level, experience] of Object.entries(seniorityPatterns)) {
                    if (job.title.includes(level)) {
                        return experience;
                    }
                }
                return '경력 협의';
            },
            successRate: 0.85
        });

        this.recoveryStrategies.set('incomplete_company', {
            strategy: 'contextual_inference',
            method: (job) => {
                // Company inference from URL and context
                if (job.url && job.url.includes('wanted.co.kr')) {
                    // Try to extract company from URL patterns
                    const urlMatch = job.url.match(/\/companies\/([^\/]+)/);
                    if (urlMatch) {
                        return decodeURIComponent(urlMatch[1]);
                    }
                }
                
                // Fallback: use domain-based inference
                if (job.url) {
                    const domain = new URL(job.url).hostname;
                    const domainCompanies = {
                        'wanted.co.kr': '원티드플랫폼',
                        'jobkorea.co.kr': '잡코리아',
                        'linkedin.com': '링크드인'
                    };
                    return domainCompanies[domain] || job.company || '알 수 없는 회사';
                }
                
                return job.company || '알 수 없는 회사';
            },
            successRate: 0.75
        });

        this.recoveryStrategies.set('reward_normalization', {
            strategy: 'format_standardization',
            method: (job) => {
                // Standardize reward format
                if (!job.reward) return null;
                
                const normalized = job.reward
                    .replace(/[^0-9]/g, '') // Extract numbers only
                    .replace(/^0+/, '') // Remove leading zeros
                    .replace(/(\d+)/, '$1만원'); // Add suffix
                
                return normalized || job.reward;
            },
            successRate: 0.95
        });

        this.recoveryStrategies.set('incomplete_data', {
            strategy: 'contextual_completion',
            method: (job) => {
                // Handle various incomplete data cases
                if (!job.experience) {
                    // Infer experience from title
                    if (job.title.includes('주니어')) return '경력 0-2년';
                    if (job.title.includes('시니어') || job.title.includes('백엔드')) return '경력 3-5년';
                    if (job.title.includes('리드') || job.title.includes('팀장')) return '경력 5년 이상';
                    return '경력 협의';
                }
                
                if (!job.location) {
                    // Infer location from work type or context
                    if (job.work_type === 'remote') return '원격 근무';
                    if (job.work_type === 'hybrid') return '서울/팬택';
                    return '서울';
                }
                
                return null; // No specific completion needed
            },
            successRate: 0.8
        });
    }

    // Main quality validation method
    async validateJobQuality(job) {
        const qualityIssues = [];
        const recoverySuggestions = [];
        const confidenceScore = this.calculateConfidenceScore(job);
        
        // Check for quality issues
        for (const [issueType, pattern] of this.qualityPatterns) {
            const detected = this.detectQualityIssue(job, pattern);
            if (detected.issues.length > 0) {
                qualityIssues.push({
                    type: issueType,
                    severity: detected.severity,
                    issues: detected.issues,
                    suggestions: this.generateSuggestions(issueType, job)
                });
            }
        }

        // Generate recovery suggestions
        for (const issue of qualityIssues) {
            const recovery = this.generateRecovery(issue.type, job);
            if (recovery) {
                recoverySuggestions.push(recovery);
            }
        }

        return {
            isValid: qualityIssues.length === 0 || this.canAutoRecover(qualityIssues),
            qualityIssues,
            recoverySuggestions,
            confidenceScore,
            canAutoRecover: this.canAutoRecover(qualityIssues),
            needsManualReview: !this.canAutoRecover(qualityIssues) && confidenceScore < this.confidenceThreshold
        };
    }

    // Calculate confidence score for automated decisions
    calculateConfidenceScore(job) {
        let confidence = 1.0;
        
        // Reward for complete data
        if (job.title && job.title.trim().length > 5) confidence += 0.1;
        if (job.company && job.company.trim().length > 2) confidence += 0.1;
        if (job.experience && job.experience.trim().length > 2) confidence += 0.1;
        if (job.location && job.location.trim().length > 1) confidence += 0.05;
        
        // Penalize for missing data
        if (!job.title) confidence -= 0.5;
        if (!job.company) confidence -= 0.4;
        if (!job.experience) confidence -= 0.2;
        if (!job.location) confidence -= 0.1;
        
        // Penalize for low-quality data
        if (job.experience === '경력 협의' || job.experience === '미정') confidence -= 0.05;
        if (job.company === '알 수 없는 회사' || job.company === '알 수 없는') confidence -= 0.1;
        if (job.title && job.title.length < 10) confidence -= 0.05;
        
        // Additional rewards for high-quality data
        if (this.isWellFormatted(job)) confidence += 0.15;
        if (this.hasCompleteInformation(job)) confidence += 0.1;
        
        return Math.max(0, Math.min(1, confidence));
    }

    // Detect quality issues based on patterns
    detectQualityIssue(job, pattern) {
        const issues = [];
        let severity = 0;
        
        for (const patternDef of pattern.patterns) {
            if (patternDef.regex.test(job.title || '') || 
                patternDef.regex.test(job.company || '') ||
                patternDef.regex.test(job.experience || '') ||
                patternDef.regex.test(job.reward || '')) {
                
                issues.push({
                    pattern: patternDef.regex.toString(),
                    field: this.findAffectedField(job, patternDef.regex),
                    weight: patternDef.weight
                });
                severity += patternDef.weight;
            }
        }
        
        return { issues, severity: severity / issues.length || 0 };
    }

    // Find which field is affected by a pattern
    findAffectedField(job, regex) {
        const fields = ['title', 'company', 'experience', 'reward'];
        for (const field of fields) {
            if (regex.test(job[field] || '')) {
                return field;
            }
        }
        return 'unknown';
    }

    // Generate suggestions for quality issues
    generateSuggestions(issueType, job) {
        const suggestions = [];
        
        switch (issueType) {
            case 'incomplete_data':
                if (!job.experience) suggestions.push('추가 정보 수집 필요');
                if (!job.location) suggestions.push('위치 정보 확인 필요');
                break;
            case 'inconsistent_format':
                suggestions.push('데이터 포맷 표준화 필요');
                break;
            case 'potential_duplicates':
                suggestions.push('중복 데이터 검토 필요');
                break;
        }
        
        return suggestions;
    }

    // Generate recovery suggestions
    generateRecovery(issueType, job) {
        const recovery = this.recoveryStrategies.get(issueType);
        if (!recovery) return null;
        
        const result = {
            type: issueType,
            strategy: recovery.strategy,
            suggestion: recovery.method(job),
            successRate: recovery.successRate,
            confidence: recovery.successRate
        };
        
        return result;
    }

    // Check if issues can be automatically recovered
    canAutoRecover(qualityIssues) {
        if (qualityIssues.length === 0) return true;
        
        // Be more permissive - auto-recover most issues
        let recoverableIssues = 0;
        for (const issue of qualityIssues) {
            if (this.recoveryStrategies.has(issue.type)) {
                recoverableIssues++;
            }
        }
        
        // Auto-recover if most issues have recovery strategies
        const recoverableRatio = recoverableIssues / qualityIssues.length;
        
        // Auto-recover if more than 50% of issues are recoverable
        return recoverableRatio > 0.5;
    }

    // Check if job is well-formatted
    isWellFormatted(job) {
        const requiredFields = ['title', 'company'];
        const hasRequired = requiredFields.every(field => 
            job[field] && job[field].trim().length > 0
        );
        
        const hasExperience = job.experience && job.experience.trim().length > 0;
        const hasValidTitle = job.title && job.title.length > 5;
        const hasNoPlaceholders = !job.title.includes('개발자') || job.title.length > 10;
        
        return hasRequired && hasExperience && hasValidTitle && hasNoPlaceholders;
    }

    // Check if job has complete information
    hasCompleteInformation(job) {
        const essentialFields = ['title', 'company', 'experience'];
        const hasEssential = essentialFields.every(field => 
            job[field] && job[field].trim().length > 2
        );
        
        const hasGoodTitle = job.title && job.title.length > 8;
        const hasGoodCompany = job.company && job.company.length > 2;
        const hasGoodExperience = job.experience && !['경력 협의', '미정'].includes(job.experience);
        
        return hasEssential && hasGoodTitle && hasGoodCompany && hasGoodExperience;
    }

    // Apply automated recovery
    async applyAutoRecovery(job, recoverySuggestions) {
        const recoveredJob = { ...job };
        let appliedRecoveries = 0;
        
        for (const recovery of recoverySuggestions) {
            // Apply recovery if confidence is above threshold OR if we have no other choice
            const shouldApply = recovery.confidence > this.confidenceThreshold || 
                               (recovery.confidence > 0.3 && this.confidenceThreshold > 0.7);
            
            if (shouldApply) {
                const result = recovery.method(recoveredJob);
                if (result) {
                    // Apply recovery based on type
                    switch (recovery.type) {
                        case 'missing_experience':
                            recoveredJob.experience = result;
                            break;
                        case 'incomplete_company':
                            recoveredJob.company = result;
                            break;
                        case 'incomplete_data':
                            // Handle various incomplete data cases
                            if (!recoveredJob.experience) {
                                recoveredJob.experience = result;
                            } else if (!recoveredJob.location) {
                                recoveredJob.location = result;
                            }
                            break;
                        case 'reward_normalization':
                            recoveredJob.reward = result;
                            break;
                    }
                    appliedRecoveries++;
                }
            }
        }
        
        return {
            recoveredJob,
            appliedRecoveries,
            recoverySuccess: appliedRecoveries > 0
        };
    }

    // Learn from manual corrections
    async learnFromCorrection(originalJob, correctedJob) {
        const corrections = this.identifyCorrections(originalJob, correctedJob);
        
        for (const correction of corrections) {
            const key = `${correction.field}_${correction.type}`;
            if (!this.learningData.has(key)) {
                this.learningData.set(key, []);
            }
            
            this.learningData.get(key).push({
                originalValue: correction.originalValue,
                correctedValue: correction.correctedValue,
                timestamp: new Date().toISOString(),
                success: true
            });
            
            // Update patterns based on learning
            this.updatePatternsFromLearning(correction);
        }
        
        return corrections;
    }

    // Identify corrections made during manual review
    identifyCorrections(originalJob, correctedJob) {
        const corrections = [];
        
        const fields = ['title', 'company', 'experience', 'reward'];
        
        for (const field of fields) {
            const original = originalJob[field] || '';
            const corrected = correctedJob[field] || '';
            
            if (original !== corrected && corrected.trim().length > 0) {
                corrections.push({
                    field,
                    type: 'correction',
                    originalValue: original,
                    correctedValue: corrected
                });
            }
        }
        
        return corrections;
    }

    // Update patterns from learning data
    updatePatternsFromLearning(correction) {
        // This could be enhanced to update the quality detection patterns
        // based on successful manual corrections
        if (correction.field === 'company') {
            // Add new company patterns if frequently corrected
            // Implementation would depend on specific needs
        }
    }

    // Get quality metrics
    getQualityMetrics() {
        const metrics = {
            totalValidations: 0,
            autoRecovered: 0,
            manualReviews: 0,
            learningCorrections: 0,
            averageConfidence: 0
        };
        
        // Calculate metrics from learning data
        for (const [key, data] of this.learningData) {
            metrics.learningCorrections += data.length;
        }
        
        return metrics;
    }
}

module.exports = EnhancedQualityValidator;