(()=>{
  const path=location.pathname.replace(/\/+$/,'');
  if(!['/owner','/manager','/admin'].includes(path)||window.__onePointOverviewTileLinks)return;
  window.__onePointOverviewTileLinks=true;
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const style=document.createElement('style');
  style.textContent=`.opOverviewLinkedTile{cursor:pointer!important;outline:none;position:relative}.opOverviewLinkedTile:focus-visible{box-shadow:0 0 0 3px color-mix(in srgb,var(--op-accent,#1d4ed8) 24%,transparent)!important;border-color:var(--op-accent,#1d4ed8)!important}.opTileLinkHint{margin-top:12px;padding-top:10px;border-top:1px solid rgba(118,118,128,.16);display:flex;justify-content:flex-end;align-items:center;gap:5px;color:var(--op-accent,#1d4ed8);font-size:12px;font-weight:750;pointer-events:none}.opTileLinkHint span{font-size:15px;line-height:1}`;
  document.head.appendChild(style);
  function tiles(){return[...$$('.opPeriodTile[data-store],.mgPeriodTile[data-store],.apTile.clickable[data-ap-store]')]}
  function decorate(){for(const tile of tiles()){if(tile.dataset.opLinkReady==='1')continue;tile.dataset.opLinkReady='1';tile.classList.add('opOverviewLinkedTile');tile.setAttribute('role','button');if(!tile.hasAttribute('tabindex'))tile.tabIndex=0;if(!tile.querySelector(':scope>.opTileLinkHint')){const h=document.createElement('div');h.className='opTileLinkHint';h.innerHTML='View payroll <span>→</span>';tile.appendChild(h)}}}
  const content=$('#content');if(content){const observer=new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n instanceof Element&&(n.matches?.('.opPeriodTile,.mgPeriodTile,.apTile')||n.querySelector?.('.opPeriodTile,.mgPeriodTile,.apTile')))))requestAnimationFrame(decorate)});observer.observe(content,{subtree:true,childList:true})}
  document.addEventListener('click',e=>{if(e.target.closest('#nav button,[data-tab],[data-aw-tab],#opBackOverview,#mgBackOverview'))setTimeout(decorate,120)},true);
  setTimeout(decorate,650);
  window.onePointOverviewTileLinks={refresh:decorate};
})();
