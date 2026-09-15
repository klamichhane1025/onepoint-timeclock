(()=>{
  const path=location.pathname.replace(/\/+$/,'');
  if(!['/owner','/manager','/admin'].includes(path)||window.__onePointAdjustedClockOutDisplay)return;
  window.__onePointAdjustedClockOutDisplay=true;

  const URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const fmt=v=>v?new Date(v).toLocaleString():'—';
  let timer=null,loading=false,cache=null,cacheAt=0;

  const css=document.createElement('style');
  css.textContent=`.opAdjustedClockOut{font-weight:700}.opAdjustedClockOut .opAdjustedMark{color:#b45309;font-weight:900}.opAdjustedClockLegend{margin-top:8px;font-size:11px}`;
  document.head.appendChild(css);

  async function session(){const{data:{session}}=await sb.auth.getSession();return session}

  async function ownerRows(s){
    const r=await fetch(`${URL}/functions/v1/shared-store-access`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({action:'owner_payroll_snapshot'})});
    const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'Unable to load adjusted clock-outs.');
    const emp=new Map((d.employees||[]).map(x=>[x.id,x])),stores=new Map((d.stores||[]).map(x=>[x.id,x]));
    return(d.entries||[]).filter(x=>x.close_time_adjusted&&x.payable_clock_out).map(x=>({...x,__employee:emp.get(x.employee_id),__store:stores.get(x.store_id)}));
  }

  async function adminRows(s){
    const organization_id=sessionStorage.getItem('onepoint_admin_selected_org')||'';if(!organization_id)return[];
    const r=await fetch(`${URL}/functions/v1/admin-owner-parity`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({action:'snapshot',organization_id})});
    const d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'Unable to load adjusted clock-outs.');
    const emp=new Map((d.employees||[]).map(x=>[x.id,x])),stores=new Map((d.stores||[]).map(x=>[x.id,x]));
    return(d.time_entries||[]).filter(x=>x.close_time_adjusted&&x.payable_clock_out).map(x=>({...x,__employee:emp.get(x.employee_id),__store:stores.get(x.store_id)}));
  }

  async function managerRows(s){
    const{data:m,error:me}=await sb.from('organization_users').select('organization_id').eq('user_id',s.user.id).eq('role','manager').eq('active',true).maybeSingle();if(me)throw me;if(!m)return[];
    const{data,error}=await sb.from('time_entries').select('id,employee_id,store_id,actual_clock_in,actual_clock_out,payable_clock_out,scheduled_close_at,close_time_adjusted,missed_clock_out,employees(name,employee_number),stores(name,store_code)').eq('organization_id',m.organization_id).eq('close_time_adjusted',true).not('payable_clock_out','is',null).order('actual_clock_in',{ascending:false}).limit(2000);if(error)throw error;
    return(data||[]).map(x=>({...x,__employee:x.employees,__store:x.stores}));
  }

  async function load(force=false){
    if(!force&&cache&&Date.now()-cacheAt<4000)return cache;
    const s=await session();if(!s)return[];
    cache=path==='/owner'?await ownerRows(s):path==='/admin'?await adminRows(s):await managerRows(s);cacheAt=Date.now();return cache;
  }

  function headers(table){return[...table.querySelectorAll('thead th')].map(x=>x.textContent.trim().toLowerCase())}
  function rowId(tr){return tr.dataset.entryId||tr.dataset.id||''}
  function matches(entry,tr,heads){
    const ei=heads.findIndex(x=>x==='employee'||x.startsWith('employee'));
    const si=heads.findIndex(x=>x==='location'||x==='store'||x.startsWith('location')||x.startsWith('store'));
    const ci=heads.findIndex(x=>x==='clock in'||x.startsWith('clock in'));
    const cells=[...tr.children];if(ei<0||si<0||ci<0||!cells[ei]||!cells[si]||!cells[ci])return false;
    const emp=entry.__employee||{},store=entry.__store||{},et=cells[ei].textContent||'',st=cells[si].textContent||'',ct=(cells[ci].textContent||'').trim();
    const empOk=emp.name?et.includes(String(emp.name)):true;
    const storeLabel=store.name||store.store_code||'',storeOk=storeLabel?st.includes(String(storeLabel)):true;
    return empOk&&storeOk&&ct===fmt(entry.actual_clock_in);
  }

  async function decorate(force=false){
    if(loading)return;const tables=$$('table').filter(t=>headers(t).some(x=>x==='clock out'||x.startsWith('clock out')));if(!tables.length)return;
    loading=true;
    try{
      const entries=await load(force),byId=new Map(entries.map(x=>[x.id,x]));
      for(const table of tables){
        const heads=headers(table),outIndex=heads.findIndex(x=>x==='clock out'||x.startsWith('clock out'));if(outIndex<0)continue;
        let adjusted=0;
        for(const tr of table.querySelectorAll('tbody tr')){
          const cells=[...tr.children];if(!cells[outIndex])continue;
          let entry=byId.get(rowId(tr));if(!entry)entry=entries.find(x=>matches(x,tr,heads));if(!entry?.payable_clock_out)continue;
          const cell=cells[outIndex],effective=fmt(entry.payable_clock_out),expected=`${effective} *`;
          adjusted++;
          if(cell.dataset.opAdjustedClockOut==='1'&&cell.textContent.trim()===expected)continue;
          const title=entry.actual_clock_out?`Adjusted to store closing time. Actual employee punch: ${fmt(entry.actual_clock_out)}`:'System-applied store closing time; employee did not physically punch out.';
          cell.innerHTML=`<span class="opAdjustedClockOut" title="${title}">${effective} <span class="opAdjustedMark">*</span></span>`;
          cell.dataset.opAdjustedClockOut='1';
        }
        const wrap=table.closest('.table')||table.parentElement;if(adjusted&&wrap&&!wrap.parentElement?.querySelector(':scope > .opAdjustedClockLegend')){
          const note=document.createElement('div');note.className='muted opAdjustedClockLegend';note.textContent='* Clock-out adjusted to the store’s scheduled closing time. If the employee punched out later, the actual punch remains preserved in audit history.';wrap.insertAdjacentElement('afterend',note);
        }
      }
    }catch(e){console.warn('Adjusted clock-out display:',e?.message||e)}finally{loading=false}
  }

  function schedule(force=false,ms=120){clearTimeout(timer);timer=setTimeout(()=>decorate(force),ms)}
  const observer=new MutationObserver(()=>schedule(false,100));observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target.closest('#nav button,[data-tab],[data-aw-tab],#apApply,#v4Apply,#opCheckApply'))schedule(true,260)},true);
  sb.channel(`onepoint-adjusted-clockout-${path.replace('/','')}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'time_entries'},()=>schedule(true,180)).subscribe();
  setTimeout(()=>decorate(true),900);
})();