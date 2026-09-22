# War Game: design and build spec (version 2)

War Game is a two-player board game on an 8x8 chess board, played on one device (hot seat) on a PC, an iPad or a phone. It is a single-page web app with no build dependencies, no network use while playing and no frameworks, hosted on GitHub Pages so that anyone opens one link, and also available as one self-contained HTML file. The interface is in Hebrew and in English.

Version 2 (2026-09-22, second and third rounds; version 1 is kept as `spec.v1.md`) changes the rules (health separate from strength, path movement with costs, passing over own pieces, archers with range 2 that move one step and fire), the interface (the board always visible, one window with drawers and sheets opened from an icon bar, live changes, an Invite in the Share sheet), the looks (themes with their own piece sets and board decoration, richer animations, a real arrow) and the distribution (its own git repository, GitHub Pages, installable as a home-screen app, offline through a service worker).

# Files

Everything lives in `D:\Code\Cole's War Game\`, a git repository of its own with nothing left in the vault, pushed to `https://github.com/leoreh/Cole-s-War-Game`, served by GitHub Pages from the `docs` folder at `https://leoreh.github.io/Cole-s-War-Game/`.

- `src/index.html`: the shell. Classic `<script src>` tags in this order: `i18n.js`, `themes.js`, `icons.js`, `engine.js`, `ai.js`, `ui.js`. No ES modules, so the file works from `file://`.
- `src/style.css`: all styling, including the per-theme board decoration.
- `src/i18n.js`: `window.WarGame.I18N`. All user-visible strings in `he` and `en`, and `t(key, vars)`.
- `src/themes.js`: `window.WarGame.Themes`. The piece glyph sets and palettes of each theme.
- `src/icons.js`: `window.WarGame.Icons`. Composes a piece (glyph from the theme, hybrid sub-glyph, badges); keeps the classic glyphs as the fallback.
- `src/engine.js`: `window.WarGame.Engine`. Pure rules, no DOM, no globals besides that object.
- `src/ai.js`: `window.WarGame.AI`. The computer opponent: `planTurn(state, level, opts)` (see Computer opponent).
- `src/ui.js`: `window.WarGame.UI`. Rendering, input, animation, settings, persistence, invite, service worker registration.
- `src/sw.js`: the service worker (see Offline).
- `src/manifest.webmanifest`: the web app manifest (see Install).
- `tests/engine.test.html`: loads `../src/engine.js`, runs the assertions below, prints the results into `<pre id="out">` and sets `document.title` to `PASS` or `FAIL n`.
- `tests/ai.test.html`: loads the engine and `../src/ai.js`, checks every level's plans (see Computer opponent), same output convention.
- `dev/arena.js` and `dev/arena.html`: self-play of one level against another, in node or in the browser, reporting wins, draws and planning time.
- `dev/themes.html`: a harness that shows every theme's pieces at 40, 64 and 90 px on light, dark, night and colorful squares, both owners, and a hybrid.
- `dev/make_icons.py`: draws the app icons with Pillow into `docs/icons/` (see Install).
- `build.py`: builds `docs/index.html` (everything inlined), `docs/sw.js` (versioned), copies `docs/manifest.webmanifest`, and also writes `WarGame.html` at the folder root as the offline single file. Run with `python build.py`. Idempotent.
- `docs/`: the build output that GitHub Pages serves. `WarGame.html`: the same page as one file for copying by hand.
- `README.md`: for the repository: what the game is, the link, how to install it on an iPhone or iPad, how to play, how to build.

Target browsers: Safari on iOS and iPadOS 15 or later, current Chrome and Edge on Windows. ES2020 is fine. No external fonts, images or scripts (inline `data:` URIs are fine). Use `system-ui` fonts.

# Rules

## Board and setup

Squares are addressed as `{row, col}`, both 0 to 7. Player 0 sets up on rows 0 to 2 and advances toward row 7. Player 1 sets up on rows 7 to 5 and advances toward row 0. The far row is 7 for player 0 and 0 for player 1.

Setup per player: 8 soldiers on the back row (row 0 for player 0, row 7 for player 1); 4 knights on the second row at columns 2 to 5; 4 archers on the third row at columns 2 to 5.

## Pieces

| Kind | Code | Strength | Health | Move | Fire strength | Fire range |
|---|---|---|---|---|---|---|
| Soldier | S | 1 | 1 | 2 | 0 | 0 |
| Knight | K | 3 | 3 | 4 | 0 | 0 |
| Archer | A | 0 | 3 | 2 | 2 | 2 |

Health is how much damage a piece can take; strength is how much damage its melee attack does. Every piece has a current health `hp` and a max health `maxHp`, in steps of 0.5. A piece whose health reaches 0 or below dies.

