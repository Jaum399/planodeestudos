const https = require('https');

const ts = Date.now();

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = https.request({ hostname: 'ordexx.vercel.app', path, method: 'POST', headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = https.request({ hostname: 'ordexx.vercel.app', path, method: 'GET', headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const email = `qa${ts}@ordextest.com`;
  console.log('=== SMOKE TEST 1: Auth ===');

  const reg = await post('/api/auth/register', { name: 'QA Test', email, password: 'Ordex123!', billingDocument: '75114863398', whatsapp: '31999999999' });
  console.log('Register:', reg.status, reg.body.slice(0, 300));

  const login = await post('/api/auth/login', { email, password: 'Ordex123!' });
  console.log('Login:', login.status, login.body.slice(0, 300));

  let token = null;
  try { token = JSON.parse(login.body).token; } catch (_) {}
  if (!token) { console.log('No token — stopping.'); return; }

  const profile = await get('/api/auth/me', token);
  console.log('Profile (/api/auth/me):', profile.status, profile.body.slice(0, 200));

  console.log('\n=== SMOKE TEST 2: Study tools ===');
  const questions = await get('/api/question-bank', token);
  console.log('Question-bank:', questions.status, questions.body.slice(0, 200));

  const pdfs = await get('/api/pdf-library', token);
  console.log('PDF-library:', pdfs.status, pdfs.body.slice(0, 200));

  const summaries = await get('/api/study-tools', token);
  console.log('Study-tools:', summaries.status, summaries.body.slice(0, 200));

  console.log('\n=== SMOKE TEST 3: Jarvis / Planner / Analytics ===');
  const planner = await get('/api/planner', token);
  console.log('Planner:', planner.status, planner.body.slice(0, 200));

  const analytics = await get('/api/analytics', token);
  console.log('Analytics:', analytics.status, analytics.body.slice(0, 200));

  const jarvis = await post('/api/jarvis/chat', { message: 'Olá Jarvis, sistema funcionando?' }, token);
  console.log('Jarvis:', jarvis.status, jarvis.body.slice(0, 300));
}

run().catch(e => console.error('FATAL:', e));
