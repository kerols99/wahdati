// ══ AUTH ══

async function doLogin() {
  var email = document.getElementById('l-email').value.trim();
  var pass  = document.getElementById('l-pass').value;
  if (!email || !pass) { toast('أدخل البريد وكلمة السر', 'err'); return; }
  var btn = document.getElementById('lbtn');
  var orig = btn.textContent; btn.disabled=true; btn.innerHTML='<span class="spin"></span>';
  try {
    var { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    ME = data.user;
    await afterLogin();
  } catch(e) {
    var msg = e.message;
    if(msg.includes('Invalid login')) msg = LANG==='ar'?'بريد أو كلمة سر خاطئة':'Invalid email or password';
    toast(msg, 'err');
  } finally { btn.disabled=false; btn.textContent=orig; }
}

async function doForgot() {
  var email = document.getElementById('l-email').value.trim();
  if (!email) { toast(LANG==='ar'?'أدخل بريدك الإلكتروني':'Enter your email', 'err'); return; }
  try {
    await sb.auth.resetPasswordForEmail(email);
    toast(LANG==='ar'?'تم إرسال رابط إعادة التعيين':'Reset link sent!', 'ok');
  } catch(e) { toast(e.message,'err'); }
}

async function doLogout() {
  try {
  await sb.auth.signOut();
    ME = null; MY_ROLE = 'collector'; MO = [];
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
  } catch(e) { toast('خطأ: ' + e.message, 'err'); console.error('doLogout:', e); }
}

async function afterLogin() {
  applyTheme(localStorage.getItem('app_theme') || 'dark');
  try {
    var { data: prof } = await sb.from('profiles').select('name,role').eq('id', ME.id).single();
    if (prof) {
      MY_ROLE = prof.role || 'collector';
      var name = prof.name || ME.email;
    } else {
      MY_ROLE = 'collector';
      var name = ME.email;
    }
  } catch(e) {
    MY_ROLE = 'collector';
    var name = ME.email;
  }

  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  var roleColors = {admin:'var(--accent)',manager:'var(--green)',collector:'var(--amber)',viewer:'var(--muted)'};
  var roleLabels = {admin:'👑 مسؤول',manager:'🟢 مدير',collector:'🟡 محصّل',viewer:'👁️ مشاهد'};
  var roleLabelsEN = {admin:'👑 Admin',manager:'🟢 Manager',collector:'🟡 Collector',viewer:'👁️ Viewer'};

  document.getElementById('ubadge').textContent = name.split(' ')[0];
  document.getElementById('profName').textContent  = name;
  document.getElementById('profEmail').textContent = ME.email;
  document.getElementById('profRole').innerHTML =
    `<span style="color:${roleColors[MY_ROLE]||'var(--muted)'};font-size:.82rem;font-weight:600">${roleLabels[MY_ROLE]||MY_ROLE}</span>`;

  if (MY_ROLE==='admin') {
    document.getElementById('adminSec').style.display = 'block';
    setTimeout(()=>loadTeam(null), 600);
  }
  if (MY_ROLE==='viewer') {
    document.getElementById('savUnitBtn').disabled = true;
  }

  await loadHome(null, true);
  testConn();
  applyLang();
}


window.doLogin=doLogin; window.doForgot=doForgot; window.doLogout=doLogout; window.afterLogin=afterLogin;