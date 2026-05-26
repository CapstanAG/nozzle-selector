// --------- Shared Helpers, Units & Math ---------
const $ = (id)=>document.getElementById(id);
const toNum = (v, fb=0)=>{ const x=parseFloat(String(v).trim()); return isNaN(x)?fb:x; };

// Unit helpers
function isMetric(){ return $('unitSystem').value === 'metric'; }
function getSystemMode(){
  const el = $('systemMode');
  return el ? el.value : 'pwm';
}
function isConventionalMode(){ return getSystemMode() === 'conventional'; }
function pressureDisplayUnit(){
  if(!isMetric()) return 'psi';
  return $('metricPressureUnit').value; // kpa or bar
}

// --- NEW: Outlet Type helpers
function getOutletType(){
  const el = $('outletType');
  return el ? el.value : 'nozzle';
}
function isDiskMode(){ return getOutletType() === 'disk'; }
function getActiveOutlets(){
  return isDiskMode() ? ORIFICE_DISKS : BASE_NOZZLES;
}
function fmtGpm40(x){ return (x>=1 ? x.toFixed(2) : x.toFixed(3)) + ' GPM @40'; }
function getOutletName(o){ return isDiskMode() ? o.id : (o.name || o.code || String(o.size)); }
function getOutletSize(o){ return isDiskMode() ? o.size : (o.size ?? o.N40); }
function getOutletLabel(o){
  if(isDiskMode()){
    return `${o.id} • ${fmtGpm40(o.size)}`;
  } else {
    const sz = getOutletSize(o);
    const color = o.color ? ` • ${o.color}` : '';
    return `Size ${(+sz).toFixed(2)}${color}`;
  }
}
function diskAccentClass(idOrName){
  const s = String(idOrName||''); let h=0;
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) & 0xffff; }
  const ix = h % 4;
  return ['disk-edge-a','disk-edge-b','disk-edge-c','disk-edge-d'][ix];
}

// --- Conversions
const CM_PER_IN = 2.54;
const LHA_PER_GPA = 9.353;            // 1 GPA = 9.353 L/ha
const MPH_PER_KPH = 0.621371;

function getRateUS(){ // returns GPA for math
  const v = toNum($('targetRate').value, 0);
  return isMetric() ? (v / LHA_PER_GPA) : v;
}
function getSpacingInches(){ // returns inches for math
  const v = toNum($('spacingIn').value, 20);
  return isMetric() ? (v / CM_PER_IN) : v;
}
function getVmaxMph(){ // returns mph for math
  const v = toNum($('vmax').value, 18);
  return isMetric() ? (v * MPH_PER_KPH) : v;
}

// Pressure display + conversion
function displayPressureLabel(){
  const u = pressureDisplayUnit();
  return (u==='psi'?'PSI':(u==='kpa'?'kPa':'bar'));
}
function psiToDisplay(psi){
  const u = pressureDisplayUnit();
  if(u==='kpa') return psi*6.89476;
  if(u==='bar') return psi*0.0689476;
  return psi;
}
function displayToPsi(v){
  const u = pressureDisplayUnit();
  const x = toNum(v, 0);
  if(u==='kpa') return x/6.89476;
  if(u==='bar') return x/0.0689476;
  return x;
}
function mphToDisplay(mph){ return isMetric() ? (mph/MPH_PER_KPH) : mph; }
function formatPressureDisplay(val){
  const u = pressureDisplayUnit();
  return (u==='bar') ? Number(val).toFixed(2) : Math.round(val);
}
function getSelectedPsi(sel){
  const opt = sel?.selectedOptions?.[0];
  if(opt && opt.dataset.psi) return toNum(opt.dataset.psi, 0);
  return toNum(sel?.value, 0);
}
function fmtPressureValue(psi){ return Math.round(psiToDisplay(psi)); }
function fmtPressureValueTable(psi){
  const u=pressureDisplayUnit();
  const v=psiToDisplay(psi);
  return (u==='bar')?v.toFixed(2):String(Math.round(v));
}

// Core math
function nozzlePressureFromBoom(Pb, N40, Cv){
  const k = N40/Math.sqrt(40);
  const denom = 1 + (k*k)/(Cv*Cv);
  return Pb/denom;
}
function nozzleFlowAt(Pn, SG, N40){
  return N40 * Math.sqrt(Math.max(Pn,0)/(40*SG));
}
function requiredFlowUS(appType, rate, mph, spacingIn){
  if(appType==='turf'){ return (rate * mph * spacingIn) / 136.4; } // GPK
  return (rate * mph * spacingIn) / 5940; // GPA
}
function dutyAtSpeed(appType, rate, mph, spacingIn, Qnoz){
  const req = requiredFlowUS(appType, rate, mph, spacingIn);
  return Qnoz>0 ? (req/Qnoz) : Infinity;
}
function speedsFromQ(appType, rate, spacingIn, Qnoz, dcMin){
  if(Qnoz<=0) return {v100:0,vmin:0};
  const constUS = (appType==='turf')?136.4:5940;
  const v100 = (constUS * Qnoz) / (rate * spacingIn);
  const vmin = dcMin * v100;
  return {v100, vmin};
}

