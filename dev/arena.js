/* Cole's War Game: the arena. It plays the computer opponent against itself at
   two levels and reports wins, draws and planning time.

   In a browser it is a classic script loaded after engine.js and ai.js, and
   dev/arena.html drives it. Under node it loads the two scripts itself:

     node dev/arena.js --games 40 --budget 300
     node dev/arena.js --pairs easy:medium,medium:hard --games 60 --cap 150
*/
if (typeof window === 'undefined' && typeof require === 'function') {
  (function () {
    var fs = require('fs'), path = require('path'), vm = require('vm');
    global.window = global;
    var src = path.join(__dirname, '..', 'src');
    ['engine.js', 'ai.js'].forEach(function (f) {
      vm.runInThisContext(fs.readFileSync(path.join(src, f), 'utf8'), { filename: f });
    });
  })();
}

(function (global) {
  'use strict';

  var E = global.WarGame.Engine;
  var AI = global.WarGame.AI;

  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  // mulberry32: a small seeded generator, so a run can be repeated exactly.
  function rngFrom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function material(state, player) {
    var hp = 0, n = 0;
    E.piecesOf(state, player).forEach(function (p) { hp += p.hp; n += 1; });
    return { hp: hp, pieces: n };
  }

  /* One game. `levels[p]` is the level player p plays at. Returns the winner
     (0, 1 or 'draw'), whether it was the turn cap that ended it and the bigger
     army that won it, the turn it ended on, both sides' material and every
     planning time in milliseconds. */
  function playGame(levels, opts) {
    opts = opts || {};
    var cap = opts.cap || 150;
    var rnd = opts.random || Math.random;
    var state = E.newGame({ diagonalMoves: true }, opts.firstPlayer === undefined ? 0 : opts.firstPlayer);
    var times = [[], []], plans = 0;

    while (state.winner === null && state.turn.number <= cap) {
      var p = state.turn.player;
      var before = state.turn.number;
      var t0 = now();
      var plan = AI.planTurn(state, levels[p], {
        random: rnd, budgetMs: opts.budgetMs, maxNodes: opts.maxNodes
      });
      times[p].push(now() - t0);
      plans += 1;
      if (!plan.length) throw new Error('empty plan at turn ' + state.turn.number);
      for (var i = 0; i < plan.length; i++) state = E.apply(state, plan[i]).state;
      if (state.winner === null && state.turn.number === before) {
        throw new Error('the plan did not end the turn at turn ' + before);
      }
    }
    if (state.winner === null) {                 // the cap: the bigger army wins
      var m0 = material(state, 0), m1 = material(state, 1);
      var lead = (m0.pieces - m1.pieces) * 10 + (m0.hp - m1.hp);
      return {
        winner: lead > 0 ? 0 : (lead < 0 ? 1 : 'draw'), capped: true,
        turns: cap, material: [m0, m1], times: times, plans: plans
      };
    }
    return {
      winner: state.winner,
      turns: state.turn.number,
      material: [material(state, 0), material(state, 1)],
      times: times,
      plans: plans
    };
  }

  function mean(list) {
    if (!list.length) return 0;
    var s = 0;
    for (var i = 0; i < list.length; i++) s += list[i];
    return s / list.length;
  }

  /* `games` games of levelA against levelB, each side starting half the time
     and playing each seat half the time, so neither the first move nor the side
     of the board can explain the result. One game at a time, so that a browser
     can draw between them: call next() until done() is true. */
  function makeRun(levelA, levelB, games, opts) {
    opts = opts || {};
    var rnd = rngFrom(opts.seed === undefined ? 12345 : opts.seed), g = 0;
    var res = {
      a: levelA, b: levelB, games: games, played: 0,
      winsA: 0, winsB: 0, draws: 0, capped: 0, killed: 0,
      turns: [], timesA: [], timesB: [], hpA: 0, hpB: 0, errors: []
    };

    function finish() {
      res.decided = res.winsA + res.winsB;
      res.shareA = res.decided ? res.winsA / res.decided : 0;
      res.meanTurns = mean(res.turns);
      res.meanTimeA = mean(res.timesA);
      res.meanTimeB = mean(res.timesB);
      res.maxTimeA = res.timesA.length ? Math.max.apply(null, res.timesA) : 0;
      res.maxTimeB = res.timesB.length ? Math.max.apply(null, res.timesB) : 0;
      return res;
    }

    function one() {
      var aIsZero = (g % 2) === 0;                 // who sits as player 0
      var levels = aIsZero ? [levelA, levelB] : [levelB, levelA];
      var first = (g % 4) < 2 ? 0 : 1;             // who moves first
      var out = null;
      try {
        out = playGame(levels, {
          random: rnd, firstPlayer: first, cap: opts.cap,
          budgetMs: opts.budgetMs, maxNodes: opts.maxNodes
        });
      } catch (e) {
        res.errors.push('game ' + g + ': ' + (e && e.message ? e.message : e));
      }
      g += 1;
      res.played = g;
      if (!out) return finish();
      var seatA = aIsZero ? 0 : 1, seatB = 1 - seatA;
      if (out.winner === seatA) res.winsA += 1;
      else if (out.winner === seatB) res.winsB += 1;
      else res.draws += 1;
      if (out.capped) res.capped += 1; else res.killed += 1;
      res.turns.push(out.turns);
      res.timesA = res.timesA.concat(out.times[seatA]);
      res.timesB = res.timesB.concat(out.times[seatB]);
      res.hpA += out.material[seatA].hp;
      res.hpB += out.material[seatB].hp;
      return finish();
    }

    finish();
    return { result: res, done: function () { return g >= games; }, next: one };
  }

  function runPairing(levelA, levelB, games, opts) {
    var run = makeRun(levelA, levelB, games, opts);
    while (!run.done()) run.next();
    return run.result;
  }

  function line(r) {
    return [
      pad(r.a + ' vs ' + r.b, 16),
      pad(r.winsA + '-' + r.winsB + '-' + r.draws, 10),
      pad(r.decided ? (100 * r.shareA).toFixed(0) + '%' : '-', 6),
      pad(r.meanTurns.toFixed(0), 6),
      pad(r.meanTimeA.toFixed(1) + ' ms', 10),
      pad(r.meanTimeB.toFixed(1) + ' ms', 10),
      pad(r.maxTimeA.toFixed(0) + '/' + r.maxTimeB.toFixed(0) + ' ms', 12),
      pad(r.capped + ' capped', 10),
      r.errors.length ? (r.errors.length + ' errors') : ''
    ].join(' ');
  }

  function pad(s, n) {
    s = String(s);
    while (s.length < n) s += ' ';
    return s;
  }

  function header() {
    return pad('pairing', 16) + ' ' + pad('W-L-D', 10) + ' ' + pad('share', 6) + ' ' +
      pad('turns', 6) + ' ' + pad('mean A', 10) + ' ' + pad('mean B', 10) + ' ' +
      pad('max A/B', 12) + ' ' + pad('capped', 10);
  }

  global.WarGame.Arena = {
    playGame: playGame,
    makeRun: makeRun,
    runPairing: runPairing,
    rngFrom: rngFrom,
    header: header,
    line: line
  };

  /* ---------- command line ---------- */

  if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
    var argv = process.argv.slice(2), args = {};
    for (var i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
    var games = parseInt(args.games || '40', 10);
    var pairs = (args.pairs || 'easy:medium,medium:hard,easy:hard').split(',');
    var opts = {
      cap: parseInt(args.cap || '150', 10),
      seed: parseInt(args.seed || '12345', 10),
      budgetMs: args.budget === undefined ? undefined : parseInt(args.budget, 10),
      maxNodes: args.nodes === undefined ? undefined : parseInt(args.nodes, 10)
    };
    console.log(header());
    pairs.forEach(function (pair) {
      var ab = pair.split(':');
      var r = runPairing(ab[0], ab[1], games, opts);
      console.log(line(r));
      r.errors.slice(0, 3).forEach(function (e) { console.log('   ' + e); });
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
