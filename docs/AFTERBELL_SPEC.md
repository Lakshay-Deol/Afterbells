# Afterbell — Build Spec (for the coding agent)

Recurring-buy agent for tokenized stocks on BSC that **measures execution quality before it acts**.
Hackathon: **BNB Hack: Tokenized Stocks Edition**. Submissions lock **Sun 11 Oct 2026, 12:00 UTC**.

---

## 0. Rules for the coding agent (read first)

1. **Do not invent endpoints, fields or statuses.** Use only what is in section 5. Anything marked `UNVERIFIED` must be tested against the real API first; record the outcome in `dx_events`.
2. **Every API surprise is a DX finding.** Log wrong docs, odd errors, latency, missing fields to `dx_events` (section 7) the moment they happen, with a short note.
3. **Never commit secrets.** API key/secret and the burner private key come from env vars only.
4. **Mainnet, tiny amounts.** BSC mainnet only (chainId `56`), spot only. Hard-cap spend in code (section 9).
5. **The DX report narrative is written by the human.** You may generate the data appendix (tables/charts) only.
6. Prefer the simplest thing that works. Build the **Must** scope (section 11) completely before touching Next/Stretch.
7. Fetch the official docs into context before coding: `https://web3.binance.com/en/dev-docs/llms-full.txt` (and read the Authentication page first).

---

## 1. Problem

Tokenized stocks trade 24/7 on-chain but do not behave like ordinary tokens:

- Tokens can be **paused or limited** (corporate actions, earnings windows) while the chain keeps running.
- Equity tokens execute via **RFQ orders**, not plain swaps; quotes expire in about 30 seconds.
- **Cost varies** by issuer (Ondo vs bStock), trade size and time of day (regular, overnight, weekend).
- `referencePrice` is **derived from the on-chain price**, not an official market quote, so it cannot show whether you overpaid.

Result: a first-time buyer cannot see what a purchase really cost, and builders lack data on when and where tokenized stocks are cheap to trade.

## 2. Pitch

Afterbell checks a token is tradable, compares issuers by live quote, buys only within the user's cost tolerance, and ends every buy with a plain-English receipt. A probe samples execution quality around the clock and feeds the Developer Experience (DX) Report with real numbers.

It deliberately does **not**: trade the on-chain/reference gap (not an independent signal), or act as an earnings watcher (Agentic Wallet docs already show that example). The original part is the **measure-then-act loop**.

## 3. Real user use case (demo persona)

*Meera, 27, salaried developer, no brokerage account.* She wants to put $25/week into one US tech stock.

1. Types: "Buy $25 of NVDA every Friday. Only if the extra cost is under 0.5%. Try for 24 hours."
2. Setup checklist shows: funded wallet, BNB for gas, USDT, bounded allowance.
3. Friday 10:00 UTC: readiness passes (market status regular, not paused, attestation present).
4. Both issuers quoted; best route within tolerance; executes via RFQ.
5. Receipt: share-equivalent bought, extra cost in bps vs benchmark, issuer, vendor, fee, status.
6. Another week NVDA is in an earnings window: agent **defers and explains**; if still blocked at the deadline it **skips and notifies** (no bad-price buy).

(Numbers in the demo must come from real samples, never invented.)

## 4. Hackathon facts (constraints the build must satisfy)

| Item | Detail |
|---|---|
| Dates (UTC) | Build from 16 Sep; **submissions lock 11 Oct 12:00**; judging 12–23 Oct; winners week of 26 Oct |
| Track rules | One of bStocks / Ondo / xStocks central (**RWA API exposes only `ondo` and `bstock`**); spot only; BSC mainnet only; dry-run while building, demo with small live amounts; team funds own wallet |
| Submit | Public repo; demo video ≤ 4 min (optional, recommended); deployed link or judge instructions; DX report via their form. Repo/demo/link must stay accessible through judging. One entry per team |
| Scoring | Technical 30% · Creativity 25% · DX report 25% · Product/UX 20% |
| DX report | Must be specific and human-written: onboarding time, docs errors (page + location), API pitfalls (error messages, latency), AI stack feedback, tokenized-stock specifics (liquidity, slippage, off-hours, on-chain vs reference gap, issuer differences), redesign suggestions, requested capabilities |
| Special prizes ($2,000 each) | Best use of Agentic Wallet / Wallet Skills; Best use of BNB Agent Studio (not targeted) |
| Eligibility | Restricted-region list applies; human confirms before registering |
| Links | Dev portal `https://web3.binance.com/en/dev-portal` · Docs `https://web3.binance.com/en/dev-docs/introduction` · Auth `https://web3.binance.com/en/dev-docs/authentication` |

