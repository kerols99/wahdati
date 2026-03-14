// ══ MOVES ══

function getWelcomeData() {
  var name     = document.getElementById('wl-name').value || 'المستأجر';
  var room     = document.getElementById('wl-room').value || '—';
  var apt      = document.getElementById('wl-apt').value  || '—';
  var rent     = document.getElementById('wl-rent').value || '—';
  var dep      = document.getElementById('wl-dep').value  || '300';
  var building = document.getElementById('wl-building').value || 'Arabian Gulf';
  var persons  = document.getElementById('wl-persons') ? document.getElementById('wl-persons').value || '1' : '1';
  var phone    = document.getElementById('wl-phone') ? document.getElementById('wl-phone').value.replace(/\D/g,'') : '';
  var startRaw = document.getElementById('wl-start').value;
  var startEn  = startRaw ? new Date(startRaw).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '1st of the month';
  var startAr  = startRaw ? new Date(startRaw).toLocaleDateString('ar-EG',{day:'numeric',month:'long',year:'numeric'}) : '1 من الشهر';
  return {name, room, apt, rent, dep, building, persons, phone, startEn, startAr};
}

async function loadMovesList(type) {
  var listEl = document.getElementById(type === 'depart' ? 'depart-list' : 'arrive-list');
  if(!listEl) return;
  listEl.innerHTML = '<div style="text-align:center;padding:20px"><span class="spin"></span></div>';
  try {
    var { data, error } = await sb.from('moves')
      .select('*').eq('type', type).order('created_at', {ascending: false});
    if(error) throw error;
    if(!data || data.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:.85rem">'
        + (type==='depart' ? '📭 لا يوجد مغادرون مسجلون' : '📭 لا يوجد حجوزات مسجلة') + '</div>';
      return;
    }
    var html = '';
    data.forEach(function(m) {
      var dateStr = m.move_date ? new Date(m.move_date).toLocaleDateString('en-GB') : '';
      var badge = type==='depart'
        ? '<span style="background:var(--red)22;color:var(--red);border-radius:6px;padding:2px 8px;font-size:.7rem">📤 مغادر</span>'
        : '<span style="background:var(--green)22;color:var(--green);border-radius:6px;padding:2px 8px;font-size:.7rem">📥 حجز جديد</span>';
      html += '<div style="background:var(--surf);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:10px">'
        + '<div style="display:flex;justify-content:space-between;align-items:flex-start">'
        + '<div>'
        + '<div style="font-weight:700;font-size:.92rem;margin-bottom:4px">' + (m.tenant_name||'—') + '</div>'
        + '<div style="font-size:.75rem;color:var(--muted)">شقة ' + (m.apartment||'') + ' — غرفة ' + (m.room||'') + '</div>'
        + (dateStr ? '<div style="font-size:.72rem;color:var(--muted);margin-top:2px">📅 ' + dateStr + '</div>' : '')
        + (m.phone ? '<div style="font-size:.72rem;color:var(--muted);margin-top:2px">📱 ' + m.phone + '</div>' : '')
        + (m.persons_count && m.persons_count>1 ? '<div style="font-size:.72rem;color:var(--amber);margin-top:2px">👥 ' + m.persons_count + ' أشخاص</div>' : '')
        + (m.notes ? '<div style="font-size:.72rem;color:var(--muted);margin-top:4px;background:var(--surf2);padding:4px 8px;border-radius:6px">📝 ' + m.notes + '</div>' : '')
        + '</div>'
        + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">'
        + badge
        + '<button onclick="deleteMoveEntry(\'' + m.id + '\',\'' + type + '\')" style="background:var(--red)22;border:1px solid var(--red);border-radius:8px;padding:4px 10px;color:var(--red);font-size:.72rem;cursor:pointer">🗑️</button>'
        + '</div>'
        + '</div>'
        + '</div>';
    });
    listEl.innerHTML = html;
  } catch(e) {
    listEl.innerHTML = '<div style="color:var(--red);font-size:.8rem;padding:10px">خطأ: ' + e.message + '</div>';
  }
}

