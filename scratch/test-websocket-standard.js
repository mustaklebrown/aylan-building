const ws = require('ws');
const { Client, neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

const standardUrl = "postgresql://neondb_owner:npg_lHVNQy6bI0Zr@ep-wispy-salad-agln17vg.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

async function test() {
  console.log(`Testing WebSocket to Standard Host...`);
  const client = new Client({ connectionString: standardUrl });
  try {
    await client.connect();
    console.log(`WebSocket Standard Host SUCCESS!`);
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
  } catch (err) {
    console.log(`WebSocket Standard Host FAILED:`, err);
  } finally {
    await client.end();
  }
}

test();
