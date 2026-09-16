(()=>{
if(window.__onePointAppleInterface)return;window.__onePointAppleInterface=true;
const content=document.querySelector('#content');if(!content)return;
const path=location.pathname.replace(/\/+$/,'')||'/';
const identityPortal=path==='/owner'||path==='/manager';
const compactPortal=['/owner','/manager','/admin'].includes(path);
if(compactPortal)document.documentElement.classList.add('opApplePortal');
const unwanted=[
 'Owned and shared locations are listed together. Purple/Shared labels identify partner locations.',
 'POS browsers registered for employee clock access. Machine ID is a OnePoint-generated device identifier; web browsers do not expose the physical MAC address.'
];
const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
let observer=null,identityObserver=null,running=false,identityRunning=false,raf=0,identityTimer=0,cachedIdentity=null;
function statusClass(text){const t=norm(text);if(t==='active')return'opStatusActive';if(t==='inactive'||t==='expired')return'opStatusDanger';return''}
function decorateStatuses(){
 for(const badge of content.querySelectorAll('.badge')){const cls=statusClass(badge.textContent);badge.classList.remove('opStatusActive','opStatusDanger');if(cls)badge.classList.add(cls)}
 for(const cell of content.querySelectorAll('td')){if(cell.children.length)continue;const cls=statusClass(cell.textContent);if(!cls)continue;const text=cell.textContent.trim();cell.textContent='';const badge=document.createElement('span');badge.className=`badge ${cls}`;badge.textContent=text;cell.appendChild(badge)}
}
function clean(){
 if(running)return;running=true;observer?.disconnect();
 try{
  for(const el of content.querySelectorAll('.muted')){const t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(unwanted.includes(t))el.remove()}
  const title=norm(document.querySelector('#title')?.textContent);
  if(title&&title!=='loading…'&&title!=='loading...'){
   const candidates=[...content.querySelectorAll('.head h2,.card>h2')];
   const dup=candidates.find(h=>norm(h.textContent)===title);
   if(dup){
    const lead=dup.parentElement;const head=dup.closest('.head');dup.remove();
    if(lead&&lead!==head&&!lead.textContent.trim()&&!lead.querySelector('button,a,input,select,textarea'))lead.remove();
    if(head){
     const usefulLead=[...head.children].find(x=>!x.matches('.actions')&&x.textContent.trim());
     const actions=head.querySelector('.actions');
     if(!usefulLead&&actions)head.classList.add('opHeaderActionsOnly');
     else head.classList.remove('opHeaderActionsOnly');
     if(!head.textContent.trim()&&!head.querySelector('button,a,input,select,textarea'))head.remove();
    }
   }
  }
  decorateStatuses();
  const firstCard=content.querySelector(':scope > .card')||content.querySelector('.card');firstCard?.classList.add('opApplePrimaryCard');
 }finally{
  running=false;observer?.observe(content,{childList:true,subtree:true,characterData:true});
 }
}
function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(clean)}
function initials(name){return String(name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()||'').join('')||'U'}
async function resolveIdentity(){
 if(cachedIdentity)return cachedIdentity;
 const sb=window.onePointSupabase;if(!sb)return null;
 try{
  const{data:{session}}=await sb.auth.getSession();if(!session?.user)return null;
  const{data,error}=await sb.from('organization_users').select('display_name,email,role').eq('user_id',session.user.id).eq('active',true).in('role',['owner','manager']).limit(1);
  if(error)throw error;
  const member=data?.[0]||null;
  const meta=session.user.user_metadata||{};
  const displayName=String(member?.display_name||meta.full_name||meta.name||'').trim();
  cachedIdentity={name:displayName||String(session.user.email||member?.email||'').split('@')[0]||'Account',email:session.user.email||member?.email||''};
  return cachedIdentity;
 }catch(e){console.warn('Customer identity:',e?.message||e);return null}
}
async function personalizeIdentity(){
 if(!identityPortal||identityRunning)return;
 const who=document.querySelector('#who');if(!who||!who.children.length)return;
 identityRunning=true;identityObserver?.disconnect();
 try{
  const identity=await resolveIdentity();if(!identity)return;
  const avatar=who.querySelector('.avatar');
  const info=[...who.children].find(el=>el!==avatar&&!el.matches('button')&&!el.matches('.opProfileChevron'));
  if(!info)return;
  let name=info.querySelector('b,.opCustomerIdentityName');
  if(!name){name=document.createElement('b');info.prepend(name)}
  name.textContent=identity.name;name.classList.add('opCustomerIdentityName');
  if(identity.email)name.title=identity.email;
  [...info.querySelectorAll('.muted')].forEach(el=>el.remove());
  who.classList.add('opCustomerWho');info.classList.add('opCustomerIdentity');
  if(avatar){avatar.textContent=initials(identity.name);avatar.setAttribute('aria-hidden','true')}
 }finally{
  identityRunning=false;
  identityObserver?.observe(who,{childList:true,subtree:true,characterData:true});
 }
}
function scheduleIdentity(){clearTimeout(identityTimer);identityTimer=setTimeout(personalizeIdentity,40)}
observer=new MutationObserver(schedule);observer.observe(content,{childList:true,subtree:true,characterData:true});
if(identityPortal){const who=document.querySelector('#who');if(who){identityObserver=new MutationObserver(scheduleIdentity);identityObserver.observe(who,{childList:true,subtree:true,characterData:true})}}
document.addEventListener('click',e=>{if(e.target.closest('#nav button,[data-tab],[data-aw-tab]')){setTimeout(schedule,80);setTimeout(scheduleIdentity,80)}},true);
setTimeout(clean,50);setTimeout(clean,500);setTimeout(personalizeIdentity,120);setTimeout(personalizeIdentity,700);
window.onePointAppleInterface={refresh:()=>{schedule();scheduleIdentity()}};
})();