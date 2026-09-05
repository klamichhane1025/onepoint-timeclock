(()=>{
  const portal = new URLSearchParams(window.location.search).get('portal');
  if(!portal) return;

  const click = selector => document.querySelector(selector)?.click();

  if(portal === 'admin') {
    click('#adminTab');
    document.querySelector('#loginId')?.focus();
    return;
  }

  if(portal === 'owner') {
    click('#ownerTab');
    document.querySelector('#loginId')?.focus();
    return;
  }

  if(portal === 'manager') {
    click('#ownerTab');
    const id = document.querySelector('#loginId');
    if(id) id.value = 'manager1';
    document.querySelector('#loginPw')?.focus();
    return;
  }

  if(portal === 'timeclock') {
    click('#openClock');
  }
})();
