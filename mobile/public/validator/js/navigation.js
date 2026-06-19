/* ==========================================================================
   LDN Field Validator - Navigation, Geodesics & Polygon Analysis Engine
   ========================================================================== */

const NavigationEngine = {
  // Compute distance between two coordinates in meters (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's mean radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Compute absolute bearing from point 1 to point 2 in degrees (0 = North, 90 = East, etc.)
  calculateBearing(lat1, lon1, lat2, lon2) {
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const dLonRad = (lon2 - lon1) * Math.PI / 180;

    const y = Math.sin(dLonRad) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLonRad);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  },

  // Calculate destination coordinate given start lat/lng, distance in meters, and bearing in degrees
  calculateDestinationPoint(lat, lng, d, bearing) {
    const R = 6371000; // Earth's mean radius in meters
    const brng = bearing * Math.PI / 180;
    const lat1 = lat * Math.PI / 180;
    const lon1 = lng * Math.PI / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng)
    );
    const lon2 = lon1 + Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      lat: lat2 * 180 / Math.PI,
      lng: ((lon2 * 180 / Math.PI + 540) % 360) - 180
    };
  },

  // Get cardinal direction string from bearing angle
  getCardinal(bearing) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(bearing / 22.5) % 16;
    return directions[idx];
  },

  // Extract the 4 corner points of a MultiPolygon feature and label them NW, NE, SE, SW
  extractAndClassifyCorners(polygonFeature) {
    let coordinates = [];

    // Parse coordinates based on GeoJSON MultiPolygon or Polygon structure
    if (polygonFeature.geometry.type === 'MultiPolygon') {
      // coordinates structure: [ MultiPolygon [ Polygon [ OuterRing [ Point [lng, lat] ] ] ] ]
      coordinates = polygonFeature.geometry.coordinates[0][0];
    } else if (polygonFeature.geometry.type === 'Polygon') {
      coordinates = polygonFeature.geometry.coordinates[0];
    }

    if (!coordinates || coordinates.length < 4) {
      console.warn('Invalid polygon coordinates for corner extraction', polygonFeature);
      return [];
    }

    // Centroid of the polygon
    const cLng = polygonFeature.properties.location_x;
    const cLat = polygonFeature.properties.location_y;

    // Filter out collinear or duplicate closing points
    // A standard grid cell has exactly 4 distinct corner points
    const uniquePoints = [];
    const seenKeys = new Set();

    coordinates.forEach(coord => {
      const lng = coord[0];
      const lat = coord[1];
      // Keep unique up to 5 decimal places (~1 meter)
      const key = `${lng.toFixed(5)},${lat.toFixed(5)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniquePoints.push({ lng, lat });
      }
    });

    // If there are more/fewer than 4, let's select the 4 extreme nodes
    // NW, NE, SE, SW based on distances to relative boxes
    const corners = {
      NW: null,
      NE: null,
      SE: null,
      SW: null
    };

    // Simple classification:
    // NW: lat > centroid, lng < centroid
    // NE: lat > centroid, lng > centroid
    // SE: lat < centroid, lng > centroid
    // SW: lat < centroid, lng < centroid
    uniquePoints.forEach(pt => {
      const isNorth = pt.lat >= cLat;
      const isEast = pt.lng >= cLng;

      if (isNorth && !isEast) corners.NW = pt;
      else if (isNorth && isEast) corners.NE = pt;
      else if (!isNorth && isEast) corners.SE = pt;
      else if (!isNorth && !isEast) corners.SW = pt;
    });

    // Fallback if some grid cells are slightly rotated and don't fit the simple quadrant rule
    // We sort the points by polar angle relative to the centroid
    if (!corners.NW || !corners.NE || !corners.SE || !corners.SW) {
      const sortedByAngle = uniquePoints
        .map(pt => {
          const angle = Math.atan2(pt.lat - cLat, pt.lng - cLng); // -PI to PI
          return { ...pt, angle };
        })
        .sort((a, b) => a.angle - b.angle); // Counter-clockwise starting from East

      // Angle ranges:
      // ~ -135deg (-2.3 rad) is SW
      // ~ -45deg (-0.7 rad) is SE
      // ~ 45deg (0.7 rad) is NE
      // ~ 135deg (2.3 rad) is NW
      // Sort and assign based on index:
      if (sortedByAngle.length >= 4) {
        corners.SE = sortedByAngle[0]; // ~ -45 deg
        corners.NE = sortedByAngle[1]; // ~ 45 deg
        corners.NW = sortedByAngle[2]; // ~ 135 deg
        corners.SW = sortedByAngle[3]; // ~ -135 deg (around Math.PI / -Math.PI)
      }
    }

    const processCorner = (code, pt, fallbackLat, fallbackLng) => {
      const lat = pt ? pt.lat : fallbackLat;
      const lng = pt ? pt.lng : fallbackLng;
      // Calculate bearing from corner to centroid
      const bearing = this.calculateBearing(lat, lng, cLat, cLng);
      // Offset by 10 meters towards center
      const dest = this.calculateDestinationPoint(lat, lng, 10, bearing);
      return {
        name: `${code} Corner Beacon`,
        code,
        lat,
        lng,
        navLat: dest.lat,
        navLng: dest.lng
      };
    };

    return [
      processCorner('NW', corners.NW, cLat + 0.0003, cLng - 0.0003),
      processCorner('NE', corners.NE, cLat + 0.0003, cLng + 0.0003),
      processCorner('SE', corners.SE, cLat - 0.0003, cLng + 0.0003),
      processCorner('SW', corners.SW, cLat - 0.0003, cLng - 0.0003)
    ];
  },

  // Setup Device Orientation Compass Sensor
  deviceHeading: 0,
  orientationSupported: false,

  initCompassSensor(onHeadingUpdate) {
    const handleOrientation = (event) => {
      this.orientationSupported = true;
      let heading = null;

      // iOS Webkit Compass Heading (true north, extremely stable)
      if (event.webkitCompassHeading !== undefined) {
        heading = event.webkitCompassHeading;
      } 
      // Standard Android Absolute Heading
      else if (event.alpha !== undefined) {
        // Absolute: true if orientation is relative to Earth's coordinate system
        if (event.absolute) {
          heading = 360 - event.alpha; // Convert counter-clockwise alpha to clockwise heading
        } else {
          heading = 360 - event.alpha;
        }
      }

      if (heading !== null) {
        this.deviceHeading = heading;
        onHeadingUpdate(heading);
      }
    };

    // Request permissions for iOS 13+ device orientation
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      DeviceOrientationEvent.requestPermission()
        .then(response => {
          if (response === 'granted') {
            window.addEventListener('deviceorientationabsolute', handleOrientation, true);
            window.addEventListener('deviceorientation', handleOrientation, true);
          } else {
            console.warn('Compass DeviceOrientation permission denied.');
            // Fallback: listen anyway
            window.addEventListener('deviceorientation', handleOrientation, true);
          }
        })
        .catch(err => console.error('DeviceOrientation permission request error:', err));
    } else {
      // Standard listener (Android, desktop, older iOS)
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }
};

// ==========================================================================
// MinHeap - Priority Queue for fast A* pathfinding
// ==========================================================================
class MinHeap {
  constructor() { this.data = []; }
  push(item) {
    this.data.push(item);
    this.up(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0) return null;
    const top = this.data[0];
    const bottom = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.down(0);
    }
    return top;
  }
  up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].f <= this.data[i].f) break;
      const tmp = this.data[p]; this.data[p] = this.data[i]; this.data[i] = tmp;
      i = p;
    }
  }
  down(i) {
    const len = this.data.length;
    while ((i << 1) + 1 < len) {
      let left = (i << 1) + 1;
      let right = left + 1;
      let best = (right < len && this.data[right].f < this.data[left].f) ? right : left;
      if (this.data[i].f <= this.data[best].f) break;
      const tmp = this.data[i]; this.data[i] = this.data[best]; this.data[best] = tmp;
      i = best;
    }
  }
}

// ==========================================================================
// RoadRouter - Offline Road Graph Builder & A* Route Finder
// ==========================================================================
const RoadRouter = {
  graph: {}, // Map of key -> array of { to: key, dist: meters, highway: string }
  coordsMap: {}, // Map of key -> [lng, lat]
  grid: {}, // Spatial grid index: Map of "gridX,gridY" -> Array of keys
  cellSize: 0.05, // Grid size in degrees (~5.5km)
  isReady: false,

  // ==========================================================================
  // Road Priority Weights
  // Lower number = better road = preferred when far from destination.
  // In "far mode" (>2 km away), minor roads get a cost multiplier so that
  // A* strongly prefers motorways / trunk / primary / secondary roads.
  // ==========================================================================
  HIGHWAY_WEIGHTS: {
    motorway:      1.0,  // Best – major highway
    motorway_link: 1.0,
    trunk:         1.0,  // Trunk road
    trunk_link:    1.0,
    primary:       1.1,  // Primary road
    primary_link:  1.1,
    secondary:     1.2,  // Secondary road
    secondary_link:1.2,
    tertiary:      1.5,  // Tertiary road (small)
    tertiary_link: 1.5,
    unclassified:  2.0,  // Unclassified
    road:          2.0,
    residential:   2.5,  // Residential street
    living_street: 2.5,
    service:       3.0,  // Service road
    track:         3.5,  // Dirt track
    path:          4.0,  // Footpath / cycle path
    footway:       4.0,
    bridleway:     4.0,
    pedestrian:    4.0,
    cycleway:      3.5,
    unknown:       2.5
  },

  getHighwayWeight(highway, farMode) {
    const w = this.HIGHWAY_WEIGHTS[highway] || this.HIGHWAY_WEIGHTS.unknown;
    // In far mode apply the full penalty; within 2 km all weights collapse to 1
    return farMode ? w : 1.0;
  },

  buildGraph(geojson) {
    console.log("Building routing graph from preloaded roads...");
    const start = Date.now();
    this.graph = {};
    this.coordsMap = {};
    this.grid = {};

    if (!geojson || !geojson.features) {
      console.warn("No features found in roads geojson");
      return;
    }

    geojson.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;

      // Read highway type from feature properties (set by overpassToGeoJSON)
      const highway = (feature.properties && feature.properties.highway) ? feature.properties.highway : 'unknown';

      for (let i = 0; i < coords.length - 1; i++) {
        const c1 = coords[i];
        const c2 = coords[i+1];

        // Format to 5 decimals (~1.1 meter accuracy, avoids floating point duplicates)
        const key1 = `${c1[0].toFixed(5)},${c1[1].toFixed(5)}`;
        const key2 = `${c2[0].toFixed(5)},${c2[1].toFixed(5)}`;

        // Calculate Haversine distance
        const dist = NavigationEngine.calculateDistance(c1[1], c1[0], c2[1], c2[0]);

        if (!this.graph[key1]) this.graph[key1] = [];
        if (!this.graph[key2]) this.graph[key2] = [];

        // Store highway type alongside the edge so A* can weight it
        this.graph[key1].push({ to: key2, dist: dist, highway });
        this.graph[key2].push({ to: key1, dist: dist, highway });

        this.coordsMap[key1] = c1;
        this.coordsMap[key2] = c2;
      }
    });

    // Populate grid index from coordsMap
    for (const key in this.coordsMap) {
      const c = this.coordsMap[key];
      const lng = c[0];
      const lat = c[1];
      const gridX = Math.floor(lng / this.cellSize);
      const gridY = Math.floor(lat / this.cellSize);
      const gridKey = `${gridX},${gridY}`;
      if (!this.grid[gridKey]) {
        this.grid[gridKey] = [];
      }
      this.grid[gridKey].push(key);
    }

    this.isReady = true;
    console.log(`Graph successfully built in ${Date.now() - start}ms. Total nodes: ${Object.keys(this.graph).length}`);
  },

  // Helper to find the closest road node to a coordinates point (snaps within maxDistance meters)
  findClosestNode(lat, lng, maxDistanceMeters = 8000) {
    if (lat === undefined || lat === null || isNaN(lat) || lng === undefined || lng === null || isNaN(lng)) {
      return null;
    }

    let closestKey = null;
    let minDist = Infinity;

    // Fallback to exhaustive search if grid is empty or not built
    if (!this.grid || Object.keys(this.grid).length === 0) {
      for (const key in this.coordsMap) {
        const c = this.coordsMap[key];
        const dist = NavigationEngine.calculateDistance(lat, lng, c[1], c[0]);
        if (dist < minDist) {
          minDist = dist;
          closestKey = key;
        }
      }
    } else {
      const latRad = lat * Math.PI / 180;
      const metersPerDegreeLat = 111320;
      const metersPerDegreeLng = 111320 * Math.max(0.1, Math.cos(latRad));

      const cellRadiusLat = Math.min(10, Math.max(1, Math.ceil(maxDistanceMeters / (metersPerDegreeLat * this.cellSize))));
      const cellRadiusLng = Math.min(10, Math.max(1, Math.ceil(maxDistanceMeters / (metersPerDegreeLng * this.cellSize))));

      const qX = Math.floor(lng / this.cellSize);
      const qY = Math.floor(lat / this.cellSize);

      for (let x = qX - cellRadiusLng; x <= qX + cellRadiusLng; x++) {
        for (let y = qY - cellRadiusLat; y <= qY + cellRadiusLat; y++) {
          const gridKey = `${x},${y}`;
          const keysInCell = this.grid[gridKey];
          if (!keysInCell) continue;

          for (let i = 0; i < keysInCell.length; i++) {
            const key = keysInCell[i];
            const c = this.coordsMap[key];
            const dist = NavigationEngine.calculateDistance(lat, lng, c[1], c[0]);
            if (dist < minDist) {
              minDist = dist;
              closestKey = key;
            }
          }
        }
      }
    }

    if (minDist <= maxDistanceMeters) {
      return { key: closestKey, dist: minDist, coords: this.coordsMap[closestKey] };
    }
    return null;
  },

  // High-performance A* routing algorithm
  // farMode: when true (user is >2 km from destination), minor roads are penalised
  // so the router prefers main roads for the bulk of the journey.
  findRoute(startLat, startLng, endLat, endLng, farMode = false) {
    if (!this.isReady || Object.keys(this.graph).length === 0) return null;

    // Find closest nodes in road graph to user and target
    const startNode = this.findClosestNode(startLat, startLng);
    const endNode = this.findClosestNode(endLat, endLng);

    // If either point is too far from any road, fall back to straight line
    if (!startNode || !endNode) {
      return null;
    }

    const startKey = startNode.key;
    const endKey = endNode.key;

    // A* algorithm using MinHeap
    const gScore = {}; // Cost from start along best path
    const fScore = {}; // Estimated total cost (g + h)
    const cameFrom = {};
    const visited = new Set();
    const openSet = new MinHeap();

    gScore[startKey] = 0;
    fScore[startKey] = NavigationEngine.calculateDistance(
      startNode.coords[1], startNode.coords[0],
      endNode.coords[1], endNode.coords[0]
    );

    openSet.push({ key: startKey, f: fScore[startKey] });

    let pathFound = false;

    while (openSet.data.length > 0) {
      const current = openSet.pop();
      const currKey = current.key;

      if (currKey === endKey) {
        pathFound = true;
        break;
      }

      if (visited.has(currKey)) continue;
      visited.add(currKey);

      const neighbors = this.graph[currKey] || [];

      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        const neighborKey = neighbor.to;

        if (visited.has(neighborKey)) continue;

        // Apply road-class weight: in far mode, small roads cost more → A* avoids them
        const roadWeight = this.getHighwayWeight(neighbor.highway || 'unknown', farMode);
        const tentativeGScore = gScore[currKey] + neighbor.dist * roadWeight;

        if (gScore[neighborKey] === undefined || tentativeGScore < gScore[neighborKey]) {
          cameFrom[neighborKey] = currKey;
          gScore[neighborKey] = tentativeGScore;

          // Heuristic: straight-line distance to end node (admissible, never over-estimates)
          const nCoords = this.coordsMap[neighborKey];
          const h = NavigationEngine.calculateDistance(
            nCoords[1], nCoords[0],
            endNode.coords[1], endNode.coords[0]
          );

          fScore[neighborKey] = tentativeGScore + h;
          openSet.push({ key: neighborKey, f: fScore[neighborKey] });
        }
      }
    }

    if (!pathFound) {
      return null;
    }

    // Reconstruct road coordinates path
    const pathLatLngs = [];
    let currentKey = endKey;
    while (currentKey !== undefined) {
      const c = this.coordsMap[currentKey];
      pathLatLngs.unshift(L.latLng(c[1], c[0]));
      currentKey = cameFrom[currentKey];
    }

    return {
      path: pathLatLngs,
      startNodeCoords: [startNode.coords[1], startNode.coords[0]],
      endNodeCoords: [endNode.coords[1], endNode.coords[0]],
      roadDistance: gScore[endKey]
    };
  }
};

/* ==========================================================================
   TurnGuide — Turn-by-Turn Voice & Visual Navigation
   ==========================================================================
   Uses the route path (array of L.latLng points) returned by RoadRouter to:
     1. Detect the next significant turn (bearing change > 25°)
     2. Show a visual turn banner with direction arrow + distance
     3. Speak the instruction via Web Speech API at 500m / 200m / 50m
     4. Support a mute toggle (persisted in localStorage)
   ========================================================================== */
const TurnGuide = {

  // ── State ──────────────────────────────────────────────────────────────────
  muted: false,
  _lastSpokenDist: null,   // distance at which we last spoke (prevents repeats)
  _lastTurnIdx: -1,        // index of the detected upcoming turn in the path
  _announcedThresholds: new Set(), // which distance thresholds already spoken

  // ── Initialise: wire up the mute button ────────────────────────────────────
  init() {
    this.muted = localStorage.getItem('turnGuide_muted') === 'true';
    this._updateMuteIcon();

    const btn = document.getElementById('navVoiceBtn');
    if (btn) {
      btn.addEventListener('click', () => this.toggleMute());
    }
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('turnGuide_muted', this.muted);
    this._updateMuteIcon();
    // Give immediate feedback
    if (!this.muted) this._speak('Voice guidance on');
  },

  _updateMuteIcon() {
    const icon = document.getElementById('navVoiceIcon');
    if (!icon) return;
    icon.className = this.muted
      ? 'fa-solid fa-volume-xmark'
      : 'fa-solid fa-volume-high';
    const btn = document.getElementById('navVoiceBtn');
    if (btn) btn.style.opacity = this.muted ? '0.4' : '1';
  },

  // ── Voice via Web Speech API ───────────────────────────────────────────────
  _speak(text) {
    if (this.muted) return;
    if (!window.speechSynthesis) return;
    // Cancel any queued utterances so we don't pile up
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'en-US';
    utt.rate   = 0.92;
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    window.speechSynthesis.speak(utt);
  },

  // ── Classify turn from bearing delta ──────────────────────────────────────
  // Returns { type, icon, label, cssClass }
  _classifyTurn(deltaDeg) {
    // Normalize to -180 → +180
    let d = ((deltaDeg + 540) % 360) - 180;
    if (d > 150 || d < -150) return { type: 'uturn',    icon: 'fa-solid fa-rotate-left',        label: 'Make U-Turn',        cssClass: 'uturn' };
    if (d >  45)              return { type: 'right',   icon: 'fa-solid fa-turn-right',          label: 'Turn Right',         cssClass: 'right' };
    if (d < -45)              return { type: 'left',    icon: 'fa-solid fa-turn-left',           label: 'Turn Left',          cssClass: 'left'  };
    if (d >  20)              return { type: 'slight-right', icon: 'fa-solid fa-arrow-trend-up', label: 'Keep Right',         cssClass: 'right' };
    if (d < -20)              return { type: 'slight-left',  icon: 'fa-solid fa-arrow-trend-up', label: 'Keep Left',          cssClass: 'left'  };
    return                           { type: 'straight', icon: 'fa-solid fa-arrow-up',           label: 'Continue Straight',  cssClass: '' };
  },

  // ── Find the next significant turn ahead in the route path ────────────────
  // pathPoints: array of L.latLng, startIdx: current closest index on route
  // Returns { turnPoint, distToTurn, info } or null
  findNextTurn(pathPoints, startIdx, userLat, userLng) {
    if (!pathPoints || pathPoints.length < 3) return null;

    // Accumulate distance from user to each node to get distance to turn
    let accumulated = NavigationEngine.calculateDistance(
      userLat, userLng,
      pathPoints[startIdx].lat, pathPoints[startIdx].lng
    );

    const MIN_TURN_ANGLE = 25; // degrees — smaller changes are noise
    const LOOKAHEAD_M   = 3000; // don't report turns > 3km away

    for (let i = Math.max(startIdx, 1); i < pathPoints.length - 1; i++) {
      const prev = pathPoints[i - 1];
      const curr = pathPoints[i];
      const next = pathPoints[i + 1];

      // Bearing of the incoming segment
      const b1 = NavigationEngine.calculateBearing(prev.lat, prev.lng, curr.lat, curr.lng);
      // Bearing of the outgoing segment
      const b2 = NavigationEngine.calculateBearing(curr.lat, curr.lng, next.lat, next.lng);

      const delta = b2 - b1;
      const absDelta = Math.abs(((delta + 540) % 360) - 180);

      // Accumulate segment length
      const segLen = NavigationEngine.calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
      accumulated += segLen;

      if (accumulated > LOOKAHEAD_M) break;

      if (absDelta >= MIN_TURN_ANGLE) {
        return {
          turnPoint: curr,
          distToTurn: accumulated,
          info: this._classifyTurn(delta),
          nodeIdx: i
        };
      }
    }
    return null;
  },

  // ── Format distance for display and speech ────────────────────────────────
  _fmtDist(m) {
    if (m >= 950) return `${Math.round(m / 100) * 100} meters`;
    if (m >= 100) return `${Math.round(m / 50) * 50} meters`;
    return `${Math.round(m)} meters`;
  },
  _fmtDistShort(m) {
    if (m >= 950) return `${(m/1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  },

  // ── Main update: called every GPS tick ────────────────────────────────────
  // pathPoints: remaining route path, closestIdx: user's position index
  update(pathPoints, closestIdx, userLat, userLng) {
    const banner    = document.getElementById('turnBanner');
    const arrowBox  = document.getElementById('turnArrowBox');
    const arrowIcon = document.getElementById('turnArrowIcon');
    const inLabel   = document.getElementById('turnInLabel');
    const dirLabel  = document.getElementById('turnDirectionLabel');

    if (!banner) return;

    const turn = this.findNextTurn(pathPoints, closestIdx, userLat, userLng);

    if (!turn || turn.info.type === 'straight') {
      // No significant turn ahead — hide banner
      banner.classList.add('hidden');
      banner.classList.remove('urgent');
      return;
    }

    const { distToTurn, info } = turn;
    const distShort = this._fmtDistShort(distToTurn);

    // ── Update visual banner ─────────────────────────────────────────────────
    banner.classList.remove('hidden');
    banner.classList.toggle('urgent', distToTurn < 100);

    // Arrow colour class
    arrowBox.classList.remove('left', 'right', 'uturn');
    if (info.cssClass) arrowBox.classList.add(info.cssClass);

    arrowIcon.className = info.icon;
    inLabel.textContent = `In ${distShort}`;
    dirLabel.textContent = info.label;

    // ── Voice announcements at 500m / 200m / 50m ──────────────────────────
    const thresholds = [500, 200, 50];
    for (const thresh of thresholds) {
      const key = `${info.type}_${thresh}`;
      if (distToTurn <= thresh + 30 && distToTurn > thresh - 30 && !this._announcedThresholds.has(key)) {
        this._announcedThresholds.add(key);
        const distWord = thresh === 50 ? 'in 50 meters' : `in ${thresh} meters`;
        this._speak(`${distWord}, ${info.label}`);
      }
    }

    // Reset announced thresholds when turn is passed (dist increases or new turn detected)
    if (turn.nodeIdx !== this._lastTurnIdx) {
      this._announcedThresholds.clear();
      this._lastTurnIdx = turn.nodeIdx;
    }
  },

  // ── Reset state when navigation ends or target changes ────────────────────
  reset() {
    this._announcedThresholds.clear();
    this._lastTurnIdx = -1;
    this._lastSpokenDist = null;
    const banner = document.getElementById('turnBanner');
    if (banner) {
      banner.classList.add('hidden');
      banner.classList.remove('urgent');
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  },

  // ── Announce destination reached ──────────────────────────────────────────
  announceArrival(targetName) {
    this.reset();
    this._speak(`You have arrived at ${targetName || 'your destination'}`);
  }
};
