(()=>{
  if(window.__onePointStoreOrdering)return;
  window.__onePointStoreOrdering=true;
  const path=location.pathname.replace(/\/+$/,'');
  if(!['/owner','/admin'].includes(path))return;
  const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const style=document.createElement('style');
  style.textContent=`.opSortableStore{position:relative}.opSortableStore[draggable="true"]{cursor:grab}.opSortableStore.opDragging{opacity:.48;cursor:grabbing}.opStoreDragHandle{width:28px;height:28px;min-width:28px;border-radius:8px;display:grid;place-items:center;color:var(--pup-tertiary,#86868b);font-size:17px;line-height:1;user-select:none;cursor:grab;background:rgba(118,118,128,.06)}.opStoreDragHandle:hover{background:rgba(118,118,128,.12);color:var(--pup-text,#1d1d1f)}.opPeriodTile .opStoreDragHandle,.apTile .opStoreDragHandle{position:absolute;right:10px;top:10px;z-index:4}.opOrderHint{display:inline-flex;align-items:center;gap:6px;margin-top:5px;color:var(--pup-secondary,#6e6e73);font-size:11px}.opOrderSaved{color:#16803d;font-weight:700;opacity:0;transition:opacity .2s}.opOrderSaved.show{opacity:1}.opSortDropBefore{box-shadow:inset 0 3px 0 var(--pup-blue,#0071e3)!important}`;
  document.head.appendChild(style);
  let applying=false,dragId='',persistTimer=null,applyTimer=null,lastOrg='',cachedStores=[],cachedAt=0;
  async function session(){const{data:{session}}=await sb.auth.getSession();return session}
  async function orgId(){
    if(path==='/admin')return sessionStorage.getItem('onepoint_admin_selected_org')||'';
    const s=await session();if(!s)return'';const{data}=await sb.from('organization_users').select('organization_id').eq('user_id',s.user.id).eq('role','owner').eq('active',true).maybeSingle();return data?.organization_id||'';
  }
  async function adminSnapshot(id){const s=await session();if(!s)throw new Error('Admin session expired.');const r=await fetch(`${URL}/functions/v1/admin-owner-parity`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${s.access_token}`},body:JSON.stringify({action:'snapshot',organization_id:id})}),d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'Unable to load locations.');return d}
  async function storesFor(id){
    const now=Date.now();if(id===lastOrg&&cachedStores.length&&now-cachedAt<5000)return cachedStores;
    let stores=[];
    if(path==='/admin'){const d=await adminSnapshot(id);stores=d.stores||[]}
    else{const{data,error}=await sb.from('stores').select('id,organization_id,name,store_code,active').eq('active',true).order('store_code');if(error)throw error;stores=data||[]}
    lastOrg=id;cachedStores=stores;cachedAt=now;return stores;
  }
  async function orderFor(id){const{data,error}=await sb.from('organization_store_order').select('store_id,position').eq('organization_id',id).order('position');if(error)throw error;return new Map((data||[]).map(x=>[x.store_id,Number(x.position)]))}
  function activeMode(){
    if(path==='/owner'){if($('#nav [data-tab="stores"].active'))return'locations';if($('#nav [data-tab="overview"].active'))return'overview'}
    else{if($('#nav [data-aw-tab="stores"].active'))return'locations';if($('#nav [data-aw-tab="overview"].active'))return'overview'}
    return''
  }
  function locationRows(stores){
    const rows=$$('#content>.card .list>.row');if(!rows.length)return[];
    if(rows.length===stores.length){rows.forEach((r,i)=>{if(!r.dataset.opStoreId)r.dataset.opStoreId=stores[i].id});return rows}
    const unused=new Set(stores.map(s=>s.id));
    rows.forEach(r=>{if(r.dataset.opStoreId){unused.delete(r.dataset.opStoreId);return}const code=(r.querySelector('.muted')?.textContent||'').split('·')[0].trim(),matches=stores.filter(s=>unused.has(s.id)&&String(s.store_code||'').trim()===code);if(matches.length===1){r.dataset.opStoreId=matches[0].id;unused.delete(matches[0].id)}});return rows.filter(r=>r.dataset.opStoreId)
  }
  function overviewItems(){return path==='/owner'?$$('.opPeriodGrid>.opPeriodTile[data-store]').map(x=>(x.dataset.opStoreId=x.dataset.store,x)):$$('.apGrid>.apTile[data-ap-store]').map(x=>(x.dataset.opStoreId=x.dataset.apStore,x))}
  function addHint(mode){
    let h=null;
    if(mode==='overview'){const grid=path==='/owner'?$('.opPeriodGrid'):$('.apGrid');h=grid?.closest('.card')?.querySelector('.head>div')||null}
    else h=$('#content>.card .head>div');
    if(!h||h.querySelector('.opOrderHint'))return;const d=document.createElement('div');d.className='opOrderHint';d.innerHTML=`<span>⋮⋮ Drag locations to reorder. ${mode==='overview'?'The same order is used on Locations.':'The same order is used on Overview.'}</span><span class="opOrderSaved">Order saved</span>`;h.appendChild(d)
  }
  function addHandle(item){if(item.querySelector(':scope>.opStoreDragHandle'))return;const h=document.createElement('span');h.className='opStoreDragHandle';h.textContent='⋮⋮';h.title='Drag to reorder';h.setAttribute('aria-label','Drag location to reorder');item.insertAdjacentElement('afterbegin',h)}
  function sortItems(items,stores,order){
    const fallback=new Map(stores.map((s,i)=>[s.id,i]));
    items.sort((a,b)=>{const ai=order.has(a.dataset.opStoreId)?order.get(a.dataset.opStoreId):100000+(fallback.get(a.dataset.opStoreId)??9999),bi=order.has(b.dataset.opStoreId)?order.get(b.dataset.opStoreId):100000+(fallback.get(b.dataset.opStoreId)??9999);return ai-bi});
    const p=items[0]?.parentElement;if(!p)return;
    const current=[...p.children].filter(x=>items.includes(x));
    const already=current.length===items.length&&current.every((x,i)=>x===items[i]);
    if(!already)items.forEach(x=>p.appendChild(x));
  }
  async function persist(parent,id){
    const s=await session();if(!s)return;const items=[...parent.querySelectorAll(':scope>.opSortableStore[data-op-store-id]')],rows=items.map((x,i)=>({organization_id:id,store_id:x.dataset.opStoreId,position:i,updated_by:s.user.id,updated_at:new Date().toISOString()}));if(!rows.length)return;
    const{error}=await sb.from('organization_store_order').upsert(rows,{onConflict:'organization_id,store_id'});if(error){window.onePointMessage?.(error.message||'Unable to save location order.','Location Order','error');return}
    $$('.opOrderSaved').forEach(x=>{x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1400)})
  }
  function bind(items,id){
    items.forEach(item=>{item.classList.add('opSortableStore');item.draggable=true;addHandle(item);
      if(item.dataset.opDragBound==='1')return;item.dataset.opDragBound='1';
      item.addEventListener('dragstart',e=>{dragId=item.dataset.opStoreId;item.classList.add('opDragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragId)});
      item.addEventListener('dragend',()=>{item.classList.remove('opDragging');$$('.opSortDropBefore').forEach(x=>x.classList.remove('opSortDropBefore'));dragId=''})
    });
    const parent=items[0]?.parentElement;if(!parent||parent.dataset.opDropBound==='1')return;parent.dataset.opDropBound='1';
    parent.addEventListener('dragover',e=>{if(!dragId)return;e.preventDefault();const target=e.target.closest('.opSortableStore');if(!target||target.parentElement!==parent||target.dataset.opStoreId===dragId)return;const dragging=parent.querySelector(`.opSortableStore[data-op-store-id="${CSS.escape(dragId)}"]`);if(!dragging)return;const r=target.getBoundingClientRect(),before=e.clientY<r.top+r.height/2||(Math.abs(e.clientY-(r.top+r.height/2))<r.height*.25&&e.clientX<r.left+r.width/2);$$('.opSortDropBefore').forEach(x=>x!==target&&x.classList.remove('opSortDropBefore'));target.classList.toggle('opSortDropBefore',before);if(before)parent.insertBefore(dragging,target);else parent.insertBefore(dragging,target.nextSibling)});
    parent.addEventListener('drop',e=>{if(!dragId)return;e.preventDefault();$$('.opSortDropBefore').forEach(x=>x.classList.remove('opSortDropBefore'));clearTimeout(persistTimer);persistTimer=setTimeout(()=>persist(parent,id),80)})
  }
  async function apply(){if(applying)return;const mode=activeMode();if(!mode)return;const id=await orgId();if(!id)return;applying=true;try{const[stores,order]=await Promise.all([storesFor(id),orderFor(id)]);const items=mode==='overview'?overviewItems():locationRows(stores);if(!items.length)return;sortItems(items,stores,order);bind(items,id);addHint(mode)}catch(e){console.warn('Store ordering:',e?.message||e)}finally{applying=false}}
  const observer=new MutationObserver(()=>{clearTimeout(applyTimer);applyTimer=setTimeout(apply,100)});observer.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target.closest('#nav button,.awOpen')){clearTimeout(applyTimer);applyTimer=setTimeout(apply,300)}},true);
  setTimeout(apply,1000);
  window.onePointStoreOrdering={refresh:apply};
})();