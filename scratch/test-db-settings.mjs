import pg from 'pg';

const connectionString = "postgresql://postgres.ixraudtkvnpihmwlweux:Zx2301609082%40@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres";
const client = new pg.Client({ connectionString });

async function main() {
  await client.connect();
  console.log("Connected to Supabase.");
  const res = await client.query("SELECT * FROM site_settings;");
  console.log("Rows:");
  for (const row of res.rows) {
    console.log(`- Key: ${row.key}, Section: ${row.section}, FieldType: ${row.field_type}`);
    if (row.key === 'learn_languages') {
      console.log(`  Value: ${row.value}`);
    }
  }
  await client.end();
}

main().catch(console.error);
