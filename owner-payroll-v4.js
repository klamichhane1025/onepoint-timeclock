(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
const show=(m,t='Payroll',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
let renderToken=0;

async function ownerContext(){
 const {data:{session}}=await sb.auth.getSession();
 if(!session)throw new Error('Your Owner session has expired. Sign in again.');
 const {data:membership,error}=await sb.from('organization_users').select('id,organization_id,role').eq('user_id',session.user.id).eq('role','owner').eq('active',true).maybeSingle();
 if(error)throw error;if(!membership)throw new Error('Owner access is required.');
 return {session,orgId:membership.organization_id};
}
function setNav(){
 $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab==='timesheets'));
 const t=$('#title');if(t)t.textContent='Time & Payroll';
}
function hoursFor(x){return x.payable_clock_in&&x.payable_clock_out?Math.max(0,(new Date(x.payable_clock_out)-new Date(x.payable_clock_in))/36e5):0}
function wageFor(x){const h=hoursFor(x);return x.pay_type_snapshot==='hourly'&&x.pay_rate_snapshot!=null?h*Number(x.pay_rate_snapshot):null}
function checkedValues(cls){return new Set($$(cls+':checked').map(x=>x.value))}
function csvCell(v){return '"'+String(v??'').replaceAll('"','""')+'"'}
function downloadCsv(rows){
 const cols=['Employee','Employee ID','Location','Job Code','Clock In','Clock Out','Payable Hours','Pay Type','Pay Rate','Calculated Wages','Payroll Logic','Status'];
 const body=rows.map(x=>[x.employees?.name||'',x.employees?.employee_number||'',x.stores?.name||x.stores?.store_code||'',x.job_codes?.name||'',x.actual_clock_in||'',x.actual_clock_out||'',hoursFor(x).toFixed(2),x.pay_type_snapshot||'',x.pay_rate_snapshot??'',wageFor(x)==null?'':wageFor(x).toFixed(2),x.payroll_logic_snapshot||'',x.is_void?'Voided':'Active']);
 const csv=[cols,...body].map(r=>r.map(csvCell).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),u=window.URL.createObjectURL(blob),a=document.createElement('a');
 a.href=u;a.download=`onepoint-payroll-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>window.URL.revokeObjectURL(u),1000);
}
async function renderPayroll(){
 const token=++renderToken;
 try{
  const c=await ownerContext();setNav();
  const [tr,er,sr,jr]=await Promise.all([
   sb.from('time_entries').select('*,employees(employee_number,name),stores(store_code,name),job_codes(code,name)').eq('organization_id',c.orgId).order('actual_clock_in',{ascending:false}).limit(5000),
   sb.from('employees').select('id,name,employee_number,status').eq('organization_id',c.orgId).order('name'),
   sb.from('stores').select('id,name,store_code,active').eq('organization_id',c.orgId).order('store_code'),
   sb.from('job_codes').select('id,name,code').eq('organization_id',c.orgId).order('name')
  ]);
  if(token!==renderToken)return;const err=tr.error||er.error||sr.error||jr.error;if(err)throw err;
  const entries=tr.data||[],emps=er.data||[],stores=sr.data||[],jobs=jr.data||[];
  let showVoided=false,sortKey='clock',sortDir=-1;
  const root=$('#content');if(!root)return;
  root.innerHTML=`<div class="card"><div class="head"><div><h2>Time & Payroll</h2><div class="muted">Choose the pay period, employees and one or more stores. Payroll uses the pay rate captured on each shift.</div></div><div class="actions compact"><button class="btn secondary" id="v4History">Voided History</button><button class="btn primary" id="v4Export">Export CSV</button></div></div>
  <div class="filters" style="align-items:start">
   <div class="field"><label>Start</label><input id="v4Start" type="datetime-local"></div>
   <div class="field"><label>End</label><input id="v4End" type="datetime-local"></div>
   <div class="field"><label>Job Code</label><select id="v4Job"><option value="">All Job Codes</option>${jobs.map(j=>`<option value="${j.id}">${esc(j.name||j.code)}</option>`).join('')}</select></div>
   <button class="btn primary" id="v4Apply">Apply</button><button class="btn secondary" id="v4Reset">Reset</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;margin-top:18px">
   <div class="card" style="padding:16px"><div class="head" style="margin-bottom:10px"><b>Employees</b><label style="font-weight:700"><input type="checkbox" id="v4AllEmployees" checked> Select All Employees</label></div><div class="list" style="max-height:230px;overflow:auto">${emps.map(e=>`<label class="row" style="display:flex;gap:10px;align-items:center;justify-content:flex-start"><input type="checkbox" class="v4Employee" value="${e.id}" checked><span><b>${esc(e.name)}</b><span class="muted"> · #${esc(e.employee_number||'')}</span></span></label>`).join('')||'<span class="muted">No employees.</span>'}</div></div>
   <div class="card" style="padding:16px"><div class="head" style="margin-bottom:10px"><b>Stores</b><label style="font-weight:700"><input type="checkbox" id="v4AllStores" checked> Select All Stores</label></div><div class="list" style="max-height:230px;overflow:auto">${stores.map(s=>`<label class="row" style="display:flex;gap:10px;align-items:center;justify-content:flex-start"><input type="checkbox" class="v4Store" value="${s.id}" checked><span><b>${esc(s.name||s.store_code)}</b>${s.active?'':' <span class="muted">(Inactive)</span>'}</span></label>`).join('')||'<span class="muted">No stores.</span>'}</div></div>
  </div><div id="v4Rows" class="section"></div></div>`;

  const filtered=()=>{const employees=checkedValues('.v4Employee'),selectedStores=checkedValues('.v4Store'),job=$('#v4Job').value,st=$('#v4Start').value,en=$('#v4End').value;let rows=entries.filter(x=>Boolean(x.is_void)===showVoided&&employees.has(x.employee_id)&&selectedStores.has(x.store_id)&&(!job||x.job_code_id===job)&&(!st||new Date(x.actual_clock_in)>=new Date(st))&&(!en||new Date(x.actual_clock_in)<=new Date(en)));const val=(x,k)=>k==='employee'?(x.employees?.name||'').toLowerCase():k==='store'?(x.stores?.name||x.stores?.store_code||'').toLowerCase():new Date(x.actual_clock_in).getTime();rows.sort((a,b)=>val(a,sortKey)>val(b,sortKey)?sortDir:val(a,sortKey)<val(b,sortKey)?-sortDir:0);return rows};
  function draw(){
   const rows=filtered(),totalHours=rows.reduce((s,x)=>s+hoursFor(x),0),hourlyWages=rows.reduce((s,x)=>s+(wageFor(x)||0),0),monthlyRows=rows.filter(x=>x.pay_type_snapshot==='monthly').length;
   const selectedEmpIds=checkedValues('.v4Employee');const selectedNames=emps.filter(e=>selectedEmpIds.has(e.id));
   const perEmployee=selectedNames.map(e=>{const erows=rows.filter(x=>x.employee_id===e.id),h=erows.reduce((s,x)=>s+hoursFor(x),0),w=erows.reduce((s,x)=>s+(wageFor(x)||0),0);return `<div class="card" style="padding:12px"><b>${esc(e.name)}</b><span class="muted"> #${esc(e.employee_number||'')}</span><div style="font-size:18px;font-weight:700;margin-top:5px">${h.toFixed(2)} hrs · ${money(w)}</div></div>`}).join('');
   $('#v4Rows').innerHTML=`<div class="table"><table><thead><tr><th><button class="linkBtn v4Sort" data-sort="employee">Employee</button></th><th><button class="linkBtn v4Sort" data-sort="store">Location</button></th><th>Job</th><th><button class="linkBtn v4Sort" data-sort="clock">Clock In</button></th><th>Clock Out</th><th>Hours</th><th>Pay</th><th>Wages</th><th>Action</th></tr></thead><tbody>${rows.map(x=>{const h=hoursFor(x),w=wageFor(x);return `<tr><td>${esc(x.employees?.name||'—')}<div class="muted">#${esc(x.employees?.employee_number||'')}</div></td><td>${esc(x.stores?.name||x.stores?.store_code||'—')}</td><td>${esc(x.job_codes?.name||'—')}</td><td>${x.actual_clock_in?new Date(x.actual_clock_in).toLocaleString():'—'}</td><td>${x.actual_clock_out?new Date(x.actual_clock_out).toLocaleString():'—'}</td><td>${h.toFixed(2)}</td><td>${x.pay_rate_snapshot==null?'—':x.pay_type_snapshot==='hourly'?money(x.pay_rate_snapshot)+'/hr':money(x.pay_rate_snapshot)+'/mo'}</td><td>${w==null?(x.pay_type_snapshot==='monthly'?'Monthly salary':'—'):money(w)}</td><td>${showVoided?`<button class="btn secondary v4Restore" data-id="${x.id}">Restore</button>`:`<button class="btn danger v4Void" data-id="${x.id}">Void</button>`}</td></tr>`}).join('')||'<tr><td colspan="9">No matching payroll entries.</td></tr>'}</tbody></table></div>
   <div class="card" style="margin-top:18px;padding:18px"><div class="head"><div><b>Payroll Totals</b><div class="muted">${selectedNames.length} employee${selectedNames.length===1?'':'s'} selected · ${rows.length} shift${rows.length===1?'':'s'}</div></div><div style="display:flex;gap:28px;flex-wrap:wrap"><div><span class="muted">Total Hours</span><div style="font-size:26px;font-weight:800">${totalHours.toFixed(2)}</div></div><div><span class="muted">Total Payroll Cost</span><div style="font-size:26px;font-weight:800">${money(hourlyWages)}</div></div></div></div>${monthlyRows?`<div class="notice" style="margin-top:12px">${monthlyRows} monthly-salary shift${monthlyRows===1?' is':'s are'} shown but not prorated into Total Payroll Cost.</div>`:''}${perEmployee?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:14px">${perEmployee}</div>`:''}</div>`;
   $$('.v4Sort').forEach(b=>b.onclick=()=>{const k=b.dataset.sort;if(sortKey===k)sortDir*=-1;else{sortKey=k;sortDir=1}draw()});
   $$('.v4Void').forEach(b=>b.onclick=()=>voidEntry(b.dataset.id));$$('.v4Restore').forEach(b=>b.onclick=()=>restoreEntry(b.dataset.id));
  }
  async function voidEntry(id){const reason=prompt('Reason for voiding this clock record:')?.trim();if(!reason)return;try{const now=new Date().toISOString(),{error}=await sb.from('time_entries').update({is_void:true,voided_at:now,voided_by:c.session.user.id,void_reason:reason}).eq('id',id).eq('organization_id',c.orgId);if(error)throw error;const row=entries.find(x=>x.id===id);if(row){row.is_void=true;row.voided_at=now;row.void_reason=reason}show('Clock record moved to Voided History.','Timesheet','success');draw()}catch(e){show(e.message||String(e),'Timesheet')}}
  async function restoreEntry(id){if(!confirm('Restore this clock record to the active Timesheet?'))return;try{const {error}=await sb.from('time_entries').update({is_void:false,voided_at:null,voided_by:null,void_reason:null}).eq('id',id).eq('organization_id',c.orgId);if(error)throw error;const row=entries.find(x=>x.id===id);if(row){row.is_void=false;row.voided_at=null;row.void_reason=null}show('Clock record restored.','Timesheet','success');draw()}catch(e){show(e.message||String(e),'Timesheet')}}
  const syncMaster=(master,items)=>{master.checked=items.length>0&&items.every(x=>x.checked);master.indeterminate=!master.checked&&items.some(x=>x.checked)};
  $('#v4AllEmployees').onchange=e=>{$$('.v4Employee').forEach(x=>x.checked=e.target.checked);draw()};$('#v4AllStores').onchange=e=>{$$('.v4Store').forEach(x=>x.checked=e.target.checked);draw()};
  $$('.v4Employee').forEach(x=>x.onchange=()=>{syncMaster($('#v4AllEmployees'),$$('.v4Employee'));draw()});$$('.v4Store').forEach(x=>x.onchange=()=>{syncMaster($('#v4AllStores'),$$('.v4Store'));draw()});
  $('#v4Apply').onclick=draw;$('#v4Reset').onclick=()=>{$('#v4Start').value='';$('#v4End').value='';$('#v4Job').value='';$$('.v4Employee,.v4Store').forEach(x=>x.checked=true);$('#v4AllEmployees').checked=true;$('#v4AllEmployees').indeterminate=false;$('#v4AllStores').checked=true;$('#v4AllStores').indeterminate=false;draw()};
  $('#v4History').onclick=()=>{showVoided=!showVoided;$('#v4History').textContent=showVoided?'Active Payroll':'Voided History';draw()};$('#v4Export').onclick=()=>{const rows=filtered();if(!rows.length)return show('There are no payroll rows to export for the current selection.','Export CSV');downloadCsv(rows)};
  draw();
 }catch(e){show(e.message||String(e),'Time & Payroll')}
}

document.addEventListener('click',e=>{const b=e.target.closest('#nav [data-tab="timesheets"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();renderPayroll()},true);
setTimeout(()=>{const active=$('#nav [data-tab="timesheets"].active,#nav [data-tab="timesheets"][aria-current="page"]');if(active)renderPayroll()},900);
window.onePointOwnerPayroll={render:renderPayroll};
})();