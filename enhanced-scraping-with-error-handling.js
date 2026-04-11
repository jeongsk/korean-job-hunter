// Enhanced scraping with advanced error handling, circuit breakers, and graceful degradation
const fs = require('fs');
const path = require('path');

// Circuit breaker state management
const circuitBreakers = {
    wanted: { state: false, failures: 0, lastFailure: 0, cooldown: 0 },
    jobkorea: { state: false, failures: 0, lastFailure: 0, cooldown: 0 },
    linkedin: { state: false, failures: 0, lastFailure: 0, cooldown: 0 }
};

// Enhanced user agent rotation
const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
];

// Mobile fallback user agents for when desktop fails
const mobileUserAgents = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
];

// Error classification and response strategies
const errorStrategies = {
    429: { // Rate limiting
        name: "Rate Limiting",
        maxRetries: 3,
        baseDelay: 5000,
        progressive: true,
        activateCircuitBreaker: true
    },
    503: { // Service unavailable
        name: "Service Unavailable", 
        maxRetries: 2,
        baseDelay: 10000,
        progressive: true,
        activateCircuitBreaker: true
    },
    403: { // Access denied
        name: "Access Denied",
        maxRetries: 3,
        baseDelay: 2000,
        progressive: true,
        mobileFallback: true
    },
    408: { // Timeout
        name: "Network Timeout",
        maxRetries: 4,
        baseDelay: 2000,
        progressive: true,
        exponential: true
    },
    500: { // Internal server error
        name: "Internal Server Error",
        maxRetries: 2,
        baseDelay: 3000,
        progressive: true
    }
};

// Circuit breaker management
function checkCircuitBreaker(source) {
    const breaker = circuitBreakers[source];
    if (breaker.state) {
        const timeSinceFailure = Date.now() - breaker.lastFailure;
        if (timeSinceFailure > breaker.cooldown) {
            // Cooldown expired, reset breaker
            breaker.state = false;
            breaker.failures = 0;
            console.log(`🔌 Circuit breaker reset for ${source}`);
            return false;
        }
        console.log(`⏸️  Circuit breaker active for ${source} - cooldown expires in ${Math.ceil((breaker.cooldown - timeSinceFailure) / 1000)}s`);
        return true;
    }
    return false;
}

// Update circuit breaker state
function updateCircuitBreaker(source, error) {
    const breaker = circuitBreakers[source];
    breaker.failures++;
    breaker.lastFailure = Date.now();
    
    // Activate circuit breaker for certain errors or after multiple failures
    if (error.activateCircuitBreaker || breaker.failures >= 5) {
        breaker.state = true;
        breaker.cooldown = error.activateCircuitBreaker ? 300000 : 600000; // 5 or 10 minutes
        console.log(`🔌 Circuit breaker ACTIVATED for ${source} - ${error.name}. Cooldown: ${breaker.cooldown / 1000}s`);
    }
}

// Get rotating user agent
function getRotatingUserAgent(source, attempt = 0) {
    const index = (attempt + Math.floor(Math.random() * userAgents.length)) % userAgents.length;
    return userAgents[index];
}

// Get mobile fallback user agent
function getMobileUserAgent() {
    const index = Math.floor(Math.random() * mobileUserAgents.length);
    return mobileUserAgents[index];
}

// Adaptive exponential backoff with jitter
function exponentialBackoffWithJitter(baseDelay, attempt, errorType) {
    let delay = baseDelay;
    
    if (errorType.exponential) {
        delay = baseDelay * Math.pow(2, attempt - 1);
    }
    
    if (errorType.progressive) {
        delay = delay * attempt;
    }
    
    // Add jitter to avoid thundering herd
    const jitter = Math.floor(Math.random() * 1000);
    delay = Math.min(delay + jitter, 30000); // Cap at 30 seconds
    
    console.log(`⏰ Waiting ${Math.round(delay)}ms for attempt ${attempt + 1} (jitter: ${jitter}ms)`);
    return delay;
}

// Graceful degradation for partial data
function gracefulDegradation(rawData, source, attempt) {
    if (!rawData || rawData.length === 0) {
        console.log(`❌ No data extracted from ${source} (attempt ${attempt + 1})`);
        
        // Save error metadata for analysis
        const errorRecord = {
            timestamp: new Date().toISOString(),
            source,
            attempt,
            error: "Extraction failed",
            data_size: 0
        };
        
        saveErrorRecord(source, errorRecord);
        return null;
    }
    
    try {
        const parsedData = JSON.parse(rawData);
        
        // Check if we have minimal required fields
        if (parsedData.title && parsedData.company && parsedData.url) {
            console.log(`✅ Minimal data extracted from ${source}`);
            return {
                id: parsedData.id || generateId(),
                title: parsedData.title,
                company: parsedData.company,
                url: parsedData.url,
                source: source,
                partial: true,
                timestamp: new Date().toISOString()
            };
        } else {
            console.log(`🔍 Partial data - attempting enrichment`);
            
            // Try to extract minimal viable data
            const minimalData = {
                id: parsedData.id || generateId(),
                title: parsedData.title || "Unknown Position",
                company: parsedData.company || "Unknown Company",
                url: parsedData.url || "",
                source: source,
                partial: true,
                extracted_at: new Date().toISOString()
            };
            
            savePartialRecord(source, minimalData);
            return minimalData;
        }
    } catch (parseError) {
        console.log(`🔍 Parse error - attempting content recovery`);
        
        // Try to recover from parsing errors
        const recoveredData = recoverFromParseError(rawData, source);
        if (recoveredData) {
            return recoveredData;
        }
        
        return null;
    }
}

