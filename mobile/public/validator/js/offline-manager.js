/* ==========================================================================
   LDN Field Validator - Offline Basemap Downloader
   ========================================================================== */

// ==========================================================================
// IndexedDB Tile Store — works reliably on Android WebView / Capacitor
// ==========================================================================
const TileDB = {
  DB_NAME: 'ldn-tiles-idb',
  DB_STORE: 'tiles',
  _db: null,

  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(this.DB_STORE);
      };
      req.onsuccess = (e) => { this._db = e.target.result; resolve(this._db); };
      req.onerror  = () => reject(req.error);
    });
  },

  async get(key) {
    const db = await this.open();
    return new Promise((resolve) => {
      const req = db.transaction(this.DB_STORE, 'readonly')
                    .objectStore(this.DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror  = () => resolve(null);
    });
  },

  async put(key, blob) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx  = db.transaction(this.DB_STORE, 'readwrite');
      tx.objectStore(this.DB_STORE).put(blob, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror    = () => resolve(false);
    });
  },

  async count() {
    const db = await this.open();
    return new Promise((resolve) => {
      const req = db.transaction(this.DB_STORE, 'readonly')
                    .objectStore(this.DB_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror  = () => resolve(0);
    });
  },

  async clear() {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction(this.DB_STORE, 'readwrite');
      tx.objectStore(this.DB_STORE).clear();
      tx.oncomplete = () => resolve();
    });
  }
};