A piece's current melee strength is `min(hp, baseStr)`, where `baseStr` is the sum of the base strengths of its kinds. So for a soldier or a knight strength and health are one number that falls together (a knight at health 2 hits for 2, which is what makes the original example hold: a knight at 2 attacking a knight at 3 leaves it at 1), an archer's strength is always 0, and a knight-archer at full health 6 hits for 3. A piece with strength 0 cannot attack in melee.

## Movement

Movement is a path of steps within a budget of `move` points. An orthogonal step (up, down, left, right) costs 1. A diagonal step costs 2 and exists only with the rule toggle `diagonalMoves` (default on). The path may change direction. Legal destinations and their cheapest paths come from a Dijkstra over step costs.

A square holding one of the mover's own pieces is passed over freely. A square holding an enemy piece is never passed over. The path ends on an empty square (a move) or on an enemy piece (an attack, see below); never on an own piece. So a soldier (move 2) reaches any square one or two orthogonal steps away in a line or around a corner, or one diagonal square; a knight (move 4) reaches up to two diagonal steps, or one diagonal plus two orthogonal, and so on.

## Melee attack

An attack is a move whose destination holds an enemy. The attacker needs strength above 0. Attacker strength `a`, defender strength `d`, both taken before any damage. The attacker's health loses `d`, the defender's health loses `a`. Dead pieces are removed. If the defender dies and the attacker lives, the attacker moves into the square; otherwise the attacker stays where it was. Both may survive: a soldier (1) attacking an archer (health 3, strength 0) leaves the archer at 2 and the soldier untouched, in place.

The original examples still hold: soldier attacks soldier, both die; knight (3) attacks soldier, the soldier dies and the knight is at 2; soldier attacks knight (3), the soldier dies and the knight is at 2; soldier attacks a knight at 1, both die; a knight at 2 attacks a knight at 3, the attacker dies and the defender is at 1.

## Fire

A piece with fire strength above 0 may fire at one enemy piece in the same row or column at a distance of at most its fire range. Fire is never diagonal. The target's health loses the fire strength; the shooter loses nothing and does not move. Fire needs no clear line: pieces in between do not block.

Move and fire: a piece with fire strength that moves by exactly one step (one orthogonal step, or one diagonal step when diagonal moves are on) may still fire later in the same turn, from its new square, as part of the same activation. A move of two or more steps forfeits the fire. Firing without moving, or moving without firing, is also allowed. A piece that fires first cannot move afterwards. The fire stays available until the piece fires or the turn ends.

## Turn

A turn belongs to one player. The player activates pieces one at a time; an activated piece takes one action (move, attack, fire, or heal), plus the fire that a one-step move of a firing piece allows, and is then locked for the rest of the turn.

The pieces that move, attack or fire in one turn are limited by these combinations, counted by combo kind: `K+S`, `K+A`, `S+S+S`, `A+S+S`, `A+A+S`. Fewer pieces than a full combination is allowed. A piece may be activated when the multiset of combo kinds used so far, plus this piece's kind, is a sub-multiset of at least one combination. So at most one knight per turn, and with a knight only one other piece.

The combo kind of a hybrid is K if its kinds include K, else A if they include A, else S.

Healing is outside the combination count: any number of injured pieces may heal in a turn, but a healing piece takes no other action that turn and a piece that has acted cannot heal. Healing adds 0.5 health, capped at max health, applied immediately.

The turn ends when the player ends it explicitly. Within a turn the player may undo actions one at a time (the UI keeps state snapshots).

At the start of a turn, if the player to move has no legal action at all, the turn passes to the other player with a `pass` event. If neither player has a legal action, the game is a draw.

The first player is chosen at random when a game starts, and the UI says who starts.

## Merge (promotion)

When a piece that has a single kind ends a move or attack alive on its far row, the player chooses a kind (S, K or A, its own kind included) to merge with, or declines. The engine sets `pendingMerge` to that piece's id; until it is resolved by `merge` or `skipMerge`, no other action is legal, `endTurn` included.

A merged piece is a hybrid with two kinds `[own, chosen]`. Its stats: `baseStr` is the sum of the two base strengths; `maxHp` is the sum of the two base healths; `hp` is the old `hp` plus the chosen kind's base health; move is the max of the two; fire strength is the sum; fire range is the max. A hybrid never merges again. Examples: K+A moves 4, health 6, strength 3, fires 2 at range 2. K+K moves 4, health 6, strength 6. S+S moves 2, health 2, strength 2. A+A moves 2, health 6, strength 0, fires 4 at range 2. S+A moves 2, health 4, strength 1, fires 2 at range 2.

## End of game

A player with no pieces loses. If both players lose their last pieces in the same attack, the game is a draw. Checked after every action.

# Engine API

`window.WarGame.Engine` exposes these. State objects are plain JSON-serializable data; every function returns a new state and never mutates its input.

