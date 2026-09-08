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
  else if(path==='/timeclock/activate') portal=new URLSearchParams(location.search).get('portal')==='manager'?'manager':'owner';
  const storageKey=`onepoint-${portal}-auth`;
  window.__ONEPOINT_PORTAL__=portal;
  window.__ONEPOINT_AUTH_STORAGE_KEY__=storageKey;
  let sharedClient=null;
  let sharedUrl=null;
  let sharedKey=null;
  api.createClient=(url,key,options={})=>{
    if(sharedClient&&url===sharedUrl&&key===sharedKey)return sharedClient;
    const auth={...(options.auth||{}),storageKey,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true};
    const client=original(url,key,{...options,auth});
    if(!sharedClient){sharedClient=client;sharedUrl=url;sharedKey=key;window.onePointSupabase=client;}
    return client;
  };
  api.__onepointIsolated=true;
})();
