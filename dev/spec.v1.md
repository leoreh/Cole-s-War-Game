# War Game: design and build spec

War Game is a two-player board game on an 8x8 chess board, played on one device (hot seat) on a PC or an iPad. It ships as one self-contained HTML file with no build dependencies, no network use and no frameworks. The interface is in Hebrew and in English.

# Round 2 changes (2026-09-22, override the sections below where they differ)

Rules:

- Health and strength are separate. Strength is the damage a piece deals in melee; health is the damage it can take. Soldier: strength 1, health 1. Knight: strength 3, health 3. Archer: strength 0, health 3, fire 2, fire range 2. Melee: attacker loses defender's strength from its health, defender loses attacker's strength from its health; health 0 or below dies. Healing restores health by 0.5 up to max health. Injured means health below max. The badge shows health. A piece with strength 0 cannot attack in melee. Merge: max health is the sum of the two base healths, current health is old health plus the chosen kind's base health, strength is the sum of strengths, fire strength the sum, fire range the max (not the sum), move the max. Piece fields: `hp`, `maxHp`, and stats `str` (constant per kinds).
- Fire is never diagonal: the target must be in the same row or column within the range. Squares between shooter and target need not be empty. The `diagonalFire` toggle is removed.
- Jumping: every piece passes over its own pieces and never over an enemy piece. The `knightsJump` toggle is removed. A move still needs an empty destination or an enemy destination for an attack.
- Diagonal movement is a rule toggle `diagonalMoves` (default on). A move is a path of steps: an orthogonal step costs 1 movement point, a diagonal step costs 2. A piece may spend up to its `move` points along any path of steps, each step landing on an empty square or a friendly square (passed over), never on or through an enemy square except the final square which may hold an enemy (attack). So a soldier (move 2) reaches any orthogonal square at distance 1 or 2 in a line, an L of two orthogonal steps, or one diagonal square; a knight (move 4) reaches up to two diagonal steps, or one diagonal plus two orthogonal, and so on. Compute legal destinations by a Dijkstra over step costs. With the toggle off, only orthogonal steps exist (paths may still turn: two orthogonal steps in different directions are allowed, since jumping and pathing are now general). `legalActions` returns for each destination the cheapest path as `path: [{row,col}, ...]` (the squares stepped on, ending at the destination) so the UI can animate along it.
- Archer move and fire: a piece with fire strength above 0 that moves exactly one step (an orthogonal step of 1, or, when diagonal moves are on, one diagonal step) may still fire in the same turn. Implement as: after a move of one step, the piece is marked in `turn.used` with `fireLeft: true`; `legalActions` then returns only fire actions for it; firing clears it. It is still one activation for the combination count. A piece that fires first cannot move afterwards. Healing still excludes both.
- Defaults: `diagonalMoves: true`. No other rule toggles remain.

Interface:

- Settings open as a drawer beside the board (a side sheet at the inline end in landscape, a bottom sheet in portrait) over the running game, never a separate screen, so every color, theme and board change is seen live on the real board. Rule toggles sit in their own group labelled as taking effect at the next new game. The menu keeps a Settings entry which opens the same drawer over the board (start a new game first when there is no game, so there is always a board to preview). The Rules screen may stay a full screen. Transitions: screens and the drawer fade or slide in 200 ms; no page-like jumps.
- Themes: a theme sets the piece glyph set, the board decoration (square texture or pattern, frame style) and a color palette, in one pick. Ship at least four: Classic (current clean glyphs), Heraldic (detailed figures: a soldier as a person with sword and shield, a mounted knight, an archer drawing a bow, all as SVG paths), Ink (brush-like glyphs on a paper board), and Neon (glowing outlines on a dark board). Colors from the theme are defaults the user can still override per color. Random colorful board stays as an option under any theme.
- Firing shows a real arrow: an SVG arrow with fletching flies along the row or column from shooter to target with a slight arc and a rotation, the target flashes and shakes.
- A service worker (`src/sw.js`, copied to the folder root by the build as `sw.js`) caches `WarGame.html` and itself so the game works offline once loaded from an https address; registration is skipped on `file://`. The README explains hosting on GitHub Pages step by step.

# Files

