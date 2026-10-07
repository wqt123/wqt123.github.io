(function () {
  var el = document.getElementById('page-view-count');
  if (!el || !el.dataset.path) return;
  var url = 'https://wqtblob.goatcounter.com/counter/' + encodeURIComponent(el.dataset.path) + '.json';
  fetch(url)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && d.count) el.textContent = d.count;
    })
    .catch(function () {});
})();
