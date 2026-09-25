from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date
import random
from app.database import get_db
from app.models.material_models import MtrlDisposal, MtrlStore, MtrlItem, MtrlStock, MtrlMovement

router = APIRouter(prefix="/disposal", tags=["Disposal & Condemnation Management"])

@router.get("/proposals")
def list_disposal_proposals(db: Session = Depends(get_db)):
    disps = db.query(MtrlDisposal).order_by(MtrlDisposal.id.desc()).all()
    return [
        {
            "id": d.id,
            "disp_proposal_no": d.disp_proposal_no,
            "store_id": d.store_id,
            "store_name": d.store.store_name if d.store else None,
            "item_id": d.item_id,
            "item_name": d.item.item_name if d.item else None,
            "disposal_qty": float(d.disposal_qty),
            "condemnation_reason": d.condemnation_reason,
            "book_value_amount": float(d.book_value_amount),
            "reserve_price": float(d.reserve_price),
            "disposal_mode": d.disposal_mode,
            "auction_ref_no": d.auction_ref_no,
            "buyer_name": d.buyer_name,
            "realized_value": float(d.realized_value) if d.realized_value else 0,
            "status": "Sold" if d.buyer_name else ("Approved" if d.auction_ref_no else "Pending Approval")
        }
        for d in disps
    ]

@router.post("/proposals")
def create_disposal_proposal(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlDisposal).count() + 1
    p_no = f"DSP/2026/{10 + cnt:04d}"

    item_id = data.get("item_id")
    if not item_id and data.get("items") and len(data["items"]) > 0:
        item_id = data["items"][0].get("item_id")
    item_id = item_id or 1

    item = db.query(MtrlItem).filter(MtrlItem.id == item_id).first()
    
    qty_val = data.get("disposal_qty") or data.get("quantity")
    if qty_val is None and data.get("items") and len(data["items"]) > 0:
        qty_val = data["items"][0].get("condemned_qty") or data["items"][0].get("quantity")
    qty = Decimal(str(qty_val or 1))
    
    rate = item.estimated_rate if item else Decimal("1000.00")
    book = data.get("book_value") or (qty * rate)
    book = Decimal(str(book))

    disp = MtrlDisposal(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        disp_proposal_no=data.get("proposal_no") or data.get("proposal_number") or p_no,
        store_id=data.get("store_id", 1),
        item_id=item_id,
        disposal_qty=qty,
        condemnation_reason=data.get("condemnation_reason") or data.get("reason_for_condemnation") or "Beyond Economical Repair (BER)",
        book_value_amount=book,
        reserve_price=Decimal(str(data.get("reserve_price", book * Decimal("0.25")))),
        disposal_mode=data.get("disposal_mode", "MSTC e-Auction")
    )
    db.add(disp)

    from app.services.audit_service import log_audit, log_workflow
    log_audit(
        db,
        table_code="mtrl_disposal",
        record_id=disp.id,
        action="CREATE",
        changes={"ref_no": disp.disp_proposal_no, "book_value": float(book), "qty": float(qty)},
        remarks=f"Disposal proposal {disp.disp_proposal_no} ({disp.condemnation_reason}) submitted."
    )
    log_workflow(
        db,
        table_code="mtrl_disposal",
        record_id=disp.id,
        action_code="PROPOSE_DISPOSAL",
        action_label="Propose Condemnation",
        from_status="In Store",
        to_status="Pending Approval",
        remarks=disp.condemnation_reason
    )

    db.commit()
    return {"message": "Disposal & Condemnation proposal submitted", "id": disp.id, "disp_proposal_no": disp.disp_proposal_no}

@router.put("/proposals/{id}/approve")
def approve_disposal_proposal(id: int, data: dict, db: Session = Depends(get_db)):
    d = db.query(MtrlDisposal).filter(MtrlDisposal.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Disposal proposal not found")

    d.auction_ref_no = data.get("auction_ref_no", f"MSTC/DEL/2026/{random.randint(100,999)}")
    from app.services.audit_service import log_audit, log_workflow
    log_audit(
        db,
        table_code="mtrl_disposal",
        record_id=d.id,
        action="APPROVE",
        changes={"ref_no": d.disp_proposal_no, "auction_ref_no": d.auction_ref_no},
        remarks=f"Disposal proposal {d.disp_proposal_no} approved for MSTC e-Auction."
    )
    log_workflow(
        db,
        table_code="mtrl_disposal",
        record_id=d.id,
        action_code="APPROVE_AUCTION",
        action_label="Approve for e-Auction",
        from_status="Pending Approval",
        to_status="Approved",
        remarks=f"Listed on e-Auction under #{d.auction_ref_no}"
    )
    db.commit()
    return {"message": "Disposal proposal approved and listed for e-Auction", "auction_ref_no": d.auction_ref_no}

@router.post("/proposals/{id}/record-sale")
def record_auction_sale(id: int, data: dict, db: Session = Depends(get_db)):
    d = db.query(MtrlDisposal).filter(MtrlDisposal.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Disposal proposal not found")
    if d.buyer_name:
        return {"message": "Disposal sale already recorded", "realized_value": float(d.realized_value or 0)}

    d.buyer_name = data["buyer_name"]
    d.realized_value = Decimal(str(data["realized_value"]))
    d.deposit_challan_no = data.get("deposit_challan_no", f"CH/REC/{random.randint(1000,9999)}")

    stk = db.query(MtrlStock).filter(MtrlStock.store_id == d.store_id, MtrlStock.item_id == d.item_id).first()
    if stk:
        stk.available_qty = max(Decimal("0.00"), stk.available_qty - d.disposal_qty)
        stk.total_stock_value = stk.available_qty * stk.avg_unit_cost

        db.add(MtrlMovement(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
            store_id=d.store_id, item_id=d.item_id,
            txn_type="DISPOSAL", ref_doc_type="DISPOSAL", ref_doc_id=d.id, ref_doc_no=d.disp_proposal_no,
            opening_qty=(stk.available_qty + d.disposal_qty), txn_qty=d.disposal_qty, closing_qty=stk.available_qty,
            unit_rate=stk.avg_unit_cost, txn_amount=d.disposal_qty * stk.avg_unit_cost,
            performed_by=1, remarks=f"Disposed {d.disp_proposal_no} to {d.buyer_name}"
        ))

    from app.services.audit_service import log_audit, log_workflow
    log_audit(
        db,
        table_code="mtrl_disposal",
        record_id=d.id,
        action="AUCTION_SOLD",
        changes={"ref_no": d.disp_proposal_no, "buyer": d.buyer_name, "realized_value": float(d.realized_value)},
        remarks=f"Scrap sold to {d.buyer_name} for INR {d.realized_value}."
    )
    log_workflow(
        db,
        table_code="mtrl_disposal",
        record_id=d.id,
        action_code="AUCTION_SALE",
        action_label="Complete Auction Sale",
        from_status="Approved",
        to_status="Sold",
        remarks=f"Sale realized INR {d.realized_value} from {d.buyer_name}"
    )

    db.commit()
    return {"message": "Scrap / Auction sale recorded and revenue realized", "realized_value": float(d.realized_value)}
