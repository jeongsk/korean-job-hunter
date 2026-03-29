// Test the Korean experience pattern with the actual text
const testText = "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원";
const experiencePattern = /경력[\s]*(\d+~\d+년|\d+년 이상|\d+년↑|무관)/;

console.log(`Testing full text: "${testText}"`);
console.log(`Testing experience pattern: ${experiencePattern}`);

// Extract just the experience part
const expPart = "경력 5-9년";
console.log(`\nTesting experience part only: "${expPart}"`);
const expPartMatch = expPart.match(experiencePattern);
console.log(`Experience part match:`, expPartMatch);

// Let's test the pattern with the exact string
const pattern1 = /경력[\s]*(\d+~\d+년)/;
const pattern2 = /경력[\s]*(\d+년 이상)/;
const pattern3 = /경력[\s]*(\d+년↑)/;
const pattern4 = /경력[\s]*(무관)/;

console.log(`\nTesting individual patterns on "경력 5-9년":`);
console.log(`Pattern 1 (5-9년):`, pattern1.exec("경력 5-9년"));
console.log(`Pattern 2 (이상):`, pattern2.exec("경력 5-9년"));
console.log(`Pattern 3 (↑):`, pattern3.exec("경력 5-9년"));
console.log(`Pattern 4 (무관):`, pattern4.exec("경력 5-9년"));

// Test on the full text
console.log(`\nTesting individual patterns on full text:`);
console.log(`Pattern 1 (5-9년):`, pattern1.exec(testText));
console.log(`Pattern 2 (이상):`, pattern2.exec(testText));
console.log(`Pattern 3 (↑):`, pattern3.exec(testText));
console.log(`Pattern 4 (무관):`, pattern4.exec(testText));

// Let's try a simpler pattern
const simplePattern = /경력[\s]*(\d+[^년]*년)/;
console.log(`\nTesting simpler pattern:`, simplePattern.exec(testText));