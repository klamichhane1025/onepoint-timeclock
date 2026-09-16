(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(!['/owner','/manager'].includes(path))return;
const role=path==='/owner'?'owner':'manager';
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let menu=null,observer=null,identity=null,notificationView=false;
const notifications=[];

function esc(v){return String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function initials(name){return String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'U'}
async function resolveIdentity(){
 if(identity)return identity;
 const{data:{session}}=await sb.auth.getSession();if(!session)return null;
 const{data:m}=await sb.from('organization_users').select('display_name,email').eq('user_id',session.user.id).eq('role',role).eq('active',true).maybeSingle();
 identity={name:String(m?.display_name||session.user.user_metadata?.full_name||session.user.email||'Account').trim(),email:session.user.email||m?.email||''};return identity
}
function removeLegacyAccountControls(){
 $$('#nav [data-tab="account"]').forEach(x=>x.remove());
 $('#logout')?.remove();
 $('#opOwnerAccountBtn')?.remove()
}
function ensureWho(){
 removeLegacyAccountControls();
 const who=$('#who');if(!who||!who.textContent.trim())return;
 who.classList.add('opProfileTrigger');who.setAttribute('role','button');who.setAttribute('tabindex','0');who.setAttribute('aria-haspopup','menu');who.setAttribute('aria-expanded',menu?'true':'false');
 if(!who.querySelector('.opProfileChevron')){const c=document.createElement('span');c.className='opProfileChevron';c.setAttribute('aria-hidden','true');c.textContent='⌄';who.appendChild(c)}
 if(who.dataset.opProfileBound==='1')return;who.dataset.opProfileBound='1';
 who.addEventListener('click',e=>{if(e.target.closest('button,a,input,select'))return;e.preventDefault();toggle()});
 who.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}else if(e.key==='Escape')close()})
}
function notificationRows(){
 if(!notifications.length)return`<div class="opProfileEmpty"><b>You're all caught up.</b><span>No new OnePoint notifications.</span></div>`;
 return notifications.slice(0,8).map((n,i)=>`<button class="opNotificationRow" type="button" data-notification="${i}"><span class="opNotificationDot ${esc(n.type||'info')}"></span><span><b>${esc(n.title||'Notification')}</b>${n.body?`<small>${esc(n.body)}</small>`:''}</span></button>`).join('')
}
async function menuHtml(){
 const i=await resolveIdentity(),count=notifications.length;
 if(notificationView)return`<div class="opProfileMenuHead"><button class="opProfileBack" type="button" aria-label="Back to profile menu">‹</button><div><b>Notifications</b><small>${count?`${count} new`:'No new notifications'}</small></div>${count?'<button class="opProfileClear" type="button">Clear</button>':''}</div><div class="opNotificationsList">${notificationRows()}</div>`;
 return`<div class="opProfileIdentity"><span class="opProfileAvatar">${esc(initials(i?.name))}</span><span><b>${esc(i?.name||'Account')}</b><small>${esc(i?.email||'')}</small></span></div><div class="opProfileMenuGroup"><button type="button" class="opProfileMenuItem" data-action="account"><span>My Account</span><span aria-hidden="true">›</span></button><button type="button" class="opProfileMenuItem" data-action="notifications"><span>Notifications</span><span class="opProfileCount ${count?'show':''}">${count||''}</span></button></div><button type="button" class="opProfileMenuItem dangerText" data-action="signout">Sign Out</button>`
}
function position(){if(!menu)return;const who=$('#who');if(!who)return;const r=who.getBoundingClientRect(),gap=8,w=Math.min(310,innerWidth-24);let left=Math.max(12,Math.min(innerWidth-w-12,r.right-w));let top=Math.min(innerHeight-menu.offsetHeight-12,r.bottom+gap);top=Math.max(12,top);menu.style.width=`${w}px`;menu.style.left=`${left}px`;menu.style.top=`${top}px`}
async function open(){
 if(menu)return;notificationView=false;
 menu=document.createElement('div');menu.id='opProfileMenu';menu.className='opProfileMenu';menu.setAttribute('role','menu');menu.innerHTML=await menuHtml();document.body.appendChild(menu);position();
 $('#who')?.setAttribute('aria-expanded','true');bindMenu();requestAnimationFrame(()=>menu?.classList.add('show'))
}
function close(){if(!menu)return;const old=menu;menu=null;$('#who')?.setAttribute('aria-expanded','false');old.classList.remove('show');setTimeout(()=>old.remove(),120)}
function toggle(){menu?close():open()}
async function redraw(){if(!menu)return;menu.innerHTML=await menuHtml();position();bindMenu()}
function openAccount(){close();window.dispatchEvent(new CustomEvent('onepoint:open-account',{detail:{role}}))}
async function signOut(){close();await sb.auth.signOut();location.href=role==='manager'?'/manager/':'/owner/'}
function bindMenu(){
 if(!menu)return;
 menu.querySelector('[data-action="account"]')?.addEventListener('click',openAccount);
 menu.querySelector('[data-action="notifications"]')?.addEventListener('click',()=>{notificationView=true;redraw()});
 menu.querySelector('[data-action="signout"]')?.addEventListener('click',signOut);
 menu.querySelector('.opProfileBack')?.addEventListener('click',()=>{notificationView=false;redraw()});
 menu.querySelector('.opProfileClear')?.addEventListener('click',()=>{notifications.splice(0);redraw();updateCount()})
}
function updateCount(){const c=menu?.querySelector('.opProfileCount');if(c){c.textContent=notifications.length?String(notifications.length):'';c.classList.toggle('show',!!notifications.length)}}
function pushNotification(input){const n=typeof input==='string'?{title:input}:{...(input||{})};if(!n.title&&!n.body)return;notifications.unshift({title:n.title||'Notification',body:n.body||'',type:n.type||'info',at:Date.now()});if(notifications.length>20)notifications.length=20;updateCount()}
function clearNotifications(){notifications.splice(0);updateCount();if(menu&&notificationView)redraw()}

document.addEventListener('pointerdown',e=>{if(!menu)return;if(menu.contains(e.target)||$('#who')?.contains(e.target))return;close()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu)close()},true);
addEventListener('resize',position,{passive:true});addEventListener('scroll',position,{passive:true,capture:true});
window.addEventListener('onepoint:notification',e=>pushNotification(e.detail));
const shell=document.querySelector('.app');if(shell){observer=new MutationObserver(()=>{removeLegacyAccountControls();ensureWho()});observer.observe(shell,{childList:true,subtree:true})}
setTimeout(ensureWho,100);setTimeout(ensureWho,500);setTimeout(ensureWho,1200);
window.onePointNotifications={push:pushNotification,clear:clearNotifications,list:()=>[...notifications]};
window.onePointProfileMenu={open,close};
})();