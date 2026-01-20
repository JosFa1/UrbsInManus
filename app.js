const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 800
const WORLD_WIDTH = 2400
const WORLD_HEIGHT = 1600
const TILE_SIZE = 48
const TICK_DURATION = 100
const TICKS_PER_DAY = 144
const NIGHT_START_TICK = 108
const DAY_START_TICK = 36

let gameState = {
  buildings: [],
  households: [],
  day: 1,
  tick: 0,
  paused: false,
  speed: 1,
  aes: 500,
  selectedBuildType: null,
  hasAqueduct: false,
  gameStarted: false,
  winConditionDays: 0,
  events: [],
  nextEventTick: 200,
  history: [],
  historyIndex: -1,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  previewBuilding: null,
  cameraZoom: 1.0,
  cameraOffsetX: 0,
  cameraOffsetY: 0,
  isNightPhase: false,
  difficulty: 1.0
}

const BUILDINGS = {
  via: { cost: 5, name: "Via", color: "#8B7D6B", isRoad: true, width: 48, height: 48, graphic: "graphics/buildings/via.png" },
  insula: { cost: 20, name: "Insula", color: "#CD853F", needsRoad: false, isHousing: true, capacity: 6, density: "high", type: "plebs", width: 96, height: 96, graphic: "graphics/buildings/insula.png" },
  domus: { cost: 40, name: "Domus", color: "#DEB887", needsRoad: false, isHousing: true, capacity: 3, density: "low", type: "equites", width: 96, height: 96, graphic: "graphics/buildings/domus.png" },
  macellum: { cost: 50, name: "Macellum", color: "#DAA520", needsRoad: true, isFood: true, capacity: 100, width: 144, height: 96, graphic: "graphics/buildings/macellum.png" },
  pistrinum: { cost: 30, name: "Pistrinum", color: "#D2691E", needsRoad: true, isFood: true, capacity: 60, width: 48, height: 48, graphic: "graphics/buildings/pistrinum.png" },
  horrea: { cost: 60, name: "Horrea", color: "#8B4513", needsRoad: true, isStorage: true, width: 96, height: 144, graphic: "graphics/buildings/horrea.png" },
  aquaeductus: { cost: 100, name: "Aquaeductus", color: "#4682B4", needsRoad: false, isWater: true, width: 48, height: 144, graphic: "graphics/buildings/aquaeductus.png" },
  fons: { cost: 25, name: "Fons", color: "#87CEEB", needsRoad: true, isWater: true, capacity: 80, width: 48, height: 48, graphic: "graphics/buildings/fons.png" },
  latrina: { cost: 20, name: "Latrina", color: "#A0522D", needsRoad: true, isSanitation: true, capacity: 50, width: 48, height: 48, graphic: "graphics/buildings/latrina.png" },
  tabernae: { cost: 35, name: "Tabernae", color: "#F4A460", needsRoad: true, isWork: true, capacity: 30, width: 96, height: 48, graphic: "graphics/buildings/tabernae.png" },
  officina: { cost: 40, name: "Officina", color: "#808080", needsRoad: true, isWork: true, capacity: 20, noise: true, width: 96, height: 96, graphic: "graphics/buildings/officina.png" },
  thermae: { cost: 80, name: "Thermae", color: "#00CED1", needsRoad: true, isBaths: true, capacity: 120, width: 192, height: 144, graphic: "graphics/buildings/thermae.png" },
  templum: { cost: 70, name: "Templum", color: "#FFD700", needsRoad: true, isWorship: true, capacity: 80, width: 144, height: 144, graphic: "graphics/buildings/templum.png" },
  basilica: { cost: 90, name: "Basilica", color: "#FFA500", needsRoad: true, isCivic: true, capacity: 60, width: 192, height: 144, graphic: "graphics/buildings/basilica.png" },
  forum: { cost: 100, name: "Forum", color: "#FF8C00", needsRoad: true, isWorship: true, isCivic: true, capacity: 100, width: 192, height: 192, graphic: "graphics/buildings/forum.png" },
  amphitheatrum: { cost: 150, name: "Amphitheatrum", color: "#DC143C", needsRoad: true, isEntertainment: true, capacity: 200, width: 240, height: 192, graphic: "graphics/buildings/amphitheatrum.png" },
  theatrum: { cost: 100, name: "Theatrum", color: "#C71585", needsRoad: true, isEntertainment: true, capacity: 100, width: 192, height: 144, graphic: "graphics/buildings/theatrum.png" }
}

const canvas = document.getElementById("game-canvas")
const ctx = canvas.getContext("2d")
canvas.width = CANVAS_WIDTH
canvas.height = CANVAS_HEIGHT

let nextHouseholdId = 1

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}

function initGame() {
  const saved = loadGameState()
  if (saved) {
    gameState = saved
    gameState.paused = true
    gameState.isDragging = false
    gameState.previewBuilding = null
    gameState.selectedBuildType = null
    gameState.isNightPhase = false
    gameState.cameraZoom = typeof gameState.cameraZoom === "number" ? gameState.cameraZoom : 1.0
    gameState.cameraOffsetX = typeof gameState.cameraOffsetX === "number" ? gameState.cameraOffsetX : 0
    gameState.cameraOffsetY = typeof gameState.cameraOffsetY === "number" ? gameState.cameraOffsetY : 0
    gameState.difficulty = typeof gameState.difficulty === "number" ? gameState.difficulty : 1.0
    addAlert("Game loaded from previous session", "success")
  } else {
    gameState.buildings = []
    gameState.households = []
    gameState.day = 1
    gameState.tick = 0
    gameState.aes = 500
    gameState.hasAqueduct = false
    gameState.winConditionDays = 0
    gameState.events = []
    gameState.nextEventTick = 200
    gameState.history = []
    gameState.historyIndex = -1
    gameState.paused = true
    gameState.speed = 1
    gameState.selectedBuildType = null
    gameState.gameStarted = false
    gameState.previewBuilding = null
    gameState.cameraZoom = 1.0
    gameState.cameraOffsetX = 0
    gameState.cameraOffsetY = 0
    gameState.isNightPhase = false
    gameState.difficulty = 1.0
  }

  const maxId = gameState.households.reduce((m, h) => Math.max(m, Number(h.id) || 0), 0)
  nextHouseholdId = maxId + 1

  updateUndoRedoButtons()
  updateCameraZoom()
  render()
  updateUI()
}

