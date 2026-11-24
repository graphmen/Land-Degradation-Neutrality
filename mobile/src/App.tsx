import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Compass,
  FlaskConical,
  Home,
  Save,
  Sprout,
  Trees,
  UploadCloud,
  UserCheck,
  Wifi,
  WifiOff,
  AlertCircle,
  X,
} from "lucide-react";
import LdnForm from "./components/LdnForm";
import SoilForm from "./components/SoilForm";
import DrylandsForm from "./components/DrylandsForm";
import DraftQueue from "./components/DraftQueue";
import { getDrylandsDrafts, getLdnDrafts, getSoilDrafts } from "./lib/db";
import {
  EMPTY_PROFILE,
  ZIMBABWE_PROVINCE_DISTRICTS,
  loadEnumeratorProfile,
  saveEnumeratorProfile,
  type EnumeratorProfile,
} from "./lib/enumerator-profile";

type ActiveTab = "home" | "ldn" | "soil" | "drylands" | "queue" | "validator" | "profile";

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [toast, setToast] = useState<ToastState>(null);

  const [pendingCounts, setPendingCounts] = useState({ ldn: 0, soil: 0, drylands: 0 });
  const [editingDraft, setEditingDraft] = useState<{
    id: string;
    type: "ldn" | "soil" | "drylands";
  } | null>(null);

  const [profile, setProfile] = useState<EnumeratorProfile>(EMPTY_PROFILE);
  const [profileSaved, setProfileSaved] = useState(false);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    window.setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const refreshQueueCounts = async () => {
    try {
      const [ldn, soil, dry] = await Promise.all([
        getLdnDrafts(),
        getSoilDrafts(),
        getDrylandsDrafts(),
      ]);
      setPendingCounts({
        ldn: ldn.filter((d) => !d.synced).length,
        soil: soil.filter((d) => !d.synced).length,
        drylands: dry.filter((d) => !d.synced).length,
      });
    } catch {
      // ignore initial IndexedDB errors
    }
  };

  useEffect(() => {
    loadEnumeratorProfile().then(setProfile);
    refreshQueueCounts();

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    refreshQueueCounts();
  }, [activeTab]);

  const totalPending = pendingCounts.ldn + pendingCounts.soil + pendingCounts.drylands;

  const handleEditDraft = (id: string, type: "ldn" | "soil" | "drylands") => {
    setEditingDraft({ id, type });
    setActiveTab(type);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEnumeratorProfile(profile);
    setProfileSaved(true);
    showToast("success", "Enumerator profile saved. New forms will auto-fill automatically.");
    window.setTimeout(() => setProfileSaved(false), 2500);
  };

  return (
    <div className="mobile-app-shell">
      {/* EMA Government Mobile Header */}
      <header
        className="mobile-header"
        style={{
          background: "#043016",
          borderBottom: "2px solid #c9a227",
        }}
      >
        <div
          className="mobile-logo-group"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveTab("home")}
        >
          <img src="/ema-logo.png" alt="EMA Zimbabwe" className="mobile-logo-img" />
          <div>
            <div className="mobile-header-title">EMA Zimbabwe LDN</div>
            <div className="mobile-header-subtitle" style={{ color: "#fde68a" }}>
              Field Data Collection · SDG 15.3.1
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "4px 9px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              background: online ? "rgba(74, 222, 128, 0.16)" : "rgba(245, 158, 11, 0.2)",
              color: online ? "#86efac" : "#fde68a",
              border: `1px solid ${online ? "rgba(74, 222, 128, 0.4)" : "rgba(245, 158, 11, 0.5)"}`,
            }}
          >
            {online ? <Wifi size={12} /> : <WifiOff size={12} />}
            {online ? "Online" : "Offline"}
          </span>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="Enumerator Profile"
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              borderRadius: 8,
              width: 34,
              height: 34,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <UserCheck size={16} />
          </button>
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 68,
            left: 14,
            right: 14,
            zIndex: 300,
            padding: "10px 14px",
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            background: toast.type === "success" ? "#0f5132" : "#991b1b",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <main
        className="mobile-content"
        style={
          activeTab === "validator"
            ? { padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }
            : undefined
        }
      >
        {/* FIELD HOME HUB */}
        {activeTab === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 680, margin: "0 auto" }}>
            {/* Enumerator Identity Strip */}
            <div
              className="mobile-card"
              style={{
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                border: "1px solid rgba(201, 162, 39, 0.35)",
              }}
            >
              <div>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: "#fde68a", fontWeight: 700 }}>
                  Active Field Officer
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
                  {profile.enumeratorName || "Profile Not Configured"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {profile.district
                    ? `${profile.district}${profile.province ? `, ${profile.province}` : ""}${
                        profile.team ? ` · Team ${profile.team}` : ""
                      }`
                    : "Tap Profile to set default province, district & team"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                style={{
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.22)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#ffffff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {profile.enumeratorName ? "Edit Profile" : "Set Profile"}
              </button>
            </div>

            {/* Offline Queue Summary Strip */}
            <div
              className="mobile-card"
              onClick={() => setActiveTab("queue")}
              style={{
                padding: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                borderLeft: `4px solid ${totalPending > 0 ? "#f59e0b" : "#4ade80"}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <UploadCloud size={22} color={totalPending > 0 ? "#fde68a" : "#86efac"} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {totalPending > 0
                      ? `${totalPending} Submission${totalPending === 1 ? "" : "s"} Waiting to Sync`
                      : "All Field Submissions Synced"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    LDN: {pendingCounts.ldn} · Soil: {pendingCounts.soil} · Drylands:{" "}
                    {pendingCounts.drylands}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fde68a" }}>Open Queue →</span>
            </div>

            {/* Field Data Capture Modules */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginTop: 4 }}>
              Field Data Capture Forms
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                type="button"
                className="mobile-card"
                onClick={() => {
                  setEditingDraft(null);
                  setActiveTab("ldn");
                }}
                style={{
                  textAlign: "left",
                  padding: 16,
                  cursor: "pointer",
                  border: "1px solid rgba(76, 175, 80, 0.35)",
                  color: "#ffffff",
                }}
              >
                <Trees size={24} color="#86efac" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>LDN Validation</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Land cover, degradation severity, CEID & field photo
                </div>
              </button>

              <button
                type="button"
                className="mobile-card"
                onClick={() => {
                  setEditingDraft(null);
                  setActiveTab("soil");
                }}
                style={{
                  textAlign: "left",
                  padding: 16,
                  cursor: "pointer",
                  border: "1px solid rgba(56, 189, 248, 0.35)",
                  color: "#ffffff",
                }}
              >
                <FlaskConical size={24} color="#7dd3fc" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>Soil Core Survey</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  0–30 cm horizon depth, texture, moisture & Munsell color
                </div>
              </button>

              <button
                type="button"
                className="mobile-card"
                onClick={() => {
                  setEditingDraft(null);
                  setActiveTab("drylands");
                }}
                style={{
                  textAlign: "left",
                  padding: 16,
                  cursor: "pointer",
                  border: "1px solid rgba(251, 191, 36, 0.35)",
                  color: "#ffffff",
                }}
              >
                <Sprout size={24} color="#fde68a" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>Drylands (ILUP)</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Erosion, vulnerability, livelihoods & SLM interventions
                </div>
              </button>

              <button
                type="button"
                className="mobile-card"
                onClick={() => setActiveTab("validator")}
                style={{
                  textAlign: "left",
                  padding: 16,
                  cursor: "pointer",
                  border: "1px solid rgba(167, 139, 250, 0.35)",
                  color: "#ffffff",
                }}
              >
                <Compass size={24} color="#c4b5fd" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>CEID Map Navigator</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Locate national Collect Earth validation plots
                </div>
              </button>
            </div>
          </div>
        )}

        {/* LDN FORM */}
        {activeTab === "ldn" && (
          <LdnForm
            onSuccess={(m) => {
              showToast("success", m);
              refreshQueueCounts();
            }}
            onError={(m) => showToast("error", m)}
            onNavigateToQueue={() => {
              setEditingDraft(null);
              setActiveTab("queue");
            }}
            editingDraftId={editingDraft?.type === "ldn" ? editingDraft.id : null}
            onClearEdit={() => setEditingDraft(null)}
          />
        )}

        {/* SOIL FORM */}
        {activeTab === "soil" && (
          <SoilForm
            onSuccess={(m) => {
              showToast("success", m);
              refreshQueueCounts();
            }}
            onError={(m) => showToast("error", m)}
            onNavigateToQueue={() => {
              setEditingDraft(null);
              setActiveTab("queue");
            }}
            editingDraftId={editingDraft?.type === "soil" ? editingDraft.id : null}
            onClearEdit={() => setEditingDraft(null)}
          />
        )}

        {/* DRYLANDS FORM */}
        {activeTab === "drylands" && (
          <DrylandsForm
            onSuccess={(m) => {
              showToast("success", m);
              refreshQueueCounts();
            }}
            onError={(m) => showToast("error", m)}
            onNavigateToQueue={() => {
              setEditingDraft(null);
              setActiveTab("queue");
            }}
            editingDraftId={editingDraft?.type === "drylands" ? editingDraft.id : null}
            onClearEdit={() => setEditingDraft(null)}
          />
        )}

        {/* DRAFT QUEUE */}
        {activeTab === "queue" && (
          <DraftQueue
            onSuccess={(m) => {
              showToast("success", m);
              refreshQueueCounts();
            }}
            onError={(m) => showToast("error", m)}
            onEditDraft={handleEditDraft}
          />
        )}

        {/* CEID VALIDATOR MAP */}
        {activeTab === "validator" && (
          <iframe
            src="/validator/index.html"
            style={{ width: "100%", flex: 1, border: "none", background: "#04140b" }}
            title="EMA CEID Validator"
          />
        )}

        {/* ENUMERATOR PROFILE & SETTINGS */}
        {activeTab === "profile" && (
          <form
            onSubmit={handleSaveProfile}
            className="mobile-card"
            style={{ maxWidth: 560, margin: "0 auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                <UserCheck size={18} color="#fde68a" /> Enumerator Profile & Settings
              </h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                Saved on-device and automatically pre-filled into LDN, Soil, and Drylands forms.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Officer / Enumerator Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. T. Moyo"
                value={profile.enumeratorName}
                onChange={(e) => setProfile({ ...profile, enumeratorName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Field Team ID</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. EMA-MAN-02"
                value={profile.team}
                onChange={(e) => setProfile({ ...profile, team: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Province</label>
              <select
                className="form-input"
                value={profile.province}
                onChange={(e) =>
                  setProfile({ ...profile, province: e.target.value, district: "" })
                }
              >
                <option value="">Select province…</option>
                {Object.keys(ZIMBABWE_PROVINCE_DISTRICTS).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default District</label>
              <select
                className="form-input"
                value={profile.district}
                disabled={!profile.province}
                onChange={(e) => setProfile({ ...profile, district: e.target.value })}
              >
                <option value="">Select district…</option>
                {(ZIMBABWE_PROVINCE_DISTRICTS[profile.province] ?? []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Ward (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ward 8"
                value={profile.ward}
                onChange={(e) => setProfile({ ...profile, ward: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">EMA National Platform API Server</label>
              <input
                type="url"
                className="form-input"
                value={profile.apiBaseUrl}
                onChange={(e) => setProfile({ ...profile, apiBaseUrl: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 16px",
              }}
            >
              <Save size={16} />
              {profileSaved ? "Profile Saved" : "Save Profile"}
            </button>
          </form>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav
        style={{
          height: 62,
          background: "#042511",
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        {(
          [
            { id: "home", label: "Home", icon: Home },
            { id: "ldn", label: "LDN", icon: Trees },
            { id: "soil", label: "Soil", icon: FlaskConical },
            { id: "drylands", label: "Drylands", icon: Sprout },
            { id: "queue", label: "Queue", icon: ClipboardList, badge: totalPending },
          ] as Array<{ id: ActiveTab; label: string; icon: typeof Home; badge?: number }>
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              style={{
                background: "none",
                border: "none",
                color: active ? "#fde68a" : "rgba(255,255,255,0.65)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                cursor: "pointer",
                position: "relative",
                borderTop: active ? "2px solid #c9a227" : "2px solid transparent",
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: "22%",
                    background: "#f59e0b",
                    color: "#042511",
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 5px",
                    borderRadius: 999,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