// ==========================================================================
// Leaflet Tile Interceptor — checks IndexedDB first, falls back to network
// ==========================================================================
if (typeof L !== 'undefined' && L.TileLayer) {
  L.TileLayer.prototype.createTile = function(coords, done) {
    const tile = document.createElement('img');
    L.DomEvent.on(tile, 'load',  L.Util.bind(this._tileOnLoad,  this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

    const tileUrl  = this.getTileUrl(coords);
    const cacheKey = `${coords.z}/${coords.x}/${coords.y}`;

    TileDB.get(cacheKey).then(blob => {
      if (blob && blob.size > 0) {
        const url = URL.createObjectURL(blob);
        tile._objectUrl = url;
        tile.src = url;
      } else {
        tile.src = tileUrl;
      }
    }).catch(() => { tile.src = tileUrl; });

    return tile;
  };

  const _origClean = L.TileLayer.prototype._cleanTile;
  L.TileLayer.prototype._cleanTile = function(tile) {
    if (tile._objectUrl) { URL.revokeObjectURL(tile._objectUrl); tile._objectUrl = null; }
    if (_origClean) _origClean.call(this, tile);
  };
}

const OfflineManager = {
  // Tile Server URL templates
  tileServers: {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    osm: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    googleHybrid: 'https://mt0.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
  },

  // State
  isDownloading: false,
  downloadQueue: [],
  totalToDownload: 0,
  downloadedCount: 0,
  failedCount: 0,
  cancelRequested: false,

  // Convert Lon/Lat to Slippy Tile Coordinates
  lon2tile(lon, zoom) {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
  },

  lat2tile(lat, zoom) {
    const latRad = lat * Math.PI / 180;
    return Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * Math.pow(2, zoom));
  },

  // Calculate tiles within R meters around a coordinate
  calculateTilesForPoint(lng, lat, radiusMeters, zoomLevels) {
    const tiles = [];
    
    // Approximations at Zimbabwe latitude (~ -20 degrees)
    const latDelta = radiusMeters / 111000;
    const lngDelta = radiusMeters / 104000;

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    zoomLevels.forEach(z => {
      const x1 = this.lon2tile(minLng, z);
      const x2 = this.lon2tile(maxLng, z);
      const y1 = this.lat2tile(maxLat, z); // Note: higher lat gives smaller y tile
      const y2 = this.lat2tile(minLat, z);

      const startX = Math.min(x1, x2);
      const endX = Math.max(x1, x2);
      const startY = Math.min(y1, y2);
      const endY = Math.max(y1, y2);

      for (let x = startX; x <= endX; x++) {
        for (let y = startY; y <= endY; y++) {
          tiles.push({ x, y, z });
        }
      }
    });

    return tiles;
  },

  // Get unique list of tile URLs for a list of features
  generateTileUrls(features, provider, radiusMeters, zoomLevels) {
    const uniqueTiles = new Set();
    const urls = [];
    const template = this.tileServers[provider];

    features.forEach(feature => {
      let coords = [];
      if (feature.geometry.type === 'Point') {
        coords = feature.geometry.coordinates;
      } else if (feature.geometry.type === 'MultiPolygon') {
        coords = [feature.properties.location_x, feature.properties.location_y];
      }

      if (coords && coords.length >= 2) {
        const pointTiles = this.calculateTilesForPoint(coords[0], coords[1], radiusMeters, zoomLevels);
        pointTiles.forEach(tile => {
          const key = `${tile.z}-${tile.x}-${tile.y}`;
          if (!uniqueTiles.has(key)) {
            uniqueTiles.add(key);
            let tileUrl = template
              .replace('{z}', tile.z)
              .replace('{x}', tile.x)
              .replace('{y}', tile.y);
            // KEY FORMAT: must match createTile intercept exactly — plain z/x/y
            const cacheKey = `${tile.z}/${tile.x}/${tile.y}`;
            urls.push({ key, url: tileUrl, cacheKey });
          }
        });
      }
    });

    return urls;
  },

  // Run the batch download
  async startDownload(features, provider, radiusMeters) {
    if (this.isDownloading) return;
    
    this.isDownloading = true;
    this.cancelRequested = false;
    this.downloadedCount = 0;
    this.failedCount = 0;

    // We cache high resolution zoom levels 14 to 18
    const zoomLevels = [14, 15, 16, 17, 18];
    const tileList = this.generateTileUrls(features, provider, radiusMeters, zoomLevels);
    
    this.totalToDownload = tileList.length;
    this.downloadQueue = [...tileList];

    // Show Progress Container
    const progressContainer = document.getElementById('downloadProgressContainer');
    progressContainer.classList.remove('hidden');
    
    // Update Stats
    document.getElementById('downloadProgressStatus').innerText = 'Starting download...';
    document.getElementById('downloadProgressPct').innerText = '0%';
    document.getElementById('downloadProgressBar').style.width = '0%';
    document.getElementById('downloadTilesProgress').innerText = `Tile 0 / ${this.totalToDownload}`;

    // Parallel downloads pool
    const CONCURRENCY = 8;
    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < CONCURRENCY; i++) {
      promises.push(this.downloadWorker(startTime));
    }

    await Promise.all(promises);
    
    this.isDownloading = false;
    
    if (this.cancelRequested) {
      document.getElementById('downloadProgressStatus').innerText = 'Download Cancelled';
    } else {
      document.getElementById('downloadProgressStatus').innerText = 'Download Completed!';
      document.getElementById('downloadProgressPct').innerText = '100%';
      document.getElementById('downloadProgressBar').style.width = '100%';
      // Flash the progress bar green
      document.getElementById('downloadProgressBar').style.background = '#10b981';
      document.getElementById('downloadProgressBar').style.boxShadow = '0 0 15px #10b981';
      
      // Save downloaded provider configuration dynamically
      localStorage.setItem('ldn-downloaded-provider', provider);
      if (window.App && App.state && App.state.layers && App.state.layers.offlineCache) {
        const url = this.tileServers[provider];
        App.state.layers.offlineCache.setUrl(url);
      }
    }
    
    // Refresh storage stats
    this.updateStorageDisplay();
  },

  // Download Worker that processes queue items — IndexedDB + Image/Canvas pipeline
  async downloadWorker(startTime) {
    while (this.downloadQueue.length > 0 && !this.cancelRequested) {
      const tile = this.downloadQueue.shift();
      if (!tile) break;

      // Skip if already in IndexedDB
      const existing = await TileDB.get(tile.cacheKey);
      if (existing && existing.size > 0) {
        this.downloadedCount++;
        this.updateProgress(startTime);
        await new Promise(r => setTimeout(r, 2));
        continue;
      }

      const saved = await this.fetchAndStoreTile(tile.url, tile.cacheKey);
      if (saved) this.downloadedCount++;
      else        this.failedCount++;

      this.updateProgress(startTime);
      await new Promise(r => setTimeout(r, 15));
    }
  },

  // Fetch one tile and save to IndexedDB
  // Tries 3 methods in order: CORS fetch → no-cors XHR blob → Image→Canvas
  fetchAndStoreTile(url, key) {
    return new Promise(async (resolve) => {

      // METHOD 1: Standard CORS fetch (works perfectly for OSM)
      try {
        const resp = await fetch(url, { mode: 'cors', cache: 'no-store' });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 500) {
            await TileDB.put(key, blob);
            return resolve(true);
          }
        }
      } catch (_) { /* fall through */ }

      // METHOD 2: no-cors fetch — on Android WebView the response body
      // IS readable even if status=0 (opaque). Try to get the blob directly.
      try {
        const resp = await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        // response.type === 'opaque' on success with no-cors
        if (resp.type === 'opaque' || resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 500) {
            await TileDB.put(key, blob);
            return resolve(true);
          }
        }
      } catch (_) { /* fall through */ }

      // METHOD 3: Image → Canvas → Blob
      // Do NOT set crossOrigin — without it, images load from any server
      // In Capacitor's Android WebView, canvas is NOT tainted (relaxed security)
      const img = new Image();
      // Deliberately NO crossOrigin attribute set

      const timeout = setTimeout(() => {
        img.onload = img.onerror = null;
        resolve(false);
      }, 12000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = img.naturalWidth  || 256;
          canvas.height = img.naturalHeight || 256;
          canvas.getContext('2d').drawImage(img, 0, 0);
          canvas.toBlob(async (blob) => {
            if (blob && blob.size > 500) {
              await TileDB.put(key, blob);
              resolve(true);
            } else {
              resolve(false);
            }
          }, 'image/jpeg', 0.85);
        } catch (canvasErr) {
          // Canvas tainted in strict environments — resolve false
          console.warn('Canvas taint on tile', key, canvasErr.message);
          resolve(false);
        }
      };

      img.onerror = () => { clearTimeout(timeout); resolve(false); };
      // Cache-bust to avoid 304 responses that may have empty bodies
      img.src = url + (url.includes('?') ? '&' : '?') + '_cb=' + Date.now();
    });
  },

  // Update progress bar & labels
  updateProgress(startTime) {
    const totalProcessed = this.downloadedCount + this.failedCount;
    const pct = Math.floor((totalProcessed / this.totalToDownload) * 100) || 0;
    
    document.getElementById('downloadProgressPct').innerText = `${pct}%`;
    document.getElementById('downloadProgressBar').style.width = `${pct}%`;
    document.getElementById('downloadTilesProgress').innerText = `Tile ${totalProcessed} / ${this.totalToDownload}`;
    
    // Estimate speed
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const speed = elapsedSeconds > 0 ? (totalProcessed / elapsedSeconds).toFixed(1) : 0;
    document.getElementById('downloadSpeed').innerText = `${speed} tiles/s`;

    if (totalProcessed === this.totalToDownload) {
      document.getElementById('downloadProgressStatus').innerText = `Completed with ${this.failedCount} failures.`;
    } else {
      document.getElementById('downloadProgressStatus').innerText = `Downloading basemap tiles... (${this.failedCount} failed)`;
    }
  },

  cancelDownload() {
    this.cancelRequested = true;
    this.downloadQueue = [];
  },

  // Update tile count from IndexedDB
  updateStorageDisplay() {
    TileDB.count().then(count => {
      const el1 = document.getElementById('cachedTilesCount');
      const el2 = document.getElementById('cachedSpaceUsed');
      if (el1) el1.innerText = `${count.toLocaleString()} tiles`;
      if (el2) el2.innerText = `~${((count * 20) / 1024).toFixed(1)} MB`;
    }).catch(() => {});
  },

  // Clear IndexedDB tile store
  clearCache() {
    if (confirm('Delete all offline maps? You will need internet to see basemaps.')) {
      TileDB.clear().then(() => {
        this.updateStorageDisplay();
        alert('Offline map cache cleared!');
      });
    }
  },

  /* ===================================================================
     ROADS & TRACKS DOWNLOADER (OpenStreetMap Overpass API)
     =================================================================== */

  // Download all roads, tracks and paths around validation terrain
  async downloadRoadsAndTracks(features) {
    const statusEl = document.getElementById('roadsDownloadStatus');
    const btnEl = document.getElementById('downloadRoadsBtn');

    if (!features || features.length === 0) {
      statusEl.innerText = '⚠ No validation points loaded yet. Open the app first.';
      return;
    }

    // Build bounding box from all feature centroids with a generous buffer (0.05 degrees ~ 5km)
    const BUFFER = 0.05;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

    features.forEach(f => {
      let lat, lng;
      if (f.geometry && f.geometry.type === 'Point') {
        lng = f.geometry.coordinates[0];
        lat = f.geometry.coordinates[1];
      } else if (f.properties && f.properties.location_x && f.properties.location_y) {
        lng = f.properties.location_x;
        lat = f.properties.location_y;
      }
      if (lat !== undefined) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    });

    // Apply buffer
    minLat -= BUFFER; maxLat += BUFFER;
    minLng -= BUFFER; maxLng += BUFFER;

    const bbox = `${minLat.toFixed(5)},${minLng.toFixed(5)},${maxLat.toFixed(5)},${maxLng.toFixed(5)}`;

    statusEl.innerText = `🛰 Querying OpenStreetMap for roads in area ${bbox}...`;
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';

    // Overpass API query - fetch ALL navigable ways: roads, tracks, paths, footways, bridleways
    const overpassQuery = `
      [out:json][timeout:90];
      (
        way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|road|track|path|footway|bridleway|service|living_street|pedestrian)$"](${bbox});
      );
      out body;
      >;
      out skel qt;
    `;

    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    try {
      const response = await fetch(overpassUrl, {
        method: 'POST',
        body: overpassQuery,
        headers: { 'Content-Type': 'text/plain' }
      });

      if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

      const data = await response.json();
      statusEl.innerText = `✅ Downloaded ${data.elements.length} OSM elements. Converting to map layer...`;

      // Convert Overpass JSON to GeoJSON
      const geojson = this.overpassToGeoJSON(data);

      // Store in localStorage for offline use
      try {
        localStorage.setItem('ldn-roads-geojson', JSON.stringify(geojson));
      } catch(e) {
        console.warn('localStorage full, roads not persisted:', e);
      }

      // Render on the map
      this.renderRoadsLayer(geojson);

      const roadCount = geojson.features.length;
      statusEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--emerald-light)"></i> ${roadCount.toLocaleString()} road segments loaded & displayed on map!`;
      document.getElementById('roadsLayerStatus').innerText = `${roadCount.toLocaleString()} segments loaded`;

    } catch (err) {
      console.error('Roads download failed:', err);
      statusEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color: var(--red-alert)"></i> Download failed: ${err.message}. Check internet connection.`;
    }

    btnEl.disabled = false;
    btnEl.innerHTML = '<i class="fa-solid fa-road"></i> Download Roads & Tracks';
  },

  // Convert raw Overpass JSON response to GeoJSON FeatureCollection
  overpassToGeoJSON(data) {
    // Build a lookup of all node IDs to coordinates
    const nodeMap = {};
    data.elements.forEach(el => {
      if (el.type === 'node') {
        nodeMap[el.id] = [el.lon, el.lat];
      }
    });

    const features = [];

    data.elements.forEach(el => {
      if (el.type !== 'way') return;
      if (!el.nodes || el.nodes.length < 2) return;

      const coords = el.nodes
        .map(nodeId => nodeMap[nodeId])
        .filter(c => c !== undefined);

      if (coords.length < 2) return;

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords
        },
        properties: {
          highway: el.tags ? el.tags.highway : 'unknown',
          name: el.tags ? (el.tags.name || el.tags['name:en'] || '') : '',
          surface: el.tags ? (el.tags.surface || '') : '',
          osm_id: el.id
        }
      });
    });

    return { type: 'FeatureCollection', features };
  },

  // Render OSM roads layer on the Leaflet map
  renderRoadsLayer(geojson) {
    const map = App.state.map;
    if (!map) return;

    // Remove existing roads layer if any
    if (App.state.roadsLayer) {
      App.state.roadsLayer.remove();
      App.state.roadsLayer = null;
    }

    // Colour-code by road type for easy navigation
    const roadColors = {
      motorway: '#e879f9',     // Purple - major highway
      trunk: '#e879f9',
      primary: '#f97316',      // Orange - primary road
      secondary: '#c0ff00',    // Yellow - secondary road
      tertiary: '#a3a3a3',     // Grey - tertiary
      unclassified: '#6b7280', // Dark grey
      road: '#6b7280',
      residential: '#94a3b8',  // Light slate
      service: '#94a3b8',
      track: '#a16207',        // Brown - dirt track
      path: '#84cc16',         // Lime - footpath
      footway: '#84cc16',
      bridleway: '#84cc16',
      living_street: '#94a3b8',
      pedestrian: '#84cc16',
      unknown: '#64748b'
    };

    App.state.roadsLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const highway = feature.properties.highway || 'unknown';
        const color = roadColors[highway] || roadColors.unknown;
        const isTrack = highway === 'track' || highway === 'path' || highway === 'footway' || highway === 'bridleway';
        return {
          color: color,
          weight: isTrack ? 1.5 : 2.5,
          opacity: 0.85,
          dashArray: isTrack ? '6,5' : ''
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.name;
        const type = feature.properties.highway;
        const surface = feature.properties.surface;
        if (name || type) {
          layer.bindPopup(`
            <div style="font-family: monospace; font-size: 12px;">
              <strong>${name || 'Unnamed ' + type}</strong><br>
              Type: ${type || 'road'}<br>
              ${surface ? 'Surface: ' + surface : ''}
            </div>
          `);
        }
      }
    }).addTo(map);

    console.log(`Roads layer rendered with ${geojson.features.length} segments.`);
  },

  // Load cached roads from localStorage and render (called on app startup)
  loadCachedRoads() {
    const raw = localStorage.getItem('ldn-roads-geojson');
    if (!raw) return;
    try {
      const geojson = JSON.parse(raw);
      if (geojson && geojson.features && geojson.features.length > 0) {
        this.renderRoadsLayer(geojson);
        const statusEl = document.getElementById('roadsLayerStatus');
        if (statusEl) statusEl.innerText = `${geojson.features.length.toLocaleString()} segments (cached)`;
        console.log(`Loaded ${geojson.features.length} cached road segments from localStorage.`);
      }
    } catch(e) {
      console.warn('Failed to parse cached roads GeoJSON:', e);
    }
  },

  // Toggle roads layer visibility
  toggleRoadsVisibility() {
    const map = App.state.map;
    if (!App.state.roadsLayer) {
      // Try loading from cache
      this.loadCachedRoads();
      return;
    }
    if (map.hasLayer(App.state.roadsLayer)) {
      map.removeLayer(App.state.roadsLayer);
      document.getElementById('toggleRoadsBtn').innerHTML = '<i class="fa-solid fa-eye"></i> Show Roads Layer';
    } else {
      App.state.roadsLayer.addTo(map);
      document.getElementById('toggleRoadsBtn').innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Roads Layer';
    }
  },

  // Toggle offline basemap — checks IndexedDB (TileDB), not old Cache Storage
  toggleOfflineBasemap() {
    TileDB.count().then(count => {
      if (count === 0) {
        alert('⚠ No offline tiles found!\n\nGo to the Offline tab and download a basemap first.\n\nTip: Make sure you see a tile count > 0 in the Offline tab before using this.');
        return;
      }

      const map          = App.state.map;
      const offlineLayer = App.state.layers && App.state.layers.offlineCache;
      const defaultLayer = App.state.layers && App.state.layers.googleHybrid;

      if (!map || !offlineLayer) {
        console.warn('Map or offline layer not ready.');
        return;
      }

      // Find and update the drawer basemap toggle button if it exists
      const btn = document.getElementById('drawerToggleBasemapBtn') ||
                  document.getElementById('toggleBasemapBtn');

      if (map.hasLayer(offlineLayer)) {
        // Switch back to online
        map.removeLayer(offlineLayer);
        if (defaultLayer) map.addLayer(defaultLayer);
        if (btn) {
          btn.textContent = 'Toggle';
          btn.classList.remove('active-layer-btn');
        }
        console.log(`Offline basemap OFF (${count} tiles cached)`);
      } else {
        // Switch to offline
        if (defaultLayer && map.hasLayer(defaultLayer)) map.removeLayer(defaultLayer);
        // Remove any other active base layers
        map.eachLayer(layer => {
          if (layer !== offlineLayer && layer._url) map.removeLayer(layer);
        });
        map.addLayer(offlineLayer);
        // Force tile refresh so IndexedDB tiles are loaded
        offlineLayer.redraw();
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Active';
          btn.classList.add('active-layer-btn');
        }
        console.log(`Offline basemap ON (${count} tiles from IndexedDB)`);
      }
    }).catch(err => {
      console.error('TileDB count error:', err);
      alert('Error reading offline tile store. Please try again.');
    });
  }
};
