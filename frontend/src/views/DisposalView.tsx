import React, { useState, useEffect } from 'react';
import { 
  Trash2, CheckCircle, XCircle, AlertTriangle, FileText, Plus, Eye, 
  Gavel, RefreshCw, Download, Search, DollarSign, Archive, Award
} from 'lucide-react';
import { api } from '../api/client';
import { CondemnationProposal } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const DisposalView: React.FC<Props> = ({ subpage = 'proposals', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'proposals');
  const [proposals, setProposals] = useState<CondemnationProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<CondemnationProposal | null>(null);

  // Forms
  const [proposalForm, setProposalForm] = useState({
    item_id: 1,
    store_id: 1,
    proposal_number: 'COND-GNCTD-2026-004',
    reason_for_condemnation: 'Beyond economical repair (BER) after completing 7-year useful asset lifecycle',
    quantity: 15,
    book_value: 450000,
    estimated_residual_value: 35000,
    reserve_price: 40000,
    survey_committee_members: 'Chief Engineer (Civil), Accounts Officer (Finance), Store Officer (IT)',
    remarks: 'Approved for MSTC electronic public auction'
  });

  const [saleForm, setSaleForm] = useState({
    winning_bidder_name: 'Metal Scrap Traders Pvt Ltd (MSTC Reg: MSTC-DEL-401)',
    sale_amount: 52000,
    treasury_challan_no: 'CHAL-TR-DISP-2026-8801',
    deposit_date: '2026-09-24',
    certificate_of_disposal: 'CERT-DISP-2026-441'
  });

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getCondemnationProposals();
      setProposals(res.data || []);
    } catch (err) {
      console.error('Error fetching disposal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCondemnationProposal(proposalForm);
      alert('Condemnation proposal submitted to Standing Survey Board!');
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed to submit proposal: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSurveyApprove = async (proposalId: number) => {
    try {
      await api.approveCondemnationProposal(proposalId, {
        decision: 'APPROVED',
        reserve_price: 45000,
        remarks: 'Survey Committee inspected scrap lot physically. Recommended for MSTC e-Auction.'
      });
      alert('Survey Committee Certificate approved & signed!');
      setShowSurveyModal(false);
      fetchData();
    } catch (err: any) {
      alert('Approval failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleRecordSale = async (proposalId: number) => {
    try {
      await api.recordDisposalSale(proposalId, saleForm);
      alert('Auction realization recorded & treasury credit challan generated!');
      setShowSaleModal(false);
      fetchData();
    } catch (err: any) {
      alert('Sale record failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const totalScrapValue = proposals.reduce((acc, p) => acc + (p.actual_sale_amount || p.reserve_price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-800">
                Asset Condemnation & GFR 217
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-DISP-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Material Condemnation, Survey & MSTC e-Auction</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Survey Committee board inspection, reserve pricing, scrap lotting, MSTC e-Auction realization & Treasury write-off.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-stone-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Condemnation Proposal
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('proposals')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'proposals'
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Condemnation Proposals ({proposals.length})
          </button>
          <button
            onClick={() => setActiveTab('mstc-auctions')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'mstc-auctions'
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Gavel className="w-4 h-4" />
            MSTC e-Auction Realization
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-stone-100 text-stone-800 rounded-lg flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Condemned Lots</p>
            <p className="text-xl font-bold text-slate-800">{proposals.length}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Scrap asset batches</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending Survey Review</p>
            <p className="text-xl font-bold text-amber-700">
              {proposals.filter(p => p.status === 'SUBMITTED').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Standing Committee</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Auction Realized</p>
            <p className="text-xl font-bold text-emerald-700">₹{(totalScrapValue / 1000).toFixed(1)}k</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">MSTC Public Bids</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Written Off from Books</p>
            <p className="text-xl font-bold text-blue-700">
              {proposals.filter(p => p.status === 'SOLD' || p.status === 'WRITTEN_OFF').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Ledgers reconciled</p>
          </div>
        </div>
      </div>

      {/* TAB 1: Proposals Table */}
      {activeTab === 'proposals' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Condemnation & Scrap Disposal Register</h3>
            <span className="text-xs text-slate-500">Conforming to GFR Rule 217-223</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Proposal Ref</th>
                  <th className="px-4 py-3">Item & Qty</th>
                  <th className="px-4 py-3">Reason for Condemnation</th>
                  <th className="px-4 py-3 text-right">Book Value</th>
                  <th className="px-4 py-3 text-right">Reserve Price</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {proposals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No condemnation proposals recorded</td>
                  </tr>
                ) : (
                  proposals.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-stone-900">
                        {p.proposal_number}
                        <div className="text-xs text-slate-400 font-normal">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">Item Master #{p.item_id}</div>
                        <div className="text-xs text-slate-500">Qty: {p.quantity || 1} units &bull; Store #{p.store_id}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700 max-w-xs">
                        {p.reason_for_condemnation}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        ₹{(p.book_value || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-stone-900">
                        ₹{(p.reserve_price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.status === 'SOLD' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'APPROVED_BY_COMMITTEE' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {p.status === 'SUBMITTED' && (
                            <button
                              onClick={() => {
                                setSelectedProposal(p);
                                setShowSurveyModal(true);
                              }}
                              className="px-2 py-1 bg-stone-800 text-white rounded text-xs font-semibold hover:bg-stone-900 transition-colors"
                            >
                              Survey Board
                            </button>
                          )}
                          {p.status === 'APPROVED_BY_COMMITTEE' && (
                            <button
                              onClick={() => {
                                setSelectedProposal(p);
                                setShowSaleModal(true);
                              }}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              Record Sale
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

      {/* TAB 2: MSTC Auctions */}
      {activeTab === 'mstc-auctions' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-semibold text-slate-800">MSTC e-Auction Portal Integration</h3>
            <p className="text-xs text-slate-500">Real-time bidding synchronization with Government MSTC Portal</p>
          </div>
          <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-stone-800 uppercase">MSTC Lot #MSTC/ND/2026/SCRAP-9912</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">Highest Bidder (H1): Apex Scrap Recyclers (₹52,000)</div>
              <div className="text-xs text-slate-600">Treasury Challan: <span className="font-mono font-bold">CHAL-DISP-2026-9901</span> &bull; Status: <span className="font-bold text-emerald-700">CHALLAN CLEARED</span></div>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
              DISPOSED & REMOVED
            </span>
          </div>
        </div>
      )}

      {/* MODAL: Create Proposal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">New Condemnation & Survey Proposal</h3>
                <p className="text-xs text-slate-500">Initiate board condemnation for obsolete / damaged equipment</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateProposal} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Item to Condemn</label>
                  <select
                    value={proposalForm.item_id}
                    onChange={(e) => setProposalForm({ ...proposalForm, item_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>Desktop Computers (HP ProDesk Series)</option>
                    <option value={2}>Power Distribution Switchboards</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Quantity (Units)</label>
                  <input
                    type="number"
                    value={proposalForm.quantity}
                    onChange={(e) => setProposalForm({ ...proposalForm, quantity: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Book Value (₹)</label>
                  <input
                    type="number"
                    value={proposalForm.book_value}
                    onChange={(e) => setProposalForm({ ...proposalForm, book_value: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reserve Scrap Price (₹)</label>
                  <input
                    type="number"
                    value={proposalForm.reserve_price}
                    onChange={(e) => setProposalForm({ ...proposalForm, reserve_price: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Condemnation *</label>
                <textarea
                  rows={2}
                  required
                  value={proposalForm.reason_for_condemnation}
                  onChange={(e) => setProposalForm({ ...proposalForm, reason_for_condemnation: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-stone-800 text-white rounded-lg text-sm font-semibold hover:bg-stone-900"
                >
                  Submit to Survey Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Survey Board Approval */}
      {showSurveyModal && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-stone-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Survey Committee Board Approval</h3>
                <p className="text-xs text-slate-600">Proposal #{selectedProposal.proposal_number}</p>
              </div>
              <button onClick={() => setShowSurveyModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-stone-800 space-y-1">
                <div><strong>Item:</strong> Master #{selectedProposal.item_id} &bull; Qty: {selectedProposal.quantity}</div>
                <div><strong>Reason:</strong> {selectedProposal.reason_for_condemnation}</div>
                <div><strong>Reserve Price:</strong> ₹{selectedProposal.reserve_price?.toLocaleString()}</div>
              </div>
              <p className="text-xs text-slate-600">
                The Standing Condemnation Board certifies that the equipment has completed normal useful life and is unserviceable.
              </p>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSurveyModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSurveyApprove(selectedProposal.id)}
                  className="px-5 py-2 bg-stone-800 text-white rounded-lg text-sm font-semibold hover:bg-stone-900"
                >
                  Sign & Approve Condemnation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Sale */}
      {showSaleModal && selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-emerald-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Record MSTC e-Auction Sale</h3>
                <p className="text-xs text-slate-600">Capture winning H1 bid and treasury challan deposit</p>
              </div>
              <button onClick={() => setShowSaleModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleRecordSale(selectedProposal.id); }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Winning Bidder / Entity *</label>
                <input
                  type="text"
                  required
                  value={saleForm.winning_bidder_name}
                  onChange={(e) => setSaleForm({ ...saleForm, winning_bidder_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Realized Sale Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={saleForm.sale_amount}
                    onChange={(e) => setSaleForm({ ...saleForm, sale_amount: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Treasury Challan No</label>
                  <input
                    type="text"
                    required
                    value={saleForm.treasury_challan_no}
                    onChange={(e) => setSaleForm({ ...saleForm, treasury_challan_no: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSaleModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                >
                  Confirm Sale & Write-Off Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DisposalView;
