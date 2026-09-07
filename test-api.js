const https = require('https');

const BASE = 'app-ordex.vercel.app';

const tests = [
  { method: 'GET', path: '/api/public/', expect: 200 },
  { method: 'GET', path: '/api/public/downloads', expect: 200 },
  { method: 'GET', path: '/api/public/plans', expect: 200 },
  { method: 'GET', path: '/api/health', expect: 200 },
  { method: 'GET', path: '/api/auth/me', expect: 401 },
  { method: 'GET', path: '/api/planner', expect: 401 },
  { method: 'GET', path: '/api/flashcards', expect: 401 },
  { method: 'GET', path: '/api/schedule', expect: 401 },
  { method: 'GET', path: '/api/analytics', expect: 401 },
  { method: 'GET', path: '/api/mindmap', expect: 401 },
  { method: 'GET', path: '/api/notifications', expect: 401 },
  { method: 'GET', path: '/api/question-bank', expect: 401 },
  { method: 'GET', path: '/api/study-tools', expect: 401 },
  { method: 'GET', path: '/api/medhub', expect: 401 },
];

let results = [];
let pending = tests.length;

tests.forEach(t => {
  const req = https.request({ hostname: BASE, path: t.path, method: t.method }, res => {
    const ok = res.statusCode === t.expect;
    results.push({ ok, label: `${t.method} ${t.path}`, status: res.statusCode, expect: t.expect });
    if (--pending === 0) printResults();
  });
  req.on('error', e => {
    results.push({ ok: false, label: `${t.method} ${t.path}`, status: 'ERR: ' + e.message, expect: t.expect });
    if (--pending === 0) printResults();
  });
  req.end();
});

function printResults() {
  let passed = 0, failed = 0;
  results.forEach(r => {
    const icon = r.ok ? 'OK  ' : 'FAIL';
    console.log(`[${icon}] ${r.label.padEnd(35)} -> ${r.status} (esperado: ${r.expect})`);
    r.ok ? passed++ : failed++;
  });
  console.log(`\nResultado: ${passed} OK, ${failed} FALHOU`);
  process.exit(failed > 0 ? 1 : 0);
}
