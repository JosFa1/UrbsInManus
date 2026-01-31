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
        this.zone = null;        // Zone type (housing, market, etc.)
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
        this.zones = {};       // Map of zone types by tile key

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
    
    setZone(x, y, zoneType) {
        const tile = this.getTile(x, y);
        if (tile) {
            tile.zone = zoneType;
            const key = `${x},${y}`;
            if (zoneType) {
                this.zones[key] = zoneType;
            } else {
                delete this.zones[key];
            }
        }
    }
    
    getZone(x, y) {
        const tile = this.getTile(x, y);
        return tile ? tile.zone : null;
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
    
    // Palatine Hill
    createHill(110, 80, 12, 8);
    
    // Capitoline Hill
    createHill(95, 75, 10, 6);
    
    // Aventine Hill
    createHill(125, 95, 14, 10);
    
    // Esquiline Hill
    createHill(115, 65, 16, 12);
    
    // Viminal Hill
    createHill(105, 60, 12, 8);
    
    // Quirinal Hill
    createHill(100, 55, 14, 10);
    
    // Caelian Hill
    createHill(120, 85, 10, 6);
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

        // Draw zone overlay if present
        if (tile.zone) {
            const zoneColors = {
                housing: 'rgba(201, 123, 99, 0.35)',
                market: 'rgba(215, 163, 75, 0.35)',
                workshops: 'rgba(160, 160, 160, 0.28)',
                civic: 'rgba(120, 170, 255, 0.25)',
                entertainment: 'rgba(255, 215, 0, 0.22)',
                sacred: 'rgba(170, 120, 255, 0.22)',
                farms: 'rgba(144, 238, 144, 0.22)',
                port: 'rgba(70, 130, 180, 0.22)'
            };
            this.ctx.fillStyle = zoneColors[tile.zone] || 'rgba(255, 0, 0, 0.3)';
            this.ctx.fillRect(x0, y0, w, h);
        }
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

        let x, y, w, h;
        
        if (building.type === 'domus') {
            // Draw houses as smaller boxes (not full tiles)
            const houseSize = Math.max(6, tilePx * 0.6); // Minimum 6px, or 60% of tile size
            x = Math.floor(baseX + building.x * tilePx + (tilePx - houseSize) / 2);
            y = Math.floor(baseY + building.y * tilePx + (tilePx - houseSize) / 2);
            w = houseSize;
            h = houseSize;
        } else {
            // Regular buildings
            const x0 = Math.floor(baseX + building.x * tilePx);
            const x1 = Math.floor(baseX + (building.x + building.width) * tilePx);
            const y0 = Math.floor(baseY + building.y * tilePx);
            const y1 = Math.floor(baseY + (building.y + building.height) * tilePx);

            x = x0;
            y = y0;
            w = x1 - x0;
            h = y1 - y0;
        }
        
        if (w <= 0 || h <= 0) return;
        
        // Draw building
        this.ctx.fillStyle = building.color;
        this.ctx.fillRect(x, y, w, h);
        
        // Draw border
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, w, h);
        
        // Draw simple roof indication for regular buildings
        if (building.type !== 'domus') {
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(x, y, w, Math.round(h * 0.2));
        }
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
// GAME STATE AND ECONOMY
// ========================================
class GameState {
    constructor() {
        this.turn = 1;  // Starts at 1 (753-734 a.C.n.)
        this.year = -753;
        this.citizens = 0;
        this.approval = 50;  // 0-100
        this.health = 50;
        this.income = 0;
        this.order = 50;
        this.coffers = 100;
        this.yearSpent = 0;
        this.unlockedBuildings = new Set(['via', 'zona_habitationis', 'zona_mercatus']);  // Start with roads and housing zones
        this.tutorialMode = true;
        this.tutorialStep = 0;  // Current tutorial step
        this.tutorialSteps = [
            {
                title: "Welcome to Rome!",
                message: "You are founding Rome in 753 BC. Let's build the greatest city in history! At the top you can see your city stats - citizens, money (aerarium), year, and more. Click 'Continue' to learn how to build roads.",
                action: "Click 'Continue' to start building."
            },
            {
                title: "Build Roads First",
                message: "Cities need roads for transportation and growth. Roads connect your buildings and allow citizens to move around. Look at the tools panel on the right - click on 'Viae' (Road) to select it.",
                highlight: "#toolSections .tool-btn[data-tool='via']",
                action: "Click on the 'Viae' (Road) button in the tools panel.",
                waitForClick: true
            },
            {
                title: "Place Your Roads",
                message: "Now click on the map to place roads. Build at least 3 connected road tiles to connect your city. Roads are cheap (1 coin each) and essential for everything else.",
                action: "Click on the map 3 times to place roads.",
                waitForAction: () => this.countBuildings('via') >= 3
            },
            {
                title: "Create Housing Zones",
                message: "People need places to live. Select 'Zona Habitationis' (Housing Zone) from the tools panel. Paint zones where you want residential areas to grow.",
                highlight: "#toolSections .tool-btn[data-tool='zona_habitationis']",
                action: "Click on 'Zona Habitationis' in the tools panel.",
                waitForClick: true
            },
            {
                title: "Zone Residential Areas",
                message: "Click and drag on the map to paint housing zones. Red houses of various shapes and sizes will organically appear over time, clustering densely in the most desirable areas near roads and services. Houses fit wherever there's space and can rotate to fill gaps efficiently.",
                action: "Paint a housing zone connected to your roads.",
                waitForAction: () => {
                    if (!window.game || !window.game.world) return false;
                    // Check if any tiles are zoned as housing
                    return Object.values(window.game.world.zones || {}).some(zone => zone === 'housing');
                }
            },
            {
                title: "Build a Well for Health",
                message: "Your citizens need clean water to stay healthy. Build a well (Puteus) to improve the 'Salus' (Health) stat at the top. Healthy citizens are happier and your city grows faster. The well tool has been unlocked for you.",
                highlight: "#toolSections .tool-btn[data-tool='puteus']",
                action: "Build one well near your housing.",
                unlock: ['puteus'],
                waitForAction: () => this.countBuildings('puteus') >= 1
            },
            {
                title: "Build a Forum for Income",
                message: "Markets generate income and keep citizens happy. Paint a market zone (Zona Mercatus) and forums will gradually appear over time, especially near populated areas. Without income, your city will struggle to grow!",
                highlight: "#toolSections .tool-btn[data-tool='zona_mercatus']",
                action: "Paint a market zone in your city.",
                unlock: ['zona_mercatus'],
                waitForAction: () => {
                    if (!window.game || !window.game.world) return false;
                    // Check if any tiles are zoned as market
                    return Object.values(window.game.world.zones || {}).some(zone => zone === 'market');
                }
            },
            {
                title: "Understanding Your Stats",
                message: "Look at the top bar: 'Cives' (Citizens) = population, 'Aerarium' (Coffers) = money, 'Favor' (Approval) = happiness, 'Salus' (Health) = well-being, 'Vectigal' (Income) = money earned, 'Ordo' (Order) = security. Keep these high for a successful city!",
                action: "Review your city stats at the top of the screen."
            },
            {
                title: "Advance Time",
                message: "Time passes in 20-year increments. Click the 'Progredere' (Progress) button to advance to 733 BC. Watch as houses and markets gradually appear in your zoned areas over multiple turns!",
                highlight: "#endYearBtn",
                action: "Click the 'Progredere' button to advance 20 years and see organic growth.",
                waitForAction: () => this.turn > 1
            },
            {
                title: "City Growth & Economics",
                message: "Great! Your city has grown. Houses appear organically in desirable locations (near roads, with services). Markets generate income as merchants move in. Keep zoning new areas and advancing time!",
                action: "Continue zoning housing and market areas, then advance time to watch growth."
            },
            {
                title: "Economic Safety Net",
                message: "If your city isn't making money, don't worry! The game provides a minimum budget to keep you going. Focus on zoning market areas and advancing time - merchants will gradually move in and generate income. Zone housing areas near roads for population growth!",
                action: "Remember: Market Zones = Income over time, Housing Zones = Citizens over time, Roads = Access for both"
            }
        ];
        
        // Population tracking for turn reports
        this.previousCitizens = 0;
        this.birthsThisTurn = 0;
        this.immigrationThisTurn = 0;
        this.peopleWants = 'Basic housing and roads';  // Default wants
    }

