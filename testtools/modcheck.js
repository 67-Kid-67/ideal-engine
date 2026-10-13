const fs = require('fs');
const vm = require('vm');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
try {
  new vm.SourceTextModule(src, { identifier: file });
  console.log(file, ': module parse OK');
} catch (e) {
  console.log(file, ':', e.message);
  const m = e.stack.match(/(.+?):(\d+)/);
  if (m) {
    const line = Number(m[2]);
    const lines = src.split('\n');
    for (let i = Math.max(0, line-2); i < Math.min(lines.length, line+1); i++) {
      const L = lines[i];
      const col = (i === line-1) ? Number(m[3]) : 0;
      console.log('LINE', i+1, 'len', L.length);
      if (col) console.log(' >>>', JSON.stringify(L.slice(Math.max(0,col-300), col+300)));
    }
  }
}
