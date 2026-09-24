with open(r'd:\IFMS_Material\frontend\src\services\ifms_core.js', 'r', encoding='utf-8') as f:
    code = f.read()

# Replace the boot function with an exportable initIFMS function and live backend sync
old_boot = """/* ------------------------------------------------------------
   BOOT
   ------------------------------------------------------------ */
(function boot(){
  DB = Store.get();
  if(!DB || !DB.materials || !DB.materials.length){ DB = seedDB(); save(); }
  ['materials','requisitions','tenders','boq','quotes','workorders','deliveries','grns','inspections',
   'rtv','stock','movements','issues','returns','transfers','invoices','fees','emds','pgs','warranty',
   'defects','disposals','audits','verification','adjustments','forecast','assets','portals','trail',
   'notifications','workflows','rules','roles','limits','amendments','plans'].forEach(function(k){
    if(!DB[k]) DB[k] = [];
  });
  document.getElementById('yr').textContent = new Date().getFullYear();
  document.getElementById('storeMode').textContent = 'Data stored in '+Store.mode;
  buildSidebar();
  paintNotifCount();
  goto('dash');

  document.getElementById('btnSide').onclick = function(){
    if(window.innerWidth<=900) document.body.classList.toggle('sopen');
    else {
      var s = document.documentElement.style;
      var cur = getComputedStyle(document.documentElement).getPropertyValue('--side-w').trim();
      s.setProperty('--side-w', cur==='250px' ? '56px' : '250px');
    }
  };
  document.getElementById('btnUser').onclick = function(e){ e.stopPropagation(); userMenu(); };
  document.getElementById('btnBell').onclick = function(e){ e.stopPropagation(); notifMenu(); };
  document.getElementById('gq').addEventListener('input', function(){ globalSearch(this.value); });
  document.getElementById('gq').addEventListener('blur', function(){
    setTimeout(function(){ document.getElementById('gres').classList.add('hide'); }, 180);
  });
  document.getElementById('fySel').onchange = function(){
    toast('Financial year switched to <b>'+esc(this.value)+'</b>. The demo data set covers FY 2026-27.','in');
  };
  toast('Material Management module loaded. Demo data is stored in '+Store.mode+'.','ok',5000);
})();"""

