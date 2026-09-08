(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(path!=='/owner'&&path!=='/manager')return;
const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co',SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
document.addEventListener('click',async e=>{const b=e.target.closest('#logout');if(!b)return;e.preventDefault();e.stopImmediatePropagation();b.disabled=true;try{await sb.auth.signOut()}finally{location.href=path==='manager'?'/manager/':'/owner/'}},true);
let tries=0;
const timer=setInterval(()=>{
 tries++;
 const sign=document.querySelector('#signin');
 if(sign){
   document.querySelector('#magic')?.remove();
   const note=[...document.querySelectorAll('.login .muted')].find(x=>x.textContent.includes('Forgot password?'));
   if(note)note.textContent='Use the password created from your OnePoint invitation. If you cannot access the account, contact your Owner or Platform Admin.';
   clearInterval(timer);
 }
 if(tries>=80)clearInterval(timer);
},125);
})();