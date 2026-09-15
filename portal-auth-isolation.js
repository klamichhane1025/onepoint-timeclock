(()=>{
  const api=window.supabase;
  if(!api?.createClient||api.__onepointIsolated)return;
  const original=api.createClient.bind(api);
  const path=location.pathname.replace(/\/+$/,'')||'/';
  let portal='shared';
  if(path==='/admin') portal='admin';
  else if(path==='/owner') portal='owner';
  else if(path==='/manager') portal='manager';
  else if(path==='/accept-invite') portal='invite';
  else if(path==='/timeclock/activate'){
    const requested=new URLSearchParams(location.search).get('portal');
    portal=requested==='admin'?'admin':requested==='manager'?'manager':'owner';
  }

  const protectedPortal=['admin','owner','manager'].includes(portal);
  const cookiePos=/(?:^|;\s*)onepoint_pos_device=1(?:;|$)/.test(document.cookie||'');
  let localPos=false;
  try{localPos=Boolean(window.localStorage.getItem('onepoint_kiosk_token')||window.localStorage.getItem('onepoint_machine_id'))}catch{}
  const posDevice=protectedPortal&&(cookiePos||localPos);
  const storageKey=`onepoint-${portal}-auth`;
  const persistentHumanPortal=!posDevice&&(portal==='owner'||portal==='manager');
  const sessionOnly=protectedPortal&&!persistentHumanPortal;
  const storage=sessionOnly?window.sessionStorage:window.localStorage;
  const navType=performance.getEntriesByType?.('navigation')?.[0]?.type||'navigate';

  if(protectedPortal){
    if(posDevice){
      // Registered POS devices never keep a persistent human portal session.
      try{window.localStorage.removeItem(storageKey)}catch{}
      // A fresh navigation into a portal requires a fresh login. A plain reload
      // is allowed so the user is not logged out while actively using the portal.
      if(navType!=='reload'){
        try{window.sessionStorage.removeItem(storageKey)}catch{}
      }
    }else if(persistentHumanPortal){
      // Migrate the previous tab-only Owner/Manager session once, then keep it
      // in localStorage so Supabase refresh-token rotation can maintain login.
      try{
        const legacy=window.sessionStorage.getItem(storageKey);
        if(legacy&&!window.localStorage.getItem(storageKey))window.localStorage.setItem(storageKey,legacy);
        window.sessionStorage.removeItem(storageKey);
      }catch{}
    }else{
      // Platform Admin remains browser-session scoped on non-POS devices.
      try{window.localStorage.removeItem(storageKey)}catch{}
    }
  }

  window.__ONEPOINT_PORTAL__=portal;
  window.__ONEPOINT_AUTH_STORAGE_KEY__=storageKey;
  window.__ONEPOINT_AUTH_SESSION_ONLY__=sessionOnly;
  window.__ONEPOINT_POS_DEVICE__=posDevice;

  let sharedClient=null;
  let sharedUrl=null;
  let sharedKey=null;
  api.createClient=(url,key,options={})=>{
    if(sharedClient&&url===sharedUrl&&key===sharedKey)return sharedClient;
    const auth={
      ...(options.auth||{}),
      storage,
      storageKey,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    };
    const client=original(url,key,{...options,auth});
    if(!sharedClient){
      sharedClient=client;
      sharedUrl=url;
      sharedKey=key;
      window.onePointSupabase=client;
    }
    return client;
  };
  api.__onepointIsolated=true;
})();
