from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
import random
from app.database import get_db
from app.models.material_models import (
    MtrlGrn, MtrlGrnLine, MtrlInsp, MtrlRtv, MtrlWo, MtrlWoLine, MtrlParty, MtrlStore, MtrlItem, MtrlStock, MtrlMovement
)

router = APIRouter(prefix="/grn", tags=["Goods Receipt & Inspection"])

# ----------------- GRN Register -----------------
@router.get("/")
def list_grns(
    insp_status: Optional[str] = None,
    posting_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlGrn)
    if insp_status:
        query = query.filter(MtrlGrn.inspection_status == insp_status)
    if posting_status:
        query = query.filter(MtrlGrn.posting_status == posting_status)
    if search:
        s = f"%{search}%"
        query = query.filter(MtrlGrn.grn_no.ilike(s) | MtrlGrn.challan_no.ilike(s))

    grns = query.order_by(MtrlGrn.id.desc()).all()
    return [
        {
            "id": g.id,
            "grn_no": g.grn_no,
            "grn_date": g.grn_date.isoformat() if g.grn_date else None,
            "wo_id": g.wo_id,
            "wo_no": g.work_order.wo_no if g.work_order else None,
            "party_id": g.party_id,
            "vendor_name": g.party.party_name if g.party else None,
            "store_id": g.store_id,
            "store_name": g.store.store_name if g.store else None,
            "challan_no": g.challan_no,
            "challan_date": g.challan_date.isoformat() if g.challan_date else None,
            "gate_entry_no": g.gate_entry_no,
            "vehicle_number": g.vehicle_number,
            "inspection_status": g.inspection_status,
            "posting_status": g.posting_status,
            "lines_count": len(g.lines),
            "lines": [
                {
                    "id": l.id,
                    "item_id": l.item_id,
                    "item_code": l.item.item_code if l.item else None,
                    "item_name": l.item.item_name if l.item else None,
                    "challan_qty": float(l.challan_qty),
                    "received_qty": float(l.received_qty),
                    "accepted_qty": float(l.accepted_qty),
                    "rejected_qty": float(l.rejected_qty),
                    "batch_number": l.batch_number,
                    "storage_bin": l.storage_bin
                }
                for l in g.lines
            ]
        }
        for g in grns
    ]

# ----------------- Inspections -----------------
@router.get("/inspections")
@router.get("/inspections/all")
def list_inspections(db: Session = Depends(get_db)):
    insps = db.query(MtrlInsp).all()
    return [
        {
            "id": i.id,
            "insp_no": i.insp_no,
            "grn_id": i.grn_id,
            "grn_no": i.grn.grn_no if i.grn else None,
            "vendor_name": i.grn.party.party_name if i.grn and i.grn.party else None,
            "insp_date": i.insp_date.isoformat() if i.insp_date else None,
            "test_type": i.test_type,
            "passed_qty": float(i.passed_qty),
            "rejected_qty": float(i.rejected_qty),
            "overall_status": i.overall_status,
            "rejection_reason": i.rejection_reason
        }
        for i in insps
    ]

# ----------------- Return to Vendor (RTV) -----------------
@router.get("/rtv")
@router.get("/rtv/all")
def list_rtvs(db: Session = Depends(get_db)):
    rtvs = db.query(MtrlRtv).all()
    return [
        {
            "id": r.id,
            "rtv_no": r.rtv_no,
            "grn_id": r.grn_id,
            "grn_no": r.grn.grn_no if getattr(r, 'grn', None) and r.grn else (f"GRN-{r.grn_id:04d}" if r.grn_id else None),
            "vendor_name": r.party.party_name if getattr(r, 'party', None) and r.party else "Vendor",
            "gatepass_no": r.gatepass_no or f"GP-{r.id:04d}",
            "dispatch_date": r.rtv_date.isoformat() if getattr(r, 'rtv_date', None) and r.rtv_date else None,
            "total_items": float(r.return_qty) if getattr(r, 'return_qty', None) and r.return_qty else 1,
            "status": "Dispatched" if r.gatepass_no else "Pending Dispatch",
            "reason": getattr(r, 'return_reason', '') or ''
        }
        for r in rtvs
    ]

