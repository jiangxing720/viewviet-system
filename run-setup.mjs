import pg from 'pg';
import { readFileSync } from 'fs';
const { Pool } = pg;

const url = process.env.DATABASE_URL;
console.log('Connecting to Supabase...');

const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 15000 });

try {
  const sql = readFileSync('./setup-db.sql', 'utf8');
  await pool.query(sql);
  console.log('✅ All tables created successfully!');
  
  // Verify tables
  const res = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
  console.log('\n📋 Tables in database:');
  res.rows.forEach(r => console.log('  -', r.tablename));
  
  // Check users
  const users = await pool.query('SELECT id, username, email, role FROM users');
  console.log('\n👤 Users:');
  users.rows.forEach(r => console.log('  -', r.username, '(' + r.role + ')'));
  
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  await pool.end();
}
