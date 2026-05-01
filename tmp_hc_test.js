const secret = '9f023185f5ec4a2aa8e25105d0d2375d57748dd17eaf4ab28c59b180035687a5';
(async () => {
  const r = await fetch('https://app-planodeestudos.vercel.app/api/notifications/db-health-check', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cron-secret': secret },
  });
  const body = await r.text();
  console.log('Status:', r.status);
  console.log('Body:', body.substring(0, 400));
})();
