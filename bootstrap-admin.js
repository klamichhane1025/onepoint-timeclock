(()=>{
  const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});

  document.addEventListener('click',async e=>{
    const button=e.target.closest('#signup');
    if(!button) return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const email=document.querySelector('#email')?.value?.trim()||'';
    const password=document.querySelector('#password')?.value||'';
    if(!email||!email.includes('@')) return alert('Enter a valid admin email address.');
    if(password.length<8) return alert('Use a password with at least 8 characters.');

    const bootstrapCode=prompt('Enter the one-time Platform Admin bootstrap code:');
    if(bootstrapCode===null) return;

    button.disabled=true;
    button.textContent='Creating Admin…';
    try{
      const response=await fetch(`${SUPABASE_URL}/functions/v1/bootstrap-admin`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({email,password,bootstrap_code:bootstrapCode.trim()})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.error||'Unable to create Platform Admin');

      const {error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error;
      location.href='/admin';
    }catch(err){
      alert(err?.message||'Unable to create Platform Admin');
      button.disabled=false;
      button.textContent='Create Initial Admin Account';
    }
  },true);
})();