/**
 * Main Application Controller
 * Manages state, API calls, and coordinates Grid + Hints modules.
 */

const app = (() => {
    let currentPuzzleId = null;
    let currentDifficulty = null;
    let saveTimeout = null;

    /**
     * Initialize the application.
     */
    function init() {
        showWelcome();

        // Recompute cell size whenever the window is resized (e.g. orientation change, browser resize)
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                Grid.computeCellSize();
            }, 100); // debounce
        });
    }

    /**
     * Show welcome state.
     */
    function showWelcome() {
        const gridContainer = document.getElementById('crossword-grid');
        gridContainer.innerHTML = `
            <div class="welcome-state">
                <div class="welcome-emoji">🧩</div>
                <div class="welcome-title">स्वागत आहे!</div>
                <div class="welcome-subtitle">
                    नवीन शब्दकोडे सुरू करण्यासाठी<br>
                    खालील बटण दाबा
                </div>
            </div>
        `;

        // Clear hints
        document.getElementById('across-list').innerHTML = '';
        document.getElementById('down-list').innerHTML = '';
        document.getElementById('puzzle-id-display').textContent = '';
        document.getElementById('puzzle-difficulty-display').textContent = '';
    }

    /**
     * Show difficulty selector modal.
     */
    function showDifficultySelector() {
        document.getElementById('difficulty-modal').classList.remove('hidden');
    }

    /**
     * Close all modals.
     */
    function closeModals() {
        document.getElementById('difficulty-modal').classList.add('hidden');
        document.getElementById('archive-modal').classList.add('hidden');
    }

    /**
     * Generate a new puzzle.
     */
    async function newPuzzle(difficulty) {
        closeModals();
        showLoading(true);

        try {
            const response = await fetch(`/api/puzzle/new?difficulty=${difficulty}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'पझल तयार करता आली नाही');
            }

            const puzzle = await response.json();
            currentPuzzleId = puzzle.id;
            currentDifficulty = difficulty;

            loadPuzzle(puzzle);
        } catch (error) {
            console.error('Error generating puzzle:', error);
            alert('शब्दकोडे तयार करताना त्रुटी: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Load a puzzle (from new generation or archive).
     */
    async function loadPuzzle(puzzle) {
        currentPuzzleId = puzzle.id;
        currentDifficulty = puzzle.difficulty;

        // Update toolbar info
        const diffLabels = { easy: 'सोपे (५×५)', medium: 'मध्यम (८×८)', hard: 'कठीण (१२×१२)' };
        document.getElementById('puzzle-id-display').textContent = `#${puzzle.id}`;
        document.getElementById('puzzle-difficulty-display').textContent = diffLabels[puzzle.difficulty] || '';

        // Initialize grid
        const gridRows = puzzle.grid_rows || puzzle.grid_data.length;
        const gridCols = puzzle.grid_cols || (puzzle.grid_data[0] ? puzzle.grid_data[0].length : puzzle.grid_size);
        Grid.init(puzzle.grid_data, puzzle.grid_size, {
            onCellSelect: handleCellSelect,
            onInputChange: handleInputChange
        }, gridRows, gridCols);

        // Initialize hints
        Hints.init(puzzle.clues, handleHintSelect);

        // Load saved progress if any
        try {
            const progressRes = await fetch(`/api/puzzle/${puzzle.id}/progress`);
            const progress = await progressRes.json();
            if (progress.user_input) {
                Grid.loadUserInput(progress.user_input);
            }
        } catch (e) {
            console.log('No saved progress');
        }
    }

    /**
     * Handle cell selection in the grid → highlight hint.
     */
    function handleCellSelect(row, col, direction, navigate) {
        if (navigate === 'next') {
            const next = Hints.getAdjacentClue(1);
            if (next) {
                Hints.selectHint(next, next.direction);
            }
            return;
        }
        if (navigate === 'prev') {
            const prev = Hints.getAdjacentClue(-1);
            if (prev) {
                Hints.selectHint(prev, prev.direction);
            }
            return;
        }

        const result = Hints.highlightForCell(row, col, direction);
        if (result) {
            // Update grid direction to match the found clue
            Grid.setActiveDirection(result.direction);
            // Highlight word cells in grid
            Grid.highlightWord(result.clue.cells);
        }
    }

    /**
     * Handle hint selection → highlight grid cells.
     */
    function handleHintSelect(cells, direction, firstCell) {
        Grid.clearHighlights();
        Grid.setActiveDirection(direction);
        if (firstCell) {
            Grid.focusCell(firstCell.row, firstCell.col, direction);
        }
        Grid.highlightWord(cells);
    }

    /**
     * Handle input change → auto-save.
     */
    function handleInputChange(row, col, value) {
        // Debounced auto-save
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveProgress();
        }, 500);

        // Check if puzzle is complete
        checkCompletion();
    }

    /**
     * Save progress to server.
     */
    async function saveProgress(isCompleted = false) {
        if (!currentPuzzleId) return;

        const userInput = Grid.getUserInput();
        try {
            await fetch(`/api/puzzle/${currentPuzzleId}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_input: userInput,
                    is_completed: isCompleted
                })
            });
        } catch (e) {
            console.error('Save failed:', e);
        }
    }

    /**
     * Reveal the letter in the active cell.
     */
    async function revealLetter() {
        if (!currentPuzzleId) return;
        const active = Grid.getActiveCell();
        if (!active) {
            alert('कृपया प्रथम एक सेल निवडा');
            return;
        }

        try {
            const response = await fetch(`/api/puzzle/${currentPuzzleId}/reveal-letter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ row: active.row, col: active.col })
            });
            const data = await response.json();
            if (data.letter) {
                Grid.setCellValue(data.row, data.col, data.letter, true);
                handleInputChange(data.row, data.col, data.letter);
            }
        } catch (e) {
            console.error('Reveal letter failed:', e);
        }
    }

    /**
     * Reveal the active word.
     */
    async function revealWord() {
        if (!currentPuzzleId) return;

        const activeClue = Hints.getActiveClue();
        if (!activeClue) {
            alert('कृपया प्रथम एक शब्द निवडा');
            return;
        }

        try {
            const response = await fetch(`/api/puzzle/${currentPuzzleId}/reveal-word`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cells: activeClue.cells })
            });
            const data = await response.json();
            if (data.revealed) {
                data.revealed.forEach(r => {
                    Grid.setCellValue(r.row, r.col, r.letter, true);
                });
                handleInputChange();
            }
        } catch (e) {
            console.error('Reveal word failed:', e);
        }
    }

    /**
     * Check for errors in user input.
     */
    async function checkErrors() {
        if (!currentPuzzleId) return;

        const userInput = Grid.getUserInput();
        try {
            const response = await fetch(`/api/puzzle/${currentPuzzleId}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_input: userInput })
            });
            const data = await response.json();

            if (data.errors && data.errors.length > 0) {
                Grid.markErrors(data.errors);
            } else if (data.all_filled && data.is_correct) {
                showCelebration();
                saveProgress(true);
            } else if (data.errors.length === 0) {
                // No errors in filled cells, but not complete
                alert('आतापर्यंत कोणतीही चूक नाही! 👍');
            }
        } catch (e) {
            console.error('Check errors failed:', e);
        }
    }

    /**
     * Check if puzzle is completed.
     */
    async function checkCompletion() {
        if (!currentPuzzleId) return;

        const userInput = Grid.getUserInput();

        // Quick check: are all letter cells filled?
        let allFilled = true;
        const gridContainer = document.getElementById('crossword-grid');
        const inputs = gridContainer.querySelectorAll('.cell-input');
        inputs.forEach(input => {
            if (!input.value) allFilled = false;
        });

        if (!allFilled) return;

        // All filled — check with server
        try {
            const response = await fetch(`/api/puzzle/${currentPuzzleId}/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_input: userInput })
            });
            const data = await response.json();
            if (data.is_correct) {
                showCelebration();
                saveProgress(true);
            }
        } catch (e) {
            console.error('Completion check failed:', e);
        }
    }

    /**
     * Show celebration overlay.
     */
    function showCelebration() {
        document.getElementById('celebration-overlay').classList.remove('hidden');
    }

    /**
     * Close celebration overlay.
     */
    function closeCelebration() {
        document.getElementById('celebration-overlay').classList.add('hidden');
    }

    /**
     * Show/hide loading overlay.
     */
    function showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    /**
     * Show archive modal.
     */
    async function showArchive() {
        const listEl = document.getElementById('archive-list');
        listEl.innerHTML = '<p style="text-align:center; padding: 20px;">लोड होत आहे...</p>';
        document.getElementById('archive-modal').classList.remove('hidden');

        try {
            const response = await fetch('/api/archive');
            const archives = await response.json();

            if (archives.length === 0) {
                listEl.innerHTML = '<p class="archive-empty">अजून कोणतेही शब्दकोडे नाही</p>';
                return;
            }

            listEl.innerHTML = '';
            const diffLabels = { easy: 'सोपे', medium: 'मध्यम', hard: 'कठीण' };

            archives.forEach(item => {
                const div = document.createElement('div');
                div.className = 'archive-item';
                div.onclick = () => loadFromArchive(item.id);

                const infoDiv = document.createElement('div');
                infoDiv.className = 'archive-item-info';

                const idSpan = document.createElement('span');
                idSpan.className = 'archive-item-id';
                idSpan.textContent = `#${item.id}`;

                const metaSpan = document.createElement('span');
                metaSpan.className = 'archive-item-meta';
                metaSpan.textContent = `${diffLabels[item.difficulty] || item.difficulty} | ${item.grid_size}×${item.grid_size}`;

                infoDiv.appendChild(idSpan);
                infoDiv.appendChild(metaSpan);

                const statusSpan = document.createElement('span');
                statusSpan.className = 'archive-item-status';
                statusSpan.textContent = item.is_completed ? '✅' : '📝';

                div.appendChild(infoDiv);
                div.appendChild(statusSpan);
                listEl.appendChild(div);
            });
        } catch (e) {
            listEl.innerHTML = '<p class="archive-empty">संग्रह लोड करता आला नाही</p>';
            console.error('Archive fetch failed:', e);
        }
    }

    /**
     * Load a puzzle from archive.
     */
    async function loadFromArchive(puzzleId) {
        closeModals();
        showLoading(true);

        try {
            const response = await fetch(`/api/puzzle/${puzzleId}`);
            if (!response.ok) throw new Error('Puzzle not found');
            const puzzle = await response.json();
            await loadPuzzle(puzzle);
        } catch (e) {
            console.error('Load from archive failed:', e);
            alert('शब्दकोडे लोड करता आले नाही');
        } finally {
            showLoading(false);
        }
    }

    /**
     * Scroll to grid (top of page).
     */
    function scrollToGrid() {
        const hintsSection = document.getElementById('hints-section');
        hintsSection.scrollTo({ top: 0, behavior: 'smooth' });
        // Also scroll main if needed
        const gridSection = document.getElementById('grid-section');
        gridSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Scroll to hints (bottom section).
     */
    function scrollToHints() {
        const hintsSection = document.getElementById('hints-section');
        hintsSection.scrollTo({ top: hintsSection.scrollHeight, behavior: 'smooth' });
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', init);

    // Public API
    return {
        newPuzzle,
        showDifficultySelector,
        closeModals,
        revealLetter,
        revealWord,
        checkErrors,
        showArchive,
        closeCelebration,
        scrollToGrid,
        scrollToHints
    };
})();
