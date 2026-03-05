/**
 * Hints Panel Module
 * Renders and manages the clue list with bidirectional highlighting.
 */

const Hints = (() => {
    let cluesData = null;
    let acrossListEl = null;
    let downListEl = null;
    let allClues = [];  // flat list for navigation
    let activeClueIndex = -1;
    let onHintSelect = null;  // callback

    /**
     * Initialize hints with clue data.
     */
    function init(clues, callback) {
        cluesData = clues;
        acrossListEl = document.getElementById('across-list');
        downListEl = document.getElementById('down-list');
        onHintSelect = callback;
        allClues = [];
        activeClueIndex = -1;
        render();
    }

    /**
     * Render all clues in across and down sections.
     */
    function render() {
        acrossListEl.innerHTML = '';
        downListEl.innerHTML = '';

        // Render Across clues
        cluesData.across.forEach(clue => {
            const el = createHintElement(clue, 'across');
            acrossListEl.appendChild(el);
            allClues.push({ ...clue, direction: 'across', element: el });
        });

        // Render Down clues
        cluesData.down.forEach(clue => {
            const el = createHintElement(clue, 'down');
            downListEl.appendChild(el);
            allClues.push({ ...clue, direction: 'down', element: el });
        });
    }

    /**
     * Create a single hint element.
     */
    function createHintElement(clue, direction) {
        const div = document.createElement('div');
        div.className = 'hint-item';
        div.id = `hint-${direction}-${clue.number}`;
        div.dataset.number = clue.number;
        div.dataset.direction = direction;

        const numSpan = document.createElement('span');
        numSpan.className = 'hint-number';
        numSpan.textContent = clue.number;

        const textSpan = document.createElement('span');
        textSpan.className = 'hint-text';
        textSpan.textContent = clue.clue;

        div.appendChild(numSpan);
        div.appendChild(textSpan);

        // Click handler → highlight corresponding grid cells
        div.addEventListener('click', () => {
            selectHint(clue, direction);
        });

        return div;
    }

    /**
     * Select a hint (from hint click).
     */
    function selectHint(clue, direction) {
        // Clear previous active state
        clearActiveHint();

        // Find hint element and mark active
        const hintEl = document.getElementById(`hint-${direction}-${clue.number}`);
        if (hintEl) {
            hintEl.classList.add('active');
        }

        // Update active clue index
        activeClueIndex = allClues.findIndex(c =>
            c.number === clue.number && c.direction === direction
        );

        // Notify grid to highlight cells and focus first cell
        if (onHintSelect) {
            onHintSelect(clue.cells, direction, clue.cells[0]);
        }
    }

    /**
     * Highlight the hint corresponding to a grid cell selection.
     * Called when user taps a cell in the grid.
     */
    function highlightForCell(row, col, direction) {
        clearActiveHint();

        // Find the clue that contains this cell in the preferred direction
        let matchedClue = null;
        let matchedDir = direction;

        // First try the active direction
        matchedClue = findClueForCell(row, col, direction);

        // If not found, try the other direction
        if (!matchedClue) {
            const otherDir = direction === 'across' ? 'down' : 'across';
            matchedClue = findClueForCell(row, col, otherDir);
            if (matchedClue) matchedDir = otherDir;
        }

        if (matchedClue) {
            const hintEl = document.getElementById(`hint-${matchedDir}-${matchedClue.number}`);
            if (hintEl) {
                hintEl.classList.add('active');
                // Scroll hint into view
                hintEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            activeClueIndex = allClues.findIndex(c =>
                c.number === matchedClue.number && c.direction === matchedDir
            );

            return { clue: matchedClue, direction: matchedDir };
        }

        return null;
    }

    /**
     * Find a clue that contains the given cell in the given direction.
     */
    function findClueForCell(row, col, direction) {
        const clueList = direction === 'across' ? cluesData.across : cluesData.down;
        for (const clue of clueList) {
            for (const cell of clue.cells) {
                if (cell.row === row && cell.col === col) {
                    return clue;
                }
            }
        }
        return null;
    }

    /**
     * Clear active hint highlighting.
     */
    function clearActiveHint() {
        document.querySelectorAll('.hint-item.active').forEach(el => {
            el.classList.remove('active');
        });
    }

    /**
     * Get next/previous clue for Tab navigation.
     */
    function getAdjacentClue(offset) {
        if (allClues.length === 0) return null;
        let newIndex = activeClueIndex + offset;
        if (newIndex < 0) newIndex = allClues.length - 1;
        if (newIndex >= allClues.length) newIndex = 0;
        return allClues[newIndex];
    }

    /**
     * Get the active clue.
     */
    function getActiveClue() {
        if (activeClueIndex >= 0 && activeClueIndex < allClues.length) {
            return allClues[activeClueIndex];
        }
        return null;
    }

    /**
     * Get all clues data.
     */
    function getCluesData() {
        return cluesData;
    }

    return {
        init,
        highlightForCell,
        selectHint,
        clearActiveHint,
        getAdjacentClue,
        getActiveClue,
        getCluesData,
        findClueForCell
    };
})();
