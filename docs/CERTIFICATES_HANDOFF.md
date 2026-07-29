# Certificates v3 — Handoff for Claude

> Branch: `cursor/certificates-integration-2383`  
> Base: `dev`  
> PR: https://github.com/filippo-fonseca/yale-degree-intelligence/pull/67  
> Repo: `filippo-fonseca/yale-degree-intelligence`

This branch adds **Yale College certificates** to Degree Intelligence v3 end-to-end: catalog data scrape → structured JSON → progress engine → UI page → settings/onboarding → simulator, with **major ↔ certificate course exclusivity**.

---

## Clone & run locally

```bash
git fetch origin
git checkout cursor/certificates-integration-2383
git pull origin cursor/certificates-integration-2383

yarn install   # or npm install
yarn dev       # or npm run dev — defaults to :3000
# if 3000 is busy:
npx next dev -H 0.0.0.0 -p 3001
```

Firebase web client config is **hardcoded** in `config/firebase.ts` (public web keys). No `.env.local` required for Google sign-in. Admin SDK still needs `FIREBASE_SERVICE_ACCOUNT_KEY` for server routes that use it.

Open the app, sign in with a Yale (or allowlisted) Google account, then exercise:

1. **My certificates** tab  
2. **Settings → Certificates** (add/edit up to 3)  
3. **Onboarding** certificates step (optional)  
4. **Simulator** — assign planned courses to a certificate requirement  

---

## What shipped (high level)

| Layer | What |
|------|------|
| Data | All **42** YCPS certificates scraped + structured into majors-compatible JSON |
| Engine | `calculateCertificateProgress` mirrors majors (manual, skip, exclude, preview) |
| Exclusivity | A course claimed for a **certificate** cannot count toward **major(s)** and vice versa |
| UI | **My certificates** tab (board + heat map, teal accent) |
| Settings / onboarding | Certificate selectors (category-grouped search); add opens search immediately |
| Simulator | Auto-detect majors + certs; manual assign Major \| Certificate → program → requirement; live % |
| Polish | Hardcoded Firebase config; body hydration suppress for Grammarly; view toggle sizing |

---

## Data pipeline

**Source:** https://catalog.yale.edu/ycps/programs_certificates/ (YCPS 2026–2027)

Yale’s Overview / Summary of Requirements / Certificate tabs are **DOM toggles** — content is already in HTML containers (`textcontainer`, `certificatetextcontainer`, `certificatestextcontainer`, `intensivetextcontainer`, `maptextcontainer`). No Playwright required.

| Path | Role |
|------|------|
| `lib/data/certificates/manifest.json` | Inventory of 42 certs + URLs + extract container hints |
| `lib/data/certificates/raw/{ID}.json` | Raw scraped text per certificate |
| `lib/data/certificates/structured/{ID}.json` | Per-cert structured requirements |
| `lib/data/certificates/SCHEMA.md` | Schema docs |
| `lib/data/all_certificates.json` | **Canonical merge** (import this) |
| `scripts/scrape-certificates.py` | HTTP + BeautifulSoup scraper |
| `scripts/merge-certificates.py` | Merge `structured/*` → `all_certificates.json` |

**Counts:** 22 advanced language · 14 interdisciplinary · 6 skills-based.

Many language certs live under a parent department’s Certificates tab. Attribute-tagged electives (e.g. `YC Climate Solutions`) use empty `options: []` + description text — same pattern as description-only major buckets.

---

## Schema (mirrors majors)

```ts
{
  id: "CERT_PROGRAMMING",
  name: "Programming",
  category: "skills_based" | "interdisciplinary" | "advanced_language",
  sourceUrl: "...",
  requiresApplication?: boolean,
  creditRequirements: { total: number },
  notes?: string[],
  requirements: [{
    name: string,
    required: number,
    description?: string,
    options: [
      { type: "course", code: "CPSC 2010" },
      // or group
    ]
  }]
}
```

Loader / engine: `lib/certificates.ts`

