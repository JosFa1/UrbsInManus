// ========================================
// URBS IN MANUS - Roman City Builder
// ========================================

// ========================================
// DEV SETTINGS - Toggle these for development
// ========================================
const DEV_CONFIG = {
    SHOW_FULL_MAP: false,          // true = show entire 256x144 map, false = zoomed on Tiber Island
    SHOW_SAMPLE_BUILDING: true,    // true = show sample 2x3 building, false = hide it
    LOAD_PNG_MAP: './map.png'             // Path to PNG map file (or null to use configureMap). PNG will be converted to tilemap
};

// Canvas and rendering settings
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function getCanvasCssSize() {
    return {
        width: canvas.clientWidth || canvas.width,
        height: canvas.clientHeight || canvas.height
    };
}

// World dimensions - full map
const WORLD_WIDTH = 256;
const WORLD_HEIGHT = 144;
const TILE_SIZE = 4; // Base tile size in pixels

// ========================================
// TILE TYPES (Terra Types)
// ========================================
const TileType = {
    AGER: 'ager',        // Grass/Field
    FLUMEN: 'flumen',    // River
    COLLIS: 'collis',    // Hill/Mountain
    HARENA: 'harena'     // Sand
};

const TileColors = {
    [TileType.AGER]: '#90EE90',     // Light green
    [TileType.FLUMEN]: '#4682B4',   // Steel blue
    [TileType.COLLIS]: '#8B7355',   // Brown
    [TileType.HARENA]: '#C2B280'    // Sandy
};

const TileNames = {
    [TileType.AGER]: 'Ager (Field)',
    [TileType.FLUMEN]: 'Flumen (River)',
    [TileType.COLLIS]: 'Collis (Hill)',
    [TileType.HARENA]: 'Harena (Sand)'
};

// ========================================
// WORLD DATA STRUCTURE
// ========================================
class Tile {
    constructor(x, y, type = TileType.AGER) {
        this.x = x;              // Grid X coordinate
        this.y = y;              // Grid Y coordinate
        this.type = type;        // Tile type (terrain)
        this.building = null;    // Future: building on this tile
        this.buildingData = {};  // Future: additional building data
    }
    
    getColor() {
        return TileColors[this.type] || '#808080';
    }
    
    getName() {
        return TileNames[this.type] || 'Ignotum (Unknown)';
    }
}

class Building {
    constructor(x, y, width, height, name) {
        this.x = x;              // Grid X coordinate (top-left)
        this.y = y;              // Grid Y coordinate (top-left)
        this.width = width;      // Width in tiles
        this.height = height;    // Height in tiles
        this.name = name;
        this.color = '#8B4513';  // Building color
    }
}

class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.buildings = [];  // Array of buildings

        // Occupancy grid: null or building id
        this.occupancy = [];
        
        // Initialize tiles
        this.initializeTiles();
        this.initializeOccupancy();
    }
    
    initializeTiles() {
        for (let y = 0; y < this.height; y++) {
            const row = [];
            for (let x = 0; x < this.width; x++) {
                row.push(new Tile(x, y));
            }
            this.tiles.push(row);
        }
    }

    initializeOccupancy() {
        this.occupancy = new Array(this.height);
        for (let y = 0; y < this.height; y++) {
            this.occupancy[y] = new Array(this.width).fill(null);
        }
    }
    
    getTile(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            return this.tiles[y][x];
        }
        return null;
    }
    
    setTileType(x, y, type) {
        const tile = this.getTile(x, y);
        if (tile) {
            tile.type = type;
        }
    }
    
    addBuilding(building) {
        this.buildings.push(building);
    }

    addPlacedBuilding(building) {
        this.buildings.push(building);
    }

    occupyBuildingFootprint(building) {
        const id = building.id;
        for (let dy = 0; dy < building.height; dy++) {
            for (let dx = 0; dx < building.width; dx++) {
                const x = building.x + dx;
                const y = building.y + dy;
                if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
                this.occupancy[y][x] = id;
                const tile = this.getTile(x, y);
                if (tile) tile.building = id;
            }
        }
    }

    clearBuildingFootprint(buildingId) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.occupancy[y][x] === buildingId) {
                    this.occupancy[y][x] = null;
                    const tile = this.getTile(x, y);
                    if (tile) tile.building = null;
                }
            }
        }
    }

    removePlacedBuildingById(buildingId) {
        const idx = this.buildings.findIndex(b => b && b.id === buildingId);
        if (idx === -1) return;
        this.buildings.splice(idx, 1);
        this.clearBuildingFootprint(buildingId);
    }

    clearPlacedBuildings() {
        // Remove only buildings that participate in the build tool.
        const toRemove = this.buildings.filter(b => b && b.id && b.type).map(b => b.id);
        this.buildings = this.buildings.filter(b => !(b && b.id && b.type));
        this.initializeOccupancy();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.getTile(x, y);
                if (tile) tile.building = null;
            }
        }
        // Ensure any stale footprints cleared.
        for (const id of toRemove) {
            this.clearBuildingFootprint(id);
        }
    }
    
    // Future: Method to expand the world
    expand(newWidth, newHeight) {
        // Implementation for dynamic expansion
        // This will be used when the city grows
    }
}

