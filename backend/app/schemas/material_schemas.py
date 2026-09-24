from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal

# Base Schema with Common Attributes
class AuditBase(BaseModel):
    tenant_id: Optional[int] = 1
    branch_id: Optional[int] = 1
    entity_id: Optional[int] = 1
    department_id: Optional[int] = 1
    office_id: Optional[int] = 1
    financial_year_id: Optional[int] = 1
    is_active: Optional[bool] = True

# ----------------- UOM & Categories -----------------
class UomBase(AuditBase):
    uom_code: str
    uom_name: str
    uom_symbol: Optional[str] = None
    uom_type: Optional[str] = "Count"
    decimal_places: Optional[int] = 0

class UomCreate(UomBase):
    pass

class UomResponse(UomBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class UomConvBase(AuditBase):
    from_uom_id: int
    to_uom_id: int
    conv_factor: Decimal
    operation: Optional[str] = "MULTIPLY"

class UomConvCreate(UomConvBase):
    pass

class UomConvResponse(UomConvBase):
    id: int
    from_uom_code: Optional[str] = None
    to_uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class CategoryBase(AuditBase):
    cat_code: str
    cat_name: str
    parent_cat_id: Optional[int] = None
    cat_level: Optional[int] = 1
    hsn_sac_code: Optional[str] = None
    default_gst_rt: Optional[Decimal] = Decimal("18.00")
    acc_head_id: Optional[int] = None
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    parent_cat_name: Optional[str] = None
    item_count: Optional[int] = 0
    model_config = ConfigDict(from_attributes=True)

# ----------------- Items & Variants -----------------
class VariantBase(AuditBase):
    variant_code: str
    variant_name: str
    size_spec: Optional[str] = None
    color_spec: Optional[str] = None
    brand_spec: Optional[str] = None
    quality_spec: Optional[str] = None
    barcode_sku: Optional[str] = None
    mrp_rate: Optional[Decimal] = Decimal("0.00")
    std_rate: Optional[Decimal] = Decimal("0.00")
    tolerance_pct: Optional[Decimal] = Decimal("0.00")

class VariantCreate(VariantBase):
    item_id: Optional[int] = None

class VariantResponse(VariantBase):
    id: int
    item_id: int
    model_config = ConfigDict(from_attributes=True)

class ItemBase(AuditBase):
    item_code: str
    item_name: str
    item_desc: Optional[str] = None
    cat_id: int
    base_uom_id: int
    sec_uom_id: Optional[int] = None
    uom_conv_id: Optional[int] = None
    is_service: Optional[bool] = False
    is_stockable: Optional[bool] = True
    is_returnable: Optional[bool] = False
    is_asset: Optional[bool] = False
    is_hazardous: Optional[bool] = False
    shelf_life_days: Optional[int] = 0
    hsn_sac_code: Optional[str] = None
    gst_rate: Optional[Decimal] = Decimal("18.00")
    min_stock_qty: Optional[Decimal] = Decimal("0.00")
    max_stock_qty: Optional[Decimal] = Decimal("0.00")
    reorder_level: Optional[Decimal] = Decimal("0.00")
    reorder_qty: Optional[Decimal] = Decimal("0.00")
    lead_time_days: Optional[int] = 7
    std_rate: Optional[Decimal] = Decimal("0.00")
    tolerance_pct: Optional[Decimal] = Decimal("5.00")
    image_url: Optional[str] = None
    specifications: Optional[str] = None
    default_make: Optional[str] = None
    preferred_source: Optional[str] = "GeM"

class ItemCreate(ItemBase):
    variants: Optional[List[VariantCreate]] = []

class ItemResponse(ItemBase):
    id: int
    cat_name: Optional[str] = None
    base_uom_code: Optional[str] = None
    sec_uom_code: Optional[str] = None
    variants: List[VariantResponse] = []
    current_stock: Optional[Decimal] = Decimal("0.00")
    model_config = ConfigDict(from_attributes=True)

# ----------------- BoQ & Parties -----------------
class BoqBase(AuditBase):
    scheme_id: Optional[int] = None
    project_id: Optional[int] = None
    work_name: str
    item_id: int
    est_qty: Decimal
    est_rate: Decimal
    est_amt: Decimal
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None

class BoqCreate(BoqBase):
    pass

class BoqResponse(BoqBase):
    id: int
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    uom_code: Optional[str] = None
    scheme_name: Optional[str] = None
    project_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class PartyAddressBase(AuditBase):
    addr_type: Optional[str] = "Registered"
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state_code: Optional[str] = "DL"
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    is_default: Optional[bool] = False

class PartyAddressCreate(PartyAddressBase):
    party_id: Optional[int] = None

class PartyAddressResponse(PartyAddressBase):
    id: int
    party_id: int
    model_config = ConfigDict(from_attributes=True)

class PartyContactBase(AuditBase):
    contact_name: str
    designation: Optional[str] = None
    mobile_no: str
    email_id: Optional[str] = None
    is_primary: Optional[bool] = False

class PartyContactCreate(PartyContactBase):
    party_id: Optional[int] = None

class PartyContactResponse(PartyContactBase):
    id: int
    party_id: int
    model_config = ConfigDict(from_attributes=True)

class PartyBase(AuditBase):
    party_code: str
    party_name: str
    party_type: str  # Vendor, Customer, Contractor, GeM Supplier
    pan_no: Optional[str] = None
    gstin: Optional[str] = None
    gem_seller_id: Optional[str] = None
    msme_reg_no: Optional[str] = None
    msme_cat: Optional[str] = None
    bank_acc_no: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_name: Optional[str] = None
    vendor_rating: Optional[Decimal] = Decimal("4.5")
    is_blacklisted: Optional[bool] = False

class PartyCreate(PartyBase):
    addresses: Optional[List[PartyAddressCreate]] = []
    contacts: Optional[List[PartyContactCreate]] = []

class PartyResponse(PartyBase):
    id: int
    addresses: List[PartyAddressResponse] = []
    contacts: List[PartyContactResponse] = []
    model_config = ConfigDict(from_attributes=True)

# ----------------- Store Master -----------------
class StoreBase(AuditBase):
    store_code: str
    store_name: str
    store_type: Optional[str] = "Central Store"
    location_desc: Optional[str] = None
    incharge_id: Optional[int] = None
    incharge_name: Optional[str] = None
    contact_no: Optional[str] = None
    email_id: Optional[str] = None

class StoreCreate(StoreBase):
    pass

class StoreResponse(StoreBase):
    id: int
    total_materials: Optional[int] = 0
    total_stock_value: Optional[Decimal] = Decimal("0.00")
    model_config = ConfigDict(from_attributes=True)

# ----------------- Requisitions -----------------
class ReqLineBase(AuditBase):
    item_id: int
    variant_id: Optional[int] = None
    requested_qty: Decimal
    uom_id: int
    est_rate: Decimal
    est_amount: Decimal
    required_by_dt: Optional[date] = None
    make_preference: Optional[str] = None
    tech_spec: Optional[str] = None
    remarks: Optional[str] = None
    approved_qty: Optional[Decimal] = None
    procured_qty: Optional[Decimal] = Decimal("0.00")

class ReqLineCreate(ReqLineBase):
    req_id: Optional[int] = None

class ReqLineResponse(ReqLineBase):
    id: int
    req_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    variant_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ReqBase(AuditBase):
    req_no: str
    req_date: date
    req_type: Optional[str] = "Standard"
    priority: Optional[str] = "Normal"  # Normal, Urgent, Emergency, Critical
    store_id: Optional[int] = None
    scheme_id: Optional[int] = None
    project_id: Optional[int] = None
    budget_head_id: Optional[int] = None
    cost_center: Optional[str] = None
    purpose_desc: Optional[str] = None
    estimated_val: Optional[Decimal] = Decimal("0.00")
    proc_mode: Optional[str] = "GeM Direct"
    budget_status: Optional[str] = "Available"
    budget_amount: Optional[Decimal] = Decimal("0.00")
    stock_avail_st: Optional[str] = "Not Available"
    req_status: Optional[str] = "Draft"
    current_appr_id: Optional[int] = None
    approver_name: Optional[str] = None
    requestor_name: Optional[str] = None
    approval_date: Optional[datetime] = None
    rejection_reas: Optional[str] = None

class ReqCreate(ReqBase):
    lines: List[ReqLineCreate] = []

class ReqResponse(ReqBase):
    id: int
    department_name: Optional[str] = None
    store_name: Optional[str] = None
    lines: List[ReqLineResponse] = []
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Procurement & Tenders -----------------
class ProcPlanBase(AuditBase):
    plan_no: str
    plan_year: str
    scheme_id: Optional[int] = None
    project_id: Optional[int] = None
    budget_head_id: Optional[int] = None
    total_est_val: Decimal
    proc_method: Optional[str] = "Open Tender"
    quarter: Optional[str] = "Q1"
    target_pub_dt: Optional[date] = None
    target_wo_dt: Optional[date] = None
    plan_status: Optional[str] = "Approved"

class ProcPlanCreate(ProcPlanBase):
    pass

class ProcPlanResponse(ProcPlanBase):
    id: int
    scheme_name: Optional[str] = None
    project_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TenderBase(AuditBase):
    tender_no: str
    tender_title: str
    tender_type: Optional[str] = "Open Tender"
    proc_method: Optional[str] = "GeM Custom Bid"
    est_cost: Decimal
    fee_amount: Optional[Decimal] = Decimal("0.00")
    emd_amount: Optional[Decimal] = Decimal("0.00")
    pub_date: Optional[date] = None
    bid_start_dt: Optional[date] = None
    bid_end_dt: Optional[date] = None
    opening_date: Optional[date] = None
    tender_status: Optional[str] = "Published"
    gem_bid_no: Optional[str] = None
    cppp_ref_no: Optional[str] = None
    bids_received: Optional[int] = 0

class TenderCreate(TenderBase):
    pass

class TenderResponse(TenderBase):
    id: int
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class QuoteBase(AuditBase):
    tender_id: int
    vendor_id: int
    quote_no: str
    quote_date: date
    tech_eval_st: Optional[str] = "Qualified"
    tech_score: Optional[Decimal] = Decimal("90.00")
    basic_amount: Decimal
    tax_amount: Optional[Decimal] = Decimal("0.00")
    total_amount: Decimal
    l_position: Optional[str] = "L1"
    is_awarded: Optional[bool] = False
    eval_remarks: Optional[str] = None

class QuoteCreate(QuoteBase):
    pass

class QuoteResponse(QuoteBase):
    id: int
    vendor_name: Optional[str] = None
    tender_no: Optional[str] = None
    tender_title: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class SecurityBase(AuditBase):
    sec_type: str  # EMD, PBG, Retention Money
    tender_id: Optional[int] = None
    wo_id: Optional[int] = None
    vendor_id: int
    instrument_no: str
    inst_type: Optional[str] = "Bank Guarantee"
    bank_name: Optional[str] = None
    amount: Decimal
    issue_date: date
    expiry_date: date
    claim_date: Optional[date] = None
    sec_status: Optional[str] = "Active"  # Active, Released, Forfeited, Expired, Pending Refund
    release_date: Optional[date] = None

class SecurityCreate(SecurityBase):
    pass

class SecurityResponse(SecurityBase):
    id: int
    vendor_name: Optional[str] = None
    tender_no: Optional[str] = None
    wo_no: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Work Orders -----------------
class WoLineBase(AuditBase):
    item_id: int
    variant_id: Optional[int] = None
    order_qty: Decimal
    uom_id: int
    unit_rate: Decimal
    gst_pct: Optional[Decimal] = Decimal("18.00")
    gst_amount: Optional[Decimal] = Decimal("0.00")
    line_total: Decimal
    delivery_date: Optional[date] = None
    delivered_qty: Optional[Decimal] = Decimal("0.00")
    accepted_qty: Optional[Decimal] = Decimal("0.00")
    billed_qty: Optional[Decimal] = Decimal("0.00")

class WoLineCreate(WoLineBase):
    wo_id: Optional[int] = None

class WoLineResponse(WoLineBase):
    id: int
    wo_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WoBase(AuditBase):
    wo_no: str
    wo_date: date
    wo_type: Optional[str] = "Purchase Order"
    tender_id: Optional[int] = None
    req_id: Optional[int] = None
    vendor_id: int
    store_id: Optional[int] = None
    scheme_id: Optional[int] = None
    project_id: Optional[int] = None
    budget_head_id: Optional[int] = None
    payment_terms: Optional[str] = "100% against Delivery and Inspection"
    deliv_terms: Optional[str] = "FOR Destination"
    total_basic: Optional[Decimal] = Decimal("0.00")
    total_tax: Optional[Decimal] = Decimal("0.00")
    total_val: Decimal
    delivery_due: Optional[date] = None
    wo_status: Optional[str] = "Approved"  # Draft, Approved, Issued, Delayed, Completed, Cancelled
    amendment_no: Optional[int] = 0
    pbg_required: Optional[bool] = True
    pbg_amount: Optional[Decimal] = Decimal("0.00")
    pbg_submitted: Optional[bool] = False

class WoCreate(WoBase):
    lines: List[WoLineCreate] = []

class WoResponse(WoBase):
    id: int
    vendor_name: Optional[str] = None
    store_name: Optional[str] = None
    lines: List[WoLineResponse] = []
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class DeliveryBase(AuditBase):
    wo_id: int
    milestone_name: str
    target_date: date
    dispatch_date: Optional[date] = None
    delivery_date: Optional[date] = None
    lr_rr_no: Optional[str] = None
    transporter: Optional[str] = None
    delivery_st: Optional[str] = "On Time"  # On Time, Delayed, Partially Delivered, Not Dispatched, Delivered
    delay_days: Optional[int] = 0
    ld_amount: Optional[Decimal] = Decimal("0.00")

class DeliveryCreate(DeliveryBase):
    pass

class DeliveryResponse(DeliveryBase):
    id: int
    wo_no: Optional[str] = None
    vendor_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- GRN & Inspection -----------------
class GrnLineBase(AuditBase):
    wo_line_id: Optional[int] = None
    item_id: int
    variant_id: Optional[int] = None
    challan_qty: Decimal
    received_qty: Decimal
    uom_id: int
    unit_rate: Decimal
    accepted_qty: Optional[Decimal] = Decimal("0.00")
    rejected_qty: Optional[Decimal] = Decimal("0.00")
    short_qty: Optional[Decimal] = Decimal("0.00")
    excess_qty: Optional[Decimal] = Decimal("0.00")
    batch_lot_no: Optional[str] = None
    mfg_date: Optional[date] = None
    exp_date: Optional[date] = None
    store_bin_loc: Optional[str] = None

class GrnLineCreate(GrnLineBase):
    grn_id: Optional[int] = None

class GrnLineResponse(GrnLineBase):
    id: int
    grn_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class GrnBase(AuditBase):
    grn_no: str
    grn_date: date
    wo_id: int
    vendor_id: int
    store_id: int
    challan_no: str
    challan_date: date
    gate_entry_no: Optional[str] = None
    gate_entry_dt: Optional[date] = None
    vehicle_no: Optional[str] = None
    driver_name: Optional[str] = None
    insp_status: Optional[str] = "Pending"  # Pending, Under Inspection, Passed, Rejected, Partially Passed
    posting_status: Optional[str] = "Pending"  # Pending, Posted, Cancelled
    total_val: Optional[Decimal] = Decimal("0.00")
    remarks: Optional[str] = None

class GrnCreate(GrnBase):
    lines: List[GrnLineCreate] = []

class GrnResponse(GrnBase):
    id: int
    wo_no: Optional[str] = None
    vendor_name: Optional[str] = None
    store_name: Optional[str] = None
    lines: List[GrnLineResponse] = []
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class InspBase(AuditBase):
    grn_id: int
    insp_no: str
    insp_date: date
    committee_name: Optional[str] = None
    officer_name: Optional[str] = None
    sample_size: Optional[Decimal] = Decimal("0.00")
    visual_check: Optional[str] = "Passed"
    dimension_chk: Optional[str] = "Passed"
    lab_test_chk: Optional[str] = "NA"
    overall_result: Optional[str] = "Passed"
    observations: Optional[str] = None
    cert_file_url: Optional[str] = None

class InspCreate(InspBase):
    pass

class InspResponse(InspBase):
    id: int
    grn_no: Optional[str] = None
    vendor_name: Optional[str] = None
    wo_no: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class RtvBase(AuditBase):
    rtv_no: str
    rtv_date: date
    grn_id: int
    vendor_id: int
    store_id: int
    gate_pass_no: Optional[str] = None
    vehicle_no: Optional[str] = None
    return_reason: str
    total_qty: Decimal
    total_val: Decimal
    rtv_status: Optional[str] = "Dispatched"

class RtvCreate(RtvBase):
    pass

class RtvResponse(RtvBase):
    id: int
    grn_no: Optional[str] = None
    vendor_name: Optional[str] = None
    store_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Inventory & Stock -----------------
class StockResponse(BaseModel):
    id: int
    store_id: int
    store_name: Optional[str] = None
    item_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    variant_id: Optional[int] = None
    variant_name: Optional[str] = None
    uom_code: Optional[str] = None
    batch_no: Optional[str] = None
    bin_location: Optional[str] = None
    avail_qty: Decimal
    reserved_qty: Decimal
    blocked_qty: Decimal
    damaged_qty: Decimal
    insp_qty: Decimal
    expired_qty: Decimal
    total_qty: Decimal
    avg_unit_rate: Decimal
    total_val: Decimal
    reorder_level: Optional[Decimal] = Decimal("0.00")
    mfg_date: Optional[date] = None
    exp_date: Optional[date] = None
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)

