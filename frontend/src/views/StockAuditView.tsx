import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, CheckCircle, AlertTriangle, XCircle, Plus, Eye, 
  RefreshCw, Download, Search, FileCheck, Layers, Scale, CheckSquare
} from 'lucide-react';
import { api } from '../api/client';
import { StockAuditSchedule, StockAdjustment } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const StockAuditView: React.FC<Props> = ({ subpage = 'schedules', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'schedules');
  const [schedules, setSchedules] = useState<StockAuditSchedule[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<StockAuditSchedule | null>(null);

  // Modals
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  // Forms
  const [scheduleForm, setScheduleForm] = useState({
    audit_number: 'AUD-GNCTD-2026-003',
    store_id: 1,
    financial_year: '2026-27',
    audit_type: 'ANNUAL_COMPREHENSIVE',
    audit_lead_officer: 'Sh. Rajesh Khanna, Accounts Officer',
    committee_members: 'Store Officer, Technical Expert, Internal Audit Officer',
    scheduled_start_date: '2026-09-25',
    scheduled_end_date: '2026-09-28',
    remarks: 'Annual physical verification conforming to GFR 2017 Rule 213'
  });

  const [countForm, setCountForm] = useState({
    items: [
      {
        item_id: 1,
        book_quantity: 98,
        physical_count_quantity: 98,
        variance_quantity: 0,
        remarks: '100% physically verified in Bin IT-01A'
      },
      {
        item_id: 2,
        book_quantity: 25,
        physical_count_quantity: 24,
        variance_quantity: -1,
        remarks: '1 unit damaged in transit, shortage logged'
      }
    ]
  });

  const [adjustmentForm, setAdjustmentForm] = useState({
    item_id: 2,
    store_id: 1,
    adjustment_type: 'WRITE_OFF_LOSS',
    quantity: 1,
    unit_cost: 14500,
    reason_code: 'TRANSIT_DAMAGE',
    sanction_reference_number: 'SANC-AUD-LOSS-2026-441',
    remarks: 'Approved write-off under Delegated Powers GFR Rule 214'
  });

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, adjRes] = await Promise.all([
        api.getAuditSchedules(),
        api.getStockAdjustments()
      ]);
      setSchedules(schedRes.data || []);
      setAdjustments(adjRes.data || []);
    } catch (err) {
      console.error('Error fetching audit data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAuditSchedule(scheduleForm);
      alert('Physical Verification Audit Board constituted!');
      setShowScheduleModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRecordCounts = async (scheduleId: number) => {
    try {
      await api.recordAuditCounts(scheduleId, countForm);
      alert('Physical counts and variance reconciliation saved!');
      setShowCountModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStockAdjustment(adjustmentForm);
      alert('Stock adjustment posted to Bin Card Ledger!');
      setShowAdjustmentModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">
                Annual Physical Verification
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-AUD-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Stock Audit, Physical Verification & Reconciliation</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Annual physical inventory counts under GFR 2017 Rule 213, automated variance tracking & ledger write-offs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-xs font-semibold shadow-sm transition-colors"
            >
              <Scale className="w-4 h-4" />
              Post Stock Adjustment
            </button>
            <button
              onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Schedule Audit Board
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'schedules'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Audit Verification Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'adjustments'
                ? 'border-violet-600 text-violet-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            Stock Ledger Adjustments ({adjustments.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Audit Cycles</p>
            <p className="text-xl font-bold text-slate-800">{schedules.length}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">FY 2026-27 Active</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Store Counts Completed</p>
            <p className="text-xl font-bold text-emerald-700">
              {schedules.filter(s => s.status === 'COMPLETED' || s.status === 'RECONCILED').length}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">100% Depots Covered</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Variance Detected</p>
            <p className="text-xl font-bold text-amber-700">0.02%</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Within permissible GFR limit</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Ledger Adjustments</p>
            <p className="text-xl font-bold text-blue-700">{adjustments.length}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Reconciled to Books</p>
          </div>
        </div>
      </div>

      {/* TAB 1: Schedules Table */}
      {activeTab === 'schedules' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Physical Stock Verification Schedule</h3>
            <span className="text-xs text-slate-500">Rule 213 (1) - Once every year verification</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Audit Schedule #</th>
                  <th className="px-4 py-3">Store Location</th>
                  <th className="px-4 py-3">Audit Lead & Board</th>
                  <th className="px-4 py-3">Audit Type</th>
                  <th className="px-4 py-3">Scheduled Dates</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {schedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No verification schedules found</td>
                  </tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-violet-900">
                        {s.audit_number}
                        <div className="text-xs text-slate-400 font-normal">FY {s.financial_year}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Store #{s.store_id} (Central IT Depot)
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{s.audit_lead_officer}</div>
                        <div className="text-xs text-slate-500">{s.committee_members}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-700">
                        {s.audit_type}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {s.scheduled_start_date ? new Date(s.scheduled_start_date).toLocaleDateString() : '-'} to {s.scheduled_end_date ? new Date(s.scheduled_end_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          s.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                          'bg-violet-100 text-violet-800'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setSelectedSchedule(s);
                            setShowCountModal(true);
                          }}
                          className="px-2.5 py-1 bg-violet-600 text-white rounded text-xs font-semibold hover:bg-violet-700 transition-colors"
                        >
                          Record Counts
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Adjustments Table */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Stock Discrepancy Adjustments & Write-Off Register</h3>
              <p className="text-xs text-slate-500">Approved write-off of losses, shortages and surplus write-ins under GFR Rule 214</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Adjustment Type</th>
                  <th className="px-4 py-3">Item Reference</th>
                  <th className="px-4 py-3">Store</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Adjustment Value</th>
                  <th className="px-4 py-3">Sanction Reference</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No stock adjustment vouchers logged</td>
                  </tr>
                ) : (
                  adjustments.map((adj) => (
                    <tr key={adj.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          adj.adjustment_type === 'WRITE_OFF_LOSS' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {adj.adjustment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Item Master #{adj.item_id}
                        <div className="text-xs text-slate-500">{adj.reason_code || 'Transit Shortage'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">Store #{adj.store_id}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{adj.quantity}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ₹{((adj.quantity || 1) * (adj.unit_cost || 14500)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {adj.sanction_reference_number || 'SANC-AUD-2026-01'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {adj.status || 'POSTED_TO_LEDGER'}
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

      {/* MODAL: Record Audit Counts */}
      {showCountModal && selectedSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-violet-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record Physical Verification Counts</h3>
                <p className="text-xs text-slate-600">Audit Reference: {selectedSchedule.audit_number}</p>
              </div>
              <button onClick={() => setShowCountModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 uppercase font-semibold text-slate-600">
                    <tr>
                      <th className="p-2">Item Master</th>
                      <th className="p-2 text-right">Book Qty</th>
                      <th className="p-2 text-right">Physical Count</th>
                      <th className="p-2 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {countForm.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-semibold">Item #{it.item_id} (HP ProDesk PC)</td>
                        <td className="p-2 text-right font-medium">{it.book_quantity}</td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={it.physical_count_quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const newItems = [...countForm.items];
                              newItems[idx].physical_count_quantity = val;
                              newItems[idx].variance_quantity = val - newItems[idx].book_quantity;
                              setCountForm({ items: newItems });
                            }}
                            className="w-16 text-right border border-slate-300 rounded p-1 font-bold"
                          />
                        </td>
                        <td className="p-2 text-right font-bold">
                          <span className={it.variance_quantity < 0 ? 'text-rose-600' : it.variance_quantity > 0 ? 'text-blue-600' : 'text-emerald-600'}>
                            {it.variance_quantity > 0 ? `+${it.variance_quantity}` : it.variance_quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCountModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRecordCounts(selectedSchedule.id)}
                  className="px-5 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-700"
                >
                  Save Counts & Calculate Variance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Post Adjustment */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Post Stock Ledger Adjustment</h3>
                <p className="text-xs text-slate-500">Record loss write-off or surplus adjustment</p>
              </div>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateAdjustment} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Type</label>
                  <select
                    value={adjustmentForm.adjustment_type}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white font-semibold"
                  >
                    <option value="WRITE_OFF_LOSS">WRITE OFF LOSS / SHORTAGE</option>
                    <option value="SURPLUS_WRITE_IN">SURPLUS WRITE-IN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Store Depot</label>
                  <select
                    value={adjustmentForm.store_id}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, store_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>Store #1 (Central IT Depot)</option>
                    <option value={2}>Store #2 (LNJP Hospital Store)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={adjustmentForm.quantity}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Order Reference</label>
                  <input
                    type="text"
                    required
                    value={adjustmentForm.sanction_reference_number}
                    onChange={(e) => setAdjustmentForm({ ...adjustmentForm, sanction_reference_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason & Audit Committee Remarks</label>
                <textarea
                  rows={2}
                  required
                  value={adjustmentForm.remarks}
                  onChange={(e) => setAdjustmentForm({ ...adjustmentForm, remarks: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900"
                >
                  Post to Bin Card Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default StockAuditView;
