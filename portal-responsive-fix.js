(()=>{ 
 const path=location.pathname.replace(/\/+$/,'');
 if(!['/owner','/manager','/admin'].includes(path))return;
 let backdrop=null,lastWidth=innerWidth;
 const mobile=()=>matchMedia('(max-width:920px)').matches;
 const drawerOpen=()=>{const d=document.querySelector('#drawer'),b=document.querySelector('#back');return !!(d&&!d.classList.contains('hidden')&&b&&!b.classList.contains('hidden'))};
 function ensureBackdrop(){
  if(backdrop?.isConnected)return backdrop;
  backdrop=document.querySelector('.opMobileNavBackdrop');
  if(!backdrop){
   backdrop=document.createElement('button');
   backdrop.type='button';
   backdrop.className='opMobileNavBackdrop';
   backdrop.setAttribute('aria-label','Close navigation');
   document.body.appendChild(backdrop);
  }
  backdrop.addEventListener('click',closeNav,{once:false});
  return backdrop;
 }
 function sync(){
  ensureBackdrop();
  const open=mobile()&&document.body.classList.contains('opNavOpen');
  backdrop.hidden=!open;
  const toggle=document.querySelector('#opPupNavToggle');
  if(toggle){
   toggle.setAttribute('aria-expanded',String(open));
   toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
  }
  if(!mobile())document.body.classList.remove('opNavOpen');
 }
 function closeNav(){
  document.body.classList.remove('opNavOpen');
  sync();
 }
 function normalize(){
  ensureBackdrop();
  if(!mobile())closeNav();
  if(mobile()&&!document.querySelector('.side'))closeNav();
  if(mobile()&&drawerOpen())closeNav();
  sync();
 }
 document.addEventListener('click',e=>{
  const nav=e.target.closest('#nav button');
  if(nav){closeNav();return}
  if(e.target.closest('#opPupNavToggle')){
   requestAnimationFrame(sync);
   return;
  }
  if(mobile()&&document.body.classList.contains('opNavOpen')&&!e.target.closest('.side')&&!e.target.closest('#opPupNavToggle'))closeNav();
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeNav()},true);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)normalize()});
 addEventListener('pageshow',normalize);
 addEventListener('orientationchange',()=>setTimeout(normalize,60),{passive:true});
 addEventListener('resize',()=>{
  const crossed=(lastWidth<=920&&innerWidth>920)||(lastWidth>920&&innerWidth<=920);
  lastWidth=innerWidth;
  if(crossed)closeNav();else sync();
 },{passive:true});
 const mo=new MutationObserver(()=>{
  if(mobile()&&drawerOpen()&&document.body.classList.contains('opNavOpen'))closeNav();
  else sync();
 });
 mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 document.body.classList.remove('opNavOpen');
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalize,{once:true});else normalize();
})();