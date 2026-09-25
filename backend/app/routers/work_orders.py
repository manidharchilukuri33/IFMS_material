from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta
import random
from app.database import get_db
from app.models.material_models import (
    MtrlWo, MtrlWoLine, MtrlWoAmend, MtrlDelivery, MtrlParty, MtrlStore, MtrlItem
)

router = APIRouter(prefix="/work-orders", tags=["Work Orders & Purchase Orders"])

@router.get("/")
def list_work_orders(
    status: Optional[str] = None,
    vendor_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlWo)
    if status:
        query = query.filter(MtrlWo.wo_status == status)
    if vendor_id:
        query = query.filter(MtrlWo.party_id == vendor_id)
    if search:
        s = f"%{search}%"
        query = query.filter(MtrlWo.wo_no.ilike(s))

    orders = query.order_by(MtrlWo.id.desc()).all()
    return [
        {
            "id": w.id,
            "wo_no": w.wo_no,
            "wo_date": w.wo_date.isoformat() if w.wo_date else None,
            "party_id": w.party_id,
            "vendor_name": w.party.party_name if w.party else None,
            "store_id": w.delivery_store_id,
            "store_name": w.delivery_store.store_name if w.delivery_store else None,
            "total_basic_amt": float(w.total_basic_amt),
            "total_tax_amt": float(w.total_tax_amt),
            "total_wo_amount": float(w.total_wo_amount),
            "delivery_due_date": w.delivery_due_date.isoformat() if w.delivery_due_date else None,
            "status": "Delayed" if w.delivery_due_date and w.delivery_due_date < date.today() and any(d.delivery_status == 'Delayed' for d in db.query(MtrlDelivery).filter(MtrlDelivery.wo_id == w.id).all()) else ("Completed" if all(l.accepted_qty >= l.order_qty for l in w.lines) and len(w.lines) > 0 else "Issued"),
            "lines_count": len(w.lines),
            "amendments_count": len(w.amendments),
            "lines": [
                {
                    "id": l.id,
                    "item_id": l.item_id,
                    "item_code": l.item.item_code if l.item else None,
                    "item_name": l.item.item_name if l.item else None,
                    "uom_code": l.uom.uom_code if l.uom else None,
                    "order_qty": float(l.order_qty),
                    "unit_rate": float(l.unit_rate),
                    "tax_percent": float(l.tax_percent),
                    "total_line_amount": float(l.total_line_amount),
                    "accepted_qty": float(l.accepted_qty)
                }
                for l in w.lines
            ]
        }
        for w in orders
    ]