// Selection logic for Top Picks centered on Vmax
function buildOutletList(includeCustom){
  const base = getActiveOutlets().map(o=>{
    // Normalize to common shape
    if(isDiskMode()){
      return { id:o.id, size:o.size, type:'disk', isCustom:false };
    } else {
      return { code:o.code, color:o.color, size:o.size, type:'nozzle', isCustom:false };
    }
  });
  if(includeCustom){
    const c = $('customNoz').value.trim();
    if(c){
      const sz = parseFloat(c);
      if(!isNaN(sz) && sz>0){
        if(isDiskMode()){
          base.unshift({ id:'CUSTOM', size:sz, type:'disk', isCustom:true, label:'Custom Disk' });
        } else {
          base.unshift({ code:'CUSTOM', color:'Black', size:sz, type:'nozzle', isCustom:true, label:'Custom Nozzle' });
        }
      }
    }
  }
  base.sort((a,b)=>a.size-b.size);
  return base;
}

function pressureStepsForTable(appType){
  return (appType==='orchard') ? [100,120,140,160,180] : [20,30,40,50,60,70,80];
}
function selectTopPicks(rows, vmax){
  if(rows.length===0) return [];
  rows.sort((a,b)=>a.nz.size - b.nz.size);
  const below = rows.filter(r=>r.v100 < vmax);
  const above = rows.filter(r=>r.v100 >= vmax);
  let middle=null;
  if(above.length>0){ above.sort((a,b)=>(a.v100 - vmax)-(b.v100 - vmax)); middle=above[0]; }
  else { below.sort((a,b)=>b.v100 - a.v100); middle=below[0]; }
  const idx = rows.findIndex(r=>r.nz.size===middle.nz.size);
  let left= null, right=null;
  for(let i=idx-1;i>=0;i--){ left = rows[i]; break; }
  for(let i=idx+1;i<rows.length;i++){ right = rows[i]; break; }
  const picks=[]; if(left) picks.push(left); picks.push(middle); if(right) picks.push(right);
  const seen=new Set(); return picks.filter(p=>{ if(seen.has(p.nz.size)) return false; seen.add(p.nz.size); return true; }).slice(0,3);
}
function rationaleByPosition(pos){
  if(pos===0) return t('rationale.nearMissUnder');
  if(pos===1) return t('rationale.bestFit');
  return t('rationale.oversized');
}

function speedRangeAtBoom(boomPsi, appType, rate, spacingIn, sg, valve, nz, dcMin){
  const Pn = nozzlePressureFromBoom(boomPsi, nz.size, valve.Cv);
  const Qnoz = nozzleFlowAt(Pn, sg, nz.size);
  return speedsFromQ(appType, rate, spacingIn, Qnoz, dcMin);
}

// --- Decouple Top Picks from Advanced ---
const TOPPICKS_DCMIN = 0.25; // fixed 25% duty for Top Picks
function getP1PsiRaw(){ return isConventionalMode() ? 40 : (getSelectedPsi($('boomPsi')) || 40); }
const TOPPICKS_SELECT_PSI = 60;

// P1/P2 helpers
function getP1Psi(){
  if(isConventionalMode()) return 40;
  const cpPsi = displayToPsi($('customPb').value);
  if(cpPsi>0) return cpPsi;
  return getSelectedPsi($('boomPsi')) || 40;
}
function getP2Psi(){
  if(isConventionalMode()) return null;
  const vPsi = getSelectedPsi($('boomPsi2'));
  return (vPsi>0) ? vPsi : null;
}

function conventionalNozzleFlowAt(psi, SG, N40){
  return nozzleFlowAt(psi, SG, N40);
}

function conventionalSpeedAtPressure(psi, appType, rate, spacingIn, sg, nz){
  const Qnoz = conventionalNozzleFlowAt(psi, sg, nz.size);
  return speedsFromQ(appType, rate, spacingIn, Qnoz, 1).v100;
}

function selectConventionalTopPicks(rows, targetSpeed){
  if(!rows.length) return [];
  const nearestAt = (pressure, role)=>{
    const match = rows.slice().sort((a,b)=>Math.abs(a[`v${pressure}`]-targetSpeed)-Math.abs(b[`v${pressure}`]-targetSpeed))[0];
    return match ? { ...match, conventionalTargetPsi: pressure, conventionalRole: role } : null;
  };

  // Smaller outlet: target average speed near 80 PSI.
  // Best fit: target average speed near 40 PSI.
  // Larger outlet: target average speed near 20 PSI.
  const highPressureCandidate = nearestAt(80, 'small');
  const bestFitCandidate = nearestAt(40, 'best');
  const lowPressureCandidate = nearestAt(20, 'large');

  const ordered = [highPressureCandidate, bestFitCandidate, lowPressureCandidate]
    .filter(Boolean)
    .sort((a,b)=>a.nz.size-b.nz.size);

  const seen = new Set();
  return ordered.filter(r=>{
    const key = Number(r.nz.size).toFixed(4);
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,3);
}