@router.get("/{id}")
def get_grn(id: int, db: Session = Depends(get_db)):
    g = db.query(MtrlGrn).filter(MtrlGrn.id == id).first()
    if not g:
        raise HTTPException(status_code=404, detail="GRN not found")
    
    return {
        "id": g.id,
        "grn_no": g.grn_no,
        "grn_date": g.grn_date.isoformat() if g.grn_date else None,
        "wo_id": g.wo_id,
        "wo_no": g.work_order.wo_no if g.work_order else None,
        "party_id": g.party_id,
        "vendor_name": g.party.party_name if g.party else None,
        "store_id": g.store_id,
        "store_name": g.store.store_name if g.store else None,
        "challan_no": g.challan_no,
        "challan_date": g.challan_date.isoformat() if g.challan_date else None,
        "gate_entry_no": g.gate_entry_no,
        "gate_entry_date": g.gate_entry_date.isoformat() if g.gate_entry_date else None,
        "vehicle_number": g.vehicle_number,
        "driver_name": g.driver_name,
        "inspection_status": g.inspection_status,
        "posting_status": g.posting_status,
        "remarks": g.remarks,
        "lines": [
            {
                "id": l.id,
                "item_id": l.item_id,
                "item_code": l.item.item_code if l.item else None,
                "item_name": l.item.item_name if l.item else None,
                "challan_qty": float(l.challan_qty),
                "received_qty": float(l.received_qty),
                "accepted_qty": float(l.accepted_qty),
                "rejected_qty": float(l.rejected_qty),
                "batch_number": l.batch_number,
                "storage_bin": l.storage_bin
            }
            for l in g.lines
        ],
        "inspections": [
            {
                "id": i.id,
                "insp_no": i.insp_no,
                "insp_date": i.insp_date.isoformat() if i.insp_date else None,
                "test_type": i.test_type,
                "passed_qty": float(i.passed_qty),
                "rejected_qty": float(i.rejected_qty),
                "overall_status": i.overall_status,
                "rejection_reason": i.rejection_reason
            }
            for i in g.inspections
        ]
    }

