from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
from app.database import get_db
from app.models.material_models import MtrlReq, MtrlReqLine, MtrlStore, MtrlItem, MtrlProcPln

router = APIRouter(prefix="/requisitions", tags=["Requisition Management"])

@router.get("/")
def list_requisitions(
    stage: Optional[str] = None,
    priority: Optional[str] = None,
    store_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlReq)
    if stage:
        query = query.filter(MtrlReq.current_stage == stage)
    if priority:
        query = query.filter(MtrlReq.priority == priority)
    if store_id:
        query = query.filter(MtrlReq.target_store_id == store_id)
    if search:
        s = f"%{search}%"
        query = query.filter(MtrlReq.req_no.ilike(s) | MtrlReq.purpose.ilike(s))

    reqs = query.order_by(MtrlReq.id.desc()).all()
    
    return [
        {
            "id": r.id,
            "req_no": r.req_no,
            "req_date": r.req_date.isoformat() if r.req_date else None,
            "priority": r.priority,
            "store_id": r.target_store_id,
            "store_name": r.store.store_name if r.store else None,
            "purpose": r.purpose,
            "total_est_amount": float(r.total_est_amount) if r.total_est_amount else 0,
            "current_stage": r.current_stage,
            "approved_at": r.approved_at.isoformat() if r.approved_at else None,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "lines_count": len(r.lines),
            "lines": [
                {
                    "id": l.id,
                    "item_id": l.item_id,
                    "item_code": l.item.item_code if l.item else None,
                    "item_name": l.item.item_name if l.item else None,
                    "uom_code": l.uom.uom_code if l.uom else None,
                    "requested_qty": float(l.requested_qty),
                    "approved_qty": float(l.approved_qty) if l.approved_qty else None,
                    "est_unit_rate": float(l.est_unit_rate),
                    "line_est_amount": float(l.line_est_amount),
                    "preferred_make": l.preferred_make,
                    "technical_spec": l.technical_spec
                }
                for l in r.lines
            ]
        }
        for r in reqs
    ]

@router.get("/pending-approvals")
def list_pending_approvals(db: Session = Depends(get_db)):
    stages = ['Submitted', 'Under Review', 'Budget Validation Pending']
    reqs = db.query(MtrlReq).filter(MtrlReq.current_stage.in_(stages)).order_by(MtrlReq.id.desc()).all()
    return [
        {
            "id": r.id,
            "req_no": r.req_no,
            "req_date": r.req_date.isoformat() if r.req_date else None,
            "priority": r.priority,
            "store_name": r.store.store_name if r.store else None,
            "purpose": r.purpose,
            "total_est_amount": float(r.total_est_amount) if r.total_est_amount else 0,
            "current_stage": r.current_stage,
            "lines_count": len(r.lines)
        }
        for r in reqs
    ]

