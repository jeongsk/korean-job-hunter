// Test the Korean experience pattern directly
const testText = "Back-end Developer (Senior)웨이브릿지경력 5-9년합격보상금 100만원";
const pattern = /경력[\s]*(\d+~\d+년|\d+년 이상|\d+년↑|무관)/;

console.log(`Testing text: "${testText}"`);
console.log(`Pattern: /경력[\\s]*(\\d+~\\d+년|\\d+년 이상|\\d+년↑|무관)/`);

const match = testText.match(pattern);
console.log(`Match result:`, match);

// Let's test character by character
console.log(`\nCharacter analysis of "경력 5-9년":`);
const testExp = "경력 5-9년";
for (let i = 0; i < testExp.length; i++) {
  console.log(`Position ${i}: "${testExp[i]}" (next: "${testExp[i + 1] || 'end'}")`);
}

// Test the pattern components
console.log(`\nTesting pattern components:`);
const components = ["\\d+~\\d+년", "\\d+년 이상", "\\d+년↑", "무관"];
components.forEach(comp => {
  const fullPattern = new RegExp(`경력[\\s]*(${comp})`);
  const testMatch = testExp.match(fullPattern);
  console.log(`Pattern /경력[\\\\s]*(${comp})/ on "경력 5-9년":`, testMatch);
});