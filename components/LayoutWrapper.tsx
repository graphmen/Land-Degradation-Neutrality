"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import GovShell from "./GovShell";

const R2_PREFIXES = [
  "/national-overview",
  "/evidence",
  "/verification",
  "/reporting-desk",
  "/layers",
  "/analytics",
  "/admin",
];

function isR2Route(pathname: string | null): boolean {
  if (!pathname) return false;
  return R2_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });
    }
  }, []);

  if (isR2Route(pathname)) {
    return <GovShell>{children}</GovShell>;
  }

  return (
    <div className="app-layout">
      {/* Top Header Row */}
      <Header isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      {/* Body Area */}
      <div className="app-body">
        <Sidebar isCollapsed={isCollapsed} />
        
        {/* Mobile Sidebar overlay backdrop */}
        {!isCollapsed && (
          <div className="sidebar-backdrop" onClick={() => setIsCollapsed(true)} />
        )}

        <main className="app-content" style={{ flexDirection: "column" }}>
          <div
            style={{
              background: "#fef7e0",
              borderBottom: "1px solid #f5d680",
              color: "#7c4700",
              padding: "8px 16px",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <span>
              <strong>Legacy OAU View (Phase R3 Transition):</strong> This screen is superseded by
              the EMA National LDN Platform.
            </span>
            <Link
              href="/national-overview"
              style={{
                background: "#005a2b",
                color: "#ffffff",
                padding: "4px 10px",
                borderRadius: 6,
                textDecoration: "none",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Open National LDN Platform →
            </Link>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", width: "100%" }}>
            {children}
          </div>
        </main>
      </div>

      {/* Slim Footer */}
      <footer className="global-footer">
        <span>© {new Date().getFullYear()} Environmental Management Agency (EMA), Zimbabwe. All rights reserved.</span>
        <span style={{ marginLeft: "auto", fontWeight: 600, opacity: 0.9 }}>
          National LDN programme · Mobile-first collection · Code lists v0.9-draft
        </span>
      </footer>
    </div>
  );
}
