from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date
from app.database import get_db
from app.models.material_models import MtrlAudit, MtrlAuditLn, MtrlAdjust, MtrlStore, MtrlItem, MtrlStock

router = APIRouter(prefix="/audit", tags=["Stock Audit & Reconciliation"])

# ----------------- Physical Verification Schedules -----------------
@router.get("/schedules")
def list_audit_schedules(db: Session = Depends(get_db)):
    audits = db.query(MtrlAudit).order_by(MtrlAudit.id.desc()).all()
    return [
        {
            "id": a.id,
            "audit_no": a.audit_no,
            "audit_type": a.audit_type,
            "store_id": a.store_id,
            "store_name": a.store.store_name if a.store else None,
            "period_label": a.period_label,
            "audit_team_lead": a.audit_team_lead,
            "start_date": a.start_date.isoformat() if a.start_date else None,
            "end_date": a.end_date.isoformat() if a.end_date else None,
            "audit_status": a.audit_status,
            "lines_count": len(a.lines),
            "lines": [
                {
                    "id": l.id,
                    "item_id": l.item_id,
                    "item_code": l.item.item_code if l.item else None,
                    "item_name": l.item.item_name if l.item else None,
                    "book_qty": float(l.book_qty),
                    "physical_qty": float(l.physical_qty),
                    "diff_qty": float(l.physical_qty - l.book_qty),
                    "variance_value": float(l.variance_value),
                    "investigation_notes": l.investigation_notes,
                    "adjustment_action": l.adjustment_action
                }
                for l in a.lines
            ]
        }
        for a in audits
    ]

@router.post("/schedules")
def create_audit_schedule(data: dict, db: Session = Depends(get_db)):
    req_no = data.get("audit_code") or data.get("audit_number")
    if req_no and not db.query(MtrlAudit).filter(MtrlAudit.audit_no == req_no).first():
        a_no = req_no
    else:
        cnt = db.query(MtrlAudit).count() + 1
        while db.query(MtrlAudit).filter(MtrlAudit.audit_no == f"PV/2026/{cnt:04d}").first():
            cnt += 1
        a_no = f"PV/2026/{cnt:04d}"

    audit = MtrlAudit(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        audit_no=a_no,
        audit_type=data.get("audit_type", "Annual PV"),
        store_id=data["store_id"],
        period_label=data.get("period_label", "FY 2026-27 Audit Cycle"),
        audit_team_lead=data.get("audit_team_lead", "Board of Inspection Officers"),
        start_date=date.today(),
        audit_status="In Progress"
    )
    db.add(audit)
    db.flush()

    # Pre-populate lines from current store stock
    stocks = db.query(MtrlStock).filter(MtrlStock.store_id == data["store_id"]).all()
    for s in stocks:
        db.add(MtrlAuditLn(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            audit_id=audit.id,
            item_id=s.item_id,
            book_qty=s.available_qty,
            physical_qty=s.available_qty,  # default to match
            variance_value=Decimal("0.00"),
            adjustment_action="Pending"
        ))

    db.commit()
    return {"message": "Physical verification schedule created", "id": audit.id, "audit_no": a_no}

@router.put("/schedules/{id}/record-counts")
def record_audit_counts(id: int, data: dict, db: Session = Depends(get_db)):
    audit = db.query(MtrlAudit).filter(MtrlAudit.id == id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit schedule not found")

    for entry in data.get("counts", []):
        ln = db.query(MtrlAuditLn).filter(MtrlAuditLn.id == entry["line_id"]).first()
        if ln:
            ln.physical_qty = Decimal(str(entry["physical_qty"]))
            diff = ln.physical_qty - ln.book_qty
            rate = ln.item.estimated_rate if ln.item else Decimal("0.00")
            ln.variance_value = diff * rate
            ln.investigation_notes = entry.get("notes")
            ln.adjustment_action = "Write-Off Proposed" if diff < 0 else ("Write-In Surplus" if diff > 0 else "Reconciled")

    audit.audit_status = "Submitted"
    audit.end_date = date.today()
    db.commit()
    return {"message": "Physical counts and variances recorded"}

# ----------------- Stock Adjustments -----------------
@router.get("/adjustments")
def list_adjustments(db: Session = Depends(get_db)):
    adjs = db.query(MtrlAdjust).all()
    return [
        {
            "id": a.id,
            "adj_voucher_no": a.adj_voucher_no,
            "store_id": a.store_id,
            "store_name": a.store.store_name if a.store else None,
            "item_id": a.item_id,
            "item_name": a.item.item_name if a.item else None,
            "adjustment_type": a.adjustment_type,
            "adj_qty": float(a.adj_qty),
            "adj_value": float(a.adj_value),
            "sanction_order_no": a.sanction_order_no,
            "sanction_order_date": a.sanction_order_date.isoformat() if a.sanction_order_date else None,
            "created_at": a.created_at.isoformat() if a.created_at else None
        }
        for a in adjs
    ]

@router.post("/adjustments")
def create_adjustment(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlAdjust).count() + 1
    adj_no = f"ADJ/2026/{cnt:04d}"

    item = db.query(MtrlItem).filter(MtrlItem.id == data["item_id"]).first()
    qty = Decimal(str(data["adj_qty"]))
    rate = item.estimated_rate if item else Decimal("100.00")

    adj = MtrlAdjust(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        adj_voucher_no=adj_no,
        audit_id=data.get("audit_id"),
        store_id=data["store_id"],
        item_id=data["item_id"],
        adjustment_type=data["adjustment_type"],
        adj_qty=qty,
        adj_value=qty * rate,
        sanction_order_no=data.get("sanction_order_no", f"SAN/IT/2026/ADJ-{cnt:02d}"),
        sanction_order_date=date.today()
    )
    db.add(adj)

    # Adjust stock balance
    stk = db.query(MtrlStock).filter(MtrlStock.store_id == data["store_id"], MtrlStock.item_id == data["item_id"]).first()
    if stk:
        if "Write-Off" in data["adjustment_type"]:
            stk.available_qty = max(Decimal("0.00"), stk.available_qty - qty)
        else:
            stk.available_qty += qty
        stk.total_stock_value = stk.available_qty * stk.avg_unit_cost

    db.commit()
    return {"message": "Stock adjustment write-off/in posted to ledger", "id": adj.id, "adj_voucher_no": adj_no}
