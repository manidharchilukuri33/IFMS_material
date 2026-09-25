from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime, timedelta
import random
from app.database import get_db
from app.models.material_models import (
    MtrlProcPln, MtrlTender, MtrlQuote, MtrlSecurity, MtrlParty, MtrlItem, MtrlWo
)

router = APIRouter(prefix="/procurement", tags=["Procurement Management"])

# ----------------- Annual Procurement Plans (APP) -----------------
@router.get("/plans")
def list_procurement_plans(db: Session = Depends(get_db)):
    plans = db.query(MtrlProcPln).all()
    return [
        {
            "id": p.id,
            "plan_no": p.plan_no,
            "total_budget": float(p.total_budget),
            "planned_value": float(p.planned_value),
            "proc_mode": p.proc_mode,
            "created_at": p.created_at.isoformat() if p.created_at else None
        }
        for p in plans
    ]

@router.post("/plans")
def create_procurement_plan(data: dict, db: Session = Depends(get_db)):
    plan = MtrlProcPln(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        plan_no=data["plan_no"],
        total_budget=Decimal(str(data["total_budget"])),
        planned_value=Decimal(str(data["planned_value"])),
        proc_mode=data.get("proc_mode", "Open Tender")
    )
    db.add(plan)
    db.commit()
    return {"message": "Procurement plan created successfully", "id": plan.id}

# ----------------- Tenders -----------------
@router.get("/tenders")
def list_tenders(search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlTender)
    if search:
        s = f"%{search}%"
        query = query.filter(MtrlTender.tender_no.ilike(s) | MtrlTender.tender_title.ilike(s))
    
    tenders = query.order_by(MtrlTender.id.desc()).all()
    return [
        {
            "id": t.id,
            "tender_no": t.tender_no,
            "tender_title": t.tender_title,
            "tender_date": t.tender_date.isoformat() if t.tender_date else None,
            "portal_ref_no": t.portal_ref_no,
            "estimated_cost": float(t.estimated_cost),
            "tender_fee": float(t.tender_fee),
            "emd_amount": float(t.emd_amount),
            "bid_start_date": t.bid_start_date.isoformat() if t.bid_start_date else None,
            "bid_close_date": t.bid_close_date.isoformat() if t.bid_close_date else None,
            "bids_received": len(t.quotes),
            "status": "Awarded" if t.awarded_party_id else ("Technical Evaluation" if len(t.quotes) > 0 else "Published"),
            "awarded_party_id": t.awarded_party_id,
            "awarded_party_name": t.awarded_party.party_name if t.awarded_party else None
        }
        for t in tenders
    ]

