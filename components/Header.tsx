"use client";

import React, { useState } from "react";

export default function Header({ isCollapsed, setIsCollapsed }: HeaderProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    addToast("info", "Sync Initialized", "Synchronizing latest field records from Central Database...");
    
    try {
      // Step 1: Run the sync script when available
      let scriptMessage = "";
      try {
        const syncRes = await fetch("/api/sync", { method: "POST", cache: "no-store" });
        const syncData = await syncRes.json().catch(() => ({}));
        if (syncRes.ok) {
          scriptMessage = syncData.message || "Database cache refreshed.";
        } else if (syncRes.status !== 400) {
          console.warn("Background sync script failed:", syncData.error);
        }
      } catch (scriptErr) {
        console.warn("Background sync script unavailable:", scriptErr);
      }

      // Step 2: Always pull live data from Central Database
      const [ldnRes, soilRes] = await Promise.all([
        fetch("/api/ldn?bypassCache=true&sync=true", { cache: "no-store" }),
        fetch("/api/soil?bypassCache=true&sync=true", { cache: "no-store" }),
      ]);

      if (!ldnRes.ok || !soilRes.ok) {
        const ldnErr = ldnRes.ok ? null : await ldnRes.text().catch(() => "");
        const soilErr = soilRes.ok ? null : await soilRes.text().catch(() => "");
        throw new Error(
          ldnErr || soilErr || "Failed to refresh LDN and Soil data from Central Database."
        );
      }

      const ldn = await ldnRes.json();
      const soil = await soilRes.json();

      addToast(
        "success",
        "Sync Successful",
        `Database synchronized: ${ldn.count ?? 0} LDN records, ${soil.count ?? 0} soil records.` +
          (scriptMessage ? ` ${scriptMessage}` : "")
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      addToast("error", "Sync Execution Failed", err.message || "Could not reach Central Database. Check your network connection.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="global-header">
      {/* Brand Zone (aligns with sidebar) */}
      <div className={`header-brand-zone ${isCollapsed ? "collapsed" : ""}`}>
        <div className="header-logo-badge" style={{ background: "none" }}>
          <img src="/ema-logo.png" alt="EMA Logo" width="36" height="36" style={{ borderRadius: "var(--radius-md)", objectFit: "contain" }} />
        </div>
        {!isCollapsed && (
          <div className="header-brand-text">
            <div className="brand-name">Zimbabwe LDN</div>
            <div className="brand-sub">LAND DEGRADATION NEUTRALITY</div>
          </div>
        )}
      </div>

      {/* Main Header Banner (aligns with content) */}
      <div className="header-banner-zone">
        <div className="header-left">
          <button
            className="sidebar-toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isCollapsed ? (
                <>
                  <line x1="5" y1="9" x2="19" y2="9"></line>
                  <line x1="5" y1="15" x2="19" y2="15"></line>
                  <path d="M12 5l7 7-7 7"></path>
                </>
              ) : (
                <>
                  <line x1="5" y1="9" x2="19" y2="9"></line>
                  <line x1="5" y1="15" x2="19" y2="15"></line>
                  <path d="M12 19l-7-7 7-7"></path>
                </>
              )}
            </svg>
          </button>
          
          <div className="header-mobile-brand">
            <img src="/ema-logo.png" alt="EMA Logo" width="24" height="24" style={{ objectFit: "contain" }} />
            <span className="mobile-brand-name">Zim LDN</span>
          </div>

          <div className="header-system-title">
            <h1 className="system-title-text">Land Degradation Neutrality Monitoring System</h1>
            <p className="system-subtitle-text">Environmental Management Agency (EMA)</p>
          </div>
        </div>

        <div className="header-right">
          {/* Sync Button */}
          <button 
            className="sync-btn" 
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync latest records from Server"
          >
            <span className={isSyncing ? "sync-icon-spin" : ""}>🔄</span>
            <span className="sync-btn-text">{isSyncing ? "Syncing..." : "Sync data from Server"}</span>
          </button>

          {/* Notification icon */}
          <button className="header-notif-btn" title="System Notifications">
            <span className="notif-icon">🔔</span>
            <span className="notif-badge"></span>
          </button>

          {/* User profile */}
          <div className="header-user-block">
            <div className="user-text-info">
              <div className="user-name">Admin User</div>
              <div className="user-role">System Administrator</div>
            </div>
            <div className="user-avatar">
              <span>A</span>
            </div>
          </div>
        </div>
      </div>

      {/* Render Toast Notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-item ${t.type}`}>
              <div className="toast-icon">
                {t.type === "success" && "✅"}
                {t.type === "error" && "❌"}
                {t.type === "info" && "ℹ️"}
              </div>
              <div className="toast-content">
                <div className="toast-title">{t.title}</div>
                <div className="toast-message">{t.message}</div>
              </div>
              <button className="toast-close" onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}

interface HeaderProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}
