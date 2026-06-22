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
  _openPromise: null,

  async open() {
    if (this._db) return this._db;
    if (this._openPromise) return this._openPromise;

    // Request persistent storage to prevent OS from purging offline basemaps
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(granted => {
        if (granted) {
          console.log('Storage persistence granted successfully.');
        } else {
          console.warn('Storage persistence was not granted by browser.');
        }
      }).catch(err => {
        console.warn('Failed to request storage persistence:', err);
      });
    }

    this._openPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        e.target.result.createObjectStore(this.DB_STORE);
      };
      req.onsuccess = (e) => { 
        this._db = e.target.result; 
        this._openPromise = null;
        resolve(this._db); 
      };
      req.onerror  = () => {
        this._openPromise = null;
        reject(req.error);
      };
      req.onblocked = () => {
        console.warn('IndexedDB open blocked');
        this._openPromise = null;
        reject(new Error('IndexedDB blocked'));
      };
    });
    return this._openPromise;
  },

  async get(key) {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const req = db.transaction(this.DB_STORE, 'readonly')
                      .objectStore(this.DB_STORE).get(key);
        req.onsuccess = () => {
          let result = req.result || null;
          if (result && result instanceof ArrayBuffer) {
            // Convert ArrayBuffer back to Blob for Leaflet compatibility
            const type = key.includes('osm') ? 'image/png' : 'image/jpeg';
            result = new Blob([result], { type });
          }
          resolve(result);
        };
        req.onerror  = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },

  async put(key, blobOrBuffer) {
    try {
      let dataToStore = blobOrBuffer;
      if (blobOrBuffer instanceof Blob) {
        dataToStore = await blobOrBuffer.arrayBuffer();
      }
      const db = await this.open();
      return new Promise((resolve) => {
        const tx  = db.transaction(this.DB_STORE, 'readwrite');
        tx.objectStore(this.DB_STORE).put(dataToStore, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror    = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  },

  async count() {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const req = db.transaction(this.DB_STORE, 'readonly')
                      .objectStore(this.DB_STORE).count();
        req.onsuccess = () => resolve(req.result);
        req.onerror  = () => resolve(0);
      });
    } catch (e) {
      return 0;
    }
  },

  async clear() {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const tx = db.transaction(this.DB_STORE, 'readwrite');
        tx.objectStore(this.DB_STORE).clear();
        tx.oncomplete = () => resolve();
      });
    } catch (e) {}
  }
};

