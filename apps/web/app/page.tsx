"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  Activity,
  Receipt,
  FileCode,
  ShieldAlert,
  ArrowUpRight
} from "lucide-react";
import { RiskBanner } from "@/components/RiskBanner";
import { SetupChecklist } from "@/components/SetupChecklist";
import { PlanFormView } from "@/components/PlanFormView";
import { ProbeDashboardView } from "@/components/ProbeDashboardView";
import { OrdersReceiptsView } from "@/components/OrdersReceiptsView";
import { DxAppendixView } from "@/components/DxAppendixView";

type TabKey = "all" | "setup" | "plan" | "probe" | "orders" | "dx";

export default function AfterbellDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  return (
    <div className="exposure-desk max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 0. Regulatory & Safety Risk Banner (§9) */}
      <RiskBanner />

      {/* 1. Header & Masthead */}
      <header className="desk-masthead border-b border-[var(--color-edge)] pb-6 mb-6">
        <div>
          <p className="label masthead-kicker text-xs uppercase tracking-widest text-[var(--color-accent)] font-mono">
            BNB Smart Chain · Tokenized Stocks Edition
          </p>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-[var(--color-ink)] mt-1">
            Afterbell: <span className="text-[var(--color-accent)]">Measure-Then-Act</span>
          </h1>
          <p className="text-sm text-[var(--color-ink-2)] mt-2 max-w-2xl leading-relaxed">
            Recurring-buy agent for tokenized stocks on BSC that compares issuers (Ondo vs bStock),
            measures execution spreads around the clock, checks earnings & tradability, and signs RFQ orders within your cost tolerance.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-xs">
          <span className="chip chip-pass py-1 px-3">BSC Mainnet (56)</span>
          <span className="text-[var(--color-ink-2)]">Execution Engine: Deterministic</span>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--color-edge)] mb-6 text-xs font-medium">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeTab === "all"
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-ink-2)] hover:text-white"
          }`}
        >
          All Views
        </button>
        <button
          onClick={() => setActiveTab("setup")}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeTab === "setup"
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-ink-2)] hover:text-white"
          }`}
        >
          1. Setup Checklist
        </button>
        <button
          onClick={() => setActiveTab("plan")}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeTab === "plan"
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-ink-2)] hover:text-white"
          }`}
        >
          2. Plan Creation
        </button>
        <button
          onClick={() => setActiveTab("probe")}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeTab === "probe"
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-ink-2)] hover:text-white"
          }`}
        >
          3. Probe Analytics
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeTab === "orders"
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-ink-2)] hover:text-white"
          }`}
        >
          4. Orders & Receipts
        </button>
        <button
          onClick={() => setActiveTab("dx")}
          className={`px-3 py-1.5 rounded transition-colors ${
            activeTab === "dx"
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-ink-2)] hover:text-white"
          }`}
        >
          5. DX Appendix Export
        </button>
      </nav>

      {/* 3. Dashboard Views (§10) */}
      <main className="space-y-6">
        {(activeTab === "all" || activeTab === "setup") && (
          <div id="view-setup">
            <SetupChecklist />
          </div>
        )}

        {(activeTab === "all" || activeTab === "plan") && (
          <div id="view-plan">
            <PlanFormView />
          </div>
        )}

        {(activeTab === "all" || activeTab === "probe") && (
          <div id="view-probe">
            <ProbeDashboardView />
          </div>
        )}

        {(activeTab === "all" || activeTab === "orders") && (
          <div id="view-orders">
            <OrdersReceiptsView />
          </div>
        )}

        {(activeTab === "all" || activeTab === "dx") && (
          <div id="view-dx">
            <DxAppendixView />
          </div>
        )}
      </main>

      {/* 4. Footer */}
      <footer className="mt-12 pt-6 border-t border-[var(--color-edge)] flex flex-wrap items-center justify-between text-xs text-[var(--color-ink-2)]">
        <div>
          <span>Afterbell · The measure-then-act recurring buy agent for tokenized stocks</span>
        </div>
        <div className="flex items-center gap-4 mt-2 sm:mt-0">
          <span>Ondo · bStocks · BSC</span>
          <span>MIT License</span>
        </div>
      </footer>
    </div>
  );
}
