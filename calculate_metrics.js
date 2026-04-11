// Script to calculate current matching metrics
const testResults = {
    high: [98, 98],
    medium: [81, 78],
    low: [37, 27, 2],
    borderline: [78]
};

function calculateMetrics() {
    const highScores = testResults.high;
    const mediumScores = testResults.medium;
    const lowScores = testResults.low;
    
    const highMin = Math.min(...highScores);
    const highMax = Math.max(...highScores);
    const highAvg = highScores.reduce((a, b) => a + b, 0) / highScores.length;
    
    const medMin = Math.min(...mediumScores);
    const medMax = Math.max(...mediumScores);
    const medAvg = mediumScores.reduce((a, b) => a + b, 0) / mediumScores.length;
    
    const lowMin = Math.min(...lowScores);
    const lowMax = Math.max(...lowScores);
    const lowAvg = lowScores.reduce((a, b) => a + b, 0) / lowScores.length;
    
    const spread = highMax - lowMin;
    const highMedGap = highMin - medMax;
    
    const discrimination = (highMedGap / highMin) * 100;
    
    console.log('=== Current Metrics ===');
    console.log(`HIGH: ${highMin}-${highMax} (avg: ${highAvg.toFixed(1)})`);
    console.log(`MEDIUM: ${medMin}-${medMax} (avg: ${medAvg.toFixed(1)})`);
    console.log(`LOW: ${lowMin}-${lowMax} (avg: ${lowAvg.toFixed(1)})`);
    console.log(`BORDERLINE: ${testResults.borderline[0]}`);
    console.log('');
    console.log(`Discrimination: ${discrimination.toFixed(2)}% (HIGH min - MED max gap)`);
    console.log(`Spread: ${spread} points`);
    console.log(`HIGH-MED gap: ${highMedGap} points`);
    console.log('');
    
    // Compare to baseline
    const baseline = {
        discrimination: 78.53,
        spread: 37.07,
        highMedGap: 15
    };
    
    console.log('=== Comparison to Baseline ===');
    console.log(`Discrimination: ${discrimination.toFixed(2)}% vs ${baseline.discrimination}% (${discrimination > baseline.discrimination ? '+' : ''}${(discrimination - baseline.discrimination).toFixed(2)}%)`);
    console.log(`Spread: ${spread} vs ${baseline.spread} (${spread > baseline.spread ? '+' : ''}${spread - baseline.spread})`);
    console.log(`HIGH-MED gap: ${highMedGap} vs ${baseline.highMedGap} (${highMedGap > baseline.highMedGap ? '+' : ''}${highMedGap - baseline.highMedGap})`);
}

calculateMetrics();