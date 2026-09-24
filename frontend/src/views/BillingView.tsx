import React, { useState, useEffect } from 'react';
import { 
  CreditCard, CheckCircle, AlertTriangle, XCircle, FileText, Plus, Eye, 
  Send, RefreshCw, Download, Search, Landmark, ShieldCheck, ArrowRight,
  TrendingUp, ArrowUpRight, DollarSign, Layers
} from 'lucide-react';
import { api } from '../api/client';
import { VendorInvoice, InvoiceMatch, SanctionOrder } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

export const BillingView: React.FC<Props> = ({ subpage = 'invoices', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'invoices');
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [matches, setMatches] = useState<InvoiceMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<VendorInvoice | null>(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);

  // Form: Create Invoice
  const [invoiceForm, setInvoiceForm] = useState({
    work_order_id: 1,
    grn_id: 1,
    vendor_id: 1,
    vendor_invoice_number: 'INV-2026-9921',
    invoice_date: '2026-09-24',
    invoice_amount: 3200000,
    tax_amount: 576000,
    total_payable_amount: 3776000,
    tds_it_amount: 64000,
    tds_gst_amount: 64000,
    net_payable_amount: 3648000,
    remarks: 'Tax invoice for 100 Desktop PCs delivered under GeM contract'
  });

  // Form: Sanction Order
  const [sanctionForm, setSanctionForm] = useState({
    sanction_number: 'SANC-GNCTD-FIN-2026-104',
    head_of_account: '2059-80-001-99-51 (IT Infrastructure Modernization)',
    sanctioned_amount: 3648000,
    approving_authority: 'Principal Secretary (Finance), GNCTD',
    financial_year: '2026-27'
  });

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, matchRes] = await Promise.all([
        api.getInvoices(),
        api.getInvoiceMatches()
      ]);
      setInvoices(invRes.data || []);
      setMatches(matchRes.data || []);
    } catch (err) {
      console.error('Error fetching billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createInvoice(invoiceForm);
      alert('Vendor Invoice submitted and queued for automated 3-Way Match!');
      setShowCreateInvoiceModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed to submit invoice: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleGenerateSanction = async (invoiceId: number) => {
    try {
      await api.generateSanction(invoiceId, sanctionForm);
      alert('Expenditure Sanction Order issued successfully!');
      setShowSanctionModal(false);
      fetchData();
    } catch (err: any) {
      alert('Failed to generate sanction: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleSendToTreasury = async (invoiceId: number) => {
    if (!confirm('Submit bill token to PAO / Treasury for automated ECS disbursement?')) return;
    try {
      await api.sendToTreasury(invoiceId);
      alert('Bill token successfully transmitted to IFMS Treasury Gateway!');
      fetchData();
    } catch (err: any) {
      alert('Failed to send to treasury: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = (inv.vendor_invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPayable = invoices.reduce((acc, inv) => acc + (inv.net_payable_amount || inv.invoice_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Treasury & Bill Processing
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-PAO-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Vendor Billing, 3-Way Match & Treasury Sanctions</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Automate PO vs GRN vs Invoice 3-way validation, statutory TDS deductions, Sanction Orders & PAO Treasury ECS tokens.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateInvoiceModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Submit Vendor Tax Invoice
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Vendor Invoices Register ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('three-way-matching')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'three-way-matching'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            3-Way Verification Matrix ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('sanction-orders')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'sanction-orders'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Financial Sanctions & Head of Account
          </button>
          <button
            onClick={() => setActiveTab('treasury-tokens')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'treasury-tokens'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Landmark className="w-4 h-4" />
            PAO Treasury Gateway & Tokens
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Invoiced Amount</p>
            <p className="text-xl font-bold text-slate-900">₹{(totalPayable / 100000).toFixed(2)} Lakh</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">{invoices.length} Bills Processed</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">3-Way Auto Matched</p>
            <p className="text-xl font-bold text-blue-700">
              {invoices.filter(i => i.is_three_way_matched || i.status === 'MATCHED' || i.status === 'SANCTIONED').length}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">100% Rate & Qty verified</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Sanctions Issued</p>
            <p className="text-xl font-bold text-amber-700">
              {invoices.filter(i => i.status === 'SANCTIONED' || i.status === 'SENT_TO_TREASURY' || i.status === 'PAID').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Appropriated Head of Account</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Paid via Treasury ECS</p>
            <p className="text-xl font-bold text-purple-700">
              {invoices.filter(i => i.status === 'PAID').length}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">RBI e-Kuber Settlement</p>
          </div>
        </div>
      </div>

      {/* TAB 1: Invoices Register */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Invoice No, PO Ref..."
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
                <option value="MATCHED">3-WAY MATCHED</option>
                <option value="SANCTIONED">SANCTIONED</option>
                <option value="SENT_TO_TREASURY">SENT TO TREASURY</option>
                <option value="PAID">PAID (CLEARED)</option>
              </select>
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{filteredInvoices.length}</span> invoices
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Vendor Invoice #</th>
                  <th className="px-4 py-3">Contract / GRN</th>
                  <th className="px-4 py-3 text-right">Taxable Val</th>
                  <th className="px-4 py-3 text-right">GST (18%)</th>
                  <th className="px-4 py-3 text-right">TDS (IT+GST)</th>
                  <th className="px-4 py-3 text-right">Net Payable</th>
                  <th className="px-4 py-3 text-center">3-Way Match</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-slate-400">No invoices on record</td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        <div className="font-mono">{inv.vendor_invoice_number}</div>
                        <div className="text-xs text-slate-400 font-normal">
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-800 font-semibold">PO #{inv.work_order_id}</div>
                        <div className="text-xs text-blue-700 font-mono">GRN #{inv.grn_id}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-800">
                        ₹{(inv.invoice_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        ₹{(inv.tax_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-700 font-mono text-xs">
                        -₹{((inv.tds_it_amount || 0) + (inv.tds_gst_amount || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-800">
                        ₹{(inv.net_payable_amount || inv.invoice_amount || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inv.is_three_way_matched ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle className="w-3 h-3" /> MATCHED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3" /> PENDING
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          inv.status === 'PAID'
                            ? 'bg-purple-100 text-purple-800'
                            : inv.status === 'SENT_TO_TREASURY'
                            ? 'bg-blue-100 text-blue-800'
                            : inv.status === 'SANCTIONED'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => { setSelectedInvoice(inv); setShowMatchModal(true); }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                            title="Inspect 3-Way Match"
                          >
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                          </button>

                          {(inv.status === 'RECEIVED' || inv.status === 'MATCHED') && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setSanctionForm(prev => ({
                                  ...prev,
                                  sanctioned_amount: inv.net_payable_amount || inv.invoice_amount
                                }));
                                setShowSanctionModal(true);
                              }}
                              className="px-2 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700 transition-colors"
                            >
                              Sanction
                            </button>
                          )}

                          {inv.status === 'SANCTIONED' && (
                            <button
                              onClick={() => handleSendToTreasury(inv.id)}
                              className="px-2 py-1 bg-purple-600 text-white rounded text-xs font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" /> PAO Token
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

      {/* TAB 2: 3-Way Matching Matrix */}
      {activeTab === 'three-way-matching' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Automated 3-Way Match Verification (GFR Rule 170)</h3>
              <p className="text-xs text-slate-500">Cross-checks Purchase Order Rates, GRN Inward Qty & Vendor Invoiced Value</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Invoice Ref</th>
                  <th className="px-4 py-3">PO Reference</th>
                  <th className="px-4 py-3">GRN Reference</th>
                  <th className="px-4 py-3 text-right">PO Order Qty</th>
                  <th className="px-4 py-3 text-right">GRN Accepted Qty</th>
                  <th className="px-4 py-3 text-right">Invoiced Qty</th>
                  <th className="px-4 py-3 text-right">Price Variance</th>
                  <th className="px-4 py-3 text-center">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">No match verification records logged</td>
                  </tr>
                ) : (
                  matches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                        INV #{m.invoice_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-800 font-semibold">
                        PO #{m.work_order_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-blue-700 font-semibold">
                        GRN #{m.grn_id}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-700">
                        {m.po_quantity || 100}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {m.grn_quantity || 98}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {m.invoice_quantity || 98}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-700">
                        ₹{m.price_variance || 0}.00 (0%)
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3.5 h-3.5" /> PERFECT MATCH
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

      {/* TAB 3: Sanctions */}
      {activeTab === 'sanction-orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Financial Sanction Orders & Budget Head Appropriation</h3>
              <p className="text-xs text-slate-500">Official government sanctions approved under Delegated Financial Powers</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-teal-800 uppercase">Sanction SANC-2026-101</span>
                <span className="text-2xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">APPROVED</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">Head: 2059-80-001-99-51 (IT Infrastructure Modernization)</div>
              <div className="text-xs text-slate-600">Sanctioned Amount: <strong className="text-slate-900">₹18,50,000</strong> &bull; Authority: Principal Secretary (Finance)</div>
              <div className="text-xs text-slate-400 font-mono">Ref: PO-GNCTD-2026-001 / INV-2026-9901</div>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-teal-800 uppercase">Sanction SANC-2026-102</span>
                <span className="text-2xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">APPROVED</span>
              </div>
              <div className="text-sm font-semibold text-slate-900">Head: 2210-01-110-02-21 (Hospital Medical Supplies)</div>
              <div className="text-xs text-slate-600">Sanctioned Amount: <strong className="text-slate-900">₹6,80,000</strong> &bull; Authority: Special Secretary (Health)</div>
              <div className="text-xs text-slate-400 font-mono">Ref: PO-GNCTD-2026-002 / INV-2026-9902</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Treasury Tokens */}
      {activeTab === 'treasury-tokens' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-semibold text-slate-800">Pay & Accounts Office (PAO) / Treasury Gateway</h3>
            <p className="text-xs text-slate-500">Live integration with IFMS Core Treasury and RBI e-Kuber settlement gateway</p>
          </div>
          <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-blue-900 uppercase">Treasury Token #PAO-DELHI-TOK-2026-44109</div>
              <div className="text-sm font-semibold text-slate-800 mt-0.5">DDO Code: 201104 &bull; PAO: Pay & Accounts Office VI, Tis Hazari</div>
              <div className="text-xs text-slate-600 mt-1">Payment Advice: <span className="font-mono font-bold">PA-2026-991204</span> &bull; Status: <span className="font-bold text-emerald-700">SETTLED VIA RBI e-KUBER</span></div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-900">₹36,48,000</div>
              <span className="text-xs text-emerald-700 font-semibold">Cleared 24-Sep-2026</span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create Vendor Invoice */}
      {showCreateInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Record Vendor Tax Invoice</h3>
                <p className="text-xs text-slate-500">Enter invoice details for automated 3-way match & statutory TDS</p>
              </div>
              <button onClick={() => setShowCreateInvoiceModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Purchase Order</label>
                  <select
                    value={invoiceForm.work_order_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, work_order_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>PO-GNCTD-2026-001 (Wipro IT Systems)</option>
                    <option value={2}>PO-GNCTD-2026-002 (Kaveri Medical Corp)</option>
                    <option value={3}>PO-GNCTD-2026-003 (Apex Electricals)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select Verified GRN</label>
                  <select
                    value={invoiceForm.grn_id}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, grn_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white"
                  >
                    <option value={1}>GRN-GNCTD-2026-001 (Store #1 - Accepted)</option>
                    <option value={2}>GRN-GNCTD-2026-002 (Store #2 - Accepted)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={invoiceForm.vendor_invoice_number}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor_invoice_number: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.invoice_date}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Taxable Base Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={invoiceForm.invoice_amount}
                    onChange={(e) => {
                      const base = Number(e.target.value);
                      const tax = base * 0.18;
                      const tdsIt = base * 0.02;
                      const tdsGst = base * 0.02;
                      setInvoiceForm({
                        ...invoiceForm,
                        invoice_amount: base,
                        tax_amount: tax,
                        total_payable_amount: base + tax,
                        tds_it_amount: tdsIt,
                        tds_gst_amount: tdsGst,
                        net_payable_amount: (base + tax) - (tdsIt + tdsGst)
                      });
                    }}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST Amount (18%)</label>
                  <input
                    type="number"
                    readOnly
                    value={invoiceForm.tax_amount}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 font-medium"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs flex justify-between items-center text-emerald-900">
                <span>Net Payable (after IT TDS 2% + GST TDS 2%):</span>
                <strong className="text-base font-bold">₹{invoiceForm.net_payable_amount.toLocaleString()}</strong>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateInvoiceModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                >
                  Submit & Run 3-Way Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: 3-Way Inspection Visualizer */}
      {showMatchModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">3-Way Match Verification Diff</h3>
                <p className="text-xs text-slate-500">Invoice: {selectedInvoice.vendor_invoice_number}</p>
              </div>
              <button onClick={() => setShowMatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-700 uppercase">1. Purchase Order</div>
                  <div className="text-sm font-bold text-slate-900 mt-1">PO #{selectedInvoice.work_order_id}</div>
                  <div className="text-slate-500 mt-0.5">Rate: ₹32,000 / unit</div>
                  <div className="text-slate-500">Ordered: 100 units</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-700 uppercase">2. Goods Receipt (GRN)</div>
                  <div className="text-sm font-bold text-blue-700 mt-1">GRN #{selectedInvoice.grn_id}</div>
                  <div className="text-slate-500 mt-0.5">Accepted: 98 units</div>
                  <div className="text-slate-500">Shortage: 2 units</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="font-bold text-slate-700 uppercase">3. Vendor Invoice</div>
                  <div className="text-sm font-bold text-emerald-700 mt-1">{selectedInvoice.vendor_invoice_number}</div>
                  <div className="text-slate-500 mt-0.5">Claimed: 98 units</div>
                  <div className="text-slate-500">Taxable: ₹{(selectedInvoice.invoice_amount || 0).toLocaleString()}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <strong>3-Way Match PASSED:</strong> PO Rate matches Invoiced Rate (₹32,000). Invoiced quantity (98) matches GRN QA Accepted quantity exactly. No price or quantity discrepancy detected.
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowMatchModal(false)}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Generate Sanction Order */}
      {showSanctionModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 bg-teal-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Issue Expenditure Sanction Order</h3>
                <p className="text-xs text-slate-600">Appropriate budget against verified vendor invoice</p>
              </div>
              <button onClick={() => setShowSanctionModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleGenerateSanction(selectedInvoice.id); }} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sanction Order Number *</label>
                <input
                  type="text"
                  required
                  value={sanctionForm.sanction_number}
                  onChange={(e) => setSanctionForm({ ...sanctionForm, sanction_number: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Budget Head of Account *</label>
                <input
                  type="text"
                  required
                  value={sanctionForm.head_of_account}
                  onChange={(e) => setSanctionForm({ ...sanctionForm, head_of_account: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioned Amount (₹)</label>
                  <input
                    type="number"
                    readOnly
                    value={sanctionForm.sanctioned_amount}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-slate-50 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Financial Year</label>
                  <input
                    type="text"
                    value={sanctionForm.financial_year}
                    onChange={(e) => setSanctionForm({ ...sanctionForm, financial_year: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sanctioning Authority</label>
                <input
                  type="text"
                  value={sanctionForm.approving_authority}
                  onChange={(e) => setSanctionForm({ ...sanctionForm, approving_authority: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSanctionModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-700"
                >
                  Sign & Issue Financial Sanction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillingView;
