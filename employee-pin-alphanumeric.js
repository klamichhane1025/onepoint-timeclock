(()=>{
if(window.__onePointEmployeePinAlpha)return;window.__onePointEmployeePinAlpha=true;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const valid=v=>/^[A-Za-z0-9]{4,8}$/.test(String(v||'').trim());
const hasLetter=v=>/[A-Za-z]/.test(String(v||''));
const show=(m,t='Employee PIN',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
let ownerEditId=null,managerEditId=null,busy=false;
function configureSecret(input){
  if(!input)return;
  input.setAttribute('inputmode','text');input.setAttribute('maxlength','8');input.setAttribute('autocapitalize','none');input.setAttribute('autocorrect','off');input.setAttribute('spellcheck','false');
  const label=input.closest('.field')?.querySelector('label');if(label)label.textContent=label.textContent.replace(/4[–-]8 (digits|letters or numbers|letters, numbers, or a mix)/gi,'4–8 letters, numbers, or a mix');
}
function enhanceOwnerCustomPin(root=document){
  const pin=root.querySelector?.('#oeCustomPin')||document.querySelector('#oeCustomPin');if(!pin)return;
  configureSecret(pin);
  const idField=document.querySelector('#oeCustomId');if(idField){const note=idField.closest('.field')?.querySelector('.muted');if(note&&!note.dataset.idLengthClarified){note.dataset.idLengthClarified='1';note.textContent+=' Employee IDs can be a single positive whole number such as 1; no fixed digit length is required.'}}
  if(document.querySelector('#oeCustomPinConfirm'))return;
  const field=pin.closest('.field');if(!field)return;
  const optional=/optional|leave blank|keep current/i.test(field.querySelector('label')?.textContent||'');
  const confirmField=document.createElement('div');confirmField.className='field opPinConfirmField';
  confirmField.innerHTML=`<label for="oeCustomPinConfirm">${optional?'Confirm New PIN':'Confirm PIN'}${optional?'':' *'}</label><input id="oeCustomPinConfirm" type="password" inputmode="text" maxlength="8" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false"><div class="opPinConfirmStatus" role="status" aria-live="polite"></div>`;
  field.insertAdjacentElement('afterend',confirmField);window.onePointEnhanceSecretFields?.(confirmField);
  const confirm=confirmField.querySelector('input'),status=confirmField.querySelector('.opPinConfirmStatus');
  const update=()=>{const a=pin.value.trim(),b=confirm.value.trim();status.className='opPinConfirmStatus';if(!a&&!b&&optional){status.textContent='Leave both blank to keep the current PIN.';status.classList.add('wait');return}if(!a&&!b){status.textContent='';return}if(!valid(a)){status.textContent='PIN must be 4–8 letters, numbers, or a mix.';status.classList.add('mismatch');return}if(!b){status.textContent='Re-enter the PIN to confirm.';status.classList.add('wait');return}if(a===b){status.textContent='✓ Match';status.classList.add('match')}else{status.textContent='✕ Not matched';status.classList.add('mismatch')}};
  pin.addEventListener('input',update);confirm.addEventListener('input',update);pin.addEventListener('blur',update);confirm.addEventListener('blur',update);update();
}
function decorate(root=document){
  for(const input of root.querySelectorAll?.('#oePin,#oePinConfirm,#awePin,#awePinConfirm,#mfaEmpPin,#mfaEmpPin2,#kPin,#oeCustomPin,#oeCustomPinConfirm')||[])configureSecret(input);
  enhanceOwnerCustomPin(root);
}
async function context(role){
  const sb=window.onePointSupabase||window.supabase?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});if(!sb)throw new Error('OnePoint authentication is unavailable. Refresh the page.');
  const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Your session has expired. Sign in again.');
  const{data:m,error}=await sb.from('organization_users').select('organization_id,role').eq('user_id',session.user.id).eq('active',true).eq('role',role).maybeSingle();if(error)throw error;if(!m)throw new Error(`${role==='owner'?'Owner':'Manager'} access is required.`);return{sb,session,orgId:m.organization_id};
}
async function employeeApi(c,body){const r=await fetch(`${URL}/functions/v1/manage-employee`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':`Bearer ${c.session.access_token}`},body:JSON.stringify({...body,organization_id:c.orgId})}),d=await r.json().catch(()=>({}));if(!r.ok||d.error||d.ok===false)throw new Error(d.error||'Unable to save employee.');return d}
function closeModal(){document.querySelector('#drawer')?.classList.add('hidden');document.querySelector('#drawer')?.classList.remove('modal');document.querySelector('#back')?.classList.add('hidden')}
async function saveOwnerAlpha(){
  const pin=document.querySelector('#oePin')?.value.trim()||'';if(!hasLetter(pin))return false;
  if(!valid(pin))throw new Error('PIN must be 4 to 8 letters, numbers, or a mix.');const confirm=document.querySelector('#oePinConfirm')?.value.trim()||'';if(pin!==confirm)throw new Error('PIN and Confirm PIN must match.');
  const c=await context('owner'),name=document.querySelector('#oeName')?.value.replace(/\s+/g,' ').trim()||'',store_id=document.querySelector('#oeStore')?.value||'',job_code_id=document.querySelector('#oeJob')?.value||null,pay_type=document.querySelector('#oePay')?.value||null,pay_rate=document.querySelector('#oeRate')?.value===''?null:Number(document.querySelector('#oeRate')?.value);
  if(!name)throw new Error('Employee Name is required.');const body={action:ownerEditId?'update_employee':'create_employee',employee_id:ownerEditId||undefined,name,pin,store_id,job_code_id,pay_type,pay_rate};
  if(ownerEditId){const{data:e,error}=await c.sb.from('employees').select('employee_number').eq('id',ownerEditId).eq('organization_id',c.orgId).maybeSingle();if(error)throw error;if(!e)throw new Error('Employee could not be identified.');body.employee_number=Number(e.employee_number)}
  await employeeApi(c,body);closeModal();show(ownerEditId?'Employee updated successfully.':'Employee created successfully.','Employees','success');setTimeout(()=>location.reload(),350);return true
}
async function saveOwnerCustom(){
  const pin=document.querySelector('#oeCustomPin')?.value.trim()||'',confirm=document.querySelector('#oeCustomPinConfirm')?.value.trim()||'',editing=!!ownerEditId;
  if(!editing&&!valid(pin))throw new Error('PIN must be 4 to 8 letters, numbers, or a mix.');
  if(editing&&(pin||confirm)&&!valid(pin))throw new Error('New PIN must be 4 to 8 letters, numbers, or a mix.');
  if(pin!==confirm)throw new Error('PIN and Confirm PIN must match.');
  const c=await context('owner'),idRaw=document.querySelector('#oeCustomId')?.value.trim()||'',employeeNumber=idRaw===''?null:Number(idRaw),name=document.querySelector('#oeCustomName')?.value.replace(/\s+/g,' ').trim()||'',store_id=document.querySelector('#oeCustomStore')?.value||'',job_code_id=document.querySelector('#oeCustomJob')?.value||null,pay_type=document.querySelector('#oeCustomPay')?.value||null,pay_rate=document.querySelector('#oeCustomRate')?.value===''?null:Number(document.querySelector('#oeCustomRate')?.value);
  if(editing&&(!Number.isSafeInteger(employeeNumber)||employeeNumber<=0))throw new Error('Employee ID must be a positive whole number. Single-digit IDs such as 1 are valid.');
  if(!editing&&employeeNumber!=null&&(!Number.isSafeInteger(employeeNumber)||employeeNumber<=0))throw new Error('Employee ID must be a positive whole number. Single-digit IDs such as 1 are valid.');
  if(!name)throw new Error('Employee Name is required.');
  await employeeApi(c,{action:editing?'update_employee':'create_employee',employee_id:editing?ownerEditId:undefined,employee_number:employeeNumber,name,pin,store_id,job_code_id,pay_type,pay_rate});closeModal();show(editing?'Employee updated successfully.':'Employee created successfully.','Employees','success');setTimeout(()=>location.reload(),350);return true
}
async function saveManagerAlpha(){
  const pin=document.querySelector('#mfaEmpPin')?.value.trim()||'';if(!hasLetter(pin))return false;
  if(!valid(pin))throw new Error('PIN must be 4 to 8 letters, numbers, or a mix.');const confirm=document.querySelector('#mfaEmpPin2')?.value.trim()||'';if(pin!==confirm)throw new Error('PIN and Confirm PIN must match.');
  const c=await context('manager'),name=document.querySelector('#mfaEmpName')?.value.replace(/\s+/g,' ').trim()||'',store_id=document.querySelector('#mfaEmpStore')?.value||'',job_code_id=document.querySelector('#mfaEmpJob')?.value||null,pay_type=document.querySelector('#mfaEmpPay')?.value||null,pay_rate=document.querySelector('#mfaEmpRate')?.value||null;
  if(!name)throw new Error('Employee Name is required.');const body={action:managerEditId?'update_employee':'create_employee',employee_id:managerEditId||undefined,name,pin,store_id,job_code_id,pay_type,pay_rate};if(managerEditId)body.employee_number=Number(document.querySelector('#mfaEmpNo')?.value);
  await employeeApi(c,body);closeModal();show(managerEditId?'Employee updated.':'Employee created.','Employees','success');setTimeout(()=>location.reload(),350);return true
}
document.addEventListener('click',async e=>{
  const t=e.target.closest?.('button');if(!t)return;
  if(t.id==='oeAdd'){ownerEditId=null;return}if(t.classList.contains('oeEdit')){ownerEditId=t.dataset.id||null;return}
  if(t.id==='mfaAddEmp'){managerEditId=null;return}if(t.classList.contains('mfaEditEmp')){managerEditId=t.dataset.id||null;return}
  if(busy)return;
  if(t.id==='oeCustomSave'){
    e.preventDefault();e.stopImmediatePropagation();busy=true;const old=t.textContent;t.disabled=true;t.textContent='Saving…';try{await saveOwnerCustom()}catch(err){show(err.message||String(err),'Employees')}finally{busy=false;t.disabled=false;t.textContent=old}return
  }
  if(t.id==='oeSave'&&hasLetter(document.querySelector('#oePin')?.value||'')){
    e.preventDefault();e.stopImmediatePropagation();busy=true;const old=t.textContent;t.disabled=true;t.textContent='Saving…';try{await saveOwnerAlpha()}catch(err){show(err.message||String(err),'Employees')}finally{busy=false;t.disabled=false;t.textContent=old}return
  }
  if(t.id==='mfaEmpSave'&&hasLetter(document.querySelector('#mfaEmpPin')?.value||'')){
    e.preventDefault();e.stopImmediatePropagation();busy=true;const old=t.textContent;t.disabled=true;t.textContent='Saving…';try{await saveManagerAlpha()}catch(err){show(err.message||String(err),'Employees')}finally{busy=false;t.disabled=false;t.textContent=old}
  }
},true);
const observer=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)decorate(n)});observer.observe(document.documentElement,{childList:true,subtree:true});decorate();
})();