Everything lives in `D:\Vaults\Obsi_Code\War Game\` (gitignored).

- `src/index.html`: the shell. Classic `<script src>` tags in this order: `i18n.js`, `icons.js`, `engine.js`, `ui.js`. No ES modules, so the file works from `file://`.
- `src/style.css`: all styling.
- `src/i18n.js`: `window.WarGame.I18N`. All user-visible strings in `he` and `en`, and `t(key, vars)`.
- `src/icons.js`: `window.WarGame.Icons`. SVG glyphs for the pieces.
- `src/engine.js`: `window.WarGame.Engine`. Pure rules, no DOM, no globals besides that object.
- `src/ui.js`: `window.WarGame.UI`. Rendering, input, animation, settings, persistence.
- `tests/engine.test.html`: loads `../src/engine.js`, runs the assertions below, prints the results into `<pre id="out">` and sets `document.title` to `PASS` or `FAIL n`.
- `build.py`: inlines the css and the scripts of `src/index.html` into `WarGame.html` at the folder root. Run with `python build.py`. Idempotent.
- `WarGame.html`: the build output, the one file that is copied between devices.

Target browsers: Safari on iPadOS 15 or later, current Chrome and Edge on Windows. ES2020 is fine. No external fonts, images or scripts. Use `system-ui` fonts.

# Rules

## Board and setup

Squares are addressed as `{row, col}`, both 0 to 7. Player 0 sets up on rows 0 to 2 and advances toward row 7. Player 1 sets up on rows 7 to 5 and advances toward row 0. The far row is 7 for player 0 and 0 for player 1.

Setup per player: 8 soldiers on the back row (row 0 for player 0, row 7 for player 1); 4 knights on the second row at columns 2 to 5; 4 archers on the third row at columns 2 to 5.

## Pieces

| Kind | Code | Strength | Move | Fire strength | Fire range |
|---|---|---|---|---|---|
| Soldier | S | 1 | 2 | 0 | 0 |
| Knight | K | 3 | 4 | 0 | 0 |
| Archer | A | 0 | 2 | 2 | 1 |

Strength is the melee strength, a number in steps of 0.5. Every piece has a current strength and a max strength. A piece whose strength reaches 0 or below dies. An archer has 0 melee strength: it dies when attacked and it cannot attack in melee.

## Movement

A move goes in a straight orthogonal line (up, down, left, right), 1 to `move` squares. Every square passed over must be empty: no jumping. Exception, rule toggle `knightsJump` (default off): a piece whose kinds include K passes over occupied squares.

The destination may be empty (a move) or hold an enemy piece (an attack, see below). It may not hold a friendly piece.

## Melee attack

An attack is a move whose destination holds an enemy. It needs the same clear path as a move and the attacker needs strength above 0.

Attacker strength `a`, defender strength `d`. The attacker loses `d`, the defender loses `a`. Dead pieces are removed. If the defender dies and the attacker lives, the attacker moves into the square. If the attacker dies, the defender stays where it is. With this rule at most one of the two survives, and the given examples come out as stated:

- Soldier (1) attacks soldier (1): both die.
- Knight (3) attacks soldier (1): soldier dies, knight ends at 2.
- Soldier (1) attacks knight (3): soldier dies, knight ends at 2.
- Soldier (1) attacks knight at 1: both die.
- Knight at 2 attacks knight at 3: attacker dies, defender ends at 1.
- Anything with strength above 0 attacks an archer: the archer dies, the attacker loses nothing.

## Fire

A piece with fire strength above 0 may fire at one enemy piece within its fire range. The target loses the fire strength; the shooter loses nothing and does not move. Fire needs no clear path.

Rule toggle `diagonalFire` (default on): the target may be in any direction, distance measured as max(|dr|, |dc|). With it off, the target must be in the same row or column, distance measured along that line.

## Turn

A turn belongs to one player. The player activates pieces one at a time; each activated piece takes exactly one action (move, attack, fire or heal) and is then locked for the rest of the turn.

The pieces that move, attack or fire in one turn are limited by these combinations, counted by combo kind: `K+S`, `K+A`, `S+S+S`, `A+S+S`, `A+A+S`. Fewer pieces than a full combination is allowed. A piece may be activated when the multiset of combo kinds used so far, plus this piece's kind, is a sub-multiset of at least one combination. So at most one knight per turn, and with a knight only one other piece.

