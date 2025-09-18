/**
 admin.js
 - Fully functional interactivity for admin.html
 - Collapsible sidebar, top nav routing, project CRUD (demo),
 - MRV upload demo, verification approve/reject,
 - Leaflet map + markers, Chart.js chart,
 - Ethers.js wallet connect with balance & network
*/

/* Helpers */
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const el = id => document.getElementById(id);

/* ======== Mock data ======== */
let projects = [
  { id:'p1', name:'Sundarbans Mangrove', owner:'NGO A', ha:1200, co2:5200, health:82, status:'Active', coords:[22.05,88.66]},
  { id:'p2', name:'Seagrass Bay', owner:'Community X', ha:450, co2:2300, health:70, status:'Active', coords:[12.34,80.22]},
  { id:'p3', name:'Coral Reef Restore', owner:'Gov Unit', ha:300, co2:1200, health:60, status:'Pending', coords:[10.12,124.56]}
];

let verifications = [
  {project:'Coral Reef Restore', uploader:'Dr. P', file:'reef_mrv_2025.csv', status:'Pending'},
  {project:'Seagrass Bay', uploader:'Community X', file:'seagrass_2025.xlsx', status:'Pending'}
];

let txs = [
  {hash:'0xabc123def', action:'Mint', project:'p1', amount:1000, time:'2025-09-12 10:12'},
  {hash:'0xdef456ghi', action:'Transfer', project:'p2', amount:300, time:'2025-09-13 14:03'}
];

/* Chart + Map holders */
let co2Chart, map, markers = [];

/* ---------- UI functions ---------- */

/* Show/hide pages */
function openTopNav(pageKey){
  // top buttons
  qsa('.top-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageKey));
  // pages
  qsa('.page').forEach(p => p.classList.remove('active'));
  const page = qs('#page-' + pageKey);
  if(page) page.classList.add('active');
  // ensure relevant tabs/subsections are visible
  if(pageKey === 'projects') switchProjectTab('registered');
  if(pageKey === 'mrv') switchMrvTab('dashboard');
  // scroll top
  window.scrollTo({top:0, behavior:'smooth'});
}

/* Sidebar click handler (delegation) */
function onSidebarClick(e){
  const node = e.target.closest('[data-action]');
  if(!node) return;
  const action = node.dataset.action;
  if(action === 'open'){
    const page = node.dataset.page;
    if(page) openTopNav(page);
  } else if(action === 'sidebar-show'){
    const section = node.dataset.section;
    const sub = node.dataset.sub;
    if(section === 'projects') {
      openTopNav('projects');
      switchProjectTab(sub || 'registered');
    } else if(section === 'mrv') {
      openTopNav('mrv');
      switchMrvTab(sub || 'dashboard');
    }
  }
}

/* Toggle nav-group submenus */
function initNavToggles(){
  qsa('.nav-group .nav-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const group = toggle.parentElement;
      group.classList.toggle('open');
      const arrow = toggle.querySelector('.arrow');
      if(group.classList.contains('open')) arrow.style.transform = 'rotate(180deg)';
      else arrow.style.transform = 'rotate(0deg)';
    });
  });
}