---

## 5. API reference (verified from docs unless marked)

**Base URL:** `https://web3.binance.com/build`  · **Chain:** `binanceChainId=56` (BSC)
**USDT (BSC):** `0x55d398326f99059fF775485246999027B3197955` (docs example shows 18 decimals — read `decimals` from responses, do not hardcode)
All amounts in requests are **smallest units as integer strings**.

### 5.1 Authentication — `UNVERIFIED details`
Headers on every call: `X-OC-APIKEY`, `X-OC-TIMESTAMP` (ISO 8601 UTC with milliseconds, e.g. `2026-05-11T10:08:57.715Z`), `X-OC-SIGN` (Base64). Optional: `X-OC-RECV-WINDOW` (default 5000, max 60000 ms), `X-OC-NONCE`.

Unverified hypotheses to test on the **first call** (`GET /api/v1/dex/market/rwa/platforms`):
- Signing is HMAC-SHA256 over `timestamp + method + requestPath + body`, but the key type may instead be RSA/Ed25519 — **check which key the dev portal issues and follow the Authentication page**.
- `requestPath` may need the `/build` prefix and the query string.
- A signature error was reported as `40102 Invalid signature`.
Log every failed attempt and the final working recipe as `dx_events` (`category='onboarding'`). Record time-to-first-successful-call.

### 5.2 RWA Data (all GET, signed)
| Purpose | Path | Key params → key response fields |
|---|---|---|
| Issuers | `/api/v1/dex/market/rwa/platforms` | `platformId` (`ondo`\|`bstock`) → `tickerCount`, `chainDistribution` |
| Token list + status | `/api/v1/dex/market/rwa/tokens` | `binanceChainId`, `platformId`, `tabId` (3=Upcoming Earnings, 4=AI Chips, 9=Magnificent 7, 11=ETF…) → `tokenContractAddress`, `platformId`, `underlyingTicker`, `decimals`, `tokenToShareRatio`, `tokenPrice`, `referencePrice`, `volume24H`, `statusInfo{openState, marketStatus, reasonCode, reasonMsg, nextOpenTime, nextCloseTime}` |
| Ticker → contracts per issuer | `/api/v1/dex/market/rwa/search` | `keyword` (ticker), `platformId` optional → `assets[{platformId, tokenContractAddress, tokenSymbol, assetType}]` |
| Prices (batch ≤100) | `/api/v1/dex/market/rwa/price` | `binanceChainId`, `tokenContractAddresses` → `tokenPrice`, `referencePrice`, `tokenPriceUpdatedAt` |
| Attestations + ratio | `/api/v1/dex/market/rwa/underlying-profile` | `binanceChainId`, `tokenContractAddress` → `tokenToShareRatio`, `protections{dailyAttestationReport, monthlyAttestationReport, collateralReport}` |
| Underlying market | `/api/v1/dex/market/rwa/underlying-market` | same params → `marketData`, `statusInfo` (note: its `referencePrice` is also on-chain-derived) |

`marketStatus` ∈ `premarket, regular, postmarket, overnight, closed, pause`.
`reasonCode` ∈ `TRADING, MARKET_CLOSED, MARKET_PAUSED, MARKET_MAINTENANCE, ASSET_PAUSED, ASSET_LIMITED, UNSUPPORTED`. `ASSET_PAUSED` reasons include corporate actions (dividend, split, merger, etc.); `ASSET_LIMITED` reason `earnings` = earnings window.
**There is no earnings-date field** — only the `tabId=3` list and `ASSET_LIMITED`.

### 5.3 Trading API (RFQ flow for equity tokens)
Equity/RWA tokens **always** return `executionMode=RFQ`.

