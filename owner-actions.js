(()=>{
  const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
  const show=(m,t='OnePoint',type='error')=>window.onePointMessage?window.onePointMessage(m,t,type):alert(m);
  const closeLocation=()=>{
    document.querySelector('#drawer')?.classList.add('hidden');
    document.querySelector('#drawer')?.classList.remove('modal');
    document.querySelector('#back')?.classList.add('hidden');
  };

  document.addEventListener('click',async e=>{
    const cancel=e.target.closest('#cancel');
    if(cancel && document.querySelector('#sCode')){
      e.preventDefault();
      e.stopImmediatePropagation();
      closeLocation();
      return;
    }

    const save=e.target.closest('#sSave');
    if(!save) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const code=(document.querySelector('#sCode')?.value||'').trim().toUpperCase();
    const name=(document.querySelector('#sName')?.value||'').trim();
    const address=(document.querySelector('#sAddress')?.value||'').trim();
    const logic=document.querySelector('input[name="logic"]:checked')?.value||'dfw';
    if(!/^[A-Z0-9]+$/.test(code)){
      show('Location code is required and can contain letters and numbers only.','Add Location');
      document.querySelector('#sCode')?.focus();
      return;
    }

    const {data:{session}}=await sb.auth.getSession();
    if(!session){ show('Your session has expired. Sign in again.','Add Location'); return; }

    const {data:members,error:memberError}=await sb.from('organization_users').select('organization_id,role,active').eq('user_id',session.user.id).eq('active',true);
    if(memberError || !members?.length){ show(memberError?.message||'Owner account was not found.','Add Location'); return; }
    const membership=members.find(x=>x.role==='owner')||members[0];
    if(membership.role!=='owner'){ show('Only the Owner can add locations.','Add Location'); return; }

    const old=save.textContent;
    save.disabled=true;
    save.textContent='Adding…';
    try{
      const {error}=await sb.from('stores').insert({
        organization_id:membership.organization_id,
        store_code:code,
        name:name||null,
        address:address||null,
        payroll_logic:logic,
        timezone:'America/Chicago',
        active:true
      });
      if(error) throw error;
      closeLocation();
      show('Location added successfully.','Location added','success');
      setTimeout(()=>location.reload(),500);
    }catch(err){
      show(err?.message||String(err),'Add Location');
    }finally{
      save.disabled=false;
      save.textContent=old;
    }
  },true);
})();