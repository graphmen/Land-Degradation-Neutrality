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
    addToast("info", "Sync Initialized", "Connecting to servers to retrieve the latest environmental telemetry...");
    
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync data");
      }
      addToast("success", "Sync Successful", "Telemetry caches updated. Re-indexing geospatial records...");
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: any) {
      addToast("error", "Sync Execution Failed", err.message || "An unexpected network timeout occurred.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="global-header">
      {/* Brand Zone (aligns with sidebar) */}
      <div className={`header-brand-zone ${isCollapsed ? "collapsed" : ""}`}>
        <div className="header-logo-badge">
          <svg viewBox="0 0 40 40" className="header-emblem-svg" width="28" height="28">
            <polygon points="20,2 37,11 37,29 20,38 3,29 3,11" fill="none" stroke="#a2c49e" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M20,6 C26,13 26,27 20,34 C14,27 14,13 20,6 Z" fill="#064b22" opacity="0.4" />
            <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff" letterSpacing="0.5">EMA</text>
          </svg>
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
            {isSyncing ? "Syncing..." : "Sync data from Server"}
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
