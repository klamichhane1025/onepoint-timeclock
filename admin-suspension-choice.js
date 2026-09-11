(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/admin')return;
function localNow(){const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,16)}
function decorate(){
 const at=document.querySelector('#awbSuspendAt'),schedule=document.querySelector('#awbSchedule'),resume=document.querySelector('#awbResume');
 if(!at||!schedule||!resume)return false;
 resume.textContent='Do Not Suspend / Resume';
 schedule.textContent='Schedule Suspension';
 const card=at.closest('.card');if(!card||card.querySelector('#awSuspendChoiceBar'))return true;
 const bar=document.createElement('div');bar.id='awSuspendChoiceBar';bar.className='card section';bar.innerHTML='<h3>Business Suspension Control</h3><p class="muted">Platform Admin controls whether this business is active, suspended now, or scheduled to suspend later.</p><div class="actions"><button class="btn danger" id="awSuspendNow">Suspend Now</button><button class="btn primary" id="awKeepActive">Do Not Suspend / Resume</button><button class="btn secondary" id="awChooseSchedule">Schedule Suspension</button></div>';
 card.insertBefore(bar,at.closest('.field'));
 return true;
}
function refreshSoon(){setTimeout(decorate,0);setTimeout(decorate,120);setTimeout(decorate,400)}
let n=0,t=setInterval(()=>{n++;decorate();if(n>=40)clearInterval(t)},250);
document.addEventListener('click',e=>{
 const b=e.target.closest('button,[data-aw-tab]');if(!b)return;
 if(b.id==='awSuspendNow'){
   const at=document.querySelector('#awbSuspendAt'),schedule=document.querySelector('#awbSchedule');
   if(at&&schedule){at.value=localNow();schedule.click()}
   return;
 }
 if(b.id==='awKeepActive'){document.querySelector('#awbResume')?.click();return}
 if(b.id==='awChooseSchedule'){
   const at=document.querySelector('#awbSuspendAt');if(at){at.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>at.focus(),250)}
   return;
 }
 refreshSoon();
},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshSoon()});
})();