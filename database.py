"""
SQLite database module for Marathi Shabdakode.
Manages puzzles, user progress, word bank, and archive.
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shabdakode.db')


def get_db():
    """Get a database connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    """Initialize database tables."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS puzzles (
            id TEXT PRIMARY KEY,
            difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
            grid_data TEXT NOT NULL,
            clues TEXT NOT NULL,
            solution TEXT NOT NULL,
            grid_size INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS user_progress (
            puzzle_id TEXT PRIMARY KEY,
            user_input TEXT NOT NULL,
            is_completed INTEGER DEFAULT 0,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (puzzle_id) REFERENCES puzzles(id)
        );

        CREATE TABLE IF NOT EXISTS word_bank (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT NOT NULL,
            clue TEXT NOT NULL,
            length INTEGER NOT NULL,
            category TEXT DEFAULT 'general'
        );
    ''')

    conn.commit()
    conn.close()


def save_puzzle(puzzle_id, difficulty, grid_data, clues, solution, grid_size):
    """Save a generated puzzle to the database."""
    conn = get_db()
    conn.execute(
        'INSERT INTO puzzles (id, difficulty, grid_data, clues, solution, grid_size) VALUES (?, ?, ?, ?, ?, ?)',
        (puzzle_id, difficulty, json.dumps(grid_data), json.dumps(clues), json.dumps(solution), grid_size)
    )
    conn.commit()
    conn.close()


def get_puzzle(puzzle_id):
    """Retrieve a puzzle by ID."""
    conn = get_db()
    row = conn.execute('SELECT * FROM puzzles WHERE id = ?', (puzzle_id,)).fetchone()
    conn.close()
    if row:
        return {
            'id': row['id'],
            'difficulty': row['difficulty'],
            'grid_data': json.loads(row['grid_data']),
            'clues': json.loads(row['clues']),
            'solution': json.loads(row['solution']),
            'grid_size': row['grid_size'],
            'created_at': row['created_at']
        }
    return None


def save_progress(puzzle_id, user_input, is_completed=False):
    """Save or update user progress for a puzzle."""
    conn = get_db()
    conn.execute('''
        INSERT INTO user_progress (puzzle_id, user_input, is_completed, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(puzzle_id) DO UPDATE SET
            user_input = excluded.user_input,
            is_completed = excluded.is_completed,
            updated_at = excluded.updated_at
    ''', (puzzle_id, json.dumps(user_input), 1 if is_completed else 0, datetime.now().isoformat()))
    conn.commit()
    conn.close()


def get_progress(puzzle_id):
    """Get user progress for a puzzle."""
    conn = get_db()
    row = conn.execute('SELECT * FROM user_progress WHERE puzzle_id = ?', (puzzle_id,)).fetchone()
    conn.close()
    if row:
        return {
            'puzzle_id': row['puzzle_id'],
            'user_input': json.loads(row['user_input']),
            'is_completed': bool(row['is_completed']),
            'updated_at': row['updated_at']
        }
    return None


def get_archive():
    """Get list of all puzzles with completion status."""
    conn = get_db()
    rows = conn.execute('''
        SELECT p.id, p.difficulty, p.grid_size, p.created_at,
               COALESCE(up.is_completed, 0) as is_completed
        FROM puzzles p
        LEFT JOIN user_progress up ON p.id = up.puzzle_id
        ORDER BY p.created_at DESC
    ''').fetchall()
    conn.close()
    return [{
        'id': row['id'],
        'difficulty': row['difficulty'],
        'grid_size': row['grid_size'],
        'created_at': row['created_at'],
        'is_completed': bool(row['is_completed'])
    } for row in rows]


def get_word_bank(max_length=None, min_length=None):
    """Get words from the word bank with optional length filters."""
    conn = get_db()
    query = 'SELECT word, clue, length FROM word_bank WHERE 1=1'
    params = []
    if max_length:
        query += ' AND length <= ?'
        params.append(max_length)
    if min_length:
        query += ' AND length >= ?'
        params.append(min_length)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [{'word': row['word'], 'clue': row['clue'], 'length': row['length']} for row in rows]


def seed_word_bank(force_refresh=False):
    """Seed the word bank if empty or forced."""
    conn = get_db()
    if force_refresh:
        conn.execute('DELETE FROM word_bank')
        
    count = conn.execute('SELECT COUNT(*) FROM word_bank').fetchone()[0]
    if count > 0:
        conn.close()
        return

    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'marathi_wordbank.json')
    if not os.path.exists(json_path):
        conn.close()
        print(f"Word bank JSON not found at {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    for category, entries in data.items():
        for entry in entries:
            word = entry['word']
            clue = entry['clue']
            chars = get_marathi_chars(word)
            conn.execute(
                'INSERT INTO word_bank (word, clue, length, category) VALUES (?, ?, ?, ?)',
                (word, clue, len(chars), category)
            )
    conn.commit()
    conn.close()


def get_marathi_chars(text):
    """
    Split Marathi text into logical characters (akshara).
    Handles consonant clusters with halant (virama), matras, and standalone vowels.
    """
    chars = []
    i = 0
    while i < len(text):
        char = text[i]
        cluster = char
        i += 1
        # Build up the full akshar including halant-joined consonants and matras
        while i < len(text):
            next_char = text[i]
            cp = ord(next_char)
            # Halant (virama) - joins consonants
            if cp == 0x094D:
                cluster += next_char
                i += 1
                if i < len(text):
                    cluster += text[i]
                    i += 1
                continue
            # Dependent vowel signs (matras) and nasalization marks
            if (0x0901 <= cp <= 0x0903) or (0x093E <= cp <= 0x094C) or cp == 0x0962 or cp == 0x0963:
                cluster += next_char
                i += 1
                continue
            # Nukta
            if cp == 0x093C:
                cluster += next_char
                i += 1
                continue
            break
        chars.append(cluster)
    return chars
