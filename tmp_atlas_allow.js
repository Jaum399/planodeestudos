// Temporário — verifica usuário DB e corrige senha no Atlas
const https = require('https');
const crypto = require('crypto');

const PUBLIC_KEY  = 'jngqkbcr';
const PRIVATE_KEY = 'f90c4ecb-884d-42ca-bf8a-5801753627d7';
const PROJECT_ID  = '69f32d59679cd60660cc5da8';

const body = JSON.stringify([{ cidrBlock: '0.0.0.0/0', comment: 'Vercel serverless - dynamic IPs' }]);

// Digest Auth helper
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
  const apiPath = `/api/atlas/v2/groups/${PROJECT_ID}/accessList`;

  // Step 1: GET to verify permissions
  const getPath = `/api/atlas/v2/groups/${PROJECT_ID}/accessList`;
  const g1 = await request('GET', getPath, null, null);
  const getAuthParams = parseWWWAuth(g1.headers['www-authenticate']);
  const getDigest = buildDigestAuth('GET', getPath, getAuthParams);
  const g2 = await request('GET', getPath, null, getDigest);
  console.log('GET accessList status:', g2.status);
  if (g2.status !== 200) {
    console.log('GET body:', g2.body.substring(0, 500));
    console.error('\n❌ A API key não tem permissão de leitura no projeto. Status:', g2.status);
    process.exit(1);
  }
  const existing = JSON.parse(g2.body);
  const alreadyOpen = (existing.results || []).some(e => e.cidrBlock === '0.0.0.0/0');
  if (alreadyOpen) {
    console.log('\n✅ 0.0.0.0/0 já está na allowlist! Nenhuma ação necessária.');
    process.exit(0);
  }
  console.log('IPs existentes:', (existing.results || []).map(e => e.cidrBlock).join(', '));

  // Step 2: POST to add 0.0.0.0/0
  const r1 = await request('POST', apiPath, body, null);
  if (r1.status !== 401) {
    console.log('Unexpected first response:', r1.status, r1.body);
    process.exit(1);
  }

  const authParams = parseWWWAuth(r1.headers['www-authenticate']);
  const digestHeader = buildDigestAuth('POST', apiPath, authParams);

  const r2 = await request('POST', apiPath, body, digestHeader);
  console.log('POST Status:', r2.status);
  try { console.log(JSON.stringify(JSON.parse(r2.body), null, 2)); }
  catch { console.log(r2.body); }

  if (r2.status === 200 || r2.status === 201) {
    console.log('\n✅ 0.0.0.0/0 adicionado com sucesso na Network Access do Atlas!');
    process.exit(0);
  } else {
    console.error('\n❌ Falha ao adicionar IP. Status:', r2.status);
    process.exit(1);
  }
})();
