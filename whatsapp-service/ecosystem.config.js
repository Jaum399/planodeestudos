require('dotenv').config({ path: require('path').join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'tigas-wa-service',
      script: 'index.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      env: {
        PORT: 3333,
        NODE_ENV: 'production',
        SERVICE_SECRET: process.env.SERVICE_SECRET || '',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/wa-error.log',
      out_file: './logs/wa-out.log',
    },
    {
      name: 'tigas-tunnel',
      script: 'tunnel-manager.js',
      cwd: __dirname,
      watch: false,
      autorestart: true,
      restart_delay: 8000,
      max_restarts: 50,
      env: {
        NODE_ENV: 'production',
        VERCEL_TOKEN: process.env.VERCEL_TOKEN || '',
        VERCEL_PROJECT: process.env.VERCEL_PROJECT || 'app-tigas-entregas',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/tunnel-error.log',
      out_file: './logs/tunnel-out.log',
    },
  ],
};
