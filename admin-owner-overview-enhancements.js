(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/admin')return;
const $$=s=>[...document.querySelectorAll(s)];
function decorate(){for(const tile of $$('.adPeriodTile')){if(tile.dataset.opPeriodDecorated==='1')continue;const date=tile.querySelector('.date');if(!date)continue;const period=date.textContent.replace(/^Latest completed:\s*/i,'').trim();const top=document.createElement('div');top.style.cssText='font-size:12px;font-weight:700;color:#1E3A8A;background:#DBEAFE;border-radius:9px;padding:7px 9px;margin-bottom:10px';top.textContent=`Payroll shown: ${period}`;tile.prepend(top);date.textContent=`Recent payroll period: ${period}`;date.style.marginTop='12px';date.style.paddingTop='10px';date.style.borderTop='1px solid var(--color-border-soft,#E2E8F0)';tile.appendChild(date);tile.dataset.opPeriodDecorated='1'}}
document.addEventListener('click',e=>{if(e.target.closest('.awOpen,#nav [data-aw-tab="overview"],#adBackOverview')){setTimeout(decorate,250);setTimeout(decorate,700)}},true);setTimeout(decorate,1400);
})();