// ========================================
// MAP CONFIGURATION - Design Rome Here!
// ========================================
function configureMap(world) {
    // ==========================================
    // TIBER RIVER (Flumen Tiberis)
    // The iconic S-shape of the Tiber flowing north to south
    // Tiber Island is around coordinates (100, 72)
    // ==========================================
    
    // Upper section of Tiber (north)
    for (let y = 0; y < 50; y++) {
        const xOffset = Math.sin(y * 0.1) * 8;
        const centerX = 85 + xOffset;
        
        for (let dx = -4; dx <= 4; dx++) {
            world.setTileType(Math.floor(centerX + dx), y, TileType.FLUMEN);
        }
    }
    
    // Middle section with Tiber Island
    for (let y = 50; y < 100; y++) {
        const xOffset = Math.sin(y * 0.08) * 10;
        const centerX = 95 + xOffset;
        
        for (let dx = -5; dx <= 5; dx++) {
            const x = Math.floor(centerX + dx);
            // Create Tiber Island gap at y=68-76
            if (y >= 68 && y <= 76 && dx >= -2 && dx <= 2) {
                world.setTileType(x, y, TileType.HARENA); // Island
            } else {
                world.setTileType(x, y, TileType.FLUMEN);
            }
        }
    }
    
    // Lower section (south)
    for (let y = 100; y < 144; y++) {
        const xOffset = Math.sin(y * 0.06) * 12;
        const centerX = 105 + xOffset;
        
        for (let dx = -5; dx <= 5; dx++) {
            world.setTileType(Math.floor(centerX + dx), y, TileType.FLUMEN);
        }
    }
    
    // ==========================================
    // THE SEVEN HILLS (Septem Colles)
    // ==========================================
    
    // Helper function to create a hill
    function createHill(centerX, centerY, radiusX, radiusY) {
        for (let dy = -radiusY; dy <= radiusY; dy++) {
            for (let dx = -radiusX; dx <= radiusX; dx++) {
                const distance = Math.sqrt((dx/radiusX)**2 + (dy/radiusY)**2);
                if (distance <= 1.0) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    if (x >= 0 && x < world.width && y >= 0 && y < world.height) {
                        world.setTileType(x, y, TileType.COLLIS);
                    }
                }
            }
        }
    }
    
    // 1. Palatine Hill (Collis Palatinus) - The central hill, southeast of island
    createHill(120, 80, 12, 10);
    
    // 2. Capitoline Hill (Collis Capitolinus) - Northwest of Palatine
    createHill(108, 68, 8, 7);
    
    // 3. Aventine Hill (Collis Aventinus) - South, near the river
    createHill(115, 95, 10, 9);
    
    // 4. Caelian Hill (Collis Caelius) - Southeast
    createHill(135, 85, 11, 9);
    
    // 5. Esquiline Hill (Collis Esquilinus) - East
    createHill(145, 70, 12, 10);
    
    // 6. Viminal Hill (Collis Viminalis) - Northeast
    createHill(135, 55, 8, 7);
    
    // 7. Quirinal Hill (Collis Quirinalis) - North
    createHill(120, 50, 10, 8);
    
    // Add riverbanks (sand along the Tiber)
    for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
            const tile = world.getTile(x, y);
            if (tile && tile.type === TileType.AGER) {
                // Check if adjacent to river
                const neighbors = [
                    world.getTile(x-1, y),
                    world.getTile(x+1, y),
                    world.getTile(x, y-1),
                    world.getTile(x, y+1)
                ];
                
                const hasRiverNeighbor = neighbors.some(n => n && n.type === TileType.FLUMEN);
                if (hasRiverNeighbor && Math.random() < 0.6) {
                    world.setTileType(x, y, TileType.HARENA);
                }
            }
        }
    }
    
    // ==========================================
    // SAMPLE BUILDING (2x3) on Tiber Island
    // ==========================================
    if (DEV_CONFIG.SHOW_SAMPLE_BUILDING) {
        const sampleBuilding = new Building(99, 71, 2, 3, 'Aedificium exemplare');
        world.addBuilding(sampleBuilding);
    }
}

// ========================================
// PNG MAP LOADER
// ========================================
class PNGMapLoader {
    // Convert hex color to RGB
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    // Calculate color distance (Euclidean)
    static colorDistance(color1, color2) {
        const dr = color1.r - color2.r;
        const dg = color1.g - color2.g;
        const db = color1.b - color2.b;
        return Math.sqrt(dr * dr + dg * dg + db * db);
    }
    
    // Find closest tile type for a given color
    static findClosestTileType(color) {
        const tileColors = {};
        
        // Build tile color lookup
        for (const [tileType, hexColor] of Object.entries(TileColors)) {
            tileColors[tileType] = this.hexToRgb(hexColor);
        }
        
        // Find closest match
        let closestType = TileType.AGER;
        let minDistance = Infinity;
        
        for (const [tileType, tileColor] of Object.entries(tileColors)) {
            const distance = this.colorDistance(color, tileColor);
            if (distance < minDistance) {
                minDistance = distance;
                closestType = tileType;
            }
        }
        
        return closestType;
    }
    
