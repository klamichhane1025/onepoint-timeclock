const CACHE='onepoint-timeclock-offline-v1';
const CORE=[
  '/',
  '/timeclock/',
  '/styles.css',
  '/enterprise-theme-v2.css',
  '/portal-theme.css',
  '/portal-branding.css?v=20260916-2',
  '/puppertino-platform.css?v=20260914-1',
  '/apple-interface.css?v=20260916-3',
  '/production.js',
  '/ui-messages.js',
  '/pin-visibility.js?v=20260914-3',
  '/employee-pin-alphanumeric.js?v=20260916-2',
  '/portal-theme.js',
  '/portal-branding.js?v=20260916-2',
  '/kiosk-widget-mode.js?v=20260923-1',
  '/kiosk-device-persistence.js?v=20260916-3',
  '/kiosk-device-recovery-refresh.js?v=20260916-1',
  '/kiosk-browser-link.js?v=20260916-1',
  '/kiosk.js?v=20260923-2',
  '/puppertino-platform.js?v=20260914-1',
  '/apple-interface.js?v=20260916-3'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of CORE){try{await cache.add(url)}catch{}}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('onepoint-timeclock-offline-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        const cache=await caches.open(CACHE);
        cache.put('/',fresh.clone()).catch(()=>{});
        return fresh;
      }catch{
        return (await caches.match(req)) || (await caches.match('/')) || (await caches.match('/timeclock/'));
      }
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    if(cached){
      fetch(req).then(async fresh=>{if(fresh?.ok){const cache=await caches.open(CACHE);cache.put(req,fresh.clone()).catch(()=>{})}}).catch(()=>{});
      return cached;
    }
    try{
      const fresh=await fetch(req);
      if(fresh?.ok){const cache=await caches.open(CACHE);cache.put(req,fresh.clone()).catch(()=>{})}
      return fresh;
    }catch{
      return new Response('',{status:504,statusText:'Offline'});
    }
  })());
});
