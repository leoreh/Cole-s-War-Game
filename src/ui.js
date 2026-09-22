/* =====================================================================
   ui.js - screens, board, input, animation, settings, persistence.
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
  var KIND_ORDER = ['K', 'A', 'S'];

  var DEFAULT_SETTINGS = {
    lang: null,
    p0: '#efe6cf',
    p1: '#2f3550',
    sqLight: '#efe0c3',
    sqDark: '#a97e57',
    randomBoard: false,
    boardColors: null,
    animations: true,
    coordinates: false,
    diagonalFire: true,
    knightsJump: false
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

  var G = {
    settings: null,
    state: null,
    history: [],      /* states before each action of the current turn */
    sel: null,        /* id of the selected piece */
    acts: [],         /* its legal actions */
    busy: false       /* animating: input is blocked */
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

    var btns = document.querySelectorAll('.lang-btn');
    for (var j = 0; j < btns.length; j++) {
      btns[j].classList.toggle('is-on', btns[j].dataset.lang === I18N.current);
    }

    renderPresets();
    renderRules();
    renderMenu();
    /* the two live lines hold a sentence written in the old language */
    msg('');
    transferMsg('');
    if (G.state) { renderPanel(); renderPieces(); renderMarks(); }
    if (!el.overMerge.hidden) renderMergeDialog();
    if (!el.overOver.hidden) renderOver();
  }

  /* --------------------------------------------------------- screens ---- */

  function show(name) {
    var screens = ['menu', 'game', 'rules', 'settings'];
    for (var i = 0; i < screens.length; i++) {
      $('screen-' + screens[i]).classList.toggle('is-active', screens[i] === name);
    }
    if (name === 'menu') renderMenu();
    if (name === 'settings') fillSettingsForm();
    measure();
    requestAnimationFrame(measure);
  }

  function renderMenu() {
    el.btnContinue.hidden = !hasSavedGame();
  }

  /* ------------------------------------------------------- the layout --- */

  function measure() {
    var root = document.documentElement;
    root.style.setProperty('--vh', window.innerHeight + 'px');
    root.style.setProperty('--vw', window.innerWidth + 'px');
    var w = el.board.clientWidth;
    if (w > 0) root.style.setProperty('--sq', (w / 8) + 'px');
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

  function renderPieces() {
    var st = G.state, id, p;
    if (!st) return;
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
      node.style.transform = tf(p.row, p.col);
      node.classList.toggle('pc--used', isUsed(st, id));
      node.innerHTML = Icons.piece(p.kinds, {
        owner: p.owner, str: p.str, maxStr: p.maxStr
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

  function chip(kind, dim) {
    return '<span class="chip' + (dim ? ' chip--dim' : '') + '">' +
      '<span class="chip-ico">' + Icons.glyph(kind) + '</span>' +
      '<span>' + t('kind.' + kind) + '</span></span>';
  }

  function renderPanel() {
    var st = G.state;
    if (!st) return;
    var pl = st.turn.player;

    el.turnSwatch.style.background = playerColor(pl);
    el.turnName.textContent = t('player.' + pl);
    el.turnNumber.textContent = t('game.turn', { n: st.turn.number });
    document.documentElement.style.setProperty('--p-cur', playerColor(pl));
    document.documentElement.style.setProperty('--p-cur-outline', outlineFor(playerColor(pl)));

    var used = Engine.usedKinds(st) || [];
    el.comboUsed.innerHTML = used.length
      ? used.map(function (k) { return chip(k); }).join('')
      : '<span class="chip chip--dim">' + t('panel.nothing') + '</span>';

    var avail = [];
    if (st.winner === null && !st.pendingMerge) {
      var set = Engine.activatableKinds(st);
      avail = KIND_ORDER.filter(function (k) { return inKinds(set, k); });
    }
    el.comboAvail.innerHTML = avail.length
      ? avail.map(function (k) { return chip(k); }).join('')
      : '<span class="chip chip--dim">' + t('panel.nothing') + '</span>';

    var canHeal = !!(G.sel && hasAct('heal'));
    el.btnHeal.hidden = !canHeal;
    el.btnUndo.disabled = G.history.length === 0 || G.busy;
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
    G.acts = Engine.legalActions(G.state, id) || [];
    msg('');
    renderMarks();
    renderPanel();
  }

  function deselect() {
    G.sel = null;
    G.acts = [];
    renderMarks();
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

  function bindFire(node, target) {
    node.addEventListener('click', function (e) {
      e.stopPropagation();
      doAction({ type: 'fire', piece: G.sel, target: target });
    });
  }

  function renderMarks() {
    clearMarks();
    var st = G.state;
    if (!st) return;

    /* a faint ring on the pieces that may still be activated */
    if (st.winner === null && !st.pendingMerge && !G.busy) {
      var mine = Engine.piecesOf(st, st.turn.player) || [];
      for (var m = 0; m < mine.length; m++) {
        if (Engine.canActivate(st, mine[m].id) || Engine.canHeal(st, mine[m].id)) {
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
          var fm = markNode(f.row, f.col, 'mark--fire',
            '<span class="bowmark">' + Icons.glyph('A') + '</span>');
          /* the bow takes the tap of its own, so a square that is both an
             attack and a fire target still offers the two */
          bindFire(fm.firstChild, act.target);
        }
      } else if (act.type === 'heal' && me) {
        var b = make('button', 'heal-btn', '<span>' + t('action.heal') + '</span>');
        b.type = 'button';
        b.style.transform = tf(me.row, me.col);
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          doAction({ type: 'heal', piece: G.sel });
        });
        el.marks.appendChild(b);
      }
    }
  }

  /* the action whose target square is this one, if the selection has one */
  function actionAt(row, col) {
    var st = G.state;
    for (var i = 0; i < G.acts.length; i++) {
      var a = G.acts[i];
      if (a.type === 'move' && a.to.row === row && a.to.col === col) {
        return { type: 'move', piece: G.sel, to: { row: row, col: col } };
      }
      if (a.type === 'attack' || a.type === 'fire') {
        var p = st.pieces[a.target];
        if (p && p.row === row && p.col === col) {
          return { type: a.type, piece: G.sel, target: a.target };
        }
      }
    }
    return null;
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
    if (!st || G.busy || st.winner !== null) return;
    if (st.pendingMerge) { msg(t('msg.pending')); return; }

    if (G.sel) {
      var act = actionAt(row, col);
      if (act) { doAction(act); return; }
    }

    var p = Engine.pieceAt(st, row, col);
    if (!p || p.owner !== st.turn.player) { deselect(); msg(''); return; }
    if (p.id === G.sel) { deselect(); return; }

    var acts = Engine.legalActions(st, p.id) || [];
    if (acts.length) { select(p.id); }
    else { deselect(); msg(whyNot(p)); }
  }

  /* --------------------------------------------------------- actions ---- */

  function doAction(action) {
    var st = G.state;
    if (!st || G.busy) return;
    var prev = st, res;
    try {
      res = Engine.apply(st, action);
    } catch (err) {
      msg(t('msg.cannot'));
      return;
    }

    if (action.type === 'endTurn') G.history = [];
    else G.history.push(prev);

    G.state = res.state;
    G.sel = null;
    G.acts = [];
    clearMarks();
    G.busy = true;
    renderPanel();

    playEvents(res.events || [], prev, res.state).then(function () {
      G.busy = false;
      render();
      autosave();
      afterAction(res.events || []);
    });
  }

  function afterAction(events) {
    var st = G.state;
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'pass') {
        msg(t('msg.pass', { name: t('player.' + events[i].player) }));
      }
    }
    if (st.winner !== null) { openOver(); return; }
    if (st.pendingMerge) openMerge();
  }

  function endTurn() {
    if (G.busy || !G.state) return;
    if (G.state.pendingMerge) { msg(t('msg.pending')); return; }
    doAction({ type: 'endTurn' });
  }

  function undo() {
    if (G.busy || !G.history.length) return;
    G.state = G.history.pop();
    G.sel = null;
    G.acts = [];
    msg('');
    render();
    autosave();
    if (G.state.pendingMerge) openMerge(); else closeMerge();
  }

  function render() {
    renderPieces();
    renderMarks();
    renderPanel();
    measure();
  }

  /* ------------------------------------------------------ animations ---- */

  function fxAdd(node, life) {
    el.fx.appendChild(node);
    setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, life);
    return node;
  }

  function floatText(row, col, text, cls) {
    if (!animOn()) return;
    var c = centerPx(row, col);
    var n = make('div', 'float ' + (cls || ''), text);
    n.style.left = c.x + 'px';
    n.style.top = (c.y - c.s * 0.15) + 'px';
    fxAdd(n, 820);
  }

  function floatLoss(row, col, loss) {
    if (!(loss > 0)) return;
    floatText(row, col, '−' + fmt(loss), 'float--loss');
  }

  function flashSquare(row, col) {
    if (!animOn()) return;
    var n = make('div', 'hitflash');
    n.style.transform = tf(row, col);
    fxAdd(n, 340);
  }

  function setPos(id, row, col) {
    var node = pieceEls[id];
    if (node) node.style.transform = tf(row, col);
  }

  async function animMove(ev) {
    setPos(ev.id, ev.to.row, ev.to.col);
    await wait(280);
  }

  async function animAttack(ev, after) {
    var node = pieceEls[ev.attacker];
    if (node) {
      var r = ev.from.row + (ev.to.row - ev.from.row) * 0.55;
      var c = ev.from.col + (ev.to.col - ev.from.col) * 0.55;
      node.style.transform = 'translate(' + (c * 100) + '%, ' + ((7 - r) * 100) + '%)';
    }
    await wait(170);
    floatLoss(ev.to.row, ev.to.col, ev.defenderLoss);
    floatLoss(ev.from.row, ev.from.col, ev.attackerLoss);
    await wait(170);
    var alive = after.pieces[ev.attacker];
    if (node) {
      if (alive) node.style.transform = tf(alive.row, alive.col);
      else node.style.transform = tf(ev.from.row, ev.from.col);
    }
    await wait(160);
  }

  async function animFire(ev, before) {
    var sh = before.pieces[ev.shooter];
    var tg = before.pieces[ev.target];
    if (!sh || !tg) return;
    if (animOn()) {
      var a = centerPx(sh.row, sh.col), b = centerPx(tg.row, tg.col);
      var dx = b.x - a.x, dy = b.y - a.y;
      var n = make('div', 'shot');
      n.style.left = a.x + 'px';
      n.style.top = a.y + 'px';
      n.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
      n.style.setProperty('--ang', Math.atan2(dy, dx) + 'rad');
      fxAdd(n, 420);
    }
    await wait(260);
    flashSquare(tg.row, tg.col);
    floatLoss(tg.row, tg.col, ev.damage);
    await wait(200);
  }

  async function animDie(ev) {
    var node = pieceEls[ev.id];
    if (node) {
      node.style.transform = node.style.transform + ' scale(0.15)';
      node.style.opacity = '0';
    }
    await wait(220);
  }

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
      fxAdd(n, 600);
      floatText(p.row, p.col, '+' + fmt(ev.amount), 'float--heal');
    }
    await wait(320);
  }

  async function animMerge(ev, after) {
    var p = after.pieces[ev.id];
    if (!p) return;
    if (animOn()) {
      var c = centerPx(p.row, p.col);
      for (var i = 0; i < 14; i++) {
        var ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4;
        var dist = c.s * (0.4 + Math.random() * 0.45);
        var n = make('div', 'spark');
        n.style.left = c.x + 'px';
        n.style.top = c.y + 'px';
        n.style.background = i % 2 ? playerColor(p.owner) : '#ffd782';
        n.style.setProperty('--dx', (Math.cos(ang) * dist) + 'px');
        n.style.setProperty('--dy', (Math.sin(ang) * dist) + 'px');
        fxAdd(n, 600);
      }
    }
    await wait(340);
  }

  async function animBanner(player) {
    if (!animOn()) return;
    var color = playerColor(player);
    el.banner.textContent = t('player.' + player);
    el.banner.style.background = color;
    el.banner.style.color = outlineFor(color);
    el.banner.classList.remove('is-on');
    void el.banner.offsetWidth;
    el.banner.classList.add('is-on');
    await wait(520);
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
        case 'turnStart': await animBanner(ev.player); break;
        default: break;
      }
    }
  }

  /* ---------------------------------------------------- merge dialog ---- */

  function baseOf(kind) { return Engine.KINDS[kind]; }

  function mergedStats(piece, kind) {
    var own = baseOf(piece.kinds[0]), add = baseOf(kind);
    return {
      maxStr: own.str + add.str,
      str: piece.str + add.str,
      move: Math.max(own.move, add.move),
      fire: own.fire + add.fire,
      range: own.range + add.range
    };
  }

  function statLine(s) {
    var out = t('stat.str') + ' <bdi>' + fmt(s.str) + '/' + fmt(s.maxStr) + '</bdi>' +
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
    el.mergePiece.innerHTML = Icons.piece(p.kinds, {
      owner: p.owner, str: p.str, maxStr: p.maxStr
    });
    var html = '';
    for (var i = 0; i < KIND_ORDER.length; i++) {
      var k = KIND_ORDER[i];
      html += '<button type="button" class="merge-choice" data-kind="' + k + '">' +
        '<span class="chip-ico">' + Icons.glyph(k) + '</span>' +
        '<span class="merge-name">' + t('kind.' + k) + '</span>' +
        '<span class="merge-stats">' + statLine(mergedStats(p, k)) + '</span>' +
        '</button>';
    }
    el.mergeChoices.innerHTML = html;
  }

  function openMerge() {
    renderMergeDialog();
    el.overMerge.hidden = false;
  }

  function closeMerge() { el.overMerge.hidden = true; }

  /* ------------------------------------------------------- game over ---- */

  function renderOver() {
    var w = G.state ? G.state.winner : null;
    if (w === 'draw' || w === null) {
      el.overSwatch.style.display = 'none';
      el.overTitle.textContent = t('over.draw');
    } else {
      el.overSwatch.style.display = '';
      el.overSwatch.style.background = playerColor(w);
      el.overTitle.textContent = t('over.win', { name: t('player.' + w) });
    }
  }

  function openOver() {
    renderOver();
    el.overOver.hidden = false;
  }

  function closeOver() { el.overOver.hidden = true; }

  /* ----------------------------------------------------- persistence ---- */

  function autosave() {
    try {
      if (!G.state || G.state.winner !== null) localStorage.removeItem(GAME_KEY);
      else localStorage.setItem(GAME_KEY, Engine.serialize(G.state));
    } catch (e) { /* no storage */ }
  }

  function savedCode() {
    try { return localStorage.getItem(GAME_KEY); } catch (e) { return null; }
  }

  function hasSavedGame() {
    var c = savedCode();
    if (!c) return false;
    try { Engine.deserialize(c); return true; } catch (e) { return false; }
  }

  function startGame(state) {
    G.state = state;
    G.history = [];
    G.sel = null;
    G.acts = [];
    G.busy = false;
    pieceEls = {};
    clearNode(el.pieces);
    clearNode(el.fx);
    clearNode(el.marks);
    closeMerge();
    closeOver();
    msg('');
    show('game');
    render();
    autosave();
    if (G.state.winner !== null) openOver();
    else if (G.state.pendingMerge) openMerge();
  }

  function newGame() {
    var st = Engine.newGame({
      diagonalFire: !!G.settings.diagonalFire,
      knightsJump: !!G.settings.knightsJump
    });
    startGame(st);
    msg(t('msg.start', { name: t('player.' + st.turn.player) }));
    G.busy = true;
    animBanner(st.turn.player).then(function () { G.busy = false; renderMarks(); renderPanel(); });
  }

  function continueGame() {
    var c = savedCode();
    if (!c) return;
    try { startGame(Engine.deserialize(c)); }
    catch (e) { renderMenu(); }
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
      startGame(st);
      return true;
    } catch (e) { return false; }
  }

  function transferMsg(text) { el.transferMsg.textContent = text || ''; }

  function doExport() {
    var code = null;
    if (G.state) code = Engine.serialize(G.state);
    else code = savedCode();
    if (!code) { transferMsg(t('settings.noGame')); return; }
    el.exportCode.value = code;
    copyExport();
  }

  function copyExport() {
    var code = el.exportCode.value;
    if (!code) { transferMsg(t('settings.noGame')); return; }
    var done = function () { transferMsg(t('settings.copied')); };
    var failed = function () {
      el.exportCode.focus();
      el.exportCode.select();
      transferMsg(t('settings.copyFail'));
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done, function () {
        if (!legacyCopy()) failed(); else done();
      });
    } else if (legacyCopy()) done();
    else failed();
  }

  function legacyCopy() {
    try {
      el.exportCode.focus();
      el.exportCode.select();
      return document.execCommand('copy');
    } catch (e) { return false; }
  }

  function doImport() {
    var code = cleanCode(el.importCode.value);
    if (!code) { transferMsg(t('settings.importBad')); return; }
    var st;
    try { st = Engine.deserialize(code); }
    catch (e) { transferMsg(t('settings.importBad')); return; }
    transferMsg(t('settings.imported'));
    startGame(st);
  }

  function doPaste() {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then(function (text) {
        el.importCode.value = text;
        transferMsg('');
      }, function () {
        el.importCode.focus();
        transferMsg(t('settings.pasteFail'));
      });
    } else {
      el.importCode.focus();
      transferMsg(t('settings.pasteFail'));
    }
  }

  /* ----------------------------------------------------- rules screen --- */

  function pieceTableHTML() {
    var head = '<tr><th>' + t('stat.piece') + '</th><th class="num">' + t('stat.str') +
      '</th><th class="num">' + t('stat.move') + '</th><th class="num">' + t('stat.fire') +
      '</th><th class="num">' + t('stat.range') + '</th></tr>';
    var body = '';
    var order = ['S', 'K', 'A'];
    for (var i = 0; i < order.length; i++) {
      var k = order[i], b = Engine.KINDS[k];
      var none = t('stat.none');
      body += '<tr><td><span class="cell-piece">' +
        '<span class="chip-ico">' + Icons.glyph(k) + '</span>' + t('kind.' + k) +
        '</span></td>' +
        '<td class="num">' + fmt(b.str) + '</td>' +
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

  function escapeHTML(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function renderRules() {
    var blocks = I18N.rules(), out = '';
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b[0] === 'h') out += '<h3>' + escapeHTML(b[1]) + '</h3>';
      else if (b[0] === 'p') out += '<p>' + escapeHTML(b[1]) + '</p>';
      else if (b[0] === 'ul') {
        out += '<ul>';
        for (var j = 0; j < b[1].length; j++) out += '<li>' + escapeHTML(b[1][j]) + '</li>';
        out += '</ul>';
      } else if (b[0] === 'pieceTable') out += pieceTableHTML();
      else if (b[0] === 'combos') out += combosHTML();
    }
    el.rulesBody.innerHTML = out;
  }

  /* -------------------------------------------------- settings screen --- */

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
        '</span><span>' + t('preset.' + p.id) + '</span></button>';
    }
    el.presets.innerHTML = out;
  }

  function fillSettingsForm() {
    el.setP0.value = G.settings.p0;
    el.setP1.value = G.settings.p1;
    el.setLight.value = G.settings.sqLight;
    el.setDark.value = G.settings.sqDark;
    el.setRandom.checked = !!G.settings.randomBoard;
    el.setAnim.checked = !!G.settings.animations;
    el.setCoords.checked = !!G.settings.coordinates;
    el.setDiagFire.checked = !!G.settings.diagonalFire;
    el.setJump.checked = !!G.settings.knightsJump;
    el.exportCode.value = G.state ? Engine.serialize(G.state) : (savedCode() || '');
    transferMsg('');
  }

  function settingChanged() {
    saveSettings();
    applySettings();
    if (G.state) renderPieces();
  }

  function applyPreset(id) {
    for (var i = 0; i < PRESETS.length; i++) {
      if (PRESETS[i].id === id) {
        G.settings.p0 = PRESETS[i].p0;
        G.settings.p1 = PRESETS[i].p1;
        G.settings.sqLight = PRESETS[i].sqLight;
        G.settings.sqDark = PRESETS[i].sqDark;
        G.settings.randomBoard = false;
        fillSettingsForm();
        settingChanged();
        return;
      }
    }
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
    el.banner = $('banner');

    el.turnSwatch = $('turn-swatch');
    el.turnName = $('turn-name');
    el.turnNumber = $('turn-number');
    el.comboUsed = $('combo-used');
    el.comboAvail = $('combo-avail');
    el.panelMsg = $('panel-msg');

    el.btnHeal = $('btn-heal');
    el.btnEndTurn = $('btn-endturn');
    el.btnUndo = $('btn-undo');
    el.btnContinue = $('btn-continue');

    el.rulesBody = $('rules-body');
    el.presets = $('presets');

    el.setP0 = $('set-p0');
    el.setP1 = $('set-p1');
    el.setLight = $('set-light');
    el.setDark = $('set-dark');
    el.setRandom = $('set-random');
    el.setAnim = $('set-anim');
    el.setCoords = $('set-coords');
    el.setDiagFire = $('set-diagfire');
    el.setJump = $('set-jump');
    el.exportCode = $('export-code');
    el.importCode = $('import-code');
    el.transferMsg = $('transfer-msg');

    el.overMerge = $('overlay-merge');
    el.mergePiece = $('merge-piece');
    el.mergeChoices = $('merge-choices');
    el.overOver = $('overlay-over');
    el.overSwatch = $('over-swatch');
    el.overTitle = $('over-title');
  }

  function wire() {
    $('btn-new').addEventListener('click', newGame);
    $('btn-continue').addEventListener('click', continueGame);
    $('btn-rules').addEventListener('click', function () { show('rules'); });
    $('btn-settings').addEventListener('click', function () { show('settings'); });

    var backs = document.querySelectorAll('[data-go]');
    for (var i = 0; i < backs.length; i++) {
      backs[i].addEventListener('click', function (e) {
        show(e.currentTarget.getAttribute('data-go'));
      });
    }

    el.btnEndTurn.addEventListener('click', endTurn);
    el.btnUndo.addEventListener('click', undo);
    el.btnHeal.addEventListener('click', function () {
      if (G.sel) doAction({ type: 'heal', piece: G.sel });
    });
    $('btn-gamemenu').addEventListener('click', function () { show('menu'); });

    el.board.addEventListener('pointerdown', onBoardPointer);
    el.board.addEventListener('dblclick', function (e) { e.preventDefault(); });
    el.board.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    el.mergeChoices.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.merge-choice') : null;
      if (!b || !G.state || !G.state.pendingMerge) return;
      var id = G.state.pendingMerge;
      closeMerge();
      doAction({ type: 'merge', piece: id, kind: b.dataset.kind });
    });
    $('btn-merge-skip').addEventListener('click', function () {
      if (!G.state || !G.state.pendingMerge) return;
      var id = G.state.pendingMerge;
      closeMerge();
      doAction({ type: 'skipMerge', piece: id });
    });

    $('btn-again').addEventListener('click', function () { closeOver(); newGame(); });
    $('btn-over-menu').addEventListener('click', function () { closeOver(); show('menu'); });

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

    el.setAnim.addEventListener('change', function () {
      G.settings.animations = el.setAnim.checked;
      settingChanged();
    });
    el.setCoords.addEventListener('change', function () {
      G.settings.coordinates = el.setCoords.checked;
      settingChanged();
    });
    el.setDiagFire.addEventListener('change', function () {
      G.settings.diagonalFire = el.setDiagFire.checked;
      saveSettings();
    });
    el.setJump.addEventListener('change', function () {
      G.settings.knightsJump = el.setJump.checked;
      saveSettings();
    });

    $('btn-export').addEventListener('click', doExport);
    $('btn-copy').addEventListener('click', copyExport);
    $('btn-import').addEventListener('click', doImport);
    $('btn-paste').addEventListener('click', doPaste);

    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', function () {
      measure();
      setTimeout(measure, 300);
    });
  }

  /* -------------------------------------------------------------- init -- */

  function init() {
    Engine = window.WarGame.Engine;
    cacheNodes();
    if (window.matchMedia) reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    G.settings = loadSettings();
    if (G.settings.randomBoard && !G.settings.boardColors) {
      G.settings.boardColors = makeBoardColors();
    }
    I18N.set(G.settings.lang);

    buildSquares();
    langButtons($('lang-switch-menu'));
    langButtons($('lang-switch-settings'));
    wire();

    applySettings();
    refreshTexts();

    if (!loadFromHash()) show('menu');
    measure();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.WarGame.UI = {
    init: init,
    newGame: newGame,
    show: show,
    setLang: setLang,
    state: function () { return G.state; },
    settings: function () { return G.settings; }
  };
})();
