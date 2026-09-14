(()=>{
if(location.pathname.replace(/\/+$/,'')!=='/owner')return;
if(document.getElementById('opCompactPayrollFields'))return;
const s=document.createElement('style');s.id='opCompactPayrollFields';s.textContent=`
.opCompactPayrollFilters{display:flex!important;align-items:flex-end!important;gap:10px!important;flex-wrap:wrap!important}.opCompactPayrollFilters .field{flex:0 0 auto!important;margin:0!important}.opCompactPayrollFilters #v4RangeMode{width:190px!important;min-width:190px!important}.opCompactPayrollFilters #v4Start,.opCompactPayrollFilters #v4End,#opCheckStart,#opCheckEnd{width:148px!important;min-width:148px!important;max-width:148px!important}.opCompactPayrollFilters #v4Job{width:175px!important;min-width:150px!important;max-width:210px!important}
#teInDate,#teOutDate{width:148px!important;min-width:148px!important;max-width:148px!important}#teInTime,#teOutTime{width:112px!important;min-width:112px!important;max-width:112px!important}#teReason{width:min(320px,100%)!important;min-height:68px!important;max-width:320px!important;resize:vertical!important}
.opPunchEditor input[type="datetime-local"]{width:178px!important;min-width:178px!important;max-width:178px!important}.opPunchEditor .opPunchReason{width:150px!important;min-width:120px!important;max-width:180px!important}.opPunchEditor select{width:auto!important;min-width:110px!important;max-width:180px!important}
#opRateAmount,#opSvPayRate,#opSharedPayRate{width:115px!important;min-width:115px!important;max-width:115px!important}#opRateType,#opSvPayType,#opSharedPayType{width:125px!important;min-width:125px!important;max-width:125px!important}
@media(max-width:620px){.opCompactPayrollFilters{align-items:stretch!important}.opCompactPayrollFilters .field{flex:1 1 145px!important}.opCompactPayrollFilters #v4RangeMode,.opCompactPayrollFilters #v4Start,.opCompactPayrollFilters #v4End,.opCompactPayrollFilters #v4Job,#opCheckStart,#opCheckEnd{max-width:100%!important;min-width:0!important;width:100%!important}}
`;
document.head.appendChild(s);
})();