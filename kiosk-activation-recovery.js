(()=>{
  if(window.__onePointKioskActivationRecovery)return;
  window.__onePointKioskActivationRecovery=true;
  const URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  let checking=false;
  const home=()=>location.hostname==='cashier.onepointsystems.io'?'/':'/timeclock/';
  async function status(){
    const token=localStorage.getItem('onepoint_kiosk_token')||'';
    if(token.length<32)return null;
    try{
      const r=await fetch(`${URL}/functions/v1/kiosk-access`,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY},body:JSON.stringify({action:'device_status',device_token:token})});
      const d=await r.json().catch(()=>({}));
      return r.ok&&!d.error&&d.ok?d:null;
    }catch{return null}
  }
  function looksLikeFalseFailure(){
    const host=document.querySelector('#onepointMessageHost');
    if(!host||host.classList.contains('hidden'))return false;
    const text=(host.querySelector('#opMessageText')?.textContent||'').toLowerCase();
    return text.includes('unexpected server error')||text.includes('something prevented')||text.includes('could not add')||text.includes('unable to activate')||text.includes('unable to register')||text.includes('could not complete this request');
  }
  async function recover(){
    if(checking||!looksLikeFalseFailure())return;
    checking=true;
    try{
      const d=await status();
      if(!d)return;
      const host=document.querySelector('#onepointMessageHost');if(!host)return;
      const title=host.querySelector('#opMessageTitle'),text=host.querySelector('#opMessageText'),icon=host.querySelector('#opMessageIcon'),ok=host.querySelector('#opMessageOk');
      if(title)title.textContent='Device Registered';
      if(text)text.textContent=`${d.store?.name||'This location'} is already registered on this POS. The earlier error happened after the device registration completed.`;
      if(icon){icon.textContent='✓';icon.className='opMessageIcon success'}
      if(ok){ok.textContent='Open Time Clock';ok.onclick=()=>location.href=home()}
    }finally{checking=false}
  }
  const obs=new MutationObserver(()=>setTimeout(recover,0));
  obs.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  addEventListener('focus',recover);
  setTimeout(recover,500);
})();