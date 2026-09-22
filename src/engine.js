/* War Game rules engine, version 2. Classic script, no modules, no DOM.
   Every function returns new data and never mutates its arguments. */
(function (global) {
  'use strict';

  var KINDS = {
    S: { str: 1, hp: 1, move: 2, fire: 0, range: 0 },
    K: { str: 3, hp: 3, move: 4, fire: 0, range: 0 },
    A: { str: 0, hp: 3, move: 2, fire: 2, range: 2 }
  };

  var COMBOS = [['K', 'S'], ['K', 'A'], ['S', 'S', 'S'], ['A', 'S', 'S'], ['A', 'A', 'S']];

  var DEFAULT_RULES = { diagonalMoves: true };

  var ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  var DIAGONAL = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function illegal() { throw new Error('illegal action'); }

  function onBoard(row, col) { return row >= 0 && row < 8 && col >= 0 && col < 8; }

  function key(row, col) { return row + ',' + col; }

  // Player 0 advances toward row 7, player 1 toward row 0.
  function farRow(owner) { return owner === 0 ? 7 : 0; }

  /* ---------- pieces ---------- */

  function comboKind(piece) {
    if (piece.kinds.indexOf('K') >= 0) return 'K';
    if (piece.kinds.indexOf('A') >= 0) return 'A';
    return 'S';
  }

  function pieceStats(piece) {
    var baseStr = 0, baseHp = 0, move = 0, fire = 0, range = 0;
    piece.kinds.forEach(function (k) {
      baseStr += KINDS[k].str;               // melee strength adds up
      baseHp += KINDS[k].hp;                 // so does health
      move = Math.max(move, KINDS[k].move);  // a hybrid moves as the faster of its kinds
      fire += KINDS[k].fire;                 // fire strength adds up
      range = Math.max(range, KINDS[k].range); // fire range is the longer of the two
    });
    var hp = piece.hp;
    return {
      str: Math.min(hp, baseStr),            // health caps the melee strength
      baseStr: baseStr,
      hp: hp,
      maxHp: piece.maxHp === undefined ? baseHp : piece.maxHp,
      move: move, fire: fire, range: range,
      comboKind: comboKind(piece)
    };
  }

  function makePiece(owner, index, kind, row, col) {
    return {
      id: 'p' + owner + '-' + index,
      owner: owner,
      kinds: [kind],
      hp: KINDS[kind].hp,
      maxHp: KINDS[kind].hp,
      row: row, col: col
    };
  }

  function pieceAt(state, row, col) {
    var ids = Object.keys(state.pieces);
    for (var i = 0; i < ids.length; i++) {
      var p = state.pieces[ids[i]];
      if (p.row === row && p.col === col) return p;
    }
    return null;
  }

  function piecesOf(state, player) {
    return Object.keys(state.pieces)
      .map(function (id) { return state.pieces[id]; })
      .filter(function (p) { return p.owner === player; });
  }

  function occupancy(state) {
    var occ = {};
    Object.keys(state.pieces).forEach(function (id) {
      var p = state.pieces[id];
      occ[key(p.row, p.col)] = p;
    });
    return occ;
  }

  /* ---------- setup ---------- */

  function newGame(rules, firstPlayer) {
    var r = { diagonalMoves: DEFAULT_RULES.diagonalMoves };
    if (rules && 'diagonalMoves' in rules) r.diagonalMoves = !!rules.diagonalMoves;
    var first = (firstPlayer === 0 || firstPlayer === 1) ? firstPlayer : (Math.random() < 0.5 ? 0 : 1);

    var pieces = {};
    [0, 1].forEach(function (owner) {
      var back = owner === 0 ? 0 : 7;
      var step = owner === 0 ? 1 : -1; // toward the middle of the board
      var n = 0, c;
      for (c = 0; c < 8; c++) { var s = makePiece(owner, n++, 'S', back, c); pieces[s.id] = s; }
      for (c = 2; c <= 5; c++) { var k = makePiece(owner, n++, 'K', back + step, c); pieces[k.id] = k; }
      for (c = 2; c <= 5; c++) { var a = makePiece(owner, n++, 'A', back + 2 * step, c); pieces[a.id] = a; }
    });

    return {
      rules: r,
      pieces: pieces,
      turn: { player: first, number: 1, used: [] },
      pendingMerge: null,
      winner: null,
      firstPlayer: first
    };
  }

  /* ---------- combinations ---------- */

  function kindCounts(kinds) {
    var c = { K: 0, A: 0, S: 0 };
    kinds.forEach(function (k) { c[k] += 1; });
    return c;
  }

  // True when the multiset of kinds fits inside at least one allowed combination.
  function fitsSomeCombo(kinds) {
    var c = kindCounts(kinds);
    return COMBOS.some(function (combo) {
      var cc = kindCounts(combo);
      return c.K <= cc.K && c.A <= cc.A && c.S <= cc.S;
    });
  }

  function usedKinds(state) {
    return state.turn.used
      .filter(function (u) { return u.kind !== null && u.kind !== undefined; }) // heals carry no kind
      .map(function (u) { return u.kind; });
  }

  function activatableKinds(state) {
    var used = usedKinds(state);
    var out = new Set();
    ['K', 'A', 'S'].forEach(function (k) {
      if (fitsSomeCombo(used.concat([k]))) out.add(k);
    });
    return out;
  }

  function usedEntry(state, id) {
    var used = state.turn.used;
    for (var i = 0; i < used.length; i++) {
      if (used[i].id === id) return used[i];
    }
    return null;
  }

  function isUsed(state, id) { return usedEntry(state, id) !== null; }

  // The piece is the mover's, the game is running and nothing is waiting on a merge.
  function isPlayable(state, id) {
    var p = state.pieces[id];
    return !!p &&
      state.winner === null &&
      state.pendingMerge === null &&
      p.owner === state.turn.player;
  }

  function isFree(state, id) {
    return isPlayable(state, id) && !isUsed(state, id);
  }

  function canActivate(state, id) {
    if (!isFree(state, id)) return false;
    return activatableKinds(state).has(comboKind(state.pieces[id]));
  }

  function canHeal(state, id) {
    if (!isFree(state, id)) return false;
    var p = state.pieces[id];
    return p.hp < p.maxHp;
  }

  // A piece that moved one step and kept its shot may still fire this turn.
  function canFireAgain(state, id) {
    if (!isPlayable(state, id)) return false;
    var e = usedEntry(state, id);
    return !!e && e.fireLeft === true;
  }

  /* ---------- movement ---------- */

  function stepDirs(state) {
    var dirs = ORTHO.map(function (d) { return { d: d, cost: 1 }; });
    if (state.rules && state.rules.diagonalMoves) {
      dirs = dirs.concat(DIAGONAL.map(function (d) { return { d: d, cost: 2 }; }));
    }
    return dirs;
  }

  /* Dijkstra over step costs. Own pieces (and the start square) are passed over
     freely, an enemy square ends a path and is never passed over, and a path
     never ends on an own piece. Ties in cost are broken by the shorter path, so
     a diagonal neighbour is one step rather than two around a corner. */
  function reachable(state, id) {
    var p = state.pieces[id];
    if (!p) return {};
    var budget = pieceStats(p).move;
    var occ = occupancy(state);
    var dirs = stepDirs(state);
    var start = key(p.row, p.col);
    var nodes = {}, done = {};
    nodes[start] = { row: p.row, col: p.col, cost: 0, steps: 0, path: [] };

    for (;;) {
      var bestKey = null, best = null;
      Object.keys(nodes).forEach(function (k) {
        if (done[k]) return;
        var n = nodes[k];
        if (!best || n.cost < best.cost || (n.cost === best.cost && n.steps < best.steps)) {
          best = n; bestKey = k;
        }
      });
      if (!bestKey) break;
      done[bestKey] = true;

      var here = best;
      var sitting = occ[bestKey];
      if (sitting && sitting.owner !== p.owner) continue; // an enemy is never passed over

      dirs.forEach(function (s) {
        var row = here.row + s.d[0], col = here.col + s.d[1];
        if (!onBoard(row, col)) return;
        var k = key(row, col);
        if (done[k]) return;
        var cost = here.cost + s.cost;
        if (cost > budget) return;
        var steps = here.steps + 1;
        var cur = nodes[k];
        if (cur && (cur.cost < cost || (cur.cost === cost && cur.steps <= steps))) return;
        nodes[k] = { row: row, col: col, cost: cost, steps: steps, path: here.path.concat([{ row: row, col: col }]) };
      });
    }

    var out = {};
    Object.keys(nodes).forEach(function (k) {
      if (k === start) return;
      var sitting = occ[k];
      if (sitting && sitting.owner === p.owner) return; // a path never ends on an own piece
      var n = nodes[k];
      out[k] = { cost: n.cost, steps: n.steps, path: n.path };
    });
    return out;
  }

  /* ---------- fire ---------- */

  // Same row or column only, at most `range` squares away; nothing in between blocks.
  function inFireRange(shooter, target, range) {
    var dr = Math.abs(target.row - shooter.row);
    var dc = Math.abs(target.col - shooter.col);
    if (dr !== 0 && dc !== 0) return false;
    var dist = dr + dc;
    return dist > 0 && dist <= range;
  }

  function fireActions(state, p, st) {
    var out = [];
    if (st.fire <= 0) return out;
    piecesOf(state, 1 - p.owner).forEach(function (t) {
      if (inFireRange(p, t, st.range)) out.push({ type: 'fire', target: t.id });
    });
    return out;
  }

  /* ---------- legal actions ---------- */

  function legalActions(state, id) {
    var p = state.pieces[id];
    if (!p) return [];
    var st = pieceStats(p);
    var out = [];

    if (canActivate(state, id)) {
      var reach = reachable(state, id);
      Object.keys(reach).forEach(function (k) {
        var n = reach[k];
        var to = n.path[n.path.length - 1];
        var occ = pieceAt(state, to.row, to.col);
        if (!occ) {
          out.push({ type: 'move', to: { row: to.row, col: to.col }, cost: n.cost, path: n.path });
        } else if (occ.owner !== p.owner && st.str > 0) {
          // melee needs strength above 0, so an archer never attacks
          out.push({ type: 'attack', target: occ.id, cost: n.cost, path: n.path });
        }
      });
      out = out.concat(fireActions(state, p, st));
    } else if (canFireAgain(state, id)) {
      out = out.concat(fireActions(state, p, st));
    }

    if (canHeal(state, id)) out.push({ type: 'heal' });
    return out;
  }

  function hasAnyAction(state) {
    return piecesOf(state, state.turn.player).some(function (p) {
      return legalActions(state, p.id).length > 0;
    });
  }

  /* ---------- applying actions ---------- */

  function checkGameOver(s, events) {
    var n0 = piecesOf(s, 0).length, n1 = piecesOf(s, 1).length;
    if (n0 > 0 && n1 > 0) return false;
    s.winner = (n0 === 0 && n1 === 0) ? 'draw' : (n0 === 0 ? 1 : 0);
    events.push({ type: 'gameOver', winner: s.winner });
    return true;
  }

  // Called after every action. `mover` is the piece that ended a move or an attack alive, if any.
  function finishAction(s, events, mover) {
    if (checkGameOver(s, events)) return;
    if (mover && s.pieces[mover.id] && mover.kinds.length === 1 && mover.row === farRow(mover.owner)) {
      s.pendingMerge = mover.id;
      events.push({ type: 'mergePending', id: mover.id });
    }
  }

  function applyMove(s, action, events) {
    var p = s.pieces[action.piece];
    if (!p || !action.to || !canActivate(s, p.id)) illegal();
    var n = reachable(s, p.id)[key(action.to.row, action.to.col)];
    if (!n) illegal();
    if (pieceAt(s, action.to.row, action.to.col)) illegal(); // a move ends on an empty square

    var from = { row: p.row, col: p.col };
    p.row = action.to.row;
    p.col = action.to.col;
    // a firing piece that took a single step keeps its shot for later in the turn
    var fireLeft = pieceStats(p).fire > 0 && n.steps === 1;
    events.push({
      type: 'move', id: p.id, from: from, to: { row: p.row, col: p.col },
      path: n.path, cost: n.cost, fireLeft: fireLeft
    });
    s.turn.used.push({ id: p.id, kind: comboKind(p), fireLeft: fireLeft });
    finishAction(s, events, p);
  }

  function applyAttack(s, action, events) {
    var p = s.pieces[action.piece], t = s.pieces[action.target];
    if (!p || !t || !canActivate(s, p.id) || t.owner === p.owner) illegal();
    var n = reachable(s, p.id)[key(t.row, t.col)];
    if (!n) illegal();

    var a = pieceStats(p).str, d = pieceStats(t).str; // both taken before any damage
    if (a <= 0) illegal();
    var from = { row: p.row, col: p.col }, to = { row: t.row, col: t.col };
    p.hp -= d;
    t.hp -= a;
    var attackerDies = p.hp <= 0, defenderDies = t.hp <= 0;
    // the attacker takes the square only when it survives and the defender died
    var attackerMoved = !attackerDies && defenderDies;

    events.push({
      type: 'attack', attacker: p.id, defender: t.id,
      from: from, to: to, path: n.path,
      attackerLoss: d, defenderLoss: a, attackerMoved: attackerMoved
    });
    if (defenderDies) {
      events.push({ type: 'die', id: t.id, owner: t.owner, at: to });
      delete s.pieces[t.id];
    }
    if (attackerDies) {
      events.push({ type: 'die', id: p.id, owner: p.owner, at: from });
      delete s.pieces[p.id];
    }
    if (attackerMoved) { p.row = to.row; p.col = to.col; }

    s.turn.used.push({ id: p.id, kind: comboKind(p), fireLeft: false });
    finishAction(s, events, attackerDies ? null : p);
  }

  function applyFire(s, action, events) {
    var p = s.pieces[action.piece], t = s.pieces[action.target];
    if (!p || !t || t.owner === p.owner) illegal();
    var again = canFireAgain(s, p.id);
    if (!again && !canActivate(s, p.id)) illegal();
    var st = pieceStats(p);
    if (st.fire <= 0 || !inFireRange(p, t, st.range)) illegal();

    var damage = st.fire;
    t.hp -= damage; // the shooter loses nothing and does not move
    events.push({ type: 'fire', shooter: p.id, target: t.id, damage: damage });
    if (t.hp <= 0) {
      events.push({ type: 'die', id: t.id, owner: t.owner, at: { row: t.row, col: t.col } });
      delete s.pieces[t.id];
    }
    if (again) usedEntry(s, p.id).fireLeft = false; // the kept shot fills no combination slot
    else s.turn.used.push({ id: p.id, kind: comboKind(p), fireLeft: false });
    finishAction(s, events, null);
  }

  function applyHeal(s, action, events) {
    var p = s.pieces[action.piece];
    if (!p || !canHeal(s, p.id)) illegal();
    var amount = Math.min(0.5, p.maxHp - p.hp);
    p.hp += amount;
    events.push({ type: 'heal', id: p.id, amount: amount, hp: p.hp });
    s.turn.used.push({ id: p.id, kind: null, fireLeft: false }); // a heal fills no combination slot
    finishAction(s, events, null);
  }

  function applyMerge(s, action, events) {
    var p = s.pieces[action.piece];
    if (!p || s.pendingMerge !== action.piece) illegal();
    if (!KINDS[action.kind]) illegal();
    var own = p.kinds[0], added = action.kind;
    p.kinds = [own, added];
    p.maxHp = KINDS[own].hp + KINDS[added].hp;
    p.hp += KINDS[added].hp;
    s.pendingMerge = null;
    events.push({ type: 'merge', id: p.id, kinds: p.kinds.slice() });
  }

  function applySkipMerge(s, action) {
    if (!s.pieces[action.piece] || s.pendingMerge !== action.piece) illegal();
    s.pendingMerge = null;
  }

  function startTurn(s, events) {
    s.turn.player = 1 - s.turn.player;
    s.turn.number += 1;
    s.turn.used = [];
    events.push({ type: 'turnStart', player: s.turn.player, number: s.turn.number });
  }

  function applyEndTurn(s, events) {
    if (s.winner !== null || s.pendingMerge !== null) illegal();
    events.push({ type: 'turnEnd', player: s.turn.player });
    for (var i = 0; i < 2; i++) {
      startTurn(s, events);
      if (hasAnyAction(s)) return;
      events.push({ type: 'pass', player: s.turn.player }); // no legal action: skip this player
    }
    s.winner = 'draw'; // neither player can act
    events.push({ type: 'gameOver', winner: 'draw' });
  }

  function apply(state, action) {
    var s = clone(state);
    var events = [];
    var type = action && action.type;
    if (type === 'move') applyMove(s, action, events);
    else if (type === 'attack') applyAttack(s, action, events);
    else if (type === 'fire') applyFire(s, action, events);
    else if (type === 'heal') applyHeal(s, action, events);
    else if (type === 'merge') applyMerge(s, action, events);
    else if (type === 'skipMerge') applySkipMerge(s, action);
    else if (type === 'endTurn') applyEndTurn(s, events);
    else illegal();
    return { state: s, events: events };
  }

  /* ---------- serialization ---------- */

  function toBase64Url(text) {
    return global.btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function fromBase64Url(text) {
    var b = text.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4 !== 0) b += '=';
    return global.atob(b);
  }

  function serialize(state) {
    return 'WG2.' + toBase64Url(JSON.stringify(state));
  }

  function deserialize(text) {
    // a version 1 code carries version 1 pieces, so it is refused rather than read
    if (typeof text !== 'string' || text.slice(0, 4) !== 'WG2.') throw new Error('bad game code');
    var state;
    try {
      state = JSON.parse(fromBase64Url(text.slice(4)));
    } catch (e) {
      throw new Error('bad game code');
    }
    if (!state || typeof state !== 'object' || !state.pieces || !state.turn || !state.rules) {
      throw new Error('bad game code');
    }
    return state;
  }

  global.WarGame = global.WarGame || {};
  global.WarGame.Engine = {
    KINDS: KINDS,
    COMBOS: COMBOS,
    DEFAULT_RULES: DEFAULT_RULES,
    newGame: newGame,
    pieceStats: pieceStats,
    comboKind: comboKind,
    pieceAt: pieceAt,
    piecesOf: piecesOf,
    usedKinds: usedKinds,
    activatableKinds: activatableKinds,
    canActivate: canActivate,
    canHeal: canHeal,
    canFireAgain: canFireAgain,
    reachable: reachable,
    legalActions: legalActions,
    hasAnyAction: hasAnyAction,
    apply: apply,
    serialize: serialize,
    deserialize: deserialize
  };
})(window);