function resetGame() {
  if (!confirm("Are you sure you want to restart? All progress will be lost.")) return
  localStorage.removeItem("urbsInManusGameState")
  gameState.buildings = []
  gameState.households = []
  gameState.day = 1
  gameState.tick = 0
  gameState.aes = 500
  gameState.hasAqueduct = false
  gameState.winConditionDays = 0
  gameState.events = []
  gameState.nextEventTick = 200
  gameState.history = []
  gameState.historyIndex = -1
  gameState.paused = false
  gameState.speed = 1
  gameState.selectedBuildType = null
  gameState.gameStarted = true
  gameState.previewBuilding = null
  gameState.cameraZoom = 1.0
  gameState.cameraOffsetX = 0
  gameState.cameraOffsetY = 0
  gameState.isNightPhase = false
  gameState.difficulty = 1.0
  nextHouseholdId = 1
  updateUndoRedoButtons()
  render()
  updateUI()
  addAlert("City reset! Start fresh.", "success")
}

let lastUpdate = Date.now()

function gameLoop() {
  if (!gameState.paused && gameState.gameStarted) {
    const now = Date.now()
    const delta = now - lastUpdate
    const tickInterval = TICK_DURATION / clamp(gameState.speed || 1, 0.25, 16)
    if (delta >= tickInterval) {
      lastUpdate = now
      gameTick()
    }
  }
  requestAnimationFrame(gameLoop)
}

function gameTick() {
  gameState.tick++

  if (gameState.tick === NIGHT_START_TICK && !gameState.isNightPhase) enterNightPhase()
  if (gameState.tick === DAY_START_TICK && gameState.isNightPhase) leaveNightPhase()

  if (gameState.tick >= TICKS_PER_DAY) {
    gameState.tick = 0
    gameState.day++
    onNewDay()
  }

  if (!gameState.isNightPhase) {
    if (gameState.tick % 20 === 0) spawnHouseholds()
    if (gameState.tick % 10 === 0) updateHouseholdNeeds()
  }

  gameState.difficulty = 1.0 + gameState.day * 0.02

  checkWinCondition()
  checkLossConditions()

  const basilicas = countBuildings("basilica")
  const forums = countBuildings("forum")
  const income = Math.floor((basilicas * 5 + forums * 10) / clamp(gameState.difficulty, 1, 999))
  if (income > 0) gameState.aes += income

  updateCameraZoom()
  render()
  updateUI()
  saveGameState()
}

function enterNightPhase() {
  gameState.isNightPhase = true
  gameState.paused = true
  gameState.previewBuilding = null
  addAlert("🌙 Night falls. Build and plan your city!", "success")
  const info = document.getElementById("info-text")
  if (info) info.textContent = "🌙 NIGHT PHASE: Build your city. Press Start Day when ready."
  const pauseBtn = document.getElementById("pause-btn")
  if (pauseBtn) pauseBtn.textContent = "▶ Start Day"
  updateUndoRedoButtons()
}

function leaveNightPhase() {
  gameState.isNightPhase = false
  gameState.selectedBuildType = null
  gameState.previewBuilding = null
  document.querySelectorAll(".build-btn").forEach(b => b.classList.remove("active"))
  addAlert("☀️ Dawn breaks. Watch your city come alive!", "success")
  const info = document.getElementById("info-text")
  if (info) info.textContent = "☀️ DAY PHASE: Watching simulation..."
  updateUndoRedoButtons()
}

function updateCameraZoom() {
  const buildingCount = gameState.buildings.length
  if (buildingCount === 0) {
    gameState.cameraZoom = 1.0
    gameState.cameraOffsetX = 0
    gameState.cameraOffsetY = 0
    return
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  gameState.buildings.forEach(b => {
    minX = Math.min(minX, b.x)
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + b.width)
    maxY = Math.max(maxY, b.y + b.height)
  })

  const cityWidth = maxX - minX
  const cityHeight = maxY - minY
  const zoomX = CANVAS_WIDTH / (cityWidth + 200)
  const zoomY = CANVAS_HEIGHT / (cityHeight + 200)
  const targetZoom = Math.min(zoomX, zoomY, 1.0)
  gameState.cameraZoom += (targetZoom - gameState.cameraZoom) * 0.05

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  gameState.cameraOffsetX = CANVAS_WIDTH / 2 - centerX * gameState.cameraZoom
  gameState.cameraOffsetY = CANVAS_HEIGHT / 2 - centerY * gameState.cameraZoom
}

function onNewDay() {
  if (gameState.day % 7 === 0) addAlert("Census day! Check Census Urbis for city report.", "success")
  checkWinCondition()
  checkLossConditions()

  const basilicas = countBuildings("basilica")
  const forums = countBuildings("forum")
  const income = basilicas * 5 + forums * 10
  if (income > 0) {
    gameState.aes += income
    addAlert(`Treasury income: +${income} Aes`, "success")
  }
}

function buildingsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return !(x1 + w1 <= x2 || x2 + w2 <= x1 || y1 + h1 <= y2 || y2 + h2 <= y1)
}

function hasRoadNearby(x, y, width, height) {
  const checkRadius = 60
  const centerX = x + width / 2
  const centerY = y + height / 2
  for (let building of gameState.buildings) {
    const def = BUILDINGS[building.type]
    if (def && def.isRoad) {
      const roadCenterX = building.x + building.width / 2
      const roadCenterY = building.y + building.height / 2
      const dist = Math.hypot(centerX - roadCenterX, centerY - roadCenterY)
      if (dist < checkRadius) return true
    }
  }
  return false
}

