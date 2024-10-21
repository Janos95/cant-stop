// Can't Stop Game Implementation

// Game state
let board = {};
let players = [];
let currentPlayer = 0;
let temporaryMoves = {};

// Initialize the game board
function initializeBoard() {
    for (let i = 2; i <= 12; i++) {
        board[i] = {
            spaces: getColumnSpaces(i),
            completed: null,
            playerPositions: {}
        };
    }
}

// Get the number of spaces for each column
function getColumnSpaces(columnNumber) {
    const spacesMap = {
        2: 3, 12: 3,
        3: 5, 11: 5,
        4: 7, 10: 7,
        5: 9, 9: 9,
        6: 11, 8: 11,
        7: 13
    };
    return spacesMap[columnNumber];
}

// Function to set all columns to almost one for player 1 (for testing purposes)
function setAllColumnsToAlmostOneForPlayerOne() {
    for (let i = 2; i <= 12; i++) {
        board[i].playerPositions[0] = board[i].spaces - 1;
    }
    renderBoard();
}

// Call this function after initializing the board for testing
function initializeBoardForTesting() {
    initializeBoard();
    setAllColumnsToAlmostOneForPlayerOne();
}


// Start a new game
function startGame(numPlayers) {
    initializeBoard();
    //initializeBoardForTesting();
    players = Array.from({length: numPlayers}, (_, i) => ({
        id: i,
        color: getPlayerColor(i)
    }));
    currentPlayer = 0;
    temporaryMoves = {};
}

// Get a color for each player
function getPlayerColor(playerIndex) {
    const colors = ['red', 'blue', 'green', 'yellow'];
    return colors[playerIndex % colors.length];
}

// Display all possible combinations
function displayAllCombinations(combinations) {
    const moveButtons = document.getElementById('move-buttons');
    moveButtons.innerHTML = '<p style="color: red;">No valid moves available. Possible dice combinations were:</p>';
    combinations.forEach(combo => {
        const comboButton = document.createElement('button');
        comboButton.textContent = combo.join(', ');
        comboButton.style.backgroundColor = '#f0f0f0';
        comboButton.style.color = '#333';
        comboButton.style.border = '1px solid #ccc';
        comboButton.style.padding = '5px 10px';
        comboButton.style.margin = '5px';
        comboButton.style.borderRadius = '4px';
        comboButton.style.cursor = 'default';
        moveButtons.appendChild(comboButton);
    });
}

// Wait for the continue button to be clicked
function waitForContinueButton() {
    return new Promise(resolve => {
        const continueButton = document.getElementById('continue-button');
        continueButton.style.display = 'block';
        continueButton.onclick = () => {
            continueButton.style.display = 'none';
            resolve();
        };
    });
}

async function playerTurn() {
    let roll = rollDice();
    displayDiceRoll(roll);
    const combinations = getCombinations(roll);
    const validMoves = getValidMoves(combinations);

    if (validMoves.length === 0) {
        displayAllCombinations(combinations);
        await waitForContinueButton();

        endTurn(false);
        return;
    }
        
    const chosenMove = await playerChooseMove(validMoves);

    // apply the move
    chosenMove.forEach(columnNumber => {
        temporaryMoves[columnNumber] = (temporaryMoves[columnNumber] || 0) + 1;
    });
    renderBoard();

    if(checkWinner()) { return; }

    const continueTurn = await playerWantsToContiune();
    if (!continueTurn) {
        endTurn(true);
    }
}

// Roll 4 dice
function rollDice() {
    return Array.from({length: 4}, () => Math.floor(Math.random() * 6) + 1);
}

// Display the dice roll
function displayDiceRoll(roll) {
    const diceContainer = document.getElementById('dice-container');
    diceContainer.innerHTML = '';
    roll.forEach(value => {
        const die = document.createElement('div');
        die.className = 'die';
        die.textContent = value;
        diceContainer.appendChild(die);
    });
}

// Get all possible combinations from 4 dice
function getCombinations(diceRoll) {
    const combinations = new Set();
    const pairs = [
        [0, 1], [0, 2], [0, 3]
    ];
    
    for (const [i, j] of pairs) {
        const sum1 = diceRoll[i] + diceRoll[j];
        const remainingDice = diceRoll.filter((_, index) => index !== i && index !== j);
        const sum2 = remainingDice[0] + remainingDice[1];
        const combo = [sum1, sum2].sort();
        combinations.add(combo.join(','));
    }
    
    return Array.from(combinations).map(combo => combo.split(',').map(Number));
}

// Get valid moves from the combinations
function getValidMoves(combinations) {

    const activeColumns = Object.keys(temporaryMoves).map(Number);
    const activeCount = activeColumns.length;
    let validMoves = [];
    for (let i = 0; i < combinations.length; i++) {
        const combo = combinations[i];
        const a = combo[0];
        const b = combo[1];
        const isAActive = activeColumns.includes(a);
        const isBActive = activeColumns.includes(b);

        if (isAActive && isBActive) {
            validMoves.push([a, b]);
        } else if (activeCount <= 1) {
            validMoves.push([a, b]);
        } else if (activeCount === 2) {
            if (isAActive) {
                validMoves.push([a]);
            }
            if (isBActive) {
                validMoves.push([b]);
            }
            if (!isAActive && !isBActive) {
                validMoves.push([a]);
                validMoves.push([b]);
            }
        } else {
            if (isAActive) {
                validMoves.push([a]);
            }
            if (isBActive) {
                validMoves.push([b]);
            }
        }
    }

    // Filter out moves that are in finished columns
    let filteredMoves = [];
    for (let i = 0; i < validMoves.length; i++) {
        const move = validMoves[i];
        const filteredMove = move.filter(column => {
            const columnBoard = board[column];
            const tempMove = temporaryMoves[column] || 0;
            const committedMove = columnBoard.playerPositions[players[currentPlayer].id] || 0;
            const totalMoves = tempMove + committedMove;
            return columnBoard.completed === null && totalMoves < columnBoard.spaces;
        });
        if (filteredMove.length > 0) {
            filteredMoves.push(filteredMove);
        }
    }

    return Array.from(new Set(filteredMoves.map(move => JSON.stringify(move.sort()))), JSON.parse);
}

