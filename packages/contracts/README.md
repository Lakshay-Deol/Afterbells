# AfterBells receipt registry

This Foundry package contains the non-custodial receipt-digest registry. It
stores integrity commitments only: registration does not authenticate market
evidence and does not prove that a transaction occurred.

Clone with submodules, install Foundry from its official distribution, and run:

```bash
./scripts/ci-local.sh --contracts-preflight
pnpm test:contracts
```

The preflight deliberately fails when `forge` is unavailable or
`packages/contracts/lib/forge-std` is not initialized. A full local run may use
`--skip-contracts` only when that skip and its reason are recorded; CI always
initializes the submodule and runs `forge test`.
