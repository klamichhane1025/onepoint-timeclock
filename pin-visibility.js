(()=>{
  const style=document.createElement('style');
  style.textContent=`.opPinWrap{position:relative}.opPinWrap input{padding-right:46px}.opPinEye{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;background:transparent;border-radius:8px;display:grid;place-items:center;color:#475569;cursor:pointer}.opPinEye:hover{background:#f1f5f9}.opPinEye svg{width:20px;height:20px}.opPinHint{font-size:11px;color:#64748b;margin-top:6px;line-height:1.4}`;
  document.head.appendChild(style);
  const eyeOpen='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeClosed='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-2.1 3.2"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.5 8 10 8a9.8 9.8 0 0 0 4.1-.9"/></svg>';
  function enhance(root=document){
    root.querySelectorAll('input[id$="Pin"],input[data-pin-field]').forEach(input=>{
      if(input.dataset.pinEnhanced==='1')return;
      input.dataset.pinEnhanced='1';
      const parent=input.parentElement;if(!parent)return;
      const wrap=document.createElement('div');wrap.className='opPinWrap';
      parent.insertBefore(wrap,input);wrap.appendChild(input);
      const btn=document.createElement('button');btn.type='button';btn.className='opPinEye';btn.setAttribute('aria-label','Show PIN');btn.title='Show PIN';btn.innerHTML=eyeOpen;wrap.appendChild(btn);
      btn.addEventListener('click',()=>{const showing=input.type==='text';input.type=showing?'password':'text';btn.setAttribute('aria-label',showing?'Show PIN':'Hide PIN');btn.title=showing?'Show PIN':'Hide PIN';btn.innerHTML=showing?eyeOpen:eyeClosed;input.focus()});
      if(input.placeholder?.toLowerCase().includes('keep current')){
        const hint=document.createElement('div');hint.className='opPinHint';hint.textContent='Saved PINs are securely hashed and cannot be displayed. Enter a new PIN here only if you want to reset it.';wrap.insertAdjacentElement('afterend',hint);
      }
    });
  }
  window.onePointEnhancePinFields=enhance;
  enhance();
  document.addEventListener('click',e=>{
    if(e.target.closest('#v2AddEmp,.v2EditEmp,#addEmp,.editEmp,[data-employee-edit]'))setTimeout(()=>enhance(),0);
  },false);
})();