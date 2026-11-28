"use client";

import React, { useEffect, useState } from "react";
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
  SlidersHorizontal,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";
import {
  EMA_ROLE_META,
  GovPlatformProvider,
  useGovPlatform,
  type ReportingPeriodOption,
} from "./GovPlatformContext";

const PRIMARY_NAV = [
  { href: "/national-overview", label: "Country Profile", icon: Landmark },
  { href: "/evidence/registry", label: "Evidence Registry", icon: FileSpreadsheet },
  { href: "/verification", label: "Verification Queue", icon: ClipboardCheck },
  { href: "/layers", label: "Spatial Layers", icon: Layers },
  { href: "/analytics", label: "SDG 15.3.1 Analytics", icon: BarChart3 },
  { href: "/reporting-desk", label: "PRAIS 4 Reporting", icon: FileCheck2 },
];

const EXPLORER_NAV = [
  { href: "/ldn", label: "LDN Field Map", icon: MapPin },
  { href: "/soil", label: "Soil Core Lab", icon: FlaskConical },
  { href: "/interventions", label: "Restoration Projects", icon: Wrench },
  { href: "/drylands", label: "Drylands (ILUP)", icon: Sprout },
  { href: "/gallery", label: "Field Gallery", icon: ImageIcon },
  { href: "/database", label: "Data Explorer", icon: Database },
];

const SYSTEM_NAV = [
  { href: "/admin", label: "System Administration", icon: Settings },
  { href: "/settings", label: "Access & Settings", icon: SlidersHorizontal },
  { href: "/support", label: "Help, Q&A & Feedback", icon: HelpCircle },
];

const FULLBLEED_ROUTES = ["/ldn", "/soil", "/interventions", "/drylands", "/database"];

function GovShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { period, setPeriod, user, role, logout } = useGovPlatform();

  // Close mobile navigation drawer automatically on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="gov-shell">
      {/* Top Institutional Utility Bar (FAO / UNCCD style) */}
      <div className="gov-utility-bar">
        <span className="gov-utility-brand-full">
          Republic of Zimbabwe | Environmental Management Agency (EMA)
        </span>
        <span className="gov-utility-brand-short">EMA Zimbabwe</span>
        <div className="gov-utility-controls">
          <label className="gov-utility-select-wrap" title="Reporting cycle">
            <span className="gov-mobile-hide">Cycle:</span>
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
          {user ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Link
                href="/settings"
                className="gov-utility-user-link"
                title={`${user.email} · ${user.station}`}
              >
                <span className="gov-mobile-hide">{user.full_name} ({EMA_ROLE_META[role].label})</span>
                <span className="gov-mobile-only">{user.full_name.split(" ")[0]}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.28)",
                  color: "#d6e2db",
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "1px 7px",
                  borderRadius: 3,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Sign Out
              </button>
            </span>
          ) : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span className="gov-mobile-hide">Public View (Read-only)</span>
              <Link
                href="/settings"
                style={{
                  color: "#ffffff",
                  textDecoration: "none",
                  fontWeight: 600,
                  border: "1px solid rgba(255,255,255,0.32)",
                  padding: "1px 8px",
                  borderRadius: 3,
                  whiteSpace: "nowrap",
                }}
              >
                Sign In
              </Link>
            </span>
          )}
        </div>
      </div>

      {/* Primary Pure-White Header */}
      <header className="gov-header">
        <div className="gov-header-left">
          {/* Desktop sidebar collapse toggle */}
          <button
            type="button"
            className="gov-menu-btn gov-desktop-only"
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            aria-label="Toggle navigation"
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Mobile slide-over drawer toggle */}
          <button
            type="button"
            className="gov-menu-btn gov-mobile-nav-trigger"
            onClick={() => setMobileMenuOpen((o) => !o)}
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>

          <Link href="/national-overview" className="gov-crest">
            <img src="/ema-logo.png" alt="EMA Zimbabwe" />
            <div className="gov-brand-titles">
              <span className="gov-brand-main gov-mobile-hide">Zimbabwe Land Degradation Neutrality Portal</span>
              <span className="gov-brand-main gov-mobile-only">Zimbabwe LDN Portal</span>
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
        {mobileMenuOpen && (
          <div
            className="gov-mobile-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        <nav
          className={`gov-sidebar ${collapsed ? "collapsed" : ""} ${mobileMenuOpen ? "mobile-open" : ""}`}
          aria-label="Primary"
        >
          <div className="gov-mobile-drawer-head">
            <span style={{ fontWeight: 700, fontSize: 13, color: "#11181c" }}>EMA LDN Navigation</span>
            <button
              type="button"
              className="gov-menu-btn"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={15} />
            </button>
          </div>
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

          <div className="gov-nav-divider" />

          <div className="gov-nav-group">
            <div className="gov-nav-group-label">System &amp; Support</div>
            {SYSTEM_NAV.map((item) => {
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