function addMoveEntry(type) {
  var isDepart = type === 'depart';
  var titleAr = isDepart ? '📤 إضافة مغادر' : '📥 إضافة حجز جديد';
  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:400;display:flex;align-items:flex-end;justify-content:center';
  overlay.innerHTML = '<div style="background:var(--surf);border-radius:20px 20px 0 0;padding:24px 20px 32px;width:100%;max-width:480px;max-height:80vh;overflow-y:auto">'
    + '<div style="font-weight:800;font-size:1rem;margin-bottom:16px">' + titleAr + '</div>'
    + '<div style="margin-bottom:10px"><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">اسم المستأجر</label>'
    + '<input id="me-name" class="inp" placeholder="الاسم"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">رقم الشقة</label>'
    + '<input id="me-apt" class="inp" type="number" placeholder="101"></div>'
    + '<div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">رقم الغرفة</label>'
    + '<input id="me-room" class="inp" type="number" placeholder="1"></div>'
    + '</div>'
    + '<div style="margin-bottom:10px"><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">'
    + (isDepart ? 'تاريخ المغادرة' : 'تاريخ البدء') + '</label>'
    + '<input id="me-date" class="inp" type="date"></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    + '<div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">رقم واتساب</label>'
    + '<input id="me-phone" class="inp" type="tel" placeholder="971501234567" inputmode="numeric"></div>'
    + '<div><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">عدد الأشخاص</label>'
    + '<input id="me-persons" class="inp" type="number" value="1" min="1" placeholder="1"></div>'
    + '</div>'
    + '<div style="margin-bottom:16px"><label style="font-size:.78rem;color:var(--muted);display:block;margin-bottom:4px">ملاحظات (اختياري)</label>'
    + '<input id="me-notes" class="inp" placeholder="..."></div>'
    + '<div style="display:flex;gap:8px">'
    + '<button onclick="saveMoveEntry(\'' + type + '\',this)" class="btn bp" style="flex:2">حفظ</button>'
    + '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="flex:1;padding:12px;background:var(--surf2);border:1px solid var(--border);border-radius:12px;color:var(--text);font-family:inherit;cursor:pointer">إلغاء</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(overlay);
  // Set default date to first of next month
  var now = new Date();
  var next = new Date(now.getFullYear(), now.getMonth()+1, 1);
  var dateEl = document.getElementById('me-date');
  if(dateEl) dateEl.value = next.toISOString().split('T')[0];
}

async function saveMoveEntry(type, btn) {
  var name    = (document.getElementById('me-name')||{}).value||'';
  var apt     = (document.getElementById('me-apt')||{}).value||'';
  var room    = (document.getElementById('me-room')||{}).value||'';
  var date    = (document.getElementById('me-date')||{}).value||'';
  var notes   = (document.getElementById('me-notes')||{}).value||'';
  var phone   = (document.getElementById('me-phone')||{}).value||'';
  var persons = (document.getElementById('me-persons')||{}).value||'1';
  if(!name || !apt || !room) { toast('يرجى ملء الاسم والشقة والغرفة','err'); return; }
  var orig = btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try {
    var { error } = await sb.from('moves').insert({
      type: type,
      tenant_name: name,
      apartment: parseInt(apt),
      room: parseInt(room),
      move_date: date || null,
      notes: notes || null,
      phone: phone || null,
      persons_count: parseInt(persons)||1,
      created_by: (SB_USER||{}).id || null
    });
    if(error) throw error;
    toast(type==='depart' ? 'تم تسجيل المغادر ✓' : 'تم تسجيل الحجز ✓', 'ok');
    btn.closest('div[style*="fixed"]').remove();
    loadMovesList(type);
  } catch(e) { toast('خطأ: '+e.message,'err'); }
  finally { btn.disabled=false; btn.innerHTML=orig; }
}

