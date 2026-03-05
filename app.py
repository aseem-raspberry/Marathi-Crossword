"""
Flask application for Marathi Shabdakode.
Serves the SPA and provides REST API endpoints.
"""

from flask import Flask, render_template, jsonify, request
import uuid
from database import init_db, save_puzzle, get_puzzle, save_progress, get_progress, get_archive, seed_word_bank
from crossword_engine import generate_puzzle

app = Flask(__name__)


@app.before_request
def before_first_request():
    """Initialize DB on first request if needed."""
    if not hasattr(app, '_db_initialized'):
        init_db()
        seed_word_bank()
        app._db_initialized = True


@app.route('/')
def index():
    """Serve the main single-page application."""
    return render_template('index.html')


@app.route('/api/puzzle/new')
def new_puzzle():
    """Generate a new crossword puzzle."""
    difficulty = request.args.get('difficulty', 'easy')
    if difficulty not in ('easy', 'medium', 'hard'):
        return jsonify({'error': 'Invalid difficulty. Use easy, medium, or hard.'}), 400

    try:
        result = generate_puzzle(difficulty)
        puzzle_id = str(uuid.uuid4())[:8]

        save_puzzle(
            puzzle_id=puzzle_id,
            difficulty=difficulty,
            grid_data=result['grid_data'],
            clues=result['clues'],
            solution=result['solution'],
            grid_size=result['grid_size']
        )

        return jsonify({
            'id': puzzle_id,
            'difficulty': difficulty,
            'grid_data': result['grid_data'],
            'clues': result['clues'],
            'grid_size': result['grid_size'],
            'grid_rows': result['grid_rows'],
            'grid_cols': result['grid_cols']
        })
    except ValueError as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/puzzle/<puzzle_id>')
def get_puzzle_by_id(puzzle_id):
    """Get a specific puzzle."""
    puzzle = get_puzzle(puzzle_id)
    if not puzzle:
        return jsonify({'error': 'Puzzle not found'}), 404

    # Don't send solution to frontend (only grid_data and clues)
    return jsonify({
        'id': puzzle['id'],
        'difficulty': puzzle['difficulty'],
        'grid_data': puzzle['grid_data'],
        'clues': puzzle['clues'],
        'grid_size': puzzle['grid_size'],
        'created_at': puzzle['created_at']
    })


@app.route('/api/puzzle/<puzzle_id>/progress', methods=['POST'])
def save_puzzle_progress(puzzle_id):
    """Save user progress for a puzzle."""
    data = request.get_json()
    if not data or 'user_input' not in data:
        return jsonify({'error': 'Missing user_input'}), 400

    save_progress(
        puzzle_id=puzzle_id,
        user_input=data['user_input'],
        is_completed=data.get('is_completed', False)
    )
    return jsonify({'status': 'saved'})


@app.route('/api/puzzle/<puzzle_id>/progress', methods=['GET'])
def load_puzzle_progress(puzzle_id):
    """Load user progress for a puzzle."""
    progress = get_progress(puzzle_id)
    if not progress:
        return jsonify({'user_input': None, 'is_completed': False})
    return jsonify(progress)


@app.route('/api/puzzle/<puzzle_id>/check', methods=['POST'])
def check_puzzle(puzzle_id):
    """Check user answers against solution."""
    data = request.get_json()
    if not data or 'user_input' not in data:
        return jsonify({'error': 'Missing user_input'}), 400

    puzzle = get_puzzle(puzzle_id)
    if not puzzle:
        return jsonify({'error': 'Puzzle not found'}), 404

    solution = puzzle['solution']
    user_input = data['user_input']
    errors = []
    all_correct = True
    all_filled = True

    for r in range(len(solution)):
        for c in range(len(solution[r])):
            sol_char = solution[r][c]
            if sol_char:  # This cell should have a letter
                user_char = ''
                if r < len(user_input) and c < len(user_input[r]):
                    user_char = user_input[r][c]
                if not user_char:
                    all_filled = False
                    all_correct = False
                elif user_char != sol_char:
                    errors.append({'row': r, 'col': c})
                    all_correct = False

    return jsonify({
        'errors': errors,
        'is_correct': all_correct,
        'all_filled': all_filled
    })


@app.route('/api/puzzle/<puzzle_id>/reveal-letter', methods=['POST'])
def reveal_letter(puzzle_id):
    """Reveal a single letter."""
    data = request.get_json()
    row = data.get('row')
    col = data.get('col')

    puzzle = get_puzzle(puzzle_id)
    if not puzzle:
        return jsonify({'error': 'Puzzle not found'}), 404

    solution = puzzle['solution']
    if 0 <= row < len(solution) and 0 <= col < len(solution[row]):
        letter = solution[row][col]
        return jsonify({'letter': letter, 'row': row, 'col': col})

    return jsonify({'error': 'Invalid position'}), 400


@app.route('/api/puzzle/<puzzle_id>/reveal-word', methods=['POST'])
def reveal_word(puzzle_id):
    """Reveal an entire word."""
    data = request.get_json()
    cells = data.get('cells', [])

    puzzle = get_puzzle(puzzle_id)
    if not puzzle:
        return jsonify({'error': 'Puzzle not found'}), 404

    solution = puzzle['solution']
    revealed = []
    for cell in cells:
        r, c = cell['row'], cell['col']
        if 0 <= r < len(solution) and 0 <= c < len(solution[r]):
            revealed.append({
                'row': r,
                'col': c,
                'letter': solution[r][c]
            })

    return jsonify({'revealed': revealed})


@app.route('/api/archive')
def archive():
    """Get archive of all puzzles."""
    return jsonify(get_archive())


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5050)