/* Project tabs */
function switchProjectTab(tab){
  qsa('#page-projects .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderProjects(tab);
}

/* MRV tabs */
function switchMrvTab(tab){
  qsa('#page-mrv .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  qs('#mrvDashboard').classList.toggle('hidden', tab !== 'dashboard');
  qs('#mrvVerification').classList.toggle('hidden', tab !== 'verification');
}

/* Wallet tabs for More (blockchain) */
function switchWalletTab(id){
  qsa('.wallet-tab').forEach(t => t.classList.toggle('active', t.id === id));
  qsa('.wallet-tab').forEach(t => t.classList.toggle('hidden', t.id !== id));
  qsa('#page-more .tab').forEach(tb => tb.classList.toggle('active', tb.dataset.btab === id));
}

/* Render KPIs */
function renderKPIs(){
  const total = projects.length;
  const totalCO2 = projects.reduce((s,p)=>s+(p.co2||0),0);
  const avgHealth = Math.round(projects.reduce((s,p)=>s+(p.health||0),0)/Math.max(1, projects.length));

  el('kpiRegistered').innerText = total;
  el('kpiCO2').innerText = totalCO2 + ' t';
  el('kpiHealth').innerText = avgHealth + '%';
  el('registeredCount').innerText = total;

  // recent activity (from txs)
  const ra = el('recentActivity'); ra.innerHTML = '';
  txs.slice(0,6).forEach(tx => {
    const li = document.createElement('li'); li.innerText = `${tx.time} — ${tx.action} ${tx.amount} (project ${tx.project})`;
    ra.appendChild(li);
  });
}

/* Render projects table */
function renderProjects(tab = 'registered'){
  const tbody = qs('#projectsTable tbody'); tbody.innerHTML = '';

  const rows = projects.filter(p => {
    if(tab === 'registered') return p.status === 'Active';
    if(tab === 'managed') return p.status !== 'Active';
    return true;
  });

  rows.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.owner}</td>
      <td>${p.ha}</td>
      <td>${p.co2}</td>
      <td>${p.health}%</td>
      <td>${p.status}</td>
      <td>
        <button class="btn small" data-action="zoom" data-lat="${p.coords[0]}" data-lon="${p.coords[1]}">Map</button>
        <button class="btn ghost small" data-action="openProject" data-id="${p.id}">Open</button>
      </td>`;
    tbody.appendChild(tr);
  });

  // Attach row buttons
  tbody.querySelectorAll('[data-action="zoom"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.dataset.lat), lon = parseFloat(btn.dataset.lon);
      if(map) map.flyTo([lat,lon], 11, {duration:1.2});
    });
  });
  tbody.querySelectorAll('[data-action="openProject"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const p = projects.find(x=>x.id===id);
      if(p) openProjectModal(p);
    });
  });
}

/* Render verification lists */
function renderVerifications(){
  // verificationList
  const vtbody = qs('#verificationList tbody'); vtbody.innerHTML = '';
  verifications.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${v.project}</td><td>${v.uploader}</td><td>
      <button class="btn small" data-action="review" data-project="${v.project}">Review</button>
    </td>`;
    vtbody.appendChild(tr);
  });
  // verificationTable (MRV)
  const mtbody = qs('#verificationTable tbody'); mtbody.innerHTML = '';
  verifications.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${v.project}</td><td>${v.uploader}</td><td>${v.file}</td><td>${v.status}</td>
      <td>
        <button class="btn small" data-action="approve" data-project="${v.project}">Approve</button>
        <button class="btn ghost small" data-action="reject" data-project="${v.project}">Reject</button>
      </td>`;
    mtbody.appendChild(tr);
  });

  // event bindings
  qsa('[data-action="review"]').forEach(b => b.addEventListener('click', () => {
    const project = b.dataset.project;
    openProjectModal(projects.find(p=>p.name===project) || {name:project});
  }));
  qsa('[data-action="approve"]').forEach(b => b.addEventListener('click', () => {
    const project = b.dataset.project;
    updateVerificationStatus(project, 'Approved');
  }));
  qsa('[data-action="reject"]').forEach(b => b.addEventListener('click', () => {
    const project = b.dataset.project;
    updateVerificationStatus(project, 'Revision required');
  }));
}

function updateVerificationStatus(projectName, status){
  verifications = verifications.map(v => v.project === projectName ? {...v, status } : v);
  renderVerifications();
  alert(`Verification for "${projectName}" set to "${status}" (demo)`);
}

/* Render tx log */
function renderTxLog(){
  const ul = el('txLog'); ul.innerHTML = '';
  txs.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${t.action}</strong> ${t.amount} — <span class="muted">${t.time}</span> <div class="muted">tx: ${t.hash}</div>`;
    ul.appendChild(li);
  });
}

/* ---------- Modal ---------- */
function openProjectModal(project){
  const overlay = el('modalOverlay');
  const content = el('modalContent');
  const p = typeof project === 'string' ? { name: project } : project;
  content.innerHTML = `
    <h3>${p.name}</h3>
    <p><strong>Owner:</strong> ${p.owner || '—'}</p>
    <p><strong>Hectares:</strong> ${p.ha || '—'}</p>
    <p><strong>CO₂:</strong> ${p.co2 || '—'} t</p>
    <p><strong>Health:</strong> ${p.health || '—'}%</p>
    <div class="form-actions mt">
      <button class="btn" id="modalZoomBtn">Zoom to map</button>
      <button class="btn ghost" id="modalCloseBtn">Close</button>
    </div>`;
  overlay.classList.remove('hidden');

  el('modalClose').onclick = closeModal;
  el('modalCloseBtn').onclick = closeModal;
  el('modalZoomBtn').onclick = () => {
    if(p.coords && map) map.flyTo(p.coords, 11, {duration:1.2});
    closeModal();
    openTopNav('projects');
  };
}
function closeModal(){ el('modalOverlay').classList.add('hidden'); }

