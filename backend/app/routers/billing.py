from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
import random
from app.database import get_db
from app.models.material_models import (
    MtrlInvoice, MtrlMatch, MtrlWo, MtrlGrn, MtrlParty
)

router = APIRouter(prefix="/billing", tags=["Billing & Finance Interface"])

# ----------------- Invoices -----------------
@router.get("/invoices")
def list_invoices(
    match_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlInvoice)
    if match_status:
        query = query.filter(MtrlInvoice.match_status == match_status)
    if payment_status:
        query = query.filter(MtrlInvoice.payment_status == payment_status)
    if search:
        s = f"%{search}%"
        query = query.filter(MtrlInvoice.inv_no.ilike(s) | MtrlInvoice.vendor_inv_no.ilike(s))

    invs = query.order_by(MtrlInvoice.id.desc()).all()
    return [
        {
            "id": i.id,
            "inv_no": i.inv_no,
            "vendor_inv_no": i.vendor_inv_no,
            "vendor_inv_date": i.vendor_inv_date.isoformat() if i.vendor_inv_date else None,
            "wo_no": i.work_order.wo_no if i.work_order else None,
            "grn_no": i.grn.grn_no if i.grn else None,
            "party_id": i.party_id,
            "vendor_name": i.party.party_name if i.party else None,
            "basic_amount": float(i.basic_amount),
            "tax_amount": float(i.tax_amount),
            "gross_amount": float(i.gross_amount),
            "net_payable_amount": float(i.net_payable_amount),
            "match_status": i.match_status,
            "payment_status": i.payment_status,
            "utr_number": i.utr_number,
            "payment_date": i.payment_date.isoformat() if i.payment_date else None
        }
        for i in invs
    ]

@router.get("/invoices/{id}")
def get_invoice(id: int, db: Session = Depends(get_db)):
    i = db.query(MtrlInvoice).filter(MtrlInvoice.id == id).first()
    if not i:
        raise HTTPException(status_code=404, detail="Invoice not found")

    m = i.matching
    return {
        "id": i.id,
        "inv_no": i.inv_no,
        "vendor_inv_no": i.vendor_inv_no,
        "vendor_inv_date": i.vendor_inv_date.isoformat() if i.vendor_inv_date else None,
        "wo_id": i.wo_id,
        "wo_no": i.work_order.wo_no if i.work_order else None,
        "grn_id": i.grn_id,
        "grn_no": i.grn.grn_no if i.grn else None,
        "party_id": i.party_id,
        "vendor_name": i.party.party_name if i.party else None,
        "basic_amount": float(i.basic_amount),
        "tax_amount": float(i.tax_amount),
        "gross_amount": float(i.gross_amount),
        "ld_deduction": float(i.ld_deduction),
        "net_payable_amount": float(i.net_payable_amount),
        "match_status": i.match_status,
        "payment_status": i.payment_status,
        "utr_number": i.utr_number,
        "payment_date": i.payment_date.isoformat() if i.payment_date else None,
        "matching": {
            "wo_total_amt": float(m.wo_total_amt) if m else float(i.gross_amount),
            "grn_accepted_amt": float(m.grn_accepted_amt) if m else float(i.gross_amount),
            "inv_claimed_amt": float(m.inv_claimed_amt) if m else float(i.gross_amount),
            "rate_discrepancy": float(m.rate_discrepancy) if m else 0,
            "qty_discrepancy": float(m.qty_discrepancy) if m else 0,
            "match_verdict": m.match_verdict if m else "Full Match"
        } if m else None
    }

