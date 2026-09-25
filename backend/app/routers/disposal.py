from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date
import random
from app.database import get_db
from app.models.material_models import MtrlDisposal, MtrlStore, MtrlItem

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

    item = db.query(MtrlItem).filter(MtrlItem.id == data["item_id"]).first()
    qty = Decimal(str(data["disposal_qty"]))
    rate = item.estimated_rate if item else Decimal("1000.00")
    book = qty * rate

    disp = MtrlDisposal(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        disp_proposal_no=p_no,
        store_id=data["store_id"],
        item_id=data["item_id"],
        disposal_qty=qty,
        condemnation_reason=data.get("condemnation_reason", "Beyond Economical Repair (BER)"),
        book_value_amount=book,
        reserve_price=Decimal(str(data.get("reserve_price", book * Decimal("0.25")))),
        disposal_mode=data.get("disposal_mode", "MSTC e-Auction")
    )
    db.add(disp)
    db.commit()
    return {"message": "Disposal & Condemnation proposal submitted", "id": disp.id, "disp_proposal_no": p_no}

@router.put("/proposals/{id}/approve")
def approve_disposal_proposal(id: int, data: dict, db: Session = Depends(get_db)):
    d = db.query(MtrlDisposal).filter(MtrlDisposal.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Disposal proposal not found")

    d.auction_ref_no = data.get("auction_ref_no", f"MSTC/DEL/2026/{random.randint(100,999)}")
    db.commit()
    return {"message": "Disposal proposal approved and listed for e-Auction", "auction_ref_no": d.auction_ref_no}

@router.post("/proposals/{id}/record-sale")
def record_auction_sale(id: int, data: dict, db: Session = Depends(get_db)):
    d = db.query(MtrlDisposal).filter(MtrlDisposal.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Disposal proposal not found")

    d.buyer_name = data["buyer_name"]
    d.realized_value = Decimal(str(data["realized_value"]))
    d.deposit_challan_no = data.get("deposit_challan_no", f"CH/REC/{random.randint(1000,9999)}")
    db.commit()
    return {"message": "Scrap / Auction sale recorded and revenue realized", "realized_value": float(d.realized_value)}