/* ---------- Map (Leaflet) ---------- */
function initMap(){
  const mapEl = qs('#mapView');
  if(!mapEl) return;
  map = L.map(mapEl).setView([20.6,78.9],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  // Add markers from projects
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  projects.forEach(p => {
    if(p.coords && p.coords.length === 2){
      const mk = L.marker(p.coords).addTo(map).bindPopup(`<strong>${p.name}</strong><div>${p.ha} ha</div>`);
      markers.push(mk);
    }
  });
}

/* Add a project marker */
function addProjectMarker(p){
  if(!map || !p.coords) return;
  const mk = L.marker(p.coords).addTo(map).bindPopup(`<strong>${p.name}</strong><div>${p.ha} ha</div>`);
  markers.push(mk);
}

/* ---------- Chart (Chart.js) ---------- */
function initChart(){
  const ctx = el('co2Chart').getContext('2d');
  const labels = ['Jan','Feb','Mar','Apr','May','Jun'];
  const data = {
    labels,
    datasets: [{
      label:'CO₂ (t)',
      data: [200,300,450,700,900,1200],
      borderColor:'#1a237e',
      backgroundColor:'rgba(26,35,126,0.08)',
      tension:0.35,
      fill:true
    }]
  };
  co2Chart = new Chart(ctx, { type:'line', data, options:{plugins:{legend:{display:false}}, maintainAspectRatio:false} });
}

/* ---------- Wallet (ethers.js) ---------- */
let provider, signer, currentAddress = null;
async function connectWallet(){
  try {
    if(!window.ethereum){
      alert('No Web3 wallet detected. Install MetaMask or other injected wallet.');
      return;
    }
    provider = new ethers.providers.Web3Provider(window.ethereum, "any");
    await provider.send('eth_requestAccounts', []);
    signer = provider.getSigner();
    currentAddress = await signer.getAddress();
    el('walletAddress').innerText = 'Wallet: ' + shorten(currentAddress);
    const net = await provider.getNetwork();
    el('walletNetwork').innerText = 'Network: ' + (net.name || net.chainId);
    const bal = await provider.getBalance(currentAddress);
    el('walletOverview').innerText = `Address: ${currentAddress}\nBalance: ${ethers.utils.formatEther(bal)} ETH`;
    el('netName').innerText = net.name || '—';
    el('chainId').innerText = net.chainId || '—';

    // add a tx sample (demo) and render
    txs.unshift({hash:'0xnewtx'+Date.now(), action:'Connect', project:'-', amount:0, time: new Date().toISOString().slice(0,16).replace('T',' ')});
    renderTxLog();
    el('connectBtn').innerText = 'Connected';
    el('connectBtn').classList.add('ghost');
  } catch(err){
    console.error(err);
    alert('Wallet connection failed or was rejected.');
  }
}

function shorten(a){ return a ? a.slice(0,6) + '...' + a.slice(-4) : '—'; }

/* Placeholder contract read and token transfer */
function readContract(){
  const addr = el('contractAddr').value.trim();
  if(!addr) return alert('Please enter contract address (demo).');
  alert('Reading contract ' + addr + ' (placeholder).');
}
function tokenTransfer(){
  const addr = el('tokenAddr').value.trim();
  const amt = el('tokenAmount').value;
  if(!addr || !amt) return alert('Token address and amount required (demo).');
  alert(`Transfer ${amt} tokens to ${addr} (placeholder).`);
}

/* ---------- MRV upload handling ---------- */
function handleMRVUpload(fileInput){
  const file = fileInput.files[0];
  if(!file) return;
  // Demo: push to verifications
  const demo = { project: projects[0]?.name || 'Demo Project', uploader: 'Uploader', file: file.name, status: 'Pending' };
  verifications.unshift(demo);
  el('mrvLatest').innerText = new Date().toLocaleString();
  el('mrvPending').innerText = verifications.length;
  renderVerifications();
  alert('MRV file received (demo): ' + file.name);
}

/* ---------- Register Project form ---------- */
function handleRegisterSubmit(e){
  e.preventDefault();
  const name = el('rpName').value.trim();
  const owner = el('rpOwner').value.trim();
  const ha = Number(el('rpHa').value);
  const lat = Number(el('rpLat').value);
  const lon = Number(el('rpLon').value);
  if(!name || !owner || !ha || Number.isNaN(lat) || Number.isNaN(lon)){
    return alert('Please fill all fields correctly.');
  }
  const newP = {
    id:'p'+(projects.length+1),
    name, owner, ha,
    co2: Math.round(ha * 3.5),
    health: 85,
    status: 'Active',
    coords: [lat, lon]
  };
  projects.unshift(newP);
  addProjectMarker(newP);
  renderKPIs();
  renderProjects('registered');
  alert('Project saved (demo).');
  qs('#registerForm').reset();
}

/* ---------- Update all UI on page show ---------- */
function refreshAll(){
  renderKPIs();
  renderProjects('registered');
  renderVerifications();
  renderTxLog();
  if(map) initMap(); // re-init markers
}

/* ---------- Admin dropdown ---------- */
function initAdminDropdown(){
  const btn = qs('#adminUserBtn');
  const dd = qs('#adminDropdown');
  btn.addEventListener('click', (e) => {
    dd.classList.toggle('hidden');
  });
  qs('#logoutBtn').addEventListener('click', () => {
    // demo logout: clear wallet display
    currentAddress = null; provider = null; signer = null;
    el('walletAddress').innerText = 'Wallet: Not connected';
    el('walletNetwork').innerText = 'Network: -';
    el('walletOverview').innerText = 'Connect a wallet to see balances, tokens and recent transactions.';
    el('connectBtn').innerText = 'Connect Wallet';
    dd.classList.add('hidden');
    alert('Logged out (demo).');
  });
}

/* ---------- Init everything ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // top-nav buttons
  qsa('.top-btn').forEach(b => b.addEventListener('click', () => openTopNav(b.dataset.page)));

  // sidebar click
  qs('.nav').addEventListener('click', onSidebarClick);
  initNavToggles();

  // sidebar items (open page)
  qsa('.sidebar-item').forEach(item => item.addEventListener('click', () => {
    const page = item.dataset.page; if(page) openTopNav(page);
  }));

  // tabs in projects
  qsa('#page-projects .tab').forEach(tab => tab.addEventListener('click', () => switchProjectTab(tab.dataset.tab)));

  // MRV tabs
  qsa('#page-mrv .tab').forEach(tab => tab.addEventListener('click', () => switchMrvTab(tab.dataset.tab)));

  // blockchain tabs
  qsa('#page-more .tab').forEach(tab => tab.addEventListener('click', () => switchWalletTab(tab.dataset.btab)));

  // Connect wallet
  el('connectBtn').addEventListener('click', connectWallet);

  // Contract & token buttons
  el('readContractBtn').addEventListener('click', readContract);
  el('tokenTransferBtn').addEventListener('click', tokenTransfer);

  // MRV upload
  el('mrvUpload').addEventListener('change', (ev) => handleMRVUpload(ev.target));

  // register form
  qs('#registerForm').addEventListener('submit', handleRegisterSubmit);

  // refresh
  el('refreshBtn').addEventListener('click', refreshAll);

  // modal close
  el('modalClose').addEventListener('click', closeModal);
  qs('#modalOverlay').addEventListener('click', (ev) => { if(ev.target === qs('#modalOverlay')) closeModal(); });

  // page actions
  renderKPIs();
  renderProjects('registered');
  renderVerifications();
  renderTxLog();
  initChart();
  initMap();
  initAdminDropdown();

  // small UX nicety: close admin dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const ad = qs('#adminDropdown');
    if(!qs('#adminUserBtn').contains(e.target) && !ad.classList.contains('hidden')) ad.classList.add('hidden');
  });

  // open default page
  openTopNav('dashboard');
});
