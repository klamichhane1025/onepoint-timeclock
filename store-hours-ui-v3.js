(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(path!=='/owner'&&path!=='/manager')return;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const show=(m,t='OnePoint',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

async function context(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session)throw new Error('Your session has expired. Sign in again.');
 const wanted=path==='/owner'?'owner':'manager';
 const {data:m,error}=await sb.from('organization_users').select('id,organization_id,role,active').eq('user_id',session.user.id).eq('role',wanted).eq('active',true).maybeSingle();
 if(error)throw error;
 if(!m)throw new Error(wanted==='owner'?'Owner access required.':'Manager access required.');
 return{session,membership:m,orgId:m.organization_id,role:m.role};
}
function open(html){const d=$('#drawer'),b=$('#back');if(!d||!b)return;d.innerHTML=html;d.classList.add('modal');d.classList.remove('hidden');b.classList.remove('hidden')}
function close(){const d=$('#drawer'),b=$('#back');d?.classList.add('hidden');d?.classList.remove('modal');b?.classList.add('hidden')}
async function accessibleStores(c){
 if(c.role==='owner'){
  const {data,error}=await sb.from('stores').select('id,name,store_code,payroll_logic,active').eq('organization_id',c.orgId).eq('active',true).order('store_code');
  if(error)throw error;return data||[];
 }
 const {data:access,error:aErr}=await sb.from('organization_user_stores').select('store_id').eq('organization_id',c.orgId).eq('organization_user_id',c.membership.id);
 if(aErr)throw aErr;const ids=(access||[]).map(x=>x.store_id);if(!ids.length)return[];
 const {data,error}=await sb.from('stores').select('id,name,store_code,payroll_logic,active').eq('organization_id',c.orgId).eq('active',true).in('id',ids).order('store_code');
 if(error)throw error;return data||[];
}
function syncClosed(){
 $$('.hClosed').forEach(ch=>{const i=ch.dataset.day;$$(`.hOpen[data-day="${i}"],.hClose[data-day="${i}"]`).forEach(x=>x.disabled=ch.checked)});
}
function copyDay(src,targets){
 const closed=$(`.hClosed[data-day="${src}"]`)?.checked??false,openVal=$(`.hOpen[data-day="${src}"]`)?.value||'',closeVal=$(`.hClose[data-day="${src}"]`)?.value||'';
 targets.forEach(i=>{const c=$(`.hClosed[data-day="${i}"]`),o=$(`.hOpen[data-day="${i}"]`),cl=$(`.hClose[data-day="${i}"]`);if(c)c.checked=closed;if(o)o.value=openVal;if(cl)cl.value=closeVal});
 syncClosed();
}
async function hours(storeId){
 try{
  const c=await context();
  const stores=await accessibleStores(c),store=stores.find(s=>s.id===storeId);
  if(!store)throw new Error('This location is not assigned to your account.');
  const {data:rows,error}=await sb.from('store_hours').select('*').eq('store_id',storeId).eq('organization_id',c.orgId);
  if(error)throw error;
  const by=new Map((rows||[]).map(r=>[Number(r.weekday),r]));
  open(`<h2>Operating Hours — ${esc(store.name||store.store_code)}</h2><p class="muted">These hours are used for future DFW Logic punches. Historical punches are not rewritten automatically.</p><div class="actions compact section"><button class="btn secondary" id="copyWeekdays">Copy Monday → Weekdays</button><button class="btn secondary" id="copyWeekend">Copy Saturday → Weekend</button><button class="btn secondary" id="copyAll">Copy Monday → All Days</button></div><div class="list">${days.map((d,i)=>{const r=by.get(i);return `<div class="row"><div style="min-width:105px"><b>${d}</b></div><label><input type="checkbox" class="hClosed" data-day="${i}" ${r?.closed?'checked':''}> Closed</label><input type="time" class="hOpen" data-day="${i}" value="${(r?.open_time||'09:00').slice(0,5)}" style="max-width:140px"><span>to</span><input type="time" class="hClose" data-day="${i}" value="${(r?.close_time||'22:00').slice(0,5)}" style="max-width:140px"></div>`}).join('')}</div><div class="actions section"><button class="btn primary" id="hSave">Save Hours</button><button class="btn secondary" id="hCancel">Cancel</button></div>`);
  $('#hCancel').onclick=close;$$('.hClosed').forEach(x=>x.onchange=syncClosed);syncClosed();
  $('#copyWeekdays').onclick=()=>copyDay(1,[1,2,3,4,5]);
  $('#copyWeekend').onclick=()=>copyDay(6,[6,0]);
  $('#copyAll').onclick=()=>copyDay(1,[0,1,2,3,4,5,6]);
  $('#hSave').onclick=async()=>{
   const btn=$('#hSave'),old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';
   try{
    const payload=days.map((_,i)=>{const closed=$(`.hClosed[data-day="${i}"]`).checked,open_time=$(`.hOpen[data-day="${i}"]`).value,close_time=$(`.hClose[data-day="${i}"]`).value;if(!closed&&(!open_time||!close_time))throw new Error(`Enter opening and closing time for ${days[i]}, or mark it Closed.`);return{organization_id:c.orgId,store_id:storeId,weekday:i,open_time:closed?null:open_time,close_time:closed?null:close_time,closed}});
    const {error:uErr}=await sb.from('store_hours').upsert(payload,{onConflict:'store_id,weekday'});if(uErr)throw uErr;
    await sb.from('audit_logs').insert({organization_id:c.orgId,actor_user_id:c.session.user.id,action:'store_hours_updated',entity_type:'store',entity_id:storeId,details:{days:7,role:c.role}});
    close();show('Operating hours saved.','Location Hours','success');
    if(c.role==='manager')await renderManagerLocations();
   }catch(e){show(e.message||String(e),'Location Hours')}finally{btn.disabled=false;btn.textContent=old}
  };
 }catch(e){show(e.message||String(e),'Location Hours')}
}
function injectOwnerHours(){
 if(path!=='/owner')return;
 for(const edit of $$('.v2EditStore')){
  const id=edit.dataset.id;if(edit.parentElement?.querySelector(`.v3Hours[data-id="${id}"]`))continue;
  const b=document.createElement('button');b.className='btn secondary v3Hours';b.dataset.id=id;b.textContent='Hours';edit.insertAdjacentElement('afterend',b);b.onclick=()=>hours(id);
 }
}
function ensureManagerNav(){
 if(path!=='/manager')return;
 const nav=$('#nav');if(!nav||nav.querySelector('[data-hours-tab]'))return;
 const b=document.createElement('button');b.dataset.hoursTab='1';b.textContent='Locations & Hours';nav.appendChild(b);
}
async function renderManagerLocations(){
 try{
  const c=await context(),stores=await accessibleStores(c);
  $$('#nav button').forEach(b=>b.classList.remove('active'));$('#nav [data-hours-tab]')?.classList.add('active');
  const title=$('#title');if(title)title.textContent='Locations & Hours';
  $('#content').innerHTML=`<div class="card"><div class="head"><div><h2>Assigned Locations</h2><div class="muted">You can change operating hours only for locations assigned to your Manager account.</div></div></div><div class="list">${stores.map(s=>`<div class="row"><div><b>${esc(s.name||s.store_code)}</b><div class="muted">${esc(s.store_code)} · ${s.payroll_logic==='dfw'?'DFW Logic':'Basic Logic'}</div></div><button class="btn secondary mgrHours" data-id="${s.id}">Hours</button></div>`).join('')||'<div class="muted">No locations are assigned to this Manager account.</div>'}</div></div>`;
  $$('.mgrHours').forEach(b=>b.onclick=()=>hours(b.dataset.id));
 }catch(e){show(e.message||String(e),'Locations & Hours')}
}
document.addEventListener('click',e=>{
 const mh=e.target.closest('#nav [data-hours-tab]');if(mh){e.preventDefault();renderManagerLocations();return}
 if(path==='/owner'&&(e.target.closest('#nav [data-tab="stores"]')||e.target.closest('.v2EditStore,.v2DeactivateStore,.v2ReactivateStore,#v2StoreSave')))setTimeout(injectOwnerHours,180);
 if(path==='/manager'&&e.target.closest('#nav [data-tab]'))setTimeout(ensureManagerNav,80);
},false);
setTimeout(()=>{injectOwnerHours();ensureManagerNav()},700);
})();