async function deleteMoveEntry(id, type) {
  if(!confirm('حذف هذا السجل؟')) return;
  try {
    var { error } = await sb.from('moves').delete().eq('id', id);
    if(error) throw error;
    toast('تم الحذف','ok');
    loadMovesList(type);
  } catch(e) { toast('خطأ: '+e.message,'err'); }
}

function showWelcomeLetter() {
  var d = getWelcomeData();
  var html = buildWelcomeLetter(d.name, d.room, d.apt, d.rent, d.dep, d.building, d.startEn, d.startAr, d.persons);
  var preview = document.getElementById('welcome-preview');
  if(preview) {
    preview.innerHTML = '<div style="background:#fff;border-radius:12px;padding:20px;color:#111;font-size:.78rem;line-height:1.7;max-height:60vh;overflow-y:auto;border:1px solid var(--border)">' + html + '</div>';
    // scroll to preview
    setTimeout(function(){ preview.scrollIntoView({behavior:'smooth', block:'start'}); }, 100);
  }
  window._welcomeHTML = html;
}

function printWelcomeLetter() {
  var d = getWelcomeData();
  window._welcomeHTML = buildWelcomeLetter(d.name, d.room, d.apt, d.rent, d.dep, d.building, d.startEn, d.startAr, d.persons);
  var win = window.open('','_blank');
  if(!win) { toast('يرجى السماح بالنوافذ المنبثقة','err'); return; }
  var printCSS = [
    'body{font-family:Arial,sans-serif;padding:20px;font-size:12px;line-height:1.6;color:#111}',
    'table{width:100%;border-collapse:collapse}',
    'td,th{padding:6px 10px;border:1px solid #ddd}',
    '@media print{.no-print{display:none}}'
  ].join('');
  win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contract</title>');
  win.document.write('<st'+'yle>' + printCSS + '</st'+'yle>');
  win.document.write('</head><body>');
  win.document.write('<div class="no-print" style="margin-bottom:16px">');
  win.document.write('<button onclick="window.print()" style="padding:10px 20px;background:#3b7ef5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-left:8px">🖨️ طباعة / PDF</button>');
  win.document.write('<button onclick="window.close()" style="padding:10px 20px;background:#666;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">✕ إغلاق</button>');
  win.document.write('</div>');
  win.document.write(window._welcomeHTML);
  win.document.write('</body></html>');
  win.document.close();
}

