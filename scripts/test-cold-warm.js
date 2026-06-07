const https = require('https');

const SECRET = '9f023185f5ec4a2aa8e25105d0d2375d57748dd17eaf4ab28c59b180035687a5';

function request(n, callback) {
  const body = JSON.stringify({ email: 'test@test.com', password: 'test' });
  const req = https.request({
    hostname: 'ordexx.vercel.app',
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-debug-secret': SECRET,
    },
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log(`call ${n} → HTTP ${res.statusCode}:`, d.slice(0, 150));
      if (callback) callback();
    });
  });
  req.on('error', e => console.error(`call ${n} error:`, e.message));
  req.write(body);
  req.end();
}

// chama 3x em sequência para ver o padrão cold/warm
request(1, () => {
  setTimeout(() => request(2, () => {
    setTimeout(() => request(3), 500);
  }), 500);
});
