import React, { useState, useEffect } from 'react';
import { 
  Warehouse, ArrowRightLeft, Send, RotateCcw, Wrench, Search, Filter, 
  Plus, Eye, CheckCircle, AlertTriangle, XCircle, RefreshCw, Download, 
  Layers, Package, ArrowUpRight, ArrowDownLeft, Clock, UserCheck
} from 'lucide-react';
import { api } from '../api/client';
import { StoreMaster, StockBalance, StockMovement, InterStoreTransfer, MaterialIssue, ToolIssuance } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const InventoryView: React.FC<Props> = ({ subpage = 'store-stock', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'store-stock');
  const [stores, setStores] = useState<StoreMaster[]>([]);
  const [stockBalances, setStockBalances] = useState<StockBalance[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [transfers, setTransfers] = useState<InterStoreTransfer[]>([]);
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [tools, setTools] = useState<ToolIssuance[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedStoreId, setSelectedStoreId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [stockAlertFilter, setStockAlertFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'NORMAL'>('ALL');

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showToolModal, setShowToolModal] = useState(false);
  const [showBinCardModal, setShowBinCardModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockBalance | null>(null);

  // Transfer Form
  const [transferForm, setTransferForm] = useState({
    from_store_id: 1,
    to_store_id: 2,
    gatepass_number: 'GP-TRF-2026-108',
    vehicle_number: 'DL-01-M-8899',
    driver_name: 'Harish Chander',
    remarks: 'Urgent stock balancing for Hospital OPD requirement',
    items: [
      {
        item_id: 1,
        requested_quantity: 10,
        transferred_quantity: 10,
        batch_number: 'BATCH-2026-SEP-01',
        remarks: 'Direct transfer from IT Central Store'
      }
    ]
  });

  // Issue Form
  const [issueForm, setIssueForm] = useState({
    requisition_id: 1,
    store_id: 1,
    issued_to_user_id: 102,
    issued_to_department_id: 1,
    issue_type: 'CONSUMPTION',
    gatepass_number: 'GP-ISS-2026-554',
    is_returnable: false,
    remarks: 'Issued against approved requisition IND-2026-001',
    items: [
      {
        item_id: 1,
        issued_quantity: 5,
        unit_price: 32000,
        batch_number: 'BATCH-2026-SEP-01',
        serial_numbers: 'SN-HP-001, SN-HP-002, SN-HP-003, SN-HP-004, SN-HP-005',
        remarks: 'New IT Equipment allocation'
      }
    ]
  });

  // Tool Checkout/In Form
  const [toolForm, setToolForm] = useState({
    item_id: 2,
    store_id: 1,
    serial_number: 'TOOL-FLUKE-8891',
    issued_to_name: 'Rajinder Prasad (Senior Electrician)',
    issued_to_designation: 'PWD Electrical Div II',
    contact_number: '9871122334',
    expected_return_date: '2026-09-28',
    purpose: 'Quarterly substation insulation resistance testing',
    condition_out: 'GOOD - Calibrated till Dec 2026'
  });

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [storeRes, stockRes, movRes, trfRes, issRes, toolRes] = await Promise.all([
        api.getStores(),
        api.getStockBalances(),
        api.getStockMovements(),
        api.getTransfers(),
        api.getIssues(),
        api.getToolIssuances()
      ]);
      setStores(storeRes.data || []);
      setStockBalances(stockRes.data || []);
      setMovements(movRes.data || []);
      setTransfers(trfRes.data || []);
      setIssues(issRes.data || []);
      setTools(toolRes.data || []);
    } catch (err) {
      console.error('Error fetching inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransfer(transferForm);
      alert('Inter-Store Transfer initiated successfully!');
      setShowTransferModal(false);
      fetchData();
    } catch (err: any) {
      alert('Transfer creation failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createIssue(issueForm);
      alert('Material Issue Voucher created and inventory decremented!');
      setShowIssueModal(false);
      fetchData();
    } catch (err: any) {
      alert('Issue failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToolCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createToolIssuance(toolForm);
      alert('Returnable Tool successfully checked out!');
      setShowToolModal(false);
      fetchData();
    } catch (err: any) {
      alert('Tool checkout failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToolReturn = async (toolId: number) => {
    const condition = prompt('Enter tool condition upon return:', 'GOOD - Verified fully operational');
    if (!condition) return;
    try {
      await api.returnTool(toolId, condition);
      alert('Tool successfully returned & checked back into store inventory!');
      fetchData();
    } catch (err: any) {
      alert('Tool return failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  // Filtered Stock Balances
  const filteredStock = stockBalances.filter((s) => {
    const matchesStore = selectedStoreId === 'ALL' || String(s.store_id) === selectedStoreId;
    const matchesSearch = String(s.item_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.storage_bin || '').toLowerCase().includes(searchTerm.toLowerCase());
    let matchesAlert = true;
    if (stockAlertFilter === 'LOW') matchesAlert = s.quantity_on_hand > 0 && s.quantity_on_hand < 15;
    if (stockAlertFilter === 'OUT') matchesAlert = s.quantity_on_hand <= 0;
    if (stockAlertFilter === 'NORMAL') matchesAlert = s.quantity_on_hand >= 15;

    return matchesStore && matchesSearch && matchesAlert;
  });

  const totalInventoryValue = stockBalances.reduce((acc, s) => acc + (s.total_value || s.quantity_on_hand * (s.average_unit_cost || 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Live Inventory Ledger
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-STOCK-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Store Inventory, Issues & Bin Cards</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Real-time multi-store stock tracking, automated Bin Cards, inter-store transfers, material issues & daily returnable tools.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowToolModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-xs font-semibold shadow-sm transition-colors"
            >
              <Wrench className="w-4 h-4" />
              Check-Out Tool
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Transfer Stock
            </button>
            <button
              onClick={() => setShowIssueModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
              Issue Material (SIV)
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('store-stock')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'store-stock'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Store Balances & Bins ({stockBalances.length})
          </button>
          <button
            onClick={() => setActiveTab('stock-movements')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'stock-movements'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Stock Movements Ledger ({movements.length})
          </button>
          <button
            onClick={() => setActiveTab('transfers')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'transfers'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            Inter-Store Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('issues')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'issues'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Send className="w-4 h-4" />
            Material Issue Vouchers ({issues.length})
          </button>
          <button
            onClick={() => setActiveTab('tool-issuance')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'tool-issuance'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Wrench className="w-4 h-4" />
            Returnable Tools Register ({tools.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Warehouse className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Inventory Value</p>
            <p className="text-xl font-bold text-slate-900">₹{(totalInventoryValue / 100000).toFixed(2)} Lakh</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{stores.length} Government Store Depots</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Low Stock Alerts</p>
            <p className="text-xl font-bold text-amber-700">
              {stockBalances.filter(s => s.quantity_on_hand > 0 && s.quantity_on_hand < 15).length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Below reorder threshold</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Monthly Stock Issues</p>
            <p className="text-xl font-bold text-emerald-700">{issues.length}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Dispatched to departments</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tools Checked Out</p>
            <p className="text-xl font-bold text-indigo-700">
              {tools.filter(t => t.status === 'ISSUED').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Active returnable items</p>
          </div>
        </div>
      </div>

      {/* TAB 1: Store Balances & Bin Cards */}
      {activeTab === 'store-stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Item ID, Bin..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Store Locations</option>
                {stores.map(st => (
                  <option key={st.id} value={String(st.id)}>{st.store_name} ({st.store_code})</option>
                ))}
              </select>

              <select
                value={stockAlertFilter}
                onChange={(e) => setStockAlertFilter(e.target.value as any)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="LOW">Low Stock (&lt; 15 units)</option>
                <option value="OUT">Stockout (0 units)</option>
                <option value="NORMAL">Adequate Stock</option>
              </select>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{filteredStock.length}</span> balance records
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Store Location</th>
                  <th className="px-4 py-3">Item Reference</th>
                  <th className="px-4 py-3">Storage Bin</th>
                  <th className="px-4 py-3 text-right">On Hand Qty</th>
                  <th className="px-4 py-3 text-right">Reserved Qty</th>
                  <th className="px-4 py-3 text-right">Available Qty</th>
                  <th className="px-4 py-3 text-right">Avg Unit Cost</th>
                  <th className="px-4 py-3 text-right">Total Valuation</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Bin Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-slate-400">No stock balances found matching criteria</td>
                  </tr>
                ) : (
                  filteredStock.map((s) => {
                    const isLow = s.quantity_on_hand > 0 && s.quantity_on_hand < 15;
                    const isOut = s.quantity_on_hand <= 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800">
                          Store #{s.store_id}
                          <div className="text-xs text-slate-400 font-normal">
                            {stores.find(st => st.id === s.store_id)?.store_name || 'Central Store'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">Item Master #{s.item_id}</div>
                          <div className="text-xs text-slate-500">Dual UOM Tracking Enabled</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-700 font-bold">
                          {s.storage_bin || 'BIN-GEN-01'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {s.quantity_on_hand.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 font-medium">
                          {(s.quantity_reserved || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {(s.quantity_available || s.quantity_on_hand).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          ₹{(s.average_unit_cost || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ₹{(s.total_value || s.quantity_on_hand * (s.average_unit_cost || 0)).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOut ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                              STOCKOUT
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              NORMAL
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedStock(s);
                              setShowBinCardModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Open Electronic Bin Card"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Stock Movement Ledger */}
      {activeTab === 'stock-movements' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Immutable Electronic Bin Card Ledger</h3>
              <p className="text-xs text-slate-500">Complete audit trail of all store receipts, issues, transfers and adjustments</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3">Doc Reference</th>
                  <th className="px-4 py-3">Item & Store</th>
                  <th className="px-4 py-3 text-right">Inward (+)</th>
                  <th className="px-4 py-3 text-right">Outward (-)</th>
                  <th className="px-4 py-3 text-right">Balance Qty</th>
                  <th className="px-4 py-3">Batch / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">No movement records logged</td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isInward = m.movement_type.includes('IN') || m.movement_type.includes('RECEIPT') || m.movement_type === 'ADJUSTMENT_UP';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {m.movement_date ? new Date(m.movement_date).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold ${
                            isInward ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isInward ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {m.movement_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">
                          {m.reference_document_no || `DOC-${m.id}`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">Item #{m.item_id}</div>
                          <div className="text-xs text-slate-400">Store #{m.store_id}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700">
                          {isInward ? `+${m.quantity}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-700">
                          {!isInward ? `-${m.quantity}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          {(m.balance_after_quantity || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {m.remarks || m.batch_number || 'Ledger transaction posted'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Inter-Store Transfers */}
      {activeTab === 'transfers' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Inter-Store Stock Transfers</h3>
              <p className="text-xs text-slate-500">Transfers between Main Depots and Sub-Godowns</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Transfer No</th>
                  <th className="px-4 py-3">Source Store</th>
                  <th className="px-4 py-3">Destination Store</th>
                  <th className="px-4 py-3">Gatepass / Vehicle</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No inter-store transfers recorded</td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-bold text-indigo-700">{t.transfer_number}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">Store #{t.from_store_id}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">Store #{t.to_store_id}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {t.gatepass_number || 'GP-TRF-001'} ({t.vehicle_number || 'DL-01-M-8899'})
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {t.transfer_date ? new Date(t.transfer_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                          {t.status || 'COMPLETED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Material Issue Vouchers */}
      {activeTab === 'issues' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Store Issue Vouchers (SIV)</h3>
              <p className="text-xs text-slate-500">Material disbursed to Indenting Officers & End-User Departments</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Issue Voucher #</th>
                  <th className="px-4 py-3">Indent Ref</th>
                  <th className="px-4 py-3">Issued Store</th>
                  <th className="px-4 py-3">Recipient Department</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Gatepass No</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No issue vouchers recorded</td>
                  </tr>
                ) : (
                  issues.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-bold text-emerald-700">{i.issue_number}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 font-semibold">
                        IND #{i.requisition_id}
                      </td>
                      <td className="px-4 py-3 text-slate-800">Store #{i.store_id}</td>
                      <td className="px-4 py-3 text-slate-800 font-medium">Department #{i.issued_to_department_id || 1}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {i.issue_date ? new Date(i.issue_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">{i.gatepass_number || 'GP-ISS-101'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {i.status || 'ISSUED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Returnable Tools Register */}
      {activeTab === 'tool-issuance' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Daily Returnable Tool & Equipment Custody Log</h3>
              <p className="text-xs text-slate-500">Track check-out, field usage, calibration health & check-in condition</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Tool Reference</th>
                  <th className="px-4 py-3">Serial / Barcode</th>
                  <th className="px-4 py-3">Issued To (Custody)</th>
                  <th className="px-4 py-3">Issue Date</th>
                  <th className="px-4 py-3">Expected Return</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tools.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No active tool issuances</td>
                  </tr>
                ) : (
                  tools.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        Item Master #{t.item_id}
                        <div className="text-xs text-slate-500">{t.purpose || 'Field Maintenance Work'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 font-bold">
                        {t.serial_number || `SER-TOOL-${t.id}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{t.issued_to_name}</div>
                        <div className="text-xs text-slate-500">{t.issued_to_designation} &bull; {t.contact_number}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {t.issued_at ? new Date(t.issued_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {t.expected_return_date ? new Date(t.expected_return_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'RETURNED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'OVERDUE'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {t.status === 'ISSUED' && (
                          <button
                            onClick={() => handleToolReturn(t.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1 mx-auto"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Check-In
                          </button>
                        )}
                        {t.status === 'RETURNED' && (
                          <span className="text-xs text-slate-400 font-medium">Returned</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Inter-Store Transfer */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Create Inter-Store Transfer Voucher</h3>
                <p className="text-xs text-slate-500">Dispatch stock between departmental store depots</p>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateTransfer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Source Store</label>
                  <select
                    value={transferForm.from_store_id}
                    onChange={(e) => setTransferForm({ ...transferForm, from_store_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    {stores.map(st => <option key={st.id} value={st.id}>{st.store_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination Store</label>
                  <select
                    value={transferForm.to_store_id}
                    onChange={(e) => setTransferForm({ ...transferForm, to_store_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    {stores.map(st => <option key={st.id} value={st.id}>{st.store_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Security Gatepass No</label>
                  <input
                    type="text"
                    value={transferForm.gatepass_number}
                    onChange={(e) => setTransferForm({ ...transferForm, gatepass_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Registration No</label>
                  <input
                    type="text"
                    value={transferForm.vehicle_number}
                    onChange={(e) => setTransferForm({ ...transferForm, vehicle_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm uppercase"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Transfer Purpose & Remarks</label>
                <textarea
                  rows={2}
                  value={transferForm.remarks}
                  onChange={(e) => setTransferForm({ ...transferForm, remarks: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
                >
                  Confirm & Dispatch Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue Material Voucher */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Generate Store Issue Voucher (SIV)</h3>
                <p className="text-xs text-slate-500">Disburse items to indenting department</p>
              </div>
              <button onClick={() => setShowIssueModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateIssue} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Indent / Requisition</label>
                  <select
                    value={issueForm.requisition_id}
                    onChange={(e) => setIssueForm({ ...issueForm, requisition_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>IND-2026-001 (Health & Family Welfare)</option>
                    <option value={2}>IND-2026-002 (PWD Civil Works)</option>
                    <option value={3}>IND-2026-003 (Directorate of IT)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursing Store</label>
                  <select
                    value={issueForm.store_id}
                    onChange={(e) => setIssueForm({ ...issueForm, store_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    {stores.map(st => <option key={st.id} value={st.id}>{st.store_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity to Issue</label>
                  <input
                    type="number"
                    value={issueForm.items[0].issued_quantity}
                    onChange={(e) => {
                      const items = [...issueForm.items];
                      items[0].issued_quantity = Number(e.target.value);
                      setIssueForm({ ...issueForm, items });
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Security Gatepass No</label>
                  <input
                    type="text"
                    value={issueForm.gatepass_number}
                    onChange={(e) => setIssueForm({ ...issueForm, gatepass_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                >
                  Issue & Update Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Returnable Tool Checkout */}
      {showToolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Check-Out Returnable Tool / Equipment</h3>
                <p className="text-xs text-slate-500">Record daily issuance to field technician / engineer</p>
              </div>
              <button onClick={() => setShowToolModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleToolCheckout} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tool Item</label>
                  <select
                    value={toolForm.item_id}
                    onChange={(e) => setToolForm({ ...toolForm, item_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={2}>Fluke Industrial Digital Multimeter Kit</option>
                    <option value={1}>Dell Latitude Maintenance Laptop</option>
                    <option value={3}>Bosch Professional Rotary Hammer Drill</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Serial / Asset Barcode</label>
                  <input
                    type="text"
                    value={toolForm.serial_number}
                    onChange={(e) => setToolForm({ ...toolForm, serial_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Technician / Employee Name</label>
                  <input
                    type="text"
                    required
                    value={toolForm.issued_to_name}
                    onChange={(e) => setToolForm({ ...toolForm, issued_to_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expected Return Date</label>
                  <input
                    type="date"
                    required
                    value={toolForm.expected_return_date}
                    onChange={(e) => setToolForm({ ...toolForm, expected_return_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose of Issue</label>
                <input
                  type="text"
                  value={toolForm.purpose}
                  onChange={(e) => setToolForm({ ...toolForm, purpose: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowToolModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900"
                >
                  Confirm Tool Check-Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Bin Card Details */}
      {showBinCardModal && selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Electronic Bin Card &bull; Bin {selectedStock.storage_bin}</h3>
                <p className="text-xs text-slate-500">Store #{selectedStock.store_id} &bull; Item Master #{selectedStock.item_id}</p>
              </div>
              <button onClick={() => setShowBinCardModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">On Hand Physical</div>
                  <div className="text-xl font-bold text-slate-800">{selectedStock.quantity_on_hand}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Reserved for Indents</div>
                  <div className="text-xl font-bold text-amber-700">{selectedStock.quantity_reserved || 0}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-xs text-slate-500">Available to Issue</div>
                  <div className="text-xl font-bold text-emerald-700">{selectedStock.quantity_available || selectedStock.quantity_on_hand}</div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <strong>Valuation & Costing:</strong> Average unit price ₹{(selectedStock.average_unit_cost || 0).toLocaleString()} &bull; Total Bin value ₹{(selectedStock.total_value || (selectedStock.quantity_on_hand * (selectedStock.average_unit_cost || 0))).toLocaleString()}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowBinCardModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                Close Bin Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default InventoryView;
