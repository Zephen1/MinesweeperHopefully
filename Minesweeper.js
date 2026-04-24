document.addEventListener('DOMContentLoaded', function() {
    let BOARD_SIZE = 10; // Start with 10x10, grows with each win
    let MINE_COUNT = Math.floor(BOARD_SIZE * BOARD_SIZE * 0.2); // About 20% of cells are mines
    let winCount = 0;

    let gameBoard = [];
    let gameOver = false;
    let firstClick = true;
    let flaggedCells = 0;
    let revealedCells = 0;

    const gameBoardElement = document.getElementById('game-board');
    let cells = []; // Will be populated dynamically

    // Update mine count based on current board size
    function updateMineCount() {
        MINE_COUNT = Math.floor(BOARD_SIZE * BOARD_SIZE * 0.2);
    }

    // Generate HTML for the game board
    function generateBoardHTML() {
        gameBoardElement.innerHTML = '';

        for (let row = 0; row < BOARD_SIZE; row++) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';

            for (let col = 0; col < BOARD_SIZE; col++) {
                const button = document.createElement('button');
                button.className = 'cell';
                button.setAttribute('data-row', row);
                button.setAttribute('data-col', col);
                rowDiv.appendChild(button);
            }

            gameBoardElement.appendChild(rowDiv);
        }

        // Update cells array
        cells = document.querySelectorAll('.cell');

        // Re-attach event listeners
        cells.forEach(cell => {
            const row = parseInt(cell.getAttribute('data-row'));
            const col = parseInt(cell.getAttribute('data-col'));

            cell.addEventListener('click', (event) => handleCellClick(event, row, col));
            cell.addEventListener('contextmenu', (event) => handleRightClick(event, row, col));
        });
    }

    // Initialize the game board
    function initializeBoard() {
        gameBoard = [];
        for (let row = 0; row < BOARD_SIZE; row++) {
            gameBoard[row] = [];
            for (let col = 0; col < BOARD_SIZE; col++) {
                gameBoard[row][col] = {
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    neighborMines: 0
                };
            }
        }
    }

    // Place mines randomly, avoiding the first clicked cell and surrounding area
    function placeMines(firstClickRow, firstClickCol) {
        let minesPlaced = 0;
        while (minesPlaced < MINE_COUNT) {
            const row = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE);

            // Don't place mines in the 5x5 area around first click (to ensure safe starting area)
            const distance = Math.max(Math.abs(row - firstClickRow), Math.abs(col - firstClickCol));
            if (distance <= 2 || gameBoard[row][col].isMine) {
                continue;
            }

            gameBoard[row][col].isMine = true;
            minesPlaced++;
        }
    }

    // Calculate neighbor mine counts
    function calculateNeighbors() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (!gameBoard[row][col].isMine) {
                    let count = 0;
                    for (let i = -1; i <= 1; i++) {
                        for (let j = -1; j <= 1; j++) {
                            const newRow = row + i;
                            const newCol = col + j;
                            if (newRow >= 0 && newRow < BOARD_SIZE &&
                                newCol >= 0 && newCol < BOARD_SIZE &&
                                gameBoard[newRow][newCol].isMine) {
                                count++;
                            }
                        }
                    }
                    gameBoard[row][col].neighborMines = count;
                }
            }
        }
    }

    // Reveal initial safe area around first click (about 15 cells)
    function revealInitialArea(centerRow, centerCol) {
        const cellsToReveal = [];
        const visited = new Set();

        // Start with the clicked cell
        cellsToReveal.push({row: centerRow, col: centerCol, distance: 0});

        let revealedCount = 0;
        const maxReveals = 15;

        while (cellsToReveal.length > 0 && revealedCount < maxReveals) {
            // Sort by distance to reveal closer cells first
            cellsToReveal.sort((a, b) => a.distance - b.distance);
            const cell = cellsToReveal.shift();

            const key = `${cell.row},${cell.col}`;
            if (visited.has(key)) continue;
            visited.add(key);

            // Reveal the cell if it's not a mine and not already revealed
            if (!gameBoard[cell.row][cell.col].isRevealed && !gameBoard[cell.row][cell.col].isMine) {
                revealCell(cell.row, cell.col);
                revealedCount++;

                // Add neighboring cells to the queue with increased distance
                for (let i = -1; i <= 1; i++) {
                    for (let j = -1; j <= 1; j++) {
                        const newRow = cell.row + i;
                        const newCol = cell.col + j;
                        if (newRow >= 0 && newRow < BOARD_SIZE &&
                            newCol >= 0 && newCol < BOARD_SIZE) {
                            const neighborKey = `${newRow},${newCol}`;
                            if (!visited.has(neighborKey)) {
                                cellsToReveal.push({
                                    row: newRow,
                                    col: newCol,
                                    distance: cell.distance + 1
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Get cell element by row and column
    function getCellElement(row, col) {
        return document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }

    // Reveal a cell
    function revealCell(row, col) {
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE ||
            gameBoard[row][col].isRevealed || gameBoard[row][col].isFlagged) {
            return;
        }

        const cell = gameBoard[row][col];
        cell.isRevealed = true;
        revealedCells++;

        const cellElement = getCellElement(row, col);
        cellElement.classList.add('revealed');

        if (cell.isMine) {
            cellElement.classList.add('mine');
            cellElement.textContent = '💣';
            gameOver = true;
            revealAllMines();
            alert('Game Over! You hit a mine.');
            return;
        }

        if (cell.neighborMines > 0) {
            cellElement.textContent = cell.neighborMines;
            cellElement.setAttribute('data-number', cell.neighborMines);
        } else {
            // Flood fill for empty cells
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    revealCell(row + i, col + j);
                }
            }
        }

        checkWinCondition();
    }

    // Reveal all mines (game over)
    function revealAllMines() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (gameBoard[row][col].isMine && !gameBoard[row][col].isFlagged) {
                    const cellElement = getCellElement(row, col);
                    cellElement.classList.add('revealed', 'mine');
                    cellElement.textContent = '💣';
                }
            }
        }
    }

    // Check if player won
    function checkWinCondition() {
        const totalCells = BOARD_SIZE * BOARD_SIZE;
        if (revealedCells === totalCells - MINE_COUNT) {
            winCount++;
            BOARD_SIZE++; // Increase board size by 1
            updateMineCount();
            showWinScreen();
            // Don't set gameOver = true yet, wait for modal interaction
        }
    }

    // Show win screen modal
    function showWinScreen() {
        const winModal = document.getElementById('win-modal');
        const levelCompletedEl = document.getElementById('level-completed');
        const currentLevelEl = document.getElementById('current-level');
        const minesAvoidedEl = document.getElementById('mines-avoided');
        const cellsRevealedEl = document.getElementById('cells-revealed');
        const nextSizeEl = document.getElementById('next-size');
        const nextMinesEl = document.getElementById('next-mines');

        levelCompletedEl.textContent = winCount;
        currentLevelEl.textContent = winCount;
        minesAvoidedEl.textContent = MINE_COUNT;
        cellsRevealedEl.textContent = revealedCells;
        nextSizeEl.textContent = (BOARD_SIZE) + 'x' + (BOARD_SIZE);
        nextMinesEl.textContent = Math.floor(BOARD_SIZE * BOARD_SIZE * 0.2);

        winModal.style.display = 'block';
    }

    // Hide win screen modal
    function hideWinScreen() {
        const winModal = document.getElementById('win-modal');
        winModal.style.display = 'none';
    }

    // Toggle flag on cell
    function toggleFlag(row, col) {
        if (gameBoard[row][col].isRevealed) return;

        const cell = gameBoard[row][col];
        const cellElement = getCellElement(row, col);

        cell.isFlagged = !cell.isFlagged;
        cellElement.classList.toggle('flagged');

        if (cell.isFlagged) {
            cellElement.textContent = '🚩';
            flaggedCells++;
        } else {
            cellElement.textContent = '';
            flaggedCells--;
        }
    }

    // Handle cell click
    function handleCellClick(event, row, col) {
        if (gameOver) return;

        if (firstClick) {
            initializeBoard();
            placeMines(row, col);
            calculateNeighbors();
            revealInitialArea(row, col);
            firstClick = false;
            return; // Don't reveal the cell again since revealInitialArea already did
        }

        revealCell(row, col);
    }

    // Handle right click (flag)
    function handleRightClick(event, row, col) {
        event.preventDefault();
        if (gameOver || firstClick) return;

        toggleFlag(row, col);
    }

    // Add reset button functionality
    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', () => {
        winCount = 0; // Reset to level 1
        BOARD_SIZE = 10; // Reset to initial size
        updateMineCount();
        resetGame();
    });

    // Add win modal functionality
    const playAgainBtn = document.getElementById('play-again-btn');
    const winModal = document.getElementById('win-modal');

    playAgainBtn.addEventListener('click', () => {
        hideWinScreen();
        startNewLevel();
    });

    // Close modal when clicking outside
    winModal.addEventListener('click', (event) => {
        if (event.target === winModal) {
            hideWinScreen();
            startNewLevel();
        }
    });

    // Start a new level (after winning)
    function startNewLevel() {
        gameOver = false;
        firstClick = true;
        flaggedCells = 0;
        revealedCells = 0;

        // Board size already increased in checkWinCondition
        generateBoardHTML();
        updateGameInfo();
    }

    // Reset game function
    function resetGame() {
        gameOver = false;
        firstClick = true;
        flaggedCells = 0;
        revealedCells = 0;

        // Regenerate board HTML if board size changed
        generateBoardHTML();

        cells.forEach(cell => {
            cell.classList.remove('revealed', 'mine', 'flagged');
            cell.textContent = '';
            cell.removeAttribute('data-number');
        });

        updateGameInfo();
    }

    // Update game info display
    function updateGameInfo() {
        const levelEl = document.getElementById('current-level');
        const boardSizeEl = document.getElementById('board-size');
        const mineCountEl = document.getElementById('mine-count');

        levelEl.textContent = winCount + 1;
        boardSizeEl.textContent = BOARD_SIZE + 'x' + BOARD_SIZE;
        mineCountEl.textContent = MINE_COUNT;
    }

    // Initialize the game
    generateBoardHTML();
    updateGameInfo();
});