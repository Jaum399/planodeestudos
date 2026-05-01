// Cria usuário Vercel-Admin-planodeestudos no Atlas
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

const PUBLIC_KEY  = 'jngqkbcr';
const PRIVATE_KEY = 'f90c4ecb-884d-42ca-bf8a-5801753627d7';
const PROJECT_ID  = '69f32d59679cd60660cc5da8';

// Lê a senha do arquivo .env.vercel.tmp
let dbPassword = '';
try {
  const envContent = fs.readFileSync('.env.vercel.tmp', 'utf8').replace(/^\uFEFF/, '');
  const lines = envContent.split(/\r?\n/);
  const uriLine = lines.find(l => l.includes('MONGODB_URI'));
  if (uriLine) {
    const val = uriLine.replace(/^[^=]+=["']?/, '').replace(/["']$/, '');
    const m = val.match(/mongodb\+srv?:\/\/[^:]+:([^@]+)@/);
    if (m) dbPassword = m[1];
  }
} catch {}

if (!dbPassword) {
  console.error('Não foi possível extrair a senha da URI. Usando fallback.');
  dbPassword = 'HXxDlUUZVwv0127K';
}

console.log('Criando usuário com senha (primeiros 4 chars):', dbPassword.substring(0, 4) + '...');

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
  const createPath = `/api/atlas/v2/groups/${PROJECT_ID}/databaseUsers`;

  const newUser = {
    databaseName: 'admin',
    username: 'Vercel-Admin-planodeestudos',
    password: dbPassword,
    roles: [
      { databaseName: 'mentoria', roleName: 'readWrite' },
      { databaseName: 'admin', roleName: 'readAnyDatabase' },
    ],
  };

  const body = JSON.stringify(newUser);
  const r1 = await request('POST', createPath, body, null);
  const auth = parseWWWAuth(r1.headers['www-authenticate']);
  const digest = buildDigestAuth('POST', createPath, auth);
  const r2 = await request('POST', createPath, body, digest);

  console.log('\nStatus:', r2.status);
  const result = JSON.parse(r2.body);

  if (r2.status === 200 || r2.status === 201) {
    console.log('✅ Usuário criado com sucesso!');
    console.log('Username:', result.username);
    console.log('Roles:', JSON.stringify(result.roles));
  } else if (r2.status === 409) {
    console.log('ℹ️ Usuário já existe (conflito). Tentando update de senha...');
    // PATCH to update password
    const patchPath = `/api/atlas/v2/groups/${PROJECT_ID}/databaseUsers/admin/Vercel-Admin-planodeestudos`;
    const patchBody = JSON.stringify({ password: dbPassword });
    const p1 = await request('PATCH', patchPath, patchBody, null);
    const pAuth = parseWWWAuth(p1.headers['www-authenticate']);
    const pDigest = buildDigestAuth('PATCH', patchPath, pAuth);
    const p2 = await request('PATCH', patchPath, patchBody, pDigest);
    console.log('PATCH status:', p2.status);
    if (p2.status === 200) {
      console.log('✅ Senha do usuário atualizada com sucesso!');
    } else {
      console.log('Resposta PATCH:', p2.body.substring(0, 300));
    }
  } else {
    console.error('❌ Erro:', r2.body.substring(0, 400));
    process.exit(1);
  }
})();
