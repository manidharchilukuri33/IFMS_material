from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
import random
from app.database import get_db
from app.models.material_models import (
    MtrlItem, MtrlItemCat, MtrlUom, MtrlUomConv, MtrlVariant, MtrlBoq, MtrlStock
)

router = APIRouter(prefix="/materials", tags=["Material Master"])

# ----------------- Items -----------------
@router.get("/items")
def list_items(
    cat_id: Optional[int] = None,
    item_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MtrlItem)
    if cat_id:
        query = query.filter(MtrlItem.cat_id == cat_id)
    if item_type:
        query = query.filter(MtrlItem.item_type == item_type)
    if is_active is not None:
        query = query.filter(MtrlItem.is_active == is_active)
    if search:
        s = f"%{search}%"
        query = query.filter(MtrlItem.item_code.ilike(s) | MtrlItem.item_name.ilike(s) | MtrlItem.brand_name.ilike(s))
    
    items = query.order_by(MtrlItem.id.asc()).all()
    
    # Enrich with stock
    stock_map = {}
    for st in db.query(MtrlStock.item_id, MtrlStock.available_qty).all():
        stock_map[st.item_id] = stock_map.get(st.item_id, Decimal("0.00")) + st.available_qty

    res = []
    for it in items:
        res.append({
            "id": it.id,
            "item_code": it.item_code,
            "item_name": it.item_name,
            "item_desc": it.item_desc,
            "cat_id": it.cat_id,
            "cat_name": it.category.cat_name if it.category else None,
            "base_uom_id": it.base_uom_id,
            "base_uom_code": it.base_uom.uom_code if it.base_uom else None,
            "alt_uom_id": it.alt_uom_id,
            "alt_uom_code": it.alt_uom.uom_code if it.alt_uom else None,
            "uom_conv_factor": float(it.uom_conv_factor) if it.uom_conv_factor else 1.0,
            "item_type": it.item_type,
            "is_service": it.is_service,
            "is_stockable": it.is_stockable,
            "is_returnable_tool": it.is_returnable_tool,
            "is_capital": it.is_capital,
            "is_consumable": it.is_consumable,
            "hsn_sac_code": it.hsn_sac_code,
            "gst_rate_pct": float(it.gst_rate_pct) if it.gst_rate_pct else 18.0,
            "brand_name": it.brand_name,
            "make_model": it.make_model,
            "tolerance_pct": float(it.tolerance_pct) if it.tolerance_pct else 0.0,
            "image_url": it.image_url,
            "min_stock_level": float(it.min_stock_level) if it.min_stock_level else 0,
            "max_stock_level": float(it.max_stock_level) if it.max_stock_level else 0,
            "reorder_level": float(it.reorder_level) if it.reorder_level else 0,
            "reorder_qty": float(it.reorder_qty) if it.reorder_qty else 0,
            "lead_time_days": it.lead_time_days,
            "estimated_rate": float(it.estimated_rate) if it.estimated_rate else 0,
            "current_stock": float(stock_map.get(it.id, Decimal("0.00"))),
            "is_active": it.is_active,
            "variants_count": len(it.variants)
        })
    return res

@router.get("/items/{id}")
def get_item(id: int, db: Session = Depends(get_db)):
    it = db.query(MtrlItem).filter(MtrlItem.id == id).first()
    if not it:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {
        "id": it.id,
        "item_code": it.item_code,
        "item_name": it.item_name,
        "item_desc": it.item_desc,
        "cat_id": it.cat_id,
        "cat_name": it.category.cat_name if it.category else None,
        "base_uom_id": it.base_uom_id,
        "base_uom_code": it.base_uom.uom_code if it.base_uom else None,
        "alt_uom_id": it.alt_uom_id,
        "alt_uom_code": it.alt_uom.uom_code if it.alt_uom else None,
        "uom_conv_factor": float(it.uom_conv_factor) if it.uom_conv_factor else 1.0,
        "item_type": it.item_type,
        "is_service": it.is_service,
        "is_stockable": it.is_stockable,
        "is_returnable_tool": it.is_returnable_tool,
        "is_capital": it.is_capital,
        "is_consumable": it.is_consumable,
        "hsn_sac_code": it.hsn_sac_code,
        "gst_rate_pct": float(it.gst_rate_pct) if it.gst_rate_pct else 18.0,
        "brand_name": it.brand_name,
        "make_model": it.make_model,
        "tolerance_pct": float(it.tolerance_pct) if it.tolerance_pct else 0.0,
        "image_url": it.image_url,
        "min_stock_level": float(it.min_stock_level) if it.min_stock_level else 0,
        "max_stock_level": float(it.max_stock_level) if it.max_stock_level else 0,
        "reorder_level": float(it.reorder_level) if it.reorder_level else 0,
        "reorder_qty": float(it.reorder_qty) if it.reorder_qty else 0,
        "lead_time_days": it.lead_time_days,
        "estimated_rate": float(it.estimated_rate) if it.estimated_rate else 0,
        "is_active": it.is_active,
        "variants": [
            {
                "id": v.id,
                "variant_code": v.variant_code,
                "variant_name": v.variant_name,
                "size_spec": v.size_spec,
                "color_finish": v.color_finish,
                "brand_make": v.brand_make,
                "material_variety": v.material_variety,
                "tolerance_spec": v.tolerance_spec,
                "barcode_sku": v.barcode_sku,
                "variant_rate": float(v.variant_rate) if v.variant_rate else 0
            }
            for v in it.variants
        ]
    }

