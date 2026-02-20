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
        if (cell.getAttribute("mine") === "true") {
            i -= 1;
            continue;
        }
        cell.setAttribute("mine", "true");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    drawGrid();
    console.log("Grid drawn");

    // place mines after the first click to ensure the first click is never a mine
    const grid = document.getElementById("board");
    grid.addEventListener("click", (event) => {
        if (event.target.classList.contains("cell")) {
            placeMines();
        }
    });

    console.log("Mines placed");
});