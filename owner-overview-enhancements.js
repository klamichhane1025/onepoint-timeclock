(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
function decorateTiles(){for(const tile of $$('.opPeriodTile')){if(tile.dataset.opPeriodDecorated==='1')continue;const date=tile.querySelector('.date');if(!date)continue;const period=date.textContent.replace(/^Latest completed:\s*/i,'').trim();const top=document.createElement('div');top.className='opShownPeriod';top.style.cssText='font-size:12px;font-weight:700;color:var(--op-accent-text,#1E3A8A);background:var(--op-accent-soft,#DBEAFE);border-radius:9px;padding:7px 9px;margin-bottom:10px';top.textContent=`Payroll shown: ${period}`;tile.prepend(top);date.textContent=`Recent payroll period: ${period}`;date.style.marginTop='12px';date.style.paddingTop='10px';date.style.borderTop='1px solid var(--color-border-soft,#E2E8F0)';tile.appendChild(date);tile.dataset.opPeriodDecorated='1'}}
function enhance(){decorateTiles()}
window.addEventListener('click',e=>{const t=e.target.closest('button,[data-tab],.opPeriodTile');if(!t)return;if(t.dataset.tab==='overview'||t.id==='opBackOverview'){setTimeout(enhance,250);setTimeout(enhance,650)}},true);
setTimeout(enhance,800);setTimeout(enhance,1500);
})();