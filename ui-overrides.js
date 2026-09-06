(()=>{
  const SUPABASE_URL='https://eomgnaulupqiwjzcimqt.supabase.co';
  const SUPABASE_KEY='sb_publishable_p20lJcecq2HN7trRTDMW8Q_iCYVnQsM';

  const style=document.createElement('style');
  style.textContent=`
    .opMessageHost{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px}
    .opMessageHost.hidden{display:none!important}
    .opMessageBackdrop{position:absolute;inset:0;background:rgba(15,23,42,.42);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .opMessageCard{position:relative;width:min(440px,92vw);background:#fff;border:1px solid #e5e7eb;border-radius:20px;padding:28px;box-shadow:0 28px 80px rgba(15,23,42,.28);text-align:center}
    .opMessageCard h3{margin:12px 0 8px;font-size:22px}
    .opMessageCard p{margin:0 0 20px;color:#6b7280;line-height:1.5;font-size:14px;white-space:pre-wrap}
    .opMessageCard .btn{min-width:120px}
    .opMessageIcon{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;margin:0 auto;font-size:24px;font-weight:800}
    .opMessageIcon.error{background:#fef2f2;color:#b91c1c}
    .opMessageIcon.success{background:#ecfdf5;color:#15803d}
  `;
  document.head.appendChild(style);

  function ensureMessageHost(){
    let host=document.querySelector('#onepointMessageHost');
    if(host) return host;
    host=document.createElement('div');
    host.id='onepointMessageHost';
    host.className='opMessageHost hidden';
    host.innerHTML=`<div class="opMessageBackdrop"></div><div class="opMessageCard" role="dialog" aria-modal="true"><div class="opMessageIcon error" id="opMessageIcon">!</div><h3 id="opMessageTitle">Message</h3><p id="opMessageText"></p><button class="btn primary" id="opMessageOk">OK</button></div>`;
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

  function addBootstrapField(){
    if(location.pathname.replace(/\/+$/,'')!=='/admin') return;
    const signup=document.querySelector('#signup');
    if(!signup || document.querySelector('#bootstrapCode')) return;
    const field=document.createElement('div');
    field.className='field';
    field.style.marginTop='12px';
    field.innerHTML='<label>One-time Admin activation code</label><input id="bootstrapCode" type="password" autocomplete="off" placeholder="Enter activation code">';
    signup.parentNode.insertBefore(field,signup);
  }

  window.onePointMessage=showMessage;
  window.alert=(message)=>showMessage(message,'OnePoint','error');

  new MutationObserver(addBootstrapField).observe(document.body,{childList:true,subtree:true});
  addBootstrapField();

  document.addEventListener('click',async e=>{
    const signup=e.target.closest('#signup');
    if(!signup || location.pathname.replace(/\/+$/,'')!=='/admin') return;
    e.preventDefault();
    e.stopImmediatePropagation();

    const email=document.querySelector('#email')?.value?.trim()||'';
    const password=document.querySelector('#password')?.value||'';
    const bootstrapCode=document.querySelector('#bootstrapCode')?.value?.trim()||'';
    if(!email || !email.includes('@')) return showMessage('Enter a valid admin email address.','Admin account');
    if(password.length<8) return showMessage('Use a password with at least 8 characters.','Admin account');
    if(!bootstrapCode) return showMessage('Enter the one-time Admin activation code.','Admin account');

    const oldText=signup.textContent;
    signup.disabled=true;
    signup.textContent='Creating Admin…';
    try{
      const res=await fetch(`${SUPABASE_URL}/functions/v1/bootstrap-admin`,{
        method:'POST',
        headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY},
        body:JSON.stringify({email,password,bootstrap_code:bootstrapCode})
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
