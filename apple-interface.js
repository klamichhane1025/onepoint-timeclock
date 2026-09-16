(()=>{
if(window.__onePointAppleInterface)return;window.__onePointAppleInterface=true;
const content=document.querySelector('#content');if(!content)return;
const unwanted=[
 'Owned and shared locations are listed together. Purple/Shared labels identify partner locations.',
 'POS browsers registered for employee clock access. Machine ID is a OnePoint-generated device identifier; web browsers do not expose the physical MAC address.'
];
const norm=s=>String(s||'').replace(/\s+/g,' ').trim().toLowerCase();
let observer=null,running=false,raf=0;
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
  const firstCard=content.querySelector(':scope > .card')||content.querySelector('.card');firstCard?.classList.add('opApplePrimaryCard');
 }finally{
  running=false;observer?.observe(content,{childList:true,subtree:true,characterData:true});
 }
}
function schedule(){cancelAnimationFrame(raf);raf=requestAnimationFrame(clean)}
observer=new MutationObserver(schedule);observer.observe(content,{childList:true,subtree:true,characterData:true});
document.addEventListener('click',e=>{if(e.target.closest('#nav button,[data-tab],[data-aw-tab]'))setTimeout(schedule,80)},true);
setTimeout(clean,50);setTimeout(clean,500);
window.onePointAppleInterface={refresh:schedule};
})();
