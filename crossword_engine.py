"""
Crossword Generation Engine for Marathi Shabdakode.
Uses a backtracking algorithm to place words on a grid with valid intersections.
Handles Marathi Unicode characters (aksharas) correctly.
"""

import random
from database import get_db, get_marathi_chars

# Grid sizes for each difficulty
GRID_SIZES = {
    'easy': 5,
    'medium': 8,
    'hard': 12
}

# Target word counts for each difficulty
WORD_TARGETS = {
    'easy': (4, 7),
    'medium': (10, 16),
    'hard': (18, 28)
}


class CrosswordGenerator:
    """Generates a crossword puzzle using backtracking."""

    def __init__(self, difficulty='easy'):
        self.difficulty = difficulty
        self.size = GRID_SIZES[difficulty]
        self.grid = [[None for _ in range(self.size)] for _ in range(self.size)]
        self.placed_words = []  # list of {word, chars, clue, row, col, direction, number}
        self.word_number = 0

    def generate(self):
        """Main generation method. Returns grid_data, clues, and solution."""
        words = self._fetch_words()
        if not words:
            raise ValueError("No words available in the word bank")

        # Sort words by length (longest first for better placement)
        random.shuffle(words)
        words.sort(key=lambda w: len(get_marathi_chars(w['word'])), reverse=True)

        # Try to place words using backtracking
        self._place_words(words)

        if not self.placed_words:
            raise ValueError("Could not generate a valid crossword")

        # Trim empty rows and columns from the grid
        self._trim_grid()

        # Build the output
        grid_data = self._build_grid_data()
        clues = self._build_clues()
        solution = self._build_solution()

        return grid_data, clues, solution

    def _trim_grid(self):
        """Remove rows and columns that have no letters, and remap coordinates."""
        # Find which rows and columns have content
        used_rows = set()
        used_cols = set()
        for r in range(self.size):
            for c in range(self.size):
                if self.grid[r][c] is not None:
                    used_rows.add(r)
                    used_cols.add(c)

        if not used_rows or not used_cols:
            return

        sorted_rows = sorted(used_rows)
        sorted_cols = sorted(used_cols)

        # Build row/col remapping
        row_map = {old: new for new, old in enumerate(sorted_rows)}
        col_map = {old: new for new, old in enumerate(sorted_cols)}

        new_num_rows = len(sorted_rows)
        new_num_cols = len(sorted_cols)

        # Build new grid
        new_grid = [[None for _ in range(new_num_cols)] for _ in range(new_num_rows)]
        for old_r in sorted_rows:
            for old_c in sorted_cols:
                new_grid[row_map[old_r]][col_map[old_c]] = self.grid[old_r][old_c]

        # Remap placed word coordinates
        for pw in self.placed_words:
            pw['row'] = row_map[pw['row']]
            pw['col'] = col_map[pw['col']]

        # Update grid and size
        self.grid = new_grid
        self.trimmed_rows = new_num_rows
        self.trimmed_cols = new_num_cols

    def _fetch_words(self):
        """Get words from the database filtered by grid size."""
        conn = get_db()
        # Fetch words that can fit in the grid
        rows = conn.execute(
            'SELECT word, clue, length FROM word_bank WHERE length <= ? AND length >= 2',
            (self.size,)
        ).fetchall()
        conn.close()
        return [{'word': r['word'], 'clue': r['clue'], 'length': r['length']} for r in rows]

    def _place_words(self, words):
        """Place words on the grid, starting with the longest."""
        min_words, max_words = WORD_TARGETS[self.difficulty]
        attempts = 0
        max_attempts = 5  # Try different random orderings

        best_placement = []

        while attempts < max_attempts:
            self.grid = [[None for _ in range(self.size)] for _ in range(self.size)]
            self.placed_words = []
            self.word_number = 0

            shuffled = words.copy()
            if attempts > 0:
                random.shuffle(shuffled)
                shuffled.sort(key=lambda w: len(get_marathi_chars(w['word'])), reverse=True)

            for word_entry in shuffled:
                if len(self.placed_words) >= max_words:
                    break
                self._try_place_word(word_entry)

            if len(self.placed_words) > len(best_placement):
                best_placement = self.placed_words.copy()
                best_grid = [row.copy() for row in self.grid]

            if len(self.placed_words) >= min_words:
                break

            attempts += 1

        # Use the best placement found
        if best_placement:
            self.placed_words = best_placement
            self.grid = best_grid

        # Assign numbers in reading order (top-to-bottom, left-to-right)
        self._assign_numbers()

    def _try_place_word(self, word_entry):
        """Try to place a word on the grid."""
        word = word_entry['word']
        chars = get_marathi_chars(word)
        length = len(chars)

        if length > self.size or length < 2:
            return False

        # If no words placed yet, place in a good starting position
        if not self.placed_words:
            # Place first word across, roughly centered
            row = self.size // 3
            col = max(0, (self.size - length) // 2)
            if self._can_place(chars, row, col, 'across'):
                self._place(word_entry, chars, row, col, 'across')
                return True
            return False

        # Try to find intersections with existing words
        placements = []
        for placed in self.placed_words:
            placed_chars = placed['chars']
            for i, pc in enumerate(placed_chars):
                for j, wc in enumerate(chars):
                    if pc == wc:
                        # Found matching character - try crossing
                        if placed['direction'] == 'across':
                            # New word goes down
                            new_row = placed['row'] - j
                            new_col = placed['col'] + i
                            if self._can_place(chars, new_row, new_col, 'down'):
                                score = self._score_placement(chars, new_row, new_col, 'down')
                                placements.append((score, new_row, new_col, 'down'))
                        else:
                            # New word goes across
                            new_row = placed['row'] + i
                            new_col = placed['col'] - j
                            if self._can_place(chars, new_row, new_col, 'across'):
                                score = self._score_placement(chars, new_row, new_col, 'across')
                                placements.append((score, new_row, new_col, 'across'))

        if placements:
            # Pick the best placement (highest score)
            placements.sort(key=lambda p: p[0], reverse=True)
            _, row, col, direction = placements[0]
            self._place(word_entry, chars, row, col, direction)
            return True

        return False

    def _can_place(self, chars, row, col, direction):
        """Check if a word can be placed at the given position."""
        length = len(chars)
        dr = 0 if direction == 'across' else 1
        dc = 1 if direction == 'across' else 0

        # Check bounds
        end_row = row + dr * (length - 1)
        end_col = col + dc * (length - 1)
        if row < 0 or col < 0 or end_row >= self.size or end_col >= self.size:
            return False

        # Check cell before start (should be empty or wall)
        before_row = row - dr
        before_col = col - dc
        if 0 <= before_row < self.size and 0 <= before_col < self.size:
            if self.grid[before_row][before_col] is not None:
                return False

        # Check cell after end (should be empty or wall)
        after_row = row + dr * length
        after_col = col + dc * length
        if 0 <= after_row < self.size and 0 <= after_col < self.size:
            if self.grid[after_row][after_col] is not None:
                return False

        # Check each cell
        has_intersection = len(self.placed_words) == 0  # First word doesn't need intersection
        for i in range(length):
            r = row + dr * i
            c = col + dc * i
            cell = self.grid[r][c]

            if cell is not None:
                if cell != chars[i]:
                    return False
                has_intersection = True
            else:
                # Check adjacent cells (perpendicular to direction)
                if direction == 'across':
                    # Check above and below
                    if r > 0 and self.grid[r-1][c] is not None:
                        # There's a character above - only OK if it's part of a crossing word
                        if not self._is_part_of_word(r-1, c, 'down', r, c):
                            return False
                    if r < self.size - 1 and self.grid[r+1][c] is not None:
                        if not self._is_part_of_word(r+1, c, 'down', r, c):
                            return False
                else:
                    # Check left and right
                    if c > 0 and self.grid[r][c-1] is not None:
                        if not self._is_part_of_word(r, c-1, 'across', r, c):
                            return False
                    if c < self.size - 1 and self.grid[r][c+1] is not None:
                        if not self._is_part_of_word(r, c+1, 'across', r, c):
                            return False

        return True

    def _is_part_of_word(self, adj_r, adj_c, check_dir, curr_r, curr_c):
        """Check if adjacent cell is part of a word that crosses through current cell."""
        for placed in self.placed_words:
            if placed['direction'] != check_dir:
                continue
            chars = placed['chars']
            dr = 0 if placed['direction'] == 'across' else 1
            dc = 1 if placed['direction'] == 'across' else 0
            for i in range(len(chars)):
                r = placed['row'] + dr * i
                c = placed['col'] + dc * i
                if r == adj_r and c == adj_c:
                    # The adjacent cell is part of this word - check if
                    # the current cell is also part of this word
                    for j in range(len(chars)):
                        rr = placed['row'] + dr * j
                        cc = placed['col'] + dc * j
                        if rr == curr_r and cc == curr_c:
                            return True
                    return False
        return False

    def _score_placement(self, chars, row, col, direction):
        """Score a potential placement. Higher is better."""
        score = 0
        dr = 0 if direction == 'across' else 1
        dc = 1 if direction == 'across' else 0

        for i in range(len(chars)):
            r = row + dr * i
            c = col + dc * i
            if self.grid[r][c] is not None:
                score += 10  # Intersection bonus

        # Prefer placements near center
        center = self.size / 2
        mid_r = row + dr * len(chars) / 2
        mid_c = col + dc * len(chars) / 2
        dist = abs(mid_r - center) + abs(mid_c - center)
        score -= dist

        return score

    def _place(self, word_entry, chars, row, col, direction):
        """Place a word on the grid."""
        dr = 0 if direction == 'across' else 1
        dc = 1 if direction == 'across' else 0

        for i in range(len(chars)):
            self.grid[row + dr * i][col + dc * i] = chars[i]

        self.placed_words.append({
            'word': word_entry['word'],
            'chars': chars,
            'clue': word_entry['clue'],
            'row': row,
            'col': col,
            'direction': direction,
            'number': 0  # Assigned later
        })

    def _assign_numbers(self):
        """Assign clue numbers in reading order."""
        # Collect all starting positions
        starts = {}  # (row, col) -> list of directions
        for pw in self.placed_words:
            key = (pw['row'], pw['col'])
            if key not in starts:
                starts[key] = []
            starts[key].append(pw)

        # Sort by reading order
        sorted_starts = sorted(starts.keys(), key=lambda k: (k[0], k[1]))

        number = 1
        for pos in sorted_starts:
            for pw in starts[pos]:
                pw['number'] = number
            number += 1

    def _build_grid_data(self):
        """Build the grid data structure for the frontend."""
        num_rows = getattr(self, 'trimmed_rows', self.size)
        num_cols = getattr(self, 'trimmed_cols', self.size)
        grid_data = []
        # Create a set of all cells that contain letters
        filled_cells = set()
        for pw in self.placed_words:
            dr = 0 if pw['direction'] == 'across' else 1
            dc = 1 if pw['direction'] == 'across' else 0
            for i in range(len(pw['chars'])):
                filled_cells.add((pw['row'] + dr * i, pw['col'] + dc * i))

        # Build number map
        number_map = {}
        for pw in self.placed_words:
            key = (pw['row'], pw['col'])
            if key not in number_map:
                number_map[key] = pw['number']

        for r in range(num_rows):
            row_data = []
            for c in range(num_cols):
                if (r, c) in filled_cells:
                    cell = {
                        'type': 'letter',
                        'row': r,
                        'col': c
                    }
                    if (r, c) in number_map:
                        cell['number'] = number_map[(r, c)]
                    row_data.append(cell)
                else:
                    row_data.append({'type': 'block', 'row': r, 'col': c})
            grid_data.append(row_data)

        return grid_data

    def _build_clues(self):
        """Build clue data for across and down."""
        across = []
        down = []

        for pw in self.placed_words:
            clue_entry = {
                'number': pw['number'],
                'clue': pw['clue'],
                'row': pw['row'],
                'col': pw['col'],
                'length': len(pw['chars']),
                'cells': []
            }
            dr = 0 if pw['direction'] == 'across' else 1
            dc = 1 if pw['direction'] == 'across' else 0
            for i in range(len(pw['chars'])):
                clue_entry['cells'].append({
                    'row': pw['row'] + dr * i,
                    'col': pw['col'] + dc * i
                })

            if pw['direction'] == 'across':
                across.append(clue_entry)
            else:
                down.append(clue_entry)

        across.sort(key=lambda c: c['number'])
        down.sort(key=lambda c: c['number'])

        return {'across': across, 'down': down}

    def _build_solution(self):
        """Build the solution grid (for checking answers)."""
        num_rows = getattr(self, 'trimmed_rows', self.size)
        num_cols = getattr(self, 'trimmed_cols', self.size)
        solution = []
        for r in range(num_rows):
            row_data = []
            for c in range(num_cols):
                row_data.append(self.grid[r][c] if self.grid[r][c] else '')
            solution.append(row_data)
        return solution


def generate_puzzle(difficulty='easy'):
    """Generate a crossword puzzle and return the result."""
    generator = CrosswordGenerator(difficulty)
    grid_data, clues, solution = generator.generate()
    num_rows = getattr(generator, 'trimmed_rows', generator.size)
    num_cols = getattr(generator, 'trimmed_cols', generator.size)
    return {
        'grid_data': grid_data,
        'clues': clues,
        'solution': solution,
        'grid_size': generator.size,
        'grid_rows': num_rows,
        'grid_cols': num_cols
    }
