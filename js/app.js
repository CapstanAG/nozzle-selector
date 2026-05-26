// --------- Application State, Events & Startup ---------
let LAST_TOP_PICKS_SIGNATURE = null;

function topPicksSignature(picks){
  return (picks || []).map(p=>`${p.nz.type || 'nozzle'}:${Number(p.nz.size).toFixed(4)}`).join('|');
}

function closeAsjPanelIfTopPicksChanged(newSignature){
  const panel = $('asjPanel');
  const isOpen = panel && panel.style.display !== 'none';
  if(isOpen && LAST_TOP_PICKS_SIGNATURE !== null && newSignature !== LAST_TOP_PICKS_SIGNATURE){
    panel.style.display = 'none';
    if(typeof ASJ_ACTIVE_CONTEXT !== 'undefined') ASJ_ACTIVE_CONTEXT = null;
  }
  LAST_TOP_PICKS_SIGNATURE = newSignature;
}

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

  // Top Picks
  const outletsTop = buildOutletList(false);
  const dcMinTop = isConventionalMode() ? 1 : TOPPICKS_DCMIN;
  const allRowsTop = [];
  let picks;

  if(isConventionalMode()){
    for(const nz of outletsTop){
      const v20 = conventionalSpeedAtPressure(20, appType, rate, spacingIn, sg, nz);
      const v40 = conventionalSpeedAtPressure(40, appType, rate, spacingIn, sg, nz);
      const v80 = conventionalSpeedAtPressure(80, appType, rate, spacingIn, sg, nz);
      const Pn = 40;
      const Qnoz = conventionalNozzleFlowAt(Pn, sg, nz.size);
      const dcVmax = dutyAtSpeed(appType, rate, vmax, spacingIn, Qnoz);
      allRowsTop.push({ nz, Pn, Qnoz, v100:v40, vmin:v40, v20, v40, v80, dcVmax });
    }
    picks = selectConventionalTopPicks(allRowsTop, vmax);
  } else {
    const PbTop = TOPPICKS_SELECT_PSI;
    for(const nz of outletsTop){
      const Pn = nozzlePressureFromBoom(PbTop, nz.size, valve.Cv);
      const Qnoz = nozzleFlowAt(Pn, sg, nz.size);
      const {v100, vmin} = speedsFromQ(appType, rate, spacingIn, Qnoz, dcMinTop);
      const dcVmax = dutyAtSpeed(appType, rate, vmax, spacingIn, Qnoz);
      allRowsTop.push({ nz, Pn, Qnoz, v100, vmin, dcVmax });
    }
    picks = selectTopPicks(allRowsTop, vmax);
  }
  closeAsjPanelIfTopPicksChanged(topPicksSignature(picks));
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
['systemMode','appType','targetRate','spacingIn','valveFamily','boomPsi','boomPsi2','vmax','sg','dcmin','customPb','customNoz','outletType']
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
      syncSystemModeUI();
      recalc();
      updateAdvStickyOffsets();
    });
  });

['systemMode','appType','valveFamily','boomPsi','boomPsi2','sg','outletType']
  .forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener('change', ()=>{
      if(id==='outletType'){
        populateSizeFilterPanel();
        updateSizeFilterSummary();
      }
      updateUnitLabels();
      syncSystemModeUI();
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
  syncSystemModeUI();
  recalc();
});

$('metricPressureUnit').addEventListener('change', ()=>{ updateUnitLabels(); syncSystemModeUI(); recalc(); });
$('appType').addEventListener('change', ()=>{ updateUnitLabels(); syncSystemModeUI(); recalc(); });

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
syncSystemModeUI();
recalc();
enableAdvTableWheelScroll();


// --------- Language Selector ---------
(function wireLanguageSelector(){
  const sel = document.getElementById('languageSelect');
  if(!sel) return;

  sel.addEventListener('change', (e)=>{
    setLanguage(e.target.value);
    updateUnitLabels();
    syncSystemModeUI();
    populateSizeFilterPanel();
    updateSizeFilterSummary();
    recalc();
    updateAdvStickyOffsets();
  });
})();