function getBuildingDescription(buildType) {
  const def = BUILDINGS[buildType]
  if (!def) return ""
  
  let desc = `${def.name} - ${def.cost} Aes\n`
  desc += `Size: ${def.width}x${def.height} px\n`
  
  if (def.isRoad) desc += "Road - Connect buildings\n"
  if (def.isHousing) desc += `Housing - ${def.capacity} families (${def.type})\n`
  if (def.isFood) desc += `Food - Serves ${def.capacity} people\n`
  if (def.isWater) {
    if (buildType === "aquaeductus") desc += "Water Source - Build first!\n"
    else desc += `Water - Serves ${def.capacity} people\n`
  }
  if (def.isSanitation) desc += `Sanitation - Serves ${def.capacity} people\n`
  if (def.isWork) desc += `Work - ${def.capacity} jobs\n`
  if (def.isBaths) desc += `Baths - Serves ${def.capacity} people\n`
  if (def.isWorship) desc += `Worship - Serves ${def.capacity} people\n`
  if (def.isCivic) desc += `Civic - Serves ${def.capacity} people\n`
  if (def.isEntertainment) desc += `Entertainment - Serves ${def.capacity} people\n`
  if (def.isStorage) desc += "Storage - Prevents shortages\n"
  
  if (def.needsRoad) desc += "⚠️ Requires road nearby\n"
  if (def.noise) desc += "🔊 Noisy - avoid near Domus\n"
  
  return desc.trim()
}

function canPlaceBuilding(x, y, buildType) {
  const def = BUILDINGS[buildType]
  if (!def) return false
  if (x < 0 || y < 0 || x + def.width > WORLD_WIDTH || y + def.height > WORLD_HEIGHT) return false

  for (let building of gameState.buildings) {
    if (buildingsOverlap(x, y, def.width, def.height, building.x, building.y, building.width, building.height)) return false
  }

  if (def.needsRoad && !hasRoadNearby(x, y, def.width, def.height)) return false
  return true
}

function getPlacementError(x, y, buildType) {
  const def = BUILDINGS[buildType]
  if (!def) return "Invalid building type"
  
  if (x < 0 || y < 0 || x + def.width > WORLD_WIDTH || y + def.height > WORLD_HEIGHT) {
    return "Out of bounds - Pan camera to find more space"
  }

  for (let building of gameState.buildings) {
    if (buildingsOverlap(x, y, def.width, def.height, building.x, building.y, building.width, building.height)) {
      return "Overlaps with existing building"
    }
  }

  if (def.needsRoad && !hasRoadNearby(x, y, def.width, def.height)) {
    return "No road nearby - Build Via within 60px"
  }
  
  return null
}

function addToHistory(action) {
  gameState.history = gameState.history.slice(0, gameState.historyIndex + 1)
  gameState.history.push(action)
  gameState.historyIndex++

  if (gameState.history.length > 50) {
    gameState.history.shift()
    gameState.historyIndex--
  }
  updateUndoRedoButtons()
}

function placeBuilding(x, y, buildType, skipHistory = false) {
  const def = BUILDINGS[buildType]
  if (!def) return false
  if (gameState.aes < def.cost) {
    addAlert("Not enough Aes!", "danger")
    return false
  }
  if (!canPlaceBuilding(x, y, buildType)) return false

  const building = {
    id: Date.now() + Math.random(),
    type: buildType,
    x,
    y,
    width: def.width,
    height: def.height,
    households: []
  }

  if (!skipHistory) {
    addToHistory({
      action: "place",
      building: JSON.parse(JSON.stringify(building)),
      aes: gameState.aes
    })
  }

  gameState.buildings.push(building)
  gameState.aes -= def.cost

  if (buildType === "aquaeductus") {
    gameState.hasAqueduct = true
    addAlert("Aqueduct built! Fountains now active.", "success")
  }

  saveGameState()
  render()
  updateUI()
  return true
}

function demolishBuilding(x, y, skipHistory = false) {
  const buildingIndex = gameState.buildings.findIndex(b =>
    x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height
  )
  if (buildingIndex === -1) return false

  const building = gameState.buildings[buildingIndex]
  const def = BUILDINGS[building.type]

  if (!skipHistory) {
    addToHistory({
      action: "demolish",
      building: JSON.parse(JSON.stringify(building)),
      aes: gameState.aes
    })
  }

  if (def && def.isHousing && Array.isArray(building.households)) {
    building.households.forEach(hhId => {
      const idx = gameState.households.findIndex(h => h.id === hhId)
      if (idx !== -1) gameState.households.splice(idx, 1)
    })
  }

  if (building.type === "aquaeductus") {
    const otherAqueducts = gameState.buildings.filter(b => b.type === "aquaeductus" && b.id !== building.id)
    if (otherAqueducts.length === 0) {
      gameState.hasAqueduct = false
      addAlert("Aqueduct removed! Fountains no longer function.", "danger")
    }
  }

  gameState.buildings.splice(buildingIndex, 1)
  saveGameState()
  render()
  updateUI()
  return true
}

function undo() {
  if (gameState.historyIndex < 0) return
  const action = gameState.history[gameState.historyIndex]

  if (action.action === "place") {
    const idx = gameState.buildings.findIndex(b => b.id === action.building.id)
    if (idx !== -1) {
      gameState.buildings.splice(idx, 1)
      gameState.aes = action.aes
    }
  } else if (action.action === "demolish") {
    gameState.buildings.push(action.building)
    gameState.aes = action.aes
  }

  gameState.historyIndex--
  updateUndoRedoButtons()
  saveGameState()
  render()
  updateUI()
  addAlert("Undo last action", "success")
}

