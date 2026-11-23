"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Landmark,
  FileSpreadsheet,
  ClipboardCheck,
  Layers,
  BarChart3,
  FileCheck2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  Sprout,
} from "lucide-react";

const PRIMARY_NAV = [
  {
    href: "/national-overview",
    label: "National Overview",
    icon: Landmark,
  },
  {
    href: "/evidence/registry",
    label: "Evidence Registry",
    icon: FileSpreadsheet,
  },
  {
    href: "/verification",
    label: "Verification Workspace",
    icon: ClipboardCheck,
  },
  {
    href: "/layers",
    label: "National Layers",
    icon: Layers,
  },
  {
    href: "/analytics",
    label: "Analytics (SO1)",
    icon: BarChart3,
  },
  {
    href: "/reporting-desk",
    label: "Reporting Desk",
    icon: FileCheck2,
  },
  {
    href: "/admin",
    label: "Administration",
    icon: Settings,
  },
];

const LEGACY_LINKS = [
  { href: "/drylands", label: "Drylands (ILUP)" },
  { href: "/database", label: "Legacy Explorer" },
];

export default function GovShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="gov-shell">
      <header className="gov-header">
        <div className="gov-header-left">
          <button
            type="button"
            className="gov-menu-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-label="Toggle navigation"
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>

          <Link href="/national-overview" className="gov-crest">
            <img src="/ema-logo.png" alt="EMA Zimbabwe Crest" />
            <div className="gov-brand-titles">
              <span className="gov-brand-main">EMA National LDN Platform</span>
              <span className="gov-brand-sub">
                Environmental Management Agency · Republic of Zimbabwe · UNCCD SDG 15.3.1
              </span>
            </div>
          </Link>
        </div>

        <div className="gov-header-right">
          <span className="gov-period-pill" title="Active UNCCD PRAIS reporting period">
            <span className="gov-period-dot" />
            Period: 2020-2023
          </span>
          <span className="gov-phase-tag">R2 Gov Shell</span>
        </div>
      </header>

      <div className="gov-body">
        <nav className={`gov-sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Primary">
          <div className="gov-nav-group">
            <div className="gov-nav-group-label">National Platform</div>
            {PRIMARY_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`gov-nav-link ${active ? "active" : ""}`}
                  title={item.label}
                >
                  <Icon size={17} style={{ flexShrink: 0 }} />
                  <span className="gov-nav-text">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="gov-nav-divider" />

          <div className="gov-nav-group">
            <div className="gov-nav-group-label">Transition Links</div>
            {LEGACY_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="gov-nav-link"
                title={item.label}
              >
                {item.href === "/drylands" ? (
                  <Sprout size={16} style={{ flexShrink: 0 }} />
                ) : (
                  <ArrowUpRight size={16} style={{ flexShrink: 0 }} />
                )}
                <span className="gov-nav-text">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="gov-sidebar-footer">
            <div className="gov-sidebar-footer-text">
              <div>Corpus-first governance</div>
              <div>Annex F code lists v0.9-draft</div>
            </div>
          </div>
        </nav>

        <main className="gov-main">
          <div className="gov-container">{children}</div>
        </main>
      </div>

      <footer className="gov-footer">
        <span>© {new Date().getFullYear()} Environmental Management Agency (EMA), Zimbabwe</span>
        <span>Phase R2 · Evidence-first architecture · PRAIS rehearsal ready</span>
      </footer>
    </div>
  );
}
