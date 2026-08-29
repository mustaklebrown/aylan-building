import 'dotenv/config';
import { Pool } from 'pg';

async function testConn() {
  console.log('Testing pg pool connection...');
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const res = await pool.query('SELECT NOW() as now, count(*) from "user"');
    console.log('PG Success:', res.rows);
  } catch (e) {
    console.error('PG Direct Error:', e);
  } finally {
    await pool.end();
  }
}

testConn();
