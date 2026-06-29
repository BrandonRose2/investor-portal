import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await conn.execute(
  "SELECT id, name FROM investors ORDER BY LOWER(TRIM(name))"
);
rows.forEach((r) => console.log(`[${r.id}] ${r.name}`));
console.log(`\nTotal: ${rows.length}`);
await conn.end();
