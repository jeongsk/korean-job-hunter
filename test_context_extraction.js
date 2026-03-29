// Context-Aware Company Name Extraction Test
// Test various strategies for better company name extraction

const testCases = [
    {
        id: "TC-001",
        input: "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔경력 5년 이상합격보상금 100만원",
        expected: "미래엔",
        description: "Simple case - company at end"
    },
    {
        id: "TC-002", 
        input: "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원",
        expected: "웨이브릿지",
        description: "English title + Korean company"
    },
    {
        id: "TC-003",
        input: "[부산/경력 5년 이상] 코어셀 - 프로덕트 엔지니어트리노드경력 5년 이상합격보상금 100만원",
        expected: "코어셀",
        description: "Critical case - multiple companies, separator ' - '"
    },
    {
        id: "TC-004",
        input: "GeoAI Platform Backend Engineer (중급/고급)스패이드경력 4년 이상합격보상금 100만원",
        expected: "스패이드",
        description: "Mixed language case"
    },
    {
        id: "TC-005",
        input: "Backend Engineer Lead비댁스경력 9-16년합격보상금 100만원",
        expected: "비댁스",
        description: "English title + Korean company at end"
    }
];

// Current company database
const koreanCompanies = [
    '토스', '스패이드', '비댁스', '웨이브릿지', '미래엔', '코어셀', '트리노드', 
    '페칭', '에버온', '키트웍스', '유모스원', '브이젠', '리스타', '카카오', '네이버',
    '삼성', '라인', '우아한형제들', '배달의민족', '우아한', '당근마켓', '크몽', 
    '야놀자', '마이플레이스', '지엠소프트', '한컴', '네오위즈', '넥슨', '엔씨소프트', 
    '엘림스', '더존', '원스톱', '키움'
];

// Enhanced context-aware extraction function
function extractContextAwareCompany(text) {
    console.log(`🔍 Processing: "${text}"`);
    
    // Strategy 1: Position-based extraction
    let companies = [];
    
    // Find all company occurrences with their positions
    koreanCompanies.forEach(company => {
        const pattern = new RegExp(escapeRegExp(company), 'g');
        let match;
        while ((match = pattern.exec(text)) !== null) {
            companies.push({
                name: company,
                index: match.index,
                length: company.length
            });
        }
    });
    
    console.log(`📍 Found ${companies.length} company occurrences:`);
    companies.forEach(c => {
        console.log(`   - "${c.name}" at position ${c.index}, length ${c.length}`);
    });
    
    // Strategy 2: Contextual scoring
    let scoredCompanies = companies.map(company => {
        let score = 0;
        
        // Score based on position (earlier = higher priority)
        score += (100 - company.index) / 100;
        
        // Score based on length (shorter = more specific)
        score += (20 - company.length) / 20;
        
        // Bonus for companies before separators
        if (text.indexOf(' - ', company.index) > 0 && 
            text.indexOf(' - ', company.index) < company.index + company.length + 10) {
            score += 10;
        }
        
        console.log(`   "${company.name}": position score ${(100 - company.index) / 100}, length score ${(20 - company.length) / 20}, total score ${score.toFixed(2)}`);
        
        return { ...company, score };
    });
    
    // Sort by score and pick the best
    scoredCompanies.sort((a, b) => b.score - a.score);
    
    if (scoredCompanies.length > 0) {
        const best = scoredCompanies[0];
        console.log(`✅ Selected "${best.name}" with score ${best.score.toFixed(2)}`);
        return best.name;
    }
    
    console.log(`❌ No company found`);
    return null;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Test all cases
console.log("🧪 Context-Aware Company Extraction Test");
console.log("=" * 50);

let passed = 0;
let total = testCases.length;

testCases.forEach(testCase => {
    console.log(`\n--- ${testCase.id} ---`);
    console.log(`Input: "${testCase.input}"`);
    console.log(`Expected: "${testCase.expected}"`);
    console.log(`Description: ${testCase.description}`);
    
    const result = extractContextAwareCompany(testCase.input);
    
    if (result === testCase.expected) {
        console.log("✅ PASS");
        passed++;
    } else {
        console.log(`❌ FAIL - Got: "${result}"`);
    }
    console.log();
});

console.log("📊 Results:");
console.log(`Passed: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);