(()=>{
 const path=location.pathname.replace(/\/+$/,'')||'/';
 if(!['/owner','/manager','/admin'].includes(path))return;
 const key=`onepoint:active-page:${path}`;
 let restoring=false,timer=0;
 const tabOf=b=>b?.dataset?.mfaTab||b?.dataset?.awTab||b?.dataset?.tab||'';
 const selector=tab=>`#nav [data-mfa-tab="${CSS.escape(tab)}"],#nav [data-aw-tab="${CSS.escape(tab)}"],#nav [data-tab="${CSS.escape(tab)}"]`;
 function save(tab){if(tab)sessionStorage.setItem(key,tab)}
 function restore(){
  if(restoring)return;
  const tab=sessionStorage.getItem(key);if(!tab)return;
  const target=document.querySelector(selector(tab));if(!target)return;
  const active=document.querySelector('#nav button.active');
  if(tabOf(active)===tab)return;
  restoring=true;
  try{target.click()}finally{setTimeout(()=>{restoring=false},0)}
 }
 document.addEventListener('click',e=>{const b=e.target.closest('#nav [data-tab],#nav [data-mfa-tab],#nav [data-aw-tab]');if(!b||restoring)return;save(tabOf(b))},true);
 const nav=document.querySelector('#nav');
 if(nav)new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(restore,40)}).observe(nav,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-tab','data-mfa-tab','data-aw-tab']});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(restore,80),{once:true});else setTimeout(restore,80);
 window.onePointPageState={save,restore,key};
})();