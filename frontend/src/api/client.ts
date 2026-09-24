import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:8002/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Dashboard
  getDashboardStats: () => apiClient.get('/dashboard/stats'),

  // Materials & Master
  getItems: () => apiClient.get('/materials/items'),
  getItem: (id: number) => apiClient.get(`/materials/items/${id}`),
  createItem: (data: any) => apiClient.post('/materials/items', data),
  updateItem: (id: number, data: any) => apiClient.put(`/materials/items/${id}`, data),
  getCategories: () => apiClient.get('/materials/categories'),
  getUoms: () => apiClient.get('/materials/uoms'),
  getUomConversions: () => apiClient.get('/materials/uom-conversions'),
  getBoqMappings: () => apiClient.get('/materials/boq-mappings'),
  bulkUpload: (items: any[]) => apiClient.post('/materials/bulk-upload', items),

  // Requisitions
  getRequisitions: () => apiClient.get('/requisitions/'),
  getPendingApprovals: () => apiClient.get('/requisitions/pending-approvals'),
  createRequisition: (data: any) => apiClient.post('/requisitions/', data),
  updateRequisitionStatus: (id: number, status: string, notes?: string) =>
    apiClient.patch(`/requisitions/${id}/status`, { status, remarks: notes }),
  consolidateRequisitions: (reqIds: number[]) =>
    apiClient.post('/requisitions/consolidate', { requisition_ids: reqIds }),

  // Procurement
  getProcurementPlans: () => apiClient.get('/procurement/plans'),
  getTenders: () => apiClient.get('/procurement/tenders'),
  createTender: (data: any) => apiClient.post('/procurement/tenders', data),
  getQuotes: (tenderId?: number) =>
    apiClient.get('/procurement/quotes', { params: { tender_id: tenderId } }),
  awardTender: (tenderId: number, data: any) =>
    apiClient.post(`/procurement/tenders/${tenderId}/award`, data),
  getSecurities: () => apiClient.get('/procurement/securities'),

  // Work Orders
  getWorkOrders: () => apiClient.get('/work-orders/'),
  createWorkOrder: (data: any) => apiClient.post('/work-orders/', data),
  getAmendments: (woId: number) => apiClient.get(`/work-orders/${woId}/amendments`),
  createAmendment: (woId: number, data: any) =>
    apiClient.post(`/work-orders/${woId}/amendments`, data),
  getDeliveries: () => apiClient.get('/work-orders/deliveries/all'),
  updateDelivery: (id: number, data: any) =>
    apiClient.patch(`/work-orders/deliveries/${id}`, data),

  // GRN & Inspection
  getGrns: () => apiClient.get('/grn/'),
  createGrn: (data: any) => apiClient.post('/grn/', data),
  getInspections: () => apiClient.get('/grn/inspections'),
  submitGrnInspection: (grnId: number, data: any) =>
    apiClient.post(`/grn/${grnId}/inspections`, data),
  postGrnToStock: (grnId: number) =>
    apiClient.post(`/grn/${grnId}/post-to-stock`),
  getRtvs: () => apiClient.get('/grn/rtv/all'),
  createRtv: (data: any) => apiClient.post('/grn/rtv', data),

  // Inventory & Stores
  getStores: () => apiClient.get('/inventory/stores'),
  createStore: (data: any) => apiClient.post('/inventory/stores', data),
  getStockBalances: (storeId?: number) =>
    apiClient.get('/inventory/stock', { params: { store_id: storeId } }),
  getStockMovements: (storeId?: number, itemId?: number) =>
    apiClient.get('/inventory/movements', { params: { store_id: storeId, item_id: itemId } }),
  getTransfers: () => apiClient.get('/inventory/transfers'),
  createTransfer: (data: any) => apiClient.post('/inventory/transfers', data),
  getIssues: () => apiClient.get('/inventory/issues'),
  createIssue: (data: any) => apiClient.post('/inventory/issues', data),
  getToolIssuances: () => apiClient.get('/inventory/tool-issuances'),
  createToolIssuance: (data: any) => apiClient.post('/inventory/tool-issuances', data),
  returnTool: (toolId: number, condition: string) =>
    apiClient.post(`/inventory/tool-issuances/${toolId}/return`, { condition }),

  // Billing & Treasury
  getInvoices: () => apiClient.get('/billing/invoices'),
  createInvoice: (data: any) => apiClient.post('/billing/invoices', data),
  getInvoiceMatches: () => apiClient.get('/billing/matches'),
  generateSanction: (invoiceId: number, data: any) =>
    apiClient.post(`/billing/invoices/${invoiceId}/generate-sanction`, data),
  sendToTreasury: (invoiceId: number) =>
    apiClient.post(`/billing/invoices/${invoiceId}/send-to-treasury`),
  updatePayment: (invoiceId: number, data: any) =>
    apiClient.post(`/billing/invoices/${invoiceId}/payment-update`, data),

  // Warranty & Defects
  getWarrantyAssets: () => apiClient.get('/warranty/assets'),
  getDefectTickets: () => apiClient.get('/warranty/defects'),
  createDefectTicket: (data: any) => apiClient.post('/warranty/defects', data),
  resolveDefectTicket: (ticketId: number, notes: string) =>
    apiClient.post(`/warranty/defects/${ticketId}/resolve`, { resolution_notes: notes }),
  escalateDefectToGem: (ticketId: number) =>
    apiClient.post(`/warranty/defects/${ticketId}/escalate`),

  // Disposal
  getCondemnationProposals: () => apiClient.get('/disposal/proposals'),
  createCondemnationProposal: (data: any) => apiClient.post('/disposal/proposals', data),
  approveCondemnationProposal: (proposalId: number, data: any) =>
    apiClient.post(`/disposal/proposals/${proposalId}/approve`, data),
  recordDisposalSale: (proposalId: number, data: any) =>
    apiClient.post(`/disposal/proposals/${proposalId}/record-sale`, data),

  // Stock Audit
  getAuditSchedules: () => apiClient.get('/audit/schedules'),
  createAuditSchedule: (data: any) => apiClient.post('/audit/schedules', data),
  recordAuditCounts: (scheduleId: number, data: any) =>
    apiClient.post(`/audit/schedules/${scheduleId}/record-counts`, data),
  getStockAdjustments: () => apiClient.get('/audit/adjustments'),
  createStockAdjustment: (data: any) => apiClient.post('/audit/adjustments', data),

  // Forecasting
  getForecasts: () => apiClient.get('/forecasting/forecasts'),
  getConsumptionLogs: (itemId?: number) =>
    apiClient.get('/forecasting/consumption', { params: { item_id: itemId } }),
  generateForecast: (itemId: number) =>
    apiClient.post(`/forecasting/generate`, { item_id: itemId }),

  // Reports
  getProcurementMis: () => apiClient.get('/reports/procurement-mis'),
  getInventoryMis: () => apiClient.get('/reports/inventory-mis'),
  getVendorScorecards: () => apiClient.get('/reports/vendor-performance'),
  getAuditLogs: () => apiClient.get('/reports/audit-trail'),

  // Administration
  getWorkflows: () => apiClient.get('/admin/workflows'),
  getFinancialLimits: () => apiClient.get('/admin/limits'),
  getNotifications: () => apiClient.get('/admin/notifications'),
  getIntegrations: () => apiClient.get('/admin/integrations'),
  getDepartments: () => apiClient.get('/admin/departments'),
  getOffices: () => apiClient.get('/admin/offices'),
  getParties: () => apiClient.get('/admin/parties'),
};

export default apiClient;
