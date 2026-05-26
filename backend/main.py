import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import data, geojson, summary

app = FastAPI(
    title="Zimbabwe LDN & Soil Dashboard API",
    description="Geospatial API for Land Degradation Neutrality and Soil core analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data.router, prefix="/api")
app.include_router(geojson.router, prefix="/api")
app.include_router(summary.router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Zimbabwe LDN & Soil Dashboard API", "status": "online"}
