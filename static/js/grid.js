/**
 * Crossword Grid Module
 * Renders and manages the interactive crossword grid.
 */

const Grid = (() => {
    let gridEl = null;
    let gridSize = 0;
    let gridRows = 0;
    let gridCols = 0;
    let gridData = [];
    let cells = {};  // { "r-c": { element, inputEl, row, col, type } }
    let activeCell = null;  // { row, col }
    let activeDirection = 'across';
    let activeWordCells = [];
    let onCellSelect = null;  // callback
    let onInputChange = null;  // callback

    /**
     * Initialize the grid with puzzle data.
     */
    function init(data, size, callbacks, rows, cols) {
        gridEl = document.getElementById('crossword-grid');
        gridSize = size;
        gridRows = rows || data.length;
        gridCols = cols || (data[0] ? data[0].length : size);
        gridData = data;
        onCellSelect = callbacks.onCellSelect || null;
        onInputChange = callbacks.onInputChange || null;
        activeCell = null;
        activeDirection = 'across';
        activeWordCells = [];
        cells = {};
        render();
    }

    /**
     * Compute and apply the largest cell size that fits the entire grid
     * within the available container space, with a reasonable min/max.
     */
    function computeCellSize() {
        const container = document.getElementById('crossword-grid-container');
        if (!container || !gridCols || !gridRows) return;

        const padH = 16; // horizontal padding (2 * 8px)
        const padV = 8;  // vertical padding
        const availableW = container.clientWidth - padH;
        const availableH = container.clientHeight - padV;

        // Fit both dimensions
        const byWidth = Math.floor(availableW / gridCols);
        const byHeight = Math.floor(availableH / gridRows);
        const rawSize = Math.min(byWidth, byHeight);

        // Clamp to reasonable range for readability
        const cellSize = Math.max(20, Math.min(rawSize, 64));

        // Set on both root and grid element for specificity
        document.documentElement.style.setProperty('--cell-size', cellSize + 'px');

        // Derived font sizes
        const cellFont = Math.max(11, Math.round(cellSize * 0.48)) + 'px';
        const cellNumFont = Math.max(7, Math.round(cellSize * 0.22)) + 'px';
        document.documentElement.style.setProperty('--cell-font', cellFont);
        document.documentElement.style.setProperty('--cell-num-font', cellNumFont);
    }

    /**
     * Render the grid as a CSS Grid of cells.
     */
    function render() {
        computeCellSize();
        gridEl.innerHTML = '';
        gridEl.style.gridTemplateColumns = `repeat(${gridCols}, var(--cell-size))`;
        gridEl.style.gridTemplateRows = `repeat(${gridRows}, var(--cell-size))`;

        for (let r = 0; r < gridRows; r++) {
            for (let c = 0; c < gridCols; c++) {
                const cellData = gridData[r][c];
                const cellEl = document.createElement('div');
                cellEl.className = 'grid-cell';
                cellEl.dataset.row = r;
                cellEl.dataset.col = c;

                if (cellData.type === 'block') {
                    cellEl.classList.add('block');
                } else {
                    // Number label
                    if (cellData.number) {
                        const numSpan = document.createElement('span');
                        numSpan.className = 'cell-number';
                        numSpan.textContent = cellData.number;
                        cellEl.appendChild(numSpan);
                    }

                    // Input field
                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'cell-input';
                    input.setAttribute('autocomplete', 'off');
                    input.setAttribute('autocorrect', 'off');
                    input.setAttribute('autocapitalize', 'off');
                    input.setAttribute('spellcheck', 'false');
                    input.setAttribute('lang', 'mr');
                    input.setAttribute('inputmode', 'text');
                    input.setAttribute('aria-label', `सेल ${r + 1}, ${c + 1}`);
                    input.maxLength = 4;  // Allow for Marathi conjuncts

                    // Event handlers
                    input.addEventListener('focus', () => handleCellFocus(r, c));
                    input.addEventListener('input', (e) => handleInput(e, r, c));
                    input.addEventListener('keydown', (e) => handleKeyDown(e, r, c));
                    cellEl.addEventListener('click', (e) => {
                        e.preventDefault();
                        handleCellClick(r, c);
                    });

                    cellEl.appendChild(input);
                    cells[`${r}-${c}`] = { element: cellEl, inputEl: input, row: r, col: c, type: 'letter' };
                }

                gridEl.appendChild(cellEl);
            }
        }
    }

    /**
     * Handle cell click — select cell, toggle direction if re-clicking same cell.
     */
    function handleCellClick(row, col) {
        const key = `${row}-${col}`;
        if (!cells[key]) return;

        if (activeCell && activeCell.row === row && activeCell.col === col) {
            // Toggle direction
            activeDirection = activeDirection === 'across' ? 'down' : 'across';
        }

        selectCell(row, col);
        cells[key].inputEl.focus();
    }

    /**
     * Handle cell focus.
     */
    function handleCellFocus(row, col) {
        selectCell(row, col);
    }

    /**
     * Handle text input in a cell.
     */
    function handleInput(e, row, col) {
        const key = `${row}-${col}`;
        const input = cells[key].inputEl;
        let value = input.value;

        // Extract the Marathi akshar (could be multiple unicode codepoints)
        if (value.length > 0) {
            const chars = getMarathiChars(value);
            if (chars.length > 0) {
                // Keep only the last akshar entered
                const akshar = chars[chars.length - 1];
                input.value = akshar;
            }
        }

        // Clear error state
        cells[key].element.classList.remove('error');

        // Notify change
        if (onInputChange) {
            onInputChange(row, col, input.value);
        }

        // Auto-advance to next cell
        if (input.value) {
            moveToNextCell(row, col);
        }
    }

    /**
     * Handle keyboard navigation.
     */
    function handleKeyDown(e, row, col) {
        const key = e.key;

        switch (key) {
            case 'Backspace':
            case 'Delete': {
                const cellKey = `${row}-${col}`;
                if (cells[cellKey].inputEl.value === '') {
                    // Move to previous cell
                    e.preventDefault();
                    moveToPrevCell(row, col);
                } else {
                    // Clear this cell, let default action happen
                    setTimeout(() => {
                        if (onInputChange) {
                            onInputChange(row, col, '');
                        }
                    }, 0);
                }
                break;
            }
            case 'ArrowRight':
                e.preventDefault();
                moveToAdjacentCell(row, col, 0, 1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                moveToAdjacentCell(row, col, 0, -1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                moveToAdjacentCell(row, col, 1, 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                moveToAdjacentCell(row, col, -1, 0);
                break;
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    moveToPrevWord();
                } else {
                    moveToNextWord();
                }
                break;
        }
    }

    /**
     * Select a cell and highlight it and its word.
     */
    function selectCell(row, col) {
        // Clear previous highlighting
        clearHighlights();

        activeCell = { row, col };
        const key = `${row}-${col}`;

        if (cells[key]) {
            cells[key].element.classList.add('active');

            // Notify hints panel
            if (onCellSelect) {
                onCellSelect(row, col, activeDirection);
            }
        }
    }

    /**
     * Highlight cells belonging to a word.
     */
    function highlightWord(wordCells) {
        activeWordCells = wordCells;
        wordCells.forEach(c => {
            const key = `${c.row}-${c.col}`;
            if (cells[key] && !(activeCell && activeCell.row === c.row && activeCell.col === c.col)) {
                cells[key].element.classList.add('word-highlight');
            }
        });
    }

    /**
     * Clear all highlights.
     */
    function clearHighlights() {
        Object.values(cells).forEach(cell => {
            cell.element.classList.remove('active', 'word-highlight');
        });
        activeWordCells = [];
    }

    /**
     * Move to next cell in the active direction.
     */
    function moveToNextCell(row, col) {
        const dr = activeDirection === 'down' ? 1 : 0;
        const dc = activeDirection === 'across' ? 1 : 0;
        const nextRow = row + dr;
        const nextCol = col + dc;
        const key = `${nextRow}-${nextCol}`;
        if (cells[key]) {
            cells[key].inputEl.focus();
        }
    }

    /**
     * Move to previous cell in the active direction.
     */
    function moveToPrevCell(row, col) {
        const dr = activeDirection === 'down' ? -1 : 0;
        const dc = activeDirection === 'across' ? -1 : 0;
        const prevRow = row + dr;
        const prevCol = col + dc;
        const key = `${prevRow}-${prevCol}`;
        if (cells[key]) {
            cells[key].inputEl.focus();
        }
    }

    /**
     * Move to adjacent cell (arrow keys).
     */
    function moveToAdjacentCell(row, col, dr, dc) {
        let r = row + dr;
        let c = col + dc;
        while (r >= 0 && r < gridRows && c >= 0 && c < gridCols) {
            const key = `${r}-${c}`;
            if (cells[key]) {
                // Update direction based on arrow direction
                if (dc !== 0) activeDirection = 'across';
                if (dr !== 0) activeDirection = 'down';
                cells[key].inputEl.focus();
                return;
            }
            r += dr;
            c += dc;
        }
    }

    /**
     * Move to next word's first cell.
     */
    function moveToNextWord() {
        // Handled by hints module
        if (onCellSelect) {
            onCellSelect(activeCell?.row, activeCell?.col, activeDirection, 'next');
        }
    }

    /**
     * Move to previous word's first cell.
     */
    function moveToPrevWord() {
        if (onCellSelect) {
            onCellSelect(activeCell?.row, activeCell?.col, activeDirection, 'prev');
        }
    }

    /**
     * Set value of a cell (for reveal).
     */
    function setCellValue(row, col, value, isRevealed = false) {
        const key = `${row}-${col}`;
        if (cells[key]) {
            cells[key].inputEl.value = value;
            if (isRevealed) {
                cells[key].element.classList.add('revealed');
            }
        }
    }

    /**
     * Mark cells as errors.
     */
    function markErrors(errorCells) {
        errorCells.forEach(c => {
            const key = `${c.row}-${c.col}`;
            if (cells[key]) {
                cells[key].element.classList.add('error');
                // Remove error state after animation
                setTimeout(() => {
                    if (cells[key]) cells[key].element.classList.remove('error');
                }, 2000);
            }
        });
    }

    /**
     * Focus a specific cell.
     */
    function focusCell(row, col, direction) {
        const key = `${row}-${col}`;
        if (direction) activeDirection = direction;
        if (cells[key]) {
            cells[key].inputEl.focus();
        }
    }

    /**
     * Get the current user input grid.
     */
    function getUserInput() {
        const input = [];
        for (let r = 0; r < gridRows; r++) {
            const row = [];
            for (let c = 0; c < gridCols; c++) {
                const key = `${r}-${c}`;
                row.push(cells[key] ? cells[key].inputEl.value : '');
            }
            input.push(row);
        }
        return input;
    }

    /**
     * Load user input into the grid.
     */
    function loadUserInput(inputData) {
        if (!inputData) return;
        for (let r = 0; r < gridRows && r < inputData.length; r++) {
            for (let c = 0; c < gridCols && c < inputData[r].length; c++) {
                const key = `${r}-${c}`;
                if (cells[key] && inputData[r][c]) {
                    cells[key].inputEl.value = inputData[r][c];
                }
            }
        }
    }

    /**
     * Get active cell info.
     */
    function getActiveCell() {
        return activeCell;
    }

    function getActiveDirection() {
        return activeDirection;
    }

    function setActiveDirection(dir) {
        activeDirection = dir;
    }

    function getActiveWordCells() {
        return activeWordCells;
    }

    /**
     * Split Marathi text into aksharas (logical characters).
     */
    function getMarathiChars(text) {
        const chars = [];
        let i = 0;
        while (i < text.length) {
            let cluster = text[i];
            i++;
            while (i < text.length) {
                const cp = text.codePointAt(i);
                // Halant (virama)
                if (cp === 0x094D) {
                    cluster += text[i];
                    i++;
                    if (i < text.length) {
                        cluster += text[i];
                        i++;
                    }
                    continue;
                }
                // Dependent vowel signs, nasalization marks
                if ((cp >= 0x0901 && cp <= 0x0903) ||
                    (cp >= 0x093E && cp <= 0x094C) ||
                    cp === 0x0962 || cp === 0x0963 || cp === 0x093C) {
                    cluster += text[i];
                    i++;
                    continue;
                }
                break;
            }
            chars.push(cluster);
        }
        return chars;
    }

    return {
        init,
        selectCell,
        highlightWord,
        clearHighlights,
        setCellValue,
        markErrors,
        focusCell,
        getUserInput,
        loadUserInput,
        getActiveCell,
        getActiveDirection,
        setActiveDirection,
        getActiveWordCells,
        getMarathiChars,
        computeCellSize  // Exposed for window resize reflow
    };
})();
