import { useState, useEffect } from "react";
import { Trees, FlaskConical, Database, X, AlertCircle, CheckCircle } from "lucide-react";
import LdnForm from "./components/LdnForm";
import SoilForm from "./components/SoilForm";
import DraftQueue from "./components/DraftQueue";
import { getLdnDrafts, getSoilDrafts } from "./lib/db";

interface Toast {
  id: string;
  type: "success" | "error";
  message: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"ldn" | "soil" | "queue">("ldn");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  // Load and update the draft queue count
  const updateQueueCount = async () => {
    try {
      const [ldn, soil] = await Promise.all([getLdnDrafts(), getSoilDrafts()]);
      setQueueCount(ldn.length + soil.length);
    } catch (e) {
      console.error("Failed to load queue count", e);
    }
  };

  useEffect(() => {
    updateQueueCount();
    // Run periodically to keep tab badge updated
    const interval = setInterval(updateQueueCount, 3000);
    return () => clearInterval(interval);
  }, []);

  const addToast = (message: string, type: "success" | "error" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="mobile-app-shell">
      {/* App Toasts Overlay */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast-item"
            style={{
              borderColor: t.type === "error" ? "rgba(244, 63, 94, 0.4)" : "rgba(76, 175, 80, 0.4)",
              background: t.type === "error" ? "rgba(20, 5, 8, 0.95)" : "rgba(5, 20, 11, 0.95)"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {t.type === "error" ? (
                <AlertCircle size={18} style={{ color: "var(--accent-rose)" }} />
              ) : (
                <CheckCircle size={18} style={{ color: "var(--text-accent)" }} />
              )}
              <div className="toast-content">
                <div className="toast-title" style={{ color: t.type === "error" ? "var(--accent-rose)" : "var(--text-accent)" }}>
                  {t.type === "error" ? "System Error" : "Success"}
                </div>
                <div className="toast-message">{t.message}</div>
              </div>
            </div>
            <button className="toast-close" onClick={() => removeToast(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Global Header */}
      <header className="mobile-header">
        <div className="mobile-logo-group">
          <img src="/ema-logo.png" className="mobile-logo-img" alt="EMA Zimbabwe Logo" onError={(e) => {
            // fallback if the image is missing
            (e.target as HTMLImageElement).src = "https://share.google/sYtPrUEqRwxhCM5lX";
          }} />
          <div>
            <h1 className="mobile-header-title">EMA Zimbabwe</h1>
            <span className="mobile-header-subtitle">LDN Telemetry Hub</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
          <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Offline Ready</span>
        </div>
      </header>

      {/* Content Area */}
      <main className="mobile-content">
        {activeTab === "ldn" && (
          <LdnForm
            onSuccess={(msg) => addToast(msg, "success")}
            onError={(msg) => addToast(msg, "error")}
            onNavigateToQueue={() => {
              setActiveTab("queue");
              updateQueueCount();
            }}
          />
        )}
        {activeTab === "soil" && (
          <SoilForm
            onSuccess={(msg) => addToast(msg, "success")}
            onError={(msg) => addToast(msg, "error")}
            onNavigateToQueue={() => {
              setActiveTab("queue");
              updateQueueCount();
            }}
          />
        )}
        {activeTab === "queue" && (
          <DraftQueue
            onSuccess={(msg) => {
              addToast(msg, "success");
              updateQueueCount();
            }}
            onError={(msg) => addToast(msg, "error")}
          />
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="mobile-nav-bar">
        <button
          className={`mobile-nav-item ${activeTab === "ldn" ? "active" : ""}`}
          onClick={() => setActiveTab("ldn")}
        >
          <Trees size={20} className="mobile-nav-icon" />
          <span>LDN Form</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === "soil" ? "active" : ""}`}
          onClick={() => setActiveTab("soil")}
        >
          <FlaskConical size={20} className="mobile-nav-icon" />
          <span>Soil Core</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === "queue" ? "active" : ""}`}
          onClick={() => setActiveTab("queue")}
          style={{ position: "relative" }}
        >
          <Database size={20} className="mobile-nav-icon" />
          <span>Queue</span>
          {queueCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "6px",
                right: "12px",
                background: "var(--accent-rose)",
                color: "#ffffff",
                fontSize: "9px",
                fontWeight: 700,
                borderRadius: "50%",
                width: "16px",
                height: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #04140b",
                boxShadow: "0 2px 4px rgba(0,0,0,0.5)"
              }}
            >
              {queueCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}