function redo() {
  if (gameState.historyIndex >= gameState.history.length - 1) return
  gameState.historyIndex++
  const action = gameState.history[gameState.historyIndex]

  if (action.action === "place") {
    gameState.buildings.push(action.building)
    const def = BUILDINGS[action.building.type]
    if (def) gameState.aes -= def.cost
  } else if (action.action === "demolish") {
    const idx = gameState.buildings.findIndex(b => b.id === action.building.id)
    if (idx !== -1) gameState.buildings.splice(idx, 1)
  }

  updateUndoRedoButtons()
  saveGameState()
  render()
  updateUI()
  addAlert("Redo last action", "success")
}

function updateUndoRedoButtons() {
  const undoBtn = document.getElementById("undo-btn")
  const redoBtn = document.getElementById("redo-btn")
  if (!undoBtn || !redoBtn) return

  const show = gameState.paused && gameState.isNightPhase
  undoBtn.style.display = show ? "inline-block" : "none"
  redoBtn.style.display = show ? "inline-block" : "none"
  if (show) {
    undoBtn.disabled = gameState.historyIndex < 0
    redoBtn.disabled = gameState.historyIndex >= gameState.history.length - 1
  }
}

function saveGameState() {
  try {
    const saveData = {
      version: 1,
      buildings: gameState.buildings,
      households: gameState.households,
      day: gameState.day,
      tick: gameState.tick,
      aes: gameState.aes,
      hasAqueduct: gameState.hasAqueduct,
      winConditionDays: gameState.winConditionDays,
      history: gameState.history,
      historyIndex: gameState.historyIndex,
      speed: gameState.speed,
      gameStarted: gameState.gameStarted,
      cameraZoom: gameState.cameraZoom,
      cameraOffsetX: gameState.cameraOffsetX,
      cameraOffsetY: gameState.cameraOffsetY,
      isNightPhase: gameState.isNightPhase,
      difficulty: gameState.difficulty
    }
    localStorage.setItem("urbsInManusGameState", JSON.stringify(saveData))
  } catch (e) {
    console.error("Failed to save game state:", e)
  }
}

function loadGameState() {
  try {
    const saved = localStorage.getItem("urbsInManusGameState")
    if (!saved) return null
    const data = JSON.parse(saved)
    if (data.version !== 1) return null

    return {
      buildings: data.buildings || [],
      households: data.households || [],
      day: data.day || 1,
      tick: data.tick || 0,
      paused: false,
      speed: data.speed || 1,
      aes: data.aes || 500,
      selectedBuildType: null,
      hasAqueduct: data.hasAqueduct || false,
      gameStarted: typeof data.gameStarted === "boolean" ? data.gameStarted : true,
      winConditionDays: data.winConditionDays || 0,
      events: [],
      nextEventTick: 200,
      history: data.history || [],
      historyIndex: typeof data.historyIndex === "number" ? data.historyIndex : -1,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      previewBuilding: null,
      cameraZoom: typeof data.cameraZoom === "number" ? data.cameraZoom : 1.0,
      cameraOffsetX: typeof data.cameraOffsetX === "number" ? data.cameraOffsetX : 0,
      cameraOffsetY: typeof data.cameraOffsetY === "number" ? data.cameraOffsetY : 0,
      isNightPhase: typeof data.isNightPhase === "boolean" ? data.isNightPhase : false,
      difficulty: typeof data.difficulty === "number" ? data.difficulty : 1.0
    }
  } catch (e) {
    console.error("Failed to load game state:", e)
    return null
  }
}

function checkHousingCoverage(houseX, houseY) {
  const coverage = { water: false, food: false, baths: false, worship: false, work: false, sanitation: false }
  const baseRange = 200
  const populationBonus = Math.min(100, gameState.households.length * 2)
  const difficultyPenalty = (clamp(gameState.difficulty, 1, 999) - 1.0) * 50
  const coverageRange = baseRange + populationBonus - difficultyPenalty

  for (let building of gameState.buildings) {
    const def = BUILDINGS[building.type]
    if (!def) continue
    const centerX = building.x + building.width / 2
    const centerY = building.y + building.height / 2
    const dist = Math.hypot(houseX - centerX, houseY - centerY)

    if (dist <= coverageRange) {
      if (def.isWater && building.type === "fons" && gameState.hasAqueduct) coverage.water = true
      if (def.isFood) coverage.food = true
      if (def.isBaths) coverage.baths = true
      if (def.isWorship) coverage.worship = true
      if (def.isWork) coverage.work = true
      if (def.isSanitation) coverage.sanitation = true
    }
  }
  return coverage
}

function spawnHouseholds() {
  for (let building of gameState.buildings) {
    const def = BUILDINGS[building.type]
    if (!def || !def.isHousing) continue
    if (!Array.isArray(building.households)) building.households = []

    if (building.households.length < def.capacity) {
      const spawnChance = 0.05 / clamp(gameState.difficulty, 1, 999)
      if (Math.random() < spawnChance) {
        const household = {
          id: nextHouseholdId++,
          buildingId: building.id,
          x: building.x + building.width / 2,
          y: building.y + building.height / 2,
          type: def.type,
          happiness: 80,
          coverage: { water: false, food: false, baths: false, worship: false, work: false, sanitation: false },
          lastBathDay: gameState.day,
          lastWorshipDay: gameState.day
        }
        gameState.households.push(household)
        building.households.push(household.id)
      }
    }
  }
}

function hasNearbyOfficina(x, y) {
  for (let building of gameState.buildings) {
    if (building.type !== "officina") continue
    const centerX = building.x + building.width / 2
    const centerY = building.y + building.height / 2
    const dist = Math.hypot(x - centerX, y - centerY)
    if (dist < 150) return true
  }
  return false
}

