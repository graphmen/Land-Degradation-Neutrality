"use client";

import React from "react";

export default function DownloadPage() {
  const handleDownload = (filename: string) => {
    // Standard trigger for downloading public static assets
    const link = document.createElement("a");
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="home-container" style={{ padding: "40px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "30px", width: "100%" }}>
      {/* Official Government & Global Initiatives Welcome Banner */}
      <div className="home-banner">
        <div className="home-banner-content">
          <div className="home-banner-tag">System Releases & Deployment</div>
          <h2 className="home-banner-title">Mobile App Downloads & System Ecosystem</h2>
          <p className="home-banner-desc">
            Access the latest compiled Android application packages (APK) for field officers. Review how the <strong>Web Portal</strong> and the <strong>Offline Mobile Collector</strong> sync to track Land Degradation Neutrality targets.
          </p>
        </div>
      </div>

      {/* Grid: Download Panel & Ecosystem Explanation */}
      <div className="home-grid" style={{ gridTemplateColumns: "1.1fr 1fr", gap: "24px" }}>
        
        {/* Left Side: APK Downloads Console */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="home-section-divider">
            <span className="home-section-title">Compiled APK Downloads</span>
            <div className="home-section-line" />
          </div>

          {/* Unified APK Card (Primary Recommendation) */}
          <div className="home-card" style={{ borderLeft: "4px solid var(--accent-gold)", cursor: "default", gap: "16px" }}>
            <div className="home-card-header">
              <span className="home-card-icon" style={{ fontSize: "28px" }}>📲</span>
              <div>
                <h3 className="home-card-title" style={{ fontSize: "16px" }}>EMA Zimbabwe LDN Unified App</h3>
                <span className="site-badge active-status" style={{ marginTop: "4px", display: "inline-block", fontSize: "9px" }}>
                  ⭐ Recommended Release
                </span>
              </div>
            </div>
            
            <p className="home-card-desc" style={{ fontSize: "12px", lineHeight: "1.5" }}>
              The unified field client combines <strong>both applications</strong>—the Leaflet-based <strong>LDN Validator</strong> and the <strong>EMA LDN Data Collector</strong>—into a single deployment. Includes offline-cached boundary datasets (Wards shapefile) for GPS-assisted field tracking.
            </p>

            <div className="detail-item-list" style={{ gap: "6px" }}>
              <div className="detail-item-row" style={{ padding: "8px 12px" }}>
                <span className="detail-item-label" style={{ fontSize: "11px" }}>
                  <span className="detail-item-icon">📦</span> Package Name
                </span>
                <span className="detail-item-value" style={{ fontSize: "11px" }}>EMA_Zimbabwe_LDN_Combined.apk</span>
              </div>
              <div className="detail-item-row" style={{ padding: "8px 12px" }}>
                <span className="detail-item-label" style={{ fontSize: "11px" }}>
                  <span className="detail-item-icon">⚖️</span> File Size
                </span>
                <span className="detail-item-value" style={{ fontSize: "11px", fontWeight: "700" }}>18.6 MB</span>
              </div>
              <div className="detail-item-row" style={{ padding: "8px 12px" }}>
                <span className="detail-item-label" style={{ fontSize: "11px" }}>
                  <span className="detail-item-icon">⚙️</span> Core Integration
                </span>
                <span className="detail-item-value" style={{ fontSize: "11px" }}>Validator Map + Soil Collector</span>
              </div>
            </div>

            <button 
              className="sync-btn"
              onClick={() => handleDownload("EMA_Zimbabwe_LDN_Combined.apk")}
              style={{ 
                width: "100%", 
                justifyContent: "center", 
                padding: "12px", 
                margin: 0,
                fontSize: "12.5px"
              }}
            >
              📥 Download Combined APK (v1.0.2)
            </button>
          </div>

          {/* Standalone Collector APK Card */}
          <div className="home-card" style={{ borderLeft: "4px solid var(--accent-green)", cursor: "default", gap: "16px" }}>
            <div className="home-card-header">
              <span className="home-card-icon" style={{ fontSize: "24px" }}>🧪</span>
              <div>
                <h3 className="home-card-title" style={{ fontSize: "14px" }}>EMA LDN Data Collector Only</h3>
                <span className="site-badge warning-status" style={{ marginTop: "4px", display: "inline-block", fontSize: "9px" }}>
                  Standalone Form Client
                </span>
              </div>
            </div>
            
            <p className="home-card-desc" style={{ fontSize: "12px", lineHeight: "1.5" }}>
              A lightweight release featuring <strong>only the data collection form interface</strong> (soil sampling coordinates, moisture tags, Munsell texture inputs). Recommended for survey operations that do not require offline reference map files.
            </p>

            <div className="detail-item-list" style={{ gap: "6px" }}>
              <div className="detail-item-row" style={{ padding: "8px 12px" }}>
                <span className="detail-item-label" style={{ fontSize: "11px" }}>
                  <span className="detail-item-icon">📦</span> Package Name
                </span>
                <span className="detail-item-value" style={{ fontSize: "11px" }}>EMA_Zimbabwe_LDN_Mobile.apk</span>
              </div>
              <div className="detail-item-row" style={{ padding: "8px 12px" }}>
                <span className="detail-item-label" style={{ fontSize: "11px" }}>
                  <span className="detail-item-icon">⚖️</span> File Size
                </span>
                <span className="detail-item-value" style={{ fontSize: "11px", fontWeight: "700" }}>8.4 MB</span>
              </div>
            </div>

            <button 
              className="sync-btn"
              onClick={() => handleDownload("EMA_Zimbabwe_LDN_Mobile.apk")}
              style={{ 
                width: "100%", 
                justifyContent: "center", 
                padding: "10px", 
                margin: 0,
                fontSize: "12px",
                backgroundColor: "var(--accent-green)",
                color: "#ffffff"
              }}
            >
              📥 Download Standalone Collector APK
            </button>
          </div>
        </div>

        {/* Right Side: System Ecosystem & Architectures */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="home-section-divider">
            <span className="home-section-title">Ecosystem Overview</span>
            <div className="home-section-line" />
          </div>

          <div className="home-guide-block" style={{ padding: "24px", gap: "20px" }}>
            <h4 className="home-guide-heading" style={{ fontSize: "14px", color: "var(--text-green)", margin: 0 }}>
              <span>🌍</span> Understanding the System Components
            </h4>

            <div className="home-guide-list" style={{ gap: "16px" }}>
              
              {/* Web Portal description */}
              <div className="home-guide-item">
                <div className="home-guide-number" style={{ background: "rgba(0, 102, 51, 0.08)" }}>1</div>
                <div className="home-guide-content">
                  <div className="home-guide-title">🖥️ Web Admin Intelligence Portal</div>
                  <div className="home-guide-desc">
                    Serves as the centralised data command hub for administrators and decision makers. Includes <strong>on-demand telemetry syncs</strong>, interactive GIS map visualization (categorized by UNCCD hotspot classifications), progress indicators for Zimbabwe's 12 national LDN targets, and a raw database query explorer. Allows exporting records as CSV, GeoJSON, or KML files.
                  </div>
                </div>
              </div>

              {/* Mobile Client description */}
              <div className="home-guide-item">
                <div className="home-guide-number" style={{ background: "rgba(0, 102, 51, 0.08)" }}>2</div>
                <div className="home-guide-content">
                  <div className="home-guide-title">📲 Mobile Offline Collector client</div>
                  <div className="home-guide-desc">
                    Developed for field workers operating in remote regions with limited or zero cellular connectivity. By installing the APK on standard Android devices, survey officers can reference local ward maps via GPS, perform offline polygon checking, and record soil core properties (Munsell color details, depths, textures). Recorded data is queued in local offline caches.
                  </div>
                </div>
              </div>

              {/* Sync Bridge description */}
              <div className="home-guide-item">
                <div className="home-guide-number" style={{ background: "rgba(0, 102, 51, 0.08)" }}>3</div>
                <div className="home-guide-content">
                  <div className="home-guide-title">🔄 Seamless Sync Bridge</div>
                  <div className="home-guide-desc">
                    Connects offline field devices with the central database. As soon as field workers enter a zone with active Wi-Fi or cellular networks, they can trigger a bulk upload from their mobile queue. Admin users can then compile these reports instantly on the web portal by clicking the <strong>Sync data from Server</strong> action in the header.
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
