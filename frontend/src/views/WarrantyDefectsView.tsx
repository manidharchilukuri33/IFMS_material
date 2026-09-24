import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Wrench, AlertTriangle, CheckCircle, XCircle, Clock, 
  Plus, Eye, RefreshCw, Download, Search, ShieldCheck, Flag, ArrowRight
} from 'lucide-react';
import { api } from '../api/client';
import { WarrantyAsset, DefectTicket } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const WarrantyDefectsView: React.FC<Props> = ({ subpage = 'warranty-assets', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'warranty-assets');
  const [assets, setAssets] = useState<WarrantyAsset[]>([]);
  const [defects, setDefects] = useState<DefectTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showLogDefectModal, setShowLogDefectModal] = useState(false);
  const [selectedDefect, setSelectedDefect] = useState<DefectTicket | null>(null);

  // Defect Form
  const [defectForm, setDefectForm] = useState({
    item_id: 1,
    serial_number: 'SN-HP-2026-9901',
    defect_description: 'Motherboard failure - unit powers off automatically after 5 minutes of operation',
    severity: 'HIGH',
    reported_by_name: 'Dr. Manish Gupta (Medical Superintendent)',
    reported_by_department: 'LNJP Hospital ICU Unit',
    vendor_sla_hours: 24
  });

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assetRes, defectRes] = await Promise.all([
        api.getWarrantyAssets(),
        api.getDefectTickets()
      ]);
      setAssets(assetRes.data || []);
      setDefects(defectRes.data || []);
    } catch (err) {
      console.error('Error fetching warranty data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDefectTicket(defectForm);
      alert('Defect Ticket logged and automated OEM SLA clock started!');
      setShowLogDefectModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed to log defect: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleResolveDefect = async (ticketId: number) => {
    const notes = prompt('Enter resolution notes / OEM replacement part details:', 'Motherboard replaced onsite by OEM engineer. Diagnostics test passed.');
    if (!notes) return;
    try {
      await api.resolveDefectTicket(ticketId, notes);
      alert('Defect Ticket resolved and closed!');
      fetchData();
    } catch (err: any) {
      alert('Failed to resolve: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEscalateGem = async (ticketId: number) => {
    if (!confirm('Escalate this SLA breach to GeM Incident Management Portal for vendor debarment / penalty deduction?')) return;
    try {
      await api.escalateDefectToGem(ticketId);
      alert('Incident escalated to GeM Portal & Financial penalty notice issued to OEM!');
      fetchData();
    } catch (err: any) {
      alert('Failed to escalate: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                OEM Warranty & SLA Tracking
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-WARR-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Warranty Lifecycle, Defects & GeM Incident Escalation</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor OEM warranty commitments, RMA service requests, SLA turnaround times & GeM dispute arbitration.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowLogDefectModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Defect / RMA Incident
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('warranty-assets')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'warranty-assets'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Asset Warranty Registry ({assets.length})
          </button>
          <button
            onClick={() => setActiveTab('defect-tickets')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'defect-tickets'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Active Defect Tickets & SLA ({defects.length})
          </button>
          <button
            onClick={() => setActiveTab('gem-escalations')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'gem-escalations'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Flag className="w-4 h-4" />
            GeM Escalations & Penalties
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Assets Under Warranty</p>
            <p className="text-xl font-bold text-slate-800">{assets.length}</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">OEM Onsite coverage</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Open Defect Tickets</p>
            <p className="text-xl font-bold text-rose-700">
              {defects.filter(d => d.status === 'OPEN' || d.status === 'IN_PROGRESS').length}
            </p>
            <p className="text-xs text-rose-500 font-medium mt-0.5">Under OEM resolution</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">SLA Compliance Rate</p>
            <p className="text-xl font-bold text-amber-700">96.4%</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Resolved within 24-48 hrs</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Flag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">GeM Escalations</p>
            <p className="text-xl font-bold text-purple-700">
              {defects.filter(d => d.status === 'ESCALATED_TO_GEM').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Arbitration in progress</p>
          </div>
        </div>
      </div>

      {/* TAB 1: Warranty Registry */}
      {activeTab === 'warranty-assets' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Equipment Master Warranty Register</h3>
            <span className="text-xs text-slate-500 font-mono">Total {assets.length} Active Warranties</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Asset Serial No</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">PO Reference</th>
                  <th className="px-4 py-3">Warranty Start</th>
                  <th className="px-4 py-3">Warranty End</th>
                  <th className="px-4 py-3 text-center">SLA Terms</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No assets in warranty registry</td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {a.serial_number}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Item Master #{a.item_id}
                        <div className="text-xs text-slate-500 font-normal">{a.warranty_type || 'Comprehensive Onsite OEM'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        PO #{a.work_order_id}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {a.warranty_start_date ? new Date(a.warranty_start_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {a.warranty_end_date ? new Date(a.warranty_end_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 font-semibold">
                          {a.sla_response_hours || 24} Hrs Onsite
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          {a.status || 'ACTIVE'}
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

      {/* TAB 2: Defect Tickets */}
      {activeTab === 'defect-tickets' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Active Defect Tickets & RMA Requests</h3>
              <p className="text-xs text-slate-500">Live SLA monitoring clock with automated GeM escalation triggers</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Ticket No</th>
                  <th className="px-4 py-3">Serial & Item</th>
                  <th className="px-4 py-3">Issue Description</th>
                  <th className="px-4 py-3">Reported By / Dept</th>
                  <th className="px-4 py-3 text-center">Severity</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {defects.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No defect tickets found</td>
                  </tr>
                ) : (
                  defects.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">
                        {d.ticket_number || `TKT-2026-${d.id}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-bold text-slate-900">{d.serial_number}</div>
                        <div className="text-xs text-slate-500">Item #{d.item_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-800 text-xs max-w-xs">
                        {d.defect_description}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{d.reported_by_name}</div>
                        <div className="text-xs text-slate-500">{d.reported_by_department}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          d.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                          d.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {d.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          d.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' :
                          d.status === 'ESCALATED_TO_GEM' ? 'bg-purple-100 text-purple-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {d.status !== 'RESOLVED' && (
                            <>
                              <button
                                onClick={() => handleResolveDefect(d.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors"
                              >
                                Resolve
                              </button>
                              <button
                                onClick={() => handleEscalateGem(d.id)}
                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700 transition-colors"
                              >
                                GeM Escalation
                              </button>
                            </>
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

      {/* TAB 3: GeM Escalations */}
      {activeTab === 'gem-escalations' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-semibold text-slate-800">GeM Incident Management & OEM Penalties</h3>
            <p className="text-xs text-slate-500">Automated breach notification under GeM General Terms and Conditions (GTC Clause 24)</p>
          </div>
          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-900 uppercase">GeM Incident #GEM-INC-2026-9041</span>
              <span className="text-2xs bg-purple-200 text-purple-900 px-2 py-0.5 rounded font-bold">DISPUTE ACTIVE</span>
            </div>
            <div className="text-sm font-semibold text-slate-800">Vendor: Apex Tech Solutions Ltd &bull; Contract: GEMC-5116877-2026</div>
            <div className="text-xs text-slate-600">Breach: SLA Turnaround exceeded by 72 hours on critical server replacement. Penalty of 0.5% per day applied against Performance Security (PBG).</div>
          </div>
        </div>
      )}

      {/* MODAL: Log Defect */}
      {showLogDefectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Log OEM Defect / Service Ticket</h3>
                <p className="text-xs text-slate-500">Raise warranty call for immediate vendor technician dispatch</p>
              </div>
              <button onClick={() => setShowLogDefectModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleLogDefect} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Serial Number *</label>
                  <input
                    type="text"
                    required
                    value={defectForm.serial_number}
                    onChange={(e) => setDefectForm({ ...defectForm, serial_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Severity Level</label>
                  <select
                    value={defectForm.severity}
                    onChange={(e) => setDefectForm({ ...defectForm, severity: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white font-semibold"
                  >
                    <option value="CRITICAL">CRITICAL (System Down)</option>
                    <option value="HIGH">HIGH (Major Function Impaired)</option>
                    <option value="MEDIUM">MEDIUM (Minor Glitch)</option>
                    <option value="LOW">LOW (Cosmetic / Advisory)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reporting Officer *</label>
                  <input
                    type="text"
                    required
                    value={defectForm.reported_by_name}
                    onChange={(e) => setDefectForm({ ...defectForm, reported_by_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Location</label>
                  <input
                    type="text"
                    value={defectForm.reported_by_department}
                    onChange={(e) => setDefectForm({ ...defectForm, reported_by_department: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Defect Symptoms & Fault Description *</label>
                <textarea
                  rows={3}
                  required
                  value={defectForm.defect_description}
                  onChange={(e) => setDefectForm({ ...defectForm, defect_description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowLogDefectModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 shadow-sm"
                >
                  Dispatch RMA Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default WarrantyDefectsView;
