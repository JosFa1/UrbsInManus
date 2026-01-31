// Save adapter: persists placed buildings + occupancy to localStorage.
// Exposes window.SaveAdapter.

(function () {
    const STORAGE_KEY = 'urbsInManus.save.v1';

    function makeEmptyOccupancy(width, height) {
        const grid = new Array(height);
        for (let y = 0; y < height; y++) {
            grid[y] = new Array(width).fill(null);
        }
        return grid;
    }

    function serializeOccupancy(occupancy) {
        // Flatten to 1D array for easier storage.
        const height = occupancy.length;
        const width = height > 0 ? occupancy[0].length : 0;
        const flat = new Array(width * height);
        let i = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                flat[i++] = occupancy[y][x];
            }
        }
        return { width, height, data: flat };
    }

    function deserializeOccupancy(payload, fallbackWidth, fallbackHeight) {
        if (!payload || !Array.isArray(payload.data) || typeof payload.width !== 'number' || typeof payload.height !== 'number') {
            return makeEmptyOccupancy(fallbackWidth, fallbackHeight);
        }
        const width = payload.width;
        const height = payload.height;
        const occ = makeEmptyOccupancy(width, height);
        const flat = payload.data;
        let i = 0;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                occ[y][x] = flat[i++] ?? null;
            }
        }
        return occ;
    }

    function save(world) {
        const buildings = (world.buildings || []).filter(b => b && b.id && b.type);
        const payload = {
            version: 1,
            savedAt: Date.now(),
            buildings: buildings.map(b => ({
                id: b.id,
                type: b.type,
                latinName: b.latinName,
                englishName: b.englishName,
                origin: { x: b.x, y: b.y },
                size: { w: b.width, h: b.height },
                rotation: b.rotation ?? 0,
                placedAt: b.placedAt ?? null
            })),
            occupancy: serializeOccupancy(world.occupancy || makeEmptyOccupancy(world.width, world.height))
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function loadRaw() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    function tryLoadIntoWorld(world, buildingCatalog) {
        const data = loadRaw();
        if (!data || !Array.isArray(data.buildings)) return false;

        // Reset placed buildings/occupancy before applying.
        if (typeof world.clearPlacedBuildings === 'function') {
            world.clearPlacedBuildings();
        } else {
            // Fallback: best-effort clear.
            world.buildings = (world.buildings || []).filter(b => !(b && b.id && b.type));
            world.occupancy = makeEmptyOccupancy(world.width, world.height);
            for (let y = 0; y < world.height; y++) {
                for (let x = 0; x < world.width; x++) {
                    const tile = world.getTile(x, y);
                    if (tile) tile.building = null;
                }
            }
        }

        // Recreate occupancy grid from saved data (we also rebuild occupancy from buildings after).
        world.occupancy = deserializeOccupancy(data.occupancy, world.width, world.height);

        for (const b of data.buildings) {
            const def = buildingCatalog?.get?.(b.type);
            if (!def) continue;

            const originX = b.origin?.x;
            const originY = b.origin?.y;
            if (typeof originX !== 'number' || typeof originY !== 'number') continue;

            const w = b.size?.w ?? def.size.w;
            const h = b.size?.h ?? def.size.h;

            // Create an instance compatible with the existing renderer expectations.
            const building = {
                id: b.id,
                type: def.type,
                latinName: b.latinName || def.latinName,
                englishName: b.englishName || def.englishName,
                x: originX,
                y: originY,
                width: w,
                height: h,
                name: b.latinName || def.latinName,
                color: def.color,
                rotation: b.rotation ?? 0,
                placedAt: b.placedAt ?? null
            };

            if (typeof world.addPlacedBuilding === 'function') {
                world.addPlacedBuilding(building);
            } else {
                world.buildings.push(building);
            }

            // Ensure occupancy/tile.building consistent.
            if (typeof world.occupyBuildingFootprint === 'function') {
                world.occupyBuildingFootprint(building);
            } else {
                for (let dy = 0; dy < h; dy++) {
                    for (let dx = 0; dx < w; dx++) {
                        const tx = originX + dx;
                        const ty = originY + dy;
                        if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) continue;
                        world.occupancy[ty][tx] = building.id;
                        const tile = world.getTile(tx, ty);
                        if (tile) tile.building = building.id;
                    }
                }
            }
        }

        return true;
    }

    window.SaveAdapter = {
        STORAGE_KEY,
        save,
        tryLoadIntoWorld
    };
})();
