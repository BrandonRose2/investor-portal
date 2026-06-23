import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import {
  listProperties,
  getPropertyById,
  listInvestors,
  getInvestorById,
  updateInvestorStatus,
  updateInvestorInfo,
  listNotes,
  createNote,
  deleteNote,
  listDistributions,
  createDistribution,
  deleteDistribution,
  listDocuments, createDocument, deleteDocument, renameDocument,
  createProperty,
  updateProperty,
  deleteProperty,
  upsertPropertyInvestor,
  deletePropertyInvestor,
  createInvestor,
  deleteInvestor,
  getInvestorFinancialSummary,
  findDuplicateInvestors,
  mergeInvestors,
  findSimilarNameInvestors,
  buildGroupKey,
  listDismissedDuplicates,
  dismissDuplicateGroup,
  restoreDismissedGroup,
  getDismissedKeys,
} from "./db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Properties ────────────────────────────────────────────────────────────

  properties: router({
    list: publicProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ input }) => listProperties(input?.search)),

    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => getPropertyById(input.id)),

    create: publicProcedure
      .input(z.object({
        id: z.string(),
        name: z.string(),
        entityName: z.string(),
        entityEin: z.string().optional().nullable(),
        isGrovePark: z.boolean().optional(),
        mtNote: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => createProperty(input)),

    update: publicProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().optional(),
        entityName: z.string().optional(),
        entityEin: z.string().optional().nullable(),
        mtNote: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateProperty(id, data);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => deleteProperty(input.id)),
  }),

  // ─── Investors ─────────────────────────────────────────────────────────────

  investors: router({
    list: publicProcedure
      .input(z.object({ search: z.string().optional() }).optional())
      .query(({ input }) => listInvestors(input?.search)),

    getById: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(({ input }) => getInvestorById(input.id)),

    updateStatus: publicProcedure
      .input(z.object({
        id: z.number().int(),
        status: z.enum(["active", "deceased", "transferred", "bought_out"]),
      }))
      .mutation(({ input }) => updateInvestorStatus(input.id, input.status)),

    updateInfo: publicProcedure
      .input(z.object({
        id: z.number().int(),
        name: z.string().optional(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        adminNotes: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateInvestorInfo(id, data);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string(),
        email: z.string().optional().nullable(),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        status: z.enum(["active", "deceased", "transferred", "bought_out"]).optional(),
      }))
      .mutation(({ input }) => createInvestor(input)),

    delete: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(({ input }) => deleteInvestor(input.id)),

    upsertPropertyLink: publicProcedure
      .input(z.object({
        propertyId: z.string(),
        investorId: z.number().int(),
        pctCapital: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => upsertPropertyInvestor(input)),

    removePropertyLink: publicProcedure
      .input(z.object({
        propertyId: z.string(),
        investorId: z.number().int(),
      }))
      .mutation(({ input }) => deletePropertyInvestor(input.propertyId, input.investorId)),

    financialSummary: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .query(({ input }) => getInvestorFinancialSummary(input.id)),

    findDuplicates: publicProcedure
      .query(async () => {
        const [groups, dismissed] = await Promise.all([
          findDuplicateInvestors(),
          getDismissedKeys(),
        ]);
        return groups.filter((g) => !dismissed.has(buildGroupKey(g.members.map((m) => m.id))));
      }),

    findSimilarNames: publicProcedure
      .input(z.object({ threshold: z.number().min(0).max(1).optional() }))
      .query(async ({ input }) => {
        const [groups, dismissed] = await Promise.all([
          findSimilarNameInvestors(input.threshold),
          getDismissedKeys(),
        ]);
        return groups.filter((g) => !dismissed.has(buildGroupKey(g.members.map((m) => m.id))));
      }),

    listDismissed: publicProcedure
      .query(() => listDismissedDuplicates()),

    dismiss: publicProcedure
      .input(z.object({
        memberIds: z.array(z.number().int()).min(2),
        label: z.string(),
        scanType: z.enum(["email", "name"]),
      }))
      .mutation(async ({ input }) => {
        await dismissDuplicateGroup(input.memberIds, input.label, input.scanType);
        return { success: true };
      }),

    restore: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        await restoreDismissedGroup(input.id);
        return { success: true };
      }),

    merge: publicProcedure
      .input(z.object({
        targetId: z.number().int(),
        sourceIds: z.array(z.number().int()).min(1),
      }))
      .mutation(async ({ input }) => {
        await mergeInvestors(input.targetId, input.sourceIds);
        return { success: true };
      }),
  }),

  // ─── Notes ─────────────────────────────────────────────────────────────────

  notes: router({
    list: publicProcedure
      .input(z.object({ investorId: z.number().int() }))
      .query(({ input }) => listNotes(input.investorId)),

    create: publicProcedure
      .input(z.object({
        investorId: z.number().int(),
        propertyId: z.string().optional().nullable(),
        content: z.string().min(1),
      }))
      .mutation(({ input }) =>
        createNote({
          ...input,
          authorId: null,
          authorName: "Admin",
        })
      ),

    delete: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(({ input }) => deleteNote(input.id)),
  }),

  // ─── Distributions ─────────────────────────────────────────────────────────

  distributions: router({
    list: publicProcedure
      .input(z.object({
        propertyId: z.string().optional(),
        investorId: z.number().int().optional(),
      }))
      .query(({ input }) => listDistributions(input)),

    create: publicProcedure
      .input(z.object({
        propertyId: z.string(),
        investorId: z.number().int(),
        year: z.number().int().min(1900).max(2100),
        amount: z.string(),
        type: z.enum(["k1", "cash", "return_of_capital", "other"]),
        notes: z.string().optional().nullable(),
      }))
      .mutation(({ input }) => createDistribution(input)),

    importCsv: publicProcedure
      .input(z.object({
        rows: z.array(z.object({
          propertyId: z.string(),
          investorId: z.number().int(),
          year: z.number().int(),
          amount: z.string(),
          type: z.enum(["k1", "cash", "return_of_capital", "other"]),
          notes: z.string().optional().nullable(),
        })),
      }))
      .mutation(async ({ input }) => {
        const results = await Promise.all(input.rows.map(row => createDistribution(row)));
        return { imported: results.filter(Boolean).length };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(({ input }) => deleteDistribution(input.id)),
  }),

  // ─── Documents ─────────────────────────────────────────────────────────────

  documents: router({
    list: publicProcedure
      .input(z.object({
        propertyId: z.string().optional(),
        investorId: z.number().int().optional(),
      }))
      .query(({ input }) => listDocuments(input)),

    upload: publicProcedure
      .input(z.object({
        propertyId: z.string().optional().nullable(),
        investorId: z.number().int().optional().nullable(),
        filename: z.string(),
        fileBase64: z.string(),
        mimeType: z.string().default("application/pdf"),
        sizeBytes: z.number().optional().nullable(),
        category: z.enum(["lp_agreement", "k1", "tax_form", "correspondence", "other"]),
        year: z.number().int().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const key = `documents/${Date.now()}-${input.filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return createDocument({
          propertyId: input.propertyId ?? null,
          investorId: input.investorId ?? null,
          filename: input.filename,
          storageKey: key,
          storageUrl: url,
          mimeType: input.mimeType,
          sizeBytes: input.sizeBytes ?? null,
          category: input.category,
          year: input.year ?? null,
          uploadedBy: null,
        });
      }),

    rename: publicProcedure
      .input(z.object({
        id: z.number().int(),
        filename: z.string().min(1).max(255),
      }))
      .mutation(({ input }) => renameDocument(input.id, input.filename.trim())),

    delete: publicProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(({ input }) => deleteDocument(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