The combo kind of a hybrid is K if its kinds include K, else A if they include A, else S.

Healing is outside the combination count: any number of injured pieces may heal in a turn, but a healing piece takes no other action that turn and a piece that has acted cannot heal. Healing adds 0.5 strength, capped at max strength. Heal is applied immediately.

The turn ends when the player ends it explicitly. Within a turn the player may undo actions one at a time (the UI keeps state snapshots; the engine is immutable so this is a matter of keeping the previous state).

At the start of a turn, if the player to move has no legal action at all (no move, attack, fire or heal available), the turn passes to the other player with a `pass` event. If neither player has a legal action, the game is a draw.

The first player is chosen at random when a game starts, and the UI says who starts.

## Merge (promotion)

When a piece that has a single kind ends a move or attack alive on its far row, the player chooses a kind (S, K or A, its own kind included) to merge with, or declines. The engine sets `pendingMerge` to that piece's id; until it is resolved by `merge` or `skipMerge`, no other action is legal, `endTurn` included.

A merged piece is a hybrid with two kinds `[own, chosen]`. Its stats: max strength is the sum of the two base strengths; current strength is the old current strength plus the chosen kind's base strength; move is the max of the two; fire strength is the sum; fire range is the sum. A hybrid never merges again. Examples: K+A moves 4, strength 3, fires 2 at range 1. K+K moves 4, strength 6. S+S moves 2, strength 2. A+A moves 2, strength 0, fires 4 at range 2. S+A moves 2, strength 1, fires 2 at range 1.

## End of game

A player with no pieces loses. If both players lose their last pieces in the same attack, the game is a draw. Checked after every action.

# Engine API

`window.WarGame.Engine` exposes these. State objects are plain JSON-serializable data; every function returns a new state and never mutates its input.

```
KINDS: { S: {str:1, move:2, fire:0, range:0}, K: {...}, A: {...} }
COMBOS: [['K','S'], ['K','A'], ['S','S','S'], ['A','S','S'], ['A','A','S']]

newGame(rules?, firstPlayer?) -> state
  rules: { diagonalFire: true, knightsJump: false } merged over defaults
  firstPlayer: 0 or 1; random when omitted (use Math.random)

state = {
  rules,
  pieces: { [id: string]: { id, owner: 0|1, kinds: ['K'] | ['K','A'], str, maxStr, row, col } },
  turn: { player: 0|1, number: 1, used: [{ id, kind: 'K'|'A'|'S'|null }] },   // kind null for a heal
  pendingMerge: id | null,
  winner: null | 0 | 1 | 'draw',
  firstPlayer: 0|1
}

pieceStats(piece) -> { str, maxStr, move, fire, range, comboKind }
comboKind(piece) -> 'K' | 'A' | 'S'
pieceAt(state, row, col) -> piece | null
piecesOf(state, player) -> piece[]
usedKinds(state) -> ['K', ...] (kinds of the non-heal entries in turn.used)
activatableKinds(state) -> Set of combo kinds that may still be added this turn
canActivate(state, id) -> boolean   (owner is turn.player, not in turn.used, no pendingMerge, no winner, kind fits)
canHeal(state, id) -> boolean       (owner is turn.player, not in turn.used, str < maxStr, no pendingMerge, no winner)
legalActions(state, id) -> [ {type:'move', to:{row,col}} | {type:'attack', target:id} | {type:'fire', target:id} | {type:'heal'} ]
    empty when the piece cannot act. Move/attack/fire entries only when canActivate; heal only when canHeal.
hasAnyAction(state) -> boolean   (some piece of turn.player has a legal action)
apply(state, action) -> { state, events }   throws Error('illegal action') on an illegal action
    actions:
      { type:'move', piece:id, to:{row,col} }
      { type:'attack', piece:id, target:id }
      { type:'fire', piece:id, target:id }
      { type:'heal', piece:id }
      { type:'merge', piece:id, kind:'S'|'K'|'A' }
      { type:'skipMerge', piece:id }
      { type:'endTurn' }
    events, in the order they happened:
      { type:'move', id, from:{row,col}, to:{row,col} }
      { type:'attack', attacker:id, defender:id, from, to, attackerLoss, defenderLoss }
      { type:'fire', shooter:id, target:id, damage }
      { type:'die', id, owner, at:{row,col} }
      { type:'heal', id, amount, str }
      { type:'mergePending', id }
      { type:'merge', id, kinds }
      { type:'turnEnd', player }            // the player whose turn ended
      { type:'turnStart', player, number }
      { type:'pass', player }               // a player who had no legal action was skipped
      { type:'gameOver', winner }           // 0, 1 or 'draw'
serialize(state) -> string  ('WG1.' + base64 of JSON, url-safe)
deserialize(string) -> state   throws on a bad string
```

