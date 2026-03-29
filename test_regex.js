// Test the regex pattern directly
const testText = "디지털 학습 플랫폼 백엔드 개발자 (JAVA)미래엔 합격";
const company = "미래엔";

console.log(`Testing text: "${testText}"`);
console.log(`Looking for company: "${company}"`);

// Original pattern
const originalPattern = new RegExp(`${company}(?=[경능명년]|$)`);
const originalMatch = testText.match(originalPattern);
console.log(`Original pattern: /${company}(?=[경능명년]|$)/`);
console.log(`Original match:`, originalMatch);

// Updated pattern
const updatedPattern = new RegExp(`${company}(?=[경능명년합]|$)`);
const updatedMatch = testText.match(updatedPattern);
console.log(`Updated pattern: /${company}(?=[경능명년합]|$)/`);
console.log(`Updated match:`, updatedMatch);

// Alternative pattern without lookahead
const altPattern = new RegExp(`${company}\\b`);
const altMatch = testText.match(altPattern);
console.log(`Alternative pattern: /${company}\\b/`);
console.log(`Alternative match:`, altMatch);

// Test character by character
console.log(`\nCharacter analysis of "${testText}":`);
for (let i = 0; i < testText.length; i++) {
  const char = testText[i];
  const nextChar = testText[i + 1];
  console.log(`Position ${i}: "${char}" (next: "${nextChar}")`);
  
  if (char === '미' && nextChar === '래') {
    console.log(`  Found "미래엔" starting at position ${i}`);
    console.log(`  Character after "미래엔": "${testText[i + 3]}"`);
    if (['경', '능', '명', '년', '합'].includes(testText[i + 3])) {
      console.log(`  ✓ Next character is in lookahead set: ${testText[i + 3]}`);
    } else {
      console.log(`  ✗ Next character is NOT in lookahead set: ${testText[i + 3]}`);
    }
  }
}