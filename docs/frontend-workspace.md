# AfterBells financial workspace

The frontend uses the existing Next.js, React Query, Tailwind, local fonts and
Lucide stack. Graphite surfaces, indigo focus and action tokens, persistent desktop
navigation and a native mobile disclosure share one shell across every route.

## Product routes

| Route | Capability and evidence boundary |
| --- | --- |
| `/overview` | Actual API health and returned agent task history; no portfolio or profit estimates |
| `/strategy` | Original intent, deterministic interpretation preview, explicit apply, structured draft and JSON export; save requires supported backend storage |
| `/` | Restored decision desk: recorded/live observations, normalization, actual policy checks, same-snapshot challenge, download and verification |
| `/simulation` | Imported decision receipt, browser digest, server replay and liquidity counterfactual; no swap or returns simulation |
| `/explorer` | Existing underlying search, issuer representations and provenance |
| `/agent` | Bounded analysis task submission, actual IDs, output and history |
| `/receipts` | Existing execution-pipeline archive and integrity verification; blocked attempts are not completed trades |
| `/constitution` | Existing compile, review and explicit policy activation |
| `/terminal`, `/routes` | Existing fail-closed evaluation pipeline, never fabricated approval or settlement |
| `/observations` | Supported probe archive only; empty or unavailable observations remain unknown |
| `/dev` | Health, safe public ceilings, actual diagnostic events and client-generated Markdown/CSV exports |

No Python receipt serialization or deterministic policy rules changed. Execution
remains disabled by default. The frontend cannot replace a failed live provider
response with local data. The client checks the analysis API's health fingerprint.

The former local core fallback initialized a database containing synthetic seed
plans and financial samples, and could initialize a burner wallet. It no longer
runs in this workspace. The only local adapter is the existing pure recurring
instruction parser, used when its upstream endpoint is absent (404); it cannot
read that database, generate a wallet or submit a transaction. Its limitations
and default interpretation must be reviewed explicitly before applying a draft.

## Documented blocked capabilities

- **BLOCKED — recurring-plan persistence/scheduling on the Python API.** Reproduce
  with `GET /api/plans` through the configured frontend; it returns 404. Draft
  interpretation, manual editing and export work. Save is disabled when storage
  is unavailable. A compatible upstream API can provide the existing plan contract.
- **BLOCKED — probe archive on the Python API.** Reproduce with `GET /api/samples`.
  A 404 is displayed, not replaced by seeded spreads. Even a supported sample
  response lacks verified provenance; the UI states this and never infers depth.
- **BLOCKED — transaction-bound swap simulation and authenticated execution.**
  The existing terminal documents this boundary. Deterministic replay verifies
  integrity and reproduction, not backing, source authenticity or a stock purchase.
- Authentication, real recurring workers and transaction approval were not added.
  Public multi-user execution remains unsupported, as documented in README.

## Validation performed

- Production build passed, including dependency compilation, Next lint and types.
- Frontend lint, TypeScript and Prettier checks passed.
- 22 frontend unit tests passed, including proxy failure isolation, synthetic-data
  rejection and incompatible-backend fingerprint checks.
- 25 API decision/surface tests passed with execution disabled.
- All 21 Playwright tests passed against isolated production web/API servers.
- Browser overflow checks passed at 320, 375, 430, 768, 1024, 1280, 1440 and 1920px
  for the desk, overview, strategy, replay and observations routes. Existing
  supporting routes were also checked at desktop and mobile widths.
- Browser flows cover source failure, old-evidence retention, same-snapshot policy
  restoration, actual parser preview application, zero tolerance, backend save
  rejection, replay and tampered receipts, missing observations and keyboard use.
- Desktop/mobile captures were visually inspected, including correction of an
  inherited verdict text color. Native disclosures support Escape; reduced-motion
  settings are honored. No automated axe audit was run.
- The upstream merge follow-up also passed all 136 backend tests locally. Keeper
  and contracts passed upstream CI; final CI is rerun after the security fixes.

Representative captures: [desktop decision](demo/workspace/decision-desktop.png),
[mobile decision](demo/workspace/decision-mobile.png), [overview](demo/workspace/overview.png).
These show **RECORDED analysis**, not fabricated trade receipts.

## Design references

The implementation applies compact workspace hierarchy and restrained interactions
from [Linear](https://linear.app/), financial clarity from [Stripe](https://stripe.com/)
and [Mercury](https://mercury.com/), diagnostics from [Vercel](https://vercel.com/),
and readable analysis from [TradingView](https://www.tradingview.com/). Mobbin and
Dribbble were consulted as pattern catalogs. Awwwards and Behance could not be
retrieved during this run. No product branding or artwork was copied.

## Upstream CI follow-up

Upstream CI exposed existing Python whitespace failures and three legacy core
secret-pattern matches. The Python fixes are formatting-only. Core storage now
starts empty rather than inventing plans, observations, orders or DX evidence.
Wallet initialization requires explicitly configured server-side signing identity;
no default private key is provided. A provider completion without a transaction
hash remains PENDING_ONCHAIN, does not consume the spend ledger and cannot create
a fabricated transaction hash. These changes preserve the read-only frontend's
pure parser; it does not initialize the wallet or core storage.
