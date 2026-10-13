const fs = require('fs');
const vm = require('vm');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
try {
  new vm.SourceTextModule(src, { identifier: '/_test_' });
  console.log(file + ': PARSE OK');
} catch (e) {
  const msg = String(e.message).split('\n')[0];
  console.log(file + ': FAIL -> ' + msg);
}
