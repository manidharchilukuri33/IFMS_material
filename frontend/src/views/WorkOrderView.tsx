import React, { useState, useEffect } from 'react';
import {
  Truck, Plus, CheckCircle, Search, Clock, AlertTriangle, Eye, Edit2, FileText
} from 'lucide-react';
import apiClient from '../api/client';
import { WorkOrder, Delivery, Item, Store } from '../types';

interface WorkOrderViewProps {
  subTab: string;
  onNavigate: (route: string) => void;
}

export const WorkOrderView: React.FC<WorkOrderViewProps> = ({ subTab, onNavigate }) => {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New PO State
  const [newPo, setNewPo] = useState({
    party_id: 1,
    store_id: 1,
    delivery_due_date: '',
    payment_terms: '100% against Delivery and QA Inspection',
    lines: [
      { item_id: 1, order_qty: 20, unit_rate: 68500, tax_percent: 18.0 }
    ]
  });

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [woRes, delRes, partiesRes, itemsRes, storesRes] = await Promise.all([
        apiClient.get('/work-orders/'),
        apiClient.get('/work-orders/deliveries/all'),
        apiClient.get('/admin/parties'),
        apiClient.get('/materials/items'),
        apiClient.get('/inventory/stores')
      ]);
      setOrders(woRes.data);
      setDeliveries(delRes.data);
      setParties(partiesRes.data);
      setItems(itemsRes.data);
      setStores(storesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/work-orders/', newPo);
      setToastMsg('Purchase Order issued successfully!');
      setTimeout(() => setToastMsg(null), 3000);
      onNavigate('wo/list');
      loadData();
    } catch (e) {
      alert('Failed to create PO');
    }
  };

  const handleCreateAmendment = async (woId: number) => {
    const reason = prompt('Enter Amendment Justification / Reason:');
    if (!reason) return;
    try {
      await apiClient.post(`/work-orders/${woId}/amendments`, {
        amend_type: 'Delivery Extension',
        reason
      });
      setToastMsg('Amendment recorded and sanction approved!');
      setTimeout(() => setToastMsg(null), 3000);
      loadData();
    } catch (e) {
      alert('Failed to amend WO');
    }
  };

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
          <div className="text-[11px] text-slate-500 font-medium">IFMS &rsaquo; Material Management &rsaquo; <b>Work Orders</b></div>
          <h1 className="text-xl font-bold text-[#123B64]">Purchase Orders & Delivery Tracking</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => onNavigate('wo/list')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'list' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Work Order Register ({orders.length})
          </button>
          <button
            onClick={() => onNavigate('wo/create')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'create' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            + Create Purchase Order
          </button>
          <button
            onClick={() => onNavigate('wo/delivery')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'delivery' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Delivery Tracking ({deliveries.length})
          </button>
        </div>
      </div>

      {/* 1. Work Order Register SubTab */}
      {subTab === 'list' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
            <span className="font-bold text-slate-800">All Issued Purchase Orders</span>
            <button onClick={() => onNavigate('wo/create')} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> Generate New PO
            </button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#123B64] text-white font-semibold">
                <th className="p-2.5">PO / WO Number</th>
                <th className="p-2.5">PO Date</th>
                <th className="p-2.5">Vendor / Supplier</th>
                <th className="p-2.5">Receiving Store</th>
                <th className="p-2.5 text-right">Total Basic (₹)</th>
                <th className="p-2.5 text-right">Total Gross (₹)</th>
                <th className="p-2.5">Delivery Due</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map(w => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-blue-900">{w.wo_no}</td>
                  <td className="p-2.5">{w.wo_date}</td>
                  <td className="p-2.5 font-bold text-slate-800">{w.vendor_name}</td>
                  <td className="p-2.5 text-slate-600">{w.store_name}</td>
                  <td className="p-2.5 text-right font-mono">₹ {w.total_basic_amt.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-emerald-800">₹ {w.total_wo_amount.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 font-medium">{w.delivery_due_date}</td>
                  <td className="p-2.5 text-center">
                    <span className={w.status === 'Completed' ? 'badge-approved' : (w.status === 'Delayed' ? 'badge-danger' : 'badge-info')}>
                      {w.status}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedWo(w)} className="p-1 text-blue-700 hover:bg-blue-50 rounded" title="View Lines">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleCreateAmendment(w.id)} className="p-1 text-amber-700 hover:bg-amber-50 rounded" title="Amend PO">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Create Purchase Order SubTab */}
      {subTab === 'create' && (
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm max-w-3xl mx-auto text-xs">
          <h2 className="font-bold text-sm text-[#123B64] mb-3 pb-2 border-b">Create Purchase Order / Work Order</h2>
          <form onSubmit={handleCreatePo} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Select Awarded Vendor *</label>
                <select
                  value={newPo.party_id}
                  onChange={e => setNewPo({ ...newPo, party_id: Number(e.target.value) })}
                  className="w-full border rounded p-1.5"
                >
                  {parties.map(p => (
                    <option key={p.id} value={p.id}>{p.party_name} ({p.party_code})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Delivery Destination Store *</label>
                <select
                  value={newPo.store_id}
                  onChange={e => setNewPo({ ...newPo, store_id: Number(e.target.value) })}
                  className="w-full border rounded p-1.5"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.store_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Contractual Delivery Due Date *</label>
                <input
                  type="date"
                  required
                  value={newPo.delivery_due_date}
                  onChange={e => setNewPo({ ...newPo, delivery_due_date: e.target.value })}
                  className="w-full border rounded p-1.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Payment Terms</label>
                <input
                  type="text"
                  value={newPo.payment_terms}
                  onChange={e => setNewPo({ ...newPo, payment_terms: e.target.value })}
                  className="w-full border rounded p-1.5"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 border-t pt-3">
              <span className="font-bold text-slate-800">Order Lines</span>
              {newPo.lines.map((ln, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                  <select
                    value={ln.item_id}
                    onChange={e => {
                      const itId = Number(e.target.value);
                      const it = items.find(i => i.id === itId);
                      const updated = [...newPo.lines];
                      updated[idx] = { ...updated[idx], item_id: itId, unit_rate: it?.estimated_rate || 1000 };
                      setNewPo({ ...newPo, lines: updated });
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
                    value={ln.order_qty}
                    onChange={e => {
                      const updated = [...newPo.lines];
                      updated[idx].order_qty = Number(e.target.value);
                      setNewPo({ ...newPo, lines: updated });
                    }}
                    className="w-20 border rounded p-1.5 bg-white font-mono"
                  />

                  <input
                    type="number"
                    placeholder="Rate"
                    value={ln.unit_rate}
                    onChange={e => {
                      const updated = [...newPo.lines];
                      updated[idx].unit_rate = Number(e.target.value);
                      setNewPo({ ...newPo, lines: updated });
                    }}
                    className="w-28 border rounded p-1.5 bg-white font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button type="button" onClick={() => onNavigate('wo/list')} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Generate Purchase Order</button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Delivery Tracking SubTab */}
      {subTab === 'delivery' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
            <span className="font-bold text-slate-800">Consignment Dispatch & Delivery Milestone Tracker</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#123B64] text-white font-semibold">
                <th className="p-2.5">Delivery Ref</th>
                <th className="p-2.5">PO Number</th>
                <th className="p-2.5">Vendor Name</th>
                <th className="p-2.5">Transporter & LR Docket</th>
                <th className="p-2.5">Dispatch Date</th>
                <th className="p-2.5">Expected Due</th>
                <th className="p-2.5 text-center">Delivery Status</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {deliveries.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-blue-900">{d.delivery_ref_no}</td>
                  <td className="p-2.5 font-mono">{d.wo_no || 'PO/DIT/2026/00200'}</td>
                  <td className="p-2.5 font-medium">{d.vendor_name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{d.courier_transporter} &bull; {d.lr_docket_no}</td>
                  <td className="p-2.5">{d.dispatch_date}</td>
                  <td className="p-2.5">{d.expected_date}</td>
                  <td className="p-2.5 text-center">
                    <span className={d.delivery_status === 'Delivered' ? 'badge-approved' : (d.delivery_status === 'Delayed' ? 'badge-danger' : 'badge-pending')}>
                      {d.delivery_status}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    {d.delivery_status !== 'Delivered' && (
                      <button
                        onClick={async () => {
                          await apiClient.put(`/work-orders/deliveries/${d.id}`, { delivery_status: 'Delivered' });
                          setToastMsg('Consignment marked as delivered at store gate!');
                          loadData();
                        }}
                        className="btn-secondary text-[11px] py-1 px-2"
                      >
                        Mark Gate Arrival
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PO View Modal */}
      {selectedWo && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-xl w-full text-xs">
            <div className="bg-[#123B64] text-white p-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Truck className="w-4 h-4" /> Work Order Details: {selectedWo.wo_no}
              </h3>
              <button onClick={() => setSelectedWo(null)} className="text-slate-300 hover:text-white font-bold">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded border">
                <div><span className="text-slate-500 font-medium">Supplier:</span> <b>{selectedWo.vendor_name}</b></div>
                <div><span className="text-slate-500 font-medium">Store:</span> <b>{selectedWo.store_name}</b></div>
                <div><span className="text-slate-500 font-medium">Gross Amount:</span> <b className="font-mono text-emerald-800">₹ {selectedWo.total_wo_amount.toLocaleString('en-IN')}</b></div>
                <div><span className="text-slate-500 font-medium">Delivery Due:</span> <b>{selectedWo.delivery_due_date}</b></div>
              </div>
              <div className="font-semibold text-slate-800">Contractual Line Items ({selectedWo.lines?.length || 0}):</div>
              <div className="space-y-1">
                {selectedWo.lines?.map(l => (
                  <div key={l.id} className="flex justify-between py-1 border-b">
                    <span>{l.item_code} - {l.item_name} ({l.order_qty} {l.uom_code})</span>
                    <span className="font-mono font-bold">₹ {l.total_line_amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setSelectedWo(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
