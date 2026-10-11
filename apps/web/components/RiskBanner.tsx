"use client";

import { AlertTriangle } from "lucide-react";

export function RiskBanner() {
  return (
    <div
      role="region"
      aria-label="Risk and Regulatory Notice"
      className="flex items-center gap-3 px-4 py-2.5 my-3 text-xs bg-[#241a14] border border-[#71483e] text-[#f5c2b8] rounded"
    >
      <AlertTriangle size={15} className="shrink-0 text-[#ffad9c]" />
      <p className="leading-tight m-0">
        <strong className="font-semibold text-white">Notice:</strong> Tokenized
        securities trade on-chain 24/7 but can be halted or restricted during
        corporate actions, earnings windows, or issuer pauses. Afterbell checks
        tradability and execution costs before acting. Not investment advice.
      </p>
    </div>
  );
}
