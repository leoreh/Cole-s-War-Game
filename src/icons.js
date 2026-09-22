/* icons.js - composing one piece out of a theme's glyphs and its badges.
   window.WarGame.Icons = { glyph(kind, opts), piece(kinds, opts) }

   The glyphs themselves live in themes.js. This file asks the chosen theme
   for them and keeps the classic set of version 1 as the fallback, so the
   game still draws its pieces when themes.js is missing or an unknown theme
   id is stored in the settings.

   Every shape is filled with currentColor and stroked with --piece-outline,
   so a glyph takes the color of its owner from the element around it. */

window.WarGame = window.WarGame || {};

(function () {
  'use strict';

  /* ------------------------------------------------- the classic fallback */

  var BODY =
    'fill:currentColor;stroke:var(--piece-outline,#1b1d24);stroke-width:4;' +
    'stroke-linejoin:round;stroke-linecap:round';
  var DETAIL = 'fill:var(--piece-outline,#1b1d24);stroke:none';

  /* Soldier: a shield with two swords crossed behind it. */
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

  /* Archer: a bow bent into an even arc with a fletched arrow on the string. */
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

  var FLIP = {
    K: 'translate(100,0) scale(-1,1)',
    A: 'translate(0,100) scale(1,-1)'
  };

  function fallbackGlyph(kind, opts) {
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

  /* ------------------------------------------------------- the badge marks */

  /* a small sword, drawn on its own so the strength badge is never read as
     a second health number */
  var SWORD_MARK =
    '<svg class="mark-ico" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ' +
    'focusable="false" aria-hidden="true">' +
    '<path d="M20.5 2.2 L21.8 3.5 L11.6 13.7 L10.3 12.4 Z ' +
    'M9.6 13.1 L10.9 14.4 L8 17.3 L6.7 16 Z ' +
    'M5.9 16.8 L7.2 18.1 L4.5 20.8 L2.6 21.4 L3.2 19.5 Z" ' +
    'fill="currentColor"/></svg>';

  /* the bow a piece carries while it still has its shot */
  var BOW_MARK =
    '<svg class="mark-ico" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" ' +
    'focusable="false" aria-hidden="true">' +
    '<path d="M6 2.5 C13 5 13 19 6 21.5" fill="none" stroke="currentColor" ' +
    'stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M6 2.5 L6 21.5" fill="none" stroke="currentColor" ' +
    'stroke-width="1.5" stroke-linecap="round"/>' +
    '<path d="M6 12 L20 12 M16.5 9 L20 12 L16.5 15" fill="none" ' +
    'stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
    'stroke-linejoin="round"/></svg>';

  /* ------------------------------------------------------------- building */

  function fmtStrength(v) {
    var n = Number(v) || 0;
    return n % 1 === 0 ? String(n) : n.toFixed(1);
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function themeOf(id) {
    var T = window.WarGame.Themes;
    if (!T || typeof T.get !== 'function') return null;
    try {
      var th = T.get(id);
      return th && typeof th.glyph === 'function' ? th : null;
    } catch (e) { return null; }
  }

  /* glyph(kind, opts) -> an <svg> string for one kind, viewBox 0 0 100 100.
     opts: { theme: id, flip: true to face the other way, cls: extra classes } */
  function glyph(kind, opts) {
    opts = opts || {};
    var th = themeOf(opts.theme);
    if (th) {
      var out = th.glyph(kind, { flip: !!opts.flip, cls: opts.cls || '' });
      if (out) return out;
    }
    return fallbackGlyph(kind, opts);
  }

  /* piece(kinds, opts) -> the whole piece: the main glyph, the second kind of
     a hybrid small at the top corner, the health badge at the bottom, the
     strength badge beside it and the bow of a kept shot.
     opts: { owner: 0|1, theme, hp, maxHp, str, fireLeft, badge: false } */
  function piece(kinds, opts) {
    opts = opts || {};
    var owner = opts.owner === 1 ? 1 : 0;
    var list = kinds && kinds.length ? kinds : ['S'];
    var flip = owner === 1;
    var theme = opts.theme;

    var html = '<span class="piece" data-owner="' + owner + '">';
    html += glyph(list[0], { theme: theme, flip: flip, cls: 'glyph--main' });
    if (list.length > 1) {
      html += '<span class="piece-sub">' +
        glyph(list[1], { theme: theme, flip: flip, cls: 'glyph--sub' }) + '</span>';
    }

    if (opts.badge !== false) {
      var hp = Number(opts.hp);
      var maxHp = Number(opts.maxHp);
      if (isFinite(hp)) {
        var hurt = isFinite(maxHp) && hp < maxHp;
        html += '<span class="badge badge--hp' + (hurt ? ' badge--hurt' : '') +
          '" dir="ltr">' + esc(fmtStrength(hp)) + '</span>';
      }
      /* the strength badge only where strength and health part ways */
      var str = Number(opts.str);
      if (isFinite(str) && str > 0 && str !== hp) {
        html += '<span class="badge badge--str" dir="ltr">' + SWORD_MARK +
          '<span>' + esc(fmtStrength(str)) + '</span></span>';
      }
    }

    if (opts.fireLeft) {
      html += '<span class="piece-bow" aria-hidden="true">' + BOW_MARK + '</span>';
    }

    html += '</span>';
    return html;
  }

  window.WarGame.Icons = {
    glyph: glyph,
    piece: piece,
    bowMark: BOW_MARK,
    swordMark: SWORD_MARK,
    fmtStrength: fmtStrength
  };
})();
