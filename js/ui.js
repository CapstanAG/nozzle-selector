// --------- UI Labels, Rendering & Table Helpers ---------
// Translate nozzle color display names while preserving original color values for styling.
function translatedColorName(color){
  return color ? t('color.' + color) : '';
}

function updateUnitLabels(){
  const appType = $('appType').value;
  const hintEl = document.querySelector('header .hint');
  if(hintEl) hintEl.textContent = (isMetric() ? t('mode.metricHint') : t('mode.usHint'));

  // Target Rate label
  $('labelTargetRate').textContent = isMetric()
    ? t('field.targetRate.lha')
    : (appType==='turf' ? t('field.targetRate.gpk') : t('field.targetRate.gpa'));

  // Spacing label
  const spacingLabel = $('spacingIn')?.previousElementSibling;
  if(spacingLabel) spacingLabel.textContent = isMetric() ? t('field.nozzleSpacing.cm') : t('field.nozzleSpacing.in');

  // Max speed label
  const vmaxLabel = $('vmax')?.previousElementSibling;
  if(vmaxLabel) vmaxLabel.textContent = isMetric() ? t('field.maxTravelSpeed.kph') : t('field.maxTravelSpeed.mph');

  // Show metric pressure unit selector when Metric
  $('metricPressureWrap').style.display = isMetric()? 'inline-flex' : 'none';

  // P1/P2 label text swap to active pressure unit
  const p1Label = $('boomPsi')?.previousElementSibling;
  const p2Label = $('boomPsi2')?.previousElementSibling;
  const unitTxt = pressureDisplayUnit();
  if(p1Label) p1Label.textContent = `P1 (${unitTxt})`;
  if(p2Label) p2Label.textContent = `P2 (${unitTxt})`;

  // Custom pressure label
  const customPbLabel = $('customPb')?.previousElementSibling;
  if(customPbLabel) customPbLabel.textContent = `${t('field.customBoomPressure')} ${isMetric() ? (unitTxt.toUpperCase()) : 'PSI'}`;

  // Custom outlet label (toggle)
  const customLbl = $('customNozLbl');
  const customHint = $('customHint');
  if(customLbl) customLbl.textContent = isDiskMode() ? t('field.customDiskFlow') : t('field.customNozzleSize');
  if(customHint) customHint.textContent = isDiskMode() ? t('hint.enterDiskFlow') : t('hint.assumesBlack');

  // Advanced header column name
  const nameHeader = $('colNameHeader');
  const nozPressHdr = $('colNozPressHeader');
  if(nameHeader){
    nameHeader.innerHTML = isDiskMode()
      ? `${t('table.orificeDiskName')}<br><span class="hint">${t('table.gpm40Water')}</span>`
      : `${t('table.sizeColor')}<br><span class="hint">${t('table.gpm40Water')}</span>`;
  }
  if(nozPressHdr){
    nozPressHdr.textContent = isDiskMode() ? t('table.orificePressure') : t('table.nozzlePressure');
  }

  updatePressureDropdownDisplays();
}
function ensurePressureOptionsPSI(){
  ['boomPsi','boomPsi2'].forEach(id=>{
    const sel = $(id); if(!sel) return;
    Array.from(sel.options).forEach(opt=>{
      if(!opt.dataset.psi){
        const psi = toNum(opt.value || opt.textContent, 0);
        opt.dataset.psi = String(psi);
      }
      opt.value = opt.dataset.psi; // keep value in PSI
    });
  });
}
function updatePressureDropdownDisplays(){
  const unit = pressureDisplayUnit();
  const selects = [ $('boomPsi'), $('boomPsi2') ].filter(Boolean);
  selects.forEach(sel=>{
    Array.from(sel.options).forEach(opt=>{
      const psiVal = toNum(opt.dataset.psi || opt.value || opt.textContent, 0);
      let txt;
      if(unit==='kpa')      txt = Math.round(psiVal * 6.89476).toString();
      else if(unit==='bar') txt = (psiVal * 0.0689476).toFixed(2);
      else                  txt = String(psiVal);
      opt.textContent = txt;
      opt.value = String(psiVal);
    });
  });
}

