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
  Sprout,
  Shield,
  MapPin,
  FlaskConical,
  Wrench,
  Image as ImageIcon,
  Database,
} from "lucide-react";
import {
  EMA_ROLE_META,
  GovPlatformProvider,
  useGovPlatform,
  type EmaRole,
  type ReportingPeriodOption,
} from "./GovPlatformContext";

const PRIMARY_NAV = [
  { href: "/national-overview", label: "National Overview", icon: Landmark },
  { href: "/evidence/registry", label: "Evidence Registry", icon: FileSpreadsheet },
  { href: "/verification", label: "Verification Workspace", icon: ClipboardCheck },
  { href: "/layers", label: "National Layers", icon: Layers },
  { href: "/analytics", label: "Analytics (SO1)", icon: BarChart3 },
  { href: "/reporting-desk", label: "Reporting Desk", icon: FileCheck2 },
  { href: "/admin", label: "Administration", icon: Settings },
];

const EXPLORER_NAV = [
  { href: "/ldn", label: "LDN Field Map", icon: MapPin },
  { href: "/soil", label: "Soil Core Lab", icon: FlaskConical },
  { href: "/interventions", label: "Interventions Hub", icon: Wrench },
  { href: "/drylands", label: "Drylands (ILUP)", icon: Sprout },
  { href: "/gallery", label: "Field Gallery", icon: ImageIcon },
  { href: "/database", label: "Data Explorer", icon: Database },
];

const FULLBLEED_ROUTES = ["/ldn", "/soil", "/interventions", "/drylands", "/database"];

function GovShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { period, setPeriod, role, setRole } = useGovPlatform();

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
          <label className="gov-period-pill" title="Active UNCCD PRAIS reporting period">
            <span className="gov-period-dot" />
            <span>Period:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportingPeriodOption)}
              aria-label="Reporting period"
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="2020-2023" style={{ color: "#102117" }}>
                2020-2023 (PRAIS 4 Active)
              </option>
              <option value="2000-2015" style={{ color: "#102117" }}>
                2000-2015 (UNCCD Baseline)
              </option>
              <option value="2022-2025" style={{ color: "#102117" }}>
                2022-2025 (Next Cycle)
              </option>
            </select>
          </label>

          <label className="gov-period-pill" title="Active EMA Role">
            <Shield size={12} color="#fde68a" />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EmaRole)}
              aria-label="Active EMA RBAC role"
              style={{
                background: "transparent",
                border: "none",
                color: "#fde68a",
                fontWeight: 700,
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
              }}
            >
              {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((key) => (
                <option key={key} value={key} style={{ color: "#102117" }}>
                  {EMA_ROLE_META[key].label}
                </option>
              ))}
            </select>
          </label>
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
            <div className="gov-nav-group-label">Field Explorers</div>
            {EXPLORER_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`gov-nav-link ${active ? "active" : ""}`}
                  title={item.label}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span className="gov-nav-text">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div id="sidebar-export-container" className="sidebar-export-container" />

          <div className="gov-sidebar-footer">
            <div className="gov-sidebar-footer-text">
              <div>UNCCD GPG v2 · PRAIS 4</div>
              <div>EMA National Standards</div>
            </div>
          </div>
        </nav>

        {FULLBLEED_ROUTES.some((r) => pathname === r || pathname?.startsWith(`${r}/`)) ? (
          <main className="gov-main gov-main-fullbleed">{children}</main>
        ) : (
          <main className="gov-main">
            <div className="gov-container">{children}</div>
          </main>
        )}
      </div>

      <footer className="gov-footer">
        <span>© {new Date().getFullYear()} Environmental Management Agency (EMA), Zimbabwe</span>
        <span>
          Role: {EMA_ROLE_META[role].label} · Period: {period} · Baseline: t0_end_2015
        </span>
      </footer>
    </div>
  );
}

export default function GovShell({ children }: { children: React.ReactNode }) {
  return (
    <GovPlatformProvider>
      <GovShellInner>{children}</GovShellInner>
    </GovPlatformProvider>
  );
}
