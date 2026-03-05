# Marathi Shabdakode — Android App Specification

## Overview

A fully offline, senior-friendly Marathi crossword puzzle app for Android tablets and phones. No internet connection or server required. All puzzle generation, word lookup, and progress tracking happens locally on the device.

---

## Project Setup

- **Language:** Kotlin
- **UI Framework:** Jetpack Compose
- **Minimum SDK:** API 26 (Android 8.0 Oreo) — covers ~95% of devices
- **Target SDK:** API 34 (Android 14)
- **Database:** Room (SQLite)
- **Build system:** Gradle (Kotlin DSL)

### Files to copy into this project

- `marathi_wordbank.json` → place in `app/src/main/assets/marathi_wordbank.json`

---

## Word Bank (`marathi_wordbank.json`)

A structured JSON file with 15,000+ unique Marathi nouns scraped from the Indian Language WordNet. Format:

```json
{
  "easy":    [ { "word": "घर",   "clue": "राहण्याचे ठिकाण" }, ... ],
  "medium":  [ { "word": "शाळा", "clue": "विद्यामंदिर"     }, ... ],
  "complex": [ { "word": "महाभारत", "clue": "..."           }, ... ]
}
```

All words:
- Are single Marathi words (no spaces, no underscores, no English)
- Are 2–8 Marathi aksharas (logical characters) long
- Have associated Marathi-language clues

On first launch, the app reads this JSON and seeds the Room database.

---

## Database Schema (Room)

### `word_bank` table
| Column     | Type    | Notes                              |
|------------|---------|-------------------------------------|
| id         | INTEGER | Primary key, auto-increment         |
| word       | TEXT    | The Marathi word                    |
| clue       | TEXT    | The Marathi clue                    |
| length     | INTEGER | Number of logical aksharas          |
| category   | TEXT    | `"easy"`, `"medium"`, or `"complex"` |

### `puzzles` table
| Column     | Type    | Notes                              |
|------------|---------|-------------------------------------|
| id         | TEXT    | Primary key (short UUID)            |
| difficulty | TEXT    | `"easy"`, `"medium"`, or `"hard"`   |
| grid_data  | TEXT    | JSON-serialized grid                |
| clues      | TEXT    | JSON-serialized clues map           |
| solution   | TEXT    | JSON-serialized solution map        |
| grid_rows  | INTEGER | Number of rows after trimming       |
| grid_cols  | INTEGER | Number of columns after trimming    |
| created_at | TEXT    | ISO timestamp                       |

### `user_progress` table
| Column       | Type    | Notes                              |
|--------------|---------|-------------------------------------|
| puzzle_id    | TEXT    | FK → puzzles.id                     |
| user_input   | TEXT    | JSON: `{ "r-c": "character" }`      |
| is_completed | INTEGER | 0 or 1                              |
| updated_at   | TEXT    | ISO timestamp                       |

---

## Crossword Engine (Kotlin)

Port of `crossword_engine.py`. Must implement:

### Grid sizes by difficulty
| Difficulty | Grid Size | Word Target |
|------------|-----------|-------------|
| easy       | 5×5       | 4–7 words   |
| medium     | 8×8       | 10–16 words |
| hard       | 12×12     | 18–28 words |

### Marathi character splitting
Marathi uses Unicode Devanagari (U+0900–U+097F). One **akshar** (logical character) may consist of:
- A base consonant
- Optionally followed by: halant (U+094D) + next consonant (conjuncts)
- Optionally followed by: matras (U+093E–U+094C), anusvara (U+0901), chandrabindu (U+0902), visarga (U+0903), nukta (U+093C)

A word's **length** is the count of such aksharas, NOT `String.length`.

The Python reference implementation is in `crossword_engine.py` → `get_marathi_chars()`.

