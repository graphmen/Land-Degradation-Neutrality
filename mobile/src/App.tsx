import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
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
  UserCheck,
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

type ActiveTab =
  | "home"
  | ModuleId
  | "queue"
  | "profile";

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
    }, 4000);
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
      showToast("success", "All modular submissions are already synced.");
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
      showToast("success", `Synced ${ok} modular field submission(s) to EMA National Platform.`);
    } else {
      showToast("error", `Synced ${ok}, failed ${fail}. Check server URL in Profile.`);
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
    showToast("success", "Enumerator profile saved.");
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
              National Field Reporting Suite · UNCCD SO1–SO5
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

      {/* Toast */}
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

      {/* Main Scrollable Area */}
      <main className="mobile-content">
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

            {/* Offline Queue Strip */}
            <div
              className="mobile-card"
              onClick={() => setActiveTab("queue")}
              style={{
                padding: 13,
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
                      ? `${totalPending} Submission${totalPending === 1 ? "" : "s"} Pending Sync`
                      : "All Field Submissions Synced"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Offline-first IndexedDB · Syncs to EMA National Platform
                  </div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fde68a" }}>Queue →</span>
            </div>

            {/* Modular Capture Grid (Driven by MODULE_REGISTRY) */}
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginTop: 2 }}>
              LDN Reporting Modules (SO1–SO5)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 11 }}>
              {MODULE_REGISTRY.map((mod) => {
                const Icon = MODULE_ICONS[mod.id];
                return (
                  <button
                    key={mod.id}
                    type="button"
                    className="mobile-card"
                    onClick={() => {
                      setEditingDraft(null);
                      setActiveTab(mod.id);
                    }}
                    style={{
                      textAlign: "left",
                      padding: 14,
                      cursor: "pointer",
                      border: `1px solid ${mod.accentColor}44`,
                      color: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Icon size={22} color={mod.accentColor} />
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.08)",
                          color: mod.accentColor,
                        }}
                      >
                        {mod.unccdTag}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                      {mod.title}
                      {mod.restricted && <Lock size={11} color="#fda4af" />}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.35 }}>
                      {mod.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MODULE 1: LDN LAND COVER & DEGRADATION */}
        {activeTab === "so1_land_cover" && (
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

        {/* MODULE 2: SOIL CORE & LAB SOC */}
        {activeTab === "so1_soil_soc" && (
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

        {/* MODULE 3: DEGRADATION PRESSURES (WITH POLYGON WALK) */}
        {activeTab === "pressures" && (
          <PressureForm
            onSuccess={(m) => showToast("success", m)}
            onError={(m) => showToast("error", m)}
            onSaved={() => {
              refreshQueueCounts();
              setActiveTab("queue");
            }}
          />
        )}

        {/* MODULE 4: RESTORATION & BRIGHT SPOTS (WITH POLYGON WALK) */}
        {activeTab === "so4_interventions" && (
          <InterventionForm
            onSuccess={(m) => showToast("success", m)}
            onError={(m) => showToast("error", m)}
            onSaved={() => {
              refreshQueueCounts();
              setActiveTab("queue");
            }}
          />
        )}

        {/* MODULE 5: DRYLANDS & ILUP */}
        {activeTab === "drylands_ilup" && (
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

        {/* UNIFIED OFFLINE QUEUE */}
        {activeTab === "queue" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 680, margin: "0 auto" }}>
            {/* Modular Submissions Queue (Pressures & Restoration SO4) */}
            <div className="mobile-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    Modular Field Queue ({modularSubs.length})
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    Pressures & Restoration (SO4) · Point + Walked Polygon
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={syncingModular || modularPending === 0}
                  onClick={handleSyncModular}
                  style={{ padding: "7px 12px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={13} className={syncingModular ? "animate-spin" : ""} />
                  {syncingModular ? "Syncing…" : `Sync (${modularPending})`}
                </button>
              </div>

              {modularSubs.length === 0 ? (
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  No Pressure or Restoration submissions saved yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {modularSubs.map((s) => (
                    <div
                      key={s.submission_id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 700 }}>
                          {s.module_id === "pressures" ? "Degradation Pressure" : "Restoration (SO4)"} ·{" "}
                          {s.location.site_name || s.location.district}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                          {s.location.district}
                          {s.geometry.polygon?.area_ha
                            ? ` · ${s.geometry.polygon.area_ha} ha polygon`
                            : " · GPS point"}
                          {" · "}
                          <strong
                            style={{
                              color:
                                s.sync_state === "synced"
                                  ? "#86efac"
                                  : s.sync_state === "error"
                                    ? "#fda4af"
                                    : "#fde68a",
                            }}
                          >
                            {s.sync_state.toUpperCase()}
                          </strong>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteModularSubmission(s.submission_id);
                          refreshQueueCounts();
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#fda4af",
                          cursor: "pointer",
                          padding: 6,
                        }}
                        title="Delete submission"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Existing LDN / Soil / Drylands Draft Queue */}
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

        {/* ENUMERATOR PROFILE */}
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
                Saved on-device and automatically pre-filled across all LDN reporting modules.
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
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px 16px" }}
            >
              <Save size={16} />
              {profileSaved ? "Profile Saved" : "Save Profile"}
            </button>
          </form>
        )}
      </main>

      {/* Bottom 5-Tab Navigation Bar */}
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
            { id: "home", label: "Modules", icon: Home },
            { id: "so1_land_cover", label: "LDN", icon: Trees },
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
                    right: "20%",
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
