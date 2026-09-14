(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/admin')return;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const parityTabs=new Set(['overview','employees','stores','timesheets']);

if(!$('#apAuthoritativeCss')){
  const s=document.createElement('style');s.id='apAuthoritativeCss';s.textContent=`
  .apCompactFilters{gap:8px!important;align-items:flex-end!important}
  .apCompactFilters .field{flex:0 0 auto!important;margin:0!important}
  .apCompactFilters input[type="datetime-local"]{width:176px!important;min-width:176px!important;max-width:176px!important;height:38px!important;padding:7px 8px!important}
  .apCompactFilters #apEmployee{width:154px!important;min-width:138px!important;max-width:170px!important;height:38px!important;padding:7px 26px 7px 8px!important}
  .apCompactFilters #apPunch{width:122px!important;min-width:116px!important;max-width:130px!important;height:38px!important;padding:7px 26px 7px 8px!important}
  .apCompactFilters .apSelectMenu{width:154px!important;min-width:154px!important;max-width:154px!important}
  .apCompactFilters .apSelectMenu summary{height:38px!important;box-sizing:border-box!important;padding:8px 28px 8px 9px!important;font-size:13px!important;position:relative}
  .apCompactFilters .apSelectMenu summary:after{content:'▾';position:absolute;right:9px;top:8px;color:#64748b;font-size:12px}
  .apCompactFilters .apSelectPanel{width:210px!important;max-height:230px!important;padding:6px!important}
  .apCompactFilters .apSelectPanel label{padding:5px 6px!important;font-size:13px!important}
  .apCompactFilters .btn{height:38px!important;padding:7px 12px!important}
  .apTable th:nth-child(4),.apTable th:nth-child(5),.apTable td:nth-child(4),.apTable td:nth-child(5){min-width:150px;white-space:nowrap}
  .apTable td:nth-child(4),.apTable td:nth-child(5){font-variant-numeric:tabular-nums}
  @media(max-width:760px){.apCompactFilters .field{flex:1 1 145px!important}.apCompactFilters input[type="datetime-local"],.apCompactFilters #apEmployee,.apCompactFilters #apPunch,.apCompactFilters .apSelectMenu{width:100%!important;min-width:0!important;max-width:100%!important}}
  `;document.head.appendChild(s)
}

function renderParity(tab){
  const api=window.onePointAdminOwnerParity;
  if(!api?.render)return setTimeout(()=>renderParity(tab),120);
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.awTab===tab));
  api.render(tab);
}

// The legacy Admin workspace owns the shell/navigation. For the four Owner-parity
// operational tabs, stop its reduced renderer and use the parity renderer as the
// single authoritative view. Other Admin tabs continue through the Admin workspace.
document.addEventListener('click',e=>{
  const nav=e.target.closest('#nav [data-aw-tab]');
  if(!nav)return;
  const tab=nav.dataset.awTab;
  if(!parityTabs.has(tab))return;
  if(!sessionStorage.getItem('onepoint_admin_selected_org'))return;
  e.preventDefault();
  e.stopImmediatePropagation();
  renderParity(tab);
},true);

// Opening an Owner still needs the legacy shell to establish the selected organization
// and navigation. Once that completes, deterministically replace Overview with parity.
document.addEventListener('click',e=>{
  const open=e.target.closest('.awOpen');
  if(!open?.dataset.org)return;
  sessionStorage.setItem('onepoint_admin_selected_org',open.dataset.org);
  [450,850,1250].forEach(ms=>setTimeout(()=>{
    const overview=$('#nav [data-aw-tab="overview"]');
    if(overview&&sessionStorage.getItem('onepoint_admin_selected_org')===open.dataset.org)renderParity('overview');
  },ms));
},true);

// If an Owner is already open on refresh, ensure parity wins after all legacy scripts initialize.
setTimeout(()=>{
  if(!sessionStorage.getItem('onepoint_admin_selected_org'))return;
  const active=$('#nav [data-aw-tab].active');
  const tab=active?.dataset.awTab;
  if(parityTabs.has(tab))renderParity(tab);
},1500);
})();
