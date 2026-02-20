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
            grid.appendChild(square);
        }
    }

    grid.style.gridTemplateColumns = `repeat(${nCol}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${nRow}, 1fr)`;
}

document.addEventListener("DOMContentLoaded", () => {
    drawGrid();
});