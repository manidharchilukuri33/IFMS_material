// IFMS Material Management Complete TypeScript Definitions

export interface Item {
  id: number;
  item_code: string;
  item_name: string;
  item_desc?: string;
  cat_id: number;
  cat_name?: string;
  base_uom_id: number;
  base_uom_code?: string;
  alt_uom_id?: number;
  alt_uom_code?: string;
  uom_conv_factor: number;
  item_type: string;
  is_service: boolean;
  is_stockable: boolean;
  is_returnable_tool: boolean;
  is_capital: boolean;
  is_consumable: boolean;
  hsn_sac_code?: string;
  gst_rate_pct: number;
  brand_name?: string;
  make_model?: string;
  tolerance_pct: number;
  image_url?: string;
  min_stock_level: number;
  max_stock_level: number;
  reorder_level: number;
  reorder_qty: number;
  lead_time_days: number;
  estimated_rate: number;
  current_stock: number;
  is_active: boolean;
  variants_count?: number;
  variants?: ItemVariant[];
}

export interface ItemVariant {
  id: number;
  variant_code: string;
  variant_name: string;
  size_spec?: string;
  color_finish?: string;
  brand_make?: string;
  material_variety?: string;
  tolerance_spec?: string;
  barcode_sku?: string;
  variant_rate: number;
}

export interface Category {
  id: number;
  cat_code: string;
  cat_name: string;
  hsn_sac_code?: string;
  is_capital: boolean;
  is_active: boolean;
  item_count?: number;
}

export interface Uom {
  id: number;
  uom_code: string;
  uom_name: string;
  uom_type: string;
  precision_digits: number;
  is_active: boolean;
}

export interface UomConv {
  id: number;
  from_uom_id: number;
  from_uom_code?: string;
  to_uom_id: number;
  to_uom_code?: string;
  conversion_factor: number;
}

export interface Store {
  id: number;
  store_code: string;
  store_name: string;
  store_type: string;
  location_address?: string;
  is_active: boolean;
  total_materials?: number;
  total_stock_value?: number;
}

export type StoreMaster = Store;

export interface RequisitionLine {
  id?: number;
  item_id: number;
  item_code?: string;
  item_name?: string;
  uom_code?: string;
  requested_qty: number;
  approved_qty?: number;
  est_unit_rate: number;
  line_est_amount: number;
  preferred_make?: string;
  technical_spec?: string;
}

export interface Requisition {
  id: number;
  req_no: string;
  req_date: string;
  priority: 'Normal' | 'Urgent' | 'Emergency' | 'Critical';
  store_id?: number;
  store_name?: string;
  purpose?: string;
  total_est_amount: number;
  current_stage: string;
  approved_at?: string;
  created_at?: string;
  lines_count?: number;
  lines?: RequisitionLine[];
}

export interface Tender {
  id: number;
  tender_no: string;
  tender_title: string;
  tender_date?: string;
  portal_ref_no?: string;
  estimated_cost: number;
  tender_fee: number;
  emd_amount: number;
  bid_start_date?: string;
  bid_close_date?: string;
  bids_received?: number;
  status?: string;
  awarded_party_id?: number;
  awarded_party_name?: string;
  quotes?: Quote[];
}

export interface Quote {
  id: number;
  tender_id?: number;
  tender_no?: string;
  party_id: number;
  vendor_name?: string;
  item_name?: string;
  quoted_qty: number;
  basic_rate: number;
  gst_percent?: number;
  total_bid_value: number;
  rank_order?: number;
  is_technically_ok: boolean;
  is_selected: boolean;
}

export interface WorkOrderLine {
  id?: number;
  item_id: number;
  item_code?: string;
  item_name?: string;
  uom_code?: string;
  order_qty: number;
  unit_rate: number;
  tax_percent: number;
  total_line_amount: number;
  accepted_qty?: number;
}

