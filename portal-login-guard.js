(()=>{
const path=location.pathname.replace(/\/+$/,'');
if(path!=='/owner'&&path!=='/manager')return;
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
 if(tries>=40)clearInterval(timer);
},125);
})();