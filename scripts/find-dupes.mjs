import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(`
  SELECT i.email, i.id, i.name, i.status,
    (SELECT COUNT(*) FROM property_investors pi WHERE pi.investor_id = i.id) AS props
  FROM investors i
  WHERE i.email IN (
    SELECT email FROM investors
    WHERE email IS NOT NULL AND email != ''
    GROUP BY email HAVING COUNT(*) > 1
  )
  ORDER BY i.email, i.id
`);

const groups = {};
for (const r of rows) {
  if (!groups[r.email]) groups[r.email] = [];
  groups[r.email].push(r);
}

for (const [email, members] of Object.entries(groups)) {
  console.log('EMAIL:', email);
  for (const m of members) {
    console.log(`  ID:${m.id} | ${m.name} | ${m.status} | props:${m.props}`);
  }
}

await conn.end();
