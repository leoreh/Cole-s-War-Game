/* icons.js - the SVG glyphs of the pieces.
   window.WarGame.Icons = { glyph(kind, opts), piece(kinds, opts) }

   Every shape is filled with currentColor and stroked with --piece-outline,
   so a glyph takes the color of its owner from the element around it.
   The three glyphs share one line: stroke-width 4, round joins and caps,
   the same optical size inside the 100x100 box, and no hairline detail that
   would close up at 40 px. */

window.WarGame = window.WarGame || {};

(function () {
  'use strict';

  /* ------------------------------------------------------------- the paths */

  var BODY =
    'fill:currentColor;stroke:var(--piece-outline,#1b1d24);stroke-width:4;' +
    'stroke-linejoin:round;stroke-linecap:round';
  var DETAIL = 'fill:var(--piece-outline,#1b1d24);stroke:none';

  /* Soldier: a shield with two swords crossed behind it. The hilts rise to
     the top corners and the points show below the rim, so the silhouette
     stays a soldier's emblem and never a padlock. */
  function sword(angle) {
    return '<g transform="rotate(' + angle + ' 50 50)">' +
      '<rect x="45.5" y="4" width="9" height="15" rx="4.5"/>' +
      '<rect x="34" y="17" width="32" height="9" rx="4.5"/>' +
      '<path d="M44.5,25 H55.5 V82 L50,94 L44.5,82 Z"/>' +
      '</g>';
  }

  var SOLDIER =
    sword(38) + sword(-38) +
    '<path d="M21,36 H79 V58 C79,75 66,86 50,91 C34,86 21,75 21,58 Z"/>';

  /* Knight: a horse head, as on a chess board, in profile. */
  var KNIGHT =
    '<path d="M27,91 C24,72 29,54 42,44 C50,38 55,29 56,20 ' +
    'C56,14 62,12 65,17 C67,20 67,24 66,28 ' +
    'C71,22 78,23 82,29 C87,37 89,46 89,52 C89,57 85,60 79,60 ' +
    'L64,60 C58,62 55,66 55,74 L55,91 Z"/>';
  var KNIGHT_EYE = '<circle cx="74" cy="41" r="3.2" style="' + DETAIL + '"/>';

  /* Archer: a bow bent into an even arc, its string drawn back to the nock,
     and a fletched arrow on it. */
  var ARCHER =
    '<path d="M16,82 C12,72 11,60 13,48 C16,32 30,22 50,22 ' +
    'C70,22 84,32 87,48 C89,60 88,72 84,82 ' +
    'L76,76 C79,67 80,58 78,50 C75,37 65,31 50,31 ' +
    'C35,31 25,37 22,50 C20,58 21,67 24,76 Z"/>' +
    '<path d="M19,78 L50,86 L81,78 L81.5,81 L50,89.5 L18.5,81 Z" ' +
    'style="stroke-width:2.2"/>' +
    '<path d="M46.5,68 L39,80 L39,71.5 L46.5,61 Z ' +
    'M53.5,68 L61,80 L61,71.5 L53.5,61 Z" style="stroke-width:2.4"/>' +
    '<rect x="46.5" y="13" width="7" height="75" rx="3.5"/>' +
    '<path d="M50,2 L61.5,26 L50,21 L38.5,26 Z"/>';

  var SHAPES = { S: SOLDIER, K: KNIGHT, A: ARCHER };
  var DETAILS = { S: '', K: KNIGHT_EYE, A: '' };

  /* A glyph that has a facing turns to face the enemy side of the board:
     the knight mirrors left to right, the archer points its arrow the other
     way. The soldier is symmetric and never turns. */
  var FLIP = {
    K: 'translate(100,0) scale(-1,1)',
    A: 'translate(0,100) scale(1,-1)'
  };

  /* -------------------------------------------------------------- building */

  function fmtStrength(v) {
    var n = Number(v) || 0;
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* glyph(kind) -> an <svg> string for one kind, viewBox 0 0 100 100.
     opts: { flip: true to face the other way, cls: extra class names } */
  function glyph(kind, opts) {
    opts = opts || {};
    var shape = SHAPES[kind];
    if (!shape) return '';
    var tr = opts.flip && FLIP[kind] ? ' transform="' + FLIP[kind] + '"' : '';
    var cls = 'glyph glyph--' + kind + (opts.cls ? ' ' + opts.cls : '');
    return '<svg class="' + cls + '" viewBox="0 0 100 100" ' +
      'xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
      '<g' + tr + '><g style="' + BODY + '">' + shape + '</g>' + DETAILS[kind] + '</g>' +
      '</svg>';
  }

  /* piece(kinds, opts) -> the whole piece: the main glyph, the second kind of
     a hybrid small at the top corner, and the strength badge at the bottom.
     opts: { owner: 0|1, str, maxStr, badge: false to drop the badge } */
  function piece(kinds, opts) {
    opts = opts || {};
    var owner = opts.owner === 1 ? 1 : 0;
    var list = kinds && kinds.length ? kinds : ['S'];
    var flip = owner === 1;

    var html = '<span class="piece" data-owner="' + owner + '">';
    html += glyph(list[0], { flip: flip, cls: 'glyph--main' });
    if (list.length > 1) {
      html += '<span class="piece-sub">' +
        glyph(list[1], { flip: flip, cls: 'glyph--sub' }) + '</span>';
    }

    var str = Number(opts.str);
    var show = opts.badge !== false && isFinite(str) && str > 0;
    if (show) {
      var hurt = isFinite(opts.maxStr) && str < opts.maxStr;
      html += '<span class="badge' + (hurt ? ' badge--hurt' : '') + '" dir="ltr">' +
        esc(fmtStrength(str)) + '</span>';
    }
    html += '</span>';
    return html;
  }

  window.WarGame.Icons = {
    glyph: glyph,
    piece: piece,
    fmtStrength: fmtStrength
  };
})();
