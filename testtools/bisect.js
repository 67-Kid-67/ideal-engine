const fs = require('fs');
const vm = require('vm');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
// find newline positions
const nl = [];
for (let i = 0; i < src.length; i++) if (src[i] === '\n') nl.push(i);
nl.push(src.length - 1);
function failsAt(lineCount) {
  const end = nl[lineCount - 1] + 1;
  const prefix = src.slice(0, end);
  try { new vm.SourceTextModule(prefix, { identifier: '/_t_' }); return false; }
  catch (e) { return String(e.message).split('\n')[0]; }
}
// only meaningful if error is the same as full-file error
const fullErr = failsAt(nl.length);
if (fullErr === false) { console.log(file, ': PARSES OK?!'); process.exit(0); }
let lo = 1, hi = nl.length;
// find first line count where error message equals fullErr (not just "unexpected end of input")
function isSame(err) { return err !== false && err === fullErr; }
while (lo < hi) {
  const mid = (lo + hi) >> 1;
  const e = failsAt(mid);
  if (isSame(e)) hi = mid; else lo = mid + 1;
}
console.log(file, 'error:', fullErr, 'first failing at line', lo);
const lines = src.split('\n');
const L = lines[lo - 1];
console.log('LINE CONTENT (len ' + L.length + '):');
console.log(JSON.stringify(L.length > 600 ? L.slice(0, 300) + ' ...MID... ' + L.slice(-300) : L));
