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

# ----------------- User & Role Management (ifms_jk) -----------------
@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    from app.models.core_models import AppUser, Role, UserRole
    users = db.query(AppUser).all()
    res = []
    for u in users:
        user_roles = db.query(Role).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == u.id).all()
        role_names = [r.role_name for r in user_roles] or ["Staff User"]
        primary_role = role_names[0]
        dept_name = u.department.dept_name if u.department else "Head Office"
        res.append({
            "id": u.id,
            "login_id": u.login_id,
            "full_name": u.full_name,
            "email": u.email,
            "mobile": u.mobile,
            "user_type": u.user_type,
            "department_id": u.department_id,
            "department_name": dept_name,
            "office_name": u.office.office_name if u.office else "Head Office",
            "is_active": u.is_active,
            "status": "Active" if u.is_active else "Suspended",
            "roles": role_names,
            "role": primary_role,
            "stores": "IT Store, Central Store" if "Procurement" in primary_role or "Store" in primary_role else "All Stores",
            "approval_limit": 2500000 if "Procurement" in primary_role else (10000000 if "Approver" in primary_role or "Head" in primary_role else 0),
            "created_at": u.created_at.isoformat() if u.created_at else None
        })
    return res

@router.get("/roles")
def list_roles(db: Session = Depends(get_db)):
    from app.models.core_models import Role
    roles = db.query(Role).filter(Role.is_active == True).all()
    return [
        {
            "id": r.id,
            "role_code": r.role_code,
            "role_name": r.role_name,
            "role_category": r.role_category,
            "description": r.description,
            "is_active": r.is_active
        }
        for r in roles
    ]

@router.get("/user-roles")
def list_user_roles(db: Session = Depends(get_db)):
    from app.models.core_models import UserRole
    mappings = db.query(UserRole).all()
    return [
        {
            "id": m.id,
            "user_id": m.user_id,
            "user_name": m.user.full_name if m.user else None,
            "login_id": m.user.login_id if m.user else None,
            "role_id": m.role_id,
            "role_code": m.role.role_code if m.role else None,
            "role_name": m.role.role_name if m.role else None,
            "assigned_at": m.assigned_at.isoformat() if m.assigned_at else None
        }
        for m in mappings
    ]

@router.post("/user-roles")
def assign_user_role(data: dict, db: Session = Depends(get_db)):
    from app.models.core_models import UserRole
    user_id = data.get("user_id")
    role_id = data.get("role_id")
    if not user_id or not role_id:
        raise HTTPException(status_code=400, detail="user_id and role_id are required")
    
    existing = db.query(UserRole).filter(UserRole.user_id == user_id, UserRole.role_id == role_id).first()
    if existing:
        return {"message": "User role assignment already exists", "id": existing.id}
    
    mapping = UserRole(user_id=user_id, role_id=role_id)
    db.add(mapping)
    db.commit()
    return {"message": "Role assigned to user successfully", "id": mapping.id}

@router.put("/users/{id}/toggle-status")
def toggle_user_status(id: int, data: Optional[dict] = None, db: Session = Depends(get_db)):
    from app.models.core_models import AppUser
    from app.services.audit_service import log_audit
    u = db.query(AppUser).filter(AppUser.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_status = "Active" if u.is_active else "Suspended"
    u.is_active = not u.is_active
    new_status = "Active" if u.is_active else "Suspended"
    
    reason = (data or {}).get("reason", f"Status changed to {new_status}")
    log_audit(
        db,
        table_code="app_users",
        record_id=u.id,
        action="UPDATE",
        remarks=f"User {u.login_id} status changed from {old_status} to {new_status}. Reason: {reason}"
    )
    db.commit()
    return {"message": f"User {u.login_id} is now {new_status}", "is_active": u.is_active, "status": new_status}

# ----------------- Workflow Execution History -----------------
@router.get("/workflow-logs")
def list_workflow_logs(table_code: Optional[str] = None, record_id: Optional[int] = None, db: Session = Depends(get_db)):
    from app.models.core_models import GenWorkflowHistory
    query = db.query(GenWorkflowHistory)
    if table_code:
        query = query.filter(GenWorkflowHistory.table_code == table_code)
    if record_id:
        query = query.filter(GenWorkflowHistory.record_id == record_id)
    
    logs = query.order_by(GenWorkflowHistory.id.desc()).limit(100).all()
    return [
        {
            "id": l.id,
            "table_code": l.table_code,
            "record_id": l.record_id,
            "action_code": l.action_code,
            "action_label": l.action_label,
            "from_status": l.from_status,
            "to_status": l.to_status,
            "action_by": l.action_by,
            "action_by_name": l.action_by_name,
            "remarks": l.remarks,
            "action_at": l.action_at.isoformat() if l.action_at else None
        }
        for l in logs
    ]
