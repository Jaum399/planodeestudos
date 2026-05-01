const baseUrl = String(process.env.API_BASE_URL || '').trim().replace(/\/+$/, '');
const secret = String(process.env.NOTIFICATION_CRON_SECRET || '').trim();

if (!baseUrl) {
  console.error('Missing API_BASE_URL environment variable.');
  process.exit(1);
}

if (!secret) {
  console.error('Missing NOTIFICATION_CRON_SECRET environment variable.');
  process.exit(1);
}

const url = `${baseUrl}/api/notifications/db-health-check`;

async function run() {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-cron-secret': secret,
    },
    body: JSON.stringify({ source: 'github-actions' }),
  });

  const text = await response.text();

  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok || payload?.ok !== true) {
    console.error('DB_HEALTH_CHECK_FAILED');
    console.error(JSON.stringify({ status: response.status, payload }, null, 2));
    process.exit(1);
  }

  console.log('DB_HEALTH_CHECK_OK');
  console.log(JSON.stringify({ status: response.status, payload }, null, 2));
}

run().catch((error) => {
  console.error('DB_HEALTH_CHECK_ERROR');
  console.error(error);
  process.exit(1);
});
