"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { api, type Health } from "@/lib/api";

const MAIN = [
  { href: "/", label: "Research desk" },
  { href: "/explorer", label: "Asset universe" },
  { href: "/agent", label: "Agent tools" },
];
const TOOLS = [
  { href: "/constitution", label: "Portfolio constitution" },
  { href: "/terminal", label: "Execution terminal" },
  { href: "/routes", label: "Route inspector" },
  { href: "/receipts", label: "Receipt archive" },
  { href: "/dev", label: "Developer API" },
];

export function Nav() {
  const path = usePathname();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => api<Health>("/health"),
    refetchInterval: 30_000,
  });
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="AfterBells home">
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
            {/* Left soundwave/liquidity arc */}
            <path
              d="M4.5 12C3.5 14.5 3.5 17.5 4.5 20"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Right soundwave/liquidity arc */}
            <path
              d="M27.5 12C28.5 14.5 28.5 17.5 27.5 20"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Top crown loop */}
            <path
              d="M13.5 6a2.5 2.5 0 0 1 5 0"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            {/* Bell contour */}
            <path
              d="M16 6.5C12 6.5 9.5 9.8 9.5 15v4.5l-2.5 3h18l-2.5-3V15c0-5.2-2.5-8.5-6.5-8.5Z"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Clapper */}
            <path
              d="M13.5 24a2.5 2.5 0 0 0 5 0"
              stroke="currentColor"
              strokeWidth="2.2"
            />
            {/* Center trading pulse */}
            <circle cx="16" cy="14" r="1.5" fill="currentColor" />
          </svg>
          <span>AfterBells</span>
        </Link>
        <nav aria-label="Main navigation" className="main-navigation">
          {MAIN.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={path === l.href ? "page" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="header-network">
          <span className="network-mark" />
          BNB Smart Chain
        </span>
        <details
          className="workspace-menu"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.currentTarget.removeAttribute("open");
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>
            Workspace <ChevronDown size={13} />
          </summary>
          <div className="workspace-dropdown">
            <nav aria-label="Workspace tools">
              {TOOLS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={path === l.href ? "page" : undefined}
                  onClick={(e) =>
                    e.currentTarget.closest("details")?.removeAttribute("open")
                  }
                >
                  {l.label}
                  <ArrowUpRight size={13} />
                </Link>
              ))}
            </nav>
            <p className="workspace-status">
              {!health
                ? "Checking service…"
                : health.agenticWallet?.status === "CONNECTED"
                  ? "Wallet connected · execution gated"
                  : "Read-only workspace · no wallet required"}
            </p>
          </div>
        </details>
      </div>
    </header>
  );
}
