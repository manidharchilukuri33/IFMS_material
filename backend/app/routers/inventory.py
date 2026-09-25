from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime
import random
from app.database import get_db
from app.models.material_models import (
    MtrlStore, MtrlStock, MtrlMovement, MtrlTransfer, MtrlIssue, MtrlIssLine,
    MtrlReturn, MtrlToolIss, MtrlItem, MtrlVariant
)

router = APIRouter(prefix="/inventory", tags=["Inventory Integration"])

# ----------------- Store Masters -----------------
@router.get("/stores")
def list_stores(db: Session = Depends(get_db)):
    stores = db.query(MtrlStore).all()
    # Compute store inventory totals
    val_map = {}
    mat_map = {}
    for st in db.query(MtrlStock).all():
        val_map[st.store_id] = val_map.get(st.store_id, Decimal("0.00")) + st.total_stock_value
        mat_map[st.store_id] = mat_map.get(st.store_id, 0) + 1

    return [
        {
            "id": s.id,
            "store_code": s.store_code,
            "store_name": s.store_name,
            "store_type": s.store_type,
            "location_address": s.location_address,
            "is_active": s.is_active,
            "total_materials": mat_map.get(s.id, 0),
            "total_stock_value": float(val_map.get(s.id, Decimal("0.00")))
        }
        for s in stores
    ]

@router.post("/stores")
def create_store(data: dict, db: Session = Depends(get_db)):
    store = MtrlStore(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        store_code=data["store_code"],
        store_name=data["store_name"],
        store_type=data.get("store_type", "DEPARTMENTAL"),
        location_address=data.get("location_address"),
        incharge_user_id=1,
        is_active=True
    )
    db.add(store)
    db.commit()
    return {"message": "Store created successfully", "id": store.id}

# ----------------- Stock Balances Overview -----------------
@router.get("/stock")
def list_stock(
    store_id: Optional[int] = None,
    cat_id: Optional[int] = None,
    low_stock: Optional[bool] = None,
    zero_stock: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlStock)
    if store_id:
        query = query.filter(MtrlStock.store_id == store_id)
    if zero_stock:
        query = query.filter(MtrlStock.available_qty == 0)
    
    stocks = query.all()
    res = []
    for s in stocks:
        it = s.item
        if not it:
            continue
        if cat_id and it.cat_id != cat_id:
            continue
        if search:
            s_term = search.lower()
            if s_term not in it.item_name.lower() and s_term not in it.item_code.lower():
                continue
        
        reorder_lvl = float(it.reorder_level) if it.reorder_level else 20.0
        avail = float(s.available_qty)
        
        if low_stock and (avail == 0 or avail >= reorder_lvl):
            continue

        res.append({
            "id": s.id,
            "store_id": s.store_id,
            "store_name": s.store.store_name if s.store else None,
            "item_id": s.item_id,
            "item_code": it.item_code,
            "item_name": it.item_name,
            "cat_name": it.category.cat_name if it.category else None,
            "uom_code": it.base_uom.uom_code if it.base_uom else "Nos",
            "batch_no": s.batch_no,
            "available_qty": avail,
            "allocated_qty": float(s.allocated_qty),
            "quarantine_qty": float(s.quarantine_qty),
            "damaged_qty": float(s.damaged_qty),
            "total_qty": avail + float(s.allocated_qty) + float(s.quarantine_qty) + float(s.damaged_qty),
            "avg_unit_cost": float(s.avg_unit_cost),
            "total_stock_value": float(s.total_stock_value),
            "storage_bin": s.storage_bin,
            "reorder_level": reorder_lvl,
            "stock_status": "Out of Stock" if avail == 0 else ("Low Stock" if avail < reorder_lvl else "Normal")
        })
    return res

# ----------------- Material Movements (Bin Card Ledger) -----------------
@router.get("/movements")
def list_movements(
    store_id: Optional[int] = None,
    item_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlMovement)
    if store_id:
        query = query.filter(MtrlMovement.store_id == store_id)
    if item_id:
        query = query.filter(MtrlMovement.item_id == item_id)

    movs = query.order_by(MtrlMovement.id.desc()).limit(limit).all()
    return [
        {
            "id": m.id,
            "txn_timestamp": m.txn_timestamp.isoformat() if m.txn_timestamp else None,
            "store_id": m.store_id,
            "store_name": m.store.store_name if m.store else None,
            "item_id": m.item_id,
            "item_code": m.item.item_code if m.item else None,
            "item_name": m.item.item_name if m.item else None,
            "txn_type": m.txn_type,
            "ref_doc_no": m.ref_doc_no,
            "opening_qty": float(m.opening_qty),
            "txn_qty": float(m.txn_qty),
            "closing_qty": float(m.closing_qty),
            "unit_rate": float(m.unit_rate),
            "txn_amount": float(m.txn_amount),
            "remarks": m.remarks
        }
        for m in movs
    ]

