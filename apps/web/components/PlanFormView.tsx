"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Calendar, Sparkles, Trash2, Clock, Check, Plus } from "lucide-react";

interface Plan {
  id: string;
  ticker: string;
  amount_usdt: number;
  cron: string;
  tolerance_bps: number;
  window_hours: number;
  must_buy: boolean;
  active: boolean;
  created_at: string;
}

const MEERA_PROMPT = "Buy $25 of NVDA every Friday. Only if the extra cost is under 0.5%. Try for 24 hours.";

export function PlanFormView({ onPlanCreated }: { onPlanCreated?: () => void }) {
  const [prompt, setPrompt] = useState(MEERA_PROMPT);
  const [ticker, setTicker] = useState("NVDA");
  const [amountUsdt, setAmountUsdt] = useState(25);
  const [cron, setCron] = useState("0 10 * * 5");
  const [toleranceBps, setToleranceBps] = useState(50);
  const [windowHours, setWindowHours] = useState(24);
  const [mustBuy, setMustBuy] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      const json = await res.json();
      if (json.plans) setPlans(json.plans);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleParsePrompt = async () => {
    if (!prompt.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/plans/parse-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: prompt }),
      });
      const parsed = await res.json();
      if (parsed) {
        if (parsed.ticker) setTicker(parsed.ticker);
        if (parsed.amount_usdt) setAmountUsdt(parsed.amount_usdt);
        if (parsed.cron) setCron(parsed.cron);
        if (parsed.tolerance_bps) setToleranceBps(parsed.tolerance_bps);
        if (parsed.window_hours) setWindowHours(parsed.window_hours);
        if (parsed.must_buy !== undefined) setMustBuy(parsed.must_buy);
      }
    } catch {
      // ignore
    } finally {
      setParsing(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          amount_usdt: amountUsdt,
          cron,
          tolerance_bps: toleranceBps,
          window_hours: windowHours,
          must_buy: mustBuy,
        }),
      });
      if (res.ok) {
        setSuccessMsg(`Recurring plan for $${amountUsdt} ${ticker} created successfully!`);
        await loadPlans();
        if (onPlanCreated) onPlanCreated();
        setTimeout(() => setSuccessMsg(""), 3500);
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await fetch(`/api/plans/${id}`, { method: "DELETE" });
      await loadPlans();
    } catch {
      // ignore
    }
  };

  return (
    <section className="panel p-6 my-6 border border-[var(--color-edge)] bg-[var(--color-panel)] rounded">
      <div className="flex items-center justify-between border-b border-[var(--color-edge)] pb-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)] m-0">
            Recurring Buy Intent & Plan Form
          </h2>
          <p className="text-xs text-[var(--color-ink-2)] mt-1 m-0">
            Meera persona workflow: Natural language parsing + deterministic decision boundaries
          </p>
        </div>
      </div>

      {/* Natural Language Intent Station */}
      <div className="p-4 bg-[var(--color-panel-2)] border-l-4 border-[var(--color-accent)] border border-[var(--color-edge)] rounded mb-5">
        <label htmlFor="nl-intent" className="block text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wider mb-2">
          Natural Language Intent
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            id="nl-intent"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Buy $25 of NVDA every Friday. Only if the extra cost is under 0.5%. Try for 24 hours."
            className="flex-1 bg-[var(--color-panel)] border border-[var(--color-edge)] px-3 py-2 text-sm text-[var(--color-ink)] rounded outline-none focus:border-[var(--color-accent)] font-medium"
          />
          <button
            type="button"
            onClick={handleParsePrompt}
            disabled={parsing || !prompt.trim()}
            className="primary-action text-xs flex items-center justify-center gap-2 px-4 py-2"
          >
            <Sparkles size={14} />
            <span>{parsing ? "Parsing..." : "Parse into Plan"}</span>
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => { setPrompt(MEERA_PROMPT); }}
            className="text-[11px] text-[var(--color-ink-2)] hover:text-[var(--color-accent)] underline"
          >
            Use Meera Demo Persona Intent
          </button>
        </div>
      </div>

      {/* Structured Parameters Form */}
      <form onSubmit={handleCreatePlan} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
        <div>
          <label className="block text-[var(--color-ink-2)] mb-1 font-medium">Underlying Ticker</label>
          <select
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            className="w-full bg-[var(--color-panel-2)] border border-[var(--color-edge)] px-3 py-2 rounded text-[var(--color-ink)]"
          >
            <option value="NVDA">NVDA (NVIDIA)</option>
            <option value="AAPL">AAPL (Apple)</option>
            <option value="TSLA">TSLA (Tesla)</option>
            <option value="MSFT">MSFT (Microsoft)</option>
            <option value="GOOGL">GOOGL (Alphabet)</option>
          </select>
        </div>

        <div>
          <label className="block text-[var(--color-ink-2)] mb-1 font-medium">Amount (USDT)</label>
          <input
            type="number"
            min={5}
            max={1000}
            step={1}
            value={amountUsdt}
            onChange={(e) => setAmountUsdt(Number(e.target.value))}
            className="w-full bg-[var(--color-panel-2)] border border-[var(--color-edge)] px-3 py-2 rounded text-[var(--color-ink)]"
          />
        </div>

        <div>
          <label className="block text-[var(--color-ink-2)] mb-1 font-medium">Schedule (Cron)</label>
          <select
            value={cron}
            onChange={(e) => setCron(e.target.value)}
            className="w-full bg-[var(--color-panel-2)] border border-[var(--color-edge)] px-3 py-2 rounded text-[var(--color-ink)]"
          >
            <option value="0 10 * * 5">Every Friday 10:00 UTC (Weekly)</option>
            <option value="0 10 * * 1">Every Monday 10:00 UTC (Weekly)</option>
            <option value="0 14 * * *">Daily at 14:00 UTC (Regular market)</option>
            <option value="0 * * * *">Hourly Probe Plan</option>
          </select>
        </div>

        <div>
          <label className="block text-[var(--color-ink-2)] mb-1 font-medium">Cost Tolerance (bps)</label>
          <input
            type="number"
            min={5}
            max={500}
            step={5}
            value={toleranceBps}
            onChange={(e) => setToleranceBps(Number(e.target.value))}
            className="w-full bg-[var(--color-panel-2)] border border-[var(--color-edge)] px-3 py-2 rounded text-[var(--color-ink)]"
          />
          <span className="text-[10px] text-[var(--color-ink-2)]">50 bps = 0.50% extra cost limit</span>
        </div>

        <div>
          <label className="block text-[var(--color-ink-2)] mb-1 font-medium">Execution Window (Hours)</label>
          <input
            type="number"
            min={1}
            max={72}
            value={windowHours}
            onChange={(e) => setWindowHours(Number(e.target.value))}
            className="w-full bg-[var(--color-panel-2)] border border-[var(--color-edge)] px-3 py-2 rounded text-[var(--color-ink)]"
          />
          <span className="text-[10px] text-[var(--color-ink-2)]">Re-try window before skip</span>
        </div>

        <div className="flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={mustBuy}
              onChange={(e) => setMustBuy(e.target.checked)}
              className="accent-[var(--color-accent)]"
            />
            <span className="text-[var(--color-ink)]">Must Buy (Opt-in bypass deadline)</span>
          </label>
        </div>

        <div className="sm:col-span-2 md:col-span-3 mt-2 flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="primary-action text-xs flex items-center gap-2 px-5 py-2.5"
          >
            <Plus size={15} />
            <span>{submitting ? "Saving Plan..." : "Save Recurring Plan"}</span>
          </button>
          {successMsg && (
            <span className="text-xs text-[var(--color-pass)] flex items-center gap-1 font-medium">
              <Check size={14} /> {successMsg}
            </span>
          )}
        </div>
      </form>

      {/* Active Plans List */}
      <div className="mt-6 pt-5 border-t border-[var(--color-edge)]">
        <h3 className="text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wider mb-3">
          Active Recurring Plans ({plans.length})
        </h3>
        {plans.length === 0 ? (
          <p className="text-xs text-[var(--color-ink-2)] italic m-0">No active recurring plans.</p>
        ) : (
          <div className="space-y-2">
            {plans.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[#2a3c30] text-[var(--color-accent)] font-bold grid place-items-center text-sm">
                    {p.ticker.slice(0, 2)}
                  </div>
                  <div>
                    <div className="font-semibold text-[var(--color-ink)] text-sm">
                      Buy ${p.amount_usdt} {p.ticker}
                    </div>
                    <div className="text-[11px] text-[var(--color-ink-2)] flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {p.cron}
                      </span>
                      <span>·</span>
                      <span>Tolerance: +{p.tolerance_bps} bps</span>
                      <span>·</span>
                      <span>Window: {p.window_hours}h</span>
                      {p.must_buy && <span className="chip chip-warn py-0 px-1 text-[10px]">Must Buy</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="chip chip-pass text-[10px] py-0 px-2">Active</span>
                  <button
                    onClick={() => handleDeletePlan(p.id)}
                    className="text-[var(--color-ink-2)] hover:text-[var(--color-fail)] p-1"
                    title="Delete plan"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
