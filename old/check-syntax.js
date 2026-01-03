const fs = require('fs');
const content = fs.readFileSync('/Users/pedrooliveiratengelmann/Desktop/InventoryIQ/src/app/dashboard/page.tsx', 'utf8');

// Check for balanced braces
let braceCount = 0;
let maxBrace = 0;
let minBrace = 0;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  for (const char of line) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;

    maxBrace = Math.max(maxBrace, braceCount);
    minBrace = Math.min(minBrace, braceCount);
  }

  if (i >= 270 && i <= 280) {
    console.log(`Line ${i + 1}: Brace count = ${braceCount}, Line: ${line.trim()}`);
  }
}

console.log('\n=== Final Stats ===');
console.log(`Final brace count: ${braceCount}`);
console.log(`Max brace depth: ${maxBrace}`);
console.log(`Min brace (should be 0): ${minBrace}`);

if (braceCount !== 0) {
  console.log(`\n❌ UNBALANCED! Missing ${braceCount > 0 ? 'closing' : 'opening'} braces: ${Math.abs(braceCount)}`);
}
