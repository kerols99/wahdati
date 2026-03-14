// ══ CONFIG ══

// ══ CONFIG ══
// ══════════════════════════════════════════
// CONFIG & GLOBALS
// ══════════════════════════════════════════
const SB_URL = 'https://fdackyyoubwustrsiucs.supabase.co';
const SB_KEY = 'sb_publishable_rXlNwZBkhCZJ5JobGPd5DA_wiLOooC4';

var sb;
var ME = null, MY_ROLE = 'collector', MO = [], CURRENT_PANEL = 'home';
var LANG = localStorage.getItem('app_lang') || 'ar';
var _toastTmr, _FILT = 'all';

// ── Supabase Init ──

// ══ THEME TOGGLE ══

var APP_THEME = localStorage.getItem('app_theme') || 'dark';


function initSB() {
  if (typeof supabase !== 'undefined') {
    sb = supabase.createClient(SB_URL, SB_KEY);
  } else {
    setTimeout(initSB, 50);
  }
}

function toast(msg, type) {
  clearTimeout(_toastTmr);
  var el = document.getElementById('toast');
  if(!el) return;
  el.textContent = msg;
  el.className = 'show' + (type==='err'?' err':type==='ok'?' ok':'');
  _toastTmr = setTimeout(() => el.className='', 3000);
}

function goPanel(name) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  var panel = document.getElementById('panel-'+name);
  if(panel) panel.classList.add('active');
  var ni = document.querySelector('.ni[data-p="'+name+'"]');
  if(ni) ni.classList.add('active');
  CURRENT_PANEL = name;
  if(name==='units') loadUnits();
  if(name==='pay') {
    var pd = document.getElementById('r-pdate');
    if(pd && !pd.value) pd.value = new Date().toISOString().split('T')[0];
  }
}

function switchTab(id, btn) {
  var parent = btn.closest('.panel') || btn.closest('.card') || document.body;
  parent.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  parent.querySelectorAll('.tpanel').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  var tp = document.getElementById(id);
  if(tp) tp.classList.add('active');
  if(id==='tRent') {
    var pd = document.getElementById('r-pdate');
    if(pd && !pd.value) pd.value = new Date().toISOString().split('T')[0];
  }
}

async function testConn() {
  try {
    var { error } = await sb.from('units').select('id').limit(1);
    toast(error ? 'خطأ: '+error.message : 'الاتصال يعمل ✓', error?'err':'ok');
  } catch(e) { toast('خطأ: '+e.message,'err'); }
}

