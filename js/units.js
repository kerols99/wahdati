// ══ UNITS ══

async function loadHome(btn, force) {
  if(btn){var orig=btn.innerHTML;btn.disabled=true;btn.innerHTML='<span class="spin"></span>';}
  try {
    var now = new Date();
    var ym  = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    var monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var monthNamesEN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    var mn = LANG==='ar' ? monthNames[now.getMonth()] : monthNamesEN[now.getMonth()];
    document.getElementById('home-month').textContent = mn + ' ' + now.getFullYear();

    var { data: units } = await sb.from('units').select('id,apartment,room,monthly_rent,tenant_name,phone,language').eq('is_vacant',false).order('apartment').order('room');
    if(!units) units=[];
    MO = units;

    var { data: pays } = await sb.from('rent_payments').select('unit_id,amount').gte('payment_month', ym+'-01').lte('payment_month', ym+'-31');
    if(!pays) pays=[];

    var paidMap = {};
    pays.forEach(p=>{ paidMap[p.unit_id] = (paidMap[p.unit_id]||0) + p.amount; });

    var paid=0, partial=0, unpaid=0, remaining=0, lateUnits=[];
    units.forEach(u=>{
      var got = paidMap[u.id]||0;
      if(got >= u.monthly_rent) paid++;
      else if(got > 0) { partial++; remaining += u.monthly_rent - got; lateUnits.push({...u,got,rem:u.monthly_rent-got,status:'partial'}); }
      else { unpaid++; remaining += u.monthly_rent; lateUnits.push({...u,got:0,rem:u.monthly_rent,status:'unpaid'}); }
    });

    document.getElementById('sp').textContent  = paid;
    document.getElementById('spar').textContent = partial;
    document.getElementById('su').textContent   = unpaid;
    document.getElementById('srem').textContent = remaining>=1000?(remaining/1000).toFixed(1)+'k':remaining;

    var ll = document.getElementById('lateList');
    if(!lateUnits.length) {
      ll.innerHTML = `<div style="text-align:center;padding:14px 0;color:var(--green);font-size:.85rem">${t('allPaid')}</div>`;
    } else {
      ll.innerHTML = lateUnits.slice(0,10).map(u=>`
        <div class="late-item" data-uid="${u.id}" onclick="openDrawer(this.dataset.uid)">
          <div>
            <div style="font-size:.82rem;font-weight:600">شقة ${u.apartment} — ${u.room}</div>
            <div style="font-size:.72rem;color:var(--muted)">${u.tenant_name||'—'}</div>
          </div>
          <div style="text-align:end">
            <div style="font-size:.68rem;color:${u.status==='partial'?'var(--amber)':'var(--red)'};">${u.status==='partial'?(LANG==='ar'?'جزئية':'Partial'):(LANG==='ar'?'غير مدفوعة':'Unpaid')}</div>
            <div style="font-size:.82rem;font-weight:700;color:${u.status==='partial'?'var(--amber)':'var(--red)'};">${u.rem>=1000?(u.rem/1000).toFixed(1)+'k':u.rem} AED</div>
          </div>
        </div>`).join('');
    }
  } catch(e){ toast('خطأ: '+e.message,'err'); }
  finally{ if(btn){btn.disabled=false;btn.innerHTML=orig||t('refresh');} }
}

async function loadUnits() {
  var { data } = await sb.from('units').select('*').order('apartment',{ascending:true});
  if(!data) data=[];
  // Sort numerically: by apartment number, then room number
  data.sort((a,b)=>{
    var aptA=parseInt(a.apartment)||0, aptB=parseInt(b.apartment)||0;
    if(aptA!==aptB) return aptA-aptB;
    var rA=parseInt(a.room)||0, rB=parseInt(b.room)||0;
    return rA-rB;
  });
  MO = data;

  // Get this month's payments
  var now = new Date();
  var ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var { data: pays } = await sb.from('rent_payments').select('unit_id,amount').gte('payment_month',ym+'-01').lte('payment_month',ym+'-31');
  var paidMap = {};
  (pays||[]).forEach(p=>{ paidMap[p.unit_id]=(paidMap[p.unit_id]||0)+p.amount; });

  _paidMapCache = paidMap;
  renderUnits(data, paidMap);
  document.getElementById('units-count').textContent = data.length + (LANG==='ar'?' وحدة':' units');
}