1. **Quote** `GET /api/v1/dex/aggregator/quote` — params: `binanceChainId`, `amount`, `fromTokenAddress`, `toTokenAddress`, `userWalletAddress` (**required for RFQ routes**; must equal the signing wallet). Returns routes sorted by `toTokenAmount` desc: `quoteId` (TTL ~30 s), `vendorName`, `toTokenAmount`, `tradeFee` (USD), `estimateGasFee`, `priceImpactPercent`, `executionMode`, `approveTarget`, `isBest`.
2. **Approve** `GET /api/v1/dex/aggregator/approve-transaction` — `binanceChainId`, `tokenContractAddress`, `approveAmount`, **`vendor` (required for RWA; use `vendorName` from the quote, e.g. `PcsXRfq`, `InchFusion`, `CowSwap`)** → `[{data, dexContractAddress, gasLimit, gasPrice}]`. Alternatively use the route's `approveTarget` and call ERC-20 `approve()` yourself.
3. **Build swap** `GET /api/v1/dex/aggregator/swap` — quote params + `quoteId`, `slippagePercent` (or `autoSlippage=true` + `maxAutoSlippagePercent`), `priceImpactProtectionPercent` (**default 90 — always set explicitly, 1–2**). Returns `executionMode`, `routerResult`, `rfq{vendor, txType, typedDataToSign, signingScheme, signatureData}`.
4. **Sign** `rfq.typedDataToSign` with EIP-712 (`eth_signTypedData_v4`). `UNVERIFIED`: whether it is JSON typed data or a digest string (docs example shows a `0x1901…` string) — test and log.
5. **Submit** `POST /api/v1/dex/aggregator/order/submit` — body `{requestId (UUID v4), userSignature (0x + 130 hex), vendor (InchFusion|CowSwap|PcsXRfq; must match rfq.vendor), quoteId, signingScheme?}`. Docs say body `quoteId` = `rfq.orderId` from the swap response, **but the docs' swap example has no `orderId` field** — `UNVERIFIED`; try `rfq.orderId` if present, else the quote's `quoteId`, and log the discrepancy. Same `requestId` within 30 min returns the original result (idempotent): reuse only when retrying the *same* attempt.
6. **Poll** `GET /api/v1/dex/aggregator/order/{orderId}` — documented statuses: `PENDING_VENDOR`, `PENDING_ONCHAIN` (intermediate); `FILLED`, `FAILED`, `EXPIRED`, `CANCELLED` (terminal). Also accept `FINISHED` as success if the real API returns it, and **log any status string that differs from the docs**. Filled response: `txHash`, `fromAmount`, `toAmount`, `filledAt`.
7. Optional verification: `GET /api/v1/dex/aggregator/history?binanceChainId=56&txHash=…`.

Known error codes: `40401 QUOTE_EXPIRED`, `40462 SWAP_QUOTE_MISMATCH`, `40001 PARAM_ERROR`.
Fallback path: Flash API `GET /api/v1/dex/aggregator/quote-and-swap` (`vendor=LiquidMesh` only, returns calldata, `enableRFQ` defaults true for bStock pairs, settlement deadline ~30 s). Compare its behavior with the RFQ path in the DX report.

### 5.4 Other modules (only as needed)
- **Wallet API** — balances by address, transactions, tx detail by hash (setup checklist, receipt verification). `UNVERIFIED`: read its docs before use.
- **Transaction API** — gas price, broadcast (for approvals). `UNVERIFIED`: whether Simulate works for RFQ; test and log.
- **General Data** — optional candles / pool liquidity context.
- **Agentic Wallet** — stretch only (section 11). Its stock-trading flow submits swaps itself; it may bypass your quote/approval logic.
- **Skipped:** b402, DeFi, Address Portfolio, BNB Agent Studio.

---

## 6. Core logic

### 6.1 Benchmark and cost metric
There is **no independent underlying market price** in the API. Benchmarks, in order:
1. On-chain `tokenPrice` (from `/rwa/price`) at quote time.
2. A small-size quote (e.g. $10) as near-mid proxy; extra cost at $100/$500 is size-related slippage.
3. The other issuer's quote for the same ticker.

```
eff_price_per_token = usdt_spent / tokens_received            # decimals-adjusted
cost_bps            = (eff_price_per_token - benchmark_price) / benchmark_price * 10_000   # buys
share_equivalent    = tokens_received * tokenToShareRatio
```
Always record which benchmark was used. Also log whether `referencePrice ≈ tokenPrice / tokenToShareRatio` (DX finding either way).

