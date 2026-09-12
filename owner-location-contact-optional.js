(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const show=(m,t='Locations',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
let editStoreId=null;
const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
function decorate(){
 const n2=$('#opContactName2'),e2=$('#opContactEmail2');if(!n2||!e2)return;
 const l1=n2.closest('.field')?.querySelector('label'),l2=e2.closest('.field')?.querySelector('label');
 if(l1)l1.textContent='Point of Contact 2 Name (optional)';
 if(l2)l2.textContent='Point of Contact 2 Email (optional)';
 const section=n2.closest('.section');const helper=section?.querySelector('.head .muted');
 if(helper)helper.textContent='Primary Contact 1 is required. Secondary Contact 2 is optional and can receive a temporary 6-digit POS authorization code when the Owner is unavailable.';
}
function decorateList(){
 $$('#content .muted').forEach(el=>{const t=el.textContent||'';if(t.includes(' · 1/2 contacts'))el.textContent=t.replace(' · 1/2 contacts',' · 1 primary contact · backup optional');if(t.includes(' · 2/2 contacts'))el.textContent=t.replace(' · 2/2 contacts',' · 2 authorization contacts')});
}
async function context(){const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Your Owner session has expired. Sign in again.');const{data:m,error}=await sb.from('organization_users').select('organization_id').eq('user_id',session.user.id).eq('role','owner').eq('active',true).maybeSingle();if(error)throw error;if(!m)throw new Error('Owner access required.');return{session,orgId:m.organization_id}}
function hours(){return[...Array(7)].map((_,i)=>{const closed=$(`.opLocClosed[data-day="${i}"]`)?.checked??false,open=$(`.opLocOpen[data-day="${i}"]`)?.value||'',close=$(`.opLocClose[data-day="${i}"]`)?.value||'';if(!closed&&(!open||!close))throw new Error('Enter opening and closing time for every open day, or mark the day Closed.');return{weekday:i,open_time:closed?null:open,close_time:closed?null:close,closed}})}
async function saveWithPrimaryOnly(btn){
 const c=await context(),name1=$('#opContactName1').value.replace(/\s+/g,' ').trim(),email1=$('#opContactEmail1').value.trim().toLowerCase();
 if(!name1)throw new Error('Primary Contact 1 Name is required.');if(!validEmail(email1))throw new Error('Enter a valid email for Primary Contact 1.');
 const code=$('#opLocCode').value.trim().toUpperCase(),name=$('#opLocName').value.replace(/\s+/g,' ').trim(),address=$('#opLocAddress').value.trim(),logic=$('input[name="opLocLogic"]:checked')?.value||'dfw',period=$('#opPayrollPeriod').value,expected=Number($('#opPayrollHours').value),hs=hours();
 if(!/^[A-Z0-9]+$/.test(code))throw new Error('Location Code is required and may contain letters and numbers only.');if(!['weekly','biweekly','monthly'].includes(period))throw new Error('Choose a Payroll Period.');if(!Number.isFinite(expected)||expected<=0)throw new Error('Enter the total store hours for the selected payroll period.');
 let timezone='America/Chicago';if(editStoreId){const{data:s,error}=await sb.from('stores').select('timezone').eq('id',editStoreId).eq('organization_id',c.orgId).maybeSingle();if(error)throw error;if(s?.timezone)timezone=s.timezone}
 const{data,error}=await sb.rpc('save_store_with_hours',{p_organization_id:c.orgId,p_store_code:code,p_name:name||null,p_address:address||null,p_payroll_logic:logic,p_timezone:timezone,p_hours:hs,p_store_id:editStoreId||null,p_payroll_period:period,p_payroll_expected_hours:expected});if(error)throw error;const storeId=editStoreId||data;if(!storeId)throw new Error('The location was saved but OnePoint could not identify it to save the primary contact.');
 const now=new Date().toISOString();const{error:upErr}=await sb.from('store_contacts').upsert({organization_id:c.orgId,store_id:storeId,slot:1,contact_name:name1,contact_email:email1,updated_at:now},{onConflict:'store_id,slot'});if(upErr)throw upErr;const{error:delErr}=await sb.from('store_contacts').delete().eq('organization_id',c.orgId).eq('store_id',storeId).eq('slot',2);if(delErr)throw delErr;
 await sb.from('audit_logs').insert({organization_id:c.orgId,actor_user_id:c.session.user.id,action:'store_contacts_updated',entity_type:'store',entity_id:storeId,details:{slots:[1],secondary_contact_configured:false}});
 $('#drawer')?.classList.add('hidden');$('#back')?.classList.add('hidden');show(editStoreId?'Location updated. Primary authorization contact saved; secondary contact is not configured.':'Location added. Primary authorization contact saved; secondary contact is optional.','Locations','success');editStoreId=storeId;await window.onePointOwnerLocations?.render?.();setTimeout(decorateList,100);
}
document.addEventListener('click',async e=>{
 const add=e.target.closest('#opLocAdd'),edit=e.target.closest('.opLocEdit');if(add){editStoreId=null;setTimeout(decorate,40);return}if(edit){editStoreId=edit.dataset.id||null;setTimeout(decorate,40);return}
 if(e.target.closest('#nav [data-tab="stores"]'))setTimeout(decorateList,700);
 const save=e.target.closest('#opLocSave');if(!save||!$('#opContactName2')||!$('#opContactEmail2'))return;
 const n2=$('#opContactName2').value.replace(/\s+/g,' ').trim(),em2=$('#opContactEmail2').value.trim().toLowerCase();
 if(n2&&em2)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(n2||em2){show('Secondary Contact 2 is optional. If you use it, enter both the name and a valid email; otherwise leave both fields blank.','Locations');return}
 const old=save.textContent;save.disabled=true;save.textContent='Saving…';try{await saveWithPrimaryOnly(save)}catch(err){show(err?.message||String(err),'Locations')}finally{save.disabled=false;save.textContent=old}
},true);
setTimeout(decorateList,900);
})();