```
KINDS: { S: {str:1, hp:1, move:2, fire:0, range:0}, K: {...}, A: {...} }
COMBOS: [['K','S'], ['K','A'], ['S','S','S'], ['A','S','S'], ['A','A','S']]
DEFAULT_RULES: { diagonalMoves: true }

newGame(rules?, firstPlayer?) -> state
  rules merged over DEFAULT_RULES; firstPlayer 0 or 1, random when omitted

state = {
  rules,
  pieces: { [id]: { id, owner: 0|1, kinds: ['K'] | ['K','A'], hp, maxHp, row, col } },
  turn: { player, number, used: [{ id, kind: 'K'|'A'|'S'|null, fireLeft: boolean }] },  // kind null for a heal
  pendingMerge: id | null,
  winner: null | 0 | 1 | 'draw',
  firstPlayer
}

pieceStats(piece) -> { str, baseStr, hp, maxHp, move, fire, range, comboKind }
comboKind(piece) -> 'K' | 'A' | 'S'
pieceAt(state, row, col) -> piece | null
piecesOf(state, player) -> piece[]
usedKinds(state) -> ['K', ...]
activatableKinds(state) -> Set of combo kinds that may still be added this turn
canActivate(state, id) -> boolean   (owner is turn.player, not in turn.used, no pendingMerge, no winner, kind fits)
canHeal(state, id) -> boolean
canFireAgain(state, id) -> boolean  (in turn.used with fireLeft true)
reachable(state, id) -> { "r,c": { cost, steps, path: [{row,col}, ...] } }  cheapest path to every square the piece can end on
legalActions(state, id) -> [
    {type:'move', to:{row,col}, cost, path} | {type:'attack', target:id, cost, path} |
    {type:'fire', target:id} | {type:'heal'} ]
    move/attack/fire when canActivate; only fire when canFireAgain; heal when canHeal.
hasAnyAction(state) -> boolean
apply(state, action) -> { state, events }   throws Error('illegal action') on an illegal action
    actions: move {piece,to}, attack {piece,target}, fire {piece,target}, heal {piece},
             merge {piece,kind}, skipMerge {piece}, endTurn
    events, in order:
      { type:'move', id, from, to, path, cost, fireLeft }
      { type:'attack', attacker, defender, from, to, path, attackerLoss, defenderLoss, attackerMoved }
      { type:'fire', shooter, target, damage }
      { type:'die', id, owner, at }
      { type:'heal', id, amount, hp }
      { type:'mergePending', id }
      { type:'merge', id, kinds }
      { type:'turnEnd', player }
      { type:'turnStart', player, number }
      { type:'pass', player }
      { type:'gameOver', winner }
serialize(state) -> 'WG2.' + url-safe base64 JSON
deserialize(string) -> state   throws on a bad string, including a 'WG1.' code
```

`path` lists the squares stepped on, ending at the destination, not including the start. A move action carries only `to`; the engine uses the cheapest path. `fireLeft` is set when the path has exactly one step. A `fire` by a piece with `fireLeft` sets it false and adds no `used` entry. Piece ids `p0-0` to `p0-15` (soldiers 0 to 7, knights 8 to 11, archers 12 to 15) and the same for `p1`.

# Engine tests

`tests/engine.test.html` asserts at least:

- Setup: 32 pieces, each player 8 S on the back row, 4 K at row 1 or 6 columns 2 to 5, 4 A at row 2 or 5 columns 2 to 5; archers have hp 3.
- The five melee examples above with the survivor's position, and soldier attacks archer: archer at 2, soldier unharmed and in place.
- Strength follows health: a knight at 2 hits for 2; a K+A at 6 hits for 3, at 2 hits for 2.
- Movement: a soldier reaches every square at path cost 2 or less, including around a corner; a knight at cost 4; an enemy blocks a path and is never passed; an own piece is passed over; with `diagonalMoves` a soldier reaches the diagonal neighbours at cost 2 and a knight the two-step diagonal; without it a diagonal neighbour is reached only around the corner. No move onto an own piece. `reachable` reports the cheapest cost and a path whose squares are adjacent in order.
- An archer has no attack actions. Fire at range 2 in a row or column, over an intervening piece; never diagonal; a knight at 3 drops to 1; a soldier dies; an archer at 3 drops to 1.
- Move then fire: an archer that moved one step has fire actions and `canFireAgain` and no move actions; after firing it has none; an archer that moved two steps has none; the fire adds no combo slot (K acts, A moves one step, A fires, then nothing else is activatable; and A moves one step, S, S act, A still fires).
- Combos: after K, only S or A; after S+S, A or S, not K; after A+A, only S; after A+S+S, nothing; three archers never.
- Heal: +0.5 up to max, a healed piece cannot move, a moved piece cannot heal, healing does not consume a slot; an archer at 2 can heal.
- Merge: a soldier reaching row 7 gets `pendingMerge`; `endTurn` throws while pending; S merged with K gives hp 4, maxHp 4, baseStr 4, move 4; S merged with A gives fire 2 range 2, maxHp 4; A merged with A gives fire 4 range 2, maxHp 6; a hybrid reaching the far row again gets no `pendingMerge`; `skipMerge` clears it.
- Win, draw, pass, serialize round trip, no mutation of inputs, `deserialize('WG1.x')` throws.