@router.get("/{id}")
def get_work_order(id: int, db: Session = Depends(get_db)):
    w = db.query(MtrlWo).filter(MtrlWo.id == id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    return {
        "id": w.id,
        "wo_no": w.wo_no,
        "wo_date": w.wo_date.isoformat() if w.wo_date else None,
        "party_id": w.party_id,
        "vendor_name": w.party.party_name if w.party else None,
        "vendor_gstin": w.party.gstin if w.party else None,
        "store_id": w.delivery_store_id,
        "store_name": w.delivery_store.store_name if w.delivery_store else None,
        "total_basic_amt": float(w.total_basic_amt),
        "total_tax_amt": float(w.total_tax_amt),
        "total_wo_amount": float(w.total_wo_amount),
        "pb_guarantee_amt": float(w.pb_guarantee_amt) if w.pb_guarantee_amt else 0,
        "delivery_due_date": w.delivery_due_date.isoformat() if w.delivery_due_date else None,
        "payment_terms": w.payment_terms,
        "status": "Issued",
        "lines": [
            {
                "id": l.id,
                "item_id": l.item_id,
                "item_code": l.item.item_code if l.item else None,
                "item_name": l.item.item_name if l.item else None,
                "uom_code": l.uom.uom_code if l.uom else None,
                "order_qty": float(l.order_qty),
                "unit_rate": float(l.unit_rate),
                "tax_percent": float(l.tax_percent),
                "tax_amount": float(l.tax_amount),
                "total_line_amount": float(l.total_line_amount),
                "accepted_qty": float(l.accepted_qty)
            }
            for l in w.lines
        ],
        "amendments": [
            {
                "id": a.id,
                "amend_no": a.amend_no,
                "amend_date": a.amend_date.isoformat() if a.amend_date else None,
                "amend_type": a.amend_type,
                "old_value": float(a.old_value) if a.old_value else None,
                "new_value": float(a.new_value) if a.new_value else None,
                "reason": a.reason,
                "approval_ref_no": a.approval_ref_no
            }
            for a in w.amendments
        ]
    }

@router.post("/")
def create_work_order(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlWo).count() + 1
    wo_no = data.get("wo_no") or f"PO/DIT/2026/{210 + cnt:05d}"

    lines_data = data.get("lines") or data.get("items") or []
    tot_b = Decimal("0.00")
    tot_t = Decimal("0.00")
    for l in lines_data:
        q = Decimal(str(l.get("order_qty") or l.get("quantity") or l.get("qty", 1)))
        r = Decimal(str(l.get("unit_rate") or l.get("rate") or l.get("unit_price", 0)))
        t_pct = Decimal(str(l.get("tax_percent") or l.get("gst_rate_pct") or l.get("tax_rate", 18.0)))
        tot_b += q * r
        tot_t += q * r * (t_pct / Decimal("100.0"))

    party_id = data.get("party_id") or data.get("vendor_id") or 1
    due_date = date.today() + timedelta(days=30)
    if data.get("delivery_due_date"):
        try:
            due_date = date.fromisoformat(str(data["delivery_due_date"])[:10])
        except Exception:
            pass

    wo = MtrlWo(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        wo_no=wo_no,
        wo_date=date.today(),
        party_id=party_id,
        delivery_store_id=data.get("store_id") or data.get("delivery_store_id", 1),
        tender_id=data.get("tender_id"),
        total_basic_amt=tot_b,
        total_tax_amt=tot_t,
        total_wo_amount=tot_b + tot_t,
        pb_guarantee_amt=(tot_b + tot_t) * Decimal("0.05"),
        delivery_due_date=due_date,
        payment_terms=data.get("payment_terms", "100% upon delivery and inspection"),
        status_id=1
    )
    db.add(wo)
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
        qty = Decimal(str(l.get("order_qty") or l.get("quantity") or l.get("qty", 1)))
        rate = Decimal(str(l.get("unit_rate") or l.get("rate") or l.get("unit_price", (item.estimated_rate if item else 0))))
        tax_pct = Decimal(str(l.get("tax_percent") or l.get("gst_rate_pct") or l.get("tax_rate", 18.0)))
        tax_amt = qty * rate * (tax_pct / Decimal("100.0"))

        db.add(MtrlWoLine(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            wo_id=wo.id,
            item_id=final_item_id,
            order_qty=qty,
            uom_id=l.get("uom_id") or (item.base_uom_id if item else 1),
            unit_rate=rate,
            tax_percent=tax_pct,
            tax_amount=tax_amt,
            total_line_amount=qty * rate + tax_amt
        ))

    # Add initial delivery tracking record
    deliv = MtrlDelivery(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        delivery_ref_no=f"DEL/2026/{random.randint(1000,9999)}",
        wo_id=wo.id,
        party_id=wo.party_id,
        dispatch_date=date.today(),
        expected_date=wo.delivery_due_date,
        courier_transporter="Pending Transporter Assignment",
        delivery_status="In Transit"
    )
    db.add(deliv)

    from app.services.audit_service import log_audit, log_workflow, log_notification

    log_audit(
        db,
        table_code="mtrl_wo",
        record_id=wo.id,
        action="CREATE",
        changes={"ref_no": wo.wo_no, "total_wo_amount": float(wo.total_wo_amount), "vendor_id": wo.party_id},
        remarks=f"Purchase/Work Order {wo.wo_no} issued to vendor."
    )
    log_workflow(
        db,
        table_code="mtrl_wo",
        record_id=wo.id,
        action_code="ISSUE_WO",
        action_label="Issue Work Order",
        from_status="Approved Requisition",
        to_status="Issued",
        remarks=f"Issued purchase order {wo.wo_no}"
    )
    log_notification(
        db,
        title="Purchase Order Issued",
        message=f"Purchase Order #{wo.wo_no} has been issued and dispatched to vendor.",
        event_type="WORK_ORDER",
        target_role="Store Officer",
        action_route="/wo/delivery"
    )

    db.commit()
    return {"message": "Work order created successfully", "id": wo.id, "wo_no": wo.wo_no}

# ----------------- Amendments -----------------
@router.post("/{id}/amendments")
def create_amendment(id: int, data: dict, db: Session = Depends(get_db)):
    wo = db.query(MtrlWo).filter(MtrlWo.id == id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    
    cnt = db.query(MtrlWoAmend).filter(MtrlWoAmend.wo_id == id).count() + 1
    amend_no = f"AMD/{wo.wo_no}/{cnt:02d}"

    amend = MtrlWoAmend(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        amend_no=amend_no,
        wo_id=wo.id,
        amend_date=date.today(),
        amend_type=data["amend_type"],
        old_value=Decimal(str(data.get("old_value", wo.total_wo_amount))),
        new_value=Decimal(str(data.get("new_value", wo.total_wo_amount))),
        reason=data["reason"],
        approval_ref_no=data.get("approval_ref_no", f"SAN/DIT/EXT/{random.randint(100,999)}")
    )
    db.add(amend)

    if data["amend_type"] == "Delivery Extension" and data.get("new_delivery_date"):
        wo.delivery_due_date = date.fromisoformat(data["new_delivery_date"])
    elif data["amend_type"] == "Value Revision" and data.get("new_value"):
        wo.total_wo_amount = Decimal(str(data["new_value"]))

    from app.services.audit_service import log_audit, log_workflow
    log_audit(
        db,
        table_code="mtrl_wo_amend",
        record_id=wo.id,
        action="AMEND",
        changes={"ref_no": amend_no, "amend_type": amend.amend_type, "reason": amend.reason},
        remarks=f"Amendment {amend_no} ({amend.amend_type}) recorded for {wo.wo_no}"
    )
    log_workflow(
        db,
        table_code="mtrl_wo",
        record_id=wo.id,
        action_code="AMEND",
        action_label=f"PO Amended ({amend.amend_type})",
        from_status="Issued",
        to_status="Amended",
        remarks=amend.reason
    )

    db.commit()
    return {"message": "Work order amendment approved and recorded", "amend_no": amend_no}

# ----------------- Delivery Tracking -----------------
@router.get("/deliveries/all")
def list_deliveries(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlDelivery)
    if status:
        query = query.filter(MtrlDelivery.delivery_status == status)
    
    dels = query.all()
    return [
        {
            "id": d.id,
            "delivery_ref_no": d.delivery_ref_no,
            "wo_no": d.work_order.wo_no if d.work_order else None,
            "party_id": d.party_id,
            "vendor_name": d.party.party_name if d.party else None,
            "dispatch_date": d.dispatch_date.isoformat() if d.dispatch_date else None,
            "expected_date": d.expected_date.isoformat() if d.expected_date else None,
            "received_date": d.received_date.isoformat() if d.received_date else None,
            "courier_transporter": d.courier_transporter,
            "lr_docket_no": d.lr_docket_no,
            "vehicle_no": d.vehicle_no,
            "delivery_status": d.delivery_status
        }
        for d in dels
    ]

@router.put("/deliveries/{id}")
def update_delivery(id: int, data: dict, db: Session = Depends(get_db)):
    d = db.query(MtrlDelivery).filter(MtrlDelivery.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Delivery record not found")
    
    if "delivery_status" in data:
        d.delivery_status = data["delivery_status"]
    if "courier_transporter" in data:
        d.courier_transporter = data["courier_transporter"]
    if "lr_docket_no" in data:
        d.lr_docket_no = data["lr_docket_no"]
    if "vehicle_no" in data:
        d.vehicle_no = data["vehicle_no"]
    if data.get("delivery_status") == "Delivered":
        d.received_date = date.today()

    db.commit()
    return {"message": "Delivery tracking updated successfully", "id": d.id}
