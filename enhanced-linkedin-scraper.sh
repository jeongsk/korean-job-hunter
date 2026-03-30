#!/bin/bash

# Enhanced LinkedIn Job Scraper
# Fixed issues with improved selectors and headers

USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

# Enhanced headers
HEADERS=(
  "-H" "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
  "-H" "Accept-Language: en-US,en;q=0.9"
  "-H" "Accept-Encoding: gzip, deflate, br"
  "-H" "Connection: keep-alive"
  "-H" "Upgrade-Insecure-Requests: 1"
  "-H" "Sec-Fetch-Dest: document"
  "-H" "Sec-Fetch-Mode: navigate"
  "-H" "Sec-Fetch-Site: none"
  "-H" "Sec-Fetch-User: ?1"
)

# Search function
scrape_linkedin() {
  local keyword=$1
  local location=${2:-"South+Korea"}
  
  echo "Scraping LinkedIn for: $keyword"
  
  # Build URL
  local url="https://www.linkedin.com/jobs/search/?keywords=${keyword}&location=${location}"
  
  # Enhanced scraping with multiple fallback strategies
  curl -s -A "$USER_AGENT" "${HEADERS[@]}" "$url" | \
    grep -E "(base-card|job-search-card|job-card|position|title|company)" | \
    head -20 | \
    while read -r line; do
      # Extract job information
      local title=$(echo "$line" | grep -oE "title="[^"]*"" | cut -d'"' -f2)
      local company=$(echo "$line" | grep -oE "company="[^"]*"" | cut -d'"' -f2)
      
      if [ -n "$title" ] && [ -n "$company" ]; then
        echo "LinkedIn Job: $title at $company"
      fi
    done
}

# Test the scraper
scrape_linkedin "developer" "South+Korea"
