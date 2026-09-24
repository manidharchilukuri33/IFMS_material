# IFMS Material Management Module (GNCTD)

Integrated Financial Management System (IFMS) - Material Management Module for the Government of NCT of Delhi (GNCTD).

A full-stack, enterprise-grade government inventory, procurement, and lifecycle material management system built with **FastAPI (Python)**, **React + TypeScript (Vite)**, and **PostgreSQL 17**.

---

## 🏛️ Architecture Overview

- **Frontend**: React + TypeScript + Vite, pixel-perfect government design system matching GNCTD IFMS UI standards (`frontend/`).
- **Backend**: FastAPI REST API with SQLAlchemy ORM, Pydantic schemas, and structured routing (`backend/`).
- **Database**: PostgreSQL 17 database (`ifms_jk`) with 43 specialized `mtrl_` tables mapped to IFMS core master entities (`tenant_master`, `entity_master`, `departments`, `offices`, `financial_years`, `code_master`).
- **REST Endpoints**: 38 full REST endpoints covering all 14 functional modules.
- **UI Screens**: 59 dedicated screens and interactive subpage workflows.

---

## 📦 Modules & Capabilities

1. **Dashboard & KPIs**: Real-time KPI summaries, critical stock alerts, fast-moving items, pending approvals, and budget tracking.
2. **Material Master**: Item cataloging, categories, UOM & conversions, BOQ mappings, bulk import/export.
3. **Requisitions / Indenting**: Purchase requisitions, multi-level approval workflows, departmental indents, consolidation.
4. **Procurement**: Procurement plans, tender management, comparative statements, quotation evaluation, EMD & PBG tracking.
5. **Work Orders**: Work order creation, amendment history, delivery milestone tracking.
6. **Receipt & Inspection**: Goods Receipt Note (GRN), gate entry, quality inspections, Return to Vendor (RTV) gatepasses.
7. **Inventory Management**: Multi-store stock balances, internal transfers, goods issuance, tool tracking, stock returns.
8. **Billing & Finance**: Vendor invoicing, 3-way matching (PO vs GRN vs Invoice), sanction orders, payment advice.
9. **Warranty & Defects**: Asset warranties, AMC tracking, defect reporting, vendor service escalations.
10. **Condemnation & Disposal**: Survey committee proposals, condemnation approvals, MSTC/GeM e-auction lotting, scrap register.
11. **Stock Audit & Verification**: Physical verification schedules, discrepancies reconciliation, stock adjustment notes.
12. **Forecasting & Analytics**: Seasonal consumption trends, reorder point calculations, automated demand forecasting.
13. **Reports & MIS**: Procurement MIS, inventory valuation, vendor scorecards, GFR-compliant immutable audit trails.
14. **System Administration**: Multi-tier approval matrices, financial delegation limits, GFR rules engine, external integrations (PFMS, GeM, GSTN, e-Invoice).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- PostgreSQL 17 (with `ifms_jk` database)

---

### 1. Database Setup
Restore the provided schema dump into PostgreSQL:
```bash
# In PostgreSQL
psql -U postgres -c "CREATE DATABASE ifms_jk;"
psql -U postgres -d ifms_jk -f dump-ifms_jk-202609241138.sql
```

---

### 2. Backend Setup (FastAPI)
```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Run FastAPI server with auto-reload (Port 8002)
uvicorn app.main:app --host 127.0.0.1 --port 8002 --reload
```
- API root: `http://127.0.0.1:8002/`
- Interactive Swagger documentation: `http://127.0.0.1:8002/docs`

---

### 3. Frontend Setup (React + Vite)
```bash
cd frontend

# Install npm dependencies
npm install

# Start development server (Port 5173)
npm run dev -- --host 127.0.0.1 --port 5173
```
- Frontend UI: `http://127.0.0.1:5173/`

---

### 4. Running Backend Automated Test Suite
From the root directory:
```bash
python test_endpoints.py
```
*Expected: 38/38 endpoints return 200 OK.*

---

## 📂 Repository Structure

```
├── backend/
│   ├── app/
│   │   ├── config.py              # Application settings & database connection
│   │   ├── main.py                # FastAPI entry point & CORS
│   │   ├── models/
│   │   │   └── material_models.py # 43 SQLAlchemy models (mtrl_*)
│   │   ├── routers/               # 14 modular REST API routers
│   │   ├── schemas/               # Pydantic request/response models
│   │   └── seed_data.py           # Database seeder
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Main application component
│   │   ├── main.tsx               # Vite entry
│   │   ├── index.css              # GNCTD IFMS Design System CSS
│   │   └── services/
│   │       ├── ifms_core.js       # 59-screen rendering & mutation engine
│   │       └── ifms_core.d.ts     # TypeScript declarations
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── dump-ifms_jk-202609241138.sql  # Database schema & seed SQL dump
├── IFMS_Material_Database_Design.md # Detailed database architecture specification
├── ifms_material_management_V2.html # Reference UI Prototype
├── test_endpoints.py              # Automated REST endpoint test suite
└── README.md
```

---

## 📜 License
Government of NCT of Delhi (GNCTD) &middot; Integrated Financial Management System.
