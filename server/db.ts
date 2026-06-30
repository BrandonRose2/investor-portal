import { eq, like, or, desc, asc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  properties,
  investors,
  propertyInvestors,
  distributions,
  documents,
  investorNotes,
  dismissedDuplicates,
  marcAccessUsers,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import bcrypt from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Properties helpers ───────────────────────────────────────────────────────

export async function listProperties(search?: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: properties.id,
      name: properties.name,
      entityName: properties.entityName,
      entityEin: properties.entityEin,
      isGrovePark: properties.isGrovePark,
      mtNote: properties.mtNote,
      investorCount: sql<number>`COUNT(DISTINCT ${propertyInvestors.investorId})`,
      // Most recent non-null piNote across all investors in this property
      latestPiNote: sql<string | null>`MAX(CASE WHEN ${propertyInvestors.notes} IS NOT NULL AND ${propertyInvestors.notes} != '' THEN ${propertyInvestors.notes} ELSE NULL END)`,
    })
    .from(properties)
    .leftJoin(propertyInvestors, eq(properties.id, propertyInvestors.propertyId))
    .groupBy(properties.id)
    .orderBy(asc(properties.name));

  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.entityName.toLowerCase().includes(q) ||
      (p.entityEin ?? "").toLowerCase().includes(q) ||
      (p.latestPiNote ?? "").toLowerCase().includes(q) ||
      (p.mtNote ?? "").toLowerCase().includes(q)
  );
}

export async function getPropertyById(id: string) {
  const db = await getDb();
  if (!db) return null;

  const [prop] = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  if (!prop) return null;

  const invRows = await db
    .select({
      investorId: investors.id,
      investorName: investors.name,
      investorEmail: investors.email,
      investorStatus: investors.status,
      pctCapital: propertyInvestors.pctCapital,
      piNotes: propertyInvestors.notes,
      piId: propertyInvestors.id,
    })
    .from(propertyInvestors)
    .innerJoin(investors, eq(propertyInvestors.investorId, investors.id))
    .where(eq(propertyInvestors.propertyId, id))
    .orderBy(desc(propertyInvestors.pctCapital));

  return { ...prop, investors: invRows };
}

// ─── Investors helpers ────────────────────────────────────────────────────────

export async function listInvestors(search?: string) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: investors.id,
      name: investors.name,
      email: investors.email,
      phone: investors.phone,
      status: investors.status,
      adminNotes: investors.adminNotes,
      propertyCount: sql<number>`COUNT(DISTINCT ${propertyInvestors.propertyId})`,
      // Most recent non-null piNote across all properties for this investor
      latestPiNote: sql<string | null>`MAX(CASE WHEN ${propertyInvestors.notes} IS NOT NULL AND ${propertyInvestors.notes} != '' THEN ${propertyInvestors.notes} ELSE NULL END)`,
    })
    .from(investors)
    .leftJoin(propertyInvestors, eq(investors.id, propertyInvestors.investorId))
    .groupBy(investors.id)
    .orderBy(asc(investors.name));

  if (!search) return rows;
  const q = search.toLowerCase();
  return rows.filter(
    (i) =>
      i.name.toLowerCase().includes(q) ||
      (i.email ?? "").toLowerCase().includes(q) ||
      (i.adminNotes ?? "").toLowerCase().includes(q) ||
      (i.latestPiNote ?? "").toLowerCase().includes(q)
  );
}

export async function getInvestorById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [inv] = await db.select().from(investors).where(eq(investors.id, id)).limit(1);
  if (!inv) return null;

  const propRows = await db
    .select({
      propertyId: properties.id,
      propertyName: properties.name,
      entityName: properties.entityName,
      entityEin: properties.entityEin,
      isGrovePark: properties.isGrovePark,
      pctCapital: propertyInvestors.pctCapital,
      piNotes: propertyInvestors.notes,
      piId: propertyInvestors.id,
    })
    .from(propertyInvestors)
    .innerJoin(properties, eq(propertyInvestors.propertyId, properties.id))
    .where(eq(propertyInvestors.investorId, id))
    .orderBy(asc(properties.name));

  return { ...inv, properties: propRows };
}

