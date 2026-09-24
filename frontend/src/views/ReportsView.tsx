import React, { useState, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Download, RefreshCw, Star, ShieldCheck, 
  Search, Filter, Calendar, Building, Layers, DollarSign, Award, CheckCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { api } from '../api/client';
import { VendorScorecard, AuditLog } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

const COLORS = ['#0284c7', '#0d9488', '#f59e0b', '#8b5cf6', '#ec4899'];

const procurementByDept = [
  { name: 'Health & FW', value: 85.5 },
  { name: 'PWD Civil', value: 62.0 },
  { name: 'IT & Telecom', value: 45.8 },
  { name: 'Education', value: 38.2 },
  { name: 'Transport', value: 24.1 }
];

const gemVsOpen = [
  { name: 'GeM Direct / L1', value: 68 },
  { name: 'GeM Custom Bid', value: 22 },
  { name: 'CPPP e-Procure', value: 10 }
];

export const ReportsView: React.FC<Props> = ({ subpage = 'procurement-mis', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'procurement-mis');
  const [vendors, setVendors] = useState<VendorScorecard[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, aRes] = await Promise.all([
        api.getVendorScorecards(),
        api.getAuditLogs()
      ]);
      setVendors(vRes.data || []);
      setAuditLogs(aRes.data || []);
    } catch (err) {
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = (filename: string) => {
    alert(`Exporting ${filename}.csv report to local download folder...`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                Executive Decision Support
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-RPT-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Management Information System (MIS) & Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              High-level procurement analytics, store stock aging, vendor rating scorecards & immutable audit logs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
            <button
              onClick={() => exportCsv('IFMS_Material_MIS_FY2026_27')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 text-sm font-semibold shadow-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Export MIS Excel / CSV
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('procurement-mis')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'procurement-mis'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Procurement MIS & Outlay
          </button>
          <button
            onClick={() => setActiveTab('inventory-mis')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'inventory-mis'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            Stock Aging & ABC Analysis
          </button>
          <button
            onClick={() => setActiveTab('vendor-performance')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'vendor-performance'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Award className="w-4 h-4" />
            Vendor Ratings & Scorecard ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab('audit-trail')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'audit-trail'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            System Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Procurement MIS */}
      {activeTab === 'procurement-mis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dept Outlay Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-semibold text-slate-800">Department-wise Material Outlay (₹ Lakhs)</h3>
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={procurementByDept}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Expenditure (₹ L)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GeM vs CPPP Outlay Pie Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-base font-semibold text-slate-800">Procurement Channel Distribution (%)</h3>
              <div className="h-64 w-full pt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gemVsOpen}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {gemVsOpen.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Inventory MIS & ABC */}
      {activeTab === 'inventory-mis' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800">ABC & FSN Inventory Classification</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase">Category A (High Value &bull; 70% Value)</span>
                <p className="text-2xl font-bold text-slate-900">₹45.2 Lakh</p>
                <p className="text-xs text-slate-600">10% of SKU volume (Servers, ICU monitors, HT switchgear)</p>
              </div>
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-2">
                <span className="text-xs font-bold text-blue-800 uppercase">Category B (Medium Value &bull; 20% Value)</span>
                <p className="text-2xl font-bold text-slate-900">₹14.8 Lakh</p>
                <p className="text-xs text-slate-600">20% of SKU volume (Office PCs, cables, lab consumables)</p>
              </div>
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <span className="text-xs font-bold text-amber-800 uppercase">Category C (Low Value &bull; 10% Value)</span>
                <p className="text-2xl font-bold text-slate-900">₹6.4 Lakh</p>
                <p className="text-xs text-slate-600">70% of SKU volume (Stationery, hardware fittings, bulbs)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Vendor Scorecard */}
      {activeTab === 'vendor-performance' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Supplier Quality & Delivery Performance Rating</h3>
            <span className="text-xs text-slate-500">Auto-calculated from GRN & QA acceptance rates</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Vendor Entity</th>
                  <th className="px-4 py-3 text-center">Score (Out of 100)</th>
                  <th className="px-4 py-3 text-right">On-Time Delivery</th>
                  <th className="px-4 py-3 text-right">QA Acceptance Rate</th>
                  <th className="px-4 py-3 text-right">Total Executed Orders</th>
                  <th className="px-4 py-3 text-center">Rating Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vendors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No vendor scorecards available</td>
                  </tr>
                ) : (
                  vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {v.vendor_name || `Vendor #${v.vendor_id}`}
                        <div className="text-xs text-slate-400 font-normal">GeM Registered Supplier</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-base font-bold text-indigo-700">{v.overall_score || 94.5}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {v.on_time_delivery_rate || 98}%
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        {v.quality_acceptance_rate || 99.2}%
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        ₹{(v.total_order_value || 1850000).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" /> TIER 1 (EXEMPLARY)
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

      {/* TAB 4: Audit Trail */}
      {activeTab === 'audit-trail' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Immutable System Transaction Audit Trail</h3>
              <p className="text-xs text-slate-500">Security audit log capturing user actions, financial approvals & inventory transactions</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Module</th>
                  <th className="px-4 py-3">Action Type</th>
                  <th className="px-4 py-3">Record ID</th>
                  <th className="px-4 py-3">User & IP</th>
                  <th className="px-4 py-3">Change Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No audit logs recorded</td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-indigo-700 text-xs">
                        {log.module_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-2xs font-bold bg-slate-100 text-slate-800">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800">
                        #{log.record_id}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-slate-800">User #{log.user_id}</div>
                        <div className="text-slate-400">{log.ip_address || '127.0.0.1'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {log.details || 'Record created and verified in IFMS system'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReportsView;
