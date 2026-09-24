import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, CheckCircle, XCircle, RotateCcw, AlertTriangle,
  Search, Filter, ChevronRight, Layers, Eye, ArrowRight
} from 'lucide-react';
import apiClient from '../api/client';
import { Requisition, Item, Store } from '../types';

interface RequisitionViewProps {
  subTab: string;
  onNavigate: (route: string) => void;
}

export const RequisitionView: React.FC<RequisitionViewProps> = ({ subTab, onNavigate }) => {
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [selectedForConso, setSelectedForConso] = useState<number[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Requisition Form State
  const [newReq, setNewReq] = useState({
    store_id: 1,
    priority: 'Normal',
    purpose: '',
    lines: [
      { item_id: 1, requested_qty: 10, est_unit_rate: 68500 }
    ]
  });

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, itemsRes, storesRes] = await Promise.all([
        apiClient.get('/requisitions/'),
        apiClient.get('/materials/items'),
        apiClient.get('/inventory/stores')
      ]);
      setRequisitions(reqRes.data);
      setItems(itemsRes.data);
      setStores(storesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/requisitions/', newReq);
      setToastMsg('Requisition submitted for approval!');
      setTimeout(() => setToastMsg(null), 3000);
      onNavigate('req/list');
      loadData();
    } catch (e) {
      alert('Failed to submit requisition');
    }
  };

  const handleAction = async (id: number, action: string) => {
    try {
      await apiClient.put(`/requisitions/${id}/status`, { action });
      setToastMsg(`Requisition ${action.toUpperCase()} successfully!`);
      setTimeout(() => setToastMsg(null), 3000);
      loadData();
      setSelectedReq(null);
    } catch (e) {
      alert('Action failed');
    }
  };

  const handleConsolidate = async () => {
    if (selectedForConso.length === 0) return;
    try {
      const res = await apiClient.post('/requisitions/consolidate', { req_ids: selectedForConso });
      setToastMsg(res.data.message);
      setTimeout(() => setToastMsg(null), 4000);
      setSelectedForConso([]);
      loadData();
    } catch (e) {
      alert('Consolidation failed');
    }
  };

  const addLine = () => {
    setNewReq({
      ...newReq,
      lines: [...newReq.lines, { item_id: items[0]?.id || 1, requested_qty: 5, est_unit_rate: items[0]?.estimated_rate || 1000 }]
    });
  };

  const removeLine = (idx: number) => {
    setNewReq({
      ...newReq,
      lines: newReq.lines.filter((_, i) => i !== idx)
    });
  };

  const pendingList = requisitions.filter(r => ['Submitted', 'Under Review', 'Budget Validation Pending'].includes(r.current_stage));

  return (
    <div className="p-5 space-y-4">
      {toastMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2 rounded shadow-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="text-[11px] text-slate-500 font-medium">IFMS &rsaquo; Material Management &rsaquo; <b>Requisition Management</b></div>
          <h1 className="text-xl font-bold text-[#123B64]">Material Indents & Requisitions</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => onNavigate('req/list')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'list' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            My Requisitions ({requisitions.length})
          </button>
          <button
            onClick={() => onNavigate('req/create')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'create' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            + Create Requisition
          </button>
          <button
            onClick={() => onNavigate('req/approvals')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'approvals' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pending Approvals ({pendingList.length})
          </button>
          <button
            onClick={() => onNavigate('req/conso')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'conso' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Requisition Consolidation
          </button>
        </div>
      </div>

      {/* 1. Requisitions List SubTab */}
      {subTab === 'list' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-3 border-b flex justify-between items-center bg-slate-50">
            <span className="font-bold text-slate-700">All Requisition Indents</span>
            <button onClick={() => onNavigate('req/create')} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> Raise New Indent
            </button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#123B64] text-white font-semibold">
                <th className="p-2.5">Indent No</th>
                <th className="p-2.5">Date</th>
                <th className="p-2.5">Store / Location</th>
                <th className="p-2.5">Purpose</th>
                <th className="p-2.5 text-center">Priority</th>
                <th className="p-2.5 text-right">Est. Value (₹)</th>
                <th className="p-2.5 text-center">Current Status</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {requisitions.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-blue-900">{r.req_no}</td>
                  <td className="p-2.5">{r.req_date}</td>
                  <td className="p-2.5 font-medium">{r.store_name}</td>
                  <td className="p-2.5 text-slate-600 max-w-xs truncate">{r.purpose}</td>
                  <td className="p-2.5 text-center">
                    <span className={r.priority === 'Critical' || r.priority === 'Emergency' ? 'badge-danger' : (r.priority === 'Urgent' ? 'badge-pending' : 'badge-info')}>
                      {r.priority}
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-800">₹ {r.total_est_amount.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 text-center">
                    <span className={r.current_stage === 'Approved' || r.current_stage === 'Fully Procured' ? 'badge-approved' : (r.current_stage === 'Rejected' ? 'badge-danger' : 'badge-pending')}>
                      {r.current_stage}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <button onClick={() => setSelectedReq(r)} className="p-1 text-blue-700 hover:bg-blue-50 rounded">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Create Requisition SubTab */}
      {subTab === 'create' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm max-w-3xl mx-auto text-xs">
          <h2 className="font-bold text-sm text-[#123B64] mb-3 pb-2 border-b">Create Material Indent / Requisition</h2>
          <form onSubmit={handleCreateReq} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Target Receiving Store *</label>
                <select
                  value={newReq.store_id}
                  onChange={e => setNewReq({ ...newReq, store_id: Number(e.target.value) })}
                  className="w-full border rounded p-1.5"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Priority Level *</label>
                <select
                  value={newReq.priority}
                  onChange={e => setNewReq({ ...newReq, priority: e.target.value })}
                  className="w-full border rounded p-1.5"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Purpose / Requirement Justification *</label>
              <textarea
                required
                rows={2}
                placeholder="State the objective, project phase, or consumable replenishment rationale..."
                value={newReq.purpose}
                onChange={e => setNewReq({ ...newReq, purpose: e.target.value })}
                className="w-full border rounded p-1.5"
              />
            </div>

            {/* Line Items Adder */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-800">Requisition Line Items</span>
                <button type="button" onClick={addLine} className="btn-secondary">
                  + Add Another Item
                </button>
              </div>

              <div className="space-y-2">
                {newReq.lines.map((ln, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                    <select
                      value={ln.item_id}
                      onChange={e => {
                        const itId = Number(e.target.value);
                        const selIt = items.find(i => i.id === itId);
                        const updated = [...newReq.lines];
                        updated[idx] = { ...updated[idx], item_id: itId, est_unit_rate: selIt?.estimated_rate || 1000 };
                        setNewReq({ ...newReq, lines: updated });
                      }}
                      className="flex-1 border rounded p-1.5 bg-white"
                    >
                      {items.map(it => (
                        <option key={it.id} value={it.id}>{it.item_code} - {it.item_name}</option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={ln.requested_qty}
                      onChange={e => {
                        const updated = [...newReq.lines];
                        updated[idx].requested_qty = Number(e.target.value);
                        setNewReq({ ...newReq, lines: updated });
                      }}
                      className="w-20 border rounded p-1.5 bg-white font-mono"
                    />

                    <input
                      type="number"
                      placeholder="Rate"
                      value={ln.est_unit_rate}
                      onChange={e => {
                        const updated = [...newReq.lines];
                        updated[idx].est_unit_rate = Number(e.target.value);
                        setNewReq({ ...newReq, lines: updated });
                      }}
                      className="w-28 border rounded p-1.5 bg-white font-mono"
                    />

                    {newReq.lines.length > 1 && (
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-600 font-bold p-1">
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => onNavigate('req/list')} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Submit Requisition for Approval</button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Pending Approvals SubTab */}
      {subTab === 'approvals' && (
        <div className="space-y-3">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            <span>You have <b>{pendingList.length} requisitions</b> awaiting administrative / financial approval within your delegation limit.</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#123B64] text-white font-semibold">
                  <th className="p-2.5">Indent No</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Receiving Store</th>
                  <th className="p-2.5">Purpose</th>
                  <th className="p-2.5 text-right">Est. Value (₹)</th>
                  <th className="p-2.5 text-center">Workflow Stage</th>
                  <th className="p-2.5 text-center">Approve / Reject Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingList.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-blue-900">{r.req_no}</td>
                    <td className="p-2.5">{r.req_date}</td>
                    <td className="p-2.5 font-medium">{r.store_name}</td>
                    <td className="p-2.5 text-slate-600 max-w-xs">{r.purpose}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹ {r.total_est_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-center"><span className="badge-pending">{r.current_stage}</span></td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => handleAction(r.id, 'approve')} className="btn-success text-[11px] py-1 px-2">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => handleAction(r.id, 'reject')} className="btn-danger text-[11px] py-1 px-2">
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                        <button onClick={() => handleAction(r.id, 'return')} className="btn-secondary text-[11px] py-1 px-2">
                          <RotateCcw className="w-3 h-3" /> Return
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Requisition Consolidation SubTab */}
      {subTab === 'conso' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Select approved departmental indents to bundle into a unified Tender / Annual Procurement Plan (APP):</span>
            <button
              onClick={handleConsolidate}
              disabled={selectedForConso.length === 0}
              className={`btn-primary ${selectedForConso.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Layers className="w-3.5 h-3.5" /> Consolidate Selected ({selectedForConso.length})
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#123B64] text-white font-semibold">
                  <th className="p-2.5 w-10 text-center">Select</th>
                  <th className="p-2.5">Indent No</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Store Location</th>
                  <th className="p-2.5">Purpose</th>
                  <th className="p-2.5 text-right">Value (₹)</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requisitions.filter(r => r.current_stage === 'Approved').map(r => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedForConso.includes(r.id)}
                        onChange={e => {
                          if (e.target.checked) setSelectedForConso([...selectedForConso, r.id]);
                          else setSelectedForConso(selectedForConso.filter(id => id !== r.id));
                        }}
                      />
                    </td>
                    <td className="p-2.5 font-mono font-bold text-blue-900">{r.req_no}</td>
                    <td className="p-2.5">{r.req_date}</td>
                    <td className="p-2.5">{r.store_name}</td>
                    <td className="p-2.5 text-slate-600 max-w-sm">{r.purpose}</td>
                    <td className="p-2.5 text-right font-mono font-bold">₹ {r.total_est_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-center"><span className="badge-approved">{r.current_stage}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedReq && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full text-xs">
            <div className="bg-[#123B64] text-white p-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" /> Requisition Details: {selectedReq.req_no}
              </h3>
              <button onClick={() => setSelectedReq(null)} className="text-slate-300 hover:text-white font-bold">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500 font-medium">Date:</span> <b>{selectedReq.req_date}</b></div>
                <div><span className="text-slate-500 font-medium">Priority:</span> <b>{selectedReq.priority}</b></div>
                <div><span className="text-slate-500 font-medium">Store:</span> <b>{selectedReq.store_name}</b></div>
                <div><span className="text-slate-500 font-medium">Total Amount:</span> <b className="text-emerald-800 font-mono">₹ {selectedReq.total_est_amount.toLocaleString('en-IN')}</b></div>
              </div>
              <div className="bg-slate-50 p-2 rounded border">
                <div className="font-semibold text-slate-700 mb-1">Required Items ({selectedReq.lines?.length || 0}):</div>
                <div className="space-y-1">
                  {selectedReq.lines?.map(l => (
                    <div key={l.id} className="flex justify-between py-0.5 border-b border-slate-200">
                      <span>{l.item_code} - {l.item_name} ({l.requested_qty} {l.uom_code})</span>
                      <span className="font-mono font-bold">₹ {l.line_est_amount.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setSelectedReq(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
