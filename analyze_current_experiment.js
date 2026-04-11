// Script to calculate current matching metrics like the baseline
const fs = require('fs');

// Mock test results based on current test output
const currentResults = [
    { id: "TC-001", label: "positive", score: 88 },
    { id: "TC-002", label: "positive", score: 84 },
    { id: "TC-003", label: "negative", score: 6 },
    { id: "TC-004", label: "negative", score: 6 },
    { id: "TC-005", label: "positive", score: 93 },
    { id: "TC-006", label: "borderline", score: 14 },
    { id: "TC-007", label: "positive", score: 68 },
    { id: "TC-008", label: "positive", score: 88 },
    { id: "TC-009", label: "negative", score: 5 },
    { id: "TC-010", label: "borderline", score: 31 }
];

function calculateCurrentMetrics() {
    const positives = currentResults.filter(r => r.label === "positive");
    const negatives = currentResults.filter(r => r.label === "negative");
    const borderlines = currentResults.filter(r => r.label === "borderline");
    
    const positiveAvg = positives.reduce((sum, r) => sum + r.score, 0) / positives.length;
    const negativeAvg = negatives.reduce((sum, r) => sum + r.score, 0) / negatives.length;
    const borderlineAvg = borderlines.reduce((sum, r) => sum + r.score, 0) / borderlines.length;
    
    // Calculate discrimination based on the gap between positive and negative averages
    const discrimination = ((positiveAvg - negativeAvg) / positiveAvg) * 100;
    
    // Calculate spread (max - min)
    const allScores = currentResults.map(r => r.score);
    const spread = Math.max(...allScores) - Math.min(...allScores);
    
    console.log('=== Current Metrics (40% skill / 20% experience) ===');
    console.log(`Positive average: ${positiveAvg.toFixed(2)}`);
    console.log(`Negative average: ${negativeAvg.toFixed(2)}`);
    console.log(`Borderline average: ${borderlineAvg.toFixed(2)}`);
    console.log(`Discrimination: ${discrimination.toFixed(2)}%`);
    console.log(`Spread: ${spread.toFixed(2)}`);
    console.log('');
    
    // Compare to baseline
    const baseline = {
        discrimination: 78.53,
        spread: 37.07,
        positive_avg: 84.2,
        negative_avg: 5.67,
        borderline_avg: 22.5
    };
    
    console.log('=== Comparison to Baseline ===');
    console.log(`Discrimination: ${discrimination.toFixed(2)}% vs ${baseline.discrimination}% (${discrimination > baseline.discrimination ? '+' : ''}${(discrimination - baseline.discrimination).toFixed(2)}%)`);
    console.log(`Spread: ${spread.toFixed(2)} vs ${baseline.spread} (${spread > baseline.spread ? '+' : ''}${(spread - baseline.spread).toFixed(2)})`);
    console.log(`Positive avg: ${positiveAvg.toFixed(2)} vs ${baseline.positive_avg} (${positiveAvg > baseline.positive_avg ? '+' : ''}${(positiveAvg - baseline.positive_avg).toFixed(2)})`);
    console.log(`Negative avg: ${negativeAvg.toFixed(2)} vs ${baseline.negative_avg} (${negativeAvg > baseline.negative_avg ? '+' : ''}${(negativeAvg - baseline.negative_avg).toFixed(2)})`);
    console.log(`Borderline avg: ${borderlineAvg.toFixed(2)} vs ${baseline.borderline_avg} (${borderlineAvg > baseline.borderline_avg ? '+' : ''}${(borderlineAvg - baseline.borderline_avg).toFixed(2)})`);
    
    // Determine verdict
    const improvement = discrimination > baseline.discrimination;
    const spreadImprovement = spread > baseline.spread;
    
    console.log('');
    console.log('=== Verdict ===');
    if (improvement && spreadImprovement) {
        console.log('✅ IMPROVEMENT: Both discrimination and spread improved');
        return 'keep';
    } else if (improvement || spreadImprovement) {
        console.log('⚠️  MIXED: One metric improved, one stayed same or got worse');
        return 'partial';
    } else {
        console.log('❌ REGRESSION: Both metrics got worse');
        return 'revert';
    }
}

calculateCurrentMetrics();