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

  document.addEventListener('click',e=>{
    const button=e.target.closest('#saveEmp');
    if(!button) return;
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
  },true);
})();