function buildDetailsTableRows(appType, rate, spacingIn, sg, valve, nz, psi, isTop=false){
  const Pn = nozzlePressureFromBoom(psi, nz.size, valve.Cv);
  const Q  = nozzleFlowAt(Pn, sg, nz.size);
  const v100 = speedsFromQ(appType, rate, spacingIn, Q, 1).v100; // base
  const dcs = [0.10,0.25,0.50,0.75,1.00];
  const speeds = dcs.map(dc => (v100*dc));
  const unitPress = displayPressureLabel();

  const nameCell = isDiskMode()
    ? (isTop ? `${getOutletName(nz)}` : `<span class="disk-pill">${getOutletName(nz)}</span><div class="sub">${fmtGpm40(getOutletSize(nz))}</div>`)
    : `${nz.isCustom ? t('label.customNozzle') : (t('label.size') + ' ' + nz.size.toFixed(2))}${nz.isCustom?'':(' • '+translatedColorName(nz.color))}`;

  return `
    <tr>
      <td>${fmtPressureValueTable(psi)} ${unitPress}</td>
      <td>${nameCell}</td>
      <td>${fmtPressureValueTable(Pn)} ${unitPress}</td>
      <td>${mphToDisplay(speeds[0]).toFixed(2)}</td>
      <td>${mphToDisplay(speeds[1]).toFixed(2)}</td>
      <td>${mphToDisplay(speeds[2]).toFixed(2)}</td>
      <td>${mphToDisplay(speeds[3]).toFixed(2)}</td>
      <td>${mphToDisplay(speeds[4]).toFixed(2)}</td>
    </tr>
  `;
}

function renderTopCards(picks, vmax, dcMin){
  const wrap = $('topCards');
  if(!wrap){ console.warn('Missing #topCards container'); return; }
  wrap.innerHTML='';

  if(picks.length===0){
    wrap.innerHTML = `<div class="help">${t('message.noOutlets')}</div>`;
    return;
  }
  const appType = $('appType').value;
  const rate = getRateUS();
  const spacingIn = getSpacingInches();
  const valve = VALVES[$('valveFamily').value];
  const sg = toNum($('sg').value, 1.0);
  const unitPress = displayPressureLabel();

  const P1 = getP1PsiRaw();
  const P2 = getP2Psi();

  picks.forEach((r,i)=>{
    const PnP1 = nozzlePressureFromBoom(P1, r.nz.size, valve.Cv);
    const p1NozDisp = formatPressureDisplay( psiToDisplay(PnP1) );

    const card = document.createElement('div');
    card.className='card';
    card.style.cursor = 'pointer';

    const badge = isDiskMode()
      ? `${getOutletName(r.nz)} • ${fmtGpm40(getOutletSize(r.nz))}`
      : `${t('label.size')} ${r.nz.size.toFixed(2)} • ${r.nz.isCustom ? t('label.customNozzle') : translatedColorName(r.nz.color)}`;

    // compute speed ranges @ P1 and @ P2
    const sP1 = speedRangeAtBoom(P1, appType, rate, spacingIn, sg, valve, r.nz, dcMin);
    const sP2 = (P2 ? speedRangeAtBoom(P2, appType, rate, spacingIn, sg, valve, r.nz, dcMin) : null);

    const headroomPct = ((r.v100 - vmax)/Math.max(vmax,1e-6)*100);
    const headroomStr = (headroomPct>=0?'+':'') + Math.round(headroomPct) + '%';

    const detailsId = 'det_' + Math.random().toString(36).slice(2);

    card.innerHTML = `
      <div class="badge">${badge}</div>

      <div class="kv" style="margin-top:10px; grid-template-columns: auto 1fr; column-gap:16px;">
        <div class="metric-box">
          <span class="metric-sub">${isDiskMode()?t('label.orifice'):t('label.nozzle')} ${unitPress}</span>
          <div class="metric-big">${p1NozDisp}</div>
        </div>

        <div class="metric-box">
          <span class="metric-sub">${t('table.dcMaxSpeed')}</span>
          <div class="metric-big">${Math.round(r.dcVmax*100)}%</div>
        </div>

        <div class="label"><span>${t('label.speedRangeP1')}</span></div>
        <div class="value"><strong>${
          isMetric() ? Math.round(sP1.vmin/MPH_PER_KPH) : Math.round(sP1.vmin)
        }–${
          isMetric() ? Math.round(sP1.v100/MPH_PER_KPH) : Math.round(sP1.v100)
        } ${isMetric()?'kph':'mph'}</strong></div>

        ${P2 ? `
        <div class="label"><span>${t('label.speedRangeP2')}</span></div>
        <div class="value"><strong>${
          isMetric() ? Math.round(sP2.vmin/MPH_PER_KPH) : Math.round(sP2.vmin)
        }–${
          isMetric() ? Math.round(sP2.v100/MPH_PER_KPH) : Math.round(sP2.v100)
        } ${isMetric()?'kph':'mph'}</strong></div>
        ` : ''}
      </div>

      <div class="help" style="margin-top:8px;">${rationaleByPosition(i)}</div>
      <div class="help"><strong>${t('label.headroom100')}</strong> — (${headroomStr})</div>

      ${!isDiskMode() && !r.nz.isCustom ? `
      <div class="asj-card-actions">
        <button type="button" class="asj-select-btn" data-asj-size="${r.nz.size}">${t('button.selectAsj')}</button>
      </div>` : ''}

      <div id="${detailsId}" style="display:none; margin-top:10px;">
        <div class="help" style="margin-bottom:6px;">${t('label.detailedSpeeds')}</div>
        <div style="overflow:auto;">
          <table class="table" style="margin:0;">
            <thead>
              <tr>
                <th>${t('table.boomPressure')}</th>
                <th>${isDiskMode()?t('table.orificeDiskName'):t('table.sizeColor')}</th>
                <th>${isDiskMode()?t('table.orificePressure'):t('table.nozzlePressure')}</th>
                <th>${t('table.speedDc10')}</th>
                <th>${t('table.speedDc25')}</th>
                <th>${t('table.speedDc50')}</th>
                <th>${t('table.speedDc75')}</th>
                <th>${t('table.speedDc100')}</th>
              </tr>
            </thead>
            <tbody>
              ${buildDetailsTableRows(appType, rate, spacingIn, sg, valve, r.nz, P1, true)}
              ${P2 ? buildDetailsTableRows(appType, rate, spacingIn, sg, valve, r.nz, P2, true) : ''}
            </tbody>
          </table>
        </div>
      </div>
    `;

    const asjBtn = card.querySelector('.asj-select-btn');
    if(asjBtn){
      asjBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        if(typeof openAsjSelector === 'function') openAsjSelector(r.nz);
      });
    }

    card.addEventListener('click', (e)=>{
      if(e.target.closest('button, a, input, select, label')) return;
      const det = document.getElementById(detailsId);
      if(det) det.style.display = (det.style.display==='none' ? '' : 'none');
      updateAdvStickyOffsets();
    });

    wrap.appendChild(card);
  });
}

