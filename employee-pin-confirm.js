(()=>{
  if(window.__onePointEmployeePinConfirm)return;
  window.__onePointEmployeePinConfirm=true;
  const style=document.createElement('style');
  style.textContent=`.opPinConfirmStatus{min-height:18px;margin-top:6px;font-size:11px;font-weight:700}.opPinConfirmStatus.match{color:#16803d}.opPinConfirmStatus.mismatch{color:#c1272d}.opPinConfirmStatus.wait{color:var(--pup-secondary,#6e6e73)}`;
  document.head.appendChild(style);
  const selectors=['#oePin','#awePin'];
  function config(pin){
    const field=pin.closest('.field')||pin.parentElement;
    const label=(field?.querySelector('label')?.textContent||'').toLowerCase();
    return{field,optional:/optional|leave blank|keep current/.test(label),confirmId:pin.id+'Confirm'};
  }
  function status(pin,confirm,statusEl){
    const a=pin.value.trim(),b=confirm.value.trim(),optional=config(pin).optional;
    statusEl.className='opPinConfirmStatus';
    if(!a&&!b&&optional){statusEl.textContent='Leave both blank to keep the current PIN.';statusEl.classList.add('wait');return true}
    if(!a&&!b){statusEl.textContent='';return false}
    if(!/^\d{4,8}$/.test(a)){statusEl.textContent='PIN must be 4–8 digits.';statusEl.classList.add('mismatch');return false}
    if(!b){statusEl.textContent='Re-enter the PIN to confirm.';statusEl.classList.add('wait');return false}
    if(a===b){statusEl.textContent='✓ Match';statusEl.classList.add('match');return true}
    statusEl.textContent='✕ Not matched';statusEl.classList.add('mismatch');return false
  }
  function enhance(pin){
    if(!pin||pin.dataset.pinConfirmEnhanced==='1')return;
    pin.dataset.pinConfirmEnhanced='1';
    const c=config(pin);if(!c.field)return;
    const confirmField=document.createElement('div');confirmField.className='field opPinConfirmField';
    const required=c.optional?'':' *';
    confirmField.innerHTML=`<label for="${c.confirmId}">${c.optional?'Confirm New PIN':'Confirm PIN'}${required}</label><input id="${c.confirmId}" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" data-pin-field><div class="opPinConfirmStatus" role="status" aria-live="polite"></div>`;
    c.field.insertAdjacentElement('afterend',confirmField);
    const confirm=confirmField.querySelector('input'),statusEl=confirmField.querySelector('.opPinConfirmStatus');
    const update=()=>status(pin,confirm,statusEl);pin.addEventListener('input',update);confirm.addEventListener('input',update);pin.addEventListener('blur',update);confirm.addEventListener('blur',update);update();
    window.onePointEnhanceSecretFields?.(confirmField);
  }
  function scan(root=document){selectors.forEach(s=>root.querySelector?.(s)&&enhance(root.querySelector(s)))}
  function validateForSave(target){
    const id=target?.id;if(!['oeSave','aweSave'].includes(id))return true;
    const pin=document.querySelector(id==='oeSave'?'#oePin':'#awePin');if(!pin)return true;
    const c=config(pin),confirm=document.getElementById(c.confirmId),statusEl=confirm?.parentElement?.querySelector('.opPinConfirmStatus');if(!confirm||!statusEl)return false;
    const ok=status(pin,confirm,statusEl);
    if(ok)return true;
    const a=pin.value.trim();if(c.optional&&!a&&!confirm.value.trim())return true;
    window.onePointMessage?.('Enter the PIN twice and make sure both entries match.','Employee PIN','error');
    (confirm.value?pin:confirm).focus();return false;
  }
  document.addEventListener('click',e=>{const b=e.target.closest('#oeSave,#aweSave');if(b&&!validateForSave(b)){e.preventDefault();e.stopImmediatePropagation()}},true);
  const observer=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1)scan(n)});observer.observe(document.documentElement,{subtree:true,childList:true});scan();
})();