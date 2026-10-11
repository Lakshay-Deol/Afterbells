"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, ShieldAlert, Wallet } from "lucide-react";

export interface WalletSetupState {
  walletAddress: string;
  isBurnerGenerated: boolean;
  bnbGasBalance: number;
  usdtBalance: number;
  usdtAllowance: number;
  gasFunded: boolean;
  usdtFunded: boolean;
  allowanceSufficient: boolean;
  dailyCapUsdt: number;
  dailySpentUsdt: number;
  killSwitch: boolean;
}

export function SetupChecklist() {
  const [data, setData] = useState<WalletSetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/setup");
      const json = await res.json();
      setData(json);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSetup();
  }, []);

  const copyAddress = () => {
    if (data?.walletAddress) {
      navigator.clipboard.writeText(data.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (!data) return null;

  return (
    <section className="panel p-5 my-4 border border-[var(--color-edge)] bg-[var(--color-panel)] rounded">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-edge)] pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="text-[var(--color-accent)]" size={18} />
          <h3 className="text-base font-semibold text-[var(--color-ink)] m-0">
            Setup Checklist & Safety Rails
          </h3>
          <span className="text-xs text-[var(--color-ink-2)]">
            (BSC Mainnet · chainId 56)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchSetup}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-[var(--color-accent)] hover:underline"
            title="Refresh on-chain balances"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        {/* Item 1: Burner Wallet */}
        <div className="p-3 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded flex flex-col justify-between">
          <span className="text-[var(--color-ink-2)] font-medium mb-1 flex items-center justify-between">
            <span>Burner Wallet</span>
            {data.isBurnerGenerated ? (
              <span className="chip chip-warn text-[10px] py-0 px-1">Test Burner</span>
            ) : (
              <span className="chip chip-pass text-[10px] py-0 px-1">Configured</span>
            )}
          </span>
          <div className="font-mono text-[11px] truncate text-[var(--color-ink)] mt-1" title={data.walletAddress}>
            {data.walletAddress.slice(0, 8)}...{data.walletAddress.slice(-6)}
          </div>
          <button
            onClick={copyAddress}
            className="mt-2 text-[11px] text-[var(--color-accent)] hover:underline text-left"
          >
            {copied ? "Copied address!" : "Copy address"}
          </button>
        </div>

        {/* Item 2: BNB for Gas */}
        <div className="p-3 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded flex flex-col justify-between">
          <span className="text-[var(--color-ink-2)] font-medium mb-1 flex items-center justify-between">
            <span>BNB Gas Balance</span>
            {data.gasFunded ? (
              <CheckCircle2 size={14} className="text-[var(--color-pass)]" />
            ) : (
              <XCircle size={14} className="text-[var(--color-fail)]" />
            )}
          </span>
          <div className="text-lg font-semibold text-[var(--color-ink)] mt-1">
            {data.bnbGasBalance.toFixed(4)} <small className="text-xs text-[var(--color-ink-2)] font-normal">BNB</small>
          </div>
          <span className="text-[10px] text-[var(--color-ink-2)] mt-1">
            {data.gasFunded ? ">= 0.002 BNB required" : "Needs 0.002 BNB minimum"}
          </span>
        </div>

        {/* Item 3: USDT & Bounded Allowance */}
        <div className="p-3 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded flex flex-col justify-between">
          <span className="text-[var(--color-ink-2)] font-medium mb-1 flex items-center justify-between">
            <span>USDT & Allowance</span>
            {data.usdtFunded ? (
              <CheckCircle2 size={14} className="text-[var(--color-pass)]" />
            ) : (
              <AlertCircle size={14} className="text-[var(--color-warn)]" />
            )}
          </span>
          <div className="text-lg font-semibold text-[var(--color-ink)] mt-1">
            ${data.usdtBalance.toFixed(2)} <small className="text-xs text-[var(--color-ink-2)] font-normal">USDT</small>
          </div>
          <span className="text-[10px] text-[var(--color-ink-2)] mt-1">
            Allowance: ${data.usdtAllowance.toFixed(2)} (Bounded)
          </span>
        </div>

        {/* Item 4: Safety Rails & Daily Cap */}
        <div className="p-3 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded flex flex-col justify-between">
          <span className="text-[var(--color-ink-2)] font-medium mb-1 flex items-center justify-between">
            <span>Safety Rails</span>
            {data.killSwitch ? (
              <span className="chip chip-fail text-[10px] py-0 px-1">HALTED</span>
            ) : (
              <span className="chip chip-pass text-[10px] py-0 px-1">ACTIVE</span>
            )}
          </span>
          <div className="text-xs text-[var(--color-ink)] mt-1">
            Spend Today: <strong>${data.dailySpentUsdt.toFixed(2)}</strong> / ${data.dailyCapUsdt.toFixed(2)} cap
          </div>
          <div className="w-full bg-[#1e2a24] h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-[var(--color-accent)] h-full transition-all"
              style={{
                width: `${Math.min(100, (data.dailySpentUsdt / (data.dailyCapUsdt || 1)) * 100)}%`
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
