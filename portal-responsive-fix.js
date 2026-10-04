(()=>{
 const path=location.pathname.replace(/\/+$/,'');
 if(!['/owner','/manager','/admin'].includes(path))return;
 const close=()=>{document.body.classList.remove('opNavOpen');sync()};
 let backdrop;
 function sync(){
  if(!backdrop)return;
  const open=document.body.classList.contains('opNavOpen')&&matchMedia('(max-width:920px)').matches;
  backdrop.hidden=!open;
  const toggle=document.querySelector('#opPupNavToggle');
  if(toggle){toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation')}
 }
 function setup(){
  if(!backdrop){
   backdrop=document.createElement('button');
   backdrop.type='button';backdrop.className='opMobileNavBackdrop';
   backdrop.setAttribute('aria-label','Close navigation');backdrop.hidden=true;
   backdrop.addEventListener('click',close);
   document.body.appendChild(backdrop);
  }
  sync();
 }
 document.addEventListener('click',event=>{
  if(event.target.closest('#nav button')){close();return}
  if(event.target.closest('#opPupNavToggle'))queueMicrotask(sync);
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close()},true);
 addEventListener('resize',()=>{if(innerWidth>920)close();else sync()},{passive:true});
 // Legacy layouts can leave the drawer-open flag in a new viewport.
 close();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
