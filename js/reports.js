// ══ REPORTS ══

async function loadMonthly(btn) {
  var mon = document.getElementById('rpm').value;
  if(!mon){toast(LANG==='ar'?'اختر الشهر':'Choose month','err');return;}
  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { data: units } = await sb.from('units').select('*').eq('is_vacant',false).order('apartment');
    var { data: pays }  = await sb.from('rent_payments').select('*').gte('payment_month',mon+'-01').lte('payment_month',mon+'-31');
    var { data: exps }  = await sb.from('expenses').select('*').gte('month',mon+'-01').lte('month',mon+'-31');
    var { data: owns }  = await sb.from('owner_payments').select('*').gte('month',mon+'-01').lte('month',mon+'-31');
    if(!units) units=[]; if(!pays) pays=[]; if(!exps) exps=[]; if(!owns) owns=[];

    var paidMap={};
    pays.forEach(p=>{ paidMap[p.unit_id]=(paidMap[p.unit_id]||0)+p.amount; });

    var totalRent=0, totalColl=0, totalExp=0, totalOwner=0;
    units.forEach(u=>{ totalRent+=u.monthly_rent||0; totalColl+=paidMap[u.id]||0; });
    exps.forEach(e=>totalExp+=e.amount||0);
    owns.forEach(o=>totalOwner+=o.amount||0);

    // Group by apartment
    var apts = {};
    units.forEach(u=>{
      var apt = String(u.apartment);
      if(!apts[apt]) apts[apt]={units:[],rent:0,coll:0};
      apts[apt].units.push(u);
      apts[apt].rent += u.monthly_rent||0;
      apts[apt].coll += paidMap[u.id]||0;
    });

    // Group apartments by floor (101-109 = floor 1, 201-209 = floor 2, etc.)
    var floors = {};
    Object.keys(apts).sort((a,b)=>Number(a)-Number(b)).forEach(function(apt){
      var floorNum = Math.floor(Number(apt)/100);
      var floorKey = String(floorNum);
      if(!floors[floorKey]) floors[floorKey]={apts:[],rent:0,coll:0};
      floors[floorKey].apts.push(apt);
      floors[floorKey].rent += apts[apt].rent;
      floors[floorKey].coll += apts[apt].coll;
    });

    var TH = function(t){ return '<th style="padding:6px 8px;text-align:right;border-bottom:2px solid var(--border);font-size:.72rem;font-weight:700;white-space:nowrap;background:var(--surf2);color:var(--text)">'+t+'</th>'; };

    var tableHead = '<thead><tr style="background:var(--surf2)">'
      +TH(LANG==='ar'?'غرفة':'Room')
      +TH(LANG==='ar'?'المستأجر':'Tenant')
      +TH(LANG==='ar'?'الإيجار':'Rent')
      +TH(LANG==='ar'?'مدفوع':'Paid')
      +TH(LANG==='ar'?'متبقي':'Rem')
      +'<th style="padding:6px;text-align:center;border-bottom:1px solid var(--border);font-size:.72rem">#</th>'
      +'</tr></thead>';

    var floorKeys = Object.keys(floors).sort((a,b)=>Number(a)-Number(b));
    var html = '';

    floorKeys.forEach(function(floorKey){
      var fl = floors[floorKey];
      var flColor = fl.coll>=fl.rent?'var(--green)':fl.coll>0?'var(--amber)':'var(--red)';
      var flLabel = LANG==='ar'?'الدور '+floorKey:'Floor '+floorKey;

      // Floor header
      html += '<div style="background:var(--accent)22;border-right:4px solid var(--accent);border-radius:10px;padding:9px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center">'
        +'<span style="font-size:.9rem;font-weight:800">🏬 '+flLabel+'</span>'
        +'<span style="font-size:.8rem;display:flex;gap:12px">'
        +'<span style="color:var(--green);font-weight:700">✅ '+fl.coll+' AED</span>'
        +(fl.rent-fl.coll>0?'<span style="color:var(--red);font-weight:700">❌ '+(fl.rent-fl.coll)+' AED</span>':'')
        +'</span></div>';

      // Each apartment in floor
      fl.apts.forEach(function(apt){
        var g = apts[apt];
        var aptColor = g.coll>=g.rent?'var(--green)':g.coll>0?'var(--amber)':'var(--red)';
        var aptLabel = (LANG==='ar'?'شقة ':'Apt ')+apt;

        var rows = g.units.sort((a,b)=>Number(a.room)-Number(b.room)).map(function(u){
          var got = paidMap[u.id]||0;
          var rem = (u.monthly_rent||0)-got;
          var st  = got>=(u.monthly_rent||0)&&(u.monthly_rent||0)>0?'✅':got>0?'⚠️':'❌';
          var pCol = got>0?'color:var(--green)':'color:var(--red)';
          var rCol = rem>0?'color:var(--red)':'color:var(--green)';
          return '<tr>'
            +'<td style="padding:5px 8px;border-bottom:1px solid var(--border)22;font-size:.75rem">'+u.room+'</td>'
            +'<td style="padding:5px 8px;border-bottom:1px solid var(--border)22;font-size:.75rem;font-weight:600">'+(u.tenant_name||'—')+(u.tenant_name2?'<br><span style="font-size:.68rem;color:var(--amber)">+'+u.tenant_name2+'</span>':'')+'</td>'
            +'<td style="padding:5px 8px;border-bottom:1px solid var(--border)22;font-size:.75rem">'+(u.monthly_rent||0)+'</td>'
            +'<td style="padding:5px 8px;border-bottom:1px solid var(--border)22;font-size:.75rem;'+pCol+';font-weight:700">'+got+'</td>'
            +'<td style="padding:5px 8px;border-bottom:1px solid var(--border)22;font-size:.75rem;'+rCol+';font-weight:700">'+rem+'</td>'
            +'<td style="padding:5px 8px;border-bottom:1px solid var(--border)22;font-size:.75rem;text-align:center">'+st+'</td>'
            +'</tr>';
        }).join('');

        html += '<div style="margin-bottom:12px;margin-right:8px" data-apt-block>'
          // Apt header
          +'<div style="display:flex;justify-content:space-between;align-items:center;background:var(--surf2);border-radius:10px 10px 0 0;padding:7px 12px;border-right:3px solid '+aptColor+'">'
          +'<span style="font-weight:700;font-size:.82rem">🏢 '+aptLabel+'</span>'
          +'<span style="font-size:.75rem;display:flex;gap:8px">'
          +'<span style="color:var(--green)">✅ '+g.coll+' AED</span>'
          +(g.rent-g.coll>0?'<span style="color:var(--red)">❌ '+(g.rent-g.coll)+' AED</span>':'')
          +'</span></div>'
          // Table
          +'<div style="overflow-x:auto;border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px">'
          +'<table style="width:100%;border-collapse:collapse">'+tableHead
          +'<tbody>'+rows+'</tbody>'
          +'<tfoot><tr style="background:var(--surf2)">'
          +'<td colspan="2" style="padding:6px 8px;font-weight:700;font-size:.75rem">'+(LANG==='ar'?'إجمالي الشقة':'Apt Total')+'</td>'
          +'<td style="padding:6px 8px;font-weight:700;font-size:.75rem">'+g.rent+'</td>'
          +'<td style="padding:6px 8px;font-weight:700;font-size:.75rem;color:var(--green)">'+g.coll+'</td>'
          +'<td style="padding:6px 8px;font-weight:700;font-size:.75rem;color:var(--red)">'+(g.rent-g.coll)+'</td>'
          +'<td></td></tr></tfoot>'
          +'</table></div></div>';
      });

      // Floor subtotal
      html += '<div style="background:var(--surf2);border-radius:10px;padding:8px 14px;margin-bottom:16px;display:flex;justify-content:space-between;font-size:.8rem;border-right:4px solid '+flColor+'">'
        +'<span style="font-weight:800">'+(LANG==='ar'?'إجمالي '+flLabel:'Total '+flLabel)+'</span>'
        +'<span style="display:flex;gap:14px">'
        +'<span>'+(LANG==='ar'?'الإيجار:':'Rent:')+' <b>'+fl.rent+'</b></span>'
        +'<span style="color:var(--green)">'+(LANG==='ar'?'محصّل:':'Paid:')+' <b>'+fl.coll+'</b></span>'
        +(fl.rent-fl.coll>0?'<span style="color:var(--red)">'+(LANG==='ar'?'متبقي:':'Rem:')+' <b>'+(fl.rent-fl.coll)+'</b></span>':'')
        +'</span></div>';
    });

    // Grand total
    html += '<div class="card" data-grand>'
      +'<div style="font-weight:800;font-size:.9rem;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid var(--border)">📊 '+(LANG==='ar'?'الإجمالي الكلي':'Grand Total')+'</div>'
      +'<div class="sum"><span>'+(LANG==='ar'?'إجمالي الإيجارات':'Total Rent')+'</span><b>'+totalRent+' AED</b></div>'
      +'<div class="sum"><span>'+(LANG==='ar'?'إجمالي المحصّل':'Collected')+'</span><b style="color:var(--green)">'+totalColl+' AED</b></div>'
      +'<div class="sum"><span>'+(LANG==='ar'?'غير محصّل':'Uncollected')+'</span><b style="color:var(--red)">'+(totalRent-totalColl)+' AED</b></div>'
      +'<div class="sum"><span>'+(LANG==='ar'?'إجمالي المصاريف':'Expenses')+'</span><b style="color:var(--amber)">'+totalExp+' AED</b></div>'
      +'<div class="sum"><span>'+(LANG==='ar'?'دُفع للمالك':'Paid to Owner')+'</span><b>'+totalOwner+' AED</b></div>'
      +'<div class="sum" style="border-top:2px solid var(--border);padding-top:8px;margin-top:4px"><span style="font-weight:800;font-size:.9rem">'+(LANG==='ar'?'الإجمالي':'Total')+'</span><b style="color:var(--green);font-size:1rem">'+(totalColl-totalExp-totalOwner)+' AED</b></div>'
      +'</div>';

    window._lastPDFMon = mon;
    html = '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn bg" style="font-size:.78rem;flex:1;touch-action:manipulation" onclick="exportPDF(\'monthly\',window._lastPDFMon)">📄 PDF</button></div>' + html;

    document.getElementById('rMonOut').innerHTML = html;

  } catch(e){ toast(e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function loadExpRpt(btn) {
  var mon = document.getElementById('rem').value;
  if(!mon){toast(LANG==='ar'?'اختر الشهر':'Choose month','err');return;}
  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { data: exps } = await sb.from('expenses').select('*').gte('month',mon+'-01').lte('month',mon+'-31').order('created_at',{ascending:false});
    if(!exps) exps=[];
    var total = exps.reduce((s,e)=>s+e.amount,0);
    document.getElementById('rExpOut').innerHTML = exps.length
      ? `<div class="card"><div class="clbl">${LANG==='ar'?'إجمالي المصاريف':'Total Expenses'}: ${total} AED</div>`+
        exps.map(e=>`<div class="sum"><span>${e.category}</span><b>${e.amount} AED</b></div>`).join('')+`</div>`
      : `<div style="text-align:center;padding:14px;color:var(--muted)">${LANG==='ar'?'لا توجد مصاريف':'No expenses'}</div>`;
  } catch(e){ toast(e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function loadDepRpt(btn) {
  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    // Fetch ALL units (occupied) with their deposits
    var { data: units } = await sb.from('units')
      .select('id,apartment,room,tenant_name,tenant_name2,is_vacant')
      .eq('is_vacant', false)
      .order('apartment', {ascending:true});

    var { data: deps } = await sb.from('deposits')
      .select('*')
      .gt('amount', 0);

    if(!units) units=[];
    if(!deps) deps=[];

    // Build map: unit_id → deposit
    var depMap = {};
    deps.forEach(function(d){ if(d.unit_id) depMap[d.unit_id] = d; });

    // Filter units that HAVE a deposit
    var withDep = units.filter(function(u){ return depMap[u.id]; });

    // Sort by apartment then room
    withDep.sort(function(a,b){
      if(Number(a.apartment) !== Number(b.apartment))
        return Number(a.apartment) - Number(b.apartment);
      return Number(a.room) - Number(b.room);
    });

    // Group by apartment
    var groups = {};
    withDep.forEach(function(u){
      var apt = String(u.apartment);
      if(!groups[apt]) groups[apt] = {items:[], total:0};
      var d = depMap[u.id];
      groups[apt].items.push({unit:u, dep:d});
      groups[apt].total += d.amount||0;
    });

    var grandTotal = withDep.reduce(function(s,u){ return s+(depMap[u.id].amount||0); }, 0);

    var html = '';
    Object.keys(groups).sort(function(a,b){ return Number(a)-Number(b); }).forEach(function(apt){
      var g = groups[apt];
      html += '<div style="margin-bottom:14px">'
        + '<div style="background:var(--surf2);border-radius:10px 10px 0 0;padding:8px 12px;border-right:3px solid var(--accent);display:flex;justify-content:space-between;align-items:center">'
        + '<span style="font-weight:700;font-size:.85rem">🏢 '+(LANG==='ar'?'شقة':'Apt')+' '+apt+'</span>'
        + '<span style="font-size:.8rem;color:var(--accent);font-weight:700">'+g.total+' AED</span>'
        + '</div>'
        + '<div style="border:1px solid var(--border);border-top:none;border-radius:0 0 10px 10px">';

      g.items.forEach(function(item){
        var u = item.unit;
        var d = item.dep;
        var sCol = d.status==='held'?'var(--amber)':d.status==='refunded'?'var(--green)':'var(--red)';
        var sTxt = d.status==='held'?(LANG==='ar'?'محتجز':'Held')
                 : d.status==='refunded'?(LANG==='ar'?'مُرتجع':'Refunded')
                 : (LANG==='ar'?'مُصادر':'Forfeited');
        var name = u.tenant_name||(u.tenant_name2||'—');
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-bottom:1px solid var(--border)22">'
          + '<div>'
          + '<div style="font-size:.82rem;font-weight:600">'+(LANG==='ar'?'غرفة':'Room')+' '+u.room+' — '+name+'</div>'
          + (d.deduction_amount?'<div style="font-size:.7rem;color:var(--muted)">'+(LANG==='ar'?'خصم:':'Ded:')+' '+d.deduction_amount+' AED</div>':'')
          + (d.notes?'<div style="font-size:.7rem;color:var(--muted)">'+d.notes+'</div>':'')
          + '</div>'
          + '<div style="text-align:left">'
          + '<div style="font-weight:700;color:var(--accent)">'+d.amount+' AED</div>'
          + '<div style="font-size:.7rem;color:'+sCol+';font-weight:600">'+sTxt+'</div>'
          + '</div>'
          + '</div>';
      });

      html += '</div></div>';
    });

    // Grand total
    html += '<div style="background:var(--surf2);border-radius:10px;padding:11px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:4px">'
      + '<span style="font-weight:700">'+(LANG==='ar'?'إجمالي التأمينات':'Total Deposits')+'</span>'
      + '<span style="font-weight:700;color:var(--accent);font-size:1rem">'+grandTotal+' AED</span>'
      + '</div>';

    document.getElementById('rDepOut').innerHTML = withDep.length ? html
      : '<div style="text-align:center;padding:20px;color:var(--muted)">'+(LANG==='ar'?'لا توجد تأمينات':'No deposits')+'</div>';

  } catch(e){ toast(e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function loadAnnual(btn) {
  var year = document.getElementById('r-year').value || new Date().getFullYear();
  var orig=btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try{
    var { data: pays } = await sb.from('rent_payments').select('amount,payment_month').gte('payment_month',year+'-01-01').lte('payment_month',year+'-12-31');
    var { data: exps } = await sb.from('expenses').select('amount,month').gte('month',year+'-01-01').lte('month',year+'-12-31');
    var { data: owns } = await sb.from('owner_payments').select('amount,month').gte('month',year+'-01-01').lte('month',year+'-12-31');
    if(!pays) pays=[]; if(!exps) exps=[]; if(!owns) owns=[];

    var months = Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
    var mNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var mNamesEN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    var rows = months.map((m,i)=>{
      var prefix = year+'-'+m;
      var coll = pays.filter(p=>p.payment_month&&p.payment_month.startsWith(prefix)).reduce((s,p)=>s+p.amount,0);
      var exp  = exps.filter(e=>e.month.startsWith(prefix)).reduce((s,e)=>s+e.amount,0);
      var own  = owns.filter(o=>o.month.startsWith(prefix)).reduce((s,o)=>s+o.amount,0);
      return `<tr><td>${LANG==='ar'?mNames[i]:mNamesEN[i]}</td><td>${coll}</td><td>${exp}</td><td>${own}</td><td style="color:${coll-exp-own>0?'green':'red'}">${coll-exp-own}</td></tr>`;
    }).join('');

    var totalColl = pays.reduce((s,p)=>s+p.amount,0);
    var totalExp  = exps.reduce((s,e)=>s+e.amount,0);
    var totalOwn  = owns.reduce((s,o)=>s+o.amount,0);

    document.getElementById('rAnnOut').innerHTML = `
      <div class="card" style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:.75rem">
          <thead><tr style="background:var(--surf2)">
            <th style="padding:7px;text-align:right;border-bottom:1px solid var(--border)">${LANG==='ar'?'الشهر':'Month'}</th>
            <th style="padding:7px;text-align:right;border-bottom:1px solid var(--border)">${LANG==='ar'?'محصّل':'Collected'}</th>
            <th style="padding:7px;text-align:right;border-bottom:1px solid var(--border)">${LANG==='ar'?'مصاريف':'Expenses'}</th>
            <th style="padding:7px;text-align:right;border-bottom:1px solid var(--border)">${LANG==='ar'?'للمالك':'Owner'}</th>
            <th style="padding:7px;text-align:right;border-bottom:1px solid var(--border)">${LANG==='ar'?'صافي':'Net'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="card">
        <div class="sum"><span>${LANG==='ar'?'إجمالي المحصّل':'Total Collected'}</span><b style="color:var(--green)">${totalColl} AED</b></div>
        <div class="sum"><span>${LANG==='ar'?'إجمالي المصاريف':'Total Expenses'}</span><b style="color:var(--amber)">${totalExp} AED</b></div>
        <div class="sum"><span>${LANG==='ar'?'دُفع للمالك':'Paid to Owner'}</span><b>${totalOwn} AED</b></div>
        <div class="sum"><b>${LANG==='ar'?'صافي الربح السنوي':'Annual Net Profit'}</b><b style="color:var(--green)">${totalColl-totalExp-totalOwn} AED</b></div>
      </div>`;
  } catch(e){ toast(e.message,'err'); }
  finally{ btn.disabled=false; btn.innerHTML=orig; }
}

async function exportPDF(type, mon) {
  var outEl = document.getElementById('rMonOut');
  if(!outEl) return;

  // Re-fetch data for PDF
    try {
var { data: units } = await sb.from('units').select('*').eq('is_vacant',false).order('apartment');
  var { data: pays }  = await sb.from('rent_payments').select('*').gte('payment_month',mon+'-01').lte('payment_month',mon+'-31');
  var { data: exps }  = await sb.from('expenses').select('*').gte('month',mon+'-01').lte('month',mon+'-31');
  var { data: owns }  = await sb.from('owner_payments').select('*').gte('month',mon+'-01').lte('month',mon+'-31');
  if(!units) units=[]; if(!pays) pays=[]; if(!exps) exps=[]; if(!owns) owns=[];

  var paidMap={};
  pays.forEach(p=>{ paidMap[p.unit_id]=(paidMap[p.unit_id]||0)+p.amount; });

  var totalRent=0, totalColl=0, totalExp=0, totalOwner=0;
  units.forEach(u=>{ totalRent+=u.monthly_rent||0; totalColl+=paidMap[u.id]||0; });
  exps.forEach(e=>totalExp+=e.amount||0);
  owns.forEach(o=>totalOwner+=o.amount||0);

  // Group by apartment then by floor
  var apts={};
  units.forEach(u=>{
    var apt=String(u.apartment);
    if(!apts[apt]) apts[apt]={units:[],rent:0,coll:0};
    apts[apt].units.push(u);
    apts[apt].rent+=u.monthly_rent||0;
    apts[apt].coll+=paidMap[u.id]||0;
  });

  // Floor = first digit of apartment (101→1, 201→2, 801→8)
  var floors={};
  Object.keys(apts).sort((a,b)=>Number(a)-Number(b)).forEach(apt=>{
    var fl=String(Math.floor(Number(apt)/100));
    if(!floors[fl]) floors[fl]={apts:[],rent:0,coll:0};
    floors[fl].apts.push(apt);
    floors[fl].rent+=apts[apt].rent;
    floors[fl].coll+=apts[apt].coll;
  });

  var TH=function(t){return '<th style="padding:6px 8px;text-align:right;background:#f0f0f0;border:1px solid #ccc;font-size:11px;color:#111;font-weight:700">'+t+'</th>';};
  var TD=function(t,s){return '<td style="padding:5px 8px;text-align:right;border:1px solid #ddd;font-size:11px;color:#222'+(s?';'+s:'')+'">'+(t===undefined||t===null?'—':t)+'</td>';};

  var aptHTML='';
  Object.keys(floors).sort((a,b)=>Number(a)-Number(b)).forEach(function(fl){
    var fg=floors[fl];
    var flStatus=fg.coll>=fg.rent?'#1a7a4a':fg.coll>0?'#b07400':'#c0392b';

    // Floor header
    aptHTML+='<tr><td colspan="6" style="background:#e0e0e0;color:#111;padding:7px 10px;font-weight:700;font-size:12px;border:none">'
      +'🏬 الدور '+fl
      +'<span style="float:left;font-size:11px;color:'+(fg.coll>=fg.rent?'#1a7a4a':'#b07400')+'">'
      +'محصّل: '+fg.coll+' | متبقي: '+(fg.rent-fg.coll)+'</span>'
      +'</td></tr>';

    fg.apts.forEach(function(apt){
      var g=apts[apt];
      var aptStatus=g.coll>=g.rent?'#1a7a4a':g.coll>0?'#b07400':'#c0392b';

      // Apartment sub-header
      aptHTML+='<tr><td colspan="6" style="background:#e8e8e8;padding:5px 10px;font-weight:700;font-size:11px;color:#111;border-bottom:1px solid #ccc;border-top:2px solid #999">'
        +'شقة '+apt
        +' &nbsp;&nbsp; <span style="color:'+aptStatus+'">محصّل: '+g.coll+' | متبقي: '+(g.rent-g.coll)+'</span>'
        +'</td></tr>';

      // Unit rows
      g.units.sort((a,b)=>Number(a.room)-Number(b.room)).forEach(function(u){
        var got=paidMap[u.id]||0;
        var rem=(u.monthly_rent||0)-got;
        var st=got>=(u.monthly_rent||0)&&(u.monthly_rent||0)>0?'✅':got>0?'⚠️':'❌';
        aptHTML+='<tr>'
          +TD(u.room)
          +TD(u.tenant_name||(u.tenant_name2?u.tenant_name2:'—'))
          +TD(u.monthly_rent||0)
          +TD(got, got>0?'color:#1a7a4a;font-weight:700':'color:#c0392b')
          +TD(rem, rem>0?'color:#c0392b;font-weight:700':'color:#1a7a4a')
          +'<td style="padding:5px 8px;text-align:center;border:1px solid #ddd;font-size:12px">'+st+'</td>'
          +'</tr>';
      });

      // Apartment subtotal
      aptHTML+='<tr style="background:#f0f0f0">'
        +'<td colspan="2" style="padding:5px 8px;font-weight:700;font-size:11px;border:1px solid #ddd;text-align:right">إجمالي شقة '+apt+'</td>'
        +TD(g.rent,'font-weight:700')
        +TD(g.coll,'font-weight:700;color:#1a7a4a')
        +TD(g.rent-g.coll,'font-weight:700;color:'+(g.rent-g.coll>0?'#c0392b':'#1a7a4a'))
        +'<td style="border:1px solid #ddd"></td>'
        +'</tr>';
    });

    // Floor subtotal
    aptHTML+='<tr style="background:#f0f0f0;color:#111">'
      +'<td colspan="2" style="padding:6px 10px;font-weight:700;font-size:12px;border:1px solid #ddd;text-align:right;color:#111">إجمالي الدور '+fl+'</td>'
      +'<td style="padding:6px 8px;font-weight:700;border:1px solid #ddd;text-align:right;color:#111">'+fg.rent+'</td>'
      +'<td style="padding:6px 8px;font-weight:700;border:1px solid #ddd;text-align:right;color:#1a7a4a">'+fg.coll+'</td>'
      +'<td style="padding:6px 8px;font-weight:700;border:1px solid #ddd;text-align:right;color:'+(fg.rent-fg.coll>0?'#ffaaaa':'#7defa7')+'">'+(fg.rent-fg.coll)+'</td>'
      +'<td style="border:1px solid #ddd"></td>'
      +'</tr>';
  });

  document.getElementById('pdf-content').innerHTML =
    '<div class="hd">'
    +'<div><div style="font-size:1.1rem;font-weight:700">Wahdati — تقرير شهري</div>'
    +'<div style="font-size:.8rem;color:#666">'+mon+'</div></div>'
    +'<div style="font-size:.8rem;color:#666">'+new Date().toLocaleDateString()+'</div>'
    +'</div>'
    +'<table style="width:100%;border-collapse:collapse;margin-bottom:16px">'
    +'<thead><tr>'+TH('غرفة')+TH('المستأجر')+TH('الإيجار')+TH('مدفوع')+TH('متبقي')+'<th style="padding:6px 8px;text-align:center;background:#f0f0f0;border:1px solid #ddd;font-size:11px">#</th></tr></thead>'
    +'<tbody>'+aptHTML+'</tbody>'
    +'</table>'
    +'<div style="border-top:2px solid #ddd;padding-top:10px">'
    +'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>إجمالي الإيجارات</span><b>'+totalRent+' AED</b></div>'
    +'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>إجمالي المحصّل</span><b style="color:#1a7a4a">'+totalColl+' AED</b></div>'
    +'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>غير محصّل</span><b style="color:#c0392b">'+(totalRent-totalColl)+' AED</b></div>'
    +'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>إجمالي المصاريف</span><b style="color:#b07400">'+totalExp+' AED</b></div>'
    +'<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px"><span>دُفع للمالك</span><b>'+totalOwner+' AED</b></div>'
    +'<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-top:1px solid #333;margin-top:4px"><span style="font-weight:700">الإجمالي</span><b style="color:#1a7a4a;font-weight:700">'+(totalColl-totalExp-totalOwner)+' AED</b></div>'
    +'</div>';

  document.getElementById('pdfOverlay').style.display='flex';

  } catch(e){ toast('خطأ PDF: '+e.message,'err'); }
}

async function loadStats(btn) {
  var orig = btn.innerHTML; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try {
    var { data: units } = await sb.from('units').select('*');
    var { data: pays }  = await sb.from('rent_payments').select('*').order('payment_month');
    var { data: exps }  = await sb.from('expenses').select('amount,month');
    if(!units) units=[]; if(!pays) pays=[]; if(!exps) exps=[];

    var total    = units.length;
    var occupied = units.filter(u=>!u.is_vacant).length;
    var vacant   = units.filter(u=>u.is_vacant).length;
    var avgRent  = occupied>0 ? Math.round(units.filter(u=>!u.is_vacant).reduce((s,u)=>s+(u.monthly_rent||0),0)/occupied) : 0;
    var totalRentMonthly = units.filter(u=>!u.is_vacant).reduce((s,u)=>s+(u.monthly_rent||0),0);

    // Monthly income trend (last 6 months)
    var monthMap = {};
    pays.forEach(p=>{
      var m = (p.payment_month||'').slice(0,7);
      if(m) monthMap[m] = (monthMap[m]||0) + (p.amount||0);
    });
    var expMap = {};
    exps.forEach(e=>{
      var m = (e.month||'').slice(0,7);
      if(m) expMap[m] = (expMap[m]||0) + (e.amount||0);
    });
    var months = Object.keys(monthMap).sort().slice(-6);

    // Apartment occupancy
    var aptMap = {};
    units.forEach(u=>{
      var apt = String(u.apartment);
      if(!aptMap[apt]) aptMap[apt]={total:0,occupied:0};
      aptMap[apt].total++;
      if(!u.is_vacant) aptMap[apt].occupied++;
    });

    var occPct = total>0 ? Math.round(occupied/total*100) : 0;

    // Build HTML
    var html = `
    <div class="card" style="margin-bottom:12px">
      <div style="font-weight:800;font-size:.9rem;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid var(--border)">📊 نظرة عامة</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div style="background:var(--surf2);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:var(--accent)">${occPct}%</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:4px">نسبة الإشغال</div>
          <div style="font-size:.75rem;margin-top:4px">${occupied} مشغولة / ${total} إجمالي</div>
        </div>
        <div style="background:var(--surf2);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:var(--green)">${avgRent}</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:4px">متوسط الإيجار (AED)</div>
          <div style="font-size:.75rem;margin-top:4px">إجمالي: ${totalRentMonthly} AED/شهر</div>
        </div>
        <div style="background:var(--surf2);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:var(--green)">${occupied}</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:4px">وحدات مشغولة</div>
        </div>
        <div style="background:var(--surf2);border-radius:12px;padding:14px;text-align:center">
          <div style="font-size:1.8rem;font-weight:800;color:var(--red)">${vacant}</div>
          <div style="font-size:.72rem;color:var(--muted);margin-top:4px">وحدات شاغرة</div>
        </div>
      </div>
    </div>`;

    // Monthly income chart (bar chart using divs)
    if(months.length > 0) {
      var maxIncome = Math.max(...months.map(m=>monthMap[m]||0), 1);
      html += `<div class="card" style="margin-bottom:12px">
        <div style="font-weight:800;font-size:.9rem;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border)">📈 الدخل الشهري (آخر 6 أشهر)</div>
        <div style="display:flex;align-items:flex-end;gap:6px;height:120px;padding-bottom:4px">`;
      months.forEach(m=>{
        var income = monthMap[m]||0;
        var exp = expMap[m]||0;
        var net = income - exp;
        var pct = Math.round(income/maxIncome*100);
        var shortM = m.slice(5,7)+'/'+m.slice(2,4);
        html += `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px">
          <div style="font-size:.58rem;color:var(--muted)">${income>0?income:''}</div>
          <div style="width:100%;height:${Math.max(pct,4)}%;background:var(--accent);border-radius:4px 4px 0 0;min-height:4px"></div>
          <div style="font-size:.6rem;color:var(--muted);white-space:nowrap">${shortM}</div>
        </div>`;
      });
      html += `</div></div>`;
    }

    // Occupancy by apartment
    html += `<div class="card" style="margin-bottom:12px">
      <div style="font-weight:800;font-size:.9rem;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid var(--border)">🏢 إشغال الشقق</div>`;
    Object.keys(aptMap).sort((a,b)=>Number(a)-Number(b)).forEach(apt=>{
      var d = aptMap[apt];
      var pct = Math.round(d.occupied/d.total*100);
      var col = pct===100?'var(--green)':pct>50?'var(--amber)':'var(--red)';
      html += `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:4px">
          <span style="font-weight:600">شقة ${apt}</span>
          <span style="color:${col}">${d.occupied}/${d.total} (${pct}%)</span>
        </div>
        <div style="background:var(--surf2);border-radius:4px;height:8px">
          <div style="width:${pct}%;height:100%;background:${col};border-radius:4px;transition:.3s"></div>
        </div>
      </div>`;
    });
    html += `</div>`;

    // Export CSV button
    html += `<button class="btn bg" onclick="exportCSV()" style="width:100%;margin-bottom:8px">📥 تصدير Excel/CSV</button>`;

    document.getElementById('statsOut').innerHTML = html;
  } catch(e) { toast('خطأ: '+e.message,'err'); }
  finally { btn.disabled=false; btn.innerHTML=orig; }
}

async function exportCSV() {
  try {
    toast(LANG==='ar'?'جاري التصدير...':'Exporting...','');
    var { data: units } = await sb.from('units').select('*').order('apartment');
    var { data: pays }  = await sb.from('rent_payments').select('*').order('payment_month');
    var { data: exps }  = await sb.from('expenses').select('*').order('month');
    var { data: owns }  = await sb.from('owner_payments').select('*').order('month');
    var { data: deps }  = await sb.from('deposits').select('*');
    if(!units) units=[]; if(!pays) pays=[]; if(!exps) exps=[]; if(!owns) owns=[]; if(!deps) deps=[];

    var depMap = {};
    deps.forEach(d=>{ depMap[d.unit_id]=d.amount||0; });

    // Sheet 1: Units
    var unitsCSV = '\uFEFF'; // BOM for Excel Arabic
    unitsCSV += 'شقة,غرفة,المستأجر,الهاتف,الإيجار,التأمين,تاريخ الدخول,عدد الأشخاص,شاغرة\n';
    units.forEach(u=>{
      unitsCSV += [u.apartment,u.room,u.tenant_name||'',u.phone||'',u.monthly_rent||0,
        depMap[u.id]||u.deposit||0, u.start_date||'', u.persons_count||1,
        u.is_vacant?'نعم':'لا'].map(v=>`"${v}"`).join(',')+'\n';
    });

    // Sheet 2: Payments
    var paysCSV = '\uFEFF';
    paysCSV += 'شقة,غرفة,الشهر,المبلغ,تاريخ الاستلام,طريقة الدفع,ملاحظات\n';
    pays.forEach(p=>{
      paysCSV += [p.apartment,p.room,(p.payment_month||'').slice(0,7),
        p.amount||0, p.payment_date||'', p.payment_method||'', p.notes||'']
        .map(v=>`"${v}"`).join(',')+'\n';
    });

    // Sheet 3: Expenses
    var expsCSV = '\uFEFF';
    expsCSV += 'الشهر,الفئة,المبلغ,الوصف\n';
    exps.forEach(e=>{
      expsCSV += [(e.month||'').slice(0,7),e.category||'',e.amount||0,e.description||'']
        .map(v=>`"${v}"`).join(',')+'\n';
    });

    // Download all 3 files
    [[unitsCSV,'الوحدات'],[paysCSV,'الدفعات'],[expsCSV,'المصاريف']].forEach(([csv,name])=>{
      var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name+'_'+new Date().toISOString().slice(0,10)+'.csv';
      a.click(); URL.revokeObjectURL(url);
    });
    toast(LANG==='ar'?'تم التصدير ✓':'Exported ✓','ok');
  } catch(e) { toast('خطأ: '+e.message,'err'); }
}


window.loadMonthly=loadMonthly; window.loadExpRpt=loadExpRpt; window.loadDepRpt=loadDepRpt; window.loadAnnual=loadAnnual; window.exportPDF=exportPDF; window.loadStats=loadStats; window.exportCSV=exportCSV;