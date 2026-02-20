function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function updateCount() {
  const squares = grid.querySelectorAll("div");
  let originalCount = 0;
  let clickedCount = 0;
  let blueCount = 0;
  let totalCount = 0;

  for (const square of squares) {
    const isClicked = square.classList.contains("colored");
    const isBlue = square.style.backgroundColor === "blue";

    if (!isClicked && !isBlue) {
      originalCount += 1;
    }

    if (isClicked) {
      clickedCount += 1;
    }

    if (isBlue) {
      blueCount += 1;
    }
  }

  totalCount = originalCount + clickedCount + blueCount;

  const originalText = document.getElementById("original-count");
  const clickedText = document.getElementById("clicked-count");
  const blueText = document.getElementById("blue-count");
  const totalText = document.getElementById("total-count");

  originalText.textContent = `Original squares: ${originalCount}`;
  clickedText.textContent = `Clicked squares: ${clickedCount}`;
  blueText.textContent = `Blue squares: ${blueCount}`;
  totalText.textContent = `Total squares: ${totalCount}`;
}


document.addEventListener("DOMContentLoaded", () => {
  // Initial clean up. DO NOT REMOVE.
  initialCleanup();

  const addLineButton = document.getElementById("btn-add-line");
  const grid = document.getElementById("grid");
  const removeLineButton = document.getElementById("btn-remove-line");

  updateCount();

  addLineButton.addEventListener("click", () => {
    for (let i = 0; i < 10; i += 1) {
      const square = document.createElement("div");
      grid.appendChild(square);
    }

    updateCount();
  });

  removeLineButton.addEventListener("click", () => {
    const squares = grid.querySelectorAll("div");
    for (let i = squares.length - 10; i < squares.length; i += 1) {
      squares[i].remove();
    }

    updateCount();
  });

  /* change the color of the squares if they are clicked */
  grid.addEventListener("click", (event) => {
    if (event.target === grid) {
      return;
    }

    event.target.style.backgroundColor = getRandomColor();
    event.target.classList.add("colored");

    updateCount();

  });

  grid.addEventListener("mouseover", (event) => {
    if (event.target === grid) {
      return;
    }

    if (!event.target.classList.contains("colored")) {
      event.target.style.backgroundColor = "blue";
      updateCount();

      return;
    }
  });
});

/**
 * Cleans up the document so that the exercise is easier.
 *
 * There are some text and comment nodes that are in the initial DOM, it's nice
 * to clean them up beforehand.
 */
function initialCleanup() {
  const nodesToRemove = [];
  document.getElementById("grid").childNodes.forEach((node, key) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      nodesToRemove.push(node);
    }
  });
  for (const node of nodesToRemove) {
    node.remove();
  }
}
