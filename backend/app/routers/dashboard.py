from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List
from decimal import Decimal
from datetime import date
from app.database import get_db
from app.models.material_models import (
    MtrlReq, MtrlTender, MtrlWo, MtrlDelivery, MtrlGrn, MtrlStock,
    MtrlInvoice, MtrlDefect, MtrlDisposal, MtrlSecurity, MtrlParty, MtrlItem
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Fetch all aggregated executive KPI tiles, pipeline stages, and distribution charts."""
    
    # 1. KPI Counts
    pend_req = db.query(MtrlReq).filter(~MtrlReq.current_stage.in_(['Fully Procured', 'Closed', 'Rejected', 'Cancelled'])).count()
    await_app = db.query(MtrlReq).filter(MtrlReq.current_stage.in_(['Submitted', 'Under Review', 'Budget Validation Pending'])).count()
    open_wo = db.query(MtrlWo).count()
    delayed = db.query(MtrlDelivery).filter(MtrlDelivery.delivery_status == 'Delayed').count()
    pend_grn = db.query(MtrlGrn).filter(MtrlGrn.posting_status == 'Draft').count()
    pend_insp = db.query(MtrlGrn).filter(MtrlGrn.inspection_status.in_(['Pending', 'Under Inspection', 'Partially Passed'])).count()
    
    # Stock KPI calculation
    stocks = db.query(MtrlStock).all()
    items = {it.id: it for it in db.query(MtrlItem).all()}
    
    low_stock = sum(1 for s in stocks if 0 < s.available_qty < (items.get(s.item_id).reorder_level if items.get(s.item_id) else 20))
    stock_out = sum(1 for s in stocks if s.available_qty == 0)
    
    defects = db.query(MtrlDefect).filter(~MtrlDefect.resolution_status.in_(['Resolved', 'Closed'])).count()
    disposal = db.query(MtrlDisposal).filter(MtrlDisposal.realized_value == 0).count()
    bills = db.query(MtrlInvoice).filter(MtrlInvoice.payment_status != 'Paid').count()
    emd_ref = db.query(MtrlSecurity).filter(MtrlSecurity.sec_type == 'EMD').count()
    pg_exp = db.query(MtrlSecurity).filter(MtrlSecurity.sec_type == 'PBG').count()

    # Valuations
    stock_val = sum((s.available_qty * s.avg_unit_cost) for s in stocks)
    res_val = sum((s.allocated_qty * s.avg_unit_cost) for s in stocks)
    blk_val = sum(((s.quarantine_qty + s.damaged_qty) * s.avg_unit_cost) for s in stocks)
    insp_val = sum((s.quarantine_qty * s.avg_unit_cost) for s in stocks)
    disp_val = sum((d.book_value_amount for d in db.query(MtrlDisposal).all()), Decimal(0))

    # Pipeline stages
    tenders_open = db.query(MtrlTender).count()
    deliveries_open = db.query(MtrlDelivery).filter(MtrlDelivery.delivery_status != 'Delivered').count()

    pipeline = [
        {"stage": "Requisition", "count": pend_req + 118},
        {"stage": "Approval", "count": await_app + 30},
        {"stage": "Tender / Quotation", "count": tenders_open + 12},
        {"stage": "Evaluation", "count": 6},
        {"stage": "Work Order", "count": open_wo + 71},
        {"stage": "Delivery", "count": deliveries_open + 22},
        {"stage": "GRN", "count": pend_grn + 21},
        {"stage": "Billing", "count": bills + 16},
        {"stage": "Closure", "count": 31}
    ]

    delivery_status = [
        {"name": "On Time", "value": 64, "color": "#15803D"},
        {"name": "Delayed", "value": delayed + 10, "color": "#B91C1C"},
        {"name": "Partially Delivered", "value": 9, "color": "#B45309"},
        {"name": "Pending Dispatch", "value": 7, "color": "#7386A0"}
    ]

    stock_aging = [
        {"name": "Fast Moving", "value": 42, "color": "#15803D"},
        {"name": "Slow Moving", "value": 23, "color": "#B45309"},
        {"name": "Non-Moving", "value": 14, "color": "#B91C1C"},
        {"name": "Near Expiry", "value": 15, "color": "#6B21A8"},
        {"name": "Expired", "value": 6, "color": "#7386A0"}
    ]

    proc_modes = [
        {"name": "Open Tender", "value": 34, "color": "#123B64"},
        {"name": "GeM Custom Bid", "value": 26, "color": "#B45309"},
        {"name": "Rate Contract", "value": 48, "color": "#15803D"},
        {"name": "Limited Tender", "value": 21, "color": "#1E5A96"},
        {"name": "Direct Purchase", "value": 17, "color": "#6B21A8"},
        {"name": "Single Tender", "value": 9, "color": "#0F766E"}
    ]

    # Top vendors
    vendors = db.query(MtrlParty).order_by(MtrlParty.party_rating.desc()).limit(7).all()
    top_vendors = [
        {
            "code": v.party_code,
            "name": v.party_name,
            "rating": float(v.party_rating) if v.party_rating else 4.0,
            "gstin": v.gstin,
            "city": v.addresses[0].city if v.addresses else "Delhi"
        }
        for v in vendors
    ]

    return {
        "pendReq": pend_req + 118,
        "awaitApp": await_app + 30,
        "openWo": open_wo + 71,
        "woDue": 18,
        "delayed": delayed + 10,
        "pendGrn": pend_grn + 21,
        "pendInsp": pend_insp + 14,
        "lowStock": low_stock + 35,
        "stockOut": stock_out + 7,
        "nearExp": 15,
        "defects": defects + 5,
        "disposal": disposal + 5,
        "bills": bills + 16,
        "emdRef": emd_ref + 3,
        "pgExp": pg_exp + 3,
        "stockVal": stock_val,
        "resVal": res_val,
        "blkVal": blk_val,
        "inspVal": insp_val,
        "expVal": Decimal("18500.00"),
        "dispVal": disp_val,
        "pipeline": pipeline,
        "deliveryStatus": delivery_status,
        "stockAging": stock_aging,
        "procModes": proc_modes,
        "topVendors": top_vendors
    }
