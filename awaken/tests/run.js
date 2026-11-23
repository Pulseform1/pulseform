// Runs every *.test.js in this folder in turn and prints a summary. usage: node tests/run.js [filter]
const { execFileSync } = require('child_process'), fs = require('fs'), path = require('path');
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && f.includes(process.argv[2] || '')).sort();
let pass = 0, fail = 0;
for (const f of files) {
  let out = '';
  try { out = execFileSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', timeout: 400000, env: process.env }); }
  catch (e) { out = (e.stdout || '') + '\n' + (e.stderr || '').split('\n').slice(0, 6).join('\n'); }
  const p = (out.match(/^PASS /gm) || []).length, x = (out.match(/^FAIL /gm) || []).length + (/Error|Timeout/.test(out) && !/^PASS no page errors/m.test(out) && !p ? 1 : 0);
  pass += p; fail += x;
  console.log(`${x ? 'FAIL' : 'ok  '} ${f}: ${p} passed${x ? `, ${x} failed` : ''}`);
  if (x) console.log(out.split('\n').filter(l => /^FAIL|Error|Timeout/.test(l)).slice(0, 8).map(l => '     ' + l).join('\n'));
}
console.log(`\n${pass} passed, ${fail} failed`); if (fail) process.exitCode = 1;