function renderTable(){
  const tbody = $('resultsTable').querySelector('tbody');
  tbody.innerHTML='';

  const appType = $('appType').value;
  const rate = getRateUS();
  const spacingIn = getSpacingInches();
  const valve = VALVES[$('valveFamily').value];
  const sg = toNum($('sg').value, 1.0);
  const vmax = getVmaxMph();
  const dcMin = Math.max(0, Math.min(1, toNum($('dcmin').value, 25)/100));

  // pressures
  let pressuresPsi = pressureStepsForTable(appType);
  const customPb = displayToPsi($('customPb').value);
  if(customPb > 0){ pressuresPsi = [customPb]; }

  const outlets = buildOutletList(true);

  // Read selected filters
  const selected = getSelectedFilterValues();
  const showAll = selected.length === 0;

  let rowIndex = 0;
  // group alternation by disk id (Blue ⇄ White)
  let lastDiskId = null;
  let groupIsBlue = true; // first seen disk group = Blue

  for(const nz of outlets){
    // filter by disk id or size depending on mode
    if(!showAll){
      if(isDiskMode()){
        if(!selected.includes(getOutletName(nz))) continue;
      } else {
        if(!selected.includes(nz.size)) continue;
      }
    }

    // if disk mode, flip group color when the disk changes
    if (isDiskMode()){
      const currId = getOutletName(nz); // e.g., "CP4916-65"
      if (currId !== lastDiskId){
        groupIsBlue = !groupIsBlue;   // flip when disk changes
        lastDiskId = currId;
      }
    }

    for(const pb of pressuresPsi){
      const Pn = nozzlePressureFromBoom(pb, nz.size, valve.Cv);
      const Qnoz = nozzleFlowAt(Pn, sg, nz.size);
      const {v100, vmin} = speedsFromQ(appType, rate, spacingIn, Qnoz, dcMin);
      const dcVmax = dutyAtSpeed(appType, rate, vmax, spacingIn, Qnoz);

      let fitLbl=t('status.oversized'), fitCls='warn';
      if(dcVmax > 1.0001){ fitLbl=t('status.undersized'); fitCls='bad'; }
      else if(dcVmax >= 0.75){ fitLbl=t('status.atNear'); fitCls='ok'; }

      const tr = document.createElement('tr');

      if(isDiskMode()){
        const rowClass = groupIsBlue ? 'disk-row-blue' : 'disk-row-white';
        const leftClass = groupIsBlue ? 'disk-left-blue' : 'disk-left-white';

        tr.className = rowClass;
        tr.innerHTML = `
          <td class="${leftClass}">${fmtPressureValueTable(pb)} ${displayPressureLabel()}</td>
          <td><span class="disk-pill">${getOutletName(nz)}</span><div class="hint">${fmtGpm40(getOutletSize(nz))}</div></td>
          <td>${fmtPressureValueTable(Pn)} ${displayPressureLabel()}</td>
          <td>${vmin>0? mphToDisplay(vmin).toFixed(2):'—'}</td>
          <td>${v100>0? mphToDisplay(v100).toFixed(2):'—'}</td>
          <td>${Math.round(dcVmax*100)}%</td>
          <td><span class="status ${fitCls}">${fitLbl}</span></td>
        `;
      } else {
        // nozzle mode — keep existing color usage
        const color = COLOR_MAP[nz.color] || nz.color || '#E5E7EB';
        const pressLabel = fmtPressureValueTable(pb) + ' ' + displayPressureLabel();
        const sizeLabel = nz.isCustom ? `${nz.size.toFixed(2)} • ${t('label.customNozzle')}`
                                      : `${nz.size.toFixed(2)} • ${translatedColorName(nz.color)}`;

        tr.innerHTML = `
          <td style="border-left:6px solid ${color};">${pressLabel}</td>
          <td style="background:${color}20;">${sizeLabel}</td>
          <td>${fmtPressureValueTable(Pn)} ${displayPressureLabel()}</td>
          <td>${vmin>0? mphToDisplay(vmin).toFixed(2):'—'}</td>
          <td>${v100>0? mphToDisplay(v100).toFixed(2):'—'}</td>
          <td>${Math.round(dcVmax*100)}%</td>
          <td><span class="status ${fitCls}">${fitLbl}</span></td>
        `;
      }

      tbody.appendChild(tr);
      rowIndex++;
    }
  }
}

