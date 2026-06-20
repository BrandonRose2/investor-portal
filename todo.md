# Grove Park Investor Portal — TODO

## Phase 1: Database Schema & Seed
- [x] Design schema: properties, investors, property_investors, distributions, documents, investor_notes
- [x] Run pnpm db:push to create tables
- [x] Seed 37 properties and 147 investors from static data

## Phase 2: tRPC Routers & DB Helpers
- [x] server/db.ts: listProperties, getPropertyById with investor join
- [x] server/db.ts: listInvestors, getInvestorById with property join
- [x] server/db.ts: updateInvestorStatus, updateInvestorInfo, createInvestor, deleteInvestor
- [x] server/db.ts: listNotes, createNote, deleteNote
- [x] server/db.ts: listDistributions, createDistribution, deleteDistribution
- [x] server/db.ts: listDocuments, createDocument, deleteDocument
- [x] server/db.ts: getInvestorFinancialSummary
- [x] server/routers.ts: properties router (list, getById, create, update, delete)
- [x] server/routers.ts: investors router (list, getById, updateStatus, updateInfo, create, delete, upsertPropertyLink, removePropertyLink, financialSummary)
- [x] server/routers.ts: notes router (list, create, delete)
- [x] server/routers.ts: distributions router (list, create, importCsv, delete)
- [x] server/routers.ts: documents router (list, upload, delete)

## Phase 3: Frontend Pages
- [x] Home.tsx: tRPC-backed properties list (37 properties) and investors list (147 investors)
- [x] Home.tsx: search across both tabs, tab counts, status badges on investors
- [x] PropertyDetail.tsx: tRPC-backed investor table with % capital, status, email
- [x] PropertyDetail.tsx: total % capital footer, Grove Park MT note, org chart button
- [x] InvestorDetail.tsx: tRPC-backed with status badge, avatar, properties table
- [x] InvestorDetail.tsx: Notes timeline (add/delete notes, auth-gated)
- [x] InvestorDetail.tsx: Distribution history table
- [x] InvestorDetail.tsx: Financial summary cards (total distributions, total % capital)
- [x] Settings.tsx: PIN-gated admin panel (PIN: 3060)
- [x] Settings.tsx: Investors tab with status dropdown, edit dialog, add/delete
- [x] Settings.tsx: Properties tab with investor counts
- [x] Settings.tsx: CSV import for distributions
- [x] Documents.tsx: Document list with category filter and search
- [x] Documents.tsx: Upload dialog (PDF/CSV/Excel, linked to property/investor)
- [x] Documents.tsx: Download and delete actions
- [x] Layout.tsx: Documents link in sidebar nav

## Phase 4: Routing & Auth
- [x] App.tsx: /investor/:id route (numeric ID, not name)
- [x] App.tsx: /documents route
- [x] App.tsx: Remove AdminProvider (replaced by tRPC + PIN gate)

## Phase 5: Tests
- [x] server/routers.test.ts: 17 tests covering all routers (public, protected, admin)
- [x] server/auth.logout.test.ts: 1 test for auth.logout
- [x] All 18 tests passing

## Pending / Future
- [ ] Document upload: show linked property/investor names (not just IDs) in documents list
- [ ] Investor detail: link documents tab per investor
- [ ] Property detail: link documents tab per property
- [ ] CSV import: support for property_investors bulk update
- [ ] Distribution: year-over-year chart per investor