### Word placement algorithm
1. Fetch words from `word_bank` filtered by `length <= grid_size`
2. Sort by length (longest first), shuffle for variation
3. Place the longest word horizontally at a random central starting position
4. For each subsequent word, find valid intersection points with already-placed words (characters that match)
5. Backtrack if no placement is possible for a word after N attempts
6. After placement, trim empty rows and columns from all four sides
7. Number the cells: any cell that starts an across or down word gets a sequential number

### Output format

```kotlin
data class PlacedWord(
    val word: String,
    val clue: String,
    val chars: List<String>,  // list of individual aksharas
    val row: Int,
    val col: Int,
    val direction: String,    // "across" or "down"
    val number: Int
)

data class CellData(
    val type: String,         // "letter" or "block"
    val number: Int?,
    val correctChar: String?
)
```

---

## UI Design

### General Principles
- **Target users:** seniors, 80+ years old
- **Language:** Entire UI in Marathi (Devanagari script)
- **Font:** `Noto Sans Devanagari` (available in Google Fonts / bundled)
- **Theme:** High contrast — dark text on soft cream/white background
- **Accent colour:** Deep navy blue (`#1A5276`)
- **Touch targets:** All interactive elements minimum 48dp tall

### Layout — Vertical Split (Portrait Mode)

```
┌─────────────────────────────┐
│ Header: मराठी शब्दकोडे  [📚] │  ← fixed, non-scrolling
├─────────────────────────────┤
│                             │
│      CROSSWORD GRID         │  ← shrinks to fit, never clips
│   (entire board visible)    │
│                             │
├──────────────────┬──────────┤
│  🔤 अक्षर पहा   │ 📝 शब्द │  ← help buttons, flex-shrink:0
│  ✅ चूक तपासा  │  पहा    │
├──────────────────┴──────────┤
│  ➡️ आडवे  │  ⬇️ उभे    │  ← TWO COLUMNS, each independently
│            │               │     scrollable with visible scrollbar
│  1. ...    │  1. ...       │
│  2. ...    │  2. ...       │
│  (scrolls) │  (scrolls)    │
├─────────────────────────────┤
│      🆕 नवीन शब्दकोडे       │  ← new puzzle button, always visible
└─────────────────────────────┘
```

**Critical layout rules:**
- The top grid area must NEVER push off screen — the entire board must always be visible
- Only the two hint columns scroll; nothing else on the page scrolls
- Cell size is computed dynamically: `cellSize = min(containerWidth / cols, containerHeight / rows)` clamped to 20dp–64dp
- Font size inside cells scales proportionally: `cellFont = cellSize * 0.48`
- Cell number label: `cellNumFont = cellSize * 0.22`, top-left corner of cell

### Grid Cell States

| State        | Background Colour |
|--------------|-------------------|
| Normal       | White `#FFFFFF`   |
| Block cell   | Dark `#2C3E50`    |
| Active cell  | Yellow `#FFD54F`  |
| Word highlight | Light blue `#BBDEFB` |
| Correct      | Light green `#C8E6C9` |
| Error        | Light red `#FFCDD2` |
| Revealed     | Light purple `#E1BEE7` |

### Difficulty Selector
Modal/dialog with three large buttons:
- **सोपे** — 5×5
- **मध्यम** — 8×8
- **कठीण** — 12×12

### Archive Screen
List of previously generated puzzles with:
- Short puzzle ID
- Difficulty level
- Date created
- ✅ / 🕐 completion status
- Tap to resume

### Help Actions
Three action buttons:
- **अक्षर पहा** — Reveal the correct character in the currently selected cell
- **शब्द पहा** — Reveal all characters in the currently selected word
- **चूक तपासा** — Highlight all incorrectly filled cells in red

### Celebration
When the puzzle is completed correctly, show a full-screen congratulations overlay with 🎉 **अभिनंदन!**

---

## Input Handling

