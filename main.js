function initGameState({ width, height, minesCount }) {
  const state = {
    minesCount,
    minesLeft: minesCount,
    isGameOver: false,
    fieldsLeft: width * height,
    fields: Array.from({ length: height }, () =>
      Array(width).fill(0)
    ),
    timerStart: undefined,
    timerInterval: undefined,
  };

  insertMines(state, minesCount);

  return state;
}

function insertMines(state, minesCount) {
  const size = state.fieldsLeft;

  const indices = new Set();
  while (indices.size < minesCount) {
    const index = Math.floor(Math.random() * size);
    indices.add(index);
  }

  const width = state.fields[0].length;
  for (const index of indices) {
    const y = Math.floor(index / width);
    const x = index % width;

    state.fields[y][x] = -1;
    updateMineNeighbours(state, x, y);
  }

  state.fieldsLeft -= minesCount;
}

function updateMineNeighbours(state, mineX, mineY) {
  const { fields } = state;
  const height = fields.length;
  const width = fields[0].length;

  const startX = Math.max(0, mineX - 1);
  const startY = Math.max(0, mineY - 1);
  const endX = Math.min(width - 1, mineX + 1);
  const endY = Math.min(height - 1, mineY + 1);

  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (fields[y][x] !== -1) {
        fields[y][x]++;
      }
    }
  }
}

function createFieldButtons(view, state) {
  const fragment = new DocumentFragment();

  const height = state.fields.length;
  const width = state.fields[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const button = document.createElement('button');
      button.dataset.x = x;
      button.dataset.y = y;

      fragment.append(button);
    }
  }

  view.grid.style.gridTemplateColumns = `repeat(${width}, 1fr)`;
  view.grid.style.gridTemplateRows = `repeat(${height}, 1fr)`;

  view.grid.append(fragment);
}

function getButtonPosition(button) {
  return {
    x: Number(button.dataset.x),
    y: Number(button.dataset.y),
  };
}

function initView(view, state) {
  view.restart.removeAttribute('class');
  view.minesLeft.innerText = `${state.minesLeft}`.padStart(3, '0');
  view.timer.innerText = '000';

  const height = state.fields.length;
  const width = state.fields[0].length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const button = view.grid.children[index];

      button.innerText = '';
      button.disabled = false;
      button.removeAttribute('class');
      button.removeAttribute('data-value');
    }
  }
}

function restartGame(view, state) {
  clearInterval(state.timerInterval);

  const newState = initGameState({
    width: state.fields[0].length,
    height: state.fields.length,
    minesCount: state.minesCount,
  });

  Object.assign(state, newState);

  initView(view, state);
}

function ensureTimerStarted(view, state) {
  if (state.timerInterval) {
    return;
  }

  state.timerStart = new Date();
  state.timerInterval = setInterval(() => {
    const secondsElapsed = Math.floor(
      (new Date() - state.timerStart) / 1000
    );

    view.timer.innerText = `${secondsElapsed}`.padStart(3, '0');
  }, 1000);
}

function handleGameEvents(view, state) {
  view.restart.addEventListener('click', () =>
    restartGame(view, state)
  );

  view.grid.addEventListener('contextmenu', (event) =>
    event.preventDefault()
  );

  view.grid.addEventListener('mousedown', (event) => {
    if (state.isGameOver) {
      return;
    }

    const button = event.target;
    if (button.tagName !== 'BUTTON') {
      return;
    }

    ensureTimerStarted(view, state);
    if (event.button === 2) {
      handleFieldFlag(view, state, button);
    } else {
      handleFieldReveal(view, state, button);
    }
  });
}

function handleFieldFlag(view, state, button) {
  if (button.disabled) {
    return;
  }

  const isFlagged = button.classList.toggle('flagged');

  state.minesLeft += isFlagged ? -1 : 1;
  view.minesLeft.innerText = `${state.minesLeft}`.padStart(3, '0');
}

function handleFieldReveal(view, state, button) {
  const { x, y } = getButtonPosition(button);

  if (button.classList.contains('flagged')) {
    return;
  }

  switch (state.fields[y][x]) {
    case -1:
      if (revealField(state, button)) {
        button.classList.add('exploded');
        view.restart.className = 'lost';
        gameOver(view, state);
      }
      break;

    case 0:
      revealEmptyArea(view.grid, state, x, y);
      break;

    default:
      revealField(state, button);
  }

  if (state.fieldsLeft === 0) {
    view.restart.className = 'won';
    gameOver(view, state);
  }
}

function revealField(state, button) {
  if (button.disabled) {
    return false;
  }

  button.disabled = true;
  button.classList.remove('flagged');

  const { x, y } = getButtonPosition(button);

  switch (state.fields[y][x]) {
    case -1:
      button.dataset.value = -1;
      break;

    case 0:
      state.fieldsLeft--;
      break;

    default:
      button.dataset.value = state.fields[y][x];
      button.innerText = state.fields[y][x];
      state.fieldsLeft--;
  }

  return true;
}

function gameOver(view, state) {
  clearInterval(state.timerInterval);
  state.isGameOver = true;

  for (const button of view.grid.children) {
    const { x, y } = getButtonPosition(button);

    if (state.fields[y][x] === -1) {
      revealField(state, button);
    }
  }
}

function revealEmptyArea(grid, state, x, y) {
  const height = state.fields.length;
  const width = state.fields[0].length;

  const visited = new Set();

  function visit(i, j) {
    if (i < 0 || i >= width || j < 0 || j >= height) {
      return;
    }

    const index = j * width + i;
    if (visited.has(index)) {
      return;
    }
    visited.add(index);

    revealField(state, grid.children[index]);

    if (state.fields[j][i] !== 0) {
      return;
    }

    visit(i - 1, j);
    visit(i + 1, j);
    visit(i, j - 1);
    visit(i, j + 1);
  }

  visit(x, y);
}

function main() {
  const view = {
    minesLeft: document.getElementById('mines-left'),
    restart: document.getElementById('restart'),
    timer: document.getElementById('timer'),
    grid: document.getElementById('grid'),
  };

  const state = initGameState({
    width: 10,
    height: 12,
    minesCount: 12,
  });

  createFieldButtons(view, state);
  initView(view, state);
  handleGameEvents(view, state);
}

main();
