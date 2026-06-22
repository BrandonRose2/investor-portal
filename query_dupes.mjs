import { createConnection } from "mysql2/promise";
import { readFileSync } from "fs";

// Read DATABASE_URL from the project .env
const envContent = readFileSync("/home/ubuntu/grove-park-investor-portal/.env", "utf8");
const match = envContent.match(/DATABASE_URL=(.+)/);
const dbUrl = match?.[1]?.trim();
if (!dbUrl) { console.error("No DATABASE_URL"); process.exit(1); }

const url = new URL(dbUrl);
const conn = await createConnection({
  host: url.hostname,
  port: Number(url.port) || 3306,
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

const [rows] = await conn.execute(`
  SELECT pi.investor_id, i.name as investor_name, pi.property_id, p.name as property_name, pi.pct_capital
  FROM property_investors pi
  JOIN investors i ON i.id = pi.investor_id
  JOIN properties p ON p.id = pi.property_id
  WHERE pi.investor_id IN (109, 72, 42, 57, 94, 30)
  ORDER BY pi.investor_id, p.name
`);

console.table(rows);
await conn.end();
