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
  api.createClient=(url,key,options={})=>{
    const auth={...(options.auth||{})};
    if(!auth.storageKey) auth.storageKey=storageKey;
    return original(url,key,{...options,auth});
  };
  api.__onepointIsolated=true;
})();
