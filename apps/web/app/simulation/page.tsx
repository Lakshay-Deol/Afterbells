"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { verifyReceiptHash } from "@/lib/canonical";
import { WorkspaceIntro } from "@/components/WorkspaceIntro";
import { ErrorState, Metric } from "@/components/WorkspaceUI";
import {
  DEFAULT_POLICY,
  type DecisionReceipt,
  type PolicyComparison,
} from "@/lib/decisions";
import Link from "next/link";

export default function SimulationLab() {
  const [input, setInput] = useState("");
  const [minimum, setMinimum] = useState("100000");
  const [receipt, setReceipt] = useState<DecisionReceipt | null>(null);
  const [localMatch, setLocalMatch] = useState<boolean | null>(null);
  const replay = useMutation({
    mutationFn: async () => {
      const parsed = JSON.parse(input) as DecisionReceipt;
      const local = await verifyReceiptHash(
        parsed as unknown as Record<string, unknown>,
      );
      setLocalMatch(local.ok && local.match);
      const result = await api<{
        hashMatch: boolean;
        decisionMatch: boolean;
        provenanceMatch: boolean;
      }>("/decisions/replay", {
        method: "POST",
        body: JSON.stringify({ receipt: parsed }),
      });
      setReceipt(parsed);
      return result;
    },
  });
  const compare = useMutation({
    mutationFn: () =>
      api<PolicyComparison>("/decisions/compare", {
        method: "POST",
        body: JSON.stringify({
          receipt,
          policy: {
            ...(receipt?.policy ?? DEFAULT_POLICY),
            min_liquidity_usd: minimum,
          },
        }),
      }),
  });
  const verified =
    replay.data &&
    localMatch &&
    replay.data.hashMatch &&
    replay.data.decisionMatch &&
    replay.data.provenanceMatch;
  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="SIMULATION & REPLAY"
        title="Challenge the same evidence."
        description="Replay a decision receipt and reevaluate its captured snapshot under a stricter liquidity policy. These are reproducibility checks, not trading returns."
      />
      <div className="workspace-boundary">
        <strong>SWAP SIMULATION · BLOCKED</strong>
        <p>
          Transaction-bound swap simulation is not available. This lab supports
          deterministic decision replay and policy counterfactuals.
        </p>
      </div>
      <section className="panel p-5">
        <div className="section-heading">
          <h2>Input snapshot</h2>
          <Link href="/" className="text-action">
            Get a decision receipt →
          </Link>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setReceipt(null);
            setLocalMatch(null);
            compare.reset();
            replay.mutate();
          }}
        >
          <label htmlFor="replay-json">Decision receipt JSON</label>
          <textarea
            id="replay-json"
            className="receipt-input mono"
            rows={8}
            value={input}
            placeholder="Paste a downloaded AfterBells decision receipt"
            disabled={replay.isPending || compare.isPending}
            onChange={(event) => {
              setInput(event.target.value);
              setReceipt(null);
              setLocalMatch(null);
              replay.reset();
              compare.reset();
            }}
          />
          <button
            className="primary-action"
            disabled={!input.trim() || replay.isPending || compare.isPending}
          >
            {replay.isPending ? "Replaying…" : "Verify & replay receipt"}
          </button>
        </form>
      </section>
      <ErrorState error={replay.error ?? compare.error} />
      {replay.data && (
        <>
          <p
            role="status"
            className={`inline-notice ${verified ? "" : "text-fail"}`}
          >
            {verified
              ? "MATCH · Browser integrity, decision reproduction and source-label consistency"
              : "MISMATCH · Receipt verification failed. Policy comparison is blocked."}
          </p>
          <div className="overview-metrics">
            <Metric
              label="Data provenance"
              value={receipt?.dataLabel ?? "Unknown"}
              note="Label checked against embedded evidence"
            />
            <Metric
              label="Decision"
              value={receipt?.decision.state ?? "Unknown"}
              note="Policy evaluation only"
            />
            <Metric
              label="Source freshness"
              value="Unverified"
              note="Replay cannot refresh source observations"
            />
            <Metric
              label="Transaction"
              value="Not executed"
              note="A matching digest does not prove a trade"
            />
          </div>
        </>
      )}
      {receipt && verified && (
        <section className="panel p-5">
          <h2>Liquidity counterfactual</h2>
          <p className="small-note">
            Prices and provenance stay fixed. Only the required executable depth
            changes.
          </p>
          <form
            className="counterfactual-form"
            onSubmit={(event) => {
              event.preventDefault();
              compare.mutate();
            }}
          >
            <label>
              Minimum executable liquidity ($)
              <input
                type="number"
                required
                min={0}
                max={1000000000}
                value={minimum}
                disabled={compare.isPending}
                onChange={(event) => {
                  setMinimum(event.target.value);
                  compare.reset();
                }}
              />
            </label>
            <button className="secondary-action" disabled={compare.isPending}>
              {compare.isPending ? "Comparing…" : "Compare policy"}
            </button>
          </form>
          {compare.data && (
            <div className="counterfactual-result" aria-live="polite">
              <span className="chip chip-info">
                {compare.data.receipt.decision.state}
              </span>
              <p>
                {compare.data.sameSnapshot
                  ? "Same snapshot. Only the policy changed."
                  : "Snapshot consistency not confirmed."}
              </p>
              <p>{compare.data.receipt.decision.explanation}</p>
              <ul>
                {compare.data.changes.map((change) => (
                  <li key={change.symbol}>
                    <strong>{change.symbol}</strong> · {change.before} →{" "}
                    {change.after}
                    <p>{change.blockers.join(" · ")}</p>
                  </li>
                ))}
              </ul>
              <details>
                <summary>Inspect counterfactual evidence</summary>
                <pre className="evidence-json">
                  {JSON.stringify(compare.data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
