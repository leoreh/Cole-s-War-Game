/* i18n.js - all user visible strings, Hebrew and English.
   window.WarGame.I18N = { langs, current, set(lang), t(key, vars), rules() } */

window.WarGame = window.WarGame || {};

(function () {
  'use strict';

  /* ---------------------------------------------------------------- Hebrew */

  var he = {
    /* the wordmark: title1 over title2 as they are drawn, title for one line.
       In Hebrew the credit is a byline and reads under the name, and it is
       never cut to 'של קול', which on its own says voice */
    'app.title': 'משחק מלחמה מבית היוצר של קול',
    'app.title1': 'משחק מלחמה',
    'app.title2': 'מבית היוצר של קול',

    'game.newGame': 'משחק חדש',
    'game.endTurn': 'סיום תור',
    'game.undo': 'ביטול',
    'game.turn': 'תור {n}',
    'game.appearance': 'מראה',
    'game.share': 'שיתוף',
    'game.confirmNew': 'המשחק הנוכחי יאבד.',
    'game.start': 'התחלה',
    'game.opponent': 'יריב',
    'game.level': 'רמה',

    'opp.human': 'שני שחקנים',
    'opp.computer': 'מול המחשב',
    'level.easy': 'קל',
    'level.medium': 'בינוני',
    'level.hard': 'קשה',

    'player.0': 'שחקן 1',
    'player.1': 'שחקן 2',
    /* מול המחשב האדם הוא תמיד שחקן 0; השמות האלה נייטרליים מבחינת מין */
    'player.you': 'הצד שלך',
    'player.computer': 'המחשב',

    'kind.S': 'חייל',
    'kind.K': 'אביר',
    'kind.A': 'קשת',

    'action.move': 'תנועה',
    'action.attack': 'תקיפה',
    'action.fire': 'ירי',
    'action.heal': 'ריפוי',
    'action.merge': 'מיזוג',

    'stat.piece': 'כלי',
    'stat.hp': 'בריאות',
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
    'msg.pass': '{name}: אין מהלך אפשרי, התור עובר',
    'msg.pending': 'צריך להשלים את המיזוג',
    'msg.mayFire': 'הכלי יכול עדיין לירות',
    'msg.thinking': 'המחשב חושב…',

    'merge.title': 'מיזוג',
    'merge.text': 'הכלי הגיע לשורה האחרונה ואפשר למזג אותו עם סוג נוסף.',
    'merge.keep': 'להשאיר כמו שהוא',

    'over.win': 'המנצח: {name}',
    'over.draw': 'תיקו',
    'over.playAgain': 'משחק נוסף',

    'rules.title': 'חוקים',

    'settings.title': 'הגדרות',
    'settings.theme': 'ערכת נושא',
    'settings.colors': 'צבעים',
    'settings.p0': 'צבע שחקן 1',
    'settings.p1': 'צבע שחקן 2',
    'settings.sqLight': 'משבצת בהירה',
    'settings.sqDark': 'משבצת כהה',
    'settings.randomBoard': 'לוח צבעוני אקראי',
    'settings.reshuffle': 'ערבוב מחדש',
    'settings.presets': 'ערכות צבע',
    'settings.animations': 'אנימציות',
    'settings.coordinates': 'קואורדינטות',
    'settings.diagonalMoves': 'תנועה באלכסון',
    'settings.rulesNote': 'חל מהמשחק הבא',
    'settings.language': 'שפה',
    'settings.build': 'גרסה {v}',

    'theme.classic': 'קלאסי',
    'theme.heraldic': 'הרלדי',
    'theme.ink': 'דיו',
    'theme.neon': 'ניאון',
    'theme.toy': 'צעצוע',

    'preset.wood': 'עץ',
    'preset.marble': 'שיש',
    'preset.forest': 'יער',
    'preset.ocean': 'אוקיינוס',
    'preset.rose': 'ורד',
    'preset.night': 'לילה',

    'invite.what': 'משחק לוח לשני שחקנים על מכשיר אחד, בחינם ובלי להתקין כלום.',
    'invite.howTo': 'כדי לשים את המשחק על מסך הבית: פותחים את הקישור בספארי, מקישים על שיתוף ואז על הוספה למסך הבית.',
    'invite.gameWhat': 'הקישור הזה פותח את המשחק בדיוק במצב שבו הוא נמצא עכשיו.',

    'share.invite': 'הזמנה',
    'share.shareGame': 'שיתוף המשחק הזה',
    'share.code': 'קוד המשחק',
    'share.load': 'טעינת משחק',
    'share.copy': 'העתקה',
    'share.loadBtn': 'טעינה',
    'share.copiedText': 'ההודעה הועתקה',
    'share.copiedCode': 'הקוד הועתק',
    'share.copyFail': 'ההעתקה לא הצליחה, אפשר לסמן את הטקסט ולהעתיק ידנית',
    'share.loaded': 'המשחק נטען',
    'share.badCode': 'הקוד אינו תקין',

    'common.back': 'חזרה',
    'common.close': 'סגירה',

    rules: [
      ['h', 'המשחק'],
      ['p', 'משחק מלחמה הוא משחק לשני שחקנים על מכשיר אחד, על לוח של שמונה על שמונה. לכל שחקן שישה עשר כלים, ומנצחים כשלא נשאר ליריב אף כלי.'],

      ['h', 'הפתיחה'],
      ['p', 'שחקן 1 נערך בשלוש השורות הקרובות ומתקדם אל הצד הרחוק, ושחקן 2 נערך בשלוש השורות הרחוקות ומתקדם אל הצד הקרוב. בכל צבא שמונה חיילים בשורה האחורית, ארבעה אבירים לפניהם וארבעה קשתים לפני האבירים. מי פותח נקבע בהגרלה.'],

      ['h', 'הכלים'],
      ['pieceTable'],
      ['p', 'הבריאות היא כמה נזק הכלי סופג עד שהוא מת, והכוח הוא הנזק שהוא גורם בתקיפה. הבריאות משתנה בקפיצות של חצי נקודה, וכלי שבריאותו מגיעה לאפס יורד מהלוח. הכוח לעולם אינו עולה על הבריאות, ולכן אביר שבריאותו 2 תוקף בכוח 2. לקשת אין כוח תקיפה כלל: הוא אינו תוקף, אבל יש לו שלוש נקודות בריאות והוא יורה מרחוק.'],

      ['h', 'התור'],
      ['p', 'בכל תור מפעילים כלים אחד אחד. כלי שהופעל עושה דבר אחד, תנועה או תקיפה או ירי או ריפוי, ואז הוא נעול עד סוף התור. אי אפשר להפעיל כל צירוף שרוצים: הכלים שזזים, תוקפים או יורים בתור אחד חייבים להתאים לאחד הצירופים האלה.'],
      ['combos'],
      ['p', 'תמיד מותר להפעיל פחות כלים. מכאן שבתור אחד פועל אביר אחד לכל היותר, וכשפועל אביר נשאר מקום לכלי אחד בלבד. כלאיים נספרים לפי האביר שבהם, ואם אין בהם אביר לפי הקשת, ואם אין גם קשת לפי החייל. התור נגמר בהקשה על סיום תור, ועד אז אפשר לבטל את הפעולות אחת אחת.'],

      ['h', 'תנועה'],
      ['p', 'כלי נע במסלול של צעדים ומשלם על כל צעד: צעד למעלה, למטה, ימינה או שמאלה עולה נקודה אחת, וצעד באלכסון עולה שתיים. המסלול יכול לפנות כמה פעמים שרוצים, כל עוד הסכום אינו עולה על התנועה של הכלי. הכלי עובר בחופשיות מעל כלים של הצבא שלו ולעולם לא מעל כלי יריב, והמסלול מסתיים על משבצת ריקה או על כלי יריב. כך חייל, שהתנועה שלו 2, מגיע לכל משבצת שנמצאת שני צעדים ישרים ממנו, גם מעבר לפינה, או למשבצת אחת באלכסון, ואביר, שהתנועה שלו 4, מגיע רחוק פי שניים. כשמקישים על כלי, כל משבצת שהוא יכול להגיע אליה מסומנת בנקודה. אפשר לכבות את התנועה באלכסון בהגדרות, ואז כל צעד הוא ישר.'],

      ['h', 'תקיפה'],
      ['p', 'מסלול שמסתיים על כלי יריב הוא תקיפה. כלי שכוחו אפס אינו תוקף לעולם, גם לא קשת וגם לא כלאיים של שני קשתים. שני הכוחות נמדדים לפני הנזק: התוקף מאבד מבריאותו את כוח המותקף, והמותקף מאבד מבריאותו את כוח התוקף. כלי שבריאותו יורדת לאפס מת. לא פעם שני הכלים שורדים, כי כלי שכוחו קטן אינו מפיל את היריב במכה אחת. אם המותקף מת והתוקף נשאר בחיים, התוקף נכנס למשבצת. אחרת הוא נשאר במקומו.'],
      ['ul', [
        'חייל תוקף חייל: שניהם מתים.',
        'אביר (3) תוקף חייל: החייל מת ולאביר נשארת בריאות 2.',
        'חייל תוקף אביר (3): החייל מת ולאביר נשארת בריאות 2.',
        'חייל תוקף אביר שבריאותו 1: שניהם מתים.',
        'אביר שבריאותו 2 תוקף אביר שבריאותו 3: התוקף מת ולמותקף נשארת בריאות 1.',
        'חייל תוקף קשת: הקשת יורד ל-2, החייל אינו נפגע ונשאר במקומו.'
      ]],

      ['h', 'ירי'],
      ['p', 'קשת יורה בכלי יריב שנמצא באותה שורה או באותה עמודה, במרחק של עד שתי משבצות, ולעולם לא באלכסון. המטרה מאבדת 2 מבריאותה, והקשת אינו זז ואינו נפגע. כלים שעומדים בדרך אינם חוסמים את החץ.'],
      ['p', 'תנועה וירי: קשת שזז צעד אחד בלבד יכול לירות אחר כך, מהמשבצת החדשה, באותו תור. קשת שזז שני צעדים או יותר מוותר על הירי. הכלי נשאר מסומן והמטרות שלו מוצגות, והוא נושא סימן ירי קטן עד שהוא יורה או עד שהתור נגמר. הירי הזה אינו תופס מקום בצירוף, וכלי שיורה תחילה אינו זז אחר כך. כל זה נכון לכל כלי שיש לו כוח ירי, ולכן גם כלאיים שיש בהם קשת יורים באותו אופן, כולל הירי אחרי צעד אחד.'],

      ['h', 'ריפוי'],
      ['p', 'בכל תור אפשר לרפא כמה כלים פצועים שרוצים, והריפוי אינו נספר בצירופים. ריפוי מוסיף חצי נקודת בריאות, ולא מעבר לבריאות המרבית של הכלי. כלי שמתרפא לא עושה שום דבר אחר באותו תור, וכלי שכבר פעל אינו יכול להתרפא.'],

      ['h', 'מיזוג'],
      ['p', 'כלי שיש בו סוג אחד בלבד, שמסיים תנועה או תקיפה בשורה האחרונה ונשאר בחיים, יכול להתמזג עם סוג שבוחרים, חייל או אביר או קשת וגם הסוג שלו עצמו, או להישאר כמו שהוא. עד שבוחרים אי אפשר לעשות שום דבר אחר, גם לא לסיים את התור. בכלאיים שנוצרו שני סוגים: הבריאות המרבית היא סכום הבריאות של שני הסוגים והבריאות הנוכחית גדלה בבריאות הסוג שנוסף, הכוח הוא סכום שני הכוחות, התנועה היא הגדולה מבין השתיים, כוח הירי הוא סכום השניים והטווח הוא הארוך מבין השניים. כלאיים אינם מתמזגים שוב.'],
      ['ul', [
        'אביר וקשת: בריאות 6, כוח 3, תנועה 4, ירי 2 בטווח 2.',
        'אביר ואביר: בריאות 6, כוח 6, תנועה 4.',
        'חייל וחייל: בריאות 2, כוח 2, תנועה 2.',
        'קשת וקשת: בריאות 6, כוח 0, תנועה 2, ירי 4 בטווח 2.',
        'חייל וקשת: בריאות 4, כוח 1, תנועה 2, ירי 2 בטווח 2.'
      ]],

      ['h', 'סוף המשחק'],
      ['p', 'שחקן שלא נשאר לו אף כלי מפסיד. אם הכלים האחרונים של שני הצדדים נופלים באותה תקיפה, המשחק מסתיים בתיקו. שחקן שאין לו שום מהלך אפשרי מדלג על התור, ואם לשני השחקנים אין מהלך, התוצאה תיקו.']
    ]
  };

  /* --------------------------------------------------------------- English */

  var en = {
    /* the wordmark: title1 over title2 as they are drawn, title for one line */
    'app.title': "Cole's War Game",
    'app.title1': "Cole's",
    'app.title2': 'War Game',

    'game.newGame': 'New game',
    'game.endTurn': 'End turn',
    'game.undo': 'Undo',
    'game.turn': 'Turn {n}',
    'game.appearance': 'Appearance',
    'game.share': 'Share',
    'game.confirmNew': 'The current game will be lost.',
    'game.start': 'Start',
    'game.opponent': 'Opponent',
    'game.level': 'Level',

    'opp.human': 'Two players',
    'opp.computer': 'Computer',
    'level.easy': 'Easy',
    'level.medium': 'Medium',
    'level.hard': 'Hard',

    'player.0': 'Player 1',
    'player.1': 'Player 2',
    /* against the computer the human is always player 0 */
    'player.you': 'You',
    'player.computer': 'Computer',

    'kind.S': 'Soldier',
    'kind.K': 'Knight',
    'kind.A': 'Archer',

    'action.move': 'Move',
    'action.attack': 'Attack',
    'action.fire': 'Fire',
    'action.heal': 'Heal',
    'action.merge': 'Merge',

    'stat.piece': 'Piece',
    'stat.hp': 'Health',
    'stat.str': 'Strength',
    'stat.move': 'Move',
    'stat.fire': 'Fire',
    'stat.range': 'Range',
    'stat.none': '—',

    'panel.used': 'Used',
    'panel.available': 'Available',
    'panel.nothing': 'none',

    'msg.start': 'First turn: {name}',
    'msg.used': 'That piece has already acted this turn',
    'msg.comboFull': 'No room for another {kind} this turn',
    'msg.cannot': 'That piece cannot act now',
    'msg.pass': '{name}: no legal action, the turn passes',
    'msg.pending': 'Finish the merge first',
    'msg.mayFire': 'The piece may still fire',
    'msg.thinking': 'The computer is thinking…',

    'merge.title': 'Merge',
    'merge.text': 'The piece reached the far row. You may merge it with another kind.',
    'merge.keep': 'Keep as is',

    'over.win': 'Winner: {name}',
    'over.draw': 'Draw',
    'over.playAgain': 'Play again',

    'rules.title': 'Rules',

    'settings.title': 'Settings',
    'settings.theme': 'Theme',
    'settings.colors': 'Colors',
    'settings.p0': 'Player 1 color',
    'settings.p1': 'Player 2 color',
    'settings.sqLight': 'Light square',
    'settings.sqDark': 'Dark square',
    'settings.randomBoard': 'Random colorful board',
    'settings.reshuffle': 'Reshuffle',
    'settings.presets': 'Presets',
    'settings.animations': 'Animations',
    'settings.coordinates': 'Coordinates',
    'settings.diagonalMoves': 'Diagonal movement',
    'settings.rulesNote': 'Applies at the next new game',
    'settings.language': 'Language',
    'settings.build': 'Build {v}',

    'theme.classic': 'Classic',
    'theme.heraldic': 'Heraldic',
    'theme.ink': 'Ink',
    'theme.neon': 'Neon',
    'theme.toy': 'Toy',

    'preset.wood': 'Wood',
    'preset.marble': 'Marble',
    'preset.forest': 'Forest',
    'preset.ocean': 'Ocean',
    'preset.rose': 'Rose',
    'preset.night': 'Night',

    'invite.what': 'A board game for two players on one device, free and with nothing to install.',
    'invite.howTo': 'To put it on the home screen: open the link in Safari, tap Share and then Add to Home Screen.',
    'invite.gameWhat': 'This link opens the game exactly at the position it is in now.',

    'share.invite': 'Invite',
    'share.shareGame': 'Share this game',
    'share.code': 'Game code',
    'share.load': 'Load a game',
    'share.copy': 'Copy',
    'share.loadBtn': 'Load',
    'share.copiedText': 'The message was copied',
    'share.copiedCode': 'Code copied',
    'share.copyFail': 'Copying failed, select the text and copy it by hand',
    'share.loaded': 'Game loaded',
    'share.badCode': 'That code is not valid',

    'common.back': 'Back',
    'common.close': 'Close',

    rules: [
      ['h', 'The game'],
      ['p', 'War Game is a game for two players on one device, on an eight by eight board. Each player has sixteen pieces, and you win when your opponent has none left.'],

      ['h', 'Setup'],
      ['p', 'Player 1 sets up on the three near rows and advances toward the far side; Player 2 sets up on the three far rows and advances toward the near side. Each army has eight soldiers on the back row, four knights in front of them and four archers in front of the knights. Who starts is drawn at random.'],

      ['h', 'The pieces'],
      ['pieceTable'],
      ['p', 'Health is how much damage a piece takes before it dies; strength is the damage it does in an attack. Health changes in steps of half a point, and a piece whose health falls to zero leaves the board. Strength is never above the health, so a knight at health 2 attacks with 2. An archer has no attack strength at all: it never attacks, but it has three health and it fires from a distance.'],

      ['h', 'The turn'],
      ['p', 'On a turn you activate pieces one at a time. An activated piece does one thing, a move or an attack or a shot or a heal, and is then locked for the rest of the turn. You may not activate any set of pieces you like: the pieces that move, attack or fire in one turn have to fit one of these combinations.'],
      ['combos'],
      ['p', 'Fewer pieces are always allowed. So one turn holds at most one knight, and a knight leaves room for one other piece only. For a hybrid the kind that counts is knight if it has one, otherwise archer, otherwise soldier. The turn ends when you press End turn, and until then you can undo your actions one by one.'],

      ['h', 'Moving'],
      ['p', 'A piece moves along a path of steps and pays for each one: a step up, down, left or right costs one point, a diagonal step costs two. The path may turn as often as you like, as long as the total stays within the move number of the piece. It passes freely over pieces of its own army and never over an enemy, and it ends on an empty square or on an enemy. So a soldier, with move 2, reaches any square two straight steps away, around a corner as well, or one square diagonally, and a knight, with move 4, reaches twice as far. When you tap a piece, every square it can reach is marked with a dot. Diagonal movement can be turned off in the settings, and then every step is straight.'],

      ['h', 'Attacking'],
      ['p', 'A path that ends on an enemy is an attack. A piece with strength 0 never attacks, neither an archer nor a hybrid of two archers. Both strengths are taken before any damage: the attacker loses the defender’s strength from its health and the defender loses the attacker’s. A piece whose health falls to zero dies. Often both survive, because a weak piece does not bring the other down in one blow. If the defender dies and the attacker is still alive, the attacker takes the square; otherwise it stays where it was.'],
      ['ul', [
        'Soldier attacks soldier: both die.',
        'Knight (3) attacks soldier: the soldier dies and the knight is left at health 2.',
        'Soldier attacks knight (3): the soldier dies and the knight is left at health 2.',
        'Soldier attacks a knight at health 1: both die.',
        'A knight at health 2 attacks a knight at health 3: the attacker dies and the defender is left at 1.',
        'Soldier attacks an archer: the archer drops to 2, the soldier is untouched and stays where it was.'
      ]],

      ['h', 'Firing'],
      ['p', 'An archer fires at an enemy piece on the same row or the same column, up to two squares away, and never diagonally. The target loses 2 health, and the archer neither moves nor takes anything back. Pieces standing in between do not block the arrow.'],
      ['p', 'Move and fire: an archer that moves a single step may fire afterwards, from its new square, in the same turn. A move of two steps or more gives the shot up. The piece stays selected with its targets shown and carries a small bow mark until it fires or the turn ends, and that shot takes no place in the combination. A piece that fires first does not move afterwards. All of this holds for any piece with fire strength, so a hybrid that includes an archer fires the same way, the shot after a one-step move included.'],

      ['h', 'Healing'],
      ['p', 'Any number of injured pieces may heal in a turn, and healing is outside the combinations. Healing adds half a point of health and never goes above the maximum health of the piece. A piece that heals does nothing else that turn, and a piece that has acted cannot heal.'],

      ['h', 'Merging'],
      ['p', 'A piece of a single kind that ends a move or an attack alive on the far row may merge with a kind of your choice, soldier or knight or archer and its own kind included, or stay as it is. Until that choice is made no other action is possible, End turn included. The hybrid that comes out has two kinds: its maximum health is the two healths added and its health grows by the health of the added kind, its strength is the two strengths added, its move is the better of the two, its fire strength is the two added and its range the longer of the two. A hybrid never merges again.'],
      ['ul', [
        'Knight and archer: health 6, strength 3, move 4, fires 2 at range 2.',
        'Knight and knight: health 6, strength 6, move 4.',
        'Soldier and soldier: health 2, strength 2, move 2.',
        'Archer and archer: health 6, strength 0, move 2, fires 4 at range 2.',
        'Soldier and archer: health 4, strength 1, move 2, fires 2 at range 2.'
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
