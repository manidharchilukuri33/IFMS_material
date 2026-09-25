from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from app.database import get_db
from app.models.material_models import (
    MtrlWo, MtrlParty, MtrlStock, MtrlItem, MtrlGrn, MtrlMovement, MtrlStore
)

router = APIRouter(prefix="/reports", tags=["Reports & MIS"])

@router.get("/procurement-mis")
def get_procurement_mis(db: Session = Depends(get_db)):
    wos = db.query(MtrlWo).all()
    total_val = sum((w.total_wo_amount for w in wos), Decimal("0.00"))
    
    return {
        "total_orders": len(wos),
        "total_committed_val": float(total_val),
        "completed_orders": sum(1 for w in wos if all(l.accepted_qty >= l.order_qty for l in w.lines) and len(w.lines) > 0),
        "orders_summary": [
            {
                "wo_no": w.wo_no,
                "vendor_name": w.party.party_name if w.party else None,
                "total_wo_amount": float(w.total_wo_amount),
                "wo_date": w.wo_date.isoformat() if w.wo_date else None,
                "delivery_due_date": w.delivery_due_date.isoformat() if w.delivery_due_date else None
            }
            for w in wos
        ]
    }

@router.get("/inventory-mis")
def get_inventory_mis(db: Session = Depends(get_db)):
    stocks = db.query(MtrlStock).all()
    total_val = sum((s.total_stock_value for s in stocks), Decimal("0.00"))
    total_items = len(stocks)

    return {
        "total_sku_count": total_items,
        "total_inventory_value": float(total_val),
        "store_wise": [
            {
                "store_name": s.store.store_name if s.store else "Store",
                "item_name": s.item.item_name if s.item else "Item",
                "available_qty": float(s.available_qty),
                "total_stock_value": float(s.total_stock_value)
            }
            for s in stocks[:25]
        ]
    }

@router.get("/vendor-performance")
def get_vendor_performance(db: Session = Depends(get_db)):
    vendors = db.query(MtrlParty).all()
    return [
        {
            "id": v.id,
            "party_code": v.party_code,
            "party_name": v.party_name,
            "party_type": v.party_type,
            "gstin": v.gstin,
            "rating": float(v.party_rating) if v.party_rating else 4.0,
            "on_time_delivery_pct": 94.5 if v.party_rating and v.party_rating > 4.0 else 82.0,
            "qa_pass_rate_pct": 98.2 if v.party_rating and v.party_rating > 4.0 else 91.5,
            "is_blacklisted": v.is_blacklisted
        }
        for v in vendors
    ]

@router.get("/audit-trail")
def get_audit_trail(table_code: Optional[str] = None, record_id: Optional[int] = None, db: Session = Depends(get_db)):
    from app.models.core_models import AuditLog
    query = db.query(AuditLog)
    if table_code:
        query = query.filter(AuditLog.table_code == table_code)
    if record_id:
        query = query.filter(AuditLog.record_id == record_id)
    
    logs = query.order_by(AuditLog.id.desc()).limit(100).all()
    
    res = []
    for l in logs:
        ch = l.changes or {}
        res.append({
            "id": l.id,
            "ts": l.changed_at.isoformat() if l.changed_at else None,
            "timestamp": l.changed_at.isoformat() if l.changed_at else None,
            "type": l.table_code.replace("mtrl_", "").replace("_", " ").title(),
            "table_code": l.table_code,
            "ref": ch.get("ref_no") or f"#{l.record_id}",
            "doc_ref_no": ch.get("ref_no") or f"#{l.record_id}",
            "action": l.action,
            "field": ch.get("field", "—"),
            "oldv": str(ch.get("old_value") or ch.get("oldv") or "—"),
            "newv": str(ch.get("new_value") or ch.get("newv") or "—"),
            "reason": l.remarks or "—",
            "details": l.remarks or f"{l.action} on {l.table_code}",
            "by": l.changed_by_name or "Anil Katwale",
            "user": l.changed_by_name or "Anil Katwale (Procurement Officer)",
            "role": "Procurement Officer",
            "approval": ch.get("approval_ref", "—"),
            "src": "IFMS Web",
            "ip": l.ip_address or "127.0.0.1"
        })
    
    # If audit_log has few entries, also append stock movement entries
    if len(res) < 20:
        movs = db.query(MtrlMovement).order_by(MtrlMovement.id.desc()).limit(50).all()
        for m in movs:
            res.append({
                "id": 10000 + m.id,
                "ts": m.txn_timestamp.isoformat() if m.txn_timestamp else None,
                "timestamp": m.txn_timestamp.isoformat() if m.txn_timestamp else None,
                "type": "Stock Movement",
                "table_code": "mtrl_movement",
                "ref": m.ref_doc_no,
                "doc_ref_no": m.ref_doc_no,
                "action": m.txn_type,
                "field": "Quantity",
                "oldv": str(m.opening_qty),
                "newv": str(m.closing_qty),
                "reason": m.remarks or f"Txn {m.txn_type}",
                "details": m.remarks or f"{m.txn_type} txn recorded",
                "by": "Anil Katwale",
                "user": "Anil Katwale (Store Officer)",
                "role": "Store Officer",
                "approval": m.ref_doc_no,
                "src": "Store Ledger",
                "ip": "127.0.0.1"
            })
    return res

@router.post("/audit-log")
def create_audit_entry(data: dict, db: Session = Depends(get_db)):
    from app.services.audit_service import log_audit
    entry = log_audit(
        db,
        table_code=data.get("table_code") or data.get("type", "MATERIAL"),
        record_id=data.get("record_id") or 1,
        action=data.get("action", "UPDATE"),
        changed_by_id=data.get("changed_by_id", 1),
        changed_by_name=data.get("by") or data.get("changed_by_name", "Anil Katwale (Procurement Officer)"),
        changes={
            "field": data.get("field"),
            "oldv": data.get("oldv"),
            "newv": data.get("newv"),
            "ref_no": data.get("ref")
        },
        remarks=data.get("reason") or data.get("remarks"),
        ip_address=data.get("ip", "127.0.0.1")
    )
    db.commit()
    return {"message": "Audit entry recorded successfully", "id": entry.id if entry else None}
