const pg = require('/Users/zhangxing/Downloads/Smart-System-Optimize 2/node_modules/.pnpm/pg@8.20.0/node_modules/pg');
const bcrypt = require('/Users/zhangxing/Downloads/Smart-System-Optimize 2/node_modules/.pnpm/bcryptjs@3.0.3/node_modules/bcryptjs');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 15000
});

(async () => {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query('DELETE FROM users');
    await pool.query(
      'INSERT INTO users (username, email, password_hash, role, display_name) VALUES ($1,$2,$3,$4,$5)',
      ['admin', 'admin@viewviet.com', hash, 'admin', '管理员']
    );
    console.log('✅ Admin user created!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    
    const res = await pool.query('SELECT id, username, email, role FROM users');
    console.log('\nAll users:', JSON.stringify(res.rows, null, 2));
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await pool.end();
  }
})();
