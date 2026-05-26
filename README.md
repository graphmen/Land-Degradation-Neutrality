# Zimbabwe Environmental Intelligence Hub (GEF 7 / UNCCD / FAO)

A premium geospatial environmental monitoring platform built in alignment with the **Environmental Management Agency (EMA)** of Zimbabwe, the **GEF 7 Drylands Sustainable Landscapes Impact Program**, and the **UNCCD 2018-2030 Strategic Framework**.

This platform tracks progress toward **SDG Indicator 15.3.1 (Land Degradation Neutrality)** and evaluates soil quality across regional dryland zones.

---

## 🚀 Key Modules & Indicators

### 1. Land Degradation Neutrality (LDN) Hub (`/ldn`)
- **SDG 15.3.1 Monitoring**: Real-time tracking of land productivity, vegetation health, and severity indexes.
- **UNCCD Spatial Badging**: Classifies telemetry points into degraded **Hotspots** (requiring immediate intervention) and **Bright Spots** (stable or recovering ecosystems).
- **Strategic Objectives (SO-1) Alignment**: Automatic evaluation of required actions based on soil/vegetation severity.

### 2. Soil Core Analysis Hub (`/soil`)
- **Physical Parameter Profiles**: Depth (cm), soil texture (Clay, Loam, Sand, Silt), moisture status, and Munsell soil colors.
- **Soil Organic Carbon (SOC) Estimator**: Dynamic indicator comparing sample properties against national UNCCD SOC baseline targets:
  - **Forest**: 42.3 t/ha
  - **Wetlands**: 52.2 t/ha
  - **Croplands**: 38.9 t/ha
  - **Grasslands**: 38.6 t/ha

---

## 🛠️ Technology Stack
- **Frontend**: Next.js 14 (TypeScript, React, Leaflet Maps, Recharts, Framer Motion)
- **Backend**: FastAPI (Python, Uvicorn, Async HTTPX Services)
- **Data Integration**: KoboToolbox API v2 (Direct proxy & synchronized JSON fallback caches)

---

## 💻 Local Setup & Development

### 1. Start the API Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Start the Frontend Dashboard
```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Access the dashboard locally at `http://localhost:3001` and the API documentation at `http://localhost:8000/docs`.

---

## 🌐 Vercel Deployment Settings

When deploying to Vercel, make sure to configure the project in your Vercel Dashboard:

1.  **Root Directory**: Set this to **`frontend`** (Next.js is inside the `/frontend` subfolder).
2.  **Environment Variables** (Optional, to use live KoboToolbox fetch instead of cached JSON):
    - `OFFLINE_MODE` = `false`
    - `KOBO_USERNAME` = `your_username`
    - `KOBO_PASSWORD` = `your_password`
