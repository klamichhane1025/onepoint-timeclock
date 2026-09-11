(()=>{
const path=location.pathname.replace(/\/+$/,'');if(path!=='/owner'&&path!=='/manager')return;
const sb=window.onePointSupabase;if(!sb)return;
const role=path.slice(1);
async function check(){const{data:{session}}=await sb.auth.getSession();if(!session)return;const{data:m}=await sb.from('organization_users').select('organization_id,role,active,organizations(status,portal_access_active)').eq('user_id',session.user.id).eq('role',role).eq('active',true).maybeSingle();if(!m)return;const o=m.organizations;if(o?.status==='archived'||o?.portal_access_active===false){await sb.auth.signOut();document.body.innerHTML='<main style="max-width:520px;margin:12vh auto;padding:32px;font-family:Inter,system-ui,sans-serif"><h1>Access Paused</h1><p style="color:#64748b;line-height:1.6">This organization’s Owner/Manager portal access is currently disabled. Historical payroll and employee time records are preserved.</p><a href="/'+role+'/" style="display:inline-block;margin-top:14px">Return to sign in</a></main>';}}
setTimeout(check,300);sb.auth.onAuthStateChange(e=>{if(e==='SIGNED_IN')setTimeout(check,150)});
})();