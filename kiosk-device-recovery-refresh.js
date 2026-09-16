(()=>{
if(window.__onePointRecoveryRefreshLoaded)return;window.__onePointRecoveryRefreshLoaded=true;
const URL='https://eomgnaulupqiwjzcimqt.supabase.co';
const KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
async function refresh(){
 const p=window.OnePointDevicePersistence;if(!p)return null;
 try{await Promise.resolve(window.onePointDeviceReady)}catch{}
 const s=await p.load();
 const token=String(s?.device_token||'').trim(),machineId=String(s?.machine_id||s?.key_record?.machine_id||'').trim();
 if(token.length<32||machineId.length<12)return null;
 const r=await fetch(`${URL}/functions/v1/kiosk-device-auth`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({action:'register_recovery',device_token:token,machine_id:machineId})});
 const d=await r.json().catch(()=>({}));
 if(!r.ok||d.error)throw new Error(d.error||'Unable to refresh trusted-device recovery.');
 await p.saveCredentials({machine_id:machineId,device_token:token,recovery_secret:d.recovery_secret,store:s.store||undefined});
 await p.requestPersistentStorage?.();
 return{ok:true,machine_id:machineId};
}
window.onePointRecoveryRefreshReady=refresh().catch(e=>{console.warn('OnePoint trusted-device recovery refresh:',e);return null});
})();