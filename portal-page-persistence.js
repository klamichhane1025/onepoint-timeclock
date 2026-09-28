(()=>{
  const path = window.location.pathname.replace(/\/+$/,'') || '/';
  if(path !== '/owner' && path !== '/manager') return;

  const storageKey = `onepoint:active-page:${path}`;
  let restored = false;

  function saveActivePage(tab) {
    if(!tab || tab === 'overview') {
      if(tab === 'overview') sessionStorage.setItem(storageKey, tab);
      return;
    }
    sessionStorage.setItem(storageKey, tab);
  }

  function restoreActivePage() {
    if(restored) return;
    const tab = sessionStorage.getItem(storageKey);
    if(!tab || tab === 'overview') {
      restored = true;
      return;
    }

    const button = document.querySelector(`#nav [data-tab="${CSS.escape(tab)}"]`);
    if(!button) return;

    restored = true;
    if(!button.classList.contains('active')) button.click();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('#nav [data-tab]');
    if(!button) return;
    saveActivePage(button.dataset.tab);
  }, true);

  const observer = new MutationObserver(restoreActivePage);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', restoreActivePage, { once: true });
  } else {
    restoreActivePage();
  }
})();
