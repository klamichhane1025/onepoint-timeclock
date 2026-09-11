(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
document.documentElement.classList.add('onepoint-owner-portal');
const style=document.createElement('style');
style.textContent='.onepoint-owner-portal #nav [data-tab="account"]{display:none!important}';
document.head.appendChild(style);
function enforce(){const nav=document.querySelector('#nav');if(!nav)return false;nav.querySelectorAll('[data-tab="account"]').forEach(x=>x.remove());return true}
let checks=0;const timer=setInterval(()=>{checks++;enforce();if(checks>=40)clearInterval(timer)},250);
document.addEventListener('click',()=>setTimeout(enforce,0),true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(enforce,0)});
})();