function renderUnits(units, paidMap) {
  paidMap = paidMap || {};
  var aptColors = ['#4f8ef7','#34c87a','#f5a623','#f25c5c','#a78bf5','#2dd4bf','#fb923c','#f472b6'];
  var html = units.map(u=>{
    var ci = parseInt(u.apartment||0) % aptColors.length;
    var color = aptColors[ci];
    var paid = paidMap[u.id]||0;
    var rent = u.monthly_rent||0;
    var statusColor, statusTxt, statusBg, leftBorder;
    if(u.is_vacant) {
      statusColor='var(--muted)'; statusTxt=LANG==='ar'?'شاغرة':'Vacant';
      statusBg='var(--surf)'; leftBorder='var(--border)';
    } else if(paid >= rent && rent > 0) {
      statusColor='var(--green)'; statusTxt='✅ '+(LANG==='ar'?'مدفوع':'Paid');
      statusBg='rgba(52,200,122,.07)'; leftBorder='var(--green)';
    } else if(paid > 0) {
      statusColor='var(--amber)'; statusTxt='⚠️ '+(LANG==='ar'?'جزئي':'Partial');
      statusBg='rgba(245,166,35,.07)'; leftBorder='var(--amber)';
    } else {
      statusColor='var(--red)'; statusTxt='❌ '+(LANG==='ar'?'لم يدفع':'Unpaid');
      statusBg='rgba(242,92,92,.05)'; leftBorder='var(--red)';
    }
    var remTxt = (!u.is_vacant && paid < rent) ? `<div style="font-size:.7rem;color:${statusColor};margin-top:2px">${rent-paid} AED ${LANG==='ar'?'متبقي':'left'}</div>` : '';
    return `<div class="ucard" data-uid="${u.id}" style="background:${statusBg};border-right:3px solid ${leftBorder};cursor:pointer">
      <div class="uapt" style="background:${color}22;color:${color}">${u.apartment}</div>
      <div class="uinfo">
        <div class="utitle">${LANG==='ar'?'شقة':'Apt'} ${u.apartment} — ${u.room}</div>
        <div class="uname">${u.tenant_name||'—'}</div>
        ${u.tenant_name2?`<div class="uname" style="color:var(--amber)">& ${u.tenant_name2}</div>`:''}
      </div>
      <div class="ustatus">
        <div style="font-size:.7rem;font-weight:700;color:${statusColor};text-align:end">${statusTxt}</div>
        <div class="uamt" style="margin-top:4px">${rent} AED</div>
        ${remTxt}
      </div>
    </div>`;
  }).join('');
  var el = document.getElementById('unitList');
  el.innerHTML = html || `<div style="text-align:center;padding:30px;color:var(--muted)">${LANG==='ar'?'لا توجد وحدات':'No units found'}</div>`;
  // Event delegation - one listener for all cards
  el.onclick = function(e) {
    var card = e.target.closest('[data-uid]');
    if(card) openDrawer(card.dataset.uid);
  };
}

function setFilter(filter, btn) {
  _activeFilter = filter;
  // Update button styles
  document.querySelectorAll('.filter-btn').forEach(b => {
    var isActive = b.dataset.filter === filter;
    var colors = {all:'var(--accent)',unpaid:'var(--red)',partial:'var(--amber)',paid:'var(--green)',vacant:'var(--muted)'};
    var col = colors[b.dataset.filter] || 'var(--accent)';
    b.style.background = isActive ? col : 'none';
    b.style.color = isActive ? '#fff' : 'var(--muted)';
    b.style.borderColor = isActive ? col : 'var(--border)';
  });
  filterUnits();
}

