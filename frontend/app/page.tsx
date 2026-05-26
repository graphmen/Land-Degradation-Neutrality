"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [metrics, setMetrics] = useState({
    ldn: { count: 0, extra: 0 },
    soil: { count: 0, extra: 0 },
    totalPoints: 0,
    combinedDistricts: 0,
    highSeverityLdn: 0,
    uniqueTextures: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [ldnRes, soilRes] = await Promise.all([
          fetch("/api/ldn", { cache: "no-store" }).then((r) => r.json()).catch(() => fetch("/ldn-data.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ count: 0, records: [] }))),
          fetch("/api/soil", { cache: "no-store" }).then((r) => r.json()).catch(() => fetch("/soil-data.json", { cache: "no-store" }).then((r) => r.json()).catch(() => ({ count: 0, records: [] }))),
        ]);

        const ldnRecords = ldnRes.records ?? [];
        const ldnDistricts = ldnRecords.map((r: any) => r.dist || r.district).filter(Boolean);
        const uniqueLdnDistricts = new Set(ldnDistricts).size;

        const soilRecords = soilRes.records ?? [];
        const soilDistricts = soilRecords.map((r: any) => r.dist || r["geninfo/dist"] || r.district || r.District).filter(Boolean);

        const combinedDistricts = new Set([...ldnDistricts, ...soilDistricts]).size;
        const uniqueTextures = new Set(soilRecords.map((r: any) => r.tex || r.soil_texture || r.Texture || r["sampl/tex"]).filter(Boolean)).size;

        const highSeverityLdn = ldnRecords.filter((r: any) => {
          const s = (r.sev || "").toLowerCase();
          return s.includes("high") || s.includes("severe");
        }).length;

        setMetrics({
          ldn: { count: ldnRecords.length, extra: uniqueLdnDistricts },
          soil: { count: soilRecords.length, extra: uniqueTextures },
          totalPoints: ldnRecords.length + soilRecords.length,
          combinedDistricts,
          highSeverityLdn,
          uniqueTextures
        });
      } catch (e) {
        console.error("Failed to load home metrics:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="home-container">
      {/* Official Government Welcome Banner */}
      <div className="home-banner">
        <div className="home-banner-content">
          <div className="home-banner-tag">Official Command Portal</div>
          <h2 className="home-banner-title">Zimbabwe Environmental Intelligence Hub</h2>
          <p className="home-banner-desc">
            Developed in alignment with the Environmental Management Agency (EMA) and national ecological preservation protocols. 
            This portal hosts unified geospatial records to validate Land Degradation Neutrality targets (SDG Target 15.3) 
            and soil core texture/moisture suitability matrices across monitored national districts.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* Combined KPI Strip */}
          <div className="home-kpi-strip">
            <div className="home-kpi-card">
              <div className="home-kpi-card-num" style={{ color: "var(--accent-blue)" }}>{metrics.totalPoints}</div>
              <div className="home-kpi-card-label">Surveyed Nodes</div>
            </div>
            <div className="home-kpi-card">
              <div className="home-kpi-card-num" style={{ color: "var(--accent-gold)" }}>{metrics.combinedDistricts}</div>
              <div className="home-kpi-card-label">Active Districts</div>
            </div>
            <div className="home-kpi-card">
              <div className="home-kpi-card-num" style={{ color: "var(--accent-rose)" }}>{metrics.highSeverityLdn}</div>
              <div className="home-kpi-card-label">Critical Degradation Points</div>
            </div>
            <div className="home-kpi-card">
              <div className="home-kpi-card-num" style={{ color: "var(--accent-amber)" }}>{metrics.uniqueTextures}</div>
              <div className="home-kpi-card-label">Analyzed Soil Textures</div>
            </div>
          </div>

          <div className="home-section-divider">
            <span className="home-section-title">Core Operations</span>
            <div className="home-section-line" />
          </div>

          {/* Home Core Monitoring Grid */}
          <div className="home-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {/* LDN Monitoring Card */}
            <Link href="/ldn" style={{ textDecoration: "none" }}>
              <div className="home-card" style={{ borderLeft: "4px solid var(--accent-blue)" }}>
                <div className="home-card-header">
                  <span className="home-card-icon">🌳</span>
                  <h3 className="home-card-title">LDN Monitoring Hub</h3>
                </div>
                <p className="home-card-desc">
                  Validating Land Degradation Neutrality targets in Zimbabwe. High-fidelity tracking of vegetation degradation, deforestation, and local ecological impacts.
                </p>
                <div className="home-kpis">
                  <div className="home-kpi">
                    <div className="home-kpi-val" style={{ color: "var(--accent-blue)" }}>
                      {metrics.ldn.count}
                    </div>
                    <div className="home-kpi-lbl">Validation Wards</div>
                  </div>
                  <div className="home-kpi">
                    <div className="home-kpi-val">
                      {metrics.ldn.extra}
                    </div>
                    <div className="home-kpi-lbl">Districts Checked</div>
                  </div>
                </div>
              </div>
            </Link>

            {/* Soil Samples Card */}
            <Link href="/soil" style={{ textDecoration: "none" }}>
              <div className="home-card" style={{ borderLeft: "4px solid var(--accent-amber)" }}>
                <div className="home-card-header">
                  <span className="home-card-icon">🧪</span>
                  <h3 className="home-card-title">Soil Core Analysis Hub</h3>
                </div>
                <p className="home-card-desc">
                  Analyzing core soil sample properties, texture variations, moisture, and depth metrics from regional validation field sites.
                </p>
                <div className="home-kpis">
                  <div className="home-kpi">
                    <div className="home-kpi-val" style={{ color: "var(--accent-amber)" }}>
                      {metrics.soil.count}
                    </div>
                    <div className="home-kpi-lbl">Cores Sampled</div>
                  </div>
                  <div className="home-kpi">
                    <div className="home-kpi-val">
                      {metrics.soil.extra}
                    </div>
                    <div className="home-kpi-lbl">Texture Profiles</div>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          <div className="home-section-divider">
            <span className="home-section-title">Support & Documentation</span>
            <div className="home-section-line" />
          </div>

          {/* Guidelines & Glossary Container */}
          <div className="home-guide-container">
            {/* Left Block: Guidelines */}
            <div className="home-guide-block">
              <h4 className="home-guide-heading">
                <span>📘</span> System Operation Guidelines
              </h4>
              <div className="home-guide-list">
                <div className="home-guide-item">
                  <div className="home-guide-number">1</div>
                  <div className="home-guide-content">
                    <div className="home-guide-title">On-Demand Server Syncing</div>
                    <div className="home-guide-desc">
                      Click the <strong>Sync data from Server</strong> button in the top banner to request a real-time pull of data collected via field workers' mobile apps. The local cache compiles automatically.
                    </div>
                  </div>
                </div>
                <div className="home-guide-item">
                  <div className="home-guide-number">2</div>
                  <div className="home-guide-content">
                    <div className="home-guide-title">Filtering & Visualizing Datasets</div>
                    <div className="home-guide-desc">
                      Open either operations hub and use the left panel to search by locations, filter by soil textures, or narrow down degradation severity. Clicking a site centers the GIS map and populates detail dashboards.
                    </div>
                  </div>
                </div>
                <div className="home-guide-item">
                  <div className="home-guide-number">3</div>
                  <div className="home-guide-content">
                    <div className="home-guide-title">GIS Reports Export</div>
                    <div className="home-guide-desc">
                      Export your active filtered datasets in the outer left sidebar. Choose <strong>CSV</strong> for raw spreadsheet reports, <strong>GeoJSON</strong> for GIS software (ArcGIS/QGIS), and <strong>KML</strong> for Google Earth.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Block: Glossary */}
            <div className="home-guide-block">
              <h4 className="home-guide-heading">
                <span>📖</span> Environmental Glossary
              </h4>
              <div className="glossary-grid">
                <div className="glossary-item">
                  <div className="glossary-term">Land Degradation Neutrality (LDN)</div>
                  <div className="glossary-definition">
                    A global Sustainable Development Goal (SDG 15.3.1) target aiming to maintain or increase the amount and quality of healthy land assets over time.
                  </div>
                </div>
                <div className="glossary-item">
                  <div className="glossary-term">Soil Texture Profiling</div>
                  <div className="glossary-definition">
                    Classifying soil composition (e.g. Clay, Sand, Loam) which dictates water retention, agricultural suitability, drainage, and susceptibility to erosion.
                  </div>
                </div>
                <div className="glossary-item">
                  <div className="glossary-term">Degradation Severity</div>
                  <div className="glossary-definition">
                    High/Severe ratings represent critical ecological impact areas requiring immediate environmental intervention, while Low represents stable soils.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