    // Load PNG and convert to tilemap
    static loadPNG(imagePath, world) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            
            img.onload = () => {
                // Check if image is too large
                if (img.width > world.width || img.height > world.height) {
                    reject(new Error(`PNG image is too large (${img.width}x${img.height}). Max size: ${world.width}x${world.height}`));
                    return;
                }
                
                // Create canvas to read pixel data
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                const data = imageData.data;
                
                // Reset world to grass
                for (let y = 0; y < world.height; y++) {
                    for (let x = 0; x < world.width; x++) {
                        world.getTile(x, y).type = TileType.AGER;
                    }
                }
                
                // Convert PNG pixels to tiles
                for (let y = 0; y < img.height; y++) {
                    for (let x = 0; x < img.width; x++) {
                        const pixelIndex = (y * img.width + x) * 4;
                        const color = {
                            r: data[pixelIndex],
                            g: data[pixelIndex + 1],
                            b: data[pixelIndex + 2],
                            a: data[pixelIndex + 3]
                        };
                        
                        // Skip fully transparent pixels
                        if (color.a < 128) {
                            world.getTile(x, y).type = TileType.AGER;
                        } else {
                            const tileType = this.findClosestTileType(color);
                            world.getTile(x, y).type = tileType;
                        }
                    }
                }
                
                console.log(`✅ PNG map loaded successfully (${img.width}x${img.height})`);
                resolve();
            };
            
            img.onerror = () => {
                reject(new Error(`Failed to load PNG image: ${imagePath}`));
            };
            
            img.src = imagePath;
        });
    }
}

// ========================================
// CAMERA SYSTEM
// ========================================
class Camera {
    constructor(worldWidth, worldHeight) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        
        // Camera position (top-left of viewport in world coordinates)
        this.x = 0;
        this.y = 0;
        
        // Viewport size in tiles
        this.viewportWidth = 0;
        this.viewportHeight = 0;
        
        this.zoom = 1.0;
    }
    
    setViewport(width, height) {
        this.viewportWidth = width;
        this.viewportHeight = height;
    }
    
    centerOn(x, y) {
        this.x = x - this.viewportWidth / 2;
        this.y = y - this.viewportHeight / 2;
        this.clamp();
    }
    
    clamp() {
        // Keep camera within world bounds
        this.x = Math.max(0, Math.min(this.x, this.worldWidth - this.viewportWidth));
        this.y = Math.max(0, Math.min(this.y, this.worldHeight - this.viewportHeight));
    }

    showFullMap() {
        // Adjust camera to show entire map
        const { width: canvasWidth, height: canvasHeight } = getCanvasCssSize();
        
        const scaleX = canvasWidth / this.worldWidth;
        const scaleY = canvasHeight / this.worldHeight;
        const scale = Math.min(scaleX, scaleY);
        
        this.zoom = scale / TILE_SIZE;
        this.viewportWidth = canvasWidth / (TILE_SIZE * this.zoom);
        this.viewportHeight = canvasHeight / (TILE_SIZE * this.zoom);
        
        this.x = 0;
        this.y = 0;
    }
    
    showTiberIsland() {
        // Zoom to area right of Tiber Island (100, 72)
        this.zoom = 3.0; // Zoom level
        
        const { width: canvasWidth, height: canvasHeight } = getCanvasCssSize();
        
        this.viewportWidth = canvasWidth / (TILE_SIZE * this.zoom);
        this.viewportHeight = canvasHeight / (TILE_SIZE * this.zoom);
        
        // Center on area to the right of Tiber Island
        this.centerOn(115, 72);
    }
    
    _minZoomForCanvas(canvasWidth, canvasHeight) {
        const minZoomX = canvasWidth / (TILE_SIZE * this.worldWidth);
        const minZoomY = canvasHeight / (TILE_SIZE * this.worldHeight);
        return Math.max(minZoomX, minZoomY);
    }

    zoomBy(factor, focusX = null, focusY = null) {
        const { width: canvasWidth, height: canvasHeight } = getCanvasCssSize();
        const minZoom = this._minZoomForCanvas(canvasWidth, canvasHeight);
        const maxZoom = 14;

        const oldZoom = this.zoom;

        // World position under the mouse BEFORE zoom.
        const anchorWorldX = (focusX !== null) ? (this.x + focusX / (TILE_SIZE * oldZoom)) : (this.x + this.viewportWidth / 2);
        const anchorWorldY = (focusY !== null) ? (this.y + focusY / (TILE_SIZE * oldZoom)) : (this.y + this.viewportHeight / 2);

        // Apply zoom.
        const unclamped = oldZoom * factor;
        this.zoom = Math.max(minZoom, Math.min(unclamped, maxZoom));

        // Recompute viewport for new zoom.
        this.viewportWidth = canvasWidth / (TILE_SIZE * this.zoom);
        this.viewportHeight = canvasHeight / (TILE_SIZE * this.zoom);

        // Keep the anchor point under the mouse after zoom.
        if (focusX !== null && focusY !== null) {
            this.x = anchorWorldX - focusX / (TILE_SIZE * this.zoom);
            this.y = anchorWorldY - focusY / (TILE_SIZE * this.zoom);
        } else {
            this.centerOn(anchorWorldX, anchorWorldY);
        }

        this.clamp();
    }

    zoomIn(focusX = null, focusY = null) {
        this.zoomBy(1.2, focusX, focusY);
    }

    zoomOut(focusX = null, focusY = null) {
        this.zoomBy(1 / 1.2, focusX, focusY);
    }
    
    pan(deltaX, deltaY) {
        // Pan the camera (deltaX/Y in screen pixels)
        this.x -= deltaX / (TILE_SIZE * this.zoom);
        this.y -= deltaY / (TILE_SIZE * this.zoom);
        this.clamp();
    }
    
    screenToWorld(screenX, screenY) {
        const worldX = Math.floor(screenX / (TILE_SIZE * this.zoom) + this.x);
        const worldY = Math.floor(screenY / (TILE_SIZE * this.zoom) + this.y);
        return { x: worldX, y: worldY };
    }
    
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x) * TILE_SIZE * this.zoom;
        const screenY = (worldY - this.y) * TILE_SIZE * this.zoom;
        return { x: screenX, y: screenY };
    }
}

