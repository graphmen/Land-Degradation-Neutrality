/* ==========================================================================
   LDN Field Validator - Main Application Coordinator
   ========================================================================== */

const App = {
  // Application State
  state: {
    pointsData: null,
    polygonsData: null,
    userLocation: null, // [lat, lng]
    userAccuracy: null,
    targetsList: [], // Clean array of target items with calculated fields
    selectedTarget: null, // Active target feature
    navigationMode: 'IDLE', // 'IDLE', 'CENTROID_NAV', 'CORNER_NAV', 'CAR_NAV', 'WAYPOINT_NAV', 'COORD_NAV'
    activeCorner: null, // { name, code, lat, lng }
    activeWaypoint: null,
    activeCoord: null,
    activeCornersList: [], // Extract corners of current active polygon
    verifiedData: {}, // { targetId: { centroid: true, corners: { NW: true, NE: true... } } }
    map: null,
    layers: {},
    markersGroup: null,
    polygonsGroup: null,
    userMarker: null,
    userAccuracyCircle: null,
    carLocation: null, // { lat, lng, timestamp }
    carMarker: null,
    currentRoute: null, // Cached route object
    routeTargetCoords: null // [targetLat, targetLng]
  },

  // Initialize Application
  async init() {
    console.log('Initializing LDN Validator application...');
    
    // Load local validation progress
    this.loadLocalProgress();
    
    // Initialize Leaflet Map
    this.initMap();
    
    // Load Saved Car Location
    this.loadCarLocation();
    
    // Bind Tab Navigation
    this.bindTabs();

    // Bind Offline Manager Buttons
    this.bindOfflineControls();

    // Bind Local Progress reset/export buttons
    this.bindSyncControls();

    // Bind map legend toggle
    this.bindLegendToggle();

    // Bind Car Locator controls
    this.bindCarControls();

    // Initialize GPS/Navigator Tools
    if (typeof NavigatorTools !== 'undefined') {
      NavigatorTools.init();
    }

    // Load GeoJSON datasets asynchronously (non-blocking)
    this.loadDatasets().catch(err => {
      console.error('Async loadDatasets failed:', err);
    });

    // Initialize GPS tracking
    this.initGPSTracking();

    // Initialize Compass Sensor
    this.initCompassSensor();

    // Monitor Network Connectivity
    this.monitorNetwork();
  },

  // Bind collapsible map legend panel
  bindLegendToggle() {
    const toggle  = document.getElementById('mapLegendToggle');
    const body    = document.getElementById('mapLegendBody');
    const chevron = document.getElementById('legendChevron');
    if (!toggle || !body || !chevron) return;

    toggle.addEventListener('click', () => {
      const isCollapsed = body.classList.toggle('collapsed');
      chevron.classList.toggle('collapsed', isCollapsed);
    });
  },

  // Monitor online/offline status
  monitorNetwork() {
    const updateStatus = () => {
      const badge = document.getElementById('networkStatus');
      if (navigator.onLine) {
        badge.classList.remove('offline');
        badge.querySelector('span').innerText = 'ONLINE';
        badge.querySelector('i').className = 'fa-solid fa-wifi';
      } else {
        badge.classList.add('offline');
        badge.querySelector('span').innerText = 'OFFLINE';
        badge.querySelector('i').className = 'fa-solid fa-wifi-slash';
      }
    };
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  },

  // Load datasets locally
  async loadDatasets() {
    try {
      this.initExerciseStorage();
      
      if (this.state.activeExercise === 'default') {
        const pointsRes = await fetch('./preloaded_points.geojson');
        const pointsData = await pointsRes.json();
        
        // Merge with any custom added or deleted points from localStorage
        const activeEx = this.state.exercises['default'] || { verifiedData: {}, customPoints: [], deletedPointIds: [] };
        let features = pointsData.features;
        
        if (activeEx.customPoints) {
          features = [...features, ...activeEx.customPoints];
        }
        if (activeEx.deletedPointIds) {
          features = features.filter(f => !activeEx.deletedPointIds.includes(f.properties.id));
        }
        
        this.state.pointsData = {
          type: "FeatureCollection",
          features: features
        };
        
        // Generate polygons dynamically
        const dDeg = 0.0003;
        this.state.polygonsData = {
          type: "FeatureCollection",
          features: features.map(f => {
            const lng = f.geometry.coordinates[0];
            const lat = f.geometry.coordinates[1];
            return {
              type: "Feature",
              properties: { ...f.properties },
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [lng - dDeg, lat + dDeg],
                  [lng + dDeg, lat + dDeg],
                  [lng + dDeg, lat - dDeg],
                  [lng - dDeg, lat - dDeg],
                  [lng - dDeg, lat + dDeg]
                ]]
              }
            };
          })
        };
        
        this.state.verifiedData = activeEx.verifiedData || {};
      } else {
        const activeEx = this.state.exercises[this.state.activeExercise];
        this.state.pointsData = activeEx.pointsData || { type: "FeatureCollection", features: [] };
        this.state.polygonsData = activeEx.polygonsData || { type: "FeatureCollection", features: [] };
        this.state.verifiedData = activeEx.verifiedData || {};
      }

      // Sync backward-compatible validation progress key
      localStorage.setItem('ldn-validated-data', JSON.stringify(this.state.verifiedData));

      this.updateExerciseDropdown();

      console.log('Datasets loaded successfully!');
      
      // Parse Features
      this.parseFeatures();

      // Render layers on Map
      this.renderMapLayers();

      // Render Targets list
      this.renderTargetsList();

      // Setup offline downloader stats
      this.updateOfflineStats();

      // Load Ward Boundaries in background (non-blocking)
      this.loadWardBoundaries().catch(err => console.error('Failed to load wards:', err));

    } catch (err) {
      console.error('Failed to load local geojson datasets. Retrying or showing fallback...', err);
      document.getElementById('targetsList').innerHTML = `
        <div class="glass-panel" style="padding: 20px; text-align: center; border-color: var(--red-alert);">
          <i class="fa-solid fa-triangle-exclamation text-red" style="font-size: 32px; margin-bottom: 12px;"></i>
          <h3>Failed to Load Datasets</h3>
          <p class="font-xs text-secondary" style="margin-top: 8px;">Please ensure GeoJSON files are placed in the app directory.</p>
        </div>
      `;
    }
  },

  // Parse GeoJSON features into a unified list
  parseFeatures() {
    if (!this.state.polygonsData) return;
    
    this.state.targetsList = this.state.polygonsData.features.map(f => {
      const props = f.properties;
      return {
        id: props.id,
        operator: props.operator || 'Unknown',
        landUseCode: props.land_use_c,
        landUseName: props.land_use_1 || 'Unknown',
        landUseTransition: props.land_use_s || 'Stable',
        centroid: [props.location_y, props.location_x],
        polygonFeature: f,
        distance: null,
        wardNumber: null,
        district: null,
        province: null
      };
    });

    console.log(`Parsed ${this.state.targetsList.length} targets.`);
  },

  // Setup Leaflet Map
  initMap() {
    // Center of map - Zoomed to Zimbabwe general LDN zones
    this.state.map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      maxZoom: 22
    }).setView([-19.9469, 32.2336], 10);

    // Basemaps Setup
    this.state.layers.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 22,
      maxNativeZoom: 19
    });

    this.state.layers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 22,
      maxNativeZoom: 19
    });

    this.state.layers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 22,
      maxNativeZoom: 19
    });

    // Google Hybrid: Satellite imagery + road/label overlay (best for field navigation!)
    this.state.layers.googleHybrid = L.tileLayer(
      'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        maxZoom: 22,
        maxNativeZoom: 21,
        attribution: '&copy; Google Maps'
      }
    );

    // Default layer: Google Hybrid (satellite + roads - perfect for field navigation!)
    this.state.layers.googleHybrid.addTo(this.state.map);

    // Dedicated Offline Cached Map Layer (tied to Google Hybrid/Esri cached tiles)
    const cachedProvider = localStorage.getItem('ldn-downloaded-provider') || 'googleHybrid';
    const providers = {
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      googleHybrid: 'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
    };
    const cachedUrl = providers[cachedProvider] || providers.googleHybrid;

    this.state.layers.offlineCache = L.tileLayer(cachedUrl, {
      maxZoom: 22,
      maxNativeZoom: cachedProvider === 'googleHybrid' ? 21 : 19,
      attribution: `Offline Cache (${cachedProvider})`
    });

    // Map layer controller
    const basemaps = {
      "🛰️ Google Hybrid (Default)": this.state.layers.googleHybrid,
      "📲 Offline Cached Maps": this.state.layers.offlineCache,
      "🌑 Sleek Dark": this.state.layers.dark,
      "🗺️ Topographic Map": this.state.layers.osm,
      "🌍 Esri Satellite": this.state.layers.satellite
    };

    // Custom glassmorphic layer switcher (replaces default Leaflet layer control)
    this.initLayerSwitcher(basemaps);

    // Feature Groups
    this.state.polygonsGroup = L.featureGroup().addTo(this.state.map);
    this.state.markersGroup = L.featureGroup().addTo(this.state.map);

    // Toggle point ID tooltips pane based on map zoom
    this.state.map.on('zoomend', () => {
      const zoom = this.state.map.getZoom();
      const pane = document.querySelector('.leaflet-tooltip-pane');
      if (pane) {
        pane.style.display = zoom >= 13 ? 'block' : 'none';
      }

      // Automatically hide/show roads based on zoom level to prevent lag/clutter
      if (App.state.roadsLayer) {
        const roadsSwitch = document.getElementById('switchRoadsLayer');
        const showRoads = (roadsSwitch && roadsSwitch.checked);
        if (showRoads) {
          if (zoom >= 12) {
            if (!this.state.map.hasLayer(App.state.roadsLayer)) {
              App.state.roadsLayer.addTo(this.state.map);
            }
          } else {
            if (this.state.map.hasLayer(App.state.roadsLayer)) {
              this.state.map.removeLayer(App.state.roadsLayer);
            }
          }
        }
      }
    });
  },

  // ── Custom Glassmorphic Layer Switcher ───────────────────────────────────
  initLayerSwitcher(basemaps) {
    const map = this.state.map;
    let activeLayerName = '🛰️ Google Hybrid (Default)';

    // Icons for each layer
    const icons = {
      '🛰️ Google Hybrid (Default)': 'fa-satellite-dish',
      '📲 Offline Cached Maps':      'fa-wifi',
      '🌑 Sleek Dark':               'fa-moon',
      '🗺️ Topographic Map':          'fa-map',
      '🌍 Esri Satellite':           'fa-globe'
    };

    // Build the panel HTML
    const panel = document.createElement('div');
    panel.id = 'customLayerPanel';
    panel.className = 'custom-layer-panel hidden';

    panel.innerHTML = `
      <div class="layer-panel-header">
        <i class="fa-solid fa-layer-group text-emerald"></i>
        <span>Map Layers</span>
        <button class="panel-close-btn" id="btnCloseLayerPanel" title="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="layer-panel-body">
        ${Object.keys(basemaps).map(name => `
          <button class="layer-option-btn ${name === activeLayerName ? 'active' : ''}" data-layer="${name}">
            <i class="fa-solid ${icons[name] || 'fa-map'}"></i>
            <span>${name}</span>
          </button>
        `).join('')}
      </div>
    `;

    // Floating toggle icon button (bottom-right)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'layerSwitcherToggle';
    toggleBtn.className = 'layer-switcher-toggle glass-panel';
    toggleBtn.title = 'Map Layers';
    toggleBtn.innerHTML = `<i class="fa-solid fa-layer-group"></i>`;

    // Append to map container
    const mapEl = document.getElementById('tab-map');
    mapEl.appendChild(panel);
    mapEl.appendChild(toggleBtn);

    // Toggle panel open/close
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
      toggleBtn.classList.toggle('active-layer-btn');
    });

    // Close button
    panel.querySelector('#btnCloseLayerPanel').addEventListener('click', () => {
      panel.classList.add('hidden');
      toggleBtn.classList.remove('active-layer-btn');
    });

    // Layer selection
    panel.querySelectorAll('.layer-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const name = btn.dataset.layer;
        if (name === activeLayerName) return;

        // Swap layers
        map.removeLayer(basemaps[activeLayerName]);
        basemaps[name].addTo(map);
        activeLayerName = name;

        // Update active state
        panel.querySelectorAll('.layer-option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update toggle icon to reflect active layer
        toggleBtn.innerHTML = `<i class="fa-solid ${icons[name] || 'fa-layer-group'}"></i>`;

        // Close panel after selection
        panel.classList.add('hidden');
        toggleBtn.classList.remove('active-layer-btn');
      });
    });

    // Close panel when tapping map
    map.on('click', () => {
      panel.classList.add('hidden');
      toggleBtn.classList.remove('active-layer-btn');
    });
  },

  getCategoryColor(category) {
    switch (category) {
      case '1km Buffer': return '#0ea5e9';
      case '20km Radius': return '#f59e0b';
      case 'National Validation': return '#8b5cf6';
      case 'Previous LDN Data': return '#f43f5e';
      default: return '#c0ff00';
    }
  },

  // Render GeoJSON elements on Map
  renderMapLayers() {
    if (!this.state.polygonsData || !this.state.pointsData) return;

    this.state.polygonsGroup.clearLayers();
    this.state.markersGroup.clearLayers();

    // 1. Draw Polygons
    L.geoJSON(this.state.polygonsData, {
      style: (feature) => {
        const targetId = feature.properties.id;
        const isVisited = this.isTargetVerified(targetId);
        const cat = feature.properties.category;
        const color = this.getCategoryColor(cat);
        return {
          color: isVisited ? '#10b981' : color, // Emerald outline if visited, category color if pending
          fillColor: color,
          weight: 3,
          fillOpacity: isVisited ? 0.25 : 0.08,
          dashArray: ''
        };
      },
      onEachFeature: (feature, layer) => {
        layer.on('click', () => {
          this.selectTargetById(feature.properties.id);
        });
      }
    }).addTo(this.state.polygonsGroup);

    // 2. Draw Point Centroids
    L.geoJSON(this.state.pointsData, {
      pointToLayer: (feature, latlng) => {
        const targetId = feature.properties.id;
        const isVisited = this.isTargetVerified(targetId);
        const cat = feature.properties.category;
        const color = this.getCategoryColor(cat);

        // Circular premium pulse markers for target centroids styled by category
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: color,
          color: isVisited ? '#10b981' : '#ffffff',
          weight: isVisited ? 4 : 2,
          opacity: 1,
          fillOpacity: 0.9,
          className: isVisited ? 'leaflet-target-pulse-visited' : 'leaflet-target-pulse'
        });
      },
      onEachFeature: (feature, layer) => {
        const targetId = feature.properties.id;
        
        // Bind permanent tooltip showing the point ID
        layer.bindTooltip(targetId, {
          permanent: true,
          direction: 'top',
          className: 'point-id-tooltip',
          offset: [0, -8]
        });

        layer.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          this.selectTargetById(feature.properties.id);
        });
      }
    }).addTo(this.state.markersGroup);

    // Fit map bounds to polygons — ONLY when the user is not actively navigating.
    // During navigation the user manually zooms in to their box; calling fitBounds
    // would snap back out to show all points, which is very disruptive.
    const isNavigating = this.state.navigationMode && this.state.navigationMode !== 'IDLE';
    if (!isNavigating && this.state.polygonsGroup.getLayers().length > 0) {
      this.state.map.fitBounds(this.state.polygonsGroup.getBounds());
    }

    // Apply initial tooltip visibility check based on current zoom
    const zoom = this.state.map.getZoom();
    const pane = document.querySelector('.leaflet-tooltip-pane');
    if (pane) {
      pane.style.display = zoom >= 13 ? 'block' : 'none';
    }
  },

  // Check if a target is fully verified (centroid and all 4 corners visited)
  isTargetVerified(targetId) {
    const data = this.state.verifiedData[targetId];
    if (!data) return false;
    
    // Centroid must be verified, and all 4 corners (NW, NE, SE, SW) must be true
    const centroidOk = data.centroid === true;
    const corners = data.corners || {};
    const cornersOk = corners.NW && corners.NE && corners.SE && corners.SW;
    
    return centroidOk && cornersOk;
  },

  // Initialize Exercise Storage System
  initExerciseStorage() {
    if (this.state.exercises) return;

    this.state.activeExercise = localStorage.getItem('ldn-active-exercise') || 'default';
    const raw = localStorage.getItem('ldn-exercises');
    if (raw) {
      try {
        this.state.exercises = JSON.parse(raw);
      } catch (e) {
        console.warn('Failed to parse ldn-exercises, resetting:', e);
      }
    }

    if (!this.state.exercises) {
      this.state.exercises = {
        "default": { pointsData: null, polygonsData: null, verifiedData: {} }
      };
      localStorage.setItem('ldn-exercises', JSON.stringify(this.state.exercises));
    }

    // Ensure active exercise exists in state.exercises
    if (!this.state.exercises[this.state.activeExercise]) {
      this.state.activeExercise = 'default';
      localStorage.setItem('ldn-active-exercise', 'default');
    }
  },

  // Save current active exercise progress and datasets to local storage
  saveExerciseState() {
    this.initExerciseStorage();

    // Sync active exercise with current state values
    if (this.state.activeExercise === 'default') {
      const activeEx = this.state.exercises['default'] || {};
      this.state.exercises['default'] = {
        pointsData: null,
        polygonsData: null,
        verifiedData: this.state.verifiedData || {},
        customPoints: activeEx.customPoints || [],
        deletedPointIds: activeEx.deletedPointIds || []
      };
    } else {
      this.state.exercises[this.state.activeExercise] = {
        pointsData: this.state.pointsData,
        polygonsData: this.state.polygonsData,
        verifiedData: this.state.verifiedData || {}
      };
    }

    localStorage.setItem('ldn-exercises', JSON.stringify(this.state.exercises));
  },

  // Switch to a different exercise
  async switchExercise(name) {
    if (!this.state.exercises || !this.state.exercises[name]) return;

    // 1. Save current exercise state first
    this.saveExerciseState();

    // 2. Switch active exercise
    this.state.activeExercise = name;
    localStorage.setItem('ldn-active-exercise', name);

    // 3. Load active exercise details
    if (name === 'default') {
      try {
        await this.loadDatasets();
        alert(`Switched to exercise: ${name}`);
      } catch (err) {
        console.error('Failed to load default exercise:', err);
      }
      return;
    }

    const activeEx = this.state.exercises[name];
    this.state.pointsData = activeEx.pointsData || { type: "FeatureCollection", features: [] };
    this.state.polygonsData = activeEx.polygonsData || { type: "FeatureCollection", features: [] };
    this.state.verifiedData = activeEx.verifiedData || {};

    // Sync backward-compatible validation progress key
    localStorage.setItem('ldn-validated-data', JSON.stringify(this.state.verifiedData));

    // 4. Update UI and Map
    this.parseFeatures();
    this.renderMapLayers();
    this.renderTargetsList();
    this.updateStatsDisplay();
    this.updateOfflineStats();
    this.updateExerciseDropdown();

    // Fit map bounds to new polygons only when not in active navigation
    const isNav = this.state.navigationMode && this.state.navigationMode !== 'IDLE';
    if (!isNav && this.state.polygonsGroup && this.state.polygonsGroup.getLayers().length > 0) {
      this.state.map.fitBounds(this.state.polygonsGroup.getBounds());
    }

    // Recalculate ward boundaries for new points
    // Clear ward outlines cache in localStorage so it recalculates for the new exercise
    localStorage.removeItem('ldn-points-wards');
    localStorage.removeItem('ldn-matched-wards-geojson');
    this.loadWardBoundaries().catch(err => console.error('Failed to load wards for switched exercise:', err));

    alert(`Switched to exercise: ${name}`);
  },

  // Create a new custom exercise
  createNewExercise(name) {
    this.initExerciseStorage();

    const cleanName = name.trim();
    if (!cleanName) {
      alert("Error: Exercise name cannot be empty.");
      return;
    }

    if (this.state.exercises[cleanName]) {
      alert(`Error: An exercise named "${cleanName}" already exists.`);
      return;
    }

    // Initialize with empty features
    this.state.exercises[cleanName] = {
      pointsData: { type: "FeatureCollection", features: [] },
      polygonsData: { type: "FeatureCollection", features: [] },
      verifiedData: {}
    };

    localStorage.setItem('ldn-exercises', JSON.stringify(this.state.exercises));
    
    // Switch to it immediately
    this.switchExercise(cleanName);
  },

  // Delete a custom exercise
  deleteExercise(name) {
    this.initExerciseStorage();

    if (name === 'default') {
      alert("Error: You cannot delete the default built-in exercise.");
      return;
    }

    if (!confirm(`Are you sure you want to delete the exercise "${name}"? All points, boundaries, and validation progress in this exercise will be permanently deleted.`)) {
      return;
    }

    delete this.state.exercises[name];
    localStorage.setItem('ldn-exercises', JSON.stringify(this.state.exercises));

    // Switch back to default
    this.switchExercise('default');
  },

  // Populate exercise select dropdown in UI
  updateExerciseDropdown() {
    const select = document.getElementById('exerciseSelect');
    const deleteBtn = document.getElementById('btnDeleteExercise');
    if (!select) return;

    this.initExerciseStorage();

    select.innerHTML = Object.keys(this.state.exercises).map(name => {
      const label = name === 'default' ? 'Default Built-in (LDN)' : name;
      return `<option value="${name}">${label}</option>`;
    }).join('');

    select.value = this.state.activeExercise;

    // Toggle delete button visibility/state
    if (deleteBtn) {
      if (this.state.activeExercise === 'default') {
        deleteBtn.disabled = true;
        deleteBtn.style.opacity = '0.5';
        deleteBtn.style.pointerEvents = 'none';
      } else {
        deleteBtn.disabled = false;
        deleteBtn.style.opacity = '1';
        deleteBtn.style.pointerEvents = 'auto';
      }
    }
  },

  // Add a manual validation target point
  addCustomPoint(id, lat, lng, operator, landUse, transition) {
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      alert("Error: Latitude must be between -90 and 90 degrees.");
      return false;
    }
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
      alert("Error: Longitude must be between -180 and 180 degrees.");
      return false;
    }

    // Zimbabwe Bounds check
    const isInsideZim = (latNum >= -22.8 && latNum <= -15.0 && lngNum >= 25.0 && lngNum <= 33.5);
    if (!isInsideZim) {
      const proceed = confirm(`Warning: The coordinates you entered (${latNum.toFixed(6)}, ${lngNum.toFixed(6)}) lie outside the boundaries of Zimbabwe (Latitude: -22.8 to -15.0, Longitude: 25.0 to 33.5).\n\nDo you want to proceed anyway?`);
      if (!proceed) return false;
    }

    // Proximity check (within 5 meters of existing targets)
    if (this.state.targetsList && this.state.targetsList.length > 0) {
      let closestTarget = null;
      let minDistance = Infinity;

      this.state.targetsList.forEach(t => {
        if (t.centroid && t.centroid.length === 2) {
          const dist = NavigationEngine.calculateDistance(latNum, lngNum, t.centroid[0], t.centroid[1]);
          if (dist < minDistance) {
            minDistance = dist;
            closestTarget = t;
          }
        }
      });

      if (minDistance <= 5.0) {
        const proceed = confirm(`Warning: The coordinates you entered are within ${minDistance.toFixed(2)} meters of an existing target point (ID: "${closestTarget.id}").\n\nDo you want to proceed anyway?`);
        if (!proceed) return false;
      }
    }

    const cleanId = (id && id.trim()) ? id.trim() : "custom_" + Math.random().toString(36).substr(2, 9);
    
    if (this.state.targetsList.some(t => t.id === cleanId)) {
      alert(`Error: A target point with ID "${cleanId}" already exists.`);
      return false;
    }

    const landUseClass = landUse || "Forest";
    const transitionClass = transition || "Stable";
    const op = operator || "Unknown";

    // 1. Create point feature
    const pointFeature = {
      type: "Feature",
      properties: {
        id: cleanId,
        operator: op,
        land_use_c: landUseClass === "Cropland" ? 1 : landUseClass === "Forest" ? 2 : landUseClass === "Grassland" ? 3 : 4,
        land_use_1: landUseClass,
        land_use_s: transitionClass,
        location_x: lngNum,
        location_y: latNum
      },
      geometry: {
        type: "Point",
        coordinates: [lngNum, latNum]
      }
    };

    // 2. Create square boundary polygon centered on point (60m x 60m, approx 0.0003 deg offset)
    const dDeg = 0.0003;
    const polygonFeature = {
      type: "Feature",
      properties: {
        id: cleanId,
        operator: op,
        land_use_c: pointFeature.properties.land_use_c,
        land_use_1: landUseClass,
        land_use_s: transitionClass,
        location_x: lngNum,
        location_y: latNum
      },
      geometry: {
        type: "Polygon",
        coordinates: [[
          [lngNum - dDeg, latNum + dDeg],
          [lngNum + dDeg, latNum + dDeg],
          [lngNum + dDeg, latNum - dDeg],
          [lngNum - dDeg, latNum - dDeg],
          [lngNum - dDeg, latNum + dDeg] // Closed ring
        ]]
      }
    };

    // Initialize collections if they are null
    if (!this.state.pointsData) this.state.pointsData = { type: "FeatureCollection", features: [] };
    if (!this.state.polygonsData) this.state.polygonsData = { type: "FeatureCollection", features: [] };

    // Append to active exercise dataset
    this.state.pointsData.features.push(pointFeature);
    this.state.polygonsData.features.push(polygonFeature);

    if (this.state.activeExercise === 'default') {
      const activeEx = this.state.exercises['default'] || {};
      if (!activeEx.customPoints) activeEx.customPoints = [];
      activeEx.customPoints.push(pointFeature);
    }

    // Save exercise state
    this.saveExerciseState();

    // Re-render application target list and map
    this.parseFeatures();
    this.renderMapLayers();
    this.renderTargetsList();
    this.updateStatsDisplay();
    this.updateOfflineStats();

    // Fetch administrative ward in background
    localStorage.removeItem('ldn-points-wards');
    localStorage.removeItem('ldn-matched-wards-geojson');
    this.loadWardBoundaries().catch(err => console.error('Failed to resolve ward boundaries for new point:', err));

    return true;
  },

  // Delete a target point by ID from active exercise
  deleteTargetById(targetId) {
    if (!this.state.pointsData || !this.state.polygonsData) return;

    this.state.pointsData.features = this.state.pointsData.features.filter(f => f.properties.id !== targetId);
    this.state.polygonsData.features = this.state.polygonsData.features.filter(f => f.properties.id !== targetId);

    // Clear validation progress for this point
    if (this.state.verifiedData && this.state.verifiedData[targetId]) {
      delete this.state.verifiedData[targetId];
      localStorage.setItem('ldn-validated-data', JSON.stringify(this.state.verifiedData));
    }

    if (this.state.activeExercise === 'default') {
      const activeEx = this.state.exercises['default'] || {};
      if (!activeEx.deletedPointIds) activeEx.deletedPointIds = [];
      if (!activeEx.deletedPointIds.includes(targetId)) {
        activeEx.deletedPointIds.push(targetId);
      }
      if (activeEx.customPoints) {
        activeEx.customPoints = activeEx.customPoints.filter(f => f.properties.id !== targetId);
      }
    }

    // Save state
    this.saveExerciseState();

    // Close bottom slide panel if deleted target is currently selected
    if (this.state.selectedTarget && this.state.selectedTarget.id === targetId) {
      document.getElementById('targetSlidePanel').classList.remove('open');
      this.state.selectedTarget = null;
    }

    // Re-render UI
    this.parseFeatures();
    this.renderMapLayers();
    this.renderTargetsList();
    this.updateStatsDisplay();
    this.updateOfflineStats();

    // Reset ward boundaries cache
    localStorage.removeItem('ldn-points-wards');
    localStorage.removeItem('ldn-matched-wards-geojson');
    this.loadWardBoundaries().catch(err => console.error('Failed to load wards after target deletion:', err));
  },

  // Import points and polygons from a GeoJSON File
  async importGeoJson(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const geojson = JSON.parse(e.target.result);
        if (!geojson || geojson.type !== "FeatureCollection" || !geojson.features) {
          alert("Error: Selected file is not a valid GeoJSON FeatureCollection.");
          return;
        }
        this.processGeoJsonFeatures(geojson);
      } catch (err) {
        console.error("Error parsing GeoJSON:", err);
        alert("Failed to parse GeoJSON file. Please check that it is valid GeoJSON.");
      }
    };
    reader.readAsText(file);
  },

  // Import points and polygons from a KML File
  async importKml(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const kmlText = e.target.result;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(kmlText, "text/xml");
        
        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          alert("Error: Failed to parse KML XML. Please make sure the file is valid.");
          return;
        }

        const placemarks = xmlDoc.querySelectorAll("Placemark");
        if (!placemarks || placemarks.length === 0) {
          alert("Error: No Placemarks found in KML file.");
          return;
        }

        const features = [];
        let index = 1;

        placemarks.forEach(p => {
          const nameEl = p.querySelector("name");
          let id = nameEl ? nameEl.textContent.trim() : `kml_target_${index++}`;
          
          const pointCoordsEl = p.querySelector("Point coordinates");
          const polyCoordsEl = p.querySelector("Polygon coordinates") || p.querySelector("LinearRing coordinates");

          let geometry = null;

          if (pointCoordsEl) {
            const coordsStr = pointCoordsEl.textContent.trim();
            const parts = coordsStr.split(/[\s,]+/);
            if (parts.length >= 2) {
              const lng = parseFloat(parts[0]);
              const lat = parseFloat(parts[1]);
              if (!isNaN(lng) && !isNaN(lat)) {
                geometry = {
                  type: "Point",
                  coordinates: [lng, lat]
                };
              }
            }
          } else if (polyCoordsEl) {
            const coordsStr = polyCoordsEl.textContent.trim();
            const coordPairs = coordsStr.split(/\s+/).filter(pair => pair.trim() !== "");
            const outerRing = [];
            coordPairs.forEach(pair => {
              const parts = pair.split(",");
              if (parts.length >= 2) {
                const lng = parseFloat(parts[0]);
                const lat = parseFloat(parts[1]);
                if (!isNaN(lng) && !isNaN(lat)) {
                  outerRing.push([lng, lat]);
                }
              }
            });

            if (outerRing.length >= 3) {
              if (outerRing[0][0] !== outerRing[outerRing.length - 1][0] || outerRing[0][1] !== outerRing[outerRing.length - 1][1]) {
                outerRing.push([outerRing[0][0], outerRing[0][1]]);
              }
              geometry = {
                type: "Polygon",
                coordinates: [outerRing]
              };
            }
          }

          if (geometry) {
            const descriptionEl = p.querySelector("description");
            const desc = descriptionEl ? descriptionEl.textContent.trim() : "";
            
            features.push({
              type: "Feature",
              properties: {
                id: id,
                operator: "KML Import",
                land_use_1: "Forest",
                land_use_s: "Stable",
                description: desc
              },
              geometry: geometry
            });
          }
        });

        if (features.length === 0) {
          alert("Error: No valid Point or Polygon geometries could be parsed from the KML file.");
          return;
        }

        const geojson = {
          type: "FeatureCollection",
          features: features
        };

        this.processGeoJsonFeatures(geojson);

      } catch (err) {
        console.error("Failed to parse KML:", err);
        alert("Error parsing KML: " + err.message);
      }
    };
    reader.readAsText(file);
  },

  // Process features collection (shared between GeoJSON and KML)
  async processGeoJsonFeatures(geojson) {
    try {
      let outsideBoundsCount = 0;
      let proximityCount = 0;
      const importedCentroids = [];

      geojson.features.forEach(f => {
        if (!f.geometry || !f.geometry.type) return;

        const props = f.properties || {};
        let id = props.id || props.ID || props.point_id || "";
        id = String(id).trim();

        if (this.state.targetsList.some(t => t.id === id)) {
          return;
        }

        let lat, lng;
        if (f.geometry.type === "Point") {
          lng = f.geometry.coordinates[0];
          lat = f.geometry.coordinates[1];
        } else if (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") {
          const locX = props.location_x || props.longitude || props.lng;
          const locY = props.location_y || props.latitude || props.lat;
          if (locX && locY) {
            lng = parseFloat(locX);
            lat = parseFloat(locY);
          } else {
            let coords = f.geometry.type === "Polygon" ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
            let sumLat = 0, sumLng = 0;
            coords.forEach(pt => {
              sumLng += pt[0];
              sumLat += pt[1];
            });
            lng = sumLng / coords.length;
            lat = sumLat / coords.length;
          }
        } else {
          return;
        }

        if (isNaN(lat) || isNaN(lng)) return;

        const isInsideZim = (lat >= -22.8 && lat <= -15.0 && lng >= 25.0 && lng <= 33.5);
        if (!isInsideZim) {
          outsideBoundsCount++;
        }

        let isClose = false;
        if (this.state.targetsList && this.state.targetsList.length > 0) {
          this.state.targetsList.forEach(t => {
            if (t.centroid && t.centroid.length === 2) {
              const dist = NavigationEngine.calculateDistance(lat, lng, t.centroid[0], t.centroid[1]);
              if (dist <= 5.0) {
                isClose = true;
              }
            }
          });
        }

        importedCentroids.forEach(c => {
          const dist = NavigationEngine.calculateDistance(lat, lng, c[0], c[1]);
          if (dist <= 5.0) {
            isClose = true;
          }
        });

        if (isClose) {
          proximityCount++;
        }

        importedCentroids.push([lat, lng]);
      });

      if (outsideBoundsCount > 0 || proximityCount > 0) {
        let warningMsg = "Warning: The imported data contains potential issues:\n";
        if (outsideBoundsCount > 0) {
          warningMsg += `- ${outsideBoundsCount} target point(s) lie outside the boundaries of Zimbabwe (Latitude: -22.8 to -15.0, Longitude: 25.0 to 33.5).\n`;
        }
        if (proximityCount > 0) {
          warningMsg += `- ${proximityCount} target point(s) are within 5.0 meters of an existing or other imported target.\n`;
        }
        warningMsg += "\nDo you want to proceed and import all valid features anyway?";
        const proceed = confirm(warningMsg);
        if (!proceed) {
          return;
        }
      }

      let addedCount = 0;
      let duplicateCount = 0;

      geojson.features.forEach(f => {
        if (!f.geometry || !f.geometry.type) return;

        const props = f.properties || {};
        let id = props.id || props.ID || props.point_id || ("import_" + Math.random().toString(36).substr(2, 9));
        id = String(id).trim();

        if (this.state.targetsList.some(t => t.id === id)) {
          duplicateCount++;
          return;
        }

        const operator = props.operator || props.Operator || "Unknown";
        const landUse = props.land_use_1 || props.landuse || props.land_use || "Forest";
        const transition = props.land_use_s || props.transition || "Stable";
        
        let lat, lng;

        if (f.geometry.type === "Point") {
          lng = f.geometry.coordinates[0];
          lat = f.geometry.coordinates[1];
        } else if (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") {
          const locX = props.location_x || props.longitude || props.lng;
          const locY = props.location_y || props.latitude || props.lat;
          if (locX && locY) {
            lng = parseFloat(locX);
            lat = parseFloat(locY);
          } else {
            let coords = [];
            if (f.geometry.type === "Polygon") {
              coords = f.geometry.coordinates[0];
            } else {
              coords = f.geometry.coordinates[0][0];
            }
            let sumLat = 0, sumLng = 0;
            coords.forEach(pt => {
              sumLng += pt[0];
              sumLat += pt[1];
            });
            lng = sumLng / coords.length;
            lat = sumLat / coords.length;
          }
        } else {
          return;
        }

        const pointFeature = {
          type: "Feature",
          properties: {
            id: id,
            operator: operator,
            land_use_c: landUse === "Cropland" ? 1 : landUse === "Forest" ? 2 : landUse === "Grassland" ? 3 : 4,
            land_use_1: landUse,
            land_use_s: transition,
            location_x: lng,
            location_y: lat
          },
          geometry: {
            type: "Point",
            coordinates: [lng, lat]
          }
        };

        let polyGeom;
        if (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") {
          polyGeom = f.geometry;
        } else {
          const dDeg = 0.0003;
          polyGeom = {
            type: "Polygon",
            coordinates: [[
              [lng - dDeg, lat + dDeg],
              [lng + dDeg, lat + dDeg],
              [lng + dDeg, lat - dDeg],
              [lng - dDeg, lat - dDeg],
              [lng - dDeg, lat + dDeg]
            ]]
          };
        }

        const polyFeature = {
          type: "Feature",
          properties: {
            id: id,
            operator: operator,
            land_use_c: pointFeature.properties.land_use_c,
            land_use_1: landUse,
            land_use_s: transition,
            location_x: lng,
            location_y: lat
          },
          geometry: polyGeom
        };

        if (!this.state.pointsData) this.state.pointsData = { type: "FeatureCollection", features: [] };
        if (!this.state.polygonsData) this.state.polygonsData = { type: "FeatureCollection", features: [] };

        this.state.pointsData.features.push(pointFeature);
        this.state.polygonsData.features.push(polyFeature);
        addedCount++;
      });

      if (addedCount > 0) {
        this.saveExerciseState();
        this.parseFeatures();
        this.renderMapLayers();
        this.renderTargetsList();
        this.updateStatsDisplay();
        this.updateOfflineStats();

        localStorage.removeItem('ldn-points-wards');
        localStorage.removeItem('ldn-matched-wards-geojson');
        this.loadWardBoundaries().catch(err => console.error('Failed to load wards for imported targets:', err));
        
        alert(`Successfully imported ${addedCount} target points!${duplicateCount > 0 ? ` (${duplicateCount} duplicate IDs skipped)` : ""}`);
      } else {
        alert(`No new targets imported.${duplicateCount > 0 ? ` (${duplicateCount} duplicate IDs skipped)` : ""}`);
      }
    } catch (err) {
      console.error("Error processing features:", err);
      alert("An error occurred during feature import processing: " + err.message);
    }
  },

  // Export current target dataset as a combined GeoJSON file
  exportTargetsGeoJson() {
    if (!this.state.pointsData || !this.state.pointsData.features || this.state.pointsData.features.length === 0) {
      alert("No target points to export in the active exercise.");
      return;
    }
    
    const allFeatures = [
      ...this.state.pointsData.features,
      ...this.state.polygonsData.features
    ];

    const exportCollection = {
      type: "FeatureCollection",
      name: `LDN_Targets_${this.state.activeExercise}`,
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: allFeatures
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportCollection, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `LDN_Targets_${this.state.activeExercise}.geojson`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  // Clear all validation targets in active exercise
  clearAllTargets() {
    if (!confirm("WARNING: This will permanently delete ALL target points and boundary polygons in the active exercise! Progress logs for this exercise will also be wiped. Proceed?")) {
      return;
    }

    this.state.pointsData = { type: "FeatureCollection", features: [] };
    this.state.polygonsData = { type: "FeatureCollection", features: [] };
    this.state.verifiedData = {};

    this.saveExerciseState();
    
    // Clear map layers
    if (this.state.polygonsGroup) this.state.polygonsGroup.clearLayers();
    if (this.state.markersGroup) this.state.markersGroup.clearLayers();
    if (this.state.layers.wardsOutline) this.state.map.removeLayer(this.state.layers.wardsOutline);

    this.parseFeatures();
    this.renderTargetsList();
    this.updateStatsDisplay();
    this.updateOfflineStats();

    alert("All targets cleared in active exercise.");
  },

  // Reset active exercise to the built-in defaults
  async resetToDefaults() {
    if (!confirm("This will overwrite all changes in the active exercise and restore the built-in target points and polygons. Proceed?")) {
      return;
    }

    try {
      this.state.verifiedData = {};
      
      if (this.state.activeExercise === 'default') {
        const pointsRes = await fetch('./preloaded_points.geojson');
        const pointsData = await pointsRes.json();
        this.state.pointsData = pointsData;
        
        // Generate polygons dynamically
        const dDeg = 0.0003;
        this.state.polygonsData = {
          type: "FeatureCollection",
          features: pointsData.features.map(f => {
            const lng = f.geometry.coordinates[0];
            const lat = f.geometry.coordinates[1];
            return {
              type: "Feature",
              properties: { ...f.properties },
              geometry: {
                type: "Polygon",
                coordinates: [[
                  [lng - dDeg, lat + dDeg],
                  [lng + dDeg, lat + dDeg],
                  [lng + dDeg, lat - dDeg],
                  [lng - dDeg, lat - dDeg],
                  [lng - dDeg, lat + dDeg]
                ]]
              }
            };
          })
        };
        
        // Reset default exercises tracking lists
        this.state.exercises['default'] = {
          pointsData: null,
          polygonsData: null,
          verifiedData: {},
          customPoints: [],
          deletedPointIds: []
        };
      } else {
        this.state.pointsData = { type: "FeatureCollection", features: [] };
        this.state.polygonsData = { type: "FeatureCollection", features: [] };
      }

      this.saveExerciseState();
      this.parseFeatures();
      this.renderMapLayers();
      this.renderTargetsList();
      this.updateStatsDisplay();
      this.updateOfflineStats();

      // Reset ward boundaries cache
      localStorage.removeItem('ldn-points-wards');
      localStorage.removeItem('ldn-matched-wards-geojson');
      this.loadWardBoundaries().catch(err => console.error('Failed to load wards on reset:', err));

      alert("Active exercise reset to defaults successfully.");
    } catch (e) {
      console.error("Failed to restore default dataset:", e);
      alert("Error restoring defaults: " + e.message);
    }
  },

  loadLocalProgress() {
    this.initExerciseStorage();
    const activeEx = this.state.exercises[this.state.activeExercise];
    this.state.verifiedData = activeEx.verifiedData || {};
  },

  saveLocalProgress() {
    this.initExerciseStorage();
    this.state.exercises[this.state.activeExercise].verifiedData = this.state.verifiedData || {};
    localStorage.setItem('ldn-exercises', JSON.stringify(this.state.exercises));

    // Backward compatibility key
    localStorage.setItem('ldn-validated-data', JSON.stringify(this.state.verifiedData));
    
    // Re-style map layers to reflect verification immediately
    this.renderMapLayers();
    
    // Update local statistics
    this.updateStatsDisplay();
  },

  // Select a Target and show slide panel
  selectTargetById(targetId) {
    const target = this.state.targetsList.find(t => t.id === targetId);
    if (!target) return;

    this.state.selectedTarget = target;
    
    // Render details inside slide-up bottom panel
    const panel = document.getElementById('targetSlidePanel');
    const content = document.getElementById('panelContent');
    
    const isVisited = this.isTargetVerified(targetId);
    const targetData = this.state.verifiedData[targetId] || { centroid: false, corners: {} };
    
    let cornersVisitedCount = 0;
    if (targetData.corners) {
      Object.values(targetData.corners).forEach(v => { if(v) cornersVisitedCount++; });
    }

    content.innerHTML = `
      <div class="target-detail-view">
        <div class="tab-header-bar" style="margin-bottom: 8px;">
          <h2>Point ID: ${target.id}</h2>
          <span class="target-count-badge" style="background: ${isVisited ? 'var(--emerald-dark)' : '#78350f'}; border-color: ${isVisited ? 'var(--emerald-pure)' : '#c0ff00'}; color: ${isVisited ? 'var(--emerald-light)' : '#e8ff99'}">
            ${isVisited ? 'VALIDATED' : 'PENDING'}
          </span>
        </div>
        <span class="operator-lbl">ASSIGNED OPERATOR: <strong>${target.operator}</strong></span>
        
        <div class="info-grid">
          <div class="info-item">
            <span>Land Use Class</span>
            <strong>${target.landUseName}</strong>
          </div>
          <div class="info-item">
            <span>Transition Class</span>
            <strong class="highlight">${target.landUseTransition}</strong>
          </div>
          <div class="info-item coords-row">
            <span>Coordinates (Centroid)</span>
            <strong class="monospace">${target.centroid[0].toFixed(6)}, ${target.centroid[1].toFixed(6)}</strong>
          </div>
          <div class="info-item">
            <span>Centroid Verification</span>
            <strong class="${targetData.centroid ? 'text-emerald' : 'text-red'}">
              <i class="fa-solid ${targetData.centroid ? 'fa-circle-check' : 'fa-circle-xmark'}"></i> 
              ${targetData.centroid ? 'Verified' : 'Not Visited'}
            </strong>
          </div>
          <div class="info-item">
            <span>Corners Audited</span>
            <strong>${cornersVisitedCount} / 4 corners</strong>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <span>Administrative Ward</span>
            <strong>${target.wardNumber !== null && target.wardNumber !== undefined ? `Ward ${target.wardNumber} (${target.district}, ${target.province})` : 'Processing Ward boundaries...'}</strong>
          </div>
        </div>

        ${targetData.munsell ? `
          <div class="soil-saved-card glass-panel" style="margin-top: 12px; margin-bottom: 12px; border: var(--emerald-glass-border); display: flex; gap: 12px; align-items: center; padding: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 6px; background: rgb(${targetData.munsell.r},${targetData.munsell.g},${targetData.munsell.b}); border: 1px solid rgba(255,255,255,0.1); flex-shrink: 0;"></div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 2px;">
              <span style="font-size: 8px; text-transform: uppercase; color: var(--text-secondary);">Munsell Soil Colour</span>
              <strong style="font-size: 13px; color: var(--text-primary); font-family: var(--font-mono);">${targetData.munsell.code} (${targetData.munsell.name})</strong>
              <span style="font-size: 10px; color: var(--emerald-light);">${targetData.munsell.soil} | Organic Matter: ${targetData.munsell.om}</span>
            </div>
          </div>
        ` : `
          <div class="soil-saved-card glass-panel" style="margin-top: 12px; margin-bottom: 12px; border: 1px dashed rgba(255,255,255,0.1); text-align: center; padding: 10px;">
            <span style="font-size: 10px; color: var(--text-secondary);">No soil classification recorded. Switch to the <strong style="color: var(--emerald-light); cursor: pointer;" onclick="document.querySelector('.nav-tab-btn[data-tab=&quot;tab-soil&quot;]').click();">Soil Lab</strong> tab to scan.</span>
          </div>
        `}

        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="action-btn" id="startNavigationBtn" style="flex: 1; margin: 0;">
            <i class="fa-solid fa-location-arrow"></i> Navigate to Target Centroid
          </button>
          <button class="action-btn danger-btn" id="btnDeleteTarget" style="width: auto; padding: 0 16px; margin: 0; display: flex; align-items: center; justify-content: center; gap: 6px;">
            <i class="fa-solid fa-trash-can"></i> Delete
          </button>
        </div>
      </div>

    `;

    // Slide panel up
    panel.classList.add('open');

    // Pan map to point
    this.state.map.setView(target.centroid, 17);

    // Bind Navigation Button inside Slide Card
    document.getElementById('startNavigationBtn').addEventListener('click', () => {
      // Swap to Map tab automatically to see the map
      const mapTabBtn = document.querySelector('.nav-tab-btn[data-tab="tab-map"]');
      if (mapTabBtn) mapTabBtn.click();
      
      this.startTargetNavigation(target);
      panel.classList.remove('open');
    });

    // Bind Delete Button inside Slide Card
    const btnDeleteTarget = document.getElementById('btnDeleteTarget');
    if (btnDeleteTarget) {
      btnDeleteTarget.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete target point "${target.id}"? This will clear its boundary polygon and all associated validation progress.`)) {
          this.deleteTargetById(target.id);
        }
      });
    }
  },

  // Active Target Navigation Screen Trigger
  startTargetNavigation(target) {
    this.state.selectedTarget = target;
    this.state.navigationMode = 'CENTROID_NAV';
    this.state.activeCorner = null;

    // Extract corners and classify them
    this.state.activeCornersList = NavigationEngine.extractAndClassifyCorners(target.polygonFeature);

    // Set UI Details
    document.getElementById('navTargetId').innerText = `Point #${target.id}`;
    document.getElementById('navTargetBadge').innerText = 'CENTROID NAVIGATION';
    document.getElementById('navTargetBadge').style.background = '#064e3b';
    document.getElementById('navTargetBadge').style.color = '#34d399';
    
    // Success panel hidden
    document.getElementById('centroidSuccessPanel').classList.add('hidden');
    document.getElementById('cornerDetailsBox').classList.add('hidden');
    document.getElementById('cornersGridPanel').classList.remove('hidden');

    // Setup active corners button displays
    this.renderCornerButtons();

    // Show Full Screen Overlay
    document.getElementById('navigationOverlay').classList.remove('hidden');

    // Initialise turn-by-turn voice guidance
    if (typeof TurnGuide !== 'undefined') {
      TurnGuide.init();
      TurnGuide.reset();
    }

    // Update coordinates navigation display immediately
    this.updateNavigationMetrics();
  },

  // Render validation state on corner buttons in Nav Screen
  renderCornerButtons() {
    const target = this.state.selectedTarget;
    const targetData = this.state.verifiedData[target.id] || { centroid: false, corners: {} };
    const corners = targetData.corners || {};

    const btnNW = document.getElementById('btnCornerNW');
    const btnNE = document.getElementById('btnCornerNE');
    const btnSE = document.getElementById('btnCornerSE');
    const btnSW = document.getElementById('btnCornerSW');

    const btns = [btnNW, btnNE, btnSE, btnSW];
    
    this.state.activeCornersList.forEach((corner, idx) => {
      const btn = btns[idx];
      btn.className = 'corner-nav-btn'; // reset class
      btn.dataset.cornerIdx = idx;
      
      const isVerified = corners[corner.code] === true;
      if (isVerified) {
        btn.classList.add('verified');
      }

      if (this.state.activeCorner && this.state.activeCorner.code === corner.code) {
        btn.classList.add('active');
      }
      
      // If centroid not reached and corners are locked, add locked
      const isUnlocked = targetData.centroid === true || targetData.cornersUnlocked === true;
      if (!isUnlocked) {
        btn.classList.add('locked');
      }
    });

    // Update corner label
    const isUnlocked = targetData.centroid === true || targetData.cornersUnlocked === true;
    const label = document.getElementById('cornerStatusLabel');
    if (isUnlocked) {
      label.innerText = 'UNLOCKED';
      label.style.color = 'var(--emerald-light)';
      document.getElementById('btnUnlockCornersManual').classList.add('hidden');
    } else {
      label.innerText = 'LOCKED (Reach Center)';
      label.style.color = 'var(--yellow-glow)';
      document.getElementById('btnUnlockCornersManual').classList.remove('hidden');
    }
  },

  // Setup navigation corner listeners
  bindNavigationOverlayEvents() {
    // Back / Exit Nav button
    document.getElementById('exitNavBtn').addEventListener('click', () => {
      document.getElementById('navigationOverlay').classList.add('hidden');
      this.state.navigationMode = 'IDLE';
      this.state.selectedTarget = null;
      this.state.activeCorner = null;
      this.state.currentRoute = null;
      this.state.routeTargetCoords = null;
      
      // Remove mini navigation card
      document.getElementById('miniNavWidget').classList.add('hidden');

      // Reset turn-by-turn voice guidance
      if (typeof TurnGuide !== 'undefined') TurnGuide.reset();

      // Remove real-time navigation line from map
      if (this.state.navigationLine) {
        this.state.navigationLine.remove();
        this.state.navigationLine = null;
      }
      if (this.state.navigationConnStart) {
        this.state.navigationConnStart.remove();
        this.state.navigationConnStart = null;
      }
      if (this.state.navigationConnEnd) {
        this.state.navigationConnEnd.remove();
        this.state.navigationConnEnd = null;
      }
    });

    // Unlock Corners Manually button (in case GPS jumps in forests)
    document.getElementById('btnUnlockCornersManual').addEventListener('click', () => {
      const target = this.state.selectedTarget;
      if (!this.state.verifiedData[target.id]) {
        this.state.verifiedData[target.id] = { centroid: false, corners: {} };
      }
      
      // Force unlock
      this.state.verifiedData[target.id].cornersUnlocked = true;
      this.saveLocalProgress();
      this.renderCornerButtons();
      
      alert('Corner navigation has been unlocked manually.');
    });

    // Click corner buttons to select active navigation corner
    const cornerButtons = document.querySelectorAll('.corner-nav-btn');
    cornerButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) {
          alert('You must reach the centroid first before verifying corners, or tap "Manually Unlock Corners" if GPS accuracy is low.');
          return;
        }

        const idx = parseInt(btn.dataset.cornerIdx);
        const corner = this.state.activeCornersList[idx];
        
        // Select or toggle
        if (this.state.activeCorner && this.state.activeCorner.code === corner.code) {
          // De-select, return to centroid nav
          this.state.activeCorner = null;
          this.state.navigationMode = 'CENTROID_NAV';
          document.getElementById('navTargetBadge').innerText = 'CENTROID NAVIGATION';
          document.getElementById('navTargetBadge').style.background = '#064e3b';
          document.getElementById('cornerDetailsBox').classList.add('hidden');
        } else {
          // Select corner navigation
          this.state.activeCorner = corner;
          this.state.navigationMode = 'CORNER_NAV';
          document.getElementById('navTargetBadge').innerText = `${corner.code} CORNER NAVIGATION`;
          document.getElementById('navTargetBadge').style.background = '#0369a1'; // Blue badge for corners
          document.getElementById('navTargetBadge').style.color = '#e0f2fe';
          
          // Display coordinates details box
          document.getElementById('cornerDetailsBox').classList.remove('hidden');
          document.getElementById('activeCornerName').innerText = `${corner.code} Corner (10m offset)`;
          document.getElementById('activeCornerCoords').innerText = `${corner.navLat.toFixed(6)}, ${corner.navLng.toFixed(6)}`;
        }

        this.renderCornerButtons();
        this.updateNavigationMetrics();
      });
    });

    // Mark active corner verified
    document.getElementById('btnVerifyCorner').addEventListener('click', () => {
      if (!this.state.activeCorner || !this.state.selectedTarget) return;

      const target = this.state.selectedTarget;
      const corner = this.state.activeCorner;

      if (!this.state.verifiedData[target.id]) {
        this.state.verifiedData[target.id] = { centroid: false, corners: {} };
      }
      if (!this.state.verifiedData[target.id].corners) {
        this.state.verifiedData[target.id].corners = {};
      }

      this.state.verifiedData[target.id].corners[corner.code] = true;
      this.saveLocalProgress();
      this.renderCornerButtons();

      // Check if all 4 corners are validated
      const isComplete = this.isTargetVerified(target.id);
      if (isComplete) {
        alert(`Validation Complete! You have verified the centroid and all 4 corners for Point #${target.id}!`);
      } else {
        alert(`${corner.code} Corner verified successfully!`);
      }

      // Automatically de-select active corner
      this.state.activeCorner = null;
      this.state.navigationMode = 'CENTROID_NAV';
      document.getElementById('navTargetBadge').innerText = 'CENTROID NAVIGATION';
      document.getElementById('navTargetBadge').style.background = '#064e3b';
      document.getElementById('cornerDetailsBox').classList.add('hidden');
      
      this.renderCornerButtons();
      this.updateNavigationMetrics();
    });
  },

  // Dynamic Geolocation GPS Update Handler
  initGPSTracking() {
    if (!("geolocation" in navigator)) {
      alert("GPS Geolocation is not supported by your browser/device. Navigation will not function.");
      return;
    }

    const onGPSSuccess = (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      this.state.userLocation = [lat, lng];
      this.state.userAccuracy = accuracy;

      // Update Map GPS indicator card
      document.getElementById('gpsAccuracy').innerText = `± ${accuracy.toFixed(1)} meters`;
      if (accuracy < 10) {
        document.getElementById('gpsIndicator').style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        document.getElementById('gpsIndicator').style.borderColor = 'rgba(234, 179, 8, 0.4)';
      }

      // Update user marker on map
      this.updateUserMarkerOnMap();

      // Update distance to all items in Targets List
      this.updateTargetDistances();

      // Update Nav screen coordinates if active
      if (this.state.navigationMode !== 'IDLE') {
        this.updateNavigationMetrics();
      }

      // Update GPS HUD
      if (typeof NavigatorTools !== 'undefined') {
        NavigatorTools.updateGpsHud(position);
      }
    };

    const onGPSError = (err) => {
      console.warn('GPS Error code:', err.code, err.message);
      document.getElementById('gpsAccuracy').innerText = 'GPS Signal Lost';
      document.getElementById('gpsIndicator').style.borderColor = 'rgba(244, 63, 94, 0.4)';
    };

    // Watch position coordinates in real-time
    navigator.geolocation.watchPosition(onGPSSuccess, onGPSError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000
    });
  },

  // Update user marker dot and circle on Leaflet Map
  updateUserMarkerOnMap() {
    if (!this.state.userLocation) return;
    const latlng = this.state.userLocation;

    if (!this.state.userMarker) {
      // User marker - red pulsing dot. Container must be large enough for the pulse ring (36px)
      const userDotIcon = L.divIcon({
        className: 'user-gps-dot-container',
        html: '<div class="user-gps-dot"></div><div class="user-gps-pulse"></div>',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
      
      this.state.userMarker = L.marker(latlng, { icon: userDotIcon }).addTo(this.state.map);
      this.state.userAccuracyCircle = L.circle(latlng, {
        radius: this.state.userAccuracy,
        color: '#ef4444',
        fillColor: '#ef4444',
        weight: 1,
        opacity: 0.35,
        fillOpacity: 0.08
      }).addTo(this.state.map);

    } else {
      this.state.userMarker.setLatLng(latlng);
      this.state.userAccuracyCircle.setLatLng(latlng);
      this.state.userAccuracyCircle.setRadius(this.state.userAccuracy);
    }
  },

  // Recalculate and update distances of targets list
  updateTargetDistances() {
    if (!this.state.userLocation || this.state.targetsList.length === 0) return;

    const uLat = this.state.userLocation[0];
    const uLng = this.state.userLocation[1];

    this.state.targetsList.forEach(t => {
      t.distance = NavigationEngine.calculateDistance(uLat, uLng, t.centroid[0], t.centroid[1]);
    });

    // Only update the distance text in existing DOM elements — never rebuild the list on GPS ticks
    const targetsTab = document.getElementById('tab-targets');
    if (targetsTab.classList.contains('active')) {
      this.updateDistancesInPlace();
    }
  },

  // Render the target list DOM
  renderTargetsList(rebuildDOM = true) {
    const listContainer = document.getElementById('targetsList');
    if (!listContainer) return;

    // Filter values
    const query = document.getElementById('targetSearch').value.toLowerCase();
    const luFilter = document.getElementById('filterLandUse').value;
    const statusFilter = document.getElementById('filterStatus').value;

    const filtered = this.state.targetsList.filter(t => {
      const matchQuery = t.id.toLowerCase().includes(query) || t.operator.toLowerCase().includes(query);
      const matchLu = !luFilter || t.landUseName === luFilter;
      
      let matchStatus = true;
      const isVerified = this.isTargetVerified(t.id);
      if (statusFilter === 'unvisited') matchStatus = !isVerified;
      else if (statusFilter === 'visited') matchStatus = isVerified;

      return matchQuery && matchLu && matchStatus;
    });

    // Update count badge
    document.getElementById('targetCount').innerText = `${filtered.length} targets`;

    // Sort by distance (closest first)
    if (this.state.userLocation) {
      filtered.sort((a, b) => a.distance - b.distance);
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="glass-panel" style="padding: 30px; text-align: center; color: var(--text-secondary);">
          <i class="fa-solid fa-clipboard-question" style="font-size: 32px; margin-bottom: 12px; opacity: 0.5;"></i>
          <p>No matching validation targets found.</p>
        </div>
      `;
      return;
    }

    // Build list DOM
    listContainer.innerHTML = filtered.map(t => {
      const isVisited = this.isTargetVerified(t.id);
      const distStr = t.distance !== null
        ? (t.distance >= 1000 ? `${(t.distance / 1000).toFixed(2)} km` : `${Math.round(t.distance)} m`)
        : '--';

      const iconType = t.landUseName.toLowerCase();

      return `
        <div class="target-list-item glass-panel ${isVisited ? 'visited' : ''}" onclick="App.selectTargetById('${t.id}')">
          <div class="target-info-left">
            <div class="target-icon-box ${iconType}">
              <i class="fa-solid ${iconType === 'cropland' ? 'fa-wheat-awn' : iconType === 'forest' ? 'fa-tree' : 'fa-leaf'}"></i>
            </div>
            <div class="target-text">
              <h3>Point ID: ${t.id}</h3>
              <span>Operator: <strong>${t.operator}</strong> | Transition: <strong>${t.landUseTransition}</strong></span>
            </div>
          </div>
          <div class="target-distance-right">
            <span class="dist" data-target-id="${t.id}">${distStr}</span>
            <div class="status-dot"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  // Update only distance text in existing target list rows (called on GPS update - no DOM rebuild)
  updateDistancesInPlace() {
    if (!this.state.userLocation) return;
    const uLat = this.state.userLocation[0];
    const uLng = this.state.userLocation[1];

    this.state.targetsList.forEach(t => {
      const span = document.querySelector(`.dist[data-target-id="${t.id}"]`);
      if (!span) return;
      const dist = t.distance;
      span.textContent = dist !== null
        ? (dist >= 1000 ? `${(dist / 1000).toFixed(2)} km` : `${Math.round(dist)} m`)
        : '--';
    });
  },

  // Calculate Navigation Arrow and Distance for navigation overlay screen
  updateNavigationMetrics() {
    if (this.state.navigationMode === 'IDLE') return;

    let targetLat, targetLng, targetLabel;

    if (this.state.navigationMode === 'CAR_NAV') {
      if (!this.state.carLocation) return;
      targetLat = this.state.carLocation.lat;
      targetLng = this.state.carLocation.lng;
      targetLabel = 'To Car';
    } else if (this.state.navigationMode === 'WAYPOINT_NAV') {
      if (!this.state.activeWaypoint) return;
      targetLat = this.state.activeWaypoint.lat;
      targetLng = this.state.activeWaypoint.lng;
      targetLabel = `To ${this.state.activeWaypoint.name}`;
    } else if (this.state.navigationMode === 'COORD_NAV') {
      if (!this.state.activeCoord) return;
      targetLat = this.state.activeCoord.lat;
      targetLng = this.state.activeCoord.lng;
      targetLabel = 'To Target Coord';
    } else {
      if (!this.state.selectedTarget) return;
      const target = this.state.selectedTarget;

      if (this.state.navigationMode === 'CENTROID_NAV') {
        targetLat = target.centroid[0];
        targetLng = target.centroid[1];
        targetLabel = 'To Centroid';
      } else if (this.state.navigationMode === 'CORNER_NAV' && this.state.activeCorner) {
        targetLat = this.state.activeCorner.navLat || this.state.activeCorner.lat;
        targetLng = this.state.activeCorner.navLng || this.state.activeCorner.lng;
        targetLabel = `To ${this.state.activeCorner.code} Corner (Offset)`;
      } else {
        return;
      }
    }

    // Fallback coordinates if user GPS not acquired yet
    const uLat = this.state.userLocation ? this.state.userLocation[0] : targetLat + 0.0015;
    const uLng = this.state.userLocation ? this.state.userLocation[1] : targetLng - 0.0015;

    let distance = NavigationEngine.calculateDistance(uLat, uLng, targetLat, targetLng);
    const bearing = NavigationEngine.calculateBearing(uLat, uLng, targetLat, targetLng);

    // Draw real-time navigation path on the map
    if (this.state.map) {
      const userLatLng = L.latLng(uLat, uLng);
      const targetLatLng = L.latLng(targetLat, targetLng);

      // ─────────────────────────────────────────────────────────────────────
      // NAVIGATION MODE DECISION
      //
      // > 2 km  →  ROAD MODE  (A* routing, prefer big roads via farMode=true)
      // ≤ 2 km  →  DIRECT MODE (straight line, actual crow-fly distance)
      //            Avoids the "route sticking to road" problem in the final
      //            approach when you leave the track to reach the sample point.
      // ─────────────────────────────────────────────────────────────────────
      const DIRECT_THRESHOLD_M = 800; // 800 m switch-over distance (direct approach)
      const useDirectMode = distance <= DIRECT_THRESHOLD_M;

      // Update the navigation mode badge in the overlay
      const navModeLbl = document.getElementById('navModeLabel');
      if (navModeLbl) {
        if (useDirectMode) {
          navModeLbl.style.background = 'rgba(34,197,94,0.18)';
          navModeLbl.style.color = '#22c55e';
          navModeLbl.style.borderColor = 'rgba(34,197,94,0.35)';
          navModeLbl.textContent = '🎯 DIRECT APPROACH';
        } else {
          navModeLbl.style.background = 'rgba(56,189,248,0.18)';
          navModeLbl.style.color = '#38bdf8';
          navModeLbl.style.borderColor = 'rgba(56,189,248,0.3)';
          navModeLbl.textContent = '🛣 ROAD ROUTING';
        }
      }

      if (useDirectMode) {
        // ── DIRECT / FINAL-APPROACH MODE ────────────────────────────────────
        // Clear any existing road-routing polylines so they don't clutter the map
        if (this.state.navigationConnStart) {
          this.state.navigationConnStart.remove();
          this.state.navigationConnStart = null;
        }
        if (this.state.navigationConnEnd) {
          this.state.navigationConnEnd.remove();
          this.state.navigationConnEnd = null;
        }
        // Also invalidate cached road route so it gets recomputed when we go back to road mode
        this.state.currentRoute = null;

        // Draw (or update) a solid direct line from user → target
        const directColor = '#22c55e'; // Bright green for final approach
        if (this.state.navigationLine) {
          this.state.navigationLine.setLatLngs([userLatLng, targetLatLng]);
          this.state.navigationLine.setStyle({ color: directColor, dashArray: '', weight: 4 });
          this.state.navigationLine.addTo(this.state.map);
        } else {
          this.state.navigationLine = L.polyline([userLatLng, targetLatLng], {
            color: directColor,
            weight: 4,
            opacity: 0.95,
            className: 'nav-path-line nav-direct-line'
          }).addTo(this.state.map);
        }

        // Distance is already the true Haversine distance – no adjustment needed

      } else {
        // ── ROAD ROUTING MODE  (user is > 2 km from destination) ────────────
        // farMode=true tells A* to penalise minor roads so it prefers big roads
        const farMode = true;

        // Lazy load roads when navigation starts if not ready
        if (typeof RoadRouter !== 'undefined' && !RoadRouter.isReady && typeof OfflineManager !== 'undefined' && !OfflineManager.isLoadingRoads) {
          OfflineManager.isLoadingRoads = true;
          OfflineManager.loadCachedRoads().then(() => {
            OfflineManager.isLoadingRoads = false;
            this.updateNavigationMetrics();
          });
        }

        let route = null;
        if (typeof RoadRouter !== 'undefined' && RoadRouter.isReady) {
          const targetChanged = !this.state.routeTargetCoords ||
                                this.state.routeTargetCoords[0] !== targetLat ||
                                this.state.routeTargetCoords[1] !== targetLng;

          if (targetChanged) {
            this.state.currentRoute = null;
          }

          if (this.state.currentRoute) {
            // Find closest point on existing route path to project the user's position
            let closestIdx = 0;
            let minUserToRouteDist = Infinity;
            const routePath = this.state.currentRoute.path;

            for (let i = 0; i < routePath.length; i++) {
              const pt = routePath[i];
              const d = NavigationEngine.calculateDistance(uLat, uLng, pt.lat, pt.lng);
              if (d < minUserToRouteDist) {
                minUserToRouteDist = d;
                closestIdx = i;
              }
            }

            // If the user is within 150m of the active route, reuse it
            if (minUserToRouteDist <= 150) {
              route = {
                path: routePath,
                closestIdx: closestIdx,
                startNodeCoords: [routePath[closestIdx].lat, routePath[closestIdx].lng],
                endNodeCoords: this.state.currentRoute.endNodeCoords,
                isCached: true
              };
            }
          }

          // If no cached route (or user went off-route), compute a new A* route
          if (!route) {
            // Pass farMode so A* prefers motorways/trunks/primary roads
            const newRoute = RoadRouter.findRoute(uLat, uLng, targetLat, targetLng, farMode);
            if (newRoute) {
              this.state.currentRoute = newRoute;
              this.state.routeTargetCoords = [targetLat, targetLng];
              route = { ...newRoute, closestIdx: 0, isCached: false };
            }
          }
        }

        if (route && route.path && route.path.length >= 2) {
          const snappedRoadLatLng = route.path[route.closestIdx];
          const roadEndLatLng = L.latLng(route.endNodeCoords[0], route.endNodeCoords[1]);
          const remainingPath = route.path.slice(route.closestIdx);

          // 1. Draw solid road path line (cyan = road-following mode)
          if (remainingPath.length >= 2) {
            if (this.state.navigationLine) {
              this.state.navigationLine.setLatLngs(remainingPath);
              this.state.navigationLine.setStyle({ color: '#38bdf8', dashArray: '', weight: 4 });
              this.state.navigationLine.addTo(this.state.map);
            } else {
              this.state.navigationLine = L.polyline(remainingPath, {
                color: '#38bdf8', // Cyan — road-following route
                weight: 4,
                opacity: 0.95,
                className: 'nav-path-line'
              }).addTo(this.state.map);
            }

            // Update turn-by-turn guidance from the remaining road path
            if (typeof TurnGuide !== 'undefined') {
              TurnGuide.update(remainingPath, 0, uLat, uLng);
            }
          } else {
            if (this.state.navigationLine) this.state.navigationLine.remove();
            this.state.navigationLine = null;
          }

          // 2. User → nearest road node (purple dashed connection)
          if (this.state.navigationConnStart) {
            this.state.navigationConnStart.setLatLngs([userLatLng, snappedRoadLatLng]);
            this.state.navigationConnStart.addTo(this.state.map);
          } else {
            this.state.navigationConnStart = L.polyline([userLatLng, snappedRoadLatLng], {
              color: '#a855f7',
              weight: 3,
              dashArray: '5, 5',
              opacity: 0.8,
              className: 'nav-conn-line'
            }).addTo(this.state.map);
          }

          // 3. Road end node → target (purple dashed connection)
          if (this.state.navigationConnEnd) {
            this.state.navigationConnEnd.setLatLngs([roadEndLatLng, targetLatLng]);
            this.state.navigationConnEnd.addTo(this.state.map);
          } else {
            this.state.navigationConnEnd = L.polyline([roadEndLatLng, targetLatLng], {
              color: '#a855f7',
              weight: 3,
              dashArray: '5, 5',
              opacity: 0.8,
              className: 'nav-conn-line'
            }).addTo(this.state.map);
          }

          // Recalculate distance via road
          let remainingRoadDistance = 0;
          if (route.isCached) {
            for (let i = route.closestIdx; i < route.path.length - 1; i++) {
              remainingRoadDistance += NavigationEngine.calculateDistance(
                route.path[i].lat, route.path[i].lng,
                route.path[i+1].lat, route.path[i+1].lng
              );
            }
          } else {
            remainingRoadDistance = route.roadDistance;
          }

          const connStartDist = NavigationEngine.calculateDistance(uLat, uLng, snappedRoadLatLng.lat, snappedRoadLatLng.lng);
          const connEndDist = NavigationEngine.calculateDistance(roadEndLatLng.lat, roadEndLatLng.lng, targetLat, targetLng);
          distance = remainingRoadDistance + connStartDist + connEndDist;

        } else {
          // No road route found — fall back to dashed straight line
          if (this.state.navigationLine) {
            this.state.navigationLine.setLatLngs([userLatLng, targetLatLng]);
            this.state.navigationLine.setStyle({ color: '#38bdf8', dashArray: '8, 8', weight: 4 });
            this.state.navigationLine.addTo(this.state.map);
          } else {
            this.state.navigationLine = L.polyline([userLatLng, targetLatLng], {
              color: '#38bdf8',
              weight: 4,
              dashArray: '8, 8',
              opacity: 0.9,
              className: 'nav-path-line'
            }).addTo(this.state.map);
          }

          if (this.state.navigationConnStart) this.state.navigationConnStart.remove();
          if (this.state.navigationConnEnd) this.state.navigationConnEnd.remove();
          this.state.navigationConnStart = null;
          this.state.navigationConnEnd = null;
        }
      }
    }

    // Update Mini Navigation Map widget
    document.getElementById('miniNavWidget').classList.remove('hidden');
    document.getElementById('miniNavDist').innerText = distance >= 1000 ? `${(distance / 1000).toFixed(2)} km` : `${Math.round(distance)} m`;
    document.getElementById('miniNavLabel').innerText = targetLabel;

    // Update main Nav Overlay UI
    const distVal = distance >= 1000 ? (distance / 1000).toFixed(2) : Math.round(distance);
    const distUnit = distance >= 1000 ? 'kilometers' : 'meters';
    
    document.getElementById('navDistance').innerText = distVal;
    document.getElementById('navDistanceUnit').innerText = distUnit;
    
    const cardinal = NavigationEngine.getCardinal(bearing);
    document.getElementById('navBearingText').innerText = `Bearing: ${Math.round(bearing)}° (${cardinal})`;

    // Rotate map mini compass pointer
    document.getElementById('miniCompassArrow').style.transform = `rotate(${bearing}deg)`;

    // Success check for centroid mode (automatic transition to corner mode)
    const isCentroidMode = this.state.navigationMode === 'CENTROID_NAV';
    const isCarMode = this.state.navigationMode === 'CAR_NAV';
    const isWaypointMode = this.state.navigationMode === 'WAYPOINT_NAV';
    const isCoordMode = this.state.navigationMode === 'COORD_NAV';
    
    if (isCarMode) {
      document.getElementById('centroidSuccessPanel').classList.add('hidden');
      document.getElementById('navStatusText').innerText = distance < 8 ? 'ARRIVED' : 'WALK';
      document.getElementById('navStatusIcon').className = distance < 8 ? 'fa-solid fa-car text-emerald' : 'fa-solid fa-location-arrow text-red';
    } else if (isWaypointMode) {
      document.getElementById('centroidSuccessPanel').classList.add('hidden');
      document.getElementById('navStatusText').innerText = distance < 8 ? 'ARRIVED' : 'WALK';
      document.getElementById('navStatusIcon').className = distance < 8 ? 'fa-solid fa-diamond text-emerald animate-pulse' : 'fa-solid fa-location-arrow text-sky';
    } else if (isCoordMode) {
      document.getElementById('centroidSuccessPanel').classList.add('hidden');
      document.getElementById('navStatusText').innerText = distance < 8 ? 'ARRIVED' : 'WALK';
      document.getElementById('navStatusIcon').className = distance < 8 ? 'fa-solid fa-bullseye text-emerald animate-pulse' : 'fa-solid fa-location-arrow text-pink';
    } else if (isCentroidMode) {
      const target = this.state.selectedTarget;
      const targetData = this.state.verifiedData[target.id] || { centroid: false, corners: {} };
      
      if (distance < 10 && !targetData.centroid) {
        // Mark Centroid Verified
        if (!this.state.verifiedData[target.id]) {
          this.state.verifiedData[target.id] = { centroid: false, corners: {} };
        }
        this.state.verifiedData[target.id].centroid = true;
        this.saveLocalProgress();
   
        // Show Celebration overlay
        document.getElementById('centroidSuccessPanel').classList.remove('hidden');
        document.getElementById('navStatusText').innerText = 'ARRIVED';
        document.getElementById('navStatusIcon').className = 'fa-solid fa-trophy text-emerald';

        // Announce arrival via voice
        if (typeof TurnGuide !== 'undefined') {
          TurnGuide.announceArrival(`Point ${target.id}`);
        }
   
        // Unlock corners buttons UI
        this.renderCornerButtons();
        
        // Vibrate phone if device supports vibration
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } else if (targetData.centroid) {
        // Already arrived previously
        document.getElementById('centroidSuccessPanel').classList.remove('hidden');
        document.getElementById('navStatusText').innerText = 'CENTER';
        document.getElementById('navStatusIcon').className = 'fa-solid fa-trophy text-emerald';
      } else {
        document.getElementById('centroidSuccessPanel').classList.add('hidden');
        document.getElementById('navStatusText').innerText = distance < 10 ? 'ARRIVED' : 'WALK';
        document.getElementById('navStatusIcon').className = distance < 10 ? 'fa-solid fa-crosshairs text-emerald' : 'fa-solid fa-crosshairs text-red';
      }
    } else {
      document.getElementById('centroidSuccessPanel').classList.add('hidden');
      document.getElementById('navStatusText').innerText = distance < 10 ? 'ARRIVED' : 'WALK';
      document.getElementById('navStatusIcon').className = distance < 10 ? 'fa-solid fa-crosshairs text-emerald' : 'fa-solid fa-crosshairs text-red';
    }

    // Cache bearing for fast compass updates
    this.state.currentBearing = bearing;

    // Rotate compass elements
    this.updateCompassRotation(NavigationEngine.deviceHeading || 0);
  },

  // Update compass needle/card styles directly (fast, no routing or Haversine math)
  updateCompassRotation(heading) {
    if (this.state.navigationMode === 'IDLE') return;

    const bearing = this.state.currentBearing || 0;
    let needleRotation = bearing;
    let cardRotation = 0;

    if (NavigationEngine.orientationSupported) {
      // Compass needle rotates so it absolute-points towards target relative to the phone heading
      needleRotation = bearing - heading;
      // Compass ring card rotates so N faces real physical North
      cardRotation = -heading;
    } else {
      // Fallback: Compass card sits locked with North at the top,
      // needle points towards target bearing
      needleRotation = bearing;
      cardRotation = 0;
    }

    // Rotate compass elements
    const compassRing = document.getElementById('compassRing');
    const navigationPointer = document.getElementById('navigationPointer');
    if (compassRing) compassRing.style.transform = `rotate(${cardRotation}deg)`;
    if (navigationPointer) navigationPointer.style.transform = `translateX(-50%) rotate(${needleRotation}deg)`;
  },

  // Setup Device Magnetometer Compass Listener
  lastCompassUpdate: 0,
  lastHeading: -999,
  initCompassSensor() {
    NavigationEngine.initCompassSensor((heading) => {
      const now = Date.now();
      // Throttle: update compass rotation up to every 50ms for smooth movement
      if (now - this.lastCompassUpdate > 50 || Math.abs(heading - this.lastHeading) >= 0.5) {
        this.lastCompassUpdate = now;
        this.lastHeading = heading;
        this.updateCompassRotation(heading);
      }
    });
  },

  // Bind PWA Tab Buttons
  bindTabs() {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Toggle Nav Tab Buttons
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Toggle Content Panes
        const paneId = tab.dataset.tab;
        document.querySelectorAll('.tab-pane').forEach(pane => {
          pane.classList.remove('active');
        });
        document.getElementById(paneId).classList.add('active');

        // Trigger Leaflet redraw when opening map tab
        if (paneId === 'tab-map' && this.state.map) {
          setTimeout(() => {
            this.state.map.invalidateSize();
          }, 100);
        }

        // Render Targets lists
        if (paneId === 'tab-targets') {
          this.renderTargetsList();
        }

        // Update statistics
        if (paneId === 'tab-settings') {
          this.updateStatsDisplay();
        }
      });
    });

    // Close Details Panel Overlay
    document.getElementById('closePanelBtn').addEventListener('click', () => {
      document.getElementById('targetSlidePanel').classList.remove('open');
    });

    // Search and filters triggers
    document.getElementById('targetSearch').addEventListener('input', () => this.renderTargetsList(false));
    document.getElementById('filterLandUse').addEventListener('change', () => this.renderTargetsList(false));
    document.getElementById('filterStatus').addEventListener('change', () => this.renderTargetsList(false));

    // Bind Navigation Panel inner events
    this.bindNavigationOverlayEvents();
  },

  // Offline pre-download settings display
  updateOfflineStats() {
    if (!this.state.targetsList.length) return;
    
    const radius = parseInt(document.getElementById('downloadRadius').value);
    
    // Download radius stats display updates
    document.getElementById('dlTargetCount').innerText = this.state.targetsList.length;
    
    let tileEstimate = 0;
    let sizeEstimate = 0;

    if (radius === 100) {
      tileEstimate = this.state.targetsList.length * 8; // approx 8 tiles per point across zoom 14-18
      sizeEstimate = (tileEstimate * 20) / 1024;
    } else if (radius === 250) {
      tileEstimate = this.state.targetsList.length * 28;
      sizeEstimate = (tileEstimate * 20) / 1024;
    } else {
      tileEstimate = this.state.targetsList.length * 75;
      sizeEstimate = (tileEstimate * 20) / 1024;
    }

    document.getElementById('dlTileCount').innerText = `~${tileEstimate.toLocaleString()}`;
    document.getElementById('dlSize').innerText = `~${Math.round(sizeEstimate)} MB`;
  },

  // Bind Offline tile downloader controls
  bindOfflineControls() {
    // Dynamic settings trigger
    document.getElementById('downloadRadius').addEventListener('change', () => this.updateOfflineStats());
    
    const startBtn = document.getElementById('startDownloadBtn');
    const cancelBtn = document.getElementById('cancelDownloadBtn');
    const clearBtn = document.getElementById('clearCacheBtn');

    startBtn.addEventListener('click', async () => {
      if (OfflineManager.isDownloading) return;

      const provider = document.getElementById('basemapSelect').value;
      const radius = parseInt(document.getElementById('downloadRadius').value);

      if (!confirm(`This will download map imagery tiles for all ${this.state.targetsList.length} centroids. Ensure you are connected to high-speed WiFi. Proceed?`)) {
        return;
      }

      startBtn.disabled = true;
      startBtn.classList.add('secondary-btn');
      
      // Start download worker pool
      await OfflineManager.startDownload(this.state.targetsList.map(t => t.polygonFeature), provider, radius);

      startBtn.disabled = false;
      startBtn.classList.remove('secondary-btn');
    });

    cancelBtn.addEventListener('click', () => {
      OfflineManager.cancelDownload();
      startBtn.disabled = false;
      startBtn.classList.remove('secondary-btn');
    });

    clearBtn.addEventListener('click', () => {
      OfflineManager.clearCache();
    });

    // Roads & Tracks button bindings
    const downloadRoadsBtn = document.getElementById('downloadRoadsBtn');
    const toggleRoadsBtn = document.getElementById('toggleRoadsBtn');

    if (downloadRoadsBtn) {
      downloadRoadsBtn.addEventListener('click', async () => {
        // Combine all points and polygon features for bounding box calculation
        const allFeatures = [
          ...(this.state.pointsData ? this.state.pointsData.features : []),
          ...(this.state.polygonsData ? this.state.polygonsData.features : [])
        ];
        await OfflineManager.downloadRoadsAndTracks(allFeatures);
      });
    }

    if (toggleRoadsBtn) {
      toggleRoadsBtn.addEventListener('click', () => {
        OfflineManager.toggleRoadsVisibility();
      });
    }

    // Refresh Local storage displays
    OfflineManager.updateStorageDisplay();
  },

  // Render statistics and export files in Data tab
  updateStatsDisplay() {
    if (!this.state.targetsList.length) return;

    let validatedPoints = 0;
    let validatedCorners = 0;
    const totalCorners = this.state.targetsList.length * 4;

    const logContainer = document.getElementById('localDataLogs');
    const logs = [];

    this.state.targetsList.forEach(t => {
      const targetData = this.state.verifiedData[t.id];
      if (!targetData) return;

      if (targetData.centroid) {
        validatedPoints++;
        logs.push(`<div class="log-item"><span>Centroid Point #${t.id} Verified</span><strong>OK</strong></div>`);
      }

      if (targetData.corners) {
        Object.keys(targetData.corners).forEach(code => {
          if (targetData.corners[code]) {
            validatedCorners++;
            logs.push(`<div class="log-item visited"><span>Point #${t.id} - ${code} Corner Verified</span><strong>YES</strong></div>`);
          }
        });
      }
    });

    // Update numbers
    document.getElementById('statVisitedPoints').innerText = validatedPoints;
    document.getElementById('statVisitedCorners').innerText = `${validatedCorners} / ${totalCorners}`;

    // Update log display
    if (logs.length > 0) {
      logContainer.innerHTML = logs.join('');
    } else {
      logContainer.innerHTML = `<p class="empty-log-msg">No local modifications to sync. All clean!</p>`;
    }
  },

  // Bind Sync progress buttons
  bindSyncControls() {
    const resetBtn = document.getElementById('resetLocalProgressBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('WARNING: This will completely delete all your validated points, visited corners, and logged progress! This action cannot be undone. Clear?')) {
          this.state.verifiedData = {};
          this.saveLocalProgress();
          this.renderCornerButtons();
          alert('All local fieldwork progress has been reset.');
        }
      });
    }

    // Server Live Sync Binding
    const syncServerBtn = document.getElementById('btnSyncServer') || document.getElementById('btnSyncKobo');
    if (syncServerBtn) {
      syncServerBtn.addEventListener('click', () => {
        this.syncWithServer(syncServerBtn);
      });
    }

    const exportBtn = document.getElementById('exportDataBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (Object.keys(this.state.verifiedData).length === 0) {
          alert('No validation data has been collected yet. Point validations and corner verifications will be exported here.');
          return;
        }

        // Generate a detailed GeoJSON report
        const reportFeatures = [];

        this.state.targetsList.forEach(t => {
          const targetData = this.state.verifiedData[t.id];
          if (!targetData) return;

          // Clone polygon feature and append validation metadata
          const f = JSON.parse(JSON.stringify(t.polygonFeature));
          f.properties.validation = {
            centroid_verified: targetData.centroid || false,
            corners_verified: targetData.corners || {},
            munsell: targetData.munsell || null,
            validation_timestamp: new Date().toISOString(),
            fully_validated: this.isTargetVerified(t.id)
          };

          // Append ward properties to exported feature
          f.properties.ward_number = t.wardNumber || null;
          f.properties.district = t.district || null;
          f.properties.province = t.province || null;


          reportFeatures.push(f);
        });

        const report = {
          type: "FeatureCollection",
          name: "LDN Validation Field Report",
          crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
          features: reportFeatures
        };

        // Download file to device
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        
        const dateStr = new Date().toISOString().slice(0,10);
        downloadAnchor.setAttribute("download", `LDN_Validation_Report_${dateStr}.geojson`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      });
    }

    // Active Exercise Change Handler
    const exerciseSelect = document.getElementById('exerciseSelect');
    if (exerciseSelect) {
      exerciseSelect.addEventListener('change', (e) => {
        this.switchExercise(e.target.value);
      });
    }

    // Create New Exercise Button
    const btnNewExercise = document.getElementById('btnNewExercise');
    if (btnNewExercise) {
      btnNewExercise.addEventListener('click', () => {
        const name = prompt("Enter a name for the new exercise / location:");
        if (name) {
          this.createNewExercise(name);
        }
      });
    }

    // Delete Active Exercise Button
    const btnDeleteExercise = document.getElementById('btnDeleteExercise');
    if (btnDeleteExercise) {
      btnDeleteExercise.addEventListener('click', () => {
        this.deleteExercise(this.state.activeExercise);
      });
    }

    // Real-time DMS preview for Add Custom Point Modal
    const addPtLatInput = document.getElementById('addPointInputLat');
    const addPtLngInput = document.getElementById('addPointInputLng');
    const addPtLatDms = document.getElementById('addPointInputLatDMS');
    const addPtLngDms = document.getElementById('addPointInputLngDMS');

    const updateAddPtDMSPreview = () => {
      if (addPtLatInput && addPtLatDms) {
        const val = parseFloat(addPtLatInput.value);
        if (!isNaN(val) && val >= -90 && val <= 90) {
          addPtLatDms.innerText = NavigatorTools.toDMS(val, true);
        } else {
          addPtLatDms.innerText = '';
        }
      }
      if (addPtLngInput && addPtLngDms) {
        const val = parseFloat(addPtLngInput.value);
        if (!isNaN(val) && val >= -180 && val <= 180) {
          addPtLngDms.innerText = NavigatorTools.toDMS(val, false);
        } else {
          addPtLngDms.innerText = '';
        }
      }
    };

    if (addPtLatInput) {
      addPtLatInput.addEventListener('input', updateAddPtDMSPreview);
    }
    if (addPtLngInput) {
      addPtLngInput.addEventListener('input', updateAddPtDMSPreview);
    }

    // Show Add Point Modal Button
    const btnShowAddPointModal = document.getElementById('btnShowAddPointModal');
    if (btnShowAddPointModal) {
      btnShowAddPointModal.addEventListener('click', () => {
        // Prefill default random/incremental ID if empty
        const idInput = document.getElementById('addPointInputId');
        if (idInput && !idInput.value) {
          idInput.value = "target_" + (this.state.targetsList.length + 1);
        }
        document.getElementById('addPointModal').classList.remove('hidden');
        if (addPtLatDms) addPtLatDms.innerText = '';
        if (addPtLngDms) addPtLngDms.innerText = '';
      });
    }

    // Cancel Add Point Button
    const btnCancelAddPoint = document.getElementById('btnCancelAddPoint');
    if (btnCancelAddPoint) {
      btnCancelAddPoint.addEventListener('click', () => {
        document.getElementById('addPointModal').classList.add('hidden');
      });
    }

    // Confirm Add Point Button
    const btnConfirmAddPoint = document.getElementById('btnConfirmAddPoint');
    if (btnConfirmAddPoint) {
      btnConfirmAddPoint.addEventListener('click', () => {
        const id = document.getElementById('addPointInputId').value;
        const lat = document.getElementById('addPointInputLat').value;
        const lng = document.getElementById('addPointInputLng').value;
        const operator = document.getElementById('addPointInputOperator').value;
        const landUse = document.getElementById('addPointInputLandUse').value;
        const transition = document.getElementById('addPointInputTransition').value;

        if (!lat || !lng) {
          alert("Error: Latitude and Longitude coordinates are required.");
          return;
        }

        const success = this.addCustomPoint(id, lat, lng, operator, landUse, transition);
        if (success) {
          // Clear inputs (except operator, for convenience)
          document.getElementById('addPointInputId').value = '';
          document.getElementById('addPointInputLat').value = '';
          document.getElementById('addPointInputLng').value = '';
          if (addPtLatDms) addPtLatDms.innerText = '';
          if (addPtLngDms) addPtLngDms.innerText = '';
          document.getElementById('addPointModal').classList.add('hidden');
        }
      });
    }

    // Import GeoJSON Trigger Button
    const btnTriggerImportGeoJson = document.getElementById('btnTriggerImportGeoJson');
    const importGeoJsonInput = document.getElementById('importGeoJsonInput');
    if (btnTriggerImportGeoJson && importGeoJsonInput) {
      btnTriggerImportGeoJson.addEventListener('click', () => {
        importGeoJsonInput.click();
      });

      importGeoJsonInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          if (ext !== 'geojson' && ext !== 'json') {
            alert('Please select a valid GeoJSON (.geojson) or JSON (.json) file.');
            e.target.value = '';
            return;
          }
          this.importGeoJson(file);
          e.target.value = '';
        }
      });
    }

    // Import KML Trigger Button
    const btnTriggerImportKml = document.getElementById('btnTriggerImportKml');
    const importKmlInput = document.getElementById('importKmlInput');
    if (btnTriggerImportKml && importKmlInput) {
      btnTriggerImportKml.addEventListener('click', () => {
        importKmlInput.click();
      });

      importKmlInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          const file = e.target.files[0];
          const ext = file.name.split('.').pop().toLowerCase();
          if (ext !== 'kml') {
            alert('Please select a valid KML (.kml) file.');
            e.target.value = '';
            return;
          }
          this.importKml(file);
          e.target.value = '';
        }
      });
    }

    // Clear All Targets Button
    const btnClearAllTargets = document.getElementById('btnClearAllTargets');
    if (btnClearAllTargets) {
      btnClearAllTargets.addEventListener('click', () => {
        this.clearAllTargets();
      });
    }

    // Reset Defaults Button
    const btnResetToDefaults = document.getElementById('btnResetToDefaults');
    if (btnResetToDefaults) {
      btnResetToDefaults.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }
  },

  // Sync Data with Server
  async syncWithServer(btnElement) {
    btnElement.disabled = true;
    const originalText = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Fetching from Server...';
    
    // LDN Asset ID = arkt5kjjuCk54d4JKQWxGj
    // Soil Asset ID = ahkCvpctsofMKN4GzCH3BT
    const LDN_URL = 'https://kf.kobotoolbox.org/api/v2/assets/arkt5kjjuCk54d4JKQWxGj/data/?format=json&limit=2000';
    const SOIL_URL = 'https://kf.kobotoolbox.org/api/v2/assets/ahkCvpctsofMKN4GzCH3BT/data/?format=json&limit=2000';
    
    // Base64 encode vegris2020:musasa2020
    const authHeader = 'Basic ' + btoa('vegris2020:musasa2020');

    try {
      // Fetch LDN Validations
      const ldnResponse = await fetch(LDN_URL, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      });

      if (!ldnResponse.ok) {
        throw new Error(`LDN API Error: ${ldnResponse.status} ${ldnResponse.statusText}`);
      }

      const ldnData = await ldnResponse.json();
      console.log('Fetched LDN Data:', ldnData);

      let syncedPoints = 0;

      // Process LDN data. Assuming the form has a field for point ID (e.g. 'point_id', 'id', etc)
      ldnData.results.forEach(submission => {
        // Find point ID (adjust field name based on actual form structure)
        const pointId = submission['point_id'] || submission['id_str'] || submission['point_number']; 
        
        if (pointId) {
          // Initialize tracking if missing
          if (!this.state.verifiedData[pointId]) {
            this.state.verifiedData[pointId] = { centroid: false, corners: {} };
          }
          
          // Mark centroid as true if it's in the LDN validation submissions
          if (!this.state.verifiedData[pointId].centroid) {
            this.state.verifiedData[pointId].centroid = true;
            syncedPoints++;
          }
        }
      });

      // Save locally and update UI
      if (syncedPoints > 0) {
        this.saveLocalProgress();
        this.updateStatsDisplay();
        alert(`Successfully synced! Fetched ${ldnData.results.length} submissions. Updated ${syncedPoints} targets to Validated.`);
      } else {
        alert(`Successfully connected! Fetched ${ldnData.results.length} submissions, but no new points were updated. (Check if point IDs match)`);
      }

    } catch (error) {
      console.error('Server Sync Error:', error);
      alert('Failed to connect to Server. You may need to check your network connection.\\n\\nError: ' + error.message);
    } finally {
      btnElement.disabled = false;
      btnElement.innerHTML = originalText;
    }
  },

  // ==========================================================================
  // Car Locator Operations
  // ==========================================================================
  
  recordCarLocation() {
    if (!this.state.userLocation) {
      alert("GPS location not acquired yet. Please wait for a GPS signal before marking your car.");
      return;
    }
    
    const lat = this.state.userLocation[0];
    const lng = this.state.userLocation[1];
    
    this.state.carLocation = {
      lat,
      lng,
      timestamp: Date.now()
    };
    
    localStorage.setItem('ldn-car-location', JSON.stringify(this.state.carLocation));
    
    // Update map marker
    this.updateCarMarkerOnMap();
    
    // Update UI buttons visibility
    this.updateCarControlsUI();
    
    // Alert user
    alert(`Car location recorded at: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  },

  clearCarLocation() {
    if (confirm("Are you sure you want to clear the parked car location?")) {
      this.state.carLocation = null;
      localStorage.removeItem('ldn-car-location');
      
      // Update map marker
      this.updateCarMarkerOnMap();
      
      // Update UI buttons visibility
      this.updateCarControlsUI();
    }
  },

  loadCarLocation() {
    const raw = localStorage.getItem('ldn-car-location');
    if (raw) {
      try {
        this.state.carLocation = JSON.parse(raw);
        // We'll update the marker once map is initialized
        setTimeout(() => this.updateCarMarkerOnMap(), 1000);
      } catch (e) {
        console.warn('Failed to parse car location:', e);
      }
    }
    this.updateCarControlsUI();
  },

  updateCarMarkerOnMap() {
    if (!this.state.map) return;
    
    // Remove existing car marker if any
    if (this.state.carMarker) {
      this.state.carMarker.remove();
      this.state.carMarker = null;
    }

    if (this.state.carLocation) {
      const latlng = [this.state.carLocation.lat, this.state.carLocation.lng];
      
      // DivIcon for custom HTML marker with car icon
      const carIcon = L.divIcon({
        className: 'car-marker-container',
        html: '<div class="car-marker-bg"><i class="fa-solid fa-car"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      this.state.carMarker = L.marker(latlng, { icon: carIcon })
        .addTo(this.state.map)
        .bindPopup(`
          <div style="font-family: var(--font-display); font-size: 12.5px; color: var(--text-primary); text-align: center; min-width: 130px;">
            <strong style="display: block; margin-bottom: 2px;">🚗 Parked Car</strong>
            <span style="font-size: 10px; color: var(--text-secondary); display: block; margin-bottom: 8px;">
              Saved: ${new Date(this.state.carLocation.timestamp).toLocaleTimeString()}
            </span>
            <button class="action-btn" onclick="App.startCarNavigation();" style="padding: 6px 10px; font-size: 10px; height: auto; width: 100%;">
              Navigate to Car
            </button>
          </div>
        `);
    }
  },

  updateCarControlsUI() {
    const activeActions = document.getElementById('carActiveActions');
    if (activeActions) {
      if (this.state.carLocation) {
        activeActions.classList.remove('hidden');
      } else {
        activeActions.classList.add('hidden');
      }
    }
  },

  startCarNavigation() {
    if (!this.state.carLocation) {
      alert("No car location recorded yet. Mark your car's location before leaving it.");
      return;
    }
    this.state.navigationMode = 'CAR_NAV';
    
    // Set UI Details
    document.getElementById('navTargetId').innerText = `Your Parked Car`;
    document.getElementById('navTargetBadge').innerText = 'CAR NAVIGATION';
    document.getElementById('navTargetBadge').style.background = '#1e3a8a';
    document.getElementById('navTargetBadge').style.color = '#93c5fd';
    
    // Hide standard elements not used in car navigation
    document.getElementById('centroidSuccessPanel').classList.add('hidden');
    document.getElementById('cornerDetailsBox').classList.add('hidden');
    document.getElementById('cornersGridPanel').classList.add('hidden');

    // Show Full Screen Overlay
    document.getElementById('navigationOverlay').classList.remove('hidden');

    // Update coordinates navigation display immediately
    this.updateNavigationMetrics();
  },

  bindCarControls() {
    const recordBtn = document.getElementById('recordCarBtn');
    const navBtn = document.getElementById('navCarBtn');
    const clearBtn = document.getElementById('clearCarBtn');
    
    if (recordBtn) recordBtn.addEventListener('click', () => this.recordCarLocation());
    if (navBtn) navBtn.addEventListener('click', () => this.startCarNavigation());
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearCarLocation());
  },

  // Check if point [lng, lat] is inside a Polygon vs (array of coords [lng, lat])
  isPointInPolygonCoords(point, vs) {
    const x = point[0], y = point[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1];
      const xj = vs[j][0], yj = vs[j][1];
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  },

  // Check if point [lng, lat] is inside a MultiPolygon/Polygon geometry
  isPointInGeometry(point, geometry) {
    if (!geometry) return false;
    if (geometry.type === 'Polygon') {
      return this.isPointInPolygonCoords(point, geometry.coordinates[0]);
    } else if (geometry.type === 'MultiPolygon') {
      for (let i = 0; i < geometry.coordinates.length; i++) {
        // MultiPolygon coordinates structure: [ Polygon [ OuterRing [ Point ] ] ]
        if (this.isPointInPolygonCoords(point, geometry.coordinates[i][0])) {
          return true;
        }
      }
    }
    return false;
  },

  // Load ward boundaries and associate with points
  async loadWardBoundaries() {
    const cachedMapping = localStorage.getItem('ldn-points-wards');
    const cachedGeom = localStorage.getItem('ldn-matched-wards-geojson');

    if (cachedMapping && cachedGeom) {
      console.log('Loading ward boundaries from localStorage cache...');
      try {
        const mapping = JSON.parse(cachedMapping);
        this.state.targetsList.forEach(t => {
          if (mapping[t.id]) {
            t.wardNumber = mapping[t.id].wardNumber;
            t.district = mapping[t.id].district;
            t.province = mapping[t.id].province;
          }
        });

        const wardsGeoJSON = JSON.parse(cachedGeom);
        this.renderWardsLayer(wardsGeoJSON);
        return;
      } catch (err) {
        console.warn('Error parsing cached ward data, recalculating:', err);
      }
    }

    // No cache or corrupted, fetch and process in background
    console.log('No ward cache found. Fetching and processing Wards.geojson in background...');
    try {
      const res = await fetch('./Wards.geojson');
      if (!res.ok) throw new Error('Wards.geojson not found');
      const wardsData = await res.json();
      
      const mapping = {};
      const matchedFeatures = [];
      const matchedWardKeys = new Set();

      wardsData.features.forEach(wardFeature => {
        const props = wardFeature.properties;
        const wardNum = props.wardnumber;
        const district = props.district;
        const province = props.province;
        const wardKey = `${district}_${wardNum}`;

        this.state.targetsList.forEach(t => {
          // target centroid in [lat, lng], polygon needs [lng, lat]
          const pt = [t.centroid[1], t.centroid[0]];
          if (this.isPointInGeometry(pt, wardFeature.geometry)) {
            t.wardNumber = wardNum;
            t.district = district;
            t.province = province;
            
            mapping[t.id] = { wardNumber: wardNum, district, province };

            if (!matchedWardKeys.has(wardKey)) {
              matchedWardKeys.add(wardKey);
              matchedFeatures.push(wardFeature);
            }
          }
        });
      });

      // Save to localStorage
      localStorage.setItem('ldn-points-wards', JSON.stringify(mapping));
      
      const wardsGeoJSON = {
        type: "FeatureCollection",
        features: matchedFeatures
      };
      localStorage.setItem('ldn-matched-wards-geojson', JSON.stringify(wardsGeoJSON));

      console.log(`Processed wards: mapped ${Object.keys(mapping).length} points, extracted ${matchedFeatures.length} ward boundaries.`);

      // Render the ward outlines on map
      this.renderWardsLayer(wardsGeoJSON);

      // Re-render targets list to show distance & updated details
      this.renderTargetsList(false);

      // If active details panel is open, refresh it to show ward number
      if (this.state.selectedTarget) {
        this.selectTargetById(this.state.selectedTarget.id);
      }

    } catch (err) {
      console.error('Failed to load/process Wards.geojson:', err);
    }
  },

  // Render ward boundaries as a light background layer
  renderWardsLayer(geojsonData) {
    if (!this.state.map) return;

    // Remove old layer if exists
    if (this.state.layers.wardsOutline) {
      this.state.map.removeLayer(this.state.layers.wardsOutline);
    }

    this.state.layers.wardsOutline = L.geoJSON(geojsonData, {
      style: {
        color: '#10b981',      // Emerald outline
        weight: 1.5,
        dashArray: '5, 5',     // Light dashed style
        fillColor: '#10b981',
        fillOpacity: 0.03,     // Extremely light so it doesn't clutter/drag
        interactive: false     // Disable clicks on wards to prevent interface drag
      }
    }).addTo(this.state.map);
  }
};

// Initial trigger
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