function updateHouseholdNeeds() {
  const decayMultiplier = clamp(gameState.difficulty, 1, 999)
  gameState.households.forEach(hh => {
    const coverage = checkHousingCoverage(hh.x, hh.y)
    hh.coverage = coverage

    if (!coverage.water) hh.happiness = Math.max(0, hh.happiness - 2 * decayMultiplier)
    if (!coverage.food) hh.happiness = Math.max(0, hh.happiness - 2 * decayMultiplier)

    if (gameState.day - hh.lastBathDay > 7) {
      if (coverage.baths) {
        hh.lastBathDay = gameState.day
        hh.happiness = Math.min(100, hh.happiness + 5)
      } else {
        hh.happiness = Math.max(0, hh.happiness - 1 * decayMultiplier)
      }
    }

    if (gameState.day - hh.lastWorshipDay > 7) {
      if (coverage.worship) {
        hh.lastWorshipDay = gameState.day
        hh.happiness = Math.min(100, hh.happiness + 3)
      } else {
        hh.happiness = Math.max(0, hh.happiness - 1 * decayMultiplier)
      }
    }

    if (coverage.work) hh.happiness = Math.min(100, hh.happiness + 0.1)
    if (coverage.sanitation) hh.happiness = Math.min(100, hh.happiness + 0.1)

    const householdBuilding = gameState.buildings.find(b => b.id === hh.buildingId)
    if (householdBuilding && householdBuilding.type === "domus") {
      if (hasNearbyOfficina(hh.x, hh.y)) hh.happiness = Math.max(0, hh.happiness - 0.2)
    }

    if (hh.happiness < 80 && coverage.water && coverage.food) {
      hh.happiness = Math.min(100, hh.happiness + 0.05 / clamp(gameState.difficulty, 1, 999))
    }
  })
}

function calculateStats() {
  const stats = {
    population: gameState.households.length * 4,
    households: gameState.households.length,
    order: 100,
    happiness: 0,
    waterCoverage: 0,
    foodCoverage: 0,
    bathsCoverage: 0,
    sanitationCoverage: 0,
    unrestCount: 0,
    plebs: 0,
    equites: 0,
    senators: 0
  }

  if (gameState.households.length === 0) return stats

  let totalHappiness = 0
  let waterCovered = 0
  let foodCovered = 0
  let bathsCovered = 0
  let sanitationCovered = 0

  gameState.households.forEach(hh => {
    totalHappiness += hh.happiness || 0
    if (hh.coverage && hh.coverage.water) waterCovered++
    if (hh.coverage && hh.coverage.food) foodCovered++
    if (hh.coverage && hh.coverage.baths) bathsCovered++
    if (hh.coverage && hh.coverage.sanitation) sanitationCovered++
    if ((hh.happiness || 0) < 30) stats.unrestCount++

    if (hh.type === "plebs") stats.plebs++
    else if (hh.type === "equites") stats.equites++
    else stats.senators++
  })

  stats.happiness = Math.round(totalHappiness / gameState.households.length)
  stats.waterCoverage = Math.round((waterCovered / gameState.households.length) * 100)
  stats.foodCoverage = Math.round((foodCovered / gameState.households.length) * 100)
  stats.bathsCoverage = Math.round((bathsCovered / gameState.households.length) * 100)
  stats.sanitationCoverage = Math.round((sanitationCovered / gameState.households.length) * 100)

  stats.order = 100
  stats.order -= stats.unrestCount * 5
  stats.order -= Math.max(0, 100 - stats.waterCoverage) * 0.3
  stats.order -= Math.max(0, 100 - stats.foodCoverage) * 0.3

  const basilicas = countBuildings("basilica")
  const forums = countBuildings("forum")
  stats.order += basilicas * 5
  stats.order += forums * 10
  stats.order = clamp(stats.order, 0, 100)

  return stats
}

function countBuildings(type) {
  return gameState.buildings.filter(b => b.type === type).length
}

function triggerRandomEvent() {
  const events = [
    {
      name: "Ignis",
      message: "Fire breaks out in the insula district!",
      effect: () => {
        const insulae = gameState.buildings.filter(b => b.type === "insula" && Array.isArray(b.households) && b.households.length > 0)
        if (insulae.length === 0) return
        const target = insulae[Math.floor(Math.random() * insulae.length)]
        target.households.forEach(hhId => {
          const hh = gameState.households.find(h => h.id === hhId)
          if (hh) hh.happiness = Math.max(0, hh.happiness - 15)
        })
      }
    },
    {
      name: "Cibus carus",
      message: "Food prices rise!",
      effect: () => {
        const horreaCount = countBuildings("horrea")
        if (horreaCount === 0) {
          gameState.households.forEach(hh => { hh.happiness = Math.max(0, hh.happiness - 5) })
          addAlert("Food shortage! Build Horrea for stability.", "danger")
        } else {
          addAlert("Food prices rise, but Horrea prevents shortage.", "success")
        }
      }
    },
    {
      name: "Aqua deficit",
      message: "Water supply strained!",
      effect: () => {
        const fonsCount = countBuildings("fons")
        if (fonsCount < 3) {
          gameState.households.forEach(hh => {
            if (!hh.coverage || !hh.coverage.water) hh.happiness = Math.max(0, hh.happiness - 8)
          })
          addAlert("Water shortage! Build more fountains.", "danger")
        }
      }
    },
    {
      name: "Ludi",
      message: "Games at the amphitheater!",
      effect: () => {
        const amphCount = countBuildings("amphitheatrum")
        if (amphCount > 0) {
          gameState.households.forEach(hh => { hh.happiness = Math.min(100, hh.happiness + 10) })
          addAlert("Games boost morale!", "success")
        }
      }
    },
    {
      name: "Seditio",
      message: "Unrest grows among the people!",
      effect: () => {
        const stats = calculateStats()
        if (stats.order < 50) {
          gameState.households.forEach(hh => { hh.happiness = Math.max(0, hh.happiness - 10) })
          addAlert("Sedition! Improve order to prevent uprising.", "danger")
        }
      }
    }
  ]

  const event = events[Math.floor(Math.random() * events.length)]
  event.effect()
  addAlert(`Event: ${event.name} - ${event.message}`, "warning")
}

