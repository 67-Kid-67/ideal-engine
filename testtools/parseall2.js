const fs = require('fs');
const vm = require('vm');
const path = require('path');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):(d.name.endsWith('.js')?[path.join(dir,d.name)]:[]))}
for (const file of walk('assets')) {
  const src = fs.readFileSync(file, 'utf8');
  try { new vm.SourceTextModule(src, { identifier: file }); console.log('OK  ', file); }
  catch (e) { console.log('FAIL', file, '->', String(e.message).split('\n')[0]); }
}
