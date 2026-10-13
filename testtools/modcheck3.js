const fs = require('fs');
const vm = require('vm');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
try {
  new vm.SourceTextModule(src, { identifier: file });
  console.log(file, ': module parse OK');
} catch (e) {
  const msg = e.message.split('\n')[0];
  console.log(file, ':', msg);
  const m = msg.match(/:(\d+):(\d+)\s*$/);
  if (m) {
    const line = Number(m[1]), col = Number(m[2]);
    const lines = src.split('\n');
    const L = lines[line-1] || '';
    console.log('line', line, 'col', col, 'linelen', L.length);
    console.log(JSON.stringify(L.slice(Math.max(0,col-600), col+400)));
  } else {
    console.log('STACK:', e.stack.split('\n').slice(0,6).join('\n'));
  }
}
