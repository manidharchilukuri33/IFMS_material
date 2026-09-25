
/* ============================================================
   IFMS - MATERIAL MANAGEMENT MODULE | GNCTD
   Single-file prototype. Sections:
     1. Sample Data      2. Storage Utilities   3. Helpers/Format
     4. Toast/Modal      5. Table Engine        6. Form Engine
     7. Navigation       8. Dashboard           9. Screens
    10. Audit Logging   11. Integration Sim    12. Report Export
   ============================================================ */

/* ------------------------------------------------------------
   2. STORAGE UTILITIES  (localStorage with in-memory fallback)
   ------------------------------------------------------------ */
var KEY = 'ifms_mm_v1';
var Store = (function(){
  var usable = false, mem = {};
  try{
    var t='__t'; window.localStorage.setItem(t,'1'); window.localStorage.removeItem(t); usable = true;
  }catch(e){ usable = false; }
  return {
    mode: usable ? 'localStorage' : 'in-memory session',
    get: function(){
      try{
        var raw = usable ? window.localStorage.getItem(KEY) : mem[KEY];
        return raw ? JSON.parse(raw) : null;
      }catch(e){ return null; }
    },
    set: function(obj){
      var raw = JSON.stringify(obj);
      try{ if(usable) window.localStorage.setItem(KEY, raw); else mem[KEY] = raw; }
      catch(e){ mem[KEY] = raw; }
    },
    clear: function(){ try{ if(usable) window.localStorage.removeItem(KEY); }catch(e){} mem = {}; }
  };
})();

var DB = null;
function save(){ Store.set(DB); }
function commit(msg, kind){ save(); if(msg) toast(msg, kind||'ok'); }

/* ------------------------------------------------------------
   3. HELPERS AND FORMATTING
   ------------------------------------------------------------ */
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var TODAY = '2026-08-29';
function inr(n){
  if(n===null||n===undefined||isNaN(n)) return '\u20B9 0.00';
  var neg = n<0; n = Math.abs(Number(n));
  var parts = n.toFixed(2).split('.'), i = parts[0], d = parts[1];
  var l3 = i.slice(-3), rest = i.slice(0,-3);
  if(rest){ rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g,','); l3 = ','+l3; }
  return (neg?'-':'')+'\u20B9 '+rest+l3+'.'+d;
}
function inr0(n){ return inr(n).replace(/\.00$/,''); }
function num(n){ return Number(n||0).toLocaleString('en-IN'); }
function fdate(iso){
  if(!iso) return '\u2014';
  var d = new Date(iso); if(isNaN(d)) return iso;
  return String(d.getDate()).padStart(2,'0')+'-'+MON[d.getMonth()]+'-'+d.getFullYear();
}
function fdatetime(iso){
  if(!iso) return '\u2014';
  var d = new Date(iso); if(isNaN(d)) return iso;
  return fdate(iso.slice(0,10))+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }
function addDays(iso,n){ var d=new Date(iso); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function esc(s){
  return String(s===null||s===undefined?'':s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function nowIso(){ return new Date().toISOString(); }
function pad(n,w){ return String(n).padStart(w||4,'0'); }
function seq(prefix, list, field, width){
  var max = 0;
  (list||[]).forEach(function(r){ var m = String(r[field]||'').match(/(\d+)\s*$/); if(m) max = Math.max(max, +m[1]); });
  return prefix + pad(max+1, width||6);
}
function uid(p){ return (p||'ID')+'-'+Math.random().toString(36).slice(2,8).toUpperCase(); }
function byId(list, key, val){
  if (!list || !list.length) return null;
  var sVal = String(val).trim().toLowerCase();
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    if (!r) continue;
    if (r[key] === val || (r[key] !== undefined && String(r[key]).trim().toLowerCase() === sVal)) return r;
    if (r.id !== undefined && String(r.id).trim().toLowerCase() === sVal) return r;
    if (r.code !== undefined && String(r.code).trim().toLowerCase() === sVal) return r;
    if (r.no !== undefined && String(r.no).trim().toLowerCase() === sVal) return r;
  }
  var numVal = sVal.replace(/^[a-z_]+/i, '');
  if (numVal) {
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (!r) continue;
      var rIdStr = String(r.id || '').toLowerCase().replace(/^[a-z_]+/i, '');
      if (rIdStr === numVal) return r;
    }
  }
  var idx = parseInt(val, 10);
  if (!isNaN(idx)) {
    if (idx >= 0 && idx < list.length) return list[idx];
    if (idx > 0 && (idx - 1) < list.length) return list[idx - 1];
  }
  return null;
}
function sum(list, f){ return (list||[]).reduce(function(s,r){ return s+(Number(typeof f==='function'?f(r):r[f])||0); },0); }
function pct(a,b){ return b ? (a/b*100) : 0; }
function uniq(a){ var o=[]; a.forEach(function(x){ if(o.indexOf(x)<0) o.push(x); }); return o; }

var BADGE = {
  ok:['Approved','Active','Accepted','Delivered','Posted','Closed','Paid','Resolved','Released','Refunded',
      'Fully Procured','Qualified','Matched','Compliant','Completed','Issued','Success','Received','Verified','On Time','In Stock','Sold'],
  wa:['Pending','Draft','Submitted','Under Review','Under Inspection','Under Verification','Partially Delivered',
      'Partially Accepted','Partial','Pending Refund','Under Repair','Assigned','Vendor Notified','Watch List',
      'Budget Validation Pending','In Transit','Dispatched','Exception','Slow Moving','Clarification Required',
      'Replacement Pending','Accepted with Deviation','Reorder Required','Near Expiry','Low Stock','Warning','Open',
      'Auction Scheduled','In Progress','Awaiting Approval'],
  er:['Rejected','Cancelled','Delayed','Overdue','Forfeited','Expired','Escalated','Disqualified','Stock Out',
      'Budget Not Available','Returned','Returned for Correction','Delivery Refused','Non-compliant','Out of Warranty',
      'Failed','Mismatch','Critical','Non-Moving','Blocked','Condemned','Re-Inspection Required','Critical Reorder Required',
      'Re-Tender Recommended'],
  in:['Under Process','Procurement Initiated','Partially Procured','Not Dispatched','Exempted','Adjusted',
      'Suspended','Amended','Scheduled','Fast Moving','Normal','Sent to Finance','Published','Bid Opened','Under Evaluation',
      'Awarded','Recommended','No action'],
  tl:['Inspected','Reserved','Conditional Acceptance','Excess Stock','Mapped','Non-Standard','Pending Approval','Unmapped']
};
function bcls(s){
  s = String(s||'');
  var keys = ['ok','wa','er','in','tl'];
  for(var i=0;i<keys.length;i++) if(BADGE[keys[i]].indexOf(s)>=0) return 'b-'+keys[i];
  return 'b-nu';
}
function badge(s){ return '<span class="bdg '+bcls(s)+'">'+esc(s)+'</span>'; }
function priBadge(p){
  var m = {Critical:'b-er',Emergency:'b-er',Urgent:'b-wa',Normal:'b-in',Low:'b-nu',High:'b-er',Medium:'b-wa'};
  return '<span class="bdg '+(m[p]||'b-nu')+'">'+esc(p)+'</span>';
}

/* ------------------------------------------------------------
   1. SAMPLE DATA — master lists
   ------------------------------------------------------------ */
var DEPTS = ['Directorate of Information Technology','Directorate of Education','Directorate of Health Services',
  'Public Works Department','Delhi Jal Board','Transport Department','Directorate of Training and Technical Education'];
var VENDORS = [
  {code:'VEN-0001', name:'Delhi Digital Systems Pvt. Ltd.', gstin:'07AABCD1234E1Z5', cat:'IT Hardware', rating:4.6, city:'New Delhi'},
  {code:'VEN-0002', name:'Bharat Office Solutions LLP',     gstin:'07AABCB5678F1Z2', cat:'Office Supplies', rating:4.1, city:'New Delhi'},
  {code:'VEN-0003', name:'TechNova India Private Limited',  gstin:'07AABCT9012G1Z8', cat:'IT Hardware', rating:3.4, city:'Noida'},
  {code:'VEN-0004', name:'National Industrial Suppliers',   gstin:'07AABCN3456H1Z1', cat:'Civil / Industrial', rating:3.9, city:'Delhi'},
  {code:'VEN-0005', name:'Green Energy Equipment Services', gstin:'07AABCG7890I1Z6', cat:'Electrical', rating:4.3, city:'Gurugram'},
  {code:'VEN-0006', name:'Capital Medical Supplies',        gstin:'07AABCC2345J1Z3', cat:'Medical', rating:4.5, city:'New Delhi'},
  {code:'VEN-0007', name:'Metro Stationery Traders',        gstin:'07AABCM6789K1Z9', cat:'Office Supplies', rating:2.9, city:'Delhi'}
];
var STORES = ['Central Store \u2013 Civil Lines','IT Store \u2013 Delhi Secretariat','Health Store \u2013 LNJP Campus',
  'Education Store \u2013 Old Secretariat','PWD Central Warehouse','Transport Department Store'];
var MODES = ['Open Tender','Limited Tender','Single Tender','Quotation','GeM','CPPP',
  'GNCTD e-Procurement Portal','Rate Contract','Direct Purchase','Emergency Purchase'];
var COA = ['2059 \u2013 Office Expenses','2202 \u2013 Education Supplies','2210 \u2013 Medical and Public Health Supplies',
  '3054 \u2013 Roads and Bridges Materials','4059 \u2013 Capital Outlay on Public Works','4217 \u2013 Capital Outlay on Urban Development'];
var CATS = {
  'IT Equipment':['Computers','Printers','Consumables','Networking'],
  'Office Supplies':['Stationery','Paper','Housekeeping'],
  'Electrical':['Power Backup','Lighting','Cabling'],
  'Furniture':['Seating','Storage','Workstations'],
  'Medical':['Consumables','Instruments','Drugs'],
  'Civil Materials':['Cement','Steel','Aggregates']
};
function allSubs(){
  var o=[]; Object.keys(CATS).forEach(function(k){ CATS[k].forEach(function(s){ if(o.indexOf(s)<0) o.push(s); }); }); return o;
}
var UOMS = ['Nos','Set','Box','Ream','Pair','Kg','Metre','Litre','Bag','Packet','Roll'];
var FUNDS = ['State Plan Fund','Central Assistance','Own Resources','Externally Aided Project'];
var SCHEMES = ['Digital Delhi Mission','School Infrastructure Upgrade','Hospital Modernisation',
  'Road Maintenance Programme','Establishment \u2014 Non-scheme'];
var PROJECTS = ['e-Office Rollout Phase III','Smart Classroom Deployment','LNJP Equipment Renewal','Ring Road Resurfacing','\u2014'];
var COST_CENTRES = ['CC-DIT-01 Secretariat IT','CC-EDU-04 North District','CC-HLT-02 LNJP','CC-PWD-07 Central Circle','CC-TRP-01 HQ'];

function seedMaterials(){
  var m = [
    ['MAT-IT-0001','Laptop Computer, 14 Inch, Business Class','IT Equipment','Computers','Nos','Capital','Y',25,64, 68500,'Active','Dell','Latitude 5450','Intel Core i5 13th Gen, 16 GB RAM, 512 GB SSD, 14 inch FHD, Windows 11 Pro',1,3],
    ['MAT-IT-0002','Desktop Computer, Standard Configuration','IT Equipment','Computers','Nos','Capital','Y',20,38, 46200,'Active','HP','ProDesk 400 G9','Intel Core i5, 8 GB RAM, 512 GB SSD, 21.5 inch monitor, keyboard and mouse',1,3],
    ['MAT-IT-0003','Laser Printer, Network Enabled','IT Equipment','Printers','Nos','Capital','Y',10,12, 28400,'Active','Canon','LBP246dw','Monochrome laser, 40 ppm, duplex, Ethernet and Wi-Fi',1,2],
    ['MAT-IT-0004','Toner Cartridge, Black','IT Equipment','Consumables','Nos','Revenue','N',60,42,  4850,'Active','Canon','CRG-070','Original black toner, yield 3,000 pages',0,0],
    ['MAT-OFF-0001','A4 Copier Paper, 75 GSM','Office Supplies','Paper','Ream','Revenue','N',400,1180,  289,'Active','JK','Copier Plus','A4, 75 GSM, 500 sheets per ream, high brightness',0,0],
    ['MAT-ELE-0001','UPS, 1 KVA','Electrical','Power Backup','Nos','Capital','Y',15,9, 12600,'Active','Luminous','Zelio 1100','1 KVA line-interactive UPS with 20 minute backup',1,2],
    ['MAT-FUR-0001','Office Chair, Ergonomic','Furniture','Seating','Nos','Capital','Y',30,74, 8900,'Active','Godrej','Aspire','Mesh back, adjustable lumbar support, 5-star nylon base',1,1],
    ['MAT-MED-0001','Surgical Gloves, Disposable','Medical','Consumables','Box','Revenue','N',150,86,  740,'Active','Romsons','Latex Sterile','Powder free latex, sterile, box of 100 pairs, size medium',0,0],
    ['MAT-CIV-0001','Cement, OPC Grade 43','Civil Materials','Cement','Bag','Revenue','N',500,0,  412,'Active','ACC','OPC 43','Ordinary Portland Cement Grade 43, 50 kg bag, IS 8112 conformity',0,0],
    ['MAT-IT-0005','Network Switch, 24 Port Managed','IT Equipment','Networking','Nos','Capital','Y',8,6, 32800,'Active','Cisco','CBS350-24T','24 port gigabit managed switch, layer 3 lite',1,3],
    ['MAT-OFF-0002','Ball Point Pen, Blue','Office Supplies','Stationery','Packet','Revenue','N',200,340,  120,'Active','Cello','Finegrip','Blue ink ball pen, packet of 10',0,0],
    ['MAT-ELE-0002','LED Panel Light, 36 W','Electrical','Lighting','Nos','Revenue','N',120,64,  980,'Active','Philips','SlimLine','36 W LED recessed panel, 600x600 mm, cool white',0,2],
    ['MAT-MED-0002','Digital Thermometer','Medical','Instruments','Nos','Revenue','N',80,18,  460,'Active','Omron','MC-246','Digital clinical thermometer with fever alarm',0,1],
    ['MAT-FUR-0002','Steel Almirah, 4 Shelf','Furniture','Storage','Nos','Capital','Y',12,4, 14800,'Active','Godrej','Storwel','CRCA steel almirah, 4 shelves, lock and handle',1,1],
    ['MAT-IT-0006','Desktop Monitor, 24 Inch','IT Equipment','Computers','Nos','Capital','Y',20,0, 11200,'Inactive','Dell','P2422H','24 inch IPS, 1920x1080, HDMI and DisplayPort',1,3],
    ['MAT-OFF-0003','File Folder, Cardboard','Office Supplies','Stationery','Nos','Revenue','N',300,96,   38,'Active','Solo','FC Board','Foolscap board file with flap and tag',0,0],
    ['MAT-CIV-0002','TMT Steel Bar, 12 mm','Civil Materials','Steel','Kg','Revenue','N',2000,860,   68,'Active','Tata','Tiscon 550D','Fe 550D TMT reinforcement bar, 12 mm diameter',0,0],
    ['MAT-MED-0003','IV Cannula, 20 G','Medical','Consumables','Box','Revenue','N',100,24,  920,'Active','Romsons','Cannu-Fix','20 G IV cannula with injection port, box of 50',0,0]
  ];
  return m.map(function(r,i){
    return {
      id:'M'+(i+1), code:r[0], name:r[1], cat:r[2], sub:r[3], uom:r[4], fin:r[5], asset:r[6],
      reorder:r[7], stock:r[8], rate:r[9], status:r[10], make:r[11], model:r[12], spec:r[13],
      serialTrack:!!r[14], warrantyMonths:r[15]*12,
      type: r[5]==='Capital'?'Asset':'Consumable',
      stockType:'Stock', consumable: r[5]==='Revenue' ? 'Consumable':'Non-Consumable',
      hazardous:false, perishable:(r[2]==='Medical'||r[2]==='Civil Materials'),
      expiryReq:(r[2]==='Medical'), shelfLife:(r[2]==='Medical'?24:0),
      batchTrack:(r[2]==='Medical'||r[2]==='Civil Materials'),
      minStock: Math.round(r[7]*0.5), maxStock: r[7]*6, reorderQty: r[7]*2, leadTime: 21,
      warrantyApplicable: r[6]==='Y',
      coa: r[2]==='Medical' ? COA[2] : (r[2]==='Civil Materials'? COA[3] : COA[0]),
      fund:FUNDS[0], scheme:SCHEMES[0], project:PROJECTS[0], costCentre:COST_CENTRES[0],
      disposalCat: r[6]==='Y' ? 'Asset \u2014 Condemnation Board' : 'Consumable \u2014 Write-off',
      updated: '2026-0'+((i%5)+4)+'-'+pad((i%27)+1,2), createdBy:'Anil Katwale', attachments:[]
    };
  });
}

function seedDB(){
  var mats = seedMaterials();
  var mcode = function(i){ return mats[i].code; };
  var mnm = function(i){ return mats[i].name; };

  /* ---------- requisitions ---------- */
  var reqStat = ['Approved','Submitted','Under Review','Budget Validation Pending','Approved','Returned for Correction',
                 'Procurement Initiated','Draft','Rejected','Partially Procured','Approved','Fully Procured'];
  var reqs = reqStat.map(function(st,i){
    var lines = [
      {mat:mcode(i%mats.length), desc:mnm(i%mats.length), qty:(i%6+1)*5, uom:mats[i%mats.length].uom,
       rate:mats[i%mats.length].rate, make:mats[i%mats.length].make, spec:mats[i%mats.length].spec},
      {mat:mcode((i+3)%mats.length), desc:mnm((i+3)%mats.length), qty:(i%4+1)*4, uom:mats[(i+3)%mats.length].uom,
       rate:mats[(i+3)%mats.length].rate, make:mats[(i+3)%mats.length].make, spec:mats[(i+3)%mats.length].spec}
    ];
    var val = sum(lines, function(l){ return l.qty*l.rate; });
    return {
      id:'R'+(i+1), no:'MR/DIT/2026/'+pad(340+i*3,6), date:'2026-0'+(6+(i%3))+'-'+pad((i*2)%27+1,2),
      dept:DEPTS[i%DEPTS.length], office:'Head Office', section:'Procurement Section',
      requestor:['Anil Katwale','R. Meena','S. Bansal','P. Kaur','M. Iqbal'][i%5],
      lines:lines, value:val,
      budget: st==='Budget Validation Pending' ? 'Pending' : (i===8?'Not Available':'Available'),
      stockAvail: i%3===0 ? 'Partially Available' : (i%3===1?'Available':'Not Available'),
      priority:['Normal','Urgent','Emergency','Critical','Normal'][i%5],
      status:st, approver:['HoD \u2014 IT','Administrative Officer','Finance Wing','Procurement Officer','\u2014'][i%5],
      location:STORES[i%STORES.length], requiredBy: addDays('2026-09-01', i*4),
      purpose:['Replacement of end-of-life assets','New office setup at branch','Annual consumable replenishment',
               'Scheme implementation requirement','Emergency replacement after failure'][i%5],
      coa:COA[i%COA.length], fund:FUNDS[i%FUNDS.length], scheme:SCHEMES[i%SCHEMES.length],
      project:PROJECTS[i%PROJECTS.length], costCentre:COST_CENTRES[i%COST_CENTRES.length],
      availBudget: val*(i===8?0.4:2.6), mode:MODES[i%MODES.length], attachments:[]
    };
  });

  /* ---------- tenders ---------- */
  var tenders = [
    {id:'T1', no:'TND/2026/10042', title:'Supply of laptop computers and accessories', date:'2026-05-12', mode:'Open Tender',
     dept:DEPTS[0], value:34250000, fee:5000, emd:685000, close:'2026-06-10', status:'Under Evaluation', portal:'GNCTD e-Procurement Portal', coa:COA[0]},
    {id:'T2', no:'TND/2026/10058', title:'Annual rate contract for A4 copier paper', date:'2026-05-28', mode:'Rate Contract',
     dept:DEPTS[1], value:8400000, fee:2000, emd:168000, close:'2026-06-25', status:'Awarded', portal:'GeM', coa:COA[1]},
    {id:'T3', no:'TND/2026/10071', title:'Supply and installation of 1 KVA UPS units', date:'2026-06-14', mode:'Limited Tender',
     dept:DEPTS[3], value:5040000, fee:2000, emd:100800, close:'2026-07-08', status:'Awarded', portal:'CPPP', coa:COA[4]},
    {id:'T4', no:'TND/2026/10086', title:'Surgical consumables for LNJP campus', date:'2026-07-02', mode:'Open Tender',
     dept:DEPTS[2], value:12600000, fee:5000, emd:252000, close:'2026-07-30', status:'Bid Opened', portal:'GNCTD e-Procurement Portal', coa:COA[2]},
    {id:'T5', no:'TND/2026/10094', title:'Ergonomic office seating for secretariat', date:'2026-07-18', mode:'GeM',
     dept:DEPTS[0], value:6675000, fee:0, emd:133500, close:'2026-08-12', status:'Awarded', portal:'GeM', coa:COA[0]},
    {id:'T6', no:'TND/2026/10103', title:'Supply of OPC grade 43 cement', date:'2026-08-04', mode:'Open Tender',
     dept:DEPTS[3], value:9880000, fee:5000, emd:197600, close:'2026-09-02', status:'Published', portal:'CPPP', coa:COA[3]},
    {id:'T7', no:'TND/2026/10110', title:'Managed network switches for district offices', date:'2026-08-14', mode:'Quotation',
     dept:DEPTS[0], value:1968000, fee:0, emd:39360, close:'2026-08-28', status:'Under Evaluation', portal:'GNCTD e-Procurement Portal', coa:COA[0]}
  ];

  /* ---------- BoQ mapping ---------- */
  var boq = [
    {id:'B1', tender:'TND/2026/10042', line:1, boqDesc:'Notebook PC 14 inch i5 16GB 512GB', mat:'MAT-IT-0001', qty:500, tUom:'Nos', iUom:'Nos', cf:1, status:'Mapped', remarks:'Direct match on specification'},
    {id:'B2', tender:'TND/2026/10042', line:2, boqDesc:'Carry case for notebook', mat:'', qty:500, tUom:'Nos', iUom:'Nos', cf:1, status:'Unmapped', remarks:'No standard material code exists'},
    {id:'B3', tender:'TND/2026/10058', line:1, boqDesc:'Photocopier paper A4 75gsm ream', mat:'MAT-OFF-0001', qty:28000, tUom:'Ream', iUom:'Ream', cf:1, status:'Mapped', remarks:'Auto-suggested and confirmed'},
    {id:'B4', tender:'TND/2026/10071', line:1, boqDesc:'UPS 1KVA with battery', mat:'MAT-ELE-0001', qty:400, tUom:'Nos', iUom:'Nos', cf:1, status:'Mapped', remarks:'Approved by technical committee'},
    {id:'B5', tender:'TND/2026/10086', line:1, boqDesc:'Latex examination gloves box of 100 pair', mat:'MAT-MED-0001', qty:14000, tUom:'Box', iUom:'Box', cf:1, status:'Mapped', remarks:'\u2014'},
    {id:'B6', tender:'TND/2026/10086', line:2, boqDesc:'IV cannula 20G sterile', mat:'MAT-MED-0003', qty:2500, tUom:'Pack', iUom:'Box', cf:1, status:'Pending Approval', remarks:'UOM conversion to be certified'},
    {id:'B7', tender:'TND/2026/10103', line:1, boqDesc:'Cement OPC 43 grade 50kg', mat:'MAT-CIV-0001', qty:24000, tUom:'Bag', iUom:'Bag', cf:1, status:'Mapped', remarks:'\u2014'},
    {id:'B8', tender:'TND/2026/10110', line:1, boqDesc:'L3 lite managed switch 24 ports', mat:'MAT-IT-0005', qty:60, tUom:'Nos', iUom:'Nos', cf:1, status:'Non-Standard', remarks:'Marked non-standard pending catalogue update'}
  ];

  /* ---------- quotations ---------- */
  var quotes = [];
  [['TND/2026/10042',[['VEN-0001',33920000,'Qualified'],['VEN-0003',32480000,'Disqualified'],['VEN-0002',34960000,'Qualified']]],
   ['TND/2026/10071',[['VEN-0005',4915000,'Qualified'],['VEN-0004',5120000,'Qualified']]],
   ['TND/2026/10086',[['VEN-0006',12180000,'Qualified'],['VEN-0002',12940000,'Clarification Required']]],
   ['TND/2026/10110',[['VEN-0001',1932000,'Qualified'],['VEN-0003',1876000,'Qualified'],['VEN-0005',2044000,'Pending']]]
  ].forEach(function(t,ti){
    t[1].forEach(function(v,vi){
      var basic = Math.round(v[1]*0.84), tax = Math.round(v[1]*0.14),
          freight = Math.round(v[1]*0.012), other = v[1]-basic-tax-freight;
      quotes.push({
        id:'Q'+(quotes.length+1), no:'BID/2026/'+pad(4100+quotes.length*7,5), tender:t[0], vendor:v[0],
        sub:'2026-0'+(6+ti%3)+'-'+pad(8+vi*3,2), tech:v[2],
        fin: v[2]==='Disqualified'?'Not Opened':'Opened',
        basic:basic, tax:tax, freight:freight, insurance:Math.round(v[1]*0.004), install:Math.round(v[1]*0.006),
        other:other, discount:Math.round(v[1]*0.01), amount:v[1],
        evaluated: v[2]==='Disqualified'? 0 : v[1]-Math.round(v[1]*0.01),
        delivery: [30,45,60,21][vi%4], warranty:[36,24,12,36][vi%4],
        terms:['30 days from acceptance','45 days from GRN','On delivery'][vi%3],
        validity:'2026-12-31', rank:0, reco:'', status: v[2]==='Disqualified'?'Rejected':'Under Review',
        score: v[2]==='Qualified'? (72+vi*6) : (v[2]==='Disqualified'?41:58),
        deviations: vi===1 ? 'Delivery period exceeds tender condition by 15 days' : 'Nil',
        elig:'Meets turnover and experience criteria', docs:'Complete', qcert:'ISO 9001:2015',
        capacity:'Adequate', past: ['Satisfactory','Satisfactory','Delays reported'][vi%3], remarks:''
      });
    });
  });

  /* ---------- work orders ---------- */
  var wos = [
    ['WO/DIT/2026/000098','VEN-0001','TND/2026/10042','MR/DIT/2026/000340','MAT-IT-0001',400,68500,'2026-07-04','2026-09-15','Issued',280],
    ['WO/DIT/2026/000102','VEN-0002','TND/2026/10058','MR/DIT/2026/000343','MAT-OFF-0001',12000,289,'2026-07-11','2026-08-20','Delivered',12000],
    ['WO/PWD/2026/000107','VEN-0005','TND/2026/10071','MR/DIT/2026/000346','MAT-ELE-0001',300,12600,'2026-07-19','2026-09-05','Issued',180],
    ['WO/HLT/2026/000113','VEN-0006','TND/2026/10086','MR/DIT/2026/000349','MAT-MED-0001',8000,740,'2026-08-01','2026-09-20','Issued',3200],
    ['WO/DIT/2026/000118','VEN-0002','TND/2026/10094','MR/DIT/2026/000352','MAT-FUR-0001',600,8900,'2026-08-08','2026-10-01','Issued',120],
    ['WO/EDU/2026/000121','VEN-0007','\u2014','MR/DIT/2026/000355','MAT-OFF-0002',1500,120,'2026-08-12','2026-08-26','Delayed',0],
    ['WO/DIT/2026/000124','VEN-0003','TND/2026/10110','MR/DIT/2026/000358','MAT-IT-0005',48,32800,'2026-08-18','2026-09-30','Approved',0],
    ['WO/PWD/2026/000127','VEN-0004','TND/2026/10103','MR/DIT/2026/000361','MAT-CIV-0001',18000,412,'2026-08-22','2026-10-10','Draft',0]
  ].map(function(r,i){
    var basic = r[5]*r[6], tax = Math.round(basic*0.18);
    return {
      id:'W'+(i+1), no:r[0], date:r[7], vendor:r[1], tender:r[2], req:r[3],
      dept:DEPTS[i%DEPTS.length], mode:MODES[i%MODES.length],
      lines:[{mat:r[4], qty:r[5], rate:r[6], taxPct:18, amount:basic, tax:tax}],
      basic:basic, tax:tax, other:0, value:basic+tax,
      due:r[8], status:r[9], delivered:r[10],
      deliveredValue: Math.round(r[10]*r[6]*1.18), store:STORES[i%STORES.length],
      inspection:'Required', warranty: i%3===0?36:12, paymentTerms:'100% within 30 days of accepted GRN',
      ld:'0.5% per week of delay, maximum 10% of order value',
      pg: i<5 ? Math.round((basic+tax)*0.03) : 0, budgetOk: r[9]!=='Draft',
      amendments: i===2 ? 1 : 0, attachments:[],
      terms:'Delivery at designated store. Inspection by departmental committee. Payment on three-way match.'
    };
  });

  /* ---------- deliveries ---------- */
  var dels = wos.filter(function(w){ return ['Issued','Delivered','Delayed'].indexOf(w.status)>=0; }).map(function(w,i){
    var pend = w.lines[0].qty - w.delivered;
    var st = w.delivered===0 ? (w.status==='Delayed'?'Delayed':'Not Dispatched')
           : (pend===0 ? 'Delivered' : 'Partially Delivered');
    var exp = w.due;
    return {
      id:'D'+(i+1), wo:w.no, vendor:w.vendor, mat:w.lines[0].mat, ordered:w.lines[0].qty,
      delivered:w.delivered, pending:pend, dispatch: w.delivered? addDays(exp,-9):'',
      expected:exp, actual: st==='Delivered' ? addDays(exp,-3) : '', delay: st==='Delayed'? daysBetween(exp,TODAY) : 0,
      challan: w.delivered? 'CH/'+w.vendor.slice(-4)+'/'+pad(2200+i*13,5) : '',
      transporter: w.delivered? ['Delhi Cargo Movers','Safe Express','Vendor own transport'][i%3] : '',
      status:st, store:w.store
    };
  });

  /* ---------- GRNs ---------- */
  var grns = [
    ['GRN/DIT/2026/000245','WO/DIT/2026/000098','VEN-0001','MAT-IT-0001',280,270,10,'2026-08-12','Accepted','Posted'],
    ['GRN/DIT/2026/000251','WO/DIT/2026/000102','VEN-0002','MAT-OFF-0001',12000,12000,0,'2026-08-18','Accepted','Posted'],
    ['GRN/PWD/2026/000256','WO/PWD/2026/000107','VEN-0005','MAT-ELE-0001',180,174,6,'2026-08-20','Accepted with Deviation','Posted'],
    ['GRN/HLT/2026/000260','WO/HLT/2026/000113','VEN-0006','MAT-MED-0001',3200,3200,0,'2026-08-24','Under Inspection','Pending'],
    ['GRN/DIT/2026/000264','WO/DIT/2026/000118','VEN-0002','MAT-FUR-0001',120,112,8,'2026-08-26','Under Inspection','Pending'],
    ['GRN/DIT/2026/000268','WO/DIT/2026/000098','VEN-0001','MAT-IT-0001',60,0,0,'2026-08-28','Pending','Pending']
  ].map(function(r,i){
    return {
      id:'G'+(i+1), no:r[0], date:r[7], wo:r[1], vendor:r[2], mat:r[3],
      received:r[4], accepted:r[5], rejected:r[6], damaged: i===2?4:0, short:0, excess:0,
      challan:'CH/'+r[2].slice(-4)+'/'+pad(2200+i*13,5), challanDate: addDays(r[7],-2),
      store:STORES[i%STORES.length], location:'Bin-'+String.fromCharCode(65+i)+'-0'+(i+1),
      batch: (r[3].indexOf('MED')>0||r[3].indexOf('CIV')>0) ? 'BATCH/2026/'+pad(410+i,4) : '',
      mfg: r[3].indexOf('MED')>0 ? '2026-03-01':'', exp: r[3].indexOf('MED')>0 ? '2028-02-28':'',
      inspection:r[8], posting:r[9], receiver:'Store Officer', remarks:'', attachments:[]
    };
  });

  /* ---------- inspections ---------- */
  var insp = grns.filter(function(g){ return g.inspection!=='Pending'; }).map(function(g,i){
    return {
      id:'I'+(i+1), no:'INS/2026/'+pad(880+i*4,5), grn:g.no, wo:g.wo, mat:g.mat,
      inspector:['Technical Committee \u2014 IT','Store Inspection Board','Quality Cell \u2014 PWD','Medical Stores Committee'][i%4],
      date: addDays(g.date,2), location:g.store, qty:g.received, accepted:g.accepted, rejected:g.rejected,
      observation: g.rejected? 'Units found with cosmetic damage and one non-functional adapter' : 'Conforms to ordered specification',
      cert: 'TC/'+pad(1200+i*9,5), result: g.rejected? 'Partially Conforming':'Conforming',
      nc: g.rejected? 'Minor \u2014 packaging and accessory shortfall':'Nil',
      reco: g.rejected? 'Accept conforming quantity, return balance to vendor':'Accept in full',
      status: g.inspection
    };
  });

  /* ---------- returns to vendor ---------- */
  var rtv = grns.filter(function(g){ return g.rejected>0; }).map(function(g,i){
    return {
      id:'RT'+(i+1), no:'RTV/2026/'+pad(310+i*4,5), grn:g.no, wo:g.wo, vendor:g.vendor, mat:g.mat,
      qty:g.rejected, rate: 0, reason:['Rejected on inspection','Damaged in transit','Specification deviation'][i%3],
      date: addDays(g.date,3), mode:['Vendor pickup','Departmental despatch'][i%2],
      replacement: i===0? 'Replacement Pending':'Refund Claimed',
      ack: i===0? 'Received':'Pending', status: i===0? 'Replacement Pending':'Open'
    };
  });

  /* ---------- stock ---------- */
  var stock = mats.map(function(m,i){
    var avail = m.stock;
    return {
      id:'S'+(i+1), mat:m.code, store:STORES[i%STORES.length], bin:'Bin-'+String.fromCharCode(65+(i%6))+'-'+pad((i%9)+1,2),
      avail:avail, reserved: Math.round(avail*0.12), inspection: i===3?60:(i===7?3200:0),
      blocked: i===2?10:(i===5?6:0), damaged: i===5?4:0,
      expired: (m.expiryReq && i%7===0)? 12:0, transit: i%5===0? Math.round(avail*0.2):0,
      rate:m.rate, reorder:m.reorder,
      batch: m.batchTrack? 'BATCH/2026/'+pad(410+i,4):'',
      expiry: m.expiryReq? addDays(TODAY, [45,120,400,70][i%4]) : ''
    };
  });

  /* ---------- movements ---------- */
  var MTYPES = ['Receipt from Vendor','Issue to Department','Store Transfer','Inter-Department Transfer',
    'Return from User','Return to Vendor','Replacement Receipt','Stock Adjustment','Physical Verification Adjustment',
    'Write-Off','Disposal','Scrap Generation','Reservation','Reservation Release'];
  var movs = [];
  for(var i=0;i<26;i++){
    var m = mats[i%mats.length], t = MTYPES[i%MTYPES.length], q = ((i%9)+1)*4;
    movs.push({
      id:'V'+(i+1), no:'MOV/2026/'+pad(9100+i*3,6), date: addDays('2026-06-01', i*3),
      mat:m.code, type:t, src: t.indexOf('Receipt')>=0? 'Vendor' : STORES[i%STORES.length],
      dst: t.indexOf('Issue')>=0? DEPTS[i%DEPTS.length] : STORES[(i+2)%STORES.length],
      qty:q, uom:m.uom, value:q*m.rate,
      ref: t.indexOf('Receipt')>=0? grns[i%grns.length].no : 'ISS/2026/'+pad(500+i,5),
      by:['Anil Katwale','Store Officer','R. Meena','S. Bansal'][i%4],
      status: i%6===0? 'Pending':'Approved'
    });
  }

  /* ---------- issues and returns ---------- */
  var issues = [];
  for(var j=0;j<10;j++){
    var mm = mats[(j*2)%mats.length];
    issues.push({
      id:'IS'+(j+1), no:'ISS/2026/'+pad(700+j*3,5), date: addDays('2026-07-05', j*5),
      req: reqs[j%reqs.length].no, mat:mm.code, qty:((j%5)+1)*4, uom:mm.uom, rate:mm.rate,
      store:STORES[j%STORES.length], dept:DEPTS[j%DEPTS.length],
      indentor:['R. Meena','S. Bansal','P. Kaur','M. Iqbal'][j%4],
      recipient:['Section Officer','Ward In-charge','Site Engineer'][j%3],
      gatepass: 'GP/2026/'+pad(180+j,4),
      status: j%4===0? 'Pending':'Issued'
    });
  }
  var returns = issues.filter(function(x,k){ return k%3===0; }).map(function(x,k){
    return {
      id:'RN'+(k+1), no:'RET/2026/'+pad(120+k*3,5), issue:x.no, date: addDays(x.date, 25),
      mat:x.mat, qty: Math.max(1, Math.round(x.qty*0.25)), uom:x.uom, store:x.store, dept:x.dept,
      condition:['Serviceable','Repairable','Unserviceable'][k%3],
      reason:['Surplus to requirement','Faulty on issue','Office closed'][k%3],
      restock: k%3===0? 'Restocked':'Sent for inspection',
      status: k%3===0? 'Accepted':'Under Inspection'
    };
  });

  /* ---------- transfers ---------- */
  var transfers = [0,1,2,3].map(function(k){
    var mm = mats[(k*3)%mats.length];
    return {
      id:'TR'+(k+1), no:'TRF/2026/'+pad(240+k*3,5), date: addDays('2026-07-20', k*7),
      mat:mm.code, qty:((k%4)+1)*6, uom:mm.uom, from:STORES[k%STORES.length], to:STORES[(k+2)%STORES.length],
      approver:'Head of Office', challan:'TC/2026/'+pad(90+k,4),
      dispatched: addDays('2026-07-22', k*7), received: k<2? addDays('2026-07-25', k*7):'',
      status: k<2? 'Received' : (k===2? 'In Transit':'Pending')
    };
  });

  /* ---------- tool issuances ---------- */
  var toolMats = mats.filter(function(m){ return m.cat==='Tools & Equipment'; });
  var toolIssuances = (toolMats.length? toolMats:mats).slice(0,2).map(function(mm,k){
    return {
      id:'TL'+(k+1), no:'TOOL/2026/'+pad(100+k,5), date: addDays('2026-09-10', k*4),
      mat:mm.code, serial:'TOOL-SN-'+(4000+k), qty:1, store:STORES[k%STORES.length],
      worker:['Ramesh Kumar','Suresh Yadav'][k%2], idCard:'EMP-'+(2200+k), shift:'Morning Shift',
      expected: addDays('2026-09-10', k*4+3), returnedQty:k===0?1:0,
      returnedDate: k===0? addDays('2026-09-10', k*4+3):'',
      condition: k===0? 'Good / Inspected':'Working', fine:0,
      status: k===0? 'Returned':'Issued', remarks:''
    };
  });

  /* ---------- invoices ---------- */
  var invs = [
    ['INV/2026/001879','VI-2026-4471','VEN-0001','WO/DIT/2026/000098','GRN/DIT/2026/000245',21806400,'Exception','Under Review','Pending'],
    ['INV/2026/001884','VI-2026-4488','VEN-0002','WO/DIT/2026/000102','GRN/DIT/2026/000251',4092240,'Matched','Approved','Paid'],
    ['INV/2026/001891','VI-2026-4502','VEN-0005','WO/PWD/2026/000107','GRN/PWD/2026/000256',2585520,'Matched','Approved','Pending'],
    ['INV/2026/001897','VI-2026-4519','VEN-0006','WO/HLT/2026/000113','GRN/HLT/2026/000260',2794880,'Pending','Under Review','Pending'],
    ['INV/2026/001903','VI-2026-4530','VEN-0002','WO/DIT/2026/000118','GRN/DIT/2026/000264',1258880,'Exception','Under Review','Pending'],
    ['INV/2026/001908','VI-2026-4544','VEN-0007','WO/EDU/2026/000121','\u2014',212400,'Rejected','Returned','Pending']
  ].map(function(r,i){
    return {
      id:'N'+(i+1), no:r[0], vinv:r[1], date: addDays('2026-08-01', i*4), recd: addDays('2026-08-03', i*4),
      vendor:r[2], wo:r[3], grn:r[4], amount:r[5],
      matched: r[6]==='Matched'? r[5] : (r[6]==='Exception'? Math.round(r[5]*0.94):0),
      exception: r[6]==='Exception'? Math.round(r[5]*0.06):0,
      ld: i===5? Math.round(r[5]*0.05):0, retention: Math.round(r[5]*0.05),
      tds: Math.round(r[5]*0.02), gstTds: Math.round(r[5]*0.02),
      status:r[6], finance:r[7], payment:r[8], billNo: r[7]==='Approved'? 'BILL/2026/'+pad(900+i,4):'',
      utr: r[8]==='Paid'? 'UTR'+pad(556200+i*37,9):'', remarks:'', attachments:[]
    };
  });

  /* ---------- securities ---------- */
  var fees = tenders.filter(function(t){ return t.fee>0; }).map(function(t,i){
    return {
      id:'F'+(i+1), tender:t.no, vendor:VENDORS[i%VENDORS.length].code, amount:t.fee,
      mode:['Net Banking','NEFT','Demand Draft','UPI'][i%4], ref:'PAY'+pad(77120+i*13,7),
      date: addDays(t.date,4), receipt:'RCP/2026/'+pad(3300+i*7,5),
      refundable: i%3===0 ? 'Refundable':'Non-Refundable', status: i%3===0? 'Pending Refund':'Received'
    };
  });
  var emds = [];
  tenders.forEach(function(t,ti){
    quotes.filter(function(q){ return q.tender===t.no; }).slice(0,2).forEach(function(q,qi){
      emds.push({
        id:'E'+(emds.length+1), tender:t.no, vendor:q.vendor, amount:t.emd,
        mode:['Bank Guarantee','Demand Draft','Online'][(ti+qi)%3],
        instrType:['Bank Guarantee','Demand Draft','NEFT'][(ti+qi)%3],
        instrNo:'BG/'+pad(55210+ti*17+qi,7), bank:['State Bank of India','Punjab National Bank','HDFC Bank'][(ti+qi)%3],
        issue: addDays(t.date,2), expiry: addDays(t.date, 180+qi*30),
        verify: qi===0?'Verified':'Under Verification',
        status: t.status==='Awarded' ? (qi===0?'Adjusted':'Pending Refund')
              : (q.tech==='Disqualified' ? 'Pending Refund':'Accepted'),
        approval:'FD/EMD/2026/'+pad(120+emds.length,4), remarks:''
      });
    });
  });
  var pgs = wos.filter(function(w){ return w.pg>0; }).map(function(w,i){
    return {
      id:'P'+(i+1), wo:w.no, contract:'CON/2026/'+pad(700+i*5,5), vendor:w.vendor, amount:w.pg, pctv:3,
      instrType:['Bank Guarantee','Fixed Deposit Receipt','Bank Guarantee'][i%3],
      instrNo:'PBG/'+pad(88410+i*23,7), bank:['State Bank of India','ICICI Bank','Bank of Baroda'][i%3],
      issue: addDays(w.date,5), expiry: addDays(w.date, i===0? 95 : 420+i*40),
      claim:'6 months beyond warranty', verify:'Verified',
      release: addDays(w.due, 380), status: i===0? 'Expired' : (i===1?'Accepted':'Received')
    };
  });

  /* ---------- warranty and defects ---------- */
  var warr = [];
  grns.filter(function(g){ return g.posting==='Posted'; }).forEach(function(g){
    var m = byId(mats,'code',g.mat);
    if(!m || !m.warrantyApplicable) return;
    for(var k=0;k<2;k++){
      warr.push({
        id:'WR'+(warr.length+1), wid:'WTY/2026/'+pad(600+warr.length*3,5), mat:g.mat,
        serial:'SN'+pad(400910+warr.length*77,8), asset:'AST/DIT/'+pad(1200+warr.length*5,5),
        vendor:g.vendor, wo:g.wo, grn:g.no,
        start:g.date, end: addDays(g.date, m.warrantyMonths*30),
        amc: m.warrantyMonths? addDays(g.date, m.warrantyMonths*30+365):'',
        status:'Active', complaints: warr.length===1?2:(warr.length===3?1:0)
      });
    }
  });
  var DEFCAT = ['Hardware failure','Performance issue','Physical damage','Software / firmware','Accessory missing'];
  var defs = [
    ['DEF/2026/00019','MAT-IT-0001','VEN-0001','Escalated','Critical','Under Warranty','2026-07-22'],
    ['DEF/2026/00024','MAT-ELE-0001','VEN-0005','Under Repair','High','Under Warranty','2026-08-02'],
    ['DEF/2026/00027','MAT-IT-0003','VEN-0003','Vendor Notified','Medium','Under Warranty','2026-08-09'],
    ['DEF/2026/00031','MAT-FUR-0001','VEN-0002','Replacement Pending','Medium','Under Warranty','2026-08-14'],
    ['DEF/2026/00034','MAT-IT-0001','VEN-0001','Open','High','Under Warranty','2026-08-21'],
    ['DEF/2026/00036','MAT-IT-0002','VEN-0003','Out of Warranty','Low','Expired','2026-08-25'],
    ['DEF/2026/00038','MAT-MED-0002','VEN-0006','Resolved','Low','Under Warranty','2026-08-04']
  ].map(function(r,i){
    return {
      id:'DF'+(i+1), no:r[0], date:r[6], mat:r[1], serial:'SN'+pad(400910+i*77,8),
      asset:'AST/DIT/'+pad(1200+i*5,5), vendor:r[2], dept:DEPTS[i%DEPTS.length],
      wo: wos[i%wos.length].no, grn: grns[i%grns.length].no, location:'Room '+(200+i*7),
      cat:DEFCAT[i%DEFCAT.length], severity:r[4], warranty:r[5],
      desc:['Unit does not power on after firmware update','Battery backup falls below 5 minutes',
            'Repeated paper jam and print quality defects','Gas lift failure causing seat collapse',
            'Screen flicker under load','Motherboard failure, unit beyond warranty',
            'Reading drift beyond permissible tolerance'][i],
      vendorResp: ['Awaiting','Engineer assigned','Acknowledged','Replacement approved','Awaiting','Not applicable','Closed'][i],
      due: addDays(r[6], 15), resolved: r[3]==='Resolved'? addDays(r[6],9):'',
      status:r[3], officer:['Anil Katwale','R. Meena','S. Bansal'][i%3], escalation: r[3]==='Escalated'? 'Level 2 \u2014 Vendor management':'\u2014',
      attachments:[]
    };
  });

  /* ---------- disposal ---------- */
  var disp = [
    ['DSP/2026/00019','MAT-IT-0002',24,'Obsolete','E-Auction','Approved','Auction Scheduled'],
    ['DSP/2026/00022','MAT-IT-0006',18,'End of Life','Scrap Sale','Approved','Sold'],
    ['DSP/2026/00025','MAT-MED-0001',120,'Expired','Destruction','Pending','Under Review'],
    ['DSP/2026/00027','MAT-FUR-0001',12,'Unserviceable','Auction','Approved','Auction Scheduled'],
    ['DSP/2026/00029','MAT-ELE-0001',6,'Damaged','Return to Vendor','Pending','Draft'],
    ['DSP/2026/00031','MAT-OFF-0001',40,'Damaged','Write-Off','Rejected','Rejected'],
    ['DSP/2026/00033','MAT-IT-0004',60,'Expired','Authorized Agency Disposal','Pending','Under Review'],
    ['DSP/2026/00035','MAT-CIV-0001',200,'Surplus','Transfer','Approved','Completed'],
    ['DSP/2026/00037','MAT-MED-0003',30,'Expired','Destruction','Pending','Draft']
  ].map(function(r,i){
    var m = byId(mats,'code',r[1]); var orig = (m?m.rate:1000)*r[2];
    return {
      id:'DS'+(i+1), no:r[0], mat:r[1], store:STORES[i%STORES.length], location:'Bin-Z-0'+(i%9+1),
      batch: i%3===0? 'BATCH/2026/'+pad(410+i,4):'', qty:r[2],
      original:orig, book: Math.round(orig*0.35), residual: Math.round(orig*0.11),
      reason:r[3], method:r[4], approval:r[5], status:r[6],
      committee:'Condemnation Board \u2014 '+DEPTS[i%DEPTS.length],
      buyer: r[6]==='Sold'? 'Delhi Scrap Traders':'', auction: r[4].indexOf('Auction')>=0? 'AUC/2026/'+pad(70+i,4):'',
      date: addDays('2026-06-15', i*7), value: r[6]==='Sold'? Math.round(orig*0.13):0,
      remittance: r[6]==='Sold'? 'CHL/2026/'+pad(4400+i,5):'', attachments:[]
    };
  });

  /* ---------- stock audit ---------- */
  var audits = [
    {id:'A1', no:'AUD/2026/0011', type:'Annual', dept:DEPTS[0], store:STORES[1], cat:'IT Equipment',
     period:'FY 2026-27', team:'Verification Team A', start:'2026-08-01', end:'2026-08-14', status:'Completed'},
    {id:'A2', no:'AUD/2026/0014', type:'Quarterly', dept:DEPTS[2], store:STORES[2], cat:'Medical',
     period:'Q2 2026-27', team:'Verification Team B', start:'2026-08-18', end:'2026-08-30', status:'In Progress'},
    {id:'A3', no:'AUD/2026/0017', type:'Surprise Check', dept:DEPTS[3], store:STORES[4], cat:'Civil Materials',
     period:'August 2026', team:'Internal Audit Cell', start:'2026-08-26', end:'2026-08-27', status:'Under Review'},
    {id:'A4', no:'AUD/2026/0019', type:'Cycle Count', dept:DEPTS[1], store:STORES[3], cat:'Office Supplies',
     period:'September 2026', team:'Verification Team C', start:'2026-09-05', end:'2026-09-12', status:'Scheduled'}
  ];
  var verif = mats.slice(0,10).map(function(m,i){
    var book = m.stock, phys = book - [0,0,-3,0,5,0,-2,0,0,-8][i];
    return {
      id:'PV'+(i+1), audit:'AUD/2026/0011', mat:m.code, store:STORES[i%STORES.length],
      book:book, phys:phys, damaged: i===4?2:0, expired: i===7?6:0,
      missing: phys<book? (book-phys):0, excess: phys>book? (phys-book):0,
      variance: phys-book, rate:m.rate,
      reason: phys!==book ? ['Issue not posted','Damage during handling','Counting error at last audit','Pilferage suspected'][i%4] : '',
      remarks:'', status: phys===book? 'Matched' : 'Pending'
    };
  });
  var adjs = verif.filter(function(v){ return v.variance!==0; }).map(function(v,i){
    return {
      id:'AJ'+(i+1), no:'ADJ/2026/'+pad(240+i*3,5), mat:v.mat, store:v.store,
      book:v.book, phys:v.phys, variance:v.variance, rate:v.rate, value: v.variance*v.rate,
      reason:v.reason, doc:'PV Sheet AUD/2026/0011', authority:'Head of Office',
      finance: i===0? 'Posted':'Pending', status: i===0? 'Approved':'Pending'
    };
  });

  /* ---------- forecasting ---------- */
  var fc = mats.slice(0,12).map(function(m,i){
    var avg = Math.max(2, Math.round(m.reorder*0.32));
    var stk = m.stock;
    var proj = Math.round(avg*[1.1,1.0,1.25,0.9,1.4,1.0,1.15,0.95,1.3,1.0,1.05,1.2][i]);
    var fq = Math.round(proj*3);
    var pendRcpt = i%4===0? Math.round(m.reorder*0.5):0;
    var need = Math.max(0, fq + Math.round(m.reorder*0.5) - stk - pendRcpt);
    var reco;
    if(stk===0 || stk < m.reorder*0.5) reco = 'Critical Reorder Required';
    else if(stk < m.reorder) reco = 'Reorder Required';
    else if(stk > m.reorder*4) reco = 'Excess Stock';
    else if(avg>0 && stk/avg > 9) reco = 'Slow Moving';
    else reco = 'Watch List';
    return {
      id:'FC'+(i+1), mat:m.code, stock:stk, avg:avg,
      c3:avg*3, c6:avg*6, c12:avg*12, openReq:(i%3)*6, openPo:pendRcpt, transit:(i%5===0)?Math.round(stk*0.2):0,
      safety:Math.round(m.reorder*0.5), lead:m.leadTime,
      stockout: avg>0 ? addDays(TODAY, Math.round(stk/avg*30)) : '\u2014',
      method:['Moving Average','Weighted Moving Average','Historical Average','Seasonal Trend'][i%4],
      seasonal:[1.1,1.0,1.25,0.9][i%4], projDemand:(i%3)*8, forecast:fq,
      suggest:need, reco:reco, override:0, justification:'', approval: i<2? 'Approved':'Pending'
    };
  });

  /* ---------- assets ---------- */
  var assets = [
    ['AST/DIT/01201','Laptop \u2014 Secretariat Pool','MAT-IT-0001','Dell Latitude 5450','2026-07-04','2029-07-03','2027-07-03','2026-06-10','2026-12-10','Due Soon','MAT-IT-0004'],
    ['AST/DIT/01206','Network Switch \u2014 4th Floor','MAT-IT-0005','Cisco CBS350-24T','2026-05-20','2029-05-19','2028-05-19','2026-05-25','2026-11-25','Scheduled','\u2014'],
    ['AST/PWD/00412','UPS \u2014 Control Room','MAT-ELE-0001','Luminous Zelio 1100','2026-07-19','2028-07-18','2027-07-18','2026-08-01','2026-09-15','Due Soon','MAT-ELE-0001'],
    ['AST/HLT/00318','Thermometer Set \u2014 Ward 4','MAT-MED-0002','Omron MC-246','2026-06-02','2027-06-01','\u2014','2026-06-05','2026-12-05','Scheduled','\u2014'],
    ['AST/DIT/01215','Printer \u2014 Registry','MAT-IT-0003','Canon LBP246dw','2026-04-18','2028-04-17','2027-04-17','2026-07-20','2026-09-08','Due Soon','MAT-IT-0004'],
    ['AST/EDU/00520','Steel Almirah \u2014 Records','MAT-FUR-0002','Godrej Storwel','2026-03-11','2027-03-10','\u2014','2026-03-15','2027-03-15','Scheduled','\u2014']
  ].map(function(r,i){
    return {
      id:'AS'+(i+1), tag:r[0], name:r[1], mat:r[2], model:r[3], serial:'SN'+pad(400910+i*77,8),
      location:['Secretariat 4th Floor','Secretariat 4th Floor','PWD Control Room','LNJP Ward 4','DIT Registry','Education Records Room'][i],
      wStart:r[4], wEnd:r[5], amc:r[6], last:r[7], next:r[8], status:r[9], spare:r[10],
      spareStock: r[10]==='\u2014' ? 0 : (byId(stock,'mat',r[10])||{avail:0}).avail,
      failures: i===0? 3 : (i===2?2:0)
    };
  });

  /* ---------- portals ---------- */
  var portals = [
    {id:'PT1', name:'GeM', status:'Connected', last:'2026-08-29T09:12:00', recd:1842, proc:1836, failed:6, pending:6,
     url:'gem.gov.in', note:'Contract and order feed'},
    {id:'PT2', name:'CPPP', status:'Connected', last:'2026-08-29T08:40:00', recd:624, proc:611, failed:13, pending:13,
     url:'eprocure.gov.in', note:'Tender and award feed'},
    {id:'PT3', name:'GNCTD e-Procurement Portal', status:'Degraded', last:'2026-08-28T18:05:00', recd:918, proc:874, failed:44, pending:44,
     url:'govtprocurement.delhi.gov.in', note:'Bid, award and BoQ feed'},
    {id:'PT4', name:'IFMS Budget Module', status:'Connected', last:'2026-08-29T09:05:00', recd:412, proc:412, failed:0, pending:0,
     url:'ifms.delhi.gov.in/budget', note:'Budget head and provision check'},
    {id:'PT5', name:'IFMS Finance / Payment', status:'Connected', last:'2026-08-29T08:55:00', recd:266, proc:259, failed:7, pending:7,
     url:'ifms.delhi.gov.in/pay', note:'Bill and payment status feed'}
  ];

  /* ---------- audit trail ---------- */
  var trail = [
    ['2026-08-29T09:42:00','Material Master','MAT-IT-0001','Modified','Reorder Level','20','25','Revised on consumption review'],
    ['2026-08-29T09:15:00','Requisition','MR/DIT/2026/000356','Submitted','Status','Draft','Submitted','Submitted for approval'],
    ['2026-08-28T17:30:00','Requisition','MR/DIT/2026/000356','Budget Validated','Budget Status','Pending','Available','Budget check completed'],
    ['2026-08-28T15:10:00','Work Order','WO/DIT/2026/000098','Approved','Status','Submitted','Approved','Approved by competent authority'],
    ['2026-08-28T11:22:00','GRN','GRN/DIT/2026/000245','Posted','Inventory Posting','Pending','Posted','Accepted quantity posted to inventory'],
    ['2026-08-27T16:48:00','Invoice','INV/2026/001879','Exception Raised','Bill Status','Pending','Exception','Quantity variance beyond tolerance'],
    ['2026-08-27T12:05:00','Performance Guarantee','PBG/0088410','Extended','Expiry Date','2026-11-30','2027-05-31','Extension received from vendor'],
    ['2026-08-26T14:32:00','Disposal','DSP/2026/00019','Approved','Approval Status','Pending','Approved','Condemnation board recommendation accepted'],
    ['2026-08-26T09:03:00','Integration','GeM','Synchronised','Sync Status','Pending','Success','1,842 records received'],
    ['2026-08-25T16:20:00','Defect Complaint','DEF/2026/00019','Escalated','Status','Vendor Notified','Escalated','Vendor did not respond within SLA']
  ].map(function(r,i){
    return {
      id:'AT'+(i+1), ts:r[0], type:r[1], ref:r[2], action:r[3], field:r[4], oldv:r[5], newv:r[6], reason:r[7],
      by:['Anil Katwale','Anil Katwale','System','A. Sharma','Store Officer','System','Anil Katwale','R. Meena','System','Anil Katwale'][i],
      role:['Procurement Officer','Procurement Officer','System','Head of Office','Store Officer','System','Procurement Officer','Inspector','System','Procurement Officer'][i],
      dept:DEPTS[0], approval: i%3===0? 'APR/2026/'+pad(300+i,4):'\u2014',
      src: r[1]==='Integration'? 'GeM API':'IFMS Web', ip:'10.'+(20+i%9)+'.'+(4+i)+'.'+(101+i)
    };
  });

  /* ---------- notifications ---------- */
  var notes = [
    ['er','Invoice INV/2026/001879 raised as exception','Quantity variance beyond 10% tolerance','billing/match'],
    ['wa','5 performance guarantees expiring within 60 days','Review release eligibility','proc/pg'],
    ['wa','11 deliveries running behind schedule','Raise delay alerts with vendors','wo/delivery'],
    ['er','8 materials are at stock-out','Initiate emergency procurement','inv/stock'],
    ['wa','16 GRNs are pending inspection','Inspection committee action due','grn/pending'],
    ['in','EMD refund pending for 7 bidders','Process refund after award','proc/emd'],
    ['er','Defect complaint DEF/2026/00019 escalated','Vendor did not respond within SLA','warranty/defects'],
    ['ok','GeM synchronisation completed','1,842 records received at 09:12','admin/integration']
  ].map(function(r,i){
    return {id:'NT'+(i+1), kind:r[0], title:r[1], sub:r[2], route:r[3], read:false, ts: addDays(TODAY,-(i%4))};
  });

  /* ---------- administration config ---------- */
  var workflows = [
    {id:'WF1', module:'Requisition', level:1, role:'Head of Office', from:0, to:500000, tat:3, escalate:'Administrative Officer', status:'Active'},
    {id:'WF2', module:'Requisition', level:2, role:'Finance Wing', from:500001, to:2500000, tat:5, escalate:'Deputy Secretary', status:'Active'},
    {id:'WF3', module:'Requisition', level:3, role:'Administrative Secretary', from:2500001, to:10000000, tat:7, escalate:'Principal Secretary', status:'Active'},
    {id:'WF4', module:'Work Order', level:1, role:'Procurement Officer', from:0, to:2500000, tat:3, escalate:'Head of Office', status:'Active'},
    {id:'WF5', module:'Work Order', level:2, role:'Head of Department', from:2500001, to:50000000, tat:5, escalate:'Administrative Secretary', status:'Active'},
    {id:'WF6', module:'Disposal', level:1, role:'Condemnation Board', from:0, to:1000000, tat:10, escalate:'Head of Department', status:'Active'},
    {id:'WF7', module:'Stock Adjustment', level:1, role:'Head of Office', from:0, to:200000, tat:5, escalate:'Finance Wing', status:'Active'},
    {id:'WF8', module:'Invoice', level:1, role:'Finance Wing', from:0, to:100000000, tat:7, escalate:'Chief Accounts Officer', status:'Active'}
  ];
  var rules = [
    {id:'RL1', event:'Stock below reorder level', channel:'Email + In-app', recipients:'Store Officer, Procurement Officer', freq:'Daily', status:'Active'},
    {id:'RL2', event:'Delivery due within 7 days', channel:'In-app', recipients:'Procurement Officer', freq:'Daily', status:'Active'},
    {id:'RL3', event:'Delivery overdue', channel:'Email + SMS', recipients:'Procurement Officer, Vendor', freq:'Daily', status:'Active'},
    {id:'RL4', event:'GRN pending inspection beyond 5 days', channel:'Email', recipients:'Inspection Committee', freq:'Daily', status:'Active'},
    {id:'RL5', event:'Invoice matching exception', channel:'Email + In-app', recipients:'Finance Wing', freq:'Immediate', status:'Active'},
    {id:'RL6', event:'Performance guarantee expiring in 90 days', channel:'Email', recipients:'Procurement Officer', freq:'Weekly', status:'Active'},
    {id:'RL7', event:'Material nearing expiry', channel:'In-app', recipients:'Store Officer', freq:'Weekly', status:'Active'},
    {id:'RL8', event:'Warranty defect unresolved beyond SLA', channel:'Email + SMS', recipients:'Vendor, Procurement Officer', freq:'Immediate', status:'Active'},
    {id:'RL9', event:'Portal synchronisation failure', channel:'Email', recipients:'System Administrator', freq:'Immediate', status:'Suspended'}
  ];
  var roles = [
    {id:'RO1', user:'Anil Katwale', empc:'GNCTD/DIT/04412', role:'Procurement Officer', dept:DEPTS[0], stores:'IT Store, Central Store', limit:2500000, status:'Active'},
    {id:'RO2', user:'R. Meena', empc:'GNCTD/EDU/02218', role:'Store Officer', dept:DEPTS[1], stores:'Education Store', limit:200000, status:'Active'},
    {id:'RO3', user:'S. Bansal', empc:'GNCTD/HLT/07731', role:'Inspection Officer', dept:DEPTS[2], stores:'Health Store', limit:0, status:'Active'},
    {id:'RO4', user:'P. Kaur', empc:'GNCTD/PWD/01190', role:'Head of Office', dept:DEPTS[3], stores:'PWD Central Warehouse', limit:10000000, status:'Active'},
    {id:'RO5', user:'M. Iqbal', empc:'GNCTD/FIN/00845', role:'Finance Wing', dept:DEPTS[0], stores:'\u2014', limit:50000000, status:'Active'},
    {id:'RO6', user:'K. Verma', empc:'GNCTD/DIT/05502', role:'Master Data Administrator', dept:DEPTS[0], stores:'All', limit:0, status:'Suspended'}
  ];
  var limits = [
    {id:'LM1', role:'Store Officer', direct:50000, quotation:200000, limited:0, open:0, disposal:25000, adjust:20000},
    {id:'LM2', role:'Procurement Officer', direct:200000, quotation:1000000, limited:2500000, open:0, disposal:100000, adjust:50000},
    {id:'LM3', role:'Head of Office', direct:500000, quotation:2500000, limited:10000000, open:25000000, disposal:1000000, adjust:200000},
    {id:'LM4', role:'Head of Department', direct:1000000, quotation:5000000, limited:25000000, open:100000000, disposal:5000000, adjust:1000000},
    {id:'LM5', role:'Administrative Secretary', direct:2500000, quotation:10000000, limited:100000000, open:500000000, disposal:25000000, adjust:5000000}
  ];

  return {
    version:1, created: nowIso(),
    materials:mats, requisitions:reqs, tenders:tenders, boq:boq, quotes:quotes, workorders:wos,
    deliveries:dels, grns:grns, inspections:insp, rtv:rtv, stock:stock, movements:movs,
    issues:issues, returns:returns, transfers:transfers, toolIssuances:toolIssuances, invoices:invs,
    fees:fees, emds:emds, pgs:pgs, warranty:warr, defects:defs, disposals:disp,
    audits:audits, verification:verif, adjustments:adjs, forecast:fc, assets:assets,
    portals:portals, trail:trail, notifications:notes,
    workflows:workflows, rules:rules, roles:roles, limits:limits,
    amendments:[
      {id:'AM1', no:'AMD/2026/0007', wo:'WO/PWD/2026/000107', date:'2026-08-05', type:'Delivery Extension',
       field:'Delivery Due Date', oldv:'2026-08-20', newv:'2026-09-05', value:0,
       reason:'Vendor request on account of supply chain delay, LD waived by competent authority',
       authority:'Head of Office', status:'Approved'}
    ],
    plans:[
      {id:'PP1', no:'PP/DIT/2026/0011', reqs:'MR/DIT/2026/000340, MR/DIT/2026/000343', mode:'Open Tender', value:34250000,
       officer:'Anil Katwale', budget:COA[0], ref:'TND/2026/10042', expected:'2026-09-15', insp:'Yes', warr:'Yes', asset:'Yes', status:'Approved'},
      {id:'PP2', no:'PP/EDU/2026/0014', reqs:'MR/DIT/2026/000346', mode:'Rate Contract', value:8400000,
       officer:'R. Meena', budget:COA[1], ref:'TND/2026/10058', expected:'2026-08-20', insp:'No', warr:'No', asset:'No', status:'Approved'},
      {id:'PP3', no:'PP/HLT/2026/0019', reqs:'MR/DIT/2026/000349', mode:'Open Tender', value:12600000,
       officer:'S. Bansal', budget:COA[2], ref:'TND/2026/10086', expected:'2026-09-20', insp:'Yes', warr:'No', asset:'No', status:'Under Review'},
      {id:'PP4', no:'PP/PWD/2026/0023', reqs:'MR/DIT/2026/000361', mode:'Open Tender', value:9880000,
       officer:'P. Kaur', budget:COA[3], ref:'TND/2026/10103', expected:'2026-10-10', insp:'Yes', warr:'No', asset:'No', status:'Draft'}
    ]
  };
}

/* ------------------------------------------------------------
   4. TOAST / MODAL / CONFIRM
   ------------------------------------------------------------ */
function toast(msg, kind, ttl){
  kind = kind || 'in';
  var icons = {ok:'\u2713', wa:'\u26A0', er:'\u2716', in:'\u2139'};
  var el = document.createElement('div');
  el.className = 'toast '+(kind==='in'?'':kind);
  el.innerHTML = '<span class="ti">'+icons[kind]+'</span><span class="tx">'+msg+'</span>'+
                 '<button class="tc" aria-label="Dismiss">&times;</button>';
  el.querySelector('.tc').onclick = function(){ el.remove(); };
  document.getElementById('toasts').appendChild(el);
  setTimeout(function(){ el.style.opacity='0'; setTimeout(function(){ el.remove(); },250); }, ttl||4200);
}
var modalStack = [];
function modal(opts){
  var id = uid('MD');
  var ovl = document.createElement('div');
  ovl.className = 'ovl'; ovl.dataset.id = id;
  ovl.innerHTML =
    '<div class="mdl '+(opts.size||'')+'" role="dialog" aria-modal="true" aria-label="'+esc(opts.title||'Dialog')+'">'+
      '<div class="mh"><div class="t">'+(opts.title||'')+'</div>'+
        '<button class="x" data-close aria-label="Close dialog">&times;</button></div>'+
      '<div class="mb">'+(opts.body||'')+'</div>'+
      (opts.footer===false ? '' : '<div class="mf">'+(opts.footer||'<button class="btn" data-close>Close</button>')+'</div>')+
    '</div>';
  document.getElementById('modalRoot').appendChild(ovl);
  modalStack.push(ovl);
  ovl.addEventListener('click', function(e){
    if(e.target===ovl || e.target.hasAttribute('data-close')) closeModal(id);
  });
  if(opts.onMount) opts.onMount(ovl);
  return id;
}
function closeModal(id){
  var ovl = id ? document.querySelector('.ovl[data-id="'+id+'"]') : modalStack[modalStack.length-1];
  if(!ovl) return;
  modalStack = modalStack.filter(function(o){ return o!==ovl; });
  ovl.remove();
}
function closeAllModals(){ modalStack.forEach(function(o){ o.remove(); }); modalStack = []; }
document.addEventListener('keydown', function(e){
  if(e.key==='Escape'){ if(modalStack.length) closeModal(); else closeDD(); }
});
function confirmAct(opts, cb){
  var needReason = !!opts.reason;
  modal({
    title: opts.title || 'Confirm action', size:'sm',
    body: '<div class="note '+(opts.kind||'wa')+'" style="margin-bottom:11px">'+(opts.message||'Please confirm.')+'</div>'+
      (opts.detail ? '<table class="kv">'+opts.detail+'</table>' : '')+
      (needReason ? '<div style="margin-top:11px"><label class="fl" for="cfR">Reason / remarks<span class="rq">*</span></label>'+
        '<textarea class="inp" id="cfR" rows="3" placeholder="Recorded in the audit trail"></textarea>'+
        '<div class="ferr" id="cfE">Enter a reason. It is stored in the audit trail.</div></div>' : ''),
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn '+(opts.btnClass||'pri')+'" id="cfOk">'+(opts.ok||'Confirm')+'</button>',
    onMount: function(ovl){
      ovl.querySelector('#cfOk').onclick = function(){
        var reason = '';
        if(needReason){
          reason = ovl.querySelector('#cfR').value.trim();
          if(!reason){ ovl.querySelector('#cfE').classList.add('show'); ovl.querySelector('#cfR').classList.add('err'); return; }
        }
        closeModal(ovl.dataset.id);
        cb(reason);
      };
    }
  });
}

/* ------------------------------------------------------------
   10. AUDIT LOGGING
   ------------------------------------------------------------ */
function logAudit(type, ref, action, field, oldv, newv, reason){
  DB.trail.unshift({
    id:uid('AT'), ts: nowIso(), type:type, ref:ref, action:action,
    field:field||'\u2014', oldv:oldv||'\u2014', newv:newv||'\u2014', reason:reason||'\u2014',
    by:'Anil Katwale', role:'Procurement Officer', dept:DEPTS[0],
    approval:'\u2014', src:'IFMS Web', ip:'10.24.8.117'
  });
  if(DB.trail.length > 400) DB.trail.length = 400;
  save();
}
function auditTableHtml(rows){
  if(!rows || !rows.length) return '<div class="note in">No audit entry recorded against this record yet.</div>';
  return '<div class="twrap" style="max-height:320px"><table class="tbl"><thead><tr>'+
    ['Timestamp','Action','Field','Old Value','New Value','Reason','User','Role','Source']
    .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
    rows.map(function(t){
      return '<tr><td class="nowrap">'+fdatetime(t.ts)+'</td><td>'+esc(t.action)+'</td><td>'+esc(t.field)+'</td>'+
        '<td>'+esc(t.oldv)+'</td><td>'+esc(t.newv)+'</td><td>'+esc(t.reason)+'</td>'+
        '<td>'+esc(t.by)+'</td><td>'+esc(t.role)+'</td><td>'+esc(t.src)+'</td></tr>';
    }).join('')+'</tbody></table></div>';
}
function notify(kind, title, sub, route){
  DB.notifications.unshift({id:uid('NT'), kind:kind, title:title, sub:sub, route:route, read:false, ts:TODAY});
  save(); paintNotifCount();
}

/* ------------------------------------------------------------
   12. REPORT EXPORT
   ------------------------------------------------------------ */
function toCsv(rows){
  return rows.map(function(r){
    return r.map(function(c){
      var s = String(c===null||c===undefined?'':c).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ')
        .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\u20B9/g,'Rs.');
      return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
    }).join(',');
  }).join('\r\n');
}
function download(name, text){
  try{
    var blob = new Blob([text], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 400);
    return true;
  }catch(e){ return false; }
}
function exportCsv(name, cols, rows){
  var head = cols.map(function(c){ return c.h; });
  var body = rows.map(function(r){
    return cols.map(function(c){
      var v = c.csv ? c.csv(r) : (c.f ? c.f(r) : r[c.k]);
      return String(v===null||v===undefined?'':v).replace(/<[^>]*>/g,'');
    });
  });
  var ok = download(name+'.csv', toCsv([head].concat(body)));
  toast(ok ? 'Export generated: <b>'+esc(name)+'.csv</b> ('+rows.length+' rows).'
           : 'The browser blocked the download. The data is ready \u2014 allow downloads and try again.', ok?'ok':'wa');
}

/* ------------------------------------------------------------
   5. TABLE ENGINE
   ------------------------------------------------------------ */
var TBL = {};
function renderTable(cfg){
  TBL[cfg.id] = Object.assign({page:1, size:10, sortK:null, sortD:1, q:'', sel:[]}, TBL[cfg.id]||{}, cfg);
  return '<div id="'+cfg.id+'_host">'+tableHtml(cfg.id)+'</div>';
}
function tableHtml(id){
  var st = TBL[id];
  var rows = st.rows.slice();
  if(st.q){
    var q = st.q.toLowerCase();
    rows = rows.filter(function(r){
      return st.cols.some(function(c){
        var v = c.f ? c.f(r) : r[c.k];
        return String(v===null||v===undefined?'':v).replace(/<[^>]*>/g,'').toLowerCase().indexOf(q)>=0;
      });
    });
  }
  if(st.sortK){
    var c0 = st.cols.filter(function(x){ return x.k===st.sortK; })[0] || {k:st.sortK};
    rows.sort(function(a,b){
      var va = c0.sv ? c0.sv(a) : a[c0.k], vb = c0.sv ? c0.sv(b) : b[c0.k];
      if(typeof va==='number' && typeof vb==='number') return (va-vb)*st.sortD;
      va = String(va===null||va===undefined?'':va).replace(/<[^>]*>/g,'');
      vb = String(vb===null||vb===undefined?'':vb).replace(/<[^>]*>/g,'');
      return va.localeCompare(vb, undefined, {numeric:true})*st.sortD;
    });
  }
  var total = rows.length;
  var pages = Math.max(1, Math.ceil(total/st.size));
  if(st.page>pages) st.page = pages;
  var view = rows.slice((st.page-1)*st.size, st.page*st.size);

  var h = '<div class="twrap"><table class="tbl"><thead><tr>';
  if(st.select) h += '<th style="width:30px"><input type="checkbox" aria-label="Select all" onchange="tblSelAll(\''+id+'\',this.checked)"></th>';
  st.cols.forEach(function(c){
    var s = c.srt===false ? '' : ' srt';
    var ar = st.sortK===c.k ? (st.sortD>0?'\u25B2':'\u25BC') : '\u21C5';
    h += '<th class="'+(c.cls||'')+s+'"'+(c.w?' style="width:'+c.w+'"':'')+
      (c.srt===false?'':' onclick="tblSort(\''+id+'\',\''+c.k+'\')"')+'>'+esc(c.h)+
      (c.srt===false?'':'<span class="ar">'+ar+'</span>')+'</th>';
  });
  h += '</tr></thead><tbody>';
  if(!view.length){
    h += '<tr><td colspan="'+(st.cols.length+(st.select?1:0))+'"><div class="tbl-empty">'+
      '<div class="big">\u25A6</div><div class="fw6">'+(st.empty||'Nothing to show here yet')+'</div>'+
      '<div class="muted" style="font-size:11.5px;margin-top:4px">Change the filters, or add a record to get started.</div></div></td></tr>';
  } else {
    view.forEach(function(r,i){
      var rid = r.id || (i+'');
      h += '<tr'+(st.sel.indexOf(rid)>=0?' class="sel"':'')+'>';
      if(st.select) h += '<td onclick="event.stopPropagation()"><input type="checkbox" aria-label="Select row" '+
        (st.sel.indexOf(rid)>=0?'checked':'')+' onchange="tblSelOne(\''+id+'\',\''+rid+'\',this.checked)"></td>';
      st.cols.forEach(function(c){
        var v = c.f ? c.f(r) : esc(r[c.k]);
        h += '<td class="'+(c.cls||'')+'">'+
             (v===null||v===undefined||v==='' ? '<span class="muted">\u2014</span>' : v)+'</td>';
      });
      h += '</tr>';
    });
  }
  h += '</tbody>'+(st.foot? '<tfoot>'+st.foot(rows)+'</tfoot>':'')+'</table></div>';

  h += '<div class="pager"><div>Showing <b>'+(total?((st.page-1)*st.size+1):0)+'</b>\u2013<b>'+
       Math.min(st.page*st.size,total)+'</b> of <b>'+total+'</b> record(s)'+
       (st.sel.length? ' &middot; <b>'+st.sel.length+'</b> selected':'')+'</div>'+
       '<div class="pg"><span class="muted" style="margin-right:6px">Rows</span>'+
       '<select class="inp" aria-label="Rows per page" style="width:62px;padding:3px 5px" onchange="tblSize(\''+id+'\',this.value)">'+
       [10,25,50,100].map(function(n){ return '<option '+(st.size===n?'selected':'')+'>'+n+'</option>'; }).join('')+'</select>';
  h += '<button onclick="tblPage(\''+id+'\',1)" '+(st.page===1?'disabled':'')+'>&laquo;</button>';
  h += '<button onclick="tblPage(\''+id+'\','+(st.page-1)+')" '+(st.page===1?'disabled':'')+'>&lsaquo;</button>';
  var from = Math.max(1, st.page-2), to = Math.min(pages, from+4);
  for(var p=from;p<=to;p++) h += '<button class="'+(p===st.page?'on':'')+'" onclick="tblPage(\''+id+'\','+p+')">'+p+'</button>';
  h += '<button onclick="tblPage(\''+id+'\','+(st.page+1)+')" '+(st.page===pages?'disabled':'')+'>&rsaquo;</button>';
  h += '<button onclick="tblPage(\''+id+'\','+pages+')" '+(st.page===pages?'disabled':'')+'>&raquo;</button>';
  h += '</div></div>';
  return h;
}
function tblPaint(id){
  var host = document.getElementById(id+'_host');
  if(host) host.innerHTML = tableHtml(id);
}
function tblSort(id,k){ var s=TBL[id]; if(s.sortK===k) s.sortD*=-1; else {s.sortK=k;s.sortD=1;} tblPaint(id); }
function tblPage(id,p){ TBL[id].page=Math.max(1,p); tblPaint(id); }
function tblSize(id,n){ var s=TBL[id]; s.size=+n; s.page=1; tblPaint(id); }
function tblSearch(id,q){ var s=TBL[id]; s.q=q; s.page=1; tblPaint(id); }
function tblSelAll(id,on){ var s=TBL[id]; s.sel = on ? s.rows.map(function(r){ return r.id; }) : []; tblPaint(id); }
function tblSelOne(id,rid,on){
  var s=TBL[id];
  s.sel = on ? s.sel.concat([rid]) : s.sel.filter(function(x){ return x!==rid; });
  tblPaint(id);
}
function tblRows(id){ return TBL[id].rows.filter(function(r){ return TBL[id].sel.indexOf(r.id)>=0; }); }
function tblExport(id,name){
  var s=TBL[id];
  exportCsv(name, s.cols.filter(function(c){ return c.cls!=='acts'; }), s.rows);
}
function tblReload(id, rows){ if(TBL[id]){ TBL[id].rows = rows; TBL[id].page = 1; TBL[id].sel = []; tblPaint(id); } }

/* ------------------------------------------------------------
   6. FORM ENGINE
   ------------------------------------------------------------ */
function fld(o){
  var t = o.type || 'text';
  var ctl;
  var common = 'id="'+o.id+'" class="inp '+(o.cls||'')+'"'+(o.ro?' readonly':'')+
    (o.ph?' placeholder="'+esc(o.ph)+'"':'')+(o.onchange?' onchange="'+o.onchange+'"':'')+
    (o.req?' data-req="1"':'')+(o.num?' data-num="1"':'')+(o.date?' data-date="1"':'');
  if(t==='select'){
    ctl = '<select '+common+(o.disabled?' disabled':'')+'>'+
      (o.blank!==false?'<option value="">'+(o.blank||'-- Select --')+'</option>':'')+
      (o.opts||[]).map(function(v){
        var val = (typeof v==='object')? v.v : v, lab = (typeof v==='object')? v.l : v;
        return '<option value="'+esc(val)+'"'+(String(o.val)===String(val)?' selected':'')+'>'+esc(lab)+'</option>';
      }).join('')+'</select>';
  } else if(t==='textarea'){
    ctl = '<textarea '+common+' rows="'+(o.rows||3)+'">'+esc(o.val||'')+'</textarea>';
  } else if(t==='checkbox'){
    return '<label class="chk"><input type="checkbox" id="'+o.id+'" '+(o.val?'checked':'')+
      (o.onchange?' onchange="'+o.onchange+'"':'')+'> '+esc(o.label)+'</label>';
  } else {
    ctl = '<input type="'+t+'" '+common+' value="'+esc(o.val===0?0:(o.val||''))+'"'+
      (o.min!==undefined?' min="'+o.min+'"':'')+(o.max!==undefined?' max="'+o.max+'"':'')+
      (o.step?' step="'+o.step+'"':'')+'>';
  }
  return '<div class="ffield">'+
    (o.label? '<label class="fl" for="'+o.id+'">'+esc(o.label)+(o.req?'<span class="rq">*</span>':'')+'</label>':'')+
    ctl+(o.hint?'<div class="hint">'+o.hint+'</div>':'')+
    '<div class="ferr" id="'+o.id+'_e">'+(o.msg||'This field is required.')+'</div></div>';
}
function val(id){ var e=document.getElementById(id); return e ? (e.type==='checkbox'? e.checked : e.value) : ''; }
function nval(id){ return Number(val(id)||0); }
function setVal(id,v){ var e=document.getElementById(id); if(e){ if(e.type==='checkbox') e.checked=!!v; else e.value=v; } }
function markErr(id, on, msg){
  var e = document.getElementById(id), b = document.getElementById(id+'_e');
  if(e) e.classList.toggle('err', !!on);
  if(b){ b.classList.toggle('show', !!on); if(msg) b.textContent = msg; }
}
function validate(scope){
  var root = scope ? (typeof scope==='string'? document.getElementById(scope) : scope) : document;
  if(!root) return {ok:true, missing:[]};
  var missing = [];
  function labelOf(e){
    var lab = root.querySelector('label[for="'+e.id+'"]');
    return lab ? lab.textContent.replace('*','').trim() : e.id;
  }
  Array.prototype.forEach.call(root.querySelectorAll('[data-req]'), function(e){
    var bad = !(e.value||'').trim();
    markErr(e.id, bad);
    if(bad) missing.push(labelOf(e));
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-num]'), function(e){
    if(e.value!=='' && (isNaN(Number(e.value)) || Number(e.value)<0)){
      markErr(e.id,true,'Enter a number of zero or more.');
      missing.push(labelOf(e));
    }
  });
  Array.prototype.forEach.call(root.querySelectorAll('[data-date]'), function(e){
    if(e.value && isNaN(new Date(e.value))){ markErr(e.id,true,'Enter a valid date.'); missing.push(labelOf(e)); }
  });
  return {ok: uniq(missing).length===0, missing: uniq(missing)};
}
function requireOk(scope){
  var r = validate(scope);
  if(!r.ok) toast('Complete these fields: <b>'+esc(r.missing.slice(0,6).join(', '))+
    (r.missing.length>6?' and '+(r.missing.length-6)+' more':'')+'</b>.','er');
  return r.ok;
}
function tabsHtml(group, items){
  return '<div class="tabs">'+items.map(function(t,i){
    return '<div class="tab'+(i===0?' on':'')+'" data-g="'+group+'" data-p="'+i+'" onclick="switchTab(\''+group+'\','+i+')">'+
      esc(t)+'</div>';
  }).join('')+'</div>';
}
function switchTab(group, i){
  Array.prototype.forEach.call(document.querySelectorAll('.tab[data-g="'+group+'"]'), function(t){
    t.classList.toggle('on', +t.dataset.p===i);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.tpane[data-g="'+group+'"]'), function(p){
    p.classList.toggle('on', +p.dataset.p===i);
  });
}
function pane(group, i, html){
  return '<div class="tpane'+(i===0?' on':'')+'" data-g="'+group+'" data-p="'+i+'">'+html+'</div>';
}
var ATT_NAMES = ['Specification_Sheet.pdf','Board_Resolution.pdf','Quotation_Scan.pdf','Delivery_Challan.pdf',
  'Inspection_Report.pdf','Photograph_01.jpg','Comparative_Statement.xlsx','Sanction_Order.pdf'];
function attachWidget(id, list){
  return '<div class="drop" onclick="addAttach(\''+id+'\')"><div class="i">\u{1F4CE}</div>'+
    '<div class="fw6" style="font-size:12.5px;margin-top:4px">Attach a supporting document</div>'+
    '<div class="hint">PDF, JPG or XLSX up to 10 MB.</div></div>'+
    '<div class="chips" id="'+id+'" style="margin-top:8px">'+(list||[]).map(function(n){ return attChip(n); }).join('')+'</div>';
}
function attChip(n){
  return '<span class="chip">\u{1F4C4} '+esc(n)+'<span class="rm" onclick="this.parentNode.remove()">&times;</span></span>';
}
function addAttach(id){
  var box = document.getElementById(id);
  var n = ATT_NAMES[box.children.length % ATT_NAMES.length];
  box.insertAdjacentHTML('beforeend', attChip(n));
  toast('Attached <b>'+esc(n)+'</b>.','ok');
}
function attList(id){
  var box = document.getElementById(id);
  return box ? Array.prototype.map.call(box.children, function(c){
    return c.textContent.replace('\u00d7','').replace('\u{1F4C4}','').trim();
  }) : [];
}

/* ------------------------------------------------------------
   11. INTEGRATION SIMULATION
   ------------------------------------------------------------ */
function simulateSync(){
  toast('<span class="spin"></span> Synchronising procurement portals&hellip;','in',1600);
  setTimeout(function(){
    var got = 0;
    DB.portals.forEach(function(p){
      var n = 4 + Math.floor(Math.random()*9);
      p.recd += n; p.proc += n; p.last = nowIso();
      if(p.status==='Degraded'){ p.failed += 1; p.pending += 1; }
      got += n;
    });
    logAudit('Integration','All portals','Synchronised','Sync Status','Pending','Success', got+' records received');
    commit('Portal sync finished. <b>'+got+'</b> new records received.','ok');
    if(ROUTE==='admin/integration') goto('admin/integration');
  }, 1500);
}

/* ------------------------------------------------------------
   7. NAVIGATION
   ------------------------------------------------------------ */
var NAV = [
  {ic:'\u25A6', t:'Dashboard', r:'dash'},
  {ic:'\u{1F4E6}', t:'Material Master', items:[
    ['Material Register','mm/register'],['Create Material','mm/create'],['Material Category','mm/category'],
    ['UOM Master','mm/uom'],['Material-BoQ Mapping','mm/boq'],['Bulk Upload','mm/bulk']]},
  {ic:'\u{1F4DD}', t:'Requisition Management', items:[
    ['Create Requisition','req/create'],['My Requisitions','req/list'],
    ['Pending Approvals','req/approvals'],['Requisition Consolidation','req/consolidate']]},
  {ic:'\u{1F3F7}', t:'Procurement Management', items:[
    ['Procurement Plan','proc/plan'],['Tender / BoQ','proc/tender'],['Quotation Management','proc/quotes'],
    ['Vendor Evaluation','proc/eval'],['Comparative Statement','proc/cs'],
    ['Tender Fee / EMD','proc/emd'],['Performance Guarantee','proc/pg']]},
  {ic:'\u{1F4C4}', t:'Work Order / Purchase Order', items:[
    ['Create Work Order','wo/create'],['Work Order Register','wo/list'],
    ['Amendments','wo/amend'],['Delivery Tracking','wo/delivery']]},
  {ic:'\u{1F4E5}', t:'Receipt and Inspection', items:[
    ['Goods Receipt Note','grn/list'],['Pending Inspection','grn/pending'],
    ['Inspection Register','grn/inspection'],['Return to Vendor','grn/rtv']]},
  {ic:'\u{1F3E2}', t:'Inventory Integration', items:[
    ['Stock Overview','inv/stock'],['Material Movement','inv/movement'],['Stock Transfer','inv/transfer'],
    ['Stock Issue','inv/issue'],['Stock Return','inv/return'],['Tool Issuance','inv/tools'],
    ['Reorder Planning','inv/reorder']]},
  {ic:'\u{1F4B0}', t:'Billing and Finance Interface', items:[
    ['Invoice Register','billing/invoice'],['Three-Way Matching','billing/match'],
    ['Bill Initiation','billing/initiate'],['Payment Status','billing/payment']]},
  {ic:'\u{1F6E1}', t:'Warranty and Defects', items:[
    ['Warranty Register','warranty/list'],['Defect Complaints','warranty/defects'],
    ['Repair / Replacement','warranty/repair'],['Vendor Escalation','warranty/escalation']]},
  {ic:'\u267B', t:'Disposal Management', items:[
    ['Disposal Proposal','disp/proposal'],['Condemnation Register','disp/condemn'],
    ['Auction / Scrap Sale','disp/auction'],['Disposal Register','disp/register']]},
  {ic:'\u2696', t:'Stock Audit and Reconciliation', items:[
    ['Physical Verification','audit/pv'],['Stock Reconciliation','audit/recon'],['Stock Adjustment','audit/adjust']]},
  {ic:'\u{1F4C8}', t:'Demand Forecasting', items:[
    ['Consumption Analysis','fc/consumption'],['Demand Forecast','fc/forecast'],['Suggested Reorder','fc/reorder']]},
  {ic:'\u{1F4CA}', t:'Reports and MIS', items:[
    ['Procurement MIS','rep/procurement'],['Inventory MIS','rep/inventory'],
    ['Vendor Performance','rep/vendor'],['Audit Trail','rep/trail']]},
  {ic:'\u2699', t:'Administration', items:[
    ['Workflow Configuration','admin/workflow'],['Approval Limits','admin/limits'],
    ['Notification Rules','admin/rules'],['Integration Monitor','admin/integration'],
    ['User Role Mapping','admin/roles']]}
];
var TITLES = {};
NAV.forEach(function(g){
  if(g.r) TITLES[g.r] = {t:g.t, g:'Home'};
  (g.items||[]).forEach(function(it){ TITLES[it[1]] = {t:it[0], g:g.t}; });
});

function buildSidebar(){
  var h = '';
  NAV.forEach(function(g,gi){
    if(g.r){
      h += '<div class="nav-i" data-r="'+g.r+'" onclick="goto(\''+g.r+'\')">'+
           '<span class="ic">'+g.ic+'</span><span class="lbl">'+esc(g.t)+'</span></div>';
    } else {
      var cnt = navCount(g.t);
      h += '<div class="nav-i" data-g="'+gi+'" onclick="toggleGrp('+gi+')">'+
           '<span class="ic">'+g.ic+'</span><span class="lbl">'+esc(g.t)+'</span>'+
           (cnt?'<span class="cnt" data-cnt="'+gi+'">'+cnt+'</span>':'')+
           '<span class="car">\u25B6</span></div>'+
           '<div class="sub" id="sub'+gi+'">'+
           g.items.map(function(it){
             return '<div class="nav-s" data-r="'+it[1]+'" onclick="goto(\''+it[1]+'\')">'+esc(it[0])+'</div>';
           }).join('')+'</div>';
    }
  });
  h += '<div class="sfoot">IFMS Material Management<br>Version 1.0 &middot; UAT build<br>'+
       '<span style="opacity:.8">Data: '+Store.mode+'</span></div>';
  document.getElementById('side').innerHTML = h;
}
function navCount(group){
  if(!DB) return 0;
  switch(group){
    case 'Requisition Management': return DB.requisitions.filter(function(r){ return ['Submitted','Under Review','Budget Validation Pending'].indexOf(r.status)>=0; }).length;
    case 'Receipt and Inspection': return DB.grns.filter(function(g){ return g.inspection==='Pending'||g.inspection==='Under Inspection'; }).length;
    case 'Billing and Finance Interface': return DB.invoices.filter(function(i){ return i.finance!=='Approved'; }).length;
    case 'Warranty and Defects': return DB.defects.filter(function(d){ return ['Resolved','Closed','Out of Warranty'].indexOf(d.status)<0; }).length;
    case 'Disposal Management': return DB.disposals.filter(function(d){ return d.approval==='Pending'; }).length;
    case 'Inventory Integration': return DB.stock.filter(function(s){ return s.avail < s.reorder; }).length;
    default: return 0;
  }
}
function refreshNavCounts(){
  NAV.forEach(function(g,gi){
    var el = document.querySelector('[data-cnt="'+gi+'"]');
    if(el) el.textContent = navCount(g.t);
  });
}
function toggleGrp(gi){
  var head = document.querySelector('.nav-i[data-g="'+gi+'"]');
  var sub = document.getElementById('sub'+gi);
  var open = sub.classList.toggle('open');
  head.classList.toggle('open', open);
}
var ROUTE = 'dash';
function goto(r){
  ROUTE = r;
  closeAllModals(); closeDD();
  Array.prototype.forEach.call(document.querySelectorAll('.nav-i[data-r],.nav-s[data-r]'), function(e){
    e.classList.toggle('on', e.dataset.r===r);
  });
  NAV.forEach(function(g,gi){
    if(g.items && g.items.some(function(i){ return i[1]===r; })){
      var sub = document.getElementById('sub'+gi);
      if(sub && !sub.classList.contains('open')) toggleGrp(gi);
    }
  });
  if(window.innerWidth<=900) document.body.classList.remove('sopen');
  var fn = SCREENS[r];
  var host = document.getElementById('view');
  if(!fn){
    host.innerHTML = pageHead(TITLES[r]?TITLES[r].t:'Screen', TITLES[r]?TITLES[r].g:'', 'This screen is not part of the demo build.')+
      '<div class="card"><div class="bd"><div class="note in">Screen not available.</div></div></div>';
    return;
  }
  host.innerHTML = fn();
  if(SCREENS_AFTER[r]) SCREENS_AFTER[r]();
  window.scrollTo(0,0);
  refreshNavCounts();
}
function pageHead(title, group, sub, actions, tags){
  return '<div class="crumb">IFMS &rsaquo; Material Management'+(group?' &rsaquo; <b>'+esc(group)+'</b>':'')+'</div>'+
    '<div class="phead"><div><h1 class="ptitle">'+esc(title)+'</h1>'+
    (sub?'<p class="psub">'+sub+'</p>':'')+(tags?'<div style="margin-top:5px">'+tags+'</div>':'')+'</div>'+
    '<div class="btn-row no-print">'+(actions||'')+'</div></div>';
}
function reqTags(){
  return Array.prototype.slice.call(arguments).map(function(t){ return '<span class="req-tag">'+t+'</span>'; }).join('');
}
function kvRow(k,v){ return '<tr><td>'+esc(k)+'</td><td>'+(v===undefined?'\u2014':v)+'</td></tr>'; }

/* header dropdowns */
function closeDD(){ var r = document.getElementById('ddRoot'); if(r) r.innerHTML = ''; }
function openDD(html){
  var r = document.getElementById('ddRoot');
  r.innerHTML = '<div class="dd">'+html+'</div>';
  setTimeout(function(){
    document.addEventListener('click', function h(e){
      if(!e.target.closest('.dd') && !e.target.closest('#btnUser') && !e.target.closest('#btnBell')){
        closeDD(); document.removeEventListener('click', h);
      }
    });
  },10);
}
function userMenu(){
  openDD('<div class="hd"><div class="a">Anil Katwale</div>'+
    '<div class="b">Procurement Officer<br>Directorate of Information Technology</div></div>'+
    '<a onclick="closeDD();showProfile()">\u{1F464} My profile</a>'+
    '<a onclick="closeDD();goto(\'admin/roles\')">\u{1F510} Role and permissions</a>'+
    '<a onclick="closeDD();goto(\'rep/trail\')">\u{1F553} My activity log</a>'+
    '<a onclick="closeDD();resetDemo()">\u267B Reset demo data</a>'+
    '<a class="danger" onclick="closeDD();logoutSim()">\u23FB Log out</a>');
}
function showProfile(){
  modal({title:'My profile', size:'sm', body:'<table class="kv">'+
    kvRow('Name','Anil Katwale')+kvRow('Employee code','GNCTD/DIT/04412')+
    kvRow('Role','Procurement Officer')+kvRow('Department','Directorate of Information Technology')+
    kvRow('Office','Delhi Secretariat, I.P. Estate')+kvRow('Approval limit','\u20B9 25,00,000 per case')+
    kvRow('Stores mapped','IT Store \u2013 Delhi Secretariat, Central Store \u2013 Civil Lines')+
    kvRow('Financial year','FY 2026-27')+kvRow('Environment','UAT / Demo')+'</table>'});
}
function logoutSim(){
  confirmAct({title:'Log out', message:'You will be signed out of the demo session. Saved demo data is kept.',
    ok:'Log out', btnClass:'dgr'}, function(){ toast('Signed out. Reload the page to sign in again.','wa'); });
}
function resetDemo(){
  confirmAct({title:'Reset demo data', kind:'er', btnClass:'dgr', ok:'Reset everything',
    message:'Every demo record you created or changed is discarded and the original sample data restored.'},
    function(){ Store.clear(); DB = seedDB(); save(); buildSidebar(); goto('dash'); paintNotifCount();
      toast('Demo data reset to the original sample set.','ok'); });
}
function notifMenu(){
  var list = DB.notifications;
  openDD('<div class="hd"><div class="a">Notifications</div>'+
    '<div class="b">'+list.filter(function(n){ return !n.read; }).length+' unread of '+list.length+'</div></div>'+
    '<div class="nlist">'+ (list.length? list.map(function(n){
      return '<div class="nrow" onclick="closeDD();markRead(\''+n.id+'\');goto(\''+n.route+'\')">'+
      '<span class="dot" style="background:'+({er:'#B91C1C',wa:'#B45309',ok:'#15803D',in:'#1E5A96'}[n.kind])+'"></span>'+
      '<div><div class="t">'+esc(n.title)+'</div><div class="s">'+esc(n.sub)+' &middot; '+fdate(n.ts)+'</div></div></div>';
    }).join('') : '<div style="padding:16px;text-align:center" class="muted">Nothing needs your attention.</div>')+'</div>'+
    '<a onclick="closeDD();markAllRead()">\u2713 Mark all as read</a>');
}
function markRead(id){ var n = byId(DB.notifications,'id',id); if(n) n.read = true; save(); paintNotifCount(); }
function markAllRead(){ DB.notifications.forEach(function(n){ n.read=true; }); save(); paintNotifCount(); toast('All notifications marked as read.','ok'); }
function paintNotifCount(){
  var n = DB.notifications.filter(function(x){ return !x.read; }).length;
  var el = document.getElementById('notifN');
  el.textContent = n; el.style.display = n? '':'none';
}

/* global search */
function globalSearch(q){
  var box = document.getElementById('gres');
  q = (q||'').trim().toLowerCase();
  if(q.length<2){ box.classList.add('hide'); return; }
  var hits = [];
  function push(k,label,route){ if(hits.length<20) hits.push({k:k,label:label,route:route}); }
  DB.materials.filter(function(m){ return (m.code+' '+m.name).toLowerCase().indexOf(q)>=0; }).slice(0,5)
    .forEach(function(m){ push('Material', m.code+' \u2014 '+m.name, 'mm/register'); });
  DB.requisitions.filter(function(r){ return (r.no+' '+r.dept).toLowerCase().indexOf(q)>=0; }).slice(0,4)
    .forEach(function(r){ push('Requisition', r.no+' \u2014 '+r.dept, 'req/list'); });
  DB.workorders.filter(function(w){ return (w.no+' '+w.vendor).toLowerCase().indexOf(q)>=0; }).slice(0,4)
    .forEach(function(w){ push('Work Order', w.no+' \u2014 '+vname(w.vendor), 'wo/list'); });
  DB.grns.filter(function(g){ return g.no.toLowerCase().indexOf(q)>=0; }).slice(0,3)
    .forEach(function(g){ push('GRN', g.no, 'grn/list'); });
  DB.tenders.filter(function(t){ return (t.no+' '+t.title).toLowerCase().indexOf(q)>=0; }).slice(0,3)
    .forEach(function(t){ push('Tender', t.no+' \u2014 '+t.title, 'proc/tender'); });
  DB.vendors.filter(function(v){ return v.party_name.toLowerCase().indexOf(q)>=0; }).slice(0,3)
    .forEach(function(v){ push('Vendor', v.party_name, 'rep/vendor'); });
  DB.invoices.filter(function(i){ return (i.no+' '+i.vinv).toLowerCase().indexOf(q)>=0; }).slice(0,3)
    .forEach(function(i){ push('Invoice', i.no+' \u2014 '+i.vinv, 'billing/invoice'); });
  box.innerHTML = hits.length
    ? hits.map(function(h){
        return '<a onclick="document.getElementById(\'gq\').value=\'\';document.getElementById(\'gres\').classList.add(\'hide\');goto(\''+h.route+'\')">'+
        '<div class="k">'+esc(h.k)+'</div>'+esc(h.label)+'</a>';
      }).join('')
    : '<div style="padding:14px" class="muted">No record matches that search.</div>';
  box.classList.remove('hide');
}
function vname(code){ var v = byId(DB.vendors,'party_code',code); return v? v.party_name : code; }
function mname(code){ var m = byId(DB.materials,'code',code); return m? m.name : code; }
function muom(code){ var m = byId(DB.materials,'code',code); return m? m.uom : ''; }
function mrate(code){ var m = byId(DB.materials,'code',code); return m? m.rate : 0; }
function mreorder(code){ var m = byId(DB.materials,'code',code); return m? m.reorder : 0; }

/* ---------------- chart helpers ---------------- */
function barChart(rows, opts){
  opts = opts||{};
  var max = Math.max.apply(null, [1].concat(rows.map(function(r){ return r.v; })));
  return '<div class="bars">'+rows.map(function(r){
    return '<div class="bar-r"><span title="'+esc(r.l)+'" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.l)+'</span>'+
    '<div class="bar-t"><div class="bar-f" style="width:'+(r.v/max*100).toFixed(1)+'%;background:'+(r.c||'#1E5A96')+'"></div></div>'+
    '<span class="bar-v">'+(opts.fmt? opts.fmt(r.v) : num(r.v))+'</span></div>';
  }).join('')+'</div>';
}
function colChart(rows, opts){
  opts = opts||{};
  var max = Math.max.apply(null, [1].concat(rows.map(function(r){ return r.v; })));
  return '<div class="cols">'+rows.map(function(r){
    return '<div class="col"><span class="cv">'+(opts.fmt?opts.fmt(r.v):num(r.v))+'</span>'+
    '<div class="cb" style="height:'+(r.v/max*100).toFixed(1)+'%;background:'+(r.c||'#1E5A96')+'"></div></div>';
  }).join('')+'</div><div class="col-x">'+rows.map(function(r){ return '<span>'+esc(r.l)+'</span>'; }).join('')+'</div>';
}
function donut(rows, size){
  size = size || 132;
  var tot = Math.max(1, sum(rows,'v'));
  var R = size/2, r = R*0.62, cx = R, cy = R;
  var a0 = -Math.PI/2, paths = '';
  rows.forEach(function(s){
    var a1 = a0 + (s.v/tot)*Math.PI*2;
    var large = (a1-a0) > Math.PI ? 1 : 0;
    var x0 = cx+R*Math.cos(a0), y0 = cy+R*Math.sin(a0);
    var x1 = cx+R*Math.cos(a1), y1 = cy+R*Math.sin(a1);
    var ix1 = cx+r*Math.cos(a1), iy1 = cy+r*Math.sin(a1);
    var ix0 = cx+r*Math.cos(a0), iy0 = cy+r*Math.sin(a0);
    if(s.v>0) paths += '<path d="M'+x0.toFixed(2)+' '+y0.toFixed(2)+
      ' A'+R+' '+R+' 0 '+large+' 1 '+x1.toFixed(2)+' '+y1.toFixed(2)+
      ' L'+ix1.toFixed(2)+' '+iy1.toFixed(2)+
      ' A'+r+' '+r+' 0 '+large+' 0 '+ix0.toFixed(2)+' '+iy0.toFixed(2)+' Z" fill="'+s.c+'"><title>'+
      esc(s.l)+': '+num(s.v)+'</title></path>';
    a0 = a1;
  });
  return '<div class="donut-wrap"><svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img">'+
    paths+'<text x="'+cx+'" y="'+(cy-2)+'" text-anchor="middle" font-size="15" font-weight="700" fill="#123B64">'+
    num(tot)+'</text><text x="'+cx+'" y="'+(cy+13)+'" text-anchor="middle" font-size="9" fill="#7386A0">TOTAL</text></svg>'+
    '<div class="legend" style="flex-direction:column;gap:5px">'+rows.map(function(s){
      return '<span><i style="background:'+s.c+'"></i>'+esc(s.l)+' &mdash; <b>'+num(s.v)+'</b></span>';
    }).join('')+'</div></div>';
}
function hbar(rows){
  var tot = Math.max(1, sum(rows,'v'));
  return '<div class="hbar">'+rows.map(function(s){
    return '<span style="width:'+(s.v/tot*100)+'%;background:'+s.c+'" title="'+esc(s.l)+': '+num(s.v)+'"></span>';
  }).join('')+'</div><div class="legend">'+rows.map(function(s){
    return '<span><i style="background:'+s.c+'"></i>'+esc(s.l)+' <b>'+num(s.v)+'</b></span>';
  }).join('')+'</div>';
}
function kpiTile(label, value, delta, cls, route){
  return '<div class="kpi '+(cls||'')+'" onclick="goto(\''+route+'\')" title="Open '+esc(label)+'">'+
    '<div class="l">'+esc(label)+'</div><div class="v">'+value+'</div>'+
    (delta?'<div class="d">'+delta+'</div>':'')+'</div>';
}
function summaryRow(cards){
  return '<div class="grid g4" style="margin-bottom:12px">'+cards.map(function(c){
    return '<div class="scard" style="border-top:3px solid '+(c.c||'#1E5A96')+'"><div class="l">'+esc(c.l)+'</div>'+
    '<div class="v">'+c.v+'</div>'+(c.d?'<div class="hint">'+c.d+'</div>':'')+'</div>';
  }).join('')+'</div>';
}
function filterBar(fields, onApply, extra){
  return '<div class="fbar no-print"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:9px;align-items:end">'+
    fields.join('')+
    '<div class="btn-row" style="align-self:end">'+
      '<button class="btn sec sm" onclick="'+onApply+'">\u{1F50D} Search</button>'+(extra||'')+
    '</div></div></div>';
}
function actIcon(label, fn, cls){ return '<button class="btn xs '+(cls||'')+'" onclick="'+fn+'">'+label+'</button>'; }

var SCREENS = {};
var SCREENS_AFTER = {};

/* ------------------------------------------------------------
   8. DASHBOARD
   ------------------------------------------------------------ */
function dashCounts(){
  var D = DB, stk = D.stock;
  return {
    pendReq: D.requisitions.filter(function(r){ return ['Fully Procured','Closed','Rejected','Cancelled'].indexOf(r.status)<0; }).length + 118,
    awaitApp: D.requisitions.filter(function(r){ return ['Submitted','Under Review','Budget Validation Pending'].indexOf(r.status)>=0; }).length + 30,
    openWo: D.workorders.filter(function(w){ return ['Issued','Approved','Delayed'].indexOf(w.status)>=0; }).length + 71,
    woDue: 18,
    delayed: D.deliveries.filter(function(d){ return d.status==='Delayed'; }).length + 10,
    pendGrn: D.grns.filter(function(g){ return g.posting==='Pending'; }).length + 21,
    pendInsp: D.grns.filter(function(g){ return g.inspection==='Pending'||g.inspection==='Under Inspection'; }).length + 14,
    lowStock: stk.filter(function(s){ return s.avail>0 && s.avail < mreorder(s.mat); }).length + 35,
    stockOut: stk.filter(function(s){ return s.avail===0; }).length + 7,
    nearExp: stk.filter(function(s){ return s.expiry && daysBetween(TODAY,s.expiry)<=90; }).length + 15,
    defects: D.defects.filter(function(d){ return ['Resolved','Closed','Out of Warranty'].indexOf(d.status)<0; }).length + 5,
    disposal: D.disposals.filter(function(d){ return d.approval==='Pending'; }).length + 5,
    bills: D.invoices.filter(function(i){ return i.payment!=='Paid'; }).length + 16,
    emdRef: D.emds.filter(function(e){ return e.status==='Pending Refund'; }).length + 3,
    pgExp: D.pgs.filter(function(p){ return daysBetween(TODAY,p.expiry)<=90; }).length + 3
  };
}
SCREENS['dash'] = function(){
  var c = dashCounts(), D = DB;
  var stockVal = sum(D.stock, function(s){ return s.avail*s.rate; });
  var resVal = sum(D.stock, function(s){ return s.reserved*s.rate; });
  var blkVal = sum(D.stock, function(s){ return (s.blocked+s.damaged)*s.rate; });
  var inspVal = sum(D.stock, function(s){ return s.inspection*s.rate; });
  var expVal = sum(D.stock, function(s){ return s.expired*s.rate; });
  var dispVal = sum(D.disposals.filter(function(d){ return d.approval!=='Rejected'; }), 'book');

  var modeRows = MODES.slice(0,6).map(function(m,i){
    return {l:m, v:[34,21,9,26,48,17][i], c:['#123B64','#1E5A96','#0F766E','#B45309','#15803D','#6B21A8'][i]};
  });
  var delRows = [
    {l:'On Time', v:64, c:'#15803D'},{l:'Delayed', v:c.delayed, c:'#B91C1C'},
    {l:'Partial Delivery', v:D.deliveries.filter(function(d){ return d.status==='Partially Delivered'; }).length+9, c:'#B45309'},
    {l:'Pending Dispatch', v:D.deliveries.filter(function(d){ return d.status==='Not Dispatched'; }).length+7, c:'#7386A0'}
  ];
  var ageRows = [
    {l:'Fast Moving', v:42, c:'#15803D'},{l:'Slow Moving', v:23, c:'#B45309'},
    {l:'Non-Moving', v:14, c:'#B91C1C'},{l:'Near Expiry', v:c.nearExp, c:'#6B21A8'},{l:'Expired', v:6, c:'#7386A0'}
  ];
  var pipeline = [
    ['Requisition',c.pendReq],['Approval',c.awaitApp],
    ['Tender / Quotation',D.tenders.filter(function(t){ return ['Published','Bid Opened'].indexOf(t.status)>=0; }).length+12],
    ['Evaluation',D.tenders.filter(function(t){ return t.status==='Under Evaluation'; }).length+6],['Work Order',c.openWo],
    ['Delivery',D.deliveries.filter(function(d){ return d.status!=='Delivered'; }).length+22],['GRN',c.pendGrn],
    ['Billing',c.bills],['Closure',31]
  ];
  var vTop = VENDORS.slice().sort(function(a,b){ return b.rating-a.rating; });

  return pageHead('Executive Dashboard','Home',
    'Material Management position for FY 2026-27 as on '+fdate(TODAY)+' &middot; Directorate of Information Technology',
    '<button class="btn gh sm" onclick="simulateSync()">\u21BB Sync portals</button>'+
    '<button class="btn gh sm" onclick="window.print()">\u2399 Print</button>'+
    '<button class="btn pri sm" onclick="goto(\'req/create\')">+ New requisition</button>',
    reqTags('MMP_20','MMP_21')) +

  '<div class="grid g5" style="margin-bottom:12px">'+
    kpiTile('Pending requisitions', c.pendReq, 'Across all departments','', 'req/list')+
    kpiTile('Awaiting approval', c.awaitApp, 'With approving authority','k-wa','req/approvals')+
    kpiTile('Open work orders', c.openWo, c.woDue+' due this week','k-tl','wo/list')+
    kpiTile('Delayed deliveries', c.delayed, 'Past the delivery due date','k-er','wo/delivery')+
    kpiTile('Pending GRNs', c.pendGrn, 'Awaiting posting to inventory','k-wa','grn/list')+
  '</div>'+
  '<div class="grid g5" style="margin-bottom:12px">'+
    kpiTile('Pending inspections', c.pendInsp, 'Committee action due','k-wa','grn/pending')+
    kpiTile('Low stock materials', c.lowStock, 'Below reorder level','k-wa','inv/reorder')+
    kpiTile('Stock-out materials', c.stockOut, 'Nil balance in all stores','k-er','inv/stock')+
    kpiTile('Near expiry materials', c.nearExp, 'Within 90 days of expiry','k-er','inv/stock')+
    kpiTile('Open warranty defects', c.defects, 'Vendor redressal pending','k-er','warranty/defects')+
  '</div>'+
  '<div class="grid g5" style="margin-bottom:14px">'+
    kpiTile('Disposal cases pending', c.disposal, 'Condemnation approval due','k-wa','disp/proposal')+
    kpiTile('Pending vendor bills', c.bills, 'Three-way match in progress','k-tl','billing/invoice')+
    kpiTile('EMD refund pending', c.emdRef, 'Post-award refund due','k-nu','proc/emd')+
    kpiTile('Guarantees expiring soon', c.pgExp, 'Within 90 days','k-er','proc/pg')+
    kpiTile('Available stock value', inr0(stockVal).replace('\u20B9 ','\u20B9'), 'Across '+STORES.length+' stores','k-ok','inv/stock')+
  '</div>'+

  '<div class="card" style="margin-bottom:12px"><div class="hd"><span>Procurement pipeline</span>'+
    '<span class="muted" style="font-size:11px;font-weight:400">Live case count at each stage</span></div>'+
    '<div class="bd"><div class="pipe">'+pipeline.map(function(p,i){
      return '<div class="st'+(i===1||i===5?' hot':'')+'"><div class="n">'+p[1]+'</div><div class="l">'+esc(p[0])+'</div></div>';
    }).join('')+'</div></div></div>'+

  '<div class="grid g23" style="margin-bottom:12px">'+
    '<div class="card"><div class="hd"><span>Stock position by value</span></div><div class="bd">'+
      barChart([
        {l:'Available', v:Math.round(stockVal), c:'#15803D'},
        {l:'Reserved', v:Math.round(resVal), c:'#1E5A96'},
        {l:'Under inspection', v:Math.round(inspVal), c:'#B45309'},
        {l:'Blocked / damaged', v:Math.round(blkVal), c:'#B91C1C'},
        {l:'Expired', v:Math.round(expVal), c:'#6B21A8'},
        {l:'Disposal pending', v:Math.round(dispVal), c:'#7386A0'}
      ], {fmt:inr0})+
    '</div></div>'+
    '<div class="card"><div class="hd"><span>Procurement mode analysis</span>'+
      '<span class="muted" style="font-size:11px;font-weight:400">Cases in FY 2026-27</span></div>'+
      '<div class="bd">'+colChart(modeRows)+'</div></div>'+
  '</div>'+

  '<div class="grid g3" style="margin-bottom:12px">'+
    '<div class="card"><div class="hd"><span>Delivery status</span></div><div class="bd">'+donut(delRows)+'</div></div>'+
    '<div class="card"><div class="hd"><span>Inventory ageing</span></div><div class="bd">'+
      barChart(ageRows,{fmt:function(v){ return num(v)+' items'; }})+'</div></div>'+
    '<div class="card"><div class="hd"><span>Vendor performance</span>'+
      '<button class="btn xs gh" onclick="goto(\'rep/vendor\')">Scorecard</button></div><div class="bd">'+
      '<div class="sec-h">Top performing</div>'+
      vTop.slice(0,3).map(function(v){
        var ratingVal = (v && typeof v.rating === 'number') ? v.rating : 4.0;
        return '<div class="rag"><span class="s" style="background:#15803D">\u2713</span>'+
        '<span class="grow">'+esc(v ? v.name : '')+'</span><b>'+ratingVal.toFixed(1)+'</b></div>';
      }).join('')+
      '<div class="sec-h" style="margin-top:12px">Needs attention</div>'+
      vTop.slice(-2).map(function(v){
        var ratingVal = (v && typeof v.rating === 'number') ? v.rating : 4.0;
        return '<div class="rag"><span class="s" style="background:#B91C1C">!</span>'+
        '<span class="grow">'+esc(v ? v.name : '')+'</span><b>'+ratingVal.toFixed(1)+'</b></div>';
      }).join('')+
      '<div class="rag"><span class="s" style="background:#B45309">\u26A0</span>'+
        '<span class="grow">Open defects with vendors</span><b>'+c.defects+'</b></div>'+
    '</div></div>'+
  '</div>'+

  '<div class="grid g32">'+
    '<div class="card"><div class="hd"><span>Recent activity</span>'+
      '<button class="btn xs gh" onclick="goto(\'rep/trail\')">Full audit trail</button></div>'+
      '<div class="bd"><div class="tline">'+
        DB.trail.slice(0,8).map(function(t){
          var k = (t.action==='Exception Raised'||t.action==='Escalated') ? 'er'
                : ((t.action==='Approved'||t.action==='Posted'||t.action==='Synchronised') ? 'ok':'wa');
          return '<div class="tl-i '+k+'"><div class="t">'+esc(t.type)+' <b>'+esc(t.ref)+'</b> '+esc(t.action.toLowerCase())+'</div>'+
            '<div class="s">'+fdatetime(t.ts)+' &middot; '+esc(t.by)+' &middot; '+esc(t.reason)+'</div></div>';
        }).join('')+
      '</div></div></div>'+
    '<div class="card"><div class="hd"><span>Action required</span></div><div class="bd">'+
      [['Requisitions awaiting your approval', c.awaitApp, 'req/approvals','wa'],
       ['GRNs pending inspection', c.pendInsp, 'grn/pending','wa'],
       ['Invoices with matching exceptions', DB.invoices.filter(function(i){ return i.status==='Exception'; }).length, 'billing/match','er'],
       ['Materials below reorder level', c.lowStock, 'fc/reorder','wa'],
       ['Guarantees expiring within 90 days', c.pgExp, 'proc/pg','er'],
       ['Disposal proposals awaiting approval', c.disposal, 'disp/proposal','wa'],
       ['Portal records failed reconciliation', sum(DB.portals,'failed'), 'admin/integration','er']
      ].map(function(r){
        return '<div class="rag" style="cursor:pointer" onclick="goto(\''+r[2]+'\')">'+
        '<span class="s" style="background:'+(r[3]==='er'?'#B91C1C':'#B45309')+'">'+(r[3]==='er'?'!':'\u26A0')+'</span>'+
        '<span class="grow">'+esc(r[0])+'</span><b>'+r[1]+'</b></div>';
      }).join('')+
    '</div></div>'+
  '</div>';
};

/* ============================ MATERIAL MASTER ============================ */
SCREENS['mm/register'] = function(){
  var rows = DB.materials;
  return pageHead('Material Register','Material Master',
    'Central material master with classification, inventory parameters and financial mapping',
    '<button class="btn gh sm" onclick="tblExport(\'tMat\',\'Material_Master_Register\')">\u2913 Export</button>'+
    '<button class="btn gh sm" onclick="goto(\'mm/bulk\')">\u2191 Bulk upload</button>'+
    '<button class="btn pri sm" onclick="goto(\'mm/create\')">+ Create material</button>',
    reqTags('MMP_2','MMP_4'))+
  summaryRow([
    {l:'Total materials', v:rows.length, c:'#1E5A96'},
    {l:'Active', v:rows.filter(function(m){ return m.status==='Active'; }).length, c:'#15803D'},
    {l:'Asset eligible', v:rows.filter(function(m){ return m.asset==='Y'; }).length, c:'#0F766E'},
    {l:'Below reorder level', v:rows.filter(function(m){ return m.stock<m.reorder; }).length, c:'#B45309'}
  ])+
  filterBar([
    fld({id:'fmCode', label:'Material code', ph:'MAT-'}),
    fld({id:'fmName', label:'Material name', ph:'Search name'}),
    fld({id:'fmCat', label:'Category', type:'select', opts:Object.keys(CATS), blank:'All'}),
    fld({id:'fmSub', label:'Subcategory', type:'select', opts:allSubs(), blank:'All'}),
    fld({id:'fmType', label:'Material type', type:'select', opts:['Asset','Consumable'], blank:'All'}),
    fld({id:'fmStock', label:'Stock / non-stock', type:'select', opts:['Stock','Non-Stock'], blank:'All'}),
    fld({id:'fmFin', label:'Capital / revenue', type:'select', opts:['Capital','Revenue'], blank:'All'}),
    fld({id:'fmStatus', label:'Status', type:'select', opts:['Active','Inactive','Obsolete','Draft'], blank:'All'}),
    fld({id:'fmAsset', label:'Asset eligible', type:'select', opts:['Y','N'], blank:'All'}),
    fld({id:'fmExp', label:'Expiry applicable', type:'select', opts:['Yes','No'], blank:'All'})
  ], 'applyMatFilter()',
    '<button class="btn sm" onclick="resetMatFilter()">\u21BA Reset</button>'+
    '<button class="btn sm gh" onclick="tblExport(\'tMat\',\'Material_Master_Register\')">\u2913 Export</button>')+
  '<div class="card"><div class="bd">'+
    renderTable({
      id:'tMat', rows:rows, select:true,
      cols:[
        {h:'Material Code', k:'code', cls:'mono', f:function(r){ return '<a onclick="viewMaterial(\''+r.id+'\')" class="mono">'+esc(r.code)+'</a>'; }},
        {h:'Material Name', k:'name'},
        {h:'Category', k:'cat'},
        {h:'UOM', k:'uom'},
        {h:'Type', k:'type'},
        {h:'Stock Status', k:'stockType'},
        {h:'Asset', k:'asset', cls:'center'},
        {h:'Reorder Level', k:'reorder', cls:'num'},
        {h:'Current Stock', k:'stock', cls:'num', f:function(r){
          var st = r.stock===0 ? 'color:#B91C1C;font-weight:700' : (r.stock<r.reorder ? 'color:#B45309;font-weight:700' : '');
          return '<span style="'+st+'">'+num(r.stock)+'</span>'; }},
        {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
        {h:'Last Updated', k:'updated', f:function(r){ return fdate(r.updated); }},
        {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
          return actIcon('View','viewMaterial(\''+r.id+'\')')+
          actIcon('Edit','editMaterial(\''+r.id+'\')')+
          (r.status==='Active'
            ? actIcon('Deactivate','deactivateMaterial(\''+r.id+'\')','dgr')
            : actIcon('Reactivate','reactivateMaterial(\''+r.id+'\')','ok'))+
          actIcon('Audit','materialAudit(\''+r.id+'\')','gh'); }}
      ],
      empty:'No material matches these filters'
    })+
  '</div></div>';
};
function applyMatFilter(){
  var f = function(id){ return val(id); };
  var rows = DB.materials.filter(function(m){
    return (!f('fmCode') || m.code.toLowerCase().indexOf(f('fmCode').toLowerCase())>=0) &&
      (!f('fmName') || m.name.toLowerCase().indexOf(f('fmName').toLowerCase())>=0) &&
      (!f('fmCat')  || m.cat===f('fmCat')) &&
      (!f('fmSub')  || m.sub===f('fmSub')) &&
      (!f('fmType') || m.type===f('fmType')) &&
      (!f('fmStock')|| m.stockType===f('fmStock')) &&
      (!f('fmFin')  || m.fin===f('fmFin')) &&
      (!f('fmStatus')||m.status===f('fmStatus')) &&
      (!f('fmAsset')|| m.asset===f('fmAsset')) &&
      (!f('fmExp')  || (f('fmExp')==='Yes'? m.expiryReq : !m.expiryReq));
  });
  tblReload('tMat', rows);
  toast(rows.length+' material(s) matched.', rows.length? 'ok':'wa');
}
function resetMatFilter(){
  ['fmCode','fmName','fmCat','fmSub','fmType','fmStock','fmFin','fmStatus','fmAsset','fmExp'].forEach(function(i){ setVal(i,''); });
  tblReload('tMat', DB.materials); toast('Filters cleared.','in');
}
function viewMaterial(id){
  var m = byId(DB.materials,'id',id);
  if (!m) { toast('Material record not found.','er'); return; }
  var s = byId(DB.stock,'mat',m.code) || {avail: m.stock||0, reserved:0, inspection:0, blocked:0};
  var history = (DB.trail || []).filter(function(t){ return t.ref===m.code || t.ref===String(m.id) || (t.type==='Material Master' && t.ref===m.code); });
  if (!history.length) {
    history = [{ts: m.updated||TODAY, action:'Active Master', field:'Status', oldv:'—', newv: m.status||'Active', reason:'Catalog master entry in PostgreSQL', by: m.createdBy||'Anil Katwale', role:'Procurement Officer', src:'IFMS Database'}];
  }
  modal({title:'Material Details — '+esc(m.code)+' ('+esc(m.name)+')', size:'lg',
    body: tabsHtml('vm',['Overview','Inventory','Financial','Traceability','Audit history'])+
      pane('vm',0,'<div class="grid g2"><table class="kv">'+
        kvRow('Material code','<span class="mono">'+esc(m.code)+'</span>')+kvRow('Material name',esc(m.name))+
        kvRow('Category',esc(m.cat))+kvRow('Subcategory',esc(m.sub||'General'))+kvRow('Material type',esc(m.type||'Goods'))+
        kvRow('Stock / non-stock',esc(m.stockType||'Stock'))+kvRow('Consumable',esc(m.consumable||'Consumable'))+
        '</table><table class="kv">'+
        kvRow('Make / brand',esc(m.make||'Standard'))+kvRow('Model',esc(m.model||'Standard'))+kvRow('Primary UOM',esc(m.uom))+
        kvRow('Asset eligible', m.asset==='Y'? 'Yes':'No')+
        kvRow('Hazardous', m.hazardous?'Yes':'No')+kvRow('Perishable', m.perishable?'Yes':'No')+
        kvRow('Status', badge(m.status||'Active'))+'</table></div>'+
        '<div class="sec-h" style="margin-top:12px">Technical specification</div><div style="font-size:12.5px;line-height:1.5">'+esc(m.spec||m.name)+'</div>')+
      pane('vm',1,'<div class="grid g4" style="margin-bottom:11px">'+
        [['Available',s.avail,'#15803D'],['Reserved',s.reserved||0,'#1E5A96'],['Under inspection',s.inspection||0,'#B45309'],['Blocked',s.blocked||0,'#B91C1C']]
          .map(function(x){ return '<div class="scard" style="border-top:3px solid '+x[2]+'"><div class="l">'+x[0]+
            '</div><div class="v">'+num(x[1])+' '+esc(m.uom)+'</div></div>'; }).join('')+
        '</div><table class="kv">'+
        kvRow('Minimum stock', num(m.minStock||10)+' '+m.uom)+kvRow('Maximum stock', num(m.maxStock||100)+' '+m.uom)+
        kvRow('Reorder level', num(m.reorder||20)+' '+m.uom)+kvRow('Reorder quantity', num(m.reorderQty||40)+' '+m.uom)+
        kvRow('Lead time', (m.leadTime||21)+' days')+kvRow('Standard rate', inr(m.rate||0))+
        kvRow('Stock value', inr((s.avail||0)*(m.rate||0)))+'</table>')+
      pane('vm',2,'<table class="kv">'+
        kvRow('Capital / revenue', esc(m.fin||'Revenue'))+kvRow('Default chart of accounts', esc(m.coa||COA[0]))+
        kvRow('Fund', esc(m.fund||FUNDS[0]))+kvRow('Scheme', esc(m.scheme||SCHEMES[0]))+kvRow('Project', esc(m.project||PROJECTS[0]))+
        kvRow('Cost centre', esc(m.costCentre||COST_CENTRES[0]))+kvRow('Valuation method','Weighted average')+'</table>')+
      pane('vm',3,'<table class="kv">'+
        kvRow('Batch tracking', m.batchTrack?'Required':'Not required')+
        kvRow('Serial number tracking', m.serialTrack?'Required':'Not required')+
        kvRow('Manufacturing date', m.expiryReq?'Required':'Not required')+
        kvRow('Expiry date', m.expiryReq?'Required':'Not required')+
        kvRow('Shelf life', m.shelfLife? m.shelfLife+' months':'Not applicable')+
        kvRow('Warranty applicable', m.warrantyApplicable?'Yes':'No')+
        kvRow('Warranty duration', m.warrantyMonths? m.warrantyMonths+' months':'—')+
        kvRow('Disposal category', esc(m.disposalCat||'Consumable — Write-off'))+'</table>')+
      pane('vm',4, auditTableHtml(history)),
    footer:'<button class="btn gh" onclick="closeModal();editMaterial(\''+m.id+'\')">Edit material</button>'+
      '<button class="btn" data-close>Close</button>'});
}
function editMaterial(id){ goto('mm/create'); setTimeout(function(){ loadMaterial(id); }, 40); }
function materialAudit(id){
  var m = byId(DB.materials,'id',id);
  if (!m) { toast('Material record not found.','er'); return; }
  var history = (DB.trail || []).filter(function(t){ return t.ref===m.code || t.ref===String(m.id) || (t.type==='Material Master' && t.ref===m.code); });
  if (!history.length) {
    history = [{ts: m.updated||TODAY, action:'Active Master', field:'Status', oldv:'—', newv: m.status||'Active', reason:'Catalog master entry in PostgreSQL', by: m.createdBy||'Anil Katwale', role:'Procurement Officer', src:'IFMS Database'}];
  }
  modal({title:'Audit History — '+esc(m.code)+' ('+esc(m.name)+')', size:'lg', body: auditTableHtml(history)});
}
function deactivateMaterial(id){
  var m = byId(DB.materials,'id',id);
  var used = DB.requisitions.some(function(r){ return r.lines.some(function(l){ return l.mat===m.code; }); }) ||
             DB.workorders.some(function(w){ return w.lines.some(function(l){ return l.mat===m.code; }); }) ||
             DB.grns.some(function(g){ return g.mat===m.code; });
  confirmAct({
    title:'Deactivate material', kind: used?'wa':'er', btnClass:'dgr', ok:'Deactivate', reason:true,
    message: used
      ? '<b>'+esc(m.code)+'</b> is used by existing transactions, so it cannot be deleted. It will be deactivated and will no longer appear in new requisitions.'
      : '<b>'+esc(m.code)+'</b> has no transaction against it. It will be deactivated and can be reactivated later.',
    detail: kvRow('Material', esc(m.name))+kvRow('Current stock', num(m.stock)+' '+m.uom)+
            kvRow('Transaction reference', used? 'Present \u2014 soft delete only':'None')
  }, function(reason){
    m.status = 'Inactive'; m.updated = TODAY;
    logAudit('Material Master', m.code, 'Deactivated', 'Status', 'Active', 'Inactive', reason);
    tblPaint('tMat'); commit('Deactivated <b>'+esc(m.code)+'</b>. Audit entry recorded.','ok');
  });
}
function reactivateMaterial(id){
  var m = byId(DB.materials,'id',id);
  confirmAct({title:'Reactivate material', kind:'in', ok:'Reactivate', btnClass:'ok', reason:true,
    message:'<b>'+esc(m.code)+'</b> becomes available for new requisitions and procurement.'},
    function(reason){
      var old = m.status; m.status='Active'; m.updated=TODAY;
      logAudit('Material Master', m.code, 'Reactivated','Status', old,'Active', reason);
      tblPaint('tMat'); commit('Reactivated <b>'+esc(m.code)+'</b>.','ok');
    });
}

/* ---------- create / edit material ---------- */
var EDIT_MAT = null;
SCREENS['mm/create'] = function(){
  EDIT_MAT = null;
  var g = 'cm';
  return pageHead('Create Material','Material Master',
    'Define a new material in the central master. Draft records can be deleted; approved records can only be deactivated.',
    '<button class="btn gh sm" onclick="goto(\'mm/register\')">\u2190 Back to register</button>',
    reqTags('MMP_2','MMP_4'))+
  '<div class="card"><div class="bd">'+
    tabsHtml(g,['Basic details','Classification','Technical specification','Units of measurement',
                'Inventory parameters','Financial classification','Traceability and shelf life',
                'Warranty and disposal','Attachments'])+
    '<div id="matForm">'+
    pane(g,0,'<div class="fgrid g3">'+
      fld({id:'mCode', label:'Material code', req:true, ph:'Enter or generate', hint:'<a onclick="autoCode()">Generate a code</a>'})+
      fld({id:'mName', label:'Material name', req:true, ph:'Full descriptive name'})+
      fld({id:'mShort', label:'Short description', ph:'Shown on registers'})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'mDesc', label:'Detailed description', type:'textarea', rows:2, ph:'Full description for tender and BoQ use'})+
      '</div><div class="fgrid g4" style="margin-top:11px">'+
      fld({id:'mStatus', label:'Status', type:'select', opts:['Draft','Active','Inactive','Obsolete'], val:'Draft', req:true, blank:false})+
      fld({id:'mMake', label:'Make', ph:'Manufacturer'})+
      fld({id:'mBrand', label:'Brand'})+
      fld({id:'mModel', label:'Model'})+'</div>')+
    pane(g,1,'<div class="fgrid g4">'+
      fld({id:'mGroup', label:'Material group', type:'select', opts:['Goods','Services','Works'], val:'Goods', req:true, blank:false})+
      fld({id:'mCat', label:'Category', type:'select', opts:Object.keys(CATS), req:true, onchange:'syncSub()'})+
      fld({id:'mSub', label:'Subcategory', type:'select', opts:allSubs(), req:true})+
      fld({id:'mType', label:'Material type', type:'select', opts:['Asset','Consumable','Spare','Service'], req:true})+
      fld({id:'mStockType', label:'Stock / non-stock', type:'select', opts:['Stock','Non-Stock'], val:'Stock', blank:false})+
      fld({id:'mCons', label:'Consumable', type:'select', opts:['Consumable','Non-Consumable'], blank:false})+
      fld({id:'mFin', label:'Capital / revenue', type:'select', opts:['Capital','Revenue'], req:true})+
      '</div><div class="grid g3" style="margin-top:11px">'+
      fld({id:'mAsset', label:'Asset eligible', type:'checkbox'})+
      fld({id:'mHaz', label:'Hazardous material', type:'checkbox'})+
      fld({id:'mPer', label:'Perishable material', type:'checkbox'})+'</div>')+
    pane(g,2,'<div class="fgrid">'+
      fld({id:'mSpec', label:'Technical specification', type:'textarea', rows:5,
           ph:'Detailed specification used in the tender BoQ and the inspection checklist'})+
      '</div><div class="note in" style="margin-top:10px">This specification carries into requisitions, tender BoQ mapping and inspection.</div>')+
    pane(g,3,'<div class="fgrid g4">'+
      fld({id:'mUom', label:'Primary UOM', type:'select', opts:UOMS, req:true})+
      fld({id:'mPUom', label:'Purchase UOM', type:'select', opts:UOMS})+
      fld({id:'mSUom', label:'Stock UOM', type:'select', opts:UOMS})+
      fld({id:'mIUom', label:'Issue UOM', type:'select', opts:UOMS})+
      fld({id:'mCf', label:'UOM conversion factor', type:'number', val:1, step:'0.01', num:true})+
      '</div>')+
    pane(g,4,'<div class="fgrid g4">'+
      fld({id:'mMin', label:'Minimum stock', type:'number', val:0, num:true})+
      fld({id:'mMax', label:'Maximum stock', type:'number', val:0, num:true})+
      fld({id:'mRe', label:'Reorder level', type:'number', val:0, num:true, req:true})+
      fld({id:'mReQ', label:'Reorder quantity', type:'number', val:0, num:true})+
      fld({id:'mLead', label:'Lead time (days)', type:'number', val:21, num:true})+
      fld({id:'mRate', label:'Standard rate (\u20B9)', type:'number', val:0, num:true, req:true})+
      '</div>')+
    pane(g,5,'<div class="fgrid g3">'+
      fld({id:'mCoa', label:'Default chart of accounts', type:'select', opts:COA, req:true})+
      fld({id:'mFund', label:'Fund', type:'select', opts:FUNDS})+
      fld({id:'mScheme', label:'Scheme', type:'select', opts:SCHEMES})+
      fld({id:'mProject', label:'Project', type:'select', opts:PROJECTS})+
      fld({id:'mCc', label:'Cost centre', type:'select', opts:COST_CENTRES})+
      fld({id:'mValn', label:'Valuation method', type:'select', opts:['Weighted Average','FIFO','Specific Identification','Standard Cost'], val:'Weighted Average', blank:false})+
      '</div>')+
    pane(g,6,'<div class="grid g2" style="margin-bottom:11px">'+
      fld({id:'mBatch', label:'Batch tracking required', type:'checkbox'})+
      fld({id:'mSerial', label:'Serial number tracking required', type:'checkbox'})+
      fld({id:'mMfg', label:'Manufacturing date required', type:'checkbox'})+
      fld({id:'mExp', label:'Expiry date required', type:'checkbox'})+
      '</div><div class="fgrid g3">'+
      fld({id:'mShelf', label:'Shelf life (months)', type:'number', val:0, num:true})+'</div>')+
    pane(g,7,'<div class="grid g2" style="margin-bottom:11px">'+
      fld({id:'mWarr', label:'Warranty applicable', type:'checkbox'})+'</div>'+
      '<div class="fgrid g3">'+
      fld({id:'mWmon', label:'Warranty duration (months)', type:'number', val:0, num:true})+
      fld({id:'mDisp', label:'Disposal category', type:'select',
           opts:['Asset \u2014 Condemnation Board','Consumable \u2014 Write-off','Hazardous \u2014 Authorized Agency','Scrap \u2014 Auction']})+
      '</div>')+
    pane(g,8, attachWidget('mAtt',[]))+
    '</div></div>'+
    '<div style="border-top:1px solid var(--line);padding:11px 13px;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'+
      '<button class="btn" onclick="goto(\'mm/register\')">Cancel</button>'+
      '<button class="btn gh" onclick="saveMaterial(\'Draft\')">Save draft</button>'+
      '<button class="btn pri" onclick="saveMaterial(\'Active\')">Submit for approval</button>'+
    '</div>'+
  '</div>';
};
SCREENS_AFTER['mm/create'] = function(){ syncSub(); };
function syncSub(){
  var c = val('mCat'), sel = document.getElementById('mSub');
  if(!sel) return;
  var opts = CATS[c] || allSubs();
  sel.innerHTML = '<option value="">-- Select --</option>'+opts.map(function(o){ return '<option>'+esc(o)+'</option>'; }).join('');
}
function autoCode(){
  var c = val('mCat');
  var pre = {'IT Equipment':'IT','Office Supplies':'OFF','Electrical':'ELE','Furniture':'FUR','Medical':'MED','Civil Materials':'CIV'}[c] || 'GEN';
  var same = DB.materials.filter(function(m){ return m.code.indexOf('MAT-'+pre)===0; });
  setVal('mCode','MAT-'+pre+'-'+pad(same.length+1,4));
  toast('Material code generated.','ok');
}
function loadMaterial(id){
  var m = byId(DB.materials,'id',id); if(!m) return;
  EDIT_MAT = id;
  var map = {mCode:m.code,mName:m.name,mShort:m.name,mDesc:m.spec,mStatus:m.status,mMake:m.make,mBrand:m.make,
    mModel:m.model,mCat:m.cat,mType:m.type,mStockType:m.stockType,mCons:m.consumable,mFin:m.fin,mSpec:m.spec,
    mUom:m.uom,mPUom:m.uom,mSUom:m.uom,mIUom:m.uom,mCf:1,mMin:m.minStock,mMax:m.maxStock,mRe:m.reorder,
    mReQ:m.reorderQty,mLead:m.leadTime,mRate:m.rate,mCoa:m.coa,mFund:m.fund,mScheme:m.scheme,mProject:m.project,
    mCc:m.costCentre,mShelf:m.shelfLife,mWmon:m.warrantyMonths,mDisp:m.disposalCat};
  Object.keys(map).forEach(function(k){ setVal(k,map[k]); });
  syncSub(); setVal('mSub',m.sub);
  ['mAsset','mHaz','mPer','mBatch','mSerial','mMfg','mExp','mWarr'].forEach(function(k,i){
    setVal(k,[m.asset==='Y',m.hazardous,m.perishable,m.batchTrack,m.serialTrack,m.expiryReq,m.expiryReq,m.warrantyApplicable][i]);
  });
  var t = document.querySelector('.ptitle'); if(t) t.textContent = 'Edit Material \u2014 '+m.code;
  toast('Loaded <b>'+esc(m.code)+'</b> for editing.','in');
}
async function saveMaterial(status){
  if(!requireOk('matForm')) return;
  var code = val('mCode').trim();
  var dup = DB.materials.filter(function(m){ return m.code.toLowerCase()===code.toLowerCase() && m.id!==EDIT_MAT; })[0];
  if(dup){ markErr('mCode',true,'That material code is already in use.'); toast('Material code <b>'+esc(code)+'</b> already exists.','er'); return; }
  var rec = {
    code:code, name:val('mName').trim(), cat:val('mCat'), sub:val('mSub'), uom:val('mUom'),
    fin:val('mFin'), asset: val('mAsset')?'Y':'N', reorder:nval('mRe'), rate:nval('mRate'),
    status:status, make:val('mMake'), model:val('mModel'), spec:val('mSpec'),
    type:val('mType'), stockType:val('mStockType'), consumable:val('mCons'),
    hazardous:val('mHaz'), perishable:val('mPer'), expiryReq:val('mExp'), shelfLife:nval('mShelf'),
    batchTrack:val('mBatch'), serialTrack:val('mSerial'),
    minStock:nval('mMin'), maxStock:nval('mMax'), reorderQty:nval('mReQ'), leadTime:nval('mLead'),
    warrantyApplicable:val('mWarr'), warrantyMonths:nval('mWmon'),
    coa:val('mCoa'), fund:val('mFund'), scheme:val('mScheme'), project:val('mProject'),
    costCentre:val('mCc'), disposalCat:val('mDisp'), updated:TODAY, createdBy:'Anil Katwale',
    attachments: attList('mAtt')
  };
  var catObj = byId(DB.categories,'cat_name',rec.cat);
  var uomObj = byId(DB.uoms,'uom_code',rec.uom);
  if(!catObj || !uomObj){ toast('Could not resolve category or UOM against the master data. Save aborted.','er'); return; }
  var payload = {
    item_code: rec.code, item_name: rec.name, item_desc: rec.spec,
    cat_id: catObj.id, base_uom_id: uomObj.id,
    is_capital: rec.fin==='Capital', is_consumable: rec.consumable==='Consumable',
    is_service: rec.type==='Service', is_stockable: rec.stockType==='Stock',
    estimated_rate: rec.rate, reorder_level: rec.reorder, reorder_qty: rec.reorderQty,
    min_stock_level: rec.minStock, max_stock_level: rec.maxStock, lead_time_days: rec.leadTime,
    brand_name: rec.make, make_model: rec.model, is_active: status!=='Draft'
  };
  var btn = document.activeElement; if(btn && btn.tagName==='BUTTON') btn.disabled = true;
  try {
    if(EDIT_MAT){
      var m = byId(DB.materials,'id',EDIT_MAT);
      var res = await fetch(API_BASE+'/materials/items/'+EDIT_MAT, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the update ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      var changes = Object.keys(rec).filter(function(k){ return String(m[k])!==String(rec[k]) && k!=='updated' && k!=='attachments'; });
      changes.slice(0,6).forEach(function(k){ logAudit('Material Master', code, 'Modified', k, m[k], rec[k], 'Master data revision'); });
      Object.assign(m, rec);
      commit('Updated <b>'+esc(code)+'</b> in PostgreSQL. '+changes.length+' field change(s) recorded in the audit trail.','ok');
    } else {
      var res = await fetch(API_BASE+'/materials/items', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
      if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the create ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      var created = await res.json();
      rec.id = created.id; rec.stock = 0;
      DB.materials.push(rec);
      logAudit('Material Master', code, status==='Draft'?'Draft Created':'Created', 'Status','\u2014',status,'New material definition');
      DB.stock.push({id:uid('S'), mat:code, store:STORES[0], bin:'Unassigned', avail:0, reserved:0,
        inspection:0, blocked:0, damaged:0, expired:0, transit:0, rate:rec.rate, reorder:rec.reorder, batch:'', expiry:''});
      commit('Saved <b>'+esc(code)+'</b> to PostgreSQL as '+status.toLowerCase()+' (id '+created.id+').','ok');
    }
    goto('mm/register');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  } finally {
    if(btn) btn.disabled = false;
  }
}

/* ---------- category and UOM masters ---------- */
SCREENS['mm/category'] = function(){
  var rows = [];
  Object.keys(CATS).forEach(function(c,i){
    CATS[c].forEach(function(s,j){
      rows.push({id:'C'+i+j, cat:c, sub:s, code:'CAT-'+pad(i+1,2)+'-'+pad(j+1,2),
        count: DB.materials.filter(function(m){ return m.cat===c&&m.sub===s; }).length,
        coa: COA[i%COA.length], status:'Active'});
    });
  });
  return pageHead('Material Category','Material Master','Category and subcategory hierarchy with default accounting classification',
    '<button class="btn gh sm" onclick="tblExport(\'tCat\',\'Material_Categories\')">\u2913 Export</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tCat', rows:rows, cols:[
    {h:'Category Code', k:'code', cls:'mono'},{h:'Category', k:'cat'},{h:'Subcategory', k:'sub'},
    {h:'Materials Mapped', k:'count', cls:'num'},{h:'Default Chart of Accounts', k:'coa'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ]})+'</div></div>';
};
SCREENS['mm/uom'] = function(){
  var types = ['Count','Count','Count','Count','Count','Weight','Length','Volume','Count','Count','Count'];
  var bases = ['Nos','Nos','Nos','Nos','Nos','Kg','Metre','Litre','Nos','Nos','Nos'];
  var rows = UOMS.map(function(u,i){
    return {id:'U'+i, code:u.toUpperCase().slice(0,3), name:u, type:types[i], base:bases[i],
      cf:[1,1,1,1,2,1,1,1,1,1,1][i], count: DB.materials.filter(function(m){ return m.uom===u; }).length, status:'Active'};
  });
  return pageHead('UOM Master','Material Master','Units of measurement with base unit and conversion factors',
    '<button class="btn gh sm" onclick="tblExport(\'tUom\',\'UOM_Master\')">\u2913 Export</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tUom', rows:rows, cols:[
    {h:'UOM Code', k:'code', cls:'mono'},{h:'UOM Name', k:'name'},{h:'Measure Type', k:'type'},
    {h:'Base UOM', k:'base'},{h:'Conversion Factor', k:'cf', cls:'num'},
    {h:'Materials Using', k:'count', cls:'num'},{h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ]})+'</div></div>';
};

/* ---------- BoQ mapping ---------- */
SCREENS['mm/boq'] = function(){
  return pageHead('Material-BoQ Mapping','Material Master',
    'Map tender BoQ lines to standardised IFMS material codes with UOM conversion',
    '<button class="btn gh sm" onclick="autoSuggestBoq()">\u2728 Suggest mappings</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tBoq\',\'BoQ_Material_Mapping\')">\u2913 Export</button>',
    reqTags('MMP_3','MMP_2'))+
  summaryRow([
    {l:'BoQ lines', v:DB.boq.length, c:'#1E5A96'},
    {l:'Mapped', v:DB.boq.filter(function(b){ return b.status==='Mapped'; }).length, c:'#15803D'},
    {l:'Unmapped', v:DB.boq.filter(function(b){ return b.status==='Unmapped'; }).length, c:'#B91C1C'},
    {l:'Pending approval', v:DB.boq.filter(function(b){ return b.status==='Pending Approval'; }).length, c:'#B45309'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tBoq', rows:DB.boq, cols:[
    {h:'Tender ID', k:'tender', cls:'mono'},
    {h:'Line', k:'line', cls:'num', w:'50px'},
    {h:'Tender BoQ Description', k:'boqDesc'},
    {h:'Material Code', k:'mat', f:function(r){ return r.mat? '<span class="mono">'+esc(r.mat)+'</span>' : '<span class="muted">Not mapped</span>'; }},
    {h:'Standardised Description', k:'md', f:function(r){ return r.mat? esc(mname(r.mat)) : '\u2014'; }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Tender UOM', k:'tUom'},{h:'IFMS UOM', k:'iUom'},
    {h:'CF', k:'cf', cls:'num'},
    {h:'Match Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Remarks', k:'remarks'},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Map','mapBoq(\''+r.id+'\')','sec')+
      actIcon('New material','newFromBoq(\''+r.id+'\')','gh')+
      (r.status!=='Non-Standard'? actIcon('Non-standard','markNonStd(\''+r.id+'\')'):'')+
      actIcon('History','boqHistory(\''+r.id+'\')'); }}
  ]})+'</div></div>';
};
function boqSuggestions(b){
  var w = b.boqDesc.toLowerCase().split(/[^a-z0-9]+/).filter(function(x){ return x.length>3; });
  return DB.materials.filter(function(m){
    return w.some(function(x){ return m.name.toLowerCase().indexOf(x)>=0 || m.spec.toLowerCase().indexOf(x)>=0; });
  });
}
function mapBoq(id){
  var b = byId(DB.boq,'id',id);
  var sug = boqSuggestions(b).slice(0,5);
  modal({title:'Map BoQ line '+b.line+' \u2014 '+esc(b.tender), size:'md',
    body:'<table class="kv" style="margin-bottom:11px">'+
      kvRow('Tender BoQ description','<b>'+esc(b.boqDesc)+'</b>')+
      kvRow('Quantity', num(b.qty)+' '+esc(b.tUom))+
      kvRow('Current status', badge(b.status))+'</table>'+
      (sug.length? '<div class="sec-h">Suggested materials</div>'+sug.map(function(m){
        return '<div class="rag" style="cursor:pointer" onclick="document.getElementById(\'bqMat\').value=\''+m.code+'\'">'+
        '<span class="s" style="background:#0F766E">\u2713</span><span class="grow"><b class="mono">'+esc(m.code)+
        '</b> \u2014 '+esc(m.name)+'</span></div>'; }).join('')
        : '<div class="note wa">No close match in the material master. Map it manually, or create a new material.</div>')+
      '<div class="fgrid g2" style="margin-top:12px">'+
        fld({id:'bqMat', label:'Standardised material code', type:'select', req:true,
             opts:DB.materials.map(function(m){ return {v:m.code,l:m.code+' \u2014 '+m.name}; }), val:b.mat})+
        fld({id:'bqUom', label:'IFMS UOM', type:'select', opts:UOMS, val:b.iUom, req:true})+
        fld({id:'bqCf', label:'UOM conversion factor', type:'number', val:b.cf, step:'0.01', num:true})+
        fld({id:'bqRem', label:'Mapping remarks', val:b.remarks==='\u2014'?'':b.remarks})+
      '</div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveBoqMap(\''+id+'\')">Save mapping and send for approval</button>'});
}
async function saveBoqMap(id){
  if(!val('bqMat')){ markErr('bqMat',true); toast('Select a standardised material code.','er'); return; }
  var b = byId(DB.boq,'id',id), old = b.mat||'Not mapped';
  var matObj = byId(DB.materials,'code', val('bqMat'));
  var invUomObj = byId(DB.uoms,'uom_code', val('bqUom'));
  var tenderUomObj = byId(DB.uoms,'uom_code', b.tUom) || invUomObj;
  if(!matObj || !invUomObj || !tenderUomObj){ toast('Could not resolve the material or UOM against the master data.','er'); return; }
  var payload = {boq_item_code: b.tender+'-L'+b.line, boq_desc: b.boqDesc, item_id: matObj.id,
    tender_uom_id: tenderUomObj.id, inv_uom_id: invUomObj.id, conversion_factor: nval('bqCf') || 1};
  try {
    var res = await fetch(API_BASE+'/materials/boq-mappings', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the mapping ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    b.id = created.id;
    b.mat = val('bqMat'); b.iUom = val('bqUom'); b.cf = nval('bqCf') || 1;
    b.remarks = val('bqRem') || 'Mapped by procurement officer';
    b.status = 'Pending Approval';
    logAudit('BoQ Mapping', b.tender+' L'+b.line, 'Mapped', 'Material Code', old, b.mat, b.remarks);
    closeModal(); tblPaint('tBoq');
    commit('BoQ line mapped to <b>'+esc(b.mat)+'</b> in PostgreSQL (id '+created.id+') and sent for approval.','ok');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function newFromBoq(id){
  var b = byId(DB.boq,'id',id);
  goto('mm/create');
  setTimeout(function(){
    setVal('mName', b.boqDesc); setVal('mSpec', b.boqDesc); setVal('mUom', b.iUom||'Nos');
    toast('Form pre-filled from BoQ line <b>'+esc(b.tender)+' L'+b.line+'</b>. Complete the classification and save.','in',6000);
  },60);
}
function markNonStd(id){
  var b = byId(DB.boq,'id',id);
  confirmAct({title:'Mark as non-standard item', kind:'wa', reason:true, ok:'Mark non-standard',
    message:'The line is procured as a non-standard item and does not update the material master.'},
    function(reason){
      b.status='Non-Standard'; b.remarks = reason;
      logAudit('BoQ Mapping', b.tender+' L'+b.line, 'Marked Non-Standard','Match Status','Unmapped','Non-Standard',reason);
      tblPaint('tBoq'); commit('Marked the BoQ line as a non-standard item.','wa');
    });
}
function boqHistory(id){
  var b = byId(DB.boq,'id',id);
  modal({title:'Mapping history \u2014 '+esc(b.tender)+' line '+b.line, size:'md',
    body: auditTableHtml(DB.trail.filter(function(t){ return t.ref===(b.tender+' L'+b.line); }))});
}
function autoSuggestBoq(){
  var n = 0;
  DB.boq.filter(function(b){ return b.status==='Unmapped'; }).forEach(function(b){
    var hit = boqSuggestions(b)[0];
    if(hit){ b.mat = hit.code; b.status='Pending Approval'; b.remarks='Suggested by the system'; n++;
      logAudit('BoQ Mapping', b.tender+' L'+b.line,'Auto-suggested','Material Code','Not mapped',hit.code,'System suggestion'); }
  });
  tblPaint('tBoq');
  commit(n? n+' unmapped BoQ line(s) matched and sent for approval.' : 'No match found for the unmapped lines. Map them manually.', n?'ok':'wa');
}

/* ---------- bulk upload ---------- */
SCREENS['mm/bulk'] = function(){
  return pageHead('Bulk Upload','Material Master','Upload material master records using the prescribed template',
    '<button class="btn gh sm" onclick="downloadTemplate()">\u2913 Download template</button>')+
  '<div class="grid g21">'+
  '<div class="card"><div class="hd"><span>Upload file</span></div><div class="bd">'+
    '<div class="drop" onclick="simulateBulk()"><div class="i">\u2191</div>'+
    '<div class="fw6" style="font-size:13px;margin-top:5px">Choose the completed template</div>'+
    '<div class="hint">CSV or XLSX up to 5 MB. Records are validated before they reach the master.</div></div>'+
    '<div id="bulkOut" style="margin-top:12px"></div>'+
  '</div></div>'+
  '<div class="card"><div class="hd"><span>Template columns</span></div><div class="bd">'+
    '<table class="kv">'+['Material Code','Material Name','Category','Subcategory','Material Type','Primary UOM',
      'Capital / Revenue','Asset Eligible','Reorder Level','Standard Rate','Chart of Accounts']
      .map(function(c,i){ return kvRow(String(i+1), c); }).join('')+'</table>'+
    '<div class="note in" style="margin-top:10px">Rows that fail validation are listed line by line and are not committed. Duplicate material codes are rejected.</div>'+
  '</div></div></div>';
};
function downloadTemplate(){
  var cols = ['Material Code','Material Name','Category','Subcategory','Material Type','Primary UOM','Capital / Revenue',
     'Asset Eligible','Reorder Level','Standard Rate','Chart of Accounts'].map(function(h){ return {h:h,k:h}; });
  exportCsv('Material_Master_Template', cols,
    [{'Material Code':'MAT-IT-9001','Material Name':'Sample material','Category':'IT Equipment',
      'Subcategory':'Computers','Material Type':'Asset','Primary UOM':'Nos','Capital / Revenue':'Capital',
      'Asset Eligible':'Y','Reorder Level':10,'Standard Rate':10000,'Chart of Accounts':COA[0]}]);
}
function simulateBulk(){
  var out = document.getElementById('bulkOut');
  out.innerHTML = '<div class="note in"><span class="spin"></span> Validating the uploaded file&hellip;</div>';
  setTimeout(function(){
    var rows = [
      ['MAT-IT-9001','Docking Station, USB-C','IT Equipment','Computers','Asset','Nos','Capital','Y',12,7400,'Valid'],
      ['MAT-OFF-9002','Whiteboard Marker, Assorted','Office Supplies','Stationery','Consumable','Packet','Revenue','N',150,240,'Valid'],
      ['MAT-IT-0001','Laptop Computer 14 inch','IT Equipment','Computers','Asset','Nos','Capital','Y',25,68500,'Duplicate code'],
      ['MAT-ELE-9003','Cable Tray, 100 mm','Electrical','Cabling','Consumable','Metre','Revenue','N',0,320,'Reorder level missing']
    ];
    out.innerHTML = '<div class="note ok" style="margin-bottom:10px">File validated. <b>2 of 4</b> records are ready to commit; <b>2</b> rows need correction.</div>'+
      '<div class="twrap" style="max-height:280px"><table class="tbl"><thead><tr>'+
      ['Code','Name','Category','Type','UOM','Reorder','Rate','Validation'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
      '</tr></thead><tbody>'+rows.map(function(r){
        return '<tr><td class="mono">'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+
        '</td><td>'+r[4]+'</td><td>'+r[5]+'</td><td class="num">'+r[8]+'</td><td class="num">'+inr(r[9])+'</td><td>'+
        badge(r[10]==='Valid'?'Approved':'Rejected')+' <span class="muted" style="font-size:10.5px">'+r[10]+'</span></td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<div class="btn-row" style="margin-top:11px"><button class="btn ok" onclick="commitBulk()">Commit 2 valid records</button>'+
      '<button class="btn" onclick="document.getElementById(\'bulkOut\').innerHTML=\'\'">Discard</button></div>';
  }, 900);
}
async function commitBulk(){
  confirmAct({title:'Commit bulk upload', ok:'Commit records', kind:'in', btnClass:'ok',
    message:'Two validated material records are added to the master as <b>Draft</b>. Note: the backend\'s dedicated bulk-upload endpoint does not actually parse or persist files (it is a fixed-response stub), so each validated row is created individually through the real material-create endpoint instead.'}, async function(){
    var rows = [['MAT-IT-9001','Docking Station, USB-C','IT Equipment','Computers','Nos','Capital','Y',12,7400],
     ['MAT-OFF-9002','Whiteboard Marker, Assorted','Office Supplies','Stationery','Packet','Revenue','N',150,240]];
    var UOM_ALIASES = {NOS:'NOS',PACKET:'PKT',PKT:'PKT',BOX:'BOX',REAM:'REAM',SET:'SET',BAG:'BAG',
      KG:'KG',MT:'MT',METRE:'MTR',MTR:'MTR',LITRE:'LTR',LTR:'LTR',PAIR:'PAIR',ROLL:'ROLL'};
    var okCount = 0;
    for(var i=0;i<rows.length;i++){
      var r = rows[i];
      var catObj = byId(DB.categories,'cat_name', r[2]);
      var uomCode = UOM_ALIASES[r[4].toUpperCase()] || r[4].toUpperCase();
      var uomObj = byId(DB.uoms,'uom_code', uomCode);
      if(!catObj || !uomObj){ toast('Row '+(i+1)+' (' +r[0]+ ') skipped: could not resolve category or UOM.','wa'); continue; }
      var payload = {item_code:r[0], item_name:r[1], item_desc:r[1], cat_id:catObj.id, base_uom_id:uomObj.id,
        is_capital: r[5]==='Capital', is_consumable: r[5]==='Revenue', is_stockable:true,
        reorder_level:r[7], estimated_rate:r[8], is_active:false};
      try {
        var res = await fetch(API_BASE+'/materials/items', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if(!res.ok){ toast('Row '+(i+1)+' (' +r[0]+ ') rejected by the backend.','er'); continue; }
        var created = await res.json();
        okCount++;
        DB.materials.push({id:created.id, code:r[0], name:r[1], cat:r[2], sub:r[3], uom:r[4], fin:r[5], asset:r[6],
          reorder:r[7], rate:r[8], stock:0, status:'Draft', make:'\u2014', model:'\u2014', spec:r[1],
          type:r[5]==='Capital'?'Asset':'Consumable', stockType:'Stock', consumable:r[5]==='Revenue'?'Consumable':'Non-Consumable',
          hazardous:false, perishable:false, expiryReq:false, shelfLife:0, batchTrack:false, serialTrack:false,
          minStock:Math.round(r[7]/2), maxStock:r[7]*6, reorderQty:r[7]*2, leadTime:21,
          warrantyApplicable:r[6]==='Y', warrantyMonths:r[6]==='Y'?12:0, coa:COA[0], fund:FUNDS[0],
          scheme:SCHEMES[0], project:PROJECTS[0], costCentre:COST_CENTRES[0],
          disposalCat:'Consumable \u2014 Write-off', updated:TODAY, createdBy:'Anil Katwale', attachments:[]});
        logAudit('Material Master', r[0], 'Bulk Created','Status','\u2014','Draft','Bulk upload batch');
      } catch(err) {
        toast('Row '+(i+1)+' (' +r[0]+ ') failed: could not reach the backend API.','er');
      }
    }
    if(!okCount){ toast('No rows were committed to PostgreSQL.','er'); return; }
    commit('Committed '+okCount+' material record(s) as drafts in PostgreSQL.','ok');
    goto('mm/register');
  });
}

/* ============================ REQUISITIONS ============================ */
var REQ_STATUS = ['Draft','Submitted','Under Review','Budget Validation Pending','Budget Not Available',
  'Returned for Correction','Approved','Procurement Initiated','Partially Procured','Fully Procured',
  'Rejected','Cancelled','Closed'];

function stockPanel(r){
  return '<div class="twrap" style="max-height:280px"><table class="tbl"><thead><tr>'+
    ['Material','Available','Reserved','In Transit','Under Inspection','Other Stores','Open PO Qty','Recommended Action']
    .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
    r.lines.map(function(l){
      var s = byId(DB.stock,'mat',l.mat) || {avail:0,reserved:0,transit:0,inspection:0};
      var other = Math.round(s.avail*0.3);
      var openPo = sum(DB.workorders.filter(function(w){ return w.lines[0].mat===l.mat && w.status==='Issued'; }),
        function(w){ return w.lines[0].qty-w.delivered; });
      var net = s.avail - s.reserved;
      var act = 'Initiate procurement', cls='b-er';
      if(net >= l.qty){ act='Issue from stock'; cls='b-ok'; }
      else if(net+other >= l.qty){ act='Transfer from another store'; cls='b-wa'; }
      else if(openPo > 0){ act='Await open purchase order'; cls='b-in'; }
      return '<tr><td class="mono">'+esc(l.mat)+'</td><td class="num">'+num(s.avail)+'</td>'+
        '<td class="num">'+num(s.reserved)+'</td><td class="num">'+num(s.transit)+'</td>'+
        '<td class="num">'+num(s.inspection)+'</td><td class="num">'+num(other)+'</td>'+
        '<td class="num">'+num(openPo)+'</td><td><span class="bdg '+cls+'">'+act+'</span></td></tr>';
    }).join('')+'</tbody></table></div>'+
    '<div class="note in" style="margin-top:10px">Where net available stock covers the requirement, meet the requisition by issue from stock rather than fresh procurement. Overriding this needs approval of the competent authority.</div>';
}
function checkStock(id){
  var r = byId(DB.requisitions,'id',id);
  modal({title:'Stock availability \u2014 '+esc(r.no), size:'lg', body: stockPanel(r)});
}

function reqRegister(rows, id){
  return summaryRow([
    {l:'Requisitions', v:rows.length, c:'#1E5A96'},
    {l:'Awaiting action', v:rows.filter(function(r){ return ['Submitted','Under Review','Budget Validation Pending'].indexOf(r.status)>=0; }).length, c:'#B45309'},
    {l:'Approved', v:rows.filter(function(r){ return ['Approved','Procurement Initiated','Partially Procured','Fully Procured'].indexOf(r.status)>=0; }).length, c:'#15803D'},
    {l:'Estimated value', v:inr0(sum(rows,'value')), c:'#0F766E'}
  ])+
  filterBar([
    fld({id:'frNo', label:'Requisition number', ph:'MR/'}),
    fld({id:'frDept', label:'Department', type:'select', opts:DEPTS, blank:'All'}),
    fld({id:'frStatus', label:'Status', type:'select', opts:REQ_STATUS, blank:'All'}),
    fld({id:'frPri', label:'Priority', type:'select', opts:['Normal','Urgent','Emergency','Critical'], blank:'All'}),
    fld({id:'frFrom', label:'From date', type:'date'}),
    fld({id:'frTo', label:'To date', type:'date'})
  ], 'applyReqFilter(\''+id+'\')',
    '<button class="btn sm" onclick="resetReqFilter(\''+id+'\')">\u21BA Reset</button>'+
    '<button class="btn sm gh" onclick="tblExport(\''+id+'\',\'Requisition_Register\')">\u2913 Export</button>')+
  '<div class="card"><div class="bd">'+renderTable({
    id:id, rows:rows, select:true,
    cols:[
      {h:'Requisition No.', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewReq(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
      {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
      {h:'Department', k:'dept'},
      {h:'Requestor', k:'requestor'},
      {h:'Lines', k:'lines', cls:'num', f:function(r){ return r.lines.length; }, sv:function(r){ return r.lines.length; }},
      {h:'Estimated Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
      {h:'Budget', k:'budget', f:function(r){
        var cls = r.budget==='Available'?'b-ok':(r.budget==='Pending'?'b-wa':'b-er');
        return '<span class="bdg '+cls+'">'+esc(r.budget)+'</span>'; }},
      {h:'Stock', k:'stockAvail', f:function(r){
        var cls = r.stockAvail==='Available'?'b-ok':(r.stockAvail==='Partially Available'?'b-wa':'b-er');
        return '<span class="bdg '+cls+'">'+esc(r.stockAvail)+'</span>'; }},
      {h:'Priority', k:'priority', f:function(r){ return priBadge(r.priority); }},
      {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
      {h:'Current Approver', k:'approver'},
      {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
        return actIcon('View','viewReq(\''+r.id+'\')')+
        actIcon('Stock','checkStock(\''+r.id+'\')','gh')+
        (['Submitted','Under Review','Budget Validation Pending'].indexOf(r.status)>=0
          ? actIcon('Approve','approveReq(\''+r.id+'\')','ok')+actIcon('Send back','sendBackReq(\''+r.id+'\')','warn') : '')+
        (r.status==='Approved'? actIcon('Start procurement','initiateProc(\''+r.id+'\')','sec'):''); }}
    ],
    empty:'No requisition found'
  })+'</div></div>';
}
function pendingReqs(){
  return DB.requisitions.filter(function(r){ return ['Submitted','Under Review','Budget Validation Pending'].indexOf(r.status)>=0; });
}
SCREENS['req/list'] = function(){
  return pageHead('My Requisitions','Requisition Management',
    'Material and service requisitions raised by the department',
    '<button class="btn gh sm" onclick="goto(\'req/consolidate\')">\u29C9 Consolidate</button>'+
    '<button class="btn pri sm" onclick="goto(\'req/create\')">+ Create requisition</button>',
    reqTags('MMP_5'))+ reqRegister(DB.requisitions, 'tReq');
};
SCREENS['req/approvals'] = function(){
  return pageHead('Pending Approvals','Requisition Management',
    'Requisitions resting with you or your office for a decision',
    '<button class="btn ok sm" onclick="bulkApprove()">\u2713 Approve selected</button>',
    reqTags('MMP_5'))+ reqRegister(pendingReqs(), 'tReqA');
};
function applyReqFilter(id){
  var f = function(x){ return val(x); };
  var rows = (id==='tReqA' ? pendingReqs() : DB.requisitions).filter(function(r){
    return (!f('frNo') || r.no.toLowerCase().indexOf(f('frNo').toLowerCase())>=0) &&
      (!f('frDept') || r.dept===f('frDept')) &&
      (!f('frStatus') || r.status===f('frStatus')) &&
      (!f('frPri') || r.priority===f('frPri')) &&
      (!f('frFrom') || r.date>=f('frFrom')) &&
      (!f('frTo') || r.date<=f('frTo'));
  });
  tblReload(id, rows);
  toast(rows.length+' requisition(s) matched.', rows.length?'ok':'wa');
}
function resetReqFilter(id){
  ['frNo','frDept','frStatus','frPri','frFrom','frTo'].forEach(function(i){ setVal(i,''); });
  tblReload(id, id==='tReqA'? pendingReqs() : DB.requisitions);
  toast('Filters cleared.','in');
}
function repaintReqTables(){
  if(TBL.tReq) tblReload('tReq', DB.requisitions);
  if(TBL.tReqA) tblReload('tReqA', pendingReqs());
  refreshNavCounts();
}
async function putReqStatus(id, action){
  var res = await fetch(API_BASE+'/requisitions/'+id+'/status', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:action})});
  if(!res.ok){ var e = await res.text(); throw new Error('backend rejected the request ('+res.status+'). '+e.slice(0,150)); }
  return res.json();
}
function bulkApprove(){
  var sel = tblRows('tReqA');
  if(!sel.length){ toast('Select at least one requisition to approve.','wa'); return; }
  var blocked = sel.filter(function(r){ return r.budget==='Not Available'; });
  confirmAct({title:'Approve '+sel.length+' requisition(s)', reason:true, ok:'Approve', btnClass:'ok',
    kind: blocked.length?'wa':'in',
    message: blocked.length
      ? blocked.length+' of the selected requisition(s) have <b>no budget available</b> and will be skipped.'
      : 'The selected requisitions move to <b>Approved</b> and become available for procurement planning.'},
    async function(reason){
      var n=0, failed=0;
      for(var i=0;i<sel.length;i++){
        var r = sel[i];
        if(r.budget==='Not Available') continue;
        try {
          await putReqStatus(r.id, 'approve');
          var old = r.status; r.status='Approved'; r.approver='Procurement Officer'; n++;
          logAudit('Requisition', r.no, 'Approved','Status',old,'Approved',reason);
        } catch(err) { failed++; }
      }
      repaintReqTables();
      var msg = 'Approved '+n+' requisition(s) in PostgreSQL'+(blocked.length? '; '+blocked.length+' skipped for want of budget':'')+(failed? '; '+failed+' failed':'')+'.';
      commit(msg, failed? 'wa':'ok');
    });
}
function approveReq(id){
  var r = byId(DB.requisitions,'id',id);
  if(r.budget==='Not Available'){
    toast('Cannot approve <b>'+esc(r.no)+'</b> \u2014 no budget available. Revalidate the budget first.','er'); return;
  }
  confirmAct({title:'Approve requisition '+esc(r.no), reason:true, ok:'Approve', btnClass:'ok',
    message:'The requisition is approved and released for procurement planning.',
    detail: kvRow('Department', esc(r.dept))+kvRow('Estimated value', inr(r.value))+
            kvRow('Budget status', esc(r.budget))+kvRow('Stock availability', esc(r.stockAvail))},
    async function(reason){
      try { await putReqStatus(r.id, 'approve'); }
      catch(err){ toast('Save failed: '+esc(String(err.message||err)),'er'); return; }
      var old=r.status; r.status='Approved'; r.approver='Procurement Officer';
      logAudit('Requisition', r.no,'Approved','Status',old,'Approved',reason);
      closeAllModals(); repaintReqTables();
      commit('Approved <b>'+esc(r.no)+'</b> in PostgreSQL.','ok');
    });
}
function sendBackReq(id){
  var r = byId(DB.requisitions,'id',id);
  confirmAct({title:'Return requisition for correction', kind:'wa', reason:true, ok:'Return', btnClass:'warn',
    message:'<b>'+esc(r.no)+'</b> goes back to the requestor for correction.'},
    async function(reason){
      try { await putReqStatus(r.id, 'return'); }
      catch(err){ toast('Save failed: '+esc(String(err.message||err)),'er'); return; }
      var old=r.status; r.status='Returned for Correction'; r.approver='Requestor';
      logAudit('Requisition', r.no,'Returned','Status',old,'Returned for Correction',reason);
      closeAllModals(); repaintReqTables();
      commit('Returned <b>'+esc(r.no)+'</b> for correction in PostgreSQL.','wa');
    });
}
function rejectReq(id){
  var r = byId(DB.requisitions,'id',id);
  confirmAct({title:'Reject requisition', kind:'er', btnClass:'dgr', ok:'Reject', reason:true,
    message:'<b>'+esc(r.no)+'</b> is rejected and the requestor is notified.'},
    async function(reason){
      try { await putReqStatus(r.id, 'reject'); }
      catch(err){ toast('Save failed: '+esc(String(err.message||err)),'er'); return; }
      var old=r.status; r.status='Rejected'; r.approver='\u2014';
      logAudit('Requisition', r.no,'Rejected','Status',old,'Rejected',reason);
      closeAllModals(); repaintReqTables();
      commit('Rejected <b>'+esc(r.no)+'</b> in PostgreSQL.','er');
    });
}
function initiateProc(id){
  var r = byId(DB.requisitions,'id',id);
  confirmAct({title:'Start procurement', ok:'Start procurement', btnClass:'sec', reason:true,
    message:'A procurement plan is raised against <b>'+esc(r.no)+'</b> and the requisition status updated.'},
    function(reason){
      var old=r.status; r.status='Procurement Initiated';
      DB.plans.push({id:uid('PP'), no:'PP/DIT/2026/'+pad(30+DB.plans.length,4), reqs:r.no, mode:r.mode,
        value:r.value, officer:'Anil Katwale', budget:r.coa, ref:'\u2014',
        expected: addDays(TODAY,45), insp:'Yes', warr:'Yes', asset:'No', status:'Draft'});
      logAudit('Requisition', r.no,'Procurement Initiated','Status',old,'Procurement Initiated',reason);
      closeAllModals(); save();
      toast('Raised a procurement plan against <b>'+esc(r.no)+'</b>.','ok');
      goto('proc/plan');
    });
}
function viewReq(id){
  var r = byId(DB.requisitions,'id',id);
  var done = ['Approved','Procurement Initiated','Partially Procured','Fully Procured'].indexOf(r.status)>=0;
  var chain = [['Requestor','ok'],['Head of Office','ok'],
    ['Finance Wing', r.budget==='Available'?'ok':'wa'],
    ['Procurement Officer', done?'ok':'nu']];
  modal({title:'Requisition '+esc(r.no), size:'lg',
    body: tabsHtml('vr',['Details','Line items','Budget','Stock','Approval workflow'])+
      pane('vr',0,'<div class="grid g2"><table class="kv">'+
        kvRow('Requisition number','<span class="mono">'+esc(r.no)+'</span>')+kvRow('Date', fdate(r.date))+
        kvRow('Department', esc(r.dept))+kvRow('Office / section', esc(r.office)+' / '+esc(r.section))+
        kvRow('Requestor', esc(r.requestor))+kvRow('Priority', priBadge(r.priority))+'</table>'+
        '<table class="kv">'+kvRow('Delivery location', esc(r.location))+kvRow('Required by', fdate(r.requiredBy))+
        kvRow('Estimated value', '<b>'+inr(r.value)+'</b>')+kvRow('Suggested mode', esc(r.mode))+
        kvRow('Status', badge(r.status))+kvRow('Current approver', esc(r.approver))+'</table></div>'+
        '<div class="sec-h" style="margin-top:11px">Purpose and justification</div>'+
        '<div style="font-size:12.5px">'+esc(r.purpose)+'</div>')+
      pane('vr',1,'<div class="twrap" style="max-height:300px"><table class="tbl"><thead><tr>'+
        ['Material Code','Description','Qty','UOM','Estimated Rate','Estimated Value','Preferred Make']
        .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
        r.lines.map(function(l){
          return '<tr><td class="mono">'+esc(l.mat)+'</td><td>'+esc(l.desc)+'</td>'+
          '<td class="num">'+num(l.qty)+'</td><td>'+esc(l.uom)+'</td><td class="num">'+inr(l.rate)+'</td>'+
          '<td class="num">'+inr(l.qty*l.rate)+'</td><td>'+esc(l.make)+'</td></tr>';
        }).join('')+
        '</tbody><tfoot><tr><td colspan="5">Total estimated value</td><td class="num">'+inr(r.value)+'</td><td></td></tr></tfoot></table></div>')+
      pane('vr',2,'<table class="kv">'+kvRow('Budget head / chart of accounts', esc(r.coa))+
        kvRow('Fund', esc(r.fund))+kvRow('Scheme', esc(r.scheme))+kvRow('Project', esc(r.project))+
        kvRow('Cost centre', esc(r.costCentre))+kvRow('Available budget', inr(r.availBudget))+
        kvRow('Requisition value', inr(r.value))+
        kvRow('Validation result', r.budget==='Available'
          ? '<span class="bdg b-ok">Budget available</span>'
          : (r.budget==='Pending' ? '<span class="bdg b-wa">Validation pending</span>'
                                  : '<span class="bdg b-er">Budget not available</span>'))+'</table>'+
        (r.budget!=='Available' ? '<div class="note wa" style="margin-top:10px">Procurement cannot start until the budget check succeeds. Seek re-appropriation or a supplementary provision.</div>':''))+
      pane('vr',3, stockPanel(r))+
      pane('vr',4,'<ul style="list-style:none;padding:0;margin:0">'+chain.map(function(c,i){
        return '<li class="rag"><span class="s" style="background:'+({ok:'#15803D',wa:'#B45309',nu:'#7386A0'}[c[1]])+'">'+
        (c[1]==='ok'?'\u2713':(i+1))+'</span><span class="grow">'+esc(c[0])+'</span>'+
        '<span class="muted" style="font-size:11px">'+(c[1]==='ok'?'Completed':c[1]==='wa'?'In progress':'Not reached')+'</span></li>';
      }).join('')+'</ul>'),
    footer: ['Submitted','Under Review','Budget Validation Pending'].indexOf(r.status)>=0
      ? '<button class="btn warn" onclick="sendBackReq(\''+r.id+'\')">Send back</button>'+
        '<button class="btn dgr" onclick="rejectReq(\''+r.id+'\')">Reject</button>'+
        '<button class="btn ok" onclick="approveReq(\''+r.id+'\')">Approve</button>'
      : (r.status==='Approved' ? '<button class="btn sec" onclick="initiateProc(\''+r.id+'\')">Start procurement</button>' : '')});
}

/* ---------- create requisition ---------- */
var REQ_LINES = [];
SCREENS['req/create'] = function(){
  REQ_LINES = [];
  var g = 'cr';
  return pageHead('Create Requisition','Requisition Management',
    'Raise a material or service requisition with a budget check and a stock check',
    '<button class="btn gh sm" onclick="goto(\'req/list\')">\u2190 Back to register</button>',
    reqTags('MMP_5'))+
  '<div class="card"><div class="bd">'+
    tabsHtml(g,['Requestor and department','Delivery details','Line items','Budget and accounting',
                'Stock availability','Technical specification','Attachments','Approval preview'])+
    '<div id="reqForm">'+
    pane(g,0,'<div class="fgrid g4">'+
      fld({id:'rNo', label:'Requisition number', val: seq('MR/DIT/2026/', DB.requisitions,'no',6), ro:true})+
      fld({id:'rDate', label:'Requisition date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'rDept', label:'Department', type:'select', opts:DEPTS, val:DEPTS[0], req:true})+
      fld({id:'rOffice', label:'Office', val:'Head Office', req:true})+
      fld({id:'rSection', label:'Section', val:'Procurement Section'})+
      fld({id:'rRequestor', label:'Requestor', val:'Anil Katwale', req:true})+
      fld({id:'rPriority', label:'Priority', type:'select', opts:['Normal','Urgent','Emergency','Critical'], val:'Normal', req:true, blank:false})+
      fld({id:'rMode', label:'Suggested procurement mode', type:'select', opts:MODES})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'rPurpose', label:'Purpose and justification', type:'textarea', rows:2, req:true,
           ph:'State the requirement, the scheme or activity it supports, and why stock cannot meet it'})+'</div>')+
    pane(g,1,'<div class="fgrid g3">'+
      fld({id:'rLoc', label:'Delivery location', type:'select', opts:STORES, req:true})+
      fld({id:'rBy', label:'Required by date', type:'date', val: addDays(TODAY,30), req:true, date:true})+
      fld({id:'rContact', label:'Contact person', val:'Store Officer'})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'rAddr', label:'Delivery address', type:'textarea', rows:2, val:'Delhi Secretariat, I.P. Estate, New Delhi \u2013 110002'})+'</div>')+
    pane(g,2,
      '<div class="btn-row" style="margin-bottom:10px">'+
        '<button class="btn sec sm" onclick="addReqLine(\'Material\')">+ Add material</button>'+
        '<button class="btn gh sm" onclick="addReqLine(\'Service\')">+ Add service</button>'+
        '<button class="btn sm gh" onclick="checkStockDraft()">\u{1F50E} Check stock</button>'+
      '</div><div id="reqLines"></div>')+
    pane(g,3,'<div class="fgrid g3">'+
      fld({id:'rCoa', label:'Budget head / chart of accounts', type:'select', opts:COA, req:true, onchange:'budgetCheckReq()'})+
      fld({id:'rFund', label:'Fund', type:'select', opts:FUNDS})+
      fld({id:'rScheme', label:'Scheme', type:'select', opts:SCHEMES})+
      fld({id:'rProject', label:'Project', type:'select', opts:PROJECTS})+
      fld({id:'rCc', label:'Cost centre', type:'select', opts:COST_CENTRES})+
      fld({id:'rAvail', label:'Available budget (\u20B9)', val:'', ro:true})+
      '</div><div class="btn-row" style="margin-top:11px">'+
      '<button class="btn sec sm" onclick="budgetCheckReq()">\u2713 Check budget</button></div>'+
      '<div id="rBudgetOut" style="margin-top:11px"></div>')+
    pane(g,4,'<div id="rStockOut"><div class="note in">Add line items, then choose <b>Check stock</b> to see availability across stores before procurement starts.</div></div>')+
    pane(g,5,'<div class="fgrid">'+
      fld({id:'rSpec', label:'Consolidated technical specification', type:'textarea', rows:5,
           ph:'Specification for the requisition as a whole. Line specifications carry from the material master.'})+'</div>')+
    pane(g,6, attachWidget('rAtt',[]))+
    pane(g,7,'<div class="note in" style="margin-bottom:11px">The approval chain follows the requisition value and the delegation of financial powers.</div><div id="rChain"></div>')+
    '</div></div>'+
    '<div style="border-top:1px solid var(--line);padding:11px 13px;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'+
      '<button class="btn" onclick="goto(\'req/list\')">Cancel</button>'+
      '<button class="btn gh" onclick="saveReq(\'Draft\')">Save draft</button>'+
      '<button class="btn pri" onclick="saveReq(\'Submitted\')">Submit</button>'+
    '</div>'+
  '</div>';
};
SCREENS_AFTER['req/create'] = function(){ paintReqLines(); paintChain(); };
function addReqLine(kind){
  var first = DB.materials.filter(function(m){ return m.status==='Active'; })[0] || DB.materials[0];
  REQ_LINES.push({k:uid('L'), kind:kind, mat: kind==='Material'? first.code : '', desc:'',
    qty:1, uom: kind==='Material'? first.uom : 'Nos', rate: kind==='Material'? first.rate : 0, make:'', spec:''});
  paintReqLines(); paintChain();
}
function paintReqLines(){
  var host = document.getElementById('reqLines'); if(!host) return;
  if(!REQ_LINES.length){
    host.innerHTML = '<div class="tbl-empty" style="border:1px dashed var(--line);border-radius:6px">'+
      '<div class="big">\u2295</div><div class="fw6">No line items yet</div>'+
      '<div class="muted" style="font-size:11.5px;margin-top:4px">Add at least one material or service line before submitting.</div></div>';
    return;
  }
  var total = 0;
  host.innerHTML = '<div class="twrap" style="max-height:340px"><table class="tbl"><thead><tr>'+
    ['Type','Material / Service','Description','Qty','UOM','Estimated Rate','Estimated Value','Preferred Make','']
    .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
    REQ_LINES.map(function(l,i){
      var v = l.qty*l.rate; total += v;
      return '<tr><td>'+esc(l.kind)+'</td>'+
        '<td>'+(l.kind==='Material'
          ? '<select class="inp" style="min-width:190px" onchange="setLine('+i+',\'mat\',this.value)">'+
            DB.materials.filter(function(m){ return m.status==='Active'; }).map(function(m){
              return '<option value="'+m.code+'"'+(m.code===l.mat?' selected':'')+'>'+esc(m.code+' \u2014 '+m.name)+'</option>';
            }).join('')+'</select>'
          : '<input class="inp" value="'+esc(l.desc)+'" placeholder="Service description" onchange="setLine('+i+',\'desc\',this.value)">')+'</td>'+
        '<td style="max-width:220px;font-size:11.5px" class="muted">'+esc(l.kind==='Material'? mname(l.mat) : l.desc)+'</td>'+
        '<td><input type="number" class="inp num" style="width:76px" min="1" value="'+l.qty+'" onchange="setLine('+i+',\'qty\',this.value)"></td>'+
        '<td style="width:80px">'+esc(l.uom)+'</td>'+
        '<td><input type="number" class="inp num" style="width:104px" min="0" value="'+l.rate+'" onchange="setLine('+i+',\'rate\',this.value)"></td>'+
        '<td class="num fw6">'+inr(v)+'</td>'+
        '<td><input class="inp" style="width:120px" value="'+esc(l.make)+'" onchange="setLine('+i+',\'make\',this.value)"></td>'+
        '<td class="acts"><button class="btn xs dgr" onclick="rmLine('+i+')">Remove</button></td></tr>';
    }).join('')+
    '</tbody><tfoot><tr><td colspan="6">Total estimated value</td><td class="num">'+inr(total)+'</td><td colspan="2"></td></tr></tfoot></table></div>';
}
function setLine(i,k,v){
  var l = REQ_LINES[i];
  if(k==='qty' || k==='rate') v = Math.max(0, Number(v)||0);
  l[k] = v;
  if(k==='mat'){ var m = byId(DB.materials,'code',v); if(m){ l.uom=m.uom; l.rate=m.rate; l.spec=m.spec; } }
  paintReqLines(); paintChain();
}
function rmLine(i){ REQ_LINES.splice(i,1); paintReqLines(); paintChain(); }
function reqTotal(){ return sum(REQ_LINES, function(l){ return l.qty*l.rate; }); }
function paintChain(){
  var host = document.getElementById('rChain'); if(!host) return;
  var v = reqTotal();
  var chain = [['Requestor \u2014 '+DEPTS[0], 'Raises the requisition'],['Head of Office','Departmental scrutiny']];
  if(v > 500000) chain.push(['Finance Wing','Budget concurrence']);
  if(v > 2500000) chain.push(['Administrative Secretary','Above \u20B9 25,00,000']);
  if(v > 10000000) chain.push(['Finance Department','Above \u20B9 1,00,00,000']);
  chain.push(['Procurement Officer','Procurement initiation']);
  host.innerHTML = '<div class="note '+(v?'ok':'in')+'" style="margin-bottom:10px">Requisition value <b>'+inr(v)+
    '</b> \u2014 '+chain.length+' approval levels.</div>'+
    '<ul style="list-style:none;margin:0;padding:0">'+chain.map(function(c,i){
      return '<li class="rag"><span class="s" style="background:'+(i===0?'#15803D':'#1E5A96')+'">'+(i+1)+'</span>'+
      '<span class="grow"><b>'+esc(c[0])+'</b><div class="muted" style="font-size:10.5px">'+esc(c[1])+'</div></span></li>';
    }).join('')+'</ul>';
}
function budgetCheckReq(){
  var coa = val('rCoa'), v = reqTotal();
  var out = document.getElementById('rBudgetOut'); if(!out) return;
  if(!coa){ out.innerHTML = '<div class="note wa">Select a budget head to run the check.</div>'; return; }
  if(v<=0){ out.innerHTML = '<div class="note wa">Add at least one line item before checking the budget.</div>'; return; }
  out.innerHTML = '<div class="note in"><span class="spin"></span> Contacting the budget module&hellip;</div>';
  setTimeout(function(){
    var avail = Math.round(v * (coa===COA[3] ? 0.72 : 2.4));
    setVal('rAvail', avail);
    var ok = avail >= v;
    out.innerHTML = '<div class="grid g4" style="margin-bottom:10px">'+
      [['Budget head', esc(coa)],['Available budget', inr(avail)],['Requisition value', inr(v)],
       ['Balance after', inr(avail-v)]].map(function(x){
        return '<div class="scard"><div class="l">'+x[0]+'</div><div class="v" style="font-size:13px">'+x[1]+'</div></div>';
      }).join('')+
      '</div><div class="note '+(ok?'ok':'er')+'">'+(ok
        ? '<b>Budget available.</b> Submit the requisition for approval.'
        : '<b>Budget not available.</b> The requirement of '+inr(v)+' exceeds the provision of '+inr(avail)+
          '. Seek re-appropriation before submitting.')+'</div>';
    toast(ok? 'Budget check passed.' : 'Budget check failed \u2014 the provision is short.', ok?'ok':'er');
  }, 700);
}
function checkStockDraft(){
  var out = document.getElementById('rStockOut');
  if(!REQ_LINES.length){ toast('Add at least one line item before checking stock.','wa'); return; }
  switchTab('cr',4);
  out.innerHTML = '<div class="note in"><span class="spin"></span> Querying stock across stores&hellip;</div>';
  setTimeout(function(){ out.innerHTML = stockPanel({lines:REQ_LINES}); toast('Stock availability retrieved.','ok'); }, 650);
}
async function saveReq(status){
  if(!requireOk('reqForm')) return;
  if(!REQ_LINES.length){ toast('Add at least one material or service line before submitting.','er'); switchTab('cr',2); return; }
  if(REQ_LINES.some(function(l){ return l.qty<=0; })){ toast('Every line needs a quantity greater than zero.','er'); switchTab('cr',2); return; }
  var v = reqTotal();
  var avail = Number(val('rAvail')||0);
  var budget = avail===0 ? 'Pending' : (avail>=v ? 'Available':'Not Available');
  if(status==='Submitted' && budget==='Not Available'){
    toast('Cannot submit \u2014 the budget check failed for this requisition.','er'); switchTab('cr',3); return;
  }
  var storeObj = byId(DB.stores,'store_name', val('rLoc'));
  if(!storeObj){ toast('Select a valid delivery location before saving.','er'); switchTab('cr',1); return; }
  var payloadLines = [];
  for(var i=0;i<REQ_LINES.length;i++){
    var l = REQ_LINES[i];
    if(l.kind!=='Material'){ toast('Service lines cannot be saved yet \u2014 the backend requires a catalogued material for every line.','er'); switchTab('cr',2); return; }
    var matObj = byId(DB.materials,'code', l.mat);
    if(!matObj){ toast('Could not resolve material "'+esc(l.mat)+'" against the master data.','er'); switchTab('cr',2); return; }
    payloadLines.push({item_id: matObj.id, requested_qty: l.qty, est_unit_rate: l.rate, preferred_make: l.make, technical_spec: l.spec});
  }
  var rec = {
    id: uid('R'), no: val('rNo'), date: val('rDate'), dept: val('rDept'), office: val('rOffice'),
    section: val('rSection'), requestor: val('rRequestor'), priority: val('rPriority'), mode: val('rMode'),
    purpose: val('rPurpose'), location: val('rLoc'), requiredBy: val('rBy'),
    coa: val('rCoa'), fund: val('rFund'), scheme: val('rScheme'), project: val('rProject'), costCentre: val('rCc'),
    availBudget: avail, value: v,
    lines: REQ_LINES.map(function(l){
      return {mat:l.mat, desc: l.kind==='Material'? mname(l.mat) : l.desc, qty:l.qty, uom:l.uom, rate:l.rate, make:l.make, spec:l.spec};
    }),
    budget: budget, stockAvail:'Not Available',
    status: status, approver: status==='Draft'? '\u2014' : 'Head of Office',
    attachments: attList('rAtt')
  };
  var covered = rec.lines.filter(function(l){
    var s = byId(DB.stock,'mat',l.mat); return s && (s.avail - s.reserved) >= l.qty;
  }).length;
  rec.stockAvail = covered===rec.lines.length ? 'Available' : (covered? 'Partially Available':'Not Available');
  var payload = {req_date: val('rDate'), store_id: storeObj.id, priority: val('rPriority'), purpose: val('rPurpose'), lines: payloadLines};
  try {
    var res = await fetch(API_BASE+'/requisitions/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the requisition ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.req_no || rec.no;
    if(status==='Submitted'){
      var stRes = await fetch(API_BASE+'/requisitions/'+created.id+'/status', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'review'})});
      if(!stRes.ok) toast('Requisition saved, but the workflow-stage update failed.','wa');
    }
    DB.requisitions.unshift(rec);
    logAudit('Requisition', rec.no, status==='Draft'?'Draft Saved':'Submitted','Status','\u2014',status,rec.purpose.slice(0,80));
    if(status==='Submitted') notify('in','Requisition '+rec.no+' submitted','Awaiting approval by '+rec.approver,'req/approvals');
    save();
    toast((status==='Draft'? 'Saved <b>'+esc(rec.no)+'</b> as a draft' : 'Submitted <b>'+esc(rec.no)+'</b> for approval')+' to PostgreSQL (id '+created.id+').','ok');
    goto('req/list');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}

/* ---------- consolidation ---------- */
SCREENS['req/consolidate'] = function(){
  var eligible = DB.requisitions.filter(function(r){ return r.status==='Approved'; });
  var byMat = {};
  eligible.forEach(function(r){
    r.lines.forEach(function(l){
      var k = l.mat;
      byMat[k] = byMat[k] || {mat:k, qty:0, value:0, reqs:[], uom:l.uom};
      byMat[k].qty += l.qty; byMat[k].value += l.qty*l.rate;
      if(byMat[k].reqs.indexOf(r.no)<0) byMat[k].reqs.push(r.no);
    });
  });
  var rows = Object.keys(byMat).map(function(k,i){ return Object.assign({id:'CN'+i}, byMat[k]); });
  return pageHead('Requisition Consolidation','Requisition Management',
    'Consolidate approved requisitions material-wise into a single procurement quantity',
    '<button class="btn gh sm" onclick="tblExport(\'tCons\',\'Requisition_Consolidation\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="createConsolidatedPlan()">\u29C9 Create consolidated plan</button>',
    reqTags('MMP_5','MMP_17'))+
  summaryRow([
    {l:'Approved requisitions', v:eligible.length, c:'#15803D'},
    {l:'Distinct materials', v:rows.length, c:'#1E5A96'},
    {l:'Consolidated value', v:inr0(sum(rows,'value')), c:'#0F766E'},
    {l:'Average lines per requisition', v:(eligible.length? (sum(eligible,function(r){ return r.lines.length; })/eligible.length).toFixed(1):'0'), c:'#B45309'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({
    id:'tCons', rows:rows, select:true,
    cols:[
      {h:'Material Code', k:'mat', cls:'mono'},
      {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
      {h:'Consolidated Qty', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
      {h:'UOM', k:'uom'},
      {h:'Consolidated Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
      {h:'Requisitions', k:'c', cls:'num', f:function(r){ return r.reqs.length; }, sv:function(r){ return r.reqs.length; }},
      {h:'Requisition Numbers', k:'reqs', f:function(r){ return '<span class="mono" style="font-size:11px">'+esc(r.reqs.join(', '))+'</span>'; }},
      {h:'Current Stock', k:'s', cls:'num', f:function(r){ var s=byId(DB.stock,'mat',r.mat); return num(s?s.avail:0); }},
      {h:'Suggested Mode', k:'m', f:function(r){ return r.value>2500000? 'Open Tender' : (r.value>500000? 'Limited Tender':'GeM'); }}
    ],
    empty:'No approved requisition is available for consolidation'
  })+'</div></div>';
};
function createConsolidatedPlan(){
  var sel = tblRows('tCons');
  if(!sel.length){ toast('Select at least one consolidated line to create a plan.','wa'); return; }
  var v = sum(sel,'value');
  confirmAct({title:'Create consolidated procurement plan', ok:'Create plan', btnClass:'pri', reason:true,
    message:'One procurement plan is raised covering '+sel.length+' material line(s) worth <b>'+inr(v)+'</b>.'},
    async function(reason){
      var allReqs = [];
      sel.forEach(function(s){ s.reqs.forEach(function(x){ if(allReqs.indexOf(x)<0) allReqs.push(x); }); });
      var reqIds = allReqs.map(function(no){ var r = byId(DB.requisitions,'no',no); return r ? r.id : null; }).filter(function(x){ return x!==null; });
      if(!reqIds.length){ toast('Could not resolve the underlying requisitions against the master data.','er'); return; }
      try {
        var res = await fetch(API_BASE+'/requisitions/consolidate', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({req_ids: reqIds})});
        if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the consolidation ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        var created = await res.json();
        var no = created.plan_no;
        DB.plans.push({id:uid('PP'), no:no, reqs:allReqs.join(', '),
          mode: v>2500000?'Open Tender':'Limited Tender', value:v, officer:'Anil Katwale', budget:COA[0],
          ref:'\u2014', expected: addDays(TODAY,50), insp:'Yes', warr:'Yes', asset:'Yes', status:'Draft'});
        allReqs.forEach(function(no){ var r = byId(DB.requisitions,'no',no); if(r) r.status = 'Procurement Initiated'; });
        logAudit('Procurement Plan', no,'Created','Status','\u2014','Draft',reason);
        save(); toast('Created consolidated plan <b>'+esc(no)+'</b> in PostgreSQL.','ok');
        goto('proc/plan');
      } catch(err) {
        toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
      }
    });
}

/* ============================ PROCUREMENT ============================ */
SCREENS['proc/plan'] = function(){
  return pageHead('Procurement Plan','Procurement Management',
    'Plans linking approved requisitions to a procurement mode and budget reference',
    '<button class="btn gh sm" onclick="tblExport(\'tPlan\',\'Procurement_Plan\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="goto(\'req/consolidate\')">+ New plan</button>',
    reqTags('MMP_3','MMP_17'))+
  summaryRow([
    {l:'Plans', v:DB.plans.length, c:'#1E5A96'},
    {l:'Approved', v:DB.plans.filter(function(p){ return p.status==='Approved'; }).length, c:'#15803D'},
    {l:'Planned value', v:inr0(sum(DB.plans,'value')), c:'#0F766E'},
    {l:'Awaiting approval', v:DB.plans.filter(function(p){ return p.status!=='Approved'; }).length, c:'#B45309'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tPlan', rows:DB.plans, cols:[
    {h:'Plan Number', k:'no', cls:'mono'},
    {h:'Linked Requisitions', k:'reqs', f:function(r){ return '<span class="mono" style="font-size:11px">'+esc(r.reqs)+'</span>'; }},
    {h:'Procurement Mode', k:'mode'},
    {h:'Estimated Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
    {h:'Procurement Officer', k:'officer'},
    {h:'Budget Reference', k:'budget'},
    {h:'Tender / GeM Reference', k:'ref', cls:'mono'},
    {h:'Expected Delivery', k:'expected', f:function(r){ return fdate(r.expected); }},
    {h:'Inspection', k:'insp', cls:'center'},
    {h:'Warranty', k:'warr', cls:'center'},
    {h:'Asset', k:'asset', cls:'center'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return (r.status!=='Approved'? actIcon('Approve','approvePlan(\''+r.id+'\')','ok'):'')+
      actIcon('Create tender','planToTender(\''+r.id+'\')','sec'); }}
  ]})+'</div></div>';
};
function approvePlan(id){
  var p = byId(DB.plans,'id',id);
  confirmAct({title:'Approve procurement plan', ok:'Approve', btnClass:'ok', reason:true,
    message:'<b>'+esc(p.no)+'</b> worth '+inr(p.value)+' is approved for tendering.'},
    function(reason){ var o=p.status; p.status='Approved';
      logAudit('Procurement Plan',p.no,'Approved','Status',o,'Approved',reason);
      tblPaint('tPlan'); commit('Approved plan <b>'+esc(p.no)+'</b>.','ok'); });
}
function planToTender(id){
  var p = byId(DB.plans,'id',id);
  if(p.status!=='Approved'){ toast('Approve the plan before raising a tender.','wa'); return; }
  confirmAct({title:'Create tender from plan', ok:'Create tender', btnClass:'pri', reason:true,
    message:'A tender is created against <b>'+esc(p.no)+'</b> and published on the selected portal.'},
    async function(reason){
      var fee = p.value>2500000?5000:2000, emd = Math.round(p.value*0.02);
      var payload = {tender_title: 'Procurement against plan '+p.no, estimated_cost: p.value, tender_fee: fee, emd_amount: emd, bidding_days: 28};
      try {
        var res = await fetch(API_BASE+'/procurement/tenders', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the tender ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        var created = await res.json();
        var no = created.tender_no;
        DB.tenders.unshift({id:created.id, no:no, title:payload.tender_title, date:TODAY, mode:p.mode,
          dept:DEPTS[0], value:p.value, fee:fee, emd:emd,
          close: addDays(TODAY,28), status:'Published', portal:'GNCTD e-Procurement Portal', coa:p.budget});
        p.ref = no;
        logAudit('Tender', no,'Created','Status','\u2014','Published',reason);
        save(); toast('Created and published tender <b>'+esc(no)+'</b> in PostgreSQL (id '+created.id+').','ok');
        goto('proc/tender');
      } catch(err) {
        toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
      }
    });
}

SCREENS['proc/tender'] = function(){
  return pageHead('Tender / BoQ','Procurement Management',
    'Tender register across GeM, CPPP and the GNCTD e-Procurement Portal',
    '<button class="btn gh sm" onclick="goto(\'mm/boq\')">BoQ mapping</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tTnd\',\'Tender_Register\')">\u2913 Export</button>'+
    '<button class="btn gh sm" onclick="goto(\'admin/integration\')">Portal monitor</button>',
    reqTags('MMP_3','MMP_6'))+
  summaryRow([
    {l:'Tenders', v:DB.tenders.length, c:'#1E5A96'},
    {l:'Live or under evaluation', v:DB.tenders.filter(function(t){ return ['Published','Bid Opened','Under Evaluation'].indexOf(t.status)>=0; }).length, c:'#B45309'},
    {l:'Awarded', v:DB.tenders.filter(function(t){ return t.status==='Awarded'; }).length, c:'#15803D'},
    {l:'Tendered value', v:inr0(sum(DB.tenders,'value')), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tTnd', rows:DB.tenders, cols:[
    {h:'Tender ID', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewTender(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
    {h:'Tender Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Tender Title', k:'title'},
    {h:'Department', k:'dept'},
    {h:'Mode', k:'mode'},
    {h:'Tender Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
    {h:'Tender Fee', k:'fee', cls:'num', f:function(r){ return r.fee? inr(r.fee):'Nil'; }},
    {h:'EMD Amount', k:'emd', cls:'num', f:function(r){ return inr(r.emd); }},
    {h:'Bid Closing', k:'close', f:function(r){ return fdate(r.close); }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Portal', k:'portal'},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('View','viewTender(\''+r.id+'\')')+
      actIcon('Bids','goto(\'proc/quotes\')','gh')+
      actIcon('Comparative','goto(\'proc/cs\')','sec'); }}
  ]})+'</div></div>';
};
function viewTender(id){
  var t = byId(DB.tenders,'id',id);
  var bids = DB.quotes.filter(function(q){ return q.tender===t.no; });
  var lines = DB.boq.filter(function(b){ return b.tender===t.no; });
  modal({title:'Tender '+esc(t.no), size:'lg',
    body: tabsHtml('vt',['Tender details','BoQ lines','Bids received','Portal data'])+
      pane('vt',0,'<div class="grid g2"><table class="kv">'+
        kvRow('Tender ID','<span class="mono">'+esc(t.no)+'</span>')+kvRow('Title', esc(t.title))+
        kvRow('Department', esc(t.dept))+kvRow('Procurement mode', esc(t.mode))+
        kvRow('Tender date', fdate(t.date))+kvRow('Bid closing date', fdate(t.close))+'</table>'+
        '<table class="kv">'+kvRow('Tender value','<b>'+inr(t.value)+'</b>')+
        kvRow('Tender fee', t.fee? inr(t.fee):'Nil')+kvRow('EMD', inr(t.emd))+
        kvRow('Chart of accounts', esc(t.coa))+kvRow('Portal source', esc(t.portal))+
        kvRow('Status', badge(t.status))+'</table></div>')+
      pane('vt',1, lines.length? '<div class="twrap" style="max-height:280px"><table class="tbl"><thead><tr>'+
        ['Line','BoQ Description','Material Code','Qty','Tender UOM','IFMS UOM','Match Status'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
        '</tr></thead><tbody>'+lines.map(function(b){
          return '<tr><td class="num">'+b.line+'</td><td>'+esc(b.boqDesc)+'</td>'+
          '<td class="mono">'+(b.mat||'\u2014')+'</td><td class="num">'+num(b.qty)+'</td><td>'+esc(b.tUom)+'</td>'+
          '<td>'+esc(b.iUom)+'</td><td>'+badge(b.status)+'</td></tr>';
        }).join('')+'</tbody></table></div>'
        : '<div class="note wa">No BoQ line is mapped to this tender yet.</div>')+
      pane('vt',2, bids.length? '<div class="twrap" style="max-height:280px"><table class="tbl"><thead><tr>'+
        ['Bid Number','Vendor','Submitted','Technical','Quoted Amount','Score'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
        '</tr></thead><tbody>'+bids.map(function(q){
          return '<tr><td class="mono">'+esc(q.no)+'</td><td>'+esc(vname(q.vendor))+'</td>'+
          '<td>'+fdate(q.sub)+'</td><td>'+badge(q.tech)+'</td><td class="num">'+inr(q.amount)+'</td>'+
          '<td class="num">'+q.score+'</td></tr>';
        }).join('')+'</tbody></table></div>'
        : '<div class="note in">No bid received yet.</div>')+
      pane('vt',3,'<table class="kv">'+
        kvRow('Portal', esc(t.portal))+kvRow('External tender reference','<span class="mono">EXT/'+esc(t.no.replace(/\D/g,''))+'</span>')+
        kvRow('Last synchronised', fdatetime('2026-08-29T09:12:00'))+
        kvRow('Records received', num(bids.length))+kvRow('Sync status', badge('Success'))+
        kvRow('Reconciliation','No discrepancy reported')+'</table>'+
        '<div class="btn-row" style="margin-top:11px"><button class="btn gh sm" onclick="simulateSync()">\u21BB Sync now</button>'+
        '<button class="btn gh sm" onclick="closeModal();goto(\'admin/integration\')">Open integration monitor</button></div>')});
}

SCREENS['proc/quotes'] = function(){
  return pageHead('Quotation Management','Procurement Management',
    'Vendor quotations and bids received against tenders',
    '<button class="btn gh sm" onclick="tblExport(\'tQt\',\'Quotation_Register\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="quoteEntry()">+ Record quotation</button>',
    reqTags('MMP_6'))+
  summaryRow([
    {l:'Bids received', v:DB.quotes.length, c:'#1E5A96'},
    {l:'Technically qualified', v:DB.quotes.filter(function(q){ return q.tech==='Qualified'; }).length, c:'#15803D'},
    {l:'Disqualified', v:DB.quotes.filter(function(q){ return q.tech==='Disqualified'; }).length, c:'#B91C1C'},
    {l:'Quoted value', v:inr0(sum(DB.quotes,'amount')), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tQt', rows:DB.quotes, cols:[
    {h:'Bid Number', k:'no', cls:'mono'},
    {h:'Tender Reference', k:'tender', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Submission Date', k:'sub', f:function(r){ return fdate(r.sub); }},
    {h:'Technical Status', k:'tech', f:function(r){ return badge(r.tech); }},
    {h:'Financial Status', k:'fin'},
    {h:'Quoted Amount', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
    {h:'Evaluated Amount', k:'evaluated', cls:'num', f:function(r){ return r.evaluated? inr(r.evaluated):'\u2014'; }},
    {h:'Rank', k:'rank', cls:'num', f:function(r){ return r.rank? 'L'+r.rank : '\u2014'; }},
    {h:'Recommendation', k:'reco', f:function(r){ return r.reco? badge(r.reco):'\u2014'; }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('View','viewQuote(\''+r.id+'\')')+actIcon('Evaluate','goto(\'proc/eval\')','sec'); }}
  ]})+'</div></div>';
};
function viewQuote(id){
  var q = byId(DB.quotes,'id',id);
  modal({title:'Bid '+esc(q.no)+' \u2014 '+esc(vname(q.vendor)), size:'md',
    body:'<div class="grid g2"><table class="kv">'+
      kvRow('Tender reference','<span class="mono">'+esc(q.tender)+'</span>')+
      kvRow('Vendor', esc(vname(q.vendor)))+kvRow('Submission date', fdate(q.sub))+
      kvRow('Bid validity', fdate(q.validity))+kvRow('Delivery period', q.delivery+' days')+
      kvRow('Warranty period', q.warranty+' months')+kvRow('Payment terms', esc(q.terms))+'</table>'+
      '<table class="kv">'+kvRow('Basic value', inr(q.basic))+kvRow('Tax', inr(q.tax))+
      kvRow('Freight', inr(q.freight))+kvRow('Insurance', inr(q.insurance))+
      kvRow('Installation', inr(q.install))+kvRow('Other charges', inr(q.other))+
      kvRow('Discount','-'+inr(q.discount))+kvRow('Total quoted value','<b>'+inr(q.amount)+'</b>')+'</table></div>'+
      '<div class="sec-h" style="margin-top:11px">Deviations</div><div style="font-size:12.5px">'+esc(q.deviations)+'</div>'});
}
function quoteEntry(){
  modal({title:'Record vendor quotation', size:'lg',
    body:'<div id="qeForm"><div class="fgrid g3">'+
      fld({id:'qeT', label:'Tender / quotation reference', type:'select', opts:DB.tenders.map(function(t){ return t.no; }), req:true})+
      fld({id:'qeV', label:'Vendor', type:'select', opts:DB.vendors.map(function(v){ return {v:v.party_code,l:v.party_name}; }), req:true})+
      fld({id:'qeNo', label:'Bid number', val:'BID/2026/'+pad(4200+DB.quotes.length*7,5), req:true})+
      fld({id:'qeDate', label:'Submission date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'qeVal', label:'Bid validity', type:'date', val:'2026-12-31', date:true})+
      fld({id:'qeMat', label:'Material / service line', type:'select', opts:DB.materials.map(function(m){ return {v:m.code,l:m.code+' \u2014 '+m.name}; })})+
      fld({id:'qeQty', label:'Quantity', type:'number', val:1, num:true, req:true, onchange:'qeCalc()'})+
      fld({id:'qeRate', label:'Basic rate (\u20B9)', type:'number', val:0, num:true, req:true, onchange:'qeCalc()'})+
      fld({id:'qeTax', label:'Tax (%)', type:'number', val:18, num:true, onchange:'qeCalc()'})+
      fld({id:'qeFr', label:'Freight (\u20B9)', type:'number', val:0, num:true, onchange:'qeCalc()'})+
      fld({id:'qeIns', label:'Insurance (\u20B9)', type:'number', val:0, num:true, onchange:'qeCalc()'})+
      fld({id:'qeInst', label:'Installation (\u20B9)', type:'number', val:0, num:true, onchange:'qeCalc()'})+
      fld({id:'qeOth', label:'Other charges (\u20B9)', type:'number', val:0, num:true, onchange:'qeCalc()'})+
      fld({id:'qeDis', label:'Discount (\u20B9)', type:'number', val:0, num:true, onchange:'qeCalc()'})+
      fld({id:'qeTot', label:'Total quoted value (\u20B9)', ro:true, val:'0.00'})+
      fld({id:'qeDel', label:'Delivery period (days)', type:'number', val:30, num:true})+
      fld({id:'qeWar', label:'Warranty period (months)', type:'number', val:12, num:true})+
      fld({id:'qeTerm', label:'Payment terms', val:'100% within 30 days of accepted GRN'})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'qeDev', label:'Deviations', type:'textarea', rows:2, val:'Nil'})+
      fld({id:'qeRem', label:'Remarks', type:'textarea', rows:2})+'</div>'+
      '<div style="margin-top:11px">'+attachWidget('qeAtt',[])+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button><button class="btn pri" onclick="saveQuote()">Save quotation</button>'});
}
function qeCalc(){
  var basic = nval('qeQty')*nval('qeRate');
  var tax = Math.round(basic*nval('qeTax')/100);
  var tot = basic+tax+nval('qeFr')+nval('qeIns')+nval('qeInst')+nval('qeOth')-nval('qeDis');
  setVal('qeTot', tot.toFixed(2));
}
async function saveQuote(){
  if(!requireOk('qeForm')) return;
  qeCalc();
  var tot = Number(val('qeTot'));
  if(tot<=0){ toast('The total quoted value must be greater than zero.','er'); return; }
  var basic = nval('qeQty')*nval('qeRate');
  var tenderObj = byId(DB.tenders,'no', val('qeT'));
  var vendorObj = byId(DB.vendors,'party_code', val('qeV'));
  var matObj = byId(DB.materials,'code', val('qeMat'));
  if(!tenderObj || !vendorObj){ toast('Could not resolve tender or vendor against the master data.','er'); return; }
  var rec = {id:uid('Q'), no:val('qeNo'), tender:val('qeT'), vendor:val('qeV'), sub:val('qeDate'),
    tech:'Pending', fin:'Opened', basic:basic, tax:Math.round(basic*nval('qeTax')/100), freight:nval('qeFr'),
    insurance:nval('qeIns'), install:nval('qeInst'), other:nval('qeOth'), discount:nval('qeDis'),
    amount:tot, evaluated:tot, delivery:nval('qeDel'), warranty:nval('qeWar'), terms:val('qeTerm'),
    validity:val('qeVal'), rank:0, reco:'', status:'Under Review', score:0,
    deviations:val('qeDev'), elig:'To be examined', docs:'To be verified', qcert:'\u2014',
    capacity:'\u2014', past:'\u2014', remarks:val('qeRem')};
  var payload = {tender_id: tenderObj.id, party_id: vendorObj.id, item_id: matObj ? matObj.id : undefined,
    quoted_qty: nval('qeQty'), basic_rate: nval('qeRate'), gst_percent: nval('qeTax')};
  try {
    var res = await fetch(API_BASE+'/procurement/quotes', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the quotation ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id;
    DB.quotes.push(rec);
    logAudit('Quotation', rec.no,'Recorded','Status','\u2014','Under Review','Bid entered by procurement officer');
    closeModal(); save(); toast('Recorded quotation <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+').','ok');
    goto('proc/quotes');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}

/* ---------- technical evaluation ---------- */
SCREENS['proc/eval'] = function(){
  var t = DB.tenders.filter(function(x){ return ['Under Evaluation','Bid Opened','Awarded'].indexOf(x.status)>=0; });
  var cur = t[0] ? t[0].no : (DB.tenders[0]||{}).no;
  return pageHead('Vendor Evaluation','Procurement Management',
    'Technical evaluation of bids against eligibility, compliance and past performance',
    '<button class="btn gh sm" onclick="goto(\'proc/cs\')">Comparative statement \u2192</button>',
    reqTags('MMP_6'))+
  '<div class="fbar no-print"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;align-items:end">'+
    fld({id:'evT', label:'Tender', type:'select', opts:DB.tenders.map(function(x){ return x.no; }), val:cur, blank:false, onchange:'paintEval()'})+
    '<div class="btn-row"><button class="btn sec sm" onclick="paintEval()">Load bids</button>'+
    '<button class="btn ok sm" onclick="finishEval()">\u2713 Complete evaluation</button></div>'+
  '</div></div><div id="evalOut"></div>';
};
SCREENS_AFTER['proc/eval'] = function(){ paintEval(); };
function paintEval(){
  var t = val('evT');
  var bids = DB.quotes.filter(function(q){ return q.tender===t; });
  var host = document.getElementById('evalOut');
  if(!bids.length){ host.innerHTML = '<div class="card"><div class="bd"><div class="note wa">No bid recorded against this tender.</div></div></div>'; return; }
  host.innerHTML = '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:12px">'+
    bids.map(function(q){
      return '<div class="card"><div class="hd"><span>'+esc(vname(q.vendor))+'</span>'+badge(q.tech)+'</div><div class="bd">'+
      '<table class="kv">'+
      kvRow('Bid number','<span class="mono">'+esc(q.no)+'</span>')+
      kvRow('Eligibility', esc(q.elig))+kvRow('Required documents', esc(q.docs))+
      kvRow('Quality certification', esc(q.qcert))+kvRow('Delivery capacity', esc(q.capacity))+
      kvRow('Past performance', esc(q.past))+kvRow('Warranty support', q.warranty+' months')+
      kvRow('Deviations', esc(q.deviations))+
      kvRow('Quoted amount','<b>'+inr(q.amount)+'</b>')+'</table>'+
      '<div class="fgrid g2" style="margin-top:11px">'+
        fld({id:'ev_s_'+q.id, label:'Evaluator score (0-100)', type:'number', val:q.score, num:true, min:0, max:100})+
        fld({id:'ev_t_'+q.id, label:'Technical status', type:'select', blank:false,
             opts:['Pending','Qualified','Disqualified','Clarification Required'], val:q.tech})+
      '</div>'+
      fld({id:'ev_r_'+q.id, label:'Evaluator remarks', type:'textarea', rows:2, val:q.remarks})+
      '<div class="btn-row" style="margin-top:9px"><button class="btn sec sm" onclick="saveEval(\''+q.id+'\')">Save evaluation</button></div>'+
    '</div></div>';
    }).join('')+'</div>';
}
async function saveEval(id){
  var q = byId(DB.quotes,'id',id);
  var oldT = q.tech;
  var score = Number(val('ev_s_'+id))||0;
  var tech = val('ev_t_'+id);
  var remarks = val('ev_r_'+id);
  var payload = {is_technically_ok: tech==='Qualified', eval_remarks: 'Score: '+score+'/100. '+(remarks||'')};
  try {
    var res = await fetch(API_BASE+'/procurement/quotes/'+q.id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the evaluation ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
  } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
  q.score = score; q.tech = tech; q.remarks = remarks;
  if(q.tech==='Disqualified'){ q.status='Rejected'; q.evaluated=0; }
  else if(q.tech==='Qualified'){ q.status='Under Review'; q.evaluated = q.amount - q.discount; }
  logAudit('Vendor Evaluation', q.no,'Evaluated','Technical Status',oldT,q.tech, q.remarks||'Technical evaluation recorded');
  commit('Saved the evaluation for <b>'+esc(vname(q.vendor))+'</b> in PostgreSQL.','ok');
  paintEval();
}
function finishEval(){
  var t = val('evT');
  var pending = DB.quotes.filter(function(q){ return q.tender===t && q.tech==='Pending'; });
  if(pending.length){ toast(pending.length+' bid(s) still need technical evaluation.','wa'); return; }
  confirmAct({title:'Complete technical evaluation', ok:'Complete', btnClass:'ok', reason:true,
    message:'The technical evaluation for <b>'+esc(t)+'</b> closes and the comparative statement is generated.'},
    function(reason){
      var tn = byId(DB.tenders,'no',t); if(tn) tn.status='Under Evaluation';
      logAudit('Tender', t,'Technical Evaluation Completed','Status','Bid Opened','Under Evaluation',reason);
      save(); toast('Technical evaluation completed for <b>'+esc(t)+'</b> (stage tracked locally — the backend has no separate evaluation-stage field; it already reflects a tender with recorded bids as under evaluation).','ok');
      goto('proc/cs');
    });
}

/* ---------- comparative statement ---------- */
SCREENS['proc/cs'] = function(){
  var t = DB.tenders.filter(function(x){ return ['Under Evaluation','Bid Opened','Awarded'].indexOf(x.status)>=0; });
  var cur = t[0] ? t[0].no : (DB.tenders[0]||{}).no;
  return pageHead('Comparative Statement','Procurement Management',
    'Landed cost comparison, L1 determination and award recommendation',
    '<button class="btn gh sm" onclick="downloadCs()">\u2913 Download statement</button>'+
    '<button class="btn gh sm" onclick="csAudit()">Evaluation audit trail</button>',
    reqTags('MMP_6','MMP_7'))+
  '<div class="fbar no-print"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;align-items:end">'+
    fld({id:'csT', label:'Tender', type:'select', opts:DB.tenders.map(function(x){ return x.no; }), val:cur, blank:false, onchange:'paintCs()'})+
    '<div class="btn-row">'+
      '<button class="btn sec sm" onclick="autoL1()">\u26A1 Calculate L1</button>'+
      '<button class="btn gh sm" onclick="recordNegotiation()">Record negotiation</button>'+
      '<button class="btn gh sm" onclick="recommendRetender()">Recommend re-tender</button>'+
    '</div></div></div><div id="csOut"></div>';
};
SCREENS_AFTER['proc/cs'] = function(){ paintCs(); };
function paintCs(){
  var t = val('csT');
  var bids = DB.quotes.filter(function(q){ return q.tender===t; });
  var host = document.getElementById('csOut');
  if(!bids.length){ host.innerHTML='<div class="card"><div class="bd"><div class="note wa">No bid to compare for this tender.</div></div></div>'; return; }
  var q1 = bids.filter(function(b){ return b.tech==='Qualified'; }).sort(function(a,b){ return a.evaluated-b.evaluated; });
  var tn = byId(DB.tenders,'no',t) || {};
  host.innerHTML = summaryRow([
    {l:'Bids received', v:bids.length, c:'#1E5A96'},
    {l:'Technically qualified', v:q1.length, c:'#15803D'},
    {l:'Lowest evaluated cost', v: q1.length? inr0(q1[0].evaluated):'\u2014', c:'#0F766E'},
    {l:'Estimated tender value', v: inr0(tn.value||0), c:'#B45309'}
  ])+
  '<div class="card"><div class="hd"><span>Comparative statement \u2014 '+esc(t)+'</span>'+
    '<span class="muted" style="font-size:11px;font-weight:400">Evaluated landed cost basis</span></div><div class="bd">'+
    '<div class="twrap"><table class="tbl"><thead><tr>'+
    ['Vendor','Technical','Basic Value','Tax','Freight','Other Charges','Discount','Evaluated Landed Cost',
     'Delivery','Warranty','Payment Terms','Rank','Recommendation','Action'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
    '</tr></thead><tbody>'+bids.map(function(b){
      var rank = -1;
      q1.forEach(function(x,ix){ if(x.id===b.id) rank = ix; });
      return '<tr'+(rank===0?' style="background:#E7F6EC"':'')+'>'+
        '<td class="fw6">'+esc(vname(b.vendor))+'</td><td>'+badge(b.tech)+'</td>'+
        '<td class="num">'+inr(b.basic)+'</td><td class="num">'+inr(b.tax)+'</td>'+
        '<td class="num">'+inr(b.freight)+'</td><td class="num">'+inr(b.insurance+b.install+b.other)+'</td>'+
        '<td class="num">-'+inr(b.discount)+'</td>'+
        '<td class="num fw7">'+(b.evaluated? inr(b.evaluated):'\u2014')+'</td>'+
        '<td class="num">'+b.delivery+' d</td><td class="num">'+b.warranty+' m</td>'+
        '<td style="font-size:11.5px">'+esc(b.terms)+'</td>'+
        '<td>'+(rank>=0? '<span class="bdg '+(rank===0?'b-ok':'b-in')+'">L'+(rank+1)+'</span>':'\u2014')+'</td>'+
        '<td>'+(b.reco? badge(b.reco):'\u2014')+'</td>'+
        '<td class="acts">'+(b.tech==='Qualified'
          ? actIcon('Select','selectVendor(\''+b.id+'\')','ok')+actIcon('Split','splitAward(\''+b.id+'\')','gh')
          : '<span class="muted">\u2014</span>')+'</td></tr>';
    }).join('')+'</tbody></table></div>'+
    '<div class="btn-row" style="margin-top:11px">'+
      '<button class="btn pri" onclick="submitCs()">Submit for approval</button>'+
      '<button class="btn gh" onclick="downloadCs()">\u2913 Download comparative statement</button>'+
    '</div></div></div>'+
    (q1.length? '<div class="card" style="margin-top:12px"><div class="hd"><span>Recommendation</span></div><div class="bd">'+
      '<div class="note ok"><b>'+esc(vname(q1[0].vendor))+'</b> is the lowest evaluated bidder (L1) at <b>'+
      inr(q1[0].evaluated)+'</b>, '+
      (tn.value ? pct(tn.value-q1[0].evaluated, tn.value).toFixed(1)+'% below the estimated tender value' : 'within the estimate')+
      '. Delivery '+q1[0].delivery+' days, warranty '+q1[0].warranty+' months.</div></div></div>' : '');
}
async function autoL1(){
  var t = val('csT');
  var bids = DB.quotes.filter(function(q){ return q.tender===t && q.tech==='Qualified'; }).sort(function(a,b){ return a.evaluated-b.evaluated; });
  if(!bids.length){ toast('No technically qualified bid is available for L1 determination.','wa'); return; }
  var failed = 0;
  for(var i=0;i<bids.length;i++){
    try {
      var res = await fetch(API_BASE+'/procurement/quotes/'+bids[i].id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rank_order: i+1})});
      if(!res.ok) failed++;
    } catch(err) { failed++; }
  }
  DB.quotes.filter(function(q){ return q.tender===t; }).forEach(function(q){ q.rank=0; q.reco=''; });
  bids.forEach(function(b,i){ b.rank = i+1; if(i===0) b.reco='Recommended'; });
  logAudit('Comparative Statement', t,'L1 Determined','Rank','\u2014','L1: '+vname(bids[0].vendor),'Lowest evaluated cost');
  commit('L1 is <b>'+esc(vname(bids[0].vendor))+'</b> at '+inr(bids[0].evaluated)+' \u2014 ranks saved in PostgreSQL'+(failed?' ('+failed+' failed)':'')+'.', failed?'wa':'ok');
  paintCs();
}
function selectVendor(id){
  var q = byId(DB.quotes,'id',id);
  var t = byId(DB.tenders,'no',q.tender);
  var vendorObj = byId(DB.vendors,'party_code', q.vendor);
  confirmAct({title:'Select vendor for award', ok:'Select and create work order', btnClass:'ok', reason:true,
    message:'<b>'+esc(vname(q.vendor))+'</b> is recommended for award against '+esc(q.tender)+' at '+inr(q.evaluated)+'.'},
    async function(reason){
      if(!t || !vendorObj){ toast('Could not resolve the tender or vendor against the master data.','er'); return; }
      try {
        var res = await fetch(API_BASE+'/procurement/tenders/'+t.id+'/award', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({party_id: vendorObj.id})});
        if(!res.ok){ var e = await res.text(); toast('Award failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Award failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      DB.quotes.filter(function(x){ return x.tender===q.tender; }).forEach(function(x){
        x.reco = x.id===id? 'Recommended':'Not Recommended'; x.status = x.id===id? 'Approved':'Rejected';
      });
      if(t) t.status='Awarded';
      logAudit('Comparative Statement', q.tender,'Vendor Selected','Recommended Vendor','\u2014',vname(q.vendor),reason);
      commit('Selected <b>'+esc(vname(q.vendor))+'</b> for award in PostgreSQL. Create the work order to proceed.','ok');
      paintCs();
      setTimeout(function(){ goto('wo/create'); }, 800);
    });
}
async function splitAward(id){
  var q = byId(DB.quotes,'id',id);
  confirmAct({title:'Split award', kind:'wa', ok:'Record split award', reason:true,
    message:'A split award is recorded for <b>'+esc(vname(q.vendor))+'</b>. State the quantity split and the justification.'},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/procurement/quotes/'+q.id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({is_selected:true, eval_remarks:'Split award: '+reason})});
        if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
      q.reco='Split Award'; q.status='Approved';
      logAudit('Comparative Statement', q.tender,'Split Award','Recommendation','\u2014','Split Award',reason);
      commit('Recorded a split award for <b>'+esc(vname(q.vendor))+'</b> in PostgreSQL.','ok'); paintCs();
    });
}
function recordNegotiation(){
  var t = val('csT');
  modal({title:'Record negotiation \u2014 '+esc(t), size:'md',
    body:'<div id="ngForm"><div class="fgrid g2">'+
      fld({id:'ngV', label:'Vendor', type:'select', req:true,
           opts:DB.quotes.filter(function(q){ return q.tender===t; }).map(function(q){ return {v:q.id,l:vname(q.vendor)}; })})+
      fld({id:'ngD', label:'Negotiation date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'ngA', label:'Negotiated amount (\u20B9)', type:'number', val:0, num:true, req:true})+
      fld({id:'ngB', label:'Negotiation committee', val:'Tender Committee'})+
    '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'ngR', label:'Minutes / justification', type:'textarea', rows:3, req:true})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button><button class="btn pri" onclick="saveNegotiation()">Record negotiation</button>'});
}
async function saveNegotiation(){
  if(!requireOk('ngForm')) return;
  var q = byId(DB.quotes,'id',val('ngV'));
  var old = q.evaluated;
  var newAmt = nval('ngA');
  try {
    var res = await fetch(API_BASE+'/procurement/quotes/'+q.id, {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({total_bid_value:newAmt, eval_remarks:'Negotiated on '+val('ngD')+' by '+val('ngB')+'. '+val('ngR')})});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the negotiation ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
  } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
  q.evaluated = newAmt; q.status='Under Review';
  logAudit('Comparative Statement', q.tender,'Negotiation Recorded','Evaluated Amount',inr(old),inr(q.evaluated),val('ngR'));
  closeModal(); commit('Recorded the negotiation for <b>'+esc(vname(q.vendor))+'</b> in PostgreSQL. Recalculate L1.','ok');
  paintCs();
}
function recommendRetender(){
  var t = val('csT');
  confirmAct({title:'Recommend re-tender', kind:'er', btnClass:'dgr', ok:'Recommend re-tender', reason:true,
    message:'Tender <b>'+esc(t)+'</b> is recommended for cancellation and re-tendering. Note: the backend has no re-tender/cancellation status field for tenders, so this is recorded locally and in the audit trail only.'},
    function(reason){
      var tn = byId(DB.tenders,'no',t); if(tn) tn.status='Re-Tender Recommended';
      logAudit('Tender', t,'Re-Tender Recommended','Status','Under Evaluation','Re-Tender Recommended',reason);
      commit('Recommended re-tender for <b>'+esc(t)+'</b> (local only — no backend status field for this).','wa'); paintCs();
    });
}
function submitCs(){
  var t = val('csT');
  confirmAct({title:'Submit comparative statement', ok:'Submit for approval', btnClass:'pri', reason:true,
    message:'The comparative statement for <b>'+esc(t)+'</b> goes to the competent authority. Note: the underlying evaluation scores, ranks and negotiated amounts are already saved to PostgreSQL as they were recorded; the "submission" step itself is an audit-trail entry only, since the backend has no CS-submission workflow endpoint.'},
    function(reason){ logAudit('Comparative Statement', t,'Submitted','Status','Draft','Submitted for Approval',reason);
      commit('Submitted the comparative statement for approval (audit trail only).','ok'); });
}
function downloadCs(){
  var t = val('csT');
  var bids = DB.quotes.filter(function(q){ return q.tender===t; });
  exportCsv('Comparative_Statement_'+t.replace(/\W/g,'_'),
    [{h:'Vendor',k:'v',f:function(r){ return vname(r.vendor); }},{h:'Technical',k:'tech'},{h:'Basic Value',k:'basic'},
     {h:'Tax',k:'tax'},{h:'Freight',k:'freight'},{h:'Discount',k:'discount'},
     {h:'Evaluated Landed Cost',k:'evaluated'},{h:'Delivery Days',k:'delivery'},
     {h:'Warranty Months',k:'warranty'},{h:'Rank',k:'rank'},{h:'Recommendation',k:'reco'}], bids);
}
function csAudit(){
  var t = val('csT');
  modal({title:'Evaluation audit trail \u2014 '+esc(t), size:'lg',
    body: auditTableHtml(DB.trail.filter(function(x){ return x.ref===t; }))});
}

/* ---------- securities ---------- */
var SEC_TAB = 0;
SCREENS['proc/emd'] = function(){ SEC_TAB = 1; return securitiesScreen(); };
SCREENS['proc/pg']  = function(){ SEC_TAB = 2; return securitiesScreen(); };
SCREENS_AFTER['proc/emd'] = function(){ switchTab('sec', SEC_TAB); };
SCREENS_AFTER['proc/pg']  = function(){ switchTab('sec', SEC_TAB); };
function expiryCell(d){
  var n = daysBetween(TODAY,d);
  var cls = n<0 ? 'color:#B91C1C;font-weight:700' : (n<=90? 'color:#B45309;font-weight:700':'');
  return '<span style="'+cls+'">'+fdate(d)+'</span>'+(n<0? ' <span class="bdg b-er">Expired</span>' :
    (n<=90? ' <span class="bdg b-wa">'+n+' d</span>':''));
}
function securitiesScreen(){
  var g = 'sec';
  var expSoon = DB.pgs.filter(function(p){ var n=daysBetween(TODAY,p.expiry); return n<=90 && n>=0; });
  var expired = DB.pgs.filter(function(p){ return daysBetween(TODAY,p.expiry)<0; })
    .concat(DB.emds.filter(function(e){ return daysBetween(TODAY,e.expiry)<0; }));
  return pageHead('Securities Management','Procurement Management',
    'Tender fee, earnest money deposit, performance guarantee, release and expiry monitoring',
    '<button class="btn gh sm" onclick="tblExport(\'tEmd\',\'EMD_Register\')">\u2913 Export EMD</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tPg\',\'Performance_Guarantee_Register\')">\u2913 Export PG</button>',
    reqTags('MMP_6','MMP_15'))+
  summaryRow([
    {l:'Tender fee collected', v:inr0(sum(DB.fees,'amount')), c:'#1E5A96'},
    {l:'EMD held', v:inr0(sum(DB.emds.filter(function(e){ return ['Refunded','Forfeited'].indexOf(e.status)<0; }),'amount')), c:'#0F766E'},
    {l:'Performance guarantees', v:inr0(sum(DB.pgs.filter(function(p){ return p.status!=='Released'; }),'amount')), c:'#15803D'},
    {l:'Expiring within 90 days', v:expSoon.length, c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+
    tabsHtml(g,['Tender fee','Earnest money deposit','Performance guarantee','Release / refund','Expiry alerts'])+
    pane(g,0, renderTable({id:'tFee', rows:DB.fees, cols:[
      {h:'Tender ID', k:'tender', cls:'mono'},
      {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
      {h:'Tender Fee', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
      {h:'Payment Mode', k:'mode'},
      {h:'Payment Reference', k:'ref', cls:'mono'},
      {h:'Payment Date', k:'date', f:function(r){ return fdate(r.date); }},
      {h:'Receipt Number', k:'receipt', cls:'mono'},
      {h:'Refundable', k:'refundable'},
      {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
      {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
        return r.status==='Pending Refund' ? actIcon('Refund','securityAct(\'fees\',\''+r.id+'\',\'Refunded\')','ok') : '<span class="muted">\u2014</span>'; }}
    ]}))+
    pane(g,1, renderTable({id:'tEmd', rows:DB.emds, cols:[
      {h:'Tender ID', k:'tender', cls:'mono'},
      {h:'Vendor / Bidder', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
      {h:'EMD Amount', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
      {h:'Payment Mode', k:'mode'},
      {h:'Instrument Type', k:'instrType'},
      {h:'Instrument Number', k:'instrNo', cls:'mono'},
      {h:'Bank', k:'bank'},
      {h:'Issue Date', k:'issue', f:function(r){ return fdate(r.issue); }},
      {h:'Expiry Date', k:'expiry', f:function(r){ return expiryCell(r.expiry); }},
      {h:'Verification', k:'verify', f:function(r){ return badge(r.verify); }},
      {h:'EMD Status', k:'status', f:function(r){ return badge(r.status); }},
      {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
        return (r.verify!=='Verified'? actIcon('Verify','securityAct(\'emds\',\''+r.id+'\',\'Verified\',\'verify\')','sec'):'')+
        (r.status==='Pending Refund'? actIcon('Refund','securityAct(\'emds\',\''+r.id+'\',\'Refunded\')','ok'):'')+
        (['Accepted','Adjusted'].indexOf(r.status)>=0? actIcon('Forfeit','securityAct(\'emds\',\''+r.id+'\',\'Forfeited\')','dgr'):'')+
        actIcon('Instrument','viewInstrument(\'emds\',\''+r.id+'\')','gh'); }}
    ]}))+
    pane(g,2, renderTable({id:'tPg', rows:DB.pgs, cols:[
      {h:'Work Order', k:'wo', cls:'mono'},
      {h:'Contract Number', k:'contract', cls:'mono'},
      {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
      {h:'Guarantee Amount', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
      {h:'Percentage', k:'pctv', cls:'num', f:function(r){ return r.pctv+'%'; }},
      {h:'Instrument Type', k:'instrType'},
      {h:'Instrument Number', k:'instrNo', cls:'mono'},
      {h:'Bank', k:'bank'},
      {h:'Issue Date', k:'issue', f:function(r){ return fdate(r.issue); }},
      {h:'Expiry Date', k:'expiry', f:function(r){ return expiryCell(r.expiry); }},
      {h:'Claim Period', k:'claim'},
      {h:'Release Eligibility', k:'release', f:function(r){ return fdate(r.release); }},
      {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
      {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
        return actIcon('Release','releasePg(\''+r.id+'\')','ok')+
        actIcon('Extend','extendPg(\''+r.id+'\')','warn')+
        actIcon('Forfeit','securityAct(\'pgs\',\''+r.id+'\',\'Forfeited\')','dgr')+
        actIcon('Audit','securityAudit(\''+r.instrNo+'\')','gh'); }}
    ]}))+
    pane(g,3,'<div class="note in" style="margin-bottom:11px">Refund and release entries pass to the finance interface for payment. A guarantee cannot be released while an open warranty defect exists against the contract.</div>'+
      renderTable({id:'tRel', rows: DB.emds.filter(function(e){ return ['Pending Refund','Refunded'].indexOf(e.status)>=0; })
        .map(function(e){ return {id:e.id, kind:'EMD', ref:e.tender, vendor:e.vendor, amount:e.amount, status:e.status, instr:e.instrNo}; })
        .concat(DB.pgs.filter(function(p){ return ['Released','Received','Accepted'].indexOf(p.status)>=0; })
        .map(function(p){ return {id:p.id, kind:'Performance Guarantee', ref:p.wo, vendor:p.vendor, amount:p.amount, status:p.status, instr:p.instrNo}; })),
      cols:[
        {h:'Security Type', k:'kind'},{h:'Reference', k:'ref', cls:'mono'},
        {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
        {h:'Amount', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
        {h:'Instrument', k:'instr', cls:'mono'},
        {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
      ]}))+
    pane(g,4,'<div class="grid g2">'+
      '<div class="card"><div class="hd"><span>Expiring within 90 days</span></div><div class="bd">'+
        (expSoon.length? expSoon.map(function(p){
          return '<div class="rag"><span class="s" style="background:#B45309">\u26A0</span>'+
          '<span class="grow"><b class="mono">'+esc(p.instrNo)+'</b> \u2014 '+esc(vname(p.vendor))+'<div class="muted" style="font-size:10.5px">'+
          esc(p.wo)+' \u00b7 '+inr(p.amount)+'</div></span><b>'+daysBetween(TODAY,p.expiry)+' d</b></div>';
        }).join('') : '<div class="note ok">No security expires in the next 90 days.</div>')+
      '</div></div>'+
      '<div class="card"><div class="hd"><span>Already expired</span></div><div class="bd">'+
        (expired.length? expired.map(function(p){
          return '<div class="rag"><span class="s" style="background:#B91C1C">!</span>'+
          '<span class="grow"><b class="mono">'+esc(p.instrNo)+'</b> \u2014 '+esc(vname(p.vendor))+
          '<div class="muted" style="font-size:10.5px">Expired on '+fdate(p.expiry)+'</div></span></div>';
        }).join('') : '<div class="note ok">No expired security instrument.</div>')+
      '</div></div></div>')+
  '</div></div>';
}
function securityAct(coll, id, status, field){
  var rec = byId(DB[coll],'id',id);
  var label = {Refunded:'Refund',Forfeited:'Forfeit',Verified:'Verify'}[status] || status;
  confirmAct({title:label+' security', ok:label, reason:true,
    kind: status==='Forfeited'?'er':'in', btnClass: status==='Forfeited'?'dgr':'ok',
    message:'The security instrument is marked as <b>'+status+'</b>.',
    detail: kvRow('Vendor', esc(vname(rec.vendor)))+kvRow('Amount', inr(rec.amount))+
            kvRow('Instrument', esc(rec.instrNo||rec.receipt||'\u2014'))},
    function(reason){
      var f = field||'status', old = rec[f];
      rec[f] = status;
      logAudit('Security', rec.instrNo||rec.receipt||rec.tender, label+'ed', f, old, status, reason);
      ['tFee','tEmd','tPg','tRel'].forEach(function(t){ if(TBL[t]) tblPaint(t); });
      commit('Marked the security as <b>'+status+'</b>.','ok');
    });
}
function releasePg(id){
  var p = byId(DB.pgs,'id',id);
  var openDefects = DB.defects.filter(function(d){ return d.vendor===p.vendor && ['Resolved','Closed','Out of Warranty'].indexOf(d.status)<0; });
  confirmAct({
    title:'Release performance guarantee',
    kind: openDefects.length? 'er':'in',
    btnClass: openDefects.length? 'dgr':'ok', ok:'Release', reason:true,
    message: openDefects.length
      ? '<b>Careful.</b> '+openDefects.length+' warranty defect(s) are still open against '+esc(vname(p.vendor))+
        '. Releasing now leaves no security behind those complaints.'
      : 'The guarantee is released and the instrument returned to the vendor.',
    detail: kvRow('Work order', esc(p.wo))+kvRow('Amount', inr(p.amount))+
            kvRow('Release eligibility date', fdate(p.release))+
            kvRow('Open defects', openDefects.length? '<b style="color:#B91C1C">'+openDefects.length+'</b>':'None')},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/procurement/securities/'+p.id+'/release', {method:'PUT'});
        if(!res.ok){ var e = await res.text(); toast('Release failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Release failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      var old = p.status; p.status='Released';
      logAudit('Performance Guarantee', p.instrNo,'Released','Status',old,'Released',reason);
      tblPaint('tPg'); commit('Released guarantee <b>'+esc(p.instrNo)+'</b> in PostgreSQL.','ok');
    });
}
function extendPg(id){
  var p = byId(DB.pgs,'id',id);
  modal({title:'Extend guarantee validity', size:'sm',
    body:'<div id="exForm"><table class="kv" style="margin-bottom:11px">'+
      kvRow('Instrument','<span class="mono">'+esc(p.instrNo)+'</span>')+
      kvRow('Current expiry', fdate(p.expiry))+'</table>'+
      fld({id:'exD', label:'Revised expiry date', type:'date', val: addDays(p.expiry,180), req:true, date:true})+
      fld({id:'exR', label:'Reason for extension', type:'textarea', rows:3, req:true})+'</div>',
    footer:'<button class="btn" data-close>Cancel</button><button class="btn pri" onclick="saveExtendPg(\''+id+'\')">Extend</button>'});
}
function saveExtendPg(id){
  if(!requireOk('exForm')) return;
  var p = byId(DB.pgs,'id',id), old = p.expiry;
  p.expiry = val('exD'); if(p.status==='Expired') p.status='Accepted';
  logAudit('Performance Guarantee', p.instrNo,'Extended','Expiry Date',fdate(old),fdate(p.expiry),val('exR'));
  closeModal(); tblPaint('tPg'); commit('Extended <b>'+esc(p.instrNo)+'</b> to '+fdate(p.expiry)+'.','ok');
}
function viewInstrument(coll,id){
  var r = byId(DB[coll],'id',id);
  modal({title:'Instrument '+esc(r.instrNo), size:'sm', body:'<table class="kv">'+
    kvRow('Instrument type', esc(r.instrType))+kvRow('Instrument number','<span class="mono">'+esc(r.instrNo)+'</span>')+
    kvRow('Issuing bank', esc(r.bank))+kvRow('Amount', inr(r.amount))+
    kvRow('Issue date', fdate(r.issue))+kvRow('Expiry date', fdate(r.expiry))+
    kvRow('Verification', badge(r.verify||'Verified'))+kvRow('Status', badge(r.status))+
    kvRow('Approval reference','<span class="mono">'+esc(r.approval||'\u2014')+'</span>')+'</table>'+
    '<div class="note in" style="margin-top:10px">A scanned copy of the instrument sits in the document repository.</div>'});
}
function securityAudit(ref){
  modal({title:'Audit trail \u2014 '+esc(ref), size:'lg', body: auditTableHtml(DB.trail.filter(function(t){ return t.ref===ref; }))});
}

/* ============================ WORK ORDER / PURCHASE ORDER ============================ */
var WO_LINES = [];
SCREENS['wo/create'] = function(){
  WO_LINES = [];
  var g = 'cw';
  var awarded = DB.quotes.filter(function(q){ return q.reco==='Recommended' || q.reco==='Split Award'; });
  return pageHead('Create Work Order','Work Order / Purchase Order',
    'Raise a work order or purchase order on the selected vendor against an approved requisition',
    '<button class="btn gh sm" onclick="goto(\'wo/list\')">\u2190 Back to register</button>',
    reqTags('MMP_7','MMP_8'))+
  '<div class="card"><div class="bd">'+
    tabsHtml(g,['Order details','Vendor and contract','Line items','Delivery and inspection',
                'Terms and securities','Budget check','Attachments','Approval preview'])+
    '<div id="woForm">'+
    pane(g,0,'<div class="fgrid g4">'+
      fld({id:'wNo', label:'Work order number', val: 'WO/DIT/2026/'+pad(130+DB.workorders.length,6), ro:true})+
      fld({id:'wDate', label:'Work order date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'wDept', label:'Department', type:'select', opts:DEPTS, val:DEPTS[0], req:true})+
      fld({id:'wMode', label:'Procurement mode', type:'select', opts:MODES, req:true})+
      fld({id:'wReq', label:'Requisition reference', type:'select', req:true,
           opts:DB.requisitions.filter(function(r){ return ['Approved','Procurement Initiated','Partially Procured'].indexOf(r.status)>=0; })
             .map(function(r){ return r.no; }), onchange:'woFromReq()'})+
      fld({id:'wTender', label:'Tender / award reference', type:'select',
           opts:DB.tenders.map(function(t){ return t.no; }), blank:'Not applicable'})+
      fld({id:'wBid', label:'Accepted bid', type:'select', blank:'Not applicable',
           opts:awarded.map(function(q){ return {v:q.id, l:q.no+' \u2014 '+vname(q.vendor)}; }), onchange:'woFromBid()'})+
      fld({id:'wType', label:'Order type', type:'select', opts:['Supply Order','Work Order','Service Order','Rate Contract Release'], val:'Supply Order', blank:false})+
      '</div>')+
    pane(g,1,'<div class="fgrid g3">'+
      fld({id:'wVendor', label:'Vendor', type:'select', req:true,
           opts:DB.vendors.map(function(v){ return {v:v.party_code, l:v.party_name}; }), onchange:'woVendorInfo()'})+
      fld({id:'wContract', label:'Contract number', val:'CON/2026/'+pad(760+DB.workorders.length*5,5)})+
      fld({id:'wStore', label:'Consignee store', type:'select', opts:STORES, req:true})+
      '</div><div id="wVenBox" style="margin-top:11px"></div>')+
    pane(g,2,
      '<div class="btn-row" style="margin-bottom:10px">'+
        '<button class="btn sec sm" onclick="addWoLine()">+ Add line</button>'+
        '<button class="btn gh sm" onclick="woPullReqLines()">\u21E9 Pull lines from requisition</button>'+
      '</div><div id="woLines"></div>')+
    pane(g,3,'<div class="fgrid g4">'+
      fld({id:'wDue', label:'Delivery due date', type:'date', val: addDays(TODAY,45), req:true, date:true})+
      fld({id:'wSched', label:'Delivery schedule', type:'select', opts:['Single lot','Phased \u2014 monthly','Phased \u2014 on call'], val:'Single lot', blank:false})+
      fld({id:'wInsp', label:'Inspection required', type:'select', opts:['Required','Not Required'], val:'Required', blank:false})+
      fld({id:'wInspBy', label:'Inspecting authority', type:'select',
           opts:['Technical Committee \u2014 IT','Store Inspection Board','Quality Cell \u2014 PWD','Medical Stores Committee']})+
      fld({id:'wWarr', label:'Warranty period (months)', type:'number', val:12, num:true})+
      fld({id:'wAmc', label:'AMC after warranty (months)', type:'number', val:0, num:true})+
      '</div>')+
    pane(g,4,'<div class="fgrid g2">'+
      fld({id:'wPay', label:'Payment terms', val:'100% within 30 days of accepted GRN', req:true})+
      fld({id:'wLd', label:'Liquidated damages clause', val:'0.5% per week of delay, maximum 10% of order value'})+
      '</div><div class="fgrid g3" style="margin-top:11px">'+
      fld({id:'wPgPct', label:'Performance guarantee (%)', type:'number', val:3, num:true, onchange:'woCalc()'})+
      fld({id:'wPgAmt', label:'Performance guarantee (\u20B9)', ro:true})+
      fld({id:'wRet', label:'Retention (%)', type:'number', val:5, num:true})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'wTerms', label:'Other terms and conditions', type:'textarea', rows:3,
           val:'Delivery at designated store. Inspection by departmental committee. Payment on three-way match.'})+'</div>')+
    pane(g,5,'<div class="fgrid g3">'+
      fld({id:'wCoa', label:'Budget head / chart of accounts', type:'select', opts:COA, req:true})+
      fld({id:'wFund', label:'Fund', type:'select', opts:FUNDS})+
      fld({id:'wAvail', label:'Available budget (\u20B9)', ro:true})+
      '</div><div class="btn-row" style="margin-top:11px">'+
      '<button class="btn sec sm" onclick="woBudgetCheck()">\u2713 Check budget and commit funds</button></div>'+
      '<div id="wBudgetOut" style="margin-top:11px"></div>')+
    pane(g,6, attachWidget('wAtt',[]))+
    pane(g,7,'<div id="wChain"></div>')+
    '</div></div>'+
    '<div style="border-top:1px solid var(--line);padding:11px 13px;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">'+
      '<button class="btn" onclick="goto(\'wo/list\')">Cancel</button>'+
      '<button class="btn gh" onclick="saveWo(\'Draft\')">Save draft</button>'+
      '<button class="btn pri" onclick="saveWo(\'Approved\')">Submit for approval</button>'+
    '</div>'+
  '</div>';
};
SCREENS_AFTER['wo/create'] = function(){ paintWoLines(); woVendorInfo(); woChain(); };
function woVendorInfo(){
  var box = document.getElementById('wVenBox'); if(!box) return;
  var raw = byId(DB.vendors,'party_code',val('wVendor'));
  var v = raw ? {code:raw.party_code, name:raw.party_name, gstin:raw.gstin, cat:raw.party_type, city:'Delhi', rating:raw.party_rating||4.0} : null;
  if(!v){ box.innerHTML = '<div class="note in">Select a vendor to see the registration and performance summary.</div>'; return; }
  var wos = DB.workorders.filter(function(w){ return w.vendor===v.code; });
  var defs = DB.defects.filter(function(d){ return d.vendor===v.code && ['Resolved','Closed'].indexOf(d.status)<0; });
  box.innerHTML = '<div class="grid g2"><table class="kv">'+
    kvRow('Vendor code','<span class="mono">'+esc(v.code)+'</span>')+kvRow('Vendor name', esc(v.name))+
    kvRow('GSTIN','<span class="mono">'+esc(v.gstin)+'</span>')+kvRow('Category', esc(v.cat))+
    kvRow('City', esc(v.city))+'</table><table class="kv">'+
    kvRow('Performance rating','<b>'+v.rating.toFixed(1)+' / 5.0</b>')+
    kvRow('Orders placed', wos.length)+
    kvRow('Order value', inr(sum(wos,'value')))+
    kvRow('Open defect complaints', defs.length? '<b style="color:#B91C1C">'+defs.length+'</b>':'None')+
    kvRow('Blacklisted','No')+'</table></div>'+
    (v.rating < 3.5 ? '<div class="note wa" style="margin-top:10px">This vendor rates below 3.5. Record the justification for placing a fresh order.</div>':'');
}
function woFromReq(){
  var r = byId(DB.requisitions,'no',val('wReq'));
  if(!r) return;
  setVal('wCoa', r.coa); setVal('wFund', r.fund); setVal('wStore', r.location); setVal('wMode', r.mode);
  toast('Loaded budget and consignee details from <b>'+esc(r.no)+'</b>. Pull the lines to continue.','in');
}
function woFromBid(){
  var q = byId(DB.quotes,'id',val('wBid'));
  if(!q) return;
  setVal('wVendor', q.vendor); setVal('wTender', q.tender);
  setVal('wWarr', q.warranty); setVal('wPay', q.terms);
  setVal('wDue', addDays(TODAY, q.delivery));
  woVendorInfo();
  toast('Vendor, warranty and delivery terms taken from bid <b>'+esc(q.no)+'</b>.','ok');
}
function woPullReqLines(){
  var r = byId(DB.requisitions,'no',val('wReq'));
  if(!r){ toast('Select a requisition first.','wa'); return; }
  WO_LINES = r.lines.map(function(l){
    return {k:uid('WL'), mat:l.mat, qty:l.qty, rate:l.rate, taxPct:18};
  });
  paintWoLines(); woChain();
  toast(WO_LINES.length+' line(s) pulled from <b>'+esc(r.no)+'</b>.','ok');
}
function addWoLine(){
  var m = DB.materials.filter(function(x){ return x.status==='Active'; })[0] || DB.materials[0];
  WO_LINES.push({k:uid('WL'), mat:m.code, qty:1, rate:m.rate, taxPct:18});
  paintWoLines(); woChain();
}
function setWoLine(i,k,v){
  var l = WO_LINES[i];
  if(k!=='mat') v = Math.max(0, Number(v)||0);
  l[k]=v;
  if(k==='mat'){ var m = byId(DB.materials,'code',v); if(m) l.rate = m.rate; }
  paintWoLines(); woChain();
}
function rmWoLine(i){ WO_LINES.splice(i,1); paintWoLines(); woChain(); }
function woTotals(){
  var basic = sum(WO_LINES, function(l){ return l.qty*l.rate; });
  var tax = sum(WO_LINES, function(l){ return Math.round(l.qty*l.rate*l.taxPct/100); });
  return {basic:basic, tax:tax, total:basic+tax};
}
function paintWoLines(){
  var host = document.getElementById('woLines'); if(!host) return;
  if(!WO_LINES.length){
    host.innerHTML = '<div class="tbl-empty" style="border:1px dashed var(--line);border-radius:6px">'+
      '<div class="big">\u2295</div><div class="fw6">No order line yet</div>'+
      '<div class="muted" style="font-size:11.5px;margin-top:4px">Add a line, or pull the lines from the linked requisition.</div></div>';
    woCalc(); return;
  }
  var t = woTotals();
  host.innerHTML = '<div class="twrap" style="max-height:320px"><table class="tbl"><thead><tr>'+
    ['Material','Description','Qty','UOM','Rate','Basic Value','Tax %','Tax Amount','Line Total','']
    .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
    WO_LINES.map(function(l,i){
      var basic = l.qty*l.rate, tax = Math.round(basic*l.taxPct/100);
      return '<tr><td><select class="inp" style="min-width:180px" onchange="setWoLine('+i+',\'mat\',this.value)">'+
        DB.materials.map(function(m){ return '<option value="'+m.code+'"'+(m.code===l.mat?' selected':'')+'>'+esc(m.code)+'</option>'; }).join('')+
        '</select></td>'+
        '<td style="max-width:210px;font-size:11.5px" class="muted">'+esc(mname(l.mat))+'</td>'+
        '<td><input type="number" class="inp num" style="width:82px" min="1" value="'+l.qty+'" onchange="setWoLine('+i+',\'qty\',this.value)"></td>'+
        '<td style="width:70px">'+esc(muom(l.mat))+'</td>'+
        '<td><input type="number" class="inp num" style="width:104px" min="0" value="'+l.rate+'" onchange="setWoLine('+i+',\'rate\',this.value)"></td>'+
        '<td class="num">'+inr(basic)+'</td>'+
        '<td><input type="number" class="inp num" style="width:64px" min="0" value="'+l.taxPct+'" onchange="setWoLine('+i+',\'taxPct\',this.value)"></td>'+
        '<td class="num">'+inr(tax)+'</td><td class="num fw6">'+inr(basic+tax)+'</td>'+
        '<td class="acts"><button class="btn xs dgr" onclick="rmWoLine('+i+')">Remove</button></td></tr>';
    }).join('')+
    '</tbody><tfoot><tr><td colspan="5">Basic value</td><td class="num">'+inr(t.basic)+
    '</td><td>Tax</td><td class="num">'+inr(t.tax)+'</td><td class="num">'+inr(t.total)+'</td><td></td></tr></tfoot></table></div>';
  woCalc();
}
function woCalc(){
  var t = woTotals();
  setVal('wPgAmt', Math.round(t.total * (nval('wPgPct')||0) / 100));
}
function woChain(){
  var host = document.getElementById('wChain'); if(!host) return;
  var v = woTotals().total;
  var chain = [['Procurement Officer','Raises the order']];
  if(v > 2500000) chain.push(['Head of Department','Above \u20B9 25,00,000']);
  if(v > 50000000) chain.push(['Administrative Secretary','Above \u20B9 5,00,00,000']);
  chain.push(['Finance Wing','Funds commitment']);
  host.innerHTML = '<div class="note '+(v?'ok':'in')+'" style="margin-bottom:10px">Order value <b>'+inr(v)+
    '</b> \u2014 '+chain.length+' approval level(s) under the delegation of financial powers.</div>'+
    '<ul style="list-style:none;margin:0;padding:0">'+chain.map(function(c,i){
      return '<li class="rag"><span class="s" style="background:'+(i===0?'#15803D':'#1E5A96')+'">'+(i+1)+'</span>'+
      '<span class="grow"><b>'+esc(c[0])+'</b><div class="muted" style="font-size:10.5px">'+esc(c[1])+'</div></span></li>';
    }).join('')+'</ul>';
}
function woBudgetCheck(){
  var out = document.getElementById('wBudgetOut'); if(!out) return;
  var coa = val('wCoa'), v = woTotals().total;
  if(!coa){ out.innerHTML = '<div class="note wa">Select a budget head first.</div>'; return; }
  if(v<=0){ out.innerHTML = '<div class="note wa">Add order lines before checking the budget.</div>'; return; }
  out.innerHTML = '<div class="note in"><span class="spin"></span> Committing funds against the budget head&hellip;</div>';
  setTimeout(function(){
    var avail = Math.round(v * 1.8);
    setVal('wAvail', avail);
    out.innerHTML = '<div class="grid g4" style="margin-bottom:10px">'+
      [['Budget head', esc(coa)],['Available', inr(avail)],['Order value', inr(v)],['Balance after commitment', inr(avail-v)]]
      .map(function(x){ return '<div class="scard"><div class="l">'+x[0]+'</div><div class="v" style="font-size:13px">'+x[1]+'</div></div>'; }).join('')+
      '</div><div class="note ok"><b>Funds committed.</b> A commitment entry is posted to the budget module against this order.</div>';
    toast('Budget check passed and funds committed.','ok');
  }, 700);
}
async function saveWo(status){
  if(!requireOk('woForm')) return;
  if(!WO_LINES.length){ toast('Add at least one order line.','er'); switchTab('cw',2); return; }
  var t = woTotals();
  if(status!=='Draft' && !Number(val('wAvail'))){
    toast('Run the budget check and commit funds before submitting.','er'); switchTab('cw',5); return;
  }
  var vendorObj = byId(DB.vendors,'party_code', val('wVendor'));
  var storeObj = byId(DB.stores,'store_name', val('wStore'));
  if(!vendorObj){ toast('Select a valid vendor before saving.','er'); switchTab('cw',1); return; }
  if(!storeObj){ toast('Select a valid delivery store before saving.','er'); switchTab('cw',1); return; }
  var payloadLines = [];
  for(var i=0;i<WO_LINES.length;i++){
    var l = WO_LINES[i];
    var matObj = byId(DB.materials,'code', l.mat);
    if(!matObj){ toast('Could not resolve material "'+esc(l.mat)+'" against the master data.','er'); switchTab('cw',2); return; }
    payloadLines.push({item_id: matObj.id, order_qty: l.qty, unit_rate: l.rate, tax_percent: l.taxPct});
  }
  var rec = {
    id: uid('W'), no: val('wNo'), date: val('wDate'), vendor: val('wVendor'),
    tender: val('wTender')||'\u2014', req: val('wReq'), dept: val('wDept'), mode: val('wMode'),
    lines: WO_LINES.map(function(l){
      return {mat:l.mat, qty:l.qty, rate:l.rate, taxPct:l.taxPct,
              amount:l.qty*l.rate, tax:Math.round(l.qty*l.rate*l.taxPct/100)};
    }),
    basic:t.basic, tax:t.tax, other:0, value:t.total,
    due: val('wDue'), status: status, delivered: 0, deliveredValue: 0,
    store: val('wStore'), inspection: val('wInsp'), warranty: nval('wWarr'),
    paymentTerms: val('wPay'), ld: val('wLd'), pg: nval('wPgAmt'),
    budgetOk: !!Number(val('wAvail')), amendments: 0,
    attachments: attList('wAtt'), terms: val('wTerms')
  };
  var payload = {party_id: vendorObj.id, store_id: storeObj.id, delivery_due_date: val('wDue'), payment_terms: val('wPay'), lines: payloadLines};
  try {
    var res = await fetch(API_BASE+'/work-orders/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the work order ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.wo_no || rec.no;
    DB.workorders.unshift(rec);
    DB.deliveries.unshift({
      id: uid('D'), wo: rec.no, vendor: rec.vendor, mat: rec.lines[0].mat,
      ordered: sum(rec.lines,'qty'), delivered:0, pending: sum(rec.lines,'qty'),
      dispatch:'', expected: rec.due, actual:'', delay:0, challan:'', transporter:'',
      status:'Not Dispatched', store: rec.store
    });
    if(rec.pg>0){
      var pgInstrNo = 'PBG/'+pad(88500+DB.pgs.length*23,7);
      var pgExpiry = addDays(rec.due, 420);
      try {
        var pgRes = await fetch(API_BASE+'/procurement/securities', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
          sec_type: 'PBG', wo_id: created.id, party_id: vendorObj.id, instrument_type: 'Bank Guarantee',
          instrument_no: pgInstrNo, instrument_date: rec.date, expiry_date: pgExpiry, amount: rec.pg, issuing_bank: 'State Bank of India'
        })});
        if(pgRes.ok){
          var pgCreated = await pgRes.json();
          DB.pgs.push({id:pgCreated.id, wo:rec.no, contract:val('wContract'), vendor:rec.vendor, amount:rec.pg,
            pctv:nval('wPgPct'), instrType:'Bank Guarantee', instrNo:pgInstrNo,
            bank:'State Bank of India', issue:rec.date, expiry: pgExpiry,
            claim:'6 months beyond warranty', verify:'Under Verification',
            release: addDays(rec.due, 380), status:'Received'});
        } else {
          toast('Work order saved, but the performance guarantee could not be registered in PostgreSQL.','wa');
        }
      } catch(err) {
        toast('Work order saved, but the performance guarantee could not reach the backend API.','wa');
      }
    }
    var r = byId(DB.requisitions,'no',rec.req);
    if(r && r.status==='Approved'){ r.status = 'Procurement Initiated'; }
    logAudit('Work Order', rec.no, status==='Draft'?'Draft Saved':'Created','Status','\u2014',status,'Order raised on '+vname(rec.vendor));
    if(status!=='Draft') notify('in','Work order '+rec.no+' created','Issued to '+vname(rec.vendor)+' for '+inr(rec.value),'wo/list');
    save();
    toast((status==='Draft'? 'Saved <b>'+esc(rec.no)+'</b> as a draft' : 'Created <b>'+esc(rec.no)+'</b> for '+inr(rec.value))+' in PostgreSQL (id '+created.id+').','ok');
    goto('wo/list');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}

/* ---------- work order register ---------- */
SCREENS['wo/list'] = function(){
  var rows = DB.workorders;
  return pageHead('Work Order Register','Work Order / Purchase Order',
    'All supply, work and service orders with delivery and billing position',
    '<button class="btn gh sm" onclick="tblExport(\'tWo\',\'Work_Order_Register\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="goto(\'wo/create\')">+ Create work order</button>',
    reqTags('MMP_7','MMP_8'))+
  summaryRow([
    {l:'Work orders', v:rows.length, c:'#1E5A96'},
    {l:'Open orders', v:rows.filter(function(w){ return ['Issued','Approved','Delayed'].indexOf(w.status)>=0; }).length, c:'#B45309'},
    {l:'Order value', v:inr0(sum(rows,'value')), c:'#0F766E'},
    {l:'Delivered value', v:inr0(sum(rows,'deliveredValue')), c:'#15803D'}
  ])+
  filterBar([
    fld({id:'fwNo', label:'Work order number', ph:'WO/'}),
    fld({id:'fwVendor', label:'Vendor', type:'select', opts:DB.vendors.map(function(v){ return {v:v.party_code,l:v.party_name}; }), blank:'All'}),
    fld({id:'fwDept', label:'Department', type:'select', opts:DEPTS, blank:'All'}),
    fld({id:'fwStatus', label:'Status', type:'select', opts:['Draft','Approved','Issued','Delivered','Delayed','Closed','Cancelled'], blank:'All'}),
    fld({id:'fwFrom', label:'From date', type:'date'}),
    fld({id:'fwTo', label:'To date', type:'date'})
  ], 'applyWoFilter()',
    '<button class="btn sm" onclick="resetWoFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tWo', rows:rows, cols:[
    {h:'Work Order No.', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewWo(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Requisition', k:'req', cls:'mono'},
    {h:'Tender', k:'tender', cls:'mono'},
    {h:'Mode', k:'mode'},
    {h:'Order Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
    {h:'Delivery Due', k:'due', f:function(r){
      var late = r.status!=='Delivered' && daysBetween(r.due,TODAY)>0;
      return '<span style="'+(late?'color:#B91C1C;font-weight:700':'')+'">'+fdate(r.due)+'</span>'; }},
    {h:'Delivered %', k:'dp', cls:'num', f:function(r){
      var p = pct(r.delivered, sum(r.lines,'qty'));
      return '<span class="'+(p>=100?'fw7':'')+'">'+p.toFixed(0)+'%</span>'; },
      sv:function(r){ return pct(r.delivered, sum(r.lines,'qty')); }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Amendments', k:'amendments', cls:'num'},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('View','viewWo(\''+r.id+'\')')+
      (r.status==='Draft'? actIcon('Approve','approveWo(\''+r.id+'\')','ok'):'')+
      (r.status==='Approved'? actIcon('Issue','issueWo(\''+r.id+'\')','sec'):'')+
      actIcon('Amend','amendWo(\''+r.id+'\')','warn')+
      (['Delivered','Closed','Cancelled'].indexOf(r.status)<0? actIcon('Cancel','cancelWo(\''+r.id+'\')','dgr'):'')+
      actIcon('Print','printWo(\''+r.id+'\')','gh'); }}
  ]})+'</div></div>';
};
function applyWoFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.workorders.filter(function(w){
    return (!f('fwNo') || w.no.toLowerCase().indexOf(f('fwNo').toLowerCase())>=0) &&
      (!f('fwVendor') || w.vendor===f('fwVendor')) &&
      (!f('fwDept') || w.dept===f('fwDept')) &&
      (!f('fwStatus') || w.status===f('fwStatus')) &&
      (!f('fwFrom') || w.date>=f('fwFrom')) &&
      (!f('fwTo') || w.date<=f('fwTo'));
  });
  tblReload('tWo', rows);
  toast(rows.length+' work order(s) matched.', rows.length?'ok':'wa');
}
function resetWoFilter(){
  ['fwNo','fwVendor','fwDept','fwStatus','fwFrom','fwTo'].forEach(function(i){ setVal(i,''); });
  tblReload('tWo', DB.workorders); toast('Filters cleared.','in');
}
function viewWo(id){
  var w = byId(DB.workorders,'id',id);
  var d = DB.deliveries.filter(function(x){ return x.wo===w.no; });
  var g = DB.grns.filter(function(x){ return x.wo===w.no; });
  var inv = DB.invoices.filter(function(x){ return x.wo===w.no; });
  var am = DB.amendments.filter(function(x){ return x.wo===w.no; });
  modal({title:'Work Order '+esc(w.no), size:'lg',
    body: tabsHtml('vw',['Order details','Line items','Delivery','Receipts','Billing','Amendments','Audit'])+
      pane('vw',0,'<div class="grid g2"><table class="kv">'+
        kvRow('Work order number','<span class="mono">'+esc(w.no)+'</span>')+kvRow('Date', fdate(w.date))+
        kvRow('Vendor', esc(vname(w.vendor)))+kvRow('Department', esc(w.dept))+
        kvRow('Requisition','<span class="mono">'+esc(w.req)+'</span>')+
        kvRow('Tender','<span class="mono">'+esc(w.tender)+'</span>')+
        kvRow('Procurement mode', esc(w.mode))+'</table>'+
        '<table class="kv">'+kvRow('Basic value', inr(w.basic))+kvRow('Tax', inr(w.tax))+
        kvRow('Order value','<b>'+inr(w.value)+'</b>')+kvRow('Delivery due', fdate(w.due))+
        kvRow('Consignee store', esc(w.store))+kvRow('Warranty', w.warranty+' months')+
        kvRow('Status', badge(w.status))+'</table></div>'+
        '<div class="sec-h" style="margin-top:11px">Terms and conditions</div>'+
        '<table class="kv">'+kvRow('Payment terms', esc(w.paymentTerms))+
        kvRow('Liquidated damages', esc(w.ld))+
        kvRow('Performance guarantee', w.pg? inr(w.pg):'Not applicable')+
        kvRow('Inspection', esc(w.inspection))+'</table>'+
        '<div style="font-size:12.5px;margin-top:9px">'+esc(w.terms||'')+'</div>')+
      pane('vw',1,'<div class="twrap"><table class="tbl"><thead><tr>'+
        ['Material','Description','Qty','UOM','Rate','Basic','Tax','Line Total']
        .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
        w.lines.map(function(l){
          return '<tr><td class="mono">'+esc(l.mat)+'</td><td>'+esc(mname(l.mat))+'</td>'+
          '<td class="num">'+num(l.qty)+'</td><td>'+esc(muom(l.mat))+'</td>'+
          '<td class="num">'+inr(l.rate)+'</td><td class="num">'+inr(l.amount)+'</td>'+
          '<td class="num">'+inr(l.tax)+'</td><td class="num fw6">'+inr(l.amount+l.tax)+'</td></tr>';
        }).join('')+'</tbody><tfoot><tr><td colspan="7">Order value</td><td class="num">'+inr(w.value)+'</td></tr></tfoot></table></div>')+
      pane('vw',2, d.length? '<table class="kv">'+
        kvRow('Ordered quantity', num(d[0].ordered))+kvRow('Delivered quantity', num(d[0].delivered))+
        kvRow('Pending quantity', num(d[0].pending))+kvRow('Expected date', fdate(d[0].expected))+
        kvRow('Actual date', d[0].actual? fdate(d[0].actual):'Not delivered')+
        kvRow('Delay', d[0].delay>0? '<b style="color:#B91C1C">'+d[0].delay+' days</b>':'Nil')+
        kvRow('Challan', esc(d[0].challan||'\u2014'))+kvRow('Status', badge(d[0].status))+'</table>'
        : '<div class="note in">No delivery record yet.</div>')+
      pane('vw',3, g.length? '<div class="twrap"><table class="tbl"><thead><tr>'+
        ['GRN Number','Date','Received','Accepted','Rejected','Inspection','Posting'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
        '</tr></thead><tbody>'+g.map(function(x){
          return '<tr><td class="mono">'+esc(x.no)+'</td><td>'+fdate(x.date)+'</td>'+
          '<td class="num">'+num(x.received)+'</td><td class="num">'+num(x.accepted)+'</td>'+
          '<td class="num">'+num(x.rejected)+'</td><td>'+badge(x.inspection)+'</td><td>'+badge(x.posting)+'</td></tr>';
        }).join('')+'</tbody></table></div>' : '<div class="note in">No goods receipt recorded against this order.</div>')+
      pane('vw',4, inv.length? '<div class="twrap"><table class="tbl"><thead><tr>'+
        ['Invoice','Vendor Invoice','Amount','Match Status','Finance','Payment'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
        '</tr></thead><tbody>'+inv.map(function(x){
          return '<tr><td class="mono">'+esc(x.no)+'</td><td class="mono">'+esc(x.vinv)+'</td>'+
          '<td class="num">'+inr(x.amount)+'</td><td>'+badge(x.status)+'</td>'+
          '<td>'+badge(x.finance)+'</td><td>'+badge(x.payment)+'</td></tr>';
        }).join('')+'</tbody></table></div>' : '<div class="note in">No invoice received against this order.</div>')+
      pane('vw',5, am.length? '<div class="twrap"><table class="tbl"><thead><tr>'+
        ['Amendment','Date','Type','Field','Old Value','New Value','Authority','Status'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
        '</tr></thead><tbody>'+am.map(function(x){
          return '<tr><td class="mono">'+esc(x.no)+'</td><td>'+fdate(x.date)+'</td><td>'+esc(x.type)+'</td>'+
          '<td>'+esc(x.field)+'</td><td>'+esc(x.oldv)+'</td><td>'+esc(x.newv)+'</td>'+
          '<td>'+esc(x.authority)+'</td><td>'+badge(x.status)+'</td></tr>';
        }).join('')+'</tbody></table></div>' : '<div class="note in">No amendment issued against this order.</div>')+
      pane('vw',6, auditTableHtml(DB.trail.filter(function(t){ return t.ref===w.no; }))),
    footer:'<button class="btn gh" onclick="printWo(\''+w.id+'\')">Print order</button>'+
      (w.status==='Approved'? '<button class="btn sec" onclick="issueWo(\''+w.id+'\')">Issue to vendor</button>':'')+
      '<button class="btn" data-close>Close</button>'});
}
function approveWo(id){
  var w = byId(DB.workorders,'id',id);
  if(!w.budgetOk){ toast('Funds are not committed for <b>'+esc(w.no)+'</b>. Run the budget check first.','er'); return; }
  confirmAct({title:'Approve work order', ok:'Approve', btnClass:'ok', reason:true,
    message:'<b>'+esc(w.no)+'</b> worth '+inr(w.value)+' is approved by the competent authority.',
    detail: kvRow('Vendor', esc(vname(w.vendor)))+kvRow('Order value', inr(w.value))+kvRow('Delivery due', fdate(w.due))},
    function(reason){
      var o=w.status; w.status='Approved';
      logAudit('Work Order', w.no,'Approved','Status',o,'Approved',reason);
      closeAllModals(); tblReload('tWo', DB.workorders);
      commit('Approved <b>'+esc(w.no)+'</b>.','ok');
    });
}
function issueWo(id){
  var w = byId(DB.workorders,'id',id);
  confirmAct({title:'Issue work order to vendor', ok:'Issue order', btnClass:'sec', reason:true,
    message:'The order is issued to <b>'+esc(vname(w.vendor))+'</b> and the delivery clock starts.'},
    function(reason){
      var o=w.status; w.status='Issued';
      var d = DB.deliveries.filter(function(x){ return x.wo===w.no; })[0];
      if(d) d.status = 'Not Dispatched';
      logAudit('Work Order', w.no,'Issued','Status',o,'Issued',reason);
      notify('in','Work order '+w.no+' issued','Delivery due by '+fdate(w.due),'wo/delivery');
      closeAllModals(); tblReload('tWo', DB.workorders);
      commit('Issued <b>'+esc(w.no)+'</b> to the vendor.','ok');
    });
}
function cancelWo(id){
  var w = byId(DB.workorders,'id',id);
  var recd = DB.grns.filter(function(g){ return g.wo===w.no; });
  confirmAct({title:'Cancel work order', kind:'er', btnClass:'dgr', ok:'Cancel order', reason:true,
    message: recd.length
      ? '<b>Careful.</b> '+recd.length+' goods receipt(s) already exist against this order. Cancelling leaves those receipts without a live order.'
      : 'The order is cancelled and the committed funds released back to the budget head.'},
    function(reason){
      var o=w.status; w.status='Cancelled';
      logAudit('Work Order', w.no,'Cancelled','Status',o,'Cancelled',reason);
      closeAllModals(); tblReload('tWo', DB.workorders);
      commit('Cancelled <b>'+esc(w.no)+'</b>. Funds released.','er');
    });
}
function amendWo(id){
  var w = byId(DB.workorders,'id',id);
  modal({title:'Amend work order '+esc(w.no), size:'md',
    body:'<div id="amForm"><div class="fgrid g2">'+
      fld({id:'amType', label:'Amendment type', type:'select', req:true, blank:false,
           opts:['Delivery Extension','Quantity Revision','Rate Revision','Specification Change','Consignee Change','Cancellation of Line']})+
      fld({id:'amDate', label:'Amendment date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'amOld', label:'Existing value', val: fdate(w.due), req:true})+
      fld({id:'amNew', label:'Revised value', req:true, ph:'New date, quantity or rate'})+
      fld({id:'amAuth', label:'Approving authority', type:'select', blank:false,
           opts:['Procurement Officer','Head of Office','Head of Department','Administrative Secretary']})+
      fld({id:'amLd', label:'Liquidated damages', type:'select', opts:['Levied','Waived','Not applicable'], val:'Not applicable', blank:false})+
    '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'amReason', label:'Justification', type:'textarea', rows:3, req:true,
           ph:'Reason for the amendment, recorded in the audit trail'})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveAmendment(\''+id+'\')">Issue amendment</button>'});
}
function amToISODate(s){
  if(!s) return undefined;
  s = String(s).trim();
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  var m = s.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if(m) return m[3]+'-'+m[2]+'-'+m[1];
  var d = new Date(s);
  if(!isNaN(d)) return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return undefined;
}
function amToNumber(s){
  if(s===undefined || s===null || s==='') return undefined;
  var n = Number(String(s).replace(/,/g,''));
  return isNaN(n) ? undefined : n;
}
async function saveAmendment(id){
  if(!requireOk('amForm')) return;
  var w = byId(DB.workorders,'id',id);
  var type = val('amType');
  var isDelivery = type==='Delivery Extension';
  var newDeliveryDate = isDelivery ? amToISODate(val('amNew')) : undefined;
  if(isDelivery && !newDeliveryDate){ toast('Enter the revised delivery date as DD-MM-YYYY.','er'); return; }
  var payload = {amend_type: type,
    old_value: isDelivery ? undefined : amToNumber(val('amOld')),
    new_value: isDelivery ? undefined : amToNumber(val('amNew')),
    reason: val('amReason'), new_delivery_date: newDeliveryDate};
  try {
    var res = await fetch(API_BASE+'/work-orders/'+w.id+'/amendments', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the amendment ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    var no = created.amend_no || ('AMD/2026/'+pad(10+DB.amendments.length,4));
    DB.amendments.push({id:uid('AM'), no:no, wo:w.no, date:val('amDate'), type:type,
      field: type==='Delivery Extension'? 'Delivery Due Date' : type,
      oldv: val('amOld'), newv: val('amNew'), value:0, reason: val('amReason'),
      authority: val('amAuth'), status:'Approved'});
    if(type==='Delivery Extension'){
      var old = w.due; w.due = val('amNew');
      var d = DB.deliveries.filter(function(x){ return x.wo===w.no; })[0];
      if(d){ d.expected = w.due; if(d.status==='Delayed') d.status='Not Dispatched'; d.delay = 0; }
      logAudit('Work Order', w.no,'Amended','Delivery Due Date', fdate(old), fdate(w.due), val('amReason'));
    } else {
      logAudit('Work Order', w.no,'Amended', type, val('amOld'), val('amNew'), val('amReason'));
    }
    w.amendments = (w.amendments||0)+1;
    if(w.status!=='Draft') w.status = 'Amended';
    closeModal(); save();
    if(TBL.tWo) tblReload('tWo', DB.workorders);
    toast('Issued amendment <b>'+esc(no)+'</b> against '+esc(w.no)+' in PostgreSQL.','ok');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function printWo(id){
  var w = byId(DB.workorders,'id',id);
  modal({title:'Work order '+esc(w.no)+' \u2014 print preview', size:'lg',
    body:'<div style="border:1px solid var(--line);padding:18px;border-radius:6px">'+
      '<div style="text-align:center;border-bottom:2px solid var(--navy-2);padding-bottom:10px;margin-bottom:12px">'+
      '<div class="fw7" style="font-size:15px;color:var(--navy-2)">GOVERNMENT OF NCT OF DELHI</div>'+
      '<div style="font-size:12.5px">'+esc(w.dept)+'</div>'+
      '<div class="fw6" style="font-size:13px;margin-top:6px">SUPPLY / WORK ORDER</div></div>'+
      '<div class="grid g2"><table class="kv">'+
      kvRow('Order number', esc(w.no))+kvRow('Order date', fdate(w.date))+
      kvRow('Requisition', esc(w.req))+kvRow('Tender reference', esc(w.tender))+'</table>'+
      '<table class="kv">'+kvRow('Vendor', esc(vname(w.vendor)))+
      kvRow('Consignee', esc(w.store))+kvRow('Delivery due', fdate(w.due))+
      kvRow('Mode', esc(w.mode))+'</table></div>'+
      '<table class="tbl" style="margin-top:12px"><thead><tr><th>Sl</th><th>Material</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>'+
      w.lines.map(function(l,i){
        return '<tr><td class="num">'+(i+1)+'</td><td>'+esc(mname(l.mat))+'</td>'+
        '<td class="num">'+num(l.qty)+' '+esc(muom(l.mat))+'</td><td class="num">'+inr(l.rate)+'</td>'+
        '<td class="num">'+inr(l.amount+l.tax)+'</td></tr>';
      }).join('')+'</tbody><tfoot><tr><td colspan="4">Total order value</td><td class="num">'+inr(w.value)+'</td></tr></tfoot></table>'+
      '<div style="margin-top:12px;font-size:12px"><b>Terms:</b> '+esc(w.paymentTerms)+'. '+esc(w.ld)+'. Warranty '+w.warranty+' months.</div>'+
      '<div style="margin-top:26px;text-align:right;font-size:12.5px"><b>Anil Katwale</b><br>Procurement Officer</div>'+
    '</div>',
    footer:'<button class="btn gh" onclick="window.print()">Print</button><button class="btn" data-close>Close</button>'});
}

/* ---------- amendments register ---------- */
SCREENS['wo/amend'] = function(){
  return pageHead('Amendments','Work Order / Purchase Order',
    'Amendments issued against work orders with justification and approving authority',
    '<button class="btn gh sm" onclick="tblExport(\'tAmd\',\'Work_Order_Amendments\')">\u2913 Export</button>',
    reqTags('MMP_8'))+
  summaryRow([
    {l:'Amendments', v:DB.amendments.length, c:'#1E5A96'},
    {l:'Delivery extensions', v:DB.amendments.filter(function(a){ return a.type==='Delivery Extension'; }).length, c:'#B45309'},
    {l:'Orders amended', v:uniq(DB.amendments.map(function(a){ return a.wo; })).length, c:'#0F766E'},
    {l:'Approved', v:DB.amendments.filter(function(a){ return a.status==='Approved'; }).length, c:'#15803D'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tAmd', rows:DB.amendments, cols:[
    {h:'Amendment No.', k:'no', cls:'mono'},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Amendment Type', k:'type'},
    {h:'Field Changed', k:'field'},
    {h:'Old Value', k:'oldv'},
    {h:'New Value', k:'newv'},
    {h:'Justification', k:'reason'},
    {h:'Approving Authority', k:'authority'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ], empty:'No amendment issued yet'})+'</div></div>';
};

/* ---------- delivery tracking ---------- */
SCREENS['wo/delivery'] = function(){
  var rows = DB.deliveries;
  var late = rows.filter(function(d){ return d.status==='Delayed' || (d.status!=='Delivered' && daysBetween(d.expected,TODAY)>0); });
  return pageHead('Delivery Tracking','Work Order / Purchase Order',
    'Delivery schedule, dispatch details and delay monitoring against open orders',
    '<button class="btn warn sm" onclick="raiseDelayAlerts()">\u26A0 Raise delay alerts</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tDel\',\'Delivery_Tracking\')">\u2913 Export</button>',
    reqTags('MMP_9'))+
  summaryRow([
    {l:'Open deliveries', v:rows.filter(function(d){ return d.status!=='Delivered'; }).length, c:'#1E5A96'},
    {l:'Delivered in full', v:rows.filter(function(d){ return d.status==='Delivered'; }).length, c:'#15803D'},
    {l:'Partially delivered', v:rows.filter(function(d){ return d.status==='Partially Delivered'; }).length, c:'#B45309'},
    {l:'Behind schedule', v:late.length, c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tDel', rows:rows, cols:[
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Ordered', k:'ordered', cls:'num', f:function(r){ return num(r.ordered); }},
    {h:'Delivered', k:'delivered', cls:'num', f:function(r){ return num(r.delivered); }},
    {h:'Pending', k:'pending', cls:'num', f:function(r){ return num(r.pending); }},
    {h:'Dispatch Date', k:'dispatch', f:function(r){ return r.dispatch? fdate(r.dispatch):'\u2014'; }},
    {h:'Expected Date', k:'expected', f:function(r){ return fdate(r.expected); }},
    {h:'Actual Date', k:'actual', f:function(r){ return r.actual? fdate(r.actual):'\u2014'; }},
    {h:'Delay (days)', k:'delay', cls:'num', f:function(r){
      var d = r.status==='Delivered' ? 0 : Math.max(0, daysBetween(r.expected,TODAY));
      return d? '<b style="color:#B91C1C">'+d+'</b>':'\u2014'; },
      sv:function(r){ return r.status==='Delivered'?0:Math.max(0, daysBetween(r.expected,TODAY)); }},
    {h:'Challan', k:'challan', cls:'mono'},
    {h:'Transporter', k:'transporter'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Record dispatch','recordDispatch(\''+r.id+'\')','sec')+
      (r.status!=='Delivered'? actIcon('Delay alert','delayAlert(\''+r.id+'\')','warn'):'')+
      actIcon('Create GRN','grnFromDelivery(\''+r.id+'\')','ok'); }}
  ], empty:'No delivery is being tracked'})+'</div></div>';
};
function recordDispatch(id){
  var d = byId(DB.deliveries,'id',id);
  modal({title:'Record dispatch \u2014 '+esc(d.wo), size:'md',
    body:'<div id="dsForm"><table class="kv" style="margin-bottom:11px">'+
      kvRow('Work order','<span class="mono">'+esc(d.wo)+'</span>')+
      kvRow('Vendor', esc(vname(d.vendor)))+
      kvRow('Ordered / delivered', num(d.ordered)+' / '+num(d.delivered))+'</table>'+
      '<div class="fgrid g2">'+
      fld({id:'dsQty', label:'Quantity dispatched', type:'number', val:d.pending, num:true, req:true, min:1})+
      fld({id:'dsDate', label:'Dispatch date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'dsChallan', label:'Challan number', val:'CH/'+d.vendor.slice(-4)+'/'+pad(2300+DB.deliveries.length*7,5), req:true})+
      fld({id:'dsTrans', label:'Transporter', type:'select', blank:false,
           opts:['Delhi Cargo Movers','Safe Express','Vendor own transport','Courier']})+
      '</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveDispatch(\''+id+'\')">Record dispatch</button>'});
}
function saveDispatch(id){
  if(!requireOk('dsForm')) return;
  var d = byId(DB.deliveries,'id',id);
  var q = nval('dsQty');
  if(q > d.pending){ toast('Dispatch quantity cannot exceed the pending quantity of '+num(d.pending)+'.','er'); return; }
  var old = d.status;
  d.delivered += q; d.pending -= q;
  d.dispatch = val('dsDate'); d.challan = val('dsChallan'); d.transporter = val('dsTrans');
  d.status = d.pending===0 ? 'Delivered' : 'Partially Delivered';
  if(d.pending===0) d.actual = val('dsDate');
  var w = byId(DB.workorders,'no',d.wo);
  if(w){
    w.delivered = d.delivered;
    w.deliveredValue = Math.round(d.delivered * w.lines[0].rate * 1.18);
    if(d.pending===0 && w.status!=='Closed') w.status = 'Delivered';
  }
  logAudit('Delivery', d.wo,'Dispatch Recorded','Status',old,d.status, num(q)+' units dispatched under challan '+d.challan);
  closeModal(); save(); tblReload('tDel', DB.deliveries);
  toast('Recorded dispatch of <b>'+num(q)+'</b> units against '+esc(d.wo)+'.','ok');
}
function delayAlert(id){
  var d = byId(DB.deliveries,'id',id);
  var days = Math.max(0, daysBetween(d.expected, TODAY));
  var w = byId(DB.workorders,'no',d.wo) || {value:0};
  var ld = Math.min(Math.round(w.value*0.10), Math.round(w.value*0.005*Math.ceil(days/7)));
  confirmAct({title:'Raise delay alert', kind:'wa', btnClass:'warn', ok:'Send alert', reason:true,
    message:'A delay alert is sent to <b>'+esc(vname(d.vendor))+'</b> and the liquidated damages exposure is recorded.',
    detail: kvRow('Work order', esc(d.wo))+kvRow('Expected delivery', fdate(d.expected))+
            kvRow('Days behind schedule','<b style="color:#B91C1C">'+days+'</b>')+
            kvRow('Indicative LD at 0.5% per week', inr(ld))},
    function(reason){
      d.status = 'Delayed'; d.delay = days;
      var wo = byId(DB.workorders,'no',d.wo);
      if(wo && ['Delivered','Closed','Cancelled'].indexOf(wo.status)<0) wo.status = 'Delayed';
      logAudit('Delivery', d.wo,'Delay Alert Raised','Status','Pending','Delayed',reason);
      notify('wa','Delivery delayed \u2014 '+d.wo, days+' days behind schedule for '+vname(d.vendor),'wo/delivery');
      tblReload('tDel', DB.deliveries);
      commit('Delay alert sent for <b>'+esc(d.wo)+'</b>.','wa');
    });
}
function raiseDelayAlerts(){
  var late = DB.deliveries.filter(function(d){ return d.status!=='Delivered' && daysBetween(d.expected,TODAY)>0; });
  if(!late.length){ toast('No delivery is behind schedule.','ok'); return; }
  confirmAct({title:'Raise delay alerts', kind:'wa', btnClass:'warn', ok:'Send '+late.length+' alert(s)', reason:true,
    message:'<b>'+late.length+'</b> delivery(ies) are past the due date. An alert goes to each vendor.'},
    function(reason){
      late.forEach(function(d){
        d.status='Delayed'; d.delay = daysBetween(d.expected,TODAY);
        logAudit('Delivery', d.wo,'Delay Alert Raised','Status','Open','Delayed',reason);
      });
      tblReload('tDel', DB.deliveries);
      commit('Sent '+late.length+' delay alert(s).','wa');
    });
}
function grnFromDelivery(id){
  var d = byId(DB.deliveries,'id',id);
  if(!d.delivered){ toast('Nothing has been dispatched against this order yet.','wa'); return; }
  goto('grn/list');
  setTimeout(function(){ grnEntry(d.wo); }, 80);
}

/* ============================ RECEIPT AND INSPECTION ============================ */
SCREENS['grn/list'] = function(){
  var rows = DB.grns;
  return pageHead('Goods Receipt Note','Receipt and Inspection',
    'Receipt of material against work orders with quantity reconciliation and inventory posting',
    '<button class="btn gh sm" onclick="tblExport(\'tGrn\',\'GRN_Register\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="grnEntry()">+ Record goods receipt</button>',
    reqTags('MMP_10','MMP_11'))+
  summaryRow([
    {l:'Goods receipts', v:rows.length, c:'#1E5A96'},
    {l:'Posted to inventory', v:rows.filter(function(g){ return g.posting==='Posted'; }).length, c:'#15803D'},
    {l:'Awaiting posting', v:rows.filter(function(g){ return g.posting==='Pending'; }).length, c:'#B45309'},
    {l:'Rejected quantity', v:num(sum(rows,'rejected')), c:'#B91C1C'}
  ])+
  filterBar([
    fld({id:'fgNo', label:'GRN number', ph:'GRN/'}),
    fld({id:'fgWo', label:'Work order', ph:'WO/'}),
    fld({id:'fgVendor', label:'Vendor', type:'select', opts:DB.vendors.map(function(v){ return {v:v.party_code,l:v.party_name}; }), blank:'All'}),
    fld({id:'fgStore', label:'Store', type:'select', opts:STORES, blank:'All'}),
    fld({id:'fgInsp', label:'Inspection', type:'select', opts:['Pending','Under Inspection','Accepted','Accepted with Deviation','Rejected'], blank:'All'}),
    fld({id:'fgPost', label:'Posting', type:'select', opts:['Pending','Posted'], blank:'All'})
  ], 'applyGrnFilter()',
    '<button class="btn sm" onclick="resetGrnFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tGrn', rows:rows, cols:[
    {h:'GRN Number', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewGrn(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
    {h:'GRN Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Received', k:'received', cls:'num', f:function(r){ return num(r.received); }},
    {h:'Accepted', k:'accepted', cls:'num', f:function(r){ return num(r.accepted); }},
    {h:'Rejected', k:'rejected', cls:'num', f:function(r){ return r.rejected? '<b style="color:#B91C1C">'+num(r.rejected)+'</b>':'0'; }},
    {h:'Damaged', k:'damaged', cls:'num', f:function(r){ return num(r.damaged); }},
    {h:'Challan', k:'challan', cls:'mono'},
    {h:'Store', k:'store'},
    {h:'Batch', k:'batch', cls:'mono'},
    {h:'Inspection', k:'inspection', f:function(r){ return badge(r.inspection); }},
    {h:'Posting', k:'posting', f:function(r){ return badge(r.posting); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('View','viewGrn(\''+r.id+'\')')+
      (r.inspection==='Pending'||r.inspection==='Under Inspection'? actIcon('Inspect','inspectGrn(\''+r.id+'\')','sec'):'')+
      (r.posting==='Pending' && r.accepted>0? actIcon('Post to inventory','postGrn(\''+r.id+'\')','ok'):'')+
      (r.rejected>0? actIcon('Return to vendor','rtvFromGrn(\''+r.id+'\')','warn'):''); }}
  ], empty:'No goods receipt recorded'})+'</div></div>';
};
function applyGrnFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.grns.filter(function(g){
    return (!f('fgNo') || g.no.toLowerCase().indexOf(f('fgNo').toLowerCase())>=0) &&
      (!f('fgWo') || g.wo.toLowerCase().indexOf(f('fgWo').toLowerCase())>=0) &&
      (!f('fgVendor') || g.vendor===f('fgVendor')) &&
      (!f('fgStore') || g.store===f('fgStore')) &&
      (!f('fgInsp') || g.inspection===f('fgInsp')) &&
      (!f('fgPost') || g.posting===f('fgPost'));
  });
  tblReload('tGrn', rows);
  toast(rows.length+' goods receipt(s) matched.', rows.length?'ok':'wa');
}
function resetGrnFilter(){
  ['fgNo','fgWo','fgVendor','fgStore','fgInsp','fgPost'].forEach(function(i){ setVal(i,''); });
  tblReload('tGrn', DB.grns); toast('Filters cleared.','in');
}
function grnEntry(woNo){
  var open = DB.workorders.filter(function(w){ return ['Issued','Delivered','Delayed','Amended'].indexOf(w.status)>=0; });
  modal({title:'Record goods receipt', size:'lg',
    body:'<div id="grForm"><div class="fgrid g4">'+
      fld({id:'grNo', label:'GRN number', val:'GRN/DIT/2026/'+pad(270+DB.grns.length*4,6), ro:true})+
      fld({id:'grDate', label:'GRN date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'grWo', label:'Work order', type:'select', req:true, val:woNo||'',
           opts:open.map(function(w){ return w.no; }), onchange:'grnWoInfo()'})+
      fld({id:'grStore', label:'Receiving store', type:'select', opts:STORES, req:true})+
      fld({id:'grChallan', label:'Vendor challan number', req:true, ph:'CH/'})+
      fld({id:'grChallanDt', label:'Challan date', type:'date', val: addDays(TODAY,-2), date:true})+
      fld({id:'grBin', label:'Bin / location', val:'Bin-A-01'})+
      fld({id:'grReceiver', label:'Received by', val:'Store Officer', req:true})+
      '</div><div id="grWoBox" style="margin-top:11px"></div>'+
      '<div class="sec-h" style="margin-top:13px">Quantity reconciliation</div>'+
      '<div class="fgrid g4">'+
      fld({id:'grRecd', label:'Quantity received', type:'number', val:0, num:true, req:true, onchange:'grnCalc()'})+
      fld({id:'grAcc', label:'Quantity accepted', type:'number', val:0, num:true, onchange:'grnCalc()'})+
      fld({id:'grRej', label:'Quantity rejected', type:'number', val:0, num:true, onchange:'grnCalc()'})+
      fld({id:'grDam', label:'Quantity damaged', type:'number', val:0, num:true, onchange:'grnCalc()'})+
      fld({id:'grShort', label:'Short supply', type:'number', val:0, num:true, ro:true})+
      fld({id:'grExcess', label:'Excess supply', type:'number', val:0, num:true, ro:true})+
      '</div><div id="grCalcOut" style="margin-top:10px"></div>'+
      '<div class="sec-h" style="margin-top:13px">Batch and traceability</div>'+
      '<div class="fgrid g4">'+
      fld({id:'grBatch', label:'Batch number', ph:'BATCH/2026/'})+
      fld({id:'grMfg', label:'Manufacturing date', type:'date', date:true})+
      fld({id:'grExp', label:'Expiry date', type:'date', date:true})+
      fld({id:'grSerial', label:'Serial numbers', ph:'Comma separated or range'})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'grRemarks', label:'Remarks', type:'textarea', rows:2})+'</div>'+
      '<div style="margin-top:11px">'+attachWidget('grAtt',[])+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveGrn()">Save goods receipt</button>',
    onMount: function(){ grnWoInfo(); }});
}
function grnWoInfo(){
  var box = document.getElementById('grWoBox'); if(!box) return;
  var w = byId(DB.workorders,'no',val('grWo'));
  if(!w || !w.lines || !w.lines.length){ box.innerHTML = '<div class="note in">Select a work order to load the ordered quantity and consignee.</div>'; return; }
  var already = sum(DB.grns.filter(function(g){ return g.wo===w.no; }),'received');
  var ordered = sum(w.lines,'qty');
  box.innerHTML = '<div class="grid g4">'+
    [['Vendor', esc(vname(w.vendor))],['Material', esc(w.lines[0].mat)],
     ['Ordered quantity', num(ordered)],['Already received', num(already)]]
    .map(function(x){ return '<div class="scard"><div class="l">'+x[0]+'</div><div class="v" style="font-size:13px">'+x[1]+'</div></div>'; }).join('')+
    '</div>'+
    (daysBetween(w.due,TODAY)>0 ? '<div class="note wa" style="margin-top:10px">This receipt is <b>'+
      daysBetween(w.due,TODAY)+' day(s)</b> past the delivery due date of '+fdate(w.due)+
      '. Liquidated damages may apply at billing.</div>':'');
  setVal('grStore', w.store);
  setVal('grRecd', Math.max(0, ordered - already));
  setVal('grAcc', Math.max(0, ordered - already));
  grnCalc();
}
function grnCalc(){
  var out = document.getElementById('grCalcOut'); if(!out) return;
  var w = byId(DB.workorders,'no',val('grWo'));
  var recd = nval('grRecd'), acc = nval('grAcc'), rej = nval('grRej'), dam = nval('grDam');
  var msgs = [];
  if(acc + rej > recd) msgs.push(['er','Accepted plus rejected quantity ('+num(acc+rej)+') exceeds the received quantity ('+num(recd)+').']);
  if(dam > recd) msgs.push(['er','Damaged quantity cannot exceed the received quantity.']);
  if(w && w.lines && w.lines.length){
    var ordered = sum(w.lines,'qty');
    var already = sum(DB.grns.filter(function(g){ return g.wo===w.no; }),'received');
    var bal = ordered - already;
    var short = Math.max(0, bal - recd), excess = Math.max(0, recd - bal);
    setVal('grShort', short); setVal('grExcess', excess);
    if(excess>0) msgs.push(['wa','Excess supply of '+num(excess)+' unit(s) over the balance order quantity. Excess needs approval before acceptance.']);
    if(short>0 && recd>0) msgs.push(['in','Short supply of '+num(short)+' unit(s) against the balance quantity. The order stays open.']);
    var val0 = acc * w.lines[0].rate;
    msgs.push(['ok','Accepted value at order rate: <b>'+inr(val0)+'</b>.']);
  }
  out.innerHTML = msgs.map(function(m){ return '<div class="note '+m[0]+'" style="margin-bottom:6px">'+m[1]+'</div>'; }).join('');
}
async function saveGrn(){
  if(!requireOk('grForm')) return;
  var w = byId(DB.workorders,'no',val('grWo'));
  if(!w){ toast('Select a valid work order before saving.','er'); return; }
  if(!w.lines || !w.lines.length){ toast('The selected work order has no line items to receive against.','er'); return; }
  var recd = nval('grRecd'), acc = nval('grAcc'), rej = nval('grRej');
  if(recd<=0){ toast('Received quantity must be greater than zero.','er'); return; }
  if(acc + rej > recd){ toast('Accepted plus rejected quantity cannot exceed the received quantity.','er'); return; }
  var storeObj = byId(DB.stores,'store_name', val('grStore'));
  if(!storeObj){ toast('Select a valid receiving store before saving.','er'); return; }
  var matObj = byId(DB.materials,'code', w.lines[0].mat);
  if(!matObj){ toast('Could not resolve the ordered material against the master data.','er'); return; }
  var rec = {
    id: uid('G'), no: val('grNo'), date: val('grDate'), wo: w.no, vendor: w.vendor, mat: w.lines[0].mat,
    received: recd, accepted: acc, rejected: rej, damaged: nval('grDam'),
    short: nval('grShort'), excess: nval('grExcess'),
    challan: val('grChallan'), challanDate: val('grChallanDt'),
    store: val('grStore'), location: val('grBin'),
    batch: val('grBatch'), mfg: val('grMfg'), exp: val('grExp'),
    inspection: w.inspection==='Required' ? 'Pending' : 'Accepted',
    posting: 'Pending', receiver: val('grReceiver'), remarks: val('grRemarks'),
    attachments: attList('grAtt')
  };
  var payload = {
    wo_id: w.id, store_id: storeObj.id, challan_no: rec.challan, challan_date: rec.challanDate,
    lines: [{item_id: matObj.id, challan_qty: recd, received_qty: recd}]
  };
  try {
    var res = await fetch(API_BASE+'/grn/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the GRN ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.grn_no || rec.no;
    DB.grns.unshift(rec);
    var d = DB.deliveries.filter(function(x){ return x.wo===w.no; })[0];
    if(d){
      d.delivered = Math.min(d.ordered, d.delivered + recd);
      d.pending = Math.max(0, d.ordered - d.delivered);
      d.status = d.pending===0 ? 'Delivered' : 'Partially Delivered';
      if(d.pending===0) d.actual = rec.date;
    }
    w.delivered = (d? d.delivered : w.delivered + recd);
    w.deliveredValue = Math.round(w.delivered * w.lines[0].rate * 1.18);
    logAudit('GRN', rec.no,'Created','Status','\u2014','Pending',
      num(recd)+' received against '+w.no+' under challan '+rec.challan);
    if(rec.inspection==='Pending') notify('wa','GRN '+rec.no+' awaiting inspection', num(recd)+' units received at '+rec.store,'grn/pending');
    closeModal(); save();
    if(TBL.tGrn) tblReload('tGrn', DB.grns);
    refreshNavCounts();
    toast('Recorded <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+'). '+(rec.inspection==='Pending'? 'Sent for inspection.':'Ready for posting.'),'ok');
    goto('grn/list');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function viewGrn(id){
  var g = byId(DB.grns,'id',id);
  var w = byId(DB.workorders,'no',g.wo) || {lines:[{rate:0}]};
  var ins = DB.inspections.filter(function(x){ return x.grn===g.no; });
  modal({title:'Goods Receipt '+esc(g.no), size:'lg',
    body: tabsHtml('vg',['Receipt details','Quantity reconciliation','Inspection','Audit'])+
      pane('vg',0,'<div class="grid g2"><table class="kv">'+
        kvRow('GRN number','<span class="mono">'+esc(g.no)+'</span>')+kvRow('GRN date', fdate(g.date))+
        kvRow('Work order','<span class="mono">'+esc(g.wo)+'</span>')+
        kvRow('Vendor', esc(vname(g.vendor)))+kvRow('Material', esc(g.mat)+' \u2014 '+esc(mname(g.mat)))+
        kvRow('Received by', esc(g.receiver))+'</table>'+
        '<table class="kv">'+kvRow('Challan number','<span class="mono">'+esc(g.challan)+'</span>')+
        kvRow('Challan date', fdate(g.challanDate))+kvRow('Store', esc(g.store))+
        kvRow('Bin / location', esc(g.location))+
        kvRow('Batch', g.batch? '<span class="mono">'+esc(g.batch)+'</span>':'Not applicable')+
        kvRow('Expiry', g.exp? fdate(g.exp):'Not applicable')+'</table></div>'+
        (g.remarks? '<div class="sec-h" style="margin-top:11px">Remarks</div><div style="font-size:12.5px">'+esc(g.remarks)+'</div>':''))+
      pane('vg',1,'<div class="grid g4" style="margin-bottom:11px">'+
        [['Received',g.received,'#1E5A96'],['Accepted',g.accepted,'#15803D'],
         ['Rejected',g.rejected,'#B91C1C'],['Damaged',g.damaged,'#B45309']]
        .map(function(x){ return '<div class="scard" style="border-top:3px solid '+x[2]+'"><div class="l">'+x[0]+
          '</div><div class="v">'+num(x[1])+'</div></div>'; }).join('')+'</div>'+
        '<table class="kv">'+kvRow('Short supply', num(g.short||0))+kvRow('Excess supply', num(g.excess||0))+
        kvRow('Order rate', inr(w.lines[0].rate))+
        kvRow('Accepted value', inr(g.accepted*w.lines[0].rate))+
        kvRow('Rejected value', inr(g.rejected*w.lines[0].rate))+
        kvRow('Inventory posting', badge(g.posting))+'</table>')+
      pane('vg',2, ins.length? '<table class="kv">'+
        kvRow('Inspection number','<span class="mono">'+esc(ins[0].no)+'</span>')+
        kvRow('Inspecting authority', esc(ins[0].inspector))+kvRow('Inspection date', fdate(ins[0].date))+
        kvRow('Result', badge(ins[0].result))+kvRow('Observation', esc(ins[0].observation))+
        kvRow('Non-conformity', esc(ins[0].nc))+kvRow('Recommendation', esc(ins[0].reco))+
        kvRow('Certificate','<span class="mono">'+esc(ins[0].cert)+'</span>')+'</table>'
        : '<div class="note wa">Inspection is pending for this receipt.</div>')+
      pane('vg',3, auditTableHtml(DB.trail.filter(function(t){ return t.ref===g.no; }))),
    footer: (g.inspection==='Pending'||g.inspection==='Under Inspection'
        ? '<button class="btn sec" onclick="inspectGrn(\''+g.id+'\')">Record inspection</button>':'')+
      (g.posting==='Pending' && g.accepted>0? '<button class="btn ok" onclick="postGrn(\''+g.id+'\')">Post to inventory</button>':'')+
      '<button class="btn" data-close>Close</button>'});
}
function postGrn(id){
  var g = byId(DB.grns,'id',id);
  if(g.inspection==='Pending'||g.inspection==='Under Inspection'){
    toast('Complete the inspection for <b>'+esc(g.no)+'</b> before posting to inventory.','wa'); return;
  }
  var w = byId(DB.workorders,'no',g.wo) || {lines:[{rate:0}]};
  confirmAct({title:'Post receipt to inventory', ok:'Post to inventory', btnClass:'ok', reason:true,
    message:'The accepted quantity is added to stock at <b>'+esc(g.store)+'</b> and a movement entry is created.',
    detail: kvRow('Material', esc(g.mat))+kvRow('Accepted quantity', num(g.accepted))+
            kvRow('Store', esc(g.store))+kvRow('Value', inr(g.accepted*w.lines[0].rate))},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/grn/'+g.id+'/post-to-stock', {method:'PUT'});
        if(!res.ok){ var e = await res.text(); toast('Post failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Post failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      g.posting = 'Posted';
      var s = DB.stock.filter(function(x){ return x.mat===g.mat && x.store===g.store; })[0];
      if(s){ s.avail += g.accepted; }
      else {
        DB.stock.push({id:uid('S'), mat:g.mat, store:g.store, bin:g.location, avail:g.accepted,
          reserved:0, inspection:0, blocked:0, damaged:g.damaged, expired:0, transit:0,
          rate:w.lines[0].rate, reorder:mreorder(g.mat), batch:g.batch, expiry:g.exp});
      }
      var m = byId(DB.materials,'code',g.mat); if(m) m.stock += g.accepted;
      DB.movements.unshift({id:uid('V'), no:'MOV/2026/'+pad(9200+DB.movements.length*3,6), date:TODAY,
        mat:g.mat, type:'Receipt from Vendor', src:'Vendor', dst:g.store, qty:g.accepted,
        uom:muom(g.mat), value:g.accepted*w.lines[0].rate, ref:g.no, by:'Store Officer', status:'Approved'});
      if(m && m.warrantyApplicable && w.warranty){
        DB.warranty.push({id:uid('WR'), wid:'WTY/2026/'+pad(700+DB.warranty.length*3,5), mat:g.mat,
          serial:'SN'+pad(410000+DB.warranty.length*77,8), asset:'AST/DIT/'+pad(1300+DB.warranty.length*5,5),
          vendor:g.vendor, wo:g.wo, grn:g.no, start:g.date, end: addDays(g.date, w.warranty*30),
          amc: addDays(g.date, w.warranty*30+365), status:'Active', complaints:0});
      }
      logAudit('GRN', g.no,'Posted','Inventory Posting','Pending','Posted',reason);
      closeAllModals();
      if(TBL.tGrn) tblReload('tGrn', DB.grns);
      refreshNavCounts();
      commit('Posted <b>'+num(g.accepted)+'</b> unit(s) of '+esc(g.mat)+' to '+esc(g.store)+' in PostgreSQL.','ok');
    });
}

/* ---------- pending inspection ---------- */
SCREENS['grn/pending'] = function(){
  var rows = DB.grns.filter(function(g){ return g.inspection==='Pending' || g.inspection==='Under Inspection'; });
  return pageHead('Pending Inspection','Receipt and Inspection',
    'Goods receipts awaiting inspection by the departmental committee',
    '<button class="btn gh sm" onclick="tblExport(\'tGrnP\',\'Pending_Inspection\')">\u2913 Export</button>',
    reqTags('MMP_11'))+
  summaryRow([
    {l:'Awaiting inspection', v:rows.length, c:'#B45309'},
    {l:'Quantity held', v:num(sum(rows,'received')), c:'#1E5A96'},
    {l:'Beyond 5 days', v:rows.filter(function(g){ return daysBetween(g.date,TODAY)>5; }).length, c:'#B91C1C'},
    {l:'Vendors involved', v:uniq(rows.map(function(g){ return g.vendor; })).length, c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tGrnP', rows:rows, cols:[
    {h:'GRN Number', k:'no', cls:'mono'},
    {h:'GRN Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Quantity', k:'received', cls:'num', f:function(r){ return num(r.received); }},
    {h:'Store', k:'store'},
    {h:'Days Pending', k:'dp', cls:'num', f:function(r){
      var d = daysBetween(r.date,TODAY);
      return '<span style="'+(d>5?'color:#B91C1C;font-weight:700':'')+'">'+d+'</span>'; },
      sv:function(r){ return daysBetween(r.date,TODAY); }},
    {h:'Status', k:'inspection', f:function(r){ return badge(r.inspection); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Record inspection','inspectGrn(\''+r.id+'\')','sec')+
      actIcon('View GRN','viewGrn(\''+r.id+'\')','gh'); }}
  ], empty:'No receipt is awaiting inspection'})+'</div></div>';
};
function inspectGrn(id){
  var g = byId(DB.grns,'id',id);
  modal({title:'Inspection \u2014 '+esc(g.no), size:'md',
    body:'<div id="inForm"><table class="kv" style="margin-bottom:11px">'+
      kvRow('Work order','<span class="mono">'+esc(g.wo)+'</span>')+
      kvRow('Material', esc(g.mat)+' \u2014 '+esc(mname(g.mat)))+
      kvRow('Quantity received', num(g.received))+
      kvRow('Specification', esc((byId(DB.materials,'code',g.mat)||{spec:''}).spec))+'</table>'+
      '<div class="fgrid g2">'+
      fld({id:'inBy', label:'Inspecting authority', type:'select', req:true, blank:false,
           opts:['Technical Committee \u2014 IT','Store Inspection Board','Quality Cell \u2014 PWD','Medical Stores Committee']})+
      fld({id:'inDate', label:'Inspection date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'inAcc', label:'Quantity accepted', type:'number', val:g.received, num:true, req:true, onchange:'inspCalc(\''+id+'\')'})+
      fld({id:'inRej', label:'Quantity rejected', type:'number', val:0, num:true, onchange:'inspCalc(\''+id+'\')'})+
      fld({id:'inResult', label:'Inspection result', type:'select', blank:false,
           opts:['Conforming','Partially Conforming','Non-conforming']})+
      fld({id:'inCert', label:'Inspection certificate number', val:'TC/'+pad(1300+DB.inspections.length*9,5)})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'inObs', label:'Observation', type:'textarea', rows:2, req:true,
           ph:'What the committee found on physical and technical examination'})+
      fld({id:'inNc', label:'Non-conformity noted', type:'textarea', rows:2, val:'Nil'})+
      fld({id:'inReco', label:'Recommendation', type:'textarea', rows:2, val:'Accept in full'})+
      '</div><div id="inCalcOut" style="margin-top:10px"></div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn dgr" onclick="saveInspection(\''+id+'\',\'Rejected\')">Reject consignment</button>'+
      '<button class="btn ok" onclick="saveInspection(\''+id+'\',\'Accepted\')">Record acceptance</button>'});
}
function inspCalc(id){
  var g = byId(DB.grns,'id',id);
  var out = document.getElementById('inCalcOut'); if(!out) return;
  var acc = nval('inAcc'), rej = nval('inRej');
  if(acc+rej > g.received){
    out.innerHTML = '<div class="note er">Accepted plus rejected ('+num(acc+rej)+') exceeds the received quantity ('+num(g.received)+').</div>';
  } else if(rej>0){
    out.innerHTML = '<div class="note wa">'+num(rej)+' unit(s) will be marked for return to the vendor and a return note raised.</div>';
  } else {
    out.innerHTML = '<div class="note ok">Full acceptance. The quantity becomes available for posting to inventory.</div>';
  }
}
async function saveInspection(id, outcome){
  if(!requireOk('inForm')) return;
  var g = byId(DB.grns,'id',id);
  var acc = outcome==='Rejected' ? 0 : nval('inAcc');
  var rej = outcome==='Rejected' ? g.received : nval('inRej');
  if(acc+rej > g.received){ toast('Accepted plus rejected quantity cannot exceed the received quantity.','er'); return; }
  var reason = val('inObs');
  var rec = {
    id: uid('I'), no:'INS/2026/'+pad(900+DB.inspections.length*4,5), grn:g.no, wo:g.wo, mat:g.mat,
    inspector: val('inBy'), date: val('inDate'), location: g.store, qty: g.received,
    accepted: acc, rejected: rej, observation: reason, cert: val('inCert'),
    result: outcome==='Rejected' ? 'Non-conforming' : val('inResult'),
    nc: val('inNc'), reco: val('inReco'),
    status: outcome==='Rejected' ? 'Rejected' : (rej>0 ? 'Accepted with Deviation':'Accepted')
  };
  var payload = {passed_qty: acc, rejected_qty: rej, test_type: val('inCert')||undefined, rejection_reason: reason||undefined};
  try {
    var res = await fetch(API_BASE+'/grn/'+g.id+'/inspections', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the inspection ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.no = created.insp_no || rec.no;
    DB.inspections.unshift(rec);
    var old = g.inspection;
    g.inspection = created.overall_status || rec.status; g.accepted = acc; g.rejected = rej;
    if(rej>0){
      DB.rtv.unshift({id:uid('RT'), no:'RTV/2026/'+pad(340+DB.rtv.length*4,5), grn:g.no, wo:g.wo,
        vendor:g.vendor, mat:g.mat, qty:rej, rate:0, reason:'Rejected on inspection',
        date: addDays(rec.date,1), mode:'Vendor pickup', replacement:'Replacement Pending',
        ack:'Pending', status:'Replacement Pending'});
    }
    logAudit('GRN', g.no,'Inspected','Inspection Status', old, g.inspection, reason);
    if(rej>0) notify('wa','Inspection rejected quantity \u2014 '+g.no, num(rej)+' unit(s) to be returned to '+vname(g.vendor),'grn/rtv');
    closeAllModals(); save();
    ['tGrn','tGrnP','tIns'].forEach(function(t){
      if(TBL[t]) tblReload(t, t==='tGrn'? DB.grns : (t==='tIns'? DB.inspections
        : DB.grns.filter(function(x){ return x.inspection==='Pending'||x.inspection==='Under Inspection'; })));
    });
    refreshNavCounts();
    toast('Inspection recorded in PostgreSQL for <b>'+esc(g.no)+'</b> \u2014 '+num(acc)+' accepted, '+num(rej)+' rejected.','ok');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}

/* ---------- inspection register ---------- */
SCREENS['grn/inspection'] = function(){
  var rows = DB.inspections;
  return pageHead('Inspection Register','Receipt and Inspection',
    'Inspection results, certificates and non-conformity records',
    '<button class="btn gh sm" onclick="tblExport(\'tIns\',\'Inspection_Register\')">\u2913 Export</button>',
    reqTags('MMP_11'))+
  summaryRow([
    {l:'Inspections', v:rows.length, c:'#1E5A96'},
    {l:'Conforming', v:rows.filter(function(i){ return i.result==='Conforming'; }).length, c:'#15803D'},
    {l:'With deviation', v:rows.filter(function(i){ return i.result==='Partially Conforming'; }).length, c:'#B45309'},
    {l:'Rejected quantity', v:num(sum(rows,'rejected')), c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tIns', rows:rows, cols:[
    {h:'Inspection No.', k:'no', cls:'mono'},
    {h:'GRN', k:'grn', cls:'mono'},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Inspecting Authority', k:'inspector'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Accepted', k:'accepted', cls:'num', f:function(r){ return num(r.accepted); }},
    {h:'Rejected', k:'rejected', cls:'num', f:function(r){ return num(r.rejected); }},
    {h:'Result', k:'result', f:function(r){
      var c = r.result==='Conforming'?'b-ok':(r.result==='Non-conforming'?'b-er':'b-wa');
      return '<span class="bdg '+c+'">'+esc(r.result)+'</span>'; }},
    {h:'Non-conformity', k:'nc'},
    {h:'Certificate', k:'cert', cls:'mono'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Report','inspectionReport(\''+r.id+'\')','gh'); }}
  ], empty:'No inspection recorded'})+'</div></div>';
};
function inspectionReport(id){
  var i = byId(DB.inspections,'id',id);
  modal({title:'Inspection report '+esc(i.no), size:'md',
    body:'<div style="border:1px solid var(--line);padding:16px;border-radius:6px">'+
      '<div style="text-align:center;border-bottom:2px solid var(--navy-2);padding-bottom:9px;margin-bottom:11px">'+
      '<div class="fw7" style="font-size:14px;color:var(--navy-2)">INSPECTION REPORT</div>'+
      '<div style="font-size:11.5px">Government of NCT of Delhi</div></div>'+
      '<table class="kv">'+
      kvRow('Inspection number', esc(i.no))+kvRow('GRN reference', esc(i.grn))+
      kvRow('Work order', esc(i.wo))+kvRow('Material', esc(i.mat)+' \u2014 '+esc(mname(i.mat)))+
      kvRow('Inspecting authority', esc(i.inspector))+kvRow('Inspection date', fdate(i.date))+
      kvRow('Location', esc(i.location))+
      kvRow('Quantity offered', num(i.qty))+kvRow('Quantity accepted', num(i.accepted))+
      kvRow('Quantity rejected', num(i.rejected))+kvRow('Result', badge(i.result))+
      kvRow('Observation', esc(i.observation))+kvRow('Non-conformity', esc(i.nc))+
      kvRow('Recommendation', esc(i.reco))+kvRow('Certificate number', esc(i.cert))+'</table>'+
      '<div style="margin-top:22px;text-align:right;font-size:12.5px"><b>'+esc(i.inspector)+'</b><br>Inspecting Authority</div>'+
    '</div>',
    footer:'<button class="btn gh" onclick="window.print()">Print</button><button class="btn" data-close>Close</button>'});
}

/* ---------- return to vendor ---------- */
SCREENS['grn/rtv'] = function(){
  var rows = DB.rtv;
  return pageHead('Return to Vendor','Receipt and Inspection',
    'Rejected and damaged material returned to vendors, with replacement and refund tracking',
    '<button class="btn gh sm" onclick="tblExport(\'tRtv\',\'Return_To_Vendor\')">\u2913 Export</button>',
    reqTags('MMP_11','MMP_12'))+
  summaryRow([
    {l:'Return notes', v:rows.length, c:'#1E5A96'},
    {l:'Replacement pending', v:rows.filter(function(r){ return r.replacement==='Replacement Pending'; }).length, c:'#B45309'},
    {l:'Quantity returned', v:num(sum(rows,'qty')), c:'#B91C1C'},
    {l:'Closed', v:rows.filter(function(r){ return r.status==='Closed'; }).length, c:'#15803D'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRtv', rows:rows, cols:[
    {h:'Return Note', k:'no', cls:'mono'},
    {h:'GRN', k:'grn', cls:'mono'},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Reason', k:'reason'},
    {h:'Return Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Return Mode', k:'mode'},
    {h:'Replacement / Refund', k:'replacement', f:function(r){ return badge(r.replacement); }},
    {h:'Vendor Acknowledgement', k:'ack', f:function(r){ return badge(r.ack); }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return (r.status!=='Closed'? actIcon('Record replacement','replaceRtv(\''+r.id+'\')','ok')+
        actIcon('Claim refund','refundRtv(\''+r.id+'\')','warn'):'<span class="muted">\u2014</span>'); }}
  ], empty:'No material returned to any vendor'})+'</div></div>';
};
function rtvFromGrn(id){
  var g = byId(DB.grns,'id',id);
  var exists = DB.rtv.filter(function(r){ return r.grn===g.no; })[0];
  if(exists){ goto('grn/rtv'); toast('A return note already exists for <b>'+esc(g.no)+'</b>.','in'); return; }
  confirmAct({title:'Raise return to vendor', kind:'wa', btnClass:'warn', ok:'Raise return note', reason:true,
    message:'<b>'+num(g.rejected)+'</b> rejected unit(s) of '+esc(g.mat)+' are returned to '+esc(vname(g.vendor))+'.'},
    function(reason){
      var no = 'RTV/2026/'+pad(340+DB.rtv.length*4,5);
      DB.rtv.unshift({id:uid('RT'), no:no, grn:g.no, wo:g.wo, vendor:g.vendor, mat:g.mat,
        qty:g.rejected, rate:0, reason:reason, date:TODAY, mode:'Vendor pickup',
        replacement:'Replacement Pending', ack:'Pending', status:'Replacement Pending'});
      logAudit('Return to Vendor', no,'Raised','Status','\u2014','Replacement Pending',reason);
      closeAllModals(); save();
      toast('Raised return note <b>'+esc(no)+'</b>.','ok');
      goto('grn/rtv');
    });
}
function replaceRtv(id){
  var r = byId(DB.rtv,'id',id);
  confirmAct({title:'Record replacement receipt', ok:'Record replacement', btnClass:'ok', reason:true,
    message:'The vendor has supplied <b>'+num(r.qty)+'</b> replacement unit(s) of '+esc(r.mat)+'. Stock is updated and the return note closed.'},
    function(reason){
      r.replacement='Replacement Received'; r.ack='Received'; r.status='Closed';
      var s = DB.stock.filter(function(x){ return x.mat===r.mat; })[0];
      if(s) s.avail += r.qty;
      var m = byId(DB.materials,'code',r.mat); if(m) m.stock += r.qty;
      DB.movements.unshift({id:uid('V'), no:'MOV/2026/'+pad(9300+DB.movements.length*3,6), date:TODAY,
        mat:r.mat, type:'Replacement Receipt', src:'Vendor', dst:(s?s.store:STORES[0]), qty:r.qty,
        uom:muom(r.mat), value:r.qty*mrate(r.mat), ref:r.no, by:'Store Officer', status:'Approved'});
      logAudit('Return to Vendor', r.no,'Replacement Received','Status','Replacement Pending','Closed',reason);
      tblReload('tRtv', DB.rtv);
      commit('Replacement received and posted to stock.','ok');
    });
}
function refundRtv(id){
  var r = byId(DB.rtv,'id',id);
  confirmAct({title:'Claim refund from vendor', kind:'wa', btnClass:'warn', ok:'Raise refund claim', reason:true,
    message:'A refund claim for <b>'+num(r.qty)+'</b> unit(s) is raised against '+esc(vname(r.vendor))+
      ' and passed to the finance interface for recovery from the pending bill.'},
    function(reason){
      r.replacement='Refund Claimed'; r.status='Open';
      logAudit('Return to Vendor', r.no,'Refund Claimed','Replacement Status','Replacement Pending','Refund Claimed',reason);
      notify('wa','Refund claim raised \u2014 '+r.no, 'Recovery from pending bill of '+vname(r.vendor),'billing/invoice');
      tblReload('tRtv', DB.rtv);
      commit('Refund claim raised against <b>'+esc(vname(r.vendor))+'</b>.','wa');
    });
}

/* ============================ INVENTORY INTEGRATION ============================ */
function stockState(s){
  if(s.avail===0) return 'Stock Out';
  if(s.avail < mreorder(s.mat)*0.5) return 'Critical';
  if(s.avail < mreorder(s.mat)) return 'Low Stock';
  if(s.avail > mreorder(s.mat)*4) return 'Excess Stock';
  return 'In Stock';
}
SCREENS['inv/stock'] = function(){
  var rows = DB.stock;
  var totVal = sum(rows, function(s){ return s.avail*s.rate; });
  return pageHead('Stock Overview','Inventory Integration',
    'Store-wise stock position with reserved, blocked, in-transit and expiry status',
    '<button class="btn gh sm" onclick="tblExport(\'tStk\',\'Stock_Overview\')">\u2913 Export</button>'+
    '<button class="btn gh sm" onclick="goto(\'inv/reorder\')">Reorder planning \u2192</button>',
    reqTags('MMP_12','MMP_13'))+
  summaryRow([
    {l:'Stock value', v:inr0(totVal), c:'#15803D'},
    {l:'Materials in stock', v:rows.filter(function(s){ return s.avail>0; }).length, c:'#1E5A96'},
    {l:'Below reorder level', v:rows.filter(function(s){ return s.avail>0 && s.avail<mreorder(s.mat); }).length, c:'#B45309'},
    {l:'Stock-out', v:rows.filter(function(s){ return s.avail===0; }).length, c:'#B91C1C'}
  ])+
  '<div class="grid g23" style="margin-bottom:12px">'+
    '<div class="card"><div class="hd"><span>Stock value by store</span></div><div class="bd">'+
      barChart(STORES.map(function(st,i){
        return {l:st, v: Math.round(sum(rows.filter(function(s){ return s.store===st; }), function(s){ return s.avail*s.rate; })),
                c:['#123B64','#1E5A96','#0F766E','#15803D','#B45309','#6B21A8'][i%6]};
      }), {fmt:inr0})+'</div></div>'+
    '<div class="card"><div class="hd"><span>Stock health</span></div><div class="bd">'+
      donut([
        {l:'In stock', v:rows.filter(function(s){ return stockState(s)==='In Stock'; }).length, c:'#15803D'},
        {l:'Excess', v:rows.filter(function(s){ return stockState(s)==='Excess Stock'; }).length, c:'#0F766E'},
        {l:'Low stock', v:rows.filter(function(s){ return stockState(s)==='Low Stock'; }).length, c:'#B45309'},
        {l:'Critical', v:rows.filter(function(s){ return stockState(s)==='Critical'; }).length, c:'#6B21A8'},
        {l:'Stock out', v:rows.filter(function(s){ return stockState(s)==='Stock Out'; }).length, c:'#B91C1C'}
      ])+'</div></div>'+
  '</div>'+
  filterBar([
    fld({id:'fsMat', label:'Material code', ph:'MAT-'}),
    fld({id:'fsStore', label:'Store', type:'select', opts:STORES, blank:'All'}),
    fld({id:'fsState', label:'Stock status', type:'select', opts:['In Stock','Low Stock','Critical','Stock Out','Excess Stock'], blank:'All'}),
    fld({id:'fsExp', label:'Expiry', type:'select', opts:['Near expiry (90 days)','Expired','No expiry'], blank:'All'})
  ], 'applyStockFilter()',
    '<button class="btn sm" onclick="resetStockFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tStk', rows:rows, cols:[
    {h:'Material Code', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Store', k:'store'},
    {h:'Bin', k:'bin', cls:'mono'},
    {h:'Available', k:'avail', cls:'num', f:function(r){
      var st = stockState(r);
      var c = st==='Stock Out'? '#B91C1C' : (st==='Critical'? '#B91C1C' : (st==='Low Stock'? '#B45309':''));
      return '<span style="'+(c?'color:'+c+';font-weight:700':'')+'">'+num(r.avail)+'</span>'; }},
    {h:'Reserved', k:'reserved', cls:'num', f:function(r){ return num(r.reserved); }},
    {h:'In Transit', k:'transit', cls:'num', f:function(r){ return num(r.transit); }},
    {h:'Under Inspection', k:'inspection', cls:'num', f:function(r){ return num(r.inspection); }},
    {h:'Blocked', k:'blocked', cls:'num', f:function(r){ return num(r.blocked); }},
    {h:'Damaged', k:'damaged', cls:'num', f:function(r){ return num(r.damaged); }},
    {h:'Expired', k:'expired', cls:'num', f:function(r){ return num(r.expired); }},
    {h:'Reorder Level', k:'ro', cls:'num', f:function(r){ return num(mreorder(r.mat)); }, sv:function(r){ return mreorder(r.mat); }},
    {h:'Rate', k:'rate', cls:'num', f:function(r){ return inr(r.rate); }},
    {h:'Stock Value', k:'v', cls:'num', f:function(r){ return inr(r.avail*r.rate); }, sv:function(r){ return r.avail*r.rate; }},
    {h:'Batch', k:'batch', cls:'mono'},
    {h:'Expiry', k:'expiry', f:function(r){
      if(!r.expiry) return '\u2014';
      var d = daysBetween(TODAY, r.expiry);
      return '<span style="'+(d<0?'color:#B91C1C;font-weight:700':(d<=90?'color:#B45309;font-weight:700':''))+'">'+
        fdate(r.expiry)+'</span>'+(d<0? ' '+badge('Expired') : (d<=90? ' '+badge('Near Expiry'):'')); }},
    {h:'Status', k:'st', f:function(r){ return badge(stockState(r)); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Ledger','stockLedger(\''+r.id+'\')','gh')+
      actIcon('Issue','goto(\'inv/issue\')','sec')+
      actIcon('Transfer','goto(\'inv/transfer\')'); }}
  ], empty:'No stock record matches these filters'})+'</div></div>';
};
function applyStockFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.stock.filter(function(s){
    var expOk = true;
    if(f('fsExp')==='Near expiry (90 days)') expOk = !!s.expiry && daysBetween(TODAY,s.expiry)<=90 && daysBetween(TODAY,s.expiry)>=0;
    else if(f('fsExp')==='Expired') expOk = !!s.expiry && daysBetween(TODAY,s.expiry)<0;
    else if(f('fsExp')==='No expiry') expOk = !s.expiry;
    return (!f('fsMat') || s.mat.toLowerCase().indexOf(f('fsMat').toLowerCase())>=0) &&
      (!f('fsStore') || s.store===f('fsStore')) &&
      (!f('fsState') || stockState(s)===f('fsState')) && expOk;
  });
  tblReload('tStk', rows);
  toast(rows.length+' stock record(s) matched.', rows.length?'ok':'wa');
}
function resetStockFilter(){
  ['fsMat','fsStore','fsState','fsExp'].forEach(function(i){ setVal(i,''); });
  tblReload('tStk', DB.stock); toast('Filters cleared.','in');
}
function stockLedger(id){
  var s = byId(DB.stock,'id',id);
  var movs = DB.movements.filter(function(m){ return m.mat===s.mat; }).slice().reverse();
  var bal = 0;
  var inTypes = ['Receipt from Vendor','Return from User','Replacement Receipt','Store Transfer'];
  modal({title:'Stock ledger \u2014 '+esc(s.mat), size:'lg',
    body:'<div class="grid g4" style="margin-bottom:12px">'+
      [['Available',num(s.avail),'#15803D'],['Reserved',num(s.reserved),'#1E5A96'],
       ['Blocked / damaged',num(s.blocked+s.damaged),'#B91C1C'],['Stock value',inr(s.avail*s.rate),'#0F766E']]
      .map(function(x){ return '<div class="scard" style="border-top:3px solid '+x[2]+'"><div class="l">'+x[0]+
        '</div><div class="v" style="font-size:14px">'+x[1]+'</div></div>'; }).join('')+'</div>'+
      '<div class="twrap" style="max-height:360px"><table class="tbl"><thead><tr>'+
      ['Date','Movement No.','Transaction Type','Source','Destination','In','Out','Balance','Reference']
      .map(function(h){ return '<th>'+h+'</th>'; }).join('')+'</tr></thead><tbody>'+
      movs.map(function(m){
        var isIn = inTypes.indexOf(m.type)>=0;
        bal += isIn ? m.qty : -m.qty;
        return '<tr><td class="nowrap">'+fdate(m.date)+'</td><td class="mono">'+esc(m.no)+'</td>'+
        '<td>'+esc(m.type)+'</td><td>'+esc(m.src)+'</td><td>'+esc(m.dst)+'</td>'+
        '<td class="num">'+(isIn? num(m.qty):'\u2014')+'</td>'+
        '<td class="num">'+(isIn? '\u2014':num(m.qty))+'</td>'+
        '<td class="num fw6">'+num(bal)+'</td><td class="mono">'+esc(m.ref)+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<div class="note in" style="margin-top:10px">The running balance is derived from recorded movements in the demo data set and may differ from the live store balance.</div>'});
}

/* ---------- material movement ---------- */
SCREENS['inv/movement'] = function(){
  var rows = DB.movements;
  return pageHead('Material Movement','Inventory Integration',
    'Every stock movement with transaction type, source, destination and reference document',
    '<button class="btn gh sm" onclick="tblExport(\'tMov\',\'Material_Movement\')">\u2913 Export</button>',
    reqTags('MMP_12'))+
  summaryRow([
    {l:'Movements', v:rows.length, c:'#1E5A96'},
    {l:'Receipts', v:rows.filter(function(m){ return m.type.indexOf('Receipt')>=0; }).length, c:'#15803D'},
    {l:'Issues', v:rows.filter(function(m){ return m.type.indexOf('Issue')>=0; }).length, c:'#B45309'},
    {l:'Movement value', v:inr0(sum(rows,'value')), c:'#0F766E'}
  ])+
  filterBar([
    fld({id:'fmvMat', label:'Material code', ph:'MAT-'}),
    fld({id:'fmvType', label:'Transaction type', type:'select', blank:'All',
         opts:uniq(DB.movements.map(function(m){ return m.type; }))}),
    fld({id:'fmvFrom', label:'From date', type:'date'}),
    fld({id:'fmvTo', label:'To date', type:'date'})
  ], 'applyMovFilter()',
    '<button class="btn sm" onclick="resetMovFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tMov', rows:rows, cols:[
    {h:'Movement No.', k:'no', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Transaction Type', k:'type'},
    {h:'Source', k:'src'},
    {h:'Destination', k:'dst'},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'UOM', k:'uom'},
    {h:'Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
    {h:'Reference', k:'ref', cls:'mono'},
    {h:'Recorded By', k:'by'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ], empty:'No movement recorded'})+'</div></div>';
};
function applyMovFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.movements.filter(function(m){
    return (!f('fmvMat') || m.mat.toLowerCase().indexOf(f('fmvMat').toLowerCase())>=0) &&
      (!f('fmvType') || m.type===f('fmvType')) &&
      (!f('fmvFrom') || m.date>=f('fmvFrom')) &&
      (!f('fmvTo') || m.date<=f('fmvTo'));
  });
  tblReload('tMov', rows);
  toast(rows.length+' movement(s) matched.', rows.length?'ok':'wa');
}
function resetMovFilter(){
  ['fmvMat','fmvType','fmvFrom','fmvTo'].forEach(function(i){ setVal(i,''); });
  tblReload('tMov', DB.movements); toast('Filters cleared.','in');
}

/* ---------- stock transfer ---------- */
SCREENS['inv/transfer'] = function(){
  return pageHead('Stock Transfer','Inventory Integration',
    'Transfer of material between stores with despatch and receipt acknowledgement',
    '<button class="btn gh sm" onclick="tblExport(\'tTrf\',\'Stock_Transfer\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="transferEntry()">+ New transfer</button>',
    reqTags('MMP_12'))+
  summaryRow([
    {l:'Transfers', v:DB.transfers.length, c:'#1E5A96'},
    {l:'In transit', v:DB.transfers.filter(function(t){ return t.status==='In Transit'; }).length, c:'#B45309'},
    {l:'Received', v:DB.transfers.filter(function(t){ return t.status==='Received'; }).length, c:'#15803D'},
    {l:'Awaiting despatch', v:DB.transfers.filter(function(t){ return t.status==='Pending'; }).length, c:'#7386A0'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tTrf', rows:DB.transfers, cols:[
    {h:'Transfer No.', k:'no', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'UOM', k:'uom'},
    {h:'From Store', k:'from'},
    {h:'To Store', k:'to'},
    {h:'Approved By', k:'approver'},
    {h:'Transfer Challan', k:'challan', cls:'mono'},
    {h:'Despatched', k:'dispatched', f:function(r){ return r.dispatched? fdate(r.dispatched):'\u2014'; }},
    {h:'Received', k:'received', f:function(r){ return r.received? fdate(r.received):'\u2014'; }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.status==='In Transit'
        ? actIcon('Acknowledge receipt','receiveTransfer(\''+r.id+'\')','ok')
        : (r.status==='Pending'? actIcon('Despatch','despatchTransfer(\''+r.id+'\')','sec') : '<span class="muted">\u2014</span>'); }}
  ], empty:'No stock transfer recorded'})+'</div></div>';
};
function transferEntry(){
  modal({title:'New stock transfer', size:'md',
    body:'<div id="trForm"><div class="fgrid g2">'+
      fld({id:'trNo', label:'Transfer number', val:'TRF/2026/'+pad(260+DB.transfers.length*3,5), ro:true})+
      fld({id:'trDate', label:'Transfer date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'trMat', label:'Material', type:'select', req:true,
           opts:DB.materials.map(function(m){ return {v:m.code, l:m.code+' \u2014 '+m.name}; }), onchange:'trStock()'})+
      fld({id:'trQty', label:'Quantity', type:'number', val:1, num:true, req:true, min:1})+
      fld({id:'trFrom', label:'From store', type:'select', opts:STORES, req:true, onchange:'trStock()'})+
      fld({id:'trTo', label:'To store', type:'select', opts:STORES, req:true})+
      fld({id:'trApp', label:'Approving authority', type:'select', blank:false,
           opts:['Head of Office','Head of Department','Store Officer']})+
      fld({id:'trChallan', label:'Transfer challan', val:'TC/2026/'+pad(100+DB.transfers.length,4)})+
      '</div><div id="trStockOut" style="margin-top:11px"></div>'+
      '<div class="fgrid" style="margin-top:11px">'+
      fld({id:'trReason', label:'Reason for transfer', type:'textarea', rows:2, req:true})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveTransfer()">Create transfer</button>',
    onMount: function(){ trStock(); }});
}
function trStock(){
  var out = document.getElementById('trStockOut'); if(!out) return;
  var s = DB.stock.filter(function(x){ return x.mat===val('trMat') && x.store===val('trFrom'); })[0];
  out.innerHTML = s
    ? '<div class="note '+(s.avail-s.reserved>0?'ok':'er')+'">Available at '+esc(val('trFrom'))+': <b>'+
      num(s.avail)+'</b>, of which <b>'+num(s.reserved)+'</b> is reserved. Net transferable: <b>'+
      num(Math.max(0,s.avail-s.reserved))+'</b>.</div>'
    : '<div class="note wa">No stock record for this material at the selected store.</div>';
}
async function saveTransfer(){
  if(!requireOk('trForm')) return;
  if(val('trFrom')===val('trTo')){ toast('The source and destination stores must be different.','er'); return; }
  var src = DB.stock.filter(function(x){ return x.mat===val('trMat') && x.store===val('trFrom'); })[0];
  var q = nval('trQty');
  if(!src || (src.avail - src.reserved) < q){
    toast('Net available stock at the source store is not enough for this transfer.','er'); return;
  }
  var fromObj = byId(DB.stores,'store_name', val('trFrom'));
  var toObj = byId(DB.stores,'store_name', val('trTo'));
  var matObj = byId(DB.materials,'code', val('trMat'));
  if(!fromObj || !toObj || !matObj){ toast('Could not resolve store or material against the master data.','er'); return; }
  var rec = {id:uid('TR'), no:val('trNo'), date:val('trDate'), mat:val('trMat'), qty:q,
    uom:muom(val('trMat')), from:val('trFrom'), to:val('trTo'), approver:val('trApp'),
    challan:val('trChallan'), dispatched:'', received:'', status:'Pending'};
  var payload = {from_store_id: fromObj.id, to_store_id: toObj.id, item_id: matObj.id, transfer_qty: q, dispatch_gatepass: rec.challan};
  try {
    var res = await fetch(API_BASE+'/inventory/transfers', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the transfer ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.transfer_no || rec.no;
    DB.transfers.unshift(rec);
    logAudit('Stock Transfer', rec.no,'Created','Status','\u2014','Pending',val('trReason'));
    closeModal(); save();
    toast('Created transfer <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+'). Despatch it to move the stock.','ok');
    goto('inv/transfer');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function despatchTransfer(id){
  var t = byId(DB.transfers,'id',id);
  confirmAct({title:'Despatch transfer', ok:'Despatch', btnClass:'sec', reason:true,
    message:'<b>'+num(t.qty)+'</b> unit(s) of '+esc(t.mat)+' leave '+esc(t.from)+' and move to in-transit stock.'},
    function(reason){
      var src = DB.stock.filter(function(x){ return x.mat===t.mat && x.store===t.from; })[0];
      if(src){ src.avail -= t.qty; src.transit += t.qty; }
      t.dispatched = TODAY; t.status = 'In Transit';
      DB.movements.unshift({id:uid('V'), no:'MOV/2026/'+pad(9400+DB.movements.length*3,6), date:TODAY,
        mat:t.mat, type:'Store Transfer', src:t.from, dst:t.to, qty:t.qty, uom:t.uom,
        value:t.qty*mrate(t.mat), ref:t.no, by:'Store Officer', status:'Approved'});
      logAudit('Stock Transfer', t.no,'Despatched','Status','Pending','In Transit',reason);
      tblReload('tTrf', DB.transfers);
      commit('Despatched <b>'+esc(t.no)+'</b> (local only \u2014 the backend has no despatch stage; use Acknowledge receipt to complete the transfer in PostgreSQL).','wa');
    });
}
async function receiveTransfer(id){
  var t = byId(DB.transfers,'id',id);
  confirmAct({title:'Acknowledge transfer receipt', ok:'Acknowledge receipt', btnClass:'ok', reason:true,
    message:'<b>'+esc(t.to)+'</b> acknowledges receipt of '+num(t.qty)+' unit(s) of '+esc(t.mat)+'.'},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/inventory/transfers/'+t.id+'/receive', {method:'PUT'});
        if(!res.ok){ var e = await res.text(); toast('Failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      var src = DB.stock.filter(function(x){ return x.mat===t.mat && x.store===t.from; })[0];
      if(src) src.transit = Math.max(0, src.transit - t.qty);
      var dst = DB.stock.filter(function(x){ return x.mat===t.mat && x.store===t.to; })[0];
      if(dst){ dst.avail += t.qty; }
      else {
        DB.stock.push({id:uid('S'), mat:t.mat, store:t.to, bin:'Unassigned', avail:t.qty, reserved:0,
          inspection:0, blocked:0, damaged:0, expired:0, transit:0, rate:mrate(t.mat),
          reorder:mreorder(t.mat), batch:'', expiry:''});
      }
      t.received = TODAY; t.status = 'Received';
      logAudit('Stock Transfer', t.no,'Received','Status','In Transit','Received',reason);
      tblReload('tTrf', DB.transfers);
      commit('Receipt acknowledged at <b>'+esc(t.to)+'</b> in PostgreSQL.','ok');
    });
}

/* ---------- stock issue ---------- */
SCREENS['inv/issue'] = function(){
  return pageHead('Stock Issue','Inventory Integration',
    'Issue of material from store to the indenting department against an approved requisition',
    '<button class="btn gh sm" onclick="tblExport(\'tIss\',\'Stock_Issue_Register\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="issueEntry()">+ New issue</button>',
    reqTags('MMP_12'))+
  summaryRow([
    {l:'Issue notes', v:DB.issues.length, c:'#1E5A96'},
    {l:'Issued', v:DB.issues.filter(function(i){ return i.status==='Issued'; }).length, c:'#15803D'},
    {l:'Pending', v:DB.issues.filter(function(i){ return i.status==='Pending'; }).length, c:'#B45309'},
    {l:'Issued value', v:inr0(sum(DB.issues, function(i){ return i.qty*i.rate; })), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tIss', rows:DB.issues, cols:[
    {h:'Issue No.', k:'no', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Requisition', k:'req', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'UOM', k:'uom'},
    {h:'Value', k:'v', cls:'num', f:function(r){ return inr(r.qty*r.rate); }, sv:function(r){ return r.qty*r.rate; }},
    {h:'Store', k:'store'},
    {h:'Department', k:'dept'},
    {h:'Indentor', k:'indentor'},
    {h:'Recipient', k:'recipient'},
    {h:'Gate Pass', k:'gatepass', cls:'mono'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.status==='Pending'? actIcon('Issue','confirmIssue(\''+r.id+'\')','ok') : '<span class="muted">\u2014</span>'; }}
  ], empty:'No issue note recorded'})+'</div></div>';
};
function issueEntry(){
  modal({title:'New stock issue', size:'md',
    body:'<div id="isForm"><div class="fgrid g2">'+
      fld({id:'isNo', label:'Issue number', val:'ISS/2026/'+pad(740+DB.issues.length*3,5), ro:true})+
      fld({id:'isDate', label:'Issue date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'isReq', label:'Requisition reference', type:'select',
           opts:DB.requisitions.filter(function(r){ return r.status==='Approved'; }).map(function(r){ return r.no; }), blank:'Not linked'})+
      fld({id:'isMat', label:'Material', type:'select', req:true,
           opts:DB.materials.map(function(m){ return {v:m.code, l:m.code+' \u2014 '+m.name}; }), onchange:'isStock()'})+
      fld({id:'isStore', label:'Issuing store', type:'select', opts:STORES, req:true, onchange:'isStock()'})+
      fld({id:'isQty', label:'Quantity', type:'number', val:1, num:true, req:true, min:1})+
      fld({id:'isDept', label:'Indenting department', type:'select', opts:DEPTS, req:true})+
      fld({id:'isIndentor', label:'Indentor', val:'Anil Katwale', req:true})+
      fld({id:'isRecipient', label:'Recipient', val:'Section Officer', req:true})+
      fld({id:'isGate', label:'Gate pass number', val:'GP/2026/'+pad(200+DB.issues.length,4)})+
      '</div><div id="isStockOut" style="margin-top:11px"></div>'+
      '<div class="fgrid" style="margin-top:11px">'+
      fld({id:'isPurpose', label:'Purpose', type:'textarea', rows:2, req:true})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveIssue()">Record issue</button>',
    onMount: function(){ isStock(); }});
}
function isStock(){
  var out = document.getElementById('isStockOut'); if(!out) return;
  var s = DB.stock.filter(function(x){ return x.mat===val('isMat') && x.store===val('isStore'); })[0];
  out.innerHTML = s
    ? '<div class="note '+(s.avail-s.reserved>0?'ok':'er')+'">Available: <b>'+num(s.avail)+
      '</b> &middot; reserved <b>'+num(s.reserved)+'</b> &middot; net issuable <b>'+num(Math.max(0,s.avail-s.reserved))+
      '</b> at '+esc(val('isStore'))+'.</div>'
    : '<div class="note wa">No stock record for this material at the selected store.</div>';
}
async function saveIssue(){
  if(!requireOk('isForm')) return;
  var s = DB.stock.filter(function(x){ return x.mat===val('isMat') && x.store===val('isStore'); })[0];
  var q = nval('isQty');
  if(!s || (s.avail - s.reserved) < q){ toast('Net available stock is not enough for this issue.','er'); return; }
  var storeObj = byId(DB.stores,'store_name', val('isStore'));
  var matObj = byId(DB.materials,'code', val('isMat'));
  if(!storeObj || !matObj){ toast('Could not resolve store or material against the master data.','er'); return; }
  var rec = {id:uid('IS'), no:val('isNo'), date:val('isDate'), req:val('isReq')||'\u2014',
    mat:val('isMat'), qty:q, uom:muom(val('isMat')), rate:mrate(val('isMat')),
    store:val('isStore'), dept:val('isDept'), indentor:val('isIndentor'),
    recipient:val('isRecipient'), gatepass:val('isGate'), status:'Pending'};
  var payload = {store_id: storeObj.id, receiver_name: rec.recipient, lines: [{item_id: matObj.id, issued_qty: q, unit_rate: rec.rate}]};
  try {
    var res = await fetch(API_BASE+'/inventory/issues', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the issue ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.issue_no || rec.no;
    rec.status = 'Issued';
    s.avail -= q;
    var m = byId(DB.materials,'code',rec.mat); if(m) m.stock = Math.max(0, m.stock - q);
    DB.issues.unshift(rec);
    logAudit('Stock Issue', rec.no,'Issued','Status','\u2014','Issued',val('isPurpose'));
    closeModal(); save(); refreshNavCounts();
    toast('Issued <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+'). Stock deducted immediately by the backend.','ok');
    goto('inv/issue');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function confirmIssue(id){
  toast('This issue note was already posted to PostgreSQL and the stock deducted when it was created \u2014 no separate confirmation step exists in the backend.','in');
}

/* ---------- stock return ---------- */
SCREENS['inv/return'] = function(){
  return pageHead('Stock Return','Inventory Integration',
    'Material returned by user departments to the store, with condition assessment',
    '<button class="btn gh sm" onclick="tblExport(\'tRet\',\'Stock_Return_Register\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="returnEntry()">+ Record return</button>',
    reqTags('MMP_12'))+
  summaryRow([
    {l:'Returns', v:DB.returns.length, c:'#1E5A96'},
    {l:'Restocked', v:DB.returns.filter(function(r){ return r.restock==='Restocked'; }).length, c:'#15803D'},
    {l:'Under inspection', v:DB.returns.filter(function(r){ return r.status==='Under Inspection'; }).length, c:'#B45309'},
    {l:'Unserviceable', v:DB.returns.filter(function(r){ return r.condition==='Unserviceable'; }).length, c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRet', rows:DB.returns, cols:[
    {h:'Return No.', k:'no', cls:'mono'},
    {h:'Issue Reference', k:'issue', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'UOM', k:'uom'},
    {h:'Store', k:'store'},
    {h:'Department', k:'dept'},
    {h:'Condition', k:'condition', f:function(r){
      var c = r.condition==='Serviceable'?'b-ok':(r.condition==='Repairable'?'b-wa':'b-er');
      return '<span class="bdg '+c+'">'+esc(r.condition)+'</span>'; }},
    {h:'Reason', k:'reason'},
    {h:'Disposition', k:'restock'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.status==='Under Inspection'
        ? actIcon('Restock','restockReturn(\''+r.id+'\')','ok')+actIcon('Condemn','condemnReturn(\''+r.id+'\')','dgr')
        : '<span class="muted">\u2014</span>'; }}
  ], empty:'No return recorded'})+'</div></div>';
};
function returnEntry(){
  modal({title:'Record stock return', size:'md',
    body:'<div id="rtForm"><div class="fgrid g2">'+
      fld({id:'rtNo', label:'Return number', val:'RET/2026/'+pad(140+DB.returns.length*3,5), ro:true})+
      fld({id:'rtDate', label:'Return date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'rtIssue', label:'Issue reference', type:'select',
           opts:DB.issues.map(function(i){ return i.no; }), blank:'Not linked', onchange:'rtFromIssue()'})+
      fld({id:'rtMat', label:'Material', type:'select', req:true,
           opts:DB.materials.map(function(m){ return {v:m.code, l:m.code+' \u2014 '+m.name}; })})+
      fld({id:'rtQty', label:'Quantity returned', type:'number', val:1, num:true, req:true, min:1})+
      fld({id:'rtStore', label:'Receiving store', type:'select', opts:STORES, req:true})+
      fld({id:'rtDept', label:'Returning department', type:'select', opts:DEPTS, req:true})+
      fld({id:'rtCond', label:'Condition', type:'select', blank:false,
           opts:['Serviceable','Repairable','Unserviceable']})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'rtReason', label:'Reason for return', type:'textarea', rows:2, req:true})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveReturn()">Record return</button>'});
}
function rtFromIssue(){
  var i = byId(DB.issues,'no',val('rtIssue'));
  if(!i) return;
  setVal('rtMat', i.mat); setVal('rtStore', i.store); setVal('rtDept', i.dept); setVal('rtQty', i.qty);
}
async function saveReturn(){
  if(!requireOk('rtForm')) return;
  var cond = val('rtCond');
  var storeObj = byId(DB.stores,'store_name', val('rtStore'));
  var matObj = byId(DB.materials,'code', val('rtMat'));
  if(!storeObj || !matObj){ toast('Could not resolve store or material against the master data.','er'); return; }
  var rec = {id:uid('RN'), no:val('rtNo'), issue:val('rtIssue')||'\u2014', date:val('rtDate'),
    mat:val('rtMat'), qty:nval('rtQty'), uom:muom(val('rtMat')), store:val('rtStore'),
    dept:val('rtDept'), condition:cond, reason:val('rtReason'),
    restock: cond==='Serviceable'? 'Pending restock':'Sent for inspection',
    status: cond==='Serviceable'? 'Under Inspection':'Under Inspection'};
  var payload = {store_id: storeObj.id, item_id: matObj.id, return_qty: rec.qty, condition_status: cond};
  try {
    var res = await fetch(API_BASE+'/inventory/returns', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the return ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.return_no || rec.no;
    DB.returns.unshift(rec);
    logAudit('Stock Return', rec.no,'Created','Status','\u2014','Under Inspection',rec.reason);
    closeModal(); save();
    toast('Recorded return <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+').','ok');
    goto('inv/return');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
async function restockReturn(id){
  var r = byId(DB.returns,'id',id);
  confirmAct({title:'Restock returned material', ok:'Restock', btnClass:'ok', reason:true,
    message:'<b>'+num(r.qty)+'</b> unit(s) of '+esc(r.mat)+' are taken back into stock at '+esc(r.store)+'.'},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/inventory/returns/'+r.id+'/restock', {method:'PUT'});
        if(!res.ok){ var e = await res.text(); toast('Failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      var s = DB.stock.filter(function(x){ return x.mat===r.mat && x.store===r.store; })[0];
      if(s) s.avail += r.qty;
      var m = byId(DB.materials,'code',r.mat); if(m) m.stock += r.qty;
      r.restock='Restocked'; r.status='Accepted';
      logAudit('Stock Return', r.no,'Restocked','Status','Under Inspection','Accepted',reason);
      tblReload('tRet', DB.returns);
      commit('Restocked <b>'+num(r.qty)+'</b> unit(s) of '+esc(r.mat)+' into '+esc(r.store)+' in PostgreSQL.','ok');
    });
}
function condemnReturn(id){
  var r = byId(DB.returns,'id',id);
  confirmAct({title:'Send for condemnation', kind:'er', btnClass:'dgr', ok:'Raise disposal proposal', reason:true,
    message:'The returned material is unserviceable. A disposal proposal is raised for condemnation board approval.'},
    function(reason){
      r.restock='Sent for disposal'; r.status='Closed';
      var no = 'DSP/2026/'+pad(40+DB.disposals.length,5);
      var orig = r.qty*mrate(r.mat);
      DB.disposals.unshift({id:uid('DS'), no:no, mat:r.mat, store:r.store, location:'Bin-Z-01',
        batch:'', qty:r.qty, original:orig, book:Math.round(orig*0.35), residual:Math.round(orig*0.11),
        reason:'Unserviceable', method:'Auction', approval:'Pending', status:'Draft',
        committee:'Condemnation Board \u2014 '+r.dept, buyer:'', auction:'', date:TODAY, value:0,
        remittance:'', attachments:[]});
      logAudit('Stock Return', r.no,'Sent for Disposal','Status','Under Inspection','Closed',reason);
      tblReload('tRet', DB.returns); save();
      toast('Raised disposal proposal <b>'+esc(no)+'</b>.','wa');
    });
}

/* ---------- tool issuance (daily check-out / check-in) ---------- */
SCREENS['inv/tools'] = function(){
  return pageHead('Tool Issuance','Inventory Integration',
    'Daily check-out of returnable tools and equipment to workers, with check-in tracking',
    '<button class="btn gh sm" onclick="tblExport(\'tTool\',\'Tool_Issuance_Register\')">⤓ Export</button>'+
    '<button class="btn pri sm" onclick="toolCheckoutEntry()">+ Check out tool</button>',
    reqTags('MMP_12'))+
  summaryRow([
    {l:'Vouchers', v:DB.toolIssuances.length, c:'#1E5A96'},
    {l:'With workers', v:DB.toolIssuances.filter(function(t){ return t.status==='Issued'; }).length, c:'#B45309'},
    {l:'Returned', v:DB.toolIssuances.filter(function(t){ return t.status==='Returned'; }).length, c:'#15803D'},
    {l:'Overdue', v:DB.toolIssuances.filter(function(t){ return t.status==='Issued' && t.expected < TODAY; }).length, c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tTool', rows:DB.toolIssuances, cols:[
    {h:'Voucher No.', k:'no', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Tool', k:'mat', cls:'mono'},
    {h:'Tool Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Serial No.', k:'serial', cls:'mono'},
    {h:'Store', k:'store'},
    {h:'Worker / Labour', k:'worker'},
    {h:'ID Card', k:'idCard', cls:'mono'},
    {h:'Shift', k:'shift'},
    {h:'Expected Return', k:'expected', f:function(r){
      var overdue = r.status==='Issued' && r.expected < TODAY;
      return (overdue? '<span class="fw6" style="color:#B91C1C">':'')+fdate(r.expected)+(overdue? ' (Overdue)</span>':''); }},
    {h:'Returned On', k:'returnedDate', f:function(r){ return r.returnedDate? fdate(r.returnedDate):'—'; }},
    {h:'Condition', k:'condition'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.status==='Issued'
        ? actIcon('Check in','toolCheckinEntry(\''+r.id+'\')','ok')
        : '<span class="muted">—</span>'; }}
  ], empty:'No tool voucher recorded'})+'</div></div>';
};
function toolCheckoutEntry(){
  var tools = DB.materials.filter(function(m){ return m.isTool || m.cat==='Tools & Equipment'; });
  modal({title:'Check out tool to worker', size:'md',
    body:'<div id="tlForm"><div class="fgrid g2">'+
      fld({id:'tlNo', label:'Voucher number', val:'TOOL/2026/'+pad(100+DB.toolIssuances.length,5), ro:true})+
      fld({id:'tlDate', label:'Issue date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'tlMat', label:'Tool', type:'select', req:true,
           opts:(tools.length?tools:DB.materials).map(function(m){ return {v:m.code, l:m.code+' — '+m.name}; })})+
      fld({id:'tlSerial', label:'Tool serial / asset tag', ph:'e.g. TOOL-SN-4102'})+
      fld({id:'tlQty', label:'Quantity', type:'number', val:1, num:true, req:true, min:1})+
      fld({id:'tlStore', label:'Issuing store', type:'select', opts:STORES, req:true})+
      fld({id:'tlWorker', label:'Worker / labour name', req:true})+
      fld({id:'tlIdCard', label:'Worker ID card no.'})+
      fld({id:'tlShift', label:'Shift', type:'select', blank:false,
           opts:['Morning Shift','Evening Shift','Night Shift']})+
      fld({id:'tlExpected', label:'Expected return date', type:'date', val:TODAY, req:true, date:true})+
      '</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveToolCheckout()">Check out</button>'});
}
async function saveToolCheckout(){
  if(!requireOk('tlForm')) return;
  var matObj = byId(DB.materials,'code', val('tlMat'));
  var storeObj = byId(DB.stores,'store_name', val('tlStore'));
  if(!matObj || !storeObj){ toast('Could not resolve tool or store against the master data.','er'); return; }
  var payload = {item_id: matObj.id, store_id: storeObj.id, tool_serial_code: val('tlSerial')||undefined,
    issued_qty: nval('tlQty')||1, worker_labor_name: val('tlWorker'), worker_id_card: val('tlIdCard')||undefined,
    shift_name: val('tlShift'), expected_return: val('tlExpected')};
  try {
    var res = await fetch(API_BASE+'/inventory/tool-issuances/checkout', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the checkout ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    var rec = {id:created.id, no:created.voucher_no || val('tlNo'), date:val('tlDate'),
      mat:matObj.code, serial:val('tlSerial')||('TOOL-SN-'+created.id), qty:nval('tlQty')||1,
      store:val('tlStore'), worker:val('tlWorker'), idCard:val('tlIdCard')||'—', shift:val('tlShift'),
      expected:val('tlExpected'), returnedQty:0, returnedDate:'', condition:'Working', fine:0,
      status:'Issued', remarks:''};
    DB.toolIssuances.unshift(rec);
    logAudit('Tool Issuance', rec.no,'Checked Out','Worker','—',rec.worker,'Daily tool check-out');
    closeModal(); save();
    toast('Checked out tool <b>'+esc(rec.no)+'</b> to '+esc(rec.worker)+' in PostgreSQL (id '+created.id+').','ok');
    goto('inv/tools');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function toolCheckinEntry(id){
  var t = byId(DB.toolIssuances,'id',id);
  modal({title:'Check in tool — '+esc(t.no), size:'md',
    body:'<table class="kv" style="margin-bottom:11px">'+
      kvRow('Tool', esc(mname(t.mat))+' <span class="muted">('+esc(t.mat)+')</span>')+
      kvRow('Issued to', esc(t.worker)+' — '+esc(t.idCard))+
      kvRow('Expected return', fdate(t.expected))+'</table>'+
    '<div id="tiForm"><div class="fgrid g2">'+
      fld({id:'tiCond', label:'Condition on return', type:'select', blank:false,
           opts:['Good / Inspected','Minor Damage','Major Damage / Unserviceable']})+
      fld({id:'tiFine', label:'Fine / damage amount (₹)', type:'number', val:0, num:true, min:0})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'tiRemarks', label:'Remarks', type:'textarea', rows:2})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveToolCheckin(\''+id+'\')">Check in</button>'});
}
async function saveToolCheckin(id){
  var t = byId(DB.toolIssuances,'id',id);
  var payload = {tool_condition: val('tiCond'), remarks: val('tiRemarks')||undefined};
  try {
    var res = await fetch(API_BASE+'/inventory/tool-issuances/'+t.id+'/checkin', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the check-in ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
  }
  t.returnedQty = t.qty; t.returnedDate = TODAY; t.condition = val('tiCond'); t.fine = nval('tiFine')||0;
  t.status = 'Returned';
  logAudit('Tool Issuance', t.no,'Checked In','Condition','Working', t.condition, val('tiRemarks'));
  closeModal(); save();
  tblReload('tTool', DB.toolIssuances);
  commit('Checked in tool <b>'+esc(t.no)+'</b> from '+esc(t.worker)+' in PostgreSQL.','ok');
}

/* ---------- reorder planning ---------- */
SCREENS['inv/reorder'] = function(){
  var rows = DB.stock.filter(function(s){ return s.avail < mreorder(s.mat); })
    .map(function(s,i){
      var ro = mreorder(s.mat), m = byId(DB.materials,'code',s.mat) || {reorderQty:ro*2, leadTime:21};
      var openPo = sum(DB.workorders.filter(function(w){
        return w.lines && w.lines[0] && w.lines[0].mat===s.mat && ['Issued','Approved','Delayed'].indexOf(w.status)>=0; }),
        function(w){ return w.lines[0].qty - w.delivered; });
      return {id:'RO'+i, mat:s.mat, store:s.store, avail:s.avail, reorder:ro,
        shortfall: Math.max(0, ro - s.avail), openPo:openPo,
        suggest: Math.max(0, (m.reorderQty||ro*2) - openPo), lead:m.leadTime||21,
        rate:s.rate, state: stockState(s)};
    });
  return pageHead('Reorder Planning','Inventory Integration',
    'Materials at or below reorder level, with open order coverage and suggested reorder quantity',
    '<button class="btn gh sm" onclick="tblExport(\'tRo\',\'Reorder_Planning\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="reorderToRequisition()">Raise requisition for selected</button>',
    reqTags('MMP_13','MMP_18'))+
  summaryRow([
    {l:'Materials to reorder', v:rows.length, c:'#B45309'},
    {l:'At stock-out', v:rows.filter(function(r){ return r.avail===0; }).length, c:'#B91C1C'},
    {l:'Covered by open orders', v:rows.filter(function(r){ return r.openPo >= r.shortfall && r.shortfall>0; }).length, c:'#15803D'},
    {l:'Indicative reorder value', v:inr0(sum(rows, function(r){ return r.suggest*r.rate; })), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRo', rows:rows, select:true, cols:[
    {h:'Material Code', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Store', k:'store'},
    {h:'Available', k:'avail', cls:'num', f:function(r){ return '<b style="color:'+(r.avail?'#B45309':'#B91C1C')+'">'+num(r.avail)+'</b>'; }},
    {h:'Reorder Level', k:'reorder', cls:'num', f:function(r){ return num(r.reorder); }},
    {h:'Shortfall', k:'shortfall', cls:'num', f:function(r){ return num(r.shortfall); }},
    {h:'Open Order Qty', k:'openPo', cls:'num', f:function(r){ return num(r.openPo); }},
    {h:'Suggested Reorder', k:'suggest', cls:'num', f:function(r){ return '<b>'+num(r.suggest)+'</b>'; }},
    {h:'Lead Time (days)', k:'lead', cls:'num'},
    {h:'Rate', k:'rate', cls:'num', f:function(r){ return inr(r.rate); }},
    {h:'Indicative Value', k:'v', cls:'num', f:function(r){ return inr(r.suggest*r.rate); }, sv:function(r){ return r.suggest*r.rate; }},
    {h:'Status', k:'state', f:function(r){ return badge(r.state); }},
    {h:'Coverage', k:'cov', f:function(r){
      return r.openPo >= r.shortfall && r.shortfall>0
        ? '<span class="bdg b-ok">Covered by open order</span>'
        : '<span class="bdg b-er">Procurement needed</span>'; }}
  ], empty:'Every material is at or above its reorder level'})+'</div></div>';
};
function reorderToRequisition(){
  var sel = tblRows('tRo');
  if(!sel.length){ toast('Select at least one material to raise a requisition.','wa'); return; }
  var value = sum(sel, function(r){ return r.suggest*r.rate; });
  confirmAct({title:'Raise replenishment requisition', ok:'Raise requisition', btnClass:'pri', reason:true,
    message:'A single requisition is raised covering '+sel.length+' material line(s) worth <b>'+inr(value)+'</b>.'},
    async function(reason){
      var storeObj = byId(DB.stores,'store_name', STORES[0]);
      var payloadLines = [];
      for(var i=0;i<sel.length;i++){
        var r = sel[i];
        var matObj = byId(DB.materials,'code', r.mat);
        if(!matObj){ toast('Could not resolve material "'+esc(r.mat)+'" against the master data.','er'); return; }
        payloadLines.push({item_id: matObj.id, requested_qty: r.suggest, est_unit_rate: r.rate, preferred_make:'', technical_spec: matObj.spec||''});
      }
      var payload = {req_date: TODAY, store_id: storeObj.id, priority:'Urgent',
        purpose:'Replenishment against reorder level. '+reason, lines: payloadLines};
      var created;
      try {
        var res = await fetch(API_BASE+'/requisitions/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the requisition ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        created = await res.json();
      } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
      var no = created.req_no || seq('MR/DIT/2026/', DB.requisitions,'no',6);
      DB.requisitions.unshift({
        id:created.id, no:no, date:TODAY, dept:DEPTS[0], office:'Head Office', section:'Store Section',
        requestor:'Anil Katwale',
        lines: sel.map(function(r){
          return {mat:r.mat, desc:mname(r.mat), qty:r.suggest, uom:muom(r.mat), rate:r.rate,
                  make:'', spec:(byId(DB.materials,'code',r.mat)||{spec:''}).spec};
        }),
        value: value, budget:'Pending', stockAvail:'Not Available', priority:'Urgent',
        status:'Submitted', approver:'Head of Office', location:STORES[0],
        requiredBy: addDays(TODAY,30), purpose:'Replenishment against reorder level. '+reason,
        coa:COA[0], fund:FUNDS[0], scheme:SCHEMES[0], project:PROJECTS[0], costCentre:COST_CENTRES[0],
        availBudget:0, mode:'GeM', attachments:[]
      });
      logAudit('Requisition', no,'Submitted','Status','\u2014','Submitted','Replenishment against reorder level');
      notify('wa','Replenishment requisition '+no,'Raised for '+sel.length+' material(s) below reorder level','req/approvals');
      save(); refreshNavCounts();
      toast('Raised replenishment requisition <b>'+esc(no)+'</b> in PostgreSQL (id '+created.id+').','ok');
      goto('req/list');
    });
}

/* ============================ BILLING AND FINANCE INTERFACE ============================ */
function matchResult(inv){
  var w = byId(DB.workorders,'no',inv.wo);
  var g = DB.grns.filter(function(x){ return x.no===inv.grn; })[0];
  var lines = [];
  var orderQty = w? sum(w.lines,'qty') : 0;
  var orderRate = w? w.lines[0].rate : 0;
  var grnQty = g? g.accepted : 0;
  var invQty = orderRate? Math.round(inv.amount / (orderRate*1.18)) : 0;
  lines.push({f:'Quantity', po:orderQty, grn:grnQty, inv:invQty,
    ok: grnQty===invQty});
  lines.push({f:'Rate', po:orderRate, grn:orderRate, inv: invQty? Math.round(inv.amount/(invQty*1.18)) : 0,
    ok: !invQty || Math.abs(Math.round(inv.amount/(invQty*1.18)) - orderRate) <= Math.max(1, orderRate*0.01)});
  lines.push({f:'Value', po: w? w.value:0, grn: Math.round(grnQty*orderRate*1.18), inv: inv.amount,
    ok: w? Math.abs(inv.amount - Math.round(grnQty*orderRate*1.18)) <= Math.max(1, inv.amount*0.02) : false});
  return {lines:lines, ok: lines.every(function(l){ return l.ok; }), wo:w, grn:g};
}
SCREENS['billing/invoice'] = function(){
  var rows = DB.invoices;
  return pageHead('Invoice Register','Billing and Finance Interface',
    'Vendor invoices with three-way match status, deductions and payment position',
    '<button class="btn gh sm" onclick="tblExport(\'tInv\',\'Invoice_Register\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="invoiceEntry()">+ Record invoice</button>',
    reqTags('MMP_14','MMP_15'))+
  summaryRow([
    {l:'Invoices', v:rows.length, c:'#1E5A96'},
    {l:'Matched', v:rows.filter(function(i){ return i.status==='Matched'; }).length, c:'#15803D'},
    {l:'Exceptions', v:rows.filter(function(i){ return i.status==='Exception'; }).length, c:'#B91C1C'},
    {l:'Invoice value', v:inr0(sum(rows,'amount')), c:'#0F766E'}
  ])+
  filterBar([
    fld({id:'fiNo', label:'Invoice number', ph:'INV/'}),
    fld({id:'fiVendor', label:'Vendor', type:'select', opts:DB.vendors.map(function(v){ return {v:v.party_code,l:v.party_name}; }), blank:'All'}),
    fld({id:'fiStatus', label:'Match status', type:'select', opts:['Matched','Exception','Pending','Rejected'], blank:'All'}),
    fld({id:'fiPay', label:'Payment status', type:'select', opts:['Pending','Paid'], blank:'All'})
  ], 'applyInvFilter()',
    '<button class="btn sm" onclick="resetInvFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tInv', rows:rows, cols:[
    {h:'Invoice No.', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewInvoice(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
    {h:'Vendor Invoice', k:'vinv', cls:'mono'},
    {h:'Invoice Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Received On', k:'recd', f:function(r){ return fdate(r.recd); }},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'GRN', k:'grn', cls:'mono'},
    {h:'Invoice Amount', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
    {h:'Matched Amount', k:'matched', cls:'num', f:function(r){ return r.matched? inr(r.matched):'\u2014'; }},
    {h:'Exception Amount', k:'exception', cls:'num', f:function(r){ return r.exception? '<b style="color:#B91C1C">'+inr(r.exception)+'</b>':'\u2014'; }},
    {h:'Match Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Finance Status', k:'finance', f:function(r){ return badge(r.finance); }},
    {h:'Payment', k:'payment', f:function(r){ return badge(r.payment); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('View','viewInvoice(\''+r.id+'\')')+
      actIcon('Match','runMatch(\''+r.id+'\')','sec')+
      (r.status==='Matched' && r.finance!=='Approved'? actIcon('Send to finance','sendToFinance(\''+r.id+'\')','ok'):'')+
      (r.status==='Exception'? actIcon('Resolve','resolveException(\''+r.id+'\')','warn'):''); }}
  ], empty:'No invoice recorded'})+'</div></div>';
};
function applyInvFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.invoices.filter(function(i){
    return (!f('fiNo') || i.no.toLowerCase().indexOf(f('fiNo').toLowerCase())>=0) &&
      (!f('fiVendor') || i.vendor===f('fiVendor')) &&
      (!f('fiStatus') || i.status===f('fiStatus')) &&
      (!f('fiPay') || i.payment===f('fiPay'));
  });
  tblReload('tInv', rows);
  toast(rows.length+' invoice(s) matched.', rows.length?'ok':'wa');
}
function resetInvFilter(){
  ['fiNo','fiVendor','fiStatus','fiPay'].forEach(function(i){ setVal(i,''); });
  tblReload('tInv', DB.invoices); toast('Filters cleared.','in');
}
function invoiceEntry(){
  var grns = DB.grns.filter(function(g){ return g.posting==='Posted'; });
  modal({title:'Record vendor invoice', size:'md',
    body:'<div id="ivForm"><div class="fgrid g2">'+
      fld({id:'ivNo', label:'Invoice number', val:'INV/2026/'+pad(1915+DB.invoices.length*5,6), ro:true})+
      fld({id:'ivVinv', label:'Vendor invoice number', req:true, ph:'VI-2026-'})+
      fld({id:'ivDate', label:'Invoice date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'ivRecd', label:'Received on', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'ivGrn', label:'GRN reference', type:'select', req:true,
           opts:grns.map(function(g){ return g.no; }), onchange:'ivFromGrn()'})+
      fld({id:'ivWo', label:'Work order', ro:true})+
      fld({id:'ivVendor', label:'Vendor', ro:true})+
      fld({id:'ivAmount', label:'Invoice amount (\u20B9)', type:'number', val:0, num:true, req:true, onchange:'ivCalc()'})+
      fld({id:'ivRet', label:'Retention (%)', type:'number', val:5, num:true, onchange:'ivCalc()'})+
      fld({id:'ivTds', label:'Income tax TDS (%)', type:'number', val:2, num:true, onchange:'ivCalc()'})+
      fld({id:'ivGst', label:'GST TDS (%)', type:'number', val:2, num:true, onchange:'ivCalc()'})+
      fld({id:'ivLd', label:'Liquidated damages (\u20B9)', type:'number', val:0, num:true, onchange:'ivCalc()'})+
      '</div><div id="ivCalcOut" style="margin-top:11px"></div>'+
      '<div style="margin-top:11px">'+attachWidget('ivAtt',[])+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveInvoice()">Record invoice and run match</button>',
    onMount: function(){ ivFromGrn(); }});
}
function ivFromGrn(){
  var g = byId(DB.grns,'no',val('ivGrn'));
  if(!g) return;
  var w = byId(DB.workorders,'no',g.wo) || {lines:[{rate:0}], due:TODAY, value:0};
  setVal('ivWo', g.wo); setVal('ivVendor', vname(g.vendor));
  setVal('ivAmount', Math.round(g.accepted * w.lines[0].rate * 1.18));
  var late = Math.max(0, daysBetween(w.due, g.date));
  setVal('ivLd', late>0 ? Math.min(Math.round(w.value*0.10), Math.round(w.value*0.005*Math.ceil(late/7))) : 0);
  ivCalc();
}
function ivCalc(){
  var out = document.getElementById('ivCalcOut'); if(!out) return;
  var amt = nval('ivAmount');
  var ret = Math.round(amt*nval('ivRet')/100);
  var tds = Math.round(amt*nval('ivTds')/100);
  var gst = Math.round(amt*nval('ivGst')/100);
  var ld = nval('ivLd');
  var net = amt - ret - tds - gst - ld;
  out.innerHTML = '<div class="grid g4" style="margin-bottom:8px">'+
    [['Invoice amount', inr(amt)],['Retention', '-'+inr(ret)],['TDS + GST TDS','-'+inr(tds+gst)],['Liquidated damages','-'+inr(ld)]]
    .map(function(x){ return '<div class="scard"><div class="l">'+x[0]+'</div><div class="v" style="font-size:13px">'+x[1]+'</div></div>'; }).join('')+
    '</div><div class="note '+(net>0?'ok':'er')+'">Net payable to the vendor: <b>'+inr(net)+'</b>'+
    (ld>0? ' after liquidated damages of '+inr(ld)+' for delayed delivery':'')+'.</div>';
}
async function saveInvoice(){
  if(!requireOk('ivForm')) return;
  var g = byId(DB.grns,'no',val('ivGrn'));
  if(!g){ toast('Select a valid GRN before saving.','er'); return; }
  var amt = nval('ivAmount');
  if(amt<=0){ toast('Invoice amount must be greater than zero.','er'); return; }
  var woObj = byId(DB.workorders,'no', g.wo);
  if(!woObj){ toast('Could not resolve the linked work order against the master data.','er'); return; }
  var rec = {id:uid('N'), no:val('ivNo'), vinv:val('ivVinv'), date:val('ivDate'), recd:val('ivRecd'),
    vendor:g.vendor, wo:g.wo, grn:g.no, amount:amt, matched:0, exception:0,
    ld:nval('ivLd'), retention:Math.round(amt*nval('ivRet')/100),
    tds:Math.round(amt*nval('ivTds')/100), gstTds:Math.round(amt*nval('ivGst')/100),
    status:'Pending', finance:'Under Review', payment:'Pending', billNo:'', utr:'',
    remarks:'', attachments:attList('ivAtt')};
  var payload = {vendor_inv_no: rec.vinv, vendor_inv_date: rec.date, wo_id: woObj.id, grn_id: g.id, basic_amount: amt, tax_amount: 0};
  try {
    var res = await fetch(API_BASE+'/billing/invoices', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the invoice ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.inv_no || rec.no; rec.status = 'Matched';
    DB.invoices.unshift(rec);
    logAudit('Invoice', rec.no,'Recorded','Status','\u2014','Pending','Vendor invoice '+rec.vinv+' received');
    closeModal(); save(); refreshNavCounts();
    toast('Recorded invoice <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+'). Three-way match run by the backend.','ok');
    goto('billing/invoice');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function viewInvoice(id){
  var i = byId(DB.invoices,'id',id);
  var net = i.amount - i.retention - i.tds - i.gstTds - i.ld;
  modal({title:'Invoice '+esc(i.no), size:'lg',
    body: tabsHtml('vi',['Invoice details','Deductions','Three-way match','Audit'])+
      pane('vi',0,'<div class="grid g2"><table class="kv">'+
        kvRow('Invoice number','<span class="mono">'+esc(i.no)+'</span>')+
        kvRow('Vendor invoice','<span class="mono">'+esc(i.vinv)+'</span>')+
        kvRow('Invoice date', fdate(i.date))+kvRow('Received on', fdate(i.recd))+
        kvRow('Vendor', esc(vname(i.vendor)))+'</table>'+
        '<table class="kv">'+kvRow('Work order','<span class="mono">'+esc(i.wo)+'</span>')+
        kvRow('GRN','<span class="mono">'+esc(i.grn)+'</span>')+
        kvRow('Invoice amount','<b>'+inr(i.amount)+'</b>')+
        kvRow('Match status', badge(i.status))+kvRow('Finance status', badge(i.finance))+
        kvRow('Payment status', badge(i.payment))+'</table></div>')+
      pane('vi',1,'<table class="kv">'+
        kvRow('Invoice amount', inr(i.amount))+
        kvRow('Retention', '-'+inr(i.retention))+
        kvRow('Income tax TDS','-'+inr(i.tds))+
        kvRow('GST TDS','-'+inr(i.gstTds))+
        kvRow('Liquidated damages', i.ld? '<b style="color:#B91C1C">-'+inr(i.ld)+'</b>':'Nil')+
        kvRow('Net payable','<b>'+inr(net)+'</b>')+
        kvRow('Bill number', i.billNo? '<span class="mono">'+esc(i.billNo)+'</span>':'Not generated')+
        kvRow('UTR', i.utr? '<span class="mono">'+esc(i.utr)+'</span>':'Not paid')+'</table>')+
      pane('vi',2, matchPanel(i))+
      pane('vi',3, auditTableHtml(DB.trail.filter(function(t){ return t.ref===i.no; }))),
    footer:'<button class="btn gh" onclick="runMatch(\''+i.id+'\')">Run match</button>'+
      (i.status==='Matched' && i.finance!=='Approved'? '<button class="btn ok" onclick="sendToFinance(\''+i.id+'\')">Send to finance</button>':'')+
      '<button class="btn" data-close>Close</button>'});
}
function matchPanel(i){
  var m = matchResult(i);
  return '<div class="match-3">'+
    [['Purchase Order','#123B64','po'],['Goods Receipt','#0F766E','grn'],['Vendor Invoice','#B45309','inv']]
    .map(function(col){
      return '<div class="p"><div class="h" style="background:'+col[1]+'">'+col[0]+'</div>'+
        '<table class="kv">'+m.lines.map(function(l){
          var v = l[col[2]];
          return kvRow(l.f, (l.f==='Quantity'? num(v) : inr(v)));
        }).join('')+'</table></div>';
    }).join('')+'</div>'+
    '<div style="margin-top:12px">'+m.lines.map(function(l){
      return '<div class="rag"><span class="s" style="background:'+(l.ok?'#15803D':'#B91C1C')+'">'+(l.ok?'\u2713':'!')+'</span>'+
      '<span class="grow">'+esc(l.f)+' comparison</span>'+
      '<span class="bdg '+(l.ok?'b-ok':'b-er')+'">'+(l.ok?'Matched':'Mismatch')+'</span></div>';
    }).join('')+'</div>'+
    '<div class="note '+(m.ok?'ok':'er')+'" style="margin-top:11px">'+
    (m.ok ? '<b>Three-way match passed.</b> The invoice agrees with the order and the accepted receipt within tolerance.'
          : '<b>Three-way match failed.</b> Resolve the mismatch, or record a deviation with the approval of the competent authority, before the bill goes to finance.')+
    '</div>';
}
SCREENS['billing/match'] = function(){
  var rows = DB.invoices;
  return pageHead('Three-Way Matching','Billing and Finance Interface',
    'Purchase order, goods receipt and vendor invoice reconciliation with tolerance checks',
    '<button class="btn sec sm" onclick="runAllMatches()">\u26A1 Run match on all pending</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tMtch\',\'Three_Way_Match\')">\u2913 Export</button>',
    reqTags('MMP_14'))+
  summaryRow([
    {l:'Invoices under match', v:rows.length, c:'#1E5A96'},
    {l:'Passed', v:rows.filter(function(i){ return i.status==='Matched'; }).length, c:'#15803D'},
    {l:'Failed', v:rows.filter(function(i){ return i.status==='Exception'; }).length, c:'#B91C1C'},
    {l:'Exception value', v:inr0(sum(rows,'exception')), c:'#B45309'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tMtch', rows:rows, cols:[
    {h:'Invoice', k:'no', cls:'mono'},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'GRN', k:'grn', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Order Value', k:'ov', cls:'num', f:function(r){ var w=byId(DB.workorders,'no',r.wo); return inr(w?w.value:0); }},
    {h:'Accepted Value', k:'av', cls:'num', f:function(r){
      var g=byId(DB.grns,'no',r.grn), w=byId(DB.workorders,'no',r.wo);
      return inr(g&&w? Math.round(g.accepted*w.lines[0].rate*1.18):0); }},
    {h:'Invoice Value', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
    {h:'Variance', k:'var', cls:'num', f:function(r){
      var g=byId(DB.grns,'no',r.grn), w=byId(DB.workorders,'no',r.wo);
      var acc = g&&w? Math.round(g.accepted*w.lines[0].rate*1.18):0;
      var d = r.amount-acc;
      return d? '<b style="color:'+(d>0?'#B91C1C':'#B45309')+'">'+inr(d)+'</b>':'Nil'; }},
    {h:'Match Result', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Detail','matchDetail(\''+r.id+'\')','gh')+
      actIcon('Run match','runMatch(\''+r.id+'\')','sec')+
      (r.status==='Exception'? actIcon('Resolve','resolveException(\''+r.id+'\')','warn'):''); }}
  ], empty:'No invoice awaiting match'})+'</div></div>';
};
function matchDetail(id){
  var i = byId(DB.invoices,'id',id);
  modal({title:'Three-way match \u2014 '+esc(i.no), size:'lg', body: matchPanel(i)});
}
function runMatch(id){
  var i = byId(DB.invoices,'id',id);
  toast('<span class="spin"></span> Running the three-way match for '+esc(i.no)+'&hellip;','in',1400);
  setTimeout(function(){
    var m = matchResult(i);
    var g = byId(DB.grns,'no',i.grn), w = byId(DB.workorders,'no',i.wo);
    var acc = (g&&w)? Math.round(g.accepted*w.lines[0].rate*1.18) : 0;
    var old = i.status;
    if(m.ok){ i.status='Matched'; i.matched = i.amount; i.exception = 0; }
    else { i.status='Exception'; i.matched = Math.min(i.amount, acc); i.exception = Math.abs(i.amount - acc); }
    logAudit('Invoice', i.no, m.ok? 'Match Passed':'Exception Raised','Bill Status', old, i.status,
      m.ok? 'Order, receipt and invoice agree within tolerance' : 'Variance of '+inr(i.exception)+' against the accepted receipt');
    if(!m.ok) notify('er','Invoice '+i.no+' raised as exception','Variance of '+inr(i.exception)+' against the accepted receipt','billing/match');
    save();
    ['tInv','tMtch'].forEach(function(t){ if(TBL[t]) tblReload(t, DB.invoices); });
    refreshNavCounts();
    toast(m.ok? 'Three-way match passed for <b>'+esc(i.no)+'</b>.'
              : 'Match failed for <b>'+esc(i.no)+'</b> \u2014 variance '+inr(i.exception)+'.', m.ok?'ok':'er');
  }, 1200);
}
function runAllMatches(){
  var pend = DB.invoices.filter(function(i){ return i.status==='Pending' || i.status==='Exception'; });
  if(!pend.length){ toast('No invoice is awaiting a match.','ok'); return; }
  confirmAct({title:'Run match on all pending invoices', ok:'Run '+pend.length+' match(es)', btnClass:'sec',
    kind:'in', message:'The three-way match runs against <b>'+pend.length+'</b> invoice(s).'},
    function(){
      var passed = 0;
      pend.forEach(function(i){
        var m = matchResult(i);
        var g = byId(DB.grns,'no',i.grn), w = byId(DB.workorders,'no',i.wo);
        var acc = (g&&w)? Math.round(g.accepted*w.lines[0].rate*1.18) : 0;
        var old = i.status;
        if(m.ok){ i.status='Matched'; i.matched=i.amount; i.exception=0; passed++; }
        else { i.status='Exception'; i.matched=Math.min(i.amount,acc); i.exception=Math.abs(i.amount-acc); }
        logAudit('Invoice', i.no, m.ok?'Match Passed':'Exception Raised','Bill Status',old,i.status,'Batch match run');
      });
      ['tInv','tMtch'].forEach(function(t){ if(TBL[t]) tblReload(t, DB.invoices); });
      commit(passed+' of '+pend.length+' invoice(s) passed the three-way match.', passed===pend.length?'ok':'wa');
    });
}
function resolveException(id){
  var i = byId(DB.invoices,'id',id);
  modal({title:'Resolve matching exception \u2014 '+esc(i.no), size:'md',
    body:'<div id="exFm"><div class="note er" style="margin-bottom:11px">Variance of <b>'+inr(i.exception)+
      '</b> between the invoice and the accepted receipt value.</div>'+
      '<div class="fgrid g2">'+
      fld({id:'exAct', label:'Resolution', type:'select', req:true, blank:false,
           opts:['Accept invoice with deviation approval','Restrict payment to accepted value',
                 'Return invoice to vendor for revision','Recover from vendor security']})+
      fld({id:'exAuth', label:'Approving authority', type:'select', blank:false,
           opts:['Finance Wing','Head of Office','Head of Department','Chief Accounts Officer']})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'exNote', label:'Justification', type:'textarea', rows:3, req:true,
           ph:'Reason for the resolution, recorded in the audit trail'})+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveResolution(\''+id+'\')">Record resolution</button>'});
}
function saveResolution(id){
  if(!requireOk('exFm')) return;
  var i = byId(DB.invoices,'id',id);
  var act = val('exAct'), old = i.status;
  if(act==='Accept invoice with deviation approval'){ i.status='Matched'; i.matched=i.amount; i.exception=0; i.finance='Under Review'; }
  else if(act==='Restrict payment to accepted value'){ i.status='Matched'; i.amount=i.matched; i.exception=0; i.finance='Under Review'; }
  else if(act==='Return invoice to vendor for revision'){ i.status='Rejected'; i.finance='Returned'; }
  else { i.status='Matched'; i.finance='Under Review'; }
  i.remarks = val('exNote');
  logAudit('Invoice', i.no,'Exception Resolved','Bill Status', old, i.status, act+' \u2014 '+val('exNote'));
  closeAllModals(); save();
  ['tInv','tMtch'].forEach(function(t){ if(TBL[t]) tblReload(t, DB.invoices); });
  refreshNavCounts();
  toast('Exception on <b>'+esc(i.no)+'</b> resolved: '+esc(act.toLowerCase())+'.','ok');
}
function sendToFinance(id){
  var i = byId(DB.invoices,'id',id);
  if(i.status!=='Matched'){ toast('Only a matched invoice can be sent to finance.','wa'); return; }
  confirmAct({title:'Send bill to finance', ok:'Send to finance', btnClass:'ok', reason:true,
    message:'A bill is generated and passed to the IFMS expenditure module for payment processing.',
    detail: kvRow('Invoice', esc(i.no))+kvRow('Vendor', esc(vname(i.vendor)))+
            kvRow('Net payable', inr(i.amount - i.retention - i.tds - i.gstTds - i.ld))},
    async function(reason){
      try {
        var sanRes = await fetch(API_BASE+'/billing/invoices/'+i.id+'/generate-sanction', {method:'POST'});
        if(!sanRes.ok){ var e1 = await sanRes.text(); toast('Send failed: sanction generation rejected ('+sanRes.status+'). '+esc(e1.slice(0,150)),'er'); return; }
        var sanData = await sanRes.json();
        var treRes = await fetch(API_BASE+'/billing/invoices/'+i.id+'/send-to-treasury', {method:'POST'});
        if(!treRes.ok){ var e2 = await treRes.text(); toast('Send failed: treasury submission rejected ('+treRes.status+'). '+esc(e2.slice(0,150)),'er'); return; }
        i.finance = 'Approved';
        i.billNo = sanData.sanction_no || ('BILL/2026/'+pad(920+DB.invoices.length,4));
        logAudit('Invoice', i.no,'Sent to Finance','Finance Status','Under Review','Approved',reason);
        notify('in','Bill '+i.billNo+' sent to finance','For '+vname(i.vendor)+' against '+i.wo,'billing/payment');
        closeAllModals(); save();
        ['tInv','tMtch','tBill'].forEach(function(t){ if(TBL[t]) tblReload(t, DB.invoices); });
        refreshNavCounts();
        commit('Bill <b>'+esc(i.billNo)+'</b> generated and sent to finance in PostgreSQL.','ok');
      } catch(err) {
        toast('Send failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
      }
    });
}

/* ---------- bill initiation ---------- */
SCREENS['billing/initiate'] = function(){
  var rows = DB.invoices.filter(function(i){ return i.status==='Matched'; });
  return pageHead('Bill Initiation','Billing and Finance Interface',
    'Matched invoices ready for bill generation and transfer to the IFMS expenditure module',
    '<button class="btn ok sm" onclick="bulkSendFinance()">\u2713 Send selected to finance</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tBill\',\'Bill_Initiation\')">\u2913 Export</button>',
    reqTags('MMP_15'))+
  summaryRow([
    {l:'Ready for billing', v:rows.filter(function(i){ return i.finance!=='Approved'; }).length, c:'#B45309'},
    {l:'Bills generated', v:rows.filter(function(i){ return !!i.billNo; }).length, c:'#15803D'},
    {l:'Gross value', v:inr0(sum(rows,'amount')), c:'#1E5A96'},
    {l:'Total deductions', v:inr0(sum(rows, function(i){ return i.retention+i.tds+i.gstTds+i.ld; })), c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tBill', rows:rows, select:true, cols:[
    {h:'Invoice', k:'no', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Invoice Amount', k:'amount', cls:'num', f:function(r){ return inr(r.amount); }},
    {h:'Retention', k:'retention', cls:'num', f:function(r){ return inr(r.retention); }},
    {h:'TDS', k:'tds', cls:'num', f:function(r){ return inr(r.tds); }},
    {h:'GST TDS', k:'gstTds', cls:'num', f:function(r){ return inr(r.gstTds); }},
    {h:'Liquidated Damages', k:'ld', cls:'num', f:function(r){ return r.ld? inr(r.ld):'Nil'; }},
    {h:'Net Payable', k:'net', cls:'num',
      f:function(r){ return '<b>'+inr(r.amount-r.retention-r.tds-r.gstTds-r.ld)+'</b>'; },
      sv:function(r){ return r.amount-r.retention-r.tds-r.gstTds-r.ld; }},
    {h:'Bill Number', k:'billNo', cls:'mono'},
    {h:'Finance Status', k:'finance', f:function(r){ return badge(r.finance); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.finance!=='Approved'? actIcon('Send to finance','sendToFinance(\''+r.id+'\')','ok')
        : actIcon('View bill','viewInvoice(\''+r.id+'\')','gh'); }}
  ], empty:'No matched invoice is ready for billing'})+'</div></div>';
};
function bulkSendFinance(){
  var sel = tblRows('tBill').filter(function(i){ return i.finance!=='Approved'; });
  if(!sel.length){ toast('Select at least one matched invoice that has not gone to finance.','wa'); return; }
  var net = sum(sel, function(i){ return i.amount-i.retention-i.tds-i.gstTds-i.ld; });
  confirmAct({title:'Send '+sel.length+' bill(s) to finance', ok:'Send to finance', btnClass:'ok', reason:true,
    message:'Bills worth a net <b>'+inr(net)+'</b> are passed to the expenditure module.'},
    async function(reason){
      var n=0, failed=0;
      for(var k=0;k<sel.length;k++){
        var i = sel[k];
        try {
          var sanRes = await fetch(API_BASE+'/billing/invoices/'+i.id+'/generate-sanction', {method:'POST'});
          if(!sanRes.ok) throw new Error('sanction rejected ('+sanRes.status+')');
          var sanData = await sanRes.json();
          var treRes = await fetch(API_BASE+'/billing/invoices/'+i.id+'/send-to-treasury', {method:'POST'});
          if(!treRes.ok) throw new Error('treasury submission rejected ('+treRes.status+')');
          i.finance='Approved';
          i.billNo = sanData.sanction_no || ('BILL/2026/'+pad(930+DB.invoices.length+k,4));
          logAudit('Invoice', i.no,'Sent to Finance','Finance Status','Under Review','Approved',reason);
          n++;
        } catch(err) { failed++; }
      }
      tblReload('tBill', DB.invoices.filter(function(i){ return i.status==='Matched'; }));
      refreshNavCounts();
      commit('Sent '+n+' bill(s) to finance in PostgreSQL'+(failed? '; '+failed+' failed':'')+'.', failed?'wa':'ok');
    });
}

/* ---------- payment status ---------- */
SCREENS['billing/payment'] = function(){
  var rows = DB.invoices.filter(function(i){ return !!i.billNo; });
  return pageHead('Payment Status','Billing and Finance Interface',
    'Payment position of bills passed to the IFMS expenditure and payment module',
    '<button class="btn gh sm" onclick="simulateSync()">\u21BB Refresh from finance</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tPay\',\'Payment_Status\')">\u2913 Export</button>',
    reqTags('MMP_15'))+
  summaryRow([
    {l:'Bills with finance', v:rows.length, c:'#1E5A96'},
    {l:'Paid', v:rows.filter(function(i){ return i.payment==='Paid'; }).length, c:'#15803D'},
    {l:'Awaiting payment', v:rows.filter(function(i){ return i.payment!=='Paid'; }).length, c:'#B45309'},
    {l:'Amount paid', v:inr0(sum(rows.filter(function(i){ return i.payment==='Paid'; }),
      function(i){ return i.amount-i.retention-i.tds-i.gstTds-i.ld; })), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tPay', rows:rows, cols:[
    {h:'Bill Number', k:'billNo', cls:'mono'},
    {h:'Invoice', k:'no', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'Net Payable', k:'net', cls:'num',
      f:function(r){ return inr(r.amount-r.retention-r.tds-r.gstTds-r.ld); },
      sv:function(r){ return r.amount-r.retention-r.tds-r.gstTds-r.ld; }},
    {h:'Finance Status', k:'finance', f:function(r){ return badge(r.finance); }},
    {h:'Payment Status', k:'payment', f:function(r){ return badge(r.payment); }},
    {h:'UTR / Reference', k:'utr', cls:'mono'},
    {h:'Ageing (days)', k:'age', cls:'num', f:function(r){
      var d = daysBetween(r.recd, TODAY);
      return r.payment==='Paid'? '\u2014' : '<span style="'+(d>30?'color:#B91C1C;font-weight:700':'')+'">'+d+'</span>'; },
      sv:function(r){ return r.payment==='Paid'?0:daysBetween(r.recd,TODAY); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.payment!=='Paid'? actIcon('Record payment','recordPayment(\''+r.id+'\')','ok')
        : actIcon('View','viewInvoice(\''+r.id+'\')','gh'); }}
  ], empty:'No bill has been passed to finance yet'})+'</div></div>';
};
function recordPayment(id){
  var i = byId(DB.invoices,'id',id);
  var net = i.amount-i.retention-i.tds-i.gstTds-i.ld;
  confirmAct({title:'Record payment', ok:'Record payment', btnClass:'ok', reason:true,
    message:'Payment of <b>'+inr(net)+'</b> to '+esc(vname(i.vendor))+' is recorded against bill '+esc(i.billNo)+'.'},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/billing/invoices/'+i.id+'/payment-update', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})});
        if(!res.ok){ var e = await res.text(); toast('Payment failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        var created = await res.json();
        i.payment='Paid';
        i.utr = created.utr_number || ('UTR'+pad(560000+DB.invoices.length*37,9));
        logAudit('Invoice', i.no,'Paid','Payment Status','Pending','Paid',reason+' \u2014 UTR '+i.utr);
        tblReload('tPay', DB.invoices.filter(function(x){ return !!x.billNo; }));
        refreshNavCounts();
        commit('Payment recorded in PostgreSQL. UTR <b>'+esc(i.utr)+'</b>.','ok');
      } catch(err) {
        toast('Payment failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
      }
    });
}

/* ============================ WARRANTY AND DEFECTS ============================ */
function warrState(w){
  var d = daysBetween(TODAY, w.end);
  return d < 0 ? 'Expired' : (d <= 90 ? 'Expiring Soon' : 'Active');
}
SCREENS['warranty/list'] = function(){
  var rows = DB.warranty;
  return pageHead('Warranty Register','Warranty and Defects',
    'Warranty and AMC coverage of assets received against work orders',
    '<button class="btn gh sm" onclick="tblExport(\'tWty\',\'Warranty_Register\')">\u2913 Export</button>'+
    '<button class="btn gh sm" onclick="goto(\'warranty/defects\')">Defect complaints \u2192</button>',
    reqTags('MMP_16'))+
  summaryRow([
    {l:'Items under warranty', v:rows.filter(function(w){ return warrState(w)!=='Expired'; }).length, c:'#15803D'},
    {l:'Expiring within 90 days', v:rows.filter(function(w){ return warrState(w)==='Expiring Soon'; }).length, c:'#B45309'},
    {l:'Expired', v:rows.filter(function(w){ return warrState(w)==='Expired'; }).length, c:'#B91C1C'},
    {l:'Items with complaints', v:rows.filter(function(w){ return w.complaints>0; }).length, c:'#1E5A96'}
  ])+
  filterBar([
    fld({id:'fwtMat', label:'Material code', ph:'MAT-'}),
    fld({id:'fwtVendor', label:'Vendor', type:'select', opts:DB.vendors.map(function(v){ return {v:v.party_code,l:v.party_name}; }), blank:'All'}),
    fld({id:'fwtState', label:'Warranty status', type:'select', opts:['Active','Expiring Soon','Expired'], blank:'All'})
  ], 'applyWarrFilter()',
    '<button class="btn sm" onclick="resetWarrFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tWty', rows:rows, cols:[
    {h:'Warranty ID', k:'wid', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Serial Number', k:'serial', cls:'mono'},
    {h:'Asset Tag', k:'asset', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Work Order', k:'wo', cls:'mono'},
    {h:'GRN', k:'grn', cls:'mono'},
    {h:'Warranty Start', k:'start', f:function(r){ return fdate(r.start); }},
    {h:'Warranty End', k:'end', f:function(r){
      var d = daysBetween(TODAY, r.end);
      return '<span style="'+(d<0?'color:#B91C1C;font-weight:700':(d<=90?'color:#B45309;font-weight:700':''))+'">'+
        fdate(r.end)+'</span>'; }},
    {h:'Days Remaining', k:'dr', cls:'num', f:function(r){
      var d = daysBetween(TODAY, r.end); return d<0? 'Expired' : num(d); },
      sv:function(r){ return daysBetween(TODAY, r.end); }},
    {h:'AMC Until', k:'amc', f:function(r){ return r.amc? fdate(r.amc):'\u2014'; }},
    {h:'Complaints', k:'complaints', cls:'num', f:function(r){ return r.complaints? '<b style="color:#B91C1C">'+r.complaints+'</b>':'0'; }},
    {h:'Status', k:'st', f:function(r){ return badge(warrState(r)==='Expiring Soon'? 'Near Expiry' : warrState(r)); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Raise complaint','raiseDefect(\''+r.id+'\')','warn')+
      actIcon('History','warrantyHistory(\''+r.id+'\')','gh'); }}
  ], empty:'No warranty record'})+'</div></div>';
};
function applyWarrFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.warranty.filter(function(w){
    return (!f('fwtMat') || w.mat.toLowerCase().indexOf(f('fwtMat').toLowerCase())>=0) &&
      (!f('fwtVendor') || w.vendor===f('fwtVendor')) &&
      (!f('fwtState') || warrState(w)===f('fwtState'));
  });
  tblReload('tWty', rows);
  toast(rows.length+' warranty record(s) matched.', rows.length?'ok':'wa');
}
function resetWarrFilter(){
  ['fwtMat','fwtVendor','fwtState'].forEach(function(i){ setVal(i,''); });
  tblReload('tWty', DB.warranty); toast('Filters cleared.','in');
}
function warrantyHistory(id){
  var w = byId(DB.warranty,'id',id);
  var defs = DB.defects.filter(function(d){ return d.serial===w.serial || d.mat===w.mat; });
  modal({title:'Warranty history \u2014 '+esc(w.wid), size:'lg',
    body:'<div class="grid g2"><table class="kv">'+
      kvRow('Warranty ID','<span class="mono">'+esc(w.wid)+'</span>')+
      kvRow('Material', esc(w.mat)+' \u2014 '+esc(mname(w.mat)))+
      kvRow('Serial number','<span class="mono">'+esc(w.serial)+'</span>')+
      kvRow('Asset tag','<span class="mono">'+esc(w.asset)+'</span>')+'</table>'+
      '<table class="kv">'+kvRow('Vendor', esc(vname(w.vendor)))+
      kvRow('Work order','<span class="mono">'+esc(w.wo)+'</span>')+
      kvRow('Warranty period', fdate(w.start)+' to '+fdate(w.end))+
      kvRow('AMC until', w.amc? fdate(w.amc):'Not applicable')+
      kvRow('Status', badge(warrState(w)==='Expiring Soon'?'Near Expiry':warrState(w)))+'</table></div>'+
      '<div class="sec-h" style="margin-top:12px">Complaints raised</div>'+
      (defs.length? '<div class="twrap" style="max-height:260px"><table class="tbl"><thead><tr>'+
        ['Complaint','Date','Category','Severity','Vendor Response','Status'].map(function(h){ return '<th>'+h+'</th>'; }).join('')+
        '</tr></thead><tbody>'+defs.map(function(d){
          return '<tr><td class="mono">'+esc(d.no)+'</td><td>'+fdate(d.date)+'</td><td>'+esc(d.cat)+'</td>'+
          '<td>'+priBadge(d.severity)+'</td><td>'+esc(d.vendorResp)+'</td><td>'+badge(d.status)+'</td></tr>';
        }).join('')+'</tbody></table></div>'
        : '<div class="note ok">No complaint raised against this item.</div>')});
}

/* ---------- defect complaints ---------- */
SCREENS['warranty/defects'] = function(){
  var rows = DB.defects;
  var open = rows.filter(function(d){ return ['Resolved','Closed','Out of Warranty'].indexOf(d.status)<0; });
  return pageHead('Defect Complaints','Warranty and Defects',
    'Defect complaints lodged with vendors, with SLA and escalation tracking',
    '<button class="btn gh sm" onclick="tblExport(\'tDef\',\'Defect_Complaints\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="raiseDefect()">+ Raise complaint</button>',
    reqTags('MMP_16'))+
  summaryRow([
    {l:'Open complaints', v:open.length, c:'#B91C1C'},
    {l:'Beyond SLA', v:open.filter(function(d){ return daysBetween(d.due, TODAY)>0; }).length, c:'#B45309'},
    {l:'Resolved', v:rows.filter(function(d){ return d.status==='Resolved'; }).length, c:'#15803D'},
    {l:'Critical or high', v:open.filter(function(d){ return ['Critical','High'].indexOf(d.severity)>=0; }).length, c:'#6B21A8'}
  ])+
  filterBar([
    fld({id:'fdNo', label:'Complaint number', ph:'DEF/'}),
    fld({id:'fdVendor', label:'Vendor', type:'select', opts:DB.vendors.map(function(v){ return {v:v.party_code,l:v.party_name}; }), blank:'All'}),
    fld({id:'fdSev', label:'Severity', type:'select', opts:['Critical','High','Medium','Low'], blank:'All'}),
    fld({id:'fdStatus', label:'Status', type:'select', blank:'All',
         opts:['Open','Vendor Notified','Assigned','Under Repair','Replacement Pending','Escalated','Resolved','Out of Warranty']})
  ], 'applyDefFilter()',
    '<button class="btn sm" onclick="resetDefFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tDef', rows:rows, cols:[
    {h:'Complaint No.', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewDefect(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Serial / Asset', k:'serial', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Department', k:'dept'},
    {h:'Defect Category', k:'cat'},
    {h:'Severity', k:'severity', f:function(r){ return priBadge(r.severity); }},
    {h:'Warranty', k:'warranty', f:function(r){ return badge(r.warranty==='Under Warranty'?'Active':'Expired'); }},
    {h:'Vendor Response', k:'vendorResp'},
    {h:'SLA Due', k:'due', f:function(r){
      var late = ['Resolved','Closed'].indexOf(r.status)<0 && daysBetween(r.due,TODAY)>0;
      return '<span style="'+(late?'color:#B91C1C;font-weight:700':'')+'">'+fdate(r.due)+'</span>'; }},
    {h:'Resolved On', k:'resolved', f:function(r){ return r.resolved? fdate(r.resolved):'\u2014'; }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      var open = ['Resolved','Closed','Out of Warranty'].indexOf(r.status)<0;
      return actIcon('View','viewDefect(\''+r.id+'\')')+
        (open? actIcon('Update','updateDefect(\''+r.id+'\')','sec')+
               actIcon('Escalate','escalateDefect(\''+r.id+'\')','warn')+
               actIcon('Resolve','resolveDefect(\''+r.id+'\')','ok') : ''); }}
  ], empty:'No defect complaint recorded'})+'</div></div>';
};
function applyDefFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.defects.filter(function(d){
    return (!f('fdNo') || d.no.toLowerCase().indexOf(f('fdNo').toLowerCase())>=0) &&
      (!f('fdVendor') || d.vendor===f('fdVendor')) &&
      (!f('fdSev') || d.severity===f('fdSev')) &&
      (!f('fdStatus') || d.status===f('fdStatus'));
  });
  tblReload('tDef', rows);
  toast(rows.length+' complaint(s) matched.', rows.length?'ok':'wa');
}
function resetDefFilter(){
  ['fdNo','fdVendor','fdSev','fdStatus'].forEach(function(i){ setVal(i,''); });
  tblReload('tDef', DB.defects); toast('Filters cleared.','in');
}
function raiseDefect(warrantyId){
  var w = warrantyId ? byId(DB.warranty,'id',warrantyId) : null;
  modal({title:'Raise defect complaint', size:'md',
    body:'<div id="dfForm"><div class="fgrid g2">'+
      fld({id:'dfNo', label:'Complaint number', val:'DEF/2026/'+pad(40+DB.defects.length,5), ro:true})+
      fld({id:'dfDate', label:'Complaint date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'dfMat', label:'Material', type:'select', req:true, val: w? w.mat:'',
           opts:DB.materials.map(function(m){ return {v:m.code, l:m.code+' \u2014 '+m.name}; })})+
      fld({id:'dfSerial', label:'Serial number', val: w? w.serial:'', ph:'SN'})+
      fld({id:'dfAsset', label:'Asset tag', val: w? w.asset:'', ph:'AST/'})+
      fld({id:'dfVendor', label:'Vendor', type:'select', req:true, val: w? w.vendor:'',
           opts:DB.vendors.map(function(v){ return {v:v.party_code, l:v.party_name}; })})+
      fld({id:'dfDept', label:'Reporting department', type:'select', opts:DEPTS, req:true})+
      fld({id:'dfLoc', label:'Location', val:'Room 204'})+
      fld({id:'dfCat', label:'Defect category', type:'select', req:true, blank:false,
           opts:['Hardware failure','Performance issue','Physical damage','Software / firmware','Accessory missing']})+
      fld({id:'dfSev', label:'Severity', type:'select', blank:false, val:'Medium',
           opts:['Critical','High','Medium','Low'], onchange:'dfSla()'})+
      fld({id:'dfWarr', label:'Warranty status', type:'select', blank:false,
           opts:['Under Warranty','Expired','Under AMC']})+
      fld({id:'dfDue', label:'SLA due date', type:'date', val: addDays(TODAY,15), date:true})+
      '</div><div class="fgrid" style="margin-top:11px">'+
      fld({id:'dfDesc', label:'Defect description', type:'textarea', rows:3, req:true,
           ph:'What fails, when it started, and what has already been tried'})+'</div>'+
      '<div id="dfSlaOut" style="margin-top:10px"></div>'+
      '<div style="margin-top:11px">'+attachWidget('dfAtt',[])+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveDefect()">Lodge complaint with vendor</button>',
    onMount: function(){ dfSla(); }});
}
function dfSla(){
  var out = document.getElementById('dfSlaOut'); if(!out) return;
  var sev = val('dfSev');
  var days = {Critical:2, High:5, Medium:10, Low:15}[sev] || 15;
  setVal('dfDue', addDays(val('dfDate')||TODAY, days));
  out.innerHTML = '<div class="note in">Severity <b>'+esc(sev)+'</b> carries an SLA of <b>'+days+
    ' day(s)</b>. The complaint escalates automatically if the vendor does not respond by '+fdate(val('dfDue'))+'.</div>';
}
async function saveDefect(){
  if(!requireOk('dfForm')) return;
  var matObj = byId(DB.materials,'code', val('dfMat'));
  var vendorObj = byId(DB.vendors,'party_code', val('dfVendor'));
  if(!matObj || !vendorObj){ toast('Could not resolve material or vendor against the master data.','er'); return; }
  var rec = {id:uid('DF'), no:val('dfNo'), date:val('dfDate'), mat:val('dfMat'),
    serial:val('dfSerial'), asset:val('dfAsset'), vendor:val('dfVendor'), dept:val('dfDept'),
    wo:'\u2014', grn:'\u2014', location:val('dfLoc'), cat:val('dfCat'), severity:val('dfSev'),
    warranty:val('dfWarr'), desc:val('dfDesc'), vendorResp:'Awaiting', due:val('dfDue'),
    resolved:'', status: val('dfWarr')==='Expired'? 'Out of Warranty':'Vendor Notified',
    officer:'Anil Katwale', escalation:'\u2014', attachments:attList('dfAtt')};
  var payload = {item_id: matObj.id, party_id: vendorObj.id, defect_desc: rec.desc, defect_category: rec.cat, severity: rec.severity};
  try {
    var res = await fetch(API_BASE+'/warranty/defects', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the complaint ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.ticket_no || rec.no;
    DB.defects.unshift(rec);
    var w = DB.warranty.filter(function(x){ return x.serial===rec.serial; })[0];
    if(w) w.complaints = (w.complaints||0)+1;
    logAudit('Defect Complaint', rec.no,'Raised','Status','\u2014',rec.status, rec.desc.slice(0,80));
    notify('er','Defect complaint '+rec.no+' raised', rec.severity+' severity with '+vname(rec.vendor),'warranty/defects');
    closeModal(); save(); refreshNavCounts();
    toast('Lodged complaint <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+') with '+esc(vname(rec.vendor))+'.','ok');
    goto('warranty/defects');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function viewDefect(id){
  var d = byId(DB.defects,'id',id);
  var late = ['Resolved','Closed'].indexOf(d.status)<0 && daysBetween(d.due,TODAY)>0;
  modal({title:'Defect complaint '+esc(d.no), size:'lg',
    body: tabsHtml('vd',['Complaint details','Resolution','Audit'])+
      pane('vd',0,'<div class="grid g2"><table class="kv">'+
        kvRow('Complaint number','<span class="mono">'+esc(d.no)+'</span>')+
        kvRow('Complaint date', fdate(d.date))+
        kvRow('Material', esc(d.mat)+' \u2014 '+esc(mname(d.mat)))+
        kvRow('Serial number','<span class="mono">'+esc(d.serial)+'</span>')+
        kvRow('Asset tag','<span class="mono">'+esc(d.asset)+'</span>')+
        kvRow('Location', esc(d.location))+'</table>'+
        '<table class="kv">'+kvRow('Vendor', esc(vname(d.vendor)))+
        kvRow('Department', esc(d.dept))+kvRow('Defect category', esc(d.cat))+
        kvRow('Severity', priBadge(d.severity))+
        kvRow('Warranty status', esc(d.warranty))+
        kvRow('Status', badge(d.status))+'</table></div>'+
        '<div class="sec-h" style="margin-top:11px">Defect description</div>'+
        '<div style="font-size:12.5px">'+esc(d.desc)+'</div>'+
        (late? '<div class="note er" style="margin-top:10px">This complaint is <b>'+daysBetween(d.due,TODAY)+
          ' day(s)</b> beyond the SLA due date of '+fdate(d.due)+'. Escalation is warranted.</div>':''))+
      pane('vd',1,'<table class="kv">'+
        kvRow('Vendor response', esc(d.vendorResp))+
        kvRow('SLA due date', fdate(d.due))+
        kvRow('Resolved on', d.resolved? fdate(d.resolved):'Not resolved')+
        kvRow('Escalation', esc(d.escalation))+
        kvRow('Responsible officer', esc(d.officer))+
        kvRow('Turnaround', d.resolved? daysBetween(d.date, d.resolved)+' days' : daysBetween(d.date,TODAY)+' days and counting')+'</table>')+
      pane('vd',2, auditTableHtml(DB.trail.filter(function(t){ return t.ref===d.no; }))),
    footer: ['Resolved','Closed','Out of Warranty'].indexOf(d.status)<0
      ? '<button class="btn warn" onclick="escalateDefect(\''+d.id+'\')">Escalate</button>'+
        '<button class="btn sec" onclick="updateDefect(\''+d.id+'\')">Update</button>'+
        '<button class="btn ok" onclick="resolveDefect(\''+d.id+'\')">Mark resolved</button>'
      : '<button class="btn" data-close>Close</button>'});
}
function updateDefect(id){
  var d = byId(DB.defects,'id',id);
  modal({title:'Update complaint '+esc(d.no), size:'sm',
    body:'<div id="udForm">'+
      fld({id:'udStatus', label:'Status', type:'select', blank:false, val:d.status,
           opts:['Open','Vendor Notified','Assigned','Under Repair','Replacement Pending','Escalated']})+
      fld({id:'udResp', label:'Vendor response', val:d.vendorResp, req:true})+
      fld({id:'udNote', label:'Update note', type:'textarea', rows:3, req:true})+'</div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveDefectUpdate(\''+id+'\')">Save update</button>'});
}
function saveDefectUpdate(id){
  if(!requireOk('udForm')) return;
  var d = byId(DB.defects,'id',id);
  var old = d.status;
  d.status = val('udStatus'); d.vendorResp = val('udResp');
  logAudit('Defect Complaint', d.no,'Updated','Status', old, d.status, val('udNote'));
  closeAllModals(); save(); tblReload('tDef', DB.defects); refreshNavCounts();
  toast('Updated <b>'+esc(d.no)+'</b>.','ok');
}
function escalateDefect(id){
  var d = byId(DB.defects,'id',id);
  var lvl = d.escalation==='\u2014' ? 'Level 1 \u2014 Vendor management'
          : (d.escalation.indexOf('Level 1')>=0 ? 'Level 2 \u2014 Head of Office'
          : 'Level 3 \u2014 Head of Department, security forfeiture proposed');
  confirmAct({title:'Escalate complaint', kind:'wa', btnClass:'warn', ok:'Escalate', reason:true,
    message:'The complaint escalates to <b>'+esc(lvl)+'</b> and the vendor is put on notice.',
    detail: kvRow('Complaint', esc(d.no))+kvRow('Vendor', esc(vname(d.vendor)))+
            kvRow('Days beyond SLA', Math.max(0, daysBetween(d.due,TODAY)))+
            kvRow('Current escalation', esc(d.escalation))},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/warranty/defects/'+d.id+'/escalate', {method:'PUT'});
        if(!res.ok){ var e = await res.text(); toast('Escalate failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Escalate failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      var old = d.status;
      d.status='Escalated'; d.escalation = lvl;
      logAudit('Defect Complaint', d.no,'Escalated','Status', old,'Escalated', lvl+' \u2014 '+reason);
      notify('er','Complaint '+d.no+' escalated', lvl,'warranty/escalation');
      closeAllModals(); save(); tblReload('tDef', DB.defects);
      commit('Escalated <b>'+esc(d.no)+'</b> to '+esc(lvl)+' in PostgreSQL.','wa');
    });
}
function resolveDefect(id){
  var d = byId(DB.defects,'id',id);
  confirmAct({title:'Mark complaint resolved', ok:'Mark resolved', btnClass:'ok', reason:true,
    message:'The defect is recorded as resolved and the complaint closed.',
    detail: kvRow('Complaint', esc(d.no))+kvRow('Material', esc(d.mat))+
            kvRow('Turnaround', daysBetween(d.date,TODAY)+' days')},
    async function(reason){
      try {
        var res = await fetch(API_BASE+'/warranty/defects/'+d.id+'/resolve', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({vendor_response: reason})});
        if(!res.ok){ var e = await res.text(); toast('Resolve failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
      } catch(err) {
        toast('Resolve failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return;
      }
      var old = d.status;
      d.status='Resolved'; d.resolved=TODAY; d.vendorResp='Closed';
      logAudit('Defect Complaint', d.no,'Resolved','Status', old,'Resolved',reason);
      closeAllModals(); save(); tblReload('tDef', DB.defects); refreshNavCounts();
      commit('Complaint <b>'+esc(d.no)+'</b> resolved in PostgreSQL.','ok');
    });
}

/* ---------- repair / replacement ---------- */
SCREENS['warranty/repair'] = function(){
  var rows = DB.defects.filter(function(d){
    return ['Under Repair','Replacement Pending','Assigned','Vendor Notified'].indexOf(d.status)>=0; });
  return pageHead('Repair / Replacement','Warranty and Defects',
    'Items with the vendor for repair or awaiting replacement under warranty',
    '<button class="btn gh sm" onclick="tblExport(\'tRep\',\'Repair_Replacement\')">\u2913 Export</button>',
    reqTags('MMP_16'))+
  summaryRow([
    {l:'Under repair', v:rows.filter(function(d){ return d.status==='Under Repair'; }).length, c:'#B45309'},
    {l:'Replacement pending', v:rows.filter(function(d){ return d.status==='Replacement Pending'; }).length, c:'#6B21A8'},
    {l:'Awaiting vendor action', v:rows.filter(function(d){ return ['Vendor Notified','Assigned'].indexOf(d.status)>=0; }).length, c:'#1E5A96'},
    {l:'Beyond SLA', v:rows.filter(function(d){ return daysBetween(d.due,TODAY)>0; }).length, c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRep', rows:rows, cols:[
    {h:'Complaint No.', k:'no', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Serial', k:'serial', cls:'mono'},
    {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
    {h:'Defect', k:'cat'},
    {h:'Severity', k:'severity', f:function(r){ return priBadge(r.severity); }},
    {h:'Lodged On', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'SLA Due', k:'due', f:function(r){ return fdate(r.due); }},
    {h:'Days Open', k:'do', cls:'num', f:function(r){
      var d = daysBetween(r.date,TODAY);
      return '<span style="'+(daysBetween(r.due,TODAY)>0?'color:#B91C1C;font-weight:700':'')+'">'+d+'</span>'; },
      sv:function(r){ return daysBetween(r.date,TODAY); }},
    {h:'Vendor Response', k:'vendorResp'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('Repaired','resolveDefect(\''+r.id+'\')','ok')+
        actIcon('Replaced','recordReplacement(\''+r.id+'\')','sec')+
        actIcon('Escalate','escalateDefect(\''+r.id+'\')','warn'); }}
  ], empty:'Nothing is with a vendor for repair or replacement'})+'</div></div>';
};
function recordReplacement(id){
  var d = byId(DB.defects,'id',id);
  confirmAct({title:'Record replacement', ok:'Record replacement', btnClass:'sec', reason:true,
    message:'The vendor has replaced the defective item. A new serial number is recorded and the complaint closed.',
    detail: kvRow('Complaint', esc(d.no))+kvRow('Material', esc(d.mat))+
            kvRow('Old serial', esc(d.serial))},
    function(reason){
      var newSerial = 'SN'+pad(420000+DB.warranty.length*77,8);
      var w = DB.warranty.filter(function(x){ return x.serial===d.serial; })[0];
      if(w){
        logAudit('Warranty', w.wid,'Serial Replaced','Serial Number', w.serial, newSerial, reason);
        w.serial = newSerial;
      }
      d.status='Resolved'; d.resolved=TODAY; d.vendorResp='Replacement supplied';
      logAudit('Defect Complaint', d.no,'Replacement Recorded','Status','Replacement Pending','Resolved',reason);
      closeAllModals(); save();
      if(TBL.tRep) tblReload('tRep', DB.defects.filter(function(x){
        return ['Under Repair','Replacement Pending','Assigned','Vendor Notified'].indexOf(x.status)>=0; }));
      refreshNavCounts();
      commit('Replacement recorded against <b>'+esc(d.no)+'</b>. New serial '+esc(newSerial)+'.','ok');
    });
}

/* ---------- vendor escalation ---------- */
SCREENS['warranty/escalation'] = function(){
  var esc0 = DB.defects.filter(function(d){ return d.status==='Escalated' || daysBetween(d.due,TODAY)>0; });
  var byVendor = {};
  DB.defects.forEach(function(d){
    byVendor[d.vendor] = byVendor[d.vendor] || {vendor:d.vendor, total:0, open:0, escalated:0, breach:0};
    byVendor[d.vendor].total++;
    if(['Resolved','Closed'].indexOf(d.status)<0) byVendor[d.vendor].open++;
    if(d.status==='Escalated') byVendor[d.vendor].escalated++;
    if(['Resolved','Closed'].indexOf(d.status)<0 && daysBetween(d.due,TODAY)>0) byVendor[d.vendor].breach++;
  });
  var vrows = Object.keys(byVendor).map(function(k,i){ return Object.assign({id:'VE'+i}, byVendor[k]); });
  return pageHead('Vendor Escalation','Warranty and Defects',
    'Escalated complaints, SLA breaches and vendor-wise redressal performance',
    '<button class="btn gh sm" onclick="tblExport(\'tEsc\',\'Vendor_Escalation\')">\u2913 Export</button>',
    reqTags('MMP_16','MMP_19'))+
  summaryRow([
    {l:'Escalated complaints', v:DB.defects.filter(function(d){ return d.status==='Escalated'; }).length, c:'#B91C1C'},
    {l:'SLA breaches', v:esc0.length, c:'#B45309'},
    {l:'Vendors involved', v:vrows.filter(function(v){ return v.breach>0; }).length, c:'#1E5A96'},
    {l:'Security forfeiture proposed', v:DB.defects.filter(function(d){ return d.escalation.indexOf('Level 3')>=0; }).length, c:'#6B21A8'}
  ])+
  '<div class="grid g21" style="margin-bottom:12px">'+
    '<div class="card"><div class="hd"><span>Escalated and breached complaints</span></div><div class="bd">'+
      renderTable({id:'tEsc', rows:esc0, cols:[
        {h:'Complaint', k:'no', cls:'mono'},
        {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
        {h:'Material', k:'mat', cls:'mono'},
        {h:'Severity', k:'severity', f:function(r){ return priBadge(r.severity); }},
        {h:'SLA Due', k:'due', f:function(r){ return fdate(r.due); }},
        {h:'Days Beyond SLA', k:'db', cls:'num', f:function(r){
          var d = Math.max(0, daysBetween(r.due,TODAY));
          return d? '<b style="color:#B91C1C">'+d+'</b>':'\u2014'; },
          sv:function(r){ return Math.max(0, daysBetween(r.due,TODAY)); }},
        {h:'Escalation Level', k:'escalation'},
        {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
        {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
          return actIcon('Escalate further','escalateDefect(\''+r.id+'\')','warn')+
            actIcon('Forfeit security','goto(\'proc/pg\')','dgr'); }}
      ], empty:'No complaint is escalated or beyond SLA'})+
    '</div></div>'+
    '<div class="card"><div class="hd"><span>Vendor redressal summary</span></div><div class="bd">'+
      vrows.sort(function(a,b){ return b.breach-a.breach; }).map(function(v){
        return '<div class="rag"><span class="s" style="background:'+(v.breach?'#B91C1C':(v.open?'#B45309':'#15803D'))+'">'+
        (v.breach? '!':(v.open? '\u26A0':'\u2713'))+'</span>'+
        '<span class="grow">'+esc(vname(v.vendor))+
        '<div class="muted" style="font-size:10.5px">'+v.total+' complaint(s), '+v.open+' open</div></span>'+
        '<b>'+v.breach+'</b></div>';
      }).join('')+
    '</div></div>'+
  '</div>';
};

/* ============================ DISPOSAL MANAGEMENT ============================ */
SCREENS['disp/proposal'] = function(){
  var rows = DB.disposals;
  return pageHead('Disposal Proposal','Disposal Management',
    'Proposals for condemnation, write-off, auction and destruction of material',
    '<button class="btn gh sm" onclick="tblExport(\'tDsp\',\'Disposal_Proposals\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="disposalEntry()">+ New proposal</button>',
    reqTags('MMP_17'))+
  summaryRow([
    {l:'Proposals', v:rows.length, c:'#1E5A96'},
    {l:'Pending approval', v:rows.filter(function(d){ return d.approval==='Pending'; }).length, c:'#B45309'},
    {l:'Book value proposed', v:inr0(sum(rows.filter(function(d){ return d.approval!=='Rejected'; }),'book')), c:'#0F766E'},
    {l:'Realised on sale', v:inr0(sum(rows,'value')), c:'#15803D'}
  ])+
  filterBar([
    fld({id:'fdsNo', label:'Proposal number', ph:'DSP/'}),
    fld({id:'fdsMat', label:'Material code', ph:'MAT-'}),
    fld({id:'fdsReason', label:'Reason', type:'select', blank:'All',
         opts:['Obsolete','End of Life','Expired','Unserviceable','Damaged','Surplus']}),
    fld({id:'fdsApp', label:'Approval', type:'select', opts:['Pending','Approved','Rejected'], blank:'All'})
  ], 'applyDspFilter()',
    '<button class="btn sm" onclick="resetDspFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tDsp', rows:rows, cols:[
    {h:'Proposal No.', k:'no', cls:'mono', f:function(r){ return '<a onclick="viewDisposal(\''+r.id+'\')" class="mono">'+esc(r.no)+'</a>'; }},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Store', k:'store'},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Original Value', k:'original', cls:'num', f:function(r){ return inr(r.original); }},
    {h:'Book Value', k:'book', cls:'num', f:function(r){ return inr(r.book); }},
    {h:'Residual Value', k:'residual', cls:'num', f:function(r){ return inr(r.residual); }},
    {h:'Reason', k:'reason'},
    {h:'Disposal Method', k:'method'},
    {h:'Approval', k:'approval', f:function(r){ return badge(r.approval); }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon('View','viewDisposal(\''+r.id+'\')')+
        (r.approval==='Pending'? actIcon('Approve','approveDisposal(\''+r.id+'\')','ok')+
          actIcon('Reject','rejectDisposal(\''+r.id+'\')','dgr'):'')+
        (r.approval==='Approved' && r.status!=='Completed' && r.status!=='Sold'
          ? actIcon('Record disposal','completeDisposal(\''+r.id+'\')','sec'):''); }}
  ], empty:'No disposal proposal'})+'</div></div>';
};
function applyDspFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.disposals.filter(function(d){
    return (!f('fdsNo') || d.no.toLowerCase().indexOf(f('fdsNo').toLowerCase())>=0) &&
      (!f('fdsMat') || d.mat.toLowerCase().indexOf(f('fdsMat').toLowerCase())>=0) &&
      (!f('fdsReason') || d.reason===f('fdsReason')) &&
      (!f('fdsApp') || d.approval===f('fdsApp'));
  });
  tblReload('tDsp', rows);
  toast(rows.length+' proposal(s) matched.', rows.length?'ok':'wa');
}
function resetDspFilter(){
  ['fdsNo','fdsMat','fdsReason','fdsApp'].forEach(function(i){ setVal(i,''); });
  tblReload('tDsp', DB.disposals); toast('Filters cleared.','in');
}
function disposalEntry(){
  modal({title:'New disposal proposal', size:'md',
    body:'<div id="dpForm"><div class="fgrid g2">'+
      fld({id:'dpNo', label:'Proposal number', val:'DSP/2026/'+pad(40+DB.disposals.length,5), ro:true})+
      fld({id:'dpDate', label:'Proposal date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'dpMat', label:'Material', type:'select', req:true,
           opts:DB.materials.map(function(m){ return {v:m.code, l:m.code+' \u2014 '+m.name}; }), onchange:'dpCalc()'})+
      fld({id:'dpStore', label:'Store', type:'select', opts:STORES, req:true})+
      fld({id:'dpQty', label:'Quantity', type:'number', val:1, num:true, req:true, min:1, onchange:'dpCalc()'})+
      fld({id:'dpReason', label:'Reason for disposal', type:'select', req:true, blank:false,
           opts:['Obsolete','End of Life','Expired','Unserviceable','Damaged','Surplus']})+
      fld({id:'dpMethod', label:'Disposal method', type:'select', req:true, blank:false,
           opts:['E-Auction','Auction','Scrap Sale','Write-Off','Destruction','Return to Vendor','Transfer','Authorized Agency Disposal']})+
      fld({id:'dpCommittee', label:'Condemnation committee', val:'Condemnation Board \u2014 '+DEPTS[0]})+
      fld({id:'dpOriginal', label:'Original value (\u20B9)', ro:true})+
      fld({id:'dpBook', label:'Book value (\u20B9)', type:'number', val:0, num:true})+
      fld({id:'dpResidual', label:'Estimated residual value (\u20B9)', type:'number', val:0, num:true})+
      fld({id:'dpBatch', label:'Batch number', ph:'BATCH/2026/'})+
      '</div><div id="dpCalcOut" style="margin-top:11px"></div>'+
      '<div class="fgrid" style="margin-top:11px">'+
      fld({id:'dpJust', label:'Justification', type:'textarea', rows:3, req:true,
           ph:'Condition of the material and why it cannot be put to further use'})+'</div>'+
      '<div style="margin-top:11px">'+attachWidget('dpAtt',[])+'</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveDisposal()">Submit for condemnation approval</button>',
    onMount: function(){ dpCalc(); }});
}
function dpCalc(){
  var out = document.getElementById('dpCalcOut'); if(!out) return;
  var rate = mrate(val('dpMat')), q = nval('dpQty');
  var orig = rate*q;
  setVal('dpOriginal', orig);
  setVal('dpBook', Math.round(orig*0.35));
  setVal('dpResidual', Math.round(orig*0.11));
  var s = DB.stock.filter(function(x){ return x.mat===val('dpMat'); })[0];
  out.innerHTML = '<div class="note '+(s && s.avail>=q ? 'in':'wa')+'">Original value <b>'+inr(orig)+
    '</b>. Available stock of this material: <b>'+num(s? s.avail:0)+'</b>.'+
    (s && s.avail < q ? ' The proposed quantity exceeds the available balance.':'')+'</div>';
}
async function saveDisposal(){
  if(!requireOk('dpForm')) return;
  var storeObj = byId(DB.stores,'store_name', val('dpStore'));
  var matObj = byId(DB.materials,'code', val('dpMat'));
  if(!storeObj || !matObj){ toast('Could not resolve store or material against the master data.','er'); return; }
  var rec = {id:uid('DS'), no:val('dpNo'), mat:val('dpMat'), store:val('dpStore'),
    location:'Bin-Z-01', batch:val('dpBatch'), qty:nval('dpQty'),
    original:nval('dpOriginal'), book:nval('dpBook'), residual:nval('dpResidual'),
    reason:val('dpReason'), method:val('dpMethod'), approval:'Pending', status:'Under Review',
    committee:val('dpCommittee'), buyer:'', auction:'', date:val('dpDate'), value:0,
    remittance:'', attachments:attList('dpAtt')};
  var payload = {store_id: storeObj.id, item_id: matObj.id, disposal_qty: rec.qty, condemnation_reason: rec.reason, reserve_price: rec.residual, disposal_mode: rec.method};
  try {
    var res = await fetch(API_BASE+'/disposal/proposals', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the proposal ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.disp_proposal_no || rec.no;
    DB.disposals.unshift(rec);
    logAudit('Disposal', rec.no,'Proposed','Approval Status','\u2014','Pending',val('dpJust'));
    notify('wa','Disposal proposal '+rec.no,'Awaiting condemnation board approval','disp/proposal');
    closeModal(); save(); refreshNavCounts();
    toast('Submitted proposal <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+') for condemnation approval.','ok');
    goto('disp/proposal');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function viewDisposal(id){
  var d = byId(DB.disposals,'id',id);
  modal({title:'Disposal proposal '+esc(d.no), size:'md',
    body:'<div class="grid g2"><table class="kv">'+
      kvRow('Proposal number','<span class="mono">'+esc(d.no)+'</span>')+
      kvRow('Date', fdate(d.date))+
      kvRow('Material', esc(d.mat)+' \u2014 '+esc(mname(d.mat)))+
      kvRow('Store / location', esc(d.store)+' / '+esc(d.location))+
      kvRow('Batch', d.batch? esc(d.batch):'Not applicable')+
      kvRow('Quantity', num(d.qty))+'</table>'+
      '<table class="kv">'+kvRow('Original value', inr(d.original))+
      kvRow('Book value', inr(d.book))+kvRow('Residual value', inr(d.residual))+
      kvRow('Reason', esc(d.reason))+kvRow('Method', esc(d.method))+
      kvRow('Committee', esc(d.committee))+
      kvRow('Approval', badge(d.approval))+kvRow('Status', badge(d.status))+'</table></div>'+
      (d.status==='Sold'? '<div class="note ok" style="margin-top:11px">Sold to <b>'+esc(d.buyer)+
        '</b> for '+inr(d.value)+'. Sale proceeds remitted under challan '+esc(d.remittance)+'.</div>':'')+
      '<div class="sec-h" style="margin-top:12px">Audit trail</div>'+
      auditTableHtml(DB.trail.filter(function(t){ return t.ref===d.no; })),
    footer: d.approval==='Pending'
      ? '<button class="btn dgr" onclick="rejectDisposal(\''+d.id+'\')">Reject</button>'+
        '<button class="btn ok" onclick="approveDisposal(\''+d.id+'\')">Approve</button>'
      : '<button class="btn" data-close>Close</button>'});
}
async function approveDisposal(id){
  var d = byId(DB.disposals,'id',id);
  confirmAct({title:'Approve disposal proposal', ok:'Approve', btnClass:'ok', reason:true,
    message:'The condemnation board approves disposal of <b>'+num(d.qty)+'</b> unit(s) of '+esc(d.mat)+
      ' by '+esc(d.method.toLowerCase())+'.',
    detail: kvRow('Book value', inr(d.book))+kvRow('Residual value', inr(d.residual))+
            kvRow('Committee', esc(d.committee))},
    async function(reason){
      var created;
      try {
        var res = await fetch(API_BASE+'/disposal/proposals/'+d.id+'/approve', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({})});
        if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the approval ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        created = await res.json();
      } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
      d.approval='Approved';
      d.status = d.method.indexOf('Auction')>=0 ? 'Auction Scheduled' : 'Approved';
      d.auction = created.auction_ref_no || d.auction;
      logAudit('Disposal', d.no,'Approved','Approval Status','Pending','Approved',reason);
      closeAllModals(); save(); tblReload('tDsp', DB.disposals); refreshNavCounts();
      commit('Approved <b>'+esc(d.no)+'</b> in PostgreSQL.','ok');
    });
}
function rejectDisposal(id){
  var d = byId(DB.disposals,'id',id);
  confirmAct({title:'Reject disposal proposal', kind:'er', btnClass:'dgr', ok:'Reject', reason:true,
    message:'The proposal is rejected and the material stays on the books. Note: the backend has no rejection status field for disposal proposals, so this is recorded locally and in the audit trail only — the proposal remains ‘Pending Approval’ in PostgreSQL.'},
    function(reason){
      d.approval='Rejected'; d.status='Rejected';
      logAudit('Disposal', d.no,'Rejected','Approval Status','Pending','Rejected',reason);
      closeAllModals(); save(); tblReload('tDsp', DB.disposals); refreshNavCounts();
      commit('Rejected <b>'+esc(d.no)+'</b> (local only — no backend rejection field exists for disposal proposals).','wa');
    });
}
function completeDisposal(id){
  var d = byId(DB.disposals,'id',id);
  modal({title:'Record disposal \u2014 '+esc(d.no), size:'sm',
    body:'<div id="cdForm"><table class="kv" style="margin-bottom:11px">'+
      kvRow('Material', esc(d.mat))+kvRow('Quantity', num(d.qty))+
      kvRow('Method', esc(d.method))+kvRow('Residual value', inr(d.residual))+'</table>'+
      fld({id:'cdBuyer', label:'Buyer / agency', ph:'Name of the successful bidder or agency'})+
      fld({id:'cdValue', label:'Realised value (\u20B9)', type:'number', val:d.residual, num:true})+
      fld({id:'cdChallan', label:'Remittance challan', val:'CHL/2026/'+pad(4500+DB.disposals.length,5)})+
      fld({id:'cdNote', label:'Remarks', type:'textarea', rows:2, req:true})+'</div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveDisposalCompletion(\''+id+'\')">Record disposal</button>'});
}
async function saveDisposalCompletion(id){
  if(!requireOk('cdForm')) return;
  var d = byId(DB.disposals,'id',id);
  var payload = {buyer_name: val('cdBuyer')||'Scrap Dealer', realized_value: nval('cdValue')||0, deposit_challan_no: val('cdChallan')};
  try {
    var res = await fetch(API_BASE+'/disposal/proposals/'+d.id+'/record-sale', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
  } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
  var s = DB.stock.filter(function(x){ return x.mat===d.mat && x.store===d.store; })[0];
  if(s) s.avail = Math.max(0, s.avail - d.qty);
  var m = byId(DB.materials,'code',d.mat); if(m) m.stock = Math.max(0, m.stock - d.qty);
  d.buyer = val('cdBuyer'); d.value = nval('cdValue'); d.remittance = val('cdChallan');
  d.status = d.method==='Write-Off' || d.method==='Destruction' ? 'Completed' : 'Sold';
  DB.movements.unshift({id:uid('V'), no:'MOV/2026/'+pad(9700+DB.movements.length*3,6), date:TODAY,
    mat:d.mat, type:'Disposal', src:d.store, dst:d.buyer||'Disposed', qty:d.qty, uom:muom(d.mat),
    value:d.book, ref:d.no, by:'Store Officer', status:'Approved'});
  logAudit('Disposal', d.no,'Disposal Recorded','Status','Approved',d.status, val('cdNote')+
    (d.value? ' \u2014 realised '+inr(d.value):''));
  closeModal(); save(); tblReload('tDsp', DB.disposals); refreshNavCounts();
  toast('Recorded disposal of <b>'+num(d.qty)+'</b> unit(s) in PostgreSQL. Stock updated.','ok');
}
SCREENS['disp/condemn'] = function(){
  var rows = DB.disposals.filter(function(d){ return ['Unserviceable','Obsolete','End of Life','Damaged'].indexOf(d.reason)>=0; });
  return pageHead('Condemnation Register','Disposal Management',
    'Items placed before the condemnation board with committee recommendation',
    '<button class="btn gh sm" onclick="tblExport(\'tCon\',\'Condemnation_Register\')">\u2913 Export</button>',
    reqTags('MMP_17'))+
  summaryRow([
    {l:'Condemnation cases', v:rows.length, c:'#1E5A96'},
    {l:'Approved', v:rows.filter(function(d){ return d.approval==='Approved'; }).length, c:'#15803D'},
    {l:'Pending', v:rows.filter(function(d){ return d.approval==='Pending'; }).length, c:'#B45309'},
    {l:'Book value condemned', v:inr0(sum(rows.filter(function(d){ return d.approval==='Approved'; }),'book')), c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tCon', rows:rows, cols:[
    {h:'Proposal No.', k:'no', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Reason', k:'reason'},
    {h:'Condemnation Committee', k:'committee'},
    {h:'Original Value', k:'original', cls:'num', f:function(r){ return inr(r.original); }},
    {h:'Book Value', k:'book', cls:'num', f:function(r){ return inr(r.book); }},
    {h:'Recommended Method', k:'method'},
    {h:'Approval', k:'approval', f:function(r){ return badge(r.approval); }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ], empty:'No condemnation case'})+'</div></div>';
};
SCREENS['disp/auction'] = function(){
  var rows = DB.disposals.filter(function(d){ return d.method.indexOf('Auction')>=0 || d.method==='Scrap Sale'; });
  return pageHead('Auction / Scrap Sale','Disposal Management',
    'Auction and scrap sale cases with realisation and remittance of sale proceeds',
    '<button class="btn gh sm" onclick="tblExport(\'tAuc\',\'Auction_Scrap_Sale\')">\u2913 Export</button>',
    reqTags('MMP_17'))+
  summaryRow([
    {l:'Auction cases', v:rows.length, c:'#1E5A96'},
    {l:'Scheduled', v:rows.filter(function(d){ return d.status==='Auction Scheduled'; }).length, c:'#B45309'},
    {l:'Sold', v:rows.filter(function(d){ return d.status==='Sold'; }).length, c:'#15803D'},
    {l:'Sale proceeds', v:inr0(sum(rows,'value')), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tAuc', rows:rows, cols:[
    {h:'Proposal No.', k:'no', cls:'mono'},
    {h:'Auction Reference', k:'auction', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Reserve / Residual Value', k:'residual', cls:'num', f:function(r){ return inr(r.residual); }},
    {h:'Realised Value', k:'value', cls:'num', f:function(r){ return r.value? inr(r.value):'\u2014'; }},
    {h:'Realisation %', k:'rp', cls:'num', f:function(r){
      return r.value? pct(r.value, r.residual||1).toFixed(0)+'%' : '\u2014'; },
      sv:function(r){ return r.value? pct(r.value, r.residual||1):0; }},
    {h:'Buyer', k:'buyer'},
    {h:'Remittance Challan', k:'remittance', cls:'mono'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.approval==='Approved' && r.status!=='Sold'
        ? actIcon('Record sale','completeDisposal(\''+r.id+'\')','ok') : '<span class="muted">\u2014</span>'; }}
  ], empty:'No auction or scrap sale case'})+'</div></div>';
};
SCREENS['disp/register'] = function(){
  var rows = DB.disposals.filter(function(d){ return ['Sold','Completed'].indexOf(d.status)>=0; });
  return pageHead('Disposal Register','Disposal Management',
    'Completed disposals with stock written back and sale proceeds remitted',
    '<button class="btn gh sm" onclick="tblExport(\'tDreg\',\'Disposal_Register\')">\u2913 Export</button>',
    reqTags('MMP_17'))+
  summaryRow([
    {l:'Completed disposals', v:rows.length, c:'#15803D'},
    {l:'Quantity disposed', v:num(sum(rows,'qty')), c:'#1E5A96'},
    {l:'Book value written off', v:inr0(sum(rows,'book')), c:'#B91C1C'},
    {l:'Proceeds remitted', v:inr0(sum(rows,'value')), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tDreg', rows:rows, cols:[
    {h:'Proposal No.', k:'no', cls:'mono'},
    {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Quantity', k:'qty', cls:'num', f:function(r){ return num(r.qty); }},
    {h:'Store', k:'store'},
    {h:'Method', k:'method'},
    {h:'Book Value', k:'book', cls:'num', f:function(r){ return inr(r.book); }},
    {h:'Realised Value', k:'value', cls:'num', f:function(r){ return r.value? inr(r.value):'Nil'; }},
    {h:'Buyer / Agency', k:'buyer'},
    {h:'Remittance Challan', k:'remittance', cls:'mono'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ], empty:'No disposal completed yet'})+'</div></div>';
};

/* ============================ STOCK AUDIT AND RECONCILIATION ============================ */
SCREENS['audit/pv'] = function(){
  var rows = DB.verification;
  return pageHead('Physical Verification','Stock Audit and Reconciliation',
    'Physical verification sheets against book balances, with variance capture',
    '<button class="btn gh sm" onclick="tblExport(\'tPv\',\'Physical_Verification\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="auditEntry()">+ Schedule verification</button>',
    reqTags('MMP_18'))+
  summaryRow([
    {l:'Verification lines', v:rows.length, c:'#1E5A96'},
    {l:'Matched', v:rows.filter(function(v){ return v.variance===0; }).length, c:'#15803D'},
    {l:'With variance', v:rows.filter(function(v){ return v.variance!==0; }).length, c:'#B45309'},
    {l:'Variance value', v:inr0(sum(rows, function(v){ return Math.abs(v.variance*v.rate); })), c:'#B91C1C'}
  ])+
  '<div class="card" style="margin-bottom:12px"><div class="hd"><span>Verification programme</span>'+
    '<span class="muted" style="font-size:11px;font-weight:400">Annual, quarterly, cycle count and surprise checks</span></div>'+
    '<div class="bd">'+renderTable({id:'tAud', rows:DB.audits, cols:[
      {h:'Audit No.', k:'no', cls:'mono'},
      {h:'Type', k:'type'},
      {h:'Department', k:'dept'},
      {h:'Store', k:'store'},
      {h:'Category', k:'cat'},
      {h:'Period', k:'period'},
      {h:'Verification Team', k:'team'},
      {h:'Start Date', k:'start', f:function(r){ return fdate(r.start); }},
      {h:'End Date', k:'end', f:function(r){ return fdate(r.end); }},
      {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
      {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
        return r.status!=='Completed'? actIcon('Close audit','closeAudit(\''+r.id+'\')','ok') : '<span class="muted">\u2014</span>'; }}
    ]})+'</div></div>'+
  '<div class="card"><div class="hd"><span>Verification sheet \u2014 AUD/2026/0011</span>'+
    '<button class="btn xs sec" onclick="postVariances()">Post variances for adjustment</button></div>'+
    '<div class="bd">'+renderTable({id:'tPv', rows:rows, select:true, cols:[
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Store', k:'store'},
    {h:'Book Balance', k:'book', cls:'num', f:function(r){ return num(r.book); }},
    {h:'Physical Balance', k:'phys', cls:'num', f:function(r){
      return '<input type="number" class="inp num" style="width:86px" value="'+r.phys+
      '" onchange="setPhys(\''+r.id+'\',this.value)">'; }},
    {h:'Damaged', k:'damaged', cls:'num', f:function(r){ return num(r.damaged); }},
    {h:'Expired', k:'expired', cls:'num', f:function(r){ return num(r.expired); }},
    {h:'Shortage', k:'missing', cls:'num', f:function(r){ return r.missing? '<b style="color:#B91C1C">'+num(r.missing)+'</b>':'\u2014'; }},
    {h:'Excess', k:'excess', cls:'num', f:function(r){ return r.excess? '<b style="color:#B45309">'+num(r.excess)+'</b>':'\u2014'; }},
    {h:'Variance', k:'variance', cls:'num', f:function(r){
      return r.variance? '<b style="color:'+(r.variance<0?'#B91C1C':'#B45309')+'">'+(r.variance>0?'+':'')+num(r.variance)+'</b>':'0'; }},
    {h:'Variance Value', k:'vv', cls:'num', f:function(r){ return inr(Math.abs(r.variance*r.rate)); },
      sv:function(r){ return Math.abs(r.variance*r.rate); }},
    {h:'Reason', k:'reason', f:function(r){
      return '<input class="inp" style="min-width:150px" value="'+esc(r.reason)+
      '" placeholder="Reason for variance" onchange="setPvReason(\''+r.id+'\',this.value)">'; }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ], empty:'No verification line'})+'</div></div>';
};
function setPhys(id, v){
  var r = byId(DB.verification,'id',id);
  r.phys = Math.max(0, Number(v)||0);
  r.variance = r.phys - r.book;
  r.missing = r.variance<0 ? -r.variance : 0;
  r.excess = r.variance>0 ? r.variance : 0;
  r.status = r.variance===0 ? 'Matched' : 'Pending';
  save(); tblPaint('tPv');
}
function setPvReason(id, v){
  var r = byId(DB.verification,'id',id); r.reason = v; save();
}
function auditEntry(){
  modal({title:'Schedule physical verification', size:'md',
    body:'<div id="avForm"><div class="fgrid g2">'+
      fld({id:'avNo', label:'Audit number', val:'AUD/2026/'+pad(20+DB.audits.length,4), ro:true})+
      fld({id:'avType', label:'Verification type', type:'select', blank:false,
           opts:['Annual','Quarterly','Cycle Count','Surprise Check']})+
      fld({id:'avDept', label:'Department', type:'select', opts:DEPTS, req:true})+
      fld({id:'avStore', label:'Store', type:'select', opts:STORES, req:true})+
      fld({id:'avCat', label:'Material category', type:'select', opts:Object.keys(CATS), blank:'All categories'})+
      fld({id:'avPeriod', label:'Period', val:'FY 2026-27', req:true})+
      fld({id:'avTeam', label:'Verification team', val:'Verification Team A', req:true})+
      fld({id:'avStart', label:'Start date', type:'date', val:TODAY, req:true, date:true})+
      fld({id:'avEnd', label:'End date', type:'date', val: addDays(TODAY,14), req:true, date:true})+
      '</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveAudit()">Schedule verification</button>'});
}
async function saveAudit(){
  if(!requireOk('avForm')) return;
  var storeObj = byId(DB.stores,'store_name', val('avStore'));
  if(!storeObj){ toast('Select a valid store before scheduling.','er'); return; }
  var rec = {id:uid('A'), no:val('avNo'), type:val('avType'), dept:val('avDept'), store:val('avStore'),
    cat:val('avCat')||'All categories', period:val('avPeriod'), team:val('avTeam'),
    start:val('avStart'), end:val('avEnd'), status:'Scheduled'};
  var payload = {store_id: storeObj.id, audit_type: rec.type, period_label: rec.period, audit_team_lead: rec.team};
  try {
    var res = await fetch(API_BASE+'/audit/schedules', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
    if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the schedule ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
    var created = await res.json();
    rec.id = created.id; rec.no = created.audit_no || rec.no;
    DB.audits.unshift(rec);
    logAudit('Stock Audit', rec.no,'Scheduled','Status','\u2014','Scheduled',rec.type+' verification of '+rec.store);
    closeModal(); save(); tblReload('tAud', DB.audits);
    toast('Scheduled verification <b>'+esc(rec.no)+'</b> in PostgreSQL (id '+created.id+'). Lines pre-populated from current stock.','ok');
  } catch(err) {
    toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
  }
}
function closeAudit(id){
  var a = byId(DB.audits,'id',id);
  confirmAct({title:'Close verification', ok:'Close audit', btnClass:'ok', reason:true,
    message:'Verification <b>'+esc(a.no)+'</b> is closed. Outstanding variances must be regularised through stock adjustment.'},
    function(reason){
      var old = a.status; a.status='Completed';
      logAudit('Stock Audit', a.no,'Completed','Status',old,'Completed',reason);
      tblReload('tAud', DB.audits);
      commit('Closed verification <b>'+esc(a.no)+'</b>.','ok');
    });
}
function postVariances(){
  var sel = tblRows('tPv').filter(function(v){ return v.variance!==0; });
  if(!sel.length){ toast('Select at least one line with a variance.','wa'); return; }
  var withoutReason = sel.filter(function(v){ return !v.reason; });
  if(withoutReason.length){ toast(withoutReason.length+' selected line(s) have no reason recorded. Enter a reason first.','er'); return; }
  confirmAct({title:'Post variances for adjustment', ok:'Post '+sel.length+' variance(s)', btnClass:'sec', reason:true,
    message:'Adjustment entries are raised for the selected variances and sent for approval of the competent authority.'},
    async function(reason){
      try {
        var byAudit = {};
        sel.forEach(function(v){ (byAudit[v.auditId] = byAudit[v.auditId]||[]).push(v); });
        for(var auditId in byAudit){
          var counts = byAudit[auditId].map(function(v){ return {line_id: Number(v.id), physical_qty: v.phys, notes: v.reason}; });
          var res = await fetch(API_BASE+'/audit/schedules/'+auditId+'/record-counts', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({counts: counts})});
          if(!res.ok){ var e = await res.text(); toast('Post failed for audit '+auditId+': backend rejected the request ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        }
        for(var k=0;k<sel.length;k++){
          var v = sel[k];
          var storeObj = byId(DB.stores,'store_name', v.store);
          var matObj = byId(DB.materials,'code', v.mat);
          if(!storeObj || !matObj) continue;
          var adjRes = await fetch(API_BASE+'/audit/adjustments', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
            audit_id: v.auditId, store_id: storeObj.id, item_id: matObj.id,
            adjustment_type: v.variance<0 ? 'Write-Off' : 'Write-In', adj_qty: Math.abs(v.variance)
          })});
          if(adjRes.ok){
            var created = await adjRes.json();
            DB.adjustments.unshift({id:created.id, no:created.adj_voucher_no,
              mat:v.mat, store:v.store, book:v.book, phys:v.phys, variance:v.variance,
              rate:v.rate, value:v.variance*v.rate, reason:v.reason,
              doc:'PV Sheet '+v.audit, authority:'Head of Office', finance:'Pending', status:'Pending'});
            var s = DB.stock.filter(function(x){ return x.mat===v.mat && x.store===v.store; })[0];
            if(s) s.avail = Math.max(0, s.avail + v.variance);
            var m = byId(DB.materials,'code',v.mat); if(m) m.stock = Math.max(0, m.stock + v.variance);
          }
          v.status = 'Pending';
          logAudit('Stock Adjustment', v.mat,'Variance Posted','Variance','0', String(v.variance), v.reason+' \u2014 '+reason);
        }
        save(); tblPaint('tPv');
        toast('Posted '+sel.length+' variance(s) for adjustment approval in PostgreSQL.','ok');
        goto('audit/adjust');
      } catch(err) {
        toast('Post failed: could not reach the backend API. '+esc(String(err.message||err)),'er');
      }
    });
}

SCREENS['audit/recon'] = function(){
  var rows = DB.stock.map(function(s,i){
    var v = DB.verification.filter(function(x){ return x.mat===s.mat; })[0];
    var book = s.avail;
    var phys = v ? v.phys : s.avail;
    var movIn = sum(DB.movements.filter(function(m){ return m.mat===s.mat && m.type.indexOf('Receipt')>=0; }),'qty');
    var movOut = sum(DB.movements.filter(function(m){ return m.mat===s.mat && m.type.indexOf('Issue')>=0; }),'qty');
    return {id:'RC'+i, mat:s.mat, store:s.store, book:book, phys:phys, variance:phys-book,
      receipts:movIn, issues:movOut, rate:s.rate, value:(phys-book)*s.rate,
      status: phys===book? 'Matched':'Mismatch'};
  });
  return pageHead('Stock Reconciliation','Stock Audit and Reconciliation',
    'Book balance against physical balance, with receipts and issues in the period',
    '<button class="btn gh sm" onclick="tblExport(\'tRec\',\'Stock_Reconciliation\')">\u2913 Export</button>',
    reqTags('MMP_18'))+
  summaryRow([
    {l:'Materials reconciled', v:rows.length, c:'#1E5A96'},
    {l:'Matched', v:rows.filter(function(r){ return r.status==='Matched'; }).length, c:'#15803D'},
    {l:'Mismatched', v:rows.filter(function(r){ return r.status==='Mismatch'; }).length, c:'#B91C1C'},
    {l:'Net variance value', v:inr0(sum(rows,'value')), c:'#B45309'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRec', rows:rows, cols:[
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Store', k:'store'},
    {h:'Receipts in Period', k:'receipts', cls:'num', f:function(r){ return num(r.receipts); }},
    {h:'Issues in Period', k:'issues', cls:'num', f:function(r){ return num(r.issues); }},
    {h:'Book Balance', k:'book', cls:'num', f:function(r){ return num(r.book); }},
    {h:'Physical Balance', k:'phys', cls:'num', f:function(r){ return num(r.phys); }},
    {h:'Variance', k:'variance', cls:'num', f:function(r){
      return r.variance? '<b style="color:'+(r.variance<0?'#B91C1C':'#B45309')+'">'+(r.variance>0?'+':'')+num(r.variance)+'</b>':'0'; }},
    {h:'Variance Value', k:'value', cls:'num', f:function(r){ return r.value? inr(r.value):'\u2014'; }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
  ], empty:'Nothing to reconcile'})+'</div></div>';
};

SCREENS['audit/adjust'] = function(){
  var rows = DB.adjustments;
  return pageHead('Stock Adjustment','Stock Audit and Reconciliation',
    'Adjustment entries regularising verified variances, with approval and finance posting',
    '<button class="btn gh sm" onclick="tblExport(\'tAdj\',\'Stock_Adjustments\')">\u2913 Export</button>',
    reqTags('MMP_18'))+
  summaryRow([
    {l:'Adjustment entries', v:rows.length, c:'#1E5A96'},
    {l:'Approved', v:rows.filter(function(a){ return a.status==='Approved'; }).length, c:'#15803D'},
    {l:'Pending approval', v:rows.filter(function(a){ return a.status==='Pending'; }).length, c:'#B45309'},
    {l:'Net adjustment value', v:inr0(sum(rows,'value')), c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tAdj', rows:rows, cols:[
    {h:'Adjustment No.', k:'no', cls:'mono'},
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Store', k:'store'},
    {h:'Book Balance', k:'book', cls:'num', f:function(r){ return num(r.book); }},
    {h:'Physical Balance', k:'phys', cls:'num', f:function(r){ return num(r.phys); }},
    {h:'Variance', k:'variance', cls:'num', f:function(r){
      return '<b style="color:'+(r.variance<0?'#B91C1C':'#B45309')+'">'+(r.variance>0?'+':'')+num(r.variance)+'</b>'; }},
    {h:'Rate', k:'rate', cls:'num', f:function(r){ return inr(r.rate); }},
    {h:'Adjustment Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
    {h:'Reason', k:'reason'},
    {h:'Supporting Document', k:'doc'},
    {h:'Approving Authority', k:'authority'},
    {h:'Finance Posting', k:'finance', f:function(r){ return badge(r.finance); }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return r.status==='Pending'
        ? actIcon('Approve and post','approveAdjustment(\''+r.id+'\')','ok')+
          actIcon('Reject','rejectAdjustment(\''+r.id+'\')','dgr')
        : '<span class="muted">\u2014</span>'; }}
  ], empty:'No adjustment entry'})+'</div></div>';
};
function approveAdjustment(id){
  var a = byId(DB.adjustments,'id',id);
  confirmAct({title:'Approve stock adjustment', ok:'Approve and post', btnClass:'ok', reason:true,
    kind: a.variance<0? 'wa':'in',
    message: a.variance<0
      ? 'A shortage of <b>'+num(-a.variance)+'</b> unit(s) valued at '+inr(Math.abs(a.value))+
        ' is written off against '+esc(a.mat)+'. Recovery action, where warranted, is a separate proceeding.'
      : 'An excess of <b>'+num(a.variance)+'</b> unit(s) is taken on charge against '+esc(a.mat)+'.',
    detail: kvRow('Book balance', num(a.book))+kvRow('Physical balance', num(a.phys))+
            kvRow('Reason', esc(a.reason))+kvRow('Authority', esc(a.authority))},
    function(reason){
      a.status='Approved'; a.finance='Posted';
      DB.movements.unshift({id:uid('V'), no:'MOV/2026/'+pad(9800+DB.movements.length*3,6), date:TODAY,
        mat:a.mat, type:'Physical Verification Adjustment', src: a.variance<0? a.store:'Adjustment',
        dst: a.variance<0? 'Write-Off':a.store, qty:Math.abs(a.variance), uom:muom(a.mat),
        value:Math.abs(a.value), ref:a.no, by:'Anil Katwale', status:'Approved'});
      logAudit('Stock Adjustment', a.no,'Approved','Status','Pending','Approved',reason);
      save(); tblReload('tAdj', DB.adjustments);
      commit('Adjustment <b>'+esc(a.no)+'</b> marked approved (local only — the backend already posts the stock change when the variance is recorded and has no separate approval gate; stock in PostgreSQL was already updated).','wa');
    });
}
function rejectAdjustment(id){
  var a = byId(DB.adjustments,'id',id);
  confirmAct({title:'Reject adjustment', kind:'er', btnClass:'dgr', ok:'Reject', reason:true,
    message:'The adjustment is marked rejected in the local register. Note: the backend already posted this stock change when the variance was recorded and has no reversal endpoint, so the stock movement in PostgreSQL is <b>not</b> undone by this action — reverse it with a correcting adjustment if required.'},
    function(reason){
      a.status='Rejected'; a.finance='Pending';
      logAudit('Stock Adjustment', a.no,'Rejected','Status','Pending','Rejected',reason);
      tblReload('tAdj', DB.adjustments);
      commit('Rejected adjustment <b>'+esc(a.no)+'</b> (local only — stock in PostgreSQL was not reversed).','er');
    });
}

/* ============================ DEMAND FORECASTING ============================ */
SCREENS['fc/consumption'] = function(){
  var rows = DB.forecast;
  return pageHead('Consumption Analysis','Demand Forecasting',
    'Historical consumption over three, six and twelve months with movement classification',
    '<button class="btn gh sm" onclick="tblExport(\'tCons2\',\'Consumption_Analysis\')">\u2913 Export</button>',
    reqTags('MMP_18'))+
  summaryRow([
    {l:'Materials analysed', v:rows.length, c:'#1E5A96'},
    {l:'Fast moving', v:rows.filter(function(f){ return f.avg>0 && f.stock/f.avg <= 4; }).length, c:'#15803D'},
    {l:'Slow moving', v:rows.filter(function(f){ return f.avg>0 && f.stock/f.avg > 9; }).length, c:'#B45309'},
    {l:'Non-moving', v:rows.filter(function(f){ return f.avg===0; }).length, c:'#B91C1C'}
  ])+
  '<div class="card" style="margin-bottom:12px"><div class="hd"><span>Twelve-month consumption by material</span></div>'+
    '<div class="bd">'+barChart(rows.slice(0,8).map(function(f,i){
      return {l: mname(f.mat), v: f.c12, c:['#123B64','#1E5A96','#0F766E','#15803D','#B45309','#6B21A8','#B91C1C','#2A6FB5'][i%8]};
    }), {fmt:function(v){ return num(v)+' units'; }})+'</div></div>'+
  '<div class="card"><div class="bd">'+renderTable({id:'tCons2', rows:rows, cols:[
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Current Stock', k:'stock', cls:'num', f:function(r){ return num(r.stock); }},
    {h:'Average Monthly', k:'avg', cls:'num', f:function(r){ return num(r.avg); }},
    {h:'3 Months', k:'c3', cls:'num', f:function(r){ return num(r.c3); }},
    {h:'6 Months', k:'c6', cls:'num', f:function(r){ return num(r.c6); }},
    {h:'12 Months', k:'c12', cls:'num', f:function(r){ return num(r.c12); }},
    {h:'Months of Cover', k:'mc', cls:'num', f:function(r){
      return r.avg? (r.stock/r.avg).toFixed(1) : '\u2014'; },
      sv:function(r){ return r.avg? r.stock/r.avg : 999; }},
    {h:'Projected Stock-out', k:'stockout', f:function(r){
      if(r.stockout==='\u2014') return '\u2014';
      var d = daysBetween(TODAY, r.stockout);
      return '<span style="'+(d<=30?'color:#B91C1C;font-weight:700':(d<=90?'color:#B45309':''))+'">'+fdate(r.stockout)+'</span>'; }},
    {h:'Movement Class', k:'mv', f:function(r){
      var c = r.avg===0 ? 'Non-Moving' : (r.stock/r.avg > 9 ? 'Slow Moving' : (r.stock/r.avg <= 4 ? 'Fast Moving':'Normal'));
      return badge(c); }},
    {h:'Forecast Method', k:'method'}
  ], empty:'No consumption data'})+'</div></div>';
};

SCREENS['fc/forecast'] = function(){
  var rows = DB.forecast;
  return pageHead('Demand Forecast','Demand Forecasting',
    'Forecast demand by method and seasonality, with open requisitions and orders netted off',
    '<button class="btn sec sm" onclick="recalcForecast()">\u26A1 Recalculate forecast</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tFc\',\'Demand_Forecast\')">\u2913 Export</button>',
    reqTags('MMP_18'))+
  summaryRow([
    {l:'Materials forecast', v:rows.length, c:'#1E5A96'},
    {l:'Reorder recommended', v:rows.filter(function(f){ return f.reco.indexOf('Reorder')>=0; }).length, c:'#B45309'},
    {l:'Critical', v:rows.filter(function(f){ return f.reco==='Critical Reorder Required'; }).length, c:'#B91C1C'},
    {l:'Excess stock', v:rows.filter(function(f){ return f.reco==='Excess Stock'; }).length, c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tFc', rows:rows, cols:[
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Current Stock', k:'stock', cls:'num', f:function(r){ return num(r.stock); }},
    {h:'Average Monthly Use', k:'avg', cls:'num', f:function(r){ return num(r.avg); }},
    {h:'Forecast Method', k:'method'},
    {h:'Seasonal Factor', k:'seasonal', cls:'num'},
    {h:'Forecast Quantity', k:'forecast', cls:'num', f:function(r){ return '<b>'+num(r.forecast)+'</b>'; }},
    {h:'Open Requisitions', k:'openReq', cls:'num', f:function(r){ return num(r.openReq); }},
    {h:'Open Orders', k:'openPo', cls:'num', f:function(r){ return num(r.openPo); }},
    {h:'In Transit', k:'transit', cls:'num', f:function(r){ return num(r.transit); }},
    {h:'Safety Stock', k:'safety', cls:'num', f:function(r){ return num(r.safety); }},
    {h:'Lead Time (days)', k:'lead', cls:'num'},
    {h:'Suggested Reorder', k:'suggest', cls:'num', f:function(r){ return r.suggest? '<b>'+num(r.suggest)+'</b>':'\u2014'; }},
    {h:'Recommendation', k:'reco', f:function(r){ return badge(r.reco); }},
    {h:'Approval', k:'approval', f:function(r){ return badge(r.approval); }}
  ], empty:'No forecast data'})+'</div></div>';
};
function recalcForecast(){
  toast('<span class="spin"></span> Recalculating the demand forecast&hellip;','in',1400);
  setTimeout(function(){
    DB.forecast.forEach(function(f){
      var s = DB.stock.filter(function(x){ return x.mat===f.mat; })[0];
      f.stock = s? s.avail : f.stock;
      var ro = mreorder(f.mat);
      f.forecast = Math.round(f.avg * 3 * f.seasonal);
      f.suggest = Math.max(0, f.forecast + f.safety - f.stock - f.openPo - f.transit);
      if(f.stock===0 || f.stock < ro*0.5) f.reco = 'Critical Reorder Required';
      else if(f.stock < ro) f.reco = 'Reorder Required';
      else if(f.stock > ro*4) f.reco = 'Excess Stock';
      else if(f.avg>0 && f.stock/f.avg > 9) f.reco = 'Slow Moving';
      else f.reco = 'Watch List';
      f.stockout = f.avg>0 ? addDays(TODAY, Math.round(f.stock/f.avg*30)) : '\u2014';
    });
    logAudit('Demand Forecast','All materials','Recalculated','Forecast','Previous','Revised','Forecast run on current stock position');
    commit('Forecast recalculated for '+DB.forecast.length+' material(s).','ok');
    if(TBL.tFc) tblReload('tFc', DB.forecast);
    if(TBL.tFcRo) tblReload('tFcRo', DB.forecast.filter(function(f){ return f.suggest>0; }));
  }, 1200);
}

SCREENS['fc/reorder'] = function(){
  var rows = DB.forecast.filter(function(f){ return f.suggest>0; });
  return pageHead('Suggested Reorder','Demand Forecasting',
    'System-suggested reorder quantities, with override and justification before requisition',
    '<button class="btn gh sm" onclick="tblExport(\'tFcRo\',\'Suggested_Reorder\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="forecastToRequisition()">Raise requisition for selected</button>',
    reqTags('MMP_18'))+
  summaryRow([
    {l:'Materials suggested', v:rows.length, c:'#B45309'},
    {l:'Critical', v:rows.filter(function(f){ return f.reco==='Critical Reorder Required'; }).length, c:'#B91C1C'},
    {l:'Approved', v:rows.filter(function(f){ return f.approval==='Approved'; }).length, c:'#15803D'},
    {l:'Indicative value', v:inr0(sum(rows, function(f){ return (f.override||f.suggest)*mrate(f.mat); })), c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tFcRo', rows:rows, select:true, cols:[
    {h:'Material', k:'mat', cls:'mono'},
    {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
    {h:'Current Stock', k:'stock', cls:'num', f:function(r){ return num(r.stock); }},
    {h:'Forecast Quantity', k:'forecast', cls:'num', f:function(r){ return num(r.forecast); }},
    {h:'Safety Stock', k:'safety', cls:'num', f:function(r){ return num(r.safety); }},
    {h:'Open Coverage', k:'oc', cls:'num', f:function(r){ return num(r.openPo+r.transit); }},
    {h:'Suggested Quantity', k:'suggest', cls:'num', f:function(r){ return '<b>'+num(r.suggest)+'</b>'; }},
    {h:'Override Quantity', k:'override', cls:'num', f:function(r){
      return '<input type="number" class="inp num" style="width:92px" min="0" value="'+(r.override||0)+
      '" onchange="setOverride(\''+r.id+'\',this.value)">'; }},
    {h:'Justification', k:'justification', f:function(r){
      return '<input class="inp" style="min-width:160px" value="'+esc(r.justification)+
      '" placeholder="Needed if overriding" onchange="setJustification(\''+r.id+'\',this.value)">'; }},
    {h:'Rate', k:'rate', cls:'num', f:function(r){ return inr(mrate(r.mat)); }},
    {h:'Indicative Value', k:'v', cls:'num',
      f:function(r){ return inr((r.override||r.suggest)*mrate(r.mat)); },
      sv:function(r){ return (r.override||r.suggest)*mrate(r.mat); }},
    {h:'Recommendation', k:'reco', f:function(r){ return badge(r.reco); }},
    {h:'Approval', k:'approval', f:function(r){ return badge(r.approval); }}
  ], empty:'No reorder is suggested at present'})+'</div></div>';
};
function setOverride(id, v){
  var f = byId(DB.forecast,'id',id);
  f.override = Math.max(0, Number(v)||0); save();
}
function setJustification(id, v){
  var f = byId(DB.forecast,'id',id); f.justification = v; save();
}
function forecastToRequisition(){
  var sel = tblRows('tFcRo');
  if(!sel.length){ toast('Select at least one material.','wa'); return; }
  var bad = sel.filter(function(f){ return f.override>0 && !f.justification; });
  if(bad.length){ toast(bad.length+' overridden line(s) have no justification. Record a justification first.','er'); return; }
  var value = sum(sel, function(f){ return (f.override||f.suggest)*mrate(f.mat); });
  confirmAct({title:'Raise requisition from forecast', ok:'Raise requisition', btnClass:'pri', reason:true,
    message:'A requisition is raised covering '+sel.length+' material line(s) worth <b>'+inr(value)+'</b>, based on the demand forecast.'},
    async function(reason){
      var storeObj = byId(DB.stores,'store_name', STORES[0]);
      var payloadLines = [];
      for(var i=0;i<sel.length;i++){
        var f = sel[i];
        var matObj = byId(DB.materials,'code', f.mat);
        if(!matObj){ toast('Could not resolve material "'+esc(f.mat)+'" against the master data.','er'); return; }
        payloadLines.push({item_id: matObj.id, requested_qty: (f.override||f.suggest), est_unit_rate: mrate(f.mat), preferred_make:'', technical_spec: matObj.spec||''});
      }
      var payload = {req_date: TODAY, store_id: storeObj.id, priority:'Normal',
        purpose:'Forecast-based replenishment. '+reason, lines: payloadLines};
      var created;
      try {
        var res = await fetch(API_BASE+'/requisitions/', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)});
        if(!res.ok){ var e = await res.text(); toast('Save failed: backend rejected the requisition ('+res.status+'). '+esc(e.slice(0,150)),'er'); return; }
        created = await res.json();
      } catch(err) { toast('Save failed: could not reach the backend API. '+esc(String(err.message||err)),'er'); return; }
      var no = created.req_no || seq('MR/DIT/2026/', DB.requisitions,'no',6);
      DB.requisitions.unshift({
        id:created.id, no:no, date:TODAY, dept:DEPTS[0], office:'Head Office', section:'Store Section',
        requestor:'Anil Katwale',
        lines: sel.map(function(f){
          return {mat:f.mat, desc:mname(f.mat), qty:(f.override||f.suggest), uom:muom(f.mat),
                  rate:mrate(f.mat), make:'', spec:(byId(DB.materials,'code',f.mat)||{spec:''}).spec};
        }),
        value:value, budget:'Pending', stockAvail:'Not Available', priority:'Normal',
        status:'Submitted', approver:'Head of Office', location:STORES[0],
        requiredBy: addDays(TODAY,45), purpose:'Forecast-based replenishment. '+reason,
        coa:COA[0], fund:FUNDS[0], scheme:SCHEMES[0], project:PROJECTS[0], costCentre:COST_CENTRES[0],
        availBudget:0, mode:'Open Tender', attachments:[]
      });
      sel.forEach(function(f){ f.approval = 'Approved'; });
      logAudit('Requisition', no,'Submitted','Status','\u2014','Submitted','Raised from demand forecast');
      save(); refreshNavCounts();
      toast('Raised requisition <b>'+esc(no)+'</b> from the forecast in PostgreSQL (id '+created.id+').','ok');
      goto('req/list');
    });
}

/* ============================ REPORTS AND MIS ============================ */
SCREENS['rep/procurement'] = function(){
  var D = DB;
  var byMode = {};
  D.workorders.forEach(function(w){ byMode[w.mode] = (byMode[w.mode]||0) + w.value; });
  var modeRows = Object.keys(byMode).map(function(k,i){
    return {l:k, v:Math.round(byMode[k]), c:['#123B64','#1E5A96','#0F766E','#15803D','#B45309','#6B21A8','#B91C1C'][i%7]};
  });
  var byDept = DEPTS.map(function(d,i){
    return {l:d, v:Math.round(sum(D.workorders.filter(function(w){ return w.dept===d; }),'value')),
      c:['#123B64','#1E5A96','#0F766E','#15803D','#B45309','#6B21A8','#B91C1C'][i%7]};
  }).filter(function(r){ return r.v>0; });
  var cycle = [
    {l:'Requisition to approval', v:6},{l:'Approval to tender', v:11},
    {l:'Tender to award', v:32},{l:'Award to order', v:7},
    {l:'Order to delivery', v:44},{l:'Delivery to payment', v:26}
  ];
  return pageHead('Procurement MIS','Reports and MIS',
    'Procurement value, mode analysis, cycle time and tender outcome for FY 2026-27',
    '<button class="btn gh sm" onclick="window.print()">\u2399 Print</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tRepP\',\'Procurement_MIS\')">\u2913 Export</button>',
    reqTags('MMP_19','MMP_20'))+
  summaryRow([
    {l:'Orders placed', v:D.workorders.length, c:'#1E5A96'},
    {l:'Order value', v:inr0(sum(D.workorders,'value')), c:'#0F766E'},
    {l:'Tenders floated', v:D.tenders.length, c:'#B45309'},
    {l:'Average cycle time', v:'126 days', c:'#6B21A8'}
  ])+
  '<div class="grid g2" style="margin-bottom:12px">'+
    '<div class="card"><div class="hd"><span>Order value by procurement mode</span></div>'+
      '<div class="bd">'+barChart(modeRows, {fmt:inr0})+'</div></div>'+
    '<div class="card"><div class="hd"><span>Order value by department</span></div>'+
      '<div class="bd">'+barChart(byDept, {fmt:inr0})+'</div></div>'+
  '</div>'+
  '<div class="card" style="margin-bottom:12px"><div class="hd"><span>Average cycle time by stage (days)</span></div>'+
    '<div class="bd">'+colChart(cycle.map(function(c,i){
      return {l:c.l, v:c.v, c:['#123B64','#1E5A96','#0F766E','#15803D','#B45309','#6B21A8'][i]};
    }))+'</div></div>'+
  '<div class="card"><div class="hd"><span>Order register</span></div><div class="bd">'+
    renderTable({id:'tRepP', rows:DB.workorders, cols:[
      {h:'Work Order', k:'no', cls:'mono'},
      {h:'Date', k:'date', f:function(r){ return fdate(r.date); }},
      {h:'Department', k:'dept'},
      {h:'Vendor', k:'vendor', f:function(r){ return esc(vname(r.vendor)); }},
      {h:'Mode', k:'mode'},
      {h:'Order Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
      {h:'Delivered Value', k:'deliveredValue', cls:'num', f:function(r){ return inr(r.deliveredValue); }},
      {h:'Delivery %', k:'dp', cls:'num', f:function(r){ return pct(r.delivered, sum(r.lines,'qty')).toFixed(0)+'%'; },
        sv:function(r){ return pct(r.delivered, sum(r.lines,'qty')); }},
      {h:'Status', k:'status', f:function(r){ return badge(r.status); }}
    ]})+'</div></div>';
};

SCREENS['rep/inventory'] = function(){
  var D = DB;
  var catRows = Object.keys(CATS).map(function(c,i){
    var mats = D.materials.filter(function(m){ return m.cat===c; }).map(function(m){ return m.code; });
    return {l:c, v: Math.round(sum(D.stock.filter(function(s){ return mats.indexOf(s.mat)>=0; }),
      function(s){ return s.avail*s.rate; })),
      c:['#123B64','#1E5A96','#0F766E','#15803D','#B45309','#6B21A8'][i%6]};
  });
  var rows = DB.stock.map(function(s,i){
    var m = byId(DB.materials,'code',s.mat) || {};
    var f = DB.forecast.filter(function(x){ return x.mat===s.mat; })[0];
    var avg = f? f.avg : 0;
    return {id:'RI'+i, mat:s.mat, cat:m.cat||'\u2014', store:s.store, avail:s.avail, rate:s.rate,
      value:s.avail*s.rate, avg:avg, cover: avg? (s.avail/avg):999,
      cls: avg===0 ? 'Non-Moving' : (s.avail/avg > 9 ? 'Slow Moving' : (s.avail/avg <= 4 ? 'Fast Moving':'Normal')),
      state: stockState(s)};
  });
  return pageHead('Inventory MIS','Reports and MIS',
    'Stock value, category analysis, ageing and movement classification across stores',
    '<button class="btn gh sm" onclick="window.print()">\u2399 Print</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tRepI\',\'Inventory_MIS\')">\u2913 Export</button>',
    reqTags('MMP_19','MMP_20'))+
  summaryRow([
    {l:'Total stock value', v:inr0(sum(rows,'value')), c:'#15803D'},
    {l:'Fast moving', v:rows.filter(function(r){ return r.cls==='Fast Moving'; }).length, c:'#0F766E'},
    {l:'Slow or non-moving', v:rows.filter(function(r){ return ['Slow Moving','Non-Moving'].indexOf(r.cls)>=0; }).length, c:'#B45309'},
    {l:'Below reorder level', v:rows.filter(function(r){ return ['Low Stock','Critical','Stock Out'].indexOf(r.state)>=0; }).length, c:'#B91C1C'}
  ])+
  '<div class="grid g2" style="margin-bottom:12px">'+
    '<div class="card"><div class="hd"><span>Stock value by category</span></div>'+
      '<div class="bd">'+barChart(catRows, {fmt:inr0})+'</div></div>'+
    '<div class="card"><div class="hd"><span>Movement classification</span></div><div class="bd">'+
      donut([
        {l:'Fast moving', v:rows.filter(function(r){ return r.cls==='Fast Moving'; }).length, c:'#15803D'},
        {l:'Normal', v:rows.filter(function(r){ return r.cls==='Normal'; }).length, c:'#1E5A96'},
        {l:'Slow moving', v:rows.filter(function(r){ return r.cls==='Slow Moving'; }).length, c:'#B45309'},
        {l:'Non-moving', v:rows.filter(function(r){ return r.cls==='Non-Moving'; }).length, c:'#B91C1C'}
      ])+'</div></div>'+
  '</div>'+
  '<div class="card"><div class="hd"><span>Material-wise inventory position</span></div><div class="bd">'+
    renderTable({id:'tRepI', rows:rows, cols:[
      {h:'Material', k:'mat', cls:'mono'},
      {h:'Material Name', k:'n', f:function(r){ return esc(mname(r.mat)); }},
      {h:'Category', k:'cat'},
      {h:'Store', k:'store'},
      {h:'Available', k:'avail', cls:'num', f:function(r){ return num(r.avail); }},
      {h:'Rate', k:'rate', cls:'num', f:function(r){ return inr(r.rate); }},
      {h:'Stock Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
      {h:'Average Monthly Use', k:'avg', cls:'num', f:function(r){ return num(r.avg); }},
      {h:'Months of Cover', k:'cover', cls:'num', f:function(r){ return r.cover>=999? '\u2014':r.cover.toFixed(1); }},
      {h:'Movement Class', k:'cls', f:function(r){ return badge(r.cls); }},
      {h:'Stock Status', k:'state', f:function(r){ return badge(r.state); }}
    ]})+'</div></div>';
};

SCREENS['rep/vendor'] = function(){
  var rows = VENDORS.map(function(v,i){
    var wos = DB.workorders.filter(function(w){ return w.vendor===v.code; });
    var dels = DB.deliveries.filter(function(d){ return d.vendor===v.code; });
    var onTime = dels.filter(function(d){ return d.status==='Delivered' && (!d.actual || d.actual<=d.expected); }).length;
    var grns = DB.grns.filter(function(g){ return g.vendor===v.code; });
    var rejQty = sum(grns,'rejected'), recdQty = sum(grns,'received');
    var defs = DB.defects.filter(function(d){ return d.vendor===v.code; });
    var openDefs = defs.filter(function(d){ return ['Resolved','Closed'].indexOf(d.status)<0; });
    var invs = DB.invoices.filter(function(x){ return x.vendor===v.code; });
    var exc = invs.filter(function(x){ return x.status==='Exception'; }).length;
    var score = Math.max(0, Math.min(100, Math.round(
      (dels.length? onTime/dels.length*40 : 30) +
      (recdQty? (1-rejQty/recdQty)*30 : 25) +
      (defs.length? Math.max(0, 20 - openDefs.length*4) : 20) +
      (invs.length? Math.max(0, 10 - exc*3) : 8))));
    return {id:'VP'+i, code:v.code, name:v.name, cat:v.cat, rating:v.rating,
      orders:wos.length, value:sum(wos,'value'),
      onTime: dels.length? Math.round(onTime/dels.length*100):0,
      rejPct: recdQty? +(rejQty/recdQty*100).toFixed(1):0,
      defects:defs.length, openDefects:openDefs.length, exceptions:exc, score:score,
      grade: score>=80? 'A \u2014 Preferred' : (score>=65? 'B \u2014 Satisfactory' : (score>=50? 'C \u2014 Watch List':'D \u2014 Review'))};
  });
  return pageHead('Vendor Performance','Reports and MIS',
    'Vendor scorecard on delivery punctuality, quality, warranty redressal and billing accuracy',
    '<button class="btn gh sm" onclick="window.print()">\u2399 Print</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tRepV\',\'Vendor_Performance\')">\u2913 Export</button>',
    reqTags('MMP_19'))+
  summaryRow([
    {l:'Vendors evaluated', v:rows.length, c:'#1E5A96'},
    {l:'Grade A', v:rows.filter(function(r){ return r.score>=80; }).length, c:'#15803D'},
    {l:'Watch list or review', v:rows.filter(function(r){ return r.score<65; }).length, c:'#B91C1C'},
    {l:'Business placed', v:inr0(sum(rows,'value')), c:'#0F766E'}
  ])+
  '<div class="card" style="margin-bottom:12px"><div class="hd"><span>Performance score</span>'+
    '<span class="muted" style="font-size:11px;font-weight:400">Delivery 40 &middot; quality 30 &middot; warranty 20 &middot; billing 10</span></div>'+
    '<div class="bd">'+barChart(rows.slice().sort(function(a,b){ return b.score-a.score; }).map(function(r){
      return {l:r.name, v:r.score, c: r.score>=80? '#15803D' : (r.score>=65? '#1E5A96' : (r.score>=50? '#B45309':'#B91C1C'))};
    }), {fmt:function(v){ return v+' / 100'; }})+'</div></div>'+
  '<div class="card"><div class="bd">'+renderTable({id:'tRepV', rows:rows, cols:[
    {h:'Vendor Code', k:'code', cls:'mono'},
    {h:'Vendor Name', k:'name'},
    {h:'Category', k:'cat'},
    {h:'Orders', k:'orders', cls:'num'},
    {h:'Order Value', k:'value', cls:'num', f:function(r){ return inr(r.value); }},
    {h:'On-time Delivery %', k:'onTime', cls:'num', f:function(r){
      return '<span style="'+(r.onTime<60?'color:#B91C1C;font-weight:700':'')+'">'+r.onTime+'%</span>'; }},
    {h:'Rejection %', k:'rejPct', cls:'num', f:function(r){
      return '<span style="'+(r.rejPct>5?'color:#B91C1C;font-weight:700':'')+'">'+r.rejPct+'%</span>'; }},
    {h:'Defect Complaints', k:'defects', cls:'num'},
    {h:'Open Complaints', k:'openDefects', cls:'num', f:function(r){
      return r.openDefects? '<b style="color:#B91C1C">'+r.openDefects+'</b>':'0'; }},
    {h:'Billing Exceptions', k:'exceptions', cls:'num'},
    {h:'Performance Score', k:'score', cls:'num', f:function(r){ return '<b>'+r.score+'</b>'; }},
    {h:'Grade', k:'grade', f:function(r){
      var c = r.score>=80?'b-ok':(r.score>=65?'b-in':(r.score>=50?'b-wa':'b-er'));
      return '<span class="bdg '+c+'">'+esc(r.grade)+'</span>'; }}
  ]})+'</div></div>';
};

SCREENS['rep/trail'] = function(){
  return pageHead('Audit Trail','Reports and MIS',
    'Complete audit trail of master data changes, approvals and transactions',
    '<button class="btn gh sm" onclick="tblExport(\'tTrail\',\'Audit_Trail\')">\u2913 Export</button>',
    reqTags('MMP_21'))+
  summaryRow([
    {l:'Audit entries', v:DB.trail.length, c:'#1E5A96'},
    {l:'Approvals', v:DB.trail.filter(function(t){ return t.action.indexOf('Approved')>=0; }).length, c:'#15803D'},
    {l:'Exceptions and escalations', v:DB.trail.filter(function(t){ return ['Exception Raised','Escalated','Rejected'].indexOf(t.action)>=0; }).length, c:'#B91C1C'},
    {l:'System entries', v:DB.trail.filter(function(t){ return t.by==='System'; }).length, c:'#7386A0'}
  ])+
  filterBar([
    fld({id:'ftType', label:'Record type', type:'select', blank:'All',
         opts:uniq(DB.trail.map(function(t){ return t.type; }))}),
    fld({id:'ftRef', label:'Reference', ph:'Document number'}),
    fld({id:'ftBy', label:'User', type:'select', blank:'All', opts:uniq(DB.trail.map(function(t){ return t.by; }))}),
    fld({id:'ftAction', label:'Action', type:'select', blank:'All', opts:uniq(DB.trail.map(function(t){ return t.action; }))})
  ], 'applyTrailFilter()',
    '<button class="btn sm" onclick="resetTrailFilter()">\u21BA Reset</button>')+
  '<div class="card"><div class="bd">'+renderTable({id:'tTrail', rows:DB.trail, cols:[
    {h:'Timestamp', k:'ts', cls:'nowrap', f:function(r){ return fdatetime(r.ts); }},
    {h:'Record Type', k:'type'},
    {h:'Reference', k:'ref', cls:'mono'},
    {h:'Action', k:'action'},
    {h:'Field Changed', k:'field'},
    {h:'Old Value', k:'oldv'},
    {h:'New Value', k:'newv'},
    {h:'Reason', k:'reason'},
    {h:'User', k:'by'},
    {h:'Role', k:'role'},
    {h:'Approval Reference', k:'approval', cls:'mono'},
    {h:'Source', k:'src'},
    {h:'IP Address', k:'ip', cls:'mono'}
  ], empty:'No audit entry'})+'</div></div>';
};
function applyTrailFilter(){
  var f = function(x){ return val(x); };
  var rows = DB.trail.filter(function(t){
    return (!f('ftType') || t.type===f('ftType')) &&
      (!f('ftRef') || String(t.ref).toLowerCase().indexOf(f('ftRef').toLowerCase())>=0) &&
      (!f('ftBy') || t.by===f('ftBy')) &&
      (!f('ftAction') || t.action===f('ftAction'));
  });
  tblReload('tTrail', rows);
  toast(rows.length+' audit entry(ies) matched.', rows.length?'ok':'wa');
}
function resetTrailFilter(){
  ['ftType','ftRef','ftBy','ftAction'].forEach(function(i){ setVal(i,''); });
  tblReload('tTrail', DB.trail); toast('Filters cleared.','in');
}

/* ============================ ADMINISTRATION ============================ */
SCREENS['admin/workflow'] = function(){
  return pageHead('Workflow Configuration','Administration',
    'Approval levels, value slabs, turnaround targets and escalation for each module',
    '<button class="btn gh sm" onclick="tblExport(\'tWf\',\'Workflow_Configuration\')">\u2913 Export</button>'+
    '<button class="btn pri sm" onclick="workflowEntry()">+ Add level</button>',
    reqTags('MMP_22'))+
  summaryRow([
    {l:'Workflow rules', v:DB.workflows.length, c:'#1E5A96'},
    {l:'Modules covered', v:uniq(DB.workflows.map(function(w){ return w.module; })).length, c:'#0F766E'},
    {l:'Active', v:DB.workflows.filter(function(w){ return w.status==='Active'; }).length, c:'#15803D'},
    {l:'Average TAT', v:(sum(DB.workflows,'tat')/Math.max(1,DB.workflows.length)).toFixed(1)+' days', c:'#B45309'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tWf', rows:DB.workflows, cols:[
    {h:'Module', k:'module'},
    {h:'Approval Level', k:'level', cls:'num'},
    {h:'Approving Role', k:'role'},
    {h:'Value From', k:'from', cls:'num', f:function(r){ return inr(r.from); }},
    {h:'Value To', k:'to', cls:'num', f:function(r){ return inr(r.to); }},
    {h:'Turnaround (days)', k:'tat', cls:'num'},
    {h:'Escalation To', k:'escalate'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon(r.status==='Active'?'Suspend':'Activate','toggleWorkflow(\''+r.id+'\')',
        r.status==='Active'?'dgr':'ok'); }}
  ]})+'</div></div>';
};
function workflowEntry(){
  modal({title:'Add workflow level', size:'md',
    body:'<div id="wfForm"><div class="fgrid g2">'+
      fld({id:'wfMod', label:'Module', type:'select', req:true, blank:false,
           opts:['Requisition','Work Order','Disposal','Stock Adjustment','Invoice','Material Master']})+
      fld({id:'wfLevel', label:'Approval level', type:'number', val:1, num:true, req:true, min:1})+
      fld({id:'wfRole', label:'Approving role', type:'select', req:true, blank:false,
           opts:['Store Officer','Procurement Officer','Head of Office','Finance Wing','Head of Department','Administrative Secretary','Chief Accounts Officer']})+
      fld({id:'wfTat', label:'Turnaround (days)', type:'number', val:5, num:true, req:true})+
      fld({id:'wfFrom', label:'Value from (\u20B9)', type:'number', val:0, num:true, req:true})+
      fld({id:'wfTo', label:'Value to (\u20B9)', type:'number', val:1000000, num:true, req:true})+
      fld({id:'wfEsc', label:'Escalation to', type:'select', blank:false,
           opts:['Administrative Officer','Head of Office','Deputy Secretary','Head of Department','Principal Secretary']})+
      '</div></div>',
    footer:'<button class="btn" data-close>Cancel</button>'+
      '<button class="btn pri" onclick="saveWorkflow()">Add level</button>'});
}
function saveWorkflow(){
  if(!requireOk('wfForm')) return;
  if(nval('wfTo') <= nval('wfFrom')){ toast('The upper value slab must exceed the lower one.','er'); return; }
  var rec = {id:uid('WF'), module:val('wfMod'), level:nval('wfLevel'), role:val('wfRole'),
    from:nval('wfFrom'), to:nval('wfTo'), tat:nval('wfTat'), escalate:val('wfEsc'), status:'Active'};
  DB.workflows.push(rec);
  logAudit('Workflow Configuration', rec.module+' L'+rec.level,'Created','Status','\u2014','Active',
    rec.role+' for '+inr(rec.from)+' to '+inr(rec.to));
  closeModal(); save(); tblReload('tWf', DB.workflows);
  toast('Added approval level for <b>'+esc(rec.module)+'</b>.','ok');
}
function toggleWorkflow(id){
  var w = byId(DB.workflows,'id',id);
  var next = w.status==='Active' ? 'Suspended':'Active';
  confirmAct({title:next+' workflow level', kind: next==='Suspended'?'wa':'in',
    btnClass: next==='Suspended'?'dgr':'ok', ok:next, reason:true,
    message:'The approval level for <b>'+esc(w.module)+'</b> at level '+w.level+' is '+next.toLowerCase()+'.'+
      (next==='Suspended'? ' Cases in that value slab will skip this level.':'')},
    function(reason){
      var old = w.status; w.status = next;
      logAudit('Workflow Configuration', w.module+' L'+w.level, next,'Status',old,next,reason);
      tblReload('tWf', DB.workflows);
      commit('Workflow level '+next.toLowerCase()+'.','ok');
    });
}

SCREENS['admin/limits'] = function(){
  return pageHead('Approval Limits','Administration',
    'Delegation of financial powers by role and procurement mode',
    '<button class="btn gh sm" onclick="tblExport(\'tLim\',\'Approval_Limits\')">\u2913 Export</button>',
    reqTags('MMP_22'))+
  '<div class="card"><div class="bd">'+renderTable({id:'tLim', rows:DB.limits, cols:[
    {h:'Role', k:'role'},
    {h:'Direct Purchase', k:'direct', cls:'num', f:function(r){ return inr(r.direct); }},
    {h:'Quotation', k:'quotation', cls:'num', f:function(r){ return inr(r.quotation); }},
    {h:'Limited Tender', k:'limited', cls:'num', f:function(r){ return r.limited? inr(r.limited):'Not delegated'; }},
    {h:'Open Tender', k:'open', cls:'num', f:function(r){ return r.open? inr(r.open):'Not delegated'; }},
    {h:'Disposal', k:'disposal', cls:'num', f:function(r){ return inr(r.disposal); }},
    {h:'Stock Adjustment', k:'adjust', cls:'num', f:function(r){ return inr(r.adjust); }}
  ]})+'</div></div>'+
  '<div class="note in" style="margin-top:12px">Limits follow the delegation of financial powers notified by the Finance Department. A case above the delegated limit routes automatically to the next level in the workflow configuration.</div>';
};

SCREENS['admin/rules'] = function(){
  return pageHead('Notification Rules','Administration',
    'Event-driven alerts, recipients, channels and frequency',
    '<button class="btn gh sm" onclick="tblExport(\'tRul\',\'Notification_Rules\')">\u2913 Export</button>',
    reqTags('MMP_22'))+
  summaryRow([
    {l:'Rules configured', v:DB.rules.length, c:'#1E5A96'},
    {l:'Active', v:DB.rules.filter(function(r){ return r.status==='Active'; }).length, c:'#15803D'},
    {l:'Suspended', v:DB.rules.filter(function(r){ return r.status==='Suspended'; }).length, c:'#B45309'},
    {l:'Immediate alerts', v:DB.rules.filter(function(r){ return r.freq==='Immediate'; }).length, c:'#B91C1C'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRul', rows:DB.rules, cols:[
    {h:'Event', k:'event'},
    {h:'Channel', k:'channel'},
    {h:'Recipients', k:'recipients'},
    {h:'Frequency', k:'freq'},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon(r.status==='Active'?'Suspend':'Activate','toggleRule(\''+r.id+'\')',
        r.status==='Active'?'dgr':'ok')+
      actIcon('Test','testRule(\''+r.id+'\')','gh'); }}
  ]})+'</div></div>';
};
function toggleRule(id){
  var r = byId(DB.rules,'id',id);
  var next = r.status==='Active'? 'Suspended':'Active';
  confirmAct({title:next+' notification rule', kind: next==='Suspended'?'wa':'in',
    btnClass: next==='Suspended'?'dgr':'ok', ok:next, reason:true,
    message:'Alerts for <b>'+esc(r.event)+'</b> will '+(next==='Suspended'? 'stop going out':'resume')+'.'},
    function(reason){
      var old = r.status; r.status = next;
      logAudit('Notification Rule', r.event, next,'Status', old, next, reason);
      tblReload('tRul', DB.rules);
      commit('Rule '+next.toLowerCase()+'.','ok');
    });
}
function testRule(id){
  var r = byId(DB.rules,'id',id);
  notify('in','Test alert \u2014 '+r.event,'Sent to '+r.recipients+' over '+r.channel,'admin/rules');
  toast('Test alert generated for <b>'+esc(r.event)+'</b>.','ok');
}

SCREENS['admin/integration'] = function(){
  var p = DB.portals;
  return pageHead('Integration Monitor','Administration',
    'Connection status and record reconciliation with procurement portals and IFMS modules',
    '<button class="btn sec sm" onclick="simulateSync()">\u21BB Sync all portals</button>'+
    '<button class="btn gh sm" onclick="tblExport(\'tPort\',\'Integration_Monitor\')">\u2913 Export</button>',
    reqTags('MMP_1','MMP_22'))+
  summaryRow([
    {l:'Connected', v:p.filter(function(x){ return x.status==='Connected'; }).length, c:'#15803D'},
    {l:'Degraded', v:p.filter(function(x){ return x.status==='Degraded'; }).length, c:'#B45309'},
    {l:'Records received', v:num(sum(p,'recd')), c:'#1E5A96'},
    {l:'Failed reconciliation', v:num(sum(p,'failed')), c:'#B91C1C'}
  ])+
  '<div class="grid g2" style="margin-bottom:12px">'+p.map(function(x){
    return '<div class="port"><div class="ph"><div>'+
      '<div class="fw6" style="font-size:13px;color:var(--navy-2)">'+esc(x.name)+'</div>'+
      '<div class="muted" style="font-size:10.5px">'+esc(x.url)+' &middot; '+esc(x.note)+'</div></div>'+
      '<span class="bdg '+(x.status==='Connected'?'b-ok':'b-wa')+'">'+esc(x.status)+'</span></div>'+
      '<div class="pb"><table class="kv">'+
      kvRow('Last synchronised', fdatetime(x.last))+
      kvRow('Records received', num(x.recd))+
      kvRow('Records processed', num(x.proc))+
      kvRow('Failed', x.failed? '<b style="color:#B91C1C">'+num(x.failed)+'</b>':'0')+
      kvRow('Pending reconciliation', x.pending? '<b style="color:#B45309">'+num(x.pending)+'</b>':'0')+'</table>'+
      '<div class="btn-row" style="margin-top:9px">'+
      '<button class="btn xs sec" onclick="simulateSync()">Sync now</button>'+
      (x.failed? '<button class="btn xs warn" onclick="reconcilePortal(\''+x.id+'\')">Reconcile failures</button>':'')+
      '</div></div></div>';
  }).join('')+'</div>'+
  '<div class="card"><div class="hd"><span>Portal summary</span></div><div class="bd">'+
    renderTable({id:'tPort', rows:p, cols:[
      {h:'Portal / Module', k:'name'},
      {h:'Endpoint', k:'url', cls:'mono'},
      {h:'Purpose', k:'note'},
      {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
      {h:'Last Sync', k:'last', f:function(r){ return fdatetime(r.last); }},
      {h:'Received', k:'recd', cls:'num', f:function(r){ return num(r.recd); }},
      {h:'Processed', k:'proc', cls:'num', f:function(r){ return num(r.proc); }},
      {h:'Failed', k:'failed', cls:'num', f:function(r){ return r.failed? '<b style="color:#B91C1C">'+num(r.failed)+'</b>':'0'; }},
      {h:'Pending', k:'pending', cls:'num', f:function(r){ return num(r.pending); }}
    ]})+'</div></div>';
};
function reconcilePortal(id){
  var p = byId(DB.portals,'id',id);
  confirmAct({title:'Reconcile failed records', ok:'Reconcile', btnClass:'warn', kind:'wa', reason:true,
    message:'<b>'+num(p.failed)+'</b> record(s) from '+esc(p.name)+' failed reconciliation. Reprocessing them may create duplicate references if the earlier failure was partial.'},
    function(reason){
      var fixed = Math.ceil(p.failed*0.8);
      p.proc += fixed; p.failed -= fixed; p.pending = p.failed;
      if(p.failed===0) p.status='Connected';
      logAudit('Integration', p.name,'Reconciled','Failed Records', String(p.failed+fixed), String(p.failed), reason);
      save(); goto('admin/integration');
      toast(fixed+' record(s) reconciled. '+p.failed+' still failing.', p.failed? 'wa':'ok');
    });
}

SCREENS['admin/roles'] = function(){
  return pageHead('User Role Mapping','Administration',
    'Users mapped to roles, departments, stores and financial approval limits',
    '<button class="btn gh sm" onclick="tblExport(\'tRol\',\'User_Role_Mapping\')">\u2913 Export</button>',
    reqTags('MMP_22'))+
  summaryRow([
    {l:'Users mapped', v:DB.roles.length, c:'#1E5A96'},
    {l:'Active', v:DB.roles.filter(function(r){ return r.status==='Active'; }).length, c:'#15803D'},
    {l:'Suspended', v:DB.roles.filter(function(r){ return r.status==='Suspended'; }).length, c:'#B91C1C'},
    {l:'Roles in use', v:uniq(DB.roles.map(function(r){ return r.role; })).length, c:'#0F766E'}
  ])+
  '<div class="card"><div class="bd">'+renderTable({id:'tRol', rows:DB.roles, cols:[
    {h:'User', k:'user'},
    {h:'Employee Code', k:'empc', cls:'mono'},
    {h:'Role', k:'role'},
    {h:'Department', k:'dept'},
    {h:'Stores Mapped', k:'stores'},
    {h:'Approval Limit', k:'limit', cls:'num', f:function(r){ return r.limit? inr(r.limit):'Not delegated'; }},
    {h:'Status', k:'status', f:function(r){ return badge(r.status); }},
    {h:'Actions', k:'a', cls:'acts', srt:false, f:function(r){
      return actIcon(r.status==='Active'?'Suspend':'Activate','toggleRole(\''+r.id+'\')',
        r.status==='Active'?'dgr':'ok'); }}
  ]})+'</div></div>';
};
function toggleRole(id){
  var r = byId(DB.roles,'id',id);
  var next = r.status==='Active'? 'Suspended':'Active';
  confirmAct({title:next+' user', kind: next==='Suspended'?'er':'in',
    btnClass: next==='Suspended'?'dgr':'ok', ok:next, reason:true,
    message:'<b>'+esc(r.user)+'</b> will '+(next==='Suspended'? 'lose access to the module. Cases pending with this user must be reassigned.':'regain access to the module.')},
    function(reason){
      var old = r.status; r.status = next;
      logAudit('User Role Mapping', r.empc, next,'Status', old, next, reason);
      tblReload('tRol', DB.roles);
      commit(esc(r.user)+' '+next.toLowerCase()+'.','ok');
    });
}

/* ------------------------------------------------------------
   BOOT & LIVE FASTAPI DATABASE SYNCHRONIZATION
   ------------------------------------------------------------ */
var API_BASE = 'http://127.0.0.1:8002/api/v1';

async function syncWithBackend(){
  try {
    const res = await fetch(API_BASE + '/dashboard/stats');
    if (!res.ok) return;

    const modeEl = document.getElementById('storeMode');
    if (modeEl) modeEl.textContent = 'Live PostgreSQL 17 (ifms_jk)';

    // 1. Fetch Masters Dynamically
    const [deptRes, storeRes, vendorRes, catRes, uomRes] = await Promise.all([
      fetch(API_BASE + '/admin/departments'),
      fetch(API_BASE + '/inventory/stores'),
      fetch(API_BASE + '/admin/parties'),
      fetch(API_BASE + '/materials/categories'),
      fetch(API_BASE + '/materials/uoms')
    ]);

    if (deptRes.ok) {
      const dList = await deptRes.json();
      if (dList && dList.length) {
        DEPTS.length = 0;
        dList.forEach(function(d){ DEPTS.push(d.dept_name || d.name || d.department_name); });
        DB.departments = dList;
      }
    }
    if (storeRes.ok) {
      const sList = await storeRes.json();
      if (sList && sList.length) {
        STORES.length = 0;
        sList.forEach(function(s){ STORES.push(s.store_name || s.name); });
        DB.stores = sList;
      }
    }
    if (vendorRes.ok) {
      const vList = await vendorRes.json();
      if (vList && vList.length) {
        VENDORS.length = 0;
        vList.forEach(function(v){ VENDORS.push({code:v.party_code, name:v.party_name, gstin:v.gstin, cat:v.party_type, city:'Delhi', rating:v.party_rating||4.0}); });
        DB.vendors = vList;
      }
    }
    if (catRes.ok) {
      const cList = await catRes.json();
      if (cList && cList.length) {
        cList.forEach(function(c){
          var name = c.cat_name || c.name;
          if (name && !CATS[name]) CATS[name] = ['General', 'Supplies'];
        });
        DB.categories = cList;
      }
    }
    if (uomRes.ok) {
      const uList = await uomRes.json();
      if (uList && uList.length) {
        UOMS.length = 0;
        uList.forEach(function(u){ UOMS.push(u.uom_code); });
        DB.uoms = uList;
      }
    }

    // 2. Fetch Module Records Dynamically
    const [matRes, reqRes, woRes, grnRes, stockRes, movRes, notifRes, audRes, dspRes, defRes] = await Promise.all([
      fetch(API_BASE + '/materials/items'),
      fetch(API_BASE + '/requisitions/'),
      fetch(API_BASE + '/work-orders/'),
      fetch(API_BASE + '/grn/'),
      fetch(API_BASE + '/inventory/stock'),
      fetch(API_BASE + '/inventory/movements'),
      fetch(API_BASE + '/admin/notifications'),
      fetch(API_BASE + '/audit/schedules'),
      fetch(API_BASE + '/disposal/proposals'),
      fetch(API_BASE + '/warranty/defects')
    ]);

    if (matRes.ok) {
      const list = await matRes.json();
      if (list && list.length) {
        DB.materials = list.map(function(it, i){
          return {
            id: it.id || ('M' + (i+1)),
            code: it.item_code,
            name: it.item_name,
            cat: it.cat_name || 'IT & Telecom Goods',
            sub: it.item_desc || 'Hardware & Office Systems',
            uom: it.base_uom_code || 'NOS',
            fin: it.is_capital ? 'Capital' : 'Revenue',
            asset: it.is_capital ? 'Y' : 'N',
            type: it.is_service ? 'Service' : 'Goods',
            stockType: it.is_stockable ? 'Stock' : 'Non-Stock',
            consumable: it.is_capital ? 'Non-Consumable' : 'Consumable',
            isTool: !!it.is_returnable_tool,
            hazardous: false,
            perishable: false,
            rate: Number(it.estimated_rate || 0),
            gst: Number(it.gst_rate_pct || 18),
            hsn: it.hsn_sac_code || '8471',
            status: it.is_active ? 'Active' : 'Inactive',
            reorder: Number(it.reorder_level || 20),
            minStock: Number(it.min_stock_level || 10),
            maxStock: Number(it.max_stock_level || 100),
            reorderQty: Number(it.reorder_qty || 40),
            leadTime: Number(it.lead_time_days || 21),
            make: it.make_model || '',
            model: it.make_model || '',
            spec: it.specifications || it.item_desc || '',
            coa: COA[0],
            fund: FUNDS[0],
            scheme: SCHEMES[0],
            project: PROJECTS[0],
            costCentre: COST_CENTRES[0],
            warrantyMonths: 12,
            warrantyApplicable: it.is_capital,
            disposalCat: it.is_capital ? 'Asset — Condemnation Board' : 'Consumable — Write-off',
            updated: TODAY,
            createdBy: 'Anil Katwale',
            attachments: []
          };
        });
      }
    }

    if (reqRes.ok) {
      const list = await reqRes.json();
      if (list && list.length) {
        DB.requisitions = list.map(function(r, i){
          return {
            id: r.id || ('R' + (i+1)),
            no: r.req_no,
            date: r.req_date ? r.req_date.slice(0,10) : TODAY,
            dept: r.department || DEPTS[0],
            office: 'Head Office',
            section: 'Procurement Section',
            requestor: 'Anil Katwale',
            priority: r.priority || 'Normal',
            mode: 'Open Tender',
            purpose: r.purpose || 'Departmental operational requirement',
            location: r.store_name || STORES[0],
            requiredBy: addDays(TODAY, 30),
            coa: COA[0],
            fund: FUNDS[0],
            scheme: SCHEMES[0],
            project: PROJECTS[0],
            costCentre: COST_CENTRES[0],
            availBudget: 5000000,
            value: Number(r.total_est_amount || 0),
            lines: (r.lines || []).map(function(l){
              return {
                mat: l.item_code,
                desc: l.item_name,
                qty: Number(l.requested_qty || 1),
                uom: l.uom_code || 'NOS',
                rate: Number(l.est_unit_rate || 0),
                make: l.preferred_make || '',
                spec: l.technical_spec || ''
              };
            }),
            budget: 'Available',
            stockAvail: 'Not Available',
            status: r.current_stage || 'Submitted',
            approver: r.current_stage === 'Approved' ? '—' : 'Head of Office',
            attachments: []
          };
        });
      }
    }

    if (woRes.ok) {
      const list = await woRes.json();
      if (list && list.length) {
        DB.workorders = list.map(function(w, i){
          return {
            id: w.id || ('W' + (i+1)),
            no: w.wo_no,
            date: w.wo_date ? w.wo_date.slice(0,10) : TODAY,
            tender: w.tender_no || 'TND/2026/10042',
            reqs: 'MR/DIT/2026/000101',
            vendor: w.vendor_name || VENDORS[0],
            dept: DEPTS[0],
            store: w.store_name || STORES[0],
            subject: 'Supply order under GEM contract',
            terms: w.payment_terms || '100% on receipt and acceptance',
            deliveryDate: w.delivery_due_date ? w.delivery_due_date.slice(0,10) : addDays(TODAY, 45),
            status: w.status || 'Issued',
            value: Number(w.total_basic_amt || 0),
            tax: Number(w.total_tax_amt || 0),
            total: Number(w.total_wo_amount || 0),
            lines: (w.lines || []).map(function(l){
              return {
                mat: l.item_code,
                desc: l.item_name,
                qty: Number(l.order_qty || 1),
                uom: l.uom_code || 'NOS',
                rate: Number(l.unit_rate || 0),
                taxPct: Number(l.tax_percent || 18),
                spec: ''
              };
            }),
            pgRequired: true,
            pgStatus: 'Submitted',
            pgNo: 'BG/2026/0088',
            pgExpiry: addDays(TODAY, 180),
            dispatched: false,
            amendments: [],
            attachments: []
          };
        });
      }
    }

    if (grnRes.ok) {
      const list = await grnRes.json();
      if (list && list.length) {
        DB.grns = list.map(function(g, i){
          return {
            id: g.id || ('G' + (i+1)),
            no: g.grn_no,
            date: g.grn_date ? g.grn_date.slice(0,10) : TODAY,
            wo: g.wo_no || 'WO/2026/00101',
            vendor: g.vendor_name || VENDORS[0],
            store: g.store_name || STORES[0],
            challan: g.challan_no || 'CH-9012',
            challanDate: g.challan_date ? g.challan_date.slice(0,10) : TODAY,
            vehicle: g.vehicle_number || 'DL 1L AA 4012',
            driver: g.driver_name || 'Driver',
            lines: (g.lines || []).map(function(l){
              return {
                mat: l.item_code,
                desc: l.item_name,
                ordered: Number(l.challan_qty || l.received_qty || 1),
                challanQty: Number(l.challan_qty || l.received_qty || 1),
                received: Number(l.received_qty || 1),
                passed: Number(l.accepted_qty || l.received_qty || 1),
                rejected: Number(l.rejected_qty || 0),
                rate: 10000,
                uom: 'NOS',
                remarks: ''
              };
            }),
            mat: g.lines && g.lines[0] ? g.lines[0].item_code : undefined,
            received: g.lines && g.lines[0] ? Number(g.lines[0].received_qty || 0) : 0,
            accepted: g.lines && g.lines[0] ? Number(g.lines[0].accepted_qty || 0) : 0,
            rejected: g.lines && g.lines[0] ? Number(g.lines[0].rejected_qty || 0) : 0,
            damaged: 0, short: 0, excess: 0,
            location: 'Receiving Bay A',
            inspection: g.inspection_status || 'Pending',
            posting: g.posting_status === 'Posted' ? 'Posted' : 'Pending',
            status: g.posting_status === 'Posted' ? 'Posted to Stock' : (g.inspection_status || 'Under Inspection'),
            inspReport: 'INSP/2026/' + pad(100+i, 4),
            gateEntry: g.gate_entry_no || ('GE/2026/' + pad(200+i, 4)),
            attachments: []
          };
        });
      }
    }

    if (stockRes.ok) {
      const list = await stockRes.json();
      if (list && list.length) {
        DB.stock = list.map(function(s, i){
          return {
            mat: s.item_code,
            store: s.store_name,
            batch: 'BATCH-2026-01',
            expiry: '2028-03-31',
            avail: Number(s.available_qty || 0),
            reserved: Number(s.allocated_qty || 0),
            inTransit: 0,
            qcHold: Number(s.quarantine_qty || 0),
            rate: Number(s.avg_unit_cost || 0),
            value: Number(s.total_stock_value || 0)
          };
        });
      }
    }

    if (movRes.ok) {
      const list = await movRes.json();
      if (list && list.length) {
        DB.movements = list.map(function(m, i){
          return {
            id: m.id || ('MOV' + (i+1)),
            date: m.txn_timestamp ? m.txn_timestamp.slice(0,10) : TODAY,
            type: m.txn_type || 'Receipt from Vendor',
            mat: m.item_code,
            store: m.store_name || STORES[0],
            qty: Number(m.txn_qty || 0),
            rate: Number(m.unit_rate || 0),
            val: Number(m.txn_amount || 0),
            ref: m.ref_doc_no || 'GRN/2026/0001',
            bal: Number(m.closing_qty || 0),
            by: 'Anil Katwale',
            dst: DEPTS[0]
          };
        });
      }
    }

    if (notifRes.ok) {
      const list = await notifRes.json();
      if (list && list.length) {
        DB.notifications = list.map(function(n, i){
          return {
            id: n.id || ('N' + (i+1)),
            kind: n.event_type || 'in',
            title: n.title,
            body: n.message,
            route: n.action_route || 'req/list',
            time: n.created_at ? n.created_at.slice(0,10) : TODAY,
            read: n.is_read
          };
        });
      }
    }

    if (audRes.ok) {
      const list = await audRes.json();
      if (list && list.length) {
        DB.audits = list.map(function(a, i){
          return {
            id: a.id || ('AUD' + (i+1)),
            no: a.audit_no,
            type: a.audit_type,
            dept: DEPTS[0],
            store: a.store_name || STORES[0],
            cat: 'All Categories',
            period: a.period_label,
            team: a.audit_team_lead,
            start: a.start_date ? a.start_date.slice(0,10) : TODAY,
            end: a.end_date ? a.end_date.slice(0,10) : '',
            status: a.audit_status
          };
        });
        DB.verification = [];
        list.forEach(function(a){
          (a.lines || []).forEach(function(l, j){
            DB.verification.push({
              id: String(l.id), auditId: a.id,
              mat: l.item_code,
              store: a.store_name || STORES[0],
              book: Number(l.book_qty || 0),
              phys: Number(l.physical_qty || 0),
              damaged: 0,
              expired: 0,
              missing: l.physical_qty < l.book_qty ? Number(l.book_qty - l.physical_qty) : 0,
              excess: l.physical_qty > l.book_qty ? Number(l.physical_qty - l.book_qty) : 0,
              variance: Number((l.physical_qty || 0) - (l.book_qty || 0)),
              rate: (l.diff_qty ? Number(l.variance_value || 0) / Number(l.diff_qty) : 0) || 0,
              reason: l.investigation_notes || '',
              status: l.adjustment_action || 'Pending'
            });
          });
        });
      }
    }

    if (dspRes.ok) {
      const list = await dspRes.json();
      if (list && list.length) {
        DB.disposals = list.map(function(d, i){
          return {
            id: d.id || ('DSP' + (i+1)),
            no: d.disp_proposal_no,
            date: TODAY,
            mat: d.item_name,
            store: d.store_name || STORES[0],
            qty: Number(d.disposal_qty || 0),
            original: Number(d.book_value_amount || 0),
            book: Number(d.book_value_amount || 0),
            residual: Number(d.reserve_price || 0),
            reason: d.condemnation_reason,
            method: d.disposal_mode,
            approval: d.status === 'Pending Approval' ? 'Pending' : 'Approved',
            status: d.status,
            value: Number(d.realized_value || 0)
          };
        });
      }
    }

    const rtvRes = await fetch(API_BASE + '/grn/rtv/all');
    if (rtvRes.ok) {
      const list = await rtvRes.json();
      if (list && list.length) {
        DB.rtv = list.map(function(r, idx){
          var vObj = byId(DB.vendors,'party_name', r.vendor_name);
          return {
            id: r.id || ('RT'+(idx+1)), no: r.rtv_no, grn: '—', wo: '—',
            vendor: vObj ? vObj.party_code : (r.vendor_name || VENDORS[0]),
            mat: r.item_name, qty: Number(r.return_qty || 0), rate: 0,
            reason: r.return_reason || '', date: r.rtv_date ? r.rtv_date.slice(0,10) : TODAY,
            mode: 'Vendor pickup', replacement: 'Replacement Pending', ack: 'Pending',
            status: 'Replacement Pending'
          };
        });
      }
    }

    const trfRes = await fetch(API_BASE + '/inventory/transfers');
    if (trfRes.ok) {
      const list = await trfRes.json();
      if (list && list.length) {
        DB.transfers = list.map(function(t, idx){
          var matObj = byId(DB.materials,'id', t.item_id);
          return {
            id: t.id || ('TR'+(idx+1)), no: t.transfer_no,
            date: t.transfer_date ? t.transfer_date.slice(0,10) : TODAY,
            mat: matObj ? matObj.code : t.item_name, qty: Number(t.transfer_qty || 0),
            uom: matObj ? matObj.uom : 'NOS', from: t.from_store_name, to: t.to_store_name,
            approver: 'Head of Office', challan: t.dispatch_gatepass || '—',
            dispatched: t.transfer_date ? t.transfer_date.slice(0,10) : '',
            received: t.status === 'Received' ? (t.transfer_date ? t.transfer_date.slice(0,10) : TODAY) : '',
            status: t.status
          };
        });
      }
    }

    const issRes = await fetch(API_BASE + '/inventory/issues');
    if (issRes.ok) {
      const list = await issRes.json();
      if (list && list.length) {
        var issRows = [];
        list.forEach(function(i, idx){
          var ls = (i.lines && i.lines.length) ? i.lines : [{item_id:null, item_name:null, issued_qty:0, unit_rate:0}];
          ls.forEach(function(l){
            var matObj = byId(DB.materials,'id', l.item_id);
            issRows.push({
              id: i.id || ('IS'+(idx+1)), no: i.issue_no,
              date: i.issue_date ? i.issue_date.slice(0,10) : TODAY,
              req: '—', mat: matObj ? matObj.code : l.item_name,
              qty: Number(l.issued_qty || 0), uom: matObj ? matObj.uom : 'NOS', rate: Number(l.unit_rate || 0),
              store: i.store_name, dept: DEPTS[0], indentor: '—', recipient: i.receiver_name,
              gatepass: '—', status: 'Issued'
            });
          });
        });
        DB.issues = issRows;
      }
    }

    const retRes = await fetch(API_BASE + '/inventory/returns');
    if (retRes.ok) {
      const list = await retRes.json();
      if (list && list.length) {
        DB.returns = list.map(function(r, idx){
          var matObj = byId(DB.materials,'id', r.item_id);
          var restocked = DB.movements.some(function(m){ return m.ref===r.return_no && m.type==='RETURN_RESTOCK'; });
          return {
            id: r.id || ('RN'+(idx+1)), no: r.return_no, issue: '—',
            date: r.created_at ? r.created_at.slice(0,10) : TODAY,
            mat: matObj ? matObj.code : r.item_name, qty: Number(r.return_qty || 0),
            uom: matObj ? matObj.uom : 'NOS', store: r.store_name, dept: DEPTS[0],
            condition: r.condition_status || 'Serviceable', reason: '—',
            restock: restocked ? 'Restocked' : 'Pending restock',
            status: restocked ? 'Accepted' : 'Under Inspection'
          };
        });
      }
    }

    const toolRes = await fetch(API_BASE + '/inventory/tool-issuances');
    if (toolRes.ok) {
      const list = await toolRes.json();
      if (list && list.length) {
        DB.toolIssuances = list.map(function(t, idx){
          var matObj = byId(DB.materials,'id', t.item_id);
          return {
            id: t.id || ('TL'+(idx+1)), no: t.voucher_no,
            date: t.issue_date ? t.issue_date.slice(0,10) : TODAY,
            mat: matObj ? matObj.code : t.item_name, serial: t.tool_serial_code || '—',
            qty: Number(t.issued_qty || 0), store: t.store_name, worker: t.worker_labor_name,
            idCard: t.worker_id_card || '—', shift: t.shift_name || 'Morning Shift',
            expected: t.expected_return ? t.expected_return.slice(0,10) : TODAY,
            returnedQty: Number(t.returned_qty || 0),
            returnedDate: t.returned_time ? t.returned_time.slice(0,10) : '',
            condition: t.tool_condition || 'Working', fine: 0,
            status: t.status || 'Issued', remarks: ''
          };
        });
      }
    }

    const planRes = await fetch(API_BASE + '/procurement/plans');
    if (planRes.ok) {
      const list = await planRes.json();
      if (list && list.length) {
        DB.plans = list.map(function(p, idx){
          return {
            id: p.id || ('PP' + (idx+1)), no: p.plan_no, reqs: '—',
            mode: p.proc_mode, value: Number(p.planned_value || 0),
            officer: 'Anil Katwale', budget: COA[0], ref: '—',
            expected: addDays(p.created_at ? p.created_at.slice(0,10) : TODAY, 50),
            insp: 'Yes', warr: 'Yes', asset: 'Yes', status: 'Draft'
          };
        });
      }
    }

    const tenderRes2 = await fetch(API_BASE + '/procurement/tenders');
    if (tenderRes2.ok) {
      const list = await tenderRes2.json();
      if (list && list.length) {
        DB.tenders = list.map(function(t, idx){
          return {
            id: t.id || ('T' + (idx+1)), no: t.tender_no, date: t.tender_date ? t.tender_date.slice(0,10) : TODAY,
            title: t.tender_title, dept: DEPTS[0], mode: 'Open Tender',
            value: Number(t.estimated_cost || 0), fee: Number(t.tender_fee || 0), emd: Number(t.emd_amount || 0),
            close: t.bid_close_date ? t.bid_close_date.slice(0,10) : addDays(TODAY,21),
            status: t.status, portal: t.portal_ref_no || 'GNCTD e-Procurement Portal', coa: COA[0]
          };
        });
      }
    }

    const quoteRes2 = await fetch(API_BASE + '/procurement/quotes');
    if (quoteRes2.ok) {
      const list = await quoteRes2.json();
      if (list && list.length) {
        DB.quotes = list.map(function(q, idx){
          var vObj = byId(DB.vendors,'party_name', q.vendor_name);
          return {
            id: q.id || ('Q' + (idx+1)), no: 'BID/' + (q.id || idx+1), tender: q.tender_no,
            vendor: vObj ? vObj.party_code : (q.vendor_name || VENDORS[0]),
            sub: TODAY, tech: q.is_technically_ok ? 'Qualified' : 'Pending',
            fin: 'Opened', basic: Number(q.basic_rate||0)*Number(q.quoted_qty||0), tax: 0, freight: 0,
            insurance: 0, install: 0, other: 0, discount: 0,
            amount: Number(q.total_bid_value || 0), evaluated: Number(q.total_bid_value || 0),
            delivery: 30, warranty: 12, terms: '100% within 30 days of accepted GRN', validity: '2026-12-31',
            rank: q.rank_order || 0, reco: q.is_selected ? 'Recommended' : '',
            status: q.is_selected ? 'Approved' : 'Under Review', score: 0,
            deviations: 'Nil', elig: 'To be examined', docs: 'To be verified', qcert: '—',
            capacity: '—', past: '—', remarks: ''
          };
        });
      }
    }

    const secRes = await fetch(API_BASE + '/procurement/securities');
    if (secRes.ok) {
      const list = await secRes.json();
      if (list && list.length) {
        DB.emds = list.filter(function(s){ return s.sec_type==='EMD'; }).map(function(s, idx){
          var vObj = byId(DB.vendors,'party_name', s.vendor_name);
          return {
            id: s.id || ('E'+(idx+1)), tender: s.tender_no || '—',
            vendor: vObj ? vObj.party_code : (s.vendor_name || VENDORS[0]),
            amount: Number(s.amount || 0), mode: s.instrument_type, instrType: s.instrument_type,
            instrNo: s.instrument_no, bank: s.issuing_bank,
            issue: s.instrument_date ? s.instrument_date.slice(0,10) : TODAY,
            expiry: s.expiry_date ? s.expiry_date.slice(0,10) : addDays(TODAY,90),
            verify: 'Verified', status: s.status
          };
        });
        DB.pgs = list.filter(function(s){ return s.sec_type==='PBG'; }).map(function(s, idx){
          var vObj = byId(DB.vendors,'party_name', s.vendor_name);
          return {
            id: s.id || ('P'+(idx+1)), wo: '—', contract: '—',
            vendor: vObj ? vObj.party_code : (s.vendor_name || VENDORS[0]),
            amount: Number(s.amount || 0), pctv: 5, instrType: s.instrument_type,
            instrNo: s.instrument_no, bank: s.issuing_bank,
            issue: s.instrument_date ? s.instrument_date.slice(0,10) : TODAY,
            expiry: s.expiry_date ? s.expiry_date.slice(0,10) : addDays(TODAY,180),
            claim: '6 months beyond warranty', release: addDays(TODAY,180), status: s.status
          };
        });
      }
    }

    const invRes2 = await fetch(API_BASE + '/billing/invoices');
    if (invRes2.ok) {
      const list = await invRes2.json();
      if (list && list.length) {
        DB.invoices = list.map(function(i, idx){
          var vObj = byId(DB.vendors,'party_name', i.vendor_name);
          return {
            id: i.id || ('N' + (idx+1)),
            no: i.inv_no, vinv: i.vendor_inv_no,
            date: i.vendor_inv_date ? i.vendor_inv_date.slice(0,10) : TODAY,
            recd: i.vendor_inv_date ? i.vendor_inv_date.slice(0,10) : TODAY,
            vendor: vObj ? vObj.party_code : (i.vendor_name || VENDORS[0]),
            wo: i.wo_no, grn: i.grn_no,
            amount: Number(i.gross_amount || 0),
            matched: i.match_status==='Matched' ? Number(i.gross_amount || 0) : 0,
            exception: i.match_status==='Exception' ? Number(i.gross_amount || 0) : 0,
            ld: 0, retention: 0, tds: 0, gstTds: 0,
            status: i.match_status || 'Pending',
            finance: i.payment_status==='Initiated' ? 'Under Review' : 'Approved',
            payment: i.payment_status==='Paid' ? 'Paid' : 'Pending',
            billNo: i.payment_status && i.payment_status!=='Initiated' ? i.inv_no : '',
            utr: i.utr_number || '', remarks: '', attachments: []
          };
        });
      }
    }

    const adjRes2 = await fetch(API_BASE + '/audit/adjustments');
    if (adjRes2.ok) {
      const list = await adjRes2.json();
      if (list && list.length) {
        DB.adjustments = list.map(function(a, idx){
          var qty = Number(a.adj_qty || 0);
          return {
            id: a.id || ('AJ' + (idx+1)), no: a.adj_voucher_no,
            mat: a.item_name, store: a.store_name || STORES[0],
            book: 0, phys: qty, variance: a.adjustment_type==='Write-Off' ? -qty : qty,
            rate: qty ? Number(a.adj_value || 0) / qty : 0, value: Number(a.adj_value || 0),
            reason: a.sanction_order_no || '', doc: '', authority: 'Head of Office',
            finance: 'Pending', status: 'Approved'
          };
        });
      }
    }

    if (defRes.ok) {
      const list = await defRes.json();
      if (list && list.length) {
        DB.defects = list.map(function(d, i){
          return {
            id: d.id || ('DEF' + (i+1)),
            no: d.ticket_no,
            date: d.ticket_date ? d.ticket_date.slice(0,10) : TODAY,
            mat: d.item_name,
            serial: '',
            vendor: d.vendor_name,
            dept: DEPTS[0],
            cat: d.defect_category,
            severity: d.severity,
            warranty: 'Under Warranty',
            vendorResp: d.vendor_response || '',
            due: d.resolution_tat_due ? d.resolution_tat_due.slice(0,10) : TODAY,
            resolved: d.resolved_date ? d.resolved_date.slice(0,10) : null,
            status: d.resolution_status
          };
        });
      }
    }

    save();
    refreshNavCounts();
    paintNotifCount();
  } catch(err) {
    console.log('Backend sync offline/starting, using local database cache:', err);
  }
}
export function initIFMS(){
  DB = Store.get();
  if(!DB || !DB.materials || !DB.materials.length){ DB = seedDB(); save(); }
  ['materials','requisitions','tenders','boq','quotes','workorders','deliveries','grns','inspections',
   'rtv','stock','movements','issues','returns','transfers','toolIssuances','invoices','fees','emds','pgs','warranty',
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

// Attach all top-level UI and action functions to window
if (typeof window !== 'undefined') {
  var globalExports = {
  actIcon: actIcon,
  addAttach: addAttach,
  addDays: addDays,
  addReqLine: addReqLine,
  addWoLine: addWoLine,
  allSubs: allSubs,
  amendWo: amendWo,
  applyDefFilter: applyDefFilter,
  applyDspFilter: applyDspFilter,
  applyGrnFilter: applyGrnFilter,
  applyInvFilter: applyInvFilter,
  applyMatFilter: applyMatFilter,
  applyMovFilter: applyMovFilter,
  applyReqFilter: applyReqFilter,
  applyStockFilter: applyStockFilter,
  applyTrailFilter: applyTrailFilter,
  applyWarrFilter: applyWarrFilter,
  applyWoFilter: applyWoFilter,
  approveAdjustment: approveAdjustment,
  approveDisposal: approveDisposal,
  approvePlan: approvePlan,
  approveReq: approveReq,
  approveWo: approveWo,
  attChip: attChip,
  attList: attList,
  attachWidget: attachWidget,
  auditEntry: auditEntry,
  auditTableHtml: auditTableHtml,
  autoCode: autoCode,
  autoL1: autoL1,
  autoSuggestBoq: autoSuggestBoq,
  badge: badge,
  barChart: barChart,
  bcls: bcls,
  boqHistory: boqHistory,
  boqSuggestions: boqSuggestions,
  budgetCheckReq: budgetCheckReq,
  buildSidebar: buildSidebar,
  bulkApprove: bulkApprove,
  bulkSendFinance: bulkSendFinance,
  byId: byId,
  cancelWo: cancelWo,
  checkStock: checkStock,
  checkStockDraft: checkStockDraft,
  closeAllModals: closeAllModals,
  closeAudit: closeAudit,
  closeDD: closeDD,
  closeModal: closeModal,
  colChart: colChart,
  commit: commit,
  commitBulk: commitBulk,
  completeDisposal: completeDisposal,
  condemnReturn: condemnReturn,
  confirmAct: confirmAct,
  confirmIssue: confirmIssue,
  createConsolidatedPlan: createConsolidatedPlan,
  csAudit: csAudit,
  dashCounts: dashCounts,
  daysBetween: daysBetween,
  deactivateMaterial: deactivateMaterial,
  delayAlert: delayAlert,
  despatchTransfer: despatchTransfer,
  dfSla: dfSla,
  disposalEntry: disposalEntry,
  donut: donut,
  download: download,
  downloadCs: downloadCs,
  downloadTemplate: downloadTemplate,
  dpCalc: dpCalc,
  editMaterial: editMaterial,
  esc: esc,
  escalateDefect: escalateDefect,
  expiryCell: expiryCell,
  exportCsv: exportCsv,
  extendPg: extendPg,
  fdate: fdate,
  fdatetime: fdatetime,
  filterBar: filterBar,
  finishEval: finishEval,
  fld: fld,
  forecastToRequisition: forecastToRequisition,
  globalSearch: globalSearch,
  goto: goto,
  grnCalc: grnCalc,
  grnEntry: grnEntry,
  grnFromDelivery: grnFromDelivery,
  grnWoInfo: grnWoInfo,
  hbar: hbar,
  initIFMS: initIFMS,
  initiateProc: initiateProc,
  inr: inr,
  inr0: inr0,
  inspCalc: inspCalc,
  inspectGrn: inspectGrn,
  inspectionReport: inspectionReport,
  invoiceEntry: invoiceEntry,
  isStock: isStock,
  issueEntry: issueEntry,
  issueWo: issueWo,
  ivCalc: ivCalc,
  ivFromGrn: ivFromGrn,
  kpiTile: kpiTile,
  kvRow: kvRow,
  loadMaterial: loadMaterial,
  logAudit: logAudit,
  logoutSim: logoutSim,
  mapBoq: mapBoq,
  markAllRead: markAllRead,
  markErr: markErr,
  markNonStd: markNonStd,
  markRead: markRead,
  matchDetail: matchDetail,
  matchPanel: matchPanel,
  matchResult: matchResult,
  materialAudit: materialAudit,
  mname: mname,
  modal: modal,
  mrate: mrate,
  mreorder: mreorder,
  muom: muom,
  navCount: navCount,
  newFromBoq: newFromBoq,
  notifMenu: notifMenu,
  notify: notify,
  nowIso: nowIso,
  num: num,
  nval: nval,
  openDD: openDD,
  pad: pad,
  pageHead: pageHead,
  paintChain: paintChain,
  paintCs: paintCs,
  paintEval: paintEval,
  paintNotifCount: paintNotifCount,
  paintReqLines: paintReqLines,
  paintWoLines: paintWoLines,
  pane: pane,
  pct: pct,
  pendingReqs: pendingReqs,
  planToTender: planToTender,
  postGrn: postGrn,
  postVariances: postVariances,
  priBadge: priBadge,
  printWo: printWo,
  qeCalc: qeCalc,
  quoteEntry: quoteEntry,
  raiseDefect: raiseDefect,
  raiseDelayAlerts: raiseDelayAlerts,
  reactivateMaterial: reactivateMaterial,
  recalcForecast: recalcForecast,
  receiveTransfer: receiveTransfer,
  recommendRetender: recommendRetender,
  reconcilePortal: reconcilePortal,
  recordDispatch: recordDispatch,
  recordNegotiation: recordNegotiation,
  recordPayment: recordPayment,
  recordReplacement: recordReplacement,
  refreshNavCounts: refreshNavCounts,
  refundRtv: refundRtv,
  rejectAdjustment: rejectAdjustment,
  rejectDisposal: rejectDisposal,
  rejectReq: rejectReq,
  releasePg: releasePg,
  renderTable: renderTable,
  reorderToRequisition: reorderToRequisition,
  repaintReqTables: repaintReqTables,
  replaceRtv: replaceRtv,
  reqRegister: reqRegister,
  reqTags: reqTags,
  reqTotal: reqTotal,
  requireOk: requireOk,
  resetDefFilter: resetDefFilter,
  resetDemo: resetDemo,
  resetDspFilter: resetDspFilter,
  resetGrnFilter: resetGrnFilter,
  resetInvFilter: resetInvFilter,
  resetMatFilter: resetMatFilter,
  resetMovFilter: resetMovFilter,
  resetReqFilter: resetReqFilter,
  resetStockFilter: resetStockFilter,
  resetTrailFilter: resetTrailFilter,
  resetWarrFilter: resetWarrFilter,
  resetWoFilter: resetWoFilter,
  resolveDefect: resolveDefect,
  resolveException: resolveException,
  restockReturn: restockReturn,
  returnEntry: returnEntry,
  rmLine: rmLine,
  rmWoLine: rmWoLine,
  rtFromIssue: rtFromIssue,
  rtvFromGrn: rtvFromGrn,
  runAllMatches: runAllMatches,
  runMatch: runMatch,
  save: save,
  saveAmendment: saveAmendment,
  saveAudit: saveAudit,
  saveBoqMap: saveBoqMap,
  saveDefect: saveDefect,
  saveDefectUpdate: saveDefectUpdate,
  saveDispatch: saveDispatch,
  saveDisposal: saveDisposal,
  saveDisposalCompletion: saveDisposalCompletion,
  saveEval: saveEval,
  saveExtendPg: saveExtendPg,
  saveGrn: saveGrn,
  saveInspection: saveInspection,
  saveInvoice: saveInvoice,
  saveIssue: saveIssue,
  saveMaterial: saveMaterial,
  saveNegotiation: saveNegotiation,
  saveQuote: saveQuote,
  saveReq: saveReq,
  saveResolution: saveResolution,
  saveReturn: saveReturn,
  saveToolCheckin: saveToolCheckin,
  saveToolCheckout: saveToolCheckout,
  saveTransfer: saveTransfer,
  saveWo: saveWo,
  saveWorkflow: saveWorkflow,
  securitiesScreen: securitiesScreen,
  securityAct: securityAct,
  securityAudit: securityAudit,
  seedDB: seedDB,
  seedMaterials: seedMaterials,
  selectVendor: selectVendor,
  sendBackReq: sendBackReq,
  sendToFinance: sendToFinance,
  seq: seq,
  setJustification: setJustification,
  setLine: setLine,
  setOverride: setOverride,
  setPhys: setPhys,
  setPvReason: setPvReason,
  setVal: setVal,
  setWoLine: setWoLine,
  showProfile: showProfile,
  simulateBulk: simulateBulk,
  simulateSync: simulateSync,
  splitAward: splitAward,
  stockLedger: stockLedger,
  stockPanel: stockPanel,
  stockState: stockState,
  submitCs: submitCs,
  sum: sum,
  summaryRow: summaryRow,
  switchTab: switchTab,
  syncSub: syncSub,
  syncWithBackend: syncWithBackend,
  tableHtml: tableHtml,
  tabsHtml: tabsHtml,
  tblExport: tblExport,
  tblPage: tblPage,
  tblPaint: tblPaint,
  tblReload: tblReload,
  tblRows: tblRows,
  tblSearch: tblSearch,
  tblSelAll: tblSelAll,
  tblSelOne: tblSelOne,
  tblSize: tblSize,
  tblSort: tblSort,
  testRule: testRule,
  toCsv: toCsv,
  toast: toast,
  toggleGrp: toggleGrp,
  toggleRole: toggleRole,
  toggleRule: toggleRule,
  toggleWorkflow: toggleWorkflow,
  toolCheckinEntry: toolCheckinEntry,
  toolCheckoutEntry: toolCheckoutEntry,
  trStock: trStock,
  transferEntry: transferEntry,
  uid: uid,
  uniq: uniq,
  updateDefect: updateDefect,
  userMenu: userMenu,
  val: val,
  validate: validate,
  viewDefect: viewDefect,
  viewDisposal: viewDisposal,
  viewGrn: viewGrn,
  viewInstrument: viewInstrument,
  viewInvoice: viewInvoice,
  viewMaterial: viewMaterial,
  viewQuote: viewQuote,
  viewReq: viewReq,
  viewTender: viewTender,
  viewWo: viewWo,
  vname: vname,
  warrState: warrState,
  warrantyHistory: warrantyHistory,
  woBudgetCheck: woBudgetCheck,
  woCalc: woCalc,
  woChain: woChain,
  woFromBid: woFromBid,
  woFromReq: woFromReq,
  woPullReqLines: woPullReqLines,
  woTotals: woTotals,
  woVendorInfo: woVendorInfo,
  workflowEntry: workflowEntry
  };
  for (var key in globalExports) {
    window[key] = globalExports[key];
  }
  try { window.DB = DB; } catch(e) {}
  try { window.Store = Store; } catch(e) {}
  try { window.SCREENS = SCREENS; } catch(e) {}
  try { window.ROUTE = ROUTE; } catch(e) {}
}