# Computer opponent

`src/ai.js` is `window.WarGame.AI`, a classic script loaded after `engine.js` and before `ui.js`. It has no DOM, no storage and no state of its own, and it uses nothing outside `window.WarGame.Engine`, so it runs from `file://` and inside the single-file build like the rest; it reads the clock only to know when to stop searching.

```
LEVELS: ['easy', 'medium', 'hard']

planTurn(state, level, opts?) -> Action[]
  The whole turn of the player to move, as engine actions that are legal when
  applied in order with Engine.apply: the activations, the merge or skipMerge
  that a piece reaching its far row forces, a heal for every hurt piece left
  over, and endTurn last. Synchronous, and it never changes the state given.
  A level that is not one of the three is played as medium.
  opts: random    a function returning [0,1), default Math.random
        budgetMs  the search's time budget, default 800
        maxNodes  a cap on the actions applied while searching; with maxNodes
                  and no budgetMs the clock is ignored, which is how the tests
                  get the same turn out of every run
```

Two things the caller has to know. A turn that takes the enemy's last piece ends the game, and `endTurn` is illegal once there is a winner, so such a plan stops at the winning action instead of ending the turn; a state that already has a winner yields an empty plan. And a turn that has already begun is continued rather than refused: the pieces in `turn.used` stay used, and a `pendingMerge` left over from a half-played turn is answered before anything else.

## The three levels

**easy** picks one legal action at random, over and over, until no piece may act. Attacks and shots are weighted four times a move, which is what keeps two easy players from wandering the board for ever; it walks into losing exchanges and takes a free kill only by accident. It merges with a random kind and never declines a merge.

**medium** is one turn deep: it builds the candidate turns below and plays the one whose position evaluates best.

**hard** is alpha-beta over whole turns. A candidate turn is one move in the search, the `endTurn` between them is where the side to move flips, and depth counts turns, not actions. It deepens a turn at a time to at most three (its own turn, the reply, the answer to the reply) and throws away a depth the budget cut short, so the turn it plays always comes out of a finished search. Candidates are ordered by the static evaluation before they are searched and the list is then cut per ply: two turns deep it looks at 8 turns of its own and weighs up to 24 replies to each, three turns deep at 6 turns, 3 replies and 16 answers to those. The last ply of each is wide because weighing one more candidate there costs an evaluation and no applied action. Three turns deep costs tens of milliseconds a turn on this machine, far inside the 800 ms budget, and that margin is the point: a phone is several times slower, and where even that is not enough the budget cuts the last depth and the turn from the depth before is played.

## Candidate turns

A turn is a sequence: at most three activations by the combination rules, plus the shot a firing piece keeps after a single step. There are around a hundred legal actions in the opening position and a turn is three of them in order, so turns are built with a beam instead of being enumerated. At each activation every action of every piece that may still act is ordered by a cheap score read off the piece alone -- an attack by what it takes minus what it costs, a shot by what it takes, a move by how much danger it leaves behind, how much it creates and how much closer to the far row it ends. The best eight are applied, the positions they lead to are evaluated, the best six are kept, and the next activation grows out of those; the deeper plies of the hard search use narrower numbers. Every prefix is itself a turn the player may choose, so all of them are candidates, the empty turn included.

Healing is outside all of this. It fills no slot in the combination, and a piece that was not activated loses nothing by healing, so every hurt piece left over heals at the end of the turn and the beam never spends a branch on it. The search does not apply those heals, so it reads both sides at up to half a health point below what they will have.

## The evaluation

One number, positive for the player asked about.

| Term | Weight | What it counts |
|---|---|---|
| Strength | 0.9 | each point of current melee strength, which is `min(health, baseStr)` |
| Fire | 1.1 | each point of fire strength, which health does not cap |
| Health | 0.45 | each point of current health |
| Far row | 0.06, and 3.6 more for a single-kind piece | closeness to the far row, squared for the second. A merge is worth about 4 and a piece one step short of it all but has it, so it is counted nearly in full: count it low and a search one turn from a merge would rather walk a square than take a piece. |
| Threats | 0.35 and 0.15 | the biggest and the second biggest hit a side could make next turn, counted both ways, since a turn holds few activations |
| Press | 0.5 | the mean distance from each enemy piece to our nearest piece |
| Win | 1000 | a won position; a draw is 0 |