class MovementResponse(BaseModel):
    id: int
    txn_no: str
    txn_date: datetime
    txn_type: str  # GRN Receipt, Transfer In, Transfer Out, Department Issue, Return, Adjustment
    store_id: int
    store_name: Optional[str] = None
    item_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    in_qty: Decimal
    out_qty: Decimal
    balance_qty: Decimal
    unit_rate: Decimal
    total_val: Decimal
    ref_doc_no: Optional[str] = None
    user_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TransferBase(AuditBase):
    trans_no: str
    trans_date: date
    src_store_id: int
    dest_store_id: int
    trans_status: Optional[str] = "In Transit"  # Draft, In Transit, Received, Cancelled
    dispatch_dt: Optional[datetime] = None
    received_dt: Optional[datetime] = None
    vehicle_no: Optional[str] = None
    total_items: Optional[int] = 0
    total_val: Optional[Decimal] = Decimal("0.00")
    remarks: Optional[str] = None

class TransferCreate(TransferBase):
    pass

class TransferResponse(TransferBase):
    id: int
    src_store_name: Optional[str] = None
    dest_store_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class IssueLineBase(AuditBase):
    item_id: int
    variant_id: Optional[int] = None
    req_qty: Decimal
    issued_qty: Decimal
    uom_id: int
    unit_rate: Decimal
    total_val: Decimal