function populateSizeFilterPanel(){
  const host = document.getElementById('sizeFilterList'); 
  if(!host) return;
  host.innerHTML = '';

  const list = buildOutletList(true);
  const seen = new Set();

  if(isDiskMode()){
    // show IDs with a search box
    document.getElementById('sizeFilterSearchWrap').style.display = '';
    const ids = list.map(o=>getOutletName(o));
    ids.forEach(id=>{
      if(seen.has(id)) return; seen.add(id);
      const safe = id.replace(/[^a-zA-Z0-9_-]/g,'_');
      const row = document.createElement('label');
      row.setAttribute('for', `disk_${safe}`);
      row.innerHTML = `<input id="disk_${safe}" type="checkbox" value="${id}"> <span>${id}</span>`;
      host.appendChild(row);
    });

    const search = $('sizeFilterSearch');
    if(search){
      search.value = '';
      search.oninput = ()=>{
        const q = search.value.toLowerCase();
        host.querySelectorAll('label').forEach(l=>{
          const t = l.textContent.toLowerCase();
          l.style.display = t.includes(q) ? '' : 'none';
        });
      };
    }
  } else {
    // nozzle size list
    document.getElementById('sizeFilterSearchWrap').style.display = 'none';
    list.forEach(n => {
      if(seen.has(n.size)) return; 
      seen.add(n.size);

      const labelText = n.isCustom ? `${n.size.toFixed(2)} (${t('label.customNozzle')})` : n.size.toFixed(2);
      const id = `sizeOpt_${String(n.size).replace('.','_')}`;

      const row = document.createElement('label');
      row.setAttribute('for', id);
      row.innerHTML = `<input id="${id}" type="checkbox" value="${n.size}"> <span>${labelText}</span>`;
      host.appendChild(row);
    });
  }

  // label text for panel button
  const lbl = $('sizeFilterLabel');
  const btn = $('sizeFilterBtn');
  if(lbl) lbl.textContent = isDiskMode() ? t('filter.disks') : t('filter.nozzleSizes');
  if(btn) btn.textContent = isDiskMode() ? t('filter.chooseDisks') : t('filter.chooseSizes');
}