function filterUnits() {
  var q = document.getElementById('search-inp').value.trim().toLowerCase();
  var filtered = MO.filter(u => {
    // Text search
    if(q) {
      var aptroom = u.apartment+'-'+u.room;
      var match = aptroom.includes(q) || (u.tenant_name||'').toLowerCase().includes(q) ||
             String(u.apartment).includes(q) || (u.room||'').toLowerCase().includes(q);
      if(!match) return false;
    }
    // Status filter
    if(_activeFilter === 'all') return true;
    var paid = _paidMapCache[u.id]||0;
    var rent = u.monthly_rent||0;
    if(_activeFilter === 'vacant')  return u.is_vacant;
    if(_activeFilter === 'paid')    return !u.is_vacant && paid >= rent && rent > 0;
    if(_activeFilter === 'partial') return !u.is_vacant && paid > 0 && paid < rent;
    if(_activeFilter === 'unpaid')  return !u.is_vacant && paid === 0;
    return true;
  });
  renderUnits(filtered, _paidMapCache);
}

async function openDrawer(unitId) {
  // Always fetch fresh from DB to avoid MO cache issues
  var unit = MO.find(u=>u.id===unitId);
  if(!unit) {
    var { data } = await sb.from('units').select('*').eq('id',unitId).single();
    if(data) { unit = data; MO.push(data); }
  }
  if(!unit) return;

    try {
var now = new Date();
  var ym  = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');

  var { data: pays } = await sb.from('rent_payments')
    .select('amount,tenant_num')
    .eq('unit_id', unitId)
    .gte('payment_month', ym+'-01')
    .lte('payment_month', ym+'-31');

  var totalPaid = (pays||[]).reduce((s,p)=>s+(p.amount||0),0);
  var paid1 = (pays||[]).filter(p=>p.tenant_num===1).reduce((s,p)=>s+(p.amount||0),0);
  var paid2 = (pays||[]).filter(p=>p.tenant_num===2).reduce((s,p)=>s+(p.amount||0),0);
  var rem   = (unit.monthly_rent||0) - totalPaid;

  var { data: dep } = await sb.from('deposits').select('*').eq('unit_id',unitId).maybeSingle();
  // Fallback: if no deposit record but unit has deposit field, use it
  if((!dep || !dep.amount) && unit.deposit > 0) {
    dep = { amount: unit.deposit, status: 'held', tenant_name: unit.tenant_name };
  }

  var statusColor = totalPaid>=(unit.monthly_rent||0)&&(unit.monthly_rent||0)>0
    ? 'var(--green)' : totalPaid>0 ? 'var(--amber)' : 'var(--red)';
  var statusTxt = totalPaid>=(unit.monthly_rent||0)&&(unit.monthly_rent||0)>0
    ? (LANG==='ar'?'مدفوعة':'Paid')
    : totalPaid>0 ? (LANG==='ar'?'جزئية':'Partial')
    : (LANG==='ar'?'غير مدفوعة':'Unpaid');

  // Build deposit section
  var depHTML = '';
  if(dep && dep.amount) {
    var sCol = dep.status==='held'?'var(--amber)':dep.status==='refunded'?'var(--green)':'var(--red)';
    var sTxt = dep.status==='held'?(LANG==='ar'?'محتجز':'Held')
             : dep.status==='refunded'?(LANG==='ar'?'مُرتجع':'Refunded')
             : (LANG==='ar'?'مُصادر':'Forfeited');
    depHTML = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">'
      + '<div style="font-size:.65rem;color:var(--muted);font-weight:700;margin-bottom:6px">🔒 '+(LANG==='ar'?'التأمين':'Deposit')+'</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:.82rem">'
      + '<span style="color:var(--accent);font-weight:700">'+(dep.amount||0)+' AED</span>'
      + '<span style="color:'+sCol+';font-weight:600">'+sTxt+'</span>'
      + '</div>'
      + (dep.deduction_amount?'<div style="font-size:.75rem;color:var(--muted);margin-top:4px">'+(LANG==='ar'?'خصم:':'Deduction:')+' '+dep.deduction_amount+' AED'+(dep.deduction_reason?' — '+dep.deduction_reason:'')+'</div>':'')
      + (dep.notes?'<div style="font-size:.75rem;color:var(--muted);margin-top:3px">'+dep.notes+'</div>':'')
      + '</div>';
  } else {
    depHTML = '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:.75rem;color:var(--muted)">🔒 '+(LANG==='ar'?'لا يوجد تأمين مسجّل':'No deposit recorded')+'</div>';
  }

  // Build 2-tenant section
  var t2HTML = '';
  if(unit.tenant_name2) {
    t2HTML = '<div style="background:var(--surf2);border-radius:12px;padding:11px;margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px">'
      + '<div style="border-left:3px solid var(--accent);padding-right:8px">'
      + '<div style="font-size:.6rem;color:var(--muted);margin-bottom:2px">👤 '+(LANG==='ar'?'المستأجر الأول':'Tenant 1')+'</div>'
      + '<div style="font-size:.82rem;font-weight:700">'+(unit.tenant_name||'—')+'</div>'
      + '<div style="font-size:.7rem;color:var(--muted)">'+(unit.phone||'—')+'</div>'
      + (unit.rent1?'<div style="font-size:.78rem;font-weight:700;color:var(--accent);margin-top:2px">'+unit.rent1+' AED</div>':'')
      + (paid1>0?'<div style="font-size:.7rem;color:var(--green)">✅ '+paid1+' AED</div>'
               :'<div style="font-size:.7rem;color:var(--red)">❌ '+(LANG==='ar'?'لم يدفع':'Unpaid')+'</div>')
      + '</div>'
      + '<div style="border-left:3px solid var(--amber);padding-right:8px">'
      + '<div style="font-size:.6rem;color:var(--muted);margin-bottom:2px">👤 '+(LANG==='ar'?'المستأجر الثاني':'Tenant 2')+'</div>'
      + '<div style="font-size:.82rem;font-weight:700">'+(unit.tenant_name2)+'</div>'
      + '<div style="font-size:.7rem;color:var(--muted)">'+(unit.phone2||'—')+'</div>'
      + (unit.rent2?'<div style="font-size:.78rem;font-weight:700;color:var(--amber);margin-top:2px">'+unit.rent2+' AED</div>':'')
      + (paid2>0?'<div style="font-size:.7rem;color:var(--green)">✅ '+paid2+' AED</div>'
               :'<div style="font-size:.7rem;color:var(--red)">❌ '+(LANG==='ar'?'لم يدفع':'Unpaid')+'</div>')
      + '</div>'
      + '</div>';
  }

  document.getElementById('drawerContent').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">'
    + '<div>'
    + '<div style="font-size:1.1rem;font-weight:700">'+(LANG==='ar'?'شقة':'Apt')+' '+unit.apartment+' \u2014 '+unit.room+'</div>'
    + '<div style="font-size:.82rem;color:var(--muted);margin-top:3px">'+(unit.tenant_name||'—')+(unit.tenant_name2?' & '+unit.tenant_name2:'')+'</div>'
    + '</div>'
    + '<span style="font-size:.75rem;font-weight:700;color:'+statusColor+';background:'+statusColor+'22;padding:4px 10px;border-radius:20px">'+statusTxt+'</span>'
    + '</div>'

    + t2HTML

    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">'
    + '<div style="background:var(--surf2);border-radius:10px;padding:10px"><div style="font-size:.65rem;color:var(--muted)">'+(LANG==='ar'?'الإيجار الشهري':'Monthly Rent')+'</div><div style="font-weight:700">'+(unit.monthly_rent||0)+' AED</div></div>'
    + '<div style="background:var(--surf2);border-radius:10px;padding:10px"><div style="font-size:.65rem;color:var(--muted)">'+(LANG==='ar'?'المدفوع هذا الشهر':'Paid this month')+'</div><div style="font-weight:700;color:var(--green)">'+totalPaid+' AED</div></div>'
    + '<div style="background:var(--surf2);border-radius:10px;padding:10px"><div style="font-size:.65rem;color:var(--muted)">'+(LANG==='ar'?'المتبقي':'Remaining')+'</div><div style="font-weight:700;color:'+(rem>0?'var(--red)':'var(--green)')+'">'+rem+' AED</div></div>'
    + '<div style="background:var(--surf2);border-radius:10px;padding:10px"><div style="font-size:.65rem;color:var(--muted)">'+(LANG==='ar'?'الهاتف':'Phone')+'</div><div style="font-weight:700;font-size:.78rem">'+(unit.phone||'—')+'</div></div>'
    + '</div>'

    + '<div style="background:var(--surf2);border-radius:12px;padding:12px;margin-bottom:14px">'
    + '<div style="font-size:.65rem;color:var(--muted);font-weight:700;margin-bottom:8px">'+(LANG==='ar'?'بيانات المستأجر والتأمين':'Tenant & Deposit Info')+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.78rem">'
    + '<div><span style="color:var(--muted)">'+(LANG==='ar'?'تاريخ الدخول:':'Start Date:')+'</span> <span style="font-weight:600">'+(unit.start_date?new Date(unit.start_date).toLocaleDateString(LANG==='ar'?'ar-AE':'en-GB'):'—')+'</span></div>'
    + '<div><span style="color:var(--muted)">'+(LANG==='ar'?'عدد الأشخاص:':'Persons:')+'</span> <span style="font-weight:600">'+(unit.persons_count||1)+'</span></div>'
    + '<div><span style="color:var(--muted)">'+(LANG==='ar'?'اللغة:':'Language:')+'</span> <span style="font-weight:600">'+(unit.language==='ar'?'عربي':'English')+'</span></div>'
    + '<div><span style="color:var(--muted)">'+(LANG==='ar'?'حالة النافذة:':'Window:')+'</span> <span style="font-weight:600">'+(unit.window_status||'—')+'</span></div>'
    + '</div>'
    + depHTML
    + (unit.notes?'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);font-size:.75rem;color:var(--muted)">📝 '+unit.notes+'</div>':'')
    + '</div>'
    + '<div id="unit-imgs-section" style="margin-bottom:14px"></div>'

    + '<div style="display:flex;gap:8px;margin-bottom:8px">'
    + '<button class="btn bp" style="flex:1" id="drawer-pay-btn">💰 '+(LANG==='ar'?'تسجيل دفعة':'Record Payment')+'</button>'
    + '<button class="btn bg" style="flex:1" id="drawer-edit-btn">✏️ '+(LANG==='ar'?'تعديل':'Edit')+'</button>'
    + '</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:8px">'
    + '<button class="btn bg" style="flex:1;font-size:.8rem" id="drawer-wa-btn">💬 WhatsApp</button>'
    + '<button class="btn br" style="flex:1;font-size:.8rem" id="drawer-del-btn">🗑️ '+(LANG==='ar'?'حذف':'Delete')+'</button>'
    + '</div>'
    + '<button id="drawer-hist-btn" style="width:100%;padding:11px;background:var(--surf2);border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:inherit;font-size:.82rem;font-weight:600;cursor:pointer">📋 '+(LANG==='ar'?'سجل الدفعات':'Payment History')+'</button>'
    + '<div id="pay-history" style="display:none"></div>';

  // ── Load unit images ──
  loadUnitImages(unitId).then(function(imgs) {
    var sec = document.getElementById('unit-imgs-section');
    if(!sec) return;
    if(imgs.length === 0) { sec.innerHTML = ''; return; }
    sec.innerHTML = '<div style="font-size:.65rem;color:var(--muted);font-weight:700;margin-bottom:8px">📷 صور الوحدة</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
      + imgs.map(img=>`<img src="${img.image_data}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;border:2px solid var(--border);cursor:pointer" onclick="window.open(this.src)">`).join('')
      + '</div>';
  });

  // ── Safe event listeners (no closure variable issues) ──
  var _u = unit; // local ref
  document.getElementById('drawer-pay-btn').onclick = function() {
    if(_u.tenant_name2) { askWhoPayment(_u.id, _u.apartment, _u.room, _u); }
    else { closeDrawer(); goPanel('pay'); setTimeout(function(){ document.getElementById('r-apt').value=_u.apartment; document.getElementById('r-room').value=_u.room; },50); }
  };
  document.getElementById('drawer-edit-btn').onclick  = function(){ closeDrawer(); editUnit(_u.id); };
  document.getElementById('drawer-del-btn').onclick   = function(){ confirmDel(_u.id, _u.apartment, _u.room); };
  document.getElementById('drawer-wa-btn').onclick    = function(){ if(_u.tenant_name2) askWhoWA(_u.apartment,_u.room,_u); else showWAModal(_u.apartment,_u.room); };
  document.getElementById('drawer-hist-btn').onclick  = function(){ togglePayHistory(_u.id); };

  // Re-attach overlay listener each time (safe)
  var _ov = document.getElementById('drawerOverlay');
  _ov.onclick = closeDrawer;
  var _ov2=document.getElementById('drawerOverlay'); _ov2.classList.add('open'); _ov2.style.display='';
  var _dr2=document.getElementById('drawer'); _dr2.classList.add('open'); _dr2.style.display='';
  document.body.style.overflow='hidden';

  } catch(e){ toast('خطأ: '+e.message,'err'); document.body.style.overflow=''; }
}

