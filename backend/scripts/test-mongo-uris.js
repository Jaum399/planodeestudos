const fs = require('fs');
const dotenv = require('dotenv');
const dns = require('dns');
const { MongoClient } = require('mongodb');

dns.setServers(['8.8.8.8', '1.1.1.1']);
const originalLookup = dns.lookup.bind(dns);
dns.lookup = (hostname, options, callback) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  dns.resolve4(hostname, (err, addresses) => {
    if (err || !addresses || !addresses.length) {
      return originalLookup(hostname, options, callback);
    }
    if (options && options.all) {
      return callback(null, addresses.map((address) => ({ address, family: 4 })));
    }
    return callback(null, addresses[0], 4);
  });
};

const files = [
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/backend/.env',
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/.env',
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/.env.local',
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/.env.vercel.production.local',
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/.env.prod.current',
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/.env.prod.after',
  'c:/Users/Eliot_alderson/Desktop/appmentoria thiago/backend/.env.seed'
];

let vars = {};
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  try {
    Object.assign(vars, dotenv.parse(fs.readFileSync(file)));
    console.log('Loaded:', file);
  } catch (e) {
    console.log('Skip parse:', file, e.message);
  }
}

const candidates = [
  vars.MONGODB_URI,
  vars.appplanodeestudosvercelapp_MONGODB_URI,
  vars.appordexvercelapp_MONGODB_URI,
]
  .filter(Boolean)
  .map((value) => String(value).replace(/^"+|"+$/g, '').replace(/^'+|'+$/g, '').trim());

const uniq = [...new Set(candidates)];
console.log('Candidates:', uniq.length);

(async () => {
  for (const uri of uniq) {
    const safe = uri.replace(/:([^@/]+)@/, ':***@');
    const dbName = uri.includes('apptigas') ? 'apptigas' : 'ordex';
    try {
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      });
      await client.connect();
      await client.db(dbName).command({ ping: 1 });
      console.log('OK:', dbName, safe);
      await client.close();
      process.exit(0);
    } catch (error) {
      console.log('FAIL:', safe, '=>', error.message);
    }
  }

  process.exit(2);
})();