export async function updateInvestorStatus(
  id: number,
  status: "active" | "deceased" | "transferred" | "bought_out"
) {
  const db = await getDb();
  if (!db) return;
  await db.update(investors).set({ status }).where(eq(investors.id, id));
}

export async function updateInvestorInfo(
  id: number,
  data: { name?: string; email?: string | null; phone?: string | null; address?: string | null; adminNotes?: string | null }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(investors).set(data).where(eq(investors.id, id));
}

// ─── Notes helpers ────────────────────────────────────────────────────────────

export async function listNotes(investorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(investorNotes)
    .where(eq(investorNotes.investorId, investorId))
    .orderBy(desc(investorNotes.createdAt));
}

export async function createNote(data: {
  investorId: number;
  propertyId?: string | null;
  content: string;
  authorId?: number | null;
  authorName?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(investorNotes).values({
    investorId: data.investorId,
    propertyId: data.propertyId ?? null,
    content: data.content,
    authorId: data.authorId ?? null,
    authorName: data.authorName ?? null,
  });
  const insertId = (result as any).insertId as number;
  const [note] = await db.select().from(investorNotes).where(eq(investorNotes.id, insertId)).limit(1);
  return note ?? null;
}

export async function deleteNote(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(investorNotes).where(eq(investorNotes.id, id));
}

// ─── Distributions helpers ────────────────────────────────────────────────────

export async function listDistributions(filters: {
  propertyId?: string;
  investorId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.propertyId) conditions.push(eq(distributions.propertyId, filters.propertyId));
  if (filters.investorId) conditions.push(eq(distributions.investorId, filters.investorId));

  const rows = await db
    .select({
      id: distributions.id,
      propertyId: distributions.propertyId,
      propertyName: properties.name,
      investorId: distributions.investorId,
      investorName: investors.name,
      year: distributions.year,
      amount: distributions.amount,
      type: distributions.type,
      notes: distributions.notes,
      createdAt: distributions.createdAt,
    })
    .from(distributions)
    .leftJoin(properties, eq(distributions.propertyId, properties.id))
    .leftJoin(investors, eq(distributions.investorId, investors.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(distributions.year), desc(distributions.createdAt));

  return rows;
}

export async function createDistribution(data: {
  propertyId: string;
  investorId: number;
  year: number;
  amount: string;
  type: "k1" | "cash" | "return_of_capital" | "other";
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(distributions).values({
    propertyId: data.propertyId,
    investorId: data.investorId,
    year: data.year,
    amount: data.amount,
    type: data.type,
    notes: data.notes ?? null,
  });
  const insertId = (result as any).insertId as number;
  const [row] = await db.select().from(distributions).where(eq(distributions.id, insertId)).limit(1);
  return row ?? null;
}

export async function deleteDistribution(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(distributions).where(eq(distributions.id, id));
}

// ─── Documents helpers ────────────────────────────────────────────────────────

export async function listDocuments(filters: {
  propertyId?: string;
  investorId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters.propertyId) conditions.push(eq(documents.propertyId, filters.propertyId));
  if (filters.investorId) conditions.push(eq(documents.investorId, filters.investorId));

  const rows = await db
    .select({
      id: documents.id,
      propertyId: documents.propertyId,
      investorId: documents.investorId,
      filename: documents.filename,
      storageKey: documents.storageKey,
      storageUrl: documents.storageUrl,
      mimeType: documents.mimeType,
      sizeBytes: documents.sizeBytes,
      category: documents.category,
      year: documents.year,
      uploadedBy: documents.uploadedBy,
      createdAt: documents.createdAt,
      propertyName: properties.name,
      investorName: investors.name,
    })
    .from(documents)
    .leftJoin(properties, eq(documents.propertyId, properties.id))
    .leftJoin(investors, eq(documents.investorId, investors.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(documents.createdAt));

  return rows;
}

export async function createDocument(data: {
  propertyId?: string | null;
  investorId?: number | null;
  filename: string;
  storageKey: string;
  storageUrl: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  category: "lp_agreement" | "k1" | "tax_form" | "correspondence" | "other";
  year?: number | null;
  uploadedBy?: number | null;
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(documents).values({
    propertyId: data.propertyId ?? null,
    investorId: data.investorId ?? null,
    filename: data.filename,
    storageKey: data.storageKey,
    storageUrl: data.storageUrl,
    mimeType: data.mimeType ?? null,
    sizeBytes: data.sizeBytes ?? null,
    category: data.category,
    year: data.year ?? null,
    uploadedBy: data.uploadedBy ?? null,
  });
  const insertId = (result as any).insertId as number;
  const [doc] = await db.select().from(documents).where(eq(documents.id, insertId)).limit(1);
  return doc ?? null;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documents).where(eq(documents.id, id));
}

export async function renameDocument(id: number, filename: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(documents).set({ filename }).where(eq(documents.id, id));
}

// ─── Admin: property/investor CRUD ───────────────────────────────────────────

export async function createProperty(data: {
  id: string;
  name: string;
  entityName: string;
  entityEin?: string | null;
  isGrovePark?: boolean;
  mtNote?: string | null;
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(properties).values({
    id: data.id,
    name: data.name,
    entityName: data.entityName,
    entityEin: data.entityEin ?? null,
    isGrovePark: data.isGrovePark ?? false,
    mtNote: data.mtNote ?? null,
  });
  const [prop] = await db.select().from(properties).where(eq(properties.id, data.id)).limit(1);
  return prop ?? null;
}

export async function updateProperty(
  id: string,
  data: { name?: string; entityName?: string; entityEin?: string | null; mtNote?: string | null }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(properties).set(data).where(eq(properties.id, id));
}

export async function deleteProperty(id: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(propertyInvestors).where(eq(propertyInvestors.propertyId, id));
  await db.delete(properties).where(eq(properties.id, id));
}

export async function upsertPropertyInvestor(data: {
  propertyId: string;
  investorId: number;
  pctCapital?: string | null;
  notes?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(propertyInvestors)
    .where(
      and(
        eq(propertyInvestors.propertyId, data.propertyId),
        eq(propertyInvestors.investorId, data.investorId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(propertyInvestors)
      .set({ pctCapital: data.pctCapital ?? null, notes: data.notes ?? null })
      .where(eq(propertyInvestors.id, existing[0].id));
  } else {
    await db.insert(propertyInvestors).values({
      propertyId: data.propertyId,
      investorId: data.investorId,
      pctCapital: data.pctCapital ?? null,
      notes: data.notes ?? null,
    });
  }
}

export async function deletePropertyInvestor(propertyId: string, investorId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(propertyInvestors)
    .where(
      and(
        eq(propertyInvestors.propertyId, propertyId),
        eq(propertyInvestors.investorId, investorId)
      )
    );
}

export async function createInvestor(data: {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status?: "active" | "deceased" | "transferred" | "bought_out";
}) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(investors).values({
    name: data.name,
    email: data.email ?? null,
    phone: data.phone ?? null,
    address: data.address ?? null,
    status: data.status ?? "active",
  });
  const insertId = (result as any).insertId as number;
  const [inv] = await db.select().from(investors).where(eq(investors.id, insertId)).limit(1);
  return inv ?? null;
}

export async function deleteInvestor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(propertyInvestors).where(eq(propertyInvestors.investorId, id));
  await db.delete(investorNotes).where(eq(investorNotes.investorId, id));
  await db.delete(distributions).where(eq(distributions.investorId, id));
  await db.delete(documents).where(eq(documents.investorId, id));
  await db.delete(investors).where(eq(investors.id, id));
}

// ─── Financial summary ────────────────────────────────────────────────────────

export async function getInvestorFinancialSummary(investorId: number) {
  const db = await getDb();
  if (!db) return { totalDistributions: 0, distributionsByYear: [] };

  const rows = await db
    .select({
      year: distributions.year,
      type: distributions.type,
      total: sql<string>`SUM(${distributions.amount})`,
    })
    .from(distributions)
    .where(eq(distributions.investorId, investorId))
    .groupBy(distributions.year, distributions.type)
    .orderBy(desc(distributions.year));

  const totalDistributions = rows.reduce((sum, r) => sum + parseFloat(r.total ?? "0"), 0);

  const byYear: Record<number, Record<string, number>> = {};
  for (const r of rows) {
    if (!byYear[r.year]) byYear[r.year] = {};
    byYear[r.year][r.type] = parseFloat(r.total ?? "0");
  }

  const distributionsByYear = Object.entries(byYear)
    .map(([year, types]) => ({ year: parseInt(year), ...types }))
    .sort((a, b) => b.year - a.year);

  return { totalDistributions, distributionsByYear };
}

// ─── Duplicate investor detection & merge ────────────────────────────────────

export async function findDuplicateInvestors() {
  const db = await getDb();
  if (!db) return [];

  // Get all investors that share an email with at least one other investor
  const dupeRows = await db
    .select({
      id: investors.id,
      name: investors.name,
      email: investors.email,
      phone: investors.phone,
      status: investors.status,
      adminNotes: investors.adminNotes,
      propertyCount: sql<number>`(SELECT COUNT(*) FROM ${propertyInvestors} pi WHERE pi.investor_id = ${investors.id})`,
    })
    .from(investors)
    .where(
      sql`${investors.email} IN (
        SELECT email FROM ${investors} AS i2
        WHERE i2.email IS NOT NULL AND i2.email != ''
        GROUP BY i2.email HAVING COUNT(*) > 1
      )`
    )
    .orderBy(asc(investors.email), asc(investors.id));

  // Group by email
  const groups: Record<string, typeof dupeRows> = {};
  for (const row of dupeRows) {
    const key = row.email!;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  return Object.entries(groups).map(([email, members]) => ({ email, members }));
}

/**
 * Merge all `sourceIds` into `targetId`:
 * - Re-point property_investors, investor_notes, distributions, documents
 * - De-duplicate property_investors (skip if target already has that property)
 * - Delete the source investor records
 */
export async function mergeInvestors(targetId: number, sourceIds: number[]) {
  const db = await getDb();
  if (!db) return;
  if (sourceIds.length === 0) return;

  for (const srcId of sourceIds) {
    // Get existing property links on target to avoid duplicates
    const targetLinks = await db
      .select({ propertyId: propertyInvestors.propertyId })
      .from(propertyInvestors)
      .where(eq(propertyInvestors.investorId, targetId));
    const targetPropIds = new Set(targetLinks.map((l) => l.propertyId));

    // Get source property links
    const srcLinks = await db
      .select()
      .from(propertyInvestors)
      .where(eq(propertyInvestors.investorId, srcId));

    for (const link of srcLinks) {
      if (targetPropIds.has(link.propertyId)) {
        // Target already has this property — just delete the source link
        await db.delete(propertyInvestors).where(eq(propertyInvestors.id, link.id));
      } else {
        // Re-point to target
        await db
          .update(propertyInvestors)
          .set({ investorId: targetId })
          .where(eq(propertyInvestors.id, link.id));
        targetPropIds.add(link.propertyId);
      }
    }

    // Re-point notes, distributions, documents
    await db.update(investorNotes).set({ investorId: targetId }).where(eq(investorNotes.investorId, srcId));
    await db.update(distributions).set({ investorId: targetId }).where(eq(distributions.investorId, srcId));
    await db.update(documents).set({ investorId: targetId }).where(eq(documents.investorId, srcId));

    // Delete the source investor
    await db.delete(investors).where(eq(investors.id, srcId));
  }
}

// ─── Fuzzy name similarity detection ─────────────────────────────────────────

/**
 * Normalize an investor name for comparison:
 * - lowercase
 * - strip common legal suffixes (LLC, LP, Inc, Trust, etc.)
 * - strip punctuation and extra whitespace
 * - strip parenthetical annotations like "(Rich Miller)"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    // Remove parenthetical content like "(Rich Miller)" or "(Tim Tucker)"
    .replace(/\s*\([^)]*\)/g, "")
    // Remove common legal entity suffixes
    .replace(/\b(llc|lp|l\.p\.|l\.l\.c\.|inc|incorporated|corp|corporation|co\.|company|trust|revocable trust|family trust|living trust|self[- ]directed|retirement (account|plan)|fbo|acct|holdings|investments?|equities|partners?|capital|solutions?|group|fund|associates?|properties|realty|management|services?)\b/g, "")
    // Remove punctuation except spaces
    .replace(/[^a-z0-9\s]/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute Levenshtein distance between two strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Similarity score 0–1 (1 = identical).
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 && b.length === 0) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

export type SimilarNameGroup = {
  reason: string;
  score: number;
  members: Array<{
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    propertyCount: number;
  }>;
};

/**
 * Find pairs/groups of investors whose normalized names are very similar
 * but are stored as separate records (different IDs).
 * Returns groups sorted by descending similarity score.
 */
export async function findSimilarNameInvestors(threshold = 0.82): Promise<SimilarNameGroup[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: investors.id,
      name: investors.name,
      email: investors.email,
      phone: investors.phone,
      status: investors.status,
      propertyCount: sql<number>`(SELECT COUNT(*) FROM ${propertyInvestors} pi WHERE pi.investor_id = ${investors.id})`,
    })
    .from(investors)
    .orderBy(asc(investors.id));

  // Build normalized index
  const normed = rows.map((r) => ({ ...r, norm: normalizeName(r.name) }));

  // Skip entries whose normalized form is too short to be meaningful
  const candidates = normed.filter((r) => r.norm.length >= 3);

  const seen = new Set<string>();
  const groups: SimilarNameGroup[] = [];

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i];
      const b = candidates[j];

      // Skip if they already share an email (already surfaced in email-dupe scan)
      if (a.email && b.email && a.email === b.email) continue;

      const score = similarity(a.norm, b.norm);
      if (score < threshold) continue;

      // Deduplicate: use sorted ID pair as key
      const key = [a.id, b.id].sort((x, y) => x - y).join("-");
      if (seen.has(key)) continue;
      seen.add(key);

      groups.push({
        reason: `Name similarity ${(score * 100).toFixed(0)}%`,
        score,
        members: [
          { id: a.id, name: a.name, email: a.email ?? null, phone: a.phone ?? null, status: a.status, propertyCount: Number(a.propertyCount) },
          { id: b.id, name: b.name, email: b.email ?? null, phone: b.phone ?? null, status: b.status, propertyCount: Number(b.propertyCount) },
        ],
      });
    }
  }

  // Merge overlapping pairs into multi-member groups
  const merged: SimilarNameGroup[] = [];
  const usedKeys = new Set<string>();

  for (const g of groups.sort((a, b) => b.score - a.score)) {
    const ids = g.members.map((m) => m.id);
    const pairKey = ids.sort((a, b) => a - b).join("-");
    if (usedKeys.has(pairKey)) continue;

    // Find all other groups that share at least one member with this group
    const memberIds = new Set(ids);
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of groups) {
        const otherIds = other.members.map((m) => m.id);
        const otherKey = [...otherIds].sort((a, b) => a - b).join("-");
        if (usedKeys.has(otherKey)) continue;
        if (otherIds.some((id) => memberIds.has(id))) {
          otherIds.forEach((id) => memberIds.add(id));
          usedKeys.add(otherKey);
          changed = true;
        }
      }
    }
    usedKeys.add(pairKey);

    const allMembers = candidates
      .filter((r) => memberIds.has(r.id))
      .map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email ?? null,
        phone: r.phone ?? null,
        status: r.status,
        propertyCount: Number(r.propertyCount),
      }));

    merged.push({
      reason: g.reason,
      score: g.score,
      members: allMembers,
    });
  }

  return merged;
}

