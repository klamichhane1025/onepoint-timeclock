(()=>{
  const tenantEmployees = new Map();
  const seedTenant = 'Krishna Retail Group';
  tenantEmployees.set(seedTenant, {
    ids: new Set(['1047','1051','1063']),
    names: new Set(['jackie smith','kevin jones','maria lopez'])
  });

  function tenantKey(){
    return document.querySelector('#who b')?.textContent?.trim() || 'anonymous';
  }

  function registry(){
    const key = tenantKey();
    if(!tenantEmployees.has(key)) tenantEmployees.set(key,{ids:new Set(),names:new Set()});
    return tenantEmployees.get(key);
  }

  function markLocationFieldsOptional(){
    const nameInput=document.querySelector('#sName');
    const codeInput=document.querySelector('#sId');
    const addressInput=document.querySelector('#sAddress');
    if(!codeInput) return;

    codeInput.setAttribute('pattern','[A-Za-z0-9]+');
    codeInput.setAttribute('placeholder','e.g. DFW7 or STORE01');

    const nameLabel=nameInput?.closest('.field')?.querySelector('label');
    const addressLabel=addressInput?.closest('.field')?.querySelector('label');
    const codeLabel=codeInput.closest('.field')?.querySelector('label');

    if(nameLabel) nameLabel.textContent='Location Name (optional)';
    if(addressLabel) addressLabel.textContent='Address (optional)';
    if(codeLabel) codeLabel.textContent='Location Code';
  }

  const observer=new MutationObserver(markLocationFieldsOptional);
  observer.observe(document.body,{childList:true,subtree:true});

  document.addEventListener('click',e=>{
    const employeeButton=e.target.closest('#saveEmp');
    if(employeeButton){
      const id=document.querySelector('#eId')?.value?.trim();
      const name=document.querySelector('#eName')?.value?.trim();
      if(!id||!name) return;
      const normalized=name.replace(/\s+/g,' ').trim().toLowerCase();
      const r=registry();
      if(r.ids.has(id)){
        e.preventDefault();
        e.stopImmediatePropagation();
        alert(`Employee ID ${id} already exists under this owner. Employee IDs must be unique within an owner account.`);
        return;
      }
      if(r.names.has(normalized)){
        e.preventDefault();
        e.stopImmediatePropagation();
        alert(`${name} already exists under this owner. Employee names must be unique within an owner account.`);
        return;
      }
      setTimeout(()=>{
        const visibleSuccess=document.querySelector('#toast.show')?.textContent||'';
        if(visibleSuccess.toLowerCase().includes('employee created')){
          r.ids.add(id);
          r.names.add(normalized);
        }
      },0);
      return;
    }

    const locationButton=e.target.closest('#saveStore');
    if(locationButton){
      const codeInput=document.querySelector('#sId');
      const nameInput=document.querySelector('#sName');
      const addressInput=document.querySelector('#sAddress');
      const code=codeInput?.value?.trim()||'';

      if(!code){
        e.preventDefault();
        e.stopImmediatePropagation();
        alert('Enter a location code. Location name and address are optional.');
        return;
      }

      if(!/^[A-Za-z0-9]+$/.test(code)){
        e.preventDefault();
        e.stopImmediatePropagation();
        alert('Location code can contain letters and numbers only.');
        return;
      }

      // The current mock's underlying location creator expects non-empty values.
      // Supply display-safe defaults so name/address remain optional to the user.
      if(nameInput && !nameInput.value.trim()) nameInput.value=code.toUpperCase();
      if(addressInput && !addressInput.value.trim()) addressInput.value='No address';
    }
  },true);

  markLocationFieldsOptional();
})();