function checkWinCondition() {
  const stats = calculateStats()
  if (stats.population >= 500 && stats.order >= 50) {
    gameState.winConditionDays++
    if (gameState.winConditionDays >= 5) showWinScreen()
  } else {
    gameState.winConditionDays = 0
  }
}

function checkLossConditions() {
  const stats = calculateStats()
  if (stats.order <= 0) {
    showLossScreen("Order has collapsed! The city descends into chaos.")
    return
  }
  if (stats.unrestCount > gameState.households.length * 0.6 && gameState.households.length > 10) {
    showLossScreen("Massive unrest! The population rebels against your rule.")
    return
  }
}

function showWinScreen() {
  gameState.paused = true
  const stats = calculateStats()
  const pop = document.getElementById("win-population")
  const order = document.getElementById("win-order")
  const happ = document.getElementById("win-happiness")
  const days = document.getElementById("win-days")
  if (pop) pop.textContent = stats.population
  if (order) order.textContent = Math.round(stats.order)
  if (happ) happ.textContent = stats.happiness
  if (days) days.textContent = gameState.day
  const overlay = document.getElementById("win-overlay")
  if (overlay) overlay.classList.add("active")
}

function showLossScreen(reason) {
  gameState.paused = true
  const stats = calculateStats()
  const r = document.getElementById("loss-reason")
  const pop = document.getElementById("loss-population")
  const order = document.getElementById("loss-order")
  const happ = document.getElementById("loss-happiness")
  const days = document.getElementById("loss-days")
  if (r) r.textContent = reason
  if (pop) pop.textContent = stats.population
  if (order) order.textContent = Math.round(stats.order)
  if (happ) happ.textContent = stats.happiness
  if (days) days.textContent = gameState.day

  const tips = []
  if (stats.waterCoverage < 80) tips.push("Build more fountains and aqueducts for water coverage")
  if (stats.foodCoverage < 80) tips.push("Add more markets (Macellum) and bakeries (Pistrinum)")
  if (stats.bathsCoverage < 60) tips.push("Build Thermae for baths")
  if (countBuildings("via") < 20) tips.push("Connect your city with more roads")
  if (countBuildings("basilica") === 0) tips.push("Build a Basilica to improve order")
  if (countBuildings("templum") === 0) tips.push("Build Temples for worship and happiness")

  const tipsList = document.getElementById("loss-tips-list")
  if (tipsList) {
    tipsList.innerHTML = ""
    tips.forEach(tip => {
      const li = document.createElement("li")
      li.textContent = tip
      tipsList.appendChild(li)
    })
  }

  const overlay = document.getElementById("loss-overlay")
  if (overlay) overlay.classList.add("active")
}

function updateUI() {
  const hour = Math.floor((gameState.tick / TICKS_PER_DAY) * 24)
  const minute = Math.floor((((gameState.tick / TICKS_PER_DAY) * 24) - hour) * 60)

  const dayEl = document.getElementById("stat-day")
  const timeEl = document.getElementById("stat-time")
  const aesEl = document.getElementById("stat-aes")
  if (dayEl) dayEl.textContent = gameState.day
  if (timeEl) timeEl.textContent = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  if (aesEl) aesEl.textContent = gameState.aes

  const stats = calculateStats()
  const popEl = document.getElementById("stat-population")
  const hhEl = document.getElementById("stat-households")
  if (popEl) popEl.textContent = stats.population
  if (hhEl) hhEl.textContent = stats.households

  const orderBar = document.getElementById("bar-order")
  const orderText = document.getElementById("text-order")
  if (orderBar) orderBar.style.width = `${stats.order}%`
  if (orderText) orderText.textContent = Math.round(stats.order)

  const happinessBar = document.getElementById("bar-happiness")
  const happinessText = document.getElementById("text-happiness")
  if (happinessBar) happinessBar.style.width = `${stats.happiness}%`
  if (happinessText) happinessText.textContent = stats.happiness

  const aqua = document.getElementById("stat-aqua")
  const cibus = document.getElementById("stat-cibus")
  const baths = document.getElementById("stat-baths")
  const sanitas = document.getElementById("stat-sanitas")
  if (aqua) aqua.textContent = `${stats.waterCoverage}%`
  if (cibus) cibus.textContent = `${stats.foodCoverage}%`
  if (baths) baths.textContent = `${stats.bathsCoverage}%`
  if (sanitas) sanitas.textContent = `${stats.sanitationCoverage}%`

  const zoomPercent = Math.round(gameState.cameraZoom * 100)
  const info = document.getElementById("info-text")
  if (info) {
    info.textContent = gameState.isNightPhase
      ? `🌙 NIGHT: Build your city (Zoom: ${zoomPercent}%)`
      : `☀️ DAY: Watching simulation (Zoom: ${zoomPercent}%)`
  }
}

