const fs = require('fs');
const envContent = fs.readFileSync('.env', 'utf8');
const urlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
if (!urlMatch) { console.log('DATABASE_URL not found'); process.exit(1); }
const dbUrl = urlMatch[1];
console.log('Using URL:', dbUrl);

const ws = require('ws');
const { Client, neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

async function test() {
  const client = new Client({ connectionString: dbUrl });
  try {
    console.log('Connecting via WebSocket...');
    await client.connect();
    console.log('Connected! Querying...');
    const res = await client.query('SELECT NOW()');
    console.log('Success:', res.rows[0]);
  } catch (err) {
    console.error('Error object:', err);
  } finally {
    await client.end();
  }
}

test();