function buildWelcomeLetter(name, room, apt, rent, dep, building, startEn, startAr, persons) {
  persons = persons || '1';
  var personsTextEn = persons == '1' ? 'one person only' : persons + ' persons only';
  var personsTextAr = persons == '1' ? 'شخص واحد فقط' : persons + ' أشخاص فقط';

  return `
  <div style="font-family:Arial,sans-serif;max-width:900px;margin:0 auto">

    <!-- ══ BILINGUAL HEADER ══ -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:2px solid #1a3a6e">
      <tr>
        <!-- English left -->
        <td style="width:50%;padding:12px 16px;vertical-align:top;border-right:1px solid #ccc">
          <div style="font-size:11px;color:#555">CONTRACT PERIOD :-</div>
          <div style="font-weight:700;font-size:13px;color:#1a3a6e">FROM ${startEn} ONWARDS</div>
          <div style="margin-top:8px;font-size:11px"><strong>Tel. : 0585586869</strong></div>
        </td>
        <!-- Arabic right -->
        <td style="width:50%;padding:12px 16px;vertical-align:top;direction:rtl;text-align:right">
          <div style="font-size:11px;color:#555">بداية العقد :-</div>
          <div style="font-weight:700;font-size:13px;color:#1a3a6e">من ${startAr} فصاعداً</div>
          <div style="margin-top:8px;font-size:11px;direction:rtl"><strong>هاتف: 0585586869</strong></div>
        </td>
      </tr>
    </table>

    <!-- ══ SUBJECT BILINGUAL ══ -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:2px solid #1a3a6e">
      <tr style="background:#f0f4ff">
        <td style="padding:8px 16px;font-weight:800;font-size:13px;color:#1a3a6e;border-right:1px solid #ccc;width:50%">
          SUBJECT OF TENANCY:
        </td>
        <td style="padding:8px 16px;font-weight:800;font-size:13px;color:#1a3a6e;direction:rtl;text-align:right">
          موضوع الإيجار:
        </td>
      </tr>
      <tr>
        <td style="padding:10px 16px;vertical-align:top;border-right:1px solid #ccc;font-size:12px">
          <strong>Partition No. (${room})</strong>, ${building} Building, Apartment ${apt}<br>
          Monthly Rent: <strong>${rent} AED</strong> for ${personsTextEn}<br>
          Security Deposit: <strong>${dep} AED</strong> (Refundable)
        </td>
        <td style="padding:10px 16px;vertical-align:top;direction:rtl;text-align:right;font-size:12px">
          <strong>بارتشن رقم (${room})</strong>، مبنى ${building}، شقة ${apt}<br>
          الإيجار الشهري: <strong>${rent} درهم</strong> لـ ${personsTextAr}<br>
          التأمين: <strong>${dep} درهم</strong> (قابل للاسترداد)
        </td>
      </tr>
    </table>

    <!-- ══ TENANT INFO ══ -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:2px solid #1a3a6e">
      <tr style="background:#f0f4ff">
        <td colspan="4" style="padding:8px 16px;font-weight:800;font-size:13px;color:#1a3a6e;text-align:center">
          TENANT DETAILS &nbsp;|&nbsp; بيانات المستأجر
        </td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fb;font-weight:700;font-size:11px;width:20%;border:1px solid #ddd">Tenant Name</td>
        <td style="padding:8px 12px;font-size:12px;border:1px solid #ddd;width:30%">${name}</td>
        <td style="padding:8px 12px;background:#f5f7fb;font-weight:700;font-size:11px;width:20%;border:1px solid #ddd;direction:rtl;text-align:right">اسم المستأجر</td>
        <td style="padding:8px 12px;font-size:12px;border:1px solid #ddd;direction:rtl;text-align:right">${name}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fb;font-weight:700;font-size:11px;border:1px solid #ddd">Amount Received</td>
        <td style="padding:8px 12px;font-size:12px;border:1px solid #ddd">${dep} AED (Security Deposit)</td>
        <td style="padding:8px 12px;background:#f5f7fb;font-weight:700;font-size:11px;border:1px solid #ddd;direction:rtl;text-align:right">المبلغ المستلم</td>
        <td style="padding:8px 12px;font-size:12px;border:1px solid #ddd;direction:rtl;text-align:right">${dep} درهم (تأمين)</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;background:#f5f7fb;font-weight:700;font-size:11px;border:1px solid #ddd">No. of Persons</td>
        <td style="padding:8px 12px;font-size:12px;border:1px solid #ddd">${persons}</td>
        <td style="padding:8px 12px;background:#f5f7fb;font-weight:700;font-size:11px;border:1px solid #ddd;direction:rtl;text-align:right">عدد الأشخاص</td>
        <td style="padding:8px 12px;font-size:12px;border:1px solid #ddd;direction:rtl;text-align:right">${persons}</td>
      </tr>
    </table>

    <!-- ══ CONDITIONS BILINGUAL ══ -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:2px solid #1a3a6e">
      <tr style="background:#f0f4ff">
        <td style="padding:8px 16px;font-weight:800;font-size:13px;color:#1a3a6e;border-right:1px solid #ccc;width:50%">CONDITIONS:</td>
        <td style="padding:8px 16px;font-weight:800;font-size:13px;color:#1a3a6e;direction:rtl;text-align:right">الشروط:</td>
      </tr>

      <!-- Row 1 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>1. Security Deposit Policy</strong><br>
          • Amount: <strong>${dep} AED</strong> (Refundable)<br>
          • Notice of departure must be given <strong>15 days in advance</strong> (before the 16th).<br>
          • If notice is after the 16th, <strong>full month's rent</strong> will be charged.<br>
          • Partition must be handed over with <strong>no damages</strong>.<br>
          • Deposit is <strong>non-refundable</strong> if terms are not met.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>1. سياسة التأمين</strong><br>
          • المبلغ: <strong>${dep} درهم</strong> (قابل للاسترداد)<br>
          • يجب الإبلاغ عن المغادرة <strong>قبل 15 يوماً</strong> (أي قبل اليوم 16).<br>
          • إذا كان الإبلاغ بعد اليوم 16 سيُحتسب <strong>إيجار الشهر كاملاً</strong>.<br>
          • تسليم البارتشن <strong>بدون أي أضرار</strong>.<br>
          • التأمين <strong>غير مسترد</strong> إذا لم تُلتزم الشروط.
        </td>
      </tr>

      <!-- Row 2 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>2. No Visits</strong><br>
          The space is strictly for the tenant. Visitors are not allowed inside the partition or apartment.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>2. عدم السماح بالزيارات</strong><br>
          المكان مخصص للمستأجر فقط. لا يُسمح بأي زيارات داخل البارتشن أو الشقة.
        </td>
      </tr>

      <!-- Row 3 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>3. Final Month Policy</strong><br>
          During the last month, the partition will be opened for booking and inspection whether or not the tenant is present.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>3. سياسة الشهر الأخير</strong><br>
          خلال الشهر الأخير يتم فتح البارتشن للحجز والمعاينة سواء كان المستأجر موجوداً أم لا.
        </td>
      </tr>

      <!-- Row 4 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>4. Personal Belongings</strong><br>
          No personal items (shoes, bicycles, scooters, cartons, etc.) are allowed outside the partition, inside the apartment, or in the building.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>4. الأغراض الشخصية</strong><br>
          يُمنع وضع أي أغراض شخصية (أحذية، دراجات، سكوترات، كراتين...) خارج البارتشن أو داخل الشقة أو في المبنى.
        </td>
      </tr>

      <!-- Row 5 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>5. Departure</strong><br>
          The partition must be handed over on the last day of the month (28th/29th/30th/31st) before <strong>4:00 PM</strong>.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>5. قواعد المغادرة</strong><br>
          تسليم البارتشن في آخر يوم من الشهر قبل الساعة <strong>4 مساءً</strong>.
        </td>
      </tr>

      <!-- Row 6 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>6. Rent Payment</strong><br>
          Rent is to be paid on the <strong>1st day</strong> of every month only.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>6. دفع الإيجار</strong><br>
          يتم دفع الإيجار في <strong>اليوم الأول</strong> من كل شهر فقط.
        </td>
      </tr>

      <!-- Row 7 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>7. Kitchen & Fridge</strong><br>
          A designated space will be allocated. Maintain cleanliness — items left on the countertop will be discarded by the cleaner.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>7. المطبخ والثلاجة</strong><br>
          سيتم تخصيص مكان لك. يجب الحفاظ على النظافة وعدم ترك أي شيء على سطح المطبخ.
        </td>
      </tr>

      <!-- Row 8 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;border-bottom:1px solid #eee;font-size:11px">
          <strong>8. Smoking Policy</strong><br>
          Smoking and shisha are strictly prohibited inside the apartment.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;border-bottom:1px solid #eee;font-size:11px">
          <strong>8. التدخين</strong><br>
          يمنع التدخين والشيشة داخل الشقة.
        </td>
      </tr>

      <!-- Row 9 -->
      <tr style="vertical-align:top">
        <td style="padding:10px 16px;border-right:1px solid #ccc;font-size:11px">
          <strong>9. Public Areas</strong><br>
          Sitting or smoking in the public areas of the building is strictly forbidden.
        </td>
        <td style="padding:10px 16px;direction:rtl;text-align:right;font-size:11px">
          <strong>9. المناطق العامة</strong><br>
          يمنع الجلوس أو التدخين في المناطق العامة للمبنى.
        </td>
      </tr>
    </table>

    <!-- ══ SIGNATURES ══ -->
    <table style="width:100%;border-collapse:collapse;border:2px solid #1a3a6e;margin-top:16px">
      <tr style="background:#f0f4ff">
        <td colspan="2" style="padding:8px 16px;font-weight:800;font-size:12px;color:#1a3a6e;text-align:center">
          SIGNATURES &nbsp;|&nbsp; التوقيعات
        </td>
      </tr>
      <tr>
        <td style="padding:20px 16px;border-right:1px solid #ccc;font-size:12px">
          <strong>Tenant Signature:</strong><br><br>
          ___________________________<br>
          <span style="font-size:10px;color:#888">Date: _______________</span>
        </td>
        <td style="padding:20px 16px;direction:rtl;text-align:right;font-size:12px">
          <strong>توقيع المستأجر:</strong><br><br>
          ___________________________<br>
          <span style="font-size:10px;color:#888">التاريخ: _______________</span>
        </td>
      </tr>
    </table>

    <p style="margin-top:12px;font-size:10px;color:#888;text-align:center">
      By signing above, the tenant agrees to all terms and conditions stated in this contract.<br>
      بالتوقيع أعلاه يوافق المستأجر على جميع الشروط والأحكام المذكورة في هذا العقد.
    </p>
  </div>`;
}