class IssueLineCreate(IssueLineBase):
    issue_id: Optional[int] = None

class IssueLineResponse(IssueLineBase):
    id: int
    issue_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class IssueBase(AuditBase):
    issue_no: str
    issue_date: date
    store_id: int
    issue_type: Optional[str] = "Department Issue"  # Department Issue, Work Order, Disposal
    req_id: Optional[int] = None
    issued_to_dept: Optional[int] = None
    issued_to_name: Optional[str] = None
    employee_code: Optional[str] = None
    total_val: Optional[Decimal] = Decimal("0.00")
    issue_status: Optional[str] = "Completed"
    remarks: Optional[str] = None

class IssueCreate(IssueBase):
    lines: List[IssueLineCreate] = []

class IssueResponse(IssueBase):
    id: int
    store_name: Optional[str] = None
    lines: List[IssueLineResponse] = []
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class ReturnBase(AuditBase):
    return_no: str
    return_date: date
    store_id: int
    from_dept_id: Optional[int] = None
    return_by_name: Optional[str] = None
    item_id: int
    variant_id: Optional[int] = None
    return_qty: Decimal
    uom_id: int
    condition_st: Optional[str] = "Good"  # Good, Damaged, Scrap
    reason: Optional[str] = "Surplus material returned"
    return_status: Optional[str] = "Approved"

