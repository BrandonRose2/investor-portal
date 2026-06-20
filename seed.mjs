// seed.mjs — populates the database with all investor data from investor_data.json
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync("/home/ubuntu/investor_data.json", "utf-8"));

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

// Import tables directly via raw SQL to avoid import issues
async function run() {
  console.log("🌱 Seeding database...");

  // Clear existing data in dependency order
  await connection.execute("DELETE FROM investor_notes");
  await connection.execute("DELETE FROM documents");
  await connection.execute("DELETE FROM distributions");
  await connection.execute("DELETE FROM property_investors");
  await connection.execute("DELETE FROM investors");
  await connection.execute("DELETE FROM properties");

  console.log("✓ Cleared existing data");

  const propertiesDict = data.properties; // { "ARA": { entity_name, entity_ein, investors }, ... }
  const propertyEntries = Object.entries(propertiesDict);
  console.log(`  Inserting ${propertyEntries.length} properties...`);

  // Build a map of investor name → id
  const investorMap = new Map(); // name → db id

  // Collect all unique investor names first
  const uniqueNames = new Set();
  for (const [, prop] of propertyEntries) {
    for (const inv of prop.investors) {
      uniqueNames.add(inv.name);
    }
  }

  // Build email map: name → email (take first occurrence)
  const emailMap = new Map();
  for (const [, prop] of propertyEntries) {
    for (const inv of prop.investors) {
      if (inv.email && !emailMap.has(inv.name)) emailMap.set(inv.name, inv.email);
    }
  }

  // Insert investors
  for (const name of uniqueNames) {
    const email = emailMap.get(name) || null;
    await connection.execute(
      "INSERT INTO investors (name, email, status) VALUES (?, ?, 'active')",
      [name, email]
    );
    const [rows] = await connection.execute(
      "SELECT id FROM investors WHERE name = ? ORDER BY id DESC LIMIT 1",
      [name]
    );
    investorMap.set(name, rows[0].id);
  }
  console.log(`  ✓ Inserted ${uniqueNames.size} unique investors`);

  // Insert properties and property_investors
  let propCount = 0;
  for (const [propName, prop] of propertyEntries) {
    // Generate slug id from property name
    const propId = propName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const isGrovePark = propName === 'Grove Park' ? 1 : 0;
    const mtNote = null;

    await connection.execute(
      `INSERT INTO properties (id, name, entity_name, entity_ein, is_grove_park, mt_note)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [propId, propName, prop.entity_name, prop.entity_ein || null, isGrovePark, mtNote]
    );

    for (const inv of prop.investors) {
      const investorId = investorMap.get(inv.name);
      if (!investorId) {
        console.warn(`  ⚠ No investor id for: ${inv.name}`);
        continue;
      }
      const pct = inv.pct_capital !== null && inv.pct_capital !== undefined
        ? parseFloat(inv.pct_capital).toFixed(6)
        : null;
      const notes = inv.notes || null;

      await connection.execute(
        `INSERT INTO property_investors (property_id, investor_id, pct_capital, notes)
         VALUES (?, ?, ?, ?)`,
        [propId, investorId, pct, notes]
      );
    }
    propCount++;
  }

  console.log(`  ✓ Inserted ${propCount} properties with all investor relationships`);
  console.log("🎉 Seed complete!");
  await connection.end();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
