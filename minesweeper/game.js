var nRow = 10;
var nCol = 10;
var nMines = 10;

function drawGrid() {
    const grid = document.getElementById("board");
    for (let i = 0; i < nRow; i += 1) {
        for (let j = 0; j < nCol; j += 1) {
            const square = document.createElement("div");
            square.classList.add("cell");
            square.setAttribute("row", i);
            square.setAttribute("col", j);
            square.setAttribute("mine", "false");
            square.setAttribute("opened", "false");
            grid.appendChild(square);
        }
    }

    grid.style.gridTemplateColumns = `repeat(${nCol}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${nRow}, 1fr)`;
}

function placeMines() {
    for (let i = 0; i < nMines; i += 1) {
        const row = Math.floor(Math.random() * nRow);
        const col = Math.floor(Math.random() * nCol);
        const cell = document.querySelector(`.cell[row="${row}"][col="${col}"]`);
        if (cell.getAttribute("mine") === "true" && cell.getAttribute("opened") === "false") {
            i -= 1;
            continue;
        }
        cell.setAttribute("mine", "true");
    }
}

function updateColors() {
    const cells = document.querySelectorAll(".cell");
    cells.forEach(cell => {
        if (cell.getAttribute("opened") === "true") {
            if (cell.getAttribute("mine") === "true") {
                cell.classList.add("bombed");
            } else {
                cell.classList.remove("bombed");
                cell.style.backgroundColor = "var(--clicked-color)";
            }
        } else {
            cell.classList.remove("bombed");
            cell.style.backgroundColor = "var(--square-color)";
        }
    });
}

function countAdjacentMines(row, col) {
    let count = 0;
    // Parcours des 8 cases autour
    let directions = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];
    for (let i = 0; i < directions.length; i++) {
        let dr = directions[i][0];
        let dc = directions[i][1];
        let nr = parseInt(row) + dr;
        let nc = parseInt(col) + dc;

        if (nr >= 0 && nr < nRow && nc >= 0 && nc < nCol) {
            const neighbor = document.querySelector('.cell[row="' + nr + '"][col="' + nc + '"]');
            if (neighbor && neighbor.getAttribute("mine") === "true") {
                count++;
            }
        }
    }
    return count;
}

function resetGame() {
    const grid = document.getElementById("board");
    grid.innerHTML = "";
    drawGrid();
    updateColors();
}


function openEmptyCells(row, col) {
    const cell = document.querySelector(`.cell[row="${row}"][col="${col}"]`);

    if (!cell || cell.getAttribute("opened") === "true") return;
    cell.setAttribute("opened", "true");
    
    const n = countAdjacentMines(row, col);
    cell.textContent = n > 0 ? n : "";
    if (n === 0) {
        let directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];
        for (let i = 0; i < directions.length; i++) {
            let dr = directions[i][0];
            let dc = directions[i][1];
            let nr = parseInt(row) + dr;
            let nc = parseInt(col) + dc;
            if (nr >= 0 && nr < nRow && nc >= 0 && nc < nCol) {
                openEmptyCells(nr, nc);
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    let firstClick = true;
    drawGrid();
    console.log("Grid drawn");

    updateColors();

    const grid = document.getElementById("board");

    const resetButton = document.getElementById("reset");
    resetButton.addEventListener("click", () => {
        resetGame();
        firstClick = true;
        console.log("Game reset");
    });

    grid.addEventListener("click", (event) => {
        if (event.target.classList.contains("cell")) {
            const row = event.target.getAttribute("row");
            const col = event.target.getAttribute("col");

            // place mines after the first click to ensure the first click is never a mine
            if (firstClick) {
                placeMines();
                console.log("Mines placed");
                firstClick = false;
            }

            if (event.target.getAttribute("mine") === "true") {
                event.target.setAttribute("opened", "true");
                updateColors();
                return;
            }

            // empty cells around opened
            openEmptyCells(row, col);
            updateColors();
        }
    });
});