function getSelectedFilterValues(){
  const host = document.getElementById('sizeFilterList'); if(!host) return [];
  const vals = Array.from(host.querySelectorAll('input[type="checkbox"]:checked'))
              .map(cb => cb.value);
  // return as numbers for nozzle mode, strings for disk mode
  return isDiskMode() ? vals : vals.map(v=>parseFloat(v));
}

function updateSizeFilterSummary(){
  const sum = document.getElementById('sizeFilterSummary'); if(!sum) return;
  const v = getSelectedFilterValues();
  if(v.length===0){
    sum.textContent = isDiskMode() ? t('filter.allDisks') : t('filter.allSizes');
  } else {
    sum.textContent = isDiskMode()
      ? `${t('filter.showing')} ${v.join(', ')}`
      : `${t('filter.showing')} ${v.map(x=>(+x).toFixed(2)).join(', ')}`;
  }
}


function enableAdvTableWheelScroll(){
  const el = document.getElementById('advTableWrap');
  if(!el) return;
  if(el.__wheelBound) return;
  el.__wheelBound = true;

  el.addEventListener('wheel', (e)=>{
    // If mouse is over the scroll area, consume the wheel and scroll immediately
    const within = el.matches(':hover');
    const canScroll = el.scrollHeight > el.clientHeight;
    if(within && canScroll){
      e.preventDefault();            // require passive:false
      el.scrollTop += e.deltaY;
    }
    // otherwise let the page handle it
  }, { passive: false });
}


function updateAdvStickyOffsets(){
  // no-op placeholder (kept from your previous file)
}


// --------- ASJ / ANSDC Secondary Nozzle Selector ---------
let ASJ_ACTIVE_CONTEXT = null;

const ASJ_DROPLET_ORDER = ['XF','VF','F','M','C','VC','XC','UC'];
const ASJ_DROPLET_LABELS = {
  XF:'Extremely Fine', VF:'Very Fine', F:'Fine', M:'Medium', C:'Coarse', VC:'Very Coarse', XC:'Extremely Coarse', UC:'Ultra Coarse'
}; // ASABE classification names intentionally left technical/English
const ASJ_DROPLET_STYLE = {
  XF:{bg:'#7C3AED', fg:'#fff', border:'#6D28D9'},
  VF:{bg:'#DC2626', fg:'#fff', border:'#B91C1C'},
  F: {bg:'#F97316', fg:'#111827', border:'#EA580C'},
  M: {bg:'#FDE047', fg:'#111827', border:'#EAB308'},
  C: {bg:'#2563EB', fg:'#fff', border:'#1D4ED8'},
  VC:{bg:'#16A34A', fg:'#fff', border:'#15803D'},
  XC:{bg:'#FFFFFF', fg:'#111827', border:'#9CA3AF'},
  UC:{bg:'#111827', fg:'#fff', border:'#111827'}
};

function asjCategoryRank(cat){
  const ix = ASJ_DROPLET_ORDER.indexOf(asjNormalizeCategory(cat));
  return ix === -1 ? 999 : ix;
}

function asjPressurePrimaryUnit(){
  return isMetric() ? 'bar' : 'psi';
}

function asjPressurePairFromPsi(psi, primary=asjPressurePrimaryUnit()){
  const bar = (psi*0.0689476).toFixed(2);
  const psiRounded = Math.round(psi);
  if(primary === 'psi'){
    return `<strong>${psiRounded} PSI</strong><div class="asj-muted">${bar} bar</div>`;
  }
  return `<strong>${bar} bar</strong><div class="asj-muted">${psiRounded} PSI</div>`;
}

function asjPressureMiniFromPoint(p){
  const bar = Number(p.pressureBar).toFixed(Number(p.pressureBar)%1 ? 1 : 0);
  const psi = Math.round(Number(p.pressurePsiExact));
  if(asjPressurePrimaryUnit() === 'psi'){
    return `<span class="asj-droplet-pressure-primary">${psi} PSI</span><span class="asj-droplet-pressure-secondary">${bar} bar</span>`;
  }
  return `<span class="asj-droplet-pressure-primary">${bar} bar</span><span class="asj-droplet-pressure-secondary">${psi} PSI</span>`;
}

function asjNormalizeCategory(cat){
  return cat ? String(cat).trim().toUpperCase() : '—';
}

