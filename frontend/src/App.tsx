import React, { useEffect } from 'react';
import { initIFMS } from './services/ifms_core';

export function App() {
  useEffect(() => {
    // Mount and initialize the IFMS Material Management Application
    initIFMS();
  }, []);

  return (
    <div>
      {/* =============== TOP HEADER =============== */}
      <header className="topbar">
        <button className="tb-btn" id="btnSide" title="Toggle navigation" aria-label="Toggle navigation">
          &#9776;
        </button>
        <div className="logo" onClick={() => (window as any).goto?.('dash')} style={{ cursor: 'pointer' }}>
          <div className="mark">
            <span>GNCTD</span>
            <span style={{ fontSize: '6px', opacity: 0.8 }}>IFMS</span>
          </div>
          <div>
            <div className="t1">IFMS &ndash; Material Management</div>
            <div className="t2">Integrated Financial Management System</div>
          </div>
        </div>
        <div className="gsearch">
          <span className="ic">&#128269;</span>
          <input
            id="gq"
            type="search"
            placeholder="Search materials, requisitions, work orders, GRNs, vendors&hellip;"
            autoComplete="off"
          />
          <div id="gres" className="gres hide"></div>
        </div>
        <div className="flex aic gap8" style={{ marginLeft: 'auto' }}>
          <span className="env">UAT / Demo</span>
          <select className="tb-btn" id="fySel" style={{ padding: '0 6px' }} title="Financial year">
            <option>FY 2026-27</option>
            <option>FY 2025-26</option>
            <option>FY 2024-25</option>
          </select>
          <div className="bell" id="btnBell" title="Notifications">
            &#128276;
            <span className="badge-n" id="notifN">
              0
            </span>
          </div>
          <div className="uchip" id="btnUser">
            <div className="av">AK</div>
            <div>
              <div className="n1">Anil Katwale</div>
              <div className="n2">Procurement Officer</div>
            </div>
            <span style={{ fontSize: '9px', opacity: 0.8 }}>&#9660;</span>
          </div>
        </div>
      </header>

      {/* Dynamic Dropdowns and Context Popups Container */}
      <div id="ddRoot"></div>

      {/* Dynamic Modals Container */}
      <div id="modalRoot"></div>

      {/* Fixed Left Navigation Sidebar */}
      <nav className="side" id="side"></nav>

      {/* Main Content Viewport */}
      <main className="main">
        <div id="view"></div>
        <footer className="foot">
          <span>IFMS Material Management Module | GNCTD | Government of NCT of Delhi</span>
          <span>
            &copy; <span id="yr">2026</span> Government of NCT of Delhi &middot; Version 2.0 &middot;{' '}
            <span id="storeMode" style={{ fontWeight: 600, color: 'var(--navy-2)' }}>
              Live Database: PostgreSQL 17 (ifms_jk)
            </span>
          </span>
        </footer>
      </main>

      {/* Global In-App Toast Notifications Container */}
      <div className="toasts" id="toasts"></div>
    </div>
  );
}

export default App;