function addAlert(message, type = "warning") {
  const alertsList = document.getElementById("alerts-list")
  if (!alertsList) return
  const alert = document.createElement("div")
  alert.className = `alert-item ${type}`
  alert.textContent = message
  alertsList.insertBefore(alert, alertsList.firstChild)

  while (alertsList.children.length > 5) alertsList.removeChild(alertsList.lastChild)

  setTimeout(() => {
    if (alert.parentNode) alert.parentNode.removeChild(alert)
  }, 10000)
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.translate(gameState.cameraOffsetX, gameState.cameraOffsetY)
  ctx.scale(gameState.cameraZoom, gameState.cameraZoom)

  ctx.fillStyle = "#4A5D23"
  ctx.fillRect(-1000, -1000, CANVAS_WIDTH + 2000, CANVAS_HEIGHT + 2000)

  gameState.buildings.forEach(building => {
    const def = BUILDINGS[building.type]
    if (!def) return
    ctx.fillStyle = def.color
    ctx.fillRect(building.x, building.y, building.width, building.height)

    ctx.strokeStyle = "#000"
    ctx.lineWidth = 2 / clamp(gameState.cameraZoom, 0.05, 10)
    ctx.strokeRect(building.x, building.y, building.width, building.height)

    if (gameState.cameraZoom > 0.5) {
      ctx.fillStyle = "#FFF"
      ctx.font = `${10 / clamp(gameState.cameraZoom, 0.05, 10)}px Arial`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(def.name.substring(0, 8), building.x + building.width / 2, building.y + building.height / 2)
    }
  })

  if (gameState.previewBuilding && gameState.isNightPhase && gameState.paused) {
    const def = BUILDINGS[gameState.previewBuilding.type]
    if (def) {
      const canPlace = canPlaceBuilding(gameState.previewBuilding.x, gameState.previewBuilding.y, gameState.previewBuilding.type)
      const error = getPlacementError(gameState.previewBuilding.x, gameState.previewBuilding.y, gameState.previewBuilding.type)

      ctx.globalAlpha = 0.5
      ctx.fillStyle = canPlace ? "#00FF00" : "#FF0000"
      ctx.fillRect(gameState.previewBuilding.x, gameState.previewBuilding.y, def.width, def.height)
      ctx.globalAlpha = 1.0

      ctx.strokeStyle = canPlace ? "#00FF00" : "#FF0000"
      ctx.lineWidth = 3 / clamp(gameState.cameraZoom, 0.05, 10)
      ctx.strokeRect(gameState.previewBuilding.x, gameState.previewBuilding.y, def.width, def.height)
      
      if (error && gameState.cameraZoom > 0.5) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.8)"
        const padding = 8
        const textY = gameState.previewBuilding.y - 10
        ctx.font = `${14 / clamp(gameState.cameraZoom, 0.05, 10)}px Arial`
        const metrics = ctx.measureText(error)
        ctx.fillRect(gameState.previewBuilding.x - padding, textY - 20, metrics.width + padding * 2, 28)
        ctx.fillStyle = "#FF0000"
        ctx.textAlign = "left"
        ctx.textBaseline = "middle"
        ctx.fillText(error, gameState.previewBuilding.x, textY - 6)
      }
    }
  }

  ctx.restore()

  if (gameState.isNightPhase) {
    ctx.fillStyle = "rgba(0, 0, 50, 0.2)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

function screenToWorld(e) {
  const rect = canvas.getBoundingClientRect()
  const x = (e.clientX - rect.left - gameState.cameraOffsetX) / clamp(gameState.cameraZoom, 0.05, 10)
  const y = (e.clientY - rect.top - gameState.cameraOffsetY) / clamp(gameState.cameraZoom, 0.05, 10)
  return { x, y }
}

canvas.addEventListener("mousedown", e => {
  if (!gameState.isNightPhase || !gameState.paused) return
  const p = screenToWorld(e)
  const x = p.x
  const y = p.y

  if (!gameState.selectedBuildType) return

  gameState.isDragging = true
  gameState.dragStartX = x
  gameState.dragStartY = y

  if (gameState.selectedBuildType === "demolish") {
    demolishBuilding(x, y)
    return
  }

  const def = BUILDINGS[gameState.selectedBuildType]
  if (!def) return
  const snapX = Math.floor(x / TILE_SIZE) * TILE_SIZE
  const snapY = Math.floor(y / TILE_SIZE) * TILE_SIZE
  placeBuilding(snapX, snapY, gameState.selectedBuildType)
})

canvas.addEventListener("mousemove", e => {
  const p = screenToWorld(e)
  const x = p.x
  const y = p.y

  if (gameState.isNightPhase && gameState.paused && gameState.selectedBuildType && gameState.selectedBuildType !== "demolish") {
    const def = BUILDINGS[gameState.selectedBuildType]
    if (def) {
      const snapX = Math.floor(x / TILE_SIZE) * TILE_SIZE
      const snapY = Math.floor(y / TILE_SIZE) * TILE_SIZE
      gameState.previewBuilding = { type: gameState.selectedBuildType, x: snapX, y: snapY }
    } else {
      gameState.previewBuilding = null
    }
  } else {
    gameState.previewBuilding = null
  }

  if (gameState.isNightPhase && gameState.paused && gameState.isDragging && gameState.selectedBuildType) {
    if (gameState.selectedBuildType === "demolish") {
      demolishBuilding(x, y)
    } else if (gameState.selectedBuildType === "via") {
      const snapX = Math.floor(x / TILE_SIZE) * TILE_SIZE
      const snapY = Math.floor(y / TILE_SIZE) * TILE_SIZE
      const lastX = Math.floor(gameState.dragStartX / TILE_SIZE) * TILE_SIZE
      const lastY = Math.floor(gameState.dragStartY / TILE_SIZE) * TILE_SIZE
      if (snapX !== lastX || snapY !== lastY) {
        placeBuilding(snapX, snapY, "via")
        gameState.dragStartX = x
        gameState.dragStartY = y
      }
    }
  }

  render()
  showTileInfo(x, y)
})

canvas.addEventListener("mouseup", () => {
  gameState.isDragging = false
})

canvas.addEventListener("mouseleave", () => {
  gameState.isDragging = false
  gameState.previewBuilding = null
  render()
})

function showTileInfo(x, y) {
  const building = gameState.buildings.find(b => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height)
  const infoDiv = document.getElementById("tile-info")
  if (!infoDiv) return

  if (!building) {
    infoDiv.classList.remove("active")
    return
  }

  const def = BUILDINGS[building.type]
  if (!def) {
    infoDiv.classList.remove("active")
    return
  }

  let info = `<strong>${def.name}</strong> at (${Math.floor(building.x)}, ${Math.floor(building.y)})`
  if (def.isHousing && Array.isArray(building.households)) info += ` - Households: ${building.households.length}/${def.capacity}`
  if (def.cost) info += ` - Cost: ${def.cost} Aes`

  infoDiv.innerHTML = info
  infoDiv.classList.add("active")
}

document.querySelectorAll(".build-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const buildType = btn.dataset.type
    document.querySelectorAll(".build-btn").forEach(b => b.classList.remove("active"))
    if (gameState.selectedBuildType === buildType) {
      gameState.selectedBuildType = null
    } else {
      gameState.selectedBuildType = buildType
      btn.classList.add("active")
    }
    const info = document.getElementById("info-text")
    if (info) info.textContent = gameState.selectedBuildType ? `Placing: ${BUILDINGS[buildType]?.name || "Demolish"}` : "Select a building to place"
    render()
  })
})

