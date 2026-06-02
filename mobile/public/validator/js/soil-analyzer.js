/* ==========================================================================
   LDN Soil Analyser — Munsell Colour Identifier
   Works 100% offline. No external libraries.
   ========================================================================== */

const SoilAnalyzer = {
  stream: null,
  scanInterval: null,
  lastResult: null,

  // ── Colour Math ────────────────────────────────────────────────────────────

  // sRGB 0-255 → CIE L*a*b*
  rgbToLab(r, g, b) {
    // 1. Gamma expand to linear
    let R = r / 255, G = g / 255, B = b / 255;
    R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
    G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
    B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
    // 2. Linear RGB → XYZ (D65)
    const X = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
    const Y = R * 0.2126729 + G * 0.7151522 + B * 0.0721750;
    const Z = R * 0.0193339 + G * 0.1191920 + B * 0.9503041;
    // 3. XYZ → Lab (D65 reference white 0.95047, 1.00000, 1.08883)
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
    return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  },

  // CIE76 ΔE between two Lab colours
  deltaE(l1, l2) {
    return Math.sqrt((l1.L-l2.L)**2 + (l1.a-l2.a)**2 + (l1.b-l2.b)**2);
  },

  // Pre-compute Lab for each chip once
  dbWithLab: null,
  getDbWithLab() {
    if (!this.dbWithLab) {
      this.dbWithLab = MUNSELL_DB.map(c => ({
        ...c,
        lab: this.rgbToLab(c.r, c.g, c.b)
      }));
    }
    return this.dbWithLab;
  },

  // Find closest 3 Munsell chips
  findMatches(r, g, b) {
    const sampleLab = this.rgbToLab(r, g, b);
    return this.getDbWithLab()
      .map(c => ({ ...c, dE: this.deltaE(sampleLab, c.lab) }))
      .sort((a, b) => a.dE - b.dE)
      .slice(0, 3);
  },

  // Sample pixels from canvas reticle area (centre 40×40 px)
  samplePixels(canvas, video) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.drawImage(video, 0, 0, W, H);
    // Sample 40×40 box in centre
    const size = 40;
    const x0 = Math.floor(W / 2 - size / 2);
    const y0 = Math.floor(H / 2 - size / 2);
    const imgData = ctx.getImageData(x0, y0, size, size).data;
    // Trimmed mean: collect all values, sort, drop outer 10%
    const rs = [], gs = [], bs = [];
    for (let i = 0; i < imgData.length; i += 4) {
      rs.push(imgData[i]); gs.push(imgData[i+1]); bs.push(imgData[i+2]);
    }
    const trim = arr => {
      arr.sort((a,b) => a-b);
      const cut = Math.floor(arr.length * 0.1);
      const trimmed = arr.slice(cut, arr.length - cut);
      return Math.round(trimmed.reduce((s, v) => s + v, 0) / trimmed.length);
    };
    return { r: trim(rs), g: trim(gs), b: trim(bs) };
  },

  // ── Camera ─────────────────────────────────────────────────────────────────

  async startCamera() {
    const video = document.getElementById('soilCameraFeed');
    const status = document.getElementById('soilCameraStatus');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      video.srcObject = this.stream;
      await video.play();
      status.classList.add('hidden');
      document.getElementById('soilScanBtn').disabled = false;
    } catch (err) {
      status.innerHTML = `<i class="fa-solid fa-camera-slash"></i> Camera error: ${err.message}. Use the "Upload Photo" button below.`;
    }
  },

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  },

  scan() {
    const video = document.getElementById('soilCameraFeed');
    const canvas = document.getElementById('soilScanCanvas');
    if (!video || video.readyState < 2) return;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const { r, g, b } = this.samplePixels(canvas, video);
    this.showResults(r, g, b);
  },

  // Handle uploaded image
  handleUpload(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('soilScanCanvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        // Sample centre
        const size = 40;
        const x0 = Math.floor(img.width/2 - size/2);
        const y0 = Math.floor(img.height/2 - size/2);
        const data = ctx.getImageData(x0, y0, size, size).data;
        let rT=0, gT=0, bT=0, cnt=0;
        for (let i=0; i<data.length; i+=4) { rT+=data[i]; gT+=data[i+1]; bT+=data[i+2]; cnt++; }
        this.showResults(Math.round(rT/cnt), Math.round(gT/cnt), Math.round(bT/cnt));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  // ── Results ────────────────────────────────────────────────────────────────

  showResults(r, g, b) {
    const matches = this.findMatches(r, g, b);
    this.lastResult = { r, g, b, best: matches[0] };

    const sampleHex = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;

    // Detected sample swatch
    document.getElementById('soilSampleSwatch').style.background = sampleHex;
    document.getElementById('soilSampleRGB').textContent = `RGB (${r}, ${g}, ${b})`;

    // Confidence level: ΔE < 5 = excellent, < 10 = good, < 20 = fair, ≥ 20 = poor
    const dE = matches[0].dE;
    let confLabel, confColor;
    if (dE < 5)       { confLabel = 'Excellent'; confColor = '#10b981'; }
    else if (dE < 10) { confLabel = 'Good';      confColor = '#84cc16'; }
    else if (dE < 20) { confLabel = 'Fair';      confColor = '#c0ff00'; }
    else              { confLabel = 'Low — improve lighting'; confColor = '#ef4444'; }

    document.getElementById('soilConfLabel').textContent = `Confidence: ${confLabel}  (ΔE = ${dE.toFixed(1)})`;
    document.getElementById('soilConfLabel').style.color = confColor;

    // Primary result
    const best = matches[0];
    document.getElementById('soilMunsellCode').textContent = best.m;
    document.getElementById('soilColorName').textContent   = best.name;
    document.getElementById('soilBlindDesc').textContent   = best.blind;
    document.getElementById('soilBestSwatch').style.background = `rgb(${best.r},${best.g},${best.b})`;
    document.getElementById('soilTypeText').textContent    = best.soil;
    document.getElementById('soilOMText').textContent      = best.om;
    document.getElementById('soilDrainText').textContent   = best.drain;

    // Alternates
    const altContainer = document.getElementById('soilAlternates');
    altContainer.innerHTML = matches.slice(1).map(m => `
      <div class="alt-chip">
        <span class="alt-swatch" style="background:rgb(${m.r},${m.g},${m.b})"></span>
        <span class="alt-code">${m.m}</span>
        <span class="alt-name">${m.name}</span>
        <span class="alt-de">ΔE ${m.dE.toFixed(1)}</span>
      </div>
    `).join('');

    document.getElementById('soilResultsPanel').classList.remove('hidden');
    document.getElementById('soilSaveBtn').disabled = false;
  },

  // Save result to selected target record
  saveToTarget() {
    if (!this.lastResult) return;
    const target = App.state.selectedTarget;
    if (!target) {
      alert('No active target selected. Open a target from the Targets list first, then return here to save.');
      return;
    }
    if (!App.state.verifiedData[target.id]) {
      App.state.verifiedData[target.id] = { centroid: false, corners: {} };
    }
    App.state.verifiedData[target.id].munsell = {
      code:   this.lastResult.best.m,
      name:   this.lastResult.best.name,
      r: this.lastResult.r,
      g: this.lastResult.g,
      b: this.lastResult.b,
      soil:   this.lastResult.best.soil,
      om:     this.lastResult.best.om,
      drain:  this.lastResult.best.drain,
      ts: new Date().toISOString()
    };
    App.saveLocalProgress();
    document.getElementById('soilSaveBtn').innerHTML = '<i class="fa-solid fa-circle-check"></i> Saved to Target!';
    document.getElementById('soilSaveBtn').style.background = '#065f46';
    setTimeout(() => {
      document.getElementById('soilSaveBtn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save to Current Target';
      document.getElementById('soilSaveBtn').style.background = '';
    }, 2500);
  },

  // ── Init ───────────────────────────────────────────────────────────────────

  init() {
    // Tab activation starts camera
    document.querySelector('.nav-tab-btn[data-tab="tab-soil"]').addEventListener('click', () => {
      setTimeout(() => this.startCamera(), 200);
    });

    // When leaving soil tab stop camera to save battery
    document.querySelectorAll('.nav-tab-btn:not([data-tab="tab-soil"])').forEach(btn => {
      btn.addEventListener('click', () => this.stopCamera());
    });

    document.getElementById('soilScanBtn').addEventListener('click', () => this.scan());

    document.getElementById('soilUploadBtn').addEventListener('click', () => {
      document.getElementById('soilFileInput').click();
    });

    document.getElementById('soilFileInput').addEventListener('change', e => {
      if (e.target.files[0]) this.handleUpload(e.target.files[0]);
    });

    document.getElementById('soilSaveBtn').addEventListener('click', () => this.saveToTarget());
  }
};
