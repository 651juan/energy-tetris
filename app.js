// Game Constants
const GRID_WIDTH = 10;
const GRID_HEIGHT = 20;
const ENERGY_THRESHOLD = 5000;
const TOUCH_SWIPE_THRESHOLD = 30;
const TOUCH_TIME_THRESHOLD = 300;

// Tetromino shapes
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
  I: '#1FB8CD',
  O: '#FFC185',
  T: '#B4413C',
  S: '#5D878F',
  Z: '#DB4545',
  J: '#D2BA4C',
  L: '#964325'
};

// Game State
let canvas, ctx;
let blockSize;
let grid = [];
let currentPiece = null;
let gameLoop = null;
let score = 0;
let level = 1;
let energy = 0;
let isPaused = false;
let gameStarted = false;
let dropInterval = 1000;
let lastDropTime = 0;
let treasureUnlocked = false;

// Touch state
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

// Initialize game
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Set up responsive canvas
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Initialize grid
  resetGrid();
  
  // Set up controls
  setupKeyboardControls();
  setupTouchControls();
  setupButtonControls();
  
  // Update controls info based on device
  updateControlsInfo();
  
  // Initial render
  render();
}

function resizeCanvas() {
  const container = canvas.parentElement;
  const maxWidth = Math.min(container.clientWidth, 600);
  const maxHeight = window.innerHeight * 0.6; // 60vh max
  
  // Calculate block size based on available space
  const blockWidth = Math.floor(maxWidth / GRID_WIDTH);
  const blockHeight = Math.floor(maxHeight / GRID_HEIGHT);
  blockSize = Math.min(blockWidth, blockHeight, 30);
  
  canvas.width = GRID_WIDTH * blockSize;
  canvas.height = GRID_HEIGHT * blockSize;
  
  if (gameStarted) {
    render();
  }
}

function resetGrid() {
  grid = Array(GRID_HEIGHT).fill(null).map(() => Array(GRID_WIDTH).fill(0));
}

function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    if (!gameStarted || isPaused) return;
    
    switch(e.key) {
      case 'ArrowLeft':
        movePiece(-1, 0);
        e.preventDefault();
        break;
      case 'ArrowRight':
        movePiece(1, 0);
        e.preventDefault();
        break;
      case 'ArrowDown':
        movePiece(0, 1);
        e.preventDefault();
        break;
      case 'ArrowUp':
        rotatePiece();
        e.preventDefault();
        break;
      case ' ':
        hardDrop();
        e.preventDefault();
        break;
    }
  });
}

function setupTouchControls() {
  canvas.addEventListener('touchstart', (e) => {
    if (!gameStarted || isPaused) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    if (!gameStarted || isPaused) return;
    e.preventDefault();
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    const deltaTime = Date.now() - touchStartTime;
    
    // Quick tap = rotate
    if (Math.abs(deltaX) < TOUCH_SWIPE_THRESHOLD && 
        Math.abs(deltaY) < TOUCH_SWIPE_THRESHOLD && 
        deltaTime < TOUCH_TIME_THRESHOLD) {
      rotatePiece();
      return;
    }
    
    // Swipe detection
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > TOUCH_SWIPE_THRESHOLD) {
        movePiece(deltaX > 0 ? 1 : -1, 0);
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > TOUCH_SWIPE_THRESHOLD) {
        if (deltaY > 0) {
          movePiece(0, 1);
        }
      }
    }
  }, { passive: false });
}

function setupButtonControls() {
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('pauseBtn').addEventListener('click', togglePause);
  
  // Mobile control buttons
  document.getElementById('leftBtn').addEventListener('click', () => movePiece(-1, 0));
  document.getElementById('rightBtn').addEventListener('click', () => movePiece(1, 0));
  document.getElementById('rotateBtn').addEventListener('click', rotatePiece);
  document.getElementById('downBtn').addEventListener('click', hardDrop);
}

function updateControlsInfo() {
  const isMobile = window.innerWidth < 768;
  const controlsList = document.getElementById('controlsList');
  
  if (isMobile) {
    controlsList.innerHTML = `
      <li>Swipe left/right: Move</li>
      <li>Swipe down: Drop</li>
      <li>Tap: Rotate</li>
      <li>Or use buttons below</li>
    `;
  } else {
    controlsList.innerHTML = `
      <li>← → : Move</li>
      <li>↑ : Rotate</li>
      <li>↓ : Soft Drop</li>
      <li>Space : Hard Drop</li>
    `;
  }
}

function startGame() {
  if (gameStarted && !isPaused) {
    // Reset game
    resetGame();
  }
  
  gameStarted = true;
  isPaused = false;
  
  if (!currentPiece) {
    spawnPiece();
  }
  
  document.getElementById('startBtn').textContent = 'Restart';
  
  if (!gameLoop) {
    gameLoop = requestAnimationFrame(update);
  }
}

function togglePause() {
  if (!gameStarted) return;
  
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
  
  if (!isPaused) {
    lastDropTime = Date.now();
    gameLoop = requestAnimationFrame(update);
  }
}

function resetGame() {
  resetGrid();
  score = 0;
  level = 1;
  energy = 0;
  treasureUnlocked = false;
  dropInterval = 1000;
  currentPiece = null;
  updateUI();
  document.getElementById('treasureCard').classList.add('hidden');
}

