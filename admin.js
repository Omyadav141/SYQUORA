/**
 admin.js
 - Fully functional interactivity for admin.html
 - Collapsible sidebar, top nav routing, project CRUD (with localStorage),
 - MRV upload demo, verification approve/reject,
 - Leaflet map + markers, Chart.js chart,
 - Ethers.js wallet connect with balance & network
*/

/* Helpers */
const qs = sel => document.querySelector(sel);
const qsa = sel => Array.from(document.querySelectorAll(sel));
const el = id => document.getElementById(id);

/* ======== Data Storage ======== */
const STORAGE_KEYS = {
  PROJECTS: 'syquora_projects',
  VERIFICATIONS: 'syquora_verifications',
  TRANSACTIONS: 'syquora_transactions'
};

function loadFromStorage(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
    return null;
  }
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
    return false;
  }
}

// Initialize data from storage or with defaults
let projects = loadFromStorage(STORAGE_KEYS.PROJECTS) || [
  { id:'p1', name:'Sundarbans Mangrove', owner:'NGO A', ha:1200, co2:5200, health:82, status:'Active', coords:[22.05,88.66], employee:'John Doe', description:'Mangrove restoration project in Sundarbans region'},
  { id:'p2', name:'Seagrass Bay', owner:'Community X', ha:450, co2:2300, health:70, status:'Active', coords:[12.34,80.22], employee:'Sarah Wilson', description:'Seagrass conservation and restoration initiative'},
  { id:'p3', name:'Coral Reef Restore', owner:'Gov Unit', ha:300, co2:1200, health:60, status:'Pending', coords:[10.12,124.56], employee:'Michael Chen', description:'Coral reef restoration program'}
];

let verifications = loadFromStorage(STORAGE_KEYS.VERIFICATIONS) || [
  {project:'Coral Reef Restore', uploader:'Dr. P', file:'reef_mrv_2025.csv', status:'Pending'},
  {project:'Seagrass Bay', uploader:'Community X', file:'seagrass_2025.xlsx', status:'Pending'}
];

let txs = loadFromStorage(STORAGE_KEYS.TRANSACTIONS) || [
  {hash:'0xabc123def', action:'Mint', project:'p1', amount:1000, time:'2025-09-12 10:12'},
  {hash:'0xdef456ghi', action:'Transfer', project:'p2', amount:300, time:'2025-09-13 14:03'}
];

// Save initial data if not present
if (!loadFromStorage(STORAGE_KEYS.PROJECTS)) {
  saveToStorage(STORAGE_KEYS.PROJECTS, projects);
}
if (!loadFromStorage(STORAGE_KEYS.VERIFICATIONS)) {
  saveToStorage(STORAGE_KEYS.VERIFICATIONS, verifications);
}
if (!loadFromStorage(STORAGE_KEYS.TRANSACTIONS)) {
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
}

/* Chart + Map holders */
let co2Chart, map, markers = [];

/* ---------- UI functions ---------- */

/* Show/hide pages */
function openTopNav(pageKey){
  qsa('.top-btn').forEach(b => b.classList.toggle('active', b.dataset.page === pageKey));
  qsa('.page').forEach(p => p.classList.remove('active'));
  const page = qs('#page-' + pageKey);
  if(page) page.classList.add('active');
  if(pageKey === 'projects') switchProjectTab('registered');
  if(pageKey === 'mrv') switchMrvTab('dashboard');
  window.scrollTo({top:0, behavior:'smooth'});
}

/* Sidebar click handler */
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
      if(arrow) arrow.style.transform = group.classList.contains('open') ? 'rotate(180deg)' : '';
    });
  });
}

/* Charts */
function initCharts(){
  const ctx = document.getElementById('co2Chart');
  if(!ctx) return;
  co2Chart = new Chart(ctx, {
    type:'line',
    data:{
      labels:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct'],
      datasets:[{label:'CO₂ (t)',data:[120,150,170,130,190,210,220,200,230,240],fill:false}]
    },
    options:{responsive:true,maintainAspectRatio:false}
  });
}

