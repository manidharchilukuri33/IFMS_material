import os
import random
from datetime import date, datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.core_models import BudgetHead
from app.models.material_models import (
    MtrlItemCat, MtrlUom, MtrlUomConv, MtrlItem, MtrlVariant, MtrlBoq,
    MtrlParty, MtrlPartyAd, MtrlPartyCn, MtrlStore, MtrlReq, MtrlReqLine,
    MtrlProcPln, MtrlTender, MtrlQuote, MtrlSecurity, MtrlWo, MtrlWoLine,
    MtrlWoAmend, MtrlDelivery, MtrlGrn, MtrlGrnLine, MtrlInsp, MtrlRtv, MtrlStock,
    MtrlMovement, MtrlTransfer, MtrlIssue, MtrlIssLine, MtrlReturn,
    MtrlToolIss, MtrlInvoice, MtrlMatch, MtrlWarranty, MtrlDefect,
    MtrlDisposal, MtrlAudit, MtrlAuditLn, MtrlAdjust, MtrlForecast,
    MtrlWfCfg, MtrlLimit, MtrlNotif
)

def seed_material_database(db: Session, force_reset: bool = False):
    """Seed the database with complete realistic sample data if empty or forced."""
    
    # Check if items already exist
    existing_items = db.query(MtrlItem).count()
    if existing_items > 0 and not force_reset:
        print(f"Database already has {existing_items} items. Skipping seed.")
        return

    print("Seeding IFMS Material Management Database with comprehensive dataset...")

    TENANT_ID = 1
    ENTITY_ID = 2
    DEPT_ID = 1
    OFFICE_ID = 2
    FY_ID = 3

    # Ensure Budget Head exists
    if db.query(BudgetHead).count() == 0:
        db.add(BudgetHead(
            head_code="2059-01-001-01",
            head_name="Office Expenses - Material Procurement & Equipment",
            head_type="REVENUE",
            is_active=True
        ))
        db.flush()

    # 1. Categories
    cats_data = [
        {"cat_code": "CAT-IT", "cat_name": "IT Equipment", "hsn": "8471", "cap": True},
        {"cat_code": "CAT-OFF", "cat_name": "Office Supplies", "hsn": "4802", "cap": False},
        {"cat_code": "CAT-ELE", "cat_name": "Electrical", "hsn": "8504", "cap": False},
        {"cat_code": "CAT-FUR", "cat_name": "Furniture", "hsn": "9403", "cap": True},
        {"cat_code": "CAT-MED", "cat_name": "Medical Supplies", "hsn": "9018", "cap": False},
        {"cat_code": "CAT-CIV", "cat_name": "Civil Materials", "hsn": "2523", "cap": False},
        {"cat_code": "CAT-UNI", "cat_name": "Uniforms & Apparel", "hsn": "6203", "cap": False},
        {"cat_code": "CAT-TLS", "cat_name": "Tools & Equipment", "hsn": "8205", "cap": True}
    ]
    
    cat_objs = {}
    for c in cats_data:
        cat = db.query(MtrlItemCat).filter_by(cat_code=c["cat_code"]).first()
        if not cat:
            cat = MtrlItemCat(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                cat_code=c["cat_code"], cat_name=c["cat_name"],
                hsn_sac_code=c["hsn"], is_capital=c["cap"], is_active=True
            )
            db.add(cat)
            db.flush()
        cat_objs[c["cat_code"]] = cat

    # 2. UOMs
    uoms_data = [
        {"uom_code": "NOS", "uom_name": "Numbers / Units", "uom_type": "Count", "prec": 0},
        {"uom_code": "SET", "uom_name": "Set", "uom_type": "Count", "prec": 0},
        {"uom_code": "BOX", "uom_name": "Box", "uom_type": "Package", "prec": 0},
        {"uom_code": "REAM", "uom_name": "Ream (500 sheets)", "uom_type": "Package", "prec": 0},
        {"uom_code": "PAIR", "uom_name": "Pair", "uom_type": "Count", "prec": 0},
        {"uom_code": "KG", "uom_name": "Kilograms", "uom_type": "Weight", "prec": 2},
        {"uom_code": "MT", "uom_name": "Metric Tonnes", "uom_type": "Weight", "prec": 3},
        {"uom_code": "MTR", "uom_name": "Metres", "uom_type": "Length", "prec": 2},
        {"uom_code": "LTR", "uom_name": "Litres", "uom_type": "Volume", "prec": 2},
        {"uom_code": "BAG", "uom_name": "Bag (50 Kg)", "uom_type": "Package", "prec": 0},
        {"uom_code": "PKT", "uom_name": "Packet", "uom_type": "Package", "prec": 0},
        {"uom_code": "ROLL", "uom_name": "Roll", "uom_type": "Length", "prec": 0}
    ]
    uom_objs = {}
    for u in uoms_data:
        uom = db.query(MtrlUom).filter_by(uom_code=u["uom_code"]).first()
        if not uom:
            uom = MtrlUom(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                uom_code=u["uom_code"], uom_name=u["uom_name"],
                uom_type=u["uom_type"], precision_digits=u["prec"], is_active=True
            )
            db.add(uom)
            db.flush()
        uom_objs[u["uom_code"]] = uom

    # 3. UOM Conversions
    conv_pairs = [
        (uom_objs["BOX"].id, uom_objs["NOS"].id, Decimal("10.0000")),
        (uom_objs["MT"].id, uom_objs["KG"].id, Decimal("1000.0000")),
        (uom_objs["BAG"].id, uom_objs["KG"].id, Decimal("50.0000")),
        (uom_objs["REAM"].id, uom_objs["NOS"].id, Decimal("500.0000")),
        (uom_objs["PKT"].id, uom_objs["NOS"].id, Decimal("10.0000"))
    ]
    for from_id, to_id, factor in conv_pairs:
        if not db.query(MtrlUomConv).filter_by(from_uom_id=from_id, to_uom_id=to_id).first():
            db.add(MtrlUomConv(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID,
                from_uom_id=from_id, to_uom_id=to_id, conversion_factor=factor
            ))
    db.flush()

    # 4. Stores
    stores_data = [
        {"code": "STR-001", "name": "Central Store – Civil Lines", "type": "CENTRAL", "loc": "Civil Lines, Near Raj Niwas, Delhi"},
        {"code": "STR-002", "name": "IT Store – Delhi Secretariat", "type": "DEPARTMENTAL", "loc": "3rd Level, B-Wing, Players Building, I.P. Estate"},
        {"code": "STR-003", "name": "Health Store – LNJP Campus", "type": "MEDICAL", "loc": "LNJP Hospital Complex, New Delhi"},
        {"code": "STR-004", "name": "Education Store – Old Secretariat", "type": "DEPARTMENTAL", "loc": "Directorate of Education, Old Secretariat, Delhi"},
        {"code": "STR-005", "name": "PWD Central Warehouse", "type": "CENTRAL", "loc": "Sarai Kale Khan Ring Road, New Delhi"},
        {"code": "STR-006", "name": "Transport Department Store", "type": "DEPARTMENTAL", "loc": "5/9 Under Hill Road, Delhi"}
    ]
    store_objs = []
    for s in stores_data:
        st = db.query(MtrlStore).filter_by(store_code=s["code"]).first()
        if not st:
            st = MtrlStore(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                store_code=s["code"], store_name=s["name"], store_type=s["type"],
                location_address=s["loc"], incharge_user_id=1, is_active=True
            )
            db.add(st)
            db.flush()
        store_objs.append(st)

    # 5. Parties / Vendors
    vendors_data = [
        {"code": "VEN-0001", "name": "Delhi Digital Systems Pvt. Ltd.", "gstin": "07AABCD1234E1Z5", "type": "VENDOR", "rating": Decimal("4.6"), "gem": "GEM-DDS-9912", "city": "New Delhi", "addr": "Plot 42, Okhla Industrial Area Phase-III"},
        {"code": "VEN-0002", "name": "Bharat Office Solutions LLP", "gstin": "07AABCB5678F1Z2", "type": "VENDOR", "rating": Decimal("4.1"), "gem": "GEM-BOS-3341", "city": "New Delhi", "addr": "12/4 Asaf Ali Road, Daryaganj"},
        {"code": "VEN-0003", "name": "TechNova India Private Limited", "gstin": "07AABCT9012G1Z8", "type": "VENDOR", "rating": Decimal("3.4"), "gem": "GEM-TNI-8819", "city": "Noida", "addr": "B-14 Sector 63, Noida, UP"},
        {"code": "VEN-0004", "name": "National Industrial Suppliers", "gstin": "07AABCN3456H1Z1", "type": "CONTRACTOR", "rating": Decimal("3.9"), "gem": "GEM-NIS-7762", "city": "Delhi", "addr": "Shop 18, Chawri Bazar, Old Delhi"},
        {"code": "VEN-0005", "name": "Green Energy Equipment Services", "gstin": "07AABCG7890I1Z6", "type": "VENDOR", "rating": Decimal("4.3"), "gem": "GEM-GES-1109", "city": "Gurugram", "addr": "DLF Cyber City, Tower B, Gurugram"},
        {"code": "VEN-0006", "name": "Capital Medical Supplies", "gstin": "07AABCC2345J1Z3", "type": "VENDOR", "rating": Decimal("4.5"), "gem": "GEM-CMS-5544", "city": "New Delhi", "addr": "22 Ansari Road, Daryaganj"},
        {"code": "VEN-0007", "name": "Metro Stationery Traders", "gstin": "07AABCM6789K1Z9", "type": "VENDOR", "rating": Decimal("2.9"), "gem": "GEM-MST-2210", "city": "Delhi", "addr": "Nai Sarak, Chandni Chowk, Delhi"}
    ]
    party_objs = []
    for v in vendors_data:
        p = db.query(MtrlParty).filter_by(party_code=v["code"]).first()
        if not p:
            p = MtrlParty(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                party_code=v["code"], party_name=v["name"], trade_name=v["name"], party_type=v["type"],
                gstin=v["gstin"], pan_no=v["gstin"][2:12], gem_seller_id=v["gem"],
                party_rating=v["rating"], bank_account_no="10098234876", bank_ifsc="SBIN0000691"
            )
            db.add(p)
            db.flush()
            # Add Address and Contact
            db.add(MtrlPartyAd(
                party_id=p.id, address_type="Registered", address_line=v["addr"],
                city=v["city"], district="Central", state_code="DL", pincode="110002", is_primary=True
            ))
            db.add(MtrlPartyCn(
                party_id=p.id, contact_person="Authorized Representative", designation="Sales Director",
                phone="011-23348899", mobile="9810012345", email=f"contact@{v['name'].lower().replace(' ', '').replace('.', '')[:8]}.com", is_primary=True
            ))
            db.flush()
        party_objs.append(p)

    # 6. Items Master with Variants, Tolerances, Dual UOMs, Images, and Tools
    items_raw = [
        ("MAT-IT-0001", "Laptop Computer, 14 Inch, Business Class", "CAT-IT", "NOS", Decimal("68500.00"), Decimal("25"), Decimal("100"), "Dell", "Latitude 5450", "Intel Core i5 13th Gen, 16 GB RAM, 512 GB SSD, 14 inch FHD, Windows 11 Pro", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500"),
        ("MAT-IT-0002", "Desktop Computer, Standard Configuration", "CAT-IT", "NOS", Decimal("46200.00"), Decimal("20"), Decimal("80"), "HP", "ProDesk 400 G9", "Intel Core i5, 8 GB RAM, 512 GB SSD, 21.5 inch monitor, keyboard and mouse", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=500"),
        ("MAT-IT-0003", "Laser Printer, Network Enabled", "CAT-IT", "NOS", Decimal("28400.00"), Decimal("10"), Decimal("40"), "Canon", "LBP246dw", "Monochrome laser, 40 ppm, duplex, Ethernet and Wi-Fi", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500"),
        ("MAT-IT-0004", "Toner Cartridge, Black", "CAT-IT", "NOS", Decimal("4850.00"), Decimal("60"), Decimal("250"), "Canon", "CRG-070", "Original black toner cartridge, yield 3,000 pages", False, False, False, Decimal("2.00"), "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500"),
        ("MAT-OFF-0001", "A4 Copier Paper, 75 GSM", "CAT-OFF", "REAM", Decimal("289.00"), Decimal("400"), Decimal("2000"), "JK", "Copier Plus", "A4, 75 GSM, 500 sheets per ream, high brightness", False, False, False, Decimal("2.00"), "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500"),
        ("MAT-ELE-0001", "UPS, 1 KVA Line Interactive", "CAT-ELE", "NOS", Decimal("12600.00"), Decimal("15"), Decimal("60"), "Luminous", "Zelio 1100", "1 KVA line-interactive UPS with 20 minute backup", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500"),
        ("MAT-FUR-0001", "Office Chair, Ergonomic High Back", "CAT-FUR", "NOS", Decimal("8900.00"), Decimal("30"), Decimal("150"), "Godrej", "Aspire", "Mesh back, adjustable lumbar support, 5-star nylon base", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1580481077195-731da89f3747?w=500"),
        ("MAT-MED-0001", "Surgical Gloves, Disposable Latex", "CAT-MED", "BOX", Decimal("740.00"), Decimal("150"), Decimal("800"), "Romsons", "Latex Sterile", "Powder free latex, sterile, box of 100 pairs, size medium", False, False, False, Decimal("0.00"), "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500"),
        ("MAT-CIV-0001", "Cement, OPC Grade 43", "CAT-CIV", "BAG", Decimal("412.00"), Decimal("500"), Decimal("3000"), "ACC", "OPC 43", "Ordinary Portland Cement Grade 43, 50 kg bag, IS 8112 conformity", False, False, False, Decimal("1.00"), "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500"),
        ("MAT-IT-0005", "Network Switch, 24 Port Managed", "CAT-IT", "NOS", Decimal("32800.00"), Decimal("8"), Decimal("30"), "Cisco", "CBS350-24T", "24 port gigabit managed switch, layer 3 lite", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500"),
        ("MAT-OFF-0002", "Ball Point Pen, Blue (Pack of 10)", "CAT-OFF", "PKT", Decimal("120.00"), Decimal("200"), Decimal("1000"), "Cello", "Finegrip", "Blue ink ball pen, 0.7mm tip, packet of 10", False, False, False, Decimal("0.00"), "https://images.unsplash.com/photo-1585336261026-7f300c436952?w=500"),
        ("MAT-ELE-0002", "LED Panel Light, 36 W Recessed", "CAT-ELE", "NOS", Decimal("980.00"), Decimal("120"), Decimal("500"), "Philips", "SlimLine", "36 W LED recessed panel, 600x600 mm, cool daylight", False, False, False, Decimal("2.00"), "https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=500"),
        ("MAT-MED-0002", "Digital Clinical Thermometer", "CAT-MED", "NOS", Decimal("460.00"), Decimal("80"), Decimal("400"), "Omron", "MC-246", "Digital clinical thermometer with fever alarm and memory", False, False, False, Decimal("0.00"), "https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=500"),
        ("MAT-FUR-0002", "Steel Almirah, 4 Shelf Storage", "CAT-FUR", "NOS", Decimal("14800.00"), Decimal("12"), Decimal("50"), "Godrej", "Storwel", "CRCA steel almirah, 4 shelves, three-way locking, olive green", True, False, False, Decimal("5.00"), "https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=500"),
        ("MAT-UNI-0001", "Executive Staff Uniform Shirt", "CAT-UNI", "NOS", Decimal("850.00"), Decimal("100"), Decimal("600"), "Raymond", "Executive Poly-Cotton", "Formal staff uniform shirt with GNCTD crest embroidery", False, False, False, Decimal("0.00"), "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500"),
        ("MAT-TLS-0001", "Digital Multimeter / Insulation Tester", "CAT-TLS", "NOS", Decimal("5400.00"), Decimal("10"), Decimal("30"), "Fluke", "115 True RMS", "Handheld digital multimeter for site maintenance engineers", True, False, True, Decimal("5.00"), "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=500"),
        ("MAT-TLS-0002", "Heavy Duty Rotary Hammer Drill", "CAT-TLS", "NOS", Decimal("7200.00"), Decimal("6"), Decimal("20"), "Bosch", "GBH 2-26 DRE", "800W rotary hammer drill with SDS-plus chuck", True, False, True, Decimal("5.00"), "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500")
    ]

    item_objs = []
    for code, name, cat_c, uom_c, rate, min_q, max_q, make, model, spec, is_asset, is_srv, is_ret, tol, img in items_raw:
        item = db.query(MtrlItem).filter_by(item_code=code).first()
        if not item:
            item = MtrlItem(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                item_code=code, item_name=name, item_desc=spec,
                cat_id=cat_objs[cat_c].id,
                base_uom_id=uom_objs[uom_c].id,
                alt_uom_id=uom_objs["BOX"].id if uom_c == "NOS" else None,
                uom_conv_factor=Decimal("10.0") if uom_c == "NOS" else Decimal("1.0"),
                item_type="SERVICE" if is_srv else "GOODS",
                is_service=is_srv, is_stockable=not is_srv, is_returnable_tool=is_ret,
                is_capital=is_asset, is_consumable=not is_asset,
                hsn_sac_code=cat_objs[cat_c].hsn_sac_code, gst_rate_pct=Decimal("18.00"),
                brand_name=make, make_model=model, tolerance_pct=tol, image_url=img,
                min_stock_level=min_q, max_stock_level=max_q,
                reorder_level=min_q * Decimal("1.5"), reorder_qty=min_q * 2,
                lead_time_days=7, estimated_rate=rate, is_active=True
            )
            db.add(item)
            db.flush()

            # Add variants if applicable (Sizes, Colors, Makes)
            if "Shirt" in name:
                sizes = ["Size 38 (M)", "Size 40 (L)", "Size 42 (XL)", "Size 44 (XXL)"]
                fabrics = ["Cotton", "Silk Blend"]
                for s in sizes:
                    for f in fabrics:
                        db.add(MtrlVariant(
                            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                            item_id=item.id,
                            variant_code=f"{code}-{s.split()[1]}-{f[:3].upper()}",
                            variant_name=f"{name} - {s} - {f}",
                            size_spec=s, material_variety=f, brand_make="Raymond",
                            variant_rate=rate + (50 if f == "Silk Blend" else 0),
                            tolerance_spec="2%"
                        ))
            elif "Drill" in name or "Multimeter" in name:
                db.add(MtrlVariant(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    item_id=item.id,
                    variant_code=f"{code}-STD",
                    variant_name=f"{name} (Standard Kit)",
                    brand_make=make, variant_rate=rate, tolerance_spec=f"{tol}%"
                ))
            elif "Laptop" in name:
                db.add(MtrlVariant(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    item_id=item.id,
                    variant_code=f"{code}-I5-16GB",
                    variant_name=f"{name} - 16GB RAM / 512GB SSD",
                    brand_make="Dell", variant_rate=rate, tolerance_spec=f"{tol}%"
                ))
                db.add(MtrlVariant(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    item_id=item.id,
                    variant_code=f"{code}-I7-32GB",
                    variant_name=f"{name} - 32GB RAM / 1TB SSD",
                    brand_make="Dell", variant_rate=rate + Decimal("15000"), tolerance_spec=f"{tol}%"
                ))
            db.flush()
        item_objs.append(item)

    # 6b. BoQ Mapping Samples
    if db.query(MtrlBoq).count() == 0:
        db.add(MtrlBoq(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            boq_item_code="BOQ/IT/2026/01", boq_desc="Supply and Installation of 14-inch Business Laptops under IT Infra Scheme",
            sor_code="DSR-2026-IT-101", item_id=item_objs[0].id,
            tender_uom_id=uom_objs["NOS"].id, inv_uom_id=uom_objs["NOS"].id, conversion_factor=Decimal("1.0")
        ))
        db.add(MtrlBoq(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            boq_item_code="BOQ/CIV/2026/05", boq_desc="Supply of OPC Grade 43 Cement in 50kg Bags for Secretariat Renovation",
            sor_code="CPWD-DSR-2026-3.1", item_id=item_objs[8].id,
            tender_uom_id=uom_objs["BAG"].id, inv_uom_id=uom_objs["KG"].id, conversion_factor=Decimal("50.0")
        ))
        db.flush()

    # 7. Requisitions & Lines (12 items matching Prototype)
    req_statuses = [
        'Approved', 'Submitted', 'Under Review', 'Budget Validation Pending',
        'Approved', 'Returned for Correction', 'Procurement Initiated', 'Draft',
        'Rejected', 'Partially Procured', 'Approved', 'Fully Procured'
    ]
    req_priorities = ['Normal', 'Urgent', 'Emergency', 'Critical', 'Normal']
    req_objs = []
    today = date(2026, 9, 24)

    for i, st in enumerate(req_statuses):
        req_no = f"MR/DIT/2026/{340 + i * 3:06d}"
        req = db.query(MtrlReq).filter_by(req_no=req_no).first()
        if not req:
            it1 = item_objs[i % len(item_objs)]
            it2 = item_objs[(i + 3) % len(item_objs)]
            qty1 = Decimal(f"{(i % 6 + 1) * 5}")
            qty2 = Decimal(f"{(i % 4 + 1) * 4}")
            val1 = qty1 * it1.estimated_rate
            val2 = qty2 * it2.estimated_rate
            tot_val = val1 + val2

            req = MtrlReq(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                req_no=req_no,
                req_date=today - timedelta(days=60 - i * 4),
                target_store_id=store_objs[i % len(store_objs)].id,
                total_est_amount=tot_val,
                priority=req_priorities[i % 5],
                purpose=f"Procurement of materials for DIT project phase {(i%3)+1}",
                current_stage=st,
                approved_at=datetime.now() if st == "Approved" else None
            )
            db.add(req)
            db.flush()

            # Add lines
            db.add(MtrlReqLine(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                req_id=req.id, item_id=it1.id, requested_qty=qty1, uom_id=it1.base_uom_id,
                est_unit_rate=it1.estimated_rate, line_est_amount=val1,
                approved_qty=qty1 if st == "Approved" else Decimal("0.00"),
                technical_spec=it1.item_desc, preferred_make=it1.brand_name
            ))
            db.add(MtrlReqLine(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                req_id=req.id, item_id=it2.id, requested_qty=qty2, uom_id=it2.base_uom_id,
                est_unit_rate=it2.estimated_rate, line_est_amount=val2,
                approved_qty=qty2 if st == "Approved" else Decimal("0.00"),
                technical_spec=it2.item_desc, preferred_make=it2.brand_name
            ))
            db.flush()
        req_objs.append(req)

    # 8. Annual Procurement Plans (APP)
    proc_plans_data = [
        {"no": "APP/2026/001", "budget": Decimal("50000000.00"), "planned": Decimal("45000000.00"), "m": "Open Tender"},
        {"no": "APP/2026/002", "budget": Decimal("30000000.00"), "planned": Decimal("28000000.00"), "m": "GeM Custom Bid"},
        {"no": "APP/2026/003", "budget": Decimal("20000000.00"), "planned": Decimal("15000000.00"), "m": "Rate Contract"}
    ]
    for p in proc_plans_data:
        if not db.query(MtrlProcPln).filter_by(plan_no=p["no"]).first():
            db.add(MtrlProcPln(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                plan_no=p["no"], total_budget=p["budget"], planned_value=p["planned"],
                proc_mode=p["m"]
            ))
    db.flush()

    # 9. Tenders & Quotes
    tenders_data = [
        {"no": "TND/2026/10042", "title": "Supply of laptop computers and accessories for IT expansion", "cost": Decimal("34250000.00"), "fee": Decimal("5000.00"), "emd": Decimal("685000.00"), "gem": "GEM/2026/B/88219"},
        {"no": "TND/2026/10043", "title": "Annual Rate Contract for Office Stationery and Paper Supplies", "cost": Decimal("4500000.00"), "fee": Decimal("1000.00"), "emd": Decimal("90000.00"), "gem": "GEM/2026/B/88220"},
        {"no": "TND/2026/10044", "title": "Procurement of UPS Systems and Electrical Infrastructure", "cost": Decimal("12800000.00"), "fee": Decimal("2500.00"), "emd": Decimal("256000.00"), "gem": "GEM/2026/B/88221"},
        {"no": "TND/2026/10045", "title": "Supply of Ergonomic Office Chairs and Steel Almirahs", "cost": Decimal("8900000.00"), "fee": Decimal("2000.00"), "emd": Decimal("178000.00"), "gem": "GEM/2026/B/88222"}
    ]
    tender_objs = []
    for t in tenders_data:
        tend = db.query(MtrlTender).filter_by(tender_no=t["no"]).first()
        if not tend:
            tend = MtrlTender(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                tender_no=t["no"], tender_title=t["title"], tender_date=today - timedelta(days=30),
                portal_ref_no=t["gem"], estimated_cost=t["cost"],
                tender_fee=t["fee"], emd_amount=t["emd"],
                bid_start_date=datetime.now() - timedelta(days=25),
                bid_close_date=datetime.now() + timedelta(days=10),
                tech_open_date=datetime.now() + timedelta(days=11),
                fin_open_date=datetime.now() + timedelta(days=15)
            )
            db.add(tend)
            db.flush()

            # Add quotes for this tender
            for j, v_obj in enumerate(party_objs[:3]):
                rate_mult = Decimal("1.0") + Decimal(j * 0.05)
                basic = tend.estimated_cost * Decimal("0.92") * rate_mult
                tax = basic * Decimal("0.18")
                db.add(MtrlQuote(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    tender_id=tend.id, party_id=v_obj.id, item_id=item_objs[0].id,
                    quoted_qty=Decimal("100.00"), basic_rate=basic / Decimal("100.00"),
                    gst_percent=Decimal("18.00"), gst_amount=tax,
                    total_unit_cost=(basic + tax) / Decimal("100.00"),
                    total_bid_value=basic + tax, rank_order=j + 1,
                    is_technically_ok=True, is_selected=(j == 0)
                ))
            db.flush()
        tender_objs.append(tend)

    # 10. EMD / PBG Securities
    for i, tend in enumerate(tender_objs):
        if not db.query(MtrlSecurity).filter_by(tender_id=tend.id).first():
            db.add(MtrlSecurity(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                sec_type="EMD", tender_id=tend.id, party_id=party_objs[i % len(party_objs)].id,
                instrument_type="Bank Guarantee", instrument_no=f"BG/SBI/2026/{1000 + i}",
                instrument_date=today - timedelta(days=20), expiry_date=today + timedelta(days=160),
                amount=tend.emd_amount, issuing_bank="State Bank of India"
            ))
            db.add(MtrlSecurity(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                sec_type="PBG", tender_id=tend.id, party_id=party_objs[0].id,
                instrument_type="Performance Bank Guarantee", instrument_no=f"PBG/HDFC/2026/{5000 + i}",
                instrument_date=today - timedelta(days=10), expiry_date=today + timedelta(days=365),
                amount=tend.estimated_cost * Decimal("0.05"), issuing_bank="HDFC Bank"
            ))
    db.flush()

    # 11. Work Orders (PO) & Lines
    wo_statuses = ['Approved', 'Issued', 'Delayed', 'Approved', 'Completed', 'Issued']
    wo_objs = []
    for i, st in enumerate(wo_statuses):
        wo_no = f"PO/DIT/2026/{200 + i * 5:05d}"
        wo = db.query(MtrlWo).filter_by(wo_no=wo_no).first()
        if not wo:
            v_obj = party_objs[i % len(party_objs)]
            it1 = item_objs[i % len(item_objs)]
            it2 = item_objs[(i + 2) % len(item_objs)]
            q1, q2 = Decimal(f"{(i + 2) * 10}"), Decimal(f"{(i + 1) * 8}")
            tot_b = (q1 * it1.estimated_rate) + (q2 * it2.estimated_rate)
            tot_t = tot_b * Decimal("0.18")
            
            wo = MtrlWo(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                wo_no=wo_no, wo_date=today - timedelta(days=45 - i * 7),
                tender_id=tender_objs[i % len(tender_objs)].id,
                party_id=v_obj.id, delivery_store_id=store_objs[i % len(store_objs)].id,
                total_basic_amt=tot_b, total_tax_amt=tot_t, total_wo_amount=tot_b + tot_t,
                pb_guarantee_amt=(tot_b + tot_t) * Decimal("0.05"),
                delivery_due_date=today + timedelta(days=15 if st != "Delayed" else -5),
                payment_terms="100% upon delivery and inspection clearance"
            )
            db.add(wo)
            db.flush()

            # PO Lines
            db.add(MtrlWoLine(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                wo_id=wo.id, item_id=it1.id, order_qty=q1, uom_id=it1.base_uom_id,
                unit_rate=it1.estimated_rate, tax_percent=Decimal("18.00"),
                tax_amount=q1 * it1.estimated_rate * Decimal("0.18"),
                total_line_amount=q1 * it1.estimated_rate * Decimal("1.18"),
                accepted_qty=q1 if st == "Completed" else (q1/2 if st == "Delayed" else Decimal("0.00"))
            ))
            db.add(MtrlWoLine(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                wo_id=wo.id, item_id=it2.id, order_qty=q2, uom_id=it2.base_uom_id,
                unit_rate=it2.estimated_rate, tax_percent=Decimal("18.00"),
                tax_amount=q2 * it2.estimated_rate * Decimal("0.18"),
                total_line_amount=q2 * it2.estimated_rate * Decimal("1.18"),
                accepted_qty=q2 if st == "Completed" else Decimal("0.00")
            ))

            # Delivery tracking
            db.add(MtrlDelivery(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                delivery_ref_no=f"DEL/2026/{1000 + i}", wo_id=wo.id, party_id=v_obj.id,
                dispatch_date=today - timedelta(days=20), expected_date=wo.delivery_due_date,
                courier_transporter="VRL Logistics", lr_docket_no=f"LR/VRL/{9000+i}",
                vehicle_no=f"DL 01 AB {1200 + i}",
                delivery_status="Delayed" if st == "Delayed" else ("Delivered" if st == "Completed" else "In Transit")
            ))

            if i == 2:
                db.add(MtrlWoAmend(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    amend_no="AMD/PO/2026/001", wo_id=wo.id, amend_date=today - timedelta(days=5),
                    amend_type="Delivery Extension", old_value=wo.total_wo_amount, new_value=wo.total_wo_amount,
                    reason="Supply chain delay requested by vendor with LD waiver approval",
                    approval_ref_no="SAN/DIT/EXT/2026/102"
                ))
            db.flush()
        wo_objs.append(wo)

    # 12. Goods Receipt Notes (GRN), Inspections, and RTV
    grn_objs = []
    for i, wo in enumerate(wo_objs[:4]):
        grn_no = f"GRN/2026/{1040 + i * 2:05d}"
        grn = db.query(MtrlGrn).filter_by(grn_no=grn_no).first()
        if not grn:
            it1 = item_objs[i % len(item_objs)]
            rec_q = Decimal("20.00")
            acc_q = Decimal("18.00") if i == 0 else Decimal("20.00")
            rej_q = Decimal("2.00") if i == 0 else Decimal("0.00")

            grn = MtrlGrn(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                grn_no=grn_no, grn_date=today - timedelta(days=20 - i * 4),
                wo_id=wo.id, party_id=wo.party_id, store_id=wo.delivery_store_id,
                challan_no=f"CH/VEN/{8800 + i}", challan_date=today - timedelta(days=22 - i * 4),
                gate_entry_no=f"GE/{7700 + i}", gate_entry_date=datetime.now() - timedelta(days=21 - i * 4),
                vehicle_number=f"DL 01 AB {1200 + i}", driver_name="Ram Charan",
                receiver_user_id=1,
                inspection_status="Passed" if i > 0 else "Partially Passed",
                posting_status="Posted" if i > 1 else "Draft",
                remarks="Consignment received in store premises"
            )
            db.add(grn)
            db.flush()

            # Find corresponding wo_line
            wo_ln = db.query(MtrlWoLine).filter_by(wo_id=wo.id).first()

            db.add(MtrlGrnLine(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                grn_id=grn.id, wo_line_id=wo_ln.id if wo_ln else 1, item_id=it1.id,
                challan_qty=rec_q, received_qty=rec_q, accepted_qty=acc_q,
                rejected_qty=rej_q, batch_number=f"LOT/2026/B{i+1}",
                mfg_date=today - timedelta(days=60), expiry_date=today + timedelta(days=730),
                storage_bin=f"Rack-{i+1}/Bay-A/Level-2"
            ))

            # Inspection Record
            db.add(MtrlInsp(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                insp_no=f"INSP/2026/{500 + i:04d}", grn_id=grn.id,
                insp_date=grn.grn_date + timedelta(days=1), inspector_id=1,
                test_type="Physical & Dimensional Check", sample_size=Decimal("5.00"),
                passed_qty=acc_q, rejected_qty=rej_q,
                overall_status="Approved" if rej_q == 0 else "Partially Passed",
                rejection_reason="Minor transit casing damage" if rej_q > 0 else None
            ))

            # RTV if rejected qty exists
            if rej_q > 0:
                db.add(MtrlRtv(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    rtv_no=f"RTV/2026/{100 + i:04d}", grn_id=grn.id,
                    party_id=wo.party_id, item_id=it1.id, return_qty=rej_q,
                    return_reason="Rejected during QA testing due to damaged casing",
                    rtv_date=today - timedelta(days=15), gatepass_no=f"GP/RTV/{9900 + i}"
                ))
            db.flush()
        grn_objs.append(grn)

    # 13. Stock Balances & Bin Cards (Ledger)
    for i, it in enumerate(item_objs):
        for st_obj in store_objs[:3]:
            stk = db.query(MtrlStock).filter_by(store_id=st_obj.id, item_id=it.id).first()
            if not stk:
                avail = Decimal(f"{(i * 7 + 15) % 120}")
                if "MAT-IT-0006" in it.item_code:
                    avail = Decimal("0.00")  # Out of stock demo
                elif "MAT-CIV-0001" in it.item_code and st_obj.id == 2:
                    avail = Decimal("0.00")

                res = Decimal("5.00") if avail > 10 else Decimal("0.00")
                blk = Decimal("2.00") if i % 4 == 0 else Decimal("0.00")
                dam = Decimal("1.00") if i % 5 == 0 else Decimal("0.00")
                tot = avail + res + blk + dam

                stk = MtrlStock(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    store_id=st_obj.id, item_id=it.id,
                    batch_no=f"LOT/2026/S{st_obj.id}-I{it.id}",
                    available_qty=avail, allocated_qty=res,
                    quarantine_qty=blk, damaged_qty=dam,
                    avg_unit_cost=it.estimated_rate, total_stock_value=tot * it.estimated_rate,
                    storage_bin=f"Aisle-{st_obj.id}/Rack-{(i%5)+1}/Shelf-{(i%3)+1}",
                    last_received_date=today - timedelta(days=10)
                )
                db.add(stk)

                # Bin Card Transaction History
                db.add(MtrlMovement(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                    store_id=st_obj.id, item_id=it.id,
                    txn_type="GRN_RECEIPT", ref_doc_type="GRN", ref_doc_id=1,
                    ref_doc_no="GRN/2026/INITIAL", opening_qty=Decimal("0.00"),
                    txn_qty=tot, closing_qty=tot, unit_rate=it.estimated_rate,
                    txn_amount=tot * it.estimated_rate, performed_by=1,
                    remarks="Initial opening stock / GRN posting"
                ))
    db.flush()

    # 14. Stock Transfers, Issues, Returns, and Tool Checkouts
    if not db.query(MtrlTransfer).first():
        db.add(MtrlTransfer(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            transfer_no="TR/2026/0001", transfer_date=today - timedelta(days=5),
            from_store_id=store_objs[0].id, to_store_id=store_objs[1].id,
            item_id=item_objs[0].id, transfer_qty=Decimal("10.00"),
            dispatch_gatepass="GP/TR/8812", received_qty=Decimal("10.00")
        ))

    if not db.query(MtrlIssue).first():
        iss = MtrlIssue(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
            issue_no="ISS/2026/0045", issue_date=today - timedelta(days=3),
            store_id=store_objs[1].id, receiver_name="Sunita Rawat (ASO IT)",
            receiver_user_id=1, total_issue_val=Decimal("137000.00")
        )
        db.add(iss)
        db.flush()
        db.add(MtrlIssLine(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            issue_id=iss.id, item_id=item_objs[0].id, requested_qty=Decimal("2.00"),
            issued_qty=Decimal("2.00"), unit_rate=item_objs[0].estimated_rate,
            total_cost=Decimal("137000.00"), asset_serial_no="SN-MAT-IT-0001-901"
        ))

    if not db.query(MtrlReturn).first():
        db.add(MtrlReturn(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            return_no="RET/2026/0012", store_id=store_objs[1].id,
            item_id=item_objs[3].id, return_qty=Decimal("5.00"),
            condition_status="Good", returned_by=1, received_by=1
        ))

    # Tool Daily Issuance (Check-out / Check-in)
    tool_items = [it for it in item_objs if it.is_returnable_tool]
    if tool_items and not db.query(MtrlToolIss).first():
        db.add(MtrlToolIss(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            voucher_no="TOOL/2026/00101", issue_date=today, store_id=store_objs[0].id,
            item_id=tool_items[0].id, tool_serial_code="FLUKE-115-SN98412",
            issued_qty=Decimal("1.00"), worker_labor_name="Mohan Lal (Site Tech)",
            worker_id_card="EMP/PWD/774", shift_name="Morning Shift",
            expected_return=today, status="Issued", tool_condition="Working / Calibrated"
        ))
        if len(tool_items) > 1:
            db.add(MtrlToolIss(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                voucher_no="TOOL/2026/00102", issue_date=today - timedelta(days=1),
                store_id=store_objs[0].id, item_id=tool_items[1].id,
                tool_serial_code="BOSCH-GBH-SN44120", issued_qty=Decimal("1.00"),
                worker_labor_name="Rajesh Kumar (Electrician)", worker_id_card="EMP/PWD/883",
                shift_name="Day Shift", expected_return=today - timedelta(days=1),
                returned_qty=Decimal("1.00"), returned_time=datetime.now() - timedelta(hours=2),
                status="Returned", tool_condition="Good / Inspected"
            ))
    db.flush()

    # 15. Invoices & 3-Way Matching Engine Data
    for i, wo in enumerate(wo_objs[:4]):
        inv_no = f"INV/VEN/{4000 + i * 15:05d}"
        inv = db.query(MtrlInvoice).filter_by(inv_no=inv_no).first()
        if not inv:
            grn_ref = grn_objs[i] if i < len(grn_objs) else None
            b_val = wo.total_basic_amt
            t_val = wo.total_tax_amt
            tot_val = b_val + t_val

            inv = MtrlInvoice(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                inv_no=inv_no, vendor_inv_no=f"VINV/2026/{800 + i}",
                vendor_inv_date=today - timedelta(days=15 - i * 3),
                received_date=today - timedelta(days=14 - i * 3),
                wo_id=wo.id, grn_id=grn_ref.id if grn_ref else 1, party_id=wo.party_id,
                basic_amount=b_val, tax_amount=t_val, gross_amount=tot_val,
                net_payable_amount=tot_val,
                match_status="Matched" if i != 2 else "Discrepancy",
                payment_status="Paid" if i == 0 else ("Sent to Treasury" if i == 1 else "Initiated"),
                utr_number=f"UTR-SBI-GNCTD-{99000 + i}" if i == 0 else None,
                payment_date=today - timedelta(days=2) if i == 0 else None
            )
            db.add(inv)
            db.flush()

            # 3-Way match line
            db.add(MtrlMatch(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                invoice_id=inv.id, wo_id=wo.id, grn_id=grn_ref.id if grn_ref else 1,
                wo_total_amt=tot_val, grn_accepted_amt=tot_val if i != 2 else tot_val - Decimal("5000"),
                inv_claimed_amt=tot_val, rate_discrepancy=Decimal("0.00"),
                qty_discrepancy=Decimal("0.00") if i != 2 else Decimal("2.00"),
                tax_discrepancy=Decimal("0.00"),
                match_verdict="Full Match" if i != 2 else "Discrepancy Detected"
            ))
            db.flush()

    # 16. Warranty & Defects
    for i, it in enumerate(item_objs[:4]):
        if not db.query(MtrlWarranty).filter_by(item_id=it.id).first():
            warr = MtrlWarranty(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                item_id=it.id, asset_serial_no=f"SN-{it.item_code}-{88200+i}",
                wo_id=wo_objs[0].id, party_id=party_objs[0].id, custodian_store_id=store_objs[1].id,
                warranty_start_date=today - timedelta(days=90),
                warranty_end_date=today + timedelta(days=640),
                warranty_terms="3-Year Comprehensive On-site OEM Warranty with 24hr TAT",
                status="Under Warranty"
            )
            db.add(warr)
            db.flush()

            if i == 0:
                db.add(MtrlDefect(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    ticket_no="TKT/2026/0018", ticket_date=today - timedelta(days=4),
                    warranty_id=warr.id, item_id=it.id, party_id=party_objs[0].id,
                    defect_category="Hardware Failure", severity="Critical",
                    defect_desc="Laptop motherboard power circuit failure, no display",
                    resolution_tat_due=today + timedelta(days=1),
                    resolution_status="Escalated to OEM"
                ))
            elif i == 1:
                db.add(MtrlDefect(
                    tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                    ticket_no="TKT/2026/0019", ticket_date=today - timedelta(days=10),
                    warranty_id=warr.id, item_id=it.id, party_id=party_objs[0].id,
                    defect_category="Component Noise / Malfunction", severity="Medium",
                    defect_desc="SMPS fan noise and periodic thermal throttling",
                    resolution_tat_due=today - timedelta(days=3),
                    resolved_date=today - timedelta(days=1),
                    resolution_status="Resolved", vendor_response="SMPS cooling unit replaced by OEM engineer"
                ))
    db.flush()

    # 17. Disposal & Condemnation
    disposals_data = [
        {"no": "DSP/2026/0008", "item": item_objs[1], "qty": Decimal("15.00"), "book": Decimal("125000.00"), "res": Decimal("35000.00"), "m": "E-Auction", "auc": "MSTC/DEL/2026/119", "buyer": "M/s Eco Recycle Ltd"},
        {"no": "DSP/2026/0009", "item": item_objs[6], "qty": Decimal("24.00"), "book": Decimal("48000.00"), "res": Decimal("12000.00"), "m": "E-Auction", "auc": None, "buyer": None},
        {"no": "DSP/2026/0010", "item": item_objs[4], "qty": Decimal("50.00"), "book": Decimal("8500.00"), "res": Decimal("2000.00"), "m": "Local Scrap Sale", "auc": "SCRAP/2026/44", "buyer": "Local Scrap Merchant"}
    ]
    for d in disposals_data:
        if not db.query(MtrlDisposal).filter_by(disp_proposal_no=d["no"]).first():
            db.add(MtrlDisposal(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                disp_proposal_no=d["no"], store_id=store_objs[0].id, item_id=d["item"].id,
                disposal_qty=d["qty"], condemnation_reason="Beyond Economical Repair (BER) certified by Survey Committee",
                book_value_amount=d["book"], reserve_price=d["res"],
                disposal_mode=d["m"], auction_ref_no=d["auc"], buyer_name=d["buyer"],
                realized_value=d["res"] * Decimal("1.2") if d["buyer"] else Decimal("0.00")
            ))
    db.flush()

    # 18. Stock Audit (Physical Verification) & Adjustments
    if not db.query(MtrlAudit).first():
        audit = MtrlAudit(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
            audit_no="PV/2026/0003", audit_type="Annual PV", store_id=store_objs[0].id,
            period_label="FY 2026-27 Annual Audit", audit_team_lead="R. Meena (AO)",
            start_date=today - timedelta(days=7), end_date=today - timedelta(days=1),
            audit_status="Submitted"
        )
        db.add(audit)
        db.flush()

        db.add(MtrlAuditLn(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            audit_id=audit.id, item_id=item_objs[4].id, book_qty=Decimal("1180.00"),
            physical_qty=Decimal("1175.00"), variance_value=Decimal("-1445.00"),
            investigation_notes="Damaged due to roof seepage in warehouse section B",
            adjustment_action="Write-Off Proposed"
        ))
        db.add(MtrlAuditLn(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
            audit_id=audit.id, item_id=item_objs[10].id, book_qty=Decimal("340.00"),
            physical_qty=Decimal("340.00"), variance_value=Decimal("0.00"),
            investigation_notes="Physical count matches bin ledger",
            adjustment_action="Reconciled"
        ))

        # Stock Adjustment
        db.add(MtrlAdjust(
            tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
            adj_voucher_no="ADJ/2026/0004", audit_id=audit.id, store_id=store_objs[0].id,
            item_id=item_objs[4].id, adjustment_type="Write-Off (Loss/Theft/Damage)",
            adj_qty=Decimal("5.00"), adj_value=Decimal("1445.00"),
            sanction_order_no="SAN/IT/2026/ADJ-09", sanction_order_date=today - timedelta(days=2)
        ))
    db.flush()

    # 19. Demand Forecasts
    for it in item_objs[:5]:
        if not db.query(MtrlForecast).filter_by(item_id=it.id).first():
            avg_c = Decimal(random.randint(15, 60))
            db.add(MtrlForecast(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID, financial_year_id=FY_ID,
                item_id=it.id, store_id=store_objs[0].id,
                annual_consumption=avg_c * 12, current_stock_qty=Decimal("25.00"),
                projected_demand=avg_c * Decimal("1.10"),
                suggested_order_qty=max(Decimal("0.00"), (avg_c * Decimal("2.0")) - Decimal("25.00")),
                est_budget_required=((avg_c * Decimal("2.0")) - Decimal("25.00")) * it.estimated_rate
            ))
    db.flush()

    # 20. Workflow Configurations & Financial Limits
    wf_configs = [
        ("REQ", 1, "Section Incharge Submission", "Dealing Assistant", Decimal("0"), Decimal("50000")),
        ("REQ", 2, "Technical Verification", "Store Officer", Decimal("50000"), Decimal("500000")),
        ("REQ", 3, "Budget & Finance Concurrence", "Finance Officer", Decimal("500000"), Decimal("2500000")),
        ("REQ", 4, "Final Administrative Approval", "Head of Department", Decimal("2500000"), Decimal("50000000")),
        ("PO", 1, "PO Drafting & Line Verification", "Procurement Officer", Decimal("0"), Decimal("2500000")),
        ("PO", 2, "Financial Concurrence", "Chief Accounts Officer", Decimal("2500000"), Decimal("10000000")),
        ("PO", 3, "Competent Authority Sanction", "Director (IT)", Decimal("10000000"), Decimal("500000000"))
    ]
    for mod, seq, st_name, role, mn, mx in wf_configs:
        if not db.query(MtrlWfCfg).filter_by(module_name=mod, stage_sequence=seq).first():
            db.add(MtrlWfCfg(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                module_name=mod, stage_sequence=seq, stage_name=st_name,
                required_role=role, min_amount=mn, max_amount=mx
            ))

    limits_data = [
        ("Store Officer", Decimal("50000.00"), Decimal("100000.00"), Decimal("200000.00"), Decimal("0.00"), Decimal("25000.00")),
        ("Procurement Officer", Decimal("250000.00"), Decimal("1000000.00"), Decimal("2500000.00"), Decimal("5000000.00"), Decimal("100000.00")),
        ("Head of Department (HoD)", Decimal("500000.00"), Decimal("2500000.00"), Decimal("10000000.00"), Decimal("25000000.00"), Decimal("500000.00")),
        ("Special Secretary / Director", Decimal("1000000.00"), Decimal("5000000.00"), Decimal("25000000.00"), Decimal("100000000.00"), Decimal("2000000.00")),
        ("Departmental Financial Committee", Decimal("5000000.00"), Decimal("25000000.00"), Decimal("100000000.00"), Decimal("500000000.00"), Decimal("10000000.00"))
    ]
    for role, dp, qt, lt, op, dis in limits_data:
        if not db.query(MtrlLimit).filter_by(role_name=role).first():
            db.add(MtrlLimit(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                role_name=role, direct_purchase_lim=dp, quotation_proc_lim=qt,
                limited_tender_lim=lt, open_tender_lim=op, disposal_writeoff=dis
            ))
    db.flush()

    # 21. Notifications Queue
    notifs = [
        ("REQUISITION", "Requisition Submitted", "Requisition #MR/DIT/2026/000343 submitted for your approval.", "/req/approvals"),
        ("TENDER", "Technical Evaluation Done", "Technical evaluation completed for Tender TND/2026/10042. Financial bids ready to open.", "/proc/eval"),
        ("DELIVERY", "Delivery Delayed", "Work Order PO/DIT/2026/00210 delivery is delayed by 12 days. LD penalty applicable.", "/wo/delivery"),
        ("GRN", "QA Inspection Passed", "Quality inspection passed for GRN/2026/01040. Pending store stock posting.", "/grn/list"),
        ("BILLING", "3-Way Match Discrepancy", "Three-way match discrepancy detected on invoice INV/VEN/04030 from TechNova India.", "/billing/match"),
        ("WARRANTY", "Critical Defect Logged", "Critical defect ticket TKT/2026/0018 escalated to OEM Dell Services.", "/warranty/defects")
    ]
    for ev_type, title, msg, route in notifs:
        if not db.query(MtrlNotif).filter_by(title=title).first():
            db.add(MtrlNotif(
                tenant_id=TENANT_ID, branch_id=1, entity_id=ENTITY_ID, department_id=DEPT_ID, office_id=OFFICE_ID,
                user_id=1, target_role="Procurement Officer", event_type=ev_type,
                title=title, message=msg, action_route=route, is_read=False
            ))

    db.commit()
    print("Database seeding completed successfully!")
