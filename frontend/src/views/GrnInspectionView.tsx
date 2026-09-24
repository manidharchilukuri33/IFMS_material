import React, { useState, useEffect } from 'react';
import { 
  Truck, CheckCircle, XCircle, AlertTriangle, FileText, Plus, Eye, 
  RotateCcw, ShieldCheck, ArrowRight, RefreshCw, Download, Search, 
  Layers, Package, CheckSquare, Calendar, Building, ClipboardCheck
} from 'lucide-react';
import { api } from '../api/client';
import { GrnHeader, GrnInspection, GrnRtv } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const GrnInspectionView: React.FC<Props> = ({ subpage = 'grn-list', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'grn-list');
  const [grns, setGrns] = useState<GrnHeader[]>([]);
  const [inspections, setInspections] = useState<GrnInspection[]>([]);
  const [rtvs, setRtvs] = useState<GrnRtv[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal States
  const [selectedGrn, setSelectedGrn] = useState<GrnHeader | null>(null);
  const [showCreateGrnModal, setShowCreateGrnModal] = useState(false);
  const [showQaModal, setShowQaModal] = useState(false);
  const [showRtvModal, setShowRtvModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Form State - Create GRN
  const [grnForm, setGrnForm] = useState({
    work_order_id: 1,
    store_id: 1,
    vendor_challan_no: 'CHAL-2026-9901',
    vendor_challan_date: '2026-09-24',
    transporter_name: 'Delhi State Cargo Transport Ltd',
    vehicle_number: 'DL-01-EA-4521',
    driver_name: 'Rajesh Kumar',
    driver_phone: '9811223344',
    lr_number: 'LR-DEL-8871',
    e_way_bill_number: 'EWB-2026-88992211',
    received_by_officer: 'Sunil Verma, Store Officer',
    remarks: 'Goods received in sealed vehicle, visual packaging intact.',
    items: [
      {
        work_order_item_id: 1,
        item_id: 1,
        challan_quantity: 100,
        received_quantity: 98,
        shortage_quantity: 2,
        damaged_quantity: 0,
        accepted_quantity: 98,
        rejected_quantity: 0,
        unit_price: 32000,
        batch_number: 'BATCH-2026-SEP-01',
        expiry_date: '',
        storage_location_bin: 'BIN-IT-01A',
        condition_remarks: '2 units short in package count'
      }
    ]
  });

  // Form State - QA Inspection
  const [qaForm, setQaForm] = useState({
    grn_id: 0,
    inspector_name: 'Dr. V. K. Sharma (Chief Tech Inspector)',
    inspector_designation: 'Directorate of Inspection & Quality',
    inspection_type: 'PHYSICAL_AND_LAB',
    sample_size: 10,
    accepted_quantity: 98,
    rejected_quantity: 0,
    test_report_number: 'NABL-TR-2026-8871',
    inspection_status: 'ACCEPTED',
    defect_classification: 'NONE',
    inspection_notes: 'All items conform to BIS / GeM specifications. NABL lab certificate verified.',
    checklist: [
      { parameter: 'Visual Packaging & Seals', standard: 'Tamper-proof seal intact', observed: 'Intact & sealed', result: 'PASS' },
      { parameter: 'Make & Model Verification', standard: 'HP ProDesk 400 G7 MT', observed: 'Matches PO specification', result: 'PASS' },
      { parameter: 'Power & Boot Test', standard: 'Boots to BIOS without error', observed: '100% sample boot verified', result: 'PASS' },
      { parameter: 'Warranty card & Documentation', standard: '3 Years OEM OEM onsite stamp', observed: 'Included with each box', result: 'PASS' }
    ]
  });

  // Form State - RTV
  const [rtvForm, setRtvForm] = useState({
    grn_id: 0,
    vendor_id: 1,
    rtv_number: 'RTV-GNCTD-2026-003',
    reason: 'Defective packaging and internal damage during transit',
    gatepass_number: 'GP-RTV-2026-441',
    dispatch_date: '2026-09-25',
    transporter_name: 'SafeMove Logistics',
    vehicle_no: 'DL-04-B-9988',
    expected_replacement_date: '2026-10-05',
    action_type: 'REPLACEMENT'
  });

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [grnRes, inspRes, rtvRes] = await Promise.all([
        api.getGrns(),
        api.getInspections(),
        api.getRtvs()
      ]);
      setGrns(grnRes.data || []);
      setInspections(inspRes.data || []);
      setRtvs(rtvRes.data || []);
    } catch (err) {
      console.error('Error fetching GRN data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGrn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createGrn(grnForm);
      alert('GRN Created successfully with system-generated receipt number!');
      setShowCreateGrnModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed to create GRN: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handlePerformQa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGrn) return;
    try {
      await api.submitGrnInspection(selectedGrn.id, qaForm);
      alert('Quality Inspection Report submitted and GRN status updated!');
      setShowQaModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed to submit inspection: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handlePostToStock = async (grnId: number) => {
    if (!confirm('Are you sure you want to post this GRN to Bin Card Ledger? This will immediately increment store on-hand balances.')) return;
    try {
      await api.postGrnToStock(grnId);
      alert('GRN successfully posted to Inventory Ledger & Bin Cards updated!');
      fetchData();
    } catch (err: any) {
      alert('Failed to post to stock: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredGrns = grns.filter(g => {
    const matchesSearch = (g.grn_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (g.vendor_challan_no || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Supply Inward & QA
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-GRN-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Goods Receipt & Quality Inspection (GRN)</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage material inward receipt, weighment, visual checks, NABL QA inspection, Bin Card posting & Return to Vendor (RTV).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData} 
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateGrnModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Receive New Consignment (GRN)
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('grn-list')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'grn-list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Truck className="w-4 h-4" />
            GRN Inward Register ({grns.length})
          </button>
          <button
            onClick={() => setActiveTab('inspections')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'inspections'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Quality Inspection Reports ({inspections.length})
          </button>
          <button
            onClick={() => setActiveTab('rtv-list')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'rtv-list'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Return to Vendor (RTV / Rejected) ({rtvs.length})
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total GRNs Raised</p>
            <p className="text-xl font-bold text-slate-800">{grns.length}</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">₹{(grns.reduce((acc, g) => acc + (g.total_received_value || 0), 0) / 100000).toFixed(2)} Lakh Value</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending QA Inspection</p>
            <p className="text-xl font-bold text-amber-700">
              {grns.filter(g => g.status === 'INSPECTION_PENDING' || g.status === 'RECEIVED').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Action required by QA team</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Stock Posted to Ledger</p>
            <p className="text-xl font-bold text-emerald-700">
              {grns.filter(g => g.status === 'POSTED_TO_STOCK' || g.status === 'ACCEPTED').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Bin Cards & Ledgers updated</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">RTV Gatepasses Issued</p>
            <p className="text-xl font-bold text-rose-700">{rtvs.length}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Rejected consignments outwarded</p>
          </div>
        </div>
      </div>

      {/* TAB 1: GRN Register */}
      {activeTab === 'grn-list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search GRN No, Challan No, Vehicle..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="RECEIVED">RECEIVED</option>
                <option value="INSPECTION_PENDING">INSPECTION PENDING</option>
                <option value="ACCEPTED">ACCEPTED (QA PASSED)</option>
                <option value="REJECTED">REJECTED</option>
                <option value="POSTED_TO_STOCK">POSTED TO STOCK</option>
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{filteredGrns.length}</span> records
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">GRN Number</th>
                  <th className="px-4 py-3">Receipt Date</th>
                  <th className="px-4 py-3">Challan / E-Way Bill</th>
                  <th className="px-4 py-3">Vehicle / Transporter</th>
                  <th className="px-4 py-3 text-right">Received Val</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">Loading GRN register...</td>
                  </tr>
                ) : filteredGrns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No GRN records found</td>
                  </tr>
                ) : (
                  filteredGrns.map((g) => (
                    <tr key={g.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{g.grn_number}</div>
                        <div className="text-xs text-slate-500">PO ID #{g.work_order_id} &bull; Store #{g.store_id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{g.received_date ? new Date(g.received_date).toLocaleDateString() : '-'}</div>
                        <div className="text-xs text-slate-400">By: {g.received_by_officer || 'Store Officer'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-800 font-semibold">{g.vendor_challan_no}</div>
                        <div className="text-xs text-slate-500 font-mono">EWB: {g.e_way_bill_number || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{g.vehicle_number || 'N/A'}</div>
                        <div className="text-xs text-slate-500">{g.transporter_name || 'Direct Delivery'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        ₹{(g.total_received_value || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          g.status === 'POSTED_TO_STOCK'
                            ? 'bg-emerald-100 text-emerald-800'
                            : g.status === 'ACCEPTED'
                            ? 'bg-teal-100 text-teal-800'
                            : g.status === 'INSPECTION_PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : g.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {g.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setSelectedGrn(g); setShowDetailsModal(true); }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="View GRN Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {(g.status === 'RECEIVED' || g.status === 'INSPECTION_PENDING') && (
                            <button
                              onClick={() => {
                                setSelectedGrn(g);
                                setQaForm(prev => ({ ...prev, grn_id: g.id }));
                                setShowQaModal(true);
                              }}
                              className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors flex items-center gap-1"
                              title="Conduct Quality Inspection"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          )}

                          {g.status === 'ACCEPTED' && (
                            <button
                              onClick={() => handlePostToStock(g.id)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1"
                              title="Post Accepted Qty to Stock Ledger"
                            >
                              <Layers className="w-3.5 h-3.5" />
                              Post Stock
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Quality Inspection Reports */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">NABL & Departmental QA Inspection Certificates</h3>
            <span className="text-xs text-slate-500">Conforming to GFR 2017 Rule 159</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Inspection No</th>
                  <th className="px-4 py-3">GRN Reference</th>
                  <th className="px-4 py-3">Inspector & Agency</th>
                  <th className="px-4 py-3">Sample Qty</th>
                  <th className="px-4 py-3">Accepted / Rejected</th>
                  <th className="px-4 py-3">Lab Report #</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {inspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No inspection records logged</td>
                  </tr>
                ) : (
                  inspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {insp.inspection_number || `INSP-2026-${insp.id}`}
                        <div className="text-xs text-slate-400 font-normal">
                          {insp.inspection_date ? new Date(insp.inspection_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold">
                        GRN #{insp.grn_id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800 font-medium">{insp.inspector_name}</div>
                        <div className="text-xs text-slate-500">{insp.inspector_designation}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {insp.sample_size || '100%'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-emerald-700 font-bold">{insp.accepted_quantity || 0}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-rose-700 font-bold">{insp.rejected_quantity || 0}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {insp.test_report_number || 'Onsite Inspection'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          insp.inspection_status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {insp.inspection_status}
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

      {/* TAB 3: RTV Gatepasses */}
      {activeTab === 'rtv-list' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Return to Vendor (RTV) & Rejection Outward Dispatch</h3>
              <p className="text-xs text-slate-500">Security Gatepass tracking for rejected or damaged supplies</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">RTV Number</th>
                  <th className="px-4 py-3">GRN Ref</th>
                  <th className="px-4 py-3">Reason for Rejection</th>
                  <th className="px-4 py-3">Security Gatepass</th>
                  <th className="px-4 py-3">Dispatch Date</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {rtvs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No RTV consignments on record</td>
                  </tr>
                ) : (
                  rtvs.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-rose-700">
                        {r.rtv_number}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 font-semibold">
                        GRN #{r.grn_id}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {r.reason}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {r.gatepass_number || 'GP-RTV-991'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {r.dispatch_date ? new Date(r.dispatch_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {r.action_type || 'REPLACEMENT'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                          {r.status || 'DISPATCHED'}
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

      {/* MODAL: Create Inward GRN */}
      {showCreateGrnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Record Consignment Receipt (GRN Inward)</h3>
                <p className="text-xs text-slate-500">Capture supplier challan, transport vehicle, weighment & received quantities</p>
              </div>
              <button onClick={() => setShowCreateGrnModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateGrn} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Purchase / Work Order</label>
                  <select
                    value={grnForm.work_order_id}
                    onChange={(e) => setGrnForm({ ...grnForm, work_order_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>PO-GNCTD-2026-001 (Wipro IT Systems - ₹18.50 Lakh)</option>
                    <option value={2}>PO-GNCTD-2026-002 (Kaveri Medical Corp - ₹6.80 Lakh)</option>
                    <option value={3}>PO-GNCTD-2026-003 (Apex Electricals - ₹3.40 Lakh)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Store Location</label>
                  <select
                    value={grnForm.store_id}
                    onChange={(e) => setGrnForm({ ...grnForm, store_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>Central IT & Telecom Depot, IP Estate (Main Store)</option>
                    <option value={2}>LNJP Hospital Central Drug Store</option>
                    <option value={3}>PWD Civil Division Maintenance Godown</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Challan Number *</label>
                  <input
                    type="text"
                    required
                    value={grnForm.vendor_challan_no}
                    onChange={(e) => setGrnForm({ ...grnForm, vendor_challan_no: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Challan Date *</label>
                  <input
                    type="date"
                    required
                    value={grnForm.vendor_challan_date}
                    onChange={(e) => setGrnForm({ ...grnForm, vendor_challan_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vehicle Registration Number</label>
                  <input
                    type="text"
                    value={grnForm.vehicle_number}
                    onChange={(e) => setGrnForm({ ...grnForm, vehicle_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-Way Bill Number</label>
                  <input
                    type="text"
                    value={grnForm.e_way_bill_number}
                    onChange={(e) => setGrnForm({ ...grnForm, e_way_bill_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Transporter / Courier Name</label>
                  <input
                    type="text"
                    value={grnForm.transporter_name}
                    onChange={(e) => setGrnForm({ ...grnForm, transporter_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receiving Officer</label>
                  <input
                    type="text"
                    value={grnForm.received_by_officer}
                    onChange={(e) => setGrnForm({ ...grnForm, received_by_officer: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>

              {/* Line Items Receipt */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Received Item Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Challan Qty</label>
                    <input
                      type="number"
                      value={grnForm.items[0].challan_quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const items = [...grnForm.items];
                        items[0].challan_quantity = val;
                        items[0].received_quantity = val;
                        items[0].accepted_quantity = val;
                        setGrnForm({ ...grnForm, items });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Physical Received Qty</label>
                    <input
                      type="number"
                      value={grnForm.items[0].received_quantity}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const items = [...grnForm.items];
                        items[0].received_quantity = val;
                        items[0].shortage_quantity = items[0].challan_quantity - val;
                        setGrnForm({ ...grnForm, items });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Batch / Lot Number</label>
                    <input
                      type="text"
                      value={grnForm.items[0].batch_number}
                      onChange={(e) => {
                        const items = [...grnForm.items];
                        items[0].batch_number = e.target.value;
                        setGrnForm({ ...grnForm, items });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Put-Away Bin Location</label>
                    <input
                      type="text"
                      value={grnForm.items[0].storage_location_bin}
                      onChange={(e) => {
                        const items = [...grnForm.items];
                        items[0].storage_location_bin = e.target.value;
                        setGrnForm({ ...grnForm, items });
                      }}
                      className="w-full border border-slate-300 rounded p-1.5 text-sm bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks & Inward Inspection Observations</label>
                <textarea
                  rows={2}
                  value={grnForm.remarks}
                  onChange={(e) => setGrnForm({ ...grnForm, remarks: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateGrnModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm"
                >
                  Generate GRN & Move to Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QA Inspection */}
      {showQaModal && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-amber-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Conduct Quality & Technical Inspection</h3>
                <p className="text-xs text-slate-600">GRN Reference: {selectedGrn.grn_number} &bull; Challan: {selectedGrn.vendor_challan_no}</p>
              </div>
              <button onClick={() => setShowQaModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePerformQa} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Inspector Name *</label>
                  <input
                    type="text"
                    required
                    value={qaForm.inspector_name}
                    onChange={(e) => setQaForm({ ...qaForm, inspector_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Inspector Designation *</label>
                  <input
                    type="text"
                    required
                    value={qaForm.inspector_designation}
                    onChange={(e) => setQaForm({ ...qaForm, inspector_designation: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Inspection Decision *</label>
                  <select
                    value={qaForm.inspection_status}
                    onChange={(e) => setQaForm({ ...qaForm, inspection_status: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white font-semibold"
                  >
                    <option value="ACCEPTED">ACCEPTED (Pass Specifications)</option>
                    <option value="REJECTED">REJECTED (Non-conforming)</option>
                    <option value="CONDITIONAL_ACCEPTANCE">CONDITIONAL ACCEPTANCE (Minor Deviation)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">NABL / Lab Test Report #</label>
                  <input
                    type="text"
                    value={qaForm.test_report_number}
                    onChange={(e) => setQaForm({ ...qaForm, test_report_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>

              {/* Checklist Parameters */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Verification Checklist</h4>
                {qaForm.checklist.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                    <div>
                      <span className="font-semibold text-slate-800">{c.parameter}</span>
                      <span className="text-slate-400 mx-2">&bull;</span>
                      <span className="text-slate-600">{c.standard}</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-2xs">
                      {c.result}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Inspection Notes & Certificate Certification</label>
                <textarea
                  rows={2}
                  value={qaForm.inspection_notes}
                  onChange={(e) => setQaForm({ ...qaForm, inspection_notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowQaModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 shadow-sm"
                >
                  Sign & Submit QA Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GRN Details */}
      {showDetailsModal && selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">GRN Details #{selectedGrn.grn_number}</h3>
                <p className="text-xs text-slate-500">Receipt Voucher and Verification Log</p>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 text-xs block">Work Order Reference:</span>
                  <span className="font-semibold text-slate-800">PO ID #{selectedGrn.work_order_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Challan Number:</span>
                  <span className="font-semibold text-slate-800 font-mono">{selectedGrn.vendor_challan_no}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Vehicle & Transport:</span>
                  <span className="font-semibold text-slate-800">{selectedGrn.vehicle_number || 'N/A'} ({selectedGrn.transporter_name || 'Direct'})</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Total Inward Value:</span>
                  <span className="font-bold text-emerald-700">₹{(selectedGrn.total_received_value || 0).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Received By:</span>
                  <span className="text-slate-800">{selectedGrn.received_by_officer || 'Store Officer'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Current Status:</span>
                  <span className="font-bold text-slate-800">{selectedGrn.status}</span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
                <strong>Remarks:</strong> {selectedGrn.remarks || 'Consignment verified against purchase order line items and specifications.'}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default GrnInspectionView;