/* Map */
function initMap(){
  const elMap = document.getElementById('mapView');
  if(!elMap) return;
  if(map) map.remove();
  map = L.map(elMap).setView([15.5, 80.0], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19, attribution:'© OpenStreetMap'
  }).addTo(map);
  markers.forEach(m => m.remove());
  markers = [];
  projects.forEach(p => addProjectMarker(p));
  
  // Ensure map resizes properly after initialization
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 100);
}

function addProjectMarker(p){
  if(!map) return;
  const m = L.marker(p.coords).addTo(map).bindPopup(`<strong>${p.name}</strong><br/>${p.owner}`);
  markers.push(m);
}

/* Render KPIs */
function renderKPIs(){
  const total = projects.length;
  const avgHealth = Math.round(projects.reduce((s,p)=>s+p.health,0)/Math.max(1,projects.length));
  const totalCo2 = projects.reduce((s,p)=>s+p.co2,0);
  el('kpiRegistered').innerText = total;
  el('kpiCO2').innerText = totalCo2 + ' t';
  el('kpiHealth').innerText = avgHealth + '%';
  el('registeredCount').innerText = total;

  const ra = el('recentActivity'); ra.innerHTML = '';
  txs.slice(0,6).forEach(tx => {
    const li = document.createElement('li'); li.innerText = `${tx.time} — ${tx.action} ${tx.amount} (project ${tx.project})`;
    ra.appendChild(li);
  });
}

/* Render projects */
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
        <button class="btn danger small" data-action="deleteProject" data-id="${p.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });

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
  tbody.querySelectorAll('[data-action="deleteProject"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      deleteProject(id);
    });
  });
}

/* Delete project */
function deleteProject(id) {
  if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
    return;
  }
  
  const index = projects.findIndex(p => p.id === id);
  if (index !== -1) {
    const deletedProject = projects.splice(index, 1)[0];
    
    // Update storage
    saveToStorage(STORAGE_KEYS.PROJECTS, projects);
    
    // Update UI
    renderKPIs();
    renderProjects('registered');
    initMap();
    
    // Add to transaction log
    const newTx = {
      hash: '0xdel' + Date.now(),
      action: 'Delete Project',
      project: deletedProject.name,
      amount: 0,
      time: new Date().toISOString().slice(0,16).replace('T',' ')
    };
    txs.unshift(newTx);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
    renderTxLog();
    
    alert(`Project "${deletedProject.name}" has been deleted.`);
  }
}

/* Render verifications */
function renderVerifications(){
  const vtbody = qs('#verificationList tbody'); vtbody.innerHTML = '';
  verifications.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${v.project}</td><td>${v.uploader}</td><td>
      <button class="btn small" data-action="review" data-project="${v.project}">Review</button>
    </td>`;
    vtbody.appendChild(tr);
  });
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
  saveToStorage(STORAGE_KEYS.VERIFICATIONS, verifications);
  renderVerifications();
  alert(`Verification for "${projectName}" set to "${status}"`);
}

/* Tx log */
function renderTxLog(){
  const ul = el('txLog'); ul.innerHTML = '';
  txs.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${t.action}</strong> ${t.amount} — <span class="muted">${t.time}</span> <div class="muted">tx: ${t.hash}</div>`;
    ul.appendChild(li);
  });
}

/* Modal */
function openProjectModal(project){
  const overlay = el('modalOverlay');
  const content = el('modalContent');
  const p = typeof project === 'string' ? { name: project } : project;
  content.innerHTML = `
    <h3>${p.name}</h3>
    <p><strong>Owner:</strong> ${p.owner || '—'}</p>
    <p><strong>Hectares:</strong> ${p.ha || '—'}</p>
    <p><strong>CO₂:</strong> ${p.co2 || '—'}</p>
    <p><strong>Health Score:</strong> ${p.health || '—'}%</p>
    <p><strong>Assigned Employee:</strong> ${p.employee || '—'}</p>
    <p><strong>Description:</strong> ${p.description || '—'}</p>
    <div style="margin-top:12px">
      <button class="btn" id="modalZoomBtn" data-lat="${p.coords?.[0]||''}" data-lon="${p.coords?.[1]||''}" data-name="${p.name}">Zoom to map</button>
      <button class="btn danger" data-action="deleteProject" data-id="${p.id}">Delete Project</button>
      <button class="btn ghost" id="modalClose">Close</button>
    </div>
  `;
  overlay.classList.remove('hidden');
  
  // Ensure the modal buttons also work (close)
  setTimeout(()=> {
    const mb = document.getElementById('modalClose');
    if(mb) mb.addEventListener('click', ()=> overlay.classList.add('hidden'));
    
    // Add delete handler
    const deleteBtn = content.querySelector('[data-action="deleteProject"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        overlay.classList.add('hidden');
        deleteProject(deleteBtn.dataset.id);
      });
    }
  },50);
}

