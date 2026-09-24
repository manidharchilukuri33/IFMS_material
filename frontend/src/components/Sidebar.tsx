import React, { useState } from 'react';
import {
  LayoutDashboard, Package, FileText, ShoppingCart, Truck,
  CheckSquare, Warehouse, CreditCard, ShieldAlert, Trash2,
  ClipboardCheck, TrendingUp, BarChart3, Settings, ChevronDown, ChevronRight
} from 'lucide-react';

interface NavGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  route?: string;
  badge?: number;
  items?: { label: string; route: string; badge?: number }[];
}

interface SidebarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  counts?: { [key: string]: number };
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, onNavigate, counts = {} }) => {
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({
    'mm': true,
    'req': true,
    'proc': true,
    'wo': true,
    'grn': true,
    'inv': true,
    'billing': true
  });

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => ({ ...prev, [id]: !prev [id] }));
  };

  const navGroups: NavGroup[] = [
    {
      id: 'dash',
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-400" />,
      route: 'dash'
    },
    {
      id: 'mm',
      title: 'Material Master',
      icon: <Package className="w-4 h-4 text-amber-400" />,
      items: [
        { label: 'Material Register', route: 'mm/register' },
        { label: 'Create Material', route: 'mm/create' },
        { label: 'Material Category', route: 'mm/category' },
        { label: 'UOM Master', route: 'mm/uom' },
        { label: 'Material-BoQ Mapping', route: 'mm/boq' },
        { label: 'Bulk Upload', route: 'mm/bulk' }
      ]
    },
    {
      id: 'req',
      title: 'Requisition Management',
      icon: <FileText className="w-4 h-4 text-emerald-400" />,
      badge: counts.awaitApp,
      items: [
        { label: 'Create Requisition', route: 'req/create' },
        { label: 'My Requisitions', route: 'req/list' },
        { label: 'Pending Approvals', route: 'req/approvals', badge: counts.awaitApp },
        { label: 'Requisition Consolidation', route: 'req/conso' }
      ]
    },
    {
      id: 'proc',
      title: 'Procurement Management',
      icon: <ShoppingCart className="w-4 h-4 text-teal-400" />,
      items: [
        { label: 'Annual Procurement Plan', route: 'proc/app' },
        { label: 'Tender Management', route: 'proc/tenders' },
        { label: 'Quotation / Bid Entry', route: 'proc/quotes' },
        { label: 'Comparative Evaluation', route: 'proc/eval' },
        { label: 'EMD and PBG Tracker', route: 'proc/emd' }
      ]
    },
    {
      id: 'wo',
      title: 'Work Order Management',
      icon: <Truck className="w-4 h-4 text-cyan-400" />,
      badge: counts.delayed,
      items: [
        { label: 'Create Work Order', route: 'wo/create' },
        { label: 'Work Order Register', route: 'wo/list' },
        { label: 'WO Amendments', route: 'wo/amend' },
        { label: 'Delivery Tracking', route: 'wo/delivery', badge: counts.delayed }
      ]
    },
    {
      id: 'grn',
      title: 'Goods Receipt (GRN)',
      icon: <CheckSquare className="w-4 h-4 text-orange-400" />,
      badge: counts.pendInsp,
      items: [
        { label: 'Create GRN', route: 'grn/create' },
        { label: 'GRN Register', route: 'grn/list' },
        { label: 'Inspection Register', route: 'grn/inspection', badge: counts.pendInsp },
        { label: 'Return to Vendor', route: 'grn/rtv' }
      ]
    },
    {
      id: 'inv',
      title: 'Inventory Integration',
      icon: <Warehouse className="w-4 h-4 text-purple-400" />,
      badge: counts.lowStock,
      items: [
        { label: 'Stock Overview', route: 'inv/stock', badge: counts.lowStock },
        { label: 'Material Movement', route: 'inv/movement' },
        { label: 'Stock Transfer', route: 'inv/transfer' },
        { label: 'Stock Issue', route: 'inv/issue' },
        { label: 'Stock Return', route: 'inv/return' },
        { label: 'Tool Daily Check-Out', route: 'inv/tools' }
      ]
    },
    {
      id: 'billing',
      title: 'Billing & Finance Interface',
      icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
      badge: counts.bills,
      items: [
        { label: 'Invoice Register', route: 'billing/invoice' },
        { label: 'Three-Way Matching', route: 'billing/match', badge: counts.bills },
        { label: 'Bill Initiation', route: 'billing/initiate' },
        { label: 'Payment Status', route: 'billing/payment' }
      ]
    },
    {
      id: 'warranty',
      title: 'Warranty & Defects',
      icon: <ShieldAlert className="w-4 h-4 text-red-400" />,
      badge: counts.defects,
      items: [
        { label: 'Warranty Register', route: 'warranty/list' },
        { label: 'Defect Complaints', route: 'warranty/defects', badge: counts.defects }
      ]
    },
    {
      id: 'disp',
      title: 'Disposal Management',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      badge: counts.disposal,
      items: [
        { label: 'Disposal Proposal', route: 'disp/proposal' },
        { label: 'Auction / Scrap Sale', route: 'disp/auction' }
      ]
    },
    {
      id: 'audit',
      title: 'Stock Audit & Recon',
      icon: <ClipboardCheck className="w-4 h-4 text-yellow-400" />,
      items: [
        { label: 'Physical Verification', route: 'audit/pv' },
        { label: 'Stock Adjustment', route: 'audit/adjust' }
      ]
    },
    {
      id: 'fc',
      title: 'Demand Forecasting',
      icon: <TrendingUp className="w-4 h-4 text-indigo-400" />,
      items: [
        { label: 'Consumption Trends', route: 'fc/consumption' },
        { label: 'Demand Forecast', route: 'fc/forecast' }
      ]
    },
    {
      id: 'rep',
      title: 'Reports and MIS',
      icon: <BarChart3 className="w-4 h-4 text-blue-300" />,
      items: [
        { label: 'Procurement MIS', route: 'rep/procurement' },
        { label: 'Inventory MIS', route: 'rep/inventory' },
        { label: 'Vendor Performance', route: 'rep/vendor' },
        { label: 'Audit Trail', route: 'rep/trail' }
      ]
    },
    {
      id: 'admin',
      title: 'Administration',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      items: [
        { label: 'Workflow Configuration', route: 'admin/workflow' },
        { label: 'Approval Limits', route: 'admin/limits' },
        { label: 'Integration Monitor', route: 'admin/integration' }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#07182b] text-slate-300 flex-shrink-0 flex flex-col h-[calc(100vh-80px)] sticky top-[80px] select-none border-r border-slate-800 text-xs overflow-y-auto">
      <div className="py-2 space-y-0.5">
        {navGroups.map((group) => {
          if (group.route) {
            const isActive = currentRoute === group.route;
            return (
              <div
                key={group.id}
                onClick={() => onNavigate(group.route!)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer font-medium transition-colors ${
                  isActive
                    ? 'bg-[#123B64] text-white font-semibold border-l-4 border-amber-400 pl-2'
                    : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {group.icon}
                  <span>{group.title}</span>
                </div>
              </div>
            );
          }

          const isOpen = openGroups[group.id];
          const hasActiveChild = group.items?.some(i => i.route === currentRoute);

          return (
            <div key={group.id} className="space-y-0.5">
              <div
                onClick={() => toggleGroup(group.id)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer font-medium transition-colors ${
                  hasActiveChild ? 'text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {group.icon}
                  <span className="truncate">{group.title}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {group.badge !== undefined && group.badge > 0 && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] px-1.5 py-0.2 rounded font-bold font-mono">
                      {group.badge}
                    </span>
                  )}
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                </div>
              </div>

              {isOpen && group.items && (
                <div className="pl-8 pr-2 space-y-0.5 py-0.5 bg-slate-950/40 border-l border-slate-800 ml-4">
                  {group.items.map((item) => {
                    const isSubActive = currentRoute === item.route;
                    return (
                      <div
                        key={item.route}
                        onClick={() => onNavigate(item.route)}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                          isSubActive
                            ? 'bg-[#1E5A96] text-white font-semibold'
                            : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1 rounded font-bold font-mono">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};
