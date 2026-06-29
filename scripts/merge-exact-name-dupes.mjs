/**
 * Merge exact-name duplicate investors.
 * For each group of investors sharing the same name (case-insensitive, trimmed):
 *   - Keep the record with the lowest ID as the primary
 *   - Re-point all property_investors, distributions, investor_notes, investor_documents
 *     from the duplicates to the primary
 *   - Skip re-pointing a property_investor row if the primary already has a row
 *     for that property (to avoid unique-constraint violations)
 *   - Delete the duplicate investor records
 *
 * Run: node scripts/merge-exact-name-dupes.mjs
 */

import mysql from "mysql2/promise";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // 1. Find all duplicate groups
  const [groups] = await conn.execute(`
    SELECT
      LOWER(TRIM(name)) AS norm,
      MIN(id) AS primary_id,
      GROUP_CONCAT(id ORDER BY id SEPARATOR ',') AS all_ids
    FROM investors
    GROUP BY LOWER(TRIM(name))
    HAVING COUNT(*) > 1
    ORDER BY norm
  `);

  if (groups.length === 0) {
    console.log("No exact-name duplicates found. Nothing to do.");
    process.exit(0);
  }

  console.log(`Found ${groups.length} duplicate group(s):\n`);

  for (const group of groups) {
    const primaryId = group.primary_id;
    const allIds = group.all_ids.split(",").map(Number);
    const dupeIds = allIds.filter((id) => id !== primaryId);

    // Fetch names for logging
    const [nameRows] = await conn.execute(
      `SELECT id, name FROM investors WHERE id IN (${allIds.join(",")}) ORDER BY id`
    );
    console.log(`Group: "${group.norm}"`);
    nameRows.forEach((r) => console.log(`  ${r.id === primaryId ? "✓ KEEP" : "  DUPE"} [${r.id}] ${r.name}`));

    for (const dupeId of dupeIds) {
      // --- property_investors ---
      // Get properties the primary already has
      const [primaryProps] = await conn.execute(
        `SELECT property_id FROM property_investors WHERE investor_id = ?`,
        [primaryId]
      );
      const primaryPropIds = new Set(primaryProps.map((r) => r.property_id));

      // Get dupe's property links
      const [dupeProps] = await conn.execute(
        `SELECT property_id FROM property_investors WHERE investor_id = ?`,
        [dupeId]
      );

      for (const row of dupeProps) {
        if (primaryPropIds.has(row.property_id)) {
          // Primary already has this property — delete the dupe's link
          await conn.execute(
            `DELETE FROM property_investors WHERE investor_id = ? AND property_id = ?`,
            [dupeId, row.property_id]
          );
        } else {
          // Re-point to primary
          await conn.execute(
            `UPDATE property_investors SET investor_id = ? WHERE investor_id = ? AND property_id = ?`,
            [primaryId, dupeId, row.property_id]
          );
        }
      }

      // --- distributions ---
      await conn.execute(
        `UPDATE distributions SET investor_id = ? WHERE investor_id = ?`,
        [primaryId, dupeId]
      );

      // --- investor_notes ---
      await conn.execute(
        `UPDATE investor_notes SET investor_id = ? WHERE investor_id = ?`,
        [primaryId, dupeId]
      );

      // --- documents ---
      await conn.execute(
        `UPDATE documents SET investor_id = ? WHERE investor_id = ?`,
        [primaryId, dupeId]
      );

      // --- delete the dupe ---
      await conn.execute(`DELETE FROM investors WHERE id = ?`, [dupeId]);
      console.log(`  → Merged [${dupeId}] into [${primaryId}]`);
    }
    console.log();
  }

  console.log("✅ All exact-name duplicates merged successfully.");
} catch (err) {
  console.error("❌ Error during merge:", err.message);
  process.exit(1);
} finally {
  await conn.end();
}
