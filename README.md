---
Time: 2026-09-22T12:00:00
aliases:
maturity: seed
parent:
---
War Game is a two-player board game on a chess board, played by two people on one screen, on a PC or on an iPad. The whole game is the one file `WarGame.html`: no installation, no network, no dependencies. The interface is in Hebrew and in English, chosen from the menu.

# Playing

On a PC, opening `WarGame.html` in Chrome or Edge starts the game.

On an iPad the file has to come from a web address. A file opened from the Files app may be shown as a preview that does not run the game. One way is to serve the folder from the PC with the command below, while both devices are on the same Wi-Fi. Safari then opens `http://<the PC's address>:8770/WarGame.html`. The other way is to put the one file on any static host, such as GitHub Pages, and open its address. In Safari, Share then Add to Home Screen gives it an icon and a full screen.

```
python -m http.server 8770 --directory "D:\Vaults\Obsi_Code\War Game"
```

A game in progress moves between devices by a code: Settings, Export game copies the code, and Import game on the other device restores the position. The same code opens a game directly as `WarGame.html#g=<code>` when the file is served from a web address.

The game autosaves after every action, so Continue on the menu resumes the last game on the same device.

# Development

The sources are under `src`, one file per concern. `engine.js` holds the rules and nothing else. `ui.js` holds the screens and animations, `i18n.js` every string in both languages, `icons.js` the piece glyphs and `style.css` the looks. `tests/engine.test.html` runs the rules tests in the browser. `python build.py` inlines the sources into `WarGame.html`, so an edit to `src` is not in the game until the build is run. The rules as implemented, with the decisions made where the original description was open, are in `dev/spec.md`.