// ==========================================================================
// Leaflet Tile Interceptor — checks IndexedDB first, falls back to network
// ==========================================================================
if (typeof L !== 'undefined' && L.TileLayer) {
  L.TileLayer.prototype.createTile = function(coords, done) {
    const tile = document.createElement('img');
    const tileUrl = this.getTileUrl(coords);
    
    // Determine provider dynamically from the layer's URL template
    const urlTemplate = this._url || '';
    let provider = null;
    if (urlTemplate.includes('google') || urlTemplate.includes('lyrs=')) {
      provider = 'googleHybrid';
    } else if (urlTemplate.includes('arcgisonline') || urlTemplate.includes('World_Imagery')) {
      provider = 'satellite';
    } else if (urlTemplate.includes('tile.openstreetmap.org')) {
      provider = 'osm';
    }

    const onLoad = () => {
      L.DomEvent.off(tile, 'load', onLoad);
      L.DomEvent.off(tile, 'error', onError);
      this._tileOnLoad(done, tile);
    };

    const onError = () => {
      L.DomEvent.off(tile, 'load', onLoad);
      L.DomEvent.off(tile, 'error', onError);
      this._tileOnError(done, tile);
    };

    if (provider) {
      const cacheKey = `${provider}/${coords.z}/${coords.x}/${coords.y}`;
      const legacyKey = `${coords.z}/${coords.x}/${coords.y}`;

      TileDB.get(cacheKey).then(blob => {
        if (!blob && provider === 'googleHybrid') {
          // Fallback to legacy un-prefixed key for backwards compatibility
          return TileDB.get(legacyKey);
        }
        return blob;
      }).then(blob => {
        if (blob && blob.size > 0) {
          const reader = new FileReader();
          reader.onloadend = function() {
            L.DomEvent.on(tile, 'load', onLoad);
            L.DomEvent.on(tile, 'error', onError);
            tile.src = reader.result;
          };
          reader.onerror = function() {
            L.DomEvent.on(tile, 'load', onLoad);
            L.DomEvent.on(tile, 'error', onError);
            tile.src = tileUrl;
          };
          reader.readAsDataURL(blob);
        } else {
          L.DomEvent.on(tile, 'load', onLoad);
          L.DomEvent.on(tile, 'error', onError);
          tile.src = tileUrl;
        }
      }).catch(() => {
        L.DomEvent.on(tile, 'load', onLoad);
        L.DomEvent.on(tile, 'error', onError);
        tile.src = tileUrl;
      });
    } else {
      L.DomEvent.on(tile, 'load', onLoad);
      L.DomEvent.on(tile, 'error', onError);
      tile.src = tileUrl;
    }

    return tile;
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
      let coords = null;
      
      // Parse coordinates robustly for Point, Polygon, and MultiPolygon geometry types
      if (feature.properties && feature.properties.location_x !== undefined && feature.properties.location_y !== undefined) {
        coords = [Number(feature.properties.location_x), Number(feature.properties.location_y)];
      } else if (feature.geometry) {
        if (feature.geometry.type === 'Point') {
          coords = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0] && feature.geometry.coordinates[0][0]) {
          coords = feature.geometry.coordinates[0][0]; // First coordinate of exterior ring
        } else if (feature.geometry.type === 'MultiPolygon' && feature.geometry.coordinates[0] && feature.geometry.coordinates[0][0] && feature.geometry.coordinates[0][0][0]) {
          coords = feature.geometry.coordinates[0][0][0]; // First coordinate of first polygon
        }
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
            // KEY FORMAT: prefix with provider name to avoid clashing map layers
            const cacheKey = `${provider}/${tile.z}/${tile.x}/${tile.y}`;
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

    // Cache zoom levels 10 to 18 so map is fully visible at all zooms when offline
    const zoomLevels = [10, 11, 12, 13, 14, 15, 16, 17, 18];
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

    // Ensure database is opened once before starting workers (avoids IndexedDB lock races)
    try {
      await TileDB.open();
    } catch (dbErr) {
      console.error('Failed to open database:', dbErr);
      alert('Database error: Unable to open offline storage.');
      this.isDownloading = false;
      return;
    }

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
  // Tries 4 methods in order: Standard fetch (native bypass) → Capacitor native HTTP → Image→Canvas
  fetchAndStoreTile(url, key) {
    return new Promise(async (resolve) => {
      let resolved = false;
      const done = (result) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(globalTimeout);
        resolve(result);
      };

      // Strict 8-second global timeout per tile to ensure the queue NEVER hangs
      const globalTimeout = setTimeout(() => {
        console.warn('Timeout downloading tile:', url);
        done(false);
      }, 8000);

      // 1. Try standard fetch first (automatically runs natively and bypasses CORS when CapacitorHttp plugin is active)
      try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 500) {
            const saved = await TileDB.put(key, blob);
            return done(saved);
          }
        }
      } catch (fetchErr) {
        console.warn('Standard fetch failed for tile, trying fallbacks:', fetchErr);
      }

      // 2. Try Capacitor Native HTTP if standard fetch failed
      const capHttp = typeof window !== 'undefined' && window.Capacitor && (
        (window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp) || 
        window.Capacitor.Http
      );
      if (capHttp) {
        try {
          const options = {
            url: url,
            method: 'GET',
            responseType: 'base64',
            headers: { 'User-Agent': 'LDN-Validator-Offline-Downloader' }
          };
          const response = await capHttp.request(options);
          if (response && response.status === 200 && response.data) {
            const binaryStr = atob(response.data);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            
            let contentType = 'image/jpeg';
            if (response.headers) {
              const ct = response.headers['content-type'] || response.headers['Content-Type'];
              if (ct) contentType = ct.split(';')[0];
            }
            
            const blob = new Blob([bytes], { type: contentType });
            if (blob && blob.size > 500) {
              const saved = await TileDB.put(key, blob);
              return done(saved);
            }
          }
        } catch (capErr) {
          console.warn('Capacitor native HTTP fallback failed:', capErr);
        }
      }

      // 3. Fallback: Image → Canvas → Blob (for web/browser testing contexts)
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width  = img.naturalWidth  || 256;
            canvas.height = img.naturalHeight || 256;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(async (blob) => {
              if (blob && blob.size > 500) {
                const saved = await TileDB.put(key, blob);
                done(saved);
              } else {
                done(false);
              }
            }, 'image/jpeg', 0.85);
          } catch (e) {
            done(false);
          }
        };
        img.onerror = () => done(false);
        img.src = url;
      } catch (imgErr) {
        done(false);
      }
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



  // ── HIGH-PERFORMANCE Canvas Roads Renderer ────────────────────────────────
  //
  // Problem: Leaflet's default L.geoJSON() creates one SVG <path> per road
  // segment.  With 38 000+ features this produces tens of thousands of DOM
  // nodes that must be repainted on every pan/zoom → the app freezes.
  //
  // Solution:
  //  1. L.canvas() renderer  →  all roads drawn on ONE <canvas> element.
  //  2. Three priority tier LayerGroups (major / minor / tracks) so that
  //     show/hide is instant (just canvas.style.display flip).
  //  3. Zoom-level gating:
  //       Major roads  (motorway/trunk/primary)     visible ≥ zoom 10
  //       Minor roads  (secondary/tertiary/etc.)    visible ≥ zoom 12
  //       Tracks/paths (track/footway/path/…)       visible ≥ zoom 14
  //  4. Async chunked rendering (100 features per frame) keeps the UI
  //     fully responsive during the initial build — no "white screen" freeze.
  // ──────────────────────────────────────────────────────────────────────────
  renderRoadsLayer(geojson, forceAddToMap = false) {
    const map = App.state.map;
    if (!map) return;

    // Remove any existing roads layers & listeners
    this._removeRoadsLayers();

    const roadColors = {
      motorway: '#e879f9', motorway_link: '#e879f9',
      trunk: '#e879f9',    trunk_link: '#e879f9',
      primary: '#f97316',  primary_link: '#f97316',
      secondary: '#c0ff00', secondary_link: '#c0ff00',
      tertiary: '#a3a3a3',  tertiary_link: '#a3a3a3',
      unclassified: '#6b7280', road: '#6b7280',
      residential: '#94a3b8', living_street: '#94a3b8', service: '#94a3b8',
      track: '#c8961e',     path: '#84cc16', footway: '#84cc16',
      bridleway: '#84cc16', pedestrian: '#84cc16', cycleway: '#84cc16',
      unknown: '#64748b'
    };

    // ── Tier classification ──────────────────────────────────────────────────
    const MAJOR  = new Set(['motorway','motorway_link','trunk','trunk_link','primary','primary_link']);
    const MINOR  = new Set(['secondary','secondary_link','tertiary','tertiary_link','unclassified','road','residential','living_street','service']);

    // ── One single canvas renderer for ALL roads (maximum efficiency) ──────────
    const canvasRenderer = L.canvas({ padding: 0.5, tolerance: 3 });
    const layerGroup = L.layerGroup();

    // Store on state for toggle/remove
    App.state.roadsLayer      = layerGroup; // Main unified layer reference
    App.state.roadsLayerMinor = layerGroup; // Backward compat
    App.state.roadsLayerTrack = layerGroup; // Backward compat
    App.state.roadsLayerMajor = layerGroup; // Backward compat

    const features = geojson.features;
    const CHUNK    = 150; // features per async frame
    let   idx      = 0;

    const statusEl = document.getElementById('roadsLayerStatus');

    // ── Async chunked build ──────────────────────────────────────────────────
    const processChunk = () => {
      const end = Math.min(idx + CHUNK, features.length);
      for (; idx < end; idx++) {
        const feat    = features[idx];
        const highway = (feat.properties && feat.properties.highway) || 'unknown';
        const color   = roadColors[highway] || roadColors.unknown;
        const isMajor = MAJOR.has(highway);
        const isMinor = MINOR.has(highway);
        const isTrack = !isMajor && !isMinor;

        const weight    = isMajor ? 3   : isMinor ? 2   : 1.2;
        const opacity   = isMajor ? 0.9 : isMinor ? 0.8 : 0.65;
        const dashArray = isTrack ? '5,4' : null;

        try {
          const line = L.geoJSON(feat, {
            renderer: canvasRenderer,
            style: { color, weight, opacity, dashArray, lineCap: 'round', lineJoin: 'round' }
          });
          layerGroup.addLayer(line);
        } catch(e) { /* skip malformed feature */ }
      }

      if (statusEl) statusEl.innerText = `Building roads… ${Math.round(idx/features.length*100)}%`;

      if (idx < features.length) {
        // Schedule next chunk on next animation frame
        setTimeout(processChunk, 0);
      } else {
        // All chunks done → hook up zoom gating
        this._attachRoadsZoomGating(map, forceAddToMap);
        if (statusEl) statusEl.innerText = `${features.length.toLocaleString()} segments loaded`;
        console.log(`Roads canvas layer built: ${features.length} segments`);
      }
    };

    // Kick off
    processChunk();
  },

  // ── Zoom-gated add/remove logic ──────────────────────────────────────────
  _attachRoadsZoomGating(map, forceAddToMap) {
    const roadsSwitch = document.getElementById('switchRoadsLayer');
    const shouldShow  = forceAddToMap || (roadsSwitch && roadsSwitch.checked);

    const applyZoom = () => {
      const z = map.getZoom();
      const roadsL = App.state.roadsLayer;
      if (!roadsL) return; // layer removed

      const showRoads = shouldShow || (roadsSwitch && roadsSwitch.checked);
      if (!showRoads) return; // roads toggled off, nothing to do

      // All roads visible at zoom >= 9 (covering the whole work region)
      if (z >= 9) {
        if (!map.hasLayer(roadsL)) map.addLayer(roadsL);
      } else {
        if (map.hasLayer(roadsL)) map.removeLayer(roadsL);
      }
    };

    // Store listener ref so we can remove it later
    App.state._roadsZoomListener = applyZoom;
    map.on('zoomend', applyZoom);

    // Apply immediately
    if (shouldShow) applyZoom();
  },

  // ── Clean removal of all roads layers & listeners ────────────────────────
  _removeRoadsLayers() {
    const map = App.state.map;
    if (map && App.state._roadsZoomListener) {
      map.off('zoomend', App.state._roadsZoomListener);
      App.state._roadsZoomListener = null;
    }
    ['roadsLayer','roadsLayerMajor','roadsLayerMinor','roadsLayerTrack'].forEach(key => {
      if (App.state[key]) {
        try { App.state[key].remove(); } catch(e) {}
        App.state[key] = null;
      }
    });
  },

  // ── Show all road layers (called by toggle ON) ──────────────────────
  _showRoadsLayers() {
    const map = App.state.map;
    if (!map) return;
    if (App.state._roadsZoomListener) {
      App.state._roadsZoomListener();
    } else {
      if (App.state.roadsLayer && !map.hasLayer(App.state.roadsLayer)) {
        map.addLayer(App.state.roadsLayer);
      }
    }
  },

  // ── Hide all road layers (called by toggle OFF) ─────────────────────
  _hideRoadsLayers() {
    const map = App.state.map;
    if (!map) return;
    if (App.state.roadsLayer && map.hasLayer(App.state.roadsLayer)) {
      map.removeLayer(App.state.roadsLayer);
    }
  },

  // Toggle roads layer visibility (instant — no re-render)
  async toggleRoadsVisibility() {
    const map = App.state.map;
    if (!map) return;

    const hasAnyLayer = ['roadsLayerMajor','roadsLayerMinor','roadsLayerTrack']
      .some(k => App.state[k] && map.hasLayer(App.state[k]));

    if (!App.state.roadsLayerMajor) {
      // Layers not built yet — load & build
      const btn = document.getElementById('toggleRoadsBtn');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';

      let success = false;
      if (this.roadsGeoJSON) {
        this.renderRoadsLayer(this.roadsGeoJSON, true);
        success = true;
      } else {
        success = await this.loadCachedRoads(true);
      }

      if (btn) {
        if (success) {
          btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Roads Layer';
          const sw = document.getElementById('switchRoadsLayer');
          if (sw) sw.checked = true;
        } else {
          btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show Roads Layer';
          alert('ℹ️ No roads downloaded or preloaded yet.\n\nGo to Offline tab → Download Roads & Tracks first.');
        }
      }
      return;
    }

    if (hasAnyLayer) {
      // Roads visible → hide instantly (no re-render, just remove from map)
      this._hideRoadsLayers();
      const btn = document.getElementById('toggleRoadsBtn');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show Roads Layer';
      const sw = document.getElementById('switchRoadsLayer');
      if (sw) sw.checked = false;
    } else {
      // Roads hidden → show instantly via zoom gating
      this._showRoadsLayers();
      const btn = document.getElementById('toggleRoadsBtn');
      if (btn) btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide Roads Layer';
      const sw = document.getElementById('switchRoadsLayer');
      if (sw) sw.checked = true;
    }
  },

  roadsGeoJSON: null,
  // Load cached roads from localStorage or fallback to preloaded roads and build graph (called on app startup)
  async loadCachedRoads(forceAddToMap = false) {
    const raw = localStorage.getItem('ldn-roads-geojson');
    if (raw) {
      try {
        const geojson = JSON.parse(raw);
        if (geojson && geojson.features && geojson.features.length > 0) {
          this.roadsGeoJSON = geojson;

          // Build graph immediately (fast)
          if (typeof RoadRouter !== 'undefined') {
            RoadRouter.buildGraph(geojson);
          }

          const roadsSwitch = document.getElementById('switchRoadsLayer');
          if (forceAddToMap || (roadsSwitch && roadsSwitch.checked)) {
            this.renderRoadsLayer(geojson, forceAddToMap);
          }

          const statusEl = document.getElementById('roadsLayerStatus');
          if (statusEl) statusEl.innerText = `${geojson.features.length.toLocaleString()} segments (cached)`;
          console.log(`Loaded and indexed ${geojson.features.length} cached road segments.`);
          return true;
        }
      } catch(e) {
        console.warn('Failed to parse cached roads GeoJSON from localStorage:', e);
      }
    }

    // Fallback to preloaded roads
    try {
      const response = await fetch('./preloaded_roads.geojson');
      if (response.ok) {
        const geojson = await response.json();
        if (geojson && geojson.features && geojson.features.length > 0) {
          this.roadsGeoJSON = geojson;

          // Build graph immediately (fast)
          if (typeof RoadRouter !== 'undefined') {
            RoadRouter.buildGraph(geojson);
          }

          const roadsSwitch = document.getElementById('switchRoadsLayer');
          if (forceAddToMap || (roadsSwitch && roadsSwitch.checked)) {
            this.renderRoadsLayer(geojson, forceAddToMap);
          }

          const statusEl = document.getElementById('roadsLayerStatus');
          if (statusEl) statusEl.innerText = `${geojson.features.length.toLocaleString()} segments (preloaded)`;
          console.log(`Loaded and indexed ${geojson.features.length} preloaded road segments.`);
          return true;
        }
      }
    } catch (e) {
      console.warn('Failed to load preloaded roads GeoJSON:', e);
    }
    return false;
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

      if (map.hasLayer(offlineLayer)) {
        // Switch back to online
        map.removeLayer(offlineLayer);
        if (defaultLayer) map.addLayer(defaultLayer);
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
        console.log(`Offline basemap ON (${count} tiles from IndexedDB)`);
      }
    }).catch(err => {
      console.error('TileDB count error:', err);
      alert('Error reading offline tile store. Please try again.');
    });
  }
};
