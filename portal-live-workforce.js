(()=>{
  if(window.__onePointLiveWorkforce)return;
  window.__onePointLiveWorkforce=true;
  const path=location.pathname.replace(/\/+$/,'');
  if(!['/owner','/manager'].includes(path))return;
  const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const style=document.createElement('style');style.textContent=`
    .opLiveHub{position:relative;margin-left:auto;flex:0 0 auto}
    .opLiveButton{width:38px;height:38px;border:1px solid var(--pup-line,var(--line,#e5e5e7));border-radius:12px;background:rgba(255,255,255,.92);display:grid;place-items:center;position:relative;color:var(--pup-secondary,#6e6e73);box-shadow:0 1px 2px rgba(0,0,0,.03);padding:0;transition:.15s ease}
    .opLiveButton:hover,.opLiveButton:focus-visible{background:#fff;color:var(--op-accent,var(--accent,#2563eb));border-color:color-mix(in srgb,var(--op-accent,var(--accent,#2563eb)) 28%,var(--pup-line,var(--line,#e5e5e7)));box-shadow:0 5px 16px rgba(0,0,0,.08);outline:none}
    .opLiveButton svg{width:19px;height:19px;display:block}
    .opLiveDot{position:absolute;right:5px;top:5px;width:7px;height:7px;border-radius:50%;background:#16803d;box-shadow:0 0 0 3px rgba(22,128,61,.12)}
    .opLiveBadge{position:absolute;right:-7px;bottom:-6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#16803d;color:#fff;border:2px solid #fff;font-size:10px;font-weight:750;line-height:14px;display:grid;place-items:center}
    .opLiveHub[data-count="0"] .opLiveDot{background:#a1a1a6;box-shadow:none}.opLiveHub[data-count="0"] .opLiveBadge{background:#8e8e93}
    .opLivePanel{position:absolute;right:0;top:calc(100% + 8px);width:min(330px,calc(100vw - 28px));background:rgba(255,255,255,.98);border:1px solid var(--pup-line,var(--line,#e5e5e7));border-radius:16px;box-shadow:0 18px 48px rgba(0,0,0,.14);padding:10px;z-index:80;opacity:0;visibility:hidden;transform:translateY(-4px);pointer-events:none;transition:opacity .13s ease,transform .13s ease,visibility .13s ease;backdrop-filter:blur(20px)}
    .opLivePanel::before{content:'';position:absolute;left:0;right:0;top:-12px;height:12px;background:transparent}
    .opLiveHub:hover .opLivePanel,.opLiveHub:focus-within .opLivePanel,.opLiveHub.open .opLivePanel,.opLiveHub.hoverOpen .opLivePanel{opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto}
    .opLivePanelHead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 8px 9px;border-bottom:1px solid var(--pup-line,var(--line,#e5e5e7))}
    .opLivePanelHead strong{font-size:13px;font-weight:750}.opLivePanelHead span{font-size:11px;color:#16803d;font-weight:700}
    .opLiveList{display:grid;max-height:330px;overflow:auto;padding-top:4px}.opLiveRow{display:flex;align-items:center;gap:10px;padding:9px 8px;border-radius:10px}.opLiveRow:hover{background:#f7f7f8}
    .opLiveAvatar{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ecfdf3;color:#166534;font-size:11px;font-weight:800;flex:0 0 auto}
    .opLivePerson{min-width:0;flex:1}.opLivePerson b{display:block;font-size:13px;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.opLivePerson small{display:block;color:var(--pup-secondary,#6e6e73);font-size:11px;line-height:1.35;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .opLiveEmpty{padding:18px 10px;text-align:center;color:var(--pup-secondary,#6e6e73);font-size:12px}
    @media(max-width:700px){.opLivePanel{position:fixed;right:14px;top:66px}.opLivePanel::before{display:none}.opLiveHub{margin-left:auto}.opLiveButton{width:36px;height:36px}}
  `;document.head.appendChild(style);

  let rows=[],loading=false,channel=null,lastLoad=0,renderTimer=null,hoverCloseTimer=null;
  function onOverview(){return!!$('#nav [data-tab="overview"].active')}
  function initials(name){return String(name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'?'}
  function timeLabel(v){if(!v)return'';const d=new Date(v);return Number.isNaN(d.getTime())?'':d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}
  function normalizedRows(data){const byEmployee=new Map();for(const row of data||[]){if(!row.employee_id)continue;const prev=byEmployee.get(row.employee_id);if(!prev||new Date(row.actual_clock_in)>new Date(prev.actual_clock_in))byEmployee.set(row.employee_id,row)}return[...byEmployee.values()].sort((a,b)=>String(a.employees?.name||'').localeCompare(String(b.employees?.name||'')))}
  function openHover(hub){clearTimeout(hoverCloseTimer);hub.classList.add('hoverOpen')}
  function closeHoverSoon(hub){clearTimeout(hoverCloseTimer);hoverCloseTimer=setTimeout(()=>hub.classList.remove('hoverOpen'),180)}
  function mount(){
    $('.opLiveCountCard')?.remove();
    const top=$('.top');if(!top)return null;
    let hub=$('#opLiveHub');
    if(!hub){
      hub=document.createElement('div');hub.id='opLiveHub';hub.className='opLiveHub';
      hub.innerHTML=`<button type="button" class="opLiveButton" id="opLiveButton" aria-label="Live employees" aria-haspopup="true" aria-expanded="false" title="Live employees"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><span class="opLiveDot" aria-hidden="true"></span><span class="opLiveBadge" id="opLiveBadge">0</span></button><div class="opLivePanel" id="opLivePanel" role="status" aria-live="polite"></div>`;
      const who=$('#who');top.insertBefore(hub,who||null);
      hub.querySelector('#opLiveButton').addEventListener('click',e=>{e.stopPropagation();hub.classList.toggle('open');hub.querySelector('#opLiveButton').setAttribute('aria-expanded',hub.classList.contains('open')?'true':'false')});
      hub.addEventListener('mouseenter',()=>{openHover(hub);if(Date.now()-lastLoad>10000)load(true)});
      hub.addEventListener('mouseleave',()=>closeHoverSoon(hub));
      const panel=hub.querySelector('#opLivePanel');panel.addEventListener('mouseenter',()=>openHover(hub));panel.addEventListener('mouseleave',()=>closeHoverSoon(hub));
      document.addEventListener('click',e=>{if(!hub.contains(e.target)){hub.classList.remove('open','hoverOpen');hub.querySelector('#opLiveButton')?.setAttribute('aria-expanded','false')}});
      document.addEventListener('keydown',e=>{if(e.key==='Escape'){hub.classList.remove('open','hoverOpen');hub.querySelector('#opLiveButton')?.setAttribute('aria-expanded','false')}});
    }
    hub.hidden=!onOverview();
    return hub;
  }
  function render(){
    const hub=mount();if(!hub||!onOverview())return;
    const count=rows.length;hub.dataset.count=String(count);
    const badge=hub.querySelector('#opLiveBadge');if(badge)badge.textContent=count>99?'99+':String(count);
    const btn=hub.querySelector('#opLiveButton');if(btn)btn.setAttribute('aria-label',`${count} employee${count===1?'':'s'} clocked in now`);
    const panel=hub.querySelector('#opLivePanel');if(!panel)return;
    panel.innerHTML=`<div class="opLivePanelHead"><strong>Clocked In Now</strong><span>${count} live</span></div>${count?`<div class="opLiveList">${rows.map(r=>{const emp=r.employees||{},store=r.stores||{},name=emp.name||`Employee #${emp.employee_number||''}`,storeName=store.name||store.store_code||'Location',since=timeLabel(r.actual_clock_in);return`<div class="opLiveRow"><div class="opLiveAvatar">${esc(initials(name))}</div><div class="opLivePerson"><b>${esc(name)}</b><small>${esc(storeName)}${since?` · since ${esc(since)}`:''}</small></div></div>`}).join('')}</div>`:'<div class="opLiveEmpty">No employees are currently clocked in.</div>'}`;
  }
  async function load(force=false){
    if(loading)return;if(!force&&Date.now()-lastLoad<10000){render();return}loading=true;
    try{
      const{data,error}=await sb.from('time_entries').select('id,employee_id,store_id,actual_clock_in,employees!time_entries_employee_id_fkey(name,employee_number),stores!time_entries_store_id_fkey(name,store_code)').is('actual_clock_out',null).eq('is_void',false).eq('missed_clock_out',false).order('actual_clock_in',{ascending:true});
      if(error)throw error;rows=normalizedRows(data);lastLoad=Date.now();render();
    }catch(e){console.warn('Live employee status:',e?.message||e)}finally{loading=false}
  }
  function schedule(force=false,ms=80){clearTimeout(renderTimer);renderTimer=setTimeout(()=>load(force),ms)}
  function subscribe(){if(channel)return;channel=sb.channel(`onepoint-live-employees-${path.replace('/','')}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'time_entries'},()=>schedule(true,50)).subscribe()}
  document.addEventListener('click',e=>{if(e.target.closest('#nav button'))setTimeout(()=>{mount();if(onOverview())schedule(false,0)},170)},true);
  const content=$('#content');if(content){const observer=new MutationObserver(()=>{if(onOverview())mount()});observer.observe(content,{childList:true})}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&onOverview())schedule(Date.now()-lastLoad>30000,70)});
  setTimeout(()=>{mount();schedule(true,0);subscribe()},550);
  window.onePointLiveWorkforce={refresh:()=>load(true),render};
})();
