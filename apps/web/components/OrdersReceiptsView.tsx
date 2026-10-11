"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "./WorkspaceUI";
type Order = {
  id: string;
  ts: string;
  state: string;
  issuer: string;
  vendor: string;
  request_id: string;
  quote_id: string;
  retries: number;
  tx_hash?: string;
  usdt_spent: number;
  cost_bps?: number;
  defer_reason?: string;
  receipt_text: string;
  transitions: { state: string; timestamp: string; details?: string }[];
};
export function OrdersReceiptsView() {
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: ({ signal }) => api<{ orders: Order[] }>("/orders", { signal }),
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const order = orders.data?.orders.find((item) => item.id === selected);
  return (
    <section className="space-y-6">
      <div className="section-heading">
        <h2>Order records</h2>
        <button
          className="secondary-action"
          onClick={() => void orders.refetch()}
          disabled={orders.isFetching}
        >
          Refresh
        </button>
      </div>
      <p className="workspace-boundary">
        Read-only archive. A returned state or transaction hash alone does not
        establish settlement. Source provenance is not supplied by this
        endpoint.
      </p>
      <ErrorState error={orders.error} retry={() => void orders.refetch()} />
      {orders.isPending ? (
        <LoadingState>Loading order records…</LoadingState>
      ) : orders.data?.orders.length === 0 ? (
        <EmptyState title="No order records yet">
          The archive contains no submitted or blocked orders. Use the Decision
          Desk for analysis.
        </EmptyState>
      ) : (
        <div className="saved-plans panel p-5">
          {orders.data?.orders.map((item) => (
            <article key={item.id}>
              <div>
                <h3>{item.state}</h3>
                <p className="mono">{item.id}</p>
                <small>
                  {item.ts} · {item.issuer || "Issuer unknown"}
                </small>
              </div>
              <button
                className="secondary-action"
                onClick={() => {
                  setSelected(item.id);
                  setNotice("");
                }}
                aria-pressed={selected === item.id}
              >
                Inspect record
              </button>
            </article>
          ))}
        </div>
      )}
      {order && (
        <section className="panel p-5" aria-label="Selected order evidence">
          <h2>Order evidence</h2>
          <p className="mono">{order.id}</p>
          <p>{order.defer_reason}</p>
          <ol className="transition-log">
            {order.transitions.map((transition, index) => (
              <li key={index}>
                <span className="chip chip-info">{transition.state}</span>
                <time>{transition.timestamp}</time>
                <p>{transition.details}</p>
              </li>
            ))}
          </ol>
          <pre className="evidence-json">
            {order.receipt_text || "No receipt text supplied."}
          </pre>
          <button
            className="secondary-action"
            disabled={!order.receipt_text}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(order.receipt_text);
                setNotice("Receipt copied.");
              } catch {
                setNotice(
                  "Clipboard unavailable. Copy the visible receipt text.",
                );
              }
            }}
          >
            Copy receipt
          </button>
          {notice && (
            <p role="status" className="inline-notice mt-4">
              {notice}
            </p>
          )}
        </section>
      )}
    </section>
  );
}
