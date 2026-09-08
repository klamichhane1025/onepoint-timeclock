(()=>{
  if(!window.supabase?.createClient) return;
  const pathname=location.pathname.replace(/\/+$/,'');
  const portal=pathname==='/admin'?'admin':pathname==='/owner'?'owner':pathname==='/manager'?'manager':null;
  if(!portal) return;
  const PROJECT_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const original=window.supabase.createClient.bind(window.supabase);
  const storageKey=`onepoint-timeclock-${portal}-auth`;
  let shared=null;
  window.supabase.createClient=(url,key,options={})=>{
    if(url!==PROJECT_URL) return original(url,key,options);
    if(shared) return shared;
    shared=original(url,key,{
      ...options,
      auth:{
        ...(options.auth||{}),
        storageKey,
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    });
    window.onePointSupabase=shared;
    return shared;
  };
})();