function drTouchStart(e){ _drStartY=e.touches[0].clientY; _drDy=0; }

function drTouchMove(e){
  _drDy = e.touches[0].clientY - _drStartY;
  if(_drDy>0){ document.getElementById('drawer').style.transform='translateY('+_drDy+'px)'; }
}

function drTouchEnd(e){
  document.getElementById('drawer').style.transform='';
  if(_drDy>80) closeDrawer();
  _drDy=0;
}

function closeDrawer() {
  var ov = document.getElementById('drawerOverlay');
  var dr = document.getElementById('drawer');
  if(ov) { ov.classList.remove('open'); ov.style.display=''; }
  if(dr) { dr.classList.remove('open'); dr.style.display=''; }
  document.body.style.overflow = '';
  MO = [];
}

async function editUnit(unitId) {
  var unit = MO.find(u=>u.id===unitId);
  if(!unit) {
    var { data } = await sb.from('units').select('*').eq('id',unitId).single();
    unit = data;
  }
  if(!unit) { toast(LANG==='ar'?'لم يتم العثور على الوحدة':'Unit not found','err'); return; }
  goPanel('unit');
  document.getElementById('u-apt').value   = unit.apartment||'';
  document.getElementById('u-room').value  = unit.room||'';
  document.getElementById('u-rent').value  = unit.monthly_rent||'';
  document.getElementById('u-rent1').value = unit.rent1||'';
  document.getElementById('u-rent2').value = unit.rent2||'';
  document.getElementById('u-dep').value   = unit.deposit||'';
  document.getElementById('u-start').value = unit.start_date||'';
  document.getElementById('u-name').value  = unit.tenant_name||'';
  document.getElementById('u-phone').value = unit.phone||'';
  document.getElementById('u-name2').value = unit.tenant_name2||'';
  document.getElementById('u-phone2').value= unit.phone2||'';
  document.getElementById('u-cnt').value   = unit.persons_count||1;
  document.getElementById('u-lang').value  = unit.language||'ar';
  document.getElementById('u-win').value   = unit.window_status||'';
  document.getElementById('u-notes').value = unit.notes||'';
  var pr=document.getElementById('total-rent-preview');
  if(pr) pr.textContent=(unit.monthly_rent||0)+' AED';
}

