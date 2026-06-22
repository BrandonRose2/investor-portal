/**
 * Integration-style tests for the main tRPC routers.
 * Uses appRouter.createCaller with a mocked TrpcContext — no HTTP, no DB.
 * DB calls are mocked via vi.mock so tests run in isolation.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

// ── Mock all DB helpers ──────────────────────────────────────────────────────
vi.mock("./db", () => ({
  listProperties: vi.fn().mockResolvedValue([
    { id: "anaheim-gardens", name: "Anaheim Gardens", entityName: "Anaheim Gardens Housing, LP", entityEin: "87-0708063", isGrovePark: false, investorCount: 8 },
  ]),
  getPropertyById: vi.fn().mockResolvedValue({
    id: "anaheim-gardens", name: "Anaheim Gardens", entityName: "Anaheim Gardens Housing, LP", entityEin: "87-0708063", isGrovePark: false, investors: [],
  }),
  listInvestors: vi.fn().mockResolvedValue([
    { id: 1, name: "Marc Menowitz", email: "marc@example.com", status: "active", propertyCount: 10 },
  ]),
  getInvestorById: vi.fn().mockResolvedValue({
    id: 1, name: "Marc Menowitz", email: "marc@example.com", status: "active", phone: null, properties: [],
  }),
  updateInvestorStatus: vi.fn().mockImplementation((_id, status) => Promise.resolve({ id: 1, status })),
  updateInvestorInfo: vi.fn().mockResolvedValue({ id: 1, name: "Marc Menowitz Updated" }),
  listNotes: vi.fn().mockResolvedValue([
    { id: 1, investorId: 1, content: "Test note", authorName: "Admin", createdAt: new Date() },
  ]),
  createNote: vi.fn().mockResolvedValue({ id: 2, investorId: 1, content: "New note", authorName: "Admin", createdAt: new Date() }),
  deleteNote: vi.fn().mockResolvedValue({ id: 1 }),
  listDistributions: vi.fn().mockResolvedValue([
    { id: 1, propertyId: "anaheim-gardens", investorId: 1, year: 2023, amount: "5000.00", type: "k1" },
  ]),
  createDistribution: vi.fn().mockResolvedValue({ id: 2 }),
  deleteDistribution: vi.fn().mockResolvedValue({ id: 1 }),
  listDocuments: vi.fn().mockResolvedValue([
    { id: 1, filename: "test.pdf", storageUrl: "/manus-storage/test.pdf", category: "k1", createdAt: new Date() },
  ]),
  createDocument: vi.fn().mockResolvedValue({ id: 2 }),
  deleteDocument: vi.fn().mockResolvedValue({ id: 1 }),
  createProperty: vi.fn().mockResolvedValue({ id: "new-prop" }),
  updateProperty: vi.fn().mockResolvedValue({ id: "anaheim-gardens" }),
  deleteProperty: vi.fn().mockResolvedValue({ id: "anaheim-gardens" }),
  upsertPropertyInvestor: vi.fn().mockResolvedValue({ id: 1 }),
  deletePropertyInvestor: vi.fn().mockResolvedValue({ id: 1 }),
  createInvestor: vi.fn().mockResolvedValue({ id: 10 }),
  deleteInvestor: vi.fn().mockResolvedValue({ id: 1 }),
  getInvestorFinancialSummary: vi.fn().mockResolvedValue({ totalDistributions: 5000, distributionCount: 1 }),
  findDuplicateInvestors: vi.fn().mockResolvedValue([
    { email: "test@example.com", members: [
      { id: 1, name: "Investor A", email: "test@example.com", status: "active", propertyCount: 2 },
      { id: 2, name: "Investor B", email: "test@example.com", status: "active", propertyCount: 1 },
    ]},
  ]),
  mergeInvestors: vi.fn().mockResolvedValue(undefined),
  renameDocument: vi.fn().mockResolvedValue(undefined),
}));

// ── Mock storage ─────────────────────────────────────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "documents/test.pdf", url: "/manus-storage/documents/test.pdf" }),
}));

// ── Context helpers ──────────────────────────────────────────────────────────
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "test-open-id",
    email: "admin@example.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function makeCtx(user: AuthenticatedUser | null = null): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// Lazy import to ensure mocks are applied first
async function getCaller(ctx: TrpcContext) {
  const { appRouter } = await import("./routers");
  return appRouter.createCaller(ctx);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("properties.list", () => {
  it("returns properties for public callers", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.properties.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
  });
});

describe("properties.getById", () => {
  it("returns a property by id", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.properties.getById({ id: "anaheim-gardens" });
    expect(result).toHaveProperty("id", "anaheim-gardens");
  });
});

describe("investors.list", () => {
  it("returns investors for public callers", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.investors.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("name");
  });
});

describe("investors.getById", () => {
  it("returns an investor by numeric id", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.investors.getById({ id: 1 });
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("name", "Marc Menowitz");
  });
});

describe("investors.updateStatus (public — PIN-gated on frontend)", () => {
  it("allows any caller to update investor status", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.investors.updateStatus({ id: 1, status: "deceased" });
    expect(result).toHaveProperty("status", "deceased");
  });

  it("also works for unauthenticated callers", async () => {
    const caller = await getCaller(makeCtx(null));
    const result = await caller.investors.updateStatus({ id: 1, status: "transferred" });
    expect(result).toHaveProperty("status", "transferred");
  });
});

describe("notes.list", () => {
  it("returns notes for a given investor", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.notes.list({ investorId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("content", "Test note");
  });
});

describe("notes.create (public — PIN-gated on frontend)", () => {
  it("allows authenticated users to create notes", async () => {
    const caller = await getCaller(makeCtx(makeUser()));
    const result = await caller.notes.create({ investorId: 1, content: "New note" });
    expect(result).toHaveProperty("content", "New note");
  });

  it("also allows unauthenticated callers to create notes", async () => {
    const caller = await getCaller(makeCtx(null));
    const result = await caller.notes.create({ investorId: 1, content: "Anon note" });
    expect(result).toHaveProperty("investorId", 1);
  });
});

describe("notes.delete (public — PIN-gated on frontend)", () => {
  it("allows any caller to delete notes", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.notes.delete({ id: 1 });
    expect(result).toHaveProperty("id", 1);
  });
});

describe("distributions.list", () => {
  it("returns distributions for a given investor", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.distributions.list({ investorId: 1 });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("year", 2023);
  });
});

describe("distributions.importCsv (admin only)", () => {
  it("imports multiple distribution rows", async () => {
    const caller = await getCaller(makeCtx(makeUser({ role: "admin" })));
    const result = await caller.distributions.importCsv({
      rows: [
        { propertyId: "anaheim-gardens", investorId: 1, year: 2023, amount: "5000.00", type: "k1" },
        { propertyId: "anaheim-gardens", investorId: 1, year: 2022, amount: "4500.00", type: "k1" },
      ],
    });
    expect(result).toHaveProperty("imported", 2);
  });
});

describe("documents.list", () => {
  it("returns documents for public callers", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.documents.list({});
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("filename", "test.pdf");
  });
});

describe("investors.financialSummary", () => {
  it("returns financial summary for an investor", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.investors.financialSummary({ id: 1 });
    expect(result).toHaveProperty("totalDistributions", 5000);
  });
});

describe("investors.findDuplicates", () => {
  it("returns groups of investors sharing the same email", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.investors.findDuplicates();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty("email", "test@example.com");
    expect(result[0].members).toHaveLength(2);
  });
});

describe("investors.merge", () => {
  it("merges source investors into target and returns success", async () => {
    const caller = await getCaller(makeCtx());
    const result = await caller.investors.merge({ targetId: 1, sourceIds: [2] });
    expect(result).toEqual({ success: true });
  });

  it("rejects empty sourceIds array", async () => {
    const caller = await getCaller(makeCtx());
    await expect(caller.investors.merge({ targetId: 1, sourceIds: [] })).rejects.toThrow();
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated callers", async () => {
    const caller = await getCaller(makeCtx(null));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user object for authenticated callers", async () => {
    const user = makeUser();
    const caller = await getCaller(makeCtx(user));
    const result = await caller.auth.me();
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("role", "admin");
  });
});
