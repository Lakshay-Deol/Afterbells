"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Fingerprint, ScanLine, ShieldAlert } from "lucide-react";
import { api, type Health, type AgentIdentity } from "@/lib/api";
import { WorkspaceIntro } from "@/components/WorkspaceIntro";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Metric,
} from "@/components/WorkspaceUI";

export default function Overview() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api<Health>("/health", { signal }),
  });
  const agent = useQuery({
    queryKey: ["agent"],
    queryFn: ({ signal }) => api<AgentIdentity>("/agent/identity", { signal }),
  });
  return (
    <div className="workspace-page space-y-6">
      <WorkspaceIntro
        index="COMMAND CENTER"
        title="Clarity before capital."
        description="Your research, operational signals and evidence. Start with an intent. Know where the analysis ends."
      />
      <ErrorState error={health.error} retry={() => void health.refetch()} />
      <div className="overview-metrics">
        <Metric
          label="Service"
          value={
            health.data
              ? "Connected"
              : health.isError
                ? "Unavailable"
                : "Checking…"
          }
          note="AfterBells API"
        />
        <Metric
          label="Execution gate"
          value={
            health.data
              ? health.data.executionEnabled
                ? "Enabled at API"
                : "Disabled"
              : "Unknown"
          }
          note="No transaction authority in this workspace"
        />
        <Metric
          label="Market status"
          value={health.data?.binanceRwa?.marketStatus ?? "Unknown"}
          note="Source freshness remains unverified"
        />
        <Metric
          label="Agent tasks"
          value={agent.data?.tasks.length ?? "—"}
          note="Returned by the current runtime"
        />
      </div>
      <div className="overview-grid">
        <section className="panel overview-start">
          <span className="label">RESEARCH WORKFLOW</span>
          <ScanLine size={32} />
          <h2>One intent. Every representation.</h2>
          <p>
            Compare normalized exposure across issuers, inspect deterministic
            policy checks, then challenge the same snapshot.
          </p>
          <Link href="/" className="primary-action">
            Open Decision Desk
            <ArrowUpRight size={16} />
          </Link>
          <div className="workflow-steps">
            <span>01 / Observe</span>
            <span>02 / Evaluate</span>
            <span>03 / Keep evidence</span>
          </div>
        </section>
        <section className="panel attention-panel">
          <span className="label">REQUIRES ATTENTION</span>
          <ShieldAlert size={24} />
          <h2>Execution is gated</h2>
          <p>
            A quote cannot establish swap success. Transaction-bound simulation,
            authenticated approval and verified resulting positions are
            required.
          </p>
          <Link href="/terminal" className="text-action">
            Inspect execution boundary
            <ArrowUpRight size={15} />
          </Link>
          <hr />
          <Fingerprint size={22} />
          <h3>Integrity is one part of trust</h3>
          <p>
            Replay verifies the decision and receipt digest. It does not prove
            issuer backing or a completed trade.
          </p>
          <Link href="/simulation" className="text-action">
            Replay a decision receipt
            <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>
      <section className="panel p-5">
        <div className="section-heading">
          <h2>Recent agent activity</h2>
          <Link href="/agent" className="text-action">
            View activity
            <ArrowUpRight size={14} />
          </Link>
        </div>
        <ErrorState error={agent.error} retry={() => void agent.refetch()} />
        {agent.isPending ? (
          <LoadingState>Loading task history…</LoadingState>
        ) : agent.data && !agent.data.tasks.length ? (
          <EmptyState
            title="Your first analysis starts here"
            href="/agent"
            action="Run a bounded task"
          >
            Submit an ANALYZE_EXPOSURE task to create a real activity record.
            Nothing has executed.
          </EmptyState>
        ) : (
          <ol className="activity-list">
            {agent.data?.tasks
              .slice(-5)
              .reverse()
              .map((task) => (
                <li key={task.task_id}>
                  <span
                    className={`chip ${task.status === "SUCCEEDED" ? "chip-info" : "chip-warn"}`}
                  >
                    {task.status}
                  </span>
                  <div>
                    <strong>{task.kind}</strong>
                    <small className="mono">{task.task_id}</small>
                  </div>
                  <time>{task.created_at}</time>
                </li>
              ))}
          </ol>
        )}
      </section>
    </div>
  );
}