# ----------------- Stock Transfers -----------------
@router.get("/transfers")
def list_transfers(db: Session = Depends(get_db)):
    trans = db.query(MtrlTransfer).all()
    return [
        {
            "id": t.id,
            "transfer_no": t.transfer_no,
            "transfer_date": t.transfer_date.isoformat() if t.transfer_date else None,
            "from_store_id": t.from_store_id,
            "from_store_name": t.from_store.store_name if t.from_store else None,
            "to_store_id": t.to_store_id,
            "to_store_name": t.to_store.store_name if t.to_store else None,
            "item_id": t.item_id,
            "item_name": t.item.item_name if t.item else None,
            "transfer_qty": float(t.transfer_qty),
            "received_qty": float(t.received_qty) if t.received_qty else None,
            "dispatch_gatepass": t.dispatch_gatepass,
            "status": "Received" if t.received_qty else "In Transit"
        }
        for t in trans
    ]

@router.post("/transfers")
def create_transfer(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlTransfer).count() + 1
    t_no = f"TR/2026/{cnt:04d}"

    trans = MtrlTransfer(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        transfer_no=t_no,
        transfer_date=date.today(),
        from_store_id=data["from_store_id"],
        to_store_id=data["to_store_id"],
        item_id=data["item_id"],
        transfer_qty=Decimal(str(data["transfer_qty"])),
        dispatch_gatepass=data.get("dispatch_gatepass", f"GP/TR/{random.randint(1000,9999)}")
    )
    db.add(trans)
    db.commit()
    return {"message": "Stock transfer initiated", "id": trans.id, "transfer_no": t_no}

@router.put("/transfers/{id}/receive")
def receive_transfer(id: int, db: Session = Depends(get_db)):
    trans = db.query(MtrlTransfer).filter(MtrlTransfer.id == id).first()
    if not trans:
        raise HTTPException(status_code=404, detail="Transfer record not found")
    
    trans.received_qty = trans.transfer_qty
    db.commit()
    return {"message": "Stock transfer received into destination store"}

# ----------------- Stock Issues -----------------
@router.get("/issues")
def list_issues(db: Session = Depends(get_db)):
    issues = db.query(MtrlIssue).all()
    return [
        {
            "id": i.id,
            "issue_no": i.issue_no,
            "issue_date": i.issue_date.isoformat() if i.issue_date else None,
            "store_id": i.store_id,
            "store_name": i.store.store_name if i.store else None,
            "receiver_name": i.receiver_name,
            "total_issue_val": float(i.total_issue_val),
            "lines": [
                {
                    "item_id": l.item_id,
                    "item_name": l.item.item_name if l.item else None,
                    "issued_qty": float(l.issued_qty),
                    "unit_rate": float(l.unit_rate),
                    "total_cost": float(l.total_cost)
                }
                for l in i.lines
            ]
        }
        for i in issues
    ]

@router.post("/issues")
def create_issue(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlIssue).count() + 1
    iss_no = f"ISS/2026/{cnt:04d}"

    lines_data = data.get("lines") or data.get("items") or []
    tot_val = Decimal("0.00")
    for l in lines_data:
        q = Decimal(str(l.get("issued_qty") or l.get("issued_quantity") or l.get("quantity", 1)))
        r = Decimal(str(l.get("unit_rate") or l.get("unit_price", 0)))
        tot_val += q * r

    issue = MtrlIssue(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        issue_no=data.get("issue_no") or iss_no,
        issue_date=date.today(),
        store_id=data.get("store_id") or data.get("from_store_id", 1),
        receiver_name=data.get("receiver_name") or data.get("issued_to_emp") or data.get("issued_to_name", "Staff Member"),
        receiver_user_id=1,
        total_issue_val=tot_val
    )
    db.add(issue)
    db.flush()

    for l in lines_data:
        item = db.query(MtrlItem).filter(MtrlItem.id == l["item_id"]).first()
        qty = Decimal(str(l.get("issued_qty") or l.get("issued_quantity") or l.get("quantity", 1)))
        rate = Decimal(str(l.get("unit_rate") or l.get("unit_price") or (item.estimated_rate if item else 0)))
        db.add(MtrlIssLine(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            issue_id=issue.id,
            item_id=l["item_id"],
            requested_qty=qty,
            issued_qty=qty,
            unit_rate=rate,
            total_cost=qty * rate,
            asset_serial_no=l.get("asset_serial_no")
        ))

        # Deduct from store stock
        stk = db.query(MtrlStock).filter(MtrlStock.store_id == data["store_id"], MtrlStock.item_id == l["item_id"]).first()
        if stk:
            stk.available_qty = max(Decimal("0.00"), stk.available_qty - qty)
            stk.total_stock_value = stk.available_qty * stk.avg_unit_cost

    db.commit()
    return {"message": "Stock issued successfully", "id": issue.id, "issue_no": iss_no}

