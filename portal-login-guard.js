(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(path!=='/owner'&&path!=='/manager')return;
const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co',SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
async function redirectPlatformAdmin(){try{const {data:{session}}=await sb.auth.getSession();if(!session)return false;const {data:adm,error}=await sb.from('platform_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();if(error)return false;if(adm){location.replace('/admin/');return true}}catch{}return false}
redirectPlatformAdmin();
document.addEventListener('click',async e=>{const b=e.target.closest('#logout');if(!b)return;e.preventDefault();e.stopImmediatePropagation();b.disabled=true;try{await sb.auth.signOut()}finally{location.href=path==='manager'?'/manager/':'/owner/'}},true);
let tries=0;
const timer=setInterval(async()=>{
 tries++;
 if(await redirectPlatformAdmin()){clearInterval(timer);return}
 const sign=document.querySelector('#signin');
 if(sign){
   document.querySelector('#magic')?.remove();
   const note=[...document.querySelectorAll('.login .muted')].find(x=>x.textContent.includes('Forgot password?'));
   if(note)note.textContent='Use the password created from your OnePoint invitation. If you cannot access the account, contact your Owner or Platform Admin.';
   clearInterval(timer);
 }
 if(tries>=40)clearInterval(timer);
},150);
})();