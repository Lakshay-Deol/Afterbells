# Afterbells — Audit Finding Verification and Traceability Register

**Audit Baseline:** `main` at `0a21cb7e497b54e9318acc5d86845884d6b1c474`  
**Document Status:** Source of truth for architectural risk mitigation and milestone verification gates  
**Scope:** Maps every critical (P0) and high-priority (P1) finding from the repository audit to responsible modules, automated test suites, and planned implementation phases.

---

## 1. Traceability Matrix

| Finding ID | Audit Description | Severity | Target Phase | Responsible Components | Verification Test Suite | Gate Requirement |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AUD-P0-01** | **No Quote-to-Transaction Binding**<br>Quotes do not expose a bound transaction envelope; execution could alter parameters. | P0 | Phase Nine | `services/api/afterbells/domain/execution_plan.py`<br>`services/api/afterbells/services/execution_binding.py` | `services/api/tests/test_execution_plan.py`<br>`services/api/tests/test_quote_binding.py` | Immutable plan envelope hash must match quote, simulation, and submitted calldata. |
| **AUD-P0-02** | **Unauthenticated Approval**<br>Boolean `confirm: true` flag used instead of authenticated, expiring, single-use token. | P0 | Phase Nine | `services/api/afterbells/services/approval.py`<br>`services/api/api/main.py` | `services/api/tests/test_approval_tokens.py` | Approval bound to actor, wallet, plan digest, one-time nonce, and expiry timestamp. |
| **AUD-P0-03** | **Unauthenticated API Routes**<br>State-changing routes lack tenant ownership and identity checks. | P0 | Phase Six | `services/api/afterbells/api/auth.py`<br>`services/api/afterbells/api/dependencies.py` | `services/api/tests/test_auth_middleware.py`<br>`services/api/tests/test_authorization.py` | All mutating routes require authenticated actor and tenant workspace validation. |
| **AUD-P0-04** | **Unprotected Private Keys**<br>Agent and API context could access signing routines without isolation. | P0 | Phase Nine | `services/api/afterbells/services/signer_boundary.py` | `services/api/tests/test_signer_isolation.py` | Signing isolated behind dedicated boundary service; no private keys in API or worker memory. |
| **AUD-P0-05** | **Lack of Side-Effect Idempotency**<br>Retries and concurrent requests could broadcast duplicate on-chain swaps. | P0 | Phase Seven | `services/api/afterbells/services/idempotency.py`<br>`services/api/afterbells/services/submission.py` | `services/api/tests/test_idempotent_submission.py`<br>`services/api/tests/test_side_effects.py` | Database-backed atomic idempotency keys deduplicate side effects across worker restarts. |
| **AUD-P0-06** | **Unverified Chain Confirmation**<br>Wallet/order response treated as execution proof without log/reorg verification. | P0 | Phase Nine | `services/api/afterbells/services/reconciliation.py`<br>`services/api/providers/bsc_rpc.py` | `services/api/tests/test_receipt_verification.py`<br>`services/api/tests/test_position_reconciliation.py` | Explicit verification of BSC receipt status, Transfer logs, and balance delta reconciliation. |
| **AUD-P1-01** | **Global Mutable Policy Contamination**<br>Global active constitution mutated across users rather than isolated strategy revisions. | P1 | Phase Two | `services/api/afterbells/domain/strategy.py`<br>`services/api/afterbells/services/strategy_service.py` | `services/api/tests/test_strategy_service.py`<br>`services/api/tests/test_compiler.py` | Strategies isolated per tenant with immutable SHA-256 specification digests. |
| **AUD-P1-02** | **Conflation of Retrieval and Source Freshness**<br>Local API retrieval time displayed rather than upstream exchange observation timestamp. | P1 | Phase Three | `services/api/afterbells/domain/evidence.py`<br>`services/api/afterbells/providers/binance_public.py` | `services/api/tests/test_stale_data_rejection.py` | Source observation timestamp decoupled from retrieval timestamp; stale data fails closed. |
| **AUD-P1-03** | **Unknown Executable Depth**<br>Market capitalization and 24h volume conflated with orderbook depth. | P1 | Phase Three | `services/api/afterbells/providers/binance_depth.py`<br>`services/api/afterbells/domain/liquidity.py` | `services/api/tests/test_rwa_precision.py` | Size-specific depth and slippage calculations required; missing depth marked UNKNOWN. |
| **AUD-P1-04** | **Inline Non-Durable Task Execution**<br>Tasks executed inline without crash recovery, worker leases, or dead-letter queues. | P1 | Phase Seven | `services/api/afterbells/services/queue.py`<br>`services/api/afterbells/services/supervisor.py` | `services/api/tests/test_job_leases.py`<br>`services/api/tests/test_job_recovery.py` | Tasks persisted before acknowledgement; expired worker leases reclaimed on reboot. |
| **AUD-P1-05** | **Lack of Production Database Durability**<br>Single-file SQLite without migrations, transaction isolation, or automated backups. | P1 | Phase Six | `services/api/afterbells/persistence/database.py`<br>`services/api/migrations/env.py` | `services/api/tests/test_tenant_isolation.py`<br>`scripts/backup-db.sh` | Relational persistence with Alembic migrations, foreign keys, and tested restore drills. |
| **AUD-P1-06** | **Receipt Hash Integrity Overclaim**<br>Digest match claimed as external truth rather than internal serialization consistency. | P1 | Phase Five | `services/api/afterbells/services/receipts.py`<br>`docs/receipt-integrity.md` | `services/api/tests/test_receipt_tamper.py` | Documentation and UI explicitly distinguish internal integrity from oracle authenticity. |

---

## 2. Release Gate Verification Criteria

1. **Gate Alpha (Analysis Safety):**
   - Negative tests lock all execution entry points (`EXECUTION_ENABLED=false`).
   - Authoritative workflow state machine rejects illegal state jumps.
   - Pydantic settings reject insecure startup flags.
2. **Gate Beta (Strategy & Evidence Integrity):**
   - User strategies are immutable, versioned domain models with risk ceilings.
   - Provenance tiers (`LIVE_ORACLE`, `DIRECT_ORDERBOOK`, `PEER_DERIVED`, `RECORDED_FIXTURE`) strictly labeled.
   - Shared cross-language golden vectors prove Python and TypeScript canonical hash parity.
3. **Gate Gamma (Tenancy & Durable Orchestration):**
   - Authenticated JWT/Web3 sessions enforce tenant data isolation.
   - Background jobs persist before ack and survive worker crashes.
   - Atomic idempotency deduplicates concurrent mutations.
4. **Gate Delta (Controlled Execution Boundary):**
   - Immutable plan hash binds quotes, calldata, simulation, and approval.
   - Isolated signing service refuses requests lacking single-use approval tokens.
   - BSC RPC verifies transaction logs and reconciles position deltas before `CONFIRMED`.
