(()=>{
  if(window.__onePointLiveWorkforce)return;
  window.__onePointLiveWorkforce=true;
  const path=location.pathname.replace(/\/+$/,'');
  if(!['/owner','/manager'].includes(path))return;
  const URL='https://eomgnaulupqiwjzcimqt.supabase.co',KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const sb=window.onePointSupabase||window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const $=s=>document.querySelector(s);
  const style=document.createElement('style');style.textContent=`.opLiveCountCard{border-color:rgba(22,128,61,.18)!important;background:linear-gradient(180deg,rgba(236,253,243,.76),rgba(255,255,255,.96))!important}.opLiveCountCard span{display:flex;align-items:center;gap:7px}.opLiveCountCard span:before{content:'';width:8px;height:8px;border-radius:50%;background:#16803d;box-shadow:0 0 0 5px rgba(22,128,61,.10)}.opLiveCountCard b{color:#166534}`;document.head.appendChild(style);
  let count=0,loading=false,channel=null,renderTimer=null,lastLoad=0;
  function onOverview(){return!!$('#nav [data-tab="overview"].active')}
  function render(){if(!onOverview()){$('.opLiveCountCard')?.remove();return}const grid=$('#content>.grid4')||$('#content .grid4');if(!grid)return;let card=grid.querySelector('.opLiveCountCard');if(!card){card=document.createElement('div');card.className='card metric opLiveCountCard';grid.prepend(card)}card.innerHTML=`<span>Clocked In Now</span><b>${count}</b><div class="muted">employee${count===1?'':'s'} currently clocked in</div>`}
  async function loadCount(force=false){if(loading)return;if(!force&&Date.now()-lastLoad<10000){render();return}loading=true;try{const{data,error}=await sb.from('time_entries').select('employee_id').is('actual_clock_out',null).eq('is_void',false).eq('missed_clock_out',false);if(error)throw error;count=new Set((data||[]).map(x=>x.employee_id).filter(Boolean)).size;lastLoad=Date.now();render()}catch(e){console.warn('Live clock-in count:',e?.message||e)}finally{loading=false}}
  function schedule(force=false,ms=90){clearTimeout(renderTimer);renderTimer=setTimeout(()=>loadCount(force),ms)}
  function subscribe(){if(channel)return;channel=sb.channel(`onepoint-live-count-${path.replace('/','')}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'time_entries'},()=>schedule(true,50)).subscribe()}
  document.addEventListener('click',e=>{if(e.target.closest('#nav button'))setTimeout(()=>{render();if(onOverview())schedule(false,0)},180)},true);
  const content=$('#content');if(content){const observer=new MutationObserver(ms=>{if(!onOverview())return;const relevant=ms.some(m=>[...m.addedNodes].some(n=>n instanceof Element&&(n.matches?.('.grid4')||n.querySelector?.('.grid4'))));if(relevant)setTimeout(render,0)});observer.observe(content,{childList:true,subtree:true})}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&onOverview())schedule(Date.now()-lastLoad>30000,80)});
  setTimeout(()=>{schedule(true,0);subscribe()},650);
  window.onePointLiveWorkforce={refresh:()=>loadCount(true),render};
})();
