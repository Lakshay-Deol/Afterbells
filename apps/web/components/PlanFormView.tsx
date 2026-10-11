"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Save, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "./WorkspaceUI";

type Plan = {
  id: string;
  ticker: string;
  amount_usdt: number;
  cron: string;
  tolerance_bps: number;
  window_hours: number;
  must_buy: boolean;
  active: boolean;
  created_at: string;
};
type Draft = Omit<Plan, "id" | "active" | "created_at">;
const INITIAL: Draft = {
  ticker: "NVDA",
  amount_usdt: 25,
  cron: "0 10 * * 5",
  tolerance_bps: 50,
  window_hours: 24,
  must_buy: false,
};
const EXAMPLE =
  "Buy $25 of NVDA every Friday. Only if the extra cost is under 0.5%. Try for 24 hours.";
export function PlanFormView() {
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState(EXAMPLE);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [interpretation, setInterpretation] = useState<Draft | null>(null);
  const [notice, setNotice] = useState("");
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: ({ signal }) => api<{ plans: Plan[] }>("/plans", { signal }),
  });
  const parse = useMutation({
    mutationFn: (text: string) =>
      api<Draft>("/plans/parse-intent", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    onSuccess: (parsed) => {
      setInterpretation(parsed);
      setNotice(
        "Interpretation ready for review. Your structured fields have not changed.",
      );
    },
  });
  const save = useMutation({
    mutationFn: () =>
      api<Plan>("/plans", { method: "POST", body: JSON.stringify(draft) }),
    onSuccess: () => {
      setNotice(
        "Plan saved. Configuration only; no transaction was submitted.",
      );
      void qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api(`/plans/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      setNotice("Plan deleted.");
      void qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
  const pending = save.isPending || parse.isPending || remove.isPending;
  function exportDraft() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              kind: "AFTERBELLS_STRATEGY_DRAFT",
              originalIntent: prompt,
              draft,
              execution: "NOT_AUTHORIZED",
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "afterbells-strategy-draft.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(
      "Draft exported. No recurring schedule or transaction was started.",
    );
  }
  const field = (key: keyof Draft, value: string | number | boolean) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  };
  return (
    <div className="space-y-6">
      {plans.error && (
        <div className="workspace-boundary">
          <strong>PLAN PERSISTENCE · BLOCKED</strong>
          <p>
            The configured analysis API does not expose recurring-plan storage.
            Interpret, review and export a draft here; scheduling requires a
            compatible backend. Retry GET /api/plans to check capability.
          </p>
        </div>
      )}
      <ErrorState error={plans.error} retry={() => void plans.refetch()} />
      <ErrorState
        id="strategy-error"
        error={parse.error ?? save.error ?? remove.error}
      />
      <div className="studio-grid">
        <section className="panel studio-intent">
          <span className="label">01 / ORIGINAL INTENT</span>
          <h2>Describe your strategy</h2>
          <label htmlFor="strategy-intent">Natural-language instruction</label>
          <textarea
            id="strategy-intent"
            aria-describedby="strategy-error"
            aria-invalid={parse.isError}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setInterpretation(null);
              parse.reset();
              setNotice("");
            }}
            disabled={pending}
            rows={5}
          />
          <p className="small-note">
            The recurring-plan parser supports a limited grammar. Review every
            field before applying its interpretation.
          </p>
          <button
            className="secondary-action"
            disabled={pending || !prompt.trim()}
            onClick={() => parse.mutate(prompt)}
          >
            {parse.isPending ? "Interpreting…" : "Interpret intent"}
            <ArrowRight size={15} />
          </button>
          {interpretation && (
            <div className="interpretation-preview">
              <h3>Normalized interpretation</h3>
              <dl className="support-facts">
                <dt>Underlying</dt>
                <dd>{interpretation.ticker}</dd>
                <dt>Amount</dt>
                <dd>{interpretation.amount_usdt} USDT</dd>
                <dt>Schedule (UTC cron)</dt>
                <dd className="mono">{interpretation.cron}</dd>
                <dt>Cost tolerance</dt>
                <dd>{interpretation.tolerance_bps} bps</dd>
                <dt>Window</dt>
                <dd>{interpretation.window_hours} hours</dd>
                <dt>Must buy</dt>
                <dd>{String(interpretation.must_buy)}</dd>
              </dl>
              <button
                className="text-action"
                disabled={pending}
                onClick={() => {
                  setDraft(interpretation);
                  setNotice(
                    "Interpretation applied to the draft. Review before saving.",
                  );
                }}
              >
                Apply interpretation to draft
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </section>
        <section className="panel studio-fields">
          <span className="label">02 / STRUCTURED DRAFT</span>
          <h2>Define the boundaries</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <fieldset
              disabled={pending}
              className="strategy-fields"
              aria-describedby="strategy-error"
            >
              <label>
                Underlying ticker
                <input
                  required
                  pattern="[A-Za-z][A-Za-z0-9.]{0,14}"
                  maxLength={15}
                  value={draft.ticker}
                  onChange={(event) =>
                    field("ticker", event.target.value.toUpperCase())
                  }
                />
              </label>
              <label>
                Amount (USDT)
                <input
                  type="number"
                  required
                  min={5}
                  max={1000}
                  step={1}
                  value={draft.amount_usdt}
                  onChange={(event) =>
                    field("amount_usdt", event.target.valueAsNumber)
                  }
                />
              </label>
              <label>
                Schedule (UTC)
                <select
                  value={draft.cron}
                  onChange={(event) => field("cron", event.target.value)}
                >
                  <option value="0 10 * * 5">Friday · 10:00 UTC</option>
                  <option value="0 10 * * 1">Monday · 10:00 UTC</option>
                  <option value="0 14 * * *">Daily · 14:00 UTC</option>
                  <option value="0 * * * *">Hourly</option>
                  {![
                    "0 10 * * 5",
                    "0 10 * * 1",
                    "0 14 * * *",
                    "0 * * * *",
                  ].includes(draft.cron) && (
                    <option value={draft.cron}>{draft.cron}</option>
                  )}
                </select>
              </label>
              <label>
                Cost tolerance (bps)
                <input
                  type="number"
                  required
                  min={0}
                  max={500}
                  step={1}
                  value={draft.tolerance_bps}
                  onChange={(event) =>
                    field("tolerance_bps", event.target.valueAsNumber)
                  }
                />
              </label>
              <label>
                Retry window (hours)
                <input
                  type="number"
                  required
                  min={1}
                  max={72}
                  step={1}
                  value={draft.window_hours}
                  onChange={(event) =>
                    field("window_hours", event.target.valueAsNumber)
                  }
                />
              </label>
              <label className="strategy-checkbox">
                <input
                  type="checkbox"
                  checked={draft.must_buy}
                  onChange={(event) => field("must_buy", event.target.checked)}
                />
                Must buy after deadline
              </label>
            </fieldset>
            <p className="small-note">
              Must buy changes the deadline preference. System safety gates
              still apply.
            </p>
            <button
              className="primary-action"
              disabled={pending || plans.isError}
            >
              <Save size={15} />
              {save.isPending ? "Saving…" : "Save recurring plan"}
            </button>
            <button
              type="button"
              className="secondary-action ml-3"
              disabled={
                pending || !draft.ticker || !Number.isFinite(draft.amount_usdt)
              }
              onClick={exportDraft}
            >
              Export draft
            </button>
          </form>
        </section>
      </div>
      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      <section className="panel p-5">
        <div className="section-heading">
          <h2>Saved plans</h2>
          <span className="small-note">
            {plans.data ? `${plans.data.plans.length} configurations` : ""}
          </span>
        </div>
        {plans.isPending ? (
          <LoadingState>Loading recurring plans…</LoadingState>
        ) : plans.data?.plans.length === 0 ? (
          <EmptyState title="No recurring plans yet">
            Review your draft and save it to start a configuration history.
          </EmptyState>
        ) : (
          <div className="saved-plans">
            {plans.data?.plans.map((plan) => (
              <article key={plan.id}>
                <div>
                  <h3>
                    {plan.ticker} <span>· {plan.amount_usdt} USDT</span>
                  </h3>
                  <p>
                    {plan.tolerance_bps} bps tolerance · {plan.window_hours}h
                    window
                  </p>
                  <small className="mono">
                    {plan.cron} UTC · {plan.created_at}
                  </small>
                </div>
                <button
                  className="secondary-action"
                  disabled={pending}
                  onClick={() => remove.mutate(plan.id)}
                  aria-label={`Delete ${plan.ticker} plan`}
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