class ReturnCreate(ReturnBase):
    pass

class ReturnResponse(ReturnBase):
    id: int
    store_name: Optional[str] = None
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ToolIssBase(AuditBase):
    item_id: int
    variant_id: Optional[int] = None
    serial_no: Optional[str] = None
    assigned_to_name: str
    employee_code: Optional[str] = None
    checkout_dt: datetime
    exp_return_dt: Optional[date] = None
    actual_ret_dt: Optional[datetime] = None
    condition_out: Optional[str] = "Working"
    condition_in: Optional[str] = None
    checkout_st: Optional[str] = "Checked Out"  # Checked Out, Returned, Damaged, Lost
    remarks: Optional[str] = None

class ToolIssCreate(ToolIssBase):
    pass

class ToolIssResponse(ToolIssBase):
    id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Billing & Matching -----------------
class InvoiceBase(AuditBase):
    inv_no: str
    inv_date: date
    vendor_id: int
    wo_id: int
    grn_id: Optional[int] = None
    basic_val: Decimal
    tax_val: Decimal
    inv_total_val: Decimal
    ld_deduction: Optional[Decimal] = Decimal("0.00")
    tds_deduction: Optional[Decimal] = Decimal("0.00")
    passed_val: Optional[Decimal] = Decimal("0.00")
    match_status: Optional[str] = "Matched"  # Matched, Discrepancy, Pending
    bill_status: Optional[str] = "Draft"  # Draft, Sanction Order Generated, Sent to Treasury, Paid
    treasury_token: Optional[str] = None
    sanction_no: Optional[str] = None
    sanction_date: Optional[date] = None
    payment_ref: Optional[str] = None
    payment_date: Optional[date] = None

