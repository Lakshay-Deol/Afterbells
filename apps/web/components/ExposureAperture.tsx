"use client";
import { useState } from "react";
import { formatNumber as fmt, type DecisionReceipt } from "@/lib/decisions";
const CHAPTERS = [
  "01 / Observe",
  "02 / Normalize",
  "03 / Apply policy",
  "04 / Keep evidence",
];
export function ExposureAperture({
  receipt,
  inspected,
  onInspect,
  onChapterChange,
}: {
  receipt: DecisionReceipt;
  inspected: string | null;
  onInspect: (address: string) => void;
  onChapterChange: (chapter: number) => void;
}) {
  const [chapter, setChapter] = useState(0);
  return (
    <div
      className="aperture-passage"
      data-chapter={chapter}
      aria-label="Evidence workflow"
    >
      <div className="aperture-stage">
        <div className="aperture-head">
          <span className="label">
            EVIDENCE WORKFLOW / {receipt.intent.ticker}
          </span>
          <span className="label">
            {receipt.dataLabel} · {receipt.decision.execution.status}
          </span>
        </div>
        <div
          className="workflow-tabs"
          role="group"
          aria-label="Evidence workflow stages"
        >
          {CHAPTERS.map((label, index) => (
            <button
              key={label}
              aria-pressed={chapter === index}
              onClick={() => {
                setChapter(index);
                onChapterChange(index);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="aperture-lanes">
          {receipt.decision.routes.map((route) => (
            <button
              key={route.tokenAddress}
              className="aperture-object"
              data-address={route.tokenAddress}
              data-rejected={route.status === "REJECTED"}
              aria-pressed={inspected === route.tokenAddress}
              aria-label={`Inspect ${route.symbol} in aperture`}
              onClick={() => onInspect(route.tokenAddress)}
            >
              <span className="object-face">
                <strong>{route.symbol}</strong>
                <span className="object-price">
                  {chapter === 0
                    ? `${route.tokenPriceUsd == null ? "Unknown" : "$" + fmt(route.tokenPriceUsd, 4)} / token`
                    : chapter === 1
                      ? `${route.sharePriceUsd == null ? "Unknown" : "$" + fmt(route.sharePriceUsd)} / share`
                      : chapter === 2
                        ? route.status
                        : receipt.decision.execution.status}
                </span>
                <span className="object-multiplier">
                  {chapter === 0
                    ? route.platform
                    : chapter === 1
                      ? `÷ ${fmt(route.sharesPerToken, 6)} shares / token`
                      : chapter === 2
                        ? `${route.checks.filter((check) => check.status === "PASS").length} passing checks`
                        : "Included in canonical receipt"}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="workflow-caption">
          {chapter === 0
            ? "Observed token prices use issuer-specific units."
            : chapter === 1
              ? "Share price = token price ÷ shares per token. No price history is inferred."
              : chapter === 2
                ? "The deterministic engine evaluates evidence against the recorded policy."
                : "Snapshot, interpretation, policy and results travel together. No transaction was executed."}
        </p>
      </div>
    </div>
  );
}
