"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
  Copy,
  Check
} from "lucide-react";

interface OrderTransition {
  state: string;
  timestamp: string;
  details?: string;
}

interface Order {
  id: string;
  plan_id?: string;
  ts: string;
  state: string;
  issuer: string;
  vendor: string;
  request_id: string;
  quote_id: string;
  rfq_order_id?: string;
  retries: number;
  tx_hash?: string;
  usdt_spent: number;
  tokens_out: number;
  cost_bps: number;
  defer_reason?: string;
  receipt_text: string;
  transitions: OrderTransition[];
}

export function OrdersReceiptsView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [buyTicker, setBuyTicker] = useState("NVDA");
  const [buyAmount, setBuyAmount] = useState(25);
  const [toleranceBps, setToleranceBps] = useState(50);
  const [activeExecutionOrder, setActiveExecutionOrder] = useState<Order | null>(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const json = await res.json();
      if (json.orders) setOrders(json.orders);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleExecuteBuy = async (simulateEarningsPause: boolean = false) => {
    setExecuting(true);
    setActiveExecutionOrder(null);
    try {
      const res = await fetch("/api/orders/execute-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: buyTicker,
          amountUsdt: buyAmount,
          toleranceBps,
          simulateEarningsPause
        })
      });
      const order: Order = await res.json();
      setActiveExecutionOrder(order);
      setSelectedOrder(order);
      await loadOrders();
    } catch {
      // ignore
    } finally {
      setExecuting(false);
    }
  };

  const copyReceipt = () => {
    if (selectedOrder?.receipt_text) {
      navigator.clipboard.writeText(selectedOrder.receipt_text);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2000);
    }
  };

  return (
    <section className="panel p-6 my-6 border border-[var(--color-edge)] bg-[var(--color-panel)] rounded">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-edge)] pb-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)] m-0">
            Orders & Plain-English Receipts Desk
          </h2>
          <p className="text-xs text-[var(--color-ink-2)] mt-0.5 m-0">
            RFQ execution pipeline, EIP-712 signing, order state machine, and plain-English receipts
          </p>
        </div>
      </div>

      {/* Interactive Trigger Desk */}
      <div className="p-4 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded mb-6 text-xs">
        <h3 className="text-xs font-semibold text-[var(--color-ink)] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Play size={14} className="text-[var(--color-accent)]" />
          <span>Execute Scheduled Buy Test (Meera Demo Loop)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-[var(--color-ink-2)] mb-1">Ticker</label>
            <select
              value={buyTicker}
              onChange={(e) => setBuyTicker(e.target.value)}
              className="w-full bg-[var(--color-panel)] border border-[var(--color-edge)] p-2 rounded text-[var(--color-ink)]"
            >
              <option value="NVDA">NVDA (NVIDIA)</option>
              <option value="AAPL">AAPL (Apple)</option>
              <option value="TSLA">TSLA (Tesla)</option>
            </select>
          </div>
          <div>
            <label className="block text-[var(--color-ink-2)] mb-1">Amount (USDT)</label>
            <input
              type="number"
              value={buyAmount}
              onChange={(e) => setBuyAmount(Number(e.target.value))}
              className="w-full bg-[var(--color-panel)] border border-[var(--color-edge)] p-2 rounded text-[var(--color-ink)]"
            />
          </div>
          <div>
            <label className="block text-[var(--color-ink-2)] mb-1">Tolerance (bps)</label>
            <input
              type="number"
              value={toleranceBps}
              onChange={(e) => setToleranceBps(Number(e.target.value))}
              className="w-full bg-[var(--color-panel)] border border-[var(--color-edge)] p-2 rounded text-[var(--color-ink)]"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => handleExecuteBuy(false)}
              disabled={executing}
              className="primary-action text-xs flex-1 flex items-center justify-center gap-1.5 py-2 px-3"
            >
              <Play size={13} />
              <span>{executing ? "Executing..." : "Buy Now"}</span>
            </button>
            <button
              onClick={() => handleExecuteBuy(true)}
              disabled={executing}
              className="p-2 border border-[#71483e] bg-[#241a14] text-[#ffad9c] hover:bg-[#322018] rounded text-xs whitespace-nowrap"
              title="Test earnings window deferral (ASSET_LIMITED)"
            >
              Simulate Earnings Pause
            </button>
          </div>
        </div>
      </div>

      {/* State Machine Transition Display (if an order is active or selected) */}
      {(activeExecutionOrder || selectedOrder) && (
        <div className="p-4 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded mb-6 text-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-[var(--color-ink)]">
              State Machine Transitions for Order: {activeExecutionOrder?.id || selectedOrder?.id}
            </span>
            <span
              className={`chip py-0 px-2 text-[10px] ${
                (activeExecutionOrder || selectedOrder)?.state === "FILLED"
                  ? "chip-pass"
                  : (activeExecutionOrder || selectedOrder)?.state === "DEFERRED"
                  ? "chip-warn"
                  : "chip-fail"
              }`}
            >
              {(activeExecutionOrder || selectedOrder)?.state}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              "PLANNED",
              "READINESS_OK",
              "QUOTED",
              "APPROVED",
              "BUILT",
              "SIGNED",
              "SUBMITTED",
              "FILLED"
            ].map((step, idx) => {
              const currentOrder = activeExecutionOrder || selectedOrder;
              const hasPassed = currentOrder?.transitions.some((t) => t.state === step);
              const isCurrent = currentOrder?.state === step;
              const isDeferred = currentOrder?.state === "DEFERRED" && step === "READINESS_OK";

              return (
                <div key={step} className="flex items-center gap-1">
                  <div
                    className={`px-2.5 py-1 rounded border text-[11px] font-mono transition-colors ${
                      hasPassed
                        ? "bg-[#18352c] border-[#3d6553] text-[var(--color-pass)] font-bold"
                        : isDeferred
                        ? "bg-[#332e1d] border-[#736544] text-[var(--color-warn)]"
                        : "bg-[var(--color-panel)] border-[var(--color-edge)] text-[var(--color-ink-2)] opacity-50"
                    }`}
                  >
                    {step}
                  </div>
                  {idx < 7 && <ChevronRight size={12} className="text-[var(--color-ink-2)] opacity-40" />}
                </div>
              );
            })}
          </div>

          {(activeExecutionOrder || selectedOrder)?.defer_reason && (
            <div className="mt-3 p-2 bg-[#332e1d] border border-[#736544] text-[#e8cc8b] rounded flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" />
              <span>{(activeExecutionOrder || selectedOrder)?.defer_reason}</span>
            </div>
          )}
        </div>
      )}

      {/* Orders Table */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wider mb-3">
          Order Execution History ({orders.length})
        </h3>
        <div className="overflow-x-auto border border-[var(--color-edge)] rounded">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-panel-2)] text-[var(--color-ink-2)] border-b border-[var(--color-edge)]">
                <th className="p-2.5">Time</th>
                <th className="p-2.5">Order ID</th>
                <th className="p-2.5">Amount</th>
                <th className="p-2.5">Status</th>
                <th className="p-2.5">Issuer</th>
                <th className="p-2.5">Vendor</th>
                <th className="p-2.5">Extra Cost</th>
                <th className="p-2.5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setSelectedOrder(o)}
                  className={`border-b border-[var(--color-edge)] cursor-pointer hover:bg-[#182620] transition-colors ${
                    selectedOrder?.id === o.id ? "bg-[#1c2c24]" : ""
                  }`}
                >
                  <td className="p-2.5 font-mono text-[11px] text-[var(--color-ink-2)]">
                    {new Date(o.ts).toLocaleTimeString()}
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-[var(--color-ink)]">
                    {o.id.slice(0, 14)}...
                  </td>
                  <td className="p-2.5 font-medium">${o.usdt_spent.toFixed(2)} USDT</td>
                  <td className="p-2.5">
                    <span
                      className={`chip py-0 px-1 text-[10px] ${
                        o.state === "FILLED"
                          ? "chip-pass"
                          : o.state === "DEFERRED"
                          ? "chip-warn"
                          : "chip-fail"
                      }`}
                    >
                      {o.state}
                    </span>
                  </td>
                  <td className="p-2.5 text-[var(--color-ink-2)] capitalize">{o.issuer}</td>
                  <td className="p-2.5 font-mono text-[11px]">{o.vendor || "—"}</td>
                  <td className="p-2.5 font-mono text-[var(--color-accent)]">
                    {o.cost_bps ? `+${o.cost_bps} bps` : "—"}
                  </td>
                  <td className="p-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedOrder(o);
                      }}
                      className="text-xs text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
                    >
                      <FileText size={12} />
                      <span>View Receipt</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plain-English Receipt Modal / Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-panel)] border border-[var(--color-edge)] rounded-lg max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 text-[var(--color-ink-2)] hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 border-b border-[var(--color-edge)] pb-3 mb-4">
              <FileText className="text-[var(--color-accent)]" size={20} />
              <div>
                <h3 className="text-base font-semibold text-[var(--color-ink)] m-0">
                  Plain-English Execution Receipt
                </h3>
                <span className="text-[11px] text-[var(--color-ink-2)]">
                  Order ID: {selectedOrder.id}
                </span>
              </div>
            </div>

            <div className="p-4 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded font-mono text-xs whitespace-pre-wrap leading-relaxed text-[var(--color-ink)] select-all mb-4">
              {selectedOrder.receipt_text || "No receipt text generated."}
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-[var(--color-ink-2)]">
                Status: <strong className="text-[var(--color-ink)]">{selectedOrder.state}</strong>
              </span>
              <button
                onClick={copyReceipt}
                className="primary-action text-xs flex items-center gap-1.5 py-1.5 px-3"
              >
                {copiedReceipt ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedReceipt ? "Copied!" : "Copy Receipt"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
