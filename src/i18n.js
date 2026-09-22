/* i18n.js - all user visible strings, Hebrew and English.
   window.WarGame.I18N = { langs, current, set(lang), t(key, vars) } */

window.WarGame = window.WarGame || {};

(function () {
  'use strict';

  /* ---------------------------------------------------------------- Hebrew */

  var he = {
    'app.title': 'משחק מלחמה',

    'menu.newGame': 'משחק חדש',
    'menu.continue': 'המשך',
    'menu.rules': 'חוקים',
    'menu.settings': 'הגדרות',

    'game.endTurn': 'סיום תור',
    'game.undo': 'ביטול',
    'game.menu': 'תפריט',
    'game.turn': 'תור {n}',

    'player.0': 'שחקן 1',
    'player.1': 'שחקן 2',

    'kind.S': 'חייל',
    'kind.K': 'פרש',
    'kind.A': 'קשת',

    'action.move': 'תנועה',
    'action.attack': 'תקיפה',
    'action.fire': 'ירי',
    'action.heal': 'ריפוי',
    'action.merge': 'מיזוג',

    'stat.piece': 'כלי',
    'stat.str': 'כוח',
    'stat.move': 'תנועה',
    'stat.fire': 'ירי',
    'stat.range': 'טווח',
    'stat.none': '—',

    'panel.used': 'הופעלו',
    'panel.available': 'אפשר עוד',
    'panel.nothing': 'אין',

    'msg.start': '{name} פותח',
    'msg.used': 'הכלי כבר פעל בתור הזה',
    'msg.comboFull': 'אין מקום לעוד {kind} בתור הזה',
    'msg.cannot': 'הכלי לא יכול לפעול עכשיו',
    'msg.pass': 'ל{name} אין מהלך אפשרי, התור עובר',
    'msg.pending': 'צריך להשלים את המיזוג',

    'merge.title': 'מיזוג',
    'merge.text': 'הכלי הגיע לשורה האחרונה ואפשר למזג אותו עם סוג נוסף.',
    'merge.keep': 'להשאיר כמו שהוא',

    'over.win': 'המנצח: {name}',
    'over.draw': 'תיקו',
    'over.playAgain': 'משחק נוסף',

    'rules.title': 'חוקים',

    'settings.title': 'הגדרות',
    'settings.language': 'שפה',
    'settings.colors': 'צבעים',
    'settings.p0': 'צבע שחקן 1',
    'settings.p1': 'צבע שחקן 2',
    'settings.sqLight': 'משבצת בהירה',
    'settings.sqDark': 'משבצת כהה',
    'settings.randomBoard': 'לוח צבעוני אקראי',
    'settings.reshuffle': 'ערבוב מחדש',
    'settings.presets': 'ערכות צבע',
    'settings.display': 'תצוגה',
    'settings.animations': 'אנימציות',
    'settings.coordinates': 'קואורדינטות',
    'settings.gameRules': 'אפשרויות משחק',
    'settings.diagonalFire': 'ירי באלכסון',
    'settings.knightsJump': 'פרשים מדלגים',
    'settings.rulesNote': 'האפשרויות יחולו במשחק הבא',
    'settings.transfer': 'העברת משחק',
    'settings.export': 'ייצוא משחק',
    'settings.import': 'ייבוא משחק',
    'settings.copy': 'העתקה',
    'settings.paste': 'הדבקה',
    'settings.exportHint': 'הקוד של המשחק הנוכחי. אפשר להעתיק אותו ולפתוח אותו במכשיר אחר.',
    'settings.importHint': 'כאן מדביקים קוד של משחק.',
    'settings.copied': 'הקוד הועתק',
    'settings.copyFail': 'ההעתקה לא הצליחה, אפשר לסמן את הקוד ולהעתיק ידנית',
    'settings.imported': 'המשחק נטען',
    'settings.importBad': 'הקוד אינו תקין',
    'settings.noGame': 'אין משחק לייצוא',
    'settings.pasteFail': 'הדפדפן לא נתן גישה ללוח הגזירים, אפשר להדביק בשדה ידנית',

    'preset.wood': 'עץ',
    'preset.marble': 'שיש',
    'preset.forest': 'יער',
    'preset.ocean': 'אוקיינוס',
    'preset.rose': 'ורד',
    'preset.night': 'לילה',

    'common.back': 'חזרה',

    rules: [
      ['h', 'המשחק'],
      ['p', 'משחק מלחמה הוא משחק לשני שחקנים על מכשיר אחד, על לוח של 8 על 8. לכל שחקן שישה עשר כלים, ומנצחים כשלא נשאר ליריב אף כלי.'],

      ['h', 'הפתיחה'],
      ['p', 'שחקן 1 נערך בשלוש השורות הקרובות ומתקדם אל הצד הרחוק, ושחקן 2 נערך בשלוש השורות הרחוקות ומתקדם אל הצד הקרוב. בכל צבא שמונה חיילים בשורה האחורית, ארבעה פרשים לפניהם וארבעה קשתים לפני הפרשים. מי פותח נקבע בהגרלה.'],

      ['h', 'הכלים'],
      ['pieceTable'],
      ['p', 'הכוח הוא כוחו של הכלי בתקיפה, והוא משתנה במהלך המשחק בקפיצות של חצי נקודה. לכל כלי יש כוח נוכחי וכוח מרבי, וכלי שכוחו יורד לאפס או פחות מת ויורד מהלוח. לקשת אין כוח תקיפה: הוא אינו תוקף בכלל, וכל תקיפה עליו הורגת אותו.'],

      ['h', 'תנועה'],
      ['p', 'כלי נע בקו ישר למעלה, למטה, ימינה או שמאלה, ממשבצת אחת ועד מספר המשבצות של התנועה שלו. כל המשבצות בדרך חייבות להיות פנויות, ואסור לעצור על משבצת של כלי מאותו צבא. כשהאפשרות "פרשים מדלגים" מופעלת, פרש עובר מעל כלים בדרך. גם כלאיים שיש בהם פרש מדלגים.'],

      ['h', 'תקיפה'],
      ['p', 'תנועה אל משבצת של כלי יריב היא תקיפה, והדרך אליה צריכה להיות פנויה בדיוק כמו בתנועה רגילה. כל צד מאבד את כוחו של הצד השני: התוקף מאבד את כוח המגן והמגן מאבד את כוח התוקף, ולכן לכל היותר אחד מהשניים שורד. אם המגן מת והתוקף נשאר בחיים, התוקף נכנס למשבצת. אם התוקף מת, המגן נשאר במקומו.'],
      ['ul', [
        'חייל תוקף חייל: שניהם מתים.',
        'פרש (3) תוקף חייל (1): החייל מת ולפרש נשארים 2.',
        'חייל (1) תוקף פרש (3): החייל מת ולפרש נשארים 2.',
        'חייל (1) תוקף פרש שכוחו 1: שניהם מתים.',
        'פרש שכוחו 2 תוקף פרש שכוחו 3: התוקף מת ולמגן נשאר 1.',
        'כל תקיפה על קשת הורגת אותו ולא עולה לתוקף דבר.'
      ]],

      ['h', 'ירי'],
      ['p', 'קשת יורה בכלי יריב שנמצא בטווח שלו. המטרה מאבדת 2, הקשת לא זז ולא נפגע, והירי עובר מעל כלים אחרים. כל כלי שיש לו כוח ירי יורה באותו אופן, ולכן גם כלאיים שיש בהם קשת יורים. כברירת מחדל הירי מותר בכל כיוון, גם באלכסון. כשהאפשרות "ירי באלכסון" כבויה, המטרה חייבת להיות באותה שורה או באותה עמודה. הטווח נמדד לפי הגדול מבין המרחק בשורות והמרחק בעמודות, וכשהאפשרות כבויה לפי המרחק לאורך השורה או העמודה.'],

      ['h', 'התור'],
      ['p', 'בתור מפעילים כלים אחד אחד. כלי שהופעל עושה פעולה אחת בלבד, תנועה או תקיפה או ירי, ואז הוא נעול עד סוף התור. אי אפשר להפעיל כל צירוף שרוצים: הכלים שפועלים בתור אחד חייבים להתאים לאחד הצירופים האלה.'],
      ['combos'],
      ['p', 'מותר תמיד להפעיל פחות כלים. מכאן שבתור אחד פועל פרש אחד לכל היותר, וכשפועל פרש נשאר מקום לכלי אחד בלבד. כלאיים נספרים לפי הפרש שבהם, ואם אין בהם פרש לפי הקשת שבהם, ואם אין גם קשת לפי החייל. התור נגמר בלחיצה על "סיום תור", ועד אז אפשר לבטל את הפעולות אחת אחת.'],

      ['h', 'ריפוי'],
      ['p', 'בכל תור אפשר לרפא כמה כלים פצועים שרוצים, והריפוי אינו נספר בצירופים. ריפוי מוסיף חצי נקודת כוח, ולא מעבר לכוח המרבי של הכלי. כלי שמתרפא לא עושה שום דבר אחר באותו תור, וכלי שכבר פעל אינו יכול להתרפא.'],

      ['h', 'מיזוג'],
      ['p', 'כלי בן סוג אחד שמסיים תנועה או תקיפה בחיים בשורה האחרונה יכול להתמזג עם סוג שבוחרים, חייל או פרש או קשת וגם הסוג שלו עצמו, או להישאר כמו שהוא. עד שבוחרים אי אפשר לעשות שום דבר אחר, גם לא לסיים את התור. בכלאיים שנוצרו שני סוגים: הכוח המרבי הוא סכום שני הכוחות, הכוח הנוכחי גדל בכוח הסוג שנוסף, התנועה היא הגדולה מבין השתיים, וכוח הירי והטווח הם סכום השניים. כלאיים לא מתמזגים שוב.'],
      ['ul', [
        'פרש וקשת: תנועה 4, כוח 3, ירי 2 בטווח 1.',
        'פרש ופרש: תנועה 4, כוח 6.',
        'חייל וחייל: תנועה 2, כוח 2.',
        'קשת וקשת: תנועה 2, כוח 0, ירי 4 בטווח 2.',
        'חייל וקשת: תנועה 2, כוח 1, ירי 2 בטווח 1.'
      ]],

      ['h', 'סוף המשחק'],
      ['p', 'שחקן שלא נשאר לו אף כלי מפסיד. אם הכלים האחרונים של שני הצדדים נופלים באותה תקיפה, המשחק מסתיים בתיקו. שחקן שאין לו שום מהלך אפשרי מדלג על התור, ואם לשני השחקנים אין מהלך, התוצאה תיקו.']
    ]
  };

  /* --------------------------------------------------------------- English */

  var en = {
    'app.title': 'War Game',

    'menu.newGame': 'New game',
    'menu.continue': 'Continue',
    'menu.rules': 'Rules',
    'menu.settings': 'Settings',

    'game.endTurn': 'End turn',
    'game.undo': 'Undo',
    'game.menu': 'Menu',
    'game.turn': 'Turn {n}',

    'player.0': 'Player 1',
    'player.1': 'Player 2',

    'kind.S': 'Soldier',
    'kind.K': 'Knight',
    'kind.A': 'Archer',

    'action.move': 'Move',
    'action.attack': 'Attack',
    'action.fire': 'Fire',
    'action.heal': 'Heal',
    'action.merge': 'Merge',

    'stat.piece': 'Piece',
    'stat.str': 'Strength',
    'stat.move': 'Move',
    'stat.fire': 'Fire',
    'stat.range': 'Range',
    'stat.none': '—',

    'panel.used': 'Used',
    'panel.available': 'Available',
    'panel.nothing': 'none',

    'msg.start': '{name} starts',
    'msg.used': 'That piece has already acted this turn',
    'msg.comboFull': 'No room for another {kind} this turn',
    'msg.cannot': 'That piece cannot act now',
    'msg.pass': '{name} has no legal action, the turn passes',
    'msg.pending': 'Finish the merge first',

    'merge.title': 'Merge',
    'merge.text': 'The piece reached the far row. You may merge it with another kind.',
    'merge.keep': 'Keep as is',

    'over.win': 'Winner: {name}',
    'over.draw': 'Draw',
    'over.playAgain': 'Play again',

    'rules.title': 'Rules',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.colors': 'Colors',
    'settings.p0': 'Player 1 color',
    'settings.p1': 'Player 2 color',
    'settings.sqLight': 'Light square',
    'settings.sqDark': 'Dark square',
    'settings.randomBoard': 'Random colorful board',
    'settings.reshuffle': 'Reshuffle',
    'settings.presets': 'Presets',
    'settings.display': 'Display',
    'settings.animations': 'Animations',
    'settings.coordinates': 'Coordinates',
    'settings.gameRules': 'Game options',
    'settings.diagonalFire': 'Diagonal fire',
    'settings.knightsJump': 'Knights jump',
    'settings.rulesNote': 'Applied at the next new game',
    'settings.transfer': 'Transfer a game',
    'settings.export': 'Export game',
    'settings.import': 'Import game',
    'settings.copy': 'Copy',
    'settings.paste': 'Paste',
    'settings.exportHint': 'The code of the current game. Copy it and open it on another device.',
    'settings.importHint': 'Paste a game code here.',
    'settings.copied': 'Code copied',
    'settings.copyFail': 'Copying failed, select the code and copy it by hand',
    'settings.imported': 'Game loaded',
    'settings.importBad': 'That code is not valid',
    'settings.noGame': 'No game to export',
    'settings.pasteFail': 'The browser gave no access to the clipboard, paste into the field by hand',

    'preset.wood': 'Wood',
    'preset.marble': 'Marble',
    'preset.forest': 'Forest',
    'preset.ocean': 'Ocean',
    'preset.rose': 'Rose',
    'preset.night': 'Night',

    'common.back': 'Back',

    rules: [
      ['h', 'The game'],
      ['p', 'War Game is a game for two players on one device, on an 8 by 8 board. Each player has sixteen pieces, and you win when your opponent has none left.'],

      ['h', 'Setup'],
      ['p', 'Player 1 sets up on the three near rows and advances toward the far side; Player 2 sets up on the three far rows and advances toward the near side. Each army has eight soldiers on the back row, four knights in front of them and four archers in front of the knights. Who starts is drawn at random.'],

      ['h', 'The pieces'],
      ['pieceTable'],
      ['p', 'Strength is the strength of a piece in an attack, and it changes during the game in steps of half a point. Every piece has a current strength and a maximum strength, and a piece whose strength drops to zero or below dies and leaves the board. An archer has no attack strength: it never attacks, and any attack on it kills it.'],

      ['h', 'Moving'],
      ['p', 'A piece moves in a straight line up, down, left or right, from one square up to its move number. Every square along the way must be empty, and a piece may not land on a piece of its own. With the Knights jump option on, a knight passes over pieces in its path. A hybrid that includes a knight jumps as well.'],

      ['h', 'Attacking'],
      ['p', 'Moving onto the square of an enemy piece is an attack, and it needs the path to be as clear as an ordinary move. Each side loses the strength of the other: the attacker loses the defender’s strength and the defender loses the attacker’s, so at most one of the two survives. If the defender dies and the attacker is still alive, the attacker takes the square; if the attacker dies, the defender stays where it is.'],
      ['ul', [
        'Soldier attacks soldier: both die.',
        'Knight (3) attacks soldier (1): the soldier dies and the knight is left with 2.',
        'Soldier (1) attacks knight (3): the soldier dies and the knight is left with 2.',
        'Soldier (1) attacks a knight at 1: both die.',
        'A knight at 2 attacks a knight at 3: the attacker dies and the defender is left with 1.',
        'Any attack on an archer kills it and costs the attacker nothing.'
      ]],

      ['h', 'Firing'],
      ['p', 'An archer fires at an enemy piece within its range. The target loses 2, the archer neither moves nor takes damage, and the shot passes over other pieces. Any piece with firing strength fires the same way, so a hybrid that includes an archer fires too. By default firing is allowed in any direction, diagonals included; with the Diagonal fire option off, the target must be on the same row or the same column. Range is measured as the larger of the row distance and the column distance, and along the row or the column when diagonal fire is off.'],

      ['h', 'The turn'],
      ['p', 'On a turn you activate pieces one at a time. An activated piece does exactly one thing, a move or an attack or a shot, and is then locked for the rest of the turn. You may not activate any set of pieces you like: the pieces that act in one turn have to fit one of these combinations.'],
      ['combos'],
      ['p', 'Fewer pieces are always allowed. So one turn holds at most one knight, and a knight leaves room for one other piece only. For a hybrid the kind that counts is knight if it has one, otherwise archer if it has one, otherwise soldier. The turn ends when you press End turn, and until then you can undo your actions one by one.'],

      ['h', 'Healing'],
      ['p', 'Any number of injured pieces may heal in a turn, and healing is outside the combinations. Healing adds half a point of strength and never goes above the maximum strength of the piece. A piece that heals does nothing else that turn, and a piece that has acted cannot heal.'],

      ['h', 'Merging'],
      ['p', 'A piece of a single kind that ends a move or an attack alive on the far row may merge with a kind of your choice, soldier or knight or archer and its own kind included, or stay as it is. Until that choice is made no other action is possible, End turn included. The hybrid that comes out has two kinds: its maximum strength is the two strengths added, its current strength grows by the strength of the added kind, its move is the better of the two, and its firing strength and range are the two added. A hybrid never merges again.'],
      ['ul', [
        'Knight and archer: move 4, strength 3, fires 2 at range 1.',
        'Knight and knight: move 4, strength 6.',
        'Soldier and soldier: move 2, strength 2.',
        'Archer and archer: move 2, strength 0, fires 4 at range 2.',
        'Soldier and archer: move 2, strength 1, fires 2 at range 1.'
      ]],

      ['h', 'End of the game'],
      ['p', 'A player left with no pieces loses. If the last pieces of both players fall in the same attack, the game is a draw. A player with no legal action at all skips the turn, and if neither player has a legal action the result is a draw.']
    ]
  };

  /* ------------------------------------------------------------------- API */

  var I18N = {
    langs: { he: he, en: en },
    current: 'en',

    set: function (lang) {
      if (this.langs[lang]) this.current = lang;
      return this.current;
    },

    dict: function () {
      return this.langs[this.current] || this.langs.en;
    },

    dir: function () {
      return this.current === 'he' ? 'rtl' : 'ltr';
    },

    t: function (key, vars) {
      var s = this.dict()[key];
      if (s === undefined) s = this.langs.en[key];
      if (s === undefined) return key;
      if (vars) {
        s = s.replace(/\{(\w+)\}/g, function (m, name) {
          return vars[name] !== undefined ? String(vars[name]) : m;
        });
      }
      return s;
    },

    /* the blocks of the Rules screen in the current language */
    rules: function () {
      return this.dict().rules || this.langs.en.rules;
    }
  };

  window.WarGame.I18N = I18N;
})();
