(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(n)||0);
function payLabel(e){if(!e.base_pay_type||e.base_pay_rate==null)return'No base pay set';return e.base_pay_type==='hourly'?`${money(e.base_pay_rate)}/hr`:`${money(e.base_pay_rate)}/mo`}
async function apply(){
 try{
  const active=document.querySelector('#nav [data-tab="employees"].active');if(!active)return;
  const {data:{session}}=await sb.auth.getSession();if(!session)return;
  const {data:m}=await sb.from('organization_users').select('organization_id').eq('user_id',session.user.id).eq('role','owner').eq('active',true).maybeSingle();if(!m)return;
  const {data:employees,error}=await sb.from('employees').select('employee_number,base_pay_type,base_pay_rate').eq('organization_id',m.organization_id).eq('status','active');if(error)throw error;
  const byNumber=new Map((employees||[]).map(e=>[String(e.employee_number),e]));
  document.querySelectorAll('#content .list > .row').forEach(row=>{const muted=[...row.querySelectorAll('.muted')].find(x=>/Employee\s+#?\d+/i.test(x.textContent||''));if(!muted)return;const match=(muted.textContent||'').match(/Employee\s+#?(\d+)/i);if(!match)return;const e=byNumber.get(match[1]);if(!e)return;const old=muted.querySelector('.opBasePay');if(old)old.remove();const span=document.createElement('span');span.className='opBasePay';span.textContent=` · Base Pay: ${payLabel(e)}`;muted.appendChild(span)});
 }catch(e){console.warn('Employee pay display:',e?.message||e)}
}
document.addEventListener('click',e=>{if(e.target.closest('#nav [data-tab="employees"],.v2EditEmp,#v2ESave'))setTimeout(apply,420)},false);
setTimeout(apply,900);
})();