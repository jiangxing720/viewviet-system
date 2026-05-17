import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL;
console.log('Connecting to:', url?.replace(/:[^@]*@/, ':***@'));

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 10000 });

try {
  const res = await pool.query('SELECT NOW()');
  console.log('✅ Connection successful! Server time:', res.rows[0].now);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
} finally {
  await pool.end();
}