@router.get("/{id}")
def get_requisition(id: int, db: Session = Depends(get_db)):
    r = db.query(MtrlReq).filter(MtrlReq.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    return {
        "id": r.id,
        "req_no": r.req_no,
        "req_date": r.req_date.isoformat() if r.req_date else None,
        "priority": r.priority,
        "store_id": r.target_store_id,
        "store_name": r.store.store_name if r.store else None,
        "purpose": r.purpose,
        "total_est_amount": float(r.total_est_amount) if r.total_est_amount else 0,
        "current_stage": r.current_stage,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "lines": [
            {
                "id": l.id,
                "item_id": l.item_id,
                "item_code": l.item.item_code if l.item else None,
                "item_name": l.item.item_name if l.item else None,
                "uom_code": l.uom.uom_code if l.uom else None,
                "requested_qty": float(l.requested_qty),
                "approved_qty": float(l.approved_qty) if l.approved_qty else float(l.requested_qty),
                "est_unit_rate": float(l.est_unit_rate),
                "line_est_amount": float(l.line_est_amount),
                "preferred_make": l.preferred_make,
                "technical_spec": l.technical_spec
            }
            for l in r.lines
        ]
    }

@router.post("/")
def create_requisition(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlReq).count() + 1
    req_no = data.get("req_no") or f"MR/DIT/2026/{350 + cnt:06d}"
    
    lines_data = data.get("lines") or data.get("items") or []
    tot_amt = sum(Decimal(str(l.get("requested_qty") or l.get("qty", 0))) * Decimal(str(l.get("est_unit_rate") or l.get("estimated_rate") or l.get("rate", 0))) for l in lines_data)

    req_date = date.today()
    if data.get("req_date"):
        try:
            req_date = date.fromisoformat(str(data["req_date"])[:10])
        except Exception:
            pass

    req = MtrlReq(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        req_no=req_no,
        req_date=req_date,
        target_store_id=data.get("store_id") or data.get("target_store_id") or 1,
        priority=data.get("priority", "Normal"),
        purpose=data.get("purpose", "Departmental requirement"),
        total_est_amount=tot_amt,
        current_stage=data.get("current_stage", "Submitted")
    )
    db.add(req)
    db.flush()

    for l in lines_data:
        item_id = l.get("item_id")
        item = None
        if isinstance(item_id, int):
            item = db.query(MtrlItem).filter(MtrlItem.id == item_id).first()
        if not item:
            mat_code = l.get("mat") or l.get("item_code") or (str(item_id) if item_id else None)
            if mat_code:
                item = db.query(MtrlItem).filter(MtrlItem.item_code == mat_code).first()
        if not item:
            item = db.query(MtrlItem).first()
        
        final_item_id = item.id if item else 1
        qty = Decimal(str(l.get("requested_qty") or l.get("qty", 1)))
        rate = Decimal(str(l.get("est_unit_rate") or l.get("estimated_rate") or l.get("rate") or (item.estimated_rate if item else 0)))
        
        db.add(MtrlReqLine(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            req_id=req.id,
            item_id=final_item_id,
            variant_id=l.get("variant_id"),
            requested_qty=qty,
            approved_qty=qty,
            uom_id=l.get("uom_id") or (item.base_uom_id if item else 1),
            est_unit_rate=rate,
            line_est_amount=qty * rate,
            preferred_make=l.get("preferred_make") or l.get("make") or (item.brand_name if item else None),
            technical_spec=l.get("technical_spec") or l.get("spec") or (item.item_desc if item else None)
        ))
    
    db.commit()
    return {"message": "Requisition created successfully", "id": req.id, "req_no": req.req_no}

@router.put("/{id}/status")
def update_requisition_status(id: int, data: dict, db: Session = Depends(get_db)):
    req = db.query(MtrlReq).filter(MtrlReq.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Requisition not found")
    
    action = data.get("action", "").lower()
    if action == "approve":
        req.current_stage = "Approved"
        req.approved_at = datetime.now()
        for ln in req.lines:
            ln.approved_qty = ln.requested_qty
    elif action == "reject":
        req.current_stage = "Rejected"
    elif action == "return":
        req.current_stage = "Returned for Correction"
    elif action == "review":
        req.current_stage = "Under Review"
    elif action == "budget_validate":
        req.current_stage = "Budget Validation Pending"
    else:
        req.current_stage = data.get("current_stage", req.current_stage)

    db.commit()
    return {"message": f"Requisition status updated to {req.current_stage}", "id": req.id, "stage": req.current_stage}

@router.post("/consolidate")
def consolidate_requisitions(data: dict, db: Session = Depends(get_db)):
    req_ids = data.get("req_ids", [])
    if not req_ids:
        raise HTTPException(status_code=400, detail="No requisitions selected for consolidation")

    reqs = db.query(MtrlReq).filter(MtrlReq.id.in_(req_ids)).all()
    tot_val = sum((r.total_est_amount for r in reqs), Decimal("0.00"))

    cnt = db.query(MtrlProcPln).count() + 1
    plan_no = f"APP/2026/CONSO-{cnt:03d}"

    plan = MtrlProcPln(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        plan_no=plan_no,
        total_budget=tot_val * Decimal("1.1"),
        planned_value=tot_val,
        proc_mode="GeM Custom Bid"
    )
    db.add(plan)

    for r in reqs:
        r.current_stage = "Procurement Initiated"

    db.commit()
    return {
        "message": f"Successfully consolidated {len(reqs)} requisitions into Procurement Plan {plan_no}",
        "plan_no": plan_no,
        "total_value": float(tot_val)
    }