// ─── Dismissed Duplicates ─────────────────────────────────────────────────────

/** Build a stable, sorted key from a list of member IDs. */
export function buildGroupKey(memberIds: number[]): string {
  return [...memberIds].sort((a, b) => a - b).join(",");
}

export async function listDismissedDuplicates() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(dismissedDuplicates)
    .orderBy(desc(dismissedDuplicates.dismissedAt));
}

export async function dismissDuplicateGroup(
  memberIds: number[],
  label: string,
  scanType: "email" | "name"
) {
  const db = await getDb();
  if (!db) return;
  const groupKey = buildGroupKey(memberIds);
  await db
    .insert(dismissedDuplicates)
    .values({ groupKey, label, scanType })
    .onDuplicateKeyUpdate({ set: { label, scanType } });
}

export async function restoreDismissedGroup(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(dismissedDuplicates).where(eq(dismissedDuplicates.id, id));
}

export async function getDismissedKeys(): Promise<Set<string>> {
  const rows = await listDismissedDuplicates();
  return new Set(rows.map((r) => r.groupKey));
}

// ─── Marc's Investments Access Control ───────────────────────────────────────

export async function listMarcAccessUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: marcAccessUsers.id,
      email: marcAccessUsers.email,
      displayName: marcAccessUsers.displayName,
      isActive: marcAccessUsers.isActive,
      hasPin: sql<boolean>`(${marcAccessUsers.pinHash} IS NOT NULL)`,
      lastAccessAt: marcAccessUsers.lastAccessAt,
      createdAt: marcAccessUsers.createdAt,
    })
    .from(marcAccessUsers)
    .orderBy(asc(marcAccessUsers.email));
}