class InvoiceCreate(InvoiceBase):
    pass

class InvoiceResponse(InvoiceBase):
    id: int
    vendor_name: Optional[str] = None
    wo_no: Optional[str] = None
    grn_no: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class MatchBase(AuditBase):
    inv_id: int
    wo_id: int
    grn_id: int
    item_id: int
    wo_qty: Decimal
    grn_qty: Decimal
    inv_qty: Decimal
    qty_matched: Optional[bool] = True
    wo_rate: Decimal
    inv_rate: Decimal
    rate_matched: Optional[bool] = True
    tax_matched: Optional[bool] = True
    overall_match: Optional[str] = "Matched"
    diff_remarks: Optional[str] = None

class MatchCreate(MatchBase):
    pass

class MatchResponse(MatchBase):
    id: int
    item_name: Optional[str] = None
    inv_no: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Warranty & Defects -----------------
class WarrantyBase(AuditBase):
    item_id: int
    variant_id: Optional[int] = None
    serial_no: str
    wo_id: Optional[int] = None
    vendor_id: int
    store_id: Optional[int] = None
    dept_id: Optional[int] = None
    start_date: date
    end_date: date
    warranty_type: Optional[str] = "Comprehensive"
    sla_hours: Optional[int] = 24
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    warranty_st: Optional[str] = "Active"  # Active, Expired, Void

