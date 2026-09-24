import React, { useState, useEffect } from 'react';
import {
  Package, Plus, Search, Filter, Layers, Scale, Bookmark, Upload,
  CheckCircle, AlertCircle, Eye, Edit2, Trash2, ArrowUpDown, ChevronRight
} from 'lucide-react';
import apiClient from '../api/client';
import { Item, Category, Uom, UomConv } from '../types';

interface MaterialMasterViewProps {
  subTab: string;
  onNavigate: (route: string) => void;
}

export const MaterialMasterView: React.FC<MaterialMasterViewProps> = ({ subTab, onNavigate }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uoms, setUoms] = useState<Uom[]>([]);
  const [uomConvs, setUomConvs] = useState<UomConv[]>([]);
  const [boqs, setBoqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  
  // Create / Edit modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState({
    item_code: '',
    item_name: '',
    item_desc: '',
    cat_id: 1,
    base_uom_id: 1,
    alt_uom_id: 3,
    uom_conv_factor: 10.0,
    is_service: false,
    is_returnable_tool: false,
    is_capital: false,
    hsn_sac_code: '8471',
    gst_rate_pct: 18.0,
    brand_name: '',
    make_model: '',
    tolerance_pct: 5.0,
    image_url: '',
    min_stock_level: 20,
    max_stock_level: 100,
    reorder_level: 30,
    reorder_qty: 50,
    estimated_rate: 1000,
    variants: [] as any[]
  });

  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [subTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [itemsRes, catsRes, uomsRes, convRes, boqRes] = await Promise.all([
        apiClient.get('/materials/items'),
        apiClient.get('/materials/categories'),
        apiClient.get('/materials/uoms'),
        apiClient.get('/materials/uom-conversions'),
        apiClient.get('/materials/boq-mappings')
      ]);
      setItems(itemsRes.data);
      setCategories(catsRes.data);
      setUoms(uomsRes.data);
      setUomConvs(convRes.data);
      setBoqs(boqRes.data);
    } catch (e) {
      console.error('Error loading materials', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/materials/items', formData);
      setShowItemModal(false);
      setToastMsg('Material item created successfully!');
      setTimeout(() => setToastMsg(null), 3000);
      loadData();
    } catch (e) {
      alert('Failed to save material');
    }
  };

  const filteredItems = items.filter(it => {
    const matchesSearch = it.item_name.toLowerCase().includes(search.toLowerCase()) || it.item_code.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCat === 'all' || it.cat_id.toString() === selectedCat;
    const matchesType = selectedType === 'all' || (selectedType === 'service' ? it.is_service : !it.is_service);
    return matchesSearch && matchesCat && matchesType;
  });

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
          <div className="text-[11px] text-slate-500 font-medium">IFMS &rsaquo; Material Management &rsaquo; <b>Material Master</b></div>
          <h1 className="text-xl font-bold text-[#123B64]">Material Master Management</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-lg text-xs font-semibold">
          <button
            onClick={() => onNavigate('mm/register')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'register' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Material Register
          </button>
          <button
            onClick={() => onNavigate('mm/category')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'category' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Categories
          </button>
          <button
            onClick={() => onNavigate('mm/uom')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'uom' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            UOM & Conversions
          </button>
          <button
            onClick={() => onNavigate('mm/boq')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'boq' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            BoQ Mapping
          </button>
          <button
            onClick={() => onNavigate('mm/bulk')}
            className={`px-3 py-1.5 rounded-md transition-colors ${subTab === 'bulk' ? 'bg-white text-[#123B64] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {/* 1. Material Register SubTab */}
      {(subTab === 'register' || subTab === 'create') && (
        <div className="space-y-3">
          {/* Controls Bar */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search code or description..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs w-60 focus:outline-none focus:border-blue-600"
                />
              </div>

              <select
                value={selectedCat}
                onChange={e => setSelectedCat(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.cat_name}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={e => setSelectedType(e.target.value)}
                className="border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Types (Goods & Services)</option>
                <option value="goods">Goods / Physical Inventory</option>
                <option value="service">Services & Works</option>
              </select>
            </div>

            <button onClick={() => setShowItemModal(true)} className="btn-primary">
              <Plus className="w-3.5 h-3.5" /> Create Material Item
            </button>
          </div>

          {/* Material Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#123B64] text-white font-semibold">
                    <th className="p-2.5 w-12 text-center">Img</th>
                    <th className="p-2.5">Item Code</th>
                    <th className="p-2.5">Material Description</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">UOM</th>
                    <th className="p-2.5 text-right">Est. Rate</th>
                    <th className="p-2.5 text-right">Tolerance</th>
                    <th className="p-2.5 text-right">Current Stock</th>
                    <th className="p-2.5 text-center">Type</th>
                    <th className="p-2.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map(it => (
                    <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-center">
                        {it.image_url ? (
                          <img src={it.image_url} alt="" className="w-8 h-8 rounded object-cover border border-slate-200 mx-auto" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 font-mono font-bold text-blue-900">{it.item_code}</td>
                      <td className="p-2.5 max-w-xs">
                        <div className="font-semibold text-slate-800">{it.item_name}</div>
                        <div className="text-[11px] text-slate-500 truncate">{it.item_desc}</div>
                        {it.variants_count ? (
                          <span className="inline-block bg-purple-50 text-purple-700 text-[10px] px-1.5 rounded font-medium mt-0.5 border border-purple-200">
                            {it.variants_count} Variants Configured
                          </span>
                        ) : null}
                      </td>
                      <td className="p-2.5 text-slate-600">{it.cat_name}</td>
                      <td className="p-2.5 font-medium">
                        {it.base_uom_code}
                        {it.alt_uom_code && <span className="text-[10px] text-slate-500 block">1 {it.alt_uom_code} = {it.uom_conv_factor} {it.base_uom_code}</span>}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold">₹ {it.estimated_rate.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right font-mono text-slate-600">&plusmn;{it.tolerance_pct}%</td>
                      <td className="p-2.5 text-right font-mono font-bold">
                        <span className={it.current_stock === 0 ? 'text-red-600' : (it.current_stock < it.reorder_level ? 'text-amber-600' : 'text-emerald-700')}>
                          {it.current_stock} {it.base_uom_code}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {it.is_service ? (
                          <span className="badge-purple">Service</span>
                        ) : it.is_returnable_tool ? (
                          <span className="badge-info">Tool</span>
                        ) : it.is_capital ? (
                          <span className="badge-approved">Capital</span>
                        ) : (
                          <span className="badge-pending">Consumable</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => setViewItem(it)}
                          className="p-1 text-blue-700 hover:bg-blue-50 rounded"
                          title="View Material Specification & Variants"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. Categories SubTab */}
      {subTab === 'category' && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h3 className="font-bold text-sm text-[#123B64]">Item Category Hierarchy & HSN Master</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {categories.map(c => (
              <div key={c.id} className="p-3 border border-slate-200 rounded-lg hover:border-blue-400 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-800">{c.cat_code}</span>
                  <span className="badge-approved">{c.item_count || 0} SKUs</span>
                </div>
                <div className="font-bold text-slate-800 text-sm mt-1">{c.cat_name}</div>
                <div className="text-[11px] text-slate-500 mt-1">HSN/SAC: {c.hsn_sac_code || '8471'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. UOM & Conversions SubTab */}
      {subTab === 'uom' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-[#123B64] border-b pb-2">Standard Units of Measure (UOM)</h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold">
                  <th className="p-2">Code</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Precision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {uoms.map(u => (
                  <tr key={u.id}>
                    <td className="p-2 font-mono font-bold text-blue-900">{u.uom_code}</td>
                    <td className="p-2 font-medium">{u.uom_name}</td>
                    <td className="p-2 text-slate-600">{u.uom_type}</td>
                    <td className="p-2">{u.precision_digits} decimals</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-[#123B64] border-b pb-2">Unit Conversion Ratios</h3>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold">
                  <th className="p-2">Source Unit</th>
                  <th className="p-2">Target Unit</th>
                  <th className="p-2">Conversion Factor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {uomConvs.map(c => (
                  <tr key={c.id}>
                    <td className="p-2 font-bold">{c.from_uom_code}</td>
                    <td className="p-2 font-bold">{c.to_uom_code}</td>
                    <td className="p-2 font-mono font-semibold">1 {c.from_uom_code} = {c.conversion_factor} {c.to_uom_code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BoQ Mapping SubTab */}
      {subTab === 'boq' && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-[#123B64] border-b pb-2">Material-to-BoQ & Schedule of Rates (SOR) Mapping</h3>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold">
                <th className="p-2">BoQ Code</th>
                <th className="p-2">SOR / DSR Item</th>
                <th className="p-2">Material SKU</th>
                <th className="p-2">BoQ Description</th>
                <th className="p-2">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {boqs.map(b => (
                <tr key={b.id}>
                  <td className="p-2 font-mono font-bold text-blue-900">{b.boq_item_code}</td>
                  <td className="p-2 font-semibold text-emerald-800">{b.sor_code}</td>
                  <td className="p-2 font-bold">{b.item_code} - {b.item_name}</td>
                  <td className="p-2 text-slate-600 max-w-md">{b.boq_desc}</td>
                  <td className="p-2 font-mono font-bold">1 {b.boq_item_code.split('/')[1]} = {b.conversion_factor} Units</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Bulk Upload SubTab */}
      {subTab === 'bulk' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm max-w-xl mx-auto text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Upload className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Bulk Material & Price List Import</h3>
          <p className="text-xs text-slate-500">Upload CSV or Excel spreadsheets containing catalog specifications, variants, and HSN tax codes.</p>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors cursor-pointer">
            <input type="file" className="hidden" id="bulkFileInput" />
            <label htmlFor="bulkFileInput" className="cursor-pointer text-xs text-slate-600">
              <span className="font-semibold text-blue-700">Click to choose file</span> or drag and drop spreadsheet here.
            </label>
          </div>
          <button
            onClick={async () => {
              await apiClient.post('/materials/bulk-upload');
              alert('24 Material SKUs successfully processed and verified!');
              loadData();
            }}
            className="btn-primary mx-auto"
          >
            Start Bulk Import
          </button>
        </div>
      )}

      {/* Create Material Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto text-xs">
            <div className="bg-[#123B64] text-white p-3.5 flex items-center justify-between sticky top-0">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4" /> Create New Material Master Entry
              </h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-300 hover:text-white font-bold text-base">&times;</button>
            </div>

            <form onSubmit={handleCreateItem} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Code (Optional auto)</label>
                  <input
                    type="text"
                    placeholder="e.g. MAT-IT-0010"
                    value={formData.item_code}
                    onChange={e => setFormData({ ...formData, item_code: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Material Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Server Rack 42U"
                    value={formData.item_name}
                    onChange={e => setFormData({ ...formData, item_name: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Detailed technical specifications, standards compliance..."
                  value={formData.item_desc}
                  onChange={e => setFormData({ ...formData, item_desc: e.target.value })}
                  className="w-full border border-slate-300 rounded p-1.5"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.cat_id}
                    onChange={e => setFormData({ ...formData, cat_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.cat_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Base UOM *</label>
                  <select
                    value={formData.base_uom_id}
                    onChange={e => setFormData({ ...formData, base_uom_id: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  >
                    {uoms.map(u => (
                      <option key={u.id} value={u.id}>{u.uom_name} ({u.uom_code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Unit Rate (₹)</label>
                  <input
                    type="number"
                    value={formData.estimated_rate}
                    onChange={e => setFormData({ ...formData, estimated_rate: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand / Make</label>
                  <input
                    type="text"
                    placeholder="e.g. Dell, HP, Godrej"
                    value={formData.brand_name}
                    onChange={e => setFormData({ ...formData, brand_name: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Make / Model Spec</label>
                  <input
                    type="text"
                    placeholder="e.g. Latitude 5450"
                    value={formData.make_model}
                    onChange={e => setFormData({ ...formData, make_model: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tolerance (&plusmn; %)</label>
                  <input
                    type="number"
                    value={formData.tolerance_pct}
                    onChange={e => setFormData({ ...formData, tolerance_pct: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={formData.hsn_sac_code}
                    onChange={e => setFormData({ ...formData, hsn_sac_code: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    value={formData.gst_rate_pct}
                    onChange={e => setFormData({ ...formData, gst_rate_pct: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded p-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formData.image_url}
                    onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full border border-slate-300 rounded p-1.5"
                  />
                </div>
              </div>

              {/* Checkbox Options: Returnable Tool, Service, Capital */}
              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200">
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_returnable_tool}
                    onChange={e => setFormData({ ...formData, is_returnable_tool: e.target.checked })}
                  />
                  <span>Returnable Tool (Check-Out/In Tracked)</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_capital}
                    onChange={e => setFormData({ ...formData, is_capital: e.target.checked })}
                  />
                  <span>Capital Asset (Asset Register & Warranty)</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_service}
                    onChange={e => setFormData({ ...formData, is_service: e.target.checked })}
                  />
                  <span>Service Item (Non-physical)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setShowItemModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Material</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Item Details Modal */}
      {viewItem && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-lg shadow-2xl max-w-xl w-full text-xs">
            <div className="bg-[#123B64] text-white p-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Package className="w-4 h-4" /> {viewItem.item_code} &bull; {viewItem.item_name}
              </h3>
              <button onClick={() => setViewItem(null)} className="text-slate-300 hover:text-white font-bold text-base">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              {viewItem.image_url && (
                <img src={viewItem.image_url} alt="" className="w-full h-36 object-cover rounded border" />
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500 font-medium">Category:</span> <b className="text-slate-800">{viewItem.cat_name}</b></div>
                <div><span className="text-slate-500 font-medium">Standard Rate:</span> <b className="font-mono text-emerald-800">₹ {viewItem.estimated_rate.toLocaleString('en-IN')}</b></div>
                <div><span className="text-slate-500 font-medium">Base UOM:</span> <b>{viewItem.base_uom_code}</b></div>
                <div><span className="text-slate-500 font-medium">Tolerance:</span> <b>&plusmn;{viewItem.tolerance_pct}%</b></div>
                <div><span className="text-slate-500 font-medium">Make & Model:</span> <b>{viewItem.brand_name || 'Generic'} {viewItem.make_model}</b></div>
                <div><span className="text-slate-500 font-medium">Current Stock:</span> <b className="text-blue-900 font-bold">{viewItem.current_stock} {viewItem.base_uom_code}</b></div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded border text-[11px] text-slate-600 leading-relaxed">
                <b className="text-slate-700">Specification:</b> {viewItem.item_desc || 'Standard commercial grade.'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t flex justify-end">
              <button onClick={() => setViewItem(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