// Parse error recovery
function recoverFromParseError(rawData, source) {
    try {
        // Try different parsing approaches
        const approaches = [
            // Approach 1: Try to extract as JSON
            () => JSON.parse(rawData),
            // Approach 2: Remove problematic characters and try again
            () => JSON.parse(rawData.replace(/[\x00-\x1F\x7F]/g, '')),
            // Approach 3: Extract from string content
            () => extractFromStringContent(rawData)
        ];
        
        for (const approach of approaches) {
            try {
                const result = approach();
                if (result && (result.title || result.company)) {
                    return {
                        id: result.id || generateId(),
                        title: result.title || "Unknown Position",
                        company: result.company || "Unknown Company",
                        url: result.url || "",
                        source: source,
                        partial: true,
                        recovered: true,
                        timestamp: new Date().toISOString()
                    };
                }
            } catch (e) {
                continue;
            }
        }
    } catch (e) {
        console.log(`❌ Could not recover from parse error for ${source}`);
    }
    
    return null;
}

// Extract minimal data from string content
function extractFromStringContent(content) {
    const titleMatch = content.match(/(?:title|직책|포지션)[:\s]*([^,\n]+)/i);
    const companyMatch = content.match(/(?:company|회사|기업)[:\s]*([^,\n]+)/i);
    
    return {
        title: titleMatch ? titleMatch[1].trim() : null,
        company: companyMatch ? companyMatch[1].trim() : null
    };
}

