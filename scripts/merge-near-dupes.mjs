/**
 * Merge confirmed near-duplicate investor groups.
 * For each group: re-point all related rows to the primary, then delete the duplicates.
 * Skips property_investors re-point if primary already has that property (avoids unique constraint).
 *
 * Groups:
 * 1. Brian Chadroff: keep [42] "Brian I. Chadroff Self-Directed IRA", merge [109] Brian Chadroff + [72] Brian I Chadroff Self-Directed IRA
 * 2. Fam Descendants Trust: keep [25], merge [71] "Fam Descendents Trust" (typo)
 * 3. Helenita Guei/Guie: keep [122] "Helenita Guei", merge [133] "Helenita Guie"
 * 4. Rick Realty Investments: keep [4], merge [99] "Rick Realty Invesments" (typo)
 * 5. Harold Menowitz Lifetime Trust: keep [2], merge [68] "The Harold Menowitz Lifetime Trust"
 * 6. MT/LT Investments III: keep [46] "MT Investments III, LLC", merge [48] "LT Investments III, LP"
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const MERGE_GROUPS = [
  { primary: 42, dupes: [109, 72], label: "Brian I. Chadroff Self-Directed IRA" },
  { primary: 25, dupes: [71],      label: "Fam Descendants Trust" },
  { primary: 122, dupes: [133],    label: "Helenita Guei" },
  { primary: 4,  dupes: [99],      label: "Rick Realty Investments" },
  { primary: 2,  dupes: [68],      label: "Harold Menowitz Lifetime Trust" },
  // Group 6 (MT vs LT Investments III) intentionally excluded — different entities
];

async function mergeInvestor(conn, primaryId, dupeId) {
  // property_investors
  const [primaryProps] = await conn.execute(
    `SELECT property_id FROM property_investors WHERE investor_id = ?`, [primaryId]
  );
  const primaryPropSet = new Set(primaryProps.map((r) => r.property_id));

  const [dupeProps] = await conn.execute(
    `SELECT property_id FROM property_investors WHERE investor_id = ?`, [dupeId]
  );
  for (const row of dupeProps) {
    if (primaryPropSet.has(row.property_id)) {
      await conn.execute(
        `DELETE FROM property_investors WHERE investor_id = ? AND property_id = ?`,
        [dupeId, row.property_id]
      );
    } else {
      await conn.execute(
        `UPDATE property_investors SET investor_id = ? WHERE investor_id = ? AND property_id = ?`,
        [primaryId, dupeId, row.property_id]
      );
    }
  }

  // distributions
  await conn.execute(`UPDATE distributions SET investor_id = ? WHERE investor_id = ?`, [primaryId, dupeId]);
  // investor_notes
  await conn.execute(`UPDATE investor_notes SET investor_id = ? WHERE investor_id = ?`, [primaryId, dupeId]);
  // documents
  await conn.execute(`UPDATE documents SET investor_id = ? WHERE investor_id = ?`, [primaryId, dupeId]);
  // dismissed_duplicates — clean up any dismissed entries that referenced this dupe
  await conn.execute(`DELETE FROM dismissed_duplicates WHERE group_key LIKE ?`, [`%${dupeId}%`]);

  // delete dupe
  await conn.execute(`DELETE FROM investors WHERE id = ?`, [dupeId]);
  console.log(`  → Merged [${dupeId}] into [${primaryId}]`);
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);
try {
  for (const group of MERGE_GROUPS) {
    console.log(`\nGroup: "${group.label}" (primary [${group.primary}])`);
    for (const dupeId of group.dupes) {
      await mergeInvestor(conn, group.primary, dupeId);
    }
  }
  const [[{ total }]] = await conn.execute(`SELECT COUNT(*) as total FROM investors`);
  console.log(`\n✅ All near-duplicate groups merged. Investor count: ${total}`);
} catch (err) {
  console.error("❌ Error:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}