    generateOrganicBuildings() {
        if (!window.game || !window.game.world) return;
        
        const world = window.game.world;
        const buildings = world.buildings || [];
        
        // Generate houses in housing zones
        this.generateHousesInZones(world, buildings);
        
        // Generate markets in market zones
        this.generateMarketsInZones(world, buildings);
    }

    generateHousesInZones(world, buildings) {
        const housingZones = [];
        
        // Find all housing zone tiles
        for (const [key, zoneType] of Object.entries(world.zones || {})) {
            if (zoneType === 'housing') {
                const [x, y] = key.split(',').map(Number);
                housingZones.push({ x, y });
            }
        }
        
        if (housingZones.length === 0) return;
        
        // Calculate desirability for each housing zone tile
        const desirabilityMap = new Map();
        for (const zone of housingZones) {
            const desirability = this.calculateHousingDesirability(zone.x, zone.y, world, buildings);
            desirabilityMap.set(`${zone.x},${zone.y}`, desirability);
        }
        
        // Sort zones by desirability (highest first) - take more zones for denser clustering
        const sortedZones = Array.from(desirabilityMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, Math.min(8, housingZones.length)); // Consider top 8 most desirable zones
        
        // Try to place houses in desirable locations - more aggressive placement
        for (const [key, desirability] of sortedZones) {
            // Higher chance for more desirable areas (40-90% chance)
            if (Math.random() < 0.4 + (desirability * 0.5)) {
                const [x, y] = key.split(',').map(Number);
                this.tryPlaceHouseInZone(x, y, world, buildings, desirability);
            }
        }
    }

