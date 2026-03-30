#!/bin/bash

# Robust Scraping Test with Simple Error Handling
# Tests the core functionality with basic error handling

echo "🚀 Robust Scraping Test with Error Handling"
echo "=========================================="

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
LOG_FILE="/tmp/robust_scraping_test_$(date +%Y%m%d_%H%M%S).log"

# Logging function
log_test() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] TEST: $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

# Test function with retry logic
test_with_retry() {
    local test_name="$1"
    local test_command="$2"
    local max_attempts=2
    local attempt=1
    
    log_test "Starting $test_name (Attempt $attempt/$max_attempts)"
    
    while [ $attempt -le $max_attempts ]; do
        if eval "$test_command"; then
            log_test "✅ $test_name succeeded on attempt $attempt"
            return 0
        else
            local exit_code=$?
            log_error "❌ $test_name failed on attempt $attempt (exit code: $exit_code)"
            
            if [ $attempt -lt $max_attempts ]; then
                log_test "⏳ Retrying in 3 seconds..."
                sleep 3
                attempt=$((attempt + 1))
            else
                log_error "❌ $test_name failed after $max_attempts attempts"
                return 1
            fi
        fi
    done
}

# Test 1: Basic Wanted scraping
test_wanted_scraping() {
    log_test "📋 Testing Wanted.co.kr scraping"
    
    # Open browser
    if ! agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=백엔드&tab=position"; then
        log_error "Failed to open Wanted"
        return 1
    fi
    
    # Wait for page to load
    log_test "⏳ Waiting for page to load..."
    sleep 8
    
    if ! agent-browser wait --load networkidle; then
        log_error "Failed to wait for page load"
        return 1
    fi
    
    # Check if we found job cards
    local job_count
    job_count=$(agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].length" 2>/dev/null || echo "0")
    
    if [ "$job_count" -eq 0 ]; then
        log_error "No job cards found ($job_count)"
        return 1
    fi
    
    log_test "✅ Found $job_count job cards"
    
    # Extract sample data
    log_test "🔍 Extracting sample job data..."
    local sample_data
    sample_data=$(agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,3).map(el => el.textContent.trim())" 2>/dev/null)
    
    if [ -n "$sample_data" ]; then
        log_test "✅ Sample data extracted:"
        echo "$sample_data" | sed 's/^/  /' | tee -a "$LOG_FILE"
        return 0
    else
        log_error "Failed to extract sample data"
        return 1
    fi
}

# Test 2: Basic JobKorea scraping
test_jobkorea_scraping() {
    log_test "📋 Testing JobKorea.co.kr scraping"
    
    # Open browser
    if ! agent-browser --user-agent "$UA" open "https://www.jobkorea.co.kr/Search/?stext=백엔드&tabType=recruit"; then
        log_error "Failed to open JobKorea"
        return 1
    fi
    
    # Wait for page to load
    log_test "⏳ Waiting for page to load..."
    sleep 8
    
    if ! agent-browser wait --load networkidle; then
        log_error "Failed to wait for page load"
        return 1
    fi
    
    # Check if we found job cards
    local job_count
    job_count=$(agent-browser eval "[...document.querySelectorAll('[class*=\"dlua7o0\"]')].length" 2>/dev/null || echo "0")
    
    if [ "$job_count" -eq 0 ]; then
        log_error "No job cards found ($job_count)"
        return 1
    fi
    
    log_test "✅ Found $job_count job cards"
    
    # Extract sample data
    log_test "🔍 Extracting sample job data..."
    local sample_data
    sample_data=$(agent-browser eval "[...document.querySelectorAll('[class*=\"dlua7o0\"]')].slice(0,3).map(card => card.textContent.trim())" 2>/dev/null)
    
    if [ -n "$sample_data" ]; then
        log_test "✅ Sample data extracted:"
        echo "$sample_data" | sed 's/^/  /' | tee -a "$LOG_FILE"
        return 0
    else
        log_error "Failed to extract sample data"
        return 1
    fi
}

# Test 3: Enhanced extraction (known working)
test_enhanced_extraction() {
    log_test "🔍 Testing enhanced company extraction algorithm"
    
    # Use the existing test that we know works
    if ./test_enhanced_extraction.sh >/dev/null 2>&1; then
        log_test "✅ Enhanced extraction test passed"
        return 0
    else
        log_error "❌ Enhanced extraction test failed"
        return 1
    fi
}

# Main test execution
main() {
    log_test "Starting comprehensive scraping reliability test"
    
    local total_tests=3
    local passed_tests=0
    
    # Test 1: Wanted scraping
    if test_with_retry "Wanted Scraping" "test_wanted_scraping"; then
        passed_tests=$((passed_tests + 1))
    fi
    agent-browser close >/dev/null 2>&1 || true
    
    echo
    
    # Test 2: JobKorea scraping
    if test_with_retry "JobKorea Scraping" "test_jobkorea_scraping"; then
        passed_tests=$((passed_tests + 1))
    fi
    agent-browser close >/dev/null 2>&1 || true
    
    echo
    
    # Test 3: Enhanced extraction
    if test_with_retry "Enhanced Extraction" "test_enhanced_extraction"; then
        passed_tests=$((passed_tests + 1))
    fi
    
    # Final summary
    echo
    log_test "======================================="
    log_test "📊 Test Results Summary:"
    log_test "Total Tests: $total_tests"
    log_test "Passed: $passed_tests"
    log_test "Failed: $((total_tests - passed_tests))"
    log_test "Success Rate: $((passed_tests * 100 / total_tests))%"
    
    if [ $passed_tests -eq $total_tests ]; then
        log_test "🎉 All tests passed! System is robust."
        return 0
    elif [ $passed_tests -gt 0 ]; then
        log_error "⚠️ Partial success. $passed_tests/$total_tests tests passed."
        return 1
    else
        log_error "❌ All tests failed. Check $LOG_FILE for details."
        return 2
    fi
}

# Run main function
main "$@"