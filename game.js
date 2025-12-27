window.addEventListener("load", () => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const tileCount = 20;
  const tileSize = canvas.width / tileCount;

  const BG_COLOR_OUTER = "#4e7a1e";
  const BG_COLOR_INNER = "#6daa2a";
  const FIELD_LIGHT = "#6daa2a"; // hellgrün
  const FIELD_DARK = "#5f9824";  // dunkelgrün

  const PIXEL_COLOR = "#001600";
  const APPLE_COLOR = "#b00000";
  const SNAKE_COLOR = "#000000";
  const EYE_COLOR = "#ffffff";

  const PIXEL_SCALE = 0.7;
  const PIXEL_MARGIN = (1 - PIXEL_SCALE) / 2;

  let snake;
  let direction;
  let nextDirection;
  let apple;
  let score;
  let gameLoopId = null;
  let gameMode = "classic";
  let isGameOver = false;

  let obstacles = [];
  let obstacleBlocks = [];
  const OBSTACLE_COUNT = 10;

  const GAME_SPEED_CLASSIC = 200;
  const GAME_SPEED_HARD = 260;

  const BEST_KEY_CLASSIC = "snake_best_classic";
  const BEST_KEY_HARD = "snake_best_hard";
  const GLOBAL_KEY = "snake_leaderboard_global";
  const PLAYER_NAME_KEY = "snake_player_name";

  const btnPlay = document.getElementById("btnPlay");
  const levelClassic = document.getElementById("levelClassic");
  const levelHard = document.getElementById("levelHard");
  const menu = document.getElementById("menu");
  const menuStatus = document.getElementById("menuStatus");

  const btnLeaderboard = document.getElementById("btnLeaderboard");
  const leaderboardOverlay = document.getElementById("leaderboardOverlay");
  const btnCloseLeaderboard = document.getElementById("btnCloseLeaderboard");
  const lbClassicEl = document.getElementById("lbClassic");
  const lbHardEl = document.getElementById("lbHard");
  const globalListEl = document.getElementById("globalList");

  const scoreEl = document.getElementById("currentScore");
  const gemsEl = document.getElementById("gemsDisplay");

  const btnUp = document.getElementById("btnUp");
  const btnDown = document.getElementById("btnDown");
  const btnLeft = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");

  const controls = document.querySelector(".controls");
  const playerNameTag = document.getElementById("playerNameTag");

  if (leaderboardOverlay) {
    leaderboardOverlay.classList.add("hidden");
  }

  function getStoredPlayerName() {
    const n = localStorage.getItem(PLAYER_NAME_KEY);
    return n && n.trim() ? n.trim() : null;
  }

  function askPlayerNameOnce() {
    let name = getStoredPlayerName();
    if (name) return name;

    while (!name) {
      name = prompt("Bitte gib deinen Spielernamen ein:", "Player");
      if (name === null) continue;
      name = name.trim();
    }

    localStorage.setItem(PLAYER_NAME_KEY, name);
    return name;
  }

  function updatePlayerNameTag() {
    const name = getStoredPlayerName();
    if (playerNameTag) {
      playerNameTag.textContent = name ? `Player: ${name}` : "";
    }
  }

  btnPlay.addEventListener("click", startGame);

  levelClassic.addEventListener("click", () => {
    gameMode = "classic";
    setActiveLevelButton("classic");
  });

  levelHard.addEventListener("click", () => {
    gameMode = "hard";
    setActiveLevelButton("hard");
  });

  function setActiveLevelButton(mode) {
    levelClassic.classList.remove("active");
    levelHard.classList.remove("active");
    if (mode === "classic") levelClassic.classList.add("active");
    if (mode === "hard") levelHard.classList.add("active");
  }

  btnLeaderboard.addEventListener("click", () => {
    if (lbClassicEl) lbClassicEl.textContent = getBestScore("classic");
    if (lbHardEl) lbHardEl.textContent = getBestScore("hard");

    updateGlobalLeaderboardDisplay();
    hideMenu();
    leaderboardOverlay.classList.remove("hidden");
    if (controls) controls.style.display = "none";
  });

  btnCloseLeaderboard.addEventListener("click", () => {
    leaderboardOverlay.classList.add("hidden");
    showMenu("Tippe auf PLAY, um zu starten.");
    if (controls) controls.style.display = "flex";
  });

  leaderboardOverlay.addEventListener("click", (e) => {
    if (e.target === leaderboardOverlay) {
      leaderboardOverlay.classList.add("hidden");
      showMenu("Tippe auf PLAY, um zu starten.");
      if (controls) controls.style.display = "flex";
    }
  });

  document.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        setDirection(0, -1);
        break;
      case "ArrowDown":
      case "s":
      case "S":
        setDirection(0, 1);
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        setDirection(-1, 0);
        break;
      case "ArrowRight":
      case "d":
      case "D":
        setDirection(1, 0);
        break;
    }
  });

  btnUp.addEventListener("click", () => setDirection(0, -1));
  btnDown.addEventListener("click", () => setDirection(0, 1));
  btnLeft.addEventListener("click", () => setDirection(-1, 0));
  btnRight.addEventListener("click", () => setDirection(1, 0));

  function setDirection(dx, dy) {
    if (!direction) return; // falls noch nicht gestartet
    if (dx === -direction.x && dy === -direction.y) return;
    nextDirection = { x: dx, y: dy };
  }

  document.addEventListener("click", () => {
    if (isGameOver) {
      isGameOver = false;
      showMenu(`Game Over! Score: ${score}`);
    }
  });

  function startGame() {
    resetGameState();
    hideMenu();

    leaderboardOverlay.classList.add("hidden");
    if (controls) controls.style.display = "flex";

    if (gameLoopId) clearInterval(gameLoopId);
    const speed = gameMode === "hard" ? GAME_SPEED_HARD : GAME_SPEED_CLASSIC;
    gameLoopId = setInterval(gameLoop, speed);
  }

  function resetGameState() {
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);

    snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];

    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };

    score = 0;
    apple = null;
    obstacles = [];
    obstacleBlocks = [];
    isGameOver = false;

    spawnApple();
    setupObstacles();
    updateScoreDisplay();
    updateGemsDisplay();
    drawGame();
  }

  function hideMenu() {
    menu.classList.add("hidden");
  }

  function showMenu(message) {
    menu.classList.remove("hidden");
    menuStatus.textContent = message;
  }

  function gameLoop() {
    direction = nextDirection;

    const head = {
      x: snake[0].x + direction.x,
      y: snake[0].y + direction.y,
    };

    snake.unshift(head);

    if (hitsWall(head) || hitsSelf(head) || hitsObstacle(head)) {
      gameOver();
      return;
    }

    if (apple && head.x === apple.x && head.y === apple.y) {
      score += 10;
      updateScoreDisplay();
      spawnApple();
    } else {
      snake.pop();
    }

    drawGame();
  }

  function hitsWall(head) {
    return (
      head.x <= 0 ||
      head.y <= 0 ||
      head.x >= tileCount - 1 ||
      head.y >= tileCount - 1
    );
  }

  function hitsSelf(head) {
    for (let i = 1; i < snake.length; i++) {
      if (snake[i].x === head.x && snake[i].y === head.y) return true;
    }
    return false;
  }

  function hitsObstacle(head) {
    return obstacles.some((o) => o.x === head.x && o.y === head.y);
  }

  function gameOver() {
    if (gameLoopId) {
      clearInterval(gameLoopId);
      gameLoopId = null;
    }

    const currentBest = getBestScore(gameMode);
    if (score > currentBest) {
      setBestScore(gameMode, score);
    }

    maybeAddToGlobalLeaderboard(score);
    isGameOver = true;
    drawGame();
  }

  function spawnApple() {
    apple = randomFreeCell();
  }

  function isInStartSafeZone(cell) {
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);

    for (let dx = 0; dx <= 4; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const sx = startX + dx;
        const sy = startY + dy;
        if (cell.x === sx && cell.y === sy) return true;
      }
    }
    return false;
  }

  function setupObstacles() {
    obstacles = [];
    obstacleBlocks = [];
    if (gameMode !== "hard") return;

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
      const origin = randomFreeCell();
      if (!origin) continue;

      const blockCells = [
        origin,
        { x: origin.x + 1, y: origin.y },
        { x: origin.x, y: origin.y + 1 },
        { x: origin.x + 1, y: origin.y + 1 },
      ];

      const validBlock = blockCells.every(
        (c) =>
          c.x > 0 &&
          c.y > 0 &&
          c.x < tileCount - 1 &&
          c.y < tileCount - 1 &&
          !snake.some((p) => p.x === c.x && p.y === c.y) &&
          !(apple && apple.x === c.x && apple.y === c.y) &&
          !obstacles.some((o) => o.x === c.x && o.y === c.y) &&
          !isInStartSafeZone(c)
      );

      if (validBlock) {
        obstacles.push(...blockCells);
        obstacleBlocks.push({ x: origin.x, y: origin.y });
      }
    }

    updateGemsDisplay();
  }

  function randomFreeCell() {
    for (let i = 0; i < 300; i++) {
      const cell = {
        x: 1 + Math.floor(Math.random() * (tileCount - 2)),
        y: 1 + Math.floor(Math.random() * (tileCount - 2)),
      };

      const onSnake = snake.some((p) => p.x === cell.x && p.y === cell.y);
      const onApple = apple && apple.x === cell.x && apple.y === cell.y;
      const onObstacle = obstacles.some((o) => o.x === cell.x && o.y === cell.y);

      if (!onSnake && !onApple && !onObstacle) return cell;
    }
    return null;
  }

  function getBestScore(mode) {
    const key = mode === "hard" ? BEST_KEY_HARD : BEST_KEY_CLASSIC;
    const value = localStorage.getItem(key);
    return value ? parseInt(value, 10) : 0;
  }

  function setBestScore(mode, value) {
    const key = mode === "hard" ? BEST_KEY_HARD : BEST_KEY_CLASSIC;
    localStorage.setItem(key, String(value));
  }

  function loadGlobalLeaderboard() {
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveGlobalLeaderboard(list) {
    localStorage.setItem(GLOBAL_KEY, JSON.stringify(list));
  }

  function maybeAddToGlobalLeaderboard(latestScore) {
    if (!latestScore || latestScore <= 0) return;

    let list = loadGlobalLeaderboard();
    const minScore = list.length >= 10 ? list[list.length - 1].score : 0;
    if (list.length >= 10 && latestScore <= minScore) return;

    const name = getStoredPlayerName() || "Player";

    list.push({ name, score: latestScore, mode: gameMode });
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 10);

    saveGlobalLeaderboard(list);
  }

  function updateGlobalLeaderboardDisplay() {
    if (!globalListEl) return;

    const list = loadGlobalLeaderboard();
    globalListEl.innerHTML = "";

    if (list.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Noch keine Einträge.";
      globalListEl.appendChild(li);
      return;
    }

    list.forEach((entry, index) => {
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${entry.name} – ${entry.score} (${entry.mode})`;
      globalListEl.appendChild(li);
    });
  }

  function drawPixelCell(gridX, gridY, color) {
    const size = tileSize * PIXEL_SCALE;
    const offset = tileSize * PIXEL_MARGIN;
    ctx.fillStyle = color;
    ctx.fillRect(
      gridX * tileSize + offset,
      gridY * tileSize + offset,
      size,
      size
    );
  }

  // ✅ FIX: Obstacles exakt auf Raster, ohne Scale/Offset
  function drawObstacleBlock(originX, originY, color) {
    ctx.fillStyle = color;
    ctx.fillRect(originX * tileSize, originY * tileSize, tileSize * 2, tileSize * 2);
  }

  function drawSnakeBlocks(snakeArray, dir) {
    if (!snakeArray || snakeArray.length === 0) return;

    for (let i = snakeArray.length - 1; i >= 1; i--) {
      drawPixelCell(snakeArray[i].x, snakeArray[i].y, SNAKE_COLOR);
    }

    const head = snakeArray[0];
    drawPixelCell(head.x, head.y, SNAKE_COLOR);

    drawSnakeEyesOnHead(head, dir);
  }

  function drawSnakeEyesOnHead(head, dir) {
    const size = tileSize * PIXEL_SCALE;
    const offset = tileSize * PIXEL_MARGIN;

    const x0 = head.x * tileSize + offset;
    const y0 = head.y * tileSize + offset;

    const eyeSize = size * 0.22;
    const inset = size * 0.16;
    const spread = size * 0.32;

    let e1x, e1y, e2x, e2y;

    if (dir && dir.x === 1) {
      e1x = x0 + size - inset - eyeSize;
      e2x = x0 + size - inset - eyeSize;
      e1y = y0 + inset;
      e2y = y0 + inset + spread;
    } else if (dir && dir.x === -1) {
      e1x = x0 + inset;
      e2x = x0 + inset;
      e1y = y0 + inset;
      e2y = y0 + inset + spread;
    } else if (dir && dir.y === 1) {
      e1y = y0 + size - inset - eyeSize;
      e2y = y0 + size - inset - eyeSize;
      e1x = x0 + inset;
      e2x = x0 + inset + spread;
    } else {
      e1y = y0 + inset;
      e2y = y0 + inset;
      e1x = x0 + inset;
      e2x = x0 + inset + spread;
    }

    ctx.fillStyle = EYE_COLOR;
    ctx.fillRect(e1x, e1y, eyeSize, eyeSize);
    ctx.fillRect(e2x, e2y, eyeSize, eyeSize);
  }

  function drawGameOverOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "24px 'Press Start 2P', monospace";
    ctx.fillStyle = "#000";
    ctx.fillText("GAME OVER", canvas.width / 2 + 2, canvas.height / 2 - 10 + 2);
    ctx.fillStyle = "#fff";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText("Tippe, um fortzufahren", canvas.width / 2, canvas.height / 2 + 24);
  }

  function drawGame() {
    ctx.fillStyle = BG_COLOR_OUTER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 1; y < tileCount - 1; y++) {
      for (let x = 1; x < tileCount - 1; x++) {
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? FIELD_DARK : FIELD_LIGHT;
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
    }

    for (let x = 0; x < tileCount; x++) {
      drawPixelCell(x, 0, PIXEL_COLOR);
      drawPixelCell(x, tileCount - 1, PIXEL_COLOR);
    }
    for (let y = 1; y < tileCount - 1; y++) {
      drawPixelCell(0, y, PIXEL_COLOR);
      drawPixelCell(tileCount - 1, y, PIXEL_COLOR);
    }

    obstacleBlocks.forEach((o) => drawObstacleBlock(o.x, o.y, PIXEL_COLOR));

    if (apple) drawPixelCell(apple.x, apple.y, APPLE_COLOR);
    if (snake && snake.length) drawSnakeBlocks(snake, direction);
    if (isGameOver) drawGameOverOverlay();
  }

  function updateScoreDisplay() {
    if (scoreEl) scoreEl.textContent = score;
  }

  function updateGemsDisplay() {
    if (gemsEl) gemsEl.textContent = 0;
  }

  askPlayerNameOnce();
  updatePlayerNameTag();
  drawGame();
  updateGlobalLeaderboardDisplay();
});
