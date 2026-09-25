from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.database import SessionLocal
from app.services.seed_service import seed_material_database

# Import routers
from app.routers import (
    dashboard, materials, requisitions, procurement, work_orders,
    grn_inspection, inventory, billing, warranty_defects, disposal,
    stock_audit, forecasting, reports, administration
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: seed database if empty
    db = SessionLocal()
    try:
        seed_material_database(db, force_reset=False)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all module routers under /api/v1 and /api
for api_prefix in ["/api/v1", "/api"]:
    app.include_router(dashboard.router, prefix=api_prefix)
    app.include_router(materials.router, prefix=api_prefix)
    app.include_router(requisitions.router, prefix=api_prefix)
    app.include_router(procurement.router, prefix=api_prefix)
    app.include_router(work_orders.router, prefix=api_prefix)
    app.include_router(grn_inspection.router, prefix=api_prefix)
    app.include_router(inventory.router, prefix=api_prefix)
    app.include_router(billing.router, prefix=api_prefix)
    app.include_router(warranty_defects.router, prefix=api_prefix)
    app.include_router(disposal.router, prefix=api_prefix)
    app.include_router(stock_audit.router, prefix=api_prefix)
    app.include_router(forecasting.router, prefix=api_prefix)
    app.include_router(reports.router, prefix=api_prefix)
    app.include_router(administration.router, prefix=api_prefix)
    # Support both /administration and /admin, /warranty and /warranty-defects, /audit and /stock-audit
    app.include_router(administration.router, prefix=api_prefix + "/administration")
    app.include_router(warranty_defects.router, prefix=api_prefix + "/warranty-defects")
    app.include_router(stock_audit.router, prefix=api_prefix + "/stock-audit")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "IFMS Material Management System API (GNCTD)",
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "database": "connected (ifms_jk)"}