`endTurn` switches the player, increments the number, clears `used`, and emits `turnEnd` then `turnStart`. If the new player has no legal action it emits `pass` and switches again; if the original player has none either, `winner` becomes `'draw'` and `gameOver` is emitted.

Piece ids: `p0-0` to `p0-15` and `p1-0` to `p1-15`, stable for the game.

# Engine tests

`tests/engine.test.html` asserts at least:

- Setup: 32 pieces, each player 8 S on the back row, 4 K at row 1 or 6 columns 2 to 5, 4 A at row 2 or 5 columns 2 to 5.
- The six melee examples above, with the survivor's position.
- Move range: a soldier reaches 1 or 2 squares in a line, a knight up to 4; blocked by any piece in the path; jumping only for K kinds with `knightsJump`.
- No diagonal moves. No move onto a friendly piece.
- An archer has no attack actions.
- Fire: range 1, diagonal allowed by default, not allowed with `diagonalFire: false`; a knight at 3 drops to 1; a soldier dies; a knight at 2 dies.
- Combos: after K, only S or A is activatable, not K; after S+S, A or S is activatable, not K; after A+A, only S; after A+S+S, nothing; three archers are never all activatable.
- Heal: +0.5 up to max, a healed piece cannot move, a moved piece cannot heal, healing does not consume a combo slot (K heals, then K cannot move, but S+S+S may all move).
- Merge: a soldier reaching row 7 gets `pendingMerge`; `endTurn` throws while pending; `merge` with K gives kinds [S,K], maxStr 4, str 4, move 4; `merge` A gives fire 2 range 1; a hybrid reaching the far row again gets no `pendingMerge`; `skipMerge` clears it.
- Win: killing the last enemy piece sets winner; mutual last-piece death sets 'draw'.
- Pass: a player with no legal action is skipped.
- `serialize` then `deserialize` reproduces the state (deep equal).
- `apply` never mutates its input (deep-compare the input before and after).

# UI

## Screens

- Menu: title, New game, Continue (only when a saved game exists), Rules, Settings, language switch (עברית / English).
- Game: the board, a turn panel, and the buttons End turn, Undo, Menu. The turn panel shows whose turn it is (player color swatch and name), the turn number, which combo kinds have been used and which may still be activated.
- Merge dialog: the piece's icon and three choices (Soldier, Knight, Archer) with the resulting stats, plus Keep as is.
- Game over overlay: the winner (or draw), Play again, Menu.
- Rules screen: the full rules in the current language, written for a player, with the piece table and the combination list.
- Settings screen: language; player 1 color and player 2 color (native `<input type="color">`, full spectrum); light square color, dark square color; a Random colorful board switch (every square gets its own soft random color; a Reshuffle button); six presets (Wood, Marble, Forest, Ocean, Rose, Night); animations on/off; coordinates on/off; rule toggles Diagonal fire and Knights jump, applied at the next new game; Export game (copies the serialized code, and shows it in a text field for manual copying) and Import game (paste a code). Settings persist in `localStorage` under `wargame.settings`; the game autosaves under `wargame.game` after every action.

## Board and pieces

The board is a square that fits the shorter side of the viewport minus the panel. The panel sits at the inline end of the board in landscape and below it in portrait. The board container has `direction: ltr` always: the board does not mirror when the interface is right-to-left; only the text and the panels do.

Pieces are inline SVG from `icons.js`, filled with the owner's color, with a contrasting outline (dark outline on a light color, light outline on a dark color, computed from the color's luminance) and a soft shadow, so they read on any square color. Player 0 pieces face up the board and player 1 pieces face down, if the glyphs have a facing.