@router.get("/tenders/{id}")
def get_tender(id: int, db: Session = Depends(get_db)):
    t = db.query(MtrlTender).filter(MtrlTender.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    return {
        "id": t.id,
        "tender_no": t.tender_no,
        "tender_title": t.tender_title,
        "tender_date": t.tender_date.isoformat() if t.tender_date else None,
        "portal_ref_no": t.portal_ref_no,
        "estimated_cost": float(t.estimated_cost),
        "tender_fee": float(t.tender_fee),
        "emd_amount": float(t.emd_amount),
        "bid_start_date": t.bid_start_date.isoformat() if t.bid_start_date else None,
        "bid_close_date": t.bid_close_date.isoformat() if t.bid_close_date else None,
        "awarded_party_id": t.awarded_party_id,
        "quotes": [
            {
                "id": q.id,
                "party_id": q.party_id,
                "vendor_name": q.party.party_name if q.party else None,
                "basic_rate": float(q.basic_rate),
                "gst_percent": float(q.gst_percent),
                "total_bid_value": float(q.total_bid_value),
                "rank_order": q.rank_order,
                "is_technically_ok": q.is_technically_ok,
                "is_selected": q.is_selected
            }
            for q in t.quotes
        ]
    }

@router.post("/tenders")
def create_tender(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlTender).count() + 1
    tender_no = data.get("tender_no") or f"TND/2026/{10045 + cnt}"
    
    tender = MtrlTender(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        tender_no=tender_no,
        tender_title=data["tender_title"],
        tender_date=date.today(),
        portal_ref_no=data.get("portal_ref_no", f"GEM/2026/B/{random.randint(10000,99999)}"),
        estimated_cost=Decimal(str(data.get("estimated_cost") or data.get("estimated_value") or data.get("estimated_amount", 0))),
        tender_fee=Decimal(str(data.get("tender_fee", 0))),
        emd_amount=Decimal(str(data.get("emd_amount", 0))),
        bid_start_date=datetime.now(),
        bid_close_date=datetime.now() + timedelta(days=int(data.get("bidding_days", 21)))
    )
    db.add(tender)
    from app.services.audit_service import log_audit, log_workflow, log_notification

    log_audit(
        db,
        table_code="mtrl_tender",
        record_id=tender.id,
        action="CREATE",
        changes={"ref_no": tender.tender_no, "title": tender.tender_title, "estimated_cost": float(tender.estimated_cost)},
        remarks=f"Tender {tender.tender_no} created and published."
    )
    log_workflow(
        db,
        table_code="mtrl_tender",
        record_id=tender.id,
        action_code="PUBLISH_TENDER",
        action_label="Publish Tender Notice (NIT)",
        from_status="Consolidated Requisition",
        to_status="Published",
        remarks=f"Published tender {tender.tender_no} on {tender.portal_ref_no}"
    )
    log_notification(
        db,
        title="Tender Published",
        message=f"Tender #{tender.tender_no} ({tender.tender_title}) has been published for bidding.",
        event_type="TENDER",
        target_role="Procurement Officer",
        action_route="/proc/tenders"
    )

    db.commit()
    return {"message": "Tender created and published successfully", "id": tender.id, "tender_no": tender.tender_no}

# ----------------- Quotes & Bids -----------------
@router.get("/quotes")
def list_quotes(tender_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlQuote)
    if tender_id:
        query = query.filter(MtrlQuote.tender_id == tender_id)
    quotes = query.all()
    return [
        {
            "id": q.id,
            "tender_id": q.tender_id,
            "tender_no": q.tender.tender_no if q.tender else None,
            "party_id": q.party_id,
            "vendor_name": q.party.party_name if q.party else None,
            "item_name": q.item.item_name if q.item else None,
            "quoted_qty": float(q.quoted_qty),
            "basic_rate": float(q.basic_rate),
            "total_bid_value": float(q.total_bid_value),
            "rank_order": q.rank_order,
            "is_technically_ok": q.is_technically_ok,
            "is_selected": q.is_selected
        }
        for q in quotes
    ]

@router.post("/quotes")
def submit_quote(data: dict, db: Session = Depends(get_db)):
    basic = Decimal(str(data["basic_rate"])) * Decimal(str(data["quoted_qty"]))
    tax = basic * Decimal(str(data.get("gst_percent", 18.0))) / Decimal("100.0")
    
    quote = MtrlQuote(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        tender_id=data["tender_id"],
        party_id=data["party_id"],
        item_id=data.get("item_id", 1),
        quoted_qty=Decimal(str(data["quoted_qty"])),
        basic_rate=Decimal(str(data["basic_rate"])),
        gst_percent=Decimal(str(data.get("gst_percent", 18.0))),
        gst_amount=tax,
        total_unit_cost=(basic + tax) / Decimal(str(data["quoted_qty"])),
        total_bid_value=basic + tax,
        is_technically_ok=data.get("is_technically_ok", True)
    )
    db.add(quote)
    db.commit()
    return {"message": "Bid/Quotation recorded successfully", "id": quote.id}

@router.put("/quotes/{id}")
def update_quote(id: int, data: dict, db: Session = Depends(get_db)):
    q = db.query(MtrlQuote).filter(MtrlQuote.id == id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quote not found")

    if "is_technically_ok" in data:
        q.is_technically_ok = data["is_technically_ok"]
    if "eval_remarks" in data:
        q.eval_remarks = data["eval_remarks"]
    if "rank_order" in data:
        q.rank_order = data["rank_order"]
    if "is_selected" in data:
        q.is_selected = data["is_selected"]
    if "total_bid_value" in data:
        q.total_bid_value = Decimal(str(data["total_bid_value"]))

    db.commit()
    return {"message": "Quote updated successfully", "id": q.id}

@router.post("/tenders/{id}/award")
def award_tender(id: int, data: dict, db: Session = Depends(get_db)):
    tender = db.query(MtrlTender).filter(MtrlTender.id == id).first()
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")
    
    party_id = data["party_id"]
    tender.awarded_party_id = party_id

    # Mark quote as selected
    for q in tender.quotes:
        q.is_selected = (q.party_id == party_id)

    from app.services.audit_service import log_audit, log_workflow, log_notification
    log_audit(
        db,
        table_code="mtrl_tender",
        record_id=tender.id,
        action="AWARD",
        changes={"ref_no": tender.tender_no, "awarded_party_id": party_id},
        remarks=f"Tender {tender.tender_no} awarded to vendor ID {party_id}."
    )
    log_workflow(
        db,
        table_code="mtrl_tender",
        record_id=tender.id,
        action_code="AWARD_CONTRACT",
        action_label="Award Contract",
        from_status="Evaluation Completed",
        to_status="Awarded",
        remarks=f"Contract awarded under tender {tender.tender_no}"
    )
    log_notification(
        db,
        title="Tender Awarded (L1 Selected)",
        message=f"Tender #{tender.tender_no} has been awarded. Ready to issue Purchase Order.",
        event_type="TENDER",
        target_role="Procurement Officer",
        action_route="/wo/create"
    )

    db.commit()
    return {"message": "Tender awarded successfully", "tender_id": tender.id, "awarded_party_id": party_id}

# ----------------- Securities (EMD & PBG) -----------------
@router.get("/securities")
def list_securities(sec_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlSecurity)
    if sec_type:
        query = query.filter(MtrlSecurity.sec_type == sec_type)
    
    secs = query.all()
    return [
        {
            "id": s.id,
            "sec_type": s.sec_type,
            "tender_no": s.tender.tender_no if s.tender else None,
            "party_id": s.party_id,
            "vendor_name": s.party.party_name if s.party else None,
            "instrument_type": s.instrument_type,
            "instrument_no": s.instrument_no,
            "instrument_date": s.instrument_date.isoformat() if s.instrument_date else None,
            "expiry_date": s.expiry_date.isoformat() if s.expiry_date else None,
            "amount": float(s.amount),
            "issuing_bank": s.issuing_bank,
            "status": "Released" if s.released_date else "Active"
        }
        for s in secs
    ]

@router.post("/securities")
def create_security(data: dict, db: Session = Depends(get_db)):
    sec = MtrlSecurity(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        sec_type=data["sec_type"],
        tender_id=data.get("tender_id"),
        wo_id=data.get("wo_id"),
        party_id=data["party_id"],
        instrument_type=data.get("instrument_type", "Bank Guarantee"),
        instrument_no=data["instrument_no"],
        instrument_date=date.fromisoformat(data["instrument_date"]),
        expiry_date=date.fromisoformat(data["expiry_date"]),
        amount=Decimal(str(data["amount"])),
        issuing_bank=data.get("issuing_bank")
    )
    db.add(sec)
    db.commit()
    return {"message": f"{data['sec_type']} Security registered successfully", "id": sec.id}

@router.put("/securities/{id}/release")
def release_security(id: int, db: Session = Depends(get_db)):
    sec = db.query(MtrlSecurity).filter(MtrlSecurity.id == id).first()
    if not sec:
        raise HTTPException(status_code=404, detail="Security instrument not found")
    sec.released_date = date.today()
    sec.release_ref_no = f"REL/{sec.sec_type}/{random.randint(1000,9999)}"
    db.commit()
    return {"message": f"{sec.sec_type} released successfully", "release_ref_no": sec.release_ref_no}