### 6.2 Readiness check (per issuer/token)
Fetch `/rwa/tokens` (or `/rwa/price` + status) and evaluate:
- `statusInfo.openState` and `marketStatus` (record `overnight`/`premarket` separately; do not assume "closed" = untradable — trade only if the API allows it).
- `reasonCode` ∈ {`ASSET_PAUSED`, `ASSET_LIMITED`, `MARKET_PAUSED`, `MARKET_MAINTENANCE`, `UNSUPPORTED`} → **defer**, store `reasonMsg`.
- USDT balance ≥ amount, BNB gas ≥ threshold, allowance to the chosen route's `approveTarget`.
- Attestation presence via `underlying-profile` (informational, shown in receipt).

### 6.3 Decision rule (per scheduled buy)
1. Readiness; not tradable → defer + log reason.
2. Quote each eligible issuer; compute `cost_bps`.
3. Best route ≤ user tolerance → execute. Else wait and re-quote (interval configurable) until the plan deadline.
4. At deadline: **skip and notify**. Opt-in `must_buy` mode executes with a warning. Never loop forever.

### 6.4 Execution state machine
`PLANNED → READINESS_OK → QUOTED → APPROVED → BUILT → SIGNED → SUBMITTED → (PENDING_VENDOR|PENDING_ONCHAIN) → FILLED`
Failure branches: `DEFERRED`, `SKIPPED`, `EXPIRED→REQUOTE (max 3)`, `FAILED`, `CANCELLED`. Persist every transition in `orders`.
Approval: check on-chain allowance vs the chosen route's `approveTarget`; approve a **bounded** amount (a few planned buys) only if short, and **before** requesting the execution quote (quotes expire in ~30 s). Sign and submit immediately after the swap build.

### 6.5 Receipt (plain English)
Show: ticker, USDT spent, tokens received, share-equivalent, `cost_bps` + USD, benchmark used, issuer, vendor, fee, price impact, status, tx hash, attestation availability, retries, and (if deferred/skipped) the human-readable reason.

---

## 7. Data model (Postgres)

```sql
CREATE TABLE plans (
  id UUID PRIMARY KEY, ticker TEXT, amount_usdt NUMERIC, cron TEXT,
  tolerance_bps INT, window_hours INT, must_buy BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE samples (
  id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ DEFAULT now(), ticker TEXT, issuer TEXT,
  token_address TEXT, size_usdt NUMERIC, market_status TEXT, reason_code TEXT,
  vendor TEXT, price_impact_pct NUMERIC, fee_usd NUMERIC, tokens_out NUMERIC,
  token_price NUMERIC, reference_price NUMERIC, share_ratio NUMERIC,
  benchmark_price NUMERIC, benchmark_kind TEXT, cost_bps NUMERIC,
  latency_ms INT, error TEXT
);
CREATE TABLE orders (
  id UUID PRIMARY KEY, plan_id UUID REFERENCES plans(id), ts TIMESTAMPTZ DEFAULT now(),
  state TEXT, issuer TEXT, vendor TEXT, request_id UUID, quote_id TEXT, rfq_order_id TEXT,
  retries INT DEFAULT 0, tx_hash TEXT, usdt_spent NUMERIC, tokens_out NUMERIC,
  cost_bps NUMERIC, defer_reason TEXT, receipt_text TEXT, transitions JSONB
);
CREATE TABLE dx_events (
  id BIGSERIAL PRIMARY KEY, ts TIMESTAMPTZ DEFAULT now(),
  category TEXT,  -- onboarding|docs|api_pitfall|latency|ai_stack|tokenized_stock|redesign|capability
  endpoint TEXT, latency_ms INT, error_code TEXT, error_message TEXT,
  docs_page TEXT, note TEXT
);
```

## 8. Probe (start on day 1 — runs through both weekends)
- Worker loop every 15–30 min; **denser (every 5 min)** within ±30 min of any `nextOpenTime`/`nextCloseTime`.
- For 1–3 tickers × both issuers (if the ticker exists on both, via `/rwa/search`) × sizes $10 / $100 / $500: call `/rwa/tokens` status + `/aggregator/quote`; insert into `samples`. Log market-status transitions.
- Quotes need `userWalletAddress`. `UNVERIFIED`: whether an unfunded wallet can quote; if not, fund a few dollars.
- Respect rate limits (`UNVERIFIED`); back off on errors and log them.