function confirmDel(id, apt, room) {
  if(!confirm((LANG==='ar'?'حذف شقة':'Delete unit')+` ${apt}-${room}?`)) return;
  deleteUnit(id);
}

async function deleteUnit(id) {
  closeDrawer();
  var { error } = await sb.from('units').delete().eq('id',id);
  if(error){ toast('خطأ: '+error.message,'err'); return; }
  toast(LANG==='ar'?'تم الحذف ✓':'Deleted ✓','ok');
  MO = MO.filter(u=>u.id!==id);
  loadUnits();
  loadHome(null,true);
}

async function saveUnit(btn) {
  if(MY_ROLE==='viewer'){toast(LANG==='ar'?'ليس لديك صلاحية':'No permission','err');return;}
  var apt  = document.getElementById('u-apt').value.trim();
  var room = document.getElementById('u-room').value.trim();
  var rent1 = Number(document.getElementById('u-rent1').value||0);
  var rent2 = Number(document.getElementById('u-rent2').value||0);
  var rent  = Number(document.getElementById('u-rent').value||0) || (rent1+rent2) || rent1;
  if(!rent && (rent1||rent2)) rent = rent1+rent2;
  if(!apt||!room||!rent){toast(LANG==='ar'?'الشقة والغرفة والإيجار إلزامية':'Apartment, room and rent are required','err');return;}

  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var name2  = document.getElementById('u-name2').value.trim()||null;
    var phone2 = document.getElementById('u-phone2').value.trim()||null;
    var payload = {
      monthly_rent:  rent,
      deposit:       Number(document.getElementById('u-dep').value||0),
      start_date:    document.getElementById('u-start').value||null,
      tenant_name:   document.getElementById('u-name').value.trim()||null,
      phone:         document.getElementById('u-phone').value.trim()||null,
      tenant_name2:  name2,
      phone2:        phone2,
      rent1:         rent1||null,
      rent2:         rent2||null,
      persons_count: Number(document.getElementById('u-cnt').value||1),
      language:      document.getElementById('u-lang').value,
      window_status: document.getElementById('u-win').value.trim()||null,
      notes:         document.getElementById('u-notes').value.trim()||null,
      is_vacant:     false,
    };

    var { data: existing } = await sb.from('units').select('id').eq('apartment',apt).eq('room',room).single();

    if(existing) {
      var { error } = await sb.from('units').update(payload).eq('id',existing.id);
      if(error) throw error;
    } else {
      var { error } = await sb.from('units').insert({apartment:apt,room:room,...payload});
      if(error) throw error;
    }

    // Auto-save deposit to deposits table if amount > 0
    var depAmt = Number(document.getElementById('u-dep').value||0);
    var { data: savedUnit2 } = await sb.from('units').select('id').eq('apartment',apt).eq('room',room).single();
    if(savedUnit2) {
      if(depAmt > 0) {
        // Check if deposit already exists
        var { data: existDep } = await sb.from('deposits').select('id').eq('unit_id',savedUnit2.id).maybeSingle();
        if(existDep) {
          // Update existing
          var { error: depErr } = await sb.from('deposits').update({
            amount: depAmt,
            status: 'held',
            tenant_name: document.getElementById('u-name').value.trim()||null,
          }).eq('unit_id', savedUnit2.id);
          if(depErr) console.error('Deposit update error:', depErr);
        } else {
          // Insert new
          var { error: depErr2 } = await sb.from('deposits').insert({
            unit_id: savedUnit2.id,
            amount: depAmt,
            status: 'held',
            tenant_name: document.getElementById('u-name').value.trim()||null,
          });
          if(depErr2) console.error('Deposit insert error:', depErr2);
        }
      }
    }
    // Upload images if any
    if(savedUnit2 && _unitImgFiles && _unitImgFiles.length > 0) {
      await uploadUnitImages(savedUnit2.id);
      _unitImgFiles = [];
      var prev = document.getElementById('unit-imgs-preview');
      if(prev) prev.innerHTML = '';
    }
    toast(LANG==='ar'?'تم حفظ الوحدة ✓':'Unit saved ✓','ok');
    clearUnit();
    await loadHome(null,true);
  } catch(e){
    toast((LANG==='ar'?'خطأ: ':'Error: ')+(e.message||JSON.stringify(e)),'err');
  } finally{ btn.disabled=false; btn.innerHTML=orig; }
}