@router.post("/items")
def create_item(data: dict, db: Session = Depends(get_db)):
    # Auto-generate item code if not provided
    if not data.get("item_code"):
        cnt = db.query(MtrlItem).count() + 1
        data["item_code"] = f"MAT-GEN-{cnt:04d}"
        
    item = MtrlItem(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2, financial_year_id=3,
        item_code=data["item_code"],
        item_name=data["item_name"],
        item_desc=data.get("item_desc"),
        cat_id=data["cat_id"],
        base_uom_id=data["base_uom_id"],
        alt_uom_id=data.get("alt_uom_id"),
        uom_conv_factor=Decimal(str(data.get("uom_conv_factor", 1.0))),
        item_type="SERVICE" if data.get("is_service") else "GOODS",
        is_service=data.get("is_service", False),
        is_stockable=data.get("is_stockable", True),
        is_returnable_tool=data.get("is_returnable_tool", False),
        is_capital=data.get("is_capital", False),
        is_consumable=data.get("is_consumable", True),
        hsn_sac_code=data.get("hsn_sac_code"),
        gst_rate_pct=Decimal(str(data.get("gst_rate_pct", 18.0))),
        brand_name=data.get("brand_name"),
        make_model=data.get("make_model"),
        tolerance_pct=Decimal(str(data.get("tolerance_pct", 0.0))),
        image_url=data.get("image_url"),
        min_stock_level=Decimal(str(data.get("min_stock_level", 0))),
        max_stock_level=Decimal(str(data.get("max_stock_level", 0))),
        reorder_level=Decimal(str(data.get("reorder_level", 0))),
        reorder_qty=Decimal(str(data.get("reorder_qty", 0))),
        lead_time_days=data.get("lead_time_days", 7),
        estimated_rate=Decimal(str(data.get("estimated_rate", 0))),
        is_active=data.get("is_active", True)
    )
    db.add(item)
    db.flush()

    # Create variants if passed
    for v in data.get("variants", []):
        db.add(MtrlVariant(
            tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
            item_id=item.id,
            variant_code=v.get("variant_code", f"{item.item_code}-V{random.randint(100,999)}"),
            variant_name=v["variant_name"],
            size_spec=v.get("size_spec"),
            color_finish=v.get("color_finish"),
            brand_make=v.get("brand_make", item.brand_name),
            material_variety=v.get("material_variety"),
            tolerance_spec=v.get("tolerance_spec", f"{item.tolerance_pct}%"),
            variant_rate=Decimal(str(v.get("variant_rate", item.estimated_rate)))
        ))
    db.commit()
    return {"message": "Material item created successfully", "id": item.id, "item_code": item.item_code}

