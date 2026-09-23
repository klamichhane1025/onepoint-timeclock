(()=>{
const params=new URLSearchParams(location.search);if(params.get('widget')!=='1')return;
document.documentElement.classList.add('opKioskWidgetMode');document.body?.classList.add('opKioskWidgetMode');
const css=document.createElement('style');css.id='opKioskWidgetModeCss';css.textContent=`
html.opKioskWidgetMode,body.opKioskWidgetMode{background:#08111d!important;color:#f5f7fb!important;overflow:hidden}
body.opKioskWidgetMode .app{display:block!important;min-height:100vh;background:transparent!important}
body.opKioskWidgetMode .side,body.opKioskWidgetMode .top{display:none!important}
body.opKioskWidgetMode .main{margin:0!important;width:100%!important;min-height:100vh!important;background:transparent!important}
body.opKioskWidgetMode .content{padding:0!important;max-width:none!important;min-height:100vh!important;background:transparent!important}
body.opKioskWidgetMode .clockWrap{min-height:100vh!important;padding:14px!important;display:grid!important;place-items:center!important;background:radial-gradient(circle at 80% 0%,rgba(33,150,243,.18),transparent 36%),linear-gradient(160deg,#10243a 0%,#0a1522 55%,#07101a 100%)!important}
body.opKioskWidgetMode .clock{width:100%!important;max-width:430px!important;margin:0!important;padding:22px 22px 18px!important;border-radius:24px!important;border:1px solid rgba(120,180,255,.26)!important;background:linear-gradient(160deg,rgba(17,38,61,.98),rgba(7,17,29,.99))!important;box-shadow:0 20px 50px rgba(0,0,0,.42)!important;color:#f7f9fc!important}
body.opKioskWidgetMode .kHero{display:block!important;margin:0 0 12px!important;padding:0!important;background:transparent!important;border:0!important;text-align:left!important}
body.opKioskWidgetMode .kLogoMount{display:none!important}
body.opKioskWidgetMode .kStore{font-size:25px!important;line-height:1.15!important;letter-spacing:-.025em!important;color:#fff!important;text-align:left!important;margin:0!important}
body.opKioskWidgetMode .kTrusted{margin:0 0 14px!important;padding:4px 8px!important;font-size:10px!important;background:rgba(52,199,89,.14)!important;color:#8df0a9!important}
body.opKioskWidgetMode .clock .time{font-size:36px!important;line-height:1!important;text-align:left!important;color:#fff!important;letter-spacing:-.04em!important;margin-top:8px!important}
body.opKioskWidgetMode .clock .date{font-size:13px!important;text-align:left!important;color:rgba(255,255,255,.58)!important;margin:5px 0 18px!important;font-weight:600!important}
body.opKioskWidgetMode .kFields{max-width:none!important;gap:11px!important;margin:0!important}
body.opKioskWidgetMode .kFields .field{text-align:left!important;margin:0!important}
body.opKioskWidgetMode .kFields label{display:none!important}
body.opKioskWidgetMode .kFields input{width:100%!important;height:56px!important;border-radius:14px!important;border:1px solid rgba(255,255,255,.16)!important;background:rgba(255,255,255,.07)!important;color:#fff!important;font-size:20px!important;text-align:left!important;padding:0 16px!important;letter-spacing:.02em!important;box-sizing:border-box!important;outline:none!important}
body.opKioskWidgetMode .kFields input:focus{border-color:#5eb5ff!important;box-shadow:0 0 0 3px rgba(67,156,255,.16)!important}
body.opKioskWidgetMode #kEmployee::placeholder{color:rgba(255,255,255,.40)!important}
body.opKioskWidgetMode #kPin::placeholder{color:rgba(255,255,255,.40)!important}
body.opKioskWidgetMode .kPunches{max-width:none!important;gap:10px!important;margin:14px 0 0!important}
body.opKioskWidgetMode .kPunches .btn{height:58px!important;border-radius:14px!important;font-size:17px!important;font-weight:760!important;border:0!important;box-shadow:none!important}
body.opKioskWidgetMode .kPunches .clockInAction{background:#12bf63!important;color:#fff!important}
body.opKioskWidgetMode .kPunches .clockOutAction{background:#cf3941!important;color:#fff!important}
body.opKioskWidgetMode .kClockFooter{margin:14px 0 0!important;padding-top:12px!important;border-top:1px solid rgba(255,255,255,.10)!important;color:rgba(255,255,255,.42)!important}
body.opKioskWidgetMode .kFooterBrand{color:rgba(255,255,255,.45)!important}
body.opKioskWidgetMode .kSetupDisabled{display:none!important}
body.opKioskWidgetMode .notice{background:rgba(255,180,0,.11)!important;border-color:rgba(255,180,0,.24)!important;color:#ffd98c!important}
body.opKioskWidgetMode .toast{z-index:100000!important}
body.opKioskWidgetMode .drawer.modal{z-index:100001!important}
body.opKioskWidgetMode .back{z-index:100000!important}
@media(max-height:640px){body.opKioskWidgetMode .clock{padding:17px!important}.opKioskWidgetMode .clock .time{font-size:30px!important}.opKioskWidgetMode .clock .date{margin-bottom:12px!important}.opKioskWidgetMode .kFields input{height:50px!important}.opKioskWidgetMode .kPunches .btn{height:52px!important}.opKioskWidgetMode .kClockFooter{margin-top:10px!important}}
`;
document.head.appendChild(css);
function decorate(){const emp=document.querySelector('#kEmployee'),pin=document.querySelector('#kPin');if(emp&&!emp.dataset.widgetDecorated){emp.placeholder='Employee ID';emp.dataset.widgetDecorated='1'}if(pin&&!pin.dataset.widgetDecorated){pin.placeholder='PIN';pin.dataset.widgetDecorated='1';pin.setAttribute('inputmode','text');pin.setAttribute('autocapitalize','off');pin.setAttribute('autocorrect','off');pin.setAttribute('spellcheck','false')}}
new MutationObserver(decorate).observe(document.documentElement,{childList:true,subtree:true});decorate();
})();