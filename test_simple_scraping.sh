#!/bin/bash

# Test Enhanced Scraping with Separate JS File
echo "🚀 Testing Enhanced Scraping with Separate JS File..."
echo "=================================================="

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

echo "📋 Opening Wanted.co.kr search page..."
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=백엔드&tab=position"
sleep 8
agent-browser wait --load networkidle

echo "🔍 Running enhanced extraction script..."
agent-browser eval "$(cat enhanced_scraping_test.js)" --json > enhanced_scraping_results.json

echo "📊 Analyzing results..."
agent-browser close

# Check results
if [ -f "enhanced_scraping_results.json" ]; then
  echo "✅ Successfully extracted $(jq length enhanced_scraping_results.json) job listings"
  
  echo ""
  echo "🔍 Sample Results:"
  echo "=================="
  jq -r '.[] | "\(.id): \(.title) | \(.company) | \(.experience) | \(.reward)"' enhanced_scraping_results.json | head -5
  
  echo ""
  echo "📈 Field Completeness Analysis:"
  echo "=============================="
  
  total_jobs=$(jq length enhanced_scraping_results.json)
  companies_with_names=$(jq '[.[] | select(.company != "회사명 미상")] | length' enhanced_scraping_results.json)
  companies_with_experience=$(jq '[.[] | select(.experience != "")] | length' enhanced_scraping_results.json)
  companies_with_reward=$(jq '[.[] | select(.reward != "")] | length' enhanced_scraping_results.json)
  
  echo "Total jobs: $total_jobs"
  echo "Companies with names: $companies_with_names ($((companies_with_names * 100 / total_jobs))%)"
  echo "Companies with experience: $companies_with_experience ($((companies_with_experience * 100 / total_jobs))%)"
  echo "Companies with rewards: $companies_with_reward ($((companies_with_reward * 100 / total_jobs))%)"
  
  # Check if we achieved our goal of 70%+ field completeness
  completeness=$((companies_with_names * 100 / total_jobs))
  if [ $completeness -ge 70 ]; then
    echo ""
    echo "🎉 SUCCESS: Field completeness of ${completeness}% meets our 70%+ goal!"
    echo "✅ Hypothesis CONFIRMED: Enhanced company extraction improved field completeness from 0% to ${completeness}%"
  else
    echo ""
    echo "⚠️ INCOMPLETE: Field completeness of ${completeness}% is below our 70% goal"
    echo "❌ Hypothesis NOT confirmed: Need further refinement"
  fi
else
  echo "❌ Failed to extract results"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -f enhanced_scraping_results.json