@router.put("/items/{id}")
def update_item(id: int, data: dict, db: Session = Depends(get_db)):
    item = db.query(MtrlItem).filter(MtrlItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    for field in ["item_name", "item_desc", "cat_id", "base_uom_id", "alt_uom_id", "hsn_sac_code", "brand_name", "make_model", "image_url", "lead_time_days", "is_active", "is_service", "is_returnable_tool", "is_capital"]:
        if field in data:
            setattr(item, field, data[field])
            
    for dec_field in ["uom_conv_factor", "gst_rate_pct", "tolerance_pct", "min_stock_level", "max_stock_level", "reorder_level", "reorder_qty", "estimated_rate"]:
        if dec_field in data:
            setattr(item, dec_field, Decimal(str(data[dec_field])))
            
    db.commit()
    return {"message": "Item updated successfully", "id": item.id}

@router.delete("/items/{id}")
def delete_item(id: int, db: Session = Depends(get_db)):
    item = db.query(MtrlItem).filter(MtrlItem.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_active = False
    db.commit()
    return {"message": "Item marked inactive successfully"}

# ----------------- Categories -----------------
@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    cats = db.query(MtrlItemCat).all()
    # Count items per cat
    counts = {}
    for c in db.query(MtrlItem.cat_id, func.count(MtrlItem.id)).group_by(MtrlItem.cat_id).all():
        counts[c[0]] = c[1]

    return [
        {
            "id": c.id,
            "cat_code": c.cat_code,
            "cat_name": c.cat_name,
            "hsn_sac_code": c.hsn_sac_code,
            "is_capital": c.is_capital,
            "is_active": c.is_active,
            "item_count": counts.get(c.id, 0)
        }
        for c in cats
    ]

@router.post("/categories")
def create_category(data: dict, db: Session = Depends(get_db)):
    cat = MtrlItemCat(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        cat_code=data["cat_code"],
        cat_name=data["cat_name"],
        hsn_sac_code=data.get("hsn_sac_code"),
        is_capital=data.get("is_capital", False),
        is_active=True
    )
    db.add(cat)
    db.commit()
    return {"message": "Category created successfully", "id": cat.id}

# ----------------- UOMs & Conversions -----------------
@router.get("/uoms")
def list_uoms(db: Session = Depends(get_db)):
    uoms = db.query(MtrlUom).all()
    return [
        {
            "id": u.id,
            "uom_code": u.uom_code,
            "uom_name": u.uom_name,
            "uom_type": u.uom_type,
            "precision_digits": u.precision_digits,
            "is_active": u.is_active
        }
        for u in uoms
    ]

@router.post("/uoms")
def create_uom(data: dict, db: Session = Depends(get_db)):
    uom = MtrlUom(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        uom_code=data["uom_code"].upper(),
        uom_name=data["uom_name"],
        uom_type=data.get("uom_type", "Count"),
        precision_digits=data.get("precision_digits", 0),
        is_active=True
    )
    db.add(uom)
    db.commit()
    return {"message": "UOM created successfully", "id": uom.id}

@router.get("/uom-conversions")
def list_uom_conversions(db: Session = Depends(get_db)):
    convs = db.query(MtrlUomConv).all()
    uom_map = {u.id: u.uom_code for u in db.query(MtrlUom).all()}
    return [
        {
            "id": c.id,
            "from_uom_id": c.from_uom_id,
            "from_uom_code": uom_map.get(c.from_uom_id),
            "to_uom_id": c.to_uom_id,
            "to_uom_code": uom_map.get(c.to_uom_id),
            "conversion_factor": float(c.conversion_factor)
        }
        for c in convs
    ]

# ----------------- BoQ Mappings -----------------
@router.get("/boq-mappings")
def list_boq_mappings(db: Session = Depends(get_db)):
    boqs = db.query(MtrlBoq).all()
    return [
        {
            "id": b.id,
            "boq_item_code": b.boq_item_code,
            "boq_desc": b.boq_desc,
            "sor_code": b.sor_code,
            "item_id": b.item_id,
            "item_code": b.item.item_code if b.item else None,
            "item_name": b.item.item_name if b.item else None,
            "tender_uom_id": b.tender_uom_id,
            "inv_uom_id": b.inv_uom_id,
            "conversion_factor": float(b.conversion_factor)
        }
        for b in boqs
    ]

@router.post("/boq-mappings")
def create_boq_mapping(data: dict, db: Session = Depends(get_db)):
    boq = MtrlBoq(
        tenant_id=1, branch_id=1, entity_id=2, department_id=1, office_id=2,
        boq_item_code=data["boq_item_code"],
        boq_desc=data["boq_desc"],
        sor_code=data.get("sor_code"),
        item_id=data["item_id"],
        tender_uom_id=data["tender_uom_id"],
        inv_uom_id=data["inv_uom_id"],
        conversion_factor=Decimal(str(data.get("conversion_factor", 1.0)))
    )
    db.add(boq)
    db.commit()
    return {"message": "BoQ mapping created successfully", "id": boq.id}

# ----------------- Bulk Upload Simulation -----------------
@router.post("/bulk-upload")
def bulk_upload_materials(file: Optional[UploadFile] = File(None), db: Session = Depends(get_db)):
    return {
        "status": "success",
        "processed_rows": 24,
        "created_materials": 22,
        "updated_materials": 2,
        "errors": []
    }
