#!/bin/bash

# Enhanced Scraping with Comprehensive Error Handling
# This script implements robust error handling, retry logic, and graceful degradation

set -e  # Exit on any error

# Configuration
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
MAX_RETRIES=3
RETRY_DELAY=5
TIMEOUT=30
LOG_FILE="/tmp/scraping_error_$(date +%Y%m%d_%H%M%S).log"

# Logging function
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE"
}

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" | tee -a "$LOG_FILE"
}

# Retry function with exponential backoff
retry_with_backoff() {
    local command="$1"
    local max_attempts="$2"
    local delay="$3"
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Attempt $attempt/$max_attempts: $command"
        
        if eval "$command"; then
            log_info "Command succeeded on attempt $attempt"
            return 0
        else
            local exit_code=$?
            log_error "Command failed on attempt $attempt with exit code $exit_code"
            
            if [ $attempt -lt $max_attempts ]; then
                log_info "Waiting $delay seconds before retry..."
                sleep $delay
                delay=$((delay * 2))  # Exponential backoff
            else
                log_error "Command failed after $max_attempts attempts"
                return $exit_code
            fi
        fi
        
        attempt=$((attempt + 1))
    done
}

# Graceful degradation function
graceful_degrade() {
    local primary_method="$1"
    local fallback_method="$2"
    local data="$3"
    
    log_info "Attempting primary method: $primary_method"
    if eval "$primary_method"; then
        return 0
    fi
    
    log_error "Primary method failed, attempting fallback: $fallback_method"
    if eval "$fallback_method"; then
        return 0
    fi
    
    log_error "Both methods failed"
    return 1
}

# Safe browser operations
safe_browser_operation() {
    local operation="$1"
    local timeout="${2:-$TIMEOUT}"
    
    # Set timeout for the operation
    timeout $timeout bash -c "
        $operation
    " 2>/dev/null || {
        log_error "Browser operation timed out after $timeout seconds"
        return 1
    }
}

# Enhanced Wanted scraping with error handling
scrape_wanted_with_error_handling() {
    log_info "Starting enhanced Wanted scraping with error handling"
    
    local search_query="$1"
    local output_file="$2"
    
    # Method 1: Primary scraping with agent-browser
    local primary_method="safe_browser_operation \"agent-browser --user-agent \\\"$UA\\\" open \\\"https://www.wanted.co.kr/search?query=$search_query&tab=position\\\"\" && sleep 8 && safe_browser_operation \"agent-browser wait --load networkidle\" && safe_browser_operation \"agent-browser eval \\\"[...document.querySelectorAll('a[href*=\\\"/wd/\\\"]')].slice(0,20).map(el => el.textContent.trim())\\\" --json > $output_file\" && agent-browser close\""
    
    # Method 2: Fallback with web_fetch
    local fallback_method="web_fetch -extractMode markdown \"https://www.wanted.co.kr/search?query=$search_query&tab=position\" > /tmp/wanted_fallback.html && grep -o 'href=\"/wd/[^\\\"]*\"' /tmp/wanted_fallback.html | head -20 | sed 's/href=\"\\([^\"]*\\)\"/\\1/' | while read url; do curl -s -A \"$UA\" \"https://www.wanted.co.kr\$url\" | grep -o '<title[^>]*>.*</title>' | sed 's/<title[^>]*>\\([^<]*\\)<\\/title>/\\1/'; done > $output_file"
    
    # Try primary method, fallback to secondary if needed
    if ! retry_with_backoff "$primary_method" $MAX_RETRIES $RETRY_DELAY; then
        log_info "Primary method failed, attempting web fetch fallback"
        if ! retry_with_backoff "$fallback_method" $MAX_RETRIES $RETRY_DELAY; then
            log_error "All scraping methods failed for Wanted"
            return 1
        fi
    fi
    
    # Validate output
    if [ ! -f "$output_file" ] || [ ! -s "$output_file" ]; then
        log_error "Output file is empty or does not exist"
        return 1
    fi
    
    local job_count=$(jq length "$output_file" 2>/dev/null || grep -c . "$output_file")
    log_info "Successfully scraped $job_count jobs from Wanted"
    return 0
}

# Enhanced JobKorea scraping with error handling
scrape_jobkorea_with_error_handling() {
    log_info "Starting enhanced JobKorea scraping with error handling"
    
    local search_query="$1"
    local output_file="$2"
    
    # Method 1: Primary scraping with agent-browser
    local primary_method="safe_browser_operation \"agent-browser --user-agent \\\"$UA\\\" open \\\"https://www.jobkorea.co.kr/Search/?stext=$search_query&tabType=recruit\\\"\" && sleep 8 && safe_browser_operation \"agent-browser wait --load networkidle\" && safe_browser_operation \"agent-browser eval \\\"[...document.querySelectorAll('[class*=\\\"dlua7o0\\\"]')].slice(0,20).map(card => card.textContent.trim())\\\" --json > $output_file\" && agent-browser close\""
    
    # Method 2: Fallback with curl
    local fallback_method="curl -s -A \"$UA\" \"https://www.jobkorea.co.kr/Search/?stext=$search_query&tabType=recruit\" | grep -o 'class=\"[^\\\"]*dlua7o0[^\\\"]*\"' | head -20 | while read class_attr; do echo \"$class_attr\"; done | while read class_attr; do echo \"Found container: $class_attr\"; done > $output_file"
    
    # Try primary method, fallback to secondary if needed
    if ! retry_with_backoff "$primary_method" $MAX_RETRIES $RETRY_DELAY; then
        log_info "Primary method failed, attempting curl fallback"
        if ! retry_with_backoff "$fallback_method" $MAX_RETRIES $RETRY_DELAY; then
            log_error "All scraping methods failed for JobKorea"
            return 1
        fi
    fi
    
    # Validate output
    if [ ! -f "$output_file" ] || [ ! -s "$output_file" ]; then
        log_error "Output file is empty or does not exist"
        return 1
    fi
    
    local job_count=$(jq length "$output_file" 2>/dev/null || grep -c . "$output_file")
    log_info "Successfully scraped $job_count jobs from JobKorea"
    return 0
}

# Main execution function
main() {
    local query="${1:-백엔드}"
    local wanted_output="/tmp/wanted_jobs_$(date +%s).json"
    local jobkorea_output="/tmp/jobkorea_jobs_$(date +%s).json"
    
    log_info "Starting enhanced scraping with error handling"
    log_info "Search query: $query"
    
    local success_count=0
    local total_attempts=2
    
    # Scrape Wanted
    if scrape_wanted_with_error_handling "$query" "$wanted_output"; then
        success_count=$((success_count + 1))
        log_info "✅ Successfully scraped Wanted"
    else
        log_error "❌ Failed to scrape Wanted"
    fi
    
    # Scrape JobKorea
    if scrape_jobkorea_with_error_handling "$query" "$jobkorea_output"; then
        success_count=$((success_count + 1))
        log_info "✅ Successfully scraped JobKorea"
    else
        log_error "❌ Failed to scrape JobKorea"
    fi
    
    # Summary
    log_info "======================================="
    log_info "Scraping Summary:"
    log_info "Successful scrapes: $success_count/$total_attempts"
    log_info "Success rate: $((success_count * 100 / total_attempts))%"
    
    if [ $success_count -eq $total_attempts ]; then
        log_info "🎉 All scrapes completed successfully!"
        return 0
    else
        log_error "⚠️ Some scrapes failed. Check $LOG_FILE for details."
        return 1
    fi
}

# Run main function with all arguments
main "$@"