Material comes first and no other term may outweigh it. Taking a piece worth V gives up at most 0.35 V, the standing threat it was, and at most 0.5, the whole press term, which lives between -0.5 and 0. The smallest piece on the board is a soldier at 1.35, so the worst a kill can be worth is 1.35 x 0.65 - 0.5 = 0.38, still a gain, and everything else a kill touches moves the same way: the dead piece stops threatening us and stops counting for its own side. This is the one thing an outside tester found broken in the first version. Press was scaled by the lead and summed over the pieces, so killing the enemy piece our archer stood next to destroyed a bonus worth more than the piece, and the computer declined a free shot -- the more it was winning, the worse the shot looked. Two tests hold it down now: the exact position it was found in, for medium and for hard, and a sweep that asserts every killing shot in a batch of positions raises the evaluation.

A hit is worth the whole piece when it kills it, and 0.35 of the health it takes when the piece survives, because half of that heals back and the hit cost a whole activation. A melee hit is worth what it takes minus what the attacker takes back, so a soldier does not count as threatening a knight. Reach is read from distances alone: a diagonal step costs 2 and covers what two orthogonal steps cover, so the cheapest path over an empty board costs exactly the Manhattan distance, and a piece is taken to threaten whatever it could reach if the board between were empty. That sees a few threats that are not there and ignores the combination limits, and it reads both sides the same way.

Press is there because without it the two sides stand off and heal for ever: every square within reach of an archer looks expensive, nobody closes, and the game is a hundred and fifty turns of shuffling. It is read off the enemy's pieces rather than our own -- how far each of them stands from our nearest piece -- so it asks us to close, it never asks us to keep an enemy alive to stay near it, and being a mean it stays inside its one weight however many pieces are left. It is also the one term that is not antisymmetric: both sides are paid to close, which nothing antisymmetric can do, since there what one side gains the other must lose. The search allows for that by scoring every reply with the root player's own evaluation, and by weighing many replies at its last ply, where one more costs an evaluation and no applied action.

## The arena

`dev/arena.js` plays one level against another and reports the wins and the planning time. It runs under node (`node dev/arena.js --games 60 --pairs medium:hard`) and in the browser through `dev/arena.html` (`?games=10&pairs=easy:medium,medium:hard&cap=150`), which plays one game per timer tick so the page keeps drawing and sets `document.title` to `DONE` at the end. Each level sits as player 0 in half the games and moves first in half of them, and the generator is seeded, so a run repeats exactly. A game that reaches the turn cap, 150 turns by default, is decided by material: pieces first, then health.

Measured on 2026-09-22, 60 games a pairing, default budget, under node 20 on this machine:

| Pairing | Result | Decided at the cap | Mean turns | Mean plan, first level | Mean plan, second |
|---|---|---|---|---|---|
| easy vs medium | medium 60-0 | 0 | 21 | 0.8 ms | 8.9 ms |
| medium vs hard | hard 60-0 | 30 | 92 | 2.2 ms | 39.1 ms |
| easy vs hard | hard 60-0 | 0 | 23 | 0.7 ms | 85.1 ms |
| easy vs easy | 27-33 | 2 | 86 | 0.6 ms | 0.6 ms |

Each level beats the one below it in every game. Two easy players finish 58 games of 60 by wiping each other out, which is what the weighting of attacks over moves is for. The turn cap is reached mostly in medium against hard, where hard has the material and the weaker side keeps its last pieces away from it. Hard thinks longest against easy, not against medium, because easy keeps more pieces alive and leaves a wider position to search.

In the browser (Chrome on the same machine, 10 games a pairing) the same three pairings went 10-0 to medium, to hard and to hard again, with hard planning a turn in 29 ms on average against medium, 63 ms against easy, and 151 ms in its slowest turn of the whole run. The wait after a tap is therefore far under the second the budget allows, and it is a browser measurement: Chrome runs this code faster than node does.

# UI

## Title

The game is called Cole's War Game, after Cole, the nephew who designed it, in the manner of "Sid Meier's Civilization". The wordmark is two lines: in English "Cole's" over "War Game"; in Hebrew "משחק מלחמה" over "מבית היוצר של קול". It appears once, as a small wordmark at the top of the panel (the first line in a light weight, the second in the display weight), and in `document.title` ("Cole's War Game" / "משחק מלחמה מבית היוצר של קול"), in the manifest (`name` "Cole's War Game", `short_name` "War Game"), in `apple-mobile-web-app-title` ("Cole's War Game"), in the invite message and in the README. The i18n keys are `app.title1` and `app.title2` for the two lines and `app.title` for the one-line form.

## One window

There is one window: the board with its panel. No menu screen. On first load a game starts at once (random first player, opening ribbon); on later loads the saved game is shown. Everything else opens from an icon bar in the panel and closes back to the board, so a color change is seen on the real board at once and no screen stands between the player and the game.

The panel holds, top to bottom: the turn line (player color swatch and name, turn number), the used and available chips, the status line (may still fire, reasons, pass), End turn, Undo, and an icon bar of five equal icon buttons with an `aria-label` and a `title` in the current language:

