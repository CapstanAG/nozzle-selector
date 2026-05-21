// --------- Application State, Events & Startup ---------
// Recalc & render
function recalc(){
  const appType = $('appType').value;
  const rate = getRateUS();
  const spacingIn = getSpacingInches();
  const valve = VALVES[$('valveFamily').value];
  const sg = toNum($('sg').value, 1.0);
  let Pb = displayToPsi($('customPb').value);
  if(!(Pb>0)) Pb = toNum($('boomPsi').value, 40);
  const vmax = getVmaxMph();
  const dcMin = Math.max(0, Math.min(1, toNum($('dcmin').value, 25)/100));
  const _rules = PRESSURE_RULES[appType] || PRESSURE_RULES.field;

  // Top Picks (fixed baseline)
  const outletsTop = buildOutletList(false);
  const PbTop = TOPPICKS_SELECT_PSI;
  const dcMinTop = TOPPICKS_DCMIN;
  const allRowsTop = [];
  for(const nz of outletsTop){
    const Pn = nozzlePressureFromBoom(PbTop, nz.size, valve.Cv);
    const Qnoz = nozzleFlowAt(Pn, sg, nz.size);
    const {v100, vmin} = speedsFromQ(appType, rate, spacingIn, Qnoz, dcMinTop);
    const dcVmax = dutyAtSpeed(appType, rate, vmax, spacingIn, Qnoz);
    allRowsTop.push({ nz, Pn, Qnoz, v100, vmin, dcVmax });
  }
  const picks = selectTopPicks(allRowsTop, vmax);
  renderTopCards(picks, vmax, dcMinTop);

  // Table
  renderTable();
  if(typeof refreshOpenAsjSelector === 'function') refreshOpenAsjSelector();
  // (re)bind instant scroll immediately after DOM updates
  // rAF ensures layout is committed before we attach
  requestAnimationFrame(()=> enableAdvTableWheelScroll());
  // lock options row
  updateAdvStickyOffsets();
}

(function wireSizeFilter(){
  const btn = document.getElementById('sizeFilterBtn');
  const panel = document.getElementById('sizeFilterPanel');
  if(!btn || !panel) return;

  populateSizeFilterPanel();
  updateSizeFilterSummary();

  btn.addEventListener('click', ()=>{
    panel.classList.toggle('open');
  });

  document.getElementById('sizeFilterApply').addEventListener('click', ()=>{
    panel.classList.remove('open');
    updateSizeFilterSummary();
    renderTable();
  });

  document.getElementById('sizeFilterClear').addEventListener('click', ()=>{
    const host = document.getElementById('sizeFilterList');
    host.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
    panel.classList.remove('open');
    updateSizeFilterSummary();
    renderTable();
  });

  // Close on outside click
  document.addEventListener('click', (e)=>{
    if(!panel.classList.contains('open')) return;
    const wrap = document.getElementById('sizeFilterWrap');
    if(wrap && !wrap.contains(e.target)) panel.classList.remove('open');
  });
})();

document.getElementById('customNoz').addEventListener('input', ()=>{
  populateSizeFilterPanel();
  updateSizeFilterSummary();
  updateAdvStickyOffsets();
});

// Events
['appType','targetRate','spacingIn','valveFamily','boomPsi','boomPsi2','vmax','sg','dcmin','customPb','customNoz','outletType']
  .forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener('input', ()=>{
      if(id==='outletType'){
        // reset filter list and labels on switch
        populateSizeFilterPanel();
        updateSizeFilterSummary();
      }
      updateUnitLabels();
      recalc();
      updateAdvStickyOffsets();
    });
  });

['appType','valveFamily','boomPsi','boomPsi2','sg','outletType']
  .forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener('change', ()=>{
      if(id==='outletType'){
        populateSizeFilterPanel();
        updateSizeFilterSummary();
      }
      updateUnitLabels();
      recalc();
      updateAdvStickyOffsets();
    });
  });

$('unitSystem').addEventListener('change', ()=>{
  if(isMetric()){
    $('targetRate').value = '100';
    $('spacingIn').value  = '50';
    $('vmax').value       = '25';
  } else {
    $('targetRate').value = '10';
    $('spacingIn').value  = '20';
    $('vmax').value       = '18';
  }
  updateUnitLabels();
  recalc();
});

$('metricPressureUnit').addEventListener('change', ()=>{ updateUnitLabels(); recalc(); });
$('appType').addEventListener('change', ()=>{ updateUnitLabels(); recalc(); });

(function(){
  const modeSel = $('modeToggle');
  const advancedPanel = $('advancedPanel');
  function syncMode(){
    const on = (modeSel.value === 'advanced');
    advancedPanel.style.display = on ? '' : 'none';
    if(on){
      enableAdvTableWheelScroll();
    }
  }
  modeSel.addEventListener('change', syncMode);
  syncMode();
})();

// Init
validateTranslations();
initializeLanguage();
ensurePressureOptionsPSI();
updateUnitLabels();
recalc();
enableAdvTableWheelScroll();


// --------- Language Selector ---------
(function wireLanguageSelector(){
  const sel = document.getElementById('languageSelect');
  if(!sel) return;

  sel.addEventListener('change', (e)=>{
    setLanguage(e.target.value);
    updateUnitLabels();
    populateSizeFilterPanel();
    updateSizeFilterSummary();
    recalc();
    updateAdvStickyOffsets();
  });
})();
