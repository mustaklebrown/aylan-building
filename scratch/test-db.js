const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!urlMatch) { console.log('DATABASE_URL not found'); process.exit(1); }
process.env.DATABASE_URL = urlMatch[1];

const ws = require('ws');
const { Pool, neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT current_user, current_database()').then(r => {
  console.log('DB OK:', JSON.stringify(r.rows[0]));
  return pool.end();
}).catch(e => {
  console.log('DB ERROR:', e.code, e.message ? e.message.slice(0, 150) : '');
  return pool.end();
}).then(() => process.exit(0));
