(()=>{
  const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const token=new URLSearchParams(location.search).get('token')||'';
  const btn=document.querySelector('#acceptInvite');
  const status=document.querySelector('#inviteStatus');
  const p1=document.querySelector('#newPassword');
  const p2=document.querySelector('#confirmPassword');

  function show(message,type='error'){
    status.textContent=message;
    status.className=`statusLine show ${type}`;
  }

  if(!token){
    btn.disabled=true;
    show('This invitation link is missing its secure token. Ask the sender to resend the invitation.');
  }

  btn?.addEventListener('click',async()=>{
    const password=p1.value;
    const confirm=p2.value;
    if(password.length<10)return show('Use a password with at least 10 characters.');
    if(password!==confirm)return show('The passwords do not match.');

    const old=btn.textContent;
    btn.disabled=true;
    btn.textContent='Activating account…';
    try{
      const res=await fetch(`${SUPABASE_URL}/functions/v1/account-access`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({action:'accept_invitation',token,password})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok||data.error)throw new Error(data.error||'Unable to accept invitation.');
      show(`Account activated${data.organization_name?' for '+data.organization_name:''}. Redirecting to sign in…`,'success');
      setTimeout(()=>location.href=data.portal||'/owner',1200);
    }catch(err){
      show(err?.message||String(err));
      btn.disabled=false;
      btn.textContent=old;
    }
  });
})();