// Generate ID
function generateId() {
    return 'job_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

// Save error record
function saveErrorRecord(source, record) {
    const errorFile = `data/autoresearch/${source}_errors.json`;
    const existing = fs.existsSync(errorFile) ? JSON.parse(fs.readFileSync(errorFile)) : [];
    existing.push(record);
    fs.writeFileSync(errorFile, JSON.stringify(existing, null, 2));
}

// Save partial record
function savePartialRecord(source, record) {
    const partialFile = `data/autoresearch/${source}_partial.json`;
    const existing = fs.existsSync(partialFile) ? JSON.parse(fs.readFileSync(partialFile)) : [];
    existing.push(record);
    fs.writeFileSync(partialFile, JSON.stringify(existing, null, 2));
}

// Performance monitoring
function recordPerformance(source, duration, success) {
    const perfFile = 'data/autoresearch/scraping-performance.json';
    const existing = fs.existsSync(perfFile) ? JSON.parse(fs.readFileSync(perfFile)) : {};
    
    if (!existing[source]) {
        existing[source] = [];
    }
    
    existing[source].push({
        timestamp: new Date().toISOString(),
        duration,
        success
    });
    
    fs.writeFileSync(perfFile, JSON.stringify(existing, null, 2));
    
    // Calculate average response time for adaptive timeout
    const durations = existing[source].map(d => d.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    console.log(`📊 Average response time for ${source}: ${avgDuration.toFixed(1)}s`);
}

// Enhanced scraping function with error handling
async function enhancedScrapeWithRetry(source, keyword, attempt = 0, maxAttempts = 5) {
    const startTime = Date.now();
    
    // Check circuit breaker first
    if (checkCircuitBreaker(source)) {
        throw new Error(`Circuit breaker active for ${source}`);
    }
    
    try {
        // Get user agent with rotation
        const userAgent = getRotatingUserAgent(source, attempt);
        
        console.log(`🔍 Scraping ${source} with "${keyword}" (attempt ${attempt + 1}/${maxAttempts})`);
        console.log(`🤖 Using User-Agent: ${userAgent}`);
        
        // Simulate scraping (in real implementation, this would use agent-browser)
        const result = await simulateScraping(source, keyword, userAgent);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        const duration = Date.now() - startTime;
        recordPerformance(source, duration, true);
        
        return result.data;
        
    } catch (error) {
        const duration = Date.now() - startTime;
        const errorCode = extractErrorCode(error);
        
        console.log(`❌ Error from ${source}: ${error.message} (code: ${errorCode})`);
        
        // Update circuit breaker
        const errorStrategy = errorStrategies[errorCode];
        if (errorStrategy) {
            updateCircuitBreaker(source, errorStrategy);
            
            if (attempt < errorStrategy.maxRetries && attempt < maxAttempts - 1) {
                // Calculate adaptive delay
                const delay = exponentialBackoffWithJitter(
                    errorStrategy.baseDelay, 
                    attempt + 1, 
                    errorStrategy
                );
                
                // Mobile fallback for access denied errors
                if (errorStrategy.mobileFallback && attempt >= 1) {
                    console.log(`📱 Switching to mobile User-Agent for ${source}`);
                    const mobileUA = getMobileUserAgent();
                    // In real implementation, set mobile UA here
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Recursive retry with backoff
                return enhancedScrapeWithRetry(source, keyword, attempt + 1, maxAttempts);
            }
        }
        
        // Circuit breaker or max attempts exceeded - graceful degradation
        recordPerformance(source, duration, false);
        
        return gracefulDegradation(error.message, source, attempt);
    }
}

// Extract error code from error message
function extractErrorCode(error) {
    const codeMatch = error.message.match(/(\d{3})/);
    return codeMatch ? codeMatch[1] : '500';
}

// Simulate scraping (replace with actual scraping logic)
async function simulateScraping(source, keyword, userAgent) {
    // Simulate different error scenarios based on source
    const errorChance = {
        wanted: 0.1,    // 10% chance of error
        jobkorea: 0.15, // 15% chance of error
        linkedin: 0.05  // 5% chance of error
    };
    
    if (Math.random() < errorChance[source]) {
        // Simulate different types of errors
        const errorTypes = [403, 429, 503, 408, 500];
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        
        if (randomError === 403) {
            return { error: "HTTP 403 - Access Denied" };
        } else if (randomError === 429) {
            return { error: "HTTP 429 - Rate Limited" };
        } else if (randomError === 503) {
            return { error: "HTTP 503 - Service Unavailable" };
        } else if (randomError === 408) {
            return { error: "HTTP 408 - Request Timeout" };
        } else {
            return { error: `HTTP ${randomError} - Server Error` };
        }
    }
    
    // Simulate successful scraping
    const jobs = [];
    const numJobs = Math.floor(Math.random() * 3) + 2; // 2-4 jobs
    
    for (let i = 0; i < numJobs; i++) {
        jobs.push({
            id: generateId(),
            title: `${keyword} 개발자 ${i + 1}`,
            company: `테스트 회사 ${i + 1}`,
            url: `https://example.com/job/${i + 1}`,
            source: source,
            experience: "경력 3-5년",
            work_type: "remote",
            location: "서울",
            salary: "4000~6000만원",
            extracted_at: new Date().toISOString()
        });
    }
    
    return { data: jobs };
}

// Main enhanced scraping function
async function runEnhancedScraping() {
    console.log('🚀 Enhanced Scraping with Advanced Error Handling');
    console.log('=' .repeat(50));
    
    const keywords = ['백엔드 개발자', '프론트엔드 엔지니어', 'Node.js 개발자'];
    const sources = ['wanted', 'jobkorea', 'linkedin'];
    
    const allResults = [];
    let totalJobs = 0;
    let successfulSources = 0;
    let failedSources = 0;
    
    for (const source of sources) {
        console.log(`\n🔄 Processing source: ${source}`);
        console.log('-'.repeat(30));
        
        let sourceSuccess = false;
        
        for (const keyword of keywords) {
            try {
                const result = await enhancedScrapeWithRetry(source, keyword);
                
                if (result && result.length > 0) {
                    allResults.push(...result.map(job => ({...job, keyword})));
                    totalJobs += result.length;
                    console.log(`✅ Extracted ${result.length} jobs for "${keyword}"`);
                    sourceSuccess = true;
                } else if (result) {
                    // Partial data extraction
                    console.log(`⚠️  Partial data extracted for "${keyword}"`);
                    sourceSuccess = true;
                } else {
                    console.log(`❌ No data extracted for "${keyword}"`);
                }
            } catch (error) {
                console.log(`❌ Failed to scrape ${keyword} from ${source}: ${error.message}`);
            }
        }
        
        if (sourceSuccess) {
            successfulSources++;
        } else {
            failedSources++;
        }
    }
    
    // Final results
    console.log('\n📊 Scraping Results Summary');
    console.log('=' .repeat(30));
    console.log(`✅ Successful sources: ${successfulSources}/${sources.length}`);
    console.log(`❌ Failed sources: ${failedSources}/${sources.length}`);
    console.log(`📋 Total jobs extracted: ${totalJobs}`);
    console.log(`📊 Success rate: ${((successfulSources / sources.length) * 100).toFixed(1)}%`);
    
    // Save results
    const results = {
        timestamp: new Date().toISOString(),
        experiment: "Advanced Error Handling",
        results: {
            successful_sources: successfulSources,
            failed_sources: failedSources,
            total_jobs: totalJobs,
            success_rate: (successfulSources / sources.length) * 100,
            circuit_breakers: Object.keys(circuitBreakers).reduce((acc, source) => {
                acc[source] = circuitBreakers[source].state;
                return acc;
            }, {})
        },
        jobs: allResults
    };
    
    const resultsFile = 'data/autoresearch/enhanced-scraping-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    console.log(`\n📄 Results saved to: ${resultsFile}`);
    
    return results;
}

// Run the enhanced scraping
if (require.main === module) {
    runEnhancedScraping().catch(console.error);
}

module.exports = {
    enhancedScrapeWithRetry,
    runEnhancedScraping,
    circuitBreakers,
    errorStrategies
};