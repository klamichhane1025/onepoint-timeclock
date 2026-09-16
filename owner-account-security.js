(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(!['/owner','/manager'].includes(path))return;
const role=path==='/owner'?'owner':'manager';
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}}),$=s=>document.querySelector(s);
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const show=(m,t='Account Security',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):window.alert(m);
let opening=false;

function close(){const d=$('#drawer'),b=$('#back');d?.classList.add('hidden');d?.classList.remove('modal');b?.classList.add('hidden')}
async function context(){
 const{data:{session}}=await sb.auth.getSession();if(!session)throw new Error('Your session has expired. Sign in again.');
 const{data:m,error}=await sb.from('organization_users').select('id,organization_id,role,display_name,email').eq('user_id',session.user.id).eq('role',role).eq('active',true).maybeSingle();if(error)throw error;if(!m)throw new Error(`${role==='owner'?'Owner':'Manager'} access is required.`);
 const{data:o,error:oe}=await sb.from('organizations').select('id,name,plan,status').eq('id',m.organization_id).maybeSingle();if(oe)throw oe;
 return{session,membership:m,org:o}
}
async function open(){
 if(opening)return;opening=true;
 try{
  const c=await context(),d=$('#drawer'),b=$('#back');if(!d||!b)return;
  const roleLabel=role==='owner'?'Owner':'Manager';
  d.innerHTML=`<div class="opAccountHead"><div><h2>My Account</h2><div class="muted">${esc(c.membership.display_name||roleLabel)}</div></div><button class="btn secondary" id="opAccountClose" type="button">Close</button></div><div class="opAccountSummary"><div><span>Business</span><b>${esc(c.org?.name||'OnePoint Business')}</b></div><div><span>Role</span><b>${roleLabel}</b></div><div><span>Email</span><b>${esc(c.session.user.email||c.membership.email||'')}</b></div>${role==='owner'?`<div><span>Plan</span><b>${esc(c.org?.plan||'Free')}</b></div>`:''}</div>${role==='owner'?`<div class="opAccountSection"><div class="opAccountSectionHead"><h3>Business Branding</h3><div class="muted">Logo and portal appearance.</div></div><div id="opOwnerBrandingMount"><div class="muted">Loading business branding…</div></div></div>`:''}<div class="opAccountSection"><div class="opAccountSectionHead"><h3>Security</h3><div class="muted">Change your password or request a secure reset link.</div></div><div class="three opAccountPasswordGrid"><div class="field"><label>Current Password</label><input id="opCurrentPassword" type="password" autocomplete="current-password"></div><div class="field"><label>New Password</label><input id="opNewPassword" type="password" autocomplete="new-password"></div><div class="field"><label>Confirm Password</label><input id="opConfirmPassword" type="password" autocomplete="new-password"></div></div><div class="actions"><button class="btn primary" id="opChangePassword" type="button">Change Password</button><button class="btn secondary" id="opEmailReset" type="button">Email Reset Link</button></div></div>`;
  d.classList.add('modal','opAccountDrawer');d.classList.remove('hidden');b.classList.remove('hidden');
  if(role==='owner')window.dispatchEvent(new CustomEvent('onepoint:owner-account-opened'));
  setTimeout(()=>$('#opCurrentPassword')?.focus(),80)
 }catch(e){show(e?.message||String(e),'My Account')}
 finally{opening=false}
}
async function changePassword(){
 const cur=$('#opCurrentPassword')?.value||'',next=$('#opNewPassword')?.value||'',confirm=$('#opConfirmPassword')?.value||'';
 if(next.length<10)return show('Use a new password with at least 10 characters.');
 if(next!==confirm)return show('The new passwords do not match.');
 const{data:{session}}=await sb.auth.getSession();if(!session?.user?.email)return show('Sign in again.');
 const{error:reauth}=await sb.auth.signInWithPassword({email:session.user.email,password:cur});if(reauth)return show('Current password is incorrect.');
 const{error}=await sb.auth.updateUser({password:next});if(error)return show(error.message||'Unable to change password.');
 show('Your password was changed successfully.','Account Security','success');close()
}
async function emailReset(){
 const{data:{session}}=await sb.auth.getSession();const email=session?.user?.email;if(!email)return show('Sign in again.');
 const r=await fetch(`${URL}/functions/v1/account-access`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({action:'request_member_reset',email,portal:role})}),d=await r.json().catch(()=>({}));
 if(!r.ok||d.error)return show(d.error||'Unable to send password reset email.');
 show('Password reset email sent.','Account Security','success')
}
window.addEventListener('onepoint:open-account',e=>{if(!e.detail?.role||e.detail.role===role)open()});
document.addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;if(t.id==='opChangePassword'){e.preventDefault();changePassword()}else if(t.id==='opEmailReset'){e.preventDefault();emailReset()}else if(t.id==='opAccountClose'){e.preventDefault();close()}else if(t.id==='opOwnerAccountBtn'){e.preventDefault();open()}},true);
window.onePointAccountSecurity={open,close,role};
})();