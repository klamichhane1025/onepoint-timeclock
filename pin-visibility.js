(()=>{
  if(window.__onePointSecretVisibility)return;
  window.__onePointSecretVisibility=true;
  const style=document.createElement('style');
  style.textContent=`.opSecretWrap{position:relative;display:block}.opSecretWrap input{padding-right:44px!important}.opSecretEye{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:34px;height:34px;min-height:34px!important;padding:0!important;border:0!important;background:transparent!important;border-radius:8px!important;display:grid!important;place-items:center;color:var(--pup-secondary,#64748b)!important;cursor:pointer;box-shadow:none!important}.opSecretEye:hover{background:rgba(118,118,128,.09)!important}.opSecretEye:focus-visible{outline:2px solid var(--pup-blue,#0071e3);outline-offset:1px}.opSecretEye svg{width:19px;height:19px;pointer-events:none}.opPinHint{font-size:11px;color:var(--pup-secondary,#64748b);margin-top:6px;line-height:1.4}`;
  document.head.appendChild(style);
  const eyeOpen='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosed='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-2.1 3.2"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9"/></svg>';
  const isPin=input=>/pin/i.test(input.id||'')||input.hasAttribute('data-pin-field')||/pin/i.test(input.name||'');
  function enhanceInput(input){
    if(!input||input.dataset.secretEnhanced==='1')return;
    const secret=input.type==='password'||isPin(input);
    if(!secret)return;
    input.dataset.secretEnhanced='1';
    if(isPin(input)&&input.type!=='password'&&input.type!=='text')input.type='password';
    const parent=input.parentElement;if(!parent)return;
    const wrap=document.createElement('div');wrap.className='opSecretWrap';
    parent.insertBefore(wrap,input);wrap.appendChild(input);
    const btn=document.createElement('button');btn.type='button';btn.className='opSecretEye';btn.setAttribute('aria-label',isPin(input)?'Show PIN':'Show password');btn.title=btn.getAttribute('aria-label');btn.innerHTML=eyeOpen;wrap.appendChild(btn);
    btn.addEventListener('click',()=>{const showing=input.type==='text';input.type=showing?'password':'text';const label=(showing?'Show ':'Hide ')+(isPin(input)?'PIN':'password');btn.setAttribute('aria-label',label);btn.title=label;btn.innerHTML=showing?eyeOpen:eyeClosed;input.focus({preventScroll:true})});
    if(isPin(input)&&input.placeholder?.toLowerCase().includes('keep current')){
      const hint=document.createElement('div');hint.className='opPinHint';hint.textContent='Leave both PIN fields blank to keep the current PIN.';wrap.insertAdjacentElement('afterend',hint);
    }
  }
  function enhance(root=document){
    root.querySelectorAll?.('input[type="password"],input[id*="pin" i],input[name*="pin" i],input[data-pin-field]').forEach(enhanceInput);
  }
  window.onePointEnhancePinFields=enhance;
  window.onePointEnhanceSecretFields=enhance;
  enhance();
  const observer=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1){enhanceInput(n.matches?.('input[type="password"],input[id*="pin" i],input[name*="pin" i],input[data-pin-field]')?n:null);enhance(n)}});
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();