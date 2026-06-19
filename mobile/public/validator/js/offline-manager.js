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
        const reader = new FileReader();
        reader.onloadend = function() {
          tile.src = reader.result;
        };
        reader.onerror = function() {
          tile.src = tileUrl;
        };
        reader.readAsDataURL(blob);
      } else {
        tile.src = tileUrl;
      }
    }).catch(() => { tile.src = tileUrl; });

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
  // Tries 4 methods in order: Capacitor native HTTP → CORS fetch → no-cors fetch → Image→Canvas
  fetchAndStoreTile(url, key) {
    return new Promise(async (resolve) => {
      // 1. Try Capacitor Native HTTP if running inside Capacitor
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
            const base64Str = response.data;
            const binaryStr = atob(base64Str);
            const len = binaryStr.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            
            // Get content type
            let contentType = 'image/jpeg';
            if (response.headers) {
              const ct = response.headers['content-type'] || response.headers['Content-Type'];
              if (ct) contentType = ct.split(';')[0];
            }
            
            const blob = new Blob([bytes], { type: contentType });
            if (blob && blob.size > 500) {
              await TileDB.put(key, blob);
              return resolve(true);
            }
          }
        } catch (capErr) {
          console.warn('Capacitor native HTTP download failed, falling back:', capErr);
        }
      }

      // METHOD 2: Standard CORS fetch (works perfectly for OSM)
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

      // METHOD 3: no-cors fetch — on Android WebView the response body
      // IS readable even if status=0 (opaque). Try to get the blob directly.
      try {
        const resp = await fetch(url, { mode: 'no-cors', cache: 'no-store' });
        if (resp.type === 'opaque' || resp.ok) {
          const blob = await resp.blob();
          if (blob && blob.size > 500) {
            await TileDB.put(key, blob);
            return resolve(true);
          }
        }
      } catch (_) { /* fall through */ }

      // METHOD 4: Image → Canvas → Blob
      const img = new Image();
      img.crossOrigin = 'anonymous';

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
          console.warn('Tainted canvas fallback for key', key);
          const imgFallback = new Image();
          const fallbackTimeout = setTimeout(() => {
            imgFallback.onload = imgFallback.onerror = null;
            resolve(false);
          }, 8000);
          
          imgFallback.onload = () => {
            clearTimeout(fallbackTimeout);
            try {
              const canvasFb = document.createElement('canvas');
              canvasFb.width = imgFallback.naturalWidth || 256;
              canvasFb.height = imgFallback.naturalHeight || 256;
              canvasFb.getContext('2d').drawImage(imgFallback, 0, 0);
              canvasFb.toBlob(async (blob) => {
                if (blob && blob.size > 500) {
                  await TileDB.put(key, blob);
                  resolve(true);
                } else {
                  resolve(false);
                }
              }, 'image/jpeg', 0.85);
            } catch (innerErr) {
              resolve(false);
            }
          };
          imgFallback.onerror = () => { clearTimeout(fallbackTimeout); resolve(false); };
          imgFallback.src = url;
        }
      };

      img.onerror = () => {
        clearTimeout(timeout);
        const imgNoCors = new Image();
        const noCorsTimeout = setTimeout(() => {
          imgNoCors.onload = imgNoCors.onerror = null;
          resolve(false);
        }, 10000);
        
        imgNoCors.onload = () => {
          clearTimeout(noCorsTimeout);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = imgNoCors.naturalWidth || 256;
            canvas.height = imgNoCors.naturalHeight || 256;
            canvas.getContext('2d').drawImage(imgNoCors, 0, 0);
            canvas.toBlob(async (blob) => {
              if (blob && blob.size > 500) {
                await TileDB.put(key, blob);
                resolve(true);
              } else {
                resolve(false);
              }
            }, 'image/jpeg', 0.85);
          } catch (e) {
            resolve(false);
          }
        };
        imgNoCors.onerror = () => { clearTimeout(noCorsTimeout); resolve(false); };
        imgNoCors.src = url;
      };

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

      // Cache in memory & build graph
      this.roadsGeoJSON = geojson;
      if (typeof RoadRouter !== 'undefined') {
        RoadRouter.buildGraph(geojson);
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
    // everything else → TRACK tier

    // ── One canvas renderer per tier (separate canvas contexts = no contention) ──
    const canvasMajor = L.canvas({ padding: 0.5, tolerance: 5 });
    const canvasMinor = L.canvas({ padding: 0.5, tolerance: 3 });
    const canvasTrack = L.canvas({ padding: 0.5, tolerance: 2 });

    const layerMajor = L.layerGroup();
    const layerMinor = L.layerGroup();
    const layerTrack = L.layerGroup();

    // Store on state for toggle/remove
    App.state.roadsLayer      = layerMajor; // backward-compat reference
    App.state.roadsLayerMinor = layerMinor;
    App.state.roadsLayerTrack = layerTrack;
    App.state.roadsLayerMajor = layerMajor;

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
        const renderer  = isMajor ? canvasMajor : isMinor ? canvasMinor : canvasTrack;
        const target    = isMajor ? layerMajor  : isMinor ? layerMinor  : layerTrack;

        try {
          const line = L.geoJSON(feat, {
            renderer,
            style: { color, weight, opacity, dashArray, lineCap: 'round', lineJoin: 'round' }
          });
          target.addLayer(line);
        } catch(e) { /* skip malformed feature */ }
      }

      if (statusEl) statusEl.innerText = `Building roads… ${Math.round(idx/features.length*100)}%`;

      if (idx < features.length) {
        // Schedule next chunk on next animation frame — keeps UI alive
        setTimeout(processChunk, 0);
      } else {
        // All chunks done → hook up zoom gating
        this._attachRoadsZoomGating(map, forceAddToMap);
        if (statusEl) statusEl.innerText = `${features.length.toLocaleString()} segments loaded`;
        console.log(`Roads canvas layers built: ${features.length} segments`);
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
      const majorL = App.state.roadsLayerMajor;
      const minorL = App.state.roadsLayerMinor;
      const trackL = App.state.roadsLayerTrack;
      if (!majorL) return; // layers removed

      const showMajor = shouldShow || (roadsSwitch && roadsSwitch.checked);
      if (!showMajor) return; // roads toggled off, nothing to do

      // Major roads: zoom >= 10
      if (z >= 10) { if (!map.hasLayer(majorL)) map.addLayer(majorL); }
      else          { if (map.hasLayer(majorL))  map.removeLayer(majorL); }

      // Minor roads: zoom >= 12
      if (z >= 12) { if (!map.hasLayer(minorL)) map.addLayer(minorL); }
      else          { if (map.hasLayer(minorL))  map.removeLayer(minorL); }

      // Tracks / paths: zoom >= 14
      if (z >= 14) { if (!map.hasLayer(trackL)) map.addLayer(trackL); }
      else          { if (map.hasLayer(trackL))  map.removeLayer(trackL); }
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

  // ── Show all road tier layers (called by toggle ON) ──────────────────────
  _showRoadsLayers() {
    const map = App.state.map;
    if (!map) return;
    // Trigger the zoom gating handler to add appropriate tiers
    if (App.state._roadsZoomListener) {
      App.state._roadsZoomListener();
    } else {
      // Fallback: add all tiers
      ['roadsLayerMajor','roadsLayerMinor','roadsLayerTrack'].forEach(key => {
        if (App.state[key] && !map.hasLayer(App.state[key])) {
          map.addLayer(App.state[key]);
        }
      });
    }
  },

  // ── Hide all road tier layers (called by toggle OFF) ─────────────────────
  _hideRoadsLayers() {
    const map = App.state.map;
    if (!map) return;
    ['roadsLayerMajor','roadsLayerMinor','roadsLayerTrack'].forEach(key => {
      if (App.state[key] && map.hasLayer(App.state[key])) {
        map.removeLayer(App.state[key]);
      }
    });
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