/* Wallet (placeholder) */
let provider, signer, currentAddress = null;
async function connectWallet(){
  try{
    if(!window.ethereum) return alert('No web3 wallet detected (demo).');
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = provider.getSigner();
    currentAddress = await signer.getAddress();
    el('walletAddress').innerText = 'Wallet: ' + currentAddress;
    el('walletNetwork').innerText = 'Network: Connected';
    txs.unshift({hash:'0xnewtx'+Date.now(), action:'Connect', project:'-', amount:0, time: new Date().toISOString().slice(0,16).replace('T',' ')});
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
    renderTxLog();
    el('connectBtn').innerText = 'Connected';
    el('connectBtn').classList.add('ghost');
  } catch(err){
    console.error(err);
    alert('Wallet connection failed.');
  }
}

function shorten(a){ return a ? a.slice(0,6) + '...' + a.slice(-4) : '—'; }

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

/* MRV upload */
function handleMRVUpload(fileInput){
  const file = fileInput.files[0];
  if(!file) return;
  const demo = { project: projects[0]?.name || 'Demo Project', uploader: 'Uploader', file: file.name, status: 'Pending' };
  verifications.unshift(demo);
  saveToStorage(STORAGE_KEYS.VERIFICATIONS, verifications);
  el('mrvLatest').innerText = new Date().toLocaleString();
  el('mrvPending').innerText = verifications.length;
  renderVerifications();
  alert('MRV file received: ' + file.name);
}

/* Register Project */
function handleRegisterSubmit(e){
  e.preventDefault();
  const name = el('rpName').value.trim();
  const owner = el('rpOwner').value.trim();
  const ha = Number(el('rpHa').value);
  const lat = Number(el('rpLat').value);
  const lon = Number(el('rpLon').value);
  const employee = el('rpEmployee').value.trim();
  const description = el('rpDescription').value.trim();
  
  if(!name || !owner || !ha || Number.isNaN(lat) || Number.isNaN(lon) || !employee || !description){
    return alert('Please fill all fields correctly.');
  }
  
  const newP = {
    id:'p' + Date.now(), // Use timestamp for unique ID
    name, 
    owner, 
    ha,
    co2: Math.round(ha * 3.5),
    health: 85,
    status: 'Active',
    coords: [lat, lon],
    employee,
    description
  };
  
  projects.unshift(newP);
  saveToStorage(STORAGE_KEYS.PROJECTS, projects);
  addProjectMarker(newP);
  renderKPIs();
  renderProjects('registered');
  
  // Add to transaction log
  const newTx = {
    hash: '0xadd' + Date.now(),
    action: 'Add Project',
    project: name,
    amount: ha,
    time: new Date().toISOString().slice(0,16).replace('T',' ')
  };
  txs.unshift(newTx);
  saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
  renderTxLog();
  
  alert('Project saved successfully.');
  qs('#registerForm').reset();
}

/* Refresh UI */
function refreshAll(){
  renderKPIs();
  renderProjects('registered');
  renderVerifications();
  renderTxLog();
  if(map) initMap();
}

