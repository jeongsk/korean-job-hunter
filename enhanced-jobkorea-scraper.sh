#!/bin/bash

# Enhanced JobKorea Job Scraper
# Performance optimized with better selectors

USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

scrape_jobkorea() {
  local keyword=$1
  
  echo "Scraping JobKorea for: $keyword"
  
  # Build URL
  local url="https://www.jobkorea.co.kr/Search/?stext=${keyword}&tabType=recruit"
  
  # Performance optimized scraping with timeout
  curl -s -m 15 -A "$USER_AGENT" "$url" | \
    grep -E "(dlua7o0|job-card|position|title|company)" | \
    head -15 | \
    while read -r line; do
      # Extract job information
      local title=$(echo "$line" | grep -oE ">[가-힣a-zA-Z0-9\s\-+.,()]+<" | sed 's/[<>]//g' | head -1)
      local company=$(echo "$line" | grep -oE ">[가-힣a-zA-Z0-9\s\-+.,()]+<" | sed 's/[<>]//g' | tail -1)
      
      if [ -n "$title" ] && [ -n "$company" ]; then
        echo "JobKorea Job: $title at $company"
      fi
    done
}

# Test the scraper
scrape_jobkorea "React개발자"