export interface WorkOrder {
  id: number;
  wo_no: string;
  wo_date?: string;
  party_id: number;
  vendor_name?: string;
  vendor_gstin?: string;
  store_id?: number;
  store_name?: string;
  total_basic_amt: number;
  total_tax_amt: number;
  total_wo_amount: number;
  pb_guarantee_amt?: number;
  delivery_due_date?: string;
  payment_terms?: string;
  status: string;
  lines_count?: number;
  amendments_count?: number;
  lines?: WorkOrderLine[];
  amendments?: any[];
}

export interface Delivery {
  id: number;
  delivery_ref_no: string;
  wo_no?: string;
  party_id?: number;
  vendor_name?: string;
  dispatch_date?: string;
  expected_date?: string;
  received_date?: string;
  courier_transporter?: string;
  lr_docket_no?: string;
  vehicle_no?: string;
  delivery_status: 'On Time' | 'Delayed' | 'Partially Delivered' | 'Not Dispatched' | 'In Transit' | 'Delivered';
}

export interface GrnLine {
  id?: number;
  item_id: number;
  item_code?: string;
  item_name?: string;
  challan_qty: number;
  received_qty: number;
  accepted_qty: number;
  rejected_qty: number;
  batch_number?: string;
  storage_bin?: string;
}

export interface GrnHeader {
  id: number;
  grn_number: string;
  work_order_id: number;
  store_id: number;
  vendor_challan_no: string;
  vendor_challan_date?: string;
  received_date?: string;
  transporter_name?: string;
  vehicle_number?: string;
  e_way_bill_number?: string;
  received_by_officer?: string;
  total_received_value?: number;
  status: string;
  remarks?: string;
  items?: any[];
}

export type Grn = GrnHeader;

export interface GrnInspection {
  id: number;
  grn_id: number;
  inspection_number?: string;
  inspection_date?: string;
  inspector_name: string;
  inspector_designation?: string;
  sample_size?: number | string;
  accepted_quantity?: number;
  rejected_quantity?: number;
  test_report_number?: string;
  inspection_status: string;
  inspection_notes?: string;
}

export interface GrnRtv {
  id: number;
  grn_id: number;
  rtv_number: string;
  vendor_id?: number;
  reason: string;
  gatepass_number?: string;
  dispatch_date?: string;
  action_type?: string;
  status?: string;
}

export interface StockBalance {
  id: number;
  store_id: number;
  item_id: number;
  storage_bin?: string;
  quantity_on_hand: number;
  quantity_reserved?: number;
  quantity_available?: number;
  average_unit_cost?: number;
  total_value?: number;
}

export interface StockMovement {
  id: number;
  movement_date?: string;
  movement_type: string;
  reference_document_no?: string;
  item_id: number;
  store_id: number;
  quantity: number;
  balance_after_quantity?: number;
  batch_number?: string;
  remarks?: string;
}

export interface InterStoreTransfer {
  id: number;
  transfer_number: string;
  from_store_id: number;
  to_store_id: number;
  transfer_date?: string;
  gatepass_number?: string;
  vehicle_number?: string;
  status: string;
}

export interface MaterialIssue {
  id: number;
  issue_number: string;
  requisition_id: number;
  store_id: number;
  issued_to_department_id?: number;
  issue_date?: string;
  gatepass_number?: string;
  status: string;
}

export interface ToolIssuance {
  id: number;
  voucher_no?: string;
  item_id: number;
  store_id?: number;
  serial_number?: string;
  issued_to_name: string;
  issued_to_designation?: string;
  contact_number?: string;
  issued_at?: string;
  expected_return_date?: string;
  purpose?: string;
  condition_out?: string;
  status: string;
}

export interface VendorInvoice {
  id: number;
  vendor_invoice_number: string;
  work_order_id: number;
  grn_id: number;
  vendor_id?: number;
  invoice_date?: string;
  invoice_amount: number;
  tax_amount: number;
  total_payable_amount?: number;
  tds_it_amount?: number;
  tds_gst_amount?: number;
  net_payable_amount?: number;
  is_three_way_matched?: boolean;
  status: string;
  remarks?: string;
}

