import { useState, useEffect } from "react";
import { Trees, FlaskConical, Database, X, AlertCircle, CheckCircle, Compass } from "lucide-react";
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
  const [currentScreen, setCurrentScreen] = useState<"welcome" | "collect" | "navigate">("welcome");
  const [activeTab, setActiveTab] = useState<"ldn" | "soil" | "queue">("ldn");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [queueCount, setQueueCount] = useState(0);

  // States for active draft editing
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editingDraftType, setEditingDraftType] = useState<"ldn" | "soil" | null>(null);

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

  const handleEditDraft = (id: string, type: "ldn" | "soil") => {
    setEditingDraftId(id);
    setEditingDraftType(type);
    setActiveTab(type);
  };

  const handleClearEdit = () => {
    setEditingDraftId(null);
    setEditingDraftType(null);
  };

  // Render toast overlay
  const renderToasts = () => (
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
  );

  if (currentScreen === "welcome") {
    return (
      <div className="welcome-screen">
        {renderToasts()}

        <div className="welcome-container">
          <div className="welcome-header-logo">
            <img src="/ema-logo.png" className="welcome-logo-img" alt="EMA Zimbabwe Logo" onError={(e) => {
              (e.target as HTMLImageElement).src = "https://share.google/sYtPrUEqRwxhCM5lX";
            }} />
            <h1 className="welcome-title">EMA ZIMBABWE</h1>
            <p className="welcome-subtitle">LDN FIELD VALIDATION SYSTEM</p>
          </div>

          <div className="welcome-description">
            Choose a system below to perform field operations. All collected data is stored locally and will auto-sync when network is available.
          </div>

          <div className="welcome-options">
            <div className="welcome-card-option" onClick={() => setCurrentScreen("collect")}>
              <div className="option-glow"></div>
              <div className="option-icon-wrapper green-border">
                <Database className="option-icon green-text" size={32} />
              </div>
              <div className="option-content">
                <h3 className="option-title">EMA LDN Data Collector</h3>
                <p className="option-desc">Fill LDN telemetry reports, perform soil core checks, and manage offline data submission queues.</p>
              </div>
            </div>

            <div className="welcome-card-option" onClick={() => setCurrentScreen("navigate")}>
              <div className="option-glow blue-glow"></div>
              <div className="option-icon-wrapper blue-border">
                <Compass className="option-icon blue-text" size={32} />
              </div>
              <div className="option-content">
                <h3 className="option-title">LDN Validator</h3>
                <p className="option-desc">Navigate validation polygons, view GPS telemetry, download offline maps, and use Munsell analyzer.</p>
              </div>
            </div>
          </div>

          <div className="welcome-footer">
            <div className="welcome-status">
              <span className="status-dot animate-pulse"></span>
              <span>All Systems Operational & Offline-Ready</span>
            </div>
            <p className="welcome-credit">Developed for Environmental Management Agency (EMA) Zimbabwe</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === "navigate") {
    return (
      <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: "#04140b" }}>
        <iframe
          src="/validator/index.html"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            background: "#04140b"
          }}
          title="LDN Validator"
        />
        {/* Floating Back to Menu Button */}
        <button
          onClick={() => setCurrentScreen("welcome")}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            zIndex: 9999,
            background: "rgba(4, 20, 11, 0.95)",
            border: "2px solid #4caf50",
            borderRadius: "50px",
            color: "#ffffff",
            padding: "10px 18px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(0,0,0,0.6), 0 0 10px rgba(76,175,80,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backdropFilter: "blur(8px)",
            transition: "transform 0.2s"
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.95)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <span style={{ fontSize: "14px" }}>←</span> Main Menu
        </button>
      </div>
    );
  }

  return (
    <div className="mobile-app-shell">
      {renderToasts()}

      {/* Global Header */}
      <header className="mobile-header">
        <div className="mobile-logo-group">
          <img src="/ema-logo.png" className="mobile-logo-img" alt="EMA Zimbabwe Logo" onError={(e) => {
            (e.target as HTMLImageElement).src = "https://share.google/sYtPrUEqRwxhCM5lX";
          }} />
          <div>
            <h1 className="mobile-header-title">EMA Zimbabwe</h1>
            <span className="mobile-header-subtitle">LDN Telemetry Hub</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button 
            onClick={() => setCurrentScreen("welcome")}
            style={{
              background: "rgba(76, 175, 80, 0.15)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-accent)",
              padding: "6px 12px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            ← Menu
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
            <span style={{ fontSize: "9px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Offline Ready</span>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="mobile-content">
        {activeTab === "ldn" && (
          <LdnForm
            onSuccess={(msg) => addToast(msg, "success")}
            onError={(msg) => addToast(msg, "error")}
            editingDraftId={editingDraftType === "ldn" ? editingDraftId : null}
            onClearEdit={handleClearEdit}
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
            editingDraftId={editingDraftType === "soil" ? editingDraftId : null}
            onClearEdit={handleClearEdit}
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
            onEditDraft={handleEditDraft}
          />
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="mobile-nav-bar">
        <button
          className={`mobile-nav-item ${activeTab === "ldn" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("ldn");
            handleClearEdit();
          }}
        >
          <Trees size={20} className="mobile-nav-icon" />
          <span>LDN Form</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === "soil" ? "active" : ""}`}
          onClick={() => {
            setActiveTab("soil");
            handleClearEdit();
          }}
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
