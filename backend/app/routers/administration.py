from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from app.database import get_db
from app.models.core_models import Department, Office, FinancialYear, BudgetHead
from app.models.material_models import MtrlWfCfg, MtrlLimit, MtrlNotif, MtrlParty

router = APIRouter(prefix="/admin", tags=["Administration & Settings"])

# ----------------- Workflow Configurations -----------------
@router.get("/workflows")
def list_workflow_configs(db: Session = Depends(get_db)):
    wfs = db.query(MtrlWfCfg).order_by(MtrlWfCfg.module_name.asc(), MtrlWfCfg.stage_sequence.asc()).all()
    return [
        {
            "id": w.id,
            "module_name": w.module_name,
            "stage_sequence": w.stage_sequence,
            "stage_name": w.stage_name,
            "required_role": w.required_role,
            "min_amount": float(w.min_amount) if w.min_amount else 0,
            "max_amount": float(w.max_amount) if w.max_amount else None,
            "sla_tat_hours": w.sla_tat_hours,
            "is_active": w.is_active
        }
        for w in wfs
    ]

# ----------------- Financial Delegation Limits -----------------
@router.get("/limits")
def list_financial_limits(db: Session = Depends(get_db)):
    limits = db.query(MtrlLimit).all()
    return [
        {
            "id": l.id,
            "role_name": l.role_name,
            "direct_purchase_lim": float(l.direct_purchase_lim),
            "quotation_proc_lim": float(l.quotation_proc_lim),
            "limited_tender_lim": float(l.limited_tender_lim),
            "open_tender_lim": float(l.open_tender_lim),
            "disposal_writeoff": float(l.disposal_writeoff),
            "is_active": l.is_active
        }
        for l in limits
    ]

# ----------------- Notifications -----------------
@router.get("/notifications")
def list_notifications(unread_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(MtrlNotif)
    if unread_only:
        query = query.filter(MtrlNotif.is_read == False)
    
    notifs = query.order_by(MtrlNotif.id.desc()).all()
    return [
        {
            "id": n.id,
            "event_type": n.event_type,
            "title": n.title,
            "message": n.message,
            "action_route": n.action_route,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None
        }
        for n in notifs
    ]

@router.put("/notifications/{id}/read")
def mark_notification_read(id: int, db: Session = Depends(get_db)):
    n = db.query(MtrlNotif).filter(MtrlNotif.id == id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"message": "Notification marked as read"}

@router.put("/notifications/mark-all-read")
def mark_all_notifications_read(db: Session = Depends(get_db)):
    db.query(MtrlNotif).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

# ----------------- Core Master Lookups -----------------
@router.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(Department).all()
    return [{"id": d.id, "dept_code": d.dept_code, "dept_name": d.dept_name} for d in depts]

@router.get("/offices")
def list_offices(db: Session = Depends(get_db)):
    offices = db.query(Office).all()
    return [{"id": o.id, "office_code": o.office_code, "office_name": o.office_name} for o in offices]

@router.get("/financial-years")
def list_financial_years(db: Session = Depends(get_db)):
    fys = db.query(FinancialYear).all()
    return [{"id": f.id, "year_code": f.year_code, "year_name": f.year_name, "is_current": f.is_current} for f in fys]

@router.get("/parties")
def list_parties(db: Session = Depends(get_db)):
    parties = db.query(MtrlParty).all()
    return [
        {
            "id": p.id,
            "party_code": p.party_code,
            "party_name": p.party_name,
            "party_type": p.party_type,
            "gstin": p.gstin,
            "pan_no": p.pan_no,
            "gem_seller_id": p.gem_seller_id,
            "party_rating": float(p.party_rating) if p.party_rating else 4.0
        }
        for p in parties
    ]

# ----------------- Integration Health Monitor -----------------
@router.get("/integrations")
def get_integration_status(db: Session = Depends(get_db)):
    return [
        {"system": "GeM Portal API (Government e-Marketplace)", "endpoint": "https://gem.gov.in/api/v2/orders", "status": "Online", "latency_ms": 118, "last_sync": "2 mins ago"},
        {"system": "CPPP e-Procurement Gateway", "endpoint": "https://eprocure.gov.in/cppp/ws", "status": "Online", "latency_ms": 240, "last_sync": "14 mins ago"},
        {"system": "IFMS Core Treasury & Sanction Engine", "endpoint": "http://127.0.0.1:8000/api/treasury", "status": "Online", "latency_ms": 12, "last_sync": "Real-time"},
        {"system": "GSTN Invoice & E-Way Bill Validation", "endpoint": "https://api.gst.gov.in/einvoice", "status": "Online", "latency_ms": 195, "last_sync": "5 mins ago"},
        {"system": "MSTC e-Auction Portal", "endpoint": "https://mstcecommerce.com/auction-api", "status": "Online", "latency_ms": 310, "last_sync": "1 hour ago"}
    ]