// ========================================
// RENDERING SYSTEM
// ========================================
class Renderer {
    constructor(canvas, ctx, world, camera) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.world = world;
        this.camera = camera;
        this.gridLineColor = '#333333';
        this.gridLineWidth = 1;
        this.majorGridLineColor = '#222222';
        this.majorGridLineWidth = 2;
        this.majorGridStep = 5; // draw a thicker line every N tiles
        // When zoomed out, tile pixels get too small and dense 1-tile gridlines alias.
        // Below this threshold, we hide the minor (every-tile) grid and keep only major lines.
        this.minorGridMinTilePx = 12;
        
        // Future zoom settings
        this.zoom = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;

        // Coalesce rapid input updates (pan/zoom) into a single draw per animation frame.
        this._rafId = null;

        // Optional build tool overlay
        this.buildTool = null;
    }

    setBuildTool(buildTool) {
        this.buildTool = buildTool;
    }

    requestRender() {
        if (this._rafId !== null) return;
        this._rafId = requestAnimationFrame(() => {
            this._rafId = null;
            this.render();
        });
    }
    
    render() {
        this.clear();
        this.drawOffscreenArea();
        this.drawTiles();
        this.drawBuildings();
        this.drawGhost();
        this.drawGrid();
    }

    drawGhost() {
        if (!this.buildTool || typeof this.buildTool.getGhost !== 'function') return;
        const ghost = this.buildTool.getGhost();
        if (!ghost) return;

        const tilePx = TILE_SIZE * this.camera.zoom;
        const baseX = -this.camera.x * tilePx;
        const baseY = -this.camera.y * tilePx;

        const x0 = Math.floor(baseX + ghost.origin.x * tilePx);
        const x1 = Math.floor(baseX + (ghost.origin.x + ghost.size.w) * tilePx);
        const y0 = Math.floor(baseY + ghost.origin.y * tilePx);
        const y1 = Math.floor(baseY + (ghost.origin.y + ghost.size.h) * tilePx);

        const w = x1 - x0;
        const h = y1 - y0;
        if (w <= 0 || h <= 0) return;

        this.ctx.save();
        this.ctx.globalAlpha = ghost.mode === 'demolish' ? 0.22 : (ghost.valid ? 0.22 : 0.26);
        this.ctx.fillStyle = ghost.mode === 'demolish' ? '#ff5a5a' : (ghost.valid ? '#3ddc84' : '#ff5a5a');
        this.ctx.fillRect(x0, y0, w, h);

        this.ctx.globalAlpha = 1;
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = ghost.mode === 'demolish' ? '#ff5a5a' : (ghost.valid ? '#3ddc84' : '#ff5a5a');
        this.ctx.strokeRect(x0, y0, w, h);
        this.ctx.restore();
    }
    
    clear() {
        const w = this.canvas.clientWidth || this.canvas.width;
        const h = this.canvas.clientHeight || this.canvas.height;
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, w, h);
    }
    
    drawOffscreenArea() {
        // Draw dark background for areas outside the world
        this.ctx.fillStyle = '#2a3a2a'; // Dark green-gray

        const w = this.canvas.clientWidth || this.canvas.width;
        const h = this.canvas.clientHeight || this.canvas.height;
        
        const startX = this.camera.x;
        const startY = this.camera.y;
        const endX = this.camera.x + this.camera.viewportWidth;
        const endY = this.camera.y + this.camera.viewportHeight;
        
        // Top border
        if (startY < 0) {
            const screenY = Math.round((0 - startY) * TILE_SIZE * this.camera.zoom);
            this.ctx.fillRect(0, 0, w, screenY);
        }
        
        // Bottom border
        if (endY > this.world.height) {
            const screenY = Math.round((this.world.height - startY) * TILE_SIZE * this.camera.zoom);
            this.ctx.fillRect(0, screenY, w, h - screenY);
        }
        
        // Left border
        if (startX < 0) {
            const screenX = Math.round((0 - startX) * TILE_SIZE * this.camera.zoom);
            this.ctx.fillRect(0, 0, screenX, h);
        }
        
        // Right border
        if (endX > this.world.width) {
            const screenX = Math.round((this.world.width - startX) * TILE_SIZE * this.camera.zoom);
            this.ctx.fillRect(screenX, 0, w - screenX, h);
        }
    }
    
    drawTiles() {
        const startX = Math.floor(this.camera.x);
        const startY = Math.floor(this.camera.y);
        const endX = Math.ceil(this.camera.x + this.camera.viewportWidth);
        const endY = Math.ceil(this.camera.y + this.camera.viewportHeight);
        
        for (let y = startY; y < endY && y < this.world.height; y++) {
            for (let x = startX; x < endX && x < this.world.width; x++) {
                const tile = this.world.getTile(x, y);
                if (tile) {
                    this.drawTile(tile);
                }
            }
        }
    }
    
    drawTile(tile) {
        // Edge-based rasterization: compute pixel boundaries for this tile so adjacent tiles share edges.
        // This prevents "seam" artifacts when zoomed out or panning.
        const tilePx = TILE_SIZE * this.camera.zoom;
        const baseX = -this.camera.x * tilePx;
        const baseY = -this.camera.y * tilePx;

        const x0 = Math.floor(baseX + tile.x * tilePx);
        const x1 = Math.floor(baseX + (tile.x + 1) * tilePx);
        const y0 = Math.floor(baseY + tile.y * tilePx);
        const y1 = Math.floor(baseY + (tile.y + 1) * tilePx);

        const w = x1 - x0;
        const h = y1 - y0;
        if (w <= 0 || h <= 0) return;

        this.ctx.fillStyle = tile.getColor();
        this.ctx.fillRect(x0, y0, w, h);
    }
    
    drawBuildings() {
        for (const building of this.world.buildings) {
            this.drawBuilding(building);
        }
    }
    
    drawBuilding(building) {
        // Use the same edge-based snapping as tiles to keep buildings stable while zooming/panning.
        const tilePx = TILE_SIZE * this.camera.zoom;
        const baseX = -this.camera.x * tilePx;
        const baseY = -this.camera.y * tilePx;

        const x0 = Math.floor(baseX + building.x * tilePx);
        const x1 = Math.floor(baseX + (building.x + building.width) * tilePx);
        const y0 = Math.floor(baseY + building.y * tilePx);
        const y1 = Math.floor(baseY + (building.y + building.height) * tilePx);

        const x = x0;
        const y = y0;
        const w = x1 - x0;
        const h = y1 - y0;
        if (w <= 0 || h <= 0) return;
        
        // Draw building
        this.ctx.fillStyle = building.color;
        this.ctx.fillRect(x, y, w, h);
        
        // Draw border
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
        
        // Draw simple roof indication
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x, y, w, Math.round(h * 0.2));
    }
    
    drawGrid() {
        const tilePx = TILE_SIZE * this.camera.zoom;
        const drawMinor = tilePx >= this.minorGridMinTilePx;

        const w = this.canvas.clientWidth || this.canvas.width;
        const h = this.canvas.clientHeight || this.canvas.height;

        // Draw using fillRect instead of stroke for more stable, pixel-snapped lines.
        const drawVerticalLine = (worldX, color, widthPx) => {
            const baseX = -this.camera.x * tilePx;
            const x = Math.floor(baseX + worldX * tilePx);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, 0, widthPx, h);
        };

        const drawHorizontalLine = (worldY, color, widthPx) => {
            const baseY = -this.camera.y * tilePx;
            const y = Math.floor(baseY + worldY * tilePx);
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, y, w, widthPx);
        };

        // Minor lines are always 1px (only shown when zoomed in enough).
        const minorWidth = 1;
        // Major lines stay slightly thicker even when zoomed in.
        const majorWidth = this.majorGridLineWidth;
        
        const startX = Math.floor(this.camera.x);
        const startY = Math.floor(this.camera.y);
        const endX = Math.ceil(this.camera.x + this.camera.viewportWidth);
        const endY = Math.ceil(this.camera.y + this.camera.viewportHeight);
        
        // Vertical lines (only within world bounds)
        const minX = Math.max(0, startX);
        const maxX = Math.min(endX, this.world.width);
        for (let x = minX; x <= maxX; x++) {
            const isMajor = (x % this.majorGridStep) === 0;
            if (!drawMinor && !isMajor) continue;
            if (isMajor) {
                drawVerticalLine(x, this.majorGridLineColor, majorWidth);
            } else {
                drawVerticalLine(x, this.gridLineColor, minorWidth);
            }
        }
        
        // Horizontal lines (only within world bounds)
        const minY = Math.max(0, startY);
        const maxY = Math.min(endY, this.world.height);
        for (let y = minY; y <= maxY; y++) {
            const isMajor = (y % this.majorGridStep) === 0;
            if (!drawMinor && !isMajor) continue;
            if (isMajor) {
                drawHorizontalLine(y, this.majorGridLineColor, majorWidth);
            } else {
                drawHorizontalLine(y, this.gridLineColor, minorWidth);
            }
        }
    }
}

