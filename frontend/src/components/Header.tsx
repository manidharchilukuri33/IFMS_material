import React, { useState, useEffect } from 'react';
import { Bell, Search, User, RefreshCw, Printer, Shield, FileText, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import apiClient from '../api/client';
import { NotificationItem } from '../types';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRoute, onNavigate, onRefresh }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/admin/notifications');
      setNotifications(res.data);
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
  };

  const markAllRead = async () => {
    try {
      await apiClient.put('/admin/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="ifms-header text-white sticky top-0 z-30 shadow-md">
      {/* Top Bar */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20 shadow-inner">
            <span className="font-bold text-base text-amber-400">GN</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wide text-white">IFMS GNCTD</span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40 font-semibold">
                GOVERNMENT OF NCT OF DELHI
              </span>
            </div>
            <div className="text-[11px] text-slate-300">Integrated Financial Management System &bull; Material Management System</div>
          </div>
        </div>

        {/* Global Controls & Profile */}
        <div className="flex items-center gap-3">
          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              placeholder="Search materials, indents, POs, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/60 text-xs text-white placeholder-slate-400 pl-8 pr-3 py-1.5 rounded border border-slate-600 focus:outline-none focus:border-amber-400 w-64"
            />
          </div>

          {/* Refresh Data */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Refresh All Portals"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-1.5 rounded hover:bg-white/10 text-slate-300 hover:text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden text-xs">
                <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between font-semibold">
                  <span>Notifications & Alerts ({notifications.length})</span>
                  <button onClick={markAllRead} className="text-blue-600 hover:underline text-[11px]">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.action_route) onNavigate(n.action_route.replace('/', ''));
                        setShowNotifMenu(false);
                      }}
                      className={`p-2.5 hover:bg-slate-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                    >
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        {n.title}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-white/10 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 font-bold flex items-center justify-center text-xs border border-amber-500/40">
                AK
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold leading-none">Anil Katwale</div>
                <div className="text-[10px] text-slate-300 leading-tight">Procurement Officer</div>
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden text-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <div className="font-bold text-slate-800">Anil Katwale</div>
                  <div className="text-[11px] text-slate-500">Directorate of Information Technology</div>
                  <div className="text-[10px] text-emerald-700 font-semibold mt-1">Approval Limit: ₹ 25,00,000</div>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { setShowUserMenu(false); setShowProfileModal(true); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-slate-500" /> My Profile & Delegation
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onNavigate('admin/roles'); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2"
                  >
                    <Shield className="w-3.5 h-3.5 text-slate-500" /> Roles & Permissions
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); onNavigate('rep/trail'); }}
                    className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-100 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" /> Activity Audit Trail
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Header Bar (Entity, Office, FY Badge, Live Sync status) */}
      <div className="px-4 py-1.5 bg-[#091D33] text-[11px] flex flex-wrap items-center justify-between text-slate-300 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div><span className="text-slate-400">Department:</span> <b className="text-white">Directorate of Information Technology</b></div>
          <div><span className="text-slate-400">Office:</span> <b className="text-white">Delhi Secretariat (HQ)</b></div>
          <div><span className="text-slate-400">Store Mapped:</span> <b className="text-white">IT Store – Delhi Secretariat</b></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono font-semibold">
            FY 2026-27 (OPEN)
          </span>
          <span className="text-emerald-400 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3 h-3" /> GeM / IFMS Sync Active
          </span>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-800 rounded-lg shadow-2xl max-w-md w-full overflow-hidden text-xs">
            <div className="bg-[#123B64] text-white p-3.5 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <User className="w-4 h-4" /> Official Profile & Delegation
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-300 hover:text-white font-bold text-base">&times;</button>
            </div>
            <div className="p-4 space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Employee Name:</span>
                <span className="font-bold text-slate-800">Anil Katwale</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Employee Code:</span>
                <span className="font-mono text-slate-800">GNCTD/DIT/04412</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Designation / Role:</span>
                <span className="font-semibold text-slate-800">Procurement Officer</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Department:</span>
                <span className="text-slate-800">Directorate of Information Technology</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Financial Delegation Limit:</span>
                <span className="font-bold text-emerald-700">₹ 25,00,000 per sanction</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Mapped Stores:</span>
                <span className="text-slate-800 text-right">IT Store – Delhi Sectt, Central Store – Civil Lines</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Database Node:</span>
                <span className="font-mono text-blue-700">PostgreSQL 17 (localhost:5432/ifms_jk)</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button onClick={() => setShowProfileModal(false)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
