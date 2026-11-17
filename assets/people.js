/* People page: shuffle the member cards within each role (fresh order each
   visit) and lay them
   out as balanced flex columns. Using real columns instead of CSS `columns`
   avoids the multi-column repaint glitch that duplicated/dropped cards on
   scroll. No-op on pages without a .people grid; degrades to the CSS grid
   fallback if this script doesn't run. */
(function () {
  var grid = document.querySelector('.people');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.person'));
  if (cards.length < 2) return;

  // Fisher–Yates shuffle, once per page load — inside each role group only
  // (data-group, set by build.mjs), so roles stay together and nobody is
  // always first within theirs.
  function shuffle(list) {
    for (var i = list.length - 1; i > 0; i--) {
      var j = (Math.random() * (i + 1)) | 0;
      var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    }
    return list;
  }
  var groups = {}, order = [];
  cards.forEach(function (card) {
    var g = card.getAttribute('data-group') || '0';
    if (!groups[g]) { groups[g] = []; order.push(g); }
    groups[g].push(card);
  });
  cards = [];
  order.forEach(function (g) { cards = cards.concat(shuffle(groups[g])); });

  grid.classList.add('people--js');
  var laidFor = -1;

  function columnCount() {
    var w = grid.clientWidth;
    return w >= 900 ? 3 : w >= 560 ? 2 : 1;
  }

  function layout() {
    var n = columnCount();
    if (n === laidFor) return;          // only rebuild when the count changes
    laidFor = n;
    grid.textContent = '';
    var cols = [];
    for (var c = 0; c < n; c++) {
      var col = document.createElement('div');
      col.className = 'people__col';
      grid.appendChild(col);
      cols.push(col);
    }
    // Drop each card into the currently shortest column.
    cards.forEach(function (card) {
      var min = 0;
      for (var c = 1; c < cols.length; c++) {
        if (cols[c].offsetHeight < cols[min].offsetHeight) min = c;
      }
      cols[min].appendChild(card);
    });
  }

  layout();
  // A link to one person (/people/#given-surname) still lands on them after
  // the cards have been moved into columns.
  if (location.hash.length > 1) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target && grid.contains(target)) target.scrollIntoView();
  }
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(layout, 150);
  });
})();