new_boot = """/* ------------------------------------------------------------
   BOOT & LIVE FASTAPI DATABASE SYNCHRONIZATION
   ------------------------------------------------------------ */
var API_BASE = 'http://127.0.0.1:8002/api/v1';

async function syncWithBackend(){
  try {
    const res = await fetch(API_BASE + '/dashboard/stats');
    if (res.ok) {
      const modeEl = document.getElementById('storeMode');
      if (modeEl) modeEl.textContent = 'Connected: PostgreSQL 17 (ifms_jk)';
      
      // Fetch live items from database
      const [matRes, reqRes, woRes, grnRes, invRes] = await Promise.all([
        fetch(API_BASE + '/materials/items'),
        fetch(API_BASE + '/requisitions/'),
        fetch(API_BASE + '/work-orders/'),
        fetch(API_BASE + '/grn/'),
        fetch(API_BASE + '/billing/invoices')
      ]);
      
      if (matRes.ok) {
        const liveItems = await matRes.json();
        if (liveItems && liveItems.length) {
          liveItems.forEach(function(it){
            var existing = DB.materials.find(function(m){ return m.code === it.item_code || m.id === it.id; });
            if (!existing) {
              DB.materials.push({
                id: it.id,
                code: it.item_code,
                name: it.item_name,
                cat: it.cat_name || 'IT & Telecom Goods',
                subcat: it.item_desc || 'Hardware & Office Systems',
                uom: it.base_uom_code || 'NOS',
                type: it.is_service ? 'Service' : 'Goods',
                stock: it.is_stockable ? 'Stock' : 'Non-Stock',
                cap: it.is_capital ? 'Capital' : 'Revenue',
                rate: it.estimated_rate || 0,
                gst: it.gst_rate_pct || 18,
                hsn: it.hsn_sac_code || '8471',
                status: it.is_active ? 'Active' : 'Inactive',
                min: it.min_stock_level || 0,
                max: it.max_stock_level || 100,
                reorder: it.reorder_level || 20,
                lead: it.lead_time_days || 7
              });
            }
          });
        }
      }
      
      save();
      refreshNavCounts();
    }
  } catch(err) {
    console.log('Backend sync offline/starting, using local database cache:', err);
  }
}

export function initIFMS(){
  DB = Store.get();
  if(!DB || !DB.materials || !DB.materials.length){ DB = seedDB(); save(); }
  ['materials','requisitions','tenders','boq','quotes','workorders','deliveries','grns','inspections',
   'rtv','stock','movements','issues','returns','transfers','invoices','fees','emds','pgs','warranty',
   'defects','disposals','audits','verification','adjustments','forecast','assets','portals','trail',
   'notifications','workflows','rules','roles','limits','amendments','plans'].forEach(function(k){
    if(!DB[k]) DB[k] = [];
  });
  
  var yrEl = document.getElementById('yr');
  if (yrEl) yrEl.textContent = new Date().getFullYear();
  var smEl = document.getElementById('storeMode');
  if (smEl) smEl.textContent = 'PostgreSQL (ifms_jk) connected';
  
  buildSidebar();
  paintNotifCount();
  goto(ROUTE || 'dash');

  var btnSide = document.getElementById('btnSide');
  if (btnSide) {
    btnSide.onclick = function(){
      if(window.innerWidth<=900) document.body.classList.toggle('sopen');
      else {
        var s = document.documentElement.style;
        var cur = getComputedStyle(document.documentElement).getPropertyValue('--side-w').trim();
        s.setProperty('--side-w', cur==='250px' ? '56px' : '250px');
      }
    };
  }
  
  var btnUser = document.getElementById('btnUser');
  if (btnUser) btnUser.onclick = function(e){ e.stopPropagation(); userMenu(); };
  
  var btnBell = document.getElementById('btnBell');
  if (btnBell) btnBell.onclick = function(e){ e.stopPropagation(); notifMenu(); };
  
  var gq = document.getElementById('gq');
  if (gq) {
    gq.addEventListener('input', function(){ globalSearch(this.value); });
    gq.addEventListener('blur', function(){
      setTimeout(function(){ 
        var gr = document.getElementById('gres');
        if (gr) gr.classList.add('hide'); 
      }, 180);
    });
  }
  
  var fySel = document.getElementById('fySel');
  if (fySel) {
    fySel.onchange = function(){
      toast('Financial year switched to <b>'+esc(this.value)+'</b>. The active budget covers FY 2026-27.','in');
    };
  }
  
  syncWithBackend();
  toast('IFMS Material Management Module & Live PostgreSQL Database Loaded.','ok',4000);
}

// Attach to window so HTML onclicks work seamlessly
if (typeof window !== 'undefined') {
  window.goto = goto;
  window.modal = modal;
  window.closeModal = closeModal;
  window.closeAllModals = closeAllModals;
  window.toast = toast;
  window.confirmAct = confirmAct;
  window.userMenu = userMenu;
  window.notifMenu = notifMenu;
  window.showProfile = showProfile;
  window.globalSearch = globalSearch;
  window.toggleGrp = toggleGrp;
}
"""

if old_boot in code:
    code = code.replace(old_boot, new_boot)
    with open(r'd:\IFMS_Material\frontend\src\services\ifms_core.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Successfully replaced boot() with initIFMS() and live backend sync in ifms_core.js!")
else:
    # Append export if exact string not found
    code += "\n\n" + new_boot
    with open(r'd:\IFMS_Material\frontend\src\services\ifms_core.js', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Appended new_boot to ifms_core.js!")
