// Classic Snake – Retro Edition
// passt zu deiner index.html

window.addEventListener("load", () => {
  // Canvas & Kontext
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // Spielfeld
  const tileCount = 23;              // 23x23 Felder
  const tileSize = canvas.width / tileCount;

  // --- Retro-Farben & Pixel-Stil ---
  const BG_COLOR_OUTER = "#4e7a1e";  // dunkleres Grün
  const BG_COLOR_INNER = "#6daa2a";  // helleres Grün
  const PIXEL_COLOR    = "#001600";  // Snake, Rand, Steine
  const APPLE_COLOR    = "#b00000";  // Apfel

  const PIXEL_SCALE  = 0.7;
  const PIXEL_MARGIN = (1 - PIXEL_SCALE) / 2;

  // Spiel-Status
  let snake;
  let direction;
  let nextDirection;
  let apple;
  let score;
  let gameLoopId = null;
  let gameMode = "classic"; // "classic" oder "hard"
  let isGameOver = false;

  // Hindernisse (Steine) im Hard-Mode
  let obstacles = [];          // einzelne Zellen (für Kollision)
  let obstacleBlocks = [];     // Blöcke (oben-links, fürs Zeichnen)
  const OBSTACLE_COUNT = 15;   // Anzahl 2x2-Blöcke im Hard-Mode

  // Geschwindigkeiten
  const GAME_SPEED_CLASSIC = 200;
  const GAME_SPEED_HARD    = 260;

  // Highscore-Keys (lokal)
  const BEST_KEY_CLASSIC = "snake_best_classic";
  const BEST_KEY_HARD    = "snake_best_hard";

  // Globales Leaderboard (Top 10, lokal)
  const GLOBAL_KEY       = "snake_leaderboard_global";

  // Spielername (nur EINMAL abfragen)
  const PLAYER_NAME_KEY  = "snake_player_name";

  // 🔹 Demo-Snake im Menü (nur Hintergrund)
  const DEMO_SPEED = 250;   // ms pro Schritt
  let demoSnake = null;
  let demoDirection = null;
  let demoNextDirection = null;
  let demoApple = null;
  let demoLoopId = null;
  let isDemoActive = false;

  // DOM-Elemente
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

  // NEU: Tag für den Spielernamen im Menü
  const playerNameTag = document.getElementById("playerNameTag");

  // Leaderboard sicher geschlossen
  if (leaderboardOverlay) {
    leaderboardOverlay.classList.add("hidden");
  }

  // -----------------------------
  // Spielername (nur einmal fragen)
  // -----------------------------

  function getStoredPlayerName() {
    const n = localStorage.getItem(PLAYER_NAME_KEY);
    return n && n.trim() ? n.trim() : null;
  }

  function askPlayerNameOnce() {
    let name = getStoredPlayerName();
    if (name) return name;

    // Solange fragen, bis etwas eingegeben wurde
    while (!name) {
      name = prompt("Bitte gib deinen Spielernamen ein:", "Player");
      if (name === null) {
        // User hat auf Abbrechen geklickt -> nochmal fragen
        continue;
      }
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

  // -----------------------------
  // Demo-Snake Funktionen
  // -----------------------------

  function randomFreeCellDemo() {
    for (let i = 0; i < 300; i++) {
      const cell = {
        x: 1 + Math.floor(Math.random() * (tileCount - 2)),
        y: 1 + Math.floor(Math.random() * (tileCount - 2)),
      };

      const onSnake = demoSnake?.some(p => p.x === cell.x && p.y === cell.y);
      if (!onSnake) return cell;
    }
    return { x: 5, y: 5 };
  }

  function startDemo() {
    // Demo startet nur, wenn Menü sichtbar ist
    if (menu.classList.contains("hidden")) return;

    const cx = Math.floor(tileCount / 2);
    const cy = Math.floor(tileCount / 2);

    demoSnake = [
      { x: cx,     y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];
    demoDirection     = { x: 1, y: 0 };
    demoNextDirection = { x: 1, y: 0 };
    demoApple         = randomFreeCellDemo();

    isDemoActive = true;

    if (demoLoopId) clearInterval(demoLoopId);
    demoLoopId = setInterval(demoStep, DEMO_SPEED);
  }

  function stopDemo() {
    isDemoActive = false;
    if (demoLoopId) {
      clearInterval(demoLoopId);
      demoLoopId = null;
    }
  }

  function demoStep() {
    if (!isDemoActive || menu.classList.contains("hidden")) return;

    demoDirection = demoNextDirection;

    let head = {
      x: demoSnake[0].x + demoDirection.x,
      y: demoSnake[0].y + demoDirection.y,
    };

    // Wenn Wand vor uns -> neue Richtung wählen
    if (
      head.x <= 0 ||
      head.y <= 0 ||
      head.x >= tileCount - 1 ||
      head.y >= tileCount - 1
    ) {
      const dirs = [
        { x: 0,  y: -1 },
        { x: 0,  y: 1 },
        { x: -1, y: 0 },
        { x: 1,  y: 0 },
      ].filter(d => !(d.x === -demoDirection.x && d.y === -demoDirection.y));

      const safeDirs = dirs.filter(d => {
        const nx = demoSnake[0].x + d.x;
        const ny = demoSnake[0].y + d.y;
        return nx > 0 && ny > 0 && nx < tileCount - 1 && ny < tileCount - 1;
      });

      const options = safeDirs.length ? safeDirs : dirs;
      const choice  = options[Math.floor(Math.random() * options.length)];
      demoNextDirection = choice;
      demoDirection     = choice;

      head = {
        x: demoSnake[0].x + demoDirection.x,
        y: demoSnake[0].y + demoDirection.y,
      };
    }

    demoSnake.unshift(head);

    // Wenn sich die Demo selbst beißt -> kurz neu starten
    if (demoSnake.some((seg, i) => i > 0 && seg.x === head.x && seg.y === head.y)) {
      startDemo();
      drawGame();
      return;
    }

    if (demoApple && head.x === demoApple.x && head.y === demoApple.y) {
      demoApple = randomFreeCellDemo();
    } else {
      demoSnake.pop();
    }

    drawGame();
  }

  // -----------------------------
  // Event-Handler
  // -----------------------------

  btnPlay.addEventListener("click", () => {
    startGame();
  });

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

  // Leaderboard öffnen
  btnLeaderboard.addEventListener("click", () => {
    const bestClassic = getBestScore("classic");
    const bestHard = getBestScore("hard");

    if (lbClassicEl) lbClassicEl.textContent = bestClassic;
    if (lbHardEl)    lbHardEl.textContent = bestHard;

    updateGlobalLeaderboardDisplay();

    hideMenu();
    leaderboardOverlay.classList.remove("hidden");

    if (controls) controls.style.display = "none";
  });

  // Leaderboard per OK schließen
  btnCloseLeaderboard.addEventListener("click", () => {
    leaderboardOverlay.classList.add("hidden");
    showMenu("Tippe auf PLAY, um zu starten.");
    if (controls) controls.style.display = "flex";
  });

  // Leaderboard schließen, wenn man auf den Hintergrund tippt
  leaderboardOverlay.addEventListener("click", (e) => {
    if (e.target === leaderboardOverlay) {
      leaderboardOverlay.classList.add("hidden");
      showMenu("Tippe auf PLAY, um zu starten.");
      if (controls) controls.style.display = "flex";
    }
  });

  // Keyboard-Steuerung
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

  // Touch-Steuerung
  btnUp.addEventListener("click", () => setDirection(0, -1));
  btnDown.addEventListener("click", () => setDirection(0, 1));
  btnLeft.addEventListener("click", () => setDirection(-1, 0));
  btnRight.addEventListener("click", () => setDirection(1, 0));

  function setDirection(dx, dy) {
    if (dx === -direction.x && dy === -direction.y) return;
    nextDirection = { x: dx, y: dy };
  }

  // ⭐ überall tippen nach Game Over
  document.addEventListener("click", () => {
    if (isGameOver) {
      isGameOver = false;
      showMenu(`Game Over! Score: ${score}`);
    }
  });

  // -----------------------------
  // Spiel-Start / Reset
  // -----------------------------

  function startGame() {
    stopDemo();

    resetGameState();
    hideMenu();

    leaderboardOverlay.classList.add("hidden");
    if (controls) controls.style.display = "flex";

    if (gameLoopId) {
      clearInterval(gameLoopId);
    }

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
  }

  function hideMenu() {
    menu.classList.add("hidden");
  }

  function showMenu(message) {
    menu.classList.remove("hidden");
    menuStatus.textContent = message;
    startDemo();
  }

  // -----------------------------
  // Game Loop
  // -----------------------------

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

  // -----------------------------
  // Objekte platzieren
  // -----------------------------

  function spawnApple() {
    apple = randomFreeCell();
  }

  // Safe-Zone direkt vor dem Start der Schlange
  function isInStartSafeZone(cell) {
    const startX = Math.floor(tileCount / 2);
    const startY = Math.floor(tileCount / 2);

    for (let dx = 0; dx <= 4; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const sx = startX + dx;
        const sy = startY + dy;
        if (cell.x === sx && cell.y === sy) {
          return true;
        }
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
        { x: origin.x,     y: origin.y + 1 },
        { x: origin.x + 1, y: origin.y + 1 },
      ];

      const validBlock = blockCells.every((c) =>
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

      const onSnake = snake.some(
        (p) => p.x === cell.x && p.y === cell.y
      );
      const onApple =
        apple && apple.x === cell.x && apple.y === cell.y;
      const onObstacle = obstacles.some(
        (o) => o.x === cell.x && o.y === cell.y
      );

      if (!onSnake && !onApple && !onObstacle) {
        return cell;
      }
    }
    return null;
  }

  // -----------------------------
  // Highscores (lokal)
  // -----------------------------

  function getBestScore(mode) {
    const key = mode === "hard" ? BEST_KEY_HARD : BEST_KEY_CLASSIC;
    const value = localStorage.getItem(key);
    return value ? parseInt(value, 10) : 0;
  }

  function setBestScore(mode, value) {
    const key = mode === "hard" ? BEST_KEY_HARD : BEST_KEY_CLASSIC;
    localStorage.setItem(key, String(value));
  }

  // -----------------------------
  // Globales Leaderboard (Top 10)
  // -----------------------------

  function loadGlobalLeaderboard() {
    const raw = localStorage.getItem(GLOBAL_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
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
    if (list.length >= 10 && latestScore <= minScore) {
      return;
    }

    // 👇 Kein prompt mehr – wir nehmen den gespeicherten Spielernamen
    const name = getStoredPlayerName() || "Player";

    list.push({
      name,
      score: latestScore,
      mode: gameMode,
    });

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

    list.slice(0, 10).forEach((entry, index) => {
      const li = document.createElement("li");
      li.textContent = `${index + 1}. ${entry.name} – ${entry.score} (${entry.mode})`;
      globalListEl.appendChild(li);
    });
  }

  // -----------------------------
  // Zeichnen – Nokia-Style
  // -----------------------------

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

  function drawObstacleBlock(originX, originY, color) {
    const size = tileSize * PIXEL_SCALE;
    const offset = tileSize * PIXEL_MARGIN;

    ctx.fillStyle = color;
    ctx.fillRect(
      originX * tileSize + offset,
      originY * tileSize + offset,
      size * 2,
      size * 2
    );
  }

  function drawSnakeLine(snakeArray) {
    if (!snakeArray || snakeArray.length === 0) return;

    ctx.strokeStyle = PIXEL_COLOR;
    ctx.lineWidth = tileSize * 0.7;
    ctx.lineCap = "round";

    ctx.beginPath();

    const startX = snakeArray[0].x * tileSize + tileSize / 2;
    const startY = snakeArray[0].y * tileSize + tileSize / 2;
    ctx.moveTo(startX, startY);

    for (let i = 1; i < snakeArray.length; i++) {
      const px = snakeArray[i].x * tileSize + tileSize / 2;
      const py = snakeArray[i].y * tileSize + tileSize / 2;
      ctx.lineTo(px, py);
    }

    ctx.stroke();
  }

  function drawGameOverOverlay() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, canvas.height / 2 - 60, canvas.width, 120);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#000000";
    ctx.font = "24px 'Press Start 2P', monospace";
    ctx.fillText("GAME OVER", canvas.width / 2 + 2, canvas.height / 2 - 10 + 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(
      "Tippe, um fortzufahren",
      canvas.width / 2,
      canvas.height / 2 + 24
    );
  }

  function drawGame() {
    ctx.fillStyle = BG_COLOR_OUTER;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const borderPx = tileSize * 0.5;
    ctx.fillStyle = BG_COLOR_INNER;
    ctx.fillRect(
      borderPx,
      borderPx,
      canvas.width  - borderPx * 2,
      canvas.height - borderPx * 2
    );

    for (let x = 0; x < tileCount; x++) {
      drawPixelCell(x, 0, PIXEL_COLOR);
      drawPixelCell(x, tileCount - 1, PIXEL_COLOR);
    }
    for (let y = 1; y < tileCount - 1; y++) {
      drawPixelCell(0, y, PIXEL_COLOR);
      drawPixelCell(tileCount - 1, y, PIXEL_COLOR);
    }

    obstacleBlocks.forEach((origin) => {
      drawObstacleBlock(origin.x, origin.y, PIXEL_COLOR);
    });

    const useDemo =
      isDemoActive && !menu.classList.contains("hidden") && !isGameOver;

    const appleToDraw = useDemo ? demoApple : apple;
    const snakeToDraw = useDemo ? demoSnake : snake;

    if (appleToDraw) {
      drawPixelCell(appleToDraw.x, appleToDraw.y, APPLE_COLOR);
    }

    if (snakeToDraw) {
      drawSnakeLine(snakeToDraw);
    }

    if (isGameOver) {
      drawGameOverOverlay();
    }
  }

  // -----------------------------
  // HUD
  // -----------------------------

  function updateScoreDisplay() {
    if (scoreEl) {
      scoreEl.textContent = score;
    }
  }

  function updateGemsDisplay() {
    if (!gemsEl) return;
    gemsEl.textContent = 0;
  }

  // -----------------------------
  // Initialisierung
  // -----------------------------

  // 1. Spielername einmal abfragen (nur beim allerersten Start)
  askPlayerNameOnce();
  updatePlayerNameTag();

  // 2. Demo starten & erstes Bild zeichnen
  startDemo();
  drawGame();
  updateGlobalLeaderboardDisplay();
});
