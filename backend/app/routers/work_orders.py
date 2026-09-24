from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta
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

    lines_data = data.get("lines", [])
    tot_b = sum(Decimal(str(l["order_qty"])) * Decimal(str(l["unit_rate"])) for l in lines_data)
    tot_t = sum(Decimal(str(l["order_qty"])) * Decimal(str(l["unit_rate"])) * Decimal(str(l.get("tax_percent", 18.0))) / Decimal("100.0") for l in lines_data)

    wo = MtrlWo(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        wo_no=wo_no,
        wo_date=date.today(),
        party_id=data["party_id"],
        delivery_store_id=data.get("store_id", 1),
        tender_id=data.get("tender_id"),
        total_basic_amt=tot_b,
        total_tax_amt=tot_t,
        total_wo_amount=tot_b + tot_t,
        pb_guarantee_amt=(tot_b + tot_t) * Decimal("0.05"),
        delivery_due_date=date.fromisoformat(data["delivery_due_date"]) if data.get("delivery_due_date") else date.today() + timedelta(days=30),
        payment_terms=data.get("payment_terms", "100% upon delivery and inspection")
    )
    db.add(wo)
    db.flush()

    for l in lines_data:
        item = db.query(MtrlItem).filter(MtrlItem.id == l["item_id"]).first()
        qty = Decimal(str(l["order_qty"]))
        rate = Decimal(str(l["unit_rate"]))
        tax_pct = Decimal(str(l.get("tax_percent", 18.0)))
        tax_amt = qty * rate * (tax_pct / Decimal("100.0"))

        db.add(MtrlWoLine(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            wo_id=wo.id,
            item_id=l["item_id"],
            order_qty=qty,
            uom_id=l.get("uom_id") or (item.base_uom_id if item else 1),
            unit_rate=rate,
            tax_percent=tax_pct,
            tax_amount=tax_amt,
            total_line_amount=qty * rate + tax_amt
        ))

    # Add initial delivery tracking record
    db.add(MtrlDelivery(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        delivery_ref_no=f"DEL/2026/{random.randint(1000,9999)}",
        wo_id=wo.id,
        party_id=wo.party_id,
        dispatch_date=date.today(),
        expected_date=wo.delivery_due_date,
        courier_transporter="Pending Transporter Assignment",
        delivery_status="In Transit"
    ))

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