Glyphs: soldier, a helmet over a shield; knight, a horse head as in chess; archer, a drawn bow with an arrow. A hybrid shows the first kind's glyph with the second kind's glyph small at the top corner. A strength badge sits at the bottom corner and shows the current strength (`2.5` style); it is hidden for strength 0 pieces. An injured piece's badge is amber. A used piece is dimmed. A piece that may still be activated has a faint ring on hover.

Tap a piece: it becomes selected, legal moves show as soft dots, attack targets as a red ring, fire targets as an orange ring with a small bow mark; if it can heal, a Heal button appears in the panel and on the piece. Tap a dot or a target to act. Tap the piece again or an empty square to deselect. Pieces that cannot act are not selectable, but tapping one shows why in one line in the panel (already used, or the combination is full).

## Animations

Simple, 2D, short (200 to 400 ms), all with CSS transitions or keyframes, respected by the animations setting and by `prefers-reduced-motion`.

- Move: the piece slides.
- Attack: the attacker lunges into the defender's square; floating loss numbers rise from both; the dead piece shrinks and fades; the survivor settles.
- Fire: an arrow line flies from shooter to target; the target flashes; loss number rises.
- Heal: a green pulse ring and a rising `+0.5`.
- Merge: a burst of small colored particles on the square and the new glyph fades in.
- Turn change: a banner in the new player's color slides across the board for a moment.

Play the animations by consuming the events list from `Engine.apply`, then render the new state. Input is blocked while animating.

## Colors

Defaults: player 0 `#efe6cf` (cream), player 1 `#2f3550` (navy), light square `#efe0c3`, dark square `#a97e57`. Presets set the four colors together. The random colorful board picks a hue per square, saturation around 45 percent, lightness alternating around 72 and 58 by square parity so the checker pattern still reads. The random layout is regenerated by the Reshuffle button and stored with the settings.

## Language and direction

`document.documentElement.lang` and `dir` follow the language (`he` / `rtl`, `en` / `ltr`). Default language on first run: Hebrew when `navigator.language` starts with `he`, else English. All layout uses logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`) so that RTL comes for free. Numbers and codes are wrapped in `<bdi>` or `dir="ltr"` spans. Icons that imply direction (back arrows) flip in RTL via `[dir=rtl] .icon-back { transform: scaleX(-1) }`. The Hebrew must read like Hebrew written by a native speaker, not like a translation: short, natural wording, correct gender agreement for the buttons (imperative addressing the player is avoided where a noun works: "משחק חדש", "הגדרות", "סיום תור", "ביטול").

Hebrew terms: Soldier חייל, Knight פרש, Archer קשת, Strength כוח, Move (n.) תנועה, Attack תקיפה, Fire ירי, Heal ריפוי, Merge מיזוג, Hybrid כלאיים, Turn תור, End turn סיום תור, Undo ביטול, Player 1 שחקן 1, Player 2 שחקן 2, Winner המנצח, Draw תיקו, Rules חוקים, Settings הגדרות, New game משחק חדש, Continue המשך, Menu תפריט, Language שפה, Board לוח, Colors צבעים, Random colorful board לוח צבעוני אקראי, Reshuffle ערבוב מחדש, Presets ערכות צבע, Animations אנימציות, Coordinates קואורדינטות, Export game ייצוא משחק, Import game ייבוא משחק, Copy העתקה, Paste הדבקה, Play again משחק נוסף, Keep as is להשאיר כמו שהוא, Game name משחק מלחמה.

## iPad

`<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` black-translucent, `touch-action: manipulation` on the app, `-webkit-tap-highlight-color: transparent`, `-webkit-user-select: none` on the board, safe-area padding with `env(safe-area-inset-*)`. Use pointer events. Prevent double-tap zoom on the board.

# Build

`build.py` (Python 3, standard library only): read `src/index.html`; replace each `<link rel="stylesheet" href="X">` with `<style>` + the file's content + `</style>`; replace each `<script src="X"></script>` with `<script>` + content + `</script>`; write `WarGame.html` beside `build.py`, UTF-8, no BOM. Print the output path and size.
