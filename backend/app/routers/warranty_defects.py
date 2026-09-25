from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from app.database import get_db
from app.models.material_models import MtrlWarranty, MtrlDefect, MtrlItem, MtrlParty

router = APIRouter(prefix="/warranty", tags=["Warranty and Defects"])

# ----------------- Warranty Registry -----------------
@router.get("/assets")
def list_warranties(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlWarranty)
    if status:
        query = query.filter(MtrlWarranty.status == status)
    
    warrs = query.all()
    today = date.today()
    return [
        {
            "id": w.id,
            "asset_serial_no": w.asset_serial_no,
            "item_id": w.item_id,
            "item_code": w.item.item_code if w.item else None,
            "item_name": w.item.item_name if w.item else None,
            "party_id": w.party_id,
            "vendor_name": w.party.party_name if w.party else None,
            "warranty_start_date": w.warranty_start_date.isoformat() if w.warranty_start_date else None,
            "warranty_end_date": w.warranty_end_date.isoformat() if w.warranty_end_date else None,
            "days_remaining": (w.warranty_end_date - today).days if w.warranty_end_date else 0,
            "warranty_terms": w.warranty_terms,
            "status": "Expired" if w.warranty_end_date and w.warranty_end_date < today else w.status
        }
        for w in warrs
    ]

@router.post("/assets")
def create_warranty(data: dict, db: Session = Depends(get_db)):
    warr = MtrlWarranty(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        asset_serial_no=data["asset_serial_no"],
        item_id=data["item_id"],
        party_id=data["party_id"],
        custodian_store_id=data.get("store_id", 1),
        warranty_start_date=date.fromisoformat(data["warranty_start_date"]),
        warranty_end_date=date.fromisoformat(data["warranty_end_date"]),
        warranty_terms=data.get("warranty_terms", "Standard OEM Warranty"),
        status="Under Warranty"
    )
    db.add(warr)
    db.commit()
    return {"message": "Asset warranty registered successfully", "id": warr.id}

# ----------------- Defect Complaints -----------------
@router.get("/defects")
def list_defects(status: Optional[str] = None, severity: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlDefect)
    if status:
        query = query.filter(MtrlDefect.resolution_status == status)
    if severity:
        query = query.filter(MtrlDefect.severity == severity)

    defects = query.order_by(MtrlDefect.id.desc()).all()
    return [
        {
            "id": d.id,
            "ticket_no": d.ticket_no,
            "ticket_date": d.ticket_date.isoformat() if d.ticket_date else None,
            "item_name": d.item.item_name if d.item else None,
            "vendor_name": d.party.party_name if d.party else None,
            "defect_category": d.defect_category,
            "severity": d.severity,
            "defect_desc": d.defect_desc,
            "resolution_tat_due": d.resolution_tat_due.isoformat() if d.resolution_tat_due else None,
            "resolved_date": d.resolved_date.isoformat() if d.resolved_date else None,
            "resolution_status": d.resolution_status,
            "vendor_response": d.vendor_response
        }
        for d in defects
    ]

@router.post("/defects")
def create_defect(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlDefect).count() + 1
    tkt_no = f"TKT/2026/{20 + cnt:04d}"

    party_id = data.get("party_id") or data.get("vendor_id") or 1
    defect_desc = data.get("defect_desc") or data.get("defect_description") or "Defect reported during operation"
    severity = data.get("severity") or data.get("defect_severity") or "Major"

    defect = MtrlDefect(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        ticket_no=tkt_no,
        ticket_date=date.today(),
        warranty_id=data.get("warranty_id"),
        item_id=data["item_id"],
        party_id=party_id,
        defect_category=data.get("defect_category") or data.get("defect_type", "Hardware Malfunction"),
        severity=severity,
        defect_desc=defect_desc,
        resolution_tat_due=date.today() + timedelta(days=3),
        resolution_status="Reported"
    )
    db.add(defect)
    db.commit()
    return {"message": "Defect complaint ticket logged", "id": defect.id, "ticket_no": tkt_no}

@router.put("/defects/{id}/resolve")
def resolve_defect(id: int, data: dict, db: Session = Depends(get_db)):
    d = db.query(MtrlDefect).filter(MtrlDefect.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect ticket not found")

    d.resolution_status = "Resolved"
    d.resolved_date = date.today()
    d.vendor_response = data.get("vendor_response", "Service completed by OEM engineer")
    db.commit()
    return {"message": "Defect complaint marked resolved"}

@router.put("/defects/{id}/escalate")
def escalate_defect(id: int, db: Session = Depends(get_db)):
    d = db.query(MtrlDefect).filter(MtrlDefect.id == id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect ticket not found")

    d.resolution_status = "Escalated to OEM"
    d.escalated_to_gem = True
    db.commit()
    return {"message": "Defect ticket escalated to OEM Headquarters and GeM incident portal"}
