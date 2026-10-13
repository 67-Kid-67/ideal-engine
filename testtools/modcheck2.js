const fs = require('fs');
const vm = require('vm');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
try {
  new vm.SourceTextModule(src, { identifier: file });
  console.log(file, ': module parse OK');
} catch (e) {
  console.log(file, ':', e.message.split('\n')[0]);
  const m = e.stack.match(/(.+?):(\d+):(\d+)/);
  if (m) {
    const line = Number(m[2]), col = Number(m[3]);
    const lines = src.split('\n');
    const L = lines[line-1] || '';
    console.log('line', line, 'col', col);
    console.log(JSON.stringify(L.slice(Math.max(0,col-400), col+200)));
  }
}
