// Força criação/atualização do usuário Vercel-Admin-planodeestudos no Atlas
// Tenta múltiplas abordagens com as credenciais disponíveis
const https = require('https');
const crypto = require('crypto');

const PUBLIC_KEY  = 'jngqkbcr';
const PRIVATE_KEY = 'f90c4ecb-884d-42ca-bf8a-5801753627d7';
const PROJECT_ID  = '69f32d59679cd60660cc5da8';
const DB_USER     = 'Vercel-Admin-planodeestudos';
const DB_PASS     = 'HXxDlUUZVwv0127K';

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

async function atlasRequest(method, path, body) {
  const doReq = (auth) => new Promise((resolve, reject) => {
    const buf = body ? Buffer.from(body) : null;
    const opts = {
      hostname: 'cloud.mongodb.com', port: 443, path, method,
      headers: {
        'Content-Type': 'application/vnd.atlas.2023-01-01+json',
        'Accept': 'application/vnd.atlas.2023-01-01+json',
        ...(auth ? { Authorization: auth } : {}),
        ...(buf ? { 'Content-Length': buf.length } : {}),
      },
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    if (buf) req.write(buf);
    req.end();
  });

  const r1 = await doReq(null);
  const auth = parseWWWAuth(r1.headers['www-authenticate']);
  const digest = buildDigestAuth(method, path, auth);
  return doReq(digest);
}

(async () => {
  console.log('=== Tentativa 1: POST criar usuário ===');
  const createPath = `/api/atlas/v2/groups/${PROJECT_ID}/databaseUsers`;
  const createBody = JSON.stringify({
    databaseName: 'admin',
    username: DB_USER,
    password: DB_PASS,
    roles: [
      { databaseName: 'mentoria', roleName: 'readWrite' },
      { databaseName: 'admin',   roleName: 'readAnyDatabase' },
    ],
  });

  const r1 = await atlasRequest('POST', createPath, createBody);
  console.log('POST status:', r1.status);

  if (r1.status === 200 || r1.status === 201) {
    console.log('✅ Usuário criado com sucesso!');
    return;
  }

  console.log('Resposta:', r1.body.substring(0, 200));

  if (r1.status === 409) {
    console.log('\n=== Tentativa 2: PATCH atualizar senha ===');
    const patchPath = `/api/atlas/v2/groups/${PROJECT_ID}/databaseUsers/admin/${encodeURIComponent(DB_USER)}`;
    const patchBody = JSON.stringify({ password: DB_PASS, roles: [{ databaseName: 'mentoria', roleName: 'readWrite' }] });
    const r2 = await atlasRequest('PATCH', patchPath, patchBody);
    console.log('PATCH status:', r2.status);
    if (r2.status === 200) { console.log('✅ Senha atualizada!'); return; }
    console.log('Resposta PATCH:', r2.body.substring(0, 200));
  }

  // Se tudo falhar, tenta PATCH no usuário existente para adicionar role mentoria
  console.log('\n=== Tentativa 3: PATCH no usuário existente jmsfagundes_db_user ===');
  const patchExisting = `/api/atlas/v2/groups/${PROJECT_ID}/databaseUsers/admin/jmsfagundes_db_user`;
  const patchExistBody = JSON.stringify({
    roles: [
      { databaseName: 'admin',   roleName: 'atlasAdmin' },
      { databaseName: 'mentoria', roleName: 'readWrite' },
    ],
  });
  const r3 = await atlasRequest('PATCH', patchExisting, patchExistBody);
  console.log('PATCH existing status:', r3.status);
  console.log(r3.body.substring(0, 300));
})();
