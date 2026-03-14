// ══ INIT ══
(function boot() {
  var tries = 0;
  function waitSB() {
      // Apply saved theme immediately
      applyTheme(localStorage.getItem('app_theme') || 'dark');
    if(typeof window.supabase !== 'undefined') {
      initSB();
      // Set default payment date
      var pdEl = document.getElementById('r-pdate');
      if(pdEl) pdEl.value = new Date().toISOString().split('T')[0];
      // Drawer overlay
      var overlay = document.getElementById('drawerOverlay');
      if(overlay) overlay.addEventListener('click', closeDrawer);
    } else if(tries++ < 50) {
      setTimeout(waitSB, 100);
    } else {
      document.body.innerHTML = '<p style="color:red;text-align:center;padding:2rem">فشل تحميل المكتبة. أعد تحميل الصفحة.</p>';
    }
  }
  waitSB();
})();