const pauseBtn = document.getElementById("pause-btn")
if (pauseBtn) {
  pauseBtn.addEventListener("click", () => {
    if (gameState.isNightPhase) {
      gameState.paused = false
      pauseBtn.textContent = "⏸ Pause"
    } else {
      gameState.paused = !gameState.paused
      pauseBtn.textContent = gameState.paused ? "▶ Resume" : "⏸ Pause"
    }
    updateUndoRedoButtons()
    saveGameState()
  })
}

const speed1 = document.getElementById("speed-1x")
const speed2 = document.getElementById("speed-2x")
const speed4 = document.getElementById("speed-4x")

function setSpeed(v, btn) {
  gameState.speed = v
  document.querySelectorAll("#speed-controls .control-btn").forEach(b => b.classList.remove("active"))
  if (btn) btn.classList.add("active")
  saveGameState()
}

if (speed1) speed1.addEventListener("click", () => setSpeed(1, speed1))
if (speed2) speed2.addEventListener("click", () => setSpeed(2, speed2))
if (speed4) speed4.addEventListener("click", () => setSpeed(4, speed4))

const undoBtn = document.getElementById("undo-btn")
const redoBtn = document.getElementById("redo-btn")
if (undoBtn) undoBtn.addEventListener("click", () => undo())
if (redoBtn) redoBtn.addEventListener("click", () => redo())

const restartBtn = document.getElementById("restart-btn")
if (restartBtn) restartBtn.addEventListener("click", () => resetGame())

const tooltip = document.createElement("div")
tooltip.id = "building-tooltip"
tooltip.style.display = "none"
document.body.appendChild(tooltip)

document.querySelectorAll(".build-btn").forEach(btn => {
  const buildType = btn.getAttribute("data-type")
  if (!buildType) return
  
  btn.addEventListener("mouseenter", (e) => {
    const desc = getBuildingDescription(buildType)
    tooltip.innerHTML = desc.replace(/\n/g, "<br>")
    tooltip.style.display = "block"
  })
  
  btn.addEventListener("mousemove", (e) => {
    tooltip.style.left = (e.clientX + 15) + "px"
    tooltip.style.top = (e.clientY + 15) + "px"
  })
  
  btn.addEventListener("mouseleave", () => {
    tooltip.style.display = "none"
  })
})

const censusBtn = document.getElementById("census-btn")
if (censusBtn) censusBtn.addEventListener("click", () => showCensus())

function showCensus() {
  const stats = calculateStats()
  const set = (id, val) => {
    const el = document.getElementById(id)
    if (el) el.textContent = val
  }

  set("census-pop", stats.population)
  set("census-households", stats.households)
  set("census-plebs", stats.plebs)
  set("census-equites", stats.equites)
  set("census-senators", stats.senators)
  set("census-water", `${stats.waterCoverage}%`)
  set("census-food", `${stats.foodCoverage}%`)
  set("census-baths", `${stats.bathsCoverage}%`)
  set("census-worship", `${Math.round((gameState.households.filter(h => h.coverage && h.coverage.worship).length / Math.max(1, stats.households)) * 100)}%`)
  set("census-order", Math.round(stats.order))
  set("census-happiness", stats.happiness)

  let unrestLevel = "Low"
  if (stats.unrestCount > stats.households * 0.3) unrestLevel = "Medium"
  if (stats.unrestCount > stats.households * 0.5) unrestLevel = "High"
  set("census-unrest", unrestLevel)

  const overlay = document.getElementById("census-overlay")
  if (overlay) overlay.classList.add("active")
}

const closeCensusBtn = document.getElementById("close-census-btn")
if (closeCensusBtn) closeCensusBtn.addEventListener("click", () => {
  const overlay = document.getElementById("census-overlay")
  if (overlay) overlay.classList.remove("active")
})

const glossaryBtn = document.getElementById("glossary-btn")
const closeGlossaryBtn = document.getElementById("close-glossary-btn")
if (glossaryBtn) glossaryBtn.addEventListener("click", () => {
  const overlay = document.getElementById("glossary-overlay")
  if (overlay) overlay.classList.add("active")
})
if (closeGlossaryBtn) closeGlossaryBtn.addEventListener("click", () => {
  const overlay = document.getElementById("glossary-overlay")
  if (overlay) overlay.classList.remove("active")
})

const helpBtn = document.getElementById("help-btn")
if (helpBtn) helpBtn.addEventListener("click", () => {
  const overlay = document.getElementById("welcome-overlay")
  if (overlay) overlay.classList.add("active")
})

const startBtn = document.getElementById("start-game-btn")
if (startBtn) startBtn.addEventListener("click", () => {
  const overlay = document.getElementById("welcome-overlay")
  if (overlay) overlay.classList.remove("active")
  gameState.gameStarted = true
  gameState.paused = false
  lastUpdate = Date.now()
  saveGameState()
})

const restartFromWinBtn = document.getElementById("restart-from-win-btn")
if (restartFromWinBtn) restartFromWinBtn.addEventListener("click", () => {
  const overlay = document.getElementById("win-overlay")
  if (overlay) overlay.classList.remove("active")
  resetGame()
})

const restartFromLossBtn = document.getElementById("restart-from-loss-btn")
if (restartFromLossBtn) restartFromLossBtn.addEventListener("click", () => {
  const overlay = document.getElementById("loss-overlay")
  if (overlay) overlay.classList.remove("active")
  resetGame()
})

initGame()
gameLoop()
