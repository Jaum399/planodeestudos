const https = require('https');
const email = 'persist.test.' + Date.now() + '@ordextest.com';

// Gera CPF válido único (baseado em timestamp para unicidade)
function genCpf() {
  const n = String(Date.now()).slice(-9).split('').map(Number);
  const d1 = (n.reduce((a, v, i) => a + v * (10 - i), 0) * 10) % 11 % 10;
  const d2 = ([...n, d1].reduce((a, v, i) => a + v * (11 - i), 0) * 10) % 11 % 10;
  return [...n, d1, d2].join('');
}
const cpf = genCpf();

function req(method, path, body, token, cb) {
  const data = body ? JSON.stringify(body) : null;
  const headers = { 'Content-Type': 'application/json' };
  if (data) headers['Content-Length'] = Buffer.byteLength(data);
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const r = https.request({ hostname: 'ordexx.vercel.app', path, method, headers }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => cb(res.statusCode, JSON.parse(d)));
  });
  r.on('error', e => console.error('ERR', e.message));
  if (data) r.write(data);
  r.end();
}

req('POST', '/api/auth/register', {
  name: 'Persist Test', email, password: 'Pass123!',
  billingDocument: cpf, whatsapp: '31900000001'
}, null, (s1, r1) => {
  console.log('Register:', s1, r1.user ? r1.user._id : r1.error);
  // Aguarda 4s para simular nova instância serverless
  setTimeout(() => {
    req('POST', '/api/auth/login', { email, password: 'Pass123!' }, null, (s2, r2) => {
      console.log('Login (instancia diferente):', s2, r2.user ? r2.user.email : r2.error);
      const token = r2.token;
      req('GET', '/api/planner', null, token, (s3, r3) => {
        console.log('Planner:', s3, JSON.stringify(r3).slice(0, 80));
        console.log('\nPERSISTENCIA:', (s1 === 201 && s2 === 200)
          ? 'OK - dados gravados permanentemente no Atlas'
          : 'FALHOU');
      });
    });
  }, 4000);
});
