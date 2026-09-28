from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from app.database import get_db
from app.models.material_models import MtrlForecast, MtrlItem, MtrlStore, MtrlStock

from app.routers._common import get_permissions, require_permission, enforce_not_self_approval, insert_audit, get_audit_history, get_workflow_transitions, apply_transition, CurrentUser

router = APIRouter(prefix="/forecasting", tags=["Demand Forecasting"])

FORM_CODE = "mtrl-demand-forecast"

@router.get("/forecasts")
def list_forecasts(db: Session = Depends(get_db)):
    fcs = db.query(MtrlForecast).all()
    return [
        {
            "id": f.id,
            "item_id": f.item_id,
            "item_code": f.item.item_code if f.item else None,
            "item_name": f.item.item_name if f.item else None,
            "uom_code": f.item.base_uom.uom_code if f.item and f.item.base_uom else "Nos",
            "store_id": f.store_id,
            "store_name": f.store.store_name if f.store else None,
            "annual_consumption": float(f.annual_consumption),
            "current_stock_qty": float(f.current_stock_qty),
            "projected_demand": float(f.projected_demand),
            "suggested_order_qty": float(f.suggested_order_qty),
            "est_budget_required": float(f.est_budget_required)
        }
        for f in fcs
    ]

@router.get("/consumption")
def get_consumption_trends(db: Session = Depends(get_db)):
    items = db.query(MtrlItem).limit(6).all()
    months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    trends = []
    for it in items:
        base = float(it.min_stock_level) if it.min_stock_level else 20.0
        trends.append({
            "item_id": it.id,
            "item_name": it.item_name,
            "monthly_data": [
                {"month": m, "consumption": round(base * (0.8 + 0.08 * idx), 1)}
                for idx, m in enumerate(months)
            ]
        })
    return trends

@router.post("/generate")
def generate_forecasts(db: Session = Depends(get_db)):
    items = db.query(MtrlItem).all()
    stores = db.query(MtrlStore).all()
    created = 0

    for it in items[:8]:
        for st in stores[:2]:
            stk = db.query(MtrlStock).filter(MtrlStock.item_id == it.id, MtrlStock.store_id == st.id).first()
            avail = stk.available_qty if stk else Decimal("0.00")
            avg_c = (it.reorder_level if it.reorder_level else Decimal("20.00")) * Decimal("1.2")
            sugg = max(Decimal("0.00"), (avg_c * Decimal("2.0")) - avail)

            fc = db.query(MtrlForecast).filter(MtrlForecast.item_id == it.id, MtrlForecast.store_id == st.id).first()
            if not fc:
                fc = MtrlForecast(
                    tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
                    item_id=it.id, store_id=st.id,
                    annual_consumption=avg_c * 12,
                    current_stock_qty=avail,
                    projected_demand=avg_c * Decimal("1.10"),
                    suggested_order_qty=sugg,
                    est_budget_required=sugg * (it.estimated_rate if it.estimated_rate else Decimal("100.00"))
                )
                db.add(fc)
                created += 1
            else:
                fc.current_stock_qty = avail
                fc.suggested_order_qty = sugg
                fc.est_budget_required = sugg * (it.estimated_rate if it.estimated_rate else Decimal("100.00"))

    db.commit()
    return {"message": f"Forecast generated for {len(items)} materials across stores", "newly_created": created}


# ----------------- SKILL.md Standard Endpoints -----------------
@router.get("/permissions/mine")
def get_my_permissions(db: Session = Depends(get_db)):
    user = CurrentUser()
    return get_permissions(db, user, FORM_CODE)

@router.get("/{id}/available-actions")
def get_entity_actions(id: int, db: Session = Depends(get_db)):
    rec = db.query(MtrlForecast).filter(MtrlForecast.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    st = getattr(rec, "status", "Active")
    transitions = get_workflow_transitions(db, "FORECAST", str(st))
    return {"actions": transitions, "can_edit": str(st) in ('Draft', 'Generated')}

@router.post("/{id}/action")
def perform_entity_action(id: int, payload: dict, db: Session = Depends(get_db)):
    rec = db.query(MtrlForecast).filter(MtrlForecast.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    action_code = payload.get("action_code", "")
    remarks = payload.get("remarks", "")
    user = CurrentUser()
    from_st = str(getattr(rec, "status", "Active"))
    to_st = apply_transition(db, user, FORM_CODE, "FORECAST", from_st, action_code, remarks, created_by=getattr(rec, 'created_by', None))
    if hasattr(rec, "status"):
        setattr(rec, "status", to_st)
    db.commit()
    insert_audit(db, "mtrl_forecast", id, action_code, remarks=remarks, stage_from=from_st, stage_to=to_st)
    return {"message": f"Action {action_code} applied successfully", "status": to_st}

@router.get("/{id}/audit")
def get_entity_audit(id: int, db: Session = Depends(get_db)):
    rec = db.query(MtrlForecast).filter(MtrlForecast.id == id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Record not found")
    return get_audit_history(db, "mtrl_forecast", id)
