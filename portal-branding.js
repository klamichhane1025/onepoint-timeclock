(()=>{
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const path=location.pathname.replace(/\/+$/,'');
const cashierClock=location.hostname==='cashier.onepointsystems.io'&&path==='';
const isClock=path==='/timeclock'||cashierClock;
if(!['/owner','/manager','/timeclock'].includes(path)&&!cashierClock)return;
const sb=window.onePointSupabase||window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const publicLogo=p=>p?`${URL}/storage/v1/object/public/organization-branding/${p}?v=${Date.now()}`:null;
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
let current={logo_url:null,name:null};
function sidebar(){
 const b=document.querySelector('.side .brand');if(!b)return;
 const business=current.name||'OnePoint Business';
 const img=current.logo_url?`<img class="opBrandLogo" src="${esc(current.logo_url)}" alt="${esc(business)} logo">`:'';
 b.classList.add('opBusinessBrand');
 b.innerHTML=`${img}<div class="opSidebarBusinessName">${esc(business)}</div><div class="opSidebarBrandGap" aria-hidden="true"></div><div class="opOnePointLabel">OnePoint<small>Time & Attendance</small></div>`
}
function clock(){
 document.body.classList.add('opClockNoSide');
 document.querySelectorAll('.opClockBrandHeader').forEach(x=>x.remove());
 const c=document.querySelector('.clock'),mount=c?.querySelector('.kLogoMount');if(!mount)return;
 const visual=current.logo_url?`<img class="opBrandLogo" src="${esc(current.logo_url)}" alt="${esc(current.name||'Business')} logo">`:`<div class="kLogoFallback" aria-label="OnePoint">1</div>`;
 mount.innerHTML=visual
}
function apply(data){current={...current,...data};if(isClock)clock();else sidebar()}
async function portal(){try{if(!sb)return;const{data:{session}}=await sb.auth.getSession();if(!session)return;const{data:m}=await sb.from('organization_users').select('organization_id').eq('user_id',session.user.id).eq('active',true).in('role',['owner','manager']).maybeSingle();if(!m)return;const{data:o}=await sb.from('organizations').select('name,logo_path').eq('id',m.organization_id).maybeSingle();apply({name:o?.name||null,logo_url:publicLogo(o?.logo_path)})}catch(e){console.warn('Branding:',e?.message||e)}}
async function kiosk(){try{const token=localStorage.getItem('onepoint_kiosk_token');if(!token){apply({});return}const r=await fetch(`${URL}/functions/v1/portal-theme-resolve`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({device_token:token})}),d=await r.json().catch(()=>({}));if(r.ok)apply({name:d.organization_name||null,logo_url:d.logo_url?`${d.logo_url}?v=${Date.now()}`:null})}catch(e){console.warn('Branding:',e?.message||e)}}
window.onePointApplyBranding=(logo_url,name)=>apply({logo_url:logo_url||null,name:name??current.name});
window.onePointRefreshClockBranding=clock;
if(isClock){
 document.body.classList.add('opClockNoSide');kiosk();
 let n=0;const t=setInterval(()=>{clock();if(++n>=24)clearInterval(t)},250);
 document.addEventListener('click',()=>{setTimeout(clock,80);setTimeout(clock,350);setTimeout(clock,900)},true);
}else setTimeout(portal,200);
})();
