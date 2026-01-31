// Build tool: selection, ghost preview, placement checks, demolish.
// Exposes window.BuildTool.

(function () {
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    class BuildTool {
        constructor({ world, camera, renderer, catalog, onSave, ui, economy }) {
            this.world = world;
            this.camera = camera;
            this.renderer = renderer;
            this.catalog = catalog;
            this.onSave = typeof onSave === 'function' ? onSave : () => {};

            this.ui = ui;
            this.economy = economy;

            this.selectedType = null;
            this.demolishMode = false;
            this.hover = { x: 0, y: 0 };
            this.lastErrorAt = 0;

            this._isDraggingBuild = false;
            this._dragPlacedIds = new Set();

            this._undoStack = [];
            this._redoStack = [];

            this.updateUI();
        }

        setHover(x, y) {
            this.hover.x = x;
            this.hover.y = y;
            this.updateUI();
        }

        selectType(type) {
            this.demolishMode = false;
            this.selectedType = type;
            this.updateUI();
        }

        toggleDemolish() {
            this.demolishMode = !this.demolishMode;
            if (this.demolishMode) this.selectedType = null;
            this.updateUI();
        }

        cancelSelection() {
            this.selectedType = null;
            this.updateUI();
        }

        cancelAll() {
            this.selectedType = null;
            this.demolishMode = false;
            this.updateUI();
        }

        getSelectedDef() {
            if (!this.selectedType) return null;
            return this.catalog.get(this.selectedType);
        }

        _tileTypeAt(x, y) {
            const tile = this.world.getTile(x, y);
            return tile ? tile.type : null;
        }

        _isAllowedGround(type) {
            // 5-minute demo rules: buildable ground is Field or Sand.
            return type === 'ager' || type === 'harena';
        }

        _isRoadBuilding(building) {
            if (!building) return false;
            return building.type === 'via' || building.type === 'via_lapidea' || building.type === 'pons';
        }

        _isZone(building) {
            if (!building) return false;
            return building.kind === 'zone';
        }

        _hasAdjacentRoad(originX, originY, w, h) {
            // True if any tile of the footprint touches a road/bridge (4-neighborhood).
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
                        if (nx < 0 || ny < 0 || nx >= this.world.width || ny >= this.world.height) continue;
                        // Ignore neighbors that are still inside our own footprint.
                        if (nx >= originX && nx < originX + w && ny >= originY && ny < originY + h) continue;

                        const id = this.world.occupancy?.[ny]?.[nx] || null;
                        if (!id) continue;
                        const b = this.getBuildingById(id);
                        if (this._isRoadBuilding(b)) return true;
                    }
                }
            }
            return false;
        }

        _minManhattanDistance(a, b) {
            // Minimum Manhattan distance between two building footprints.
            // Returns 0 if footprints touch/overlap.
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

        _countHousesNear(originX, originY, w, h, maxDist) {
            const probe = { x: originX, y: originY, width: w, height: h };
            let count = 0;
            for (const b of (this.world.buildings || [])) {
                if (!b || b.type !== 'domus') continue;
                const d = this._minManhattanDistance(probe, b);
                if (d <= maxDist) count += 1;
            }
            return count;
        }

        _computeVariant(def, originX, originY) {
            // Roads become bridges when placed on river.
            if (def.type === 'via') {
                const terrain = this._tileTypeAt(originX, originY);
                if (terrain === 'flumen') {
                    return {
                        latinName: def.bridge?.latinName || 'Pons',
                        englishName: def.bridge?.englishName || 'Bridge',
                        color: def.bridge?.color || def.color,
                        baseCost: typeof def.bridge?.cost === 'number' ? def.bridge.cost : (typeof def.cost === 'number' ? def.cost : 0)
                    };
                }
            }

            return {
                latinName: def.latinName,
                englishName: def.englishName,
                color: def.color,
                baseCost: typeof def.cost === 'number' ? def.cost : 0
            };
        }

        validatePlacement(originX, originY, def) {
            const w = def.size.w;
            const h = def.size.h;

            const terrainLabel = (t) => (t ? (t.charAt(0).toUpperCase() + t.slice(1)) : '—');

            // Bounds
            if (originX < 0 || originY < 0 || originX + w > this.world.width || originY + h > this.world.height) {
                return { ok: false, reason: 'Non licet. (Not allowed) Extra fines. (Out of bounds)' };
            }

            // For zones, no occupancy check, just terrain
            if (this._isZone(def)) {
                const terrain = this._tileTypeAt(originX, originY);
                if (!this._isAllowedGround(terrain)) {
                    return { ok: false, reason: 'Non licet. (Not allowed) Debet esse ager aut harena. (Must be field/sand)' };
                }
                return { ok: true, cost: 0, variant: { latinName: def.latinName, englishName: def.englishName, color: def.color, baseCost: 0 } };
            }

            // For buildings: Occupancy
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    const tx = originX + dx;
                    const ty = originY + dy;
                    const occ = this.world.occupancy?.[ty]?.[tx];
                    if (occ) return { ok: false, reason: 'Non licet. (Not allowed) Locus occupatus. (Occupied)' };
                }
            }

            // Terrain constraints for buildings
            const terrainSet = new Set();
            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    terrainSet.add(this._tileTypeAt(originX + dx, originY + dy));
                }
            }

            if (def.type === 'via' || def.type === 'via_lapidea') {
                // Roads only on Ager/Harena.
                const t = this._tileTypeAt(originX, originY);
                if (!this._isAllowedGround(t)) {
                    return { ok: false, reason: 'Non licet. (Not allowed) Via solum in agro/harena. (Road only on field/sand)' };
                }
            } else if (def.type === 'pons') {
                // Bridge only on Flumen.
                const t = this._tileTypeAt(originX, originY);
                if (t !== 'flumen') {
                    return { ok: false, reason: 'Non licet. (Not allowed) Pons solum in flumine. (Bridge only on river)' };
                }
            } else {
                // Buildings must be fully on Ager OR fully on Harena.
                const terrains = Array.from(terrainSet).map(terrainLabel);
                if (terrains.length !== 1) {
                    return { ok: false, reason: 'Non licet. (Not allowed) Terra miscetur. (Mixed terrain)' };
                }
                const t = this._tileTypeAt(originX, originY);
                if (!this._isAllowedGround(t)) {
                    return { ok: false, reason: 'Non licet. (Not allowed) Debet esse ager aut harena. (Must be field/sand)' };
                }
            }

            // Adjacency / proximity constraints
            if (def.type === 'domus') {
                if (!this._hasAdjacentRoad(originX, originY, w, h)) {
                    return { ok: false, reason: 'Domus sine via. (House needs a road)' };
                }
            }

            if (def.type === 'forum') {
                const near = this._countHousesNear(originX, originY, w, h, 6);
                if (near < 2) {
                    return { ok: false, reason: 'Forum procul. (Market needs 2 houses within 6 tiles)' };
                }
            }

            // Cost + afford
            const variant = this._computeVariant(def, originX, originY);
            const cost = this._currentCost(def, variant.baseCost);
            if (!this._canAfford(cost)) {
                return { ok: false, reason: 'Non licet. (Not allowed) Aerarium vacuum. (No coffers)' };
            }

            return { ok: true, cost, variant };
        }

        getGhost() {
            if (this.demolishMode) {
                const id = this.getBuildingIdAt(this.hover.x, this.hover.y);
                if (!id) return null;
                const building = this.getBuildingById(id);
                if (!building) return null;
                return {
                    mode: 'demolish',
                    origin: { x: building.x, y: building.y },
                    size: { w: building.width, h: building.height },
                    valid: true
                };
            }

            const def = this.getSelectedDef();
            if (!def) return null;
            const origin = { x: this.hover.x, y: this.hover.y };
            const canPlace = this.validatePlacement(origin.x, origin.y, def).ok;
            return {
                mode: 'place',
                origin,
                size: { w: def.size.w, h: def.size.h },
                valid: canPlace
            };
        }

        canPlaceAt(x, y, w, h) {
            // Compatibility wrapper (older callers). Prefer validatePlacement().
            const def = this.getSelectedDef();
            if (!def) return false;
            if (def.size.w !== w || def.size.h !== h) return false;
            return this.validatePlacement(x, y, def).ok;
        }

        _currentCost(def, baseOverride = null) {
            const base = baseOverride !== null ? baseOverride : (typeof def.cost === 'number' ? def.cost : 0);
            return base;
        }

        _canAfford(cost) {
            if (!this.economy) return true;
            return this.economy.coffers >= cost;
        }

        _spend(cost) {
            if (!this.economy) return;
            this.economy.coffers -= cost;
            this.economy.yearSpent += cost;
        }

        _refund(cost) {
            if (!this.economy) return;
            this.economy.coffers += cost;
            this.economy.yearSpent = Math.max(0, this.economy.yearSpent - cost);
        }

        _pushUndo(action) {
            this._undoStack.push(action);
            this._redoStack = [];
        }

        undo() {
            const action = this._undoStack.pop();
            if (!action) return;
            if (action.kind === 'place') {
                for (const id of action.buildingIds) {
                    this.world.removePlacedBuildingById(id);
                }
                this._refund(action.totalCost || 0);
                this._redoStack.push(action);
            } else if (action.kind === 'demolish') {
                for (const b of action.buildings) {
                    this.world.addPlacedBuilding(b);
                    this.world.occupyBuildingFootprint(b);
                }
                // No refund/charge for demolish.
                this._redoStack.push(action);
            }
            this.onSave();
            this.updateUI();
            this.renderer.requestRender();
        }

        redo() {
            const action = this._redoStack.pop();
            if (!action) return;
            if (action.kind === 'place') {
                // Recreate buildings from snapshots
                for (const b of action.buildings) {
                    this.world.addPlacedBuilding(b);
                    this.world.occupyBuildingFootprint(b);
                }
                this._spend(action.totalCost || 0);
                this._undoStack.push(action);
            } else if (action.kind === 'demolish') {
                for (const b of action.buildings) {
                    this.world.removePlacedBuildingById(b.id);
                }
                this._undoStack.push(action);
            }
            this.onSave();
            this.updateUI();
            this.renderer.requestRender();
        }

        place(atX = null, atY = null, { silent = false } = {}) {
            const def = this.getSelectedDef();
            if (!def) return;

            const x = atX !== null ? atX : this.hover.x;
            const y = atY !== null ? atY : this.hover.y;
            const w = def.size.w;
            const h = def.size.h;

            const validation = this.validatePlacement(x, y, def);
            if (!validation.ok) {
                if (!silent) this.toast(validation.reason || 'Non licet.', 'error');
                return;
            }

            const variant = validation.variant || this._computeVariant(def, x, y);
            const cost = validation.cost;

            if (this._isZone(def)) {
                if (def.zoneType === 'housing') {
                    // For residential zones, just paint the zone - houses will grow organically over time
                    for (let dy = 0; dy < h; dy++) {
                        for (let dx = 0; dx < w; dx++) {
                            this.world.setZone(x + dx, y + dy, def.zoneType);
                        }
                    }
                } else {
                    // For other zones, just paint the zone
                    for (let dy = 0; dy < h; dy++) {
                        for (let dx = 0; dx < w; dx++) {
                            this.world.setZone(x + dx, y + dy, def.zoneType);
                        }
                    }
                }
                if (!silent) {
                    this.toast(`${variant.latinName} posita. (${variant.englishName} placed)`, 'info');
                }
                this.onSave();
                this.updateUI();
                this.renderer.requestRender();
                return { zoneType: def.zoneType };
            }

            // Building placement
            const id = uuid();
            const placedAt = Date.now();

            // Building object compatible with current renderer + save requirements.
            const building = {
                id,
                type: def.type,
                latinName: variant.latinName,
                englishName: variant.englishName,
                x,
                y,
                width: w,
                height: h,
                origin: { x, y },
                size: { w, h },
                rotation: 0,
                placedAt,
                name: variant.latinName,
                color: variant.color
            };

            if (typeof this.world.addPlacedBuilding === 'function') {
                this.world.addPlacedBuilding(building);
            } else {
                this.world.buildings.push(building);
            }

            if (typeof this.world.occupyBuildingFootprint === 'function') {
                this.world.occupyBuildingFootprint(building);
            }

            this._spend(cost);

            if (!silent) {
                const msgByType = {
                    via: 'Via posita. (Road placed)',
                    via_lapidea: 'Via lapidea posita. (Paved road placed)',
                    pons: 'Pons positus. (Bridge placed)',
                    domus: 'Domus posita. (House placed)',
                    forum: 'Forum positum. (Market placed)',
                    puteus: 'Puteus positus. (Well placed)',
                    cloaca: 'Cloaca posita. (Drainage placed)',
                    vigiles: 'Vigiles positi. (Fire watch placed)',
                    murus: 'Murus positus. (Wall placed)',
                    curia: 'Curia posita. (Council house placed)',
                    horrea: 'Horrea posita. (Granary placed)',
                    portus: 'Portus positus. (Port placed)',
                    aquaeductus: 'Aquaeductus positus. (Aqueduct placed)',
                    thermae: 'Thermae positae. (Baths placed)',
                    circus: 'Circus positus. (Circus placed)',
                    amphitheatrum: 'Amphitheatrum positum. (Amphitheater placed)',
                    templum_maius: 'Templum maius positum. (Great temple placed)'
                };
                this.toast(msgByType[def.type] || 'Recte. (OK)', 'info');
            }

            // Single placements record undo immediately. Drag placements are recorded on drag end.
            if (!this._isDraggingBuild) {
                this._pushUndo({
                    kind: 'place',
                    buildingIds: [id],
                    buildings: [building],
                    totalCost: cost
                });
            }

            this.onSave();
            this.updateUI();
            this.renderer.requestRender();

            return { id, building, cost };
        }

        _placeHousesInZone(zoneX, zoneY, zoneW, zoneH, silent = false) {
            const houseDef = this.catalog.get('domus');
            if (!houseDef) return;

            // Try to place houses in the zoned area, but only where there's space and road access
            for (let dy = 0; dy < zoneH; dy += 3) {  // Space houses with some gap (house is 2x2, so +1 gap)
                for (let dx = 0; dx < zoneW; dx += 3) {
                    const houseX = zoneX + dx;
                    const houseY = zoneY + dy;
                    
                    // Check if we can place a house here
                    const validation = this.validatePlacement(houseX, houseY, houseDef);
                    if (validation.ok) {
                        // Place the house directly
                        const id = uuid();
                        const placedAt = Date.now();
                        const variant = validation.variant || this._computeVariant(houseDef, houseX, houseY);
                        
                        const building = {
                            id,
                            type: houseDef.type,
                            latinName: variant.latinName,
                            englishName: variant.englishName,
                            x: houseX,
                            y: houseY,
                            width: houseDef.size.w,
                            height: houseDef.size.h,
                            origin: { x: houseX, y: houseY },
                            size: { w: houseDef.size.w, h: houseDef.size.h },
                            rotation: 0,
                            placedAt,
                            name: variant.latinName,
                            color: variant.color
                        };

                        if (typeof this.world.addPlacedBuilding === 'function') {
                            this.world.addPlacedBuilding(building);
                        } else {
                            this.world.buildings.push(building);
                        }

                        if (typeof this.world.occupyBuildingFootprint === 'function') {
                            this.world.occupyBuildingFootprint(building);
                        }

                        // Mark the zone as housing around the house
                        for (let zy = Math.max(0, houseY - 1); zy <= Math.min(this.world.height - 1, houseY + 2); zy++) {
                            for (let zx = Math.max(0, houseX - 1); zx <= Math.min(this.world.width - 1, houseX + 2); zx++) {
                                this.world.setZone(zx, zy, 'housing');
                            }
                        }
                    }
                }
            }
        }

        demolish() {
            const id = this.getBuildingIdAt(this.hover.x, this.hover.y);
            if (!id) {
                this.toast('Nihil hic est ad demoliri.', 'info');
                return;
            }

            const building = this.getBuildingById(id);
            if (building) {
                this._pushUndo({ kind: 'demolish', buildings: [building] });
            }

            if (typeof this.world.removePlacedBuildingById === 'function') {
                this.world.removePlacedBuildingById(id);
            }

            this.onSave();
            this.updateUI();
            this.renderer.requestRender();
        }

        onLeftClick() {
            if (this.demolishMode) {
                this.demolish();
                return;
            }
            if (this.selectedType) {
                this.place();
            }
        }

        // Drag building for 1x1 tools (roads/bakery). Call begin/drag/end from input.
        beginBuildDrag() {
            const def = this.getSelectedDef();
            if (!def) return;
            if (def.size.w !== 1 || def.size.h !== 1) return;

            this._isDraggingBuild = true;
            this._dragPlacedIds.clear();
        }

        dragBuildTo(x, y) {
            if (!this._isDraggingBuild) return;
            const def = this.getSelectedDef();
            if (!def) return;

            // Avoid placing repeatedly on the same tile.
            const key = `${x},${y}`;
            if (this._dragPlacedIds.has(key)) return;

            const result = this.place(x, y, { silent: true });
            if (result && result.id) {
                this._dragPlacedIds.add(key);
                // Track for undo batching
                if (!this._dragBatch) {
                    this._dragBatch = { kind: 'place', buildingIds: [], buildings: [], totalCost: 0 };
                }
                this._dragBatch.buildingIds.push(result.id);
                this._dragBatch.buildings.push(result.building);
                this._dragBatch.totalCost += result.cost;
            }
        }

        endBuildDrag() {
            if (!this._isDraggingBuild) return;
            this._isDraggingBuild = false;
            this._dragPlacedIds.clear();
            if (this._dragBatch && this._dragBatch.buildingIds.length > 0) {
                this._pushUndo(this._dragBatch);
            }
            this._dragBatch = null;
            this.onSave();
            this.updateUI();
            this.renderer.requestRender();
        }

        getBuildingIdAt(x, y) {
            return this.world.occupancy?.[y]?.[x] || null;
        }

        getBuildingById(id) {
            return (this.world.buildings || []).find(b => b && b.id === id) || null;
        }

        toast(message, kind = 'info') {
            if (!this.ui?.toast) return;

            // Rate limit repeated errors while dragging around.
            const now = Date.now();
            if (kind === 'error' && now - this.lastErrorAt < 150) return;
            if (kind === 'error') this.lastErrorAt = now;

            const el = this.ui.toast;
            el.textContent = message;
            el.classList.remove('show', 'error', 'info');
            el.classList.add('show', kind);
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => {
                el.classList.remove('show');
            }, 1400);
        }

        updateUI() {
            if (!this.ui) return;

            const selectedLabel = this.demolishMode
                ? 'Dirue'
                : (this.selectedType ? this.catalog.get(this.selectedType)?.latinName : '—');

            const def = this.getSelectedDef();
            const footprint = this.demolishMode
                ? (() => {
                    const id = this.getBuildingIdAt(this.hover.x, this.hover.y);
                    const b = id ? this.getBuildingById(id) : null;
                    return b ? `${b.width}x${b.height}` : '—';
                })()
                : (def ? `${def.size.w}x${def.size.h}` : '—');

            const cost = def ? this._currentCost(def, this._computeVariant(def, this.hover.x, this.hover.y).baseCost) : null;
            const coffers = this.economy ? this.economy.coffers : null;
            const spent = this.economy ? this.economy.yearSpent : null;

            if (this.ui.status) {
                const costText = cost !== null ? ` | Pretium: ${cost}` : '';
                const econText = this.economy ? ` | Aerarium: ${coffers} | Impensa: ${spent}` : '';
                
                // Check for house hover info
                const buildingId = this.getBuildingIdAt(this.hover.x, this.hover.y);
                const building = buildingId ? this.getBuildingById(buildingId) : null;
                const houseInfo = building && building.type === 'domus' ? ` | Domus: ${building.latinName} (${building.englishName}) - Cives: 4` : '';
                
                this.ui.status.textContent = `Instrumentum: ${selectedLabel} | Vestigium: ${footprint} | Sub: [${this.hover.x}, ${this.hover.y}]${costText}${econText}${houseInfo}`;
            }

            // Button highlighting
            if (this.ui.buttons) {
                for (const btn of this.ui.buttons) {
                    btn.classList.remove('active');
                    const t = btn.getAttribute('data-tool');
                    if (t && t === this.selectedType && !this.demolishMode) btn.classList.add('active');
                }
            }
            if (this.ui.demolishBtn) {
                this.ui.demolishBtn.classList.toggle('active', this.demolishMode);
            }
        }
    }

    window.BuildTool = BuildTool;
})();
