"use client";
import { useQuery } from "@tanstack/react-query";
import { api, type Health } from "@/lib/api";
import { ErrorState, LoadingState, Metric } from "./WorkspaceUI";
export function SetupChecklist() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api<Health>("/health", { signal }),
  });
  return (
    <section className="space-y-4">
      <div className="section-heading">
        <h2>System readiness</h2>
        <button
          className="secondary-action"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          Refresh
        </button>
      </div>
      <ErrorState error={health.error} retry={() => void health.refetch()} />
      {health.isPending ? (
        <LoadingState>Checking service…</LoadingState>
      ) : (
        health.data && (
          <div className="overview-metrics">
            <Metric
              label="Wallet adapter"
              value={health.data.agenticWallet?.status ?? "Unknown"}
              note="Connectivity does not authorize execution"
            />
            <Metric
              label="Execution gate"
              value={
                health.data.executionEnabled ? "Enabled at API" : "Disabled"
              }
              note="No signing control exposed here"
            />
            <Metric
              label="BSC block"
              value={health.data.bscRpc?.block ?? "Unknown"}
              note="Latest returned RPC observation"
            />
            <Metric
              label="Market feed"
              value={health.data.binanceRwa?.marketStatus ?? "Unknown"}
              note="Reference freshness is unverified"
            />
          </div>
        )
      )}
    </section>
  );
}
