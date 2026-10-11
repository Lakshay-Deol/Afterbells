"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState, Metric } from "./WorkspaceUI";
type Sample = {
  id: number;
  ts: string;
  ticker: string;
  issuer: string;
  size_usdt: number;
  market_status: string;
  reason_code: string;
  vendor?: string;
  cost_bps?: number;
  latency_ms?: number;
  benchmark_kind?: string;
};
export function ProbeDashboardView() {
  const [ticker, setTicker] = useState("");
  const samples = useQuery({
    queryKey: ["samples", ticker],
    queryFn: ({ signal }) =>
      api<{ samples: Sample[] }>(
        "/samples" + (ticker ? `?ticker=${ticker}` : ""),
        { signal },
      ),
  });
  const observations = samples.data?.samples ?? [];
  const mean = (issuer: string) => {
    const values = observations.filter(
      (sample) =>
        sample.issuer === issuer &&
        typeof sample.cost_bps === "number" &&
        Number.isFinite(sample.cost_bps),
    );
    return values.length
      ? `${(values.reduce((total, sample) => total + sample.cost_bps!, 0) / values.length).toFixed(1)} bps`
      : "Unknown";
  };
  return (
    <section className="space-y-6">
      <div className="section-heading">
        <h2>Probe observations</h2>
        <div className="flex gap-3">
          <label className="small-note">
            Ticker{" "}
            <select
              aria-label="Probe ticker filter"
              value={ticker}
              onChange={(event) => setTicker(event.target.value)}
              className="secondary-action"
            >
              <option value="">All tickers</option>
              <option>NVDA</option>
              <option>AAPL</option>
              <option>TSLA</option>
            </select>
          </label>
          <button
            className="secondary-action"
            disabled={samples.isFetching}
            onClick={() => void samples.refetch()}
          >
            Refresh
          </button>
        </div>
      </div>
      {samples.error && (
        <p className="workspace-boundary">
          <strong>PROBE ARCHIVE · BLOCKED</strong> The configured API does not
          provide samples. Reproduce with GET /api/samples. Synthetic seed
          records are not substituted.
        </p>
      )}
      <ErrorState error={samples.error} retry={() => void samples.refetch()} />
      <p className="workspace-boundary">
        Source provenance and freshness are not supplied by this archive. Cost
        observations may use a quote benchmark; they do not establish
        underlying-stock premium or executable liquidity.
      </p>
      {samples.isPending ? (
        <LoadingState>Loading observations…</LoadingState>
      ) : (
        samples.data && (
          <>
            <div className="overview-metrics">
              <Metric
                label="Observations"
                value={observations.length}
                note="Current filter"
              />
              <Metric
                label="Ondo mean cost"
                value={mean("ondo")}
                note="Only observations with cost evidence"
              />
              <Metric
                label="bStocks mean cost"
                value={mean("bstock")}
                note="Only observations with cost evidence"
              />
              <Metric
                label="Executable depth"
                value="Unknown"
                note="Not inferred from sample counts"
              />
            </div>
            {!observations.length ? (
              <EmptyState title="No observations available">
                Run the separately configured probe worker to collect
                observations. No financial metrics are estimated.
              </EmptyState>
            ) : (
              <div
                className="panel overflow-auto"
                role="region"
                aria-label="Probe observations table"
                tabIndex={0}
              >
                <table className="observation-table">
                  <caption className="sr-only">
                    Stored cost observations with unknown source provenance
                  </caption>
                  <thead>
                    <tr>
                      {[
                        "Timestamp",
                        "Ticker",
                        "Issuer",
                        "Size (USDT)",
                        "Market",
                        "Benchmark",
                        "Cost (bps)",
                        "Latency (ms)",
                        "Reason",
                      ].map((label) => (
                        <th scope="col" key={label}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {observations
                      .slice()
                      .reverse()
                      .map((sample) => (
                        <tr key={sample.id}>
                          <td className="mono">{sample.ts}</td>
                          <td>{sample.ticker}</td>
                          <td>{sample.issuer}</td>
                          <td>{sample.size_usdt}</td>
                          <td>{sample.market_status}</td>
                          <td>{sample.benchmark_kind ?? "Unknown"}</td>
                          <td>{sample.cost_bps ?? "Unknown"}</td>
                          <td>{sample.latency_ms ?? "Unknown"}</td>
                          <td>{sample.reason_code}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )
      )}
    </section>
  );
}