function asjDropletPill(cat, extraClass=''){
  const c = asjNormalizeCategory(cat);
  const st = ASJ_DROPLET_STYLE[c] || {bg:'#eef4ff', fg:'#134fba', border:'#c7d7fe'};
  const title = ASJ_DROPLET_LABELS[c] ? `${c} — ${ASJ_DROPLET_LABELS[c]}` : c;
  return `<span class="asj-droplet-pill ${extraClass}" title="${title}" style="background:${st.bg};color:${st.fg};border-color:${st.border};">${c}</span>`;
}

function asjUniqueSorted(rows, key){
  const values = Array.from(new Set(rows.map(r=>r[key]).filter(v=>v!==null && v!==undefined && String(v).trim()!=='')));
  if(key === 'dropletCategory'){
    return values.map(asjNormalizeCategory).sort((a,b)=>asjCategoryRank(a)-asjCategoryRank(b) || String(a).localeCompare(String(b)));
  }
  return values.sort((a,b)=>String(a).localeCompare(String(b), undefined, {numeric:true}));
}

function asjRowsForSize(size){
  if(!Array.isArray(ASJ_NOZZLE_DATA)) return [];
  const target = Number(size);
  return ASJ_NOZZLE_DATA.filter(r => Math.abs(Number(r.nominalGPM) - target) < 0.0001);
}

function asjGroupKey(r){
  // ASJ data can reuse the same nozzleId across different families/model variants.
  // Group by the product variant, not by nozzleId alone, so droplet profiles do not mix families.
  return [
    r.family || '',
    r.modelName || '',
    r.nozzleId || '',
    r.material || '',
    r.angleDeg || '',
    r.pwmCompatible === true ? 'pwm' : 'no-pwm'
  ].join('|');
}