function applyLang() {
  var ar = LANG==='ar';
  document.documentElement.lang = ar?'ar':'en';
  document.documentElement.dir  = ar?'rtl':'ltr';
  var lb = document.getElementById('lang-btn');
  if(lb) lb.textContent = ar?'EN':'عر';

  // Auth
  var as = document.getElementById('auth-sub-text');
  if(as) as.innerHTML = ar
    ? 'نظام إدارة العقارات<br><span style="font-size:.72rem;color:var(--muted)">للدخول فقط — تواصل مع المسؤول للحصول على حساب</span>'
    : 'Property Management System<br><span style="font-size:.72rem;color:var(--muted)">Login only — contact admin for an account</span>';
  setT('lbl-email', ar?'البريد الإلكتروني':'Email');
  setT('lbl-pass',  ar?'كلمة السر':'Password');
  var lb2 = document.getElementById('lbtn');
  if(lb2 && !lb2.disabled) lb2.textContent = ar?'🔐 دخول':'🔐 Login';
  setT('forgot-btn', ar?'نسيت كلمة السر؟':'Forgot password?');

  // Nav
  setT('nav-home',    t('home'));
  setT('nav-units',   t('units'));
  setT('nav-add',     t('add'));
  setT('nav-ops',     t('ops'));
  setT('nav-reports', t('reports'));

  // Panel titles
  setT('h-home',     t('home'));
  setT('h-units',    t('units'));
  setT('h-add',      t('addUnit'));
  setT('h-ops',      t('ops_title'));
  setT('h-reports',  t('reports_title'));
  setT('h-settings', t('settings'));

  // Home stats
  setT('sl-paid',      t('paid'));
  setT('sl-partial',   t('partial'));
  setT('sl-unpaid',    t('unpaid'));
  setT('sl-remaining', t('remaining'));
  ['ss-paid','ss-partial','ss-unpaid','ss-remaining'].forEach(id=>setT(id,t('unit')));
  setT('lbl-late',     t('late'));
  setT('btn-refresh',  t('refresh'));
  setT('btn-reports',  ar?'📊 التقارير':'📊 Reports');

  // Unit form
  setT('lbl-unit-sec',   t('unit_sec'));
  setT('lbl-tenant-sec', t('tenant_sec'));
  setT('lbl-apt',    t('apt'));      setT('lbl-room',  t('room'));
  setT('lbl-rent',   t('rent'));     setT('lbl-dep',   t('deposit'));
  setT('lbl-start',  t('startDate'));
  setT('lbl-uname',  t('tenantName')); setT('lbl-phone', t('phone'));
  setT('lbl-cnt',    t('persons'));  setT('lbl-lang',  t('lang'));
  setT('lbl-win',    t('window'));   setT('lbl-notes', t('notes'));
  var su = document.getElementById('savUnitBtn');
  if(su) su.textContent = t('saveUnit');

  // Ops tabs
  setT('tab-rent', t('rent_tab')); setT('tab-exp', t('exp_tab'));
  setT('tab-own',  t('owner_tab')); setT('tab-dep', t('dep_tab'));

  // Rent form
  setT('lbl-rapt', t('apt')); setT('lbl-rroom', t('room'));
  setT('lbl-ramt', t('amount')); setT('lbl-rmonth', t('month'));
  setT('lbl-rmeth', t('method')); setT('lbl-rnotes', t('notes'));
  setOptT('r-meth', 0, t('cash')); setOptT('r-meth', 1, t('transfer')); setOptT('r-meth', 2, t('cheque'));
  var srb = document.querySelector('#tRent .btn');
  if(srb) srb.textContent = t('saveRent');

  // Exp form
  setT('lbl-ecat', t('category')); setT('lbl-eamt', t('amount'));
  setT('lbl-emonth', t('month')); setT('lbl-erec', t('receipt'));
  setT('lbl-edesc', t('desc'));
  var seb = document.querySelector('#tExp .btn');
  if(seb) seb.textContent = t('saveExp');

  // Owner form
  setT('lbl-oamt', t('amount')); setT('lbl-omonth', t('month'));
  setT('lbl-ometh', t('method')); setT('lbl-oref', t('ref'));
  setT('lbl-onotes', t('notes'));
  setOptT('o-meth', 0, t('cash')); setOptT('o-meth', 1, t('transfer')); setOptT('o-meth', 2, t('cheque'));
  var sob = document.querySelector('#tOwn .btn');
  if(sob) sob.textContent = t('saveOwner');

  // Dep form
  setT('lbl-dapt', t('apt')); setT('lbl-droom', t('room'));
  setT('lbl-dname', t('tenantName')); setT('lbl-damt', t('amount'));
  setT('lbl-dstatus', t('dep_status')); setT('lbl-dref', t('refund_amt'));
  setT('lbl-dded', t('deduction')); setT('lbl-dwhy', t('reason'));
  setT('lbl-dnotes', t('notes'));
  setOptT('d-status', 0, t('held')); setOptT('d-status', 1, t('refunded')); setOptT('d-status', 2, t('forfeited'));
  var sdb = document.querySelector('#tDep .btn');
  if(sdb) sdb.textContent = t('saveDep');

  // Reports tabs
  setT('rtab-mon', t('mon_tab')); setT('rtab-exp', t('exp_rpt'));
  setT('rtab-dep', t('dep_rpt')); setT('rtab-ann', t('ann_tab'));
  setT('lbl-rpm', t('month')); setT('lbl-rem', t('month')); setT('lbl-ryear', ar?'السنة':'Year');

  // Settings
  setT('lbl-cur-user', t('current_user'));
  setT('lbl-conn', t('conn_status'));
  setT('btn-test-conn', t('conn_test'));
  setT('btn-logout', t('logout'));
  setT('lbl-team', t('team_mgmt'));
  setT('btn-add-staff', t('add_staff'));
  setT('lbl-iname', t('staff_name')); setT('lbl-iemail', t('staff_email'));
  setT('lbl-ipass', t('staff_pass')); setT('lbl-irole', t('staff_role'));
  setT('btn-create-acc', t('create_acc'));
  setT('lbl-team-list', t('team_list'));
  setT('btn-update-list', t('update_list'));
  setT('lbl-install', t('install'));
  setT('btn-refresh', t('refresh'));

  // Search placeholder
  var si = document.getElementById('search-inp');
  if(si) si.placeholder = ar?'ابحث بالشقة أو الاسم...':'Search by apartment or name...';
}

function toggleLang() {
  LANG = LANG==='ar'?'en':'ar';
  localStorage.setItem('app_lang', LANG);
  applyLang();
}

function t(k) { return (T[LANG]||T.ar)[k]||k; }

function setT(id, txt) { var e=document.getElementById(id); if(e) e.textContent=txt; }

function setOptT(sid, i, txt) { var e=document.getElementById(sid); if(e&&e.options[i]) e.options[i].text=txt; }

function applyTheme(theme) {
  APP_THEME = theme;
  document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
  var btn = document.getElementById('theme-btn');
  if(btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
  localStorage.setItem('app_theme', theme);
}

function toggleTheme() {
  applyTheme(APP_THEME === 'dark' ? 'light' : 'dark');
}


window.initSB=initSB; window.toast=toast; window.goPanel=goPanel; window.switchTab=switchTab; window.testConn=testConn; window.applyLang=applyLang; window.toggleLang=toggleLang; window.t=t; window.setT=setT; window.setOptT=setOptT; window.applyTheme=applyTheme; window.toggleTheme=toggleTheme;