- New game (a plus-in-circle icon): opens the New game sheet inside a small card over the board (the opponent, the computer's level, Start / Back; see Computer opponent), which carries the sentence The current game will be lost while a game is in progress.
- Appearance (a palette icon): a drawer with theme, player colors, square colors, presets, random colorful board with Reshuffle, coordinates.
- Settings (a gear icon): a drawer with language, the Diagonal movement rule toggle (with the note Applies at the next new game), animations on or off.
- Rules (an info icon): a scrollable sheet with the rules.
- Share (a share icon): a sheet with everything that leaves the device, in this order: Invite (the share message with the link and the two home-screen steps, through `navigator.share` when it exists, else copied with a Copy button and the text shown for selecting by hand), Share this game (the link with `#g=<code>`, same mechanics; shown only with a game in progress), the game code (the `WG2.` code in a read-only field with Copy) and Load a game (a field to paste a code, with Load; a bad code shows an error and changes nothing). Nothing of this appears anywhere else.

Drawers slide in from the inline end in landscape and up from the bottom in portrait, over the panel area, with a close button and closing on a tap outside or Escape; the board stays visible. Sheets and cards are centered over the board. Transitions are short fades and slides (150 to 250 ms). The merge dialog and the game over card (winner, Play again) stay as centered cards. Settings persist in `localStorage` under `wargame.settings`; the game autosaves under `wargame.game` after every action, the mode it is played in beside it under `wargame.mode`, and an old `WG1.` save is treated as no save.

The look of the panel is tight and professional: one type size for controls, one accent color, equal spacing, icon buttons in one row with a hairline separator above them, no decorative text. Under 600 px the panel is a compact bar under the board: the turn line and chips in one row, End turn and Undo in one row, the icon bar in one row.

The invite link is the constant `GAME_URL = 'https://leoreh.github.io/Cole-s-War-Game/'` in `ui.js`, never `location.href`, so it is right even from `file://`.

## Computer opponent

The New game icon opens one small sheet: the opponent as a two-way segmented control (Two players / Computer), under it, only when Computer is chosen, the level as a three-way one (Easy / Medium / Hard), then Start and Back, with the sentence The current game will be lost above them while a game is under way. The choice is kept in the settings (`opponent`, `level`) and is the default next time. Against the computer the human is always player 0, the light side at the bottom, and the computer is player 1; who starts is still drawn at random and the ribbon announces it. Every place a player is named goes through `playerName(p)` in `ui.js`: Player 1 / Player 2 with two players, You / Computer against the computer (in Hebrew הצד שלך and המחשב, which are neutral as to gender).

When the computer's turn comes, from the human's End turn, from a pass, from a saved game that resumes at its turn or from the draw at the start of a game, the board and End turn and Undo are blocked and the panel says the computer is thinking; after a short timeout, so the message paints, `window.WarGame.AI.planTurn(state, level)` gives the whole turn as engine actions. They are applied one at a time through the path a human's actions take, so every move, attack, shot, heal and merge animates the same way, with about 400 ms between them (250 with the animations off). The merge dialog never opens for the computer, which answers its own merges from the plan, and if the plan throws or an action no longer applies the turn is simply ended, so the game never hangs. Undo is off while the computer plays; inside the human's turn it steps back one action as always, and at the start of the turn, with nothing done yet, it gives back the computer's turn and the human's turn before it, landing at the start of that turn. The mode is saved beside the game under `wargame.mode`, so a reload resumes it; a position that arrives from a `#g=` link or from a pasted code is a game for two.

## Wordmark

The game is called Cole's War Game, after Cole, the nephew who designed it, in the manner of Sid Meier's Civilization. The wordmark is two lines. English: `Cole's` as a small credit line over `War Game` as the large title. Hebrew: `משחק מלחמה` as the large title over `מבית היוצר של קול` as the small credit line under it; the order is reversed because the credit reads as a byline in Hebrew, and the credit is never shortened to `של קול`, since `קול` alone means voice.

Where it appears: at the top of the panel on the board window, once, the main placement; at the top of the Rules sheet, larger, as a title card; in `document.title` (`Cole's War Game` / `משחק מלחמה מבית היוצר של קול`); in the manifest (`name` Cole's War Game, `short_name` War Game, since iOS truncates home-screen labels) while `apple-mobile-web-app-title` stays `War Game`, because on iOS that meta wins over the manifest and the home-screen label would truncate; and as the first line of the invite message.

It is a display treatment, not a text label: built from system fonts with weight, letter spacing and size contrast between the two lines, and a treatment per theme so the title changes with the appearance (CSS only: gradients, text-shadow, `background-clip: text`, keyframes; no images, no external fonts, no measurable cost on an iPad). One short entrance effect on first render and on theme change, a fade with a slight rise or a sheen sweep, 300 to 500 ms, off under the animations setting and `prefers-reduced-motion`.

Strings through i18n: `app.title1` and `app.title2` for the two lines in their display order, `app.title` for the one-line form. RTL holds: the Hebrew wordmark right-aligned, the English left-aligned, the board never mirrors. The panel must not grow so much that the board shrinks on an iPad in landscape or on a phone.

## Board and pieces

The board is a square that fits the shorter side of the viewport minus the panel. The panel sits at the inline end of the board in landscape and below it in portrait. The board container has `direction: ltr` always. On a phone (width under 600 px) the panel is a compact bar under the board with the same controls in one or two rows.

Pieces are inline SVG from the current theme through `Icons.piece(kinds, opts)`, filled with the owner's color, with a contrasting outline computed from the color's luminance, and a soft shadow. Player 0 faces up the board and player 1 down, where the glyph has a facing.

Badges: a health badge at the bottom corner shows `hp`; it is amber when `hp < maxHp`. A small strength badge with a sword mark shows the melee strength when it differs from `hp` and is above 0 (a knight-archer at 6 shows health 6 and strength 3; an archer shows health only). Hybrids show the second kind small at the top corner. A used piece is dimmed; a used piece that may still fire is not dimmed and carries a small bow mark that pulses.

Tap a piece: legal destinations show as soft dots (all reachable squares, diagonal ones too), attack targets as a red ring, fire targets as an orange ring with a bow mark; a Heal button appears when it can heal. After a one-step move of a firing piece, the piece stays selected with its fire targets shown and the panel says it may still fire; tapping elsewhere leaves the fire available until the turn ends.

## Themes

`window.WarGame.Themes` (in `themes.js`):

```
list: ['classic', 'heraldic', 'ink', 'neon', 'toy']   // ids in display order
get(id) -> {
  id,
  name: { he, en },
  palette: { p0, p1, light, dark },        // applied when the theme is chosen; the user may then change any color
  boardClass: 'theme-classic',             // put on the board element and on <body> for the decoration CSS
  glyph(kind, opts) -> svg string          // opts: { flip: boolean, cls: string }, viewBox 0 0 100 100
}
```

Glyphs use `currentColor` for the owner color and `var(--piece-outline)` for the contrasting outline; fixed accents (steel, wood, skin, leather, glow) are allowed as long as they read on both a light and a dark owner color. Each theme's three glyphs share one style and one line weight; hybrids compose the main glyph with the second kind small at the top corner, the same way for every theme.

- Classic: a chess set, every piece turned on the same foot and plinth: the soldier a pawn, the knight the chess horse head, the archer the same turned body under a fletched arrow. No two themes share a silhouette. Board: dark wood frame with a subtle grain and brass corners, squares with a faint grain.
- Heraldic: people. Soldier: a standing figure with a helmet, a sword and a shield, tabard in the owner color. Knight: a mounted rider on a horse, lance or sword raised, caparison in the owner color. Archer: a figure drawing a longbow, hood and tunic in the owner color. Readable at 48 px, detailed at 90 px. Board: parchment squares with faint map-like hatching on the light ones, a tapestry-like border with a repeating motif, a soft vignette.
- Ink: brush-like glyphs, as if painted with a wet brush in one or two strokes, slightly rough edges (a great helm with a crest, a galloping horse, a bow), on a paper board with a brushed frame and a faint paper grain.
- Neon: glowing outlines (no fill, stroke in the owner color with a glow) in one angular sign language (a faceted shield with a spear, a straight-lined horse head, a two-limbed bow) on a dark board of dark tiles with thin glowing grid lines; palette with a cyan and a magenta player and near-black squares.
- Toy: chunky, rounded, friendly pieces like wooden board-game tokens: a meeple with a little shield, a rocking-horse knight, a meeple with a bow; bold outlines, simple shapes, a highlight spot. Board: a bright frame with rounded corners and a dotted border, squares with a soft inner highlight, a playful gradient background.

`Icons.piece(kinds, opts)` takes `opts.theme` (an id) and uses that theme's `glyph`; with no theme or an unknown id it uses `classic`. `Icons.glyph(kind, opts)` likewise. All decoration is CSS gradients and inline SVG `data:` URIs under `.theme-<id>`; the user's square colors stay the base color of each square, decoration is an overlay at low opacity. Choosing a theme applies its palette. Picking a color, a preset or a theme switches the random board off.

## Animations

Short (200 to 500 ms), 2D, CSS transitions and keyframes, plus a few JS-driven ones; all off under `prefers-reduced-motion` or the animations setting.

- Move: the piece slides along its path, square by square, faster for longer paths, with a small lift (shadow grows) while moving.
- Attack: the attacker slides along its path and lunges into the defender; a sword-clash flash with a few spark particles at the contact point; floating loss numbers; the dead piece breaks into six to eight fragments that fall and fade; the survivor settles.
- Fire: an SVG arrow with fletching flies from the shooter to the target along the row or column with a slight arc and a rotation to its direction of travel; on impact a small burst, the target flashes and shakes; loss number.
- Heal: a green pulse and three small sparkles rising, plus `+0.5`.
- Merge: a burst of colored particles and the new glyph scales in.
- Turn change: a ribbon banner in the new player's color slides across the board.
- Selected piece: a gentle bob. Legal squares: dots pulse softly. Hover (pointer devices): a lift with a larger shadow.

Play the animations by consuming the events list from `Engine.apply`, then render the new state. Input is blocked while animating.

## Colors

Defaults come from the Classic theme's palette: player 0 `#efe6cf`, player 1 `#2f3550`, light square `#efe0c3`, dark square `#a97e57`. Presets (Wood, Marble, Forest, Ocean, Rose, Night) set the four colors together. The random colorful board picks a hue per square, saturation around 45 percent, lightness alternating around 72 and 58 by square parity; Reshuffle regenerates it; the layout is stored with the settings.

## Language and direction

`document.documentElement.lang` and `dir` follow the language (`he` / `rtl`, `en` / `ltr`). Default on first run: Hebrew when `navigator.language` starts with `he`, else English. All layout uses logical properties. Numbers and codes are wrapped in `<bdi>` or `dir="ltr"` spans. Directional icons flip in RTL. The Hebrew must read like native Hebrew; the terms of version 1 stay (Soldier חייל, Knight אביר, Archer קשת, Strength כוח, Move תנועה, Attack תקיפה, Fire ירי, Heal ריפוי, Merge מיזוג, Hybrid כלאיים, Turn תור, End turn סיום תור, Undo ביטול, Player שחקן, Winner המנצח, Draw תיקו, Rules חוקים, Settings הגדרות, New game משחק חדש, Menu תפריט, Language שפה, Board לוח, Colors צבעים, Game name משחק מלחמה, Cole's War Game משחק מלחמה מבית היוצר של קול), with these added: Health בריאות, Theme ערכת נושא, Classic קלאסי, Heraldic הרלדי, Ink דיו, Neon ניאון, Toy צעצוע, Appearance מראה, Invite הזמנה, Share this game שיתוף המשחק הזה, Game code קוד המשחק, Load a game טעינת משחק, Share this game שיתוף המשחק הזה, Diagonal movement תנועה באלכסון, May still fire יכול עדיין לירות, Applies at the next new game חל מהמשחק הבא.

## iPad and iPhone

`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` black-translucent, `apple-mobile-web-app-title` War Game, `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`, `-webkit-user-select: none` on the board, safe-area padding. Pointer events. No double-tap zoom on the board. The game must be playable on a phone in portrait: the board takes the full width, the panel sits below as a compact bar.

## Install

`src/manifest.webmanifest`: name War Game, short_name War Game, `start_url` `./`, `scope` `./`, `display` standalone, `background_color` `#141821`, `theme_color` `#141821`, icons `icons/icon-192.png`, `icons/icon-512.png` (purpose any and maskable). `index.html` links it with `<link rel="manifest" href="manifest.webmanifest">` and `<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">` (180 px). `dev/make_icons.py` draws the three PNGs with Pillow into `docs/icons/`: a rounded dark square `#1d2233` with the classic chess knight on its base in cream `#efe6cf`, with a safe margin of 15 percent for the maskable form. The `docs/icons` folder is committed (the build does not regenerate icons).

## Offline

`src/sw.js` is a service worker that caches `./`, `./index.html`, `./manifest.webmanifest` and the icons at install, cache-first with a background refresh, under a cache name that carries a version string `__VERSION__`, deleting older caches on activate. `ui.js` registers `./sw.js` only when `location.protocol` is `https:` or the host is `localhost`, never on `file://`, and ignores failures silently. `build.py` writes `docs/sw.js` with `__VERSION__` replaced by the first 12 hex digits of the SHA-256 of `docs/index.html`, so every build invalidates the old cache.

# Build

`build.py` (Python 3, standard library only): read `src/index.html`; replace each `<link rel="stylesheet" href="X">` with `<style>` + the file's content + `</style>`; replace each `<script src="X"></script>` with `<script>` + content + `</script>`; write `docs/index.html` and `WarGame.html`, UTF-8, no BOM; write `docs/sw.js` as described under Offline; copy `src/manifest.webmanifest` to `docs/`. Print the output paths and sizes.

# Repository

The folder is its own git repository (branch `main`), with a `.gitignore` for `__pycache__/` and `.DS_Store`. It is pushed to `https://github.com/leoreh/Cole-s-War-Game` (GitHub Pages on a free account needs a public repository; the repository was created private and must be made public, or the account upgraded, for the link to work), and Pages is set to serve from `main` at `/docs`. The project lives outside the Obsidian vaults, under `D:\Code`.
