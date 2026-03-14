// ══ PAYMENTS ══

async function autoFillRent() {
  var apt  = document.getElementById('r-apt').value.trim();
  var room = document.getElementById('r-room').value.trim();
  if(!apt || !room) return;
  try {
    var { data: unit } = await sb.from('units')
      .select('monthly_rent,tenant_name,rent1,rent2,tenant_name2')
      .eq('apartment', apt).eq('room', room).single();
    if(!unit) return;
    
    // Fill amount with monthly rent (editable)
    var amtEl = document.getElementById('r-amt');
    if(amtEl && !amtEl.value) amtEl.value = unit.monthly_rent || '';
    
    // Show tenant info hint
    var badge = document.getElementById('r-tenant-badge');
    if(badge && unit.tenant_name) {
      var info = unit.tenant_name;
      if(unit.tenant_name2) info += ' & ' + unit.tenant_name2;
      if(unit.monthly_rent) info += ' — ' + unit.monthly_rent + ' AED';
      badge.textContent = '👤 ' + info;
      badge.style.display = 'block';
      badge.style.color = 'var(--accent)';
    }
  } catch(e) { /* unit not found yet */ }
}

async function saveRent(btn) {
  if(MY_ROLE==='viewer'){toast(LANG==='ar'?'ليس لديك صلاحية':'No permission','err');return;}
  var apt  = document.getElementById('r-apt').value.trim();
  var room = document.getElementById('r-room').value.trim();
  var amt  = Number(document.getElementById('r-amt').value||0);
  var mon  = document.getElementById('r-month').value;
  if(!apt||!room||!amt||!mon){toast(LANG==='ar'?'كل الحقول إلزامية':'All fields required','err');return;}

  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { data: unit } = await sb.from('units').select('id').eq('apartment',apt).eq('room',room).single();
    if(!unit) throw new Error(LANG==='ar'?'الوحدة غير موجودة':'Unit not found');

    var tNum = Number(document.getElementById('r-tenant-num').value||0);
    var pdateVal = document.getElementById('r-pdate').value;
    var paymentDate = pdateVal || new Date().toISOString().split('T')[0];
    var { error } = await sb.from('rent_payments').insert({
      unit_id: unit.id,
      apartment: apt,
      room: room,
      amount: amt,
      amount_paid: amt,
      payment_month: mon+'-01',
      payment_date: paymentDate,
      payment_method: document.getElementById('r-meth').value,
      received_by: ME?.id||null,
      tenant_num: tNum||null,
      notes: document.getElementById('r-notes').value.trim()||null,
    });
    if(error) throw error;
    toast(LANG==='ar'?'تم تسجيل الدفعة ✓':'Payment recorded ✓','ok');
    document.getElementById('r-amt').value='';
    document.getElementById('r-notes').value='';
    document.getElementById('r-pdate').value='';
    document.getElementById('r-apt').value='';
    document.getElementById('r-room').value='';
    document.getElementById('r-tenant-num').value='0';
    var badge=document.getElementById('r-tenant-badge'); if(badge){badge.style.display='none';badge.textContent='';}
    loadHome(null,true);
  } catch(e){ toast((LANG==='ar'?'خطأ: ':'Error: ')+e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function saveExp(btn) {
  if(MY_ROLE==='collector'||MY_ROLE==='viewer'){toast(LANG==='ar'?'ليس لديك صلاحية':'No permission','err');return;}
  var amt = Number(document.getElementById('e-amt').value||0);
  var mon = document.getElementById('e-month').value;
  if(!amt||!mon){toast(LANG==='ar'?'المبلغ والشهر إلزاميان':'Amount and month required','err');return;}

  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { error } = await sb.from('expenses').insert({
      category: document.getElementById('e-cat').value,
      amount: amt, month: mon+'-01',
      receipt_number: document.getElementById('e-rec').value.trim()||null,
      description: document.getElementById('e-desc').value.trim()||null,
    });
    if(error) throw error;
    toast(LANG==='ar'?'تم تسجيل المصروف ✓':'Expense recorded ✓','ok');
    document.getElementById('e-amt').value='';
    document.getElementById('e-rec').value='';
    document.getElementById('e-desc').value='';
  } catch(e){ toast((LANG==='ar'?'خطأ: ':'Error: ')+e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function saveOwner(btn) {
  if(MY_ROLE==='collector'||MY_ROLE==='viewer'){toast(LANG==='ar'?'ليس لديك صلاحية':'No permission','err');return;}
  var amt = Number(document.getElementById('o-amt').value||0);
  var mon = document.getElementById('o-month').value;
  if(!amt||!mon){toast(LANG==='ar'?'المبلغ والشهر إلزاميان':'Amount and month required','err');return;}

  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { error } = await sb.from('owner_payments').insert({
      amount: amt, month: mon+'-01',
      payment_method: document.getElementById('o-meth').value,
      reference_number: document.getElementById('o-ref').value.trim()||null,
      notes: document.getElementById('o-notes').value.trim()||null,
    });
    if(error) throw error;
    toast(LANG==='ar'?'تم تسجيل الدفعة للمالك ✓':'Owner payment recorded ✓','ok');
    document.getElementById('o-amt').value='';
    document.getElementById('o-ref').value='';
    document.getElementById('o-notes').value='';
  } catch(e){ toast((LANG==='ar'?'خطأ: ':'Error: ')+e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function saveDep(btn) {
  if(MY_ROLE==='viewer'){toast(LANG==='ar'?'ليس لديك صلاحية':'No permission','err');return;}
  var apt  = document.getElementById('d-apt').value.trim();
  var room = document.getElementById('d-room').value.trim();
  var amt  = Number(document.getElementById('d-amt').value||0);
  if(!apt||!room||!amt){toast(LANG==='ar'?'الشقة والغرفة والمبلغ إلزامية':'All fields required','err');return;}

  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { data: unit } = await sb.from('units').select('id').eq('apartment',apt).eq('room',room).single();
    if(!unit) throw new Error(LANG==='ar'?'الوحدة غير موجودة':'Unit not found');

    var { error } = await sb.from('deposits').upsert({
      unit_id: unit.id,
      tenant_name: document.getElementById('d-name').value.trim()||null,
      amount: amt,
      status: document.getElementById('d-status').value,
      refund_amount: Number(document.getElementById('d-ref').value||0),
      deduction_amount: Number(document.getElementById('d-ded').value||0),
      deduction_reason: document.getElementById('d-why').value.trim()||null,
      notes: document.getElementById('d-notes').value.trim()||null,
    }, {onConflict:'unit_id'});
    if(error) throw error;
    toast(LANG==='ar'?'تم حفظ التأمين ✓':'Deposit saved ✓','ok');
  } catch(e){ toast((LANG==='ar'?'خطأ: ':'Error: ')+e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

function setPayTenant(num, apt, room, amt, name) {
  goPanel('pay');
  // Wait for panel to render before setting values
  setTimeout(function(){
    var aptEl = document.getElementById('r-apt'); if(aptEl) aptEl.value = apt;
    var roomEl = document.getElementById('r-room'); if(roomEl) roomEl.value = room;
    var tnEl = document.getElementById('r-tenant-num'); if(tnEl) tnEl.value = num;
    var amtEl = document.getElementById('r-amt'); if(amt && amtEl) amtEl.value = amt;
    var badge = document.getElementById('r-tenant-badge');
    if(badge) {
      if(num > 0 && name) {
        badge.textContent = '👤 ' + (LANG==='ar'?'المستأجر: ':'Tenant: ') + name;
        badge.style.display = 'block';
        badge.style.borderRight = '3px solid ' + (num===1?'var(--accent)':'var(--amber)');
        badge.style.color = num===1?'var(--accent)':'var(--amber)';
      } else {
        badge.style.display = 'none';
      }
    }
  }, 50);
}

function askWhoPayment(unitId, apt, room, unit) {
  if(!unit) unit = MO.find(u=>u.id===unitId);
  if(!unit) return;

  var t1 = unit.tenant_name || (LANG==='ar'?'المستأجر الأول':'Tenant 1');
  var t2 = unit.tenant_name2 || (LANG==='ar'?'المستأجر الثاني':'Tenant 2');
  var r1 = unit.rent1 || 0;
  var r2 = unit.rent2 || 0;

  // Replace drawer content with who-selection screen (no modal)
  var dc = document.getElementById('drawerContent');
  if(!dc) return;

  dc.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:8px 0';

  var title = document.createElement('div');
  title.style.cssText = 'font-size:1.1rem;font-weight:700;margin-bottom:6px;text-align:right';
  title.textContent = '💰 ' + (LANG==='ar'?'تسجيل دفعة':'Record Payment');

  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:.82rem;color:var(--muted);margin-bottom:20px;text-align:right';
  sub.textContent = LANG==='ar'?'اختر المستأجر:':'Select tenant:';

  var btn1 = document.createElement('button');
  btn1.style.cssText = 'width:100%;padding:16px;margin-bottom:10px;background:var(--surf2);border:2px solid var(--accent);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;-webkit-tap-highlight-color:transparent';
  btn1.innerHTML = '<span style="color:var(--text)">👤 '+t1+'</span><span style="color:var(--accent);font-weight:800">'+r1+' AED</span>';

  var btn2 = document.createElement('button');
  btn2.style.cssText = 'width:100%;padding:16px;margin-bottom:10px;background:var(--surf2);border:2px solid var(--amber);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;display:flex;justify-content:space-between;align-items:center;-webkit-tap-highlight-color:transparent';
  btn2.innerHTML = '<span style="color:var(--text)">👤 '+t2+'</span><span style="color:var(--amber);font-weight:800">'+r2+' AED</span>';

  var btnM = document.createElement('button');
  btnM.style.cssText = 'width:100%;padding:14px;margin-bottom:10px;background:none;border:1px solid var(--border);border-radius:14px;color:var(--muted);font-family:inherit;font-size:.9rem;cursor:pointer;-webkit-tap-highlight-color:transparent';
  btnM.textContent = LANG==='ar'?'إدخال يدوي':'Manual Entry';

  var btnBack = document.createElement('button');
  btnBack.style.cssText = 'width:100%;padding:12px;background:none;border:none;color:var(--muted);font-family:inherit;font-size:.85rem;cursor:pointer;-webkit-tap-highlight-color:transparent';
  btnBack.textContent = '← ' + (LANG==='ar'?'رجوع':'Back');

  wrap.appendChild(title);
  wrap.appendChild(sub);
  wrap.appendChild(btn1);
  wrap.appendChild(btn2);
  wrap.appendChild(btnM);
  wrap.appendChild(btnBack);
  dc.appendChild(wrap);

  btn1.onclick = function(){ closeDrawer(); goPanel('pay'); setTimeout(function(){ document.getElementById('r-apt').value=apt; document.getElementById('r-room').value=room; document.getElementById('r-tenant-num').value='1'; var b=document.getElementById('r-tenant-badge'); if(b){b.textContent='👤 '+t1;b.style.display='block';b.style.color='var(--accent)';} if(r1){document.getElementById('r-amt').value=r1;} },80); };
  btn2.onclick = function(){ closeDrawer(); goPanel('pay'); setTimeout(function(){ document.getElementById('r-apt').value=apt; document.getElementById('r-room').value=room; document.getElementById('r-tenant-num').value='2'; var b=document.getElementById('r-tenant-badge'); if(b){b.textContent='👤 '+t2;b.style.display='block';b.style.color='var(--amber)';} if(r2){document.getElementById('r-amt').value=r2;} },80); };
  btnM.onclick = function(){ closeDrawer(); goPanel('pay'); setTimeout(function(){ document.getElementById('r-apt').value=apt; document.getElementById('r-room').value=room; document.getElementById('r-tenant-num').value='0'; },80); };
  btnBack.onclick = function(){ openDrawer(unitId); };
}

function askWhoWA(apt, room, unit) {
  if(!unit) unit = MO.find(u=>String(u.apartment)===String(apt)&&String(u.room)===String(room));
  if(!unit) return;

  var dc = document.getElementById('drawerContent');
  if(!dc) return;
  dc.innerHTML = '';

  var wrap = document.createElement('div');
  wrap.style.cssText = 'padding:8px 0';

  var title = document.createElement('div');
  title.style.cssText = 'font-size:1.1rem;font-weight:700;margin-bottom:6px;text-align:right';
  title.textContent = '💬 WhatsApp';

  var sub = document.createElement('div');
  sub.style.cssText = 'font-size:.82rem;color:var(--muted);margin-bottom:20px;text-align:right';
  sub.textContent = LANG==='ar'?'ابعت لمين؟':'Send to who?';

  var btn1 = document.createElement('button');
  btn1.style.cssText = 'width:100%;padding:16px;margin-bottom:10px;background:var(--surf2);border:2px solid var(--accent);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent';
  btn1.textContent = '👤 '+(unit.tenant_name||'المستأجر الأول');

  var btn2 = document.createElement('button');
  btn2.style.cssText = 'width:100%;padding:16px;margin-bottom:10px;background:var(--surf2);border:2px solid var(--amber);border-radius:14px;color:var(--text);font-family:inherit;font-size:1rem;font-weight:700;cursor:pointer;-webkit-tap-highlight-color:transparent';
  btn2.textContent = '👤 '+(unit.tenant_name2||'المستأجر الثاني');

  var btnBack = document.createElement('button');
  btnBack.style.cssText = 'width:100%;padding:12px;background:none;border:none;color:var(--muted);font-family:inherit;font-size:.85rem;cursor:pointer;-webkit-tap-highlight-color:transparent';
  btnBack.textContent = '← '+(LANG==='ar'?'رجوع':'Back');

  wrap.appendChild(title);
  wrap.appendChild(sub);
  wrap.appendChild(btn1);
  wrap.appendChild(btn2);
  wrap.appendChild(btnBack);
  dc.appendChild(wrap);

  btn1.onclick = function(){ showWAModal(apt, room, 1); };
  btn2.onclick = function(){ showWAModal(apt, room, 2); };
  btnBack.onclick = function(){ openDrawer(unit.id); };
}

async function togglePayHistory(unitId) {
  var container = document.getElementById('pay-history');
  var btn = document.getElementById('drawer-hist-btn');
  if(!container || !btn) return;

  if(container.style.display !== 'none') {
    container.style.display = 'none';
    btn.textContent = (LANG==='ar'?'📋 سجل الدفعات':'📋 Payment History');
    return;
  }

  btn.textContent = '⏳ ...';
  var { data: pays, error } = await sb.from('rent_payments')
    .select('*').eq('unit_id', unitId)
    .order('payment_month', {ascending: false});

  if(error || !pays || pays.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:16px;color:var(--muted);font-size:.82rem">${LANG==='ar'?'لا توجد دفعات مسجّلة':'No payments recorded'}</div>`;
    container.style.display = 'block';
    btn.textContent = (LANG==='ar'?'📋 إخفاء السجل':'📋 Hide History');
    return;
  }

  var html = `<div style="margin-top:10px;border-top:1px solid var(--border);padding-top:10px">
    <div style="font-size:.7rem;color:var(--muted);font-weight:700;text-transform:uppercase;margin-bottom:8px">${LANG==='ar'?'سجل الدفعات':'Payment History'}</div>`;

  pays.forEach(p => {
    var mon = p.payment_month ? p.payment_month.slice(0,7) : '—';
    var amt = p.amount || p.amount_paid || 0;
    var method = p.payment_method || '—';
    var notes = p.notes || '';
    var pdate = p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB') : '';
    html += `<div style="background:var(--surf2);border-radius:10px;padding:10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <div style="font-weight:700;font-size:.85rem">${amt} AED</div>
        <div style="font-size:.7rem;color:var(--muted)">${mon} · ${method}${pdate?' · 📅 '+pdate:''}</div>
        ${notes?`<div style="font-size:.7rem;color:var(--muted);margin-top:2px">${notes}</div>`:''}
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="editPayment('${p.id}','${unitId}')" 
          style="padding:6px 10px;background:var(--accent)22;border:1px solid var(--accent);border-radius:8px;color:var(--accent);font-size:.72rem;cursor:pointer;font-family:inherit">✏️</button>
        <button onclick="deletePayment('${p.id}','${unitId}')"
          style="padding:6px 10px;background:var(--red)22;border:1px solid var(--red);border-radius:8px;color:var(--red);font-size:.72rem;cursor:pointer;font-family:inherit">🗑️</button>
      </div>
    </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
  container.style.display = 'block';
  btn.textContent = (LANG==='ar'?'📋 إخفاء السجل':'📋 Hide History');
}

async function editPayment(payId, unitId) {
  var modal = document.createElement('div');
  modal.id = 'edit-pay-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:500;display:flex;align-items:flex-end;justify-content:center;padding:16px';

  // Fetch payment
  var { data: p } = await sb.from('rent_payments').select('*').eq('id', payId).single();
  if(!p) { toast(LANG==='ar'?'لم يتم العثور على الدفعة':'Payment not found','err'); return; }

  var mon = p.payment_month ? p.payment_month.slice(0,7) : '';
  var amt = p.amount || p.amount_paid || 0;

  modal.innerHTML = `
    <div style="background:var(--surf);border-radius:20px;padding:20px;width:100%;max-width:480px">
      <div style="font-weight:700;font-size:1rem;margin-bottom:16px">✏️ ${LANG==='ar'?'تعديل الدفعة':'Edit Payment'}</div>
      <div class="fld"><label>${LANG==='ar'?'المبلغ (AED)':'Amount (AED)'}</label>
        <input class="inp" id="ep-amt" type="number" inputmode="numeric" value="${amt}">
      </div>
      <div class="fld"><label>${LANG==='ar'?'الشهر':'Month'}</label>
        <input class="inp" id="ep-mon" type="month" value="${mon}">
      </div>
      <div class="fld"><label>${LANG==='ar'?'طريقة الدفع':'Method'}</label>
        <select class="inp" id="ep-meth">
          <option value="Cash" ${p.payment_method==='Cash'?'selected':''}>نقدي</option>
          <option value="Bank Transfer" ${p.payment_method==='Bank Transfer'?'selected':''}>تحويل بنكي</option>
          <option value="Cheque" ${p.payment_method==='Cheque'?'selected':''}>شيك</option>
        </select>
      </div>
      <div class="fld"><label>${LANG==='ar'?'ملاحظات':'Notes'}</label>
        <input class="inp" id="ep-notes" value="${p.notes||''}">
      </div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="saveEditPayment('${payId}','${unitId}')"
          style="flex:1;padding:13px;background:var(--accent);border:none;border-radius:12px;color:var(--text);font-family:inherit;font-size:.9rem;font-weight:700;cursor:pointer">
          ${LANG==='ar'?'حفظ':'Save'}
        </button>
        <button onclick="document.getElementById('edit-pay-modal').remove()"
          style="padding:13px 18px;background:var(--surf2);border:1px solid var(--border);border-radius:12px;color:var(--muted);font-family:inherit;cursor:pointer">
          ${LANG==='ar'?'إلغاء':'Cancel'}
        </button>
      </div>
    </div>`;
  modal.addEventListener('click', e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

async function saveEditPayment(payId, unitId) {
  var amt  = Number(document.getElementById('ep-amt').value||0);
  var mon  = document.getElementById('ep-mon').value;
  var meth = document.getElementById('ep-meth').value;
  var notes= document.getElementById('ep-notes').value.trim()||null;
  if(!amt||!mon){ toast(LANG==='ar'?'المبلغ والشهر إلزاميان':'Amount and month required','err'); return; }

  var { error } = await sb.from('rent_payments').update({
    amount: amt, amount_paid: amt,
    payment_month: mon+'-01',
    payment_method: meth,
    notes: notes
  }).eq('id', payId);

  if(error){ toast((LANG==='ar'?'خطأ: ':'Error: ')+error.message,'err'); return; }
  toast(LANG==='ar'?'تم التعديل ✓':'Updated ✓','ok');
  document.getElementById('edit-pay-modal').remove();
  togglePayHistory(unitId); // refresh
  togglePayHistory(unitId); // toggle back open
  loadHome(null,true);
}

async function deletePayment(payId, unitId) {
  if(!confirm(LANG==='ar'?'هل تريد حذف هذه الدفعة؟':'Delete this payment?')) return;
  var { error } = await sb.from('rent_payments').delete().eq('id', payId);
  if(error){ toast((LANG==='ar'?'خطأ: ':'Error: ')+error.message,'err'); return; }
  toast(LANG==='ar'?'تم الحذف ✓':'Deleted ✓','ok');
  togglePayHistory(unitId);
  togglePayHistory(unitId);
  loadHome(null,true);
  loadUnits();
}


window.autoFillRent=autoFillRent; window.saveRent=saveRent; window.saveExp=saveExp; window.saveOwner=saveOwner; window.saveDep=saveDep; window.setPayTenant=setPayTenant; window.askWhoPayment=askWhoPayment; window.askWhoWA=askWhoWA; window.togglePayHistory=togglePayHistory; window.editPayment=editPayment; window.saveEditPayment=saveEditPayment; window.deletePayment=deletePayment;