class WarrantyCreate(WarrantyBase):
    pass

class WarrantyResponse(WarrantyBase):
    id: int
    item_name: Optional[str] = None
    item_code: Optional[str] = None
    vendor_name: Optional[str] = None
    days_left: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)

class DefectBase(AuditBase):
    ticket_no: str
    ticket_date: date
    warranty_id: Optional[int] = None
    item_id: int
    serial_no: Optional[str] = None
    vendor_id: int
    dept_id: Optional[int] = None
    reported_by: str
    contact_no: Optional[str] = None
    defect_desc: str
    severity: Optional[str] = "Major"  # Critical, Major, Minor
    ticket_status: Optional[str] = "Logged"  # Logged, Under Investigation, Vendor Escalated, Replaced, Repaired, Closed
    vendor_ack_dt: Optional[datetime] = None
    resolved_dt: Optional[datetime] = None
    resolution_det: Optional[str] = None

class DefectCreate(DefectBase):
    pass

class DefectResponse(DefectBase):
    id: int
    item_name: Optional[str] = None
    vendor_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Disposal & Condemnation -----------------
class DisposalBase(AuditBase):
    disp_no: str
    disp_date: date
    store_id: int
    item_id: int
    variant_id: Optional[int] = None
    scrap_qty: Decimal
    uom_id: int
    book_val: Decimal
    reserve_price: Decimal
    condemn_reason: str
    survey_rep_no: Optional[str] = None
    survey_date: Optional[date] = None
    appr_status: Optional[str] = "Pending"  # Pending, Approved, Rejected
    disp_method: Optional[str] = "MSTC e-Auction"  # MSTC e-Auction, Local Scrap Sale, Donation, Destruction
    auction_no: Optional[str] = None
    buyer_name: Optional[str] = None
    realized_val: Optional[Decimal] = Decimal("0.00")
    disp_status: Optional[str] = "Pending"  # Pending, In Auction, Sold, Disposed

class DisposalCreate(DisposalBase):
    pass

class DisposalResponse(DisposalBase):
    id: int
    store_name: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Stock Audit & Adjustment -----------------
