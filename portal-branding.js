(()=>{
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const path=location.pathname.replace(/\/+$/,'');
if(!['/owner','/manager','/timeclock'].includes(path))return;
const sb=window.onePointSupabase||window.supabase?.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const publicLogo=p=>p?`${URL}/storage/v1/object/public/organization-branding/${p}?v=${Date.now()}`:null;
let current={logo_url:null,name:null};
function sidebar(){const b=document.querySelector('.side .brand');if(!b)return;const img=current.logo_url?`<img class="opBrandLogo" src="${current.logo_url}" alt="${(current.name||'Business').replaceAll('"','&quot;')} logo">`:'';b.classList.add('opBusinessBrand');b.innerHTML=`${img}<div class="opOnePointLabel">OnePoint<small>Time & Attendance</small></div>`}
function clock(){document.body.classList.add('opClockNoSide');const c=document.querySelector('.clock');if(!c)return;let h=c.querySelector('.opClockBrandHeader');if(!h){h=document.createElement('div');h.className='opClockBrandHeader';c.prepend(h)}const visual=current.logo_url?`<img class="opBrandLogo" src="${current.logo_url}" alt="${(current.name||'Business').replaceAll('"','&quot;')} logo">`:`<div class="opClockFallback">OnePoint</div>`;h.innerHTML=`<div class="opClockOnePoint">ONEPOINT TIME CLOCK</div>${visual}${current.name?`<div class="opClockBusiness">${current.name.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')}</div>`:''}`}
function apply(data){current={...current,...data};if(path==='/timeclock')clock();else sidebar()}
async function portal(){try{if(!sb)return;const{data:{session}}=await sb.auth.getSession();if(!session)return;const{data:m}=await sb.from('organization_users').select('organization_id').eq('user_id',session.user.id).eq('active',true).in('role',['owner','manager']).maybeSingle();if(!m)return;const{data:o}=await sb.from('organizations').select('name,logo_path').eq('id',m.organization_id).maybeSingle();apply({name:o?.name||null,logo_url:publicLogo(o?.logo_path)})}catch(e){console.warn('Branding:',e?.message||e)}}
async function kiosk(){try{const token=localStorage.getItem('onepoint_kiosk_token');if(!token){apply({});return}const r=await fetch(`${URL}/functions/v1/portal-theme-resolve`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({device_token:token})}),d=await r.json().catch(()=>({}));if(r.ok)apply({name:d.organization_name||null,logo_url:d.logo_url?`${d.logo_url}?v=${Date.now()}`:null})}catch(e){console.warn('Branding:',e?.message||e)}}
window.onePointApplyBranding=(logo_url,name)=>apply({logo_url:logo_url||null,name:name??current.name});
if(path==='/timeclock'){
 document.body.classList.add('opClockNoSide');kiosk();
 let n=0;const t=setInterval(()=>{clock();if(++n>=24)clearInterval(t)},250);
 document.addEventListener('click',()=>{setTimeout(clock,80);setTimeout(clock,350);setTimeout(clock,900)},true);
}else setTimeout(portal,200);
})();