## 9. Safety rails (required)
Daily spend cap; token allowlist; global kill switch (env + DB flag); burner wallet with tiny funds; bounded approvals only (never infinite); `priceImpactProtectionPercent` ≤ 2; slippage cap; max 3 re-quotes; no blind resubmission on ambiguous failure (check order status first). Server-held key is hackathon scope; note Agentic Wallet's scoped permissions as the production path. Show a short risk notice in the UI (tokenized securities can be halted/restricted; not investment advice).

## 10. Architecture
```
/apps/worker    probe, scheduler, executor (Node/TypeScript)
/apps/api       REST for dashboard (plans, samples, orders, receipts, dx appendix)
/apps/web       React dashboard
/packages/binance-client   signed HTTP client, typed responses, automatic dx_events logging
/packages/core             readiness, cost metric, decision rule, state machine
```
Stack: Node/TypeScript, Postgres, React, `viem` (or ethers) for EIP-712 + allowance reads, a long-running worker (not serverless). Env: `BINANCE_API_KEY`, `BINANCE_API_SECRET` (or key-pair per auth result), `BURNER_PRIVATE_KEY`, `DATABASE_URL`, `DAILY_CAP_USDT`, `KILL_SWITCH`.

Dashboard views: (1) setup checklist (gas/USDT/allowance), (2) plan form (structured form first), (3) probe charts (cost_bps by issuer/size/hour/market status, expiry rate, pause/limited frequency), (4) orders + receipts, (5) DX data appendix export (CSV/markdown tables).

---

## 11. Scope and milestones

**Must:** probe running; readiness check; one ticker; one small live buy through RFQ; plain-English receipt; safety rails; DX event logging with real timestamps.
**Next:** issuer comparison (only if the ticker exists on both issuers); scheduler with decision rule; probe dashboard; LLM plan parsing with schema validation and deterministic fallback.
**Stretch:** Agentic Wallet signing (only if it installs cleanly on day one and handles your RFQ payload); MCP server; baskets.
**Cut:** gap trading, earnings-alpha, DeFi, b402, Agent Studio.

| Dates | Work |
|---|---|
| Oct 1–2 | API key + first signed call (log time); pick ticker (high `volume24H`, present on both issuers); start probe |
| Oct 3–4 | Probe runs; bug fixes only |
| Oct 5–6 | Readiness, approvals, RFQ flow, one small live buy |
| Oct 7–8 | Scheduler + decision rule, receipt, dashboard |
| Oct 9 | Safety rails, pre-recorded backup buy, DX appendix export |
| Oct 10 | Human writes DX report; demo video; submit (one day early) |

## 12. Acceptance criteria
- [ ] Signed call succeeds; working signing recipe documented in `dx_events`.
- [ ] Probe has data spanning at least one weekend and multiple `marketStatus` values.
- [ ] A live RFQ buy reaches a terminal success state with `txHash` and a receipt.
- [ ] A not-tradable token is deferred with a stored reason (test with `tabId=3` / `ASSET_LIMITED` if one is present).
- [ ] Expired quote triggers re-quote (max 3), not a crash or blind resubmit.
- [ ] Kill switch and daily cap verified.
- [ ] Every doc/API discrepancy found is in `dx_events`.
- [ ] Repo public, README with run instructions, deployed link or judge instructions, demo video ≤ 4 min.

## 13. Demo (≤ 4 min)
Dashboard with probe data already collected → plan in plain English → readiness screen → issuer/size cost chart → Buy now → approval (if needed) → signed RFQ submit → filled → receipt → DX appendix charts. Keep a pre-recorded successful buy as backup.

## 14. Day-one verification checklist (record each answer in `dx_events`)
1. Which key type and signing recipe does the portal require? Does `requestPath` need `/build`?
2. Can an unfunded wallet request RFQ quotes?
3. Does the swap response include `rfq.orderId`? What exactly is `typedDataToSign`?
4. Which order status strings does the API really return (`FILLED` vs `FINISHED`)?
5. Does Simulate Transactions support anything useful for approvals or RFQ?
6. How many tickers exist on both `ondo` and `bstock`?
7. Rate limits for the probe?
8. Is `referencePrice` just `tokenPrice / tokenToShareRatio`?
