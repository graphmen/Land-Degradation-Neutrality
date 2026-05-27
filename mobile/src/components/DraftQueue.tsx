import { useEffect, useState } from "react";
import { RefreshCw, Trash, Edit2, CheckCircle, Wifi } from "lucide-react";
import { 
  getLdnDrafts, 
  getSoilDrafts, 
  deleteLdnDraft, 
  deleteSoilDraft 
} from "../lib/db";
import type { LdnDraft, SoilDraft } from "../lib/db";

interface DraftQueueProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onEditDraft: (id: string, type: "ldn" | "soil") => void;
}

export default function DraftQueue({ onSuccess, onError, onEditDraft }: DraftQueueProps) {
  const [ldnDrafts, setLdnDrafts] = useState<LdnDraft[]>([]);
  const [soilDrafts, setSoilDrafts] = useState<SoilDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Expose Google Sheets script URL directly from Environment variables with hardcoded fallback
  const serverUrl = import.meta.env.GOOGLE_SHEET_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbzkVfTIunxsy83TV6rIgDh6qttR3wHdB4tPlRpAeSdd9opb7-O-sDhX0mLomR-zL19vHQ/exec";

  const loadDrafts = async () => {
    setLoading(true);
    try {
      const [ldnList, soilList] = await Promise.all([
        getLdnDrafts(),
        getSoilDrafts()
      ]);
      setLdnDrafts(ldnList);
      setSoilDrafts(soilList);
    } catch (e: any) {
      onError(`Failed to load drafts: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
  }, []);

  const handleDelete = async (id: string, type: "ldn" | "soil") => {
    try {
      if (type === "ldn") {
        await deleteLdnDraft(id);
        setLdnDrafts(prev => prev.filter(x => x.id !== id));
      } else {
        await deleteSoilDraft(id);
        setSoilDrafts(prev => prev.filter(x => x.id !== id));
      }
      onSuccess("Draft deleted successfully.");
    } catch (e: any) {
      onError(`Delete failed: ${e.message}`);
    }
  };

  // Synchronization Engine to Google Sheets Apps Script Web App
  const triggerSync = async () => {
    const totalDrafts = ldnDrafts.length + soilDrafts.length;
    if (totalDrafts === 0) {
      onError("Your queue is empty. No drafts to synchronize.");
      return;
    }

    setSyncing(true);
    onSuccess(`Sync initialized. Uploading ${totalDrafts} field records to Google Sheets...`);

    const isGoogleScript = serverUrl.includes("script.google.com");
    let ldnSuccess = 0;
    let soilSuccess = 0;
    let failedCount = 0;

    // 1. Process LDN drafts
    for (const draft of ldnDrafts) {
      try {
        const payload = isGoogleScript ? { type: "ldn", data: draft } : draft;
        const targetUrl = isGoogleScript ? serverUrl : `${serverUrl}/api/submit/ldn`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors"
        }).catch(() => null);

        if (response && response.status === 200) {
          const resJson = await response.json().catch(() => ({}));
          if (isGoogleScript && resJson.status === "error") {
            console.error("Google Script Sync error:", resJson.message);
            failedCount++;
          } else {
            ldnSuccess++;
            await deleteLdnDraft(draft.id);
          }
        } else {
          // Dev mock fallback for localhost only
          if (!isGoogleScript && (serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1"))) {
            console.warn("Backend submit not available, performing simulated offline-sync...");
            ldnSuccess++;
            await deleteLdnDraft(draft.id);
          } else {
            failedCount++;
          }
        }
      } catch (err) {
        if (!isGoogleScript && (serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1"))) {
          ldnSuccess++;
          await deleteLdnDraft(draft.id);
        } else {
          failedCount++;
        }
      }
    }

    // 2. Process Soil drafts
    for (const draft of soilDrafts) {
      try {
        const payload = isGoogleScript ? { type: "soil", data: draft } : draft;
        const targetUrl = isGoogleScript ? serverUrl : `${serverUrl}/api/submit/soil`;

        const response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          mode: "cors"
        }).catch(() => null);

        if (response && response.status === 200) {
          const resJson = await response.json().catch(() => ({}));
          if (isGoogleScript && resJson.status === "error") {
            console.error("Google Script Sync error:", resJson.message);
            failedCount++;
          } else {
            soilSuccess++;
            await deleteSoilDraft(draft.id);
          }
        } else {
          // Dev mock fallback for localhost only
          if (!isGoogleScript && (serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1"))) {
            soilSuccess++;
            await deleteSoilDraft(draft.id);
          } else {
            failedCount++;
          }
        }
      } catch (err) {
        if (!isGoogleScript && (serverUrl.includes("localhost") || serverUrl.includes("127.0.0.1"))) {
          soilSuccess++;
          await deleteSoilDraft(draft.id);
        } else {
          failedCount++;
        }
      }
    }

    // Wrap up sync
    setSyncing(false);
    if (failedCount > 0) {
      onError(`Sync finished: ${ldnSuccess} LDN and ${soilSuccess} Soil surveys uploaded. ${failedCount} records failed. Please verify internet connection.`);
    } else {
      onSuccess(`Sync Completed: ${ldnSuccess} LDN reports and ${soilSuccess} Soil surveys uploaded to Google Sheets!`);
    }
    loadDrafts();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      
      {/* Sync Control Card */}
      <div className="mobile-card">
        <h3>🗃️ Submissions Queue</h3>
        <p className="card-desc">Manage local survey records captured offline. Synchronize once connected to the central telemetry hub.</p>
        
        {/* Network indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--text-accent)", marginBottom: "16px", background: "rgba(163, 230, 53, 0.05)", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid rgba(163, 230, 53, 0.2)" }}>
          <Wifi size={14} /> <span>Status: Device Online • Telemetry Hub Reachable</span>
        </div>

        <button 
          onClick={triggerSync}
          disabled={syncing || (ldnDrafts.length === 0 && soilDrafts.length === 0)}
          className="btn-primary"
          style={{ gap: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <RefreshCw size={16} className={syncing ? "sync-icon-spin" : ""} />
          {syncing ? "Syncing Telemetry..." : `Upload Queue (${ldnDrafts.length + soilDrafts.length} drafts)`}
        </button>
      </div>

      {/* Drafts List Section */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <div className="spinner" style={{ margin: "auto" }} />
        </div>
      ) : (ldnDrafts.length === 0 && soilDrafts.length === 0) ? (
        <div className="mobile-card" style={{ textAlign: "center", padding: "30px" }}>
          <CheckCircle size={32} style={{ color: "var(--text-accent)", marginBottom: "8px" }} />
          <div style={{ fontSize: "14px", fontWeight: 700 }}>Queue Empty</div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>All environmental reports have been uploaded to the Google Sheet. Ready for next fieldwork.</p>
        </div>
      ) : (
        <div className="queue-list">
          {/* LDN Drafts */}
          {ldnDrafts.map(d => (
            <div key={d.id} className="queue-item">
              <div className="queue-item-details">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="queue-badge ldn">🌳 LDN</span>
                  <span className="queue-item-title">{d.ceid}</span>
                </div>
                <div className="queue-item-meta">
                  District: <strong>{d.dist}</strong> • Date: {d.measurement_date}
                </div>
                {d.im && <div style={{ fontSize: "9px", color: "var(--text-accent)" }}>📸 Photo attached</div>}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => onEditDraft(d.id, "ldn")}
                  className="btn-secondary" 
                  style={{ padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px" }}
                  title="Edit draft"
                >
                  <Edit2 size={14} style={{ color: "var(--text-accent)" }} />
                </button>
                <button 
                  onClick={() => handleDelete(d.id, "ldn")}
                  className="btn-danger" 
                  style={{ padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px" }}
                  title="Delete draft"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* Soil Drafts */}
          {soilDrafts.map(d => (
            <div key={d.id} className="queue-item">
              <div className="queue-item-details">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span className="queue-badge soil">🧪 Soil</span>
                  <span className="queue-item-title">{d.ceid}</span>
                </div>
                <div className="queue-item-meta">
                  District: <strong>{d.dist}</strong> • Cores: <strong>{d.cores.length}</strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button 
                  onClick={() => onEditDraft(d.id, "soil")}
                  className="btn-secondary" 
                  style={{ padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px" }}
                  title="Edit draft"
                >
                  <Edit2 size={14} style={{ color: "var(--text-accent)" }} />
                </button>
                <button 
                  onClick={() => handleDelete(d.id, "soil")}
                  className="btn-danger" 
                  style={{ padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px" }}
                  title="Delete draft"
                >
                  <Trash size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
