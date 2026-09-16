(()=>{
if(window.OnePointDevicePersistence)return;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co';
const KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
const DB='onepoint-device-db',STORE='keys',ANCHOR_ID='device-anchor',KEY_ID='device-key',FILE='onepoint-device-anchor.json';
const COOKIE='onepoint_device_anchor';
function parseJson(v){try{return JSON.parse(v||'')}catch{return null}}
function lsGet(k){try{return localStorage.getItem(k)}catch{return null}}
function lsSet(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch{}}
function cookieGet(name){const m=(document.cookie||'').match(new RegExp('(?:^|;\\s*)'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'=([^;]*)'));return m?decodeURIComponent(m[1]):''}
function cookieSet(mid,secret){try{document.cookie=`${COOKIE}=${encodeURIComponent(`${mid}.${secret}`)}; Max-Age=315360000; Path=/; Domain=.onepointsystems.io; Secure; SameSite=Lax`;document.cookie='onepoint_pos_device=1; Max-Age=315360000; Path=/; Domain=.onepointsystems.io; Secure; SameSite=Lax'}catch{}}
function cookieAnchor(){const raw=cookieGet(COOKIE);if(!raw)return null;const p=raw.indexOf('.');if(p<12)return null;const machine_id=raw.slice(0,p),recovery_secret=raw.slice(p+1);return machine_id&&recovery_secret?{machine_id,recovery_secret,source:'cookie'}:null}
function openDb(){return new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(new Error('IndexedDB unavailable'));const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function readDb(id){try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).get(id);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)})}catch{return null}}
async function writeDb(row){try{const db=await openDb();return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(row);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)})}catch{return false}}
async function readFile(){try{if(!navigator.storage?.getDirectory)return null;const root=await navigator.storage.getDirectory(),fh=await root.getFileHandle(FILE),f=await fh.getFile();return parseJson(await f.text())}catch{return null}}
async function writeFile(row){try{if(!navigator.storage?.getDirectory)return false;const root=await navigator.storage.getDirectory(),fh=await root.getFileHandle(FILE,{create:true}),w=await fh.createWritable();await w.write(JSON.stringify(row));await w.close();return true}catch{return false}}
async function requestPersistentStorage(){try{if(navigator.storage?.persist)await navigator.storage.persist()}catch{} }
function uniqueCandidates(rows){const seen=new Set(),out=[];for(const r of rows){if(!r?.machine_id||!r?.recovery_secret)continue;const k=`${r.machine_id}:${r.recovery_secret}`;if(seen.has(k))continue;seen.add(k);out.push(r)}return out}
async function load(){
 const [dbAnchor,file,keyRec]=await Promise.all([readDb(ANCHOR_ID),readFile(),readDb(KEY_ID)]),store=parseJson(lsGet('onepoint_kiosk_store'));
 const local={machine_id:lsGet('onepoint_machine_id'),recovery_secret:lsGet('onepoint_recovery_secret'),device_token:lsGet('onepoint_kiosk_token'),store,source:'local'};
 const ca=cookieAnchor();
 const machine_id=local.machine_id||dbAnchor?.machine_id||file?.machine_id||ca?.machine_id||keyRec?.machine_id||'';
 const device_token=local.device_token||dbAnchor?.device_token||file?.device_token||'';
 const resolvedStore=local.store||dbAnchor?.store||file?.store||null;
 if(machine_id&&!local.machine_id)lsSet('onepoint_machine_id',machine_id);
 if(device_token&&!local.device_token)lsSet('onepoint_kiosk_token',device_token);
 if(resolvedStore&&!local.store)lsSet('onepoint_kiosk_store',JSON.stringify(resolvedStore));
 const candidates=uniqueCandidates([local,dbAnchor,file,ca]);
 return{machine_id,device_token,store:resolvedStore,candidates,key_record:keyRec,db_anchor:dbAnchor,file_anchor:file,cookie_anchor:ca}
}
async function ensureMachineId(){const s=await load();if(s.machine_id)return s.machine_id;const id=crypto.randomUUID?crypto.randomUUID():`op-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;lsSet('onepoint_machine_id',id);const base={id:ANCHOR_ID,machine_id:id,updated_at:new Date().toISOString()};await Promise.all([writeDb(base),writeFile(base)]);return id}
async function saveCredentials({machine_id,device_token,recovery_secret,store}={}){
 const current=await load(),mid=machine_id||current.machine_id||await ensureMachineId(),token=device_token===undefined?current.device_token:device_token,secret=recovery_secret===undefined?(current.candidates[0]?.recovery_secret||''):recovery_secret,resolvedStore=store===undefined?current.store:store;
 lsSet('onepoint_machine_id',mid);if(token)lsSet('onepoint_kiosk_token',token);else if(device_token===null)lsSet('onepoint_kiosk_token',null);if(secret)lsSet('onepoint_recovery_secret',secret);if(resolvedStore)lsSet('onepoint_kiosk_store',JSON.stringify(resolvedStore));
 const row={id:ANCHOR_ID,machine_id:mid,device_token:token||null,recovery_secret:secret||null,store:resolvedStore||null,updated_at:new Date().toISOString()};
 await Promise.all([writeDb(row),writeFile(row),requestPersistentStorage()]);if(secret)cookieSet(mid,secret);return row
}
async function clearToken(){lsSet('onepoint_kiosk_token',null);const s=await load(),secret=s.candidates[0]?.recovery_secret||null,row={id:ANCHOR_ID,machine_id:s.machine_id||null,device_token:null,recovery_secret:secret,store:s.store||null,updated_at:new Date().toISOString()};await Promise.all([writeDb(row),writeFile(row)]);return row}
async function callDevice(body){const r=await fetch(`${URL}/functions/v1/kiosk-device-auth`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify(body)}),d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'Trusted device verification failed.');return d}
async function callStatus(token){const r=await fetch(`${URL}/functions/v1/kiosk-access`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({action:'device_status',device_token:token})}),d=await r.json().catch(()=>({}));if(!r.ok||d.error)throw new Error(d.error||'Device status failed.');return d}
async function registerRecovery(token,mid){const d=await callDevice({action:'register_recovery',device_token:token,machine_id:mid});await saveCredentials({machine_id:mid,device_token:token,recovery_secret:d.recovery_secret});return d}
async function recover(){const s=await load();for(const a of s.candidates){try{const d=await callDevice({action:'recover_secret',machine_id:a.machine_id,recovery_secret:a.recovery_secret});await saveCredentials({machine_id:a.machine_id,device_token:d.device_token,recovery_secret:a.recovery_secret,store:d.store||s.store});return d}catch{}}return null}
async function adoptCurrentDevice(){const s=await load(),token=s.device_token||lsGet('onepoint_kiosk_token')||'';if(token.length<32)return null;const mid=s.machine_id||await ensureMachineId();let valid;try{valid=await callStatus(token)}catch{return null}const existing=s.candidates.find(x=>x.machine_id===mid);if(existing){await saveCredentials({machine_id:mid,device_token:token,recovery_secret:existing.recovery_secret,store:valid.store||s.store});return{ok:true,store:valid.store,recovery_existing:true}}const d=await registerRecovery(token,mid);await saveCredentials({machine_id:mid,device_token:token,recovery_secret:d.recovery_secret,store:valid.store||s.store});return{ok:true,store:valid.store,recovery_registered:true}}
async function bootstrap(){await requestPersistentStorage();const s=await load();if(s.device_token?.length>=32){try{const d=await callStatus(s.device_token);await saveCredentials({machine_id:s.machine_id||await ensureMachineId(),device_token:s.device_token,store:d.store||s.store});if(!s.candidates.length)await registerRecovery(s.device_token,s.machine_id||await ensureMachineId());return d}catch{await clearToken()}}
 const d=await recover();return d}
window.OnePointDevicePersistence={load,ensureMachineId,saveCredentials,clearToken,recover,adoptCurrentDevice,requestPersistentStorage,readDb,writeDb,readFile,writeFile};
window.onePointDeviceReady=bootstrap().catch(e=>{console.warn('OnePoint persistent-device bootstrap:',e);return null});
let tries=0;const timer=setInterval(async()=>{if(++tries>20)return clearInterval(timer);try{const s=await load();if(s.device_token?.length>=32&&!s.candidates.length){const ok=await adoptCurrentDevice();if(ok)clearInterval(timer)}}catch{}},750);
})();