export async function addMarcAccessUser(email: string, displayName?: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(marcAccessUsers)
    .values({ email: email.toLowerCase().trim(), displayName: displayName ?? null })
    .onDuplicateKeyUpdate({ set: { isActive: true, displayName: displayName ?? undefined } });
}

export async function removeMarcAccessUser(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(marcAccessUsers).set({ isActive: false }).where(eq(marcAccessUsers.id, id));
}

export async function resetMarcAccessPin(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(marcAccessUsers).set({ pinHash: null }).where(eq(marcAccessUsers.id, id));
}

/** Returns null if email not found or inactive. Returns 'no-pin' if PIN not yet set. */
export async function checkMarcAccessEmail(
  email: string
): Promise<"no-pin" | "has-pin" | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({ pinHash: marcAccessUsers.pinHash, isActive: marcAccessUsers.isActive })
    .from(marcAccessUsers)
    .where(eq(marcAccessUsers.email, email.toLowerCase().trim()))
    .limit(1);
  if (!rows.length || !rows[0].isActive) return null;
  return rows[0].pinHash ? "has-pin" : "no-pin";
}

/** Sets a new PIN for the user. Returns false if email not found/inactive. */
export async function setMarcAccessPin(email: string, pin: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: marcAccessUsers.id, isActive: marcAccessUsers.isActive })
    .from(marcAccessUsers)
    .where(eq(marcAccessUsers.email, email.toLowerCase().trim()))
    .limit(1);
  if (!rows.length || !rows[0].isActive) return false;
  const hash = await bcrypt.hash(pin, 10);
  await db
    .update(marcAccessUsers)
    .set({ pinHash: hash })
    .where(eq(marcAccessUsers.id, rows[0].id));
  return true;
}

/** Verifies a PIN. Returns true on success and updates lastAccessAt. */
export async function verifyMarcAccessPin(email: string, pin: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: marcAccessUsers.id, pinHash: marcAccessUsers.pinHash, isActive: marcAccessUsers.isActive })
    .from(marcAccessUsers)
    .where(eq(marcAccessUsers.email, email.toLowerCase().trim()))
    .limit(1);
  if (!rows.length || !rows[0].isActive || !rows[0].pinHash) return false;
  const ok = await bcrypt.compare(pin, rows[0].pinHash);
  if (ok) {
    await db
      .update(marcAccessUsers)
      .set({ lastAccessAt: new Date() })
      .where(eq(marcAccessUsers.id, rows[0].id));
  }
  return ok;
}
