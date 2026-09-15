(()=>{
  if(window.__onePointSecretVisibility)return;
  window.__onePointSecretVisibility=true;

  const style=document.createElement('style');
  style.textContent=`
    .opSecretWrap{position:relative;display:block}
    .opSecretWrap input{padding-right:44px!important}
    .opSecretWrap input::-ms-reveal,.opSecretWrap input::-ms-clear{display:none!important;width:0!important;height:0!important}
    .opSecretEye{position:absolute;right:5px;top:50%;transform:translateY(-50%);width:34px;height:34px;min-height:34px!important;padding:0!important;border:0!important;background:transparent!important;border-radius:8px!important;display:grid!important;place-items:center;color:var(--pup-secondary,#64748b)!important;cursor:pointer;box-shadow:none!important}
    .opSecretEye:hover{background:rgba(118,118,128,.09)!important}
    .opSecretEye:focus-visible{outline:2px solid var(--pup-blue,#0071e3);outline-offset:1px}
    .opSecretEye svg{width:19px;height:19px;pointer-events:none}
    .opPinHint{font-size:11px;color:var(--pup-secondary,#64748b);margin-top:6px;line-height:1.4}
  `;
  document.head.appendChild(style);

  const eyeOpen='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosed='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-2.1 3.2"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9"/></svg>';

  const isPin=input=>/pin/i.test(input.id||'')||input.hasAttribute('data-pin-field')||/pin/i.test(input.name||'');
  const secretSelector='input[type="password"],input[id*="pin" i],input[name*="pin" i],input[data-pin-field]';
  const toggleSelector='button,[role="button"],[data-toggle-password],[data-password-toggle],[data-toggle-pin],[data-pin-toggle],.password-toggle,.toggle-password,.pin-toggle,.toggle-pin,.show-password,.show-pin';

  function looksLikeSecretToggle(el){
    if(!el||el.classList?.contains('opSecretEye'))return false;
    const text=[
      el.getAttribute?.('aria-label'),
      el.getAttribute?.('title'),
      el.getAttribute?.('data-action'),
      el.getAttribute?.('data-toggle'),
      el.className,
      el.textContent
    ].filter(Boolean).join(' ').toLowerCase();
    return /(show|hide|view|reveal|toggle).{0,18}(password|pin)|(password|pin).{0,18}(show|hide|view|reveal|toggle)/i.test(text);
  }

  function externalToggle(input){
    const scope=input.closest('.field,.form-group,.input-group,.two')||input.parentElement;
    if(!scope)return null;
    return [...scope.querySelectorAll(toggleSelector)].find(looksLikeSecretToggle)||null;
  }

  function unwrapIfEmpty(wrap,input){
    if(!wrap||!input||wrap.querySelector('.opSecretEye'))return;
    if(wrap.children.length!==1||wrap.firstElementChild!==input)return;
    wrap.parentElement?.insertBefore(input,wrap);
    wrap.remove();
  }

  function dedupeInput(input){
    if(!input)return false;
    const wrap=input.closest('.opSecretWrap');
    if(wrap){
      const eyes=[...wrap.querySelectorAll(':scope > .opSecretEye')];
      eyes.slice(1).forEach(x=>x.remove());
      const ext=externalToggle(input);
      if(ext&&eyes[0]){
        eyes[0].remove();
        unwrapIfEmpty(wrap,input);
        input.dataset.secretEnhanced='external';
        return true;
      }
      if(eyes[0]){
        input.dataset.secretEnhanced='1';
        return true;
      }
    }
    if(externalToggle(input)){
      input.dataset.secretEnhanced='external';
      return true;
    }
    return false;
  }

  function enhanceInput(input){
    if(!input)return;
    const secret=input.type==='password'||isPin(input);
    if(!secret)return;

    if(dedupeInput(input))return;
    if(input.dataset.secretEnhanced==='1'||input.dataset.secretEnhanced==='external')return;

    if(isPin(input)&&input.type!=='password'&&input.type!=='text')input.type='password';
    const parent=input.parentElement;if(!parent)return;

    input.dataset.secretEnhanced='1';
    const wrap=document.createElement('div');wrap.className='opSecretWrap';
    parent.insertBefore(wrap,input);wrap.appendChild(input);

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='opSecretEye';
    btn.setAttribute('aria-label',isPin(input)?'Show PIN':'Show password');
    btn.title=btn.getAttribute('aria-label');
    btn.innerHTML=eyeOpen;
    wrap.appendChild(btn);

    btn.addEventListener('click',()=>{
      const showing=input.type==='text';
      input.type=showing?'password':'text';
      const label=(showing?'Show ':'Hide ')+(isPin(input)?'PIN':'password');
      btn.setAttribute('aria-label',label);
      btn.title=label;
      btn.innerHTML=showing?eyeOpen:eyeClosed;
      input.focus({preventScroll:true});
    });

    if(isPin(input)&&input.placeholder?.toLowerCase().includes('keep current')){
      const next=wrap.nextElementSibling;
      if(!next?.classList.contains('opPinHint')){
        const hint=document.createElement('div');
        hint.className='opPinHint';
        hint.textContent='Leave both PIN fields blank to keep the current PIN.';
        wrap.insertAdjacentElement('afterend',hint);
      }
    }
  }

  function enhance(root=document){
    root.querySelectorAll?.(secretSelector).forEach(enhanceInput);
  }

  function dedupeAround(root){
    if(!(root instanceof Element))return;
    if(root.matches(secretSelector))dedupeInput(root);
    root.querySelectorAll?.(secretSelector).forEach(dedupeInput);
    const field=root.closest?.('.field,.form-group,.input-group,.two');
    field?.querySelectorAll?.(secretSelector).forEach(dedupeInput);
  }

  window.onePointEnhancePinFields=enhance;
  window.onePointEnhanceSecretFields=enhance;
  enhance();

  const observer=new MutationObserver(muts=>{
    for(const m of muts){
      for(const n of m.addedNodes){
        if(n.nodeType!==1)continue;
        dedupeAround(n);
        enhanceInput(n.matches?.(secretSelector)?n:null);
        enhance(n);
      }
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();