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
} from "../drizzle/schema";
import { ENV } from './_core/env';

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
      (p.entityEin ?? "").toLowerCase().includes(q)
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
      status: investors.status,
      propertyCount: sql<number>`COUNT(DISTINCT ${propertyInvestors.propertyId})`,
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
      (i.email ?? "").toLowerCase().includes(q)
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
  data: { name?: string; email?: string | null; phone?: string | null; address?: string | null }
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