function clearUnit() {
  ['u-apt','u-room','u-rent','u-rent1','u-rent2','u-dep','u-start',
   'u-name','u-phone','u-name2','u-phone2','u-notes','u-win'].forEach(id=>{
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('u-cnt').value='1';
  document.getElementById('u-lang').value='ar';
  var pr=document.getElementById('total-rent-preview'); if(pr) pr.textContent='0 AED';
}

function calcTotalRent() {
  var r1=Number(document.getElementById('u-rent1').value||0);
  var r2=Number(document.getElementById('u-rent2').value||0);
  var total=r1+r2;
  var pr=document.getElementById('total-rent-preview'); if(pr) pr.textContent=total+' AED';
  // Auto-fill main rent field
  if(total>0) document.getElementById('u-rent').value=total;
}


window.loadHome=loadHome; window.loadUnits=loadUnits; window.renderUnits=renderUnits; window.setFilter=setFilter; window.filterUnits=filterUnits; window.openDrawer=openDrawer; window.drTouchStart=drTouchStart; window.drTouchMove=drTouchMove; window.drTouchEnd=drTouchEnd; window.closeDrawer=closeDrawer; window.editUnit=editUnit; window.confirmDel=confirmDel; window.deleteUnit=deleteUnit; window.saveUnit=saveUnit; window.clearUnit=clearUnit; window.calcTotalRent=calcTotalRent;