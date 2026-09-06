(()=>{
  const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});

  async function readableFunctionError(error,data){
    if(data?.error) return data.error;
    try{
      if(error?.context && typeof error.context.json==='function'){
        const body=await error.context.json();
        if(body?.error) return body.error;
        if(body?.message) return body.message;
      }
    }catch{}
    return error?.message||'Unable to send the Owner invitation.';
  }

  function polishOwnerModal(){
    const name=document.querySelector('#oiName');
    if(!name) return;
    name.required=true;
    name.placeholder='Required';
    const nameLabel=name.closest('.field')?.querySelector('label');
    if(nameLabel) nameLabel.textContent='Owner Name *';

    const email=document.querySelector('#oiEmail');
    if(email){
      email.required=true;
      const emailLabel=email.closest('.field')?.querySelector('label');
      if(emailLabel) emailLabel.textContent='Owner Email *';
    }

    const business=document.querySelector('#oiBiz');
    if(business){
      business.placeholder='Optional';
      const businessLabel=business.closest('.field')?.querySelector('label');
      if(businessLabel) businessLabel.textContent='Business / Organization (optional)';
    }

    const plan=document.querySelector('#oiPlan');
    if(plan){
      const planLabel=plan.closest('.field')?.querySelector('label');
      if(planLabel) planLabel.textContent='Plan (optional — defaults to Free)';
    }
  }

  new MutationObserver(polishOwnerModal).observe(document.body,{childList:true,subtree:true});
  polishOwnerModal();

  document.addEventListener('click',async e=>{
    const button=e.target.closest('#oiSend');
    if(!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const name=document.querySelector('#oiName')?.value?.trim()||'';
    const email=document.querySelector('#oiEmail')?.value?.trim()||'';
    const business=document.querySelector('#oiBiz')?.value?.trim()||'';
    const plan=document.querySelector('#oiPlan')?.value||'free';

    if(!name){
      window.onePointMessage?.('Owner Name is required.','Owner invitation','error');
      document.querySelector('#oiName')?.focus();
      return;
    }
    if(!email || !email.includes('@')){
      window.onePointMessage?.('A valid Owner Email is required so OnePoint can send the invitation.','Owner invitation','error');
      document.querySelector('#oiEmail')?.focus();
      return;
    }

    const old=button.textContent;
    button.disabled=true;
    button.textContent='Sending…';
    try{
      const {data,error}=await client.functions.invoke('invite-member',{body:{action:'invite_owner',email,business_name:business,display_name:name,plan}});
      if(error||data?.error){
        const message=await readableFunctionError(error,data);
        window.onePointMessage?.(message,'Owner invitation','error');
        return;
      }
      document.querySelector('#drawer')?.classList.add('hidden');
      document.querySelector('#drawer')?.classList.remove('modal');
      document.querySelector('#back')?.classList.add('hidden');
      window.onePointMessage?.(`Invitation sent to ${email}.`,'Owner invited','success');
      setTimeout(()=>location.reload(),900);
    }finally{
      button.disabled=false;
      button.textContent=old;
    }
  },true);
})();