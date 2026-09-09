(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(path!=='/owner')return;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const show=(m,t='OnePoint',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const days=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
let renderSeq=0;

function friendly(err){
 const raw=String(err?.message||err||'').trim();
 if(!raw)return 'We could not complete that action. Please review the information and try again.';
 if(/duplicate key|unique constraint|already exists/i.test(raw)){
  if(/store_code/i.test(raw))return 'That Location Code is already in use. Please choose a different code.';
  if(/name/i.test(raw))return 'That Location Name is already in use. Please choose a different name.';
  return 'One of those values is already in use. Please change it and try again.';
 }
 if(/violates|constraint|postgres|PGRST|SQLSTATE/i.test(raw))return 'Please review the location information and correct the highlighted values before saving.';
 return raw;
}
async function context(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session)throw new Error('Your session has expired. Sign in again.');
 const {data:m,error}=await sb.from('organization_users').select('id,organization_id,role,active').eq('user_id',session.user.id).eq('role','owner').eq('active',true).maybeSingle();
 if(error)throw error;if(!m)throw new Error('Owner access required.');
 return{session,orgId:m.organization_id,membership:m};
}
function open(html){const d=$('#drawer'),b=$('#back');if(!d||!b)return;d.innerHTML=html;d.classList.add('modal');d.classList.remove('hidden');b.classList.remove('hidden')}
function close(){const d=$('#drawer'),b=$('#back');d?.classList.add('hidden');d?.classList.remove('modal');b?.classList.add('hidden')}
function setNav(){ $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='stores')); const t=$('#title');if(t)t.textContent='Locations'; }
function syncClosed(){
 $$('.opLocClosed').forEach(ch=>{const i=ch.dataset.day;$$(`.opLocOpen[data-day="${i}"],.opLocClose[data-day="${i}"]`).forEach(x=>x.disabled=ch.checked)});
}
function copyDay(src,targets){
 const closed=$(`.opLocClosed[data-day="${src}"]`)?.checked??false,openVal=$(`.opLocOpen[data-day="${src}"]`)?.value||'',closeVal=$(`.opLocClose[data-day="${src}"]`)?.value||'';
 targets.forEach(i=>{const c=$(`.opLocClosed[data-day="${i}"]`),o=$(`.opLocOpen[data-day="${i}"]`),cl=$(`.opLocClose[data-day="${i}"]`);if(c)c.checked=closed;if(o)o.value=openVal;if(cl)cl.value=closeVal});syncClosed();
}
function hoursRows(by){
 return days.map((d,i)=>{const r=by.get(i);return `<div class="row"><div style="min-width:105px"><b>${d}</b></div><label><input type="checkbox" class="opLocClosed" data-day="${i}" ${r?.closed?'checked':''}> Closed</label><input type="time" class="opLocOpen" data-day="${i}" value="${esc((r?.open_time||'09:00').slice(0,5))}" style="max-width:140px"><span>to</span><input type="time" class="opLocClose" data-day="${i}" value="${esc((r?.close_time||'22:00').slice(0,5))}" style="max-width:140px"></div>`}).join('');
}
function readHours(){
 const payload=days.map((_,i)=>{const closed=$(`.opLocClosed[data-day="${i}"]`).checked,open_time=$(`.opLocOpen[data-day="${i}"]`).value,close_time=$(`.opLocClose[data-day="${i}"]`).value;if(!closed&&(!open_time||!close_time))throw new Error(`Enter opening and closing time for ${days[i]}, or mark it Closed.`);return{weekday:i,open_time:closed?null:open_time,close_time:closed?null:close_time,closed}});
 if(!payload.some(x=>!x.closed))throw new Error('Mark at least one day as open and enter its operating hours.');
 return payload;
}
async function duplicateCheck(c,stores,store,code,name){
 const codeDup=stores.some(x=>x.id!==store?.id&&String(x.store_code||'').trim().toUpperCase()===code);
 if(codeDup)throw new Error('That Location Code is already in use. Please choose a different code.');
 if(name){const nameDup=stores.some(x=>x.id!==store?.id&&String(x.name||'').trim().toLowerCase()===name.toLowerCase());if(nameDup)throw new Error('That Location Name is already in use. Please choose a different name.');}
}
async function locationModal(c,stores,store=null,hoursOnly=false){
 let by=new Map();
 if(store){const {data,error}=await sb.from('store_hours').select('weekday,open_time,close_time,closed').eq('organization_id',c.orgId).eq('store_id',store.id);if(error)throw error;by=new Map((data||[]).map(r=>[Number(r.weekday),r]));}
 open(`<h2>${hoursOnly?'Operating Hours':store?'Edit Location':'Add Location'}</h2>${hoursOnly?`<p class="muted">${esc(store?.name||store?.store_code||'Location')} · Changes apply to future DFW Logic punches. Historical punches are preserved.</p>`:`<div class="field"><label>Location Code *</label><input id="opLocCode" value="${esc(store?.store_code||'')}" placeholder="DFW7 or STORE01"></div><div class="field"><label>Location Name (optional)</label><input id="opLocName" value="${esc(store?.name||'')}"></div><div class="field"><label>Address (optional)</label><input id="opLocAddress" value="${esc(store?.address||'')}"></div><div class="field"><label>Payroll Logic</label><div class="radioGroup"><label><input type="radio" name="opLocLogic" value="dfw" ${!store||store.payroll_logic==='dfw'?'checked':''}><span><b>DFW Logic</b><small>Payable time follows configured store opening and closing hours.</small></span></label><label><input type="radio" name="opLocLogic" value="basic" ${store?.payroll_logic==='basic'?'checked':''}><span><b>Basic Logic</b><small>Payable time follows actual punch time.</small></span></label></div></div>`}<div class="section"><div class="head"><div><h2 style="font-size:16px">Opening & Closing Hours</h2><div class="muted">Enter all seven days. Overnight hours such as 6:00 PM–2:00 AM are supported.</div></div></div><div class="actions compact"><button type="button" class="btn secondary" id="opCopyWeekdays">Copy Monday → Weekdays</button><button type="button" class="btn secondary" id="opCopyWeekend">Copy Saturday → Weekend</button><button type="button" class="btn secondary" id="opCopyAll">Copy Monday → All Days</button></div><div class="list section">${hoursRows(by)}</div></div><div class="actions section"><button class="btn primary" id="opLocSave">${hoursOnly?'Save Hours':store?'Save Changes':'Add Location'}</button><button class="btn secondary" id="opLocCancel">Cancel</button></div>`);
 $('#opLocCancel').onclick=close;$$('.opLocClosed').forEach(x=>x.onchange=syncClosed);syncClosed();
 $('#opCopyWeekdays').onclick=()=>copyDay(1,[1,2,3,4,5]);$('#opCopyWeekend').onclick=()=>copyDay(6,[6,0]);$('#opCopyAll').onclick=()=>copyDay(1,[0,1,2,3,4,5,6]);
 $('#opLocSave').onclick=async()=>{
  const btn=$('#opLocSave'),old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';
  try{
   const hours=readHours();
   if(hoursOnly){const {error}=await sb.from('store_hours').upsert(hours.map(h=>({...h,organization_id:c.orgId,store_id:store.id})),{onConflict:'store_id,weekday'});if(error)throw error;await sb.from('audit_logs').insert({organization_id:c.orgId,actor_user_id:c.session.user.id,action:'store_hours_updated',entity_type:'store',entity_id:store.id,details:{days:7,role:'owner'}});close();show('Operating hours saved.','Location Hours','success');return;}
   const code=$('#opLocCode').value.trim().toUpperCase(),name=$('#opLocName').value.replace(/\s+/g,' ').trim(),address=$('#opLocAddress').value.trim(),logic=$('input[name="opLocLogic"]:checked')?.value||'dfw';
   if(!/^[A-Z0-9]+$/.test(code))throw new Error('Location Code is required and may contain letters and numbers only.');
   await duplicateCheck(c,stores,store,code,name);
   const {data,error}=await sb.rpc('save_store_with_hours',{p_organization_id:c.orgId,p_store_code:code,p_name:name||null,p_address:address||null,p_payroll_logic:logic,p_timezone:store?.timezone||'America/Chicago',p_hours:hours,p_store_id:store?.id||null});
   if(error)throw error;
   close();show(store?'Location and operating hours updated.':'Location and operating hours added successfully.','Locations','success');await renderLocations();
  }catch(e){show(friendly(e),store?'Edit Location':'Add Location')}finally{btn.disabled=false;btn.textContent=old}
 };
}
async function deleteModal(c,store){
 const [{count:empCount,error:e1},{count:mgrCount,error:e2}]=await Promise.all([
  sb.from('employee_stores').select('employee_id',{count:'exact',head:true}).eq('organization_id',c.orgId).eq('store_id',store.id),
  sb.from('organization_user_stores').select('organization_user_id',{count:'exact',head:true}).eq('organization_id',c.orgId).eq('store_id',store.id)
 ]);if(e1||e2)throw(e1||e2);
 const employees=Number(empCount||0),managers=Number(mgrCount||0);
 open(`<h2>Delete Location?</h2><p>Delete <b>${esc(store.name||store.store_code)}</b> from active use?</p><div class="notice"><b>Employees will NOT be deleted.</b><br>${employees?`${employees} employee assignment${employees===1?'':'s'} will be removed from this location. Those employees remain in the database and can be reassigned to another existing or newly created location.`:'No employees are currently assigned to this location.'}${managers?`<br><br>${managers} manager assignment${managers===1?'':'s'} will also be removed.`:''}<br><br>Historical clock records and payroll history remain preserved.</div><div class="actions"><button class="btn danger" id="opLocDeleteConfirm">Delete Location</button><button class="btn secondary" id="opLocDeleteCancel">Cancel</button></div>`);
 $('#opLocDeleteCancel').onclick=close;
 $('#opLocDeleteConfirm').onclick=async()=>{const btn=$('#opLocDeleteConfirm'),old=btn.textContent;btn.disabled=true;btn.textContent='Deleting…';try{const {data,error}=await sb.rpc('archive_store_location',{p_organization_id:c.orgId,p_store_id:store.id});if(error)throw error;close();show(`Location deleted from active use. ${Number(data?.employee_assignments_removed||employees)} employee assignment${Number(data?.employee_assignments_removed||employees)===1?'':'s'} preserved for reassignment.`,'Locations','success');await renderLocations()}catch(e){show(friendly(e),'Delete Location')}finally{btn.disabled=false;btn.textContent=old}};
}
async function renderLocations(){
 const my=++renderSeq;try{
  const c=await context();const {data:stores,error}=await sb.from('stores').select('*').eq('organization_id',c.orgId).eq('active',true).order('store_code');if(error)throw error;if(my!==renderSeq)return;
  setNav();
  $('#content').innerHTML=`<div class="card"><div class="head"><div><h2>Locations</h2><div class="muted">Add a location together with its operating hours. Employees are preserved if a location is later deleted.</div></div><button class="btn primary" id="opLocAdd">+ Add Location</button></div><div class="list">${(stores||[]).map(s=>`<div class="row"><div><b>${esc(s.name||s.store_code)}</b><div class="muted">${esc(s.store_code)}${s.address?' · '+esc(s.address):''}</div></div><div class="actions compact"><span class="badge">${s.payroll_logic==='dfw'?'DFW Logic':'Basic Logic'}</span><button class="btn secondary opLocHours" data-id="${s.id}">Hours</button><button class="btn secondary opLocEdit" data-id="${s.id}">Edit</button><button class="btn danger opLocDelete" data-id="${s.id}">Delete</button></div></div>`).join('')||'<div class="muted">No active locations yet. Click Add Location to create one and set its operating hours.</div>'}</div></div>`;
  $('#opLocAdd').onclick=()=>locationModal(c,stores||[],null,false).catch(e=>show(friendly(e),'Add Location'));
  $$('.opLocHours').forEach(b=>b.onclick=()=>locationModal(c,stores||[],(stores||[]).find(s=>s.id===b.dataset.id),true).catch(e=>show(friendly(e),'Location Hours')));
  $$('.opLocEdit').forEach(b=>b.onclick=()=>locationModal(c,stores||[],(stores||[]).find(s=>s.id===b.dataset.id),false).catch(e=>show(friendly(e),'Edit Location')));
  $$('.opLocDelete').forEach(b=>b.onclick=()=>deleteModal(c,(stores||[]).find(s=>s.id===b.dataset.id)).catch(e=>show(friendly(e),'Delete Location')));
 }catch(e){if(my===renderSeq)show(friendly(e),'Locations')}
}

document.addEventListener('click',e=>{
 const nav=e.target.closest('#nav [data-tab="stores"]');
 if(!nav)return;
 e.preventDefault();e.stopImmediatePropagation();renderLocations();
},true);
setTimeout(()=>{if($('#nav [data-tab="stores"]')?.classList.contains('active'))renderLocations()},600);
window.onePointOwnerLocations={render:renderLocations};
})();