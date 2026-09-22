/* themes.js - the piece sets and palettes of the themes.
   window.WarGame.Themes = { list, get(id) }

   get(id) -> { id, name: {he, en}, palette: {p0, p1, light, dark},
                boardClass, glyph(kind, opts) }

   Every theme draws the same three kinds: S soldier (the one with the shield),
   K knight (the one with the horse), A archer (the one with the bow), so a
   piece stays the same piece when the theme changes.

   A glyph takes the owner's color from currentColor and its contrasting
   outline from var(--piece-outline), both set by .piece in style.css. Fixed
   accents (steel, wood, skin, glow) are used where they read on a light and
   on a dark owner color alike. Inside one theme the three glyphs share one
   line weight and one style, and no detail is finer than the eye can hold at
   40 px.

   Ids inside filters carry the theme and the kind (wg-<theme>-<kind>-...),
   so the dozens of glyphs on a board never fight over a name. */

window.WarGame = window.WarGame || {};

(function () {
  'use strict';

  /* A glyph that has a facing turns to face the enemy side of the board.
     Classic keeps the mirrors it was drawn with (the horse head turns left to
     right, the arrow of the emblem points the other way down the board); the
     themes whose pieces are people or side-on emblems all turn left to right,
     because a person mirrored top to bottom stands on his head. */
  var MIRROR_H = 'translate(100,0) scale(-1,1)';
  var MIRROR_V = 'translate(0,100) scale(1,-1)';
  var SIDE_FLIP = { K: MIRROR_H, A: MIRROR_H };

  function build(theme, kind, opts) {
    opts = opts || {};
    var shape = theme.shapes[kind];
    if (!shape) return '';
    var m = theme.flip[kind];
    var tr = opts.flip && m ? ' transform="' + m + '"' : '';
    var cls = 'glyph glyph--' + kind + (opts.cls ? ' ' + opts.cls : '');
    var defs = theme.defs && theme.defs[kind] ? '<defs>' + theme.defs[kind] + '</defs>' : '';
    return '<svg class="' + cls + '" viewBox="0 0 100 100" ' +
      'xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">' +
      defs + '<g' + tr + '>' + shape + '</g></svg>';
  }

  function make(def) {
    def.flip = def.flip || SIDE_FLIP;
    def.glyph = function (kind, opts) { return build(def, kind, opts); };
    return def;
  }

  /* ===================================================== classic ========= */
  /* The emblem set of icons.js, kept shape for shape: stroke-width 4, round
     joins, no hairlines. */

  var C_BODY =
    'fill:currentColor;stroke:var(--piece-outline,#1b1d24);stroke-width:4;' +
    'stroke-linejoin:round;stroke-linecap:round';
  var C_DETAIL = 'fill:var(--piece-outline,#1b1d24);stroke:none';

  function cSword(angle) {
    return '<g transform="rotate(' + angle + ' 50 50)">' +
      '<rect x="45.5" y="4" width="9" height="15" rx="4.5"/>' +
      '<rect x="34" y="17" width="32" height="9" rx="4.5"/>' +
      '<path d="M44.5,25 H55.5 V82 L50,94 L44.5,82 Z"/>' +
      '</g>';
  }

  var C_SOLDIER = '<g style="' + C_BODY + '">' +
    cSword(38) + cSword(-38) +
    '<path d="M21,36 H79 V58 C79,75 66,86 50,91 C34,86 21,75 21,58 Z"/>' +
    '</g>';

  var C_KNIGHT = '<g style="' + C_BODY + '">' +
    '<path d="M27,91 C24,72 29,54 42,44 C50,38 55,29 56,20 ' +
    'C56,14 62,12 65,17 C67,20 67,24 66,28 ' +
    'C71,22 78,23 82,29 C87,37 89,46 89,52 C89,57 85,60 79,60 ' +
    'L64,60 C58,62 55,66 55,74 L55,91 Z"/></g>' +
    '<circle cx="74" cy="41" r="3.2" style="' + C_DETAIL + '"/>';

  var C_ARCHER = '<g style="' + C_BODY + '">' +
    /* the bow's limbs are a shade thicker than the emblem in icons.js, so the
       arc still reads as a bow and not as an arch at 40 px */
    '<path d="M16,82 C12,72 11,60 13,48 C16,32 30,22 50,22 ' +
    'C70,22 84,32 87,48 C89,60 88,72 84,82 ' +
    'L73,75 C76,66 77,57 75,50 C72,38 63,34 50,34 ' +
    'C37,34 28,38 25,50 C23,57 24,66 27,75 Z"/>' +
    '<path d="M19,78 L50,86 L81,78 L81.5,81 L50,89.5 L18.5,81 Z" ' +
    'style="stroke-width:2.2"/>' +
    '<path d="M46.5,68 L39,80 L39,71.5 L46.5,61 Z ' +
    'M53.5,68 L61,80 L61,71.5 L53.5,61 Z" style="stroke-width:2.4"/>' +
    '<rect x="46.5" y="13" width="7" height="75" rx="3.5"/>' +
    '<path d="M50,2 L61.5,26 L50,21 L38.5,26 Z"/></g>';

  var CLASSIC = make({
    id: 'classic',
    name: { he: 'קלאסי', en: 'Classic' },
    palette: { p0: '#efe6cf', p1: '#2f3550', light: '#efe0c3', dark: '#a97e57' },
    boardClass: 'theme-classic',
    flip: { K: MIRROR_H, A: MIRROR_V },
    shapes: { S: C_SOLDIER, K: C_KNIGHT, A: C_ARCHER }
  });

  /* ==================================================== heraldic ======== */
  /* People, drawn in three tones so they have volume: the owner color, a
     darker shade of it (a black wash on top), and the fixed steel, wood and
     skin. One line: stroke-width 3, round joins. */

  var H_LINE = 'stroke:var(--piece-outline,#1b1d24);stroke-width:3;' +
    'stroke-linejoin:round;stroke-linecap:round';
  /* the stroke is set once on the group, so each shape carries only its fill */
  var OWN = ' fill="currentColor"';
  var STEEL = ' fill="#c9ced6"';
  var WOOD = ' fill="#8a5a3c"';
  var HIDE = ' fill="#9c6a45"';
  var DHIDE = ' fill="#6f4630"';
  var SKIN = ' fill="#e8c39e"';
  var SHADE = ' fill="#000" fill-opacity=".2" stroke="none"';
  /* a detail on a fixed accent (a visor slit on steel, an eye on a hide) keeps
     a fixed dark, so it does not turn pale on a dark owner */
  var INK = ' fill="#2b2f38" stroke="none"';
  var HOOF = ' fill="#4a2e1e" stroke="none"';

  function her(inner) {
    return '<g style="' + H_LINE + '">' + inner + '</g>';
  }

  var H_SOLDIER = her(
    /* the raised sword, behind the arm that holds it */
    '<g' + STEEL + '><path d="M79,3 L84.5,13 V41 H73.5 V13 Z"/>' +
      '<rect x="66" y="41" width="26" height="6.5" rx="3.2"/>' +
      '<circle cx="79" cy="64" r="4.4"/></g>' +
    '<rect x="75.5" y="47" width="7" height="14" rx="3.5"' + WOOD + '/>' +
    /* legs and boots */
    '<g' + STEEL + '><path d="M36,64 H47 V83 H36 Z"/>' +
      '<path d="M53,64 H64 V83 H53 Z"/></g>' +
    '<g' + WOOD + '><path d="M33,80 H47 V92 H33 Z"/>' +
      '<path d="M53,80 H67 V92 H53 Z"/></g>' +
    /* tabard, its shaded side, the belt */
    '<path d="M36,30 C42,27 58,27 64,30 L67,50 L65,70 H35 L33,50 Z"' + OWN + '/>' +
    '<path d="M50,28 C57,28 62,29 64,30 L67,50 L65,70 H50 Z"' + SHADE + '/>' +
    '<rect x="32.5" y="51" width="35" height="7.5" rx="2.5"' + WOOD + '/>' +
    '<rect x="44" y="50.5" width="12" height="8.5" rx="2.5"' + STEEL + '/>' +
    /* the sword arm and its hand */
    '<path d="M62,31 C70,32 77,39 81,47 L71,52 C68,45 65,40 59,39 Z"' + OWN + '/>' +
    '<rect x="71.5" y="47.5" width="12" height="12" rx="5.5"' + SKIN + '/>' +
    /* plume, helmet, visor */
    '<path d="M49,8 C46,2 52,-1 56,2 C60,6 56,11 51,11 Z"' + OWN + '/>' +
    '<path d="M38,24 C38,12 43,7 50,7 C57,7 62,12 62,24 L62,32 ' +
      'C56,35 44,35 38,32 Z"' + STEEL + '/>' +
    '<rect x="40" y="19" width="20" height="5" rx="2.4"' + INK + '/>' +
    /* the shield, in front of everything on that side */
    '<path d="M9,31 H41 V54 C41,68 30,76 25,79 C20,76 9,68 9,54 Z"' + OWN + '/>' +
    '<path d="M25,31 H41 V54 C41,68 30,76 25,79 Z"' + SHADE + '/>' +
    '<circle cx="25" cy="50" r="5.5"' + STEEL + '/>');

  var H_KNIGHT = her(
    '<path d="M24,44 C14,47 8,58 9,73 L16,71 C15,59 19,51 26,50 Z"' + WOOD + '/>' +
    /* the far pair of legs, one shade down */
    '<g' + DHIDE + '><path d="M27,54 H37 L35,72 L39,88 H31 L25,72 Z"/>' +
      '<path d="M55,54 H65 L67,72 L65,88 H57 L58,72 Z"/></g>' +
    /* the barrel and the near pair of legs */
    '<g' + HIDE + '><path d="M22,50 C22,42 30,37 44,37 H58 C65,37 69,42 69,50 ' +
      'C69,60 62,66 50,66 H34 C26,66 22,58 22,50 Z"/>' +
      '<path d="M33,60 H43 L41,75 L44,90 H36 L31,75 Z"/>' +
      '<path d="M50,60 H60 L61,75 L59,90 H51 L52,75 Z"/></g>' +
    '<g' + HOOF + '><rect x="24" y="83" width="15" height="6" rx="2"/>' +
      '<rect x="55" y="83" width="13" height="6" rx="2"/>' +
      '<rect x="30" y="85" width="15" height="6" rx="2"/>' +
      '<rect x="49" y="85" width="13" height="6" rx="2"/></g>' +
    /* the neck, then the head over it, each its own path, so the outline draws
       the line between them and the horse does not read as one lump */
    '<path d="M47,57 C49,43 53,31 60,24 L73,31 C68,38 64,47 62,59 Z"' + HIDE + '/>' +
    '<path d="M60,24 C54,32 50,43 49,57 L56,57 C57,46 60,36 66,29 Z"' + SHADE + '/>' +
    '<g' + HIDE + '><path d="M67,12 L65,2 L75,10 Z"/>' +
      '<path d="M63,14 C67,10 73,10 77,14 L87,24 C91,28 90,36 85,37 ' +
      'L71,38 C65,38 61,34 60,28 C59,22 60,17 63,14 Z"/></g>' +
    '<g' + INK + '><circle cx="74" cy="23" r="2.8"/>' +
      '<circle cx="85" cy="30" r="2"/></g>' +
    /* the caparison, the owner color on the horse */
    '<path d="M27,37 H64 L68,52 L66,71 L60,61 L53,71 L46,61 L39,71 ' +
      'L33,61 L27,53 Z"' + OWN + '/>' +
    '<path d="M50,37 H64 L68,52 L66,71 L60,61 L53,71 L50,67 Z"' + SHADE + '/>' +
    /* the rider: his surcoat and the caparison in his color, the rest steel */
    '<path d="M37,32 L48,30 L51,49 L41,52 Z"' + STEEL + '/>' +
    '<path d="M38,47 L51,45 L53,55 L41,58 Z"' + WOOD + '/>' +
    '<path d="M33,15 C38,12 46,12 50,15 L54,34 C46,38 38,38 32,34 Z"' + OWN + '/>' +
    '<path d="M42,13 C46,13 49,14 50,15 L54,34 C50,36 46,37 42,37 Z"' + SHADE + '/>' +
    '<g transform="rotate(-13 26 30)"><g' + STEEL + '>' +
      '<path d="M26,2 L30.5,10 V26 H21.5 V10 Z"/>' +
      '<rect x="17" y="26" width="18" height="5" rx="2.5"/></g>' +
      '<rect x="23" y="30" width="6" height="9" rx="3"' + WOOD + '/></g>' +
    '<path d="M37,18 C31,18 27,22 25,28 L33,32 C35,28 37,26 41,26 Z"' + OWN + '/>' +
    '<circle cx="27" cy="31" r="5.4"' + SKIN + '/>' +
    '<path d="M32,7 C32,2 37,-1 42,0 C47,1 50,5 50,11 L49,18 ' +
      'C44,20 37,20 32,18 Z"' + STEEL + '/>' +
    '<rect x="34" y="7" width="15" height="4.5" rx="2.2"' + INK + '/>');

  var H_ARCHER = her(
    /* the bow, then the string it is drawn by */
    '<path d="M77,9 C90,27 90,73 77,91 L71,87 C83,70 83,30 71,13 Z"' + WOOD + '/>' +
    '<path d="M75,11 L45,50 L75,89" fill="none" stroke-width="2.4"/>' +
    /* the two legs and the boots */
    '<g' + WOOD + '><path d="M22,64 H33 L31,83 H20 Z"/>' +
      '<path d="M40,64 H51 L53,83 H42 Z"/></g>' +
    '<g' + HOOF + '><rect x="16" y="81" width="17" height="8" rx="3"/>' +
      '<rect x="39" y="81" width="17" height="8" rx="3"/></g>' +
    /* tunic and belt */
    '<path d="M22,31 C28,28 42,28 47,31 L51,50 L49,70 H21 L19,50 Z"' + OWN + '/>' +
    '<path d="M36,29 C42,29 46,30 47,31 L51,50 L49,70 H36 Z"' + SHADE + '/>' +
    '<rect x="18.5" y="51" width="32" height="7" rx="2.5"' + WOOD + '/>' +
    /* the face inside the hood, then the hood over it */
    '<ellipse cx="40" cy="22" rx="9" ry="10"' + SKIN + '/>' +
    '<path d="M22,22 C22,11 28,5 36,5 C43,5 48,9 49,16 L43,18 ' +
      'C41,13 36,12 32,15 C28,18 27,27 29,33 L23,34 Z"' + OWN + '/>' +
    /* the arm that holds the bow out, and its hand */
    '<path d="M38,40 C52,40 64,44 73,49 L70,57 C61,53 50,49 37,49 Z"' + OWN + '/>' +
    '<rect x="66" y="44" width="12" height="12" rx="5.5"' + SKIN + '/>' +
    /* the arrow, then the arm that draws the string back */
    '<rect x="42" y="47" width="44" height="5" rx="2.4"' + WOOD + '/>' +
    '<path d="M83,43 L95,49.5 L83,56 Z"' + STEEL + '/>' +
    '<path d="M44,43 L37,46 L37,53 L44,56 Z"' + OWN + '/>' +
    '<path d="M28,38 L40,41 L45,49 L34,53 Z"' + OWN + '/>' +
    '<rect x="39" y="43" width="11" height="12" rx="5"' + SKIN + '/>');

  var HERALDIC = make({
    id: 'heraldic',
    name: { he: 'הרלדי', en: 'Heraldic' },
    palette: { p0: '#f4ecd8', p1: '#5a2a2a', light: '#f1e4c6', dark: '#c9a97a' },
    boardClass: 'theme-heraldic',
    shapes: { S: H_SOLDIER, K: H_KNIGHT, A: H_ARCHER }
  });

  /* ========================================================== ink ======= */
  /* One or two wet strokes a piece. The rough edge is one cheap turbulence
     (a single octave) displacing the whole group; the thin outline is
     displaced with it, so the edge frays the way wet ink does. */

  var I_LINE = 'fill:currentColor;stroke:var(--piece-outline,#1b1d24);' +
    'stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round';
  var I_HAIR = 'fill:none;stroke:var(--piece-outline,#1b1d24);stroke-width:2.6;' +
    'stroke-linejoin:round;stroke-linecap:round';

  function inkDefs(kind, seed) {
    return '<filter id="wg-ink-' + kind + '-r" x="-18%" y="-18%" ' +
      'width="136%" height="136%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" ' +
      'numOctaves="2" seed="' + seed + '" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="5" ' +
      'xChannelSelector="R" yChannelSelector="G"/></filter>';
  }

  function inkWrap(kind, inner) {
    return '<g filter="url(#wg-ink-' + kind + '-r)" style="' + I_LINE + '">' +
      inner + '</g>';
  }

  /* Soldier: two crossed strokes for the swords, one loaded stroke for the
     shield over them, so only the four ends show, as on the classic emblem. */
  function inkSword(angle) {
    return '<g transform="rotate(' + angle + ' 50 50)">' +
      '<path d="M50,1 L56,16 V82 L50,97 L44,82 V16 Z"/>' +
      '<path d="M33,15 L67,19 L66,27 L34,23 Z"/>' +
      '<path d="M45,0 L55,2 L54,13 L46,12 Z"/></g>';
  }

  var I_SOLDIER = inkWrap('S',
    inkSword(38) + inkSword(-38) +
    '<path d="M21,35 C34,30 66,30 79,35 L79,58 C79,75 67,87 50,94 ' +
      'C33,87 21,75 21,58 Z"/>');

  /* Knight: the horse head in one stroke. */
  var I_KNIGHT = inkWrap('K',
    '<path d="M25,93 C22,72 28,53 42,43 C50,37 55,28 56,19 ' +
      'C56,13 62,11 65,16 C67,19 67,23 66,27 ' +
      'C71,21 79,22 83,28 C88,36 90,46 90,52 C90,58 86,61 79,61 ' +
      'L64,61 C58,63 55,67 55,75 L55,93 Z"/>' +
    '<circle cx="75" cy="41" r="3.4" style="fill:var(--piece-outline,#1b1d24);stroke:none"/>');

  /* Archer: the bow in one crescent stroke, the arrow in a second. */
  var I_ARCHER = inkWrap('A',
    '<path d="M27,6 C51,26 59,40 59,50 C59,61 51,75 27,95 L19,88 ' +
      'C41,70 50,60 50,50 C50,41 41,31 20,13 Z"/>' +
    '<path d="M24,8 L15,50 L24,93" style="' + I_HAIR + '"/>' +
    '<path d="M16,46 L82,47 L82,54 L16,55 Z"/>' +
    '<path d="M78,38 L97,50.5 L78,62 Z"/>' +
    '<path d="M29,40 L17,45 L29,50 Z M29,52 L17,56 L29,61 Z"/>');

  var INK = make({
    id: 'ink',
    name: { he: 'דיו', en: 'Ink' },
    palette: { p0: '#f7f5ef', p1: '#23242a', light: '#f4f1ea', dark: '#d9d3c5' },
    boardClass: 'theme-ink',
    defs: { S: inkDefs('S', 3), K: inkDefs('K', 11), A: inkDefs('A', 23) },
    shapes: { S: I_SOLDIER, K: I_KNIGHT, A: I_ARCHER }
  });

  /* ========================================================= neon ======= */
  /* Outline only: a thin line in the owner color with a glow, over a wider
     line in the outline color, so the sign still reads if the board behind it
     is light. Every theme keeps its own filter ids. */

  function neonDefs(kind) {
    return '<filter id="wg-neon-' + kind + '-g" x="-35%" y="-35%" ' +
      'width="170%" height="170%" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur stdDeviation="2.6" result="b"/>' +
      '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/>' +
      '<feMergeNode in="SourceGraphic"/></feMerge></filter>';
  }

  var N_BASE = 'fill:none;stroke-linejoin:round;stroke-linecap:round';

  function neonWrap(kind, inner) {
    return '<g style="' + N_BASE + ';stroke:var(--piece-outline,#0a0c14);' +
      'stroke-width:8;stroke-opacity:0.55">' + inner + '</g>' +
      '<g filter="url(#wg-neon-' + kind + '-g)" style="' + N_BASE +
      ';stroke:currentColor;stroke-width:3.4">' + inner + '</g>';
  }

  var N_S_PATHS =
    '<path d="M50,4 V29 M34,16 H66 M50,76 V88"/>' +
    '<path d="M44,84 L50,96 L56,84"/>' +
    '<path d="M22,30 H78 V52 C78,67 66,77 50,83 C34,77 22,67 22,52 Z"/>';

  var N_K_PATHS =
    '<path d="M29,90 C26,72 31,55 43,45 C51,39 56,30 57,21 ' +
      'C57,15 62,13 65,18 C67,21 67,25 66,29 ' +
      'C71,23 77,24 81,30 C86,38 88,46 88,52 C88,57 84,60 78,60 ' +
      'L64,60 C58,62 55,66 55,74 L55,90 Z"/>' +
    '<path d="M73,41 h0.1"/>';

  var N_A_PATHS =
    '<path d="M30,10 C50,26 58,40 58,50 C58,61 50,74 30,90"/>' +
    '<path d="M30,10 L22,50 L30,90"/>' +
    '<path d="M22,50 H86"/>' +
    '<path d="M74,42 L88,50 L74,58"/>' +
    '<path d="M32,42 L24,46 M32,58 L24,54"/>';

  var NEON = make({
    id: 'neon',
    name: { he: 'ניאון', en: 'Neon' },
    palette: { p0: '#37f0ff', p1: '#ff4fd8', light: '#141826', dark: '#0d1019' },
    boardClass: 'theme-neon',
    defs: { S: neonDefs('S'), K: neonDefs('K'), A: neonDefs('A') },
    shapes: {
      S: neonWrap('S', N_S_PATHS),
      K: neonWrap('K', N_K_PATHS),
      A: neonWrap('A', N_A_PATHS)
    }
  });

  /* ========================================================== toy ======= */
  /* Chunky wooden tokens: one thick outline, round everything, one white
     highlight where the light falls. */

  var T_LINE = 'stroke:var(--piece-outline,#1b1d24);stroke-width:6;' +
    'stroke-linejoin:round;stroke-linecap:round';
  var T_OWN = 'fill:currentColor;' + T_LINE;
  var T_WOOD = 'fill:#d8a05e;' + T_LINE;
  var T_HI = 'fill:#fff;fill-opacity:0.55;stroke:none';
  var T_DARK = 'fill:var(--piece-outline,#1b1d24);stroke:none';

  /* the token itself: head, neck, two arms out, two legs with a notch */
  var T_MEEPLE =
    '<path d="M50,8 C57,8 62,14 62,21 C62,26 59,30 56,32 ' +
      'C62,34 67,39 70,45 L79,43 C84,42 88,46 87,51 C86,56 82,58 77,57 ' +
      'L70,55 L72,76 C73,82 69,86 63,86 H56 L55,94 H45 L44,86 H37 ' +
      'C31,86 27,82 28,76 L30,55 L23,57 C18,58 14,56 13,51 ' +
      'C12,46 16,42 21,43 L30,45 C33,39 38,34 44,32 ' +
      'C41,30 38,26 38,21 C38,14 43,8 50,8 Z"/>';

  var T_HILIGHT = '<ellipse cx="43" cy="16" rx="5.5" ry="4" ' +
    'transform="rotate(-25 43 16)" style="' + T_HI + '"/>';

  var T_SOLDIER =
    /* the wooden sword in the right hand */
    '<g style="' + T_WOOD + '"><rect x="74" y="5" width="16" height="32" rx="8"/>' +
      '<rect x="65" y="33" width="34" height="11" rx="5.5"/></g>' +
    '<g style="' + T_OWN + '">' + T_MEEPLE + '</g>' +
    /* the little shield on the left hand */
    '<path d="M4,34 H34 V55 C34,67 24,74 19,77 C14,74 4,67 4,55 Z" ' +
      'style="' + T_OWN + '"/>' +
    '<circle cx="19" cy="53" r="6" style="' + T_DARK + '"/>' +
    T_HILIGHT;

  var T_KNIGHT =
    '<g style="' + T_OWN + '">' +
      /* the rocker, then the legs, body, neck and head over it */
      '<path d="M8,72 C25,89 75,89 92,72 L92,82 C74,97 26,97 8,82 Z"/>' +
      '<rect x="27" y="58" width="15" height="22" rx="7"/>' +
      '<rect x="56" y="58" width="15" height="22" rx="7"/>' +
      '<path d="M22,44 C22,38 27,34 34,34 H54 C61,34 66,39 66,46 V58 ' +
        'C66,65 61,69 54,69 H34 C27,69 22,64 22,58 Z"/>' +
      '<path d="M66,8 L70,15 C76,17 80,23 80,30 L81,36 C82,41 78,44 73,43 ' +
        'L64,41 L58,50 L47,50 L49,32 C50,20 56,11 66,8 Z"/>' +
    '</g>' +
    '<path d="M60,14 C54,22 51,32 51,44 L57,42 C57,31 60,23 65,17 Z" ' +
      'style="fill:#000;fill-opacity:0.18;stroke:none"/>' +
    '<circle cx="71" cy="27" r="4" style="' + T_DARK + '"/>' +
    '<ellipse cx="36" cy="45" rx="8" ry="5" transform="rotate(-16 36 45)" ' +
      'style="' + T_HI + '"/>';

  var T_ARCHER =
    /* the bow and its string, held out in the right hand */
    '<path d="M79,12 C95,29 95,71 79,88 L70,81 C83,67 83,33 70,19 Z" ' +
      'style="' + T_WOOD + '"/>' +
    '<path d="M75,16 L63,50 L75,84" style="fill:none;' +
      'stroke:var(--piece-outline,#1b1d24);stroke-width:4;stroke-linejoin:round"/>' +
    '<g style="' + T_OWN + '">' + T_MEEPLE + '</g>' +
    T_HILIGHT;

  var TOY = make({
    id: 'toy',
    name: { he: 'צעצוע', en: 'Toy' },
    palette: { p0: '#fff7ea', p1: '#3b7dd8', light: '#fff3d6', dark: '#ffc46b' },
    boardClass: 'theme-toy',
    shapes: { S: T_SOLDIER, K: T_KNIGHT, A: T_ARCHER }
  });

  /* ======================================================== export ====== */

  var THEMES = {
    classic: CLASSIC,
    heraldic: HERALDIC,
    ink: INK,
    neon: NEON,
    toy: TOY
  };
  var LIST = ['classic', 'heraldic', 'ink', 'neon', 'toy'];

  window.WarGame.Themes = {
    list: LIST.slice(),
    get: function (id) {
      return THEMES[id] || THEMES.classic;
    }
  };
})();