function spawnPiece() {
  const shapeKeys = Object.keys(SHAPES);
  const randomShape = shapeKeys[Math.floor(Math.random() * shapeKeys.length)];
  
  currentPiece = {
    shape: SHAPES[randomShape],
    color: COLORS[randomShape],
    x: Math.floor(GRID_WIDTH / 2) - 1,
    y: 0
  };
  
  // Check if game over
  if (checkCollision(currentPiece.x, currentPiece.y, currentPiece.shape)) {
    gameOver();
  }
}

function movePiece(dx, dy) {
  if (!currentPiece) return;
  
  const newX = currentPiece.x + dx;
  const newY = currentPiece.y + dy;
  
  if (!checkCollision(newX, newY, currentPiece.shape)) {
    currentPiece.x = newX;
    currentPiece.y = newY;
    
    if (dy > 0) {
      score += 1;
      energy += 1;
    }
    
    render();
    return true;
  }
  
  // If moving down failed, lock the piece
  if (dy > 0) {
    lockPiece();
  }
  
  return false;
}

function rotatePiece() {
  if (!currentPiece) return;
  
  const rotated = currentPiece.shape[0].map((_, i) =>
    currentPiece.shape.map(row => row[i]).reverse()
  );
  
  if (!checkCollision(currentPiece.x, currentPiece.y, rotated)) {
    currentPiece.shape = rotated;
    render();
  }
}

function hardDrop() {
  if (!currentPiece) return;
  
  let dropDistance = 0;
  while (movePiece(0, 1)) {
    dropDistance++;
  }
  
  score += dropDistance * 2;
  energy += dropDistance * 2;
}

function checkCollision(x, y, shape) {
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = x + col;
        const newY = y + row;
        
        if (newX < 0 || newX >= GRID_WIDTH || newY >= GRID_HEIGHT) {
          return true;
        }
        
        if (newY >= 0 && grid[newY][newX]) {
          return true;
        }
      }
    }
  }
  return false;
}

function lockPiece() {
  if (!currentPiece) return;
  
  for (let row = 0; row < currentPiece.shape.length; row++) {
    for (let col = 0; col < currentPiece.shape[row].length; col++) {
      if (currentPiece.shape[row][col]) {
        const y = currentPiece.y + row;
        const x = currentPiece.x + col;
        if (y >= 0) {
          grid[y][x] = currentPiece.color;
        }
      }
    }
  }
  
  clearLines();
  spawnPiece();
  updateUI();
}

function clearLines() {
  let linesCleared = 0;
  
  for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
    if (grid[row].every(cell => cell !== 0)) {
      grid.splice(row, 1);
      grid.unshift(Array(GRID_WIDTH).fill(0));
      linesCleared++;
      row++; // Check the same row again
    }
  }
  
  if (linesCleared > 0) {
    const points = [0, 100, 300, 500, 800][linesCleared] * level;
    score += points;
    energy += points;
    
    // Level up every 1000 points
    level = Math.floor(score / 1000) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 100);
    
    // Check for treasure unlock
    if (energy >= ENERGY_THRESHOLD && !treasureUnlocked) {
      unlockTreasure();
    }
  }
}

function unlockTreasure() {
  treasureUnlocked = true;
  const treasureCode = generateTreasureCode();
  document.getElementById('treasureCode').textContent = treasureCode;
  document.getElementById('treasureCard').classList.remove('hidden');
}

function generateTreasureCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function gameOver() {
  gameStarted = false;
  if (gameLoop) {
    cancelAnimationFrame(gameLoop);
    gameLoop = null;
  }
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${blockSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-family-base')}`;
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
  
  ctx.font = `${blockSize * 0.6}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-family-base')}`;
  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + blockSize * 1.5);
  
  document.getElementById('startBtn').textContent = 'Start Game';
}

function update(timestamp) {
  if (!gameStarted || isPaused) return;
  
  const elapsed = timestamp - lastDropTime;
  
  if (elapsed > dropInterval) {
    movePiece(0, 1);
    lastDropTime = timestamp;
  }
  
  render();
  gameLoop = requestAnimationFrame(update);
}

function render() {
  // Clear canvas
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-surface');
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-border');
  ctx.lineWidth = 1;
  
  for (let row = 0; row < GRID_HEIGHT; row++) {
    for (let col = 0; col < GRID_WIDTH; col++) {
      ctx.strokeRect(col * blockSize, row * blockSize, blockSize, blockSize);
      
      if (grid[row][col]) {
        ctx.fillStyle = grid[row][col];
        ctx.fillRect(col * blockSize + 1, row * blockSize + 1, blockSize - 2, blockSize - 2);
      }
    }
  }
  
  // Draw current piece
  if (currentPiece) {
    ctx.fillStyle = currentPiece.color;
    for (let row = 0; row < currentPiece.shape.length; row++) {
      for (let col = 0; col < currentPiece.shape[row].length; col++) {
        if (currentPiece.shape[row][col]) {
          const x = (currentPiece.x + col) * blockSize;
          const y = (currentPiece.y + row) * blockSize;
          ctx.fillRect(x + 1, y + 1, blockSize - 2, blockSize - 2);
        }
      }
    }
  }
}

function updateUI() {
  document.getElementById('scoreDisplay').textContent = score;
  document.getElementById('levelDisplay').textContent = level;
  document.getElementById('energyDisplay').textContent = `${energy} / ${ENERGY_THRESHOLD}`;
  
  const energyPercent = Math.min(100, (energy / ENERGY_THRESHOLD) * 100);
  document.getElementById('energyFill').style.width = energyPercent + '%';
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', updateControlsInfo);