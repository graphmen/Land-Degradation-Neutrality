import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FlaskConical,
  Home,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Sprout,
  Trash2,
  Trees,
  UploadCloud,
  User,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import LdnForm from "./components/LdnForm";
import SoilForm from "./components/SoilForm";
import DrylandsForm from "./components/DrylandsForm";
import PressureForm from "./components/PressureForm";
import InterventionForm from "./components/InterventionForm";
import DraftQueue from "./components/DraftQueue";
import { getDrylandsDrafts, getLdnDrafts, getSoilDrafts } from "./lib/db";
import {
  deleteModularSubmission,
  listModularSubmissions,
  updateModularSyncState,
} from "./lib/modular-db";
import {
  MODULE_REGISTRY,
  type ModuleId,
  type UniversalSubmission,
} from "./lib/submission-envelope";
import {
  EMPTY_PROFILE,
  ZIMBABWE_PROVINCE_DISTRICTS,
  loadEnumeratorProfile,
  saveEnumeratorProfile,
  type EnumeratorProfile,
} from "./lib/enumerator-profile";

type ActiveTab = "home" | ModuleId | "queue" | "profile";

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const MODULE_ICONS: Record<ModuleId, typeof Trees> = {
  so1_land_cover: Trees,
  so1_soil_soc: FlaskConical,
  pressures: AlertTriangle,
  so4_interventions: ShieldCheck,
  drylands_ilup: Sprout,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [toast, setToast] = useState<ToastState>(null);

  const [legacyPending, setLegacyPending] = useState(0);
  const [modularSubs, setModularSubs] = useState<UniversalSubmission[]>([]);
  const [syncingModular, setSyncingModular] = useState(false);

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
    }, 3800);
  };

  const refreshQueueCounts = async () => {
    try {
      const [ldn, soil, dry, mod] = await Promise.all([
        getLdnDrafts(),
        getSoilDrafts(),
        getDrylandsDrafts(),
        listModularSubmissions(),
      ]);
      setLegacyPending(
        ldn.filter((d) => !d.synced).length +
          soil.filter((d) => !d.synced).length +
          dry.filter((d) => !d.synced).length
      );
      setModularSubs(mod);
    } catch {
      // ignore IndexedDB startup errors
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

  const modularPending = modularSubs.filter((s) => s.sync_state !== "synced").length;
  const totalPending = legacyPending + modularPending;

  const handleSyncModular = async () => {
    const pending = modularSubs.filter((s) => s.sync_state !== "synced");
    if (pending.length === 0) {
      showToast("success", "All field submissions are already synced.");
      return;
    }
    setSyncingModular(true);
    const baseUrl = (profile.apiBaseUrl || "http://localhost:3001").replace(/\/$/, "");
    let ok = 0;
    let fail = 0;

    for (const sub of pending) {
      try {
        const res = await fetch(`${baseUrl}/api/submit/modular`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sub),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await updateModularSyncState(sub.submission_id, "synced", null);
        ok++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Network error";
        await updateModularSyncState(sub.submission_id, "error", msg);
        fail++;
      }
    }

    await refreshQueueCounts();
    setSyncingModular(false);
    if (fail === 0) {
      showToast("success", `Synced ${ok} submission(s) to EMA National Platform.`);
    } else {
      showToast("error", `Synced ${ok}, failed ${fail}. Check server URL in Settings.`);
    }
  };

  const handleEditDraft = (id: string, type: "ldn" | "soil" | "drylands") => {
    setEditingDraft({ id, type });
    setActiveTab(
      type === "ldn"
        ? "so1_land_cover"
        : type === "soil"
          ? "so1_soil_soc"
          : "drylands_ilup"
    );
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveEnumeratorProfile(profile);
    setProfileSaved(true);
    showToast("success", "Officer profile saved.");
    window.setTimeout(() => setProfileSaved(false), 2500);
  };

  return (
    <div className="mobile-app-shell">
      {/* Official EMA Top App Bar */}
      <header className="mobile-header">
        <div
          className="mobile-logo-group"
          style={{ cursor: "pointer" }}
          onClick={() => setActiveTab("home")}
        >
          <img src="/ema-logo.png" alt="EMA Zimbabwe" className="mobile-logo-img" />
          <div>
            <div className="mobile-header-title">EMA LDN Field</div>
            <div className="mobile-header-subtitle">Republic of Zimbabwe · UNCCD</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: online ? "#a7f3d0" : "#fde68a",
            }}
          >
            {online ? <Wifi size={13} /> : <WifiOff size={13} />}
            {online ? "Online" : "Offline"}
          </span>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            title="Officer Profile & Settings"
            style={{
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.22)",
              color: "#ffffff",
              borderRadius: 6,
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <User size={15} />
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 64,
            left: 14,
            right: 14,
            zIndex: 300,
            padding: "10px 14px",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
            background: toast.type === "success" ? "#0b4f2a" : "#b42318",
            color: "#ffffff",
            boxShadow: "0 4px 14px rgba(17, 29, 22, 0.22)",
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

      {/* Main Scrollable Area */}
      <main className="mobile-content">
        {/* HOME — CLEAN NATIVE FIELD MODULE LIST */}
        {activeTab === "home" && (
          <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Compact Status Bar: Officer + Sync Queue */}
            <div className="field-list">
              <button
                type="button"
                className="field-list-row"
                onClick={() => setActiveTab("profile")}
              >
                <div className="field-list-icon">
                  <User size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {profile.enumeratorName || "Set Officer Profile"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    {profile.district
                      ? `${profile.district}${profile.province ? `, ${profile.province}` : ""}${
                          profile.team ? ` · ${profile.team}` : ""
                        }`
                      : "Configure default province, district & team"}
                  </div>
                </div>
                <ChevronRight size={16} color="#7c8f83" />
              </button>

              <button
                type="button"
                className="field-list-row"
                onClick={() => setActiveTab("queue")}
              >
                <div
                  className="field-list-icon"
                  style={{
                    background: totalPending > 0 ? "#fef3c7" : "#e6f4ea",
                    color: totalPending > 0 ? "#b45309" : "#0b4f2a",
                  }}
                >
                  <UploadCloud size={17} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {totalPending > 0
                      ? `${totalPending} Pending Sync`
                      : "All Submissions Synced"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                    Offline queue · Tap to review or upload
                  </div>
                </div>
                <ChevronRight size={16} color="#7c8f83" />
              </button>
            </div>

            {/* Field Data Collection Modules */}
            <div>
              <div className="field-section-label">Data Collection Forms</div>
              <div className="field-list">
                {MODULE_REGISTRY.map((mod) => {
                  const Icon = MODULE_ICONS[mod.id];
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      className="field-list-row"
                      onClick={() => {
                        setEditingDraft(null);
                        setActiveTab(mod.id);
                      }}
                    >
                      <div className="field-list-icon">
                        <Icon size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>{mod.title}</span>
                          {mod.restricted && <Lock size={12} color="#b42318" />}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            marginTop: 2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {mod.unccdTag} · {mod.description}
                        </div>
                      </div>
                      <ChevronRight size={16} color="#7c8f83" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 1: LDN LAND COVER & DEGRADATION */}
        {activeTab === "so1_land_cover" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
          </div>
        )}

        {/* MODULE 2: SOIL CORE & LAB SOC */}
        {activeTab === "so1_soil_soc" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
          </div>
        )}

        {/* MODULE 3: DEGRADATION PRESSURES */}
        {activeTab === "pressures" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <PressureForm
              onSuccess={(m) => showToast("success", m)}
              onError={(m) => showToast("error", m)}
              onSaved={() => {
                refreshQueueCounts();
                setActiveTab("queue");
              }}
            />
          </div>
        )}

        {/* MODULE 4: RESTORATION & BRIGHT SPOTS */}
        {activeTab === "so4_interventions" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <InterventionForm
              onSuccess={(m) => showToast("success", m)}
              onError={(m) => showToast("error", m)}
              onSaved={() => {
                refreshQueueCounts();
                setActiveTab("queue");
              }}
            />
          </div>
        )}

        {/* MODULE 5: DRYLANDS & ILUP */}
        {activeTab === "drylands_ilup" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
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
          </div>
        )}

        {/* UNIFIED OFFLINE QUEUE */}
        {activeTab === "queue" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 640, margin: "0 auto" }}>
            <div className="mobile-card" style={{ padding: 14, marginBottom: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    Pressures &amp; Restoration Queue ({modularSubs.length})
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Point GPS and walked polygon submissions
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={syncingModular || modularPending === 0}
                  onClick={handleSyncModular}
                  style={{ width: "auto", padding: "8px 12px", fontSize: 12 }}
                >
                  <RefreshCw size={13} className={syncingModular ? "animate-spin" : ""} />
                  {syncingModular ? "Syncing…" : `Sync (${modularPending})`}
                </button>
              </div>

              {modularSubs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 0" }}>
                  No Pressure or Restoration submissions saved yet.
                </div>
              ) : (
                <div className="queue-list">
                  {modularSubs.map((s) => (
                    <div key={s.submission_id} className="queue-item">
                      <div className="queue-item-details">
                        <div className="queue-item-title">
                          {s.module_id === "pressures" ? "Degradation Pressure" : "Restoration (SO4)"} ·{" "}
                          {s.location.site_name || s.location.district}
                        </div>
                        <div className="queue-item-meta">
                          {s.location.district}
                          {s.geometry.polygon?.area_ha
                            ? ` · ${s.geometry.polygon.area_ha} ha polygon`
                            : " · GPS point"}
                          {" · "}
                          <strong
                            style={{
                              color:
                                s.sync_state === "synced"
                                  ? "#0b4f2a"
                                  : s.sync_state === "error"
                                    ? "#b42318"
                                    : "#b45309",
                            }}
                          >
                            {s.sync_state.toUpperCase()}
                          </strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={async () => {
                          await deleteModularSubmission(s.submission_id);
                          refreshQueueCounts();
                        }}
                        title="Delete submission"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DraftQueue
              onSuccess={(m) => {
                showToast("success", m);
                refreshQueueCounts();
              }}
              onError={(m) => showToast("error", m)}
              onEditDraft={handleEditDraft}
            />
          </div>
        )}

        {/* OFFICER PROFILE & SETTINGS */}
        {activeTab === "profile" && (
          <form
            onSubmit={handleSaveProfile}
            className="mobile-card"
            style={{ maxWidth: 560, margin: "0 auto", padding: 16 }}
          >
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Officer Profile &amp; Server</h2>
            <p className="card-desc">
              Stored on this device and pre-filled automatically on new forms.
            </p>

            <div className="form-group">
              <label className="form-label">Officer Full Name</label>
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
                className="form-input form-select"
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
                className="form-input form-select"
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
              <label className="form-label">Default Ward (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ward 8"
                value={profile.ward}
                onChange={(e) => setProfile({ ...profile, ward: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">EMA Platform API URL</label>
              <input
                type="url"
                className="form-input"
                value={profile.apiBaseUrl}
                onChange={(e) => setProfile({ ...profile, apiBaseUrl: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary">
              <Save size={15} />
              {profileSaved ? "Profile Saved" : "Save Profile"}
            </button>
          </form>
        )}
      </main>

      {/* Native Light Bottom 5-Tab Navigation Bar */}
      <nav className="mobile-nav-bar">
        {(
          [
            { id: "home", label: "Forms", icon: Home },
            { id: "so1_land_cover", label: "Land Cover", icon: Trees },
            { id: "pressures", label: "Pressures", icon: AlertTriangle },
            { id: "so4_interventions", label: "Restore", icon: ShieldCheck },
            { id: "queue", label: "Queue", icon: ClipboardList, badge: totalPending },
          ] as Array<{ id: ActiveTab; label: string; icon: typeof Home; badge?: number }>
        ).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item ${active ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 5,
                    right: "18%",
                    background: "#b45309",
                    color: "#ffffff",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 999,
                    minWidth: 15,
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
