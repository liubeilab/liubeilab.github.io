/* People page: shuffle the member cards (fresh order each visit) and lay them
   out as balanced flex columns. Using real columns instead of CSS `columns`
   avoids the multi-column repaint glitch that duplicated/dropped cards on
   scroll. No-op on pages without a .people grid; degrades to the CSS grid
   fallback if this script doesn't run. */
(function () {
  var grid = document.querySelector('.people');
  if (!grid) return;
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.person'));
  if (cards.length < 2) return;

  // Fisher–Yates shuffle, once per page load.
  for (var i = cards.length - 1; i > 0; i--) {
    var j = (Math.random() * (i + 1)) | 0;
    var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
  }

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
  var t;
  window.addEventListener('resize', function () {
    clearTimeout(t);
    t = setTimeout(layout, 150);
  });
})();
