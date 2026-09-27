(function () {
  var el = document.getElementById('page-view-count');
  if (!el) return;
  var started = Date.now();
  var timer = setInterval(function () {
    if (window.goatcounter && window.goatcounter.visit_count) {
      clearInterval(timer);
      el.textContent = '';
      try {
        window.goatcounter.visit_count({
          append: '#page-view-count',
          no_branding: true,
          path: el.dataset.path
        });
      } catch (err) {
        el.textContent = '—';
      }
    } else if (Date.now() - started > 5000) {
      clearInterval(timer);
    }
  }, 100);
})();
