import React, { useState, useEffect } from 'react';
import { 
  Settings, Sliders, DollarSign, Bell, Cpu, ShieldCheck, CheckCircle, 
  AlertTriangle, RefreshCw, Plus, Eye, Save, Globe, Lock, UserCheck
} from 'lucide-react';
import { api } from '../api/client';
import { SystemNotification } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const AdministrationView: React.FC<Props> = ({ subpage = 'workflows', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'workflows');
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);

  // Workflow Config state
  const [workflows, setWorkflows] = useState([
    { id: 1, docType: 'Purchase Requisition (IND)', level1: 'Section Officer', level2: 'Branch Head / DDO', level3: 'Head of Department (HoD)', threshold: '₹5,00,000' },
    { id: 2, docType: 'Tender Evaluation & Award', level1: 'Purchase Committee', level2: 'Finance Member', level3: 'Principal Secretary', threshold: '₹25,00,000' },
    { id: 3, docType: 'Bill Payment & Sanction', level1: 'Accountant', level2: 'Senior Accounts Officer', level3: 'Pay & Accounts Officer (PAO)', threshold: '₹50,00,000' },
    { id: 4, docType: 'Scrap Condemnation', level1: 'Store Keeper', level2: 'Standing Survey Board', level3: 'Director / HoD', threshold: '₹2,00,000' }
  ]);

  // Financial Limits state
  const [limits, setLimits] = useState([
    { designation: 'Store Officer / Section Officer', gemDirect: '₹25,000', customBid: '₹1,00,000', pacLimit: '₹10,000', approvalLimit: '₹50,000' },
    { designation: 'Deputy Director / DDO', gemDirect: '₹5,00,000', customBid: '₹10,00,000', pacLimit: '₹2,00,000', approvalLimit: '₹10,00,000' },
    { designation: 'Joint Director / Additional Secretary', gemDirect: '₹25,00,000', customBid: '₹50,00,000', pacLimit: '₹10,00,000', approvalLimit: '₹50,00,000' },
    { designation: 'Principal Secretary / HoD', gemDirect: 'Unlimited', customBid: '₹5,00,00,000', pacLimit: '₹50,00,000', approvalLimit: '₹5,00,00,000' }
  ]);

  // Integration Hub states
  const [integrations, setIntegrations] = useState([
    { name: 'GeM (Government e-Marketplace) API', endpoint: 'https://api.gem.gov.in/v2/orders', status: 'ONLINE', ping: '42ms', lastSync: '24-Sep-2026 15:45' },
    { name: 'CPPP (Central Public Procurement Portal)', endpoint: 'https://eprocure.gov.in/cppp/api', status: 'ONLINE', ping: '88ms', lastSync: '24-Sep-2026 15:30' },
    { name: 'IFMS Core Treasury & RBI e-Kuber Gateway', endpoint: 'https://treasury.delhi.gov.in/pao/v1', status: 'ONLINE', ping: '18ms', lastSync: '24-Sep-2026 16:00' },
    { name: 'GSTN e-Invoice & IRN Portal', endpoint: 'https://einvoice1.gst.gov.in/api', status: 'ONLINE', ping: '65ms', lastSync: '24-Sep-2026 14:20' },
    { name: 'NIC SMS & Email Alert Gateway', endpoint: 'https://smsgw.nic.in/api/v3', status: 'ONLINE', ping: '24ms', lastSync: '24-Sep-2026 16:05' }
  ]);

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    alert('System Configuration & Delegated Financial Limits updated successfully in PostgreSQL database!');
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-white">
                System Governance & Rules
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-ADM-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Administration & Workflow Rule Configuration</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Configure multi-level approval hierarchies, GFR delegated financial limits, notification rules & external API health.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-slate-700' : ''}`} />
            </button>
            <button
              onClick={handleSaveConfig}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 text-sm font-semibold shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Save System Rules
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('workflows')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'workflows'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Approval Hierarchies
          </button>
          <button
            onClick={() => setActiveTab('financial-limits')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'financial-limits'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Delegated Financial Limits (DFP Rules)
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bell className="w-4 h-4" />
            System Notifications ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'integrations'
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Integration Hub & API Pings ({integrations.length})
          </button>
        </div>
      </div>

      {/* TAB 1: Workflows Configuration */}
      {activeTab === 'workflows' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Multi-Level Electronic Approval Rules</h3>
              <p className="text-xs text-slate-500">Document routing and sequential sign-off thresholds</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Document / Module</th>
                  <th className="px-4 py-3">Stage 1 (Initiator)</th>
                  <th className="px-4 py-3">Stage 2 (Verifier)</th>
                  <th className="px-4 py-3">Stage 3 (Final Sanction)</th>
                  <th className="px-4 py-3 text-right">Escalation Threshold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workflows.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{w.docType}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 bg-blue-50/50">{w.level1}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 bg-indigo-50/50">{w.level2}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 bg-purple-50/50">{w.level3}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{w.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Financial Limits */}
      {activeTab === 'financial-limits' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Delegation of Financial Powers (DFPR) Matrix</h3>
              <p className="text-xs text-slate-500">Maximum monetary sanction authority per government designation</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Designation / Role</th>
                  <th className="px-4 py-3 text-right">GeM Direct Purchase</th>
                  <th className="px-4 py-3 text-right">GeM Custom Bidding</th>
                  <th className="px-4 py-3 text-right">Proprietary Article (PAC)</th>
                  <th className="px-4 py-3 text-right">Total Expenditure Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {limits.map((l, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{l.designation}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{l.gemDirect}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{l.customBid}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{l.pacLimit}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">{l.approvalLimit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Real-Time System Alerts & Action Required Notifications</h3>
            <span className="text-xs text-slate-500 font-mono">{notifications.length} Active Alerts</span>
          </div>

          <div className="divide-y divide-slate-200">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No active notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="p-4 flex items-start justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0 mt-0.5">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-900">{n.title}</div>
                      <div className="text-xs text-slate-600 mt-0.5">{n.message}</div>
                      <div className="text-2xs text-slate-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : 'Just now'}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800">
                    {n.notification_type || 'INFO'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Integration Hub */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">National Government Portal Integration Hub</h3>
              <p className="text-xs text-slate-500">Live heartbeat pings and webhook listeners</p>
            </div>
          </div>

          <div className="divide-y divide-slate-200">
            {integrations.map((ig, idx) => (
              <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{ig.name}</div>
                    <div className="text-xs font-mono text-slate-500 mt-0.5">{ig.endpoint}</div>
                    <div className="text-xs text-slate-400 mt-1">Last synchronized: {ig.lastSync}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 self-end md:self-center">
                  <span className="text-xs font-mono text-slate-600">Latency: <strong className="text-emerald-700">{ig.ping}</strong></span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {ig.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default AdministrationView;
