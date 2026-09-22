/* =====================================================================
   ui.js - the board, the panel, the drawers and the sheets that open
   from its icon bar, input, animation, settings, storage, the invite
   and the service worker. There is one window and a game is always on
   the board.
   window.WarGame.UI
   ===================================================================== */

window.WarGame = window.WarGame || {};

(function () {
  'use strict';

  var I18N = window.WarGame.I18N;
  var Icons = window.WarGame.Icons;
  var Engine = window.WarGame.Engine;

  /* ------------------------------------------------------- constants --- */

  var SETTINGS_KEY = 'wargame.settings';
  var GAME_KEY = 'wargame.game';
  var MODE_KEY = 'wargame.mode';
  var KIND_ORDER = ['K', 'A', 'S'];

  /* against the computer the human is always player 0, the light side at
     the bottom of the board, and the computer is player 1 */
  var HUMAN = 0;
  var COMPUTER = 1;
  var LEVELS = ['easy', 'medium', 'hard'];

  /* the link is a constant, so an invite sent from a file:// copy or from
     the home-screen app still points at the page everyone can open */
  var GAME_URL = 'https://leoreh.github.io/Cole-s-War-Game/';

  var DEFAULT_SETTINGS = {
    lang: null,
    theme: 'classic',
    p0: '#efe6cf',
    p1: '#2f3550',
    sqLight: '#efe0c3',
    sqDark: '#a97e57',
    randomBoard: false,
    boardColors: null,
    animations: true,
    coordinates: false,
    diagonalMoves: true,
    opponent: 'human',     /* the New game sheet remembers the last choice */
    level: 'medium'
  };

  var PRESETS = [
    { id: 'wood', p0: '#efe6cf', p1: '#2f3550', sqLight: '#efe0c3', sqDark: '#a97e57' },
    { id: 'marble', p0: '#fdfcf8', p1: '#363b46', sqLight: '#ebe9e3', sqDark: '#98a0a9' },
    { id: 'forest', p0: '#f4f1da', p1: '#21402c', sqLight: '#dfe7cc', sqDark: '#6d8f5d' },
    { id: 'ocean', p0: '#eaf5fa', p1: '#0f3450', sqLight: '#d6e9f1', sqDark: '#5a8fa9' },
    { id: 'rose', p0: '#fff2f0', p1: '#5c1f33', sqLight: '#f5dfe0', sqDark: '#c08497' },
    { id: 'night', p0: '#e9e5f2', p1: '#15161c', sqLight: '#4b5065', sqDark: '#2b2f3d' }
  ];

  /* ------------------------------------------------------- app state --- */

  /* written by build.py: the first twelve hex digits of the page's hash */
  var BUILD = '__VERSION__';

  var G = {
    settings: null,
    state: null,      /* the game on the board: there is always one */
    mode: 'human',    /* 'human': two players; 'computer': player 1 is the AI */
    level: 'medium',  /* the computer's level in this game */
    history: [],      /* { state, start } before each action: see pushHistory */
    sel: null,        /* id of the selected piece */
    acts: [],         /* its legal actions */
    pick: null,       /* a square it may both strike and fire at: the choice is open */
    busy: false,      /* animating or the computer is playing: input is blocked */
    aiRun: 0,         /* the id of the computer turn now playing */
    boardClass: ''    /* the theme class now on the board and on <body> */
  };

  var el = {};          /* cached nodes */
  var pieceEls = {};    /* piece id -> its .pc element */
  var reduceMotion = null;

  /* ---------------------------------------------------- small helpers --- */

  function $(id) { return document.getElementById(id); }

  function t(key, vars) { return I18N.t(key, vars); }

  function make(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function clearNode(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function fmt(v) { return Icons.fmtStrength(v); }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return { r: 128, g: 128, b: 128 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function luminance(hex) {
    var c = hexToRgb(hex);
    function ch(v) {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }

  /* a dark outline on a light piece, a light outline on a dark one */
  function outlineFor(hex) {
    return luminance(hex) > 0.42 ? '#191c24' : '#f6f4ef';
  }

  function playerColor(p) { return p === 1 ? G.settings.p1 : G.settings.p0; }

  /* every place a player is named reads it from here: against the computer
     the two sides are the human and the machine, not player 1 and player 2 */
  function playerName(p) {
    if (G.mode === 'computer') {
      return t(p === COMPUTER ? 'player.computer' : 'player.you');
    }
    return t('player.' + p);
  }

  function levelOf(v) { return LEVELS.indexOf(v) >= 0 ? v : 'medium'; }

  function setMode(opponent, level) {
    G.mode = opponent === 'computer' ? 'computer' : 'human';
    G.level = levelOf(level || G.settings.level);
  }

  /* activatableKinds gives a Set; an array reads the same way here */
  function inKinds(set, kind) {
    if (!set) return false;
    if (typeof set.has === 'function') return set.has(kind);
    return Array.prototype.indexOf.call(set, kind) >= 0;
  }

  function animOn() {
    return !!(G.settings && G.settings.animations) &&
      !(reduceMotion && reduceMotion.matches);
  }

  function wait(ms) {
    var d = animOn() ? ms : 0;
    return new Promise(function (r) { setTimeout(r, d); });
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* --------------------------------------------------------- themes ---- */

  function Themes() { return window.WarGame.Themes; }

  function themeList() {
    var T = Themes();
    if (T && T.list && T.list.length) return T.list.slice();
    return ['classic'];
  }

  function themeDef(id) {
    var T = Themes();
    if (!T || typeof T.get !== 'function') return null;
    try { return T.get(id) || null; } catch (e) { return null; }
  }

  function themeName(id) {
    var d = themeDef(id);
    if (d && d.name && d.name[I18N.current]) return d.name[I18N.current];
    return t('theme.' + id);
  }

  function themeClass(id) {
    var d = themeDef(id);
    return (d && d.boardClass) || ('theme-' + id);
  }

  function currentTheme() {
    var id = G.settings.theme || 'classic';
    return themeList().indexOf(id) >= 0 ? id : 'classic';
  }

  /* ------------------------------------------------------- the settings - */

  function loadSettings() {
    var s = {}, k;
    for (k in DEFAULT_SETTINGS) s[k] = DEFAULT_SETTINGS[k];
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        var got = JSON.parse(raw);
        for (k in DEFAULT_SETTINGS) {
          if (got && got[k] !== undefined && got[k] !== null) s[k] = got[k];
        }
      }
    } catch (e) { /* no storage: the defaults stand */ }
    if (!s.lang) {
      s.lang = (navigator.language || 'en').toLowerCase().indexOf('he') === 0 ? 'he' : 'en';
    }
    return s;
  }

  function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(G.settings)); }
    catch (e) { /* private mode: the settings live for this session only */ }
  }

  /* one soft random color per square, the checker pattern kept by lightness */
  function makeBoardColors() {
    var out = [];
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < 8; c++) {
        var dark = (r + c) % 2 === 0;
        var h = Math.floor(Math.random() * 360);
        out.push('hsl(' + h + ', 45%, ' + (dark ? 58 : 72) + '%)');
      }
    }
    return out;
  }

  function applySettings() {
    var root = document.documentElement;
    root.style.setProperty('--p0', G.settings.p0);
    root.style.setProperty('--p1', G.settings.p1);
    root.style.setProperty('--p0-outline', outlineFor(G.settings.p0));
    root.style.setProperty('--p1-outline', outlineFor(G.settings.p1));
    root.style.setProperty('--sq-light', G.settings.sqLight);
    root.style.setProperty('--sq-dark', G.settings.sqDark);

    /* the theme decoration rides on one class, on the board and on <body> */
    var cls = themeClass(currentTheme());
    if (G.boardClass && G.boardClass !== cls) {
      el.board.classList.remove(G.boardClass);
      document.body.classList.remove(G.boardClass);
    }
    el.board.classList.add(cls);
    document.body.classList.add(cls);
    G.boardClass = cls;

    document.body.classList.toggle('no-anim', !G.settings.animations);
    el.board.classList.toggle('board--coords', !!G.settings.coordinates);
    paintSquares();
  }

  function paintSquares() {
    var use = G.settings.randomBoard && G.settings.boardColors &&
      G.settings.boardColors.length === 64;
    for (var i = 0; i < el.sqs.length; i++) {
      var sq = el.sqs[i];
      var r = +sq.dataset.row, c = +sq.dataset.col;
      sq.style.backgroundColor = use ? G.settings.boardColors[r * 8 + c] : '';
    }
  }

  /* -------------------------------------------------------- language ---- */

  function setLang(lang) {
    I18N.set(lang);
    G.settings.lang = I18N.current;
    saveSettings();
    refreshTexts();
  }

  function refreshTexts() {
    var root = document.documentElement;
    root.setAttribute('lang', I18N.current);
    root.setAttribute('dir', I18N.dir());
    document.title = t('app.title');

    var nodes = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t(nodes[i].getAttribute('data-i18n'));
    }
    if (el.buildStamp) {
      /* the source folder carries the placeholder, and says nothing */
      el.buildStamp.textContent = BUILD.indexOf('__') === 0 ? '' : t('settings.build', { v: BUILD });
    }
    var titled = document.querySelectorAll('[data-i18n-title]');
    for (var k = 0; k < titled.length; k++) {
      var s = t(titled[k].getAttribute('data-i18n-title'));
      titled[k].setAttribute('title', s);
      titled[k].setAttribute('aria-label', s);
    }

    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('is-on', btns[j].dataset.lang === I18N.current);
    }

    renderWordmark(true);
    renderPresets();
    renderThemes();
    renderRules();
    /* the live lines hold a sentence written in the old language */
    msg('');
    shareMsg('');
    renderPieces();
    if (G.state) { renderPanel(); renderMarks(); }
    if (isOpen('newgame')) renderNewGame();
    if (isOpen('merge')) renderMergeDialog();
    if (isOpen('over')) renderOver();
    if (isOpen('share')) renderShare();
  }

  /* --------------------------------------------------------- wordmark --- */

  /* app.title1 and app.title2 come in the order they are drawn; which of the
     two is the title and which the credit is a matter of the language, since
     English reads the credit over the name and Hebrew reads it under it */
  function wordmarkRoles() {
    return I18N.current === 'he'
      ? ['wm-title', 'wm-credit']
      : ['wm-credit', 'wm-title'];
  }

  function fillWordmark(node, roles, play) {
    if (!node) return;
    var lines = node.getElementsByClassName('wm-line');
    if (lines.length < 2) return;
    lines[0].textContent = t('app.title1');
    lines[1].textContent = t('app.title2');
    lines[0].className = 'wm-line ' + roles[0];
    lines[1].className = 'wm-line ' + roles[1];
    /* one string for a screen reader, whatever the two lines are */
    node.setAttribute('aria-label', t('app.title'));
    node.classList.remove('is-in');
    if (!play || !animOn()) return;
    void node.offsetWidth;        /* so the entrance starts from the top */
    node.classList.add('is-in');
  }

  /* the panel wordmark plays on the first render, on a new language and on a
     new theme; the one in the rules sheet plays when that sheet opens */
  function renderWordmark(play) {
    var roles = wordmarkRoles();
    fillWordmark(el.wmPanel, roles, play);
    fillWordmark(el.wmRules, roles, false);
  }

  /* --------------------------------------------------------- overlays --- */

  function ov(name) { return $('ov-' + name); }

  /* an overlay on its way out is already closed: the board takes taps again
     as soon as the closing starts, not when the fade ends */
  function isOpen(name) {
    var n = ov(name);
    return !!n && !n.hidden && n.classList.contains('is-open');
  }

  function openOv(name) {
    var n = ov(name);
    if (!n) return;
    if (n._timer) { clearTimeout(n._timer); n._timer = null; }
    n.hidden = false;
    void n.offsetWidth;          /* so the transition starts from the closed look */
    n.classList.add('is-open');
    document.body.classList.add('has-overlay');
  }

  function closeOv(name) {
    var n = ov(name);
    if (!n || n.hidden) return;
    n.classList.remove('is-open');
    n._timer = setTimeout(function () {
      n.hidden = true;
      n._timer = null;
      if (!anyOverlayOpen()) document.body.classList.remove('has-overlay');
    }, 230);
  }

  var OVERLAYS = ['appearance', 'settings', 'rules', 'share', 'newgame',
    'merge', 'over'];

  /* the ones a tap outside or Escape closes, innermost first */
  var LIGHT = ['share', 'rules', 'appearance', 'settings', 'newgame'];

  function anyOverlayOpen() {
    for (var i = 0; i < OVERLAYS.length; i++) if (isOpen(OVERLAYS[i])) return true;
    return false;
  }

  /* ------------------------------------------------------- new game ---- */

  function gameOn() { return !!(G.state && G.state.winner === null); }

  /* the choice the sheet is showing; it opens on the one remembered and
     only reaches the settings when Start is pressed */
  var NG = { opponent: 'human', level: 'medium' };

  function segHTML(items, chosen) {
    var out = '';
    for (var i = 0; i < items.length; i++) {
      var on = items[i].v === chosen;
      out += '<button type="button" class="seg-btn' + (on ? ' is-on' : '') +
        '" data-v="' + items[i].v + '" aria-pressed="' + (on ? 'true' : 'false') +
        '">' + esc(items[i].label) + '</button>';
    }
    return out;
  }

  function renderNewGame() {
    el.segOpponent.innerHTML = segHTML([
      { v: 'human', label: t('opp.human') },
      { v: 'computer', label: t('opp.computer') }
    ], NG.opponent);
    el.segOpponent.setAttribute('aria-label', t('game.opponent'));

    el.segLevel.innerHTML = segHTML(LEVELS.map(function (id) {
      return { v: id, label: t('level.' + id) };
    }), NG.level);
    el.segLevel.setAttribute('aria-label', t('game.level'));
    el.segLevel.hidden = NG.opponent !== 'computer';

    /* the sentence about the game that is lost belongs to a game still on */
    el.ngWarn.hidden = !gameOn();
  }

  function openNewGame() {
    NG.opponent = G.settings.opponent === 'computer' ? 'computer' : 'human';
    NG.level = levelOf(G.settings.level);
    renderNewGame();
    openOv('newgame');
  }

  function startChosen() {
    G.settings.opponent = NG.opponent;
    G.settings.level = NG.level;
    saveSettings();
    closeOv('newgame');
    newGame();
  }

  /* ------------------------------------------------------- the layout --- */

  function measure() {
    var root = document.documentElement;
    root.style.setProperty('--vh', window.innerHeight + 'px');
    root.style.setProperty('--vw', window.innerWidth + 'px');
    var w = el.board.clientWidth;
    if (w > 0) root.style.setProperty('--sq', (w / 8) + 'px');
  }

  function remeasure() {
    measure();
    requestAnimationFrame(measure);
  }

  /* ------------------------------------------------------- the squares -- */

  var FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  function buildSquares() {
    clearNode(el.squares);
    el.sqs = [];
    /* row 7 is drawn at the top, row 0 at the bottom; column 0 at the left */
    for (var r = 7; r >= 0; r--) {
      for (var c = 0; c < 8; c++) {
        var dark = (r + c) % 2 === 0;
        var sq = make('div', 'sq ' + (dark ? 'sq--dark' : 'sq--light'));
        sq.dataset.row = r;
        sq.dataset.col = c;
        if (r === 0) sq.appendChild(make('span', 'coord coord--file', FILES[c]));
        if (c === 0) sq.appendChild(make('span', 'coord coord--rank', String(r + 1)));
        el.squares.appendChild(sq);
        el.sqs.push(sq);
      }
    }
  }

  function sqNode(row, col) {
    return el.sqs[(7 - row) * 8 + col];
  }

  /* percent transform of a board square, the board being 8 squares wide */
  function tf(row, col) {
    return 'translate(' + (col * 100) + '%, ' + ((7 - row) * 100) + '%)';
  }

  function centerPx(row, col) {
    var s = el.board.clientWidth / 8;
    return { x: (col + 0.5) * s, y: (7 - row + 0.5) * s, s: s };
  }

  /* -------------------------------------------------------- the pieces -- */

  function viewState() { return G.state; }

  function renderPieces() {
    var st = viewState(), id, p;
    if (!st) return;
    var live = st === G.state;
    var theme = currentTheme();
    var seen = {};
    for (id in st.pieces) {
      p = st.pieces[id];
      seen[id] = true;
      var node = pieceEls[id];
      if (!node) {
        node = make('div', 'pc');
        node.dataset.id = id;
        pieceEls[id] = node;
        el.pieces.appendChild(node);
      }
      node.style.opacity = '';
      node.style.transitionDuration = '';
      node.style.transform = tf(p.row, p.col);
      var fireLeft = live && Engine.canFireAgain(st, id);
      node.classList.toggle('pc--used', live && isUsed(st, id) && !fireLeft);
      node.classList.toggle('pc--fire', !!fireLeft);
      node.classList.toggle('pc--sel', live && G.sel === id);
      var s = Engine.pieceStats(p);
      node.innerHTML = Icons.piece(p.kinds, {
        owner: p.owner, theme: theme,
        hp: p.hp, maxHp: s.maxHp, str: s.str,
        fireLeft: fireLeft
      });
    }
    for (id in pieceEls) {
      if (!seen[id]) {
        if (pieceEls[id].parentNode) pieceEls[id].parentNode.removeChild(pieceEls[id]);
        delete pieceEls[id];
      }
    }
  }

  function isUsed(st, id) {
    var u = st.turn.used;
    for (var i = 0; i < u.length; i++) if (u[i].id === id) return true;
    return false;
  }

  /* ---------------------------------------------------------- the panel - */

  /* the title carries the name where the compact bar shows the glyph alone */
  function chip(kind, dim) {
    var name = esc(t('kind.' + kind));
    return '<span class="chip' + (dim ? ' chip--dim' : '') + '" title="' + name + '">' +
      '<span class="chip-ico">' + Icons.glyph(kind, { theme: currentTheme() }) + '</span>' +
      '<span>' + name + '</span></span>';
  }

  function renderPanel() {
    var st = G.state;
    if (!st) return;
    var pl = st.turn.player;

    el.turnSwatch.style.background = playerColor(pl);
    el.turnName.textContent = playerName(pl);
    el.turnNumber.textContent = t('game.turn', { n: st.turn.number });
    document.documentElement.style.setProperty('--p-cur', playerColor(pl));
    document.documentElement.style.setProperty('--p-cur-outline', outlineFor(playerColor(pl)));

    var used = Engine.usedKinds(st) || [];
    el.comboUsed.innerHTML = used.length
      ? used.map(function (k) { return chip(k); }).join('')
      : '<span class="chip chip--dim">' + esc(t('panel.nothing')) + '</span>';

    var avail = [];
    if (st.winner === null && !st.pendingMerge) {
      var set = Engine.activatableKinds(st);
      avail = KIND_ORDER.filter(function (k) { return inKinds(set, k); });
    }
    el.comboAvail.innerHTML = avail.length
      ? avail.map(function (k) { return chip(k); }).join('')
      : '<span class="chip chip--dim">' + esc(t('panel.nothing')) + '</span>';

    var canHeal = !!(G.sel && hasAct('heal'));
    el.btnHeal.hidden = !canHeal;
    el.btnUndo.disabled = !canUndo();
    el.btnEndTurn.disabled = st.winner !== null || !!st.pendingMerge || G.busy;
  }

  function msg(text) { el.panelMsg.textContent = text || ''; }

  /* --------------------------------------------- selection and marks ---- */

  function hasAct(type) {
    for (var i = 0; i < G.acts.length; i++) if (G.acts[i].type === type) return true;
    return false;
  }

  function select(id) {
    G.sel = id;
    G.pick = null;
    G.acts = Engine.legalActions(G.state, id) || [];
    renderMarks();
    renderPieces();
    renderPanel();
  }

  function deselect() {
    G.sel = null;
    G.pick = null;
    G.acts = [];
    renderMarks();
    renderPieces();
    renderPanel();
  }

  function markNode(row, col, cls, inner) {
    var n = make('div', 'mark ' + cls, inner || '');
    n.style.transform = tf(row, col);
    el.marks.appendChild(n);
    return n;
  }

  function clearMarks() {
    clearNode(el.marks);
    for (var i = 0; i < el.sqs.length; i++) {
      el.sqs[i].classList.remove('sq--sel', 'sq--act');
    }
  }

  function renderMarks() {
    clearMarks();
    var st = G.state;
    if (!st) return;

    /* a faint ring on the pieces that may still be activated */
    if (st.winner === null && !st.pendingMerge && !G.busy) {
      var mine = Engine.piecesOf(st, st.turn.player) || [];
      for (var m = 0; m < mine.length; m++) {
        var pid = mine[m].id;
        if (Engine.canActivate(st, pid) || Engine.canHeal(st, pid) ||
            Engine.canFireAgain(st, pid)) {
          sqNode(mine[m].row, mine[m].col).classList.add('sq--act');
        }
      }
    }

    if (!G.sel) return;
    var me = st.pieces[G.sel];
    if (me) sqNode(me.row, me.col).classList.add('sq--sel');

    for (var a = 0; a < G.acts.length; a++) {
      var act = G.acts[a];
      if (act.type === 'move') {
        markNode(act.to.row, act.to.col, 'mark--move');
      } else if (act.type === 'attack') {
        var d = st.pieces[act.target];
        if (d) markNode(d.row, d.col, 'mark--attack');
      } else if (act.type === 'fire') {
        var f = st.pieces[act.target];
        if (f) {
          /* a target the piece may also strike keeps its red ring and only
             gains the bow: the tap on it asks which of the two */
          var dual = actionsAt(f.row, f.col).length > 1;
          markNode(f.row, f.col, dual ? 'mark--dual' : 'mark--fire',
            '<span class="bowmark">' + Icons.bowMark + '</span>');
        }
      } else if (act.type === 'heal' && me) {
        var b = make('button', 'heal-btn', '<span>' + esc(t('action.heal')) + '</span>');
        b.type = 'button';
        b.style.transform = tf(me.row, me.col);
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          doAction({ type: 'heal', piece: G.sel });
        });
        el.marks.appendChild(b);
      }
    }

    if (G.pick) renderPick(G.pick);
  }

  /* the two pills on a square the piece may both strike and fire at */
  function renderPick(pk) {
    var cls = 'pick' + (pk.col === 0 ? ' pick--start' : pk.col === 7 ? ' pick--end' : '');
    var box = make('div', cls, '');
    box.style.transform = tf(pk.row, pk.col);
    pk.acts.forEach(function (a) {
      var b = make('button', 'pick-btn pick-btn--' + a.type,
        (a.type === 'fire' ? Icons.bowMark : Icons.swordMark) +
        '<span>' + esc(t('action.' + a.type)) + '</span>');
      b.type = 'button';
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        doAction(a);
      });
      box.appendChild(b);
    });
    el.marks.appendChild(box);
  }

  /* the actions whose target square is this one: none, one, or a strike
     and a shot at the same enemy */
  function actionsAt(row, col) {
    var st = G.state, out = [];
    for (var i = 0; i < G.acts.length; i++) {
      var a = G.acts[i];
      if (a.type === 'move' && a.to.row === row && a.to.col === col) {
        out.push({ type: 'move', piece: G.sel, to: { row: row, col: col } });
      }
      if (a.type === 'attack' || a.type === 'fire') {
        var p = st.pieces[a.target];
        if (p && p.row === row && p.col === col) {
          out.push({ type: a.type, piece: G.sel, target: a.target });
        }
      }
    }
    return out;
  }

  function whyNot(p) {
    var st = G.state;
    if (isUsed(st, p.id)) return t('msg.used');
    var set = Engine.activatableKinds(st);
    var kind = Engine.comboKind(p);
    if (!inKinds(set, kind)) return t('msg.comboFull', { kind: t('kind.' + kind) });
    return t('msg.cannot');
  }

  /* ----------------------------------------------------------- input ---- */

  function onBoardPointer(e) {
    if (e.button !== undefined && e.button !== 0) return;
    var sq = e.target && e.target.closest ? e.target.closest('.sq') : null;
    if (!sq) return;
    e.preventDefault();
    onSquare(+sq.dataset.row, +sq.dataset.col);
  }

  function onSquare(row, col) {
    var st = G.state;
    if (!st || G.busy || st.winner !== null || anyOverlayOpen()) return;
    if (st.pendingMerge) { msg(t('msg.pending')); return; }

    if (G.sel) {
      var acts = actionsAt(row, col);
      if (acts.length > 1) {
        /* the same enemy may be struck or shot: the player chooses */
        G.pick = { row: row, col: col, acts: acts };
        renderMarks();
        return;
      }
      if (acts.length) { doAction(acts[0]); return; }
    }

    var p = Engine.pieceAt(st, row, col);
    if (!p || p.owner !== st.turn.player) { deselect(); msg(''); return; }
    if (p.id === G.sel) { deselect(); return; }

    var acts = Engine.legalActions(st, p.id) || [];
    if (acts.length) { msg(''); select(p.id); }
    else { deselect(); msg(whyNot(p)); }
  }

  /* --------------------------------------------------------- actions ---- */

  /* one action of the human; the computer's go through applyAction */
  function doAction(action) {
    if (!G.state || G.busy) return;
    if (G.mode === 'computer' && G.state.turn.player === COMPUTER) return;
    applyAction(action, null);
  }

  /* applies one action, plays its events and answers whether it took.
     opts.hold keeps the input blocked, because the computer's turn is not
     over yet; opts.ai leaves the merge dialog and the fire hint alone,
     since they belong to a human at the board */
  function applyAction(action, opts) {
    var prev = G.state, res, run = G.aiRun;
    if (!prev) return Promise.resolve(false);
    try {
      res = Engine.apply(prev, action);
    } catch (err) {
      if (!opts || !opts.ai) msg(t('msg.cannot'));
      return Promise.resolve(false);
    }

    pushHistory(prev, action);

    G.state = res.state;
    G.sel = null;
    G.pick = null;
    G.acts = [];
    clearMarks();
    G.busy = true;
    renderPanel();

    return playEvents(res.events || [], prev, res.state).then(function () {
      /* a new game may have come on the board while this played out: then
         nothing of this action is left to say, and the new game rules */
      if (run !== G.aiRun) return false;
      G.busy = !!(opts && opts.hold);
      render();
      autosave();
      afterAction(res.events || [], action, !!(opts && opts.ai));
      if (!opts) maybeComputerTurn();
      return true;
    });
  }

  function afterAction(events, action, ai) {
    var st = G.state;
    var line = '';
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'pass') {
        line = t('msg.pass', { name: playerName(events[i].player) });
      }
    }
    if (st.winner !== null) { msg(line); openOver(); return; }
    if (st.pendingMerge) {
      if (line || !ai) msg(line);
      if (!ai) openMerge();      /* the computer answers its own merges */
      return;
    }

    /* a firing piece that took a single step keeps its shot: it stays
       selected with its targets on, and the panel says so */
    if (!ai && action && action.type === 'move' &&
        Engine.canFireAgain(st, action.piece)) {
      select(action.piece);
      msg(t('msg.mayFire'));
      return;
    }
    /* while the computer plays, the panel goes on saying so */
    if (line || !ai) msg(line);
  }

  function endTurn() {
    if (G.busy || !G.state) return;
    if (G.state.pendingMerge) { msg(t('msg.pending')); return; }
    doAction({ type: 'endTurn' });
  }

  /* ------------------------------------------------------- the history --
     The state before each action. With two players the history is the
     current turn alone and End turn clears it. Against the computer it
     runs across the turns, and the entry that opens a human turn carries a
     mark, so that Undo pressed before anything is done steps back over the
     computer's turn to the start of the human turn before it.
     --------------------------------------------------------------------- */

  function humanTurnStart(st) {
    return !!st && st.winner === null && st.turn.player === HUMAN &&
      st.turn.used.length === 0 && !st.pendingMerge;
  }

  function pushHistory(prev, action) {
    if (G.mode !== 'computer') {
      if (action.type === 'endTurn') G.history = [];
      else G.history.push({ state: prev, start: false });
      return;
    }
    G.history.push({ state: prev, start: humanTurnStart(prev) });
  }

  function hasMark() {
    for (var i = 0; i < G.history.length; i++) if (G.history[i].start) return true;
    return false;
  }

  function canUndo() {
    if (G.busy || !G.history.length) return false;
    if (G.mode !== 'computer') return true;
    /* at the start of a turn Undo gives back a whole pair of turns, so
       there has to be a human turn on the way back to land in */
    return humanTurnStart(G.state) ? hasMark() : true;
  }

  function undo() {
    if (!canUndo()) return;
    var e = G.history.pop();
    if (G.mode === 'computer' && humanTurnStart(G.state)) {
      while (!e.start && G.history.length) e = G.history.pop();
    }
    G.state = e.state;
    G.sel = null;
    G.acts = [];
    msg('');
    render();
    autosave();
    if (G.state.pendingMerge) openMerge(); else closeOv('merge');
  }

  /* =====================================================================
     THE COMPUTER
     Its whole turn comes from window.WarGame.AI.planTurn as engine actions,
     and they are applied one at a time through the path a human's actions
     take, so every move, attack, shot, heal and merge animates the same
     way, with a pause between them. The board and the buttons stay blocked
     from the first action to the last. If the plan fails at any point the
     turn is simply ended, so the game never hangs.
     ===================================================================== */

  function computerToPlay() {
    return G.mode === 'computer' && !!G.state && G.state.winner === null &&
      G.state.turn.player === COMPUTER;
  }

  function maybeComputerTurn() {
    if (computerToPlay()) computerTurn();
  }

  /* the pause between two actions of the computer, so the human can follow */
  function aiPause() {
    var ms = animOn() ? 400 : 250;
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function planTurn() {
    var AI = window.WarGame.AI;
    if (!AI || typeof AI.planTurn !== 'function') return null;
    try { return AI.planTurn(G.state, G.level, {}); }
    catch (e) { return null; }
  }

  async function computerTurn() {
    var run = ++G.aiRun;
    var turnNo = G.state.turn.number;
    G.busy = true;
    G.sel = null;
    G.acts = [];
    clearMarks();
    msg(t('msg.thinking'));
    renderPanel();

    /* a breath, so the message is on the screen before the planning */
    await new Promise(function (r) { setTimeout(r, 80); });
    if (run !== G.aiRun) return;

    var plan = planTurn();
    if (!plan || !plan.length) plan = [{ type: 'endTurn' }];

    for (var i = 0; i < plan.length; i++) {
      if (!computerToPlay() || G.state.turn.number !== turnNo) break;
      var ok = await applyAction(plan[i], { hold: true, ai: true });
      if (run !== G.aiRun) return;
      if (!ok) break;            /* an action the board no longer allows */
      if (computerToPlay() && G.state.turn.number === turnNo) await aiPause();
      if (run !== G.aiRun) return;
    }

    /* however the plan ended, the turn is handed back here */
    if (computerToPlay() && G.state.pendingMerge) {
      await applyAction({ type: 'skipMerge', piece: G.state.pendingMerge },
        { hold: true, ai: true });
      if (run !== G.aiRun) return;
    }
    if (computerToPlay() && G.state.turn.number === turnNo) {
      await applyAction({ type: 'endTurn' }, { hold: true, ai: true });
      if (run !== G.aiRun) return;
    }

    G.busy = false;
    if (el.panelMsg.textContent === t('msg.thinking')) msg('');
    render();
    /* the human may have had no move at all: then it is the computer again */
    maybeComputerTurn();
  }

  function render() {
    renderPieces();
    renderMarks();
    renderPanel();
    measure();
  }

  /* =====================================================================
     EFFECTS (the animations)
     Each effect is one small function over the events of Engine.apply and
     its own block of CSS (see EFFECTS in style.css). Input is blocked
     while they run; with the animations setting off, or under
     prefers-reduced-motion, every wait is zero and nothing is drawn.

     No single action runs longer than about 600 ms: a move is 300, a shot
     460, a blow 420 and the death that may follow it 200, so a turn on an
     iPad never waits for the screen. The colors of the sparks and of the
     fragments come from FX_TONE, one entry per theme.
     ===================================================================== */

  /* the spark and clash colors of each theme; classic is the fallback */
  var FX_TONE = {
    classic:  { spark: ['#ffe9a8', '#ffd066', '#fff6df'], merge: ['#ffd782', '#fff2cf'] },
    heraldic: { spark: ['#ffe2a6', '#e8b44f', '#fff4dc'], merge: ['#eec87a', '#fff1d2'] },
    ink:      { spark: ['#2b2c31', '#5d5e64', '#111216'], merge: ['#3a3b41', '#8d8e94'] },
    neon:     { spark: ['#b9fbff', '#37f0ff', '#ff4fd8'], merge: ['#37f0ff', '#ff4fd8'] },
    toy:      { spark: ['#fff3c4', '#ff9f1c', '#ff6b8a'], merge: ['#ffd36e', '#7ee0ff'] }
  };

  function tone() { return FX_TONE[currentTheme()] || FX_TONE.classic; }

  function fxAdd(node, life) {
    el.fx.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, life);
    return node;
  }

  function setPos(id, row, col) {
    var node = pieceEls[id];
    if (node) node.style.transform = tf(row, col);
  }

  /* floating numbers ---------------------------------------------------- */

  function floatText(row, col, text, cls) {
    if (!animOn()) return;
    var c = centerPx(row, col);
    var n = make('div', 'float ' + (cls || ''), esc(text));
    n.style.left = c.x + 'px';
    n.style.top = (c.y - c.s * 0.16) + 'px';
    fxAdd(n, 760);
  }

  function floatLoss(row, col, loss) {
    if (!(loss > 0)) return;
    floatText(row, col, '−' + fmt(loss), 'float--loss');
  }

  /* sparks, bursts, flashes and shakes ----------------------------------- */

  function sparks(x, y, n, colors, spread, life) {
    if (!animOn()) return;
    for (var i = 0; i < n; i++) {
      var ang = (Math.PI * 2 * i) / n + Math.random() * 0.7;
      var dist = spread * (0.5 + Math.random() * 0.65);
      var s = make('div', 'spark');
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.color = colors[i % colors.length];       /* the glow follows it */
      s.style.background = colors[i % colors.length];
      s.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
      s.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
      fxAdd(s, life || 520);
    }
  }

  function clash(x, y) {
    if (!animOn()) return;
    var n = make('div', 'clash');
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    fxAdd(n, 380);
    sparks(x, y, 8, tone().spark, el.board.clientWidth / 8 * 0.55, 500);
  }

  function burst(x, y) {
    if (!animOn()) return;
    var n = make('div', 'burst');
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    fxAdd(n, 360);
  }

  /* the square that was hit flashes under the piece standing on it */
  function flash(x, y) {
    if (!animOn()) return;
    var n = make('div', 'flash');
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    fxAdd(n, 280);
  }

  function shake(id) {
    if (!animOn()) return;
    var node = pieceEls[id];
    if (!node) return;
    node.classList.remove('pc--shake');
    void node.offsetWidth;
    node.classList.add('pc--shake');
    setTimeout(function () { node.classList.remove('pc--shake'); }, 300);
  }

  /* move: one square at a time, faster the longer the path --------------- */

  async function animMove(ev) {
    var node = pieceEls[ev.id];
    if (!animOn() || !node) { setPos(ev.id, ev.to.row, ev.to.col); return; }
    var path = (ev.path && ev.path.length) ? ev.path : [ev.to];
    var per = Math.max(72, Math.round(300 / path.length));
    node.classList.add('pc--moving');
    for (var i = 0; i < path.length; i++) {
      node.style.transitionDuration = per + 'ms';
      node.style.transform = tf(path[i].row, path[i].col);
      await wait(per);
    }
    node.style.transitionDuration = '';
    node.classList.remove('pc--moving');
  }

  /* attack: the walk, the lunge, the clash, the losses -------------------- */

  async function animAttack(ev, after) {
    var node = pieceEls[ev.attacker];
    var path = (ev.path && ev.path.length) ? ev.path : [ev.to];
    if (animOn() && node) {
      node.classList.add('pc--moving');
      var per = Math.max(72, Math.round(300 / path.length));
      for (var i = 0; i < path.length - 1; i++) {   /* the last square is the enemy */
        node.style.transitionDuration = per + 'ms';
        node.style.transform = tf(path[i].row, path[i].col);
        await wait(per);
      }
      node.classList.remove('pc--moving');
      /* the lunge: two thirds of the way into the defender's square */
      var last = path.length > 1 ? path[path.length - 2] : ev.from;
      var r = last.row + (ev.to.row - last.row) * 0.62;
      var c = last.col + (ev.to.col - last.col) * 0.62;
      node.style.transition = 'transform 95ms cubic-bezier(0.5, 0, 0.9, 0.4)';
      node.style.transform = 'translate(' + (c * 100) + '%, ' + ((7 - r) * 100) + '%)';
      await wait(100);
      var mid = centerPx((last.row + ev.to.row) / 2, (last.col + ev.to.col) / 2);
      var hit = centerPx(ev.to.row, ev.to.col);
      clash(mid.x, mid.y);
      flash(hit.x, hit.y);
      shake(ev.defender || ev.target);
    }
    floatLoss(ev.to.row, ev.to.col, ev.defenderLoss);
    floatLoss(ev.from.row, ev.from.col, ev.attackerLoss);
    await wait(165);
    /* the survivor settles back, with a little bounce at the end */
    var alive = after.pieces[ev.attacker];
    if (node) {
      node.style.transition = 'transform 155ms cubic-bezier(0.25, 1.35, 0.5, 1)';
      node.style.transform = alive ? tf(alive.row, alive.col) : tf(ev.from.row, ev.from.col);
    }
    await wait(160);
    if (node) { node.style.transition = ''; node.style.transitionDuration = ''; }
  }

  /* death: six to eight fragments that fly, tumble and fade --------------- */

  async function animDie(ev) {
    var node = pieceEls[ev.id];
    if (animOn()) {
      var c = centerPx(ev.at.row, ev.at.col);
      var n = 6 + Math.floor(Math.random() * 3);
      var color = playerColor(ev.owner);
      for (var i = 0; i < n; i++) {
        var f = make('div', 'frag');
        var ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
        f.style.left = (c.x + Math.cos(ang) * c.s * 0.16) + 'px';
        f.style.top = (c.y + Math.sin(ang) * c.s * 0.16) + 'px';
        f.style.background = color;
        f.style.setProperty('--dx', (Math.cos(ang) * c.s * (0.34 + Math.random() * 0.45)) + 'px');
        f.style.setProperty('--dy', (c.s * (0.5 + Math.random() * 0.55)) + 'px');
        f.style.setProperty('--rot', Math.round(-220 + Math.random() * 440) + 'deg');
        f.style.setProperty('--fs', (c.s * (0.12 + Math.random() * 0.11)) + 'px');
        fxAdd(f, 640);
      }
    }
    if (node) {
      node.style.transitionDuration = '150ms';
      node.style.opacity = '0';
    }
    await wait(200);
  }

  /* fire: an arrow along the row or the column, with a little arc --------- */

  async function animFire(ev, before) {
    var sh = before.pieces[ev.shooter];
    var tg = before.pieces[ev.target];
    if (!sh || !tg) return;
    if (animOn()) {
      var a = centerPx(sh.row, sh.col), b = centerPx(tg.row, tg.col);
      var dx = b.x - a.x, dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      /* the arc lifts the flight off the straight line, across the shot */
      var lift = Math.min(a.s * 0.62, len * 0.2);
      var mx = (a.x + b.x) / 2 + (-dy / len) * lift;
      var my = (a.y + b.y) / 2 + (dx / len) * lift;
      /* it starts short of the shooter and stops short of the target */
      var sx = a.x + (dx / len) * a.s * 0.3, sy = a.y + (dy / len) * a.s * 0.3;
      var ex = b.x - (dx / len) * a.s * 0.16, ey = b.y - (dy / len) * a.s * 0.16;

      var w = Math.max(20, a.s * 0.66), h = Math.max(8, a.s * 0.24);
      var n = make('div', 'arrow', arrowSVG());
      n.style.width = w + 'px';
      n.style.height = h + 'px';
      n.style.marginLeft = (-w / 2) + 'px';
      n.style.marginTop = (-h / 2) + 'px';
      n.style.setProperty('--x0', sx + 'px');
      n.style.setProperty('--y0', sy + 'px');
      n.style.setProperty('--xm', mx + 'px');
      n.style.setProperty('--ym', my + 'px');
      n.style.setProperty('--x1', ex + 'px');
      n.style.setProperty('--y1', ey + 'px');
      n.style.setProperty('--ang', ang + 'deg');
      fxAdd(n, 380);
      await wait(275);
      burst(b.x, b.y);
      flash(b.x, b.y);
      sparks(b.x, b.y, 5, tone().spark, a.s * 0.4, 440);
      shake(ev.target);
    }
    floatLoss(tg.row, tg.col, ev.damage);
    await wait(185);
  }

  function arrowSVG() {
    return '<svg viewBox="0 0 64 22" xmlns="http://www.w3.org/2000/svg" ' +
      'focusable="false" aria-hidden="true">' +
      '<path d="M4 11 H50" stroke="#c98b3a" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M64 11 L48 5.5 L51 11 L48 16.5 Z" fill="#dfe4ea"/>' +
      '<path d="M4 11 L14 4 L12 11 L14 18 Z" fill="#e9dcc3"/>' +
      '<path d="M10 11 L19 5.5 L17.5 11 L19 16.5 Z" fill="#c4553f"/>' +
      '</svg>';
  }

  /* heal: a pulse, three sparkles and the number ------------------------- */

  async function animHeal(ev, after) {
    var p = after.pieces[ev.id];
    if (!p) return;
    if (animOn()) {
      var c = centerPx(p.row, p.col);
      var n = make('div', 'ring');
      n.style.left = (c.x - c.s * 0.45) + 'px';
      n.style.top = (c.y - c.s * 0.45) + 'px';
      n.style.width = (c.s * 0.9) + 'px';
      n.style.height = (c.s * 0.9) + 'px';
      fxAdd(n, 540);
      for (var i = 0; i < 3; i++) {
        var s = make('div', 'sparkle');
        s.style.left = (c.x + (i - 1) * c.s * 0.26) + 'px';
        s.style.top = (c.y + c.s * 0.12) + 'px';
        s.style.animationDelay = (i * 75) + 'ms';
        fxAdd(s, 760);
      }
      floatText(p.row, p.col, '+' + fmt(ev.amount), 'float--heal');
    }
    await wait(320);
  }

  /* merge: a burst and the new glyph scaling in -------------------------- */

  async function animMerge(ev, after) {
    var p = after.pieces[ev.id];
    if (!p) return;
    var node = pieceEls[ev.id];
    if (animOn()) {
      var c = centerPx(p.row, p.col);
      var cols = [playerColor(p.owner)].concat(tone().merge);
      sparks(c.x, c.y, 15, cols, c.s * 0.85, 560);
      flash(c.x, c.y);
      if (node) {
        var s = Engine.pieceStats(p);
        node.innerHTML = Icons.piece(p.kinds, {
          owner: p.owner, theme: currentTheme(),
          hp: p.hp, maxHp: s.maxHp, str: s.str
        });
        node.classList.add('pc--pop');
        setTimeout(function () { node.classList.remove('pc--pop'); }, 430);
      }
    }
    await wait(340);
  }

  /* turn change: a ribbon in the new player's color ---------------------- */

  async function animRibbon(player) {
    if (!animOn()) return;
    var color = playerColor(player);
    el.ribbon.firstChild.textContent = playerName(player);
    el.ribbon.style.background = color;
    el.ribbon.style.color = outlineFor(color);
    el.ribbon.classList.remove('is-on');
    void el.ribbon.offsetWidth;
    el.ribbon.classList.add('is-on');
    await wait(460);
  }

  async function playEvents(events, before, after) {
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      switch (ev.type) {
        case 'move': await animMove(ev); break;
        case 'attack': await animAttack(ev, after); break;
        case 'fire': await animFire(ev, before); break;
        case 'die': await animDie(ev); break;
        case 'heal': await animHeal(ev, after); break;
        case 'merge': await animMerge(ev, after); break;
        case 'turnStart': await animRibbon(ev.player); break;
        default: break;
      }
    }
  }

  /* ---------------------------------------------------- merge dialog ---- */

  /* the stats of the hybrid the choice would make, by the version 2 rule */
  function mergedStats(piece, kind) {
    var own = Engine.KINDS[piece.kinds[0]], add = Engine.KINDS[kind];
    var maxHp = own.hp + add.hp;
    var hp = piece.hp + add.hp;
    var baseStr = own.str + add.str;
    return {
      hp: hp,
      maxHp: maxHp,
      str: Math.min(hp, baseStr),
      move: Math.max(own.move, add.move),
      fire: own.fire + add.fire,
      range: Math.max(own.range, add.range)
    };
  }

  function statLine(s) {
    var out = t('stat.hp') + ' <bdi>' + fmt(s.hp) + '/' + fmt(s.maxHp) + '</bdi>' +
      '<br>' + t('stat.str') + ' <bdi>' + fmt(s.str) + '</bdi>' +
      '<br>' + t('stat.move') + ' <bdi>' + s.move + '</bdi>';
    if (s.fire > 0) {
      out += '<br>' + t('stat.fire') + ' <bdi>' + s.fire + '</bdi> · ' +
        t('stat.range') + ' <bdi>' + s.range + '</bdi>';
    }
    return out;
  }

  function renderMergeDialog() {
    var st = G.state;
    var p = st && st.pendingMerge ? st.pieces[st.pendingMerge] : null;
    if (!p) return;
    var s = Engine.pieceStats(p);
    el.mergePiece.innerHTML = Icons.piece(p.kinds, {
      owner: p.owner, theme: currentTheme(),
      hp: p.hp, maxHp: s.maxHp, str: s.str
    });
    var html = '';
    for (var i = 0; i < KIND_ORDER.length; i++) {
      var k = KIND_ORDER[i];
      html += '<button type="button" class="merge-choice" data-kind="' + k + '">' +
        '<span class="chip-ico">' + Icons.glyph(k, { theme: currentTheme() }) + '</span>' +
        '<span class="merge-name">' + esc(t('kind.' + k)) + '</span>' +
        '<span class="merge-stats">' + statLine(mergedStats(p, k)) + '</span>' +
        '</button>';
    }
    el.mergeChoices.innerHTML = html;
  }

  function openMerge() {
    renderMergeDialog();
    openOv('merge');
  }

  /* ------------------------------------------------------- game over ---- */

  function renderOver() {
    var w = G.state ? G.state.winner : null;
    if (w === 'draw' || w === null) {
      el.overSwatch.style.display = 'none';
      el.overTitle.textContent = t('over.draw');
    } else {
      el.overSwatch.style.display = '';
      el.overSwatch.style.background = playerColor(w);
      el.overTitle.textContent = t('over.win', { name: playerName(w) });
    }
  }

  function openOver() {
    renderOver();
    openOv('over');
  }

  /* ----------------------------------------------------- persistence ---- */

  /* the game is the serialized state; the mode it is played in sits beside
     it, so a reload against the computer resumes against the computer */
  function autosave() {
    try {
      if (!G.state || G.state.winner !== null) {
        localStorage.removeItem(GAME_KEY);
        localStorage.removeItem(MODE_KEY);
      } else {
        localStorage.setItem(GAME_KEY, Engine.serialize(G.state));
        localStorage.setItem(MODE_KEY,
          JSON.stringify({ opponent: G.mode, level: G.level }));
      }
    } catch (e) { /* no storage */ }
  }

  function savedCode() {
    try { return localStorage.getItem(GAME_KEY); } catch (e) { return null; }
  }

  /* the saved mode, or null: anything but a computer game is two players */
  function savedMode() {
    try {
      var raw = localStorage.getItem(MODE_KEY);
      if (!raw) return null;
      var m = JSON.parse(raw);
      if (!m || m.opponent !== 'computer') return null;
      return { opponent: 'computer', level: levelOf(m.level) };
    } catch (e) { return null; }
  }

  function resetBoardNodes() {
    G.aiRun += 1;          /* a plan still running belongs to the old game */
    G.history = [];
    G.sel = null;
    G.acts = [];
    G.busy = false;
    pieceEls = {};
    clearNode(el.pieces);
    clearNode(el.fx);
    clearNode(el.marks);
  }

  function startGame(state) {
    G.state = state;
    resetBoardNodes();
    closeOv('merge');
    closeOv('over');
    closeOv('newgame');
    msg('');
    render();
    remeasure();
    autosave();
    if (G.state.winner !== null) openOver();
    else if (G.state.pendingMerge) openMerge();
  }

  function newGame() {
    setMode(G.settings.opponent, G.settings.level);
    var st = Engine.newGame({ diagonalMoves: !!G.settings.diagonalMoves });
    startGame(st);
    msg(t('msg.start', { name: playerName(st.turn.player) }));
    G.busy = true;
    renderPanel(); /* the buttons show as blocked while the ribbon plays */
    animRibbon(st.turn.player).then(function () {
      G.busy = false;
      renderMarks();
      renderPanel();
      /* the draw may have given the computer the first turn */
      maybeComputerTurn();
    });
  }

  /* a WG1. code no longer deserializes, so an old save is no save */
  function resumeSaved() {
    var c = savedCode(), st;
    if (!c) return false;
    try { st = Engine.deserialize(c); }
    catch (e) { return false; }
    var m = savedMode();
    setMode(m ? 'computer' : 'human', m ? m.level : null);
    startGame(st);
    maybeComputerTurn();
    return true;
  }

  /* a code may arrive as a bare string or inside a #g=... link */
  function cleanCode(text) {
    var s = String(text || '').trim();
    var i = s.indexOf('#g=');
    if (i >= 0) s = s.slice(i + 3);
    return s.replace(/\s+/g, '');
  }

  function loadFromHash() {
    var h = String(location.hash || '');
    if (h.indexOf('#g=') !== 0) return false;
    try {
      var st = Engine.deserialize(cleanCode(h));
      setMode('human');        /* a shared position is a game for two */
      startGame(st);
      return true;
    } catch (e) { return false; }
  }

  /* ------------------------------------------------------- the share --- */

  function shareMsg(text) { el.shareMsg.textContent = text || ''; }

  function canShare() { return typeof navigator.share === 'function'; }

  /* the invite message, and the same message carrying this position */
  function inviteText(mode) {
    var head = t('app.title') + '\n';
    if (mode === 'game' && G.state) {
      return head + t('invite.gameWhat') + '\n' +
        GAME_URL + '#g=' + Engine.serialize(G.state) + '\n' +
        t('invite.howTo');
    }
    return head + t('invite.what') + '\n' + GAME_URL + '\n' + t('invite.howTo');
  }

  /* the link is one run of Latin: a bdi keeps its last slash from jumping
     to the head of the line in Hebrew */
  function fillText(node, text) {
    node.innerHTML = text.split('\n').map(function (line) {
      return line.indexOf('http') === 0
        ? '<bdi dir="ltr">' + esc(line) + '</bdi>'
        : esc(line);
    }).join('\n');
  }

  function renderShare() {
    var on = gameOn();
    var label = canShare() ? t('game.share') : t('share.copy');
    fillText(el.inviteText, inviteText('app'));
    el.btnInvite.textContent = label;
    /* a finished game is no longer worth sending on */
    el.shareGame.hidden = !on;
    if (on) fillText(el.shareGameText, inviteText('game'));
    el.btnShareGame.textContent = label;
    el.exportCode.value = G.state ? Engine.serialize(G.state) : '';
  }

  function openRules() {
    fillWordmark(el.wmRules, wordmarkRoles(), true);
    openOv('rules');
  }

  function openShare() {
    renderShare();
    shareMsg('');
    openOv('share');
    el.shareBody.scrollTop = 0;   /* a hidden box keeps no scroll, so after */
  }

  function copyText(text, onOk, onFail) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onOk, onFail);
      return;
    }
    onFail();
  }

  function legacyCopy(node) {
    try {
      node.focus();
      node.select();
      return document.execCommand('copy');
    } catch (e) { return false; }
  }

  function selectNode(node) {
    try {
      var sel = window.getSelection();
      var range = document.createRange();
      range.selectNodeContents(node);
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (e) { /* selection is a courtesy, not a need */ }
  }

  /* the device's own share sheet when it has one, else the clipboard; with
     neither, the text is selected so it can still be copied by hand */
  function sendText(text, node) {
    if (canShare()) {
      try {
        var p = navigator.share({ title: t('app.title'), text: text });
        if (p && p.catch) p.catch(function () { /* the sheet was dismissed */ });
        return;
      } catch (e) { /* on to the clipboard */ }
    }
    copyText(text,
      function () { shareMsg(t('share.copiedText')); },
      function () {
        selectNode(node);
        shareMsg(t('share.copyFail'));
      });
  }

  function copyCode() {
    var code = el.exportCode.value;
    if (!code) return;
    copyText(code,
      function () { shareMsg(t('share.copiedCode')); },
      function () {
        if (legacyCopy(el.exportCode)) shareMsg(t('share.copiedCode'));
        else shareMsg(t('share.copyFail'));
      });
  }

  /* a bad code says so and changes nothing */
  function loadCode() {
    var code = cleanCode(el.importCode.value), st;
    if (!code) { shareMsg(t('share.badCode')); return; }
    try { st = Engine.deserialize(code); }
    catch (e) { shareMsg(t('share.badCode')); return; }
    el.importCode.value = '';
    shareMsg(t('share.loaded'));
    closeOv('share');
    setMode('human');          /* a pasted position is a game for two */
    startGame(st);
  }

  /* ----------------------------------------------------- rules screen --- */

  function pieceTableHTML() {
    var head = '<tr><th>' + t('stat.piece') + '</th>' +
      '<th class="num">' + t('stat.str') + '</th>' +
      '<th class="num">' + t('stat.hp') + '</th>' +
      '<th class="num">' + t('stat.move') + '</th>' +
      '<th class="num">' + t('stat.fire') + '</th>' +
      '<th class="num">' + t('stat.range') + '</th></tr>';
    var body = '';
    var order = ['S', 'K', 'A'];
    for (var i = 0; i < order.length; i++) {
      var k = order[i], b = Engine.KINDS[k];
      var none = t('stat.none');
      body += '<tr><td><span class="cell-piece">' +
        '<span class="chip-ico">' + Icons.glyph(k, { theme: currentTheme() }) + '</span>' +
        esc(t('kind.' + k)) + '</span></td>' +
        '<td class="num">' + fmt(b.str) + '</td>' +
        '<td class="num">' + fmt(b.hp) + '</td>' +
        '<td class="num">' + b.move + '</td>' +
        '<td class="num">' + (b.fire ? b.fire : none) + '</td>' +
        '<td class="num">' + (b.fire ? b.range : none) + '</td></tr>';
    }
    return '<table class="rules-table"><thead>' + head + '</thead><tbody>' + body +
      '</tbody></table>';
  }

  function combosHTML() {
    var out = '<div class="combo-list">';
    var combos = Engine.COMBOS;
    for (var i = 0; i < combos.length; i++) {
      out += '<div class="combo-item">';
      for (var j = 0; j < combos[i].length; j++) {
        if (j) out += '<span class="combo-plus">+</span>';
        out += chip(combos[i][j]);
      }
      out += '</div>';
    }
    return out + '</div>';
  }

  function renderRules() {
    var blocks = I18N.rules(), out = '';
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b[0] === 'h') out += '<h3>' + esc(b[1]) + '</h3>';
      else if (b[0] === 'p') out += '<p>' + esc(b[1]) + '</p>';
      else if (b[0] === 'ul') {
        out += '<ul>';
        for (var j = 0; j < b[1].length; j++) out += '<li>' + esc(b[1][j]) + '</li>';
        out += '</ul>';
      } else if (b[0] === 'pieceTable') out += pieceTableHTML();
      else if (b[0] === 'combos') out += combosHTML();
    }
    el.rulesBody.innerHTML = out;
  }

  /* ------------------------------------------ appearance and settings --- */

  function renderPresets() {
    var out = '';
    for (var i = 0; i < PRESETS.length; i++) {
      var p = PRESETS[i];
      out += '<button type="button" class="preset" data-preset="' + p.id + '">' +
        '<span class="preset-swatches">' +
        '<i style="background:' + p.sqLight + '"></i>' +
        '<i style="background:' + p.sqDark + '"></i>' +
        '<i style="background:' + p.p0 + '"></i>' +
        '<i style="background:' + p.p1 + '"></i>' +
        '</span><span>' + esc(t('preset.' + p.id)) + '</span></button>';
    }
    el.presets.innerHTML = out;
  }

  function renderThemes() {
    var list = themeList(), out = '', cur = currentTheme();
    for (var i = 0; i < list.length; i++) {
      var id = list[i];
      var d = themeDef(id);
      var pal = (d && d.palette) || { p0: '#efe6cf', p1: '#2f3550', light: '#efe0c3', dark: '#a97e57' };
      out += '<button type="button" class="theme-btn' + (id === cur ? ' is-on' : '') +
        '" data-theme="' + id + '">' +
        '<span class="theme-view" style="background:' + pal.light + '">' +
        '<span class="theme-piece" style="color:' + pal.p0 +
        ';--piece-outline:' + outlineFor(pal.p0) + '">' +
        Icons.glyph('K', { theme: id }) + '</span>' +
        '<span class="theme-piece theme-piece--b" style="background:' + pal.dark +
        ';color:' + pal.p1 + ';--piece-outline:' + outlineFor(pal.p1) + '">' +
        Icons.glyph('A', { theme: id, flip: true }) + '</span>' +
        '</span>' +
        '<span class="theme-name">' + esc(themeName(id)) + '</span>' +
        '</button>';
    }
    el.themes.innerHTML = out;
  }

  function fillAppearanceForm() {
    el.setP0.value = G.settings.p0;
    el.setP1.value = G.settings.p1;
    el.setLight.value = G.settings.sqLight;
    el.setDark.value = G.settings.sqDark;
    el.setRandom.checked = !!G.settings.randomBoard;
    el.setCoords.checked = !!G.settings.coordinates;
    renderThemes();
  }

  function fillSettingsForm() {
    el.setAnim.checked = !!G.settings.animations;
    el.setDiagMoves.checked = !!G.settings.diagonalMoves;
  }

  /* every appearance change lands on the board that is already on screen,
     the panel with it: the swatch and the chips carry the colors too */
  function settingChanged() {
    saveSettings();
    applySettings();
    renderPieces();
    renderPanel();
    renderThemes();
  }

  function applyPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === id) {
        G.settings.p0 = PRESETS[i].p0;
        G.settings.p1 = PRESETS[i].p1;
        G.settings.sqLight = PRESETS[i].sqLight;
        G.settings.sqDark = PRESETS[i].sqDark;
        G.settings.randomBoard = false;   /* a chosen palette wins over the random one */
        fillAppearanceForm();
        settingChanged();
        return;
      }
    }
  }

  function applyTheme(id) {
    var d = themeDef(id);
    G.settings.theme = id;
    if (d && d.palette) {
      G.settings.p0 = d.palette.p0;
      G.settings.p1 = d.palette.p1;
      G.settings.sqLight = d.palette.light;
      G.settings.sqDark = d.palette.dark;
    }
    G.settings.randomBoard = false;
    fillAppearanceForm();
    settingChanged();
    renderWordmark(true);      /* the title wears the theme too */
  }

  function openAppearance() {
    fillAppearanceForm();
    openOv('appearance');
    el.appearanceBody.scrollTop = 0;
  }

  function openSettings() {
    fillSettingsForm();
    openOv('settings');
    el.settingsBody.scrollTop = 0;
  }

  /* ------------------------------------------------------ service worker */

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    var host = location.hostname;
    var ok = location.protocol === 'https:' || host === 'localhost' || host === '127.0.0.1';
    if (!ok) return;      /* never from file:// */
    try {
      var p = navigator.serviceWorker.register('./sw.js');
      if (p && p.catch) p.catch(function () { /* offline is a bonus, not a need */ });
    } catch (e) { /* ignored on purpose */ }
  }

  /* ------------------------------------------------------------ wiring -- */

  function langButtons(node) {
    node.innerHTML =
      '<button type="button" class="lang-btn" data-lang="he" lang="he">עברית</button>' +
      '<button type="button" class="lang-btn" data-lang="en" lang="en">English</button>';
    node.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.lang-btn') : null;
      if (b) setLang(b.dataset.lang);
    });
  }

  function cacheNodes() {
    el.board = $('board');
    el.squares = $('squares');
    el.pieces = $('pieces');
    el.marks = $('marks');
    el.fx = $('fx');
    el.ribbon = $('ribbon');
    el.panel = $('panel');

    el.turnSwatch = $('turn-swatch');
    el.turnName = $('turn-name');
    el.turnNumber = $('turn-number');
    el.comboUsed = $('combo-used');
    el.comboAvail = $('combo-avail');
    el.panelMsg = $('panel-msg');

    el.btnHeal = $('btn-heal');
    el.btnEndTurn = $('btn-endturn');
    el.btnUndo = $('btn-undo');

    el.wmPanel = $('wm-panel');
    el.wmRules = $('wm-rules');
    el.rulesBody = $('rules-body');
    el.appearanceBody = $('appearance-body');
    el.settingsBody = $('settings-body');
    el.buildStamp = $('build-stamp');
    el.presets = $('presets');
    el.themes = $('themes');

    el.setP0 = $('set-p0');
    el.setP1 = $('set-p1');
    el.setLight = $('set-light');
    el.setDark = $('set-dark');
    el.setRandom = $('set-random');
    el.setAnim = $('set-anim');
    el.setCoords = $('set-coords');
    el.setDiagMoves = $('set-diagmoves');

    el.shareBody = $('share-body');
    el.shareMsg = $('share-msg');
    el.inviteText = $('invite-text');
    el.btnInvite = $('btn-invite');
    el.shareGame = $('share-game');
    el.shareGameText = $('share-game-text');
    el.btnShareGame = $('btn-share-game');
    el.exportCode = $('export-code');
    el.importCode = $('import-code');

    el.segOpponent = $('seg-opponent');
    el.segLevel = $('seg-level');
    el.ngWarn = $('ng-warn');

    el.mergePiece = $('merge-piece');
    el.mergeChoices = $('merge-choices');
    el.overSwatch = $('over-swatch');
    el.overTitle = $('over-title');
  }

  function wire() {
    /* --- the panel --- */
    el.btnEndTurn.addEventListener('click', endTurn);
    el.btnUndo.addEventListener('click', undo);
    el.btnHeal.addEventListener('click', function () {
      if (G.sel) doAction({ type: 'heal', piece: G.sel });
    });

    /* --- the icon bar --- */
    $('btn-newgame').addEventListener('click', openNewGame);
    $('btn-appearance').addEventListener('click', openAppearance);
    $('btn-settings').addEventListener('click', openSettings);
    $('btn-rules').addEventListener('click', openRules);
    $('btn-share').addEventListener('click', openShare);

    /* --- the new game sheet --- */
    $('btn-new-yes').addEventListener('click', startChosen);
    $('btn-new-no').addEventListener('click', function () { closeOv('newgame'); });
    el.segOpponent.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.seg-btn') : null;
      if (!b) return;
      NG.opponent = b.dataset.v;
      renderNewGame();
    });
    el.segLevel.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.seg-btn') : null;
      if (!b) return;
      NG.level = b.dataset.v;
      renderNewGame();
    });

    /* --- closing --- */
    var closers = document.querySelectorAll('[data-close]');
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener('click', function (e) {
        closeOv(e.currentTarget.getAttribute('data-close'));
      });
    }
    /* a tap outside closes a drawer, a sheet and the question, never the
       merge dialog and never the game over card */
    LIGHT.forEach(function (name) {
      ov(name).addEventListener('click', function (e) {
        if (e.target === ov(name)) closeOv(name);
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      for (var k = 0; k < LIGHT.length; k++) {
        if (isOpen(LIGHT[k])) { closeOv(LIGHT[k]); return; }
      }
    });

    /* --- the board --- */
    el.board.addEventListener('pointerdown', onBoardPointer);
    el.board.addEventListener('dblclick', function (e) { e.preventDefault(); });
    el.board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* --- the merge dialog --- */
    el.mergeChoices.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.merge-choice') : null;
      if (!b || !G.state || !G.state.pendingMerge) return;
      var id = G.state.pendingMerge;
      closeOv('merge');
      doAction({ type: 'merge', piece: id, kind: b.dataset.kind });
    });
    $('btn-merge-skip').addEventListener('click', function () {
      if (!G.state || !G.state.pendingMerge) return;
      var id = G.state.pendingMerge;
      closeOv('merge');
      doAction({ type: 'skipMerge', piece: id });
    });

    /* --- game over --- */
    $('btn-again').addEventListener('click', function () { closeOv('over'); newGame(); });

    /* --- the appearance drawer --- */
    el.themes.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.theme-btn') : null;
      if (b) applyTheme(b.dataset.theme);
    });
    el.presets.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.preset') : null;
      if (b) applyPreset(b.dataset.preset);
    });

    function colorInput(node, key) {
      var isSquare = (key === 'sqLight' || key === 'sqDark');
      var h = function () {
        G.settings[key] = node.value;
        /* a square color chosen by hand turns the random board off,
           otherwise the choice would show nothing */
        if (isSquare && G.settings.randomBoard) {
          G.settings.randomBoard = false;
          el.setRandom.checked = false;
        }
        settingChanged();
      };
      node.addEventListener('input', h);
      node.addEventListener('change', h);
    }
    colorInput(el.setP0, 'p0');
    colorInput(el.setP1, 'p1');
    colorInput(el.setLight, 'sqLight');
    colorInput(el.setDark, 'sqDark');

    el.setRandom.addEventListener('change', function () {
      G.settings.randomBoard = el.setRandom.checked;
      if (G.settings.randomBoard && !G.settings.boardColors) {
        G.settings.boardColors = makeBoardColors();
      }
      settingChanged();
    });
    $('btn-reshuffle').addEventListener('click', function () {
      G.settings.boardColors = makeBoardColors();
      G.settings.randomBoard = true;
      el.setRandom.checked = true;
      settingChanged();
    });
    el.setCoords.addEventListener('change', function () {
      G.settings.coordinates = el.setCoords.checked;
      settingChanged();
    });

    /* --- the settings drawer --- */
    el.setAnim.addEventListener('change', function () {
      G.settings.animations = el.setAnim.checked;
      settingChanged();
    });
    el.setDiagMoves.addEventListener('change', function () {
      G.settings.diagonalMoves = el.setDiagMoves.checked;
      saveSettings();      /* the rule itself waits for the next new game */
    });

    /* --- the share sheet --- */
    el.btnInvite.addEventListener('click', function () {
      sendText(inviteText('app'), el.inviteText);
    });
    el.btnShareGame.addEventListener('click', function () {
      if (!gameOn()) return;
      sendText(inviteText('game'), el.shareGameText);
    });
    $('btn-copy-code').addEventListener('click', copyCode);
    $('btn-load-code').addEventListener('click', loadCode);

    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', function () {
      remeasure();
      setTimeout(measure, 300);
    });
  }

  /* -------------------------------------------------------------- init -- */

  function init() {
    Engine = window.WarGame.Engine;
    Icons = window.WarGame.Icons;
    I18N = window.WarGame.I18N;
    cacheNodes();
    if (window.matchMedia) reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    G.settings = loadSettings();
    if (G.settings.randomBoard && !G.settings.boardColors) {
      G.settings.boardColors = makeBoardColors();
    }
    I18N.set(G.settings.lang);

    buildSquares();
    langButtons($('lang-switch'));
    wire();

    applySettings();
    refreshTexts();

    /* a link with a position in it opens that position, then a saved game;
       with neither, a game starts at once */
    if (!loadFromHash() && !resumeSaved()) newGame();
    remeasure();
    registerSW();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.WarGame.UI = {
    init: init,
    newGame: newGame,
    setLang: setLang,
    importCode: function (code) {
      var st = Engine.deserialize(cleanCode(code));
      setMode('human');
      startGame(st);
      return true;
    },
    state: function () { return G.state; },
    settings: function () { return G.settings; }
  };
})();
