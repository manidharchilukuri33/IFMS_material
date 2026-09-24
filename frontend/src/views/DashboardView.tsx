import React, { useState, useEffect } from 'react';
import {
  FileText, Clock, ShoppingBag, AlertTriangle, CheckSquare,
  Warehouse, ShieldAlert, Trash2, CreditCard, RefreshCw, Printer, ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import apiClient from '../api/client';
import { DashboardStats } from '../types';

interface DashboardViewProps {
  onNavigate: (route: string) => void;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onRefresh }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/dashboard/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val: number) => {
    return '₹ ' + (val || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <div>Loading real-time executive dashboard from PostgreSQL 17...</div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="text-[11px] text-slate-500 font-medium">IFMS &rsaquo; Material Management &rsaquo; <b>Executive Dashboard</b></div>
          <h1 className="text-xl font-bold text-[#123B64]">Executive Dashboard &bull; FY 2026-27</h1>
          <p className="text-xs text-slate-600">Material Management position for Directorate of Information Technology (HQ)</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDashboardStats} className="btn-secondary">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Portals
          </button>
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-3.5 h-3.5" /> Print MIS
          </button>
          <button onClick={() => onNavigate('req/create')} className="btn-primary">
            + New Requisition
          </button>
        </div>
      </div>

      {/* Row 1: High Priority KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div onClick={() => onNavigate('req/list')} className="kpi-card cursor-pointer border-l-4 border-l-blue-600">
          <div className="text-xs font-semibold text-slate-600">Pending Requisitions</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.pendReq}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all departments</div>
        </div>

        <div onClick={() => onNavigate('req/approvals')} className="kpi-card cursor-pointer border-l-4 border-l-amber-500 bg-amber-50/20">
          <div className="text-xs font-semibold text-amber-900">Awaiting Approval</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats.awaitApp}</div>
          <div className="text-[11px] text-amber-800 mt-0.5">With approving authority</div>
        </div>

        <div onClick={() => onNavigate('wo/list')} className="kpi-card cursor-pointer border-l-4 border-l-teal-600">
          <div className="text-xs font-semibold text-slate-600">Open Work Orders</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.openWo}</div>
          <div className="text-[11px] text-teal-700 mt-0.5">{stats.woDue} due this week</div>
        </div>

        <div onClick={() => onNavigate('wo/delivery')} className="kpi-card cursor-pointer border-l-4 border-l-red-500 bg-red-50/20">
          <div className="text-xs font-semibold text-red-900">Delayed Deliveries</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{stats.delayed}</div>
          <div className="text-[11px] text-red-800 mt-0.5">Past contractual due date</div>
        </div>

        <div onClick={() => onNavigate('grn/list')} className="kpi-card cursor-pointer border-l-4 border-l-orange-500">
          <div className="text-xs font-semibold text-slate-600">Pending GRNs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.pendGrn}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Awaiting store posting</div>
        </div>
      </div>

      {/* Row 2: Secondary Operational KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div onClick={() => onNavigate('grn/inspection')} className="kpi-card cursor-pointer border-l-4 border-l-orange-400">
          <div className="text-xs font-semibold text-slate-600">Pending Inspections</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.pendInsp}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">QA Board testing due</div>
        </div>

        <div onClick={() => onNavigate('inv/stock')} className="kpi-card cursor-pointer border-l-4 border-l-amber-500">
          <div className="text-xs font-semibold text-slate-600">Low Stock Materials</div>
          <div className="text-2xl font-bold text-amber-700 mt-1">{stats.lowStock}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Below safety reorder level</div>
        </div>

        <div onClick={() => onNavigate('inv/stock')} className="kpi-card cursor-pointer border-l-4 border-l-red-600">
          <div className="text-xs font-semibold text-slate-600">Stock-out Items</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{stats.stockOut}</div>
          <div className="text-[11px] text-red-700 mt-0.5">Nil balance in central store</div>
        </div>

        <div onClick={() => onNavigate('warranty/defects')} className="kpi-card cursor-pointer border-l-4 border-l-red-500">
          <div className="text-xs font-semibold text-slate-600">Open Defect Tickets</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{stats.defects}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Vendor redressal pending</div>
        </div>

        <div onClick={() => onNavigate('billing/match')} className="kpi-card cursor-pointer border-l-4 border-l-emerald-600">
          <div className="text-xs font-semibold text-slate-600">Pending Vendor Bills</div>
          <div className="text-2xl font-bold text-emerald-800 mt-1">{stats.bills}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">3-Way match in progress</div>
        </div>
      </div>

      {/* Row 3: Pipeline & Inventory Valuations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* End-to-End Pipeline Stage Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> Procurement & Material Lifecycle Pipeline
            </h3>
            <span className="text-[11px] text-slate-500">Active Cases</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="stage" angle={-25} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E5A96" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Ledger Valuations Summary */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Warehouse className="w-4 h-4 text-emerald-700" /> Store Valuation Summary
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Available Stock:</span>
                <span className="font-bold text-slate-900">{formatINR(stats.stockVal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Allocated / Reserved:</span>
                <span className="font-bold text-amber-700">{formatINR(stats.resVal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Quarantine & Damaged:</span>
                <span className="font-bold text-red-700">{formatINR(stats.blkVal)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-600">Condemnation / Disposal:</span>
                <span className="font-bold text-purple-700">{formatINR(stats.dispVal)}</span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-extrabold text-[#123B64]">
                <span>Total Assets Mapped:</span>
                <span>{formatINR(Number(stats.stockVal) + Number(stats.resVal) + Number(stats.blkVal))}</span>
              </div>
            </div>
          </div>
          <button onClick={() => onNavigate('inv/stock')} className="btn-secondary w-full justify-center mt-3">
            Open Stock Overview &rsaquo;
          </button>
        </div>
      </div>

      {/* Row 4: Mode of Procurement, Delivery Distribution, Top Rated Vendors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delivery Performance Breakdown */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-2">
            Delivery Performance
          </h3>
          <div className="space-y-2 text-xs mt-3">
            {stats.deliveryStatus.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                  <span className="text-slate-700 font-medium">{d.name}</span>
                </div>
                <span className="font-bold font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Aging Profile */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-2">
            Stock Movement & Aging Profile
          </h3>
          <div className="space-y-2 text-xs mt-3">
            {stats.stockAging.map((a, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }}></span>
                  <span className="text-slate-700 font-medium">{a.name}</span>
                </div>
                <span className="font-bold font-mono">{a.value} SKUs</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Rated GeM Suppliers */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-2 border-b border-slate-100 pb-2">
            Top Rated Suppliers
          </h3>
          <div className="space-y-2 text-xs mt-2 divide-y divide-slate-100">
            {stats.topVendors.slice(0, 4).map((v, i) => (
              <div key={i} className="pt-2 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800 truncate w-44">{v.name}</div>
                  <div className="text-[10px] text-slate-500">{v.city} &bull; {v.gstin}</div>
                </div>
                <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200 text-xs">
                  ★ {v.rating.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