class AuditLnBase(AuditBase):
    item_id: int
    variant_id: Optional[int] = None
    system_qty: Decimal
    physical_qty: Decimal
    diff_qty: Decimal
    uom_id: int
    unit_rate: Decimal
    variance_val: Decimal
    reconcile_st: Optional[str] = "Discrepancy Found"  # Matched, Discrepancy Found, Reconciled
    remarks: Optional[str] = None

class AuditLnCreate(AuditLnBase):
    audit_id: Optional[int] = None

class AuditLnResponse(AuditLnBase):
    id: int
    audit_id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class StockAuditBase(AuditBase):
    audit_no: str
    audit_date: date
    store_id: int
    audit_type: Optional[str] = "Annual Physical Verification"
    conducted_by: str
    team_members: Optional[str] = None
    total_items_cnt: Optional[int] = 0
    matched_items: Optional[int] = 0
    var_items_cnt: Optional[int] = 0
    net_var_val: Optional[Decimal] = Decimal("0.00")
    audit_status: Optional[str] = "In Progress"  # Scheduled, In Progress, Submitted, Approved, Reconciled

class StockAuditCreate(StockAuditBase):
    lines: List[AuditLnCreate] = []

class StockAuditResponse(StockAuditBase):
    id: int
    store_name: Optional[str] = None
    lines: List[AuditLnResponse] = []
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AdjustBase(AuditBase):
    adj_no: str
    adj_date: date
    audit_id: Optional[int] = None
    store_id: int
    item_id: int
    variant_id: Optional[int] = None
    adj_type: str  # Write-Off (Loss/Theft/Damage), Write-In (Surplus Found)
    adj_qty: Decimal
    uom_id: int
    unit_rate: Decimal
    total_adj_val: Decimal
    reason_code: str
    approved_by: Optional[str] = None
    adj_status: Optional[str] = "Approved"

class AdjustCreate(AdjustBase):
    pass

class AdjustResponse(AdjustBase):
    id: int
    store_name: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# ----------------- Forecasting & Admin -----------------
class ForecastBase(AuditBase):
    item_id: int
    store_id: Optional[int] = None
    forecast_year: str
    forecast_month: str
    past_avg_cons: Decimal
    trend_factor: Optional[Decimal] = Decimal("1.05")
    proj_demand: Decimal
    current_stock: Decimal
    reorder_sugg_qty: Decimal
    algorithm: Optional[str] = "Holt-Winters"
    is_reviewed: Optional[bool] = False

class ForecastCreate(ForecastBase):
    pass

class ForecastResponse(ForecastBase):
    id: int
    item_code: Optional[str] = None
    item_name: Optional[str] = None
    uom_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class WfConfigBase(AuditBase):
    module_code: str
    doc_type: str
    stage_seq: int
    stage_name: str
    approver_role: str
    is_final_stage: Optional[bool] = False
    auto_escalate_hr: Optional[int] = 48

class WfConfigResponse(WfConfigBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class LimitBase(AuditBase):
    role_name: str
    user_id: Optional[int] = None
    dept_id: Optional[int] = None
    max_approval_lmt: Decimal
    is_tender_eval: Optional[bool] = True
    is_direct_po: Optional[bool] = True

class LimitResponse(LimitBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class NotifBase(AuditBase):
    user_id: Optional[int] = 1
    role_name: Optional[str] = "Procurement Officer"
    notif_type: str
    doc_ref_type: Optional[str] = None
    doc_ref_no: Optional[str] = None
    message: str
    action_url: Optional[str] = None
    is_read: Optional[bool] = False

class NotifResponse(NotifBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Dashboard Stats DTO
class DashboardStats(BaseModel):
    pendReq: int
    awaitApp: int
    openWo: int
    woDue: int
    delayed: int
    pendGrn: int
    pendInsp: int
    lowStock: int
    stockOut: int
    nearExp: int
    defects: int
    disposal: int
    bills: int
    emdRef: int
    pgExp: int
    stockVal: Decimal
    resVal: Decimal
    blkVal: Decimal
    inspVal: Decimal
    expVal: Decimal
    dispVal: Decimal
    pipeline: List[Dict[str, Any]]
    deliveryStatus: List[Dict[str, Any]]
    stockAging: List[Dict[str, Any]]
    procModes: List[Dict[str, Any]]
    topVendors: List[Dict[str, Any]]
