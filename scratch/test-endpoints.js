const { Client: PgClient } = require('pg');
const ws = require('ws');
const { Client: NeonClient, neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;

const pooledUrl = "postgresql://neondb_owner:npg_lHVNQy6bI0Zr@ep-wispy-salad-agln17vg-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";
const standardUrl = "postgresql://neondb_owner:npg_lHVNQy6bI0Zr@ep-wispy-salad-agln17vg.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require";

async function testDirectTcp(url, name) {
  console.log(`[TCP] Testing direct TCP to ${name}...`);
  const client = new PgClient({ connectionString: url });
  try {
    await client.connect();
    console.log(`[TCP] ${name} SUCCESS!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`[TCP] ${name} FAILED:`, err.message || err);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function testWebSocket(url, name) {
  console.log(`[WS] Testing WebSocket to ${name}...`);
  const client = new NeonClient({ connectionString: url });
  try {
    await client.connect();
    console.log(`[WS] ${name} SUCCESS!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`[WS] ${name} FAILED:`, err.message || err);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function run() {
  await testDirectTcp(pooledUrl, "Pooled Host");
  await testDirectTcp(standardUrl, "Standard Host");
  await testWebSocket(pooledUrl, "Pooled Host");
  await testWebSocket(standardUrl, "Standard Host");
}

run();
