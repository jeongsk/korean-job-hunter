#!/bin/bash

# Simple Test with Step-by-Step Debugging
echo "🔍 Simple Scraping Test with Debugging..."
echo "======================================"

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

echo "📋 Opening Wanted.co.kr search page..."
agent-browser --user-agent "$UA" open "https://www.wanted.co.kr/search?query=백엔드&tab=position"
sleep 8
agent-browser wait --load networkidle

echo ""
echo "📊 Testing basic element selection..."
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,3).map(el => el.textContent)" --json > test_basic.json

echo ""
echo "🔍 Testing company extraction..."
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,3).map(el => {
  const text = el.textContent || '';
  // Simple test: extract company names from our list
  const companies = ['미래엔', '웨이브릿지', '키트웍스', '비댁스', '에버온', '코어셀'];
  let foundCompany = '회사명 미상';
  
  for (const company of companies) {
    if (text.includes(company)) {
      foundCompany = company;
      break;
    }
  }
  
  return {
    text: text,
    company: foundCompany
  };
})" --json > test_company.json

echo ""
echo "📈 Testing field extraction..."
agent-browser eval "[...document.querySelectorAll('a[href*=\"/wd/\"]')].slice(0,3).map(el => {
  const text = el.textContent || '';
  let workingText = text.replace(/\\[.*?\\]/g, '').replace(/\\//g, '').trim();
  
  // Experience
  const expMatch = workingText.match(/경력[\\s]*(\\d+~\\d+년|\\d+년 이상|\\d+년↑|무관)/);
  const experience = expMatch ? '경력 ' + expMatch[1] : '';
  
  // Reward
  const rewardMatch = workingText.match(/(보상금|합격금)[\\s]*(\\d+만원)/);
  const reward = rewardMatch ? rewardMatch[0] : '';
  
  // Company (simple version)
  const companies = ['미래엔', '웨이브릿지', '키트웍스', '비댁스', '에버온', '코어셀'];
  let company = '회사명 미상';
  for (const comp of companies) {
    if (text.includes(comp)) {
      company = comp;
      break;
    }
  }
  
  return {
    raw: text,
    experience: experience,
    reward: reward,
    company: company
  };
})" --json > test_fields.json

agent-browser close

echo ""
echo "📊 Results Analysis:"
echo "==================="

echo "🔍 Basic element selection:"
cat test_basic.json

echo ""
echo "🏢 Company extraction:"
cat test_company.json

echo ""
echo "📋 Field extraction:"
cat test_fields.json

# Cleanup
rm -f test_basic.json test_company.json test_fields.json