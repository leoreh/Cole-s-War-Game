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
    '<path d="M16,82 C12,72 11,60 13,48 C16,32 30,22 50,22 ' +
    'C70,22 84,32 87,48 C89,60 88,72 84,82 ' +
    'L76,76 C79,67 80,58 78,50 C75,37 65,31 50,31 ' +
    'C35,31 25,37 22,50 C20,58 21,67 24,76 Z"/>' +
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
  var H_OWN = 'fill:currentColor;' + H_LINE;
  var H_STEEL = 'fill:#c9ced6;' + H_LINE;
  var H_WOOD = 'fill:#8a5a3c;' + H_LINE;
  var H_HIDE = 'fill:#9c6a45;' + H_LINE;
  var H_SKIN = 'fill:#e8c39e;' + H_LINE;
  var H_SHADE = 'fill:#000;fill-opacity:0.2;stroke:none';
  var H_DARK = 'fill:var(--piece-outline,#1b1d24);stroke:none';

  var H_SOLDIER =
    /* the raised sword, behind the arm that holds it */
    '<g style="' + H_STEEL + '">' +
      '<path d="M79,3 L84.5,13 V41 H73.5 V13 Z"/>' +
      '<rect x="66" y="41" width="26" height="6.5" rx="3.2"/>' +
      '<circle cx="79" cy="62" r="4.4"/></g>' +
    '<rect x="75.5" y="46" width="7" height="13" rx="3.5" style="' + H_WOOD + '"/>' +
    /* legs and boots */
    '<g style="' + H_STEEL + '"><path d="M36,64 H47 V83 H36 Z"/>' +
      '<path d="M53,64 H64 V83 H53 Z"/></g>' +
    '<g style="' + H_WOOD + '"><path d="M33,80 H47 V92 H33 Z"/>' +
      '<path d="M53,80 H67 V92 H53 Z"/></g>' +
    /* tabard, its shaded side, the belt */
    '<path d="M36,30 C42,27 58,27 64,30 L67,50 L65,70 H35 L33,50 Z" ' +
      'style="' + H_OWN + '"/>' +
    '<path d="M50,28 C57,28 62,29 64,30 L67,50 L65,70 H50 Z" style="' + H_SHADE + '"/>' +
    '<rect x="32.5" y="51" width="35" height="7.5" rx="2.5" style="' + H_WOOD + '"/>' +
    '<rect x="44" y="50.5" width="12" height="8.5" rx="2.5" style="' + H_STEEL + '"/>' +
    /* the sword arm and its hand */
    '<path d="M62,31 C70,32 77,39 81,47 L71,52 C68,45 65,40 59,39 Z" ' +
      'style="' + H_OWN + '"/>' +
    '<rect x="71.5" y="45" width="12" height="12" rx="5.5" style="' + H_SKIN + '"/>' +
    /* helmet, plume, visor */
    '<path d="M49,8 C46,2 52,-1 56,2 C60,6 56,11 51,11 Z" style="' + H_OWN + '"/>' +
    '<path d="M38,24 C38,12 43,7 50,7 C57,7 62,12 62,24 L62,32 ' +
      'C56,35 44,35 38,32 Z" style="' + H_STEEL + '"/>' +
    '<rect x="40" y="19" width="20" height="5" rx="2.4" style="' + H_DARK + '"/>' +
    /* the shield, in front of everything on that side */
    '<path d="M9,31 H41 V54 C41,68 30,76 25,79 C20,76 9,68 9,54 Z" ' +
      'style="' + H_OWN + '"/>' +
    '<path d="M25,31 H41 V54 C41,68 30,76 25,79 Z" style="' + H_SHADE + '"/>' +
    '<circle cx="25" cy="50" r="5.5" style="' + H_STEEL + '"/>';

  var H_KNIGHT =
    '<path d="M27,47 C17,49 10,60 11,75 L18,73 C17,61 21,54 29,53 Z" ' +
      'style="' + H_WOOD + '"/>' +
    /* the far pair of legs, one shade down */
    '<g style="fill:#6f4630;' + H_LINE + '">' +
      '<path d="M31,58 H39 L37,73 L41,87 L34,90 L28,73 Z"/>' +
      '<path d="M57,58 H65 L67,73 L65,87 H58 L59,73 Z"/></g>' +
    /* barrel, near legs, neck and head */
    '<path d="M24,55 C24,46 34,42 48,42 H62 C67,42 70,46 70,53 ' +
      'C70,63 64,69 52,69 H36 C29,69 24,62 24,55 Z" style="' + H_HIDE + '"/>' +
    '<g style="' + H_HIDE + '">' +
      '<path d="M36,62 H45 L43,76 L46,88 H38 L34,76 Z"/>' +
      '<path d="M53,62 H62 L63,76 L61,88 H54 L55,76 Z"/></g>' +
    '<g style="' + H_DARK + '"><rect x="33" y="86" width="14" height="6" rx="2"/>' +
      '<rect x="53" y="86" width="12" height="6" rx="2"/>' +
      '<rect x="27" y="86" width="14" height="6" rx="2"/></g>' +
    '<path d="M72,20 L70,11 L79,18 Z" style="' + H_HIDE + '"/>' +
    '<path d="M58,47 C60,39 63,31 68,24 C70,20 75,19 78,22 L88,31 ' +
      'C91,34 91,39 88,41 L78,47 C73,51 66,53 60,52 Z" style="' + H_HIDE + '"/>' +
    '<path d="M62,29 C58,37 57,45 58,52 L65,50 C64,44 65,36 69,28 Z" ' +
      'style="' + H_SHADE + '"/>' +
    '<circle cx="79" cy="31" r="2.8" style="' + H_DARK + '"/>' +
    /* the caparison, the owner color on the horse */
    '<path d="M31,42 H66 L68,55 L67,71 L63,61 L59,71 L55,61 L51,71 ' +
      'L47,61 L43,71 L39,61 L35,70 L30,57 Z" style="' + H_OWN + '"/>' +
    '<path d="M50,42 H66 L68,55 L67,71 L63,61 L59,71 L55,61 L51,71 L50,69 Z" ' +
      'style="' + H_SHADE + '"/>' +
    /* the rider */
    '<path d="M40,37 L51,35 L54,53 L44,56 Z" style="' + H_STEEL + '"/>' +
    '<path d="M42,52 L54,50 L56,59 L44,62 Z" style="' + H_WOOD + '"/>' +
    '<path d="M35,19 C40,16 48,16 52,19 L56,38 C48,42 40,42 34,38 Z" ' +
      'style="' + H_STEEL + '"/>' +
    '<path d="M44,17 C48,17 51,18 52,19 L56,38 C52,40 48,41 44,41 Z" ' +
      'style="' + H_SHADE + '"/>' +
    '<g transform="rotate(24 60 30)"><g style="' + H_STEEL + '">' +
      '<path d="M60,1 L64.5,9 V25 H55.5 V9 Z"/>' +
      '<rect x="51" y="25" width="18" height="5" rx="2.5"/></g>' +
      '<rect x="57" y="29" width="6" height="9" rx="3" style="' + H_WOOD + '"/></g>' +
    '<path d="M49,21 C55,21 59,25 61,31 L53,35 C51,30 49,28 45,28 Z" ' +
      'style="' + H_STEEL + '"/>' +
    '<path d="M37,6 C32,5 32,0 37,0 C41,0 43,4 42,7 Z" style="' + H_OWN + '"/>' +
    '<path d="M36,8 C36,2 41,-1 46,0 C51,1 54,5 54,11 L53,19 ' +
      'C47,21 40,21 36,19 Z" style="' + H_STEEL + '"/>' +
    '<rect x="38" y="8" width="15" height="4.5" rx="2.2" style="' + H_DARK + '"/>';

  var H_ARCHER =
    /* the bow, then the string it is drawn by */
    '<path d="M77,9 C90,27 90,73 77,91 L71,87 C83,70 83,30 71,13 Z" ' +
      'style="' + H_WOOD + '"/>' +
    '<path d="M75,11 L45,50 L75,89" style="fill:none;stroke:var(--piece-outline,#1b1d24);' +
      'stroke-width:2.4;stroke-linejoin:round"/>' +
    /* the back leg, the front leg, the boots */
    '<g style="' + H_WOOD + '"><path d="M22,64 H33 L31,83 H20 Z"/>' +
      '<path d="M40,64 H51 L53,83 H42 Z"/></g>' +
    '<g style="' + H_DARK + '"><rect x="16" y="81" width="17" height="8" rx="3"/>' +
      '<rect x="39" y="81" width="17" height="8" rx="3"/></g>' +
    /* tunic */
    '<path d="M22,31 C28,28 42,28 47,31 L51,50 L49,70 H21 L19,50 Z" ' +
      'style="' + H_OWN + '"/>' +
    '<path d="M36,29 C42,29 46,30 47,31 L51,50 L49,70 H36 Z" style="' + H_SHADE + '"/>' +
    '<rect x="18.5" y="51" width="32" height="7" rx="2.5" style="' + H_WOOD + '"/>' +
    /* the face inside the hood, then the hood over it */
    '<ellipse cx="40" cy="22" rx="9" ry="10" style="' + H_SKIN + '"/>' +
    '<path d="M22,22 C22,11 28,5 36,5 C43,5 48,9 49,16 L43,18 ' +
      'C41,13 36,12 32,15 C28,18 27,27 29,33 L23,34 Z" style="' + H_OWN + '"/>' +
    /* the arm that holds the bow, and the arm that draws the string */
    '<path d="M38,40 C52,40 64,44 73,49 L70,57 C61,53 50,49 37,49 Z" ' +
      'style="' + H_OWN + '"/>' +
    '<rect x="66" y="44" width="12" height="12" rx="5.5" style="' + H_SKIN + '"/>' +
    /* the arrow on the string */
    '<rect x="42" y="47" width="44" height="5" rx="2.4" style="' + H_WOOD + '"/>' +
    '<path d="M83,43 L95,49.5 L83,56 Z" style="' + H_STEEL + '"/>' +
    '<path d="M44,43 L37,46 L37,53 L44,56 Z" style="' + H_OWN + '"/>' +
    '<path d="M28,38 L40,41 L45,49 L34,53 Z" style="' + H_OWN + '"/>' +
    '<rect x="39" y="43" width="11" height="12" rx="5" style="' + H_SKIN + '"/>';

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
    'stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round';
  var I_WASH = 'fill:#000;fill-opacity:0.18;stroke:none';

  function inkDefs(kind, seed) {
    return '<filter id="wg-ink-' + kind + '-r" x="-15%" y="-15%" ' +
      'width="130%" height="130%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="1" ' +
      'seed="' + seed + '" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="3.4" ' +
      'xChannelSelector="R" yChannelSelector="G"/></filter>';
  }

  function inkWrap(kind, inner) {
    return '<g filter="url(#wg-ink-' + kind + '-r)" style="' + I_LINE + '">' +
      inner + '</g>';
  }

  var I_SOLDIER = inkWrap('S',
    /* the sword: one diagonal stroke, thin where the brush lifts */
    '<path d="M9,93 L17,84 C39,65 61,43 79,21 L93,6 L85,25 ' +
      'C67,47 45,69 23,88 Z"/>' +
    /* the shield: one loaded stroke, dragged down to the point */
    '<path d="M15,25 C31,18 69,18 85,25 C85,52 79,75 50,94 ' +
      'C21,75 15,52 15,25 Z"/>' +
    '<path d="M50,26 C68,26 80,25 85,25 C85,52 79,75 50,94 Z" style="' + I_WASH + '"/>');

  var I_KNIGHT = inkWrap('K',
    '<path d="M27,91 C24,72 29,54 42,44 C50,38 55,29 56,20 ' +
      'C56,14 62,12 65,17 C67,20 67,24 66,28 ' +
      'C71,22 78,23 82,29 C87,37 89,46 89,52 C89,57 85,60 79,60 ' +
      'L64,60 C58,62 55,66 55,74 L55,91 Z"/>' +
    '<path d="M55,74 C55,66 58,62 64,60 L79,60 C85,60 89,57 89,52 ' +
      'C89,46 87,37 82,29 L88,44 C89,52 85,66 74,70 C64,74 57,80 55,91 Z" ' +
      'style="' + I_WASH + '"/>' +
    '<path d="M22,92 C14,88 9,80 8,70 L15,72 C16,79 19,85 25,88 Z"/>' +
    '<circle cx="74" cy="41" r="3.4" style="fill:var(--piece-outline,#1b1d24);stroke:none"/>');

  var I_ARCHER = inkWrap('A',
    /* the bow: a crescent thick at the belly, thin at the tips */
    '<path d="M26,7 C50,26 58,40 58,50 C58,61 50,75 26,94 L19,88 ' +
      'C41,71 49,60 49,50 C49,41 41,30 20,13 Z"/>' +
    /* the string drawn back, and the arrow lying on it */
    '<path d="M24,9 L12,50 L24,92 L27,90 L17,50 L27,11 Z" style="stroke-width:1.6"/>' +
    '<path d="M13,46 L83,47 L83,53 L13,54 Z"/>' +
    '<path d="M79,39 L97,50 L79,61 Z"/>' +
    '<path d="M16,40 L7,45 L7,55 L16,60 Z"/>');

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
    '<path d="M18,14 L30,26 M70,26 L82,14"/>' +
    '<path d="M12,20 L24,8 M76,8 L88,20"/>' +
    '<path d="M62,66 L74,88 M38,66 L26,88"/>' +
    '<path d="M22,34 H78 V56 C78,74 66,86 50,92 C34,86 22,74 22,56 Z"/>';

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

  var T_MEEPLE =
    '<path d="M50,38 C63,38 73,47 77,59 L80,74 C81,80 77,84 71,83 ' +
      'L64,81 L63,91 C63,94 61,96 58,96 H42 C39,96 37,94 37,91 ' +
      'L36,81 L29,83 C23,84 19,80 20,74 L23,59 C27,47 37,38 50,38 Z"/>' +
    '<circle cx="50" cy="22" r="15"/>';

  var T_SOLDIER =
    /* the sword over the shoulder */
    '<g style="' + T_WOOD + '"><rect x="74" y="12" width="13" height="40" rx="6.5"/>' +
      '<rect x="64" y="46" width="33" height="10" rx="5"/></g>' +
    '<g style="' + T_OWN + '">' + T_MEEPLE + '</g>' +
    /* the little shield */
    '<path d="M6,40 H37 V58 C37,70 26,77 21.5,79 C17,77 6,70 6,58 Z" ' +
      'style="' + T_OWN + '"/>' +
    '<circle cx="21.5" cy="56" r="6" style="' + T_DARK + '"/>' +
    '<ellipse cx="43" cy="15" rx="5.5" ry="4" transform="rotate(-25 43 15)" ' +
      'style="' + T_HI + '"/>';

  var T_KNIGHT =
    '<g style="' + T_OWN + '">' +
      /* head, neck and barrel in one chunky body */
      '<path d="M57,8 C68,8 76,16 76,27 L76,36 C76,40 73,43 69,43 ' +
        'L64,43 C66,47 67,51 67,55 L67,64 C67,70 62,74 56,74 H34 ' +
        'C27,74 22,69 22,62 L22,50 C22,40 29,32 39,30 L45,29 ' +
        'C46,17 50,8 57,8 Z"/>' +
      /* the rocker */
      '<path d="M8,78 C24,92 76,92 92,78 L92,88 C74,99 26,99 8,88 Z"/>' +
    '</g>' +
    '<rect x="30" y="68" width="12" height="16" rx="5" style="' + T_OWN + '"/>' +
    '<rect x="56" y="68" width="12" height="16" rx="5" style="' + T_OWN + '"/>' +
    '<circle cx="64" cy="26" r="4" style="' + T_DARK + '"/>' +
    '<ellipse cx="38" cy="45" rx="7" ry="4.5" transform="rotate(-20 38 45)" ' +
      'style="' + T_HI + '"/>';

  var T_ARCHER =
    /* the bow and its string, behind the token */
    '<path d="M74,16 C92,32 92,68 74,84 L64,76 C78,64 78,36 64,24 Z" ' +
      'style="' + T_WOOD + '"/>' +
    '<path d="M70,20 L46,50 L70,80" style="fill:none;stroke:var(--piece-outline,#1b1d24);' +
      'stroke-width:4;stroke-linejoin:round"/>' +
    '<g style="' + T_OWN + '">' + T_MEEPLE + '</g>' +
    '<g style="' + T_WOOD + '"><rect x="26" y="44" width="62" height="10" rx="5"/></g>' +
    '<path d="M84,38 L99,49 L84,60 Z" style="' + T_OWN + '"/>' +
    '<ellipse cx="43" cy="15" rx="5.5" ry="4" transform="rotate(-25 43 15)" ' +
      'style="' + T_HI + '"/>';

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
