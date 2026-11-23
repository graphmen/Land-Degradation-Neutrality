"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
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

        <main className="app-content">
          {children}
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
