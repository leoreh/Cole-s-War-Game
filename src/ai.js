/* Cole's War Game: the computer opponent. Classic script, no modules, no DOM,
   no external resources. Loaded after engine.js.

   window.WarGame.AI.planTurn(state, level, opts) returns the whole turn of the
   player to move as an array of engine actions, legal when applied in order
   with Engine.apply, ending with endTurn (unless the turn wins the game, which
   makes endTurn illegal). It reads the state and never changes it. */
(function (global) {
  'use strict';

  var E = global.WarGame.Engine;
  var LEVELS = ['easy', 'medium', 'hard'];

  /* ---------- weights ----------
     Everything the evaluation counts is in these numbers, in units of about
     two thirds of a soldier per point. */

  var W = {
    str: 0.9,          // a point of melee strength
    fire: 1.1,         // a point of fire strength, which health does not cap
    hp: 0.45,          // a point of health
    advance: 0.06,     // standing closer to the far row
    promo: 3.6,        // a merge is worth about 4, and a piece a step from the
                       // far row all but has it: value it or the search will
                       // rather walk one square than take a piece
    threat1: 0.35,     // the most a side can take off the other next turn,
    threat2: 0.15,     // and the second most: a turn holds few activations
    poke: 0.35,        // damage a piece survives is worth much less than a kill
    press: 0.5,        // closing the distance, so that the two sides do meet;
                       // kept under what the cheapest kill is worth (see below)
    moveSafety: 0.5,   // ordering only: a move that leaves danger
    moveOffense: 0.3,  // ordering only: a move that creates danger
    win: 1000
  };

  /* How wide the turn beam is and how many candidate turns a ply of the search
     looks at, by how many turns deep the search is going. One turn deep is what
     medium plays, so hard's first pass is medium's turn. The last ply of each
     profile is wide because weighing a reply there costs one evaluation and no
     applied action, and because the evaluation is not quite antisymmetric: the
     reply that is best for the replier is not always the worst for us. */
  var MEDIUM = { levels: 6, perNode: 8, beam: 6, cands: 1 };
  var PROFILE = {
    1: [MEDIUM],
    2: [{ levels: 6, perNode: 8, beam: 6, cands: 8 },
        { levels: 6, perNode: 6, beam: 4, cands: 24 }],
    3: [{ levels: 6, perNode: 8, beam: 6, cands: 6 },
        { levels: 5, perNode: 5, beam: 3, cands: 3 },
        { levels: 5, perNode: 4, beam: 2, cands: 16 }]
  };

  var STEPS8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];

  /* ---------- piece arithmetic (no allocation, called very often) ---------- */

  function baseStr(p) {
    var s = 0, k = p.kinds;
    for (var i = 0; i < k.length; i++) s += E.KINDS[k[i]].str;
    return s;
  }

  function fireOf(p) {
    var s = 0, k = p.kinds;
    for (var i = 0; i < k.length; i++) s += E.KINDS[k[i]].fire;
    return s;
  }

  function rangeOf(p) {
    var s = 0, k = p.kinds;
    for (var i = 0; i < k.length; i++) if (E.KINDS[k[i]].range > s) s = E.KINDS[k[i]].range;
    return s;
  }

  function moveOf(p) {
    var s = 0, k = p.kinds;
    for (var i = 0; i < k.length; i++) if (E.KINDS[k[i]].move > s) s = E.KINDS[k[i]].move;
    return s;
  }

  function strOf(p) { return Math.min(p.hp, baseStr(p)); }

  // What the piece would be worth at that health. Health caps melee strength,
  // so a hurt knight is worth much less, while fire does not fall with health.
  function valueAt(p, hp) {
    if (hp <= 0) return 0;
    return W.str * Math.min(hp, baseStr(p)) + W.fire * fireOf(p) + W.hp * hp;
  }

  function pieceValue(p) { return valueAt(p, p.hp); }

  function damageValue(p, dmg) { return pieceValue(p) - valueAt(p, p.hp - dmg); }

  // Closeness to the far row: a little for everyone, much more for a piece that
  // still has a merge waiting there.
  function placeAt(p, row) {
    var far = p.owner === 0 ? 7 : 0;
    var adv = (7 - Math.abs(far - row)) / 7;
    return W.advance * adv + (p.kinds.length === 1 ? W.promo * adv * adv : 0);
  }

  function placeValue(p) { return placeAt(p, p.row); }

  /* ---------- threats ----------
     A cheap answer to "what could the other side take off this piece next
     turn". Distances ignore blocking pieces and spent slots, so it sees a few
     threats that are not there; both sides are read the same way. */

  function aligned(r, c, tr, tc, range) {
    var dr = Math.abs(tr - r), dc = Math.abs(tc - c);
    if (dr !== 0 && dc !== 0) return false;
    var d = dr + dc;
    return d > 0 && d <= range;
  }

  // A firing piece may take one step and still fire, so its neighbours count.
  function canFireOn(state, r, c, tr, tc, range) {
    if (aligned(r, c, tr, tc, range)) return true;
    var n = (state.rules && state.rules.diagonalMoves) ? 8 : 4;
    for (var i = 0; i < n; i++) {
      var rr = r + STEPS8[i][0], cc = c + STEPS8[i][1];
      if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
      if (aligned(rr, cc, tr, tc, range)) return true;
    }
    return false;
  }

  /* What a hit is worth to the side making it. A kill is worth the whole piece;
     damage it survives is worth much less, since half of it heals back and the
     hit cost a whole activation. Without that gap the two sides simply stay out
     of each other's range. */
  function hitValue(p, dmg) {
    return dmg >= p.hp ? pieceValue(p) : W.poke * damageValue(p, dmg);
  }

  /* A diagonal step costs 2 and covers what two orthogonal steps cover, so the
     cheapest path over an empty board costs exactly the Manhattan distance. */
  function threat(state, atk, ar, ac, tgt, tr, tc) {
    var best = 0, f = fireOf(atk);
    if (f > 0 && canFireOn(state, ar, ac, tr, tc, rangeOf(atk))) best = hitValue(tgt, f);
    var s = strOf(atk);
    if (s > 0) {
      var d = Math.abs(ar - tr) + Math.abs(ac - tc);
      if (d > 0 && d <= moveOf(atk)) {
        var net = hitValue(tgt, s) - hitValue(atk, strOf(tgt)); // melee costs the attacker too
        if (net > best) best = net;
      }
    }
    return best;
  }

  function worstThreat(state, foes, p, row, col) {
    var best = 0;
    for (var i = 0; i < foes.length; i++) {
      var v = threat(state, foes[i], foes[i].row, foes[i].col, p, row, col);
      if (v > best) best = v;
    }
    return best;
  }

  /* One pass over a side: how much of it hangs, and how far it stands from the
     other side. `exposed` keeps only the two biggest threats, since one turn
     holds few activations and summing every threat would count the same turn
     over and over. `far` is the mean distance from a piece of this side to the
     nearest piece of the other, 0 when every one of them is next to an enemy
     and 1 when they are all seven steps away or more. It is a mean, so the
     whole term it feeds stays inside one weight however many pieces are left. */
  function sideInfo(state, side, foes) {
    var top1 = 0, top2 = 0, far = 0, i, j;
    for (i = 0; i < side.length; i++) {
      var p = side[i], best = 0, nd = 99;
      for (j = 0; j < foes.length; j++) {
        var f = foes[j];
        var d = Math.abs(p.row - f.row) + Math.abs(p.col - f.col);
        if (d < nd) nd = d;
        var v = threat(state, f, f.row, f.col, p, p.row, p.col);
        if (v > best) best = v;
      }
      if (best > top1) { top2 = top1; top1 = best; }
      else if (best > top2) top2 = best;
      far += Math.min(7, nd) / 7;
    }
    return {
      exposed: W.threat1 * top1 + W.threat2 * top2,
      far: side.length ? far / side.length : 0
    };
  }

  /* ---------- evaluation ----------
     Positive is good for `me`. Every term but the press below is antisymmetric:
     what one side gains the other loses. The press term is each side's own, so
     both are pushed to close, which no antisymmetric term can do; the search
     therefore scores a reply with the root player's own evaluation rather than
     trusting the replying side's order.

     Material comes first and no other term may outweigh it. Taking a piece
     worth V gives up at most W.threat1 * V, the standing threat on it that we
     no longer hold, and at most W.press, since press lives in [-W.press, 0]. The
     smallest piece on the board is a soldier at 1.35, so with these weights the
     worst a kill can be worth is 1.35 * (1 - 0.35) - 0.5 = 0.38, still a gain.
     Everything else a kill touches moves the right way: the dead piece stops
     threatening us and stops counting for its own side. The test named `a
     killing shot always raises the evaluation` holds this down. */

  function evaluate(state, me) {
    if (state.winner !== null) {
      if (state.winner === 'draw') return 0;
      return state.winner === me ? W.win : -W.win;
    }
    var ids = Object.keys(state.pieces), mine = [], foes = [], score = 0, i;
    for (i = 0; i < ids.length; i++) {
      var p = state.pieces[ids[i]];
      var v = pieceValue(p) + placeValue(p);
      if (p.owner === me) { score += v; mine.push(p); } else { score -= v; foes.push(p); }
    }
    var mi = sideInfo(state, mine, foes), fi = sideInfo(state, foes, mine);
    /* Without this the two sides stand off and heal for ever. It is read off the
       enemy's pieces, not ours: how far each of them stands from our nearest
       piece. So it asks us to close, it never asks us to keep a piece alive to
       stay close to it, and a dead enemy simply leaves the average. */
    return score - W.press * fi.far - mi.exposed + fi.exposed;
  }

  /* ---------- budget ---------- */

  function makeCtx(opts) {
    var hasNodes = typeof opts.maxNodes === 'number';
    var hasTime = typeof opts.budgetMs === 'number';
    var ctx = {
      nodes: 0,
      maxNodes: hasNodes ? opts.maxNodes : Infinity,
      // maxNodes alone means a test wants a deterministic cap: ignore the clock
      deadline: (hasNodes && !hasTime) ? Infinity : Date.now() + (hasTime ? opts.budgetMs : 800),
      aborted: false
    };
    ctx.over = function () {
      if (this.aborted) return true;
      if (this.nodes >= this.maxNodes || Date.now() > this.deadline) this.aborted = true;
      return this.aborted;
    };
    return ctx;
  }

  function step(ctx, state, action) {
    ctx.nodes += 1;
    return E.apply(state, action).state;
  }

  /* ---------- the actions of one activation ---------- */

  // Every action of every piece that may still act, heals left out: they are
  // free of the combination count, so they are added once the turn is chosen.
  function freeActions(state) {
    var mine = E.piecesOf(state, state.turn.player), out = [], i, j;
    for (i = 0; i < mine.length; i++) {
      var p = mine[i], acts = E.legalActions(state, p.id);
      for (j = 0; j < acts.length; j++) {
        var a = acts[j];
        if (a.type === 'heal') continue;
        if (a.type === 'move') {
          out.push({ piece: p, action: { type: 'move', piece: p.id, to: { row: a.to.row, col: a.to.col } } });
        } else {
          out.push({ piece: p, action: { type: a.type, piece: p.id, target: a.target } });
        }
      }
    }
    return out;
  }

  // Move ordering, from the piece alone, so that the beam only applies the few
  // actions worth applying. Cheaper than evaluating every position they lead to.
  function orderActions(state, opts) {
    var foes = E.piecesOf(state, 1 - state.turn.player), here = {}, i, j;
    for (i = 0; i < opts.length; i++) {
      var o = opts[i], p = o.piece, a = o.action, sc;
      if (a.type === 'attack') {
        var t = state.pieces[a.target];
        sc = hitValue(t, strOf(p)) - hitValue(p, strOf(t));
      } else if (a.type === 'fire') {
        sc = hitValue(state.pieces[a.target], fireOf(p)) + 0.4; // fire costs the shooter nothing
      } else {
        if (here[p.id] === undefined) here[p.id] = worstThreat(state, foes, p, p.row, p.col);
        var off = 0;
        for (j = 0; j < foes.length; j++) {
          var v = threat(state, p, a.to.row, a.to.col, foes[j], foes[j].row, foes[j].col);
          if (v > off) off = v;
        }
        sc = W.moveSafety * (here[p.id] - worstThreat(state, foes, p, a.to.row, a.to.col)) +
          W.moveOffense * off + placeAt(p, a.to.row) - placeAt(p, p.row);
      }
      o.score = sc;
    }
    opts.sort(function (x, y) { return y.score - x.score; });
    return opts;
  }

  // A merge is pending after a single-kind piece ends on its far row; nothing
  // else is legal until it is answered.
  function mergeTail(ctx, state, mover, rnd) {
    var acts = [], s = state, guard = 0;
    while (s.pendingMerge !== null && guard++ < 4) {
      var id = s.pendingMerge;
      var tries = [
        { type: 'merge', piece: id, kind: 'K' },
        { type: 'merge', piece: id, kind: 'A' },
        { type: 'merge', piece: id, kind: 'S' },
        { type: 'skipMerge', piece: id }
      ];
      var pick, next;
      if (rnd) {                                   // easy: any merge, never a skip
        pick = tries[Math.min(2, Math.floor(rnd() * 3))];
        next = step(ctx, s, pick);
      } else {
        var bestScore = -Infinity;
        for (var i = 0; i < tries.length; i++) {
          var t = step(ctx, s, tries[i]);
          var v = evaluate(t, mover);
          if (v > bestScore) { bestScore = v; pick = tries[i]; next = t; }
        }
      }
      acts.push(pick);
      s = next;
    }
    return { actions: acts, state: s };
  }

  /* ---------- candidate turns ----------
     A beam over the activations of one turn. Every prefix is itself a turn the
     player may choose, so each one is kept as a candidate. */

  function byScore(a, b) { return b.score - a.score; }

  function candidates(ctx, state, cfg) {
    var mover = state.turn.player;
    var root = { actions: [], state: state, score: evaluate(state, mover) };
    var out = [root], frontier = [root], level, i, j;

    for (level = 0; level < cfg.levels; level++) {
      var pool = [];
      for (i = 0; i < frontier.length; i++) {
        var node = frontier[i];
        if (node.state.winner !== null) continue;
        var opts = orderActions(node.state, freeActions(node.state));
        var kept = Math.min(opts.length, cfg.perNode);
        for (j = 0; j < kept; j++) {
          if (ctx.over()) break;
          var s = step(ctx, node.state, opts[j].action);
          var acts = node.actions.concat([opts[j].action]);
          if (s.pendingMerge !== null) {
            var m = mergeTail(ctx, s, mover, null);
            s = m.state;
            acts = acts.concat(m.actions);
          }
          pool.push({ actions: acts, state: s, score: evaluate(s, mover) });
        }
        if (ctx.over()) break;
      }
      if (!pool.length) break;
      pool.sort(byScore);
      for (j = 0; j < pool.length; j++) out.push(pool[j]);
      frontier = pool.slice(0, cfg.beam);
      if (ctx.over()) break;
    }
    out.sort(byScore);
    return out;
  }

  /* ---------- the levels ---------- */

  // easy: a random legal turn, with attacks and shots four times as likely as
  // moves so that games between two easy players come to an end.
  function planEasy(ctx, state, rnd) {
    var acts = [], s = state, guard = 0;
    while (guard++ < 12 && s.winner === null) {
      var opts = freeActions(s);
      if (!opts.length) break;
      var total = 0, i;
      for (i = 0; i < opts.length; i++) total += (opts[i].action.type === 'move' ? 1 : 4);
      var r = rnd() * total, pick = opts[opts.length - 1].action;
      for (i = 0; i < opts.length; i++) {
        r -= (opts[i].action.type === 'move' ? 1 : 4);
        if (r < 0) { pick = opts[i].action; break; }
      }
      s = step(ctx, s, pick);
      acts.push(pick);
      if (s.pendingMerge !== null) {
        var m = mergeTail(ctx, s, state.turn.player, rnd);
        s = m.state;
        acts = acts.concat(m.actions);
      }
      if (ctx.over()) break;
    }
    return { actions: acts, state: s };
  }

  // medium: the turn whose position, one turn deep, evaluates best.
  function planMedium(ctx, state) {
    return candidates(ctx, state, MEDIUM)[0];
  }

  /* hard: alpha-beta over whole turns. Each candidate turn is a move in the
     search, the endTurn between them is where the side to move flips, and the
     beam keeps the branching down. Depth counts turns. */
  function search(ctx, state, root, depth, rootDepth, alpha, beta) {
    var mover = state.turn.player, max = mover === root;
    if (state.winner !== null || depth <= 0) {
      return { value: evaluate(state, root), actions: [] };
    }
    var profile = PROFILE[rootDepth] || PROFILE[3];
    var cfg = profile[Math.min(profile.length - 1, rootDepth - depth)];
    var cands = candidates(ctx, state, cfg);
    var best = max ? -Infinity : Infinity;
    var bestActions = cands[0].actions, bestState = cands[0].state;
    var limit = Math.min(cands.length, cfg.cands);

    for (var i = 0; i < limit; i++) {
      var c = cands[i], v;
      if (c.state.winner !== null || depth === 1) {
        v = evaluate(c.state, root);
      } else {
        if (ctx.over()) break;
        var after = step(ctx, c.state, { type: 'endTurn' });
        v = search(ctx, after, root, depth - 1, rootDepth, alpha, beta).value;
      }
      if (max ? v > best : v < best) { best = v; bestActions = c.actions; bestState = c.state; }
      if (max) { if (best > alpha) alpha = best; } else if (best < beta) beta = best;
      if (alpha >= beta) break;
      if (ctx.over()) break;
    }
    return { value: best, actions: bestActions, state: bestState };
  }

  function planHard(ctx, state) {
    var me = state.turn.player, best = null;
    for (var depth = 1; depth <= 3; depth++) {
      var r = search(ctx, state, me, depth, depth, -Infinity, Infinity);
      if (ctx.aborted && best !== null) break;    // a half-searched depth is thrown away
      best = r;
      if (ctx.aborted) break;
    }
    return best;
  }

  /* ---------- the turn ---------- */

  function planTurn(state, level, opts) {
    opts = opts || {};
    var lvl = LEVELS.indexOf(level) >= 0 ? level : 'medium';
    var rnd = typeof opts.random === 'function' ? opts.random : Math.random;
    var ctx = makeCtx(opts);
    var out = [], s = state, i;

    if (s.winner !== null) return out;
    if (s.pendingMerge !== null) {                 // a resumed game may sit on one
      var m = mergeTail(ctx, s, s.turn.player, lvl === 'easy' ? rnd : null);
      out = out.concat(m.actions);
      s = m.state;
    }
    if (s.winner === null) {
      var plan = lvl === 'easy' ? planEasy(ctx, s, rnd)
        : (lvl === 'medium' ? planMedium(ctx, s) : planHard(ctx, s));
      out = out.concat(plan.actions);
      s = plan.state;
    }
    // Healing fills no slot, and a piece that has not acted has nothing to lose
    // by it, so every hurt piece left over heals at the end of the turn.
    var mine = E.piecesOf(s, s.turn.player);
    for (i = 0; i < mine.length; i++) {
      if (E.canHeal(s, mine[i].id)) {
        var heal = { type: 'heal', piece: mine[i].id };
        s = step(ctx, s, heal);
        out.push(heal);
      }
    }
    if (s.winner === null) out.push({ type: 'endTurn' }); // endTurn is illegal once won
    return out;
  }

  global.WarGame = global.WarGame || {};
  global.WarGame.AI = {
    LEVELS: LEVELS,
    planTurn: planTurn,
    evaluate: evaluate     // exposed for reading a position by hand in the arena
  };
})(window);
