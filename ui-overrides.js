(()=>{
  const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';
  const BOOTSTRAP_CODE='OP-A983BBCA1FC045A0';

  function ensureMessageHost(){
    let host=document.querySelector('#onepointMessageHost');
    if(host) return host;
    host=document.createElement('div');
    host.id='onepointMessageHost';
    host.className='opMessageHost hidden';
    host.innerHTML=`<div class="opMessageBackdrop"></div><div class="opMessageCard" role="dialog" aria-modal="true"><div class="opMessageIcon" id="opMessageIcon">!</div><h3 id="opMessageTitle">Message</h3><p id="opMessageText"></p><button class="btn primary" id="opMessageOk">OK</button></div>`;
    document.body.appendChild(host);
    host.querySelector('#opMessageOk').onclick=()=>host.classList.add('hidden');
    host.querySelector('.opMessageBackdrop').onclick=()=>host.classList.add('hidden');
    return host;
  }

  function showMessage(message,title='OnePoint',type='error'){
    const host=ensureMessageHost();
    host.querySelector('#opMessageTitle').textContent=title;
    host.querySelector('#opMessageText').textContent=String(message||'Something went wrong.');
    const icon=host.querySelector('#opMessageIcon');
    icon.textContent=type==='success'?'✓':'!';
    icon.className=`opMessageIcon ${type==='success'?'success':'error'}`;
    host.classList.remove('hidden');
    host.querySelector('#opMessageOk').focus();
  }

  window.onePointMessage=showMessage;
  window.alert=(message)=>showMessage(message,'OnePoint','error');

  document.addEventListener('click',async e=>{
    const signup=e.target.closest('#signup');
    if(!signup || location.pathname.replace(/\/+$/,'')!=='/admin') return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const email=document.querySelector('#email')?.value?.trim()||'';
    const password=document.querySelector('#password')?.value||'';
    if(!email || !email.includes('@')) return showMessage('Enter a valid admin email address.','Admin account');
    if(password.length<8) return showMessage('Use a password with at least 8 characters.','Admin account');

    const oldText=signup.textContent;
    signup.disabled=true;
    signup.textContent='Creating Admin…';
    try{
      const res=await fetch(`${SUPABASE_URL}/functions/v1/bootstrap-admin`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({email,password,bootstrap_code:BOOTSTRAP_CODE})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok || data.error) throw new Error(data.error||'Unable to create the Platform Admin account.');

      const sbClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true}});
      const {error}=await sbClient.auth.signInWithPassword({email,password});
      if(error) throw error;
      showMessage('Platform Admin created and activated. You are being signed in now.','Admin activated','success');
      setTimeout(()=>location.href='/admin/',900);
    }catch(err){
      showMessage(err?.message||String(err),'Admin account');
    }finally{
      signup.disabled=false;
      signup.textContent=oldText;
    }
  },true);
})();