- Tapping a cell selects it and shows a soft keyboard
- Tapping the same cell again toggles direction (across ↔ down)
- Entering a character moves focus to the next cell in the current direction
- Backspace clears the current cell and moves back
- Marathi IME keyboard input must be supported (the user types in Marathi natively)
- Hint items in the list are tappable — tapping a hint selects the first cell of that word
- The active hint is highlighted in the list when a cell within that word is selected

---

## Marathi Text Notes

- Font: bundle `NotoSansDevanagari-Regular.ttf` and `NotoSansDevanagari-Bold.ttf` from Google Fonts
- All UI strings should be in Marathi (see table below)

### UI String Reference

| Key              | Marathi                    | English equivalent     |
|------------------|----------------------------|------------------------|
| app_title        | मराठी शब्दकोडे              | Marathi Crossword      |
| btn_new_puzzle   | 🆕 नवीन शब्दकोडे           | New Puzzle             |
| btn_reveal_letter| 🔤 अक्षर पहा               | Reveal Letter          |
| btn_reveal_word  | 📝 शब्द पहा                | Reveal Word            |
| btn_check_errors | ✅ चूक तपासा               | Check Errors           |
| btn_archive      | 📚 संग्रह                   | Archive                |
| btn_close        | बंद करा                    | Close                  |
| difficulty_title | अवघडपणा निवडा              | Select Difficulty      |
| easy             | सोपे                       | Easy                   |
| medium           | मध्यम                      | Medium                 |
| hard             | कठीण                       | Hard                   |
| hints_across     | ➡️ आडवे                    | Across                 |
| hints_down       | ⬇️ उभे                    | Down                   |
| celebration_title| अभिनंदन!                   | Congratulations!       |
| celebration_msg  | तुम्ही शब्दकोडे पूर्ण केले आहे! | You completed the puzzle! |
| loading_msg      | शब्दकोडे तयार होत आहे...   | Generating puzzle...   |
| welcome_title    | स्वागत आहे!                | Welcome!               |
| welcome_subtitle | नवीन शब्दकोडे सुरू करण्यासाठी खालील बटण दाबा | Press the button below to start |

---

## Auto-Save

- Save user input to `user_progress` table after every character entered (debounced 500ms)
- On app launch, if there is an in-progress puzzle, offer to resume it
- Mark puzzle as completed when all non-block cells are correctly filled

---

## Project File Structure (suggested)

```
app/
├── src/main/
│   ├── assets/
│   │   └── marathi_wordbank.json       ← copy from web project
│   ├── res/
│   │   └── font/
│   │       ├── noto_sans_devanagari_regular.ttf
│   │       └── noto_sans_devanagari_bold.ttf
│   └── java/.../
│       ├── data/
│       │   ├── AppDatabase.kt          ← Room database
│       │   ├── WordBankDao.kt
│       │   ├── PuzzleDao.kt
│       │   ├── ProgressDao.kt
│       │   └── WordBankSeeder.kt       ← reads JSON, seeds DB on first launch
│       ├── engine/
│       │   ├── CrosswordGenerator.kt   ← backtracking algorithm
│       │   ├── MarathiTextUtils.kt     ← akshar splitting
│       │   └── models/
│       │       ├── PlacedWord.kt
│       │       └── CellData.kt
│       ├── ui/
│       │   ├── MainActivity.kt
│       │   ├── screens/
│       │   │   ├── GameScreen.kt       ← main vertical split layout
│       │   │   ├── ArchiveScreen.kt
│       │   │   └── WelcomeScreen.kt
│       │   ├── components/
│       │   │   ├── CrosswordGrid.kt    ← Compose grid with dynamic cell size
│       │   │   ├── HintsPanel.kt       ← two-column scrollable list
│       │   │   ├── HelpToolbar.kt      ← three action buttons
│       │   │   └── DifficultyDialog.kt
│       │   └── theme/
│       │       ├── Theme.kt
│       │       ├── Color.kt
│       │       └── Type.kt
│       └── viewmodel/
│           └── GameViewModel.kt        ← holds puzzle state, triggers engine
```
