const fs = require('fs');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');

// binary search: find smallest prefix that fails to parse (as script). Syntax errors in minified code usually surface at EOF though.
// Better approach: use vm.Script with line offsets? Instead try parsing progressively larger suffix windows.
// Simplest robust: split on statement-ish boundaries is unreliable for minified single-line code.
// Use approach: try new Function(src.slice(0,i)) for increasing i; the first index where error message changes from
// "Unexpected end of input" to a real syntax error indicates corruption point.
let lo = 0, hi = src.length;
function err(i) {
  try { new Function(src.slice(0, i)); return null; } catch (e) { return e.message; }
}
// scan in chunks of 1000 to find first non-"end of input" error
let firstBad = -1, msg = '';
for (let i = 5000; i <= src.length; i += 5000) {
  const m = err(i);
  if (m && !/Unexpected end of input/i.test(m)) { firstBad = i; msg = m; break; }
}
if (firstBad === -1) { console.log('No mid-file syntax error found as script (maybe module-only issue). Full error:', err(src.length)); process.exit(0); }
// narrow down within [firstBad-5000, firstBad]
let a = firstBad - 5000, b = firstBad;
while (b - a > 1) {
  const mid = (a + b) >> 1;
  const m = err(mid);
  if (m && !/Unexpected end of input/i.test(m)) b = mid; else a = mid;
}
console.log('First bad offset:', b, 'msg:', err(b));
console.log('CONTEXT BEFORE >>>', JSON.stringify(src.slice(Math.max(0,b-400), b+100)));