export interface InvoiceMatch {
  id: number;
  invoice_id: number;
  work_order_id: number;
  grn_id: number;
  po_quantity?: number;
  grn_quantity?: number;
  invoice_quantity?: number;
  price_variance?: number;
  match_status?: string;
}

export interface SanctionOrder {
  id: number;
  sanction_number: string;
  head_of_account: string;
  sanctioned_amount: number;
  approving_authority: string;
  financial_year: string;
}

export interface WarrantyAsset {
  id: number;
  item_id: number;
  work_order_id?: number;
  serial_number?: string;
  asset_serial_no?: string;
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_type?: string;
  warranty_terms?: string;
  sla_response_hours?: number;
  status?: string;
}

export interface DefectTicket {
  id: number;
  ticket_number?: string;
  ticket_no?: string;
  item_id?: number;
  item_name?: string;
  serial_number?: string;
  defect_description?: string;
  reported_by_name?: string;
  reported_by_department?: string;
  severity: string;
  status?: string;
  resolution_status?: string;
}

export interface CondemnationProposal {
  id: number;
  proposal_number: string;
  item_id: number;
  store_id?: number;
  quantity?: number;
  book_value?: number;
  reserve_price?: number;
  actual_sale_amount?: number;
  reason_for_condemnation?: string;
  status: string;
  created_at?: string;
}

export interface StockAuditSchedule {
  id: number;
  audit_number: string;
  store_id: number;
  financial_year: string;
  audit_type: string;
  audit_lead_officer?: string;
  committee_members?: string;
  scheduled_start_date?: string;
  scheduled_end_date?: string;
  status: string;
}

export type AuditSchedule = StockAuditSchedule;

export interface StockAdjustment {
  id: number;
  item_id: number;
  store_id: number;
  adjustment_type: string;
  quantity: number;
  unit_cost?: number;
  reason_code?: string;
  sanction_reference_number?: string;
  status?: string;
}

export interface MaterialForecast {
  id: number;
  item_id: number;
  forecast_model?: string;
  historical_average_consumption?: number;
  projected_quantity?: number;
  safety_stock_quantity?: number;
  economic_order_quantity?: number;
}

export interface ConsumptionLog {
  id: number;
  item_id: number;
  month_year: string;
  consumed_quantity: number;
}

export interface VendorScorecard {
  id: number;
  vendor_id?: number;
  vendor_name?: string;
  overall_score?: number;
  on_time_delivery_rate?: number;
  quality_acceptance_rate?: number;
  total_order_value?: number;
}

export interface AuditLog {
  id: number;
  created_at?: string;
  module_name: string;
  action: string;
  record_id?: number;
  user_id?: number;
  ip_address?: string;
  details?: string;
}

export interface SystemNotification {
  id: number;
  title: string;
  message: string;
  notification_type?: string;
  action_route?: string;
  is_read?: boolean;
  created_at?: string;
}

export type NotificationItem = SystemNotification;

export interface DashboardStats {
  pendReq: number;
  awaitApp: number;
  openWo: number;
  woDue: number;
  delayed: number;
  pendGrn: number;
  pendInsp: number;
  lowStock: number;
  stockOut: number;
  nearExp: number;
  defects: number;
  disposal: number;
  bills: number;
  emdRef: number;
  pgExp: number;
  stockVal: number;
  resVal: number;
  blkVal: number;
  inspVal: number;
  expVal: number;
  dispVal: number;
  pipeline: { stage: string; count: number }[];
  deliveryStatus: { name: string; value: number; color: string }[];
  stockAging: { name: string; value: number; color: string }[];
  procModes: { name: string; value: number; color: string }[];
  topVendors: { code: string; name: string; rating: number; gstin: string; city: string }[];
}