function sendWelcomeWA() {
  var d = getWelcomeData();
  var phone = d.phone.replace(/\D/g,'');

  // Build WhatsApp text message (short summary + link to rules)
  var msg = `مرحباً ${d.name} 👋

تأكيد استلام التأمين — Wahdati
━━━━━━━━━━━━━━━━━
🏠 البارتشن: رقم ${d.room}، شقة ${d.apt}
🏢 المبنى: ${d.building}
💰 الإيجار: ${d.rent} AED / شهر (${d.persons === '1' ? 'شخص واحد' : d.persons + ' أشخاص'})
🔒 التأمين: ${d.dep} AED (مسترد)
📅 تاريخ البدء: ${d.startAr}
━━━━━━━━━━━━━━━━━

القواعد الأساسية:
1️⃣ لا زيارات — المكان للمستأجر فقط
2️⃣ الإيجار في اليوم 1 من كل شهر
3️⃣ إبلاغ مغادرة قبل 15 يوم (قبل اليوم 16)
4️⃣ تسليم البارتشن آخر يوم الشهر قبل 4 مساءً
5️⃣ ممنوع التدخين والشيشة داخل الشقة
6️⃣ ممنوع وضع أغراض في المناطق العامة
7️⃣ الحفاظ على نظافة المطبخ دائماً

للاستفسار: 0585586869

---
Hello ${d.name} 👋

Receipt Confirmation — Wahdati
━━━━━━━━━━━━━━━━━
🏠 Partition: No. ${d.room}, Apt ${d.apt}
🏢 Building: ${d.building}
💰 Rent: ${d.rent} AED/month (${d.persons === '1' ? '1 person' : d.persons + ' persons'})
🔒 Deposit: ${d.dep} AED (refundable)
📅 Start: ${d.startEn}
━━━━━━━━━━━━━━━━━

Key Rules:
1️⃣ No visits — space for tenant only
2️⃣ Rent due on the 1st of each month
3️⃣ Departure notice 15 days in advance (before 16th)
4️⃣ Hand over partition on last day before 4 PM
5️⃣ No smoking or shisha inside apartment
6️⃣ No belongings in public areas
7️⃣ Keep kitchen clean at all times

Contact: 0585586869`;

  var encoded = encodeURIComponent(msg);
  var url = phone
    ? 'https://wa.me/' + phone + '?text=' + encoded
    : 'https://wa.me/?text=' + encoded;

  window.open(url, '_blank');
}


window.getWelcomeData=getWelcomeData; window.loadMovesList=loadMovesList; window.addMoveEntry=addMoveEntry; window.saveMoveEntry=saveMoveEntry; window.deleteMoveEntry=deleteMoveEntry; window.showWelcomeLetter=showWelcomeLetter; window.printWelcomeLetter=printWelcomeLetter; window.buildWelcomeLetter=buildWelcomeLetter; window.sendWelcomeWA=sendWelcomeWA;