// ========================================
// INPUT HANDLING
// ========================================
class InputHandler {
    constructor(canvas, world, camera, renderer, buildTool = null) {
        this.canvas = canvas;
        this.world = world;
        this.camera = camera;
        this.renderer = renderer;
        this.buildTool = buildTool;
        this.tooltip = document.getElementById('tooltip');
        this.isMouseDown = false;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.spacePressed = false;
        this.leftDown = false;
        this._buildingDragActive = false;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (this.buildTool) {
                this.buildTool.cancelSelection();
                this.renderer.requestRender();
            }
        });
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Smooth, continuous zoom anchored to the mouse cursor.
        // Typical wheel deltas are ~±100; exponent keeps it from feeling "jumpy".
        const zoomFactor = Math.pow(1.0015, -e.deltaY);
        this.camera.zoomBy(zoomFactor, mouseX, mouseY);
        
        this.renderer.requestRender();
    }
    
    handleMouseDown(e) {
        // Middle mouse button for panning
        if (e.button === 1) {
            e.preventDefault();
            this.isPanning = true;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        // Space + Left mouse pans (so left click remains for placing)
        if (e.button === 0 && this.spacePressed) {
            e.preventDefault();
            this.isPanning = true;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }

        // Left click places / demolishes
        if (e.button === 0 && this.buildTool) {
            this.leftDown = true;

            // Drag-to-build for 1x1 tools
            const def = this.buildTool.getSelectedDef ? this.buildTool.getSelectedDef() : null;
            if (def && def.size && def.size.w === 1 && def.size.h === 1) {
                this._buildingDragActive = true;
                this.buildTool.beginBuildDrag?.();

                // Place immediately at current hover
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const worldPos = this.camera.screenToWorld(mouseX, mouseY);
                this.buildTool.dragBuildTo?.(worldPos.x, worldPos.y);
                this.renderer.requestRender();
                return;
            }

            this.buildTool.onLeftClick();
            this.renderer.requestRender();
        }
    }
    
    handleMouseUp() {
        this.leftDown = false;
        if (this._buildingDragActive) {
            this._buildingDragActive = false;
            this.buildTool?.endBuildDrag?.();
        }
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Handle panning with Space+drag
        if (this.isPanning) {
            const deltaX = e.clientX - this.lastPanX;
            const deltaY = e.clientY - this.lastPanY;
            this.camera.pan(deltaX, deltaY);
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.renderer.requestRender();
            return;
        }
        
        const worldPos = this.camera.screenToWorld(mouseX, mouseY);

        if (this._buildingDragActive && this.buildTool) {
            this.buildTool.dragBuildTo?.(worldPos.x, worldPos.y);
        }

        if (this.buildTool) {
            this.buildTool.setHover(worldPos.x, worldPos.y);
            // Ghost needs redraw while hovering
            this.renderer.requestRender();
        }

        const tile = this.world.getTile(worldPos.x, worldPos.y);
        
        if (tile) {
            this.showTooltip(e.clientX, e.clientY, tile);
        } else {
            this.hideTooltip();
        }
    }
    
    handleKeyDown(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.spacePressed = true;
            this.canvas.style.cursor = 'grab';
            return;
        }

        if (e.code === 'Escape') {
            if (this.buildTool) {
                this.buildTool.cancelAll();
                this.renderer.requestRender();
            }
            return;
        }

        if (this.buildTool && e.ctrlKey && !e.shiftKey && e.code === 'KeyZ') {
            e.preventDefault();
            this.buildTool.undo?.();
            return;
        }

        if (this.buildTool && e.ctrlKey && (e.code === 'KeyY' || (e.shiftKey && e.code === 'KeyZ'))) {
            e.preventDefault();
            this.buildTool.redo?.();
            return;
        }
    }
    
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.spacePressed = false;
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        }
    }
    
    showTooltip(x, y, tile) {
        this.tooltip.textContent = `${tile.getName()} [${tile.x}, ${tile.y}]`;
        this.tooltip.style.left = (x + 15) + 'px';
        this.tooltip.style.top = (y + 15) + 'px';
        this.tooltip.classList.add('show');
    }
    
    hideTooltip() {
        this.tooltip.classList.remove('show');
    }
}