@router.post("/")
def create_grn(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlGrn).count() + 1
    grn_no = data.get("grn_no") or f"GRN/2026/{1045 + cnt:05d}"
    wo = None
    wo_id = data.get("wo_id")
    if isinstance(wo_id, int):
        wo = db.query(MtrlWo).filter(MtrlWo.id == wo_id).first()
    elif isinstance(wo_id, str) and wo_id.isdigit():
        wo = db.query(MtrlWo).filter(MtrlWo.id == int(wo_id)).first()
    
    if not wo:
        wo_no = data.get("wo_no") or data.get("wo") or (str(wo_id) if isinstance(wo_id, str) else None)
        if wo_no:
            wo = db.query(MtrlWo).filter(MtrlWo.wo_no == wo_no).first()
    if not wo:
        wo = db.query(MtrlWo).order_by(MtrlWo.id.desc()).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    grn = MtrlGrn(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        grn_no=grn_no,
        grn_date=date.today(),
        wo_id=wo.id,
        party_id=wo.party_id,
        store_id=data.get("store_id", wo.delivery_store_id),
        challan_no=data.get("challan_no") or data.get("vendor_challan_no") or f"CHAL/{random.randint(1000,9999)}",
        challan_date=date.fromisoformat(data["challan_date"]) if data.get("challan_date") else (date.fromisoformat(data["vendor_challan_date"]) if data.get("vendor_challan_date") else date.today()),
        gate_entry_no=data.get("gate_entry_no", f"GE/{random.randint(1000,9999)}"),
        gate_entry_date=datetime.now(),
        vehicle_number=data.get("vehicle_number"),
        driver_name=data.get("driver_name"),
        receiver_user_id=1,
        inspection_status="Pending",
        posting_status="Draft",
        remarks=data.get("remarks", "Consignment arrived at store gate")
    )
    db.add(grn)
    db.flush()

    raw_lines = data.get("lines") or data.get("items") or []
    if not raw_lines and wo and wo.lines:
        raw_lines = [{"item_id": wl.item_id, "received_qty": wl.order_qty, "wo_line_id": wl.id} for wl in wo.lines]
    for l in raw_lines:
        c_qty = l.get("challan_qty") or l.get("challan_quantity") or l.get("received_qty") or l.get("received", 1)
        r_qty = l.get("received_qty") or l.get("received_quantity") or l.get("received") or c_qty
        
        item_id = l.get("item_id")
        item = None
        if isinstance(item_id, int):
            item = db.query(MtrlItem).filter(MtrlItem.id == item_id).first()
        if not item:
            mat_code = l.get("mat") or l.get("item_code") or (str(item_id) if item_id else None)
            if mat_code:
                item = db.query(MtrlItem).filter(MtrlItem.item_code == mat_code).first()
        if not item and wo and wo.lines:
            item = db.query(MtrlItem).filter(MtrlItem.id == wo.lines[0].item_id).first()
        if not item:
            item = db.query(MtrlItem).first()
        
        final_item_id = item.id if item else 1
        wo_line_id = l.get("wo_line_id")
        if not wo_line_id and wo:
            wl = db.query(MtrlWoLine).filter(MtrlWoLine.wo_id == wo.id, MtrlWoLine.item_id == final_item_id).first()
            if not wl:
                wl = db.query(MtrlWoLine).filter(MtrlWoLine.wo_id == wo.id).first()
            wo_line_id = wl.id if wl else 1
        if not wo_line_id:
            wo_line_id = 1

        db.add(MtrlGrnLine(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            grn_id=grn.id,
            wo_line_id=wo_line_id,
            item_id=final_item_id,
            challan_qty=Decimal(str(c_qty)),
            received_qty=Decimal(str(r_qty)),
            accepted_qty=Decimal(str(l.get("accepted_qty") or l.get("accepted", 0))),
            rejected_qty=Decimal(str(l.get("rejected_qty") or l.get("rejected", 0))),
            batch_number=l.get("batch_number") or l.get("batch", f"BATCH/{random.randint(100,999)}"),
            storage_bin=l.get("storage_bin") or l.get("location") or l.get("storage_location_bin", "Receiving Bay A")
        ))

    db.commit()
    return {"message": "GRN created successfully", "id": grn.id, "grn_no": grn.grn_no}

# ----------------- Inspections -----------------
@router.get("/inspections")
@router.get("/inspections/all")
def list_inspections(db: Session = Depends(get_db)):
    insps = db.query(MtrlInsp).all()
    return [
        {
            "id": i.id,
            "insp_no": i.insp_no,
            "grn_id": i.grn_id,
            "grn_no": i.grn.grn_no if i.grn else None,
            "vendor_name": i.grn.party.party_name if i.grn and i.grn.party else None,
            "insp_date": i.insp_date.isoformat() if i.insp_date else None,
            "test_type": i.test_type,
            "passed_qty": float(i.passed_qty),
            "rejected_qty": float(i.rejected_qty),
            "overall_status": i.overall_status,
            "rejection_reason": i.rejection_reason
        }
        for i in insps
    ]

