"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  LayoutDashboard,
  ScanLine,
  SlidersHorizontal,
  FlaskConical,
  Layers,
  Bot,
  Fingerprint,
  Shield,
  Terminal,
  Activity,
  ChevronDown,
} from "lucide-react";
import { api, type Health } from "@/lib/api";

const LINKS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/strategy", label: "Strategy Studio", icon: SlidersHorizontal },
  { href: "/", label: "Decision Desk", icon: ScanLine },
  { href: "/simulation", label: "Simulation Lab", icon: FlaskConical },
  { href: "/explorer", label: "Asset universe", icon: Layers },
  { href: "/agent", label: "Agent activity", icon: Bot },
  { href: "/receipts", label: "Receipt archive", icon: Fingerprint },
];
const TOOLS = [
  { href: "/constitution", label: "Portfolio constitution", icon: Shield },
  { href: "/terminal", label: "Execution terminal", icon: Terminal },
  { href: "/routes", label: "Route inspector", icon: ScanLine },
  { href: "/observations", label: "Probe observations", icon: Activity },
  { href: "/dev", label: "System health", icon: Activity },
];
export function Nav() {
  const path = usePathname();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api<Health>("/health", { signal }),
    refetchInterval: 30_000,
  });
  const current = [...LINKS, ...TOOLS].find((link) => link.href === path);
  const navigation = (links: typeof LINKS) =>
    links.map(({ href, label, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        aria-current={path === href ? "page" : undefined}
      >
        <Icon size={17} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    ));
  return (
    <>
      <aside className="workspace-sidebar" aria-label="Workspace navigation">
        <Link href="/overview" className="brand" aria-label="AfterBells home">
          <span className="brand-symbol">
            <Bell size={22} />
          </span>
          <span>
            AfterBells<small>Equity intelligence</small>
          </span>
        </Link>
        <div className="workspace-identity">
          <span className="workspace-avatar">AB</span>
          <div>
            Research workspace<small>BNB Smart Chain · 56</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">{navigation(LINKS)}</nav>
        <p className="nav-label">CONTROLS & DIAGNOSTICS</p>
        <nav aria-label="Workspace tools">{navigation(TOOLS)}</nav>
        <div className="sidebar-boundary">
          <Shield size={17} />
          <strong>Clarity before capital.</strong>
          <p>
            Evidence-backed analysis.
            <br />
            Execution stays gated.
          </p>
        </div>
      </aside>
      <header className="workspace-topbar">
        <div className="workspace-breadcrumb">
          <span>Workspace</span>
          <span aria-hidden="true">/</span>
          <strong>{current?.label ?? "AfterBells"}</strong>
        </div>
        <span className="service-status">
          {health.isError
            ? "Service unavailable"
            : health.data
              ? "API connected"
              : "Checking service…"}
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
            Workspace <ChevronDown size={14} />
          </summary>
          <div className="workspace-dropdown">
            <nav aria-label="Mobile workspace navigation">
              {navigation([...LINKS, ...TOOLS])}
            </nav>
            <p className="workspace-status">
              Analysis workspace · no signing authority
            </p>
          </div>
        </details>
      </header>
    </>
  );
}