function asjGroupedNozzles(rows){
  const map = new Map();
  rows.forEach(r=>{
    const key = asjGroupKey(r);
    if(!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  });
  return Array.from(map.values()).map(points => points.sort((a,b)=>Number(a.pressurePsiExact)-Number(b.pressurePsiExact)));
}

function asjInterpolate(points, nozzlePsi){
  if(!points.length) return null;
  const sorted = points.slice().sort((a,b)=>Number(a.pressurePsiExact)-Number(b.pressurePsiExact));
  const min = sorted[0], max = sorted[sorted.length-1];
  let lower = min, upper = max;
  for(let i=0;i<sorted.length;i++){
    const p = Number(sorted[i].pressurePsiExact);
    if(p <= nozzlePsi) lower = sorted[i];
    if(p >= nozzlePsi){ upper = sorted[i]; break; }
  }
  const lp = Number(lower.pressurePsiExact), up = Number(upper.pressurePsiExact);
  let vmd = Number(lower.vmdMicrons);
  if(up !== lp){
    const ratio = (nozzlePsi - lp) / (up - lp);
    vmd = Number(lower.vmdMicrons) + ratio * (Number(upper.vmdMicrons) - Number(lower.vmdMicrons));
  }
  const nearest = sorted.slice().sort((a,b)=>Math.abs(Number(a.pressurePsiExact)-nozzlePsi)-Math.abs(Number(b.pressurePsiExact)-nozzlePsi))[0];
  const within = nozzlePsi >= Number(min.pressurePsiExact) && nozzlePsi <= Number(max.pressurePsiExact);
  return {
    vmd,
    vmdDisplay: Math.round(vmd),
    dropletCategory: asjNormalizeCategory(nearest.dropletCategory),
    nearestPressurePsi: Number(nearest.pressurePsiExact),
    nearestPressureBar: Number(nearest.pressureBar),
    withinRange: within,
    minPsi: Number(min.pressurePsiExact),
    maxPsi: Number(max.pressurePsiExact)
  };
}

function asjBuildFilter(selectId, values, allLabel){
  const sel = $(selectId);
  if(!sel) return;
  const current = sel.value || 'all';
  const options = values.map(v=>{
    const safe = String(v).replace(/"/g,'&quot;');
    const label = (selectId === 'asjDropletFilter' && ASJ_DROPLET_LABELS[v]) ? `${v} — ${ASJ_DROPLET_LABELS[v]}` : v;
    if(selectId === 'asjDropletFilter'){
      const st = ASJ_DROPLET_STYLE[v] || {};
      const style = st.bg ? ` style="background:${st.bg};color:${st.fg};"` : '';
      return `<option value="${safe}"${style}>${label}</option>`;
    }
    return `<option value="${safe}">${label}</option>`;
  }).join('');
  sel.innerHTML = `<option value="all">${allLabel || t('filter.all')}</option>` + options;
  if(Array.from(sel.options).some(o=>o.value===current)) sel.value = current;
}

function asjPopulateFilters(rows){
  asjBuildFilter('asjDropletFilter', asjUniqueSorted(rows, 'dropletCategory'), t('filter.all'));
  asjBuildFilter('asjFamilyFilter', asjUniqueSorted(rows, 'family'), t('filter.all'));
  asjBuildFilter('asjPatternFilter', asjUniqueSorted(rows, 'sprayPattern'), t('filter.all'));
}

function asjFilteredGroups(){
  if(!ASJ_ACTIVE_CONTEXT) return [];
  const cat = $('asjDropletFilter')?.value || 'all';
  const family = $('asjFamilyFilter')?.value || 'all';
  const pattern = $('asjPatternFilter')?.value || 'all';
  const pwm = $('asjPwmFilter')?.value || 'all';

  return asjGroupedNozzles(ASJ_ACTIVE_CONTEXT.rows).filter(points=>{
    if(!points.length) return false;
    if(cat !== 'all' && !points.some(r=>asjNormalizeCategory(r.dropletCategory) === cat)) return false;
    if(family !== 'all' && !points.some(r=>String(r.family) === family)) return false;
    if(pattern !== 'all' && !points.some(r=>String(r.sprayPattern) === pattern)) return false;
    if(pwm === 'true' && !points.some(r=>r.pwmCompatible === true)) return false;
    return true;
  });
}

function asjCurrentHydraulicContext(nz){
  const appType = $('appType').value;
  const valve = VALVES[$('valveFamily').value];
  const gaugePsi = getP1PsiRaw();
  const nozzlePsi = nozzlePressureFromBoom(gaugePsi, nz.size, valve.Cv);
  const rows = asjRowsForSize(nz.size);
  return { nz, appType, valve, gaugePsi, nozzlePsi, rows };
}

function asjRenderContext(){
  if(!ASJ_ACTIVE_CONTEXT) return;
  const context = $('asjContext');
  if(!context) return;
  context.innerHTML = `
    <div class="asj-context-card"><span class="label">${t('label.selectedOutlet')}</span><span class="value">${t('label.size')} ${Number(ASJ_ACTIVE_CONTEXT.nz.size).toFixed(2)}</span></div>
    <div class="asj-context-card"><span class="label">${t('label.gaugePressure')}</span><span class="value">${asjPressurePairFromPsi(ASJ_ACTIVE_CONTEXT.gaugePsi)}</span></div>
    <div class="asj-context-card"><span class="label">${t('label.calculatedNozzlePressure')}</span><span class="value">${asjPressurePairFromPsi(ASJ_ACTIVE_CONTEXT.nozzlePsi)}</span></div>
    <div class="asj-context-card asj-vmd-context-card">
      <span class="label">VMD</span>
      <span class="value" id="asjContextVmd">—</span>
      <span class="hint">Approx. VMD @ Target Pressure</span>
    </div>
  `;
}

function openAsjSelector(nz){
  const panel = $('asjPanel');
  if(!panel || !nz) return;
  ASJ_ACTIVE_CONTEXT = asjCurrentHydraulicContext(nz);
  panel.style.display = '';
  asjRenderContext();
  asjPopulateFilters(ASJ_ACTIVE_CONTEXT.rows);
  renderAsjMatches();
  panel.scrollIntoView({behavior:'smooth', block:'start'});
}

function refreshOpenAsjSelector(){
  const panel = $('asjPanel');
  if(!panel || panel.style.display === 'none' || !ASJ_ACTIVE_CONTEXT) return;
  ASJ_ACTIVE_CONTEXT = asjCurrentHydraulicContext(ASJ_ACTIVE_CONTEXT.nz);
  asjRenderContext();
  asjPopulateFilters(ASJ_ACTIVE_CONTEXT.rows);
  renderAsjMatches();
}

function asjDropletProfile(points){
  return points.slice().sort((a,b)=>Number(a.pressurePsiExact)-Number(b.pressurePsiExact)).map(p=>{
    const fullPressure = `${Number(p.pressureBar).toFixed(Number(p.pressureBar)%1 ? 1 : 0)} bar / ${Math.round(Number(p.pressurePsiExact))} PSI`;
    return `<span class="asj-pressure-droplet" title="${fullPressure}"><span class="asj-droplet-pressure-stack">${asjPressureMiniFromPoint(p)}</span>${asjDropletPill(p.dropletCategory)}</span>`;
  }).join('');
}

function renderAsjMatches(){
  const tbody = $('asjResultsTable')?.querySelector('tbody');
  if(!tbody || !ASJ_ACTIVE_CONTEXT) return;
  const summary = $('asjMatchesSummary');
  tbody.innerHTML = '';

  const groups = asjFilteredGroups().map(points=>{
    const first = points[0];
    const interp = asjInterpolate(points, ASJ_ACTIVE_CONTEXT.nozzlePsi);
    const selectedCat = $('asjDropletFilter')?.value || 'all';
    const hasSelectedCat = selectedCat === 'all' || points.some(p=>asjNormalizeCategory(p.dropletCategory) === selectedCat);
    return { first, points, interp, hasSelectedCat };
  }).sort((a,b)=>{
    const selectedCat = $('asjDropletFilter')?.value || 'all';
    if(selectedCat !== 'all' && a.hasSelectedCat !== b.hasSelectedCat) return a.hasSelectedCat ? -1 : 1;
    const aBad = a.interp && a.interp.withinRange ? 0 : 1;
    const bBad = b.interp && b.interp.withinRange ? 0 : 1;
    if(aBad !== bBad) return aBad-bBad;
    return String(a.first.nozzleId).localeCompare(String(b.first.nozzleId), undefined, {numeric:true});
  });

  const vmdSummary = $('asjContextVmd');
  if(vmdSummary){
    const topGroup = groups[0];
    const topInterp = topGroup?.interp;
    const topCat = topInterp?.category || topGroup?.nearest?.displayDropletCategory || topGroup?.nearest?.sourceDropletCategory || '';
    vmdSummary.textContent = topInterp
      ? `${topInterp.vmdDisplay}${topCat ? ' / ' + topCat : ''}`
      : '—';
  }

  if(!groups.length){
    if(vmdSummary) vmdSummary.textContent = '—';
    if(summary) summary.textContent = t('message.asjNoMatches');
    return;
  }

  if(summary){
    summary.textContent = t('message.asjMatchesSummary')
      .replace('{count}', groups.length)
      .replace('{size}', Number(ASJ_ACTIVE_CONTEXT.nz.size).toFixed(2));
  }

  groups.forEach(g=>{
    const f = g.first;
    const interp = g.interp;
    const tr = document.createElement('tr');
    const warning = interp && !interp.withinRange ? `<div class="asj-warning">${t('message.asjOutsideRange')}: ${Math.round(interp.minPsi)}–${Math.round(interp.maxPsi)} PSI</div>` : '';
    const pwmText = f.pwmCompatible ? t('label.pwmCompatible') : t('label.notPwmCompatible');

    const detail = `
      <div class="asj-nozzle-text">
        <strong>${f.nozzleId}</strong>
        <div class="asj-nozzle-name">${f.modelName || '—'}</div>
        <div class="asj-nozzle-family">${f.family || '—'}</div>
        <div class="asj-nozzle-material">${f.material || '—'}</div>
        <div class="asj-nozzle-meta">${t('label.asjAngle')} ${f.angleDeg || '—'}° <span class="asj-meta-sep">|</span> ${pwmText}</div>
        ${warning}
      </div>
    `;
    tr.className = 'asj-result-main-row';
    tr.innerHTML = `
      <td><div class="asj-nozzle-cell">${detail}</div></td>
      <td><div class="asj-droplet-profile asj-droplet-profile-strip">${asjDropletProfile(g.points)}</div></td>
    `;
    tbody.appendChild(tr);
  });
}

(function wireAsjSelector(){
  const ids = ['asjDropletFilter','asjFamilyFilter','asjPatternFilter','asjPwmFilter'];
  ids.forEach(id=>{
    const el = $(id);
    if(el) el.addEventListener('change', renderAsjMatches);
  });
  const close = $('asjCloseBtn');
  if(close) close.addEventListener('click', ()=>{ const p=$('asjPanel'); if(p) p.style.display='none'; });
})();

// V11C: VMD moved from ASJ result row into ASJ header context card.

// V12: final ASJ visual polish — VMD header detail + tighter droplet profile layout.
