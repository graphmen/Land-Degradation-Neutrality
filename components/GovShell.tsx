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
  { href: "/national-overview", label: "Country Profile", icon: Landmark },
  { href: "/evidence/registry", label: "Evidence Registry", icon: FileSpreadsheet },
  { href: "/verification", label: "Verification Queue", icon: ClipboardCheck },
  { href: "/layers", label: "Spatial Layers", icon: Layers },
  { href: "/analytics", label: "SDG 15.3.1 Analytics", icon: BarChart3 },
  { href: "/reporting-desk", label: "PRAIS 4 Reporting", icon: FileCheck2 },
  { href: "/admin", label: "Administration", icon: Settings },
];

const EXPLORER_NAV = [
  { href: "/ldn", label: "LDN Field Map", icon: MapPin },
  { href: "/soil", label: "Soil Core Lab", icon: FlaskConical },
  { href: "/interventions", label: "Restoration Projects", icon: Wrench },
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
      {/* Top Institutional Utility Bar (FAO / UNCCD style) */}
      <div className="gov-utility-bar">
        <span>Republic of Zimbabwe | Environmental Management Agency (EMA)</span>
        <div className="gov-utility-controls">
          <label className="gov-utility-select-wrap" title="Reporting cycle">
            <span>Cycle:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReportingPeriodOption)}
              aria-label="Reporting period"
              className="gov-utility-select"
            >
              <option value="2020-2023">2020–2023 (PRAIS 4)</option>
              <option value="2000-2015">2000–2015 (Baseline)</option>
              <option value="2022-2025">2022–2025 (Next Cycle)</option>
            </select>
          </label>
          <span style={{ opacity: 0.35 }}>|</span>
          <label className="gov-utility-select-wrap" title="Access role">
            <span>Access:</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as EmaRole)}
              aria-label="Active EMA RBAC role"
              className="gov-utility-select"
            >
              {(Object.keys(EMA_ROLE_META) as EmaRole[]).map((key) => (
                <option key={key} value={key}>
                  {EMA_ROLE_META[key].label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Primary Pure-White Header */}
      <header className="gov-header">
        <div className="gov-header-left">
          <button
            type="button"
            className="gov-menu-btn"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-label="Toggle navigation"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <Link href="/national-overview" className="gov-crest">
            <img src="/ema-logo.png" alt="EMA Zimbabwe" />
            <div className="gov-brand-titles">
              <span className="gov-brand-main">Zimbabwe Land Degradation Neutrality Portal</span>
              <span className="gov-brand-sub">
                UNCCD PRAIS 4 National Reporting System (SDG Indicator 15.3.1)
              </span>
            </div>
          </Link>
        </div>

        <div className="gov-header-right">
          <span>ISO3: <strong>ZWE</strong></span>
          <span style={{ color: "#cbd2d9" }}>|</span>
          <span>Baseline: <strong>2015</strong></span>
        </div>
      </header>

      <div className="gov-body">
        <nav className={`gov-sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Primary">
          <div className="gov-nav-group">
            <div className="gov-nav-group-label">Reporting</div>
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
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  <span className="gov-nav-text">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="gov-nav-divider" />

          <div className="gov-nav-group">
            <div className="gov-nav-group-label">Field Datasets</div>
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
                  <Icon size={15} style={{ flexShrink: 0 }} />
                  <span className="gov-nav-text">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div id="sidebar-export-container" className="sidebar-export-container" />

          <div className="gov-sidebar-footer">
            <div className="gov-sidebar-footer-text">
              <div>UNCCD GPG v2</div>
              <div>EMA Zimbabwe</div>
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
        <span>Environmental Management Agency (EMA), Republic of Zimbabwe</span>
        <span>UNCCD PRAIS 4 · Cycle {period}</span>
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