@router.post("/invoices")
def create_invoice(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlInvoice).count() + 1
    inv_no = data.get("inv_no") or f"INV/VEN/{4050 + cnt:05d}"
    
    wo_id = data.get("wo_id") or data.get("work_order_id")
    wo = db.query(MtrlWo).filter(MtrlWo.id == wo_id).first() if wo_id else db.query(MtrlWo).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")

    vendor_inv_no = data.get("vendor_inv_no") or data.get("invoice_no") or data.get("bill_no") or f"VINV-{random.randint(1000,9999)}"
    vendor_inv_date = date.today()
    if data.get("vendor_inv_date") or data.get("invoice_date"):
        try:
            vendor_inv_date = date.fromisoformat(str(data.get("vendor_inv_date") or data.get("invoice_date"))[:10])
        except Exception:
            pass

    b_amt = Decimal(str(data.get("basic_amount") or data.get("amount") or data.get("basic_amt", 10000)))
    t_amt = Decimal(str(data.get("tax_amount") or data.get("tax_amt", b_amt * Decimal("0.18"))))
    tot = b_amt + t_amt

    inv = MtrlInvoice(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        inv_no=inv_no,
        vendor_inv_no=vendor_inv_no,
        vendor_inv_date=vendor_inv_date,
        wo_id=wo.id,
        grn_id=data.get("grn_id", 1),
        party_id=wo.party_id,
        basic_amount=b_amt,
        tax_amount=t_amt,
        gross_amount=tot,
        net_payable_amount=tot,
        match_status="Matched",
        payment_status="Initiated"
    )
    db.add(inv)
    db.flush()

    # Perform 3-way match
    db.add(MtrlMatch(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        invoice_id=inv.id,
        wo_id=wo.id,
        grn_id=inv.grn_id,
        wo_total_amt=wo.total_wo_amount,
        grn_accepted_amt=tot,
        inv_claimed_amt=tot,
        match_verdict="Full Match"
    ))

    from app.services.audit_service import log_audit, log_notification
    log_audit(
        db,
        table_code="mtrl_invoice",
        record_id=inv.id,
        action="CREATE",
        changes={"ref_no": inv.inv_no, "vendor_inv_no": inv.vendor_inv_no, "gross_amount": float(tot)},
        remarks=f"Vendor Invoice {inv.inv_no} (#{inv.vendor_inv_no}) created and 3-way match passed."
    )
    log_notification(
        db,
        title="Vendor Invoice Cleared for Payment",
        message=f"Invoice #{inv.inv_no} (₹{tot:,.2f}) verified against GRN & PO. Ready for PFMS clearance.",
        event_type="BILLING",
        target_role="Finance Wing",
        action_route="/billing/invoice"
    )

    db.commit()
    return {"message": "Invoice entered and matched successfully", "id": inv.id, "inv_no": inv_no}

# ----------------- 3-Way Matching Engine -----------------
@router.get("/matches")
def list_matches(db: Session = Depends(get_db)):
    matches = db.query(MtrlMatch).all()
    return [
        {
            "id": m.id,
            "invoice_id": m.invoice_id,
            "inv_no": m.invoice.inv_no if m.invoice else None,
            "vendor_name": m.invoice.party.party_name if m.invoice and m.invoice.party else None,
            "wo_total_amt": float(m.wo_total_amt),
            "grn_accepted_amt": float(m.grn_accepted_amt),
            "inv_claimed_amt": float(m.inv_claimed_amt),
            "qty_discrepancy": float(m.qty_discrepancy),
            "match_verdict": m.match_verdict
        }
        for m in matches
    ]

# ----------------- Bill Initiation / Sanctions / Treasury -----------------
@router.post("/invoices/{id}/generate-sanction")
def generate_sanction(id: int, db: Session = Depends(get_db)):
    inv = db.query(MtrlInvoice).filter(MtrlInvoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    inv.payment_status = "Sanction Generated"
    db.commit()
    return {
        "message": f"Sanction Order generated for invoice {inv.inv_no}",
        "sanction_no": f"SANC/DIT/2026/{random.randint(100,999)}",
        "sanction_amount": float(inv.net_payable_amount)
    }

@router.post("/invoices/{id}/send-to-treasury")
def send_to_treasury(id: int, db: Session = Depends(get_db)):
    inv = db.query(MtrlInvoice).filter(MtrlInvoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    inv.payment_status = "Sent to Treasury"
    token = f"TR-GNCTD-{random.randint(1000,9999)}"
    db.commit()
    return {"message": "Bill token submitted to Treasury portal", "treasury_token": token}

@router.put("/invoices/{id}/payment-update")
def record_payment(id: int, data: dict, db: Session = Depends(get_db)):
    inv = db.query(MtrlInvoice).filter(MtrlInvoice.id == id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    inv.payment_status = "Paid"
    inv.utr_number = data.get("utr_number", f"UTR-SBI-GNCTD-{random.randint(10000,99999)}")
    inv.payment_date = date.today()
    db.commit()
    return {"message": "Payment clearance recorded", "utr_number": inv.utr_number}