@router.post("/{id}/inspections")
def record_inspection(id: int, data: dict, db: Session = Depends(get_db)):
    grn = db.query(MtrlGrn).filter(MtrlGrn.id == id).first()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")

    cnt = db.query(MtrlInsp).count() + 1
    insp_no = f"INSP/2026/{510 + cnt:04d}"

    passed_q = Decimal(str(data.get("passed_qty", 0)))
    rej_q = Decimal(str(data.get("rejected_qty", 0)))

    insp = MtrlInsp(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        insp_no=insp_no,
        grn_id=grn.id,
        insp_date=date.today(),
        inspector_id=1,
        test_type=data.get("test_type", "Physical & Dimensional Check"),
        sample_size=Decimal(str(data.get("sample_size", 5))),
        passed_qty=passed_q,
        rejected_qty=rej_q,
        overall_status="Approved" if rej_q == 0 else ("Partially Passed" if passed_q > 0 else "Rejected"),
        rejection_reason=data.get("rejection_reason")
    )
    db.add(insp)

    # Update GRN lines and header
    grn.inspection_status = insp.overall_status
    for ln in grn.lines:
        ln.accepted_qty = passed_q
        ln.rejected_qty = rej_q

    # Create RTV if rejected qty > 0
    if rej_q > 0:
        db.add(MtrlRtv(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            rtv_no=f"RTV/2026/{random.randint(100,999)}",
            grn_id=grn.id,
            party_id=grn.party_id,
            item_id=grn.lines[0].item_id if grn.lines else 1,
            return_qty=rej_q,
            return_reason=data.get("rejection_reason", "QA test failed"),
            rtv_date=date.today(),
            gatepass_no=f"GP/RTV/{random.randint(1000,9999)}"
        ))

    db.commit()
    return {"message": "Quality inspection recorded successfully", "insp_no": insp_no, "overall_status": insp.overall_status}

# ----------------- Post GRN to Stock Ledger -----------------
@router.put("/{id}/post-to-stock")
@router.post("/{id}/post-to-stock")
def post_grn_to_stock(id: int, db: Session = Depends(get_db)):
    grn = db.query(MtrlGrn).filter(MtrlGrn.id == id).first()
    if not grn:
        raise HTTPException(status_code=404, detail="GRN not found")

    if grn.posting_status == "Posted":
        return {"message": "GRN is already posted to inventory"}

    for ln in grn.lines:
        if ln.accepted_qty > 0:
            stk = db.query(MtrlStock).filter(
                MtrlStock.store_id == grn.store_id,
                MtrlStock.item_id == ln.item_id
            ).first()

            if not stk:
                stk = MtrlStock(
                    tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
                    store_id=grn.store_id,
                    item_id=ln.item_id,
                    available_qty=ln.accepted_qty,
                    avg_unit_cost=ln.item.estimated_rate if ln.item else Decimal("0.00"),
                    total_stock_value=ln.accepted_qty * (ln.item.estimated_rate if ln.item else Decimal("0.00")),
                    storage_bin=ln.storage_bin or "Aisle-1/Rack-1"
                )
                db.add(stk)
            else:
                stk.available_qty += ln.accepted_qty
                stk.total_stock_value = (stk.available_qty + stk.allocated_qty + stk.quarantine_qty) * stk.avg_unit_cost

            # Record Ledger Movement
            db.add(MtrlMovement(
                tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
                store_id=grn.store_id,
                item_id=ln.item_id,
                txn_type="GRN_RECEIPT",
                ref_doc_type="GRN",
                ref_doc_id=grn.id,
                ref_doc_no=grn.grn_no,
                opening_qty=stk.available_qty - ln.accepted_qty,
                txn_qty=ln.accepted_qty,
                closing_qty=stk.available_qty,
                unit_rate=stk.avg_unit_cost,
                txn_amount=ln.accepted_qty * stk.avg_unit_cost,
                performed_by=1,
                remarks=f"Posted accepted quantity from GRN {grn.grn_no}"
            ))

    grn.posting_status = "Posted"
    db.commit()
    return {"message": "GRN successfully posted to Inventory & Bin Card ledger", "grn_no": grn.grn_no}

# ----------------- Return to Vendor (RTV) -----------------
@router.get("/rtv/all")
def list_rtvs(db: Session = Depends(get_db)):
    rtvs = db.query(MtrlRtv).all()
    return [
        {
            "id": r.id,
            "rtv_no": r.rtv_no,
            "rtv_date": r.rtv_date.isoformat() if r.rtv_date else None,
            "grn_id": r.grn_id,
            "party_id": r.party_id,
            "vendor_name": r.party.party_name if r.party else None,
            "item_name": r.item.item_name if r.item else None,
            "return_qty": float(r.return_qty),
            "return_reason": r.return_reason,
            "gatepass_no": r.gatepass_no
        }
        for r in rtvs
    ]