- `CERTIFICATES` — `Record<id, displayName>` (same shape as `MAJORS`)
- `certificateRequirements` — full catalog
- `CERTIFICATE_LIST`, `CERTIFICATE_CATEGORY_LABELS`
- `calculateCertificateProgress(...)`
- `calculatePreviewCertificateProgressByCertificates(...)`

Optional 7th arg on both major + certificate progress: **`blockedCourseCodes`** (exclusivity).

---

## Exclusivity model (important)

Firestore course docs:

```ts
manualRequirementsFulfilled?: {
  major_id?: string;        // majors (legacy + current)
  certificate_id?: string;  // certificates
  requirement_title: string;
}[]
```

Helpers: `lib/utils/programClaims.ts`

- Codes with `certificate_id` manuals → blocked from major progress  
- Codes with `major_id` manuals → blocked from certificate progress  

Simulator:

- Manual assign stores `programType` + `programId` on `ManualRequirementEntry`
- Auto-matched planned courses that hit **both** catalogs prefer **majors** unless explicitly assigned to a certificate

---

## UI map

| Surface | Files / notes |
|---------|----------------|
| Tab | `app/page.tsx` — `id: "certificate"`, teal pills, empty-state CTA to Settings |
| Progress view | `components/CertificateProgressView/*` (cloned from MajorProgressView) |
| Dropdown | `components/ui/CertificateDropdown.tsx` — category groups, `defaultOpen` opens search |
| Manual fulfill | `AddManualCourseModal` with `programType="certificate"` → writes `certificate_id` |
| Settings | `UserSettingsModal` — up to 3 certs; portal click-outside ignore |
| Onboarding | `MajorSelectionFlow` — step `welcome → majors → certificates → bio → year` |
| Simulator | `Simulator.tsx`, `SimulatorManualAssignModal.tsx`, `SimulatorRequirementsBreakdown.tsx` |
| Friends sync | `lib/syncFriendsPublicData.ts` — `certificates: string[]` |
| Command palette / tour | Jump to certificates; tour accent `teal` |

**User profile Firestore:** `users/{uid}.certificates?: string[]`

---

## Conventions / UX notes from this work

- Certificates use **teal**; majors keep **purple/pink**
- Sticky Board / Heat map bar: **no background**; toggles same height (`h-9`)
- `+ Add certificate` should **open search immediately** (`defaultOpen`)
- Grammarly causes body hydration mismatch → `suppressHydrationWarning` on `<body>`
- Do **not** treat attribute-only catalog buckets as broken — empty options + description is intentional

---

## Known gaps / good follow-ups

1. Expand attribute-tagged elective lists where Yale Course Search attributes can be enumerated  
2. Friend profile UI display of certificates (data synced; UI may still be majors-only)  
3. Admin stats for certificate popularity  
4. Older data-only PR #65 is **superseded** by this integration branch  

---

## Key files cheat sheet

```
lib/data/all_certificates.json
lib/certificates.ts
lib/utils/programClaims.ts
lib/types.ts                          # ManualRequirement + certificates on FriendsPublicData
config/firebase.ts                    # hardcoded web config
components/CertificateProgressView/
components/ui/CertificateDropdown.tsx
components/UserSettingsModal/UserSettingsModal.tsx
components/MajorSelectionFlow.tsx
components/Simulator/Simulator.tsx
components/Simulator/SimulatorManualAssignModal.tsx
components/Simulator/SimulatorRequirementsBreakdown.tsx
app/page.tsx
scripts/scrape-certificates.py
scripts/merge-certificates.py
```

---

## Suggested next agent tasks

If continuing work:

1. QA pass on exclusivity (assign course to cert → major % must not include it)  
2. Fill denser course option lists for Programming / Data Science / Education / Human Rights from catalog attributes  
3. Certificate empty states + first-run tip polish  
4. Merge PR #67 into `dev` after review  

When changing requirement JSON: edit `lib/data/certificates/structured/{ID}.json`, run `python3 scripts/merge-certificates.py`, commit both structured file(s) and `all_certificates.json`.
