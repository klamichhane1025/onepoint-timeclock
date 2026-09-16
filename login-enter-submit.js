(()=>{
if(window.__onePointLoginEnterSubmit)return;
window.__onePointLoginEnterSubmit=true;
const submitFor={password:'#signin',kaPassword:'#kaSign',kaaPassword:'#kaaSign'};
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.isComposing||e.repeat)return;
  const input=e.target;
  if(!(input instanceof HTMLInputElement))return;
  const selector=submitFor[input.id];
  if(!selector)return;
  const button=document.querySelector(selector);
  if(!button||button.disabled)return;
  e.preventDefault();
  button.click();
},true);
})();
