import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Plus, CheckCircle, Search, Layers, Scale,
  Shield, ExternalLink, Eye, Award, RefreshCw
} from 'lucide-react';
import apiClient from '../api/client';
import { Tender, Quote } from '../types';

interface ProcurementViewProps {
  subTab: string;
  onNavigate: (route: string) => void;
}

export const ProcurementView: React.FC<ProcurementViewProps> = ({ subTab, onNavigate }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [securities, setSecurities] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New Tender Form State
  const [newTender, setNewTender] = useState({
    tender_title: '',
    estimated_cost: 1000000,
    tender_fee: 1000,
    emd_amount: 20000,
    bidding_days: 21
  });

  // New Bid Form State
  const [newQuote, setNewQuote] = useState({
    tender_id: 1,
    party_id: 1,
    quoted_qty: 100,
    basic_rate: 65000,
    gst_percent: 18.0
  });

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plansRes, tendersRes, quotesRes, secsRes, partiesRes] = await Promise.all([
        apiClient.get('/procurement/plans'),
        apiClient.get('/procurement/tenders'),
        apiClient.get('/procurement/quotes'),
        apiClient.get('/procurement/securities'),
        apiClient.get('/admin/parties')
      ]);
      setPlans(plansRes.data);
      setTenders(tendersRes.data);
      setQuotes(quotesRes.data);
      setSecurities(secsRes.data);
      setParties(partiesRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTender = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/procurement/tenders', newTender);
      setToastMsg('Tender successfully published to GeM & CPPP Portal!');
      setTimeout(() => setToastMsg(null), 3000);
      onNavigate('proc/tenders');
      loadData();
    } catch (e) {
      alert('Failed to publish tender');
    }
  };

  const handleAward = async (tenderId: number, partyId: number) => {
    try {
      await apiClient.post(`/procurement/tenders/${tenderId}/award`, { party_id: partyId });
      setToastMsg('Contract awarded! Work order preparation enabled.');
      setTimeout(() => setToastMsg(null), 3000);
      loadData();
      setSelectedTender(null);
    } catch (e) {
      alert('Failed to award contract');
    }
  };

  const handleReleaseSecurity = async (id: number) => {
    try {
      await apiClient.put(`/procurement/securities/${id}/release`);
      setToastMsg('Security instrument marked as released / refunded!');
      setTimeout(() => setToastMsg(null), 3000);
      loadData();
    } catch (e) {
      alert('Failed to release security');
    }
  };

  return (
    <div className="p-5 space-y-4">
      {toastMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2 rounded shadow-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> {toastMsg}
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="text-[11px] text-slate-500 font-medium">IFMS &rsaquo; Material Management &rsaquo; <b>Procurement Management</b></div>
          <h1 className="text-xl font-bold text-[#123B64]">Tenders, Bids & EMD/PBG Securities</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => onNavigate('proc/app')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'app' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Annual Procurement Plan
          </button>
          <button
            onClick={() => onNavigate('proc/tenders')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'tenders' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Tender Register ({tenders.length})
          </button>
          <button
            onClick={() => onNavigate('proc/quotes')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'quotes' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Quotations & Bids ({quotes.length})
          </button>
          <button
            onClick={() => onNavigate('proc/eval')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'eval' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Comparative Evaluation
          </button>
          <button
            onClick={() => onNavigate('proc/emd')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'emd' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            EMD & PBG Tracker ({securities.length})
          </button>
        </div>
      </div>

      {/* 1. Annual Procurement Plan SubTab */}
      {subTab === 'app' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
            <span className="font-bold text-slate-800">Annual Procurement Plan (APP) FY 2026-27</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#123B64] text-white font-semibold">
                <th className="p-2.5">Plan Ref No</th>
                <th className="p-2.5 text-right">Total Budget (₹)</th>
                <th className="p-2.5 text-right">Planned Procurement (₹)</th>
                <th className="p-2.5 text-center">Primary Mode</th>
                <th className="p-2.5 text-center">Plan Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {plans.map(p => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-mono font-bold text-blue-900">{p.plan_no}</td>
                  <td className="p-2.5 text-right font-mono">₹ {p.total_budget.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-emerald-800">₹ {p.planned_value.toLocaleString('en-IN')}</td>
                  <td className="p-2.5 text-center"><span className="badge-info">{p.proc_mode}</span></td>
                  <td className="p-2.5 text-center"><span className="badge-approved">Approved</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Tender Register SubTab */}
      {subTab === 'tenders' && (
        <div className="space-y-3">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center text-xs">
            <span className="font-bold text-slate-800">Live & Completed Tenders</span>
            <button
              onClick={() => {
                const title = prompt('Enter Tender Subject / Scope:');
                if (title) {
                  setNewTender({ ...newTender, tender_title: title });
                  apiClient.post('/procurement/tenders', { ...newTender, tender_title: title }).then(() => {
                    setToastMsg('Tender created and published successfully!');
                    loadData();
                  });
                }
              }}
              className="btn-primary"
            >
              <Plus className="w-3.5 h-3.5" /> Publish New Tender
            </button>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#123B64] text-white font-semibold">
                  <th className="p-2.5">Tender No</th>
                  <th className="p-2.5">Tender Title / Scope</th>
                  <th className="p-2.5">Portal Ref (GeM/CPPP)</th>
                  <th className="p-2.5 text-right">Est. Cost (₹)</th>
                  <th className="p-2.5 text-right">EMD (₹)</th>
                  <th className="p-2.5 text-center">Bids Recd</th>
                  <th className="p-2.5 text-center">Stage</th>
                  <th className="p-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tenders.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="p-2.5 font-mono font-bold text-blue-900">{t.tender_no}</td>
                    <td className="p-2.5 max-w-sm">
                      <div className="font-semibold text-slate-800">{t.tender_title}</div>
                      {t.awarded_party_name && (
                        <div className="text-[11px] text-emerald-700 font-medium">Awarded: {t.awarded_party_name}</div>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-600">{t.portal_ref_no}</td>
                    <td className="p-2.5 text-right font-mono font-bold">₹ {t.estimated_cost.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-mono">₹ {t.emd_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-center font-bold text-blue-900">{t.bids_received}</td>
                    <td className="p-2.5 text-center">
                      <span className={t.status === 'Awarded' ? 'badge-approved' : 'badge-pending'}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-2.5 text-center">
                      <button onClick={() => setSelectedTender(t)} className="p-1 text-blue-700 hover:bg-blue-50 rounded" title="View Evaluation & Bids">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Comparative Statement Evaluation SubTab */}
      {subTab === 'eval' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2 text-xs">
            <h3 className="font-bold text-sm text-[#123B64]">Comparative Statement: TND/2026/10042 (Laptop Supply)</h3>
            <p className="text-slate-500">Automated L1 / L2 / L3 position evaluation based on lowest compliant commercial quote:</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#123B64] text-white font-semibold">
                  <th className="p-2.5 text-center">Rank</th>
                  <th className="p-2.5">Vendor / Bidder</th>
                  <th className="p-2.5">Quoted Unit Rate</th>
                  <th className="p-2.5">GST Rate</th>
                  <th className="p-2.5 text-right">Total Bid Value (₹)</th>
                  <th className="p-2.5 text-center">Tech Status</th>
                  <th className="p-2.5 text-center">Award Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {quotes.map((q, idx) => (
                  <tr key={q.id} className={idx === 0 ? 'bg-emerald-50/50 hover:bg-emerald-50' : 'hover:bg-slate-50'}>
                    <td className="p-2.5 text-center font-bold">
                      <span className={idx === 0 ? 'bg-emerald-700 text-white px-2 py-0.5 rounded text-xs' : 'text-slate-600'}>
                        L{idx + 1}
                      </span>
                    </td>
                    <td className="p-2.5 font-bold text-slate-800">{q.vendor_name}</td>
                    <td className="p-2.5 font-mono">₹ {q.basic_rate.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 font-mono">{q.gst_percent || 18}%</td>
                    <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹ {q.total_bid_value.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-center"><span className="badge-approved">Qualified</span></td>
                    <td className="p-2.5 text-center">
                      <button
                        onClick={() => handleAward(q.tender_id || 1, q.party_id)}
                        className={`text-xs py-1 px-2.5 rounded font-medium ${idx === 0 ? 'btn-success' : 'btn-secondary'}`}
                      >
                        <Award className="w-3 h-3 inline mr-1" /> Award to L{idx + 1}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. EMD & PBG Tracker SubTab */}
      {subTab === 'emd' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center">
            <span className="font-bold text-slate-800">Earnest Money (EMD) & Performance Bank Guarantees (PBG)</span>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#123B64] text-white font-semibold">
                <th className="p-2.5">Security Type</th>
                <th className="p-2.5">Tender / Ref</th>
                <th className="p-2.5">Vendor Name</th>
                <th className="p-2.5">Bank & Instrument No</th>
                <th className="p-2.5 text-right">Amount (₹)</th>
                <th className="p-2.5">Expiry Date</th>
                <th className="p-2.5 text-center">Status</th>
                <th className="p-2.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {securities.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold">{s.sec_type}</td>
                  <td className="p-2.5 font-mono text-blue-900">{s.tender_no || 'TND/2026/10042'}</td>
                  <td className="p-2.5 font-medium">{s.vendor_name}</td>
                  <td className="p-2.5 font-mono text-slate-600">{s.issuing_bank} &bull; {s.instrument_no}</td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">₹ {s.amount.toLocaleString('en-IN')}</td>
                  <td className="p-2.5">{s.expiry_date}</td>
                  <td className="p-2.5 text-center"><span className={s.status === 'Active' ? 'badge-approved' : 'badge-pending'}>{s.status}</span></td>
                  <td className="p-2.5 text-center">
                    {s.status === 'Active' ? (
                      <button onClick={() => handleReleaseSecurity(s.id)} className="btn-secondary text-[11px] py-1 px-2">
                        Release / Refund
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Released</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tender Details & Quotes Modal */}
      {selectedTender && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full text-xs">
            <div className="bg-[#123B64] text-white p-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" /> Tender Details: {selectedTender.tender_no}
              </h3>
              <button onClick={() => setSelectedTender(null)} className="text-slate-300 hover:text-white font-bold">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="font-bold text-sm text-slate-800">{selectedTender.tender_title}</div>
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded border">
                <div><span className="text-slate-500 font-medium">Estimated Cost:</span> <b className="font-mono text-emerald-800">₹ {selectedTender.estimated_cost.toLocaleString('en-IN')}</b></div>
                <div><span className="text-slate-500 font-medium">EMD Required:</span> <b className="font-mono">₹ {selectedTender.emd_amount.toLocaleString('en-IN')}</b></div>
                <div><span className="text-slate-500 font-medium">Portal Ref:</span> <b className="font-mono">{selectedTender.portal_ref_no}</b></div>
                <div><span className="text-slate-500 font-medium">Status:</span> <b>{selectedTender.status}</b></div>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setSelectedTender(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
