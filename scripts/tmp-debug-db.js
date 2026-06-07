const fs = require('fs');
const https = require('https');

const env = fs.readFileSync('.env.prod.current', 'utf8');
const secretMatch = env.match(/^NOTIFICATION_CRON_SECRET=(.*)$/m);
const secret = secretMatch
  ? secretMatch[1].replace(/^"|"$/g, '').replace(/\uFEFF/g, '').replace(/[\r\n]/g, '').trim()
  : '';

const payload = JSON.stringify({
  name: 'Teste Producao Ordex',
  email: 'teste.20260506153534@ordexqa.com',
  password: 'Ordex123!',
  billingDocument: '40718657764',
  whatsapp: '31999999999',
});

const req = https.request('https://ordexx.vercel.app/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-debug-secret': secret,
  },
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('STATUS', res.statusCode);
    console.log(body);
  });
});

req.on('error', console.error);
req.write(payload);
req.end();
