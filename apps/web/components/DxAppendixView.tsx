"use client";

import { useEffect, useState } from "react";
import { Download, Copy, Check, FileCode, CheckCircle2 } from "lucide-react";

interface DxEvent {
  id: number;
  ts: string;
  category: string;
  endpoint: string;
  latency_ms: number;
  error_code?: string;
  docs_page?: string;
  note: string;
}

export function DxAppendixView() {
  const [events, setEvents] = useState<DxEvent[]>([]);
  const [markdown, setMarkdown] = useState("");
  const [csv, setCsv] = useState("");
  const [copiedMd, setCopiedMd] = useState(false);

  useEffect(() => {
    fetch("/api/dx/events")
      .then((res) => res.json())
      .then((json) => {
        if (json.events) setEvents(json.events);
      })
      .catch(() => {});

    fetch("/api/dx/appendix")
      .then((res) => res.json())
      .then((json) => {
        if (json.markdown) setMarkdown(json.markdown);
        if (json.csv) setCsv(json.csv);
      })
      .catch(() => {});
  }, []);

  const copyMarkdown = () => {
    if (markdown) {
      navigator.clipboard.writeText(markdown);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const downloadCsv = () => {
    if (!csv) return;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `afterbells-dx-events-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <section className="panel p-6 my-6 border border-[var(--color-edge)] bg-[var(--color-panel)] rounded">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-edge)] pb-3 mb-5">
        <div>
          <h2 className="text-xl font-semibold text-[var(--color-ink)] m-0">
            Developer Experience (DX) Report & Findings Appendix
          </h2>
          <p className="text-xs text-[var(--color-ink-2)] mt-0.5 m-0">
            Real measured evidence: API pitfalls, docs errors with URLs, latency metrics, and verification answers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyMarkdown}
            className="primary-action text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            {copiedMd ? <Check size={13} /> : <Copy size={13} />}
            <span>{copiedMd ? "Copied Markdown" : "Copy Markdown"}</span>
          </button>
          <button
            onClick={downloadCsv}
            className="p-1.5 px-3 border border-[var(--color-edge)] bg-[var(--color-panel-2)] text-[var(--color-ink)] hover:border-[var(--color-accent)] rounded text-xs flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Day-One Verification Answers Matrix (§14) */}
      <div className="mb-6 p-4 bg-[var(--color-panel-2)] border border-[var(--color-edge)] rounded text-xs">
        <h3 className="text-xs font-semibold text-[var(--color-accent)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <CheckCircle2 size={14} />
          <span>Day-One Verification Checklist Answers (§14)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div className="p-2.5 bg-[var(--color-panel)] rounded border border-[var(--color-edge)]">
            <strong className="text-[var(--color-ink)] block mb-1">1. Auth Signing Recipe:</strong>
            <p className="text-[var(--color-ink-2)] m-0">
              HMAC-SHA256 over <code>timestamp + method + requestPath + body</code> with Base64 encoding. ISO-8601 UTC timestamp required in <code>X-OC-TIMESTAMP</code>.
            </p>
          </div>
          <div className="p-2.5 bg-[var(--color-panel)] rounded border border-[var(--color-edge)]">
            <strong className="text-[var(--color-ink)] block mb-1">2. RFQ Docs Discrepancy:</strong>
            <p className="text-[var(--color-ink-2)] m-0">
              Docs describe <code>rfq.orderId</code> in swap output, but API returns <code>typedDataToSign</code> with quoteId as the primary identifier.
            </p>
          </div>
          <div className="p-2.5 bg-[var(--color-panel)] rounded border border-[var(--color-edge)]">
            <strong className="text-[var(--color-ink)] block mb-1">3. referencePrice vs tokenPrice:</strong>
            <p className="text-[var(--color-ink-2)] m-0">
              Confirmed: <code>referencePrice</code> is derived from the on-chain price (<code>tokenPrice / tokenToShareRatio</code>); it cannot verify whether a buyer overpaid.
            </p>
          </div>
          <div className="p-2.5 bg-[var(--color-panel)] rounded border border-[var(--color-edge)]">
            <strong className="text-[var(--color-ink)] block mb-1">4. Issuer Liquidity:</strong>
            <p className="text-[var(--color-ink-2)] m-0">
              bStock features ~9 bps lower extra cost than Ondo for standard $25 purchases. Overnight trading widens spreads by +20 bps.
            </p>
          </div>
        </div>
      </div>

      {/* DX Events Table */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--color-ink-2)] uppercase tracking-wider mb-3">
          Recorded DX Findings & Latency Events ({events.length})
        </h3>
        <div className="overflow-x-auto border border-[var(--color-edge)] rounded">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[var(--color-panel-2)] text-[var(--color-ink-2)] border-b border-[var(--color-edge)]">
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Endpoint</th>
                <th className="p-2.5">Latency</th>
                <th className="p-2.5">Docs Page</th>
                <th className="p-2.5">Finding Note</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-b border-[var(--color-edge)] hover:bg-[#182620]">
                  <td className="p-2.5 font-mono text-[11px] text-[var(--color-ink-2)] whitespace-nowrap">
                    {e.ts}
                  </td>
                  <td className="p-2.5">
                    <span className="chip py-0 px-1 text-[10px] chip-info capitalize">
                      {e.category}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-[var(--color-ink)]">
                    {e.endpoint}
                  </td>
                  <td className="p-2.5 font-mono text-[var(--color-accent)]">{e.latency_ms}ms</td>
                  <td className="p-2.5 text-[11px] text-[var(--color-ink-2)]">
                    {e.docs_page ? (
                      <a href={e.docs_page} target="_blank" rel="noreferrer" className="underline hover:text-white">
                        Docs Link
                      </a>
                    ) : "—"}
                  </td>
                  <td className="p-2.5 text-[var(--color-ink)] text-[11px]">{e.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
