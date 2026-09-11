(()=>{
  const ACK=/^(ok|close|done|got it|dismiss)$/i;
  function visible(el){
    if(!el)return false;
    const s=getComputedStyle(el);
    return s.display!=='none'&&s.visibility!=='hidden'&&!el.disabled&&el.offsetParent!==null;
  }
  function policyClick(ev){
    const back=ev.target.closest?.('#back');
    if(!back||ev.target!==back)return;
    const drawer=document.querySelector('#drawer');
    if(!drawer||drawer.classList.contains('hidden'))return;

    // Always take ownership of backdrop clicks so older modal code cannot
    // accidentally close a form underneath this policy.
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    const hasEditable=!!drawer.querySelector('input:not([type="hidden"]),select,textarea,[contenteditable="true"],form');
    if(hasEditable)return;

    const buttons=[...drawer.querySelectorAll('button,a.btn')].filter(visible);
    const ackButtons=buttons.filter(b=>ACK.test((b.textContent||'').trim()));

    // Read-only informational dialogs may be dismissed by clicking outside,
    // but only when there is exactly one acknowledgement action and no other
    // competing action that could be triggered accidentally.
    if(buttons.length===1&&ackButtons.length===1){
      ackButtons[0].click();
    }
  }

  // Capture phase is intentional: several legacy modules attach bubbling
  // backdrop handlers that previously closed drawers unconditionally.
  document.addEventListener('click',policyClick,true);

  // Escape follows the same safety rule: never discard editable progress.
  document.addEventListener('keydown',ev=>{
    if(ev.key!=='Escape')return;
    const drawer=document.querySelector('#drawer');
    if(!drawer||drawer.classList.contains('hidden'))return;
    const hasEditable=!!drawer.querySelector('input:not([type="hidden"]),select,textarea,[contenteditable="true"],form');
    if(hasEditable){ev.preventDefault();ev.stopImmediatePropagation();return;}
    const buttons=[...drawer.querySelectorAll('button,a.btn')].filter(visible);
    const ack=buttons.filter(b=>ACK.test((b.textContent||'').trim()));
    if(buttons.length===1&&ack.length===1){ev.preventDefault();ev.stopImmediatePropagation();ack[0].click();}
  },true);
})();