# ----------------- Stock Returns -----------------
@router.get("/returns")
def list_returns(db: Session = Depends(get_db)):
    rets = db.query(MtrlReturn).all()
    return [
        {
            "id": r.id,
            "return_no": r.return_no,
            "store_name": r.store.store_name if r.store else None,
            "item_name": r.item.item_name if r.item else None,
            "return_qty": float(r.return_qty),
            "condition_status": r.condition_status,
            "created_at": r.created_at.isoformat() if r.created_at else None
        }
        for r in rets
    ]

@router.post("/returns")
def create_return(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlReturn).count() + 1
    ret_no = f"RET/2026/{cnt:04d}"

    ret = MtrlReturn(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        return_no=ret_no,
        store_id=data["store_id"],
        item_id=data["item_id"],
        return_qty=Decimal(str(data["return_qty"])),
        condition_status=data.get("condition_status", "Good"),
        returned_by=1,
        received_by=1
    )
    db.add(ret)
    db.commit()
    return {"message": "Material returned to store ledger", "id": ret.id, "return_no": ret_no}

# ----------------- Tool Daily Check-Out / Check-In -----------------
@router.get("/tool-issuances")
def list_tool_issuances(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(MtrlToolIss)
    if status:
        query = query.filter(MtrlToolIss.status == status)

    tools = query.all()
    return [
        {
            "id": t.id,
            "voucher_no": t.voucher_no,
            "issue_date": t.issue_date.isoformat() if t.issue_date else None,
            "store_id": t.store_id,
            "store_name": t.store.store_name if t.store else None,
            "item_id": t.item_id,
            "item_name": t.item.item_name if t.item else None,
            "tool_serial_code": t.tool_serial_code,
            "issued_qty": float(t.issued_qty),
            "worker_labor_name": t.worker_labor_name,
            "worker_id_card": t.worker_id_card,
            "shift_name": t.shift_name,
            "expected_return": t.expected_return.isoformat() if t.expected_return else None,
            "returned_qty": float(t.returned_qty),
            "returned_time": t.returned_time.isoformat() if t.returned_time else None,
            "tool_condition": t.tool_condition,
            "status": t.status
        }
        for t in tools
    ]

@router.post("/tool-issuances/checkout")
def checkout_tool(data: dict, db: Session = Depends(get_db)):
    cnt = db.query(MtrlToolIss).count() + 1
    v_no = f"TOOL/2026/{100 + cnt:05d}"

    tool = MtrlToolIss(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        voucher_no=v_no,
        issue_date=date.today(),
        store_id=data.get("store_id", 1),
        item_id=data["item_id"],
        tool_serial_code=data.get("tool_serial_code", f"TOOL-SN-{random.randint(1000,9999)}"),
        issued_qty=Decimal(str(data.get("issued_qty", 1))),
        worker_labor_name=data["worker_labor_name"],
        worker_id_card=data.get("worker_id_card"),
        shift_name=data.get("shift_name", "Morning Shift"),
        expected_return=date.fromisoformat(data["expected_return"]) if data.get("expected_return") else date.today(),
        tool_condition=data.get("tool_condition", "Working"),
        status="Issued"
    )
    db.add(tool)
    db.commit()
    return {"message": "Tool checked out to staff successfully", "id": tool.id, "voucher_no": v_no}

@router.put("/tool-issuances/{id}/checkin")
def checkin_tool(id: int, data: dict, db: Session = Depends(get_db)):
    t = db.query(MtrlToolIss).filter(MtrlToolIss.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Tool voucher not found")

    t.returned_qty = t.issued_qty
    t.returned_time = datetime.now()
    t.status = "Returned"
    t.tool_condition = data.get("tool_condition", "Good / Inspected")
    t.remarks = data.get("remarks")
    db.commit()
    return {"message": "Tool check-in recorded successfully", "id": t.id}
