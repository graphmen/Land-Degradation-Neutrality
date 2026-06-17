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
  graph: {}, // Map of key -> array of { to: key, dist: meters }
  coordsMap: {}, // Map of key -> [lng, lat]
  grid: {}, // Spatial grid index: Map of "gridX,gridY" -> Array of keys
  cellSize: 0.05, // Grid size in degrees (~5.5km)
  isReady: false,

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

        this.graph[key1].push({ to: key2, dist: dist });
        this.graph[key2].push({ to: key1, dist: dist });

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
  findRoute(startLat, startLng, endLat, endLng) {
    if (!this.isReady || Object.keys(this.graph).length === 0) return null;

    // Find closest nodes in road graph to user and target
    const startNode = this.findClosestNode(startLat, startLng);
    const endNode = this.findClosestNode(endLat, endLng);

    // If either point is too far from any road, we fail the route and fall back to straight line
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
      const currCoords = this.coordsMap[currKey];

      for (let i = 0; i < neighbors.length; i++) {
        const neighbor = neighbors[i];
        const neighborKey = neighbor.to;

        if (visited.has(neighborKey)) continue;

        const tentativeGScore = gScore[currKey] + neighbor.dist;

        if (gScore[neighborKey] === undefined || tentativeGScore < gScore[neighborKey]) {
          cameFrom[neighborKey] = currKey;
          gScore[neighborKey] = tentativeGScore;
          
          // Heuristic: Straight-line distance to end node
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