// ========================================
// LATIN TERM TOOLTIPS
// ========================================
function setupLatinTerms() {
    const latinTerms = document.querySelectorAll('.latin-term');
    const tooltip = document.getElementById('tooltip');
    
    latinTerms.forEach(term => {
        term.addEventListener('mouseenter', (e) => {
            const definition = term.getAttribute('data-definition');
            tooltip.textContent = definition;
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
            tooltip.classList.add('show');
        });
        
        term.addEventListener('mouseleave', () => {
            tooltip.classList.remove('show');
        });
        
        term.addEventListener('mousemove', (e) => {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        });
    });
}

// ========================================
// CANVAS SIZING
// ========================================
function resizeCanvas() {
    // Size the canvas to the available area next to the sidebar.
    const container = document.querySelector('.canvas-wrap');
    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // HiDPI canvas: backing store scaled by DPR, while drawing uses CSS pixel coordinates.
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    if (window.game) {
        // Update camera viewport
        if (DEV_CONFIG.SHOW_FULL_MAP) {
            window.game.camera.showFullMap();
        } else {
            window.game.camera.showTiberIsland();
        }
        window.game.renderer.requestRender();
    }
}

// ========================================
// GAME INITIALIZATION
// ========================================
function initGame() {
    // Create the world
    const world = new World(WORLD_WIDTH, WORLD_HEIGHT);
    
    // Configure the map
    async function setupMap() {
        if (DEV_CONFIG.LOAD_PNG_MAP) {
            try {
                await PNGMapLoader.loadPNG(DEV_CONFIG.LOAD_PNG_MAP, world);
            } catch (error) {
                console.error('❌ Error loading PNG map:', error);
                alert('Erratum: tabula PNG legi non potest. ' + error.message);
                return;
            }
        } else {
            configureMap(world);
        }

        // Economy state (kept minimal: coffers + year budget tracking)
        const economy = {
            coffers: 100,
            year: -753,
            annualBudget: 100,
            yearSpent: 0
        };

        // Load placed buildings + economy (if any) after the base map is ready.
        if (window.SaveAdapter && window.BuildingCatalog) {
            window.SaveAdapter.tryLoadIntoWorld(world, window.BuildingCatalog, economy);
        }
        
        completeInitialization(world, economy);
    }
    
    function completeInitialization(world, economy) {
        // Create camera
        const camera = new Camera(WORLD_WIDTH, WORLD_HEIGHT);
        
        // Size canvas
        resizeCanvas();
        
        // Set camera view based on dev config
        if (DEV_CONFIG.SHOW_FULL_MAP) {
            camera.showFullMap();
        } else {
            camera.showTiberIsland();
        }
        
        // Create renderer
        const renderer = new Renderer(canvas, ctx, world, camera);

        // Wire up build UI + tool
        const ui = {
            sidebar: document.getElementById('buildSidebar'),
            status: document.getElementById('buildStatus'),
            toast: document.getElementById('toast'),
            demolishBtn: document.getElementById('demolishBtn'),
            buttons: Array.from(document.querySelectorAll('.tool-btn[data-tool]')),
            coffers: document.getElementById('statCoffers'),
            year: document.getElementById('statYear'),
            budget: document.getElementById('statBudget'),
            spent: document.getElementById('statSpent'),
            endYearBtn: document.getElementById('endYearBtn'),
            saveBtn: document.getElementById('saveBtn'),
            restartBtn: document.getElementById('restartBtn')
        };

        const saveFn = () => {
            if (window.SaveAdapter) window.SaveAdapter.save(world, economy);
        };

        const buildTool = window.BuildTool
            ? new window.BuildTool({ world, camera, renderer, catalog: window.BuildingCatalog, onSave: saveFn, ui, economy })
            : null;

        if (buildTool) {
            renderer.setBuildTool(buildTool);

            for (const btn of ui.buttons) {
                btn.addEventListener('click', () => {
                    const type = btn.getAttribute('data-tool');
                    buildTool.selectType(type);
                    renderer.requestRender();
                });
            }

            ui.demolishBtn?.addEventListener('click', () => {
                buildTool.toggleDemolish();
                renderer.requestRender();
            });
        }

        function updateEconomyBar() {
            if (!ui.coffers) return;
            ui.coffers.textContent = String(economy.coffers);

            const y = economy.year;
            const absY = Math.abs(y);
            ui.year.textContent = y < 0 ? `${absY} a.C.n.` : `${absY} p.C.n.`;
            ui.budget.textContent = String(economy.annualBudget);
            ui.spent.textContent = String(economy.yearSpent);
        }

        function isRoadType(t) {
            return t === 'via' || t === 'pons';
        }

        function hasAdjacentRoad(building) {
            const w = building.width;
            const h = building.height;
            const originX = building.x;
            const originY = building.y;

            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    const tx = originX + dx;
                    const ty = originY + dy;
                    const neighbors = [
                        [tx - 1, ty],
                        [tx + 1, ty],
                        [tx, ty - 1],
                        [tx, ty + 1]
                    ];
                    for (const [nx, ny] of neighbors) {
                        if (nx < 0 || ny < 0 || nx >= world.width || ny >= world.height) continue;
                        if (nx >= originX && nx < originX + w && ny >= originY && ny < originY + h) continue;
                        const id = world.occupancy?.[ny]?.[nx] || null;
                        if (!id) continue;
                        const b = (world.buildings || []).find(bb => bb && bb.id === id) || null;
                        if (b && isRoadType(b.type)) return true;
                    }
                }
            }
            return false;
        }

        function minManhattanDistance(a, b) {
            let best = Infinity;
            for (let ay = 0; ay < a.height; ay++) {
                for (let ax = 0; ax < a.width; ax++) {
                    const atx = a.x + ax;
                    const aty = a.y + ay;
                    for (let by = 0; by < b.height; by++) {
                        for (let bx = 0; bx < b.width; bx++) {
                            const btx = b.x + bx;
                            const bty = b.y + by;
                            const d = Math.abs(atx - btx) + Math.abs(aty - bty);
                            if (d < best) best = d;
                            if (best === 0) return 0;
                        }
                    }
                }
            }
            return best;
        }

        function countHousesNearForum(forum, maxDist) {
            const houses = (world.buildings || []).filter(b => b && b.type === 'domus');
            let count = 0;
            for (const h of houses) {
                if (minManhattanDistance(forum, h) <= maxDist) count += 1;
            }
            return count;
        }

        function evaluateDemoWin() {
            const placed = (world.buildings || []).filter(b => b && b.id && b.type);
            const houses = placed.filter(b => b.type === 'domus');
            const forums = placed.filter(b => b.type === 'forum');

            const budgetOk = economy.yearSpent <= economy.annualBudget;
            const coffersOk = economy.coffers >= 0;

            const housesConnected = houses.every(hasAdjacentRoad);
            const forumOk = forums.length >= 1 && forums.some(f => countHousesNearForum(f, 6) >= 2);

            const win = houses.length >= 3 && forums.length >= 1 && housesConnected && forumOk && budgetOk && coffersOk;
            return {
                win,
                counts: { domus: houses.length, forum: forums.length },
                checks: { housesConnected, forumOk, budgetOk }
            };
        }

        ui.endYearBtn?.addEventListener('click', () => {
            // 5-minute demo: End Year is a "check win" button (no multi-year loop required).
            const result = evaluateDemoWin();
            if (result.win) {
                buildTool?.toast?.('Vicisti! (You win!)', 'info');
            } else {
                const parts = [];
                parts.push(`Domūs: ${result.counts.domus}/3`);
                parts.push(`Forum: ${result.counts.forum}/1`);
                if (!result.checks.housesConnected) parts.push('Domūs sine via.');
                if (!result.checks.forumOk) parts.push('Forum procul.');
                if (!result.checks.budgetOk) parts.push('Pecunia annua superata.');
                buildTool?.toast?.(`Nondum. (Not yet.) ${parts.join(' ')}`, 'info');
            }
            updateEconomyBar();
            saveFn();
            renderer.requestRender();
        });

        ui.saveBtn?.addEventListener('click', () => {
            saveFn();
            buildTool?.toast?.('Servatum est.', 'info');
        });

        ui.restartBtn?.addEventListener('click', () => {
            const ok = confirm('Urbem iterum incipere vis? Hoc aedificia posita delet et aerarium/annum restituit. Terra eadem manet.');
            if (!ok) return;

            buildTool?.cancelAll?.();
            world.clearPlacedBuildings?.();

            economy.coffers = 100;
            economy.year = -753;
            economy.annualBudget = 100;
            economy.yearSpent = 0;

            saveFn();
            updateEconomyBar();
            renderer.requestRender();
            buildTool?.toast?.('Urbs iterum incipit.', 'info');
        });
        
        // Create input handler
        const inputHandler = new InputHandler(canvas, world, camera, renderer, buildTool);
        
        // Setup Latin term tooltips
        setupLatinTerms();
        
        // Initial render
        renderer.render();
        
        // Store references globally for future use
        window.game = {
            world,
            camera,
            renderer,
            inputHandler,
            buildTool,
            save: saveFn,
            economy
        };

        // Keep the top bar in sync
        updateEconomyBar();

        // Also update economy bar after any render request (cheap) by piggybacking on RAF.
        // BuildTool calls updateUI() internally; this just mirrors economy numbers.
        const originalRequestRender = renderer.requestRender.bind(renderer);
        renderer.requestRender = () => {
            updateEconomyBar();
            return originalRequestRender();
        };
        
        console.log('✅ Urbs in Manus initialized!');
        console.log('   World size: ' + world.width + 'x' + world.height);
        console.log('   View mode: ' + (DEV_CONFIG.SHOW_FULL_MAP ? 'Full Map' : 'Tiber Island'));
        console.log('   Sample building: ' + (DEV_CONFIG.SHOW_SAMPLE_BUILDING ? 'Visible' : 'Hidden'));
        console.log('   Map source: ' + (DEV_CONFIG.LOAD_PNG_MAP ? 'PNG (' + DEV_CONFIG.LOAD_PNG_MAP + ')' : 'Procedural'));
    }
    
    setupMap();
}

// Start the game when the page loads
window.addEventListener('load', initGame);
window.addEventListener('resize', resizeCanvas);
