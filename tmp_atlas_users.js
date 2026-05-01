// Verifica usuário DB no Atlas e lista roles
const https = require('https');
const crypto = require('crypto');

const PUBLIC_KEY  = 'jngqkbcr';
const PRIVATE_KEY = 'f90c4ecb-884d-42ca-bf8a-5801753627d7';
const PROJECT_ID  = '69f32d59679cd60660cc5da8';

function parseWWWAuth(header) {
  const map = {};
  (header || '').replace(/(\w+)="([^"]+)"/g, (_, k, v) => { map[k] = v; });
  return map;
}

function buildDigestAuth(method, path, opts) {
  const { realm, nonce, qop, opaque } = opts;
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const ha1 = crypto.createHash('md5').update(`${PUBLIC_KEY}:${realm}:${PRIVATE_KEY}`).digest('hex');
  const ha2 = crypto.createHash('md5').update(`${method}:${path}`).digest('hex');
  const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest('hex');
  return `Digest username="${PUBLIC_KEY}", realm="${realm}", nonce="${nonce}", uri="${path}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"${opaque ? `, opaque="${opaque}"` : ''}`;
}

function request(method, path, reqBody, authHeader) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'cloud.mongodb.com',
      port: 443,
      path,
      method,
      headers: {
        'Content-Type': 'application/vnd.atlas.2023-01-01+json',
        'Accept':       'application/vnd.atlas.2023-01-01+json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

(async () => {
  // List all DB users
  const path = `/api/atlas/v2/groups/${PROJECT_ID}/databaseUsers`;
  const r1 = await request('GET', path, null, null);
  const auth = parseWWWAuth(r1.headers['www-authenticate']);
  const digest = buildDigestAuth('GET', path, auth);
  const r2 = await request('GET', path, null, digest);

  console.log('Status:', r2.status);
  if (r2.status !== 200) {
    console.log('Erro:', r2.body.substring(0, 300));
    process.exit(1);
  }

  const data = JSON.parse(r2.body);
  const users = data.results || [];
  console.log(`Total de usuários: ${users.length}`);
  users.forEach(u => {
    console.log(`\n→ ${u.username} (authDB: ${u.databaseName})`);
    console.log('  Roles:', JSON.stringify(u.roles));
  });

  const vercelUser = users.find(u => u.username === 'Vercel-Admin-planodeestudos');
  if (vercelUser) {
    console.log('\n✅ Usuário Vercel-Admin-planodeestudos EXISTE no Atlas.');
  } else {
    console.log('\n❌ Usuário Vercel-Admin-planodeestudos NÃO encontrado!');
  }
})();
