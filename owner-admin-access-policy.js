(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
document.documentElement.classList.add('onepoint-owner-portal');
const style=document.createElement('style');
style.textContent='.onepoint-owner-portal #nav [data-tab="account"]{display:none!important}';
document.head.appendChild(style);
function enforce(){const nav=document.querySelector('#nav');if(!nav)return;nav.querySelectorAll('[data-tab="account"]').forEach(x=>x.remove())}
const nav=document.querySelector('#nav');
if(nav){enforce();new MutationObserver(enforce).observe(nav,{childList:true,subtree:true})}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)enforce()});
})();