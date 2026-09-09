(()=>{
  const style=document.createElement('style');
  style.textContent=`.dbStatusLine{display:flex;align-items:center;gap:7px;margin-top:6px;font-size:12px}.dbDot{width:9px;height:9px;border-radius:50%;display:inline-block;background:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,.12)}.dbDot.ok{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.14)}.dbDot.bad{background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.14)}.dbDot.checking{background:#f59e0b;box-shadow:0 0 0 3px rgba(245,158,11,.14)}`;
  document.head.appendChild(style);
  const host=document.querySelector('#dbConnectionStatus');
  if(!host)return;
  const dot=host.querySelector('.dbDot'),text=host.querySelector('[data-db-text]');
  const set=(state,label)=>{if(dot)dot.className='dbDot '+state;if(text)text.textContent=label;host.title=`Database ${label.toLowerCase()}`};
  async function check(){
    if(!navigator.onLine){set('bad','Offline');return}
    set('checking','Checking…');
    try{
      const sb=window.onePointSupabase;
      if(!sb){set('bad','Unavailable');return}
      const {error}=await sb.from('organizations').select('id').limit(1);
      if(error&&/failed to fetch|network/i.test(String(error.message||error))){set('bad','Disconnected');return}
      set('ok','Connected');
    }catch{set('bad','Disconnected')}
  }
  window.addEventListener('online',check);
  window.addEventListener('offline',()=>set('bad','Offline'));
  check();
  setInterval(check,60000);
})();