    calculateHousingDesirability(x, y, world, buildings) {
        let desirability = 0.3; // Base desirability
        
        // Distance to nearest road (closer is MUCH better)
        const nearestRoad = this.findNearestRoad(x, y, world);
        if (nearestRoad) {
            const distance = Math.abs(x - nearestRoad.x) + Math.abs(y - nearestRoad.y);
            desirability += Math.max(0, 0.5 - (distance * 0.08)); // Bonus up to 0.5 for being very close
        } else {
            desirability -= 0.2; // Penalty for no road access
        }
        
        // Nearby services (wells, forums) - big bonus
        const nearbyServices = buildings.filter(b => 
            (b.type === 'puteus' || b.type === 'forum') &&
            Math.abs(b.x - x) + Math.abs(b.y - y) <= 6
        );
        desirability += nearbyServices.length * 0.15; // 0.15 per nearby service
        
        // Population density (HEAVILY prefer areas with existing housing for clustering)
        const nearbyHouses = buildings.filter(b => 
            b.type === 'domus' &&
            Math.abs(b.x - x) + Math.abs(b.y - y) <= 4
        );
        desirability += nearbyHouses.length * 0.12; // Strong preference for clustering
        
        // Distance from zone edge (prefer center of zones)
        const zoneNeighbors = this.countZoneNeighbors(x, y, world, 'housing');
        desirability += zoneNeighbors * 0.03; // Small bonus for being surrounded by housing zones
        
        return Math.min(1.0, Math.max(0, desirability)); // Cap between 0 and 1.0
    }

    countZoneNeighbors(x, y, world, zoneType) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (dx === 0 && dy === 0) continue;
                if (world.zones[`${x + dx},${y + dy}`] === zoneType) count++;
            }
        }
        return count;
    }

    findNearestRoad(x, y, world) {
        // Check adjacent tiles first, then expand outward
        for (let radius = 0; radius <= 5; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dy = -radius; dy <= radius; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) === radius || radius === 0) {
                        const checkX = x + dx;
                        const checkY = y + dy;
                        if (world.getTile(checkX, checkY) === 'via' || 
                            world.getTile(checkX, checkY) === 'via_lapidea' ||
                            world.getTile(checkX, checkY) === 'pons') {
                            return { x: checkX, y: checkY };
                        }
                    }
                }
            }
        }
        return null;
    }

    tryPlaceHouseInZone(zoneX, zoneY, world, buildings, desirability) {
        // Generate a random house type
        const houseType = this.generateRandomHouseType(desirability);
        
        // Try multiple positions around the zone center, preferring clustered areas
        const candidates = [];
        
        // Search in a larger area for clustering opportunities
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
                const x = zoneX + dx;
                const y = zoneY + dy;
                
                // Must be in housing zone
                if (world.zones[`${x},${y}`] !== 'housing') continue;
                
                // Check if space is clear for this house size and rotation
                const canPlace = this.canPlaceHouseAt(x, y, houseType, world, buildings);
                if (!canPlace) continue;
                
                // Calculate placement score (favor clustering and road access)
                let score = desirability * 10; // Base score from zone desirability
                
                // Bonus for being near existing houses (clustering)
                const nearbyHouses = buildings.filter(b => 
                    b.type === 'domus' &&
                    Math.abs(b.x - x) + Math.abs(b.y - y) <= 3
                );
                score += nearbyHouses.length * 5;
                
                // Bonus for road access
                const nearestRoad = this.findNearestRoad(x, y, world);
                if (nearestRoad) {
                    const distance = Math.abs(x - nearestRoad.x) + Math.abs(y - nearestRoad.y);
                    score += Math.max(0, 8 - distance);
                }
                
                candidates.push({ x, y, score, houseType });
            }
        }
        
        if (candidates.length === 0) return;
        
        // Sort by score and pick the best
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        
        // Place the house
        this.placeHouseAt(best.x, best.y, best.houseType, world);
    }

    generateRandomHouseType(desirability) {
        // Generate houses of different sizes based on desirability
        // Higher desirability = larger houses
        const rand = Math.random();
        const sizeRand = Math.random();
        
        if (desirability > 0.8 && rand < 0.3) {
            // Large houses in prime locations
            return {
                width: sizeRand < 0.5 ? 3 : 4,
                height: sizeRand < 0.5 ? 2 : 3,
                rotation: Math.floor(Math.random() * 4) * 90, // 0, 90, 180, 270 degrees
                color: '#8B0000' // Dark red for large houses
            };
        } else if (desirability > 0.6 && rand < 0.5) {
            // Medium houses
            return {
                width: sizeRand < 0.6 ? 2 : 3,
                height: sizeRand < 0.6 ? 2 : 2,
                rotation: Math.floor(Math.random() * 4) * 90,
                color: '#B22222' // Firebrick red
            };
        } else if (desirability > 0.4 && rand < 0.7) {
            // Small houses
            return {
                width: sizeRand < 0.7 ? 1 : 2,
                height: sizeRand < 0.7 ? 2 : 1,
                rotation: Math.floor(Math.random() * 4) * 90,
                color: '#CD5C5C' // Indian red
            };
        } else {
            // Tiny houses/shacks in less desirable areas
            return {
                width: 1,
                height: 1,
                rotation: 0, // Tiny houses don't rotate
                color: '#DC143C' // Crimson red
            };
        }
    }

    canPlaceHouseAt(x, y, houseType, world, buildings) {
        // Get the actual footprint based on rotation
        const footprint = this.getHouseFootprint(x, y, houseType);
        
        // Check if all tiles in footprint are clear
        for (const tile of footprint) {
            const checkX = tile.x;
            const checkY = tile.y;
            
            // Check for existing buildings
            const hasBuilding = buildings.some(b => 
                checkX >= b.x && checkX < b.x + b.width &&
                checkY >= b.y && checkY < b.y + b.height
            );
            if (hasBuilding) return false;
            
            // Check terrain (avoid water, mountains)
            const tileType = world.getTile(checkX, checkY);
            if (tileType === 'water' || tileType === 'mountain') return false;
            
            // Must be in housing zone
            if (world.zones[`${checkX},${checkY}`] !== 'housing') return false;
        }
        
        return true;
    }

    getHouseFootprint(x, y, houseType) {
        const tiles = [];
        const { width, height, rotation } = houseType;
        
        // Generate footprint based on rotation
        if (rotation === 0) {
            // Normal orientation
            for (let dx = 0; dx < width; dx++) {
                for (let dy = 0; dy < height; dy++) {
                    tiles.push({ x: x + dx, y: y + dy });
                }
            }
        } else if (rotation === 90) {
            // Rotated 90 degrees clockwise
            for (let dx = 0; dx < height; dx++) {
                for (let dy = 0; dy < width; dy++) {
                    tiles.push({ x: x + dx, y: y - dy });
                }
            }
        } else if (rotation === 180) {
            // Rotated 180 degrees
            for (let dx = 0; dx < width; dx++) {
                for (let dy = 0; dy < height; dy++) {
                    tiles.push({ x: x - dx, y: y - dy });
                }
            }
        } else if (rotation === 270) {
            // Rotated 270 degrees clockwise
            for (let dx = 0; dx < height; dx++) {
                for (let dy = 0; dy < width; dy++) {
                    tiles.push({ x: x - dx, y: y + dy });
                }
            }
        }
        
        return tiles;
    }

    placeHouseAt(x, y, houseType, world) {
        const id = 'house_' + Date.now() + '_' + Math.random();
        const building = {
            id,
            type: 'domus',
            latinName: 'Domus',
            englishName: 'House',
            x,
            y,
            width: houseType.width,
            height: houseType.height,
            origin: { x, y },
            size: { w: houseType.width, h: houseType.height },
            rotation: houseType.rotation,
            placedAt: Date.now(),
            name: 'Domus',
            color: houseType.color,
            organic: true, // Mark as organically generated
            houseType: houseType // Store the house type info
        };
        
        if (typeof world.addPlacedBuilding === 'function') {
            world.addPlacedBuilding(building);
        }
    }

    generateMarketsInZones(world, buildings) {
        const marketZones = [];
        
        // Find all market zone tiles
        for (const [key, zoneType] of Object.entries(world.zones || {})) {
            if (zoneType === 'market') {
                const [x, y] = key.split(',').map(Number);
                marketZones.push({ x, y });
            }
        }
        
        if (marketZones.length === 0) return;
        
        // Markets are less dense than housing - only place occasionally
        if (Math.random() < 0.2) { // 20% chance per turn to place a market
            const randomZone = marketZones[Math.floor(Math.random() * marketZones.length)];
            this.tryPlaceMarketNearZone(randomZone.x, randomZone.y, world, buildings);
        }
    }

    tryPlaceMarketNearZone(zoneX, zoneY, world, buildings) {
        // Try to place a forum (market) in the market zone
        const candidates = [];
        
        // Check tiles within 3 units of zone center
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                const x = zoneX + dx;
                const y = zoneY + dy;
                
                // Must be in market zone
                if (world.zones[`${x},${y}`] !== 'market') continue;
                
                // Check if space is clear (forums are 2x2)
                if (!this.canPlaceForumAt(x, y, world, buildings)) continue;
                
                // Prefer locations near roads and population
                let score = 0;
                const nearestRoad = this.findNearestRoad(x, y, world);
                if (nearestRoad) {
                    const distance = Math.abs(x - nearestRoad.x) + Math.abs(y - nearestRoad.y);
                    score += Math.max(0, 4 - distance);
                }
                
                // Bonus for being near existing population
                const nearbyHouses = buildings.filter(b => 
                    b.type === 'domus' &&
                    Math.abs(b.x - x) + Math.abs(b.y - y) <= 8
                );
                score += nearbyHouses.length * 0.5;
                
                candidates.push({ x, y, score });
            }
        }
        
        if (candidates.length === 0) return;
        
        // Sort by score and pick the best
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];
        
        // Place the forum
        this.placeForumAt(best.x, best.y, world);
    }

    canPlaceForumAt(x, y, world, buildings) {
        // Check if 2x2 area is clear
        for (let dx = 0; dx < 2; dx++) {
            for (let dy = 0; dy < 2; dy++) {
                const checkX = x + dx;
                const checkY = y + dy;
                
                // Check for existing buildings
                const hasBuilding = buildings.some(b => 
                    checkX >= b.x && checkX < b.x + b.width &&
                    checkY >= b.y && checkY < b.y + b.height
                );
                if (hasBuilding) return false;
                
                // Check terrain
                const tile = world.getTile(checkX, checkY);
                if (tile === 'water' || tile === 'mountain') return false;
            }
        }
        return true;
    }

    placeForumAt(x, y, world) {
        const forumDef = window.BuildingCatalog.get('forum');
        if (!forumDef) return;
        
        const id = 'forum_' + Date.now() + '_' + Math.random();
        const building = {
            id,
            type: 'forum',
            latinName: forumDef.latinName,
            englishName: forumDef.englishName,
            x,
            y,
            width: forumDef.size.w,
            height: forumDef.size.h,
            origin: { x, y },
            size: { w: forumDef.size.w, h: forumDef.size.h },
            rotation: 0,
            placedAt: Date.now(),
            name: forumDef.latinName,
            color: forumDef.color,
            organic: true // Mark as organically generated
        };
        
        if (typeof world.addPlacedBuilding === 'function') {
            world.addPlacedBuilding(building);
        }
    }

    advanceTurn() {
        // Store previous population for report
        this.previousCitizens = this.citizens;
        
        this.turn += 1;
        this.year += 20;
        
        // Add income to coffers and reset spending
        this.coffers += this.income;
        this.previousSpent = this.yearSpent;
        this.previousIncome = this.income;
        this.yearSpent = 0;
        
        // Recalculate stats based on city state
        this.recalculateStats();
        
        // Economic stimulus: prevent getting stuck with no income
        if (this.income < 5 && this.citizens > 0 && this.turn <= 10) {
            // Early game stimulus: grant temporary income boost
            const stimulusAmount = Math.max(10, Math.floor(this.citizens / 2));
            this.coffers += stimulusAmount;
            this.stimulusGranted = stimulusAmount;
        } else {
            this.stimulusGranted = 0;
        }
        
        // Generate new buildings in zones organically
        this.generateOrganicBuildings();
        
        // Calculate population changes
        const populationIncrease = this.citizens - this.previousCitizens;
        this.birthsThisTurn = Math.max(0, Math.floor(populationIncrease * 0.7));  // 70% from births
        this.immigrationThisTurn = Math.max(0, populationIncrease - this.birthsThisTurn);  // Rest from immigration
        
        // Update people's wants based on turn/decade
        this.updatePeopleWants();
        
        // Show turn report
        this.showTurnReport();
        
        // Check tutorial progress after turn advancement
        this.checkTutorialAction();
        
        // Unlock new buildings
        this.unlockForTurn();
        if (this.turn > 10) this.tutorialMode = false;
        // Check win at turn 38
        if (this.turn >= 38) {
            this.checkWinCondition();
        }
    }

    checkWinCondition() {
        const score = this.citizens;  // Primary goal: largest city
        const legacy = this.getLegacyTitle();
        alert(`Annus Ultimus! (Final Year)\n\nCives: ${score}\nLegatum: ${legacy}\n\nGratias tibi ago pro ludo! (Thank you for playing!)`);
    }

    updatePeopleWants() {
        
        this.peopleWants = 'Basic housing and roads for settlement';
    }

    showTutorial() {
        if (!this.tutorialMode || this.tutorialStep >= this.tutorialSteps.length) return;
        
        const step = this.tutorialSteps[this.tutorialStep];
        const tutorialModal = document.createElement('div');
        tutorialModal.className = 'tutorial-modal-overlay';
        
        // Position in top-right corner, away from interactive elements
        const modalStyle = 'position: fixed; top: 20px; right: 20px; width: 320px; z-index: 1500;';
        
        tutorialModal.innerHTML = `
            <div class="tutorial-content">
                <div class="tutorial-header">
                    <h2>${step.title}</h2>
                    <span class="tutorial-step">${this.tutorialStep + 1}/${this.tutorialSteps.length}</span>
                </div>
                <div class="tutorial-body">
                    <p>${step.message}</p>
                    ${step.action ? `<p class="tutorial-action">${step.action}</p>` : ''}
                    ${step.highlight ? '<div class="tutorial-hint">👆 Look for the pulsing button!</div>' : ''}
                </div>
                <div class="tutorial-footer">
                    <button class="btn-secondary" id="skipTutorial">Skip Tutorial</button>
                    ${step.waitForClick ? '<button class="btn-primary" id="nextTutorial" disabled>Waiting for you to click...</button>' : 
                      step.waitForAction ? '<button class="btn-primary" id="nextTutorial" disabled>Complete the action above</button>' :
                      '<button class="btn-primary" id="nextTutorial">Continue</button>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(tutorialModal);
        
        // Highlight the target element if specified
        if (step.highlight) {
            const target = document.querySelector(step.highlight);
            if (target) {
                target.classList.add('tutorial-highlight');
                tutorialModal.classList.add('has-highlight');
                
                // Set CSS variables for spotlight effect
                const rect = target.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                tutorialModal.style.setProperty('--highlight-x', centerX + 'px');
                tutorialModal.style.setProperty('--highlight-y', centerY + 'px');
                
                // Scroll into view if needed
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // If waiting for click, add click listener
                if (step.waitForClick) {
                    const clickHandler = () => {
                        target.removeEventListener('click', clickHandler);
                        this.advanceTutorial();
                    };
                    target.addEventListener('click', clickHandler);
                }
            }
        }
        
        // Unlock buildings if specified
        if (step.unlock) {
            step.unlock.forEach(type => {
                if (!this.unlockedBuildings.has(type)) {
                    this.unlockedBuildings.add(type);
                    updateSidebar();
                }
            });
        }
        
        const nextBtn = tutorialModal.querySelector('#nextTutorial');
        const skipBtn = tutorialModal.querySelector('#skipTutorial');
        
        const closeTutorial = (skip = false) => {
            // Remove highlight
            if (step.highlight) {
                const target = document.querySelector(step.highlight);
                if (target) target.classList.remove('tutorial-highlight');
            }
            
            tutorialModal.remove();
            
            if (skip) {
                this.tutorialMode = false;
                this.tutorialStep = this.tutorialSteps.length;
                // Unlock buildings that would have been unlocked during tutorial
                this.unlockedBuildings.add('puteus');  // Unlocked in tutorial step 6
                // zona_mercatus is already unlocked initially, but tutorial reinforces it
            } else {
                this.tutorialStep++;
                // Auto-show next step after a delay
                setTimeout(() => this.showTutorial(), 500);
            }
        };
        
        nextBtn.addEventListener('click', () => closeTutorial(false));
        skipBtn.addEventListener('click', () => closeTutorial(true));
        
        // Start checking for action completion if needed
        if (step.waitForAction) {
            this.checkTutorialAction();
        }
    }

    advanceTutorial() {
        // Remove current tutorial modal
        const currentModal = document.querySelector('.tutorial-modal-overlay');
        if (currentModal) {
            currentModal.remove();
        }
        
        this.tutorialStep++;
        setTimeout(() => this.showTutorial(), 500);
    }

    checkTutorialAction() {
        if (!this.tutorialMode) return;
        
        const step = this.tutorialSteps[this.tutorialStep];
        if (!step || !step.waitForAction) return;
        
        const completed = step.waitForAction.call(this);
        
        if (completed) {
            // Enable the continue button
            const nextBtn = document.querySelector('#nextTutorial');
            if (nextBtn) {
                nextBtn.disabled = false;
                nextBtn.textContent = 'Continue';
            }
        } else {
            // Keep checking
            setTimeout(() => this.checkTutorialAction(), 500);
        }
    }

    checkTutorialProgress() {
        // This method is now handled by the waitForAction functions in showTutorial
        // Keep for backward compatibility but it's not used in the new system
    }

    showTurnReport() {
        const populationIncrease = this.citizens - this.previousCitizens;
        const reportModal = document.createElement('div');
        reportModal.className = 'modal-backdrop show';
        reportModal.innerHTML = `
            <div class="modal turn-report">
                <div class="modal-header">
                    <h2>Progressio Annua (Annual Progress)</h2>
                    <span class="close-btn">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="report-section">
                        <h3>Populatio (Population)</h3>
                        <p>Previous: ${this.previousCitizens} citizens</p>
                        <p>Current: ${this.citizens} citizens</p>
                        <p>Increase: +${populationIncrease}</p>
                        <p>From births: +${this.birthsThisTurn}</p>
                        <p>From immigration: +${this.immigrationThisTurn}</p>
                    </div>
                    ${this.stimulusGranted > 0 ? `
                    <div class="report-section">
                        <h3>Stimulus Oeconomicus (Economic Stimulus)</h3>
                        <p>Your city received ${this.stimulusGranted} coins in economic stimulus to help with early development.</p>
                        <p>Build more forums (markets) to generate sustainable income!</p>
                    </div>
                    ` : ''}
                    <div class="report-section">
                        <h3>Desideria Populi (People's Wants)</h3>
                        <p>${this.peopleWants}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary">Continue</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(reportModal);
        
        const closeBtn = reportModal.querySelector('.close-btn');
        const continueBtn = reportModal.querySelector('.btn-primary');
        
        const closeModal = () => {
            reportModal.classList.remove('show');
            setTimeout(() => document.body.removeChild(reportModal), 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        continueBtn.addEventListener('click', closeModal);
    }

    getLegacyTitle() {
        if (this.citizens >= 1000) return 'Urbs Magna (Great City)';
        if (this.citizens >= 500) return 'Urbs Potens (Powerful City)';
        if (this.citizens >= 200) return 'Urbs Cresciens (Growing City)';
        return 'Oppidum Parvum (Small Town)';
    }

    recalculateStats() {
        // Simplified stat calculation based on buildings and zones
        // Citizens: based on housing zones with road access
        this.citizens = this.calculateCitizens();
        // Other stats: placeholder logic
        this.approval = Math.min(100, 50 + Math.floor(this.citizens / 20));
        this.health = Math.min(100, 50 + (this.countBuildings('puteus') * 5));
        this.income = this.countBuildings('forum') * 5 + this.countBuildings('portus') * 10;
        this.order = Math.min(100, 50 + (this.countBuildings('murus') * 5) + (this.countBuildings('curia') * 5));
    }

    calculateCitizens() {
        // Citizens now come from actual residential buildings (houses) with road access
        let count = 0;
        const buildings = window.game ? window.game.world.buildings : [];
        for (const building of buildings) {
            if (building.type === 'domus' && this.hasRoadAccess(building.x, building.y)) {
                count += 4;  // Each house holds 4 citizens if it has road access
            }
        }
        return count;
    }

    hasRoadAccess(x, y) {
        // Check adjacent tiles for roads
        const neighbors = [
            [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        for (const [nx, ny] of neighbors) {
            if (nx >= 0 && ny >= 0 && nx < WORLD_WIDTH && ny < WORLD_HEIGHT) {
                const id = window.game.world.occupancy[ny][nx];
                if (id) {
                    const b = window.game.world.buildings.find(bb => bb.id === id);
                    if (b && (b.type === 'via' || b.type === 'via_lapidea' || b.type === 'pons')) return true;
                }
            }
        }
        return false;
    }

    countBuildings(type) {
        return window.game.world.buildings.filter(b => b.type === type).length;
    }

    unlockForTurn() {
        const unlocks = {
            2: ['forum', 'zona_mercatus'],
            3: ['puteus'],
            // Add more unlocks...
        };
        if (unlocks[this.turn]) {
            unlocks[this.turn].forEach(type => this.unlockedBuildings.add(type));
        }
        updateSidebar();
    }
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
// UI UPDATE FUNCTION
// ========================================
function updateUI() {
    if (!window.game || !window.game.gameState) return;

    const gs = window.game.gameState;
    const ui = {
        coffers: document.getElementById('statCoffers'),
        year: document.getElementById('statYear'),
        spent: document.getElementById('statSpent'),
        remaining: document.getElementById('statRemaining'),
        citizens: document.getElementById('statCitizens'),
        approval: document.getElementById('statApproval'),
        health: document.getElementById('statHealth'),
        income: document.getElementById('statIncome'),
        order: document.getElementById('statOrder'),
        goalRow: document.querySelector('.goal-row'),
        advisorPanel: document.getElementById('advisorPanel'),
        advisorBody: document.getElementById('advisorBody')
    };

    // Update stats
    if (ui.coffers) ui.coffers.textContent = gs.coffers;
    if (ui.year) ui.year.textContent = `${Math.abs(gs.year)} ${gs.year < 0 ? 'a.C.n.' : 'a.D.n.'}`;
    if (ui.spent) ui.spent.textContent = gs.yearSpent > 0 ? `-${gs.yearSpent}` : '0';
    if (ui.remaining) ui.remaining.textContent = `(${gs.coffers - gs.yearSpent})`;
    if (ui.citizens) ui.citizens.textContent = gs.citizens;
    if (ui.approval) ui.approval.textContent = gs.approval;
    if (ui.health) ui.health.textContent = gs.health;
    if (ui.income) ui.income.textContent = gs.income;
    if (ui.order) ui.order.textContent = gs.order;

    // Update goal
    if (ui.goalRow) {
        const goal = gs.tutorialMode ? `Tutorial: Turn ${gs.turn}/10` : `Build the greatest city by Year 0!`;
        ui.goalRow.innerHTML = `
            <span class="latin-term" data-definition="Goal">Finis</span>:
            <span class="latin-term" data-definition="${goal}">Cresce maximam urbem ad annum 0</span>
        `;
    }

    // Update advisor
    if (ui.advisorPanel && ui.advisorBody) {
        let advice = '';
        if (gs.tutorialMode) {
            const tutorialTips = {
                1: 'Welcome to Rome! Start by placing roads (Viae) and housing zones (Zona Habitationis).',
                2: 'Build a forum to increase income and approval.',
                3: 'Add wells (Putei) to improve health.',
                // Add more tutorial tips...
            };
            advice = tutorialTips[gs.turn] || 'Continue building your city!';
        } else {
            if (gs.approval < 30) advice = 'Citizens are unhappy. Build more civic buildings!';
            else if (gs.health < 30) advice = 'Disease spreads! Add more wells and drains.';
            else if (gs.fireRisk > 70) advice = 'Fire risk is high! Add more vigiles.';
            else advice = 'Your city prospers. Continue expanding!';
        }
        ui.advisorBody.textContent = advice;
    }
}

// ========================================
// SIDEBAR UPDATE FUNCTION
// ========================================
function updateSidebar() {
    if (!window.game || !window.game.gameState) return;
    
    const gameState = window.game.gameState;
    const toolSections = document.getElementById('toolSections');
    if (!toolSections) return;

    const categories = {
        roads: { title: 'Viae (Roads)', items: [] },
        zones: { title: 'Zonae (Zones)', items: [] },
        buildings: { title: 'Aedificia (Buildings)', items: [] },
        services: { title: 'Servitia (Services)', items: [] },
        landmarks: { title: 'Monumenta (Landmarks)', items: [] },
        civic: { title: 'Civica (Civic)', items: [] }
    };

    const catalog = window.BuildingCatalog;
    if (catalog && catalog.list) {
        const buildings = catalog.list();
        for (const def of buildings) {
            if (gameState.unlockedBuildings.has(def.type)) {
                const cat = categories[def.category];
                if (cat) cat.items.push(def);
            }
        }
    }

    toolSections.innerHTML = '';
    for (const [key, cat] of Object.entries(categories)) {
        if (cat.items.length > 0) {
            const section = document.createElement('div');
            section.className = 'tool-section';
            section.innerHTML = `<div class="tool-section-title">${cat.title}</div>`;
            for (const def of cat.items) {
                const btn = document.createElement('button');
                btn.className = 'tool-btn';
                btn.setAttribute('data-tool', def.type);
                btn.innerHTML = `
                    <span class="latin">${def.latinName}</span>
                    <span class="english">${def.englishName}</span>
                `;
                btn.addEventListener('click', () => {
                    if (window.game.buildTool) {
                        window.game.buildTool.selectType(def.type);
                        window.game.renderer.requestRender();
                    }
                });
                section.appendChild(btn);
            }
            toolSections.appendChild(section);
        }
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

        const gameState = new GameState();

        completeInitialization(world, gameState);
    }
    
    function completeInitialization(world, gameState) {
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
            citizens: document.getElementById('statCitizens'),
            approval: document.getElementById('statApproval'),
            health: document.getElementById('statHealth'),
            food: document.getElementById('statFood'),
            income: document.getElementById('statIncome'),
            fireRisk: document.getElementById('statFireRisk'),
            order: document.getElementById('statOrder'),
            endYearBtn: document.getElementById('endYearBtn'),
            saveBtn: document.getElementById('saveBtn'),
            restartBtn: document.getElementById('restartBtn')
        };

        const saveFn = () => {
            if (window.SaveAdapter) window.SaveAdapter.save(world, gameState);
            gameState.recalculateStats();  // Recalculate stats after building changes
            updateSidebar();
            gameState.checkTutorialAction();  // Check if tutorial action is completed
        };

        const buildTool = window.BuildTool
            ? new window.BuildTool({ world, camera, renderer, catalog: window.BuildingCatalog, onSave: saveFn, ui, economy: gameState })
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

        updateSidebar();

        ui.endYearBtn?.addEventListener('click', () => {
            gameState.advanceTurn();
            updateUI();
            updateSidebar();
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
            world.clearPlacedBuildings();
            world.zones = {};  // Clear zones

            gameState.turn = 1;
            gameState.year = -753;
            gameState.citizens = 0;
            gameState.approval = 50;
            gameState.health = 50;
            gameState.income = 0;
            gameState.fireRisk = 20;
            gameState.order = 50;
            gameState.coffers = 100;
            gameState.yearSpent = 0;
            gameState.unlockedBuildings = new Set(['via', 'zona_habitationis', 'zona_mercatus']);
            gameState.tutorialMode = true;

            saveFn();
            updateUI();
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
            gameState
        };

        // Keep the top bar in sync
        updateUI();

        // Also update UI after any render request (cheap) by piggybacking on RAF.
        const originalRequestRender = renderer.requestRender.bind(renderer);
        renderer.requestRender = () => {
            updateUI();
            return originalRequestRender();
        };
        
        console.log('✅ Urbs in Manus initialized!');
        console.log('   World size: ' + world.width + 'x' + world.height);
        console.log('   View mode: ' + (DEV_CONFIG.SHOW_FULL_MAP ? 'Full Map' : 'Tiber Island'));
        console.log('   Sample building: ' + (DEV_CONFIG.SHOW_SAMPLE_BUILDING ? 'Visible' : 'Hidden'));
        console.log('   Map source: ' + (DEV_CONFIG.LOAD_PNG_MAP ? 'PNG (' + DEV_CONFIG.LOAD_PNG_MAP + ')' : 'Procedural'));
        
        // Start tutorial for new players
        setTimeout(() => {
            updateSidebar(); // Make sure tools are visible
            gameState.showTutorial();
        }, 1000);
    }
    
    setupMap();
}

// Start the game when the page loads
window.addEventListener('load', initGame);
window.addEventListener('resize', resizeCanvas);
