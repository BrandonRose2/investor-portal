# Grove Park Investor Portal — Design Brief

## Context
Internal business tool for Grove Park / Apartment Corp staff to look up investors by property or by name.
Data: 37 properties, 147 unique investors, entity names, EINs, ownership percentages, emails.
Special case: Grove Park Housing LP uses an MT (Master Trust) structure, not a direct LP structure.

---

## Three Approaches (sampled from tails)

### Option A — "Ledger"
Probability: 0.04
A quiet, typographic-first interface inspired by financial ledgers and law firm intranets. Cream-white background, charcoal text, a single deep navy accent. Monospaced numbers, serif headings, ruled table lines. Feels like a well-bound annual report.

### Option B — "Command Center"
Probability: 0.07
A sidebar-driven dashboard with a persistent left nav, a top search bar, and a main content pane. Clean white with slate-gray sidebar, blue-700 accents. Feels like a Bloomberg terminal stripped of noise — purposeful, fast, and data-dense.

### Option C — "Atlas"
Probability: 0.03
A two-column split layout: left column is a scrollable property/investor directory; right column is a live detail panel. Minimal chrome, generous whitespace, a warm off-white background, and a forest-green accent. Feels like a well-designed reference book.

---

## Chosen Approach: **Option B — "Command Center"**

Selected for its clarity, speed of navigation, and familiarity to business users.

### Design Movement
Modern SaaS internal tooling — think Linear, Notion, or Retool. Clean, purposeful, zero decoration for decoration's sake.

### Core Principles
1. **Information hierarchy first** — every pixel serves the data, not the brand.
2. **Persistent sidebar navigation** — users always know where they are and can jump instantly.
3. **Search is the primary action** — global search bar is always visible and always fast.
4. **Density without clutter** — tables are tight but breathable; no wasted rows.

### Color Philosophy
- Background: pure white `#FFFFFF` — maximum legibility
- Sidebar: slate-50 `#F8FAFC` with a 1px right border — subtle separation
- Primary accent: blue-700 `#1D4ED8` — authoritative, trustworthy, financial
- Text: slate-900 `#0F172A` for headings, slate-600 `#475569` for secondary
- Borders: slate-200 `#E2E8F0` — barely-there lines
- Hover states: blue-50 `#EFF6FF` — gentle, non-distracting

### Layout Paradigm
Fixed left sidebar (240px) + top header bar (56px) + scrollable main content area.
No centered hero — this is a tool, not a marketing page.

### Signature Elements
1. **Property badge** — each property name gets a subtle colored left-border pill in the sidebar
2. **Ownership bar** — a thin horizontal progress bar under each investor row showing % ownership at a glance
3. **Entity → Person link** — when an entity is the investor, a secondary row shows the underlying person in muted text

### Interaction Philosophy
Instant filtering — search results update on every keystroke with no loading state.
Click a property → detail panel slides in from the right (or navigates to detail page).
Click an investor → cross-reference panel shows all their properties.

### Animation
- Sidebar item hover: 120ms ease-out background fill
- Page transitions: 180ms fade + 8px upward translate
- Table row hover: 100ms background tint
- Search results: 150ms staggered fade-in (30ms per row)
- No bounce, no spring — everything is crisp and linear

### Typography System
- Display/headings: **Inter** (700, 600) — clean, modern, widely trusted in finance
- Body/data: **Inter** (400, 500) — consistent with headings for a unified feel
- Numbers/EINs: `font-mono` (system monospace) — critical for scannable numeric data
- Scale: 12px labels, 14px body, 16px subheadings, 20px page titles, 28px section headers

### Brand Essence
Grove Park Investor Portal — for internal staff who need fast, accurate investor lookups — the only tool that knows every property's structure.
Personality: **Precise. Reliable. Quiet.**

### Brand Voice
Headlines: direct and functional ("Search Investors & Properties")
CTAs: action-first ("View All Properties", "Find Investor")
No filler. No marketing copy. This is a tool.

### Wordmark & Logo
A compact square mark: stylized "GP" monogram in white on blue-700, with a subtle building/column motif. Used in sidebar header at 32px.

### Signature Brand Color
**Blue-700 `#1D4ED8`** — the single ownable accent used for active states, links, and the logo.

---

## Style Decisions
- Light mode only (no dark toggle) — business professional context
- Tables use alternating row shading (slate-50 / white) for scannability
- EIN numbers always in monospace
- Percentage values always right-aligned in their column
- Empty states use a simple icon + one-line message, no illustrations