/* Clear all data */
function clearAllData() {
  if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
    localStorage.clear();
    
    // Reset to default data
    projects = [
      { id:'p1', name:'Sundarbans Mangrove', owner:'NGO A', ha:1200, co2:5200, health:82, status:'Active', coords:[22.05,88.66], employee:'John Doe', description:'Mangrove restoration project in Sundarbans region'},
      { id:'p2', name:'Seagrass Bay', owner:'Community X', ha:450, co2:2300, health:70, status:'Active', coords:[12.34,80.22], employee:'Sarah Wilson', description:'Seagrass conservation and restoration initiative'},
      { id:'p3', name:'Coral Reef Restore', owner:'Gov Unit', ha:300, co2:1200, health:60, status:'Pending', coords:[10.12,124.56], employee:'Michael Chen', description:'Coral reef restoration program'}
    ];
    
    verifications = [
      {project:'Coral Reef Restore', uploader:'Dr. P', file:'reef_mrv_2025.csv', status:'Pending'},
      {project:'Seagrass Bay', uploader:'Community X', file:'seagrass_2025.xlsx', status:'Pending'}
    ];
    
    txs = [
      {hash:'0xabc123def', action:'Mint', project:'p1', amount:1000, time:'2025-09-12 10:12'},
      {hash:'0xdef456ghi', action:'Transfer', project:'p2', amount:300, time:'2025-09-13 14:03'}
    ];
    
    // Save defaults
    saveToStorage(STORAGE_KEYS.PROJECTS, projects);
    saveToStorage(STORAGE_KEYS.VERIFICATIONS, verifications);
    saveToStorage(STORAGE_KEYS.TRANSACTIONS, txs);
    
    // Refresh UI
    refreshAll();
    alert('All data has been reset to defaults.');
  }
}

/* Admin dropdown */
function initAdminDropdown(){
  const btn = qs('#adminUserBtn');
  const dd = qs('#adminDropdown');
  btn.addEventListener('click', (e) => {
    dd.classList.toggle('hidden');
  });
  qs('#logoutBtn').addEventListener('click', () => {
    currentAddress = null; provider = null; signer = null;
    el('walletAddress').innerText = 'Wallet: Not connected';
    el('walletNetwork').innerText = 'Network: -';
    el('walletOverview').innerText = 'Connect a wallet to see balances, tokens and recent transactions.';
    el('connectBtn').innerText = 'Connect Wallet';
    dd.classList.add('hidden');
    alert('Logged out.');
  });
}

/* Tab switching functions */
function switchProjectTab(tabName) {
  qsa('#page-projects .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  renderProjects(tabName);
}

function switchMrvTab(tabName) {
  qsa('#page-mrv .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
  el('mrvDashboard').classList.toggle('hidden', tabName !== 'dashboard');
  el('mrvVerification').classList.toggle('hidden', tabName !== 'verification');
}

function switchWalletTab(tabName) {
  qsa('#page-more .tab').forEach(t => t.classList.toggle('active', t.dataset.btab === tabName));
  qsa('.wallet-tab').forEach(t => t.classList.toggle('hidden', t.id !== 'w-'+tabName));
}

/* Init */
document.addEventListener('DOMContentLoaded', () => {
  qsa('.top-btn').forEach(b => b.addEventListener('click', () => openTopNav(b.dataset.page)));
  qs('.nav').addEventListener('click', onSidebarClick);
  initNavToggles();

  qsa('.sidebar-item').forEach(item => item.addEventListener('click', () => {
    const page = item.dataset.page; if(page) openTopNav(page);
  }));
  qsa('#page-projects .tab').forEach(tab => tab.addEventListener('click', () => switchProjectTab(tab.dataset.tab)));
  qsa('#page-mrv .tab').forEach(tab => tab.addEventListener('click', () => switchMrvTab(tab.dataset.tab)));
  qsa('#page-more .tab').forEach(tab => tab.addEventListener('click', () => switchWalletTab(tab.dataset.btab)));

  el('connectBtn').addEventListener('click', connectWallet);
  el('readContractBtn').addEventListener('click', readContract);
  el('tokenTransferBtn').addEventListener('click', tokenTransfer);
  el('mrvUpload').addEventListener('change', (ev) => handleMRVUpload(ev.target));
  qs('#registerForm').addEventListener('submit', handleRegisterSubmit);
  el('refreshBtn').addEventListener('click', refreshAll);
  el('clearStorageBtn').addEventListener('click', clearAllData);
  el('modalClose').addEventListener('click', () => el('modalOverlay').classList.add('hidden'));

  // Render initial
  initCharts();
  renderKPIs();
  renderProjects('registered');
  renderVerifications();
  renderTxLog();
  // Initialize map with a small delay to ensure proper rendering
  setTimeout(initMap, 500);
  initAdminDropdown();
});