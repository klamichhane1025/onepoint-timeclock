(()=>{
const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const show=(m,t='OnePoint',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):alert(m);
let mounting=false;

async function invoke(body){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) throw new Error('Your Admin session has expired. Sign in again.');
  const res=await fetch(`${SUPABASE_URL}/functions/v1/invite-member`,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${session.access_token}`},body:JSON.stringify(body)});
  const data=await res.json().catch(()=>({}));
  if(data?.error) throw new Error(data.error);
  if(!res.ok) throw new Error('Unable to complete this Admin action.');
  return data;
}

function inviteState(owner){
  if(owner.invitation_status==='active') return {label:'Active',expired:false,remaining:''};
  const invited=owner.invited_at?new Date(owner.invited_at).getTime():0;
  const expiry=invited+24*60*60*1000;
  const ms=expiry-Date.now();
  if(!invited||ms<=0) return {label:'Expired',expired:true,remaining:''};
  const hrs=Math.max(1,Math.ceil(ms/36e5));
  return {label:'Pending',expired:false,remaining:`${hrs}h left`};
}

function openEdit(owner,business){
  const drawer=$('#drawer'),back=$('#back');
  if(!drawer||!back) return;
  drawer.innerHTML=`<h2>Edit Owner</h2><div class="field"><label>Owner Name *</label><input id="eOwnerName" value="${(owner.display_name||'').replaceAll('&','&amp;').replaceAll('"','&quot;')}"></div><div class="field"><label>Business / Organization (optional)</label><input id="eOwnerBiz" value="${(business||'').replaceAll('&','&amp;').replaceAll('"','&quot;')}"></div><div class="field"><label>Owner Email *</label><input id="eOwnerEmail" type="email" value="${(owner.email||'').replaceAll('&','&amp;').replaceAll('"','&quot;')}"></div><div class="actions"><button class="btn primary" id="saveOwnerEdit">Save Changes</button><button class="btn secondary" id="cancelOwnerEdit">Cancel</button></div>`;
  drawer.classList.add('modal');drawer.classList.remove('hidden');back.classList.remove('hidden');
  const close=()=>{drawer.classList.add('hidden');drawer.classList.remove('modal');back.classList.add('hidden')};
  $('#cancelOwnerEdit').onclick=close;
  $('#saveOwnerEdit').onclick=async()=>{
    const display_name=$('#eOwnerName').value.trim(),business_name=$('#eOwnerBiz').value.trim(),email=$('#eOwnerEmail').value.trim();
    if(!display_name) return show('Owner Name is required.','Owner details');
    if(!email||!email.includes('@')) return show('A valid Owner Email is required.','Owner details');
    const btn=$('#saveOwnerEdit');btn.disabled=true;btn.textContent='Saving…';
    try{await invoke({action:'update_owner',membership_id:owner.id,display_name,business_name,email});close();show('Owner details updated successfully.','Owner updated','success');setTimeout(()=>location.reload(),700)}catch(e){show(e.message||String(e),'Owner details')}finally{btn.disabled=false;btn.textContent='Save Changes'}
  };
}

async function mount(){
  if(mounting||location.pathname.replace(/\/+$/,'')!=='/admin')return;
  if(!$('#addOwner')) return;
  mounting=true;
  try{
    const {data:{session}}=await sb.auth.getSession();if(!session)return;
    const {data:orgs,error}=await sb.from('organizations').select('id,name,plan,status,created_at,organization_users(id,role,display_name,email,invitation_status,invited_at,accepted_at,active)').order('created_at',{ascending:false});
    if(error) throw error;
    let panel=$('#ownerAdminControls');
    if(!panel){panel=document.createElement('div');panel.id='ownerAdminControls';panel.className='card section';const first=$('#content .card');if(first) first.parentNode.insertBefore(panel,first);else $('#content').prepend(panel)}
    const rows=[];
    for(const org of orgs||[]){const owner=(org.organization_users||[]).find(x=>x.role==='owner');if(!owner)continue;const st=inviteState(owner);rows.push(`<tr><td><b>${org.name||'—'}</b></td><td>${owner.display_name||'—'}</td><td>${owner.email||'—'}</td><td><span class="badge ${st.label==='Active'?'ok':st.label==='Expired'?'warn':''}">${st.label}</span>${st.remaining?` <span class="muted">${st.remaining}</span>`:''}</td><td><div class="actions compact"><button class="btn secondary ownerEdit" data-owner="${owner.id}" data-org="${org.id}">Edit Owner</button>${st.expired?`<button class="btn primary ownerResend" data-owner="${owner.id}">Resend Invitation</button>`:''}</div></td></tr>`)}
    panel.innerHTML=`<div class="head"><div><h2>Owner Account Management</h2><div class="muted">Pending invitations expire after 24 hours. Expired invitations can be resent manually.</div></div></div><div class="table"><table><thead><tr><th>Business</th><th>Owner</th><th>Email</th><th>Invitation</th><th>Actions</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="5">No owners yet.</td></tr>'}</tbody></table></div>`;
    $$('.ownerEdit').forEach(b=>b.onclick=()=>{const org=(orgs||[]).find(o=>o.id===b.dataset.org),owner=(org?.organization_users||[]).find(x=>x.id===b.dataset.owner);if(owner)openEdit(owner,org?.name||'')});
    $$('.ownerResend').forEach(b=>b.onclick=async()=>{const btn=b;btn.disabled=true;btn.textContent='Sending…';try{await invoke({action:'resend_owner',membership_id:b.dataset.owner});show('A new 24-hour invitation was sent. The previous invitation is invalid.','Invitation resent','success');setTimeout(()=>location.reload(),700)}catch(e){show(e.message||String(e),'Resend invitation')}finally{btn.disabled=false;btn.textContent='Resend Invitation'}});
  }catch(e){console.error(e)}finally{mounting=false}
}
new MutationObserver(()=>setTimeout(mount,0)).observe(document.body,{childList:true,subtree:true});
window.addEventListener('load',()=>setTimeout(mount,300));
setTimeout(mount,800);
})();