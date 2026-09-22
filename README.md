War Game is a two-player board game on a chess board, played by two people on one screen. It runs in the browser on a phone, an iPad or a PC, in Hebrew or in English, from one link with nothing to install: https://leoreh.github.io/Cole-s-War-Game/

# Phone And iPad

Open the link in Safari and play. For an app icon and a full screen, tap Share, then Add to Home Screen. After the first visit the game also opens without internet. The Invite button in the game menu sends the link and these two steps to a friend, in the game's language.

A game in progress moves between devices by a code: Settings, Transfer, Export game copies the code, and Import game on the other device restores the position. Share this game in the Invite card sends a link that opens the same position.

The game autosaves after every action, so Resume on the menu continues the last game on the same device.

# PC

The same link works in Chrome or Edge. Without internet, `WarGame.html` from this repository opens the whole game from a double click.

# Rules

Each side has 8 soldiers, 4 knights and 4 archers. A soldier hits for 1 and has 1 health. A knight hits for 3, has 3 health and moves 4 squares. An archer cannot hit but shoots for 2 at up to two squares along a row or column, and has 3 health.

A turn moves one knight with one other piece, or three pieces without a knight and with at most two archers. Injured pieces heal half a point a turn instead of moving. A piece that crosses the board merges with a kind of its choice into a hybrid. The last side with pieces wins. The full rules are in the game under Rules, and as implemented in `dev/spec.md`.

# Development

The sources are under `src`, one file per concern. The rules are in `engine.js`, the screens and animations in `ui.js`, every string in both languages in `i18n.js` and the piece sets of the themes in `themes.js`. `tests/engine.test.html` runs the rules tests in the browser. `python build.py` builds `docs/index.html`, which GitHub Pages serves from the `main` branch, and `WarGame.html`. `dev/themes.html` shows every theme's pieces at three sizes.
