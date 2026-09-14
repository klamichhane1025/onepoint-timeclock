(()=>{
  if(window.__onePointPuppertinoPlatform)return;
  window.__onePointPuppertinoPlatform=true;

  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const path=location.pathname.replace(/\/+$/,'')||'/';
  const portal=path.startsWith('/admin')?'admin':path.startsWith('/owner')?'owner':path.startsWith('/manager')?'manager':path.startsWith('/timeclock')?'timeclock':path.startsWith('/accept-invite')?'invite':'home';
  document.body.dataset.opPortal=portal;
  document.documentElement.classList.add('opPuppertino');

  const iconPaths={
    overview:'<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    employees:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    stores:'<path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    locations:'<path d="M21 10c0 7-9 12-9 12S3 17 3 10a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    managers:'<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M17 3.13a4 4 0 0 1 0 7.75"/>',
    jobs:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
    timesheets:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    payroll:'<circle cx="12" cy="12" r="9"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8M12 6v12"/>',
    devices:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    account:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.2.37.5.7.9.9.34.2.72.3 1.1.3H21v4h-.1c-.38 0-.76.1-1.1.3-.4.2-.7.53-.9.9z"/>',
    organizations:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4"/>',
    admin:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4"/>'
  };
  const aliases={
    'job codes':'jobs','timesheets & payroll':'timesheets','timesheet & payroll':'timesheets','locations':'stores',
    'account & plan':'account','account & access':'account','account':'account','organizations':'organizations','← organizations':'organizations'
  };
  const svg=(key)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths[key]||iconPaths.overview}</svg>`;
  const navKey=(b)=>{
    const raw=(b.dataset.tab||b.dataset.awTab||'').toLowerCase();
    if(raw)return raw;
    const label=b.textContent.trim().toLowerCase();
    return aliases[label]||label.replace(/[^a-z]+/g,'-');
  };
  const sectionFor=(key,label)=>{
    const t=(label||'').toLowerCase();
    if(key==='organizations'||t.includes('organizations'))return 'Platform';
    if(key==='overview')return 'Workspace';
    if(['employees','managers','jobs'].includes(key)||t.includes('employee')||t.includes('manager')||t.includes('job'))return 'People';
    if(['stores','locations','timesheets','payroll','devices'].includes(key)||t.includes('location')||t.includes('timesheet')||t.includes('payroll')||t.includes('device'))return 'Operations';
    if(key==='account'||t.includes('account'))return 'Settings';
    return 'Workspace';
  };

  function decorateBrand(){
    const brand=$('.brand'); if(!brand)return;
    brand.classList.add('opPupBrand');
    if(!brand.querySelector('.opPupBrandMark')){
      const mark=document.createElement('span');mark.className='opPupBrandMark';mark.textContent='1';brand.prepend(mark);
    }
    if(!brand.querySelector('.opPupPortalTag')){
      const tag=document.createElement('span');tag.className='opPupPortalTag';tag.textContent=portal==='admin'?'Admin':portal==='owner'?'Owner':portal==='manager'?'Manager':portal==='timeclock'?'Time Clock':'Workspace';brand.append(tag);
    }
  }

  function decorateNav(){
    const nav=$('#nav');if(!nav)return;
    nav.classList.add('opPupNav');
    $$('.opNavSection',nav).forEach(x=>x.remove());
    let lastSection='';
    [...nav.children].filter(x=>x.matches('button')).forEach(b=>{
      const key=navKey(b),label=b.textContent.trim();
      b.classList.add('opPupNavItem');
      b.dataset.opNavKey=key;
      if(!b.querySelector('.opPupNavIcon')){
        const icon=document.createElement('span');icon.className='opPupNavIcon';icon.innerHTML=svg(aliases[label.toLowerCase()]||key);b.prepend(icon);
      }
      const section=sectionFor(key,label);
      if(section!==lastSection){
        const s=document.createElement('div');s.className='opNavSection';s.textContent=section;nav.insertBefore(s,b);lastSection=section;
      }
    });
  }

  function decorateHeader(){
    const top=$('.top');if(!top)return;
    top.classList.add('opPupTop');
    const head=top.firstElementChild;
    if(head){
      head.classList.add('opPupTitleBlock');
      if(!head.querySelector('.opPupContext')){
        const ctx=document.createElement('div');ctx.className='opPupContext';ctx.textContent=portal==='admin'?'Platform administration':portal==='owner'?'Business operations':portal==='manager'?'Store operations':portal==='timeclock'?'Employee attendance':'OnePoint workspace';head.append(ctx);
      }
    }
    if(portal!=='timeclock'&&$('.side')&&!$('#opPupNavToggle')){
      const b=document.createElement('button');b.id='opPupNavToggle';b.className='opPupNavToggle';b.type='button';b.setAttribute('aria-label','Open navigation');b.innerHTML='<span></span><span></span><span></span>';top.prepend(b);
      b.onclick=()=>document.body.classList.toggle('opNavOpen');
    }
  }

  function decorateContent(){
    const content=$('#content');if(!content)return;
    content.classList.add('opPupContent');
    $$('.card',content).forEach(c=>c.classList.add('opPupCard'));
    $$('.card.metric',content).forEach(c=>c.classList.add('opPupMetric'));
    $$('.head',content).forEach(h=>h.classList.add('opPupSectionHead'));
    $$('.table',content).forEach(t=>t.classList.add('opPupTableWrap'));
    $$('.list',content).forEach(t=>t.classList.add('opPupList'));
    $$('input[type="date"]',content).forEach(x=>x.classList.add('opFieldDate'));
    $$('input[type="time"]',content).forEach(x=>x.classList.add('opFieldTime'));
    $$('input[type="datetime-local"]',content).forEach(x=>x.classList.add('opFieldDateTime'));
    $$('input[type="number"]',content).forEach(x=>x.classList.add('opFieldNumber'));
  }

  function closeMobileOnNav(e){if(e.target.closest('#nav button'))document.body.classList.remove('opNavOpen')}
  document.addEventListener('click',closeMobileOnNav,true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('opNavOpen')});

  function run(){decorateBrand();decorateNav();decorateHeader();decorateContent()}
  run();
  let raf=0;
  const obs=new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(run)});
  obs.observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('resize',()=>{if(innerWidth>920)document.body.classList.remove('opNavOpen')},{passive:true});
})();
