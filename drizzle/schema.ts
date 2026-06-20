import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  bigint,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Properties ──────────────────────────────────────────────────────────────
export const properties = mysqlTable("properties", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  entityName: varchar("entity_name", { length: 255 }).notNull(),
  entityEin: varchar("entity_ein", { length: 20 }),
  isGrovePark: boolean("is_grove_park").default(false).notNull(),
  mtNote: text("mt_note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// ─── Investors ────────────────────────────────────────────────────────────────
export const investors = mysqlTable("investors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  status: mysqlEnum("status", ["active", "deceased", "transferred", "bought_out"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Investor = typeof investors.$inferSelect;
export type InsertInvestor = typeof investors.$inferInsert;

// ─── Property Investors (junction) ───────────────────────────────────────────
export const propertyInvestors = mysqlTable("property_investors", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: varchar("property_id", { length: 64 }).notNull(),
  investorId: int("investor_id").notNull(),
  pctCapital: decimal("pct_capital", { precision: 12, scale: 6 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PropertyInvestor = typeof propertyInvestors.$inferSelect;
export type InsertPropertyInvestor = typeof propertyInvestors.$inferInsert;

// ─── Distributions ────────────────────────────────────────────────────────────
export const distributions = mysqlTable("distributions", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: varchar("property_id", { length: 64 }).notNull(),
  investorId: int("investor_id").notNull(),
  year: int("year").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["k1", "cash", "return_of_capital", "other"]).default("k1").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Distribution = typeof distributions.$inferSelect;
export type InsertDistribution = typeof distributions.$inferInsert;

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: varchar("property_id", { length: 64 }),
  investorId: int("investor_id"),
  filename: varchar("filename", { length: 255 }).notNull(),
  storageKey: varchar("storage_key", { length: 512 }).notNull(),
  storageUrl: varchar("storage_url", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  category: mysqlEnum("category", ["lp_agreement", "k1", "tax_form", "correspondence", "other"]).default("other").notNull(),
  year: int("year"),
  uploadedBy: int("uploaded_by"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Investor Notes (timeline) ────────────────────────────────────────────────
export const investorNotes = mysqlTable("investor_notes", {
  id: int("id").autoincrement().primaryKey(),
  investorId: int("investor_id").notNull(),
  propertyId: varchar("property_id", { length: 64 }),
  content: text("content").notNull(),
  authorId: int("author_id"),
  authorName: varchar("author_name", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InvestorNote = typeof investorNotes.$inferSelect;
export type InsertInvestorNote = typeof investorNotes.$inferInsert;