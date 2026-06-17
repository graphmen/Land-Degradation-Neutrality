/* ==========================================================================
   LDN Field Validator - Premium Navigator & GPS Tools
   ========================================================================== */

const NavigatorTools = {
  // State
  state: {
    hudActive: false,
    rulerActive: false,
    waypoints: [],
    waypointMarkers: {},
    rulerNodes: [],
    rulerPolyline: null,
    rulerTotalDistance: 0,
    tempTargetMarker: null
  },

  // Initialize Tools
  init() {
    console.log('Initializing Navigator Tools...');

    // Load Custom Waypoints
    this.loadWaypoints();

    // Bind Event Listeners
    this.bindEvents();
  },

  // Bind Event Handlers
  bindEvents() {
    // Map click handling for ruler and waypoint creation
    if (App.state.map) {
      App.state.map.on('click', (e) => {
        if (this.state.rulerActive) {
          this.addRulerNode(e.latlng);
        }
      });

      // Context menu or long press equivalent: double click to drop custom waypoint
      App.state.map.on('dblclick', (e) => {
        // Only trigger waypoint modal if ruler is not active
        if (!this.state.rulerActive) {
          this.showWaypointDialog(e.latlng.lat, e.latlng.lng);
        }
      });
    }

    // Drawer open/close buttons
    const toggleDrawerBtn = document.getElementById('btnMapToolsToggle');
    const closeDrawerBtn = document.getElementById('btnCloseDrawer');
    const drawer = document.getElementById('mapToolsDrawer');

    if (toggleDrawerBtn && drawer) {
      toggleDrawerBtn.addEventListener('click', () => {
        drawer.classList.remove('hidden');
        toggleDrawerBtn.classList.add('hidden');
      });
    }

    if (closeDrawerBtn && drawer) {
      closeDrawerBtn.addEventListener('click', () => {
        drawer.classList.add('hidden');
        if (toggleDrawerBtn) toggleDrawerBtn.classList.remove('hidden');
      });
    }

    // Toggle Panels helper function
    const bindToggle = (btnId, panelId, activeClass, stateProp, onToggle) => {
      const btn = document.getElementById(btnId);
      const panel = document.getElementById(panelId);
      if (!btn) return;

      // If it's a checkbox input
      if (btn.type === 'checkbox') {
        btn.addEventListener('change', () => {
          const isActive = btn.checked;
          if (panel) panel.classList.toggle('hidden', !isActive);
          this.state[stateProp] = isActive;
          if (onToggle) onToggle(isActive);
        });
      } else {
        btn.addEventListener('click', () => {
          const isActive = btn.classList.toggle(activeClass);
          if (panel) panel.classList.toggle('hidden', !isActive);
          this.state[stateProp] = isActive;
          if (onToggle) onToggle(isActive);
        });
      }
    };

    // Tools toggle checkboxes inside tools drawer
    bindToggle('switchGpsHud', 'gpsHudPanel', 'active', 'hudActive', (active) => {
      if (active) this.updateGpsHud();
    });

    bindToggle('switchWaypoints', 'waypointsPanel', 'active', 'waypointsActive', (active) => {
      if (active) this.renderWaypointsList();
    });

    bindToggle('switchRuler', 'rulerPanel', 'active', 'rulerActive', (active) => {
      if (!active) this.clearRuler();
    });

    bindToggle('switchCarLocator', 'carLocatorSubPanel', 'active', 'carLocatorActive');

    // Go-to Coord Modal triggers
    const gotoBtn = document.getElementById('switchGoto');
    const gotoLatInput = document.getElementById('gotoInputLat');
    const gotoLngInput = document.getElementById('gotoInputLng');
    const gotoLatDmsPreview = document.getElementById('gotoInputLatDMS');
    const gotoLngDmsPreview = document.getElementById('gotoInputLngDMS');

    const updateGotoDMSPreview = () => {
      if (gotoLatInput && gotoLatDmsPreview) {
        const val = parseFloat(gotoLatInput.value);
        if (!isNaN(val) && val >= -90 && val <= 90) {
          gotoLatDmsPreview.innerText = this.toDMS(val, true);
        } else {
          gotoLatDmsPreview.innerText = '';
        }
      }
      if (gotoLngInput && gotoLngDmsPreview) {
        const val = parseFloat(gotoLngInput.value);
        if (!isNaN(val) && val >= -180 && val <= 180) {
          gotoLngDmsPreview.innerText = this.toDMS(val, false);
        } else {
          gotoLngDmsPreview.innerText = '';
        }
      }
    };

    if (gotoBtn) {
      gotoBtn.addEventListener('click', () => {
        document.getElementById('gotoModal').classList.remove('hidden');
        if (gotoLatDmsPreview) gotoLatDmsPreview.innerText = '';
        if (gotoLngDmsPreview) gotoLngDmsPreview.innerText = '';
      });
    }

    if (gotoLatInput) {
      gotoLatInput.addEventListener('input', updateGotoDMSPreview);
    }
    if (gotoLngInput) {
      gotoLngInput.addEventListener('input', updateGotoDMSPreview);
    }

    const cancelGoto = document.getElementById('btnCancelGoto');
    if (cancelGoto) {
      cancelGoto.addEventListener('click', () => {
        document.getElementById('gotoModal').classList.add('hidden');
      });
    }

    const confirmGoto = document.getElementById('btnConfirmGoto');
    if (confirmGoto) {
      confirmGoto.addEventListener('click', () => {
        this.executeGoToCoordinates();
      });
    }

    // Waypoint UI Triggers
    const addWpBtn = document.getElementById('btnAddWaypointCurrent');
    if (addWpBtn) {
      addWpBtn.addEventListener('click', () => {
        if (!App.state.userLocation) {
          alert('GPS location not acquired yet. Stand in a clear area to log coordinates.');
          return;
        }
        this.showWaypointDialog(App.state.userLocation[0], App.state.userLocation[1]);
      });
    }

    const saveWpBtn = document.getElementById('btnSaveWaypoint');
    if (saveWpBtn) {
      saveWpBtn.addEventListener('click', () => this.saveWaypointFromDialog());
    }

    const cancelWpBtn = document.getElementById('btnCancelWaypoint');
    if (cancelWpBtn) {
      cancelWpBtn.addEventListener('click', () => {
        document.getElementById('waypointModal').classList.add('hidden');
      });
    }

    // Ruler Clear Trigger
    const clearRulerBtn = document.getElementById('btnClearRuler');
    if (clearRulerBtn) {
      clearRulerBtn.addEventListener('click', () => this.clearRuler());
    }

    // Roads Layer toggle switch (map drawer)
    const roadsSwitch = document.getElementById('switchRoadsLayer');
    if (roadsSwitch) {
      roadsSwitch.addEventListener('change', async () => {
        const map = App.state.map;
        if (!map) return;

        if (roadsSwitch.checked) {
          if (App.state.roadsLayer) {
            if (map.getZoom() >= 12) {
              App.state.roadsLayer.addTo(map);
            }
            // Also sync toggle button in UI if it exists
            const btn = document.getElementById('toggleRoadsBtn');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Roads Layer';
          } else {
            if (OfflineManager.roadsGeoJSON) {
              OfflineManager.renderRoadsLayer(OfflineManager.roadsGeoJSON, true);
              const btn = document.getElementById('toggleRoadsBtn');
              if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Roads Layer';
            } else {
              roadsSwitch.disabled = true;
              const success = await OfflineManager.loadCachedRoads(true);
              roadsSwitch.disabled = false;
              if (success) {
                const btn = document.getElementById('toggleRoadsBtn');
                if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Roads Layer';
              } else {
                alert('ℹ️ No roads downloaded or preloaded yet.\n\nGo to Offline tab → Download Roads & Tracks first.');
                roadsSwitch.checked = false;
              }
            }
          }
        } else {
          if (App.state.roadsLayer && map.hasLayer(App.state.roadsLayer)) {
            map.removeLayer(App.state.roadsLayer);
            const btn = document.getElementById('toggleRoadsBtn');
            if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show Roads Layer';
          }
        }
      });
    }

    // Collapsible Legend inside drawer
    const legendToggleBtn = document.getElementById('legendToggleBtn');
    const legendBody = document.getElementById('drawerLegendBody');
    const legendChevron = document.getElementById('legendChevronInner');
    if (legendToggleBtn && legendBody) {
      legendToggleBtn.addEventListener('click', () => {
        const collapsed = legendBody.classList.toggle('collapsed');
        if (legendChevron) {
          legendChevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        }
      });
    }

    // Close button — GPS HUD
    const closeHudBtn = document.getElementById('btnCloseGpsHud');
    if (closeHudBtn) {
      closeHudBtn.addEventListener('click', () => {
        document.getElementById('gpsHudPanel').classList.add('hidden');
        const sw = document.getElementById('switchGpsHud');
        if (sw) sw.checked = false;
        this.state.hudActive = false;
      });
    }

    // Close button — Waypoints
    const closeWpBtn = document.getElementById('btnCloseWaypoints');
    if (closeWpBtn) {
      closeWpBtn.addEventListener('click', () => {
        document.getElementById('waypointsPanel').classList.add('hidden');
        const sw = document.getElementById('switchWaypoints');
        if (sw) sw.checked = false;
        this.state.waypointsActive = false;
      });
    }

    // Close button — Ruler
    const closeRulerBtn = document.getElementById('btnCloseRuler');
    if (closeRulerBtn) {
      closeRulerBtn.addEventListener('click', () => {
        document.getElementById('rulerPanel').classList.add('hidden');
        const sw = document.getElementById('switchRuler');
        if (sw) sw.checked = false;
        this.state.rulerActive = false;
        this.clearRuler();
      });
    }
  },

  // Convert Degrees to DMS format
  toDMS(degrees, isLat) {
    const absolute = Math.abs(degrees);
    const d = Math.floor(absolute);
    const minutesNotTruncated = (absolute - d) * 60;
    const m = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - m) * 60).toFixed(1);
    const direction = degrees >= 0
      ? (isLat ? 'N' : 'E')
      : (isLat ? 'S' : 'W');
    return `${d}° ${m}′ ${seconds}″ ${direction}`;
  },

  // Update GPS HUD values in real-time
  updateGpsHud(position) {
    if (!this.state.hudActive) return;

    const loc = App.state.userLocation;
    if (!loc) {
      document.getElementById('hudCoordsDD').innerText = 'Acquiring GPS...';
      document.getElementById('hudCoordsDMS').innerText = '';
      return;
    }

    // Lat/Lng displays
    const lat = loc[0];
    const lng = loc[1];
    document.getElementById('hudCoordsDD').innerText = `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
    document.getElementById('hudCoordsDMS').innerText = `${this.toDMS(lat, true)} | ${this.toDMS(lng, false)}`;

    // Accuracy
    document.getElementById('hudAccuracy').innerText = App.state.userAccuracy
      ? `± ${App.state.userAccuracy.toFixed(1)} m`
      : '--';

    // Speed & Altitude (if provided by position device hardware)
    if (position && position.coords) {
      const speed = position.coords.speed; // meters per second
      const speedKmh = speed !== null && speed > 0 ? (speed * 3.6).toFixed(1) : '0.0';
      document.getElementById('hudSpeed').innerText = `${speedKmh} km/h`;

      const alt = position.coords.altitude;
      document.getElementById('hudAltitude').innerText = alt !== null ? `${alt.toFixed(1)} m` : '--';
    } else {
      document.getElementById('hudSpeed').innerText = '0.0 km/h';
      document.getElementById('hudAltitude').innerText = '--';
    }

    // Heading
    const heading = NavigationEngine.deviceHeading;
    if (heading !== null && heading >= 0) {
      const cardinal = NavigationEngine.getCardinal(heading);
      document.getElementById('hudHeading').innerText = `${Math.round(heading)}° (${cardinal})`;
    } else {
      document.getElementById('hudHeading').innerText = '--';
    }
  },

  // ── WAYPOINT MANAGER ─────────────────────────────────────
  loadWaypoints() {
    const raw = localStorage.getItem('ldn-waypoints');
    this.state.waypoints = raw ? JSON.parse(raw) : [];

    // Draw all waypoints on map
    this.state.waypoints.forEach(wp => this.drawWaypointMarkerOnMap(wp));
  },

  saveWaypoints() {
    localStorage.setItem('ldn-waypoints', JSON.stringify(this.state.waypoints));
    this.renderWaypointsList();
  },

  showWaypointDialog(lat, lng) {
    document.getElementById('wpInputLat').value = lat.toFixed(6);
    document.getElementById('wpInputLng').value = lng.toFixed(6);
    document.getElementById('wpInputName').value = `Waypoint #${this.state.waypoints.length + 1}`;
    document.getElementById('wpInputNotes').value = '';

    document.getElementById('waypointModal').classList.remove('hidden');
  },

  saveWaypointFromDialog() {
    const name = document.getElementById('wpInputName').value.trim();
    const lat = parseFloat(document.getElementById('wpInputLat').value);
    const lng = parseFloat(document.getElementById('wpInputLng').value);
    const notes = document.getElementById('wpInputNotes').value.trim();

    if (!name || isNaN(lat) || isNaN(lng)) {
      alert('Please provide valid name and coordinates.');
      return;
    }

    const wp = {
      id: 'wp_' + Date.now(),
      name,
      lat,
      lng,
      notes,
      timestamp: Date.now()
    };

    this.state.waypoints.push(wp);
    this.drawWaypointMarkerOnMap(wp);
    this.saveWaypoints();

    document.getElementById('waypointModal').classList.add('hidden');
  },

  drawWaypointMarkerOnMap(wp) {
    if (!App.state.map) return;

    // Use a custom blue/cyan star marker for custom waypoints
    const wpIcon = L.divIcon({
      className: 'custom-wp-marker-container',
      html: `<div class="wp-star-dot"><i class="fa-solid fa-diamond"></i></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([wp.lat, wp.lng], { icon: wpIcon })
      .addTo(App.state.map)
      .bindPopup(`
        <div style="font-family: var(--font-display); font-size: 12px; color: var(--text-primary); min-width: 140px;">
          <strong style="color: var(--emerald-light); font-size:13px;"><i class="fa-solid fa-diamond"></i> ${wp.name}</strong>
          ${wp.notes ? `<p style="font-size: 10px; color: var(--text-secondary); margin: 4px 0 8px 0;">${wp.notes}</p>` : `<div style="height:6px;"></div>`}
          <div style="display:flex; gap:6px;">
            <button class="action-btn" onclick="NavigatorTools.startWaypointNav('${wp.id}')" style="flex:1; padding: 5px; font-size: 9px; height:auto;">Navigate</button>
            <button class="action-btn danger-btn" onclick="NavigatorTools.deleteWaypoint('${wp.id}')" style="padding: 5px 8px; font-size: 9px; height:auto; background:#ef4444;"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `);

    this.state.waypointMarkers[wp.id] = marker;
  },

  deleteWaypoint(id) {
    // Remove marker from map
    if (this.state.waypointMarkers[id]) {
      App.state.map.removeLayer(this.state.waypointMarkers[id]);
      delete this.state.waypointMarkers[id];
    }

    // Remove from array
    this.state.waypoints = this.state.waypoints.filter(wp => wp.id !== id);
    this.saveWaypoints();

    // Reset navigation if actively navigating to this deleted waypoint
    if (App.state.navigationMode === 'WAYPOINT_NAV' && App.state.activeWaypoint && App.state.activeWaypoint.id === id) {
      App.state.navigationMode = 'IDLE';
      document.getElementById('navigationOverlay').classList.add('hidden');
    }
  },

  startWaypointNav(id) {
    const wp = this.state.waypoints.find(w => w.id === id);
    if (!wp) return;

    App.state.navigationMode = 'WAYPOINT_NAV';
    App.state.activeWaypoint = wp;

    // Set UI Details
    document.getElementById('navTargetId').innerText = wp.name;
    document.getElementById('navTargetBadge').innerText = 'WAYPOINT NAVIGATION';
    document.getElementById('navTargetBadge').style.background = '#0284c7'; // Sky blue for waypoints
    document.getElementById('navTargetBadge').style.color = '#f0f9ff';

    // Hide standard elements not used in custom waypoint navigation
    document.getElementById('centroidSuccessPanel').classList.add('hidden');
    document.getElementById('cornerDetailsBox').classList.add('hidden');
    document.getElementById('cornersGridPanel').classList.add('hidden');

    // Close map popups
    App.state.map.closePopup();

    // Show Full Screen Overlay
    document.getElementById('navigationOverlay').classList.remove('hidden');

    // Update coordinates immediately
    App.updateNavigationMetrics();
  },

  renderWaypointsList() {
    const container = document.getElementById('waypointsListContainer');
    if (!container) return;

    if (this.state.waypoints.length === 0) {
      container.innerHTML = `
        <p style="font-size:11px; text-align:center; color: var(--text-secondary); padding: 12px 0;">
          No waypoints logged. Double-click the map or tap the button above to add.
        </p>
      `;
      return;
    }

    container.innerHTML = this.state.waypoints.map(wp => {
      return `
        <div class="waypoint-list-item glass-panel" style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; margin-bottom:6px; border: var(--emerald-glass-border);">
          <div style="flex:1; display:flex; flex-direction:column; gap:2px; max-width: 65%;">
            <span style="font-size:12px; font-weight:600; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${wp.name}</span>
            <span style="font-size:9px; color:var(--text-secondary); font-family:var(--font-mono);">${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="action-btn" onclick="NavigatorTools.startWaypointNav('${wp.id}')" style="padding: 6px 10px; font-size: 10px; height:auto; width:auto; border-radius:4px;"><i class="fa-solid fa-location-arrow"></i></button>
            <button class="action-btn danger-btn" onclick="NavigatorTools.deleteWaypoint('${wp.id}')" style="padding: 6px 8px; font-size: 10px; height:auto; width:auto; border-radius:4px; background:#dc2626;"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ── GEODESIC RULER (MEASURE TOOL) ────────────────────────
  addRulerNode(latlng) {
    if (!App.state.map) return;

    // Drop node marker
    const nodeIcon = L.divIcon({
      className: 'ruler-node-container',
      html: `<div class="ruler-dot"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const marker = L.marker(latlng, { icon: nodeIcon }).addTo(App.state.map);
    this.state.rulerNodes.push(marker);

    const count = this.state.rulerNodes.length;

    // Recalculate Polyline
    const pathCoords = this.state.rulerNodes.map(m => m.getLatLng());

    if (this.state.rulerPolyline) {
      this.state.rulerPolyline.setLatLngs(pathCoords);
    } else {
      this.state.rulerPolyline = L.polyline(pathCoords, {
        color: '#c0ff00', // Yellow line for ruler
        weight: 3,
        opacity: 0.9,
        dashArray: '4, 4'
      }).addTo(App.state.map);
    }

    // Add segment distance
    if (count > 1) {
      const prevLatLng = this.state.rulerNodes[count - 2].getLatLng();
      const segmentDistance = NavigationEngine.calculateDistance(
        prevLatLng.lat, prevLatLng.lng,
        latlng.lat, latlng.lng
      );
      this.state.rulerTotalDistance += segmentDistance;
    }

    // Update Display Card
    const totalDist = this.state.rulerTotalDistance;
    const distText = totalDist >= 1000
      ? `${(totalDist / 1000).toFixed(2)} km`
      : `${Math.round(totalDist)} m`;

    document.getElementById('rulerDistValue').innerText = distText;
    document.getElementById('rulerNodesCount').innerText = `${count} nodes`;
  },

  clearRuler() {
    if (App.state.map) {
      // Remove all node markers
      this.state.rulerNodes.forEach(m => App.state.map.removeLayer(m));
      this.state.rulerNodes = [];

      // Remove Polyline
      if (this.state.rulerPolyline) {
        App.state.map.removeLayer(this.state.rulerPolyline);
        this.state.rulerPolyline = null;
      }
    }

    this.state.rulerTotalDistance = 0;
    document.getElementById('rulerDistValue').innerText = '0 m';
    document.getElementById('rulerNodesCount').innerText = '0 nodes';
  },

  // ── GO TO COORDINATES ────────────────────────────────────
  executeGoToCoordinates() {
    const latVal = parseFloat(document.getElementById('gotoInputLat').value);
    const lngVal = parseFloat(document.getElementById('gotoInputLng').value);

    if (isNaN(latVal) || isNaN(lngVal) || latVal < -90 || latVal > 90 || lngVal < -180 || lngVal > 180) {
      alert('Please enter valid Latitude (-90 to 90) and Longitude (-180 to 180).');
      return;
    }

    // Zimbabwe Bounds check
    const isInsideZim = (latVal >= -22.8 && latVal <= -15.0 && lngVal >= 25.0 && lngVal <= 33.5);
    if (!isInsideZim) {
      const proceed = confirm(`Warning: The coordinates you entered (${latVal.toFixed(6)}, ${lngVal.toFixed(6)}) lie outside the boundaries of Zimbabwe (Latitude: -22.8 to -15.0, Longitude: 25.0 to 33.5).\n\nDo you want to proceed anyway?`);
      if (!proceed) return;
    }

    // Proximity check (within 5 meters of existing targets)
    if (App.state.targetsList && App.state.targetsList.length > 0) {
      let closestTarget = null;
      let minDistance = Infinity;

      App.state.targetsList.forEach(t => {
        if (t.centroid && t.centroid.length === 2) {
          const dist = NavigationEngine.calculateDistance(latVal, lngVal, t.centroid[0], t.centroid[1]);
          if (dist < minDistance) {
            minDistance = dist;
            closestTarget = t;
          }
        }
      });

      if (minDistance <= 5.0) {
        const proceed = confirm(`Warning: The target coordinate is within ${minDistance.toFixed(2)} meters of an existing target point (ID: "${closestTarget.id}").\n\nDo you want to navigate there anyway?`);
        if (!proceed) return;
      }
    }

    // Hide Modal
    document.getElementById('gotoModal').classList.add('hidden');

    if (!App.state.map) return;

    // Remove old target marker if exists
    if (this.state.tempTargetMarker) {
      App.state.map.removeLayer(this.state.tempTargetMarker);
    }

    // Draw temporary search target marker (Magenta/Fuchsia icon)
    const searchIcon = L.divIcon({
      className: 'custom-wp-marker-container search-target',
      html: `<div class="wp-star-dot search-target"><i class="fa-solid fa-bullseye"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    this.state.tempTargetMarker = L.marker([latVal, lngVal], { icon: searchIcon })
      .addTo(App.state.map)
      .bindPopup(`
        <div style="font-family: var(--font-display); font-size: 12px; color: var(--text-primary); text-align:center;">
          <strong style="color: #f43f5e;">Target Coordinate</strong><br/>
          <span style="font-size:10px; font-family:var(--font-mono);">${latVal.toFixed(6)}, ${lngVal.toFixed(6)}</span><br/>
          <button class="action-btn" onclick="NavigatorTools.startGoToNav(${latVal}, ${lngVal})" style="padding: 5px 10px; font-size: 9px; height:auto; margin-top:6px; width:100%;">Navigate Here</button>
        </div>
      `);

    // Center map on coordinates
    App.state.map.setView([latVal, lngVal], 15);
    this.state.tempTargetMarker.openPopup();
  },

  startGoToNav(lat, lng) {
    App.state.navigationMode = 'COORD_NAV';
    App.state.activeCoord = { lat, lng };

    // Set UI Details
    document.getElementById('navTargetId').innerText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    document.getElementById('navTargetBadge').innerText = 'COORDINATE NAVIGATION';
    document.getElementById('navTargetBadge').style.background = '#db2777'; // Pink/Magenta for coords
    document.getElementById('navTargetBadge').style.color = '#fdf2f8';

    // Hide standard elements not used in coordinate navigation
    document.getElementById('centroidSuccessPanel').classList.add('hidden');
    document.getElementById('cornerDetailsBox').classList.add('hidden');
    document.getElementById('cornersGridPanel').classList.add('hidden');

    // Close popups
    App.state.map.closePopup();

    // Show Full Screen Overlay
    document.getElementById('navigationOverlay').classList.remove('hidden');

    // Update coordinates immediately
    App.updateNavigationMetrics();
  }
};
