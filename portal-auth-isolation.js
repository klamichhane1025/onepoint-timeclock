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

  const storageKey=`onepoint-${portal}-auth`;
  const sessionOnly=portal==='admin'||portal==='owner'||portal==='manager';
  const storage=sessionOnly?window.sessionStorage:window.localStorage;

  // Admin, Owner and Manager sessions are intentionally tab/browser-session only.
  // Remove any legacy persistent copy so reopening the site requires sign-in.
  if(sessionOnly){
    try{window.localStorage.removeItem(storageKey)}catch{}
  }

  window.__ONEPOINT_PORTAL__=portal;
  window.__ONEPOINT_AUTH_STORAGE_KEY__=storageKey;
  window.__ONEPOINT_AUTH_SESSION_ONLY__=sessionOnly;

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
