(()=>{
const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const show=(m,t='OnePoint',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
let orgsCache=[];
let mounted=false;
let mounting=false;

async function invoke(body){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) throw new Error('Your Admin session has expired. Sign in again.');
  const res=await fetch(`${SUPABASE_URL}/functions/v1/invite-member`,{
    method:'POST',
    headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${session.access_token}`},
    body:JSON.stringify(body)
  });
  const data=await res.json().catch(()=>({}));
  if(data?.error) throw new Error(data.error);
  if(!res.ok) throw new Error('Unable to complete this Admin action.');
  return data;
}

function esc(v=''){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function inviteState(owner){
  if(owner.invitation_status==='active') return {label:'Active',expired:false,remaining:''};
  const invited=owner.invited_at?new Date(owner.invited_at).getTime():0;
  const expiry=invited+24*60*60*1000;
  const ms=expiry-Date.now();
  if(!invited||ms<=0) return {label:'Expired',expired:true,remaining:''};
  return {label:'Pending',expired:false,remaining:`${Math.max(1,Math.ceil(ms/36e5))}h left`};
}
function closeDrawer(){const d=$('#drawer'),b=$('#back');if(d){d.classList.add('hidden');d.classList.remove('modal')}b?.classList.add('hidden')}
function openDrawer(html){const d=$('#drawer'),b=$('#back');if(!d||!b)return;d.innerHTML=html;d.classList.add('modal');d.classList.remove('hidden');b.classList.remove('hidden')}

function polishInviteModal(){
  const name=$('#oiName'),email=$('#oiEmail'),business=$('#oiBiz'),plan=$('#oiPlan');
  if(name){name.required=true;name.placeholder='Required';const l=name.closest('.field')?.querySelector('label');if(l)l.textContent='Owner Name *'}
  if(email){email.required=true;const l=email.closest('.field')?.querySelector('label');if(l)l.textContent='Owner Email *'}
  if(business){business.placeholder='Optional';const l=business.closest('.field')?.querySelector('label');if(l)l.textContent='Business / Organization (optional)'}
  if(plan){const l=plan.closest('.field')?.querySelector('label');if(l)l.textContent='Plan (optional — defaults to Free)'}
}

function openEdit(owner,business){
  openDrawer(`<h2>Edit Owner</h2><div class="field"><label>Owner Name *</label><input id="eOwnerName" value="${esc(owner.display_name||'')}"></div><div class="field"><label>Business / Organization (optional)</label><input id="eOwnerBiz" value="${esc(business||'')}"></div><div class="field"><label>Owner Email *</label><input id="eOwnerEmail" type="email" value="${esc(owner.email||'')}"></div><div class="actions"><button class="btn primary" id="saveOwnerEdit">Save Changes</button><button class="btn secondary" id="cancelOwnerEdit">Cancel</button></div>`);
}

async function refreshPanel(){
  if(mounting)return;
  mounting=true;
  try{
    const {data:{session}}=await sb.auth.getSession();
    if(!session)return;
    const {data:orgs,error}=await sb.from('organizations').select('id,name,plan,status,created_at,organization_users(id,role,display_name,email,invitation_status,invited_at,accepted_at,active)').order('created_at',{ascending:false});
    if(error)throw error;
    orgsCache=orgs||[];
    let panel=$('#ownerAdminControls');
    if(!panel){
      panel=document.createElement('div');
      panel.id='ownerAdminControls';
      panel.className='card section';
      const content=$('#content');
      const first=content?.querySelector('.card');
      if(first) content.insertBefore(panel,first); else content?.prepend(panel);
    }
    const rows=[];
    for(const org of orgsCache){
      const owner=(org.organization_users||[]).find(x=>x.role==='owner');
      if(!owner)continue;
      const st=inviteState(owner);
      rows.push(`<tr><td><b>${esc(org.name||'—')}</b></td><td>${esc(owner.display_name||'—')}</td><td>${esc(owner.email||'—')}</td><td><span class="badge ${st.label==='Active'?'ok':st.label==='Expired'?'warn':''}">${st.label}</span>${st.remaining?` <span class="muted">${st.remaining}</span>`:''}</td><td><div class="actions compact"><button class="btn secondary ownerEdit" data-owner="${owner.id}" data-org="${org.id}">Edit Owner</button>${st.expired?`<button class="btn primary ownerResend" data-owner="${owner.id}">Resend Invitation</button>`:''}</div></td></tr>`);
    }
    panel.innerHTML=`<div class="head"><div><h2>Owner Account Management</h2><div class="muted">Invitations expire after 24 hours. Expired invitations can be resent manually.</div></div></div><div class="table"><table><thead><tr><th>Business</th><th>Owner</th><th>Email</th><th>Invitation</th><th>Actions</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="5">No owners yet.</td></tr>'}</tbody></table></div>`;
    mounted=true;
  }catch(e){console.error('Owner admin controls:',e)}finally{mounting=false}
}

document.addEventListener('click',async e=>{
  const add=e.target.closest('#addOwner');
  if(add){setTimeout(polishInviteModal,0);return}

  const send=e.target.closest('#oiSend');
  if(send){
    e.preventDefault();e.stopImmediatePropagation();
    const name=$('#oiName')?.value?.trim()||'',email=$('#oiEmail')?.value?.trim()||'',business=$('#oiBiz')?.value?.trim()||'',plan=$('#oiPlan')?.value||'free';
    if(!name){show('Owner Name is required.','Owner invitation');$('#oiName')?.focus();return}
    if(!email||!email.includes('@')){show('A valid Owner Email is required.','Owner invitation');$('#oiEmail')?.focus();return}
    const old=send.textContent;send.disabled=true;send.textContent='Sending…';
    try{await invoke({action:'invite_owner',email,business_name:business,display_name:name,plan});closeDrawer();show(`Invitation sent to ${email}.`,'Owner invited','success');await refreshPanel()}catch(err){show(err.message||String(err),'Owner invitation')}finally{send.disabled=false;send.textContent=old}
    return;
  }

  const edit=e.target.closest('.ownerEdit');
  if(edit){const org=orgsCache.find(o=>o.id===edit.dataset.org),owner=(org?.organization_users||[]).find(x=>x.id===edit.dataset.owner);if(owner)openEdit(owner,org?.name||'');return}

  const resend=e.target.closest('.ownerResend');
  if(resend){const old=resend.textContent;resend.disabled=true;resend.textContent='Sending…';try{await invoke({action:'resend_owner',membership_id:resend.dataset.owner});show('A new 24-hour invitation was sent. The previous invitation is invalid.','Invitation resent','success');await refreshPanel()}catch(err){show(err.message||String(err),'Resend invitation')}finally{resend.disabled=false;resend.textContent=old}return}

  if(e.target.closest('#cancelOwnerEdit')){closeDrawer();return}
  const save=e.target.closest('#saveOwnerEdit');
  if(save){
    const ownerId=$('.ownerEdit[data-owner]')?.dataset.owner;
    const display_name=$('#eOwnerName')?.value.trim()||'',business_name=$('#eOwnerBiz')?.value.trim()||'',email=$('#eOwnerEmail')?.value.trim()||'';
    if(!display_name)return show('Owner Name is required.','Owner details');
    if(!email||!email.includes('@'))return show('A valid Owner Email is required.','Owner details');
    const owner=orgsCache.flatMap(o=>o.organization_users||[]).find(x=>x.role==='owner'&&x.email===($('#eOwnerEmail')?.defaultValue||x.email));
    const membership_id=owner?.id||ownerId;
    if(!membership_id)return show('Unable to identify this Owner account. Refresh the page and try again.','Owner details');
    const old=save.textContent;save.disabled=true;save.textContent='Saving…';
    try{await invoke({action:'update_owner',membership_id,display_name,business_name,email});closeDrawer();show('Owner details updated successfully.','Owner updated','success');await refreshPanel()}catch(err){show(err.message||String(err),'Owner details')}finally{save.disabled=false;save.textContent=old}
  }
},true);

function init(){
  if(location.pathname.replace(/\/+$/,'')!=='/admin')return;
  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if($('#addOwner')){clearInterval(timer);refreshPanel()}
    else if(tries>=40) clearInterval(timer);
  },250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();