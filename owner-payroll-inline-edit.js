(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(SUPABASE_URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}}),$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const show=(m,t='Correct Timesheet',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
const pad=n=>String(n).padStart(2,'0');
const toLocalInput=v=>{if(!v)return'';const d=new Date(v);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
const fromLocalInput=v=>v?new Date(v):null;
let activeCell=null,busy=false;

function decorate(){
 const root=$('#v4Rows');if(!root)return;
 for(const row of root.querySelectorAll('.v4EditableRow')){
   row.style.cursor='default';row.title='';
   const cells=row.children;
   const inCell=cells[4],outCell=cells[5];
   for(const [cell,kind] of [[inCell,'in'],[outCell,'out']]){
     if(!cell)continue;
     cell.classList.add('opPunchEditable');cell.dataset.punchKind=kind;
     cell.title=`Click to edit Clock ${kind==='in'?'In':'Out'}`;
     cell.setAttribute('role','button');cell.setAttribute('tabindex','0');
   }
 }
 const note=[...document.querySelectorAll('#content .head .muted')].find(x=>/Double-click an active row|Click any active timesheet/i.test(x.textContent||''));
 if(note)note.textContent='Hover over Clock In or Clock Out, then click the time to edit it directly.';
 if(!$('#opPunchEditCss')){const s=document.createElement('style');s.id='opPunchEditCss';s.textContent=`.opPunchEditable{cursor:text!important;position:relative;border-radius:8px;transition:background .14s,box-shadow .14s}.opPunchEditable:hover{background:var(--op-accent-soft,#DBEAFE);box-shadow:inset 0 0 0 1px var(--op-accent,#1D4ED8)}.opPunchEditable:hover:after{content:'Edit';position:absolute;right:6px;top:4px;font-size:10px;font-weight:700;color:var(--op-accent-text,#1E3A8A)}.opPunchEditor{min-width:250px}.opPunchEditor input[type="datetime-local"]{width:100%;min-width:210px}.opPunchEditor .opPunchReason{margin-top:6px;width:100%;min-width:210px}.opPunchEditor .opPunchActions{display:flex;gap:6px;margin-top:6px}.opPunchEditor .btn{padding:6px 10px;font-size:12px}`;document.head.appendChild(s)}
}

async function openCell(cell){
 if(busy||!cell||cell.querySelector('.opPunchEditor'))return;
 const row=cell.closest('tr.v4EditableRow'),id=row?.dataset.entryId,kind=cell.dataset.punchKind;if(!id||!kind)return;
 if(activeCell&&activeCell!==cell){window.onePointOwnerPayroll?.render?.();setTimeout(()=>openCell(findCell(id,kind)),80);return}
 busy=true;
 try{
   const{data:e,error}=await sb.from('time_entries').select('id,actual_clock_in,actual_clock_out,is_void').eq('id',id).maybeSingle();
   if(error)throw error;if(!e)throw new Error('Clock record not found.');if(e.is_void)throw new Error('Restore this record before editing it.');
   activeCell=cell;
   const current=kind==='in'?e.actual_clock_in:e.actual_clock_out;
   cell.dataset.originalHtml=cell.innerHTML;
   cell.innerHTML=`<div class="opPunchEditor"><input class="opPunchValue" type="datetime-local" value="${toLocalInput(current)}"><input class="opPunchReason" type="text" placeholder="Correction reason *"><div class="opPunchActions"><button class="btn primary opPunchSave">Save</button><button class="btn secondary opPunchCancel">Cancel</button></div></div>`;
   cell.querySelector('.opPunchValue')?.focus();
 }catch(err){show(err?.message||String(err))}finally{busy=false}
}
function findCell(id,kind){const row=$(`#v4Rows tr[data-entry-id="${CSS.escape(id)}"]`);return row?.children[kind==='in'?4:5]||null}
function cancelCell(cell){if(!cell)return;activeCell=null;window.onePointOwnerPayroll?.render?.()}
async function saveCell(cell){
 const row=cell?.closest('tr.v4EditableRow'),id=row?.dataset.entryId,kind=cell?.dataset.punchKind;if(!id||!kind)return;
 const value=cell.querySelector('.opPunchValue')?.value||'',reason=cell.querySelector('.opPunchReason')?.value.trim()||'';
 if(kind==='in'&&!value)return show('Clock In cannot be blank.');
 if(!reason)return show('Enter a correction reason before saving.');
 const changed=fromLocalInput(value);if(value&&(!changed||Number.isNaN(changed.getTime())))return show('Enter a valid date and time.');
 const btn=cell.querySelector('.opPunchSave'),old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{
   const[{data:e,error},{data:{session}}]=await Promise.all([sb.from('time_entries').select('actual_clock_in,actual_clock_out,is_void').eq('id',id).maybeSingle(),sb.auth.getSession()]);
   if(error)throw error;if(!e)throw new Error('Clock record not found.');if(e.is_void)throw new Error('Restore this record before editing it.');if(!session)throw new Error('Your Owner session expired. Sign in again.');
   const inVal=kind==='in'?changed:new Date(e.actual_clock_in),outVal=kind==='out'?(value?changed:null):(e.actual_clock_out?new Date(e.actual_clock_out):null);
   if(!inVal||Number.isNaN(inVal.getTime()))throw new Error('Clock In is invalid.');
   if(outVal&&outVal<=inVal)throw new Error('Clock Out must be after Clock In.');
   const r=await fetch(`${SUPABASE_URL}/functions/v1/manage-time-entry`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({action:'edit_entry',entry_id:id,actual_clock_in:inVal.toISOString(),actual_clock_out:outVal?outVal.toISOString():null,reason})}),d=await r.json().catch(()=>({}));
   if(!r.ok||d.error)throw new Error(d.error||'Unable to save the correction.');
   activeCell=null;show(d.warning?`Timesheet corrected. ${d.warning}`:'Time updated successfully.','Timesheet','success');window.onePointOwnerPayroll?.render?.();
 }catch(err){show(err?.message||String(err));if(btn){btn.disabled=false;btn.textContent=old||'Save'}}
}

document.addEventListener('click',e=>{
 const save=e.target.closest('.opPunchSave'),cancel=e.target.closest('.opPunchCancel');
 if(save){e.preventDefault();e.stopImmediatePropagation();saveCell(save.closest('.opPunchEditable'));return}
 if(cancel){e.preventDefault();e.stopImmediatePropagation();cancelCell(cancel.closest('.opPunchEditable'));return}
 const cell=e.target.closest('.opPunchEditable');
 if(!cell||e.target.closest('input,button,a,select,textarea,label,summary'))return;
 e.preventDefault();e.stopImmediatePropagation();openCell(cell)
},true);
document.addEventListener('keydown',e=>{
 const cell=e.target.closest?.('.opPunchEditable');if(!cell)return;
 if((e.key==='Enter'||e.key===' ')&&!cell.querySelector('.opPunchEditor')){e.preventDefault();openCell(cell)}
 if(e.key==='Escape'&&cell.querySelector('.opPunchEditor')){e.preventDefault();cancelCell(cell)}
},true);
window.addEventListener('click',e=>{if(e.target.closest('#nav [data-tab="timesheets"],#v4Apply,#v4Reset,#v4History,.sortHeader,.v4Employee,.v4Store')){setTimeout(decorate,120);setTimeout(decorate,420)}},false);
setTimeout(decorate,1000);setTimeout(decorate,1800);
})();