// End the turn
function endTurn(keepProgress) {
    if (keepProgress) {
        for (const [columnNumber, position] of Object.entries(temporaryMoves)) {
            const column = board[columnNumber];
            const playerId = players[currentPlayer].id;
            column.playerPositions[playerId] = (column.playerPositions[playerId] || 0) + position;
            if (column.playerPositions[playerId] === column.spaces) {
                column.completed = playerId;
                // Remove all committed moves for this column for all other players
                for (const otherPlayerId in column.playerPositions) {
                    if (otherPlayerId !== playerId.toString()) {
                        delete column.playerPositions[otherPlayerId];
                    }
                }
            }
        }
    }
    currentPlayer = (currentPlayer + 1) % players.length;
    temporaryMoves = {}; // Clear temporary moves
}

// Check for a winner
function checkWinner() {
    return players.find(player => {
        const completedColumns = Object.values(board).filter(column => column.completed === player.id).length;
        const potentialCompletions = player.id === players[currentPlayer].id
            ? Object.entries(board).filter(([columnNumber, column]) => {
                if (column.completed === null) {
                    const committedMoves = column.playerPositions[player.id] || 0;
                    const tempMoves = temporaryMoves[columnNumber] || 0;
                    return (committedMoves + tempMoves) === column.spaces;
                }
                return false;
            }).length
            : 0;
        return completedColumns + potentialCompletions >= 3;
    });
}

// Main game loop
async function playGame(numPlayers) {
    startGame(numPlayers);

    renderBoard(); // Initial render of the board
    while (!checkWinner()) {
        await playerTurn();
        renderBoard(); // Render the board after applying the move
    }
    announceWinner(checkWinner());
}

// Function to let the player choose a move
async function playerChooseMove(validMoves) {
    return new Promise((resolve) => {
        const moveButtons = document.getElementById('move-buttons');
        moveButtons.innerHTML = ''; // Clear previous buttons

        validMoves.forEach(move => {
            const button = document.createElement('button');
            button.textContent = move.join(', ');
            button.addEventListener('click', () => {
                moveButtons.innerHTML = ''; // Clear buttons after selection
                resolve(move);
            });
            moveButtons.appendChild(button);
        });
    });
}

// Function to check if the player wants to continue their turn
function playerWantsToContiune() {
    return new Promise((resolve) => {
        const continueButton = document.getElementById('continue-button');
        const endTurnButton = document.getElementById('end-turn-button');

        continueButton.style.display = 'inline-block';
        endTurnButton.style.display = 'inline-block';

        continueButton.addEventListener('click', () => {
            continueButton.style.display = 'none';
            endTurnButton.style.display = 'none';
            resolve(true);
        });

        endTurnButton.addEventListener('click', () => {
            continueButton.style.display = 'none';
            endTurnButton.style.display = 'none';
            resolve(false);
        });
    });
}

// Function to announce the winner
function announceWinner(winner) {
    const winnerMessage = document.getElementById('winner-message');
    winnerMessage.textContent = `Congratulations! Player ${winner.id} wins!`;
    winnerMessage.style.display = 'block';

    // Show fireworks animation
    const fireworks = document.getElementById('fireworks');
    fireworks.style.display = 'block';
    setTimeout(() => {
        fireworks.style.display = 'none';
    }, 5000);

}

// Render the game board
function renderBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = ''; // Clear the existing board

    for (let i = 2; i <= 12; i++) {
        const columnContainer = document.createElement('div');
        columnContainer.className = 'column-container';

        const column = document.createElement('div');
        column.className = 'column';
        column.id = `column-${i}`;

        const spaces = board[i].spaces;

        for (let j = 0; j < spaces; j++) {
            const space = document.createElement('div');
            space.className = 'space';

            if (j === spaces - 1) {
                // Add column number inside the upmost circle
                space.textContent = i;
                space.style.display = 'flex';
                space.style.justifyContent = 'center';
                space.style.alignItems = 'center';
                space.style.fontWeight = 'bold';
            }

            const playersOnSpace = [];
            for (let playerId in players) {
                const committedMoves = board[i].playerPositions[playerId] || 0;
                const tempMoves = (playerId == currentPlayer) ? (temporaryMoves[i] || 0) : 0;
                if (j === committedMoves + tempMoves - 1) {
                    playersOnSpace.push(players[playerId]);
                }
            }

            if (playersOnSpace.length > 0) {
                if (playersOnSpace.length === 1) {
                    space.style.backgroundColor = playersOnSpace[0].color;
                } else {
                    // Create a multi-colored circle
                    const pieSize = 360 / playersOnSpace.length;
                    let conic = playersOnSpace.map((player, index) => 
                        `${player.color} ${index * pieSize}deg ${(index + 1) * pieSize}deg`
                    ).join(', ');
                    space.style.background = `conic-gradient(${conic})`;
                    space.style.borderRadius = '50%';
                }
                space.classList.add('permanent-marker');
            }

            column.appendChild(space);
        }

        columnContainer.appendChild(column);

        gameBoard.appendChild(columnContainer);
    }
}
