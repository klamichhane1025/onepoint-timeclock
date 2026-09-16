(()=>{
  if(window.__onePointPreferredStoreOrder)return;
  window.__onePointPreferredStoreOrder=true;
  const path=location.pathname.replace(/\/+$/,'');
  if(!['/owner','/manager','/admin'].includes(path))return;
  const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const CACHE_MS=30000;
  let cache={org:'',stores:[],order:new Map(),at:0},timer=null,running=false,observer=null;

  async function session(){const{data:{session}}=await sb.auth.getSession();return session}
  async function orgId(){
    if(path==='/admin')return sessionStorage.getItem('onepoint_admin_selected_org')||'';
    const s=await session();if(!s)return'';
    const role=path==='/manager'?'manager':'owner';
    const{data,error}=await sb.from('organization_users').select('organization_id').eq('user_id',s.user.id).eq('role',role).eq('active',true).maybeSingle();
    if(error)throw error;return data?.organization_id||'';
  }
  async function adminStores(id){
    const s=await session();if(!s)return[];
    const r=await fetch(`${URL}/functions/v1/admin-owner-parity`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({action:'snapshot',organization_id:id})}),d=await r.json().catch(()=>({}));
    if(!r.ok||d.error)throw new Error(d.error||'Unable to load locations.');return(d.stores||[]).filter(x=>x.active!==false)
  }
  async function load(force=false){
    const id=await orgId();if(!id)return null;
    if(!force&&cache.org===id&&Date.now()-cache.at<CACHE_MS)return cache;
    let stores=[];
    if(path==='/admin')stores=await adminStores(id);
    else{const{data,error}=await sb.from('stores').select('id,name,store_code,active').eq('active',true).order('store_code');if(error)throw error;stores=data||[]}
    const{data:ordered,error:oErr}=await sb.from('organization_store_order').select('store_id,position').eq('organization_id',id).order('position');if(oErr)throw oErr;
    cache={org:id,stores,order:new Map((ordered||[]).map(x=>[x.store_id,Number(x.position)])),at:Date.now()};
    return cache
  }
  function ranker(data){
    const fallback=new Map(data.stores.map((s,i)=>[s.id,i]));
    return id=>data.order.has(id)?data.order.get(id):100000+(fallback.get(id)??99999)
  }
  function sortRows(rows,data=cache){
    const rank=ranker(data);
    return[...(rows||[])].sort((a,b)=>rank(a.id)-rank(b.id))
  }
  function reorderSelect(select,data){
    if(select.querySelector('optgroup'))return;
    const ids=new Set(data.stores.map(x=>x.id)),options=[...select.options],matched=options.filter(o=>ids.has(o.value));
    if(matched.length<2)return;
    const rank=ranker(data),sorted=[...matched].sort((a,b)=>rank(a.value)-rank(b.value));
    const special=options.filter(o=>!ids.has(o.value));
    [...special,...sorted].forEach(o=>select.appendChild(o))
  }
  function reorderCheckboxContainers(data){
    const ids=new Set(data.stores.map(x=>x.id)),rank=ranker(data);
    const containers=$$('.selectMenuPanel,.apSelectPanel,.list,.radioGroup').filter(c=>{
      const labels=[...c.children].filter(x=>x.matches?.('label')&&ids.has(x.querySelector('input[type="checkbox"]')?.value||''));return labels.length>=2
    });
    for(const c of containers){
      const labels=[...c.children].filter(x=>x.matches?.('label')&&ids.has(x.querySelector('input[type="checkbox"]')?.value||''));
      labels.sort((a,b)=>rank(a.querySelector('input')?.value||'')-rank(b.querySelector('input')?.value||''));
      labels.forEach(x=>c.appendChild(x))
    }
  }
  async function apply(force=false){
    if(running)return;running=true;observer?.disconnect();
    try{const data=await load(force);if(!data)return;$$('select').forEach(s=>reorderSelect(s,data));reorderCheckboxContainers(data)}catch(e){console.warn('Preferred store order:',e?.message||e)}finally{running=false;const content=$('#content');if(content)observer?.observe(content,{subtree:true,childList:true})}
  function schedule(force=false,delay=80){clearTimeout(timer);timer=setTimeout(()=>apply(force),delay)}
  const content=$('#content');if(content){observer=new MutationObserver(ms=>{if(ms.some(m=>m.addedNodes.length))schedule(false,70)});observer.observe(content,{subtree:true,childList:true})}
  document.addEventListener('click',e=>{if(e.target.closest('#nav button,[data-tab],[data-aw-tab],button'))schedule(false,160)},true);
  document.addEventListener('dragend',e=>{if(e.target.closest?.('.opStoreDragHandle')){cache.at=0;schedule(true,320)}},true);
  document.addEventListener('onepoint:store-order-changed',()=>{cache.at=0;schedule(true,40)});
  setTimeout(()=>apply(false),650);
  window.onePointPreferredStoreOrder={refresh:()=>schedule(true,0),sortRows:rows=>sortRows(rows),getOrderedStoreIds:()=>sortRows(cache.stores).map(x=>x.id)};
})();
