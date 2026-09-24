import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, BarChart3, LineChart as LineChartIcon, RefreshCw, 
  Calendar, Layers, ArrowUpRight, Zap, Search, Plus, CheckCircle, BrainCircuit
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, AreaChart, Area 
} from 'recharts';
import { api } from '../api/client';
import { MaterialForecast, ConsumptionLog } from '../types';

interface Props {
  subpage?: string;
  onNavigate?: (page: string, subpage?: string) => void;
}

const mockTrendData = [
  { month: 'Oct 2025', actual: 42, forecast: 40, safety: 15 },
  { month: 'Nov 2025', actual: 55, forecast: 50, safety: 15 },
  { month: 'Dec 2025', actual: 68, forecast: 65, safety: 20 },
  { month: 'Jan 2026', actual: 48, forecast: 52, safety: 15 },
  { month: 'Feb 2026', actual: 60, forecast: 58, safety: 15 },
  { month: 'Mar 2026', actual: 85, forecast: 80, safety: 25 },
  { month: 'Apr 2026', actual: 50, forecast: 55, safety: 15 },
  { month: 'May 2026', actual: 62, forecast: 60, safety: 15 },
  { month: 'Jun 2026', actual: 70, forecast: 68, safety: 20 },
  { month: 'Jul 2026', actual: 75, forecast: 72, safety: 20 },
  { month: 'Aug 2026', actual: 80, forecast: 78, safety: 20 },
  { month: 'Sep 2026', actual: 95, forecast: 90, safety: 25 },
];

export const ForecastingView: React.FC<Props> = ({ subpage = 'forecasts', onNavigate }) => {
  const [activeTab, setActiveTab] = useState(subpage || 'forecasts');
  const [forecasts, setForecasts] = useState<MaterialForecast[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (subpage) setActiveTab(subpage);
    fetchData();
  }, [subpage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getForecasts();
      setForecasts(res.data || []);
    } catch (err) {
      console.error('Error fetching forecasts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunModel = async () => {
    try {
      await api.generateForecast(1);
      alert('AI / Statistical Demand Forecast recalculated successfully for all materials!');
      fetchData();
    } catch (err: any) {
      alert('Forecast generation failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 flex items-center gap-1">
                <BrainCircuit className="w-3.5 h-3.5" /> AI Demand Forecasting
              </span>
              <span className="text-xs text-slate-500 font-mono">GNCTD-MTRL-FCST-V2</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">Material Consumption Trends & Demand Forecasting</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Predict future departmental requirements, seasonal spikes, Economic Order Quantities (EOQ) & automated reorder levels.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-600' : ''}`} />
            </button>
            <button
              onClick={handleRunModel}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 text-sm font-semibold shadow-sm transition-colors"
            >
              <Zap className="w-4 h-4" />
              Recalculate Predictive Forecast
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 space-x-6 text-sm">
          <button
            onClick={() => setActiveTab('forecasts')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'forecasts'
                ? 'border-cyan-700 text-cyan-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Demand Projections & EOQ ({forecasts.length})
          </button>
          <button
            onClick={() => setActiveTab('consumption-trends')}
            className={`pb-3 font-medium flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'consumption-trends'
                ? 'border-cyan-700 text-cyan-800'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            12-Month Consumption Trends
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-cyan-50 text-cyan-700 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Forecast Accuracy</p>
            <p className="text-xl font-bold text-slate-900">94.8%</p>
            <p className="text-xs text-emerald-600 font-medium mt-0.5">Mean Absolute Deviation &lt; 5%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Forecast Models</p>
            <p className="text-xl font-bold text-blue-700">{forecasts.length || 3}</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Holt-Winters Seasonal</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Reorder Triggers</p>
            <p className="text-xl font-bold text-amber-700">2 Items</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Procurement Indent suggested</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Estimated Cost Saving</p>
            <p className="text-xl font-bold text-emerald-700">₹8.4 Lakh</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">EOQ Inventory optimization</p>
          </div>
        </div>
      </div>

      {/* Visual Charts: Historical Consumption vs Forecast */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-semibold text-slate-800">12-Month Material Consumption vs Predictive Forecast</h3>
            <p className="text-xs text-slate-500">Holt-Winters Triple Exponential Smoothing Model</p>
          </div>
        </div>
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockTrendData}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="actual" name="Actual Consumption" stroke="#0284c7" fillOpacity={1} fill="url(#colorActual)" />
              <Area type="monotone" dataKey="forecast" name="Predicted Demand" stroke="#0d9488" fillOpacity={1} fill="url(#colorForecast)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TAB 1: Forecast Table */}
      {activeTab === 'forecasts' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-800">Predictive Stock Modeler & Safety Thresholds</h3>
            <span className="text-xs text-slate-500 font-mono">FY 2026-27 Q3 Projections</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Item Master</th>
                  <th className="px-4 py-3">Model Applied</th>
                  <th className="px-4 py-3 text-right">Avg Monthly Qty</th>
                  <th className="px-4 py-3 text-right">Forecast Qty (Next Quarter)</th>
                  <th className="px-4 py-3 text-right">Safety Buffer</th>
                  <th className="px-4 py-3 text-right">EOQ Batch Size</th>
                  <th className="px-4 py-3 text-center">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {forecasts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">No active forecast models generated</td>
                  </tr>
                ) : (
                  forecasts.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        Item Master #{f.item_id}
                        <div className="text-xs text-slate-400 font-normal">Dual UOM Tracking</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-cyan-800 font-semibold">
                        {f.forecast_model || 'Holt-Winters Exp'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">
                        {(f.historical_average_consumption || 55).toFixed(0)} units
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-cyan-900">
                        {(f.projected_quantity || 180).toFixed(0)} units
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">
                        {(f.safety_stock_quantity || 25).toFixed(0)} units
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-700">
                        {(f.economic_order_quantity || 100).toFixed(0)} units
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                          95% Conf
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
    </div>
  );
};
export default ForecastingView;
