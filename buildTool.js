// Build tool: selection, ghost preview, placement checks, demolish.
// Exposes window.BuildTool.

(function () {
    function uuid() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
        return 'b_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    }

    class BuildTool {
        constructor({ world, camera, renderer, catalog, onSave, ui }) {
            this.world = world;
            this.camera = camera;
            this.renderer = renderer;
            this.catalog = catalog;
            this.onSave = typeof onSave === 'function' ? onSave : () => {};

            this.ui = ui;

            this.selectedType = null;
            this.demolishMode = false;
            this.hover = { x: 0, y: 0 };
            this.lastErrorAt = 0;

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
            const canPlace = this.canPlaceAt(origin.x, origin.y, def.size.w, def.size.h);
            return {
                mode: 'place',
                origin,
                size: { w: def.size.w, h: def.size.h },
                valid: canPlace
            };
        }

        canPlaceAt(x, y, w, h) {
            // Bounds
            if (x < 0 || y < 0 || x + w > this.world.width || y + h > this.world.height) return false;

            for (let dy = 0; dy < h; dy++) {
                for (let dx = 0; dx < w; dx++) {
                    const tx = x + dx;
                    const ty = y + dy;
                    const occ = this.world.occupancy?.[ty]?.[tx];
                    if (occ) return false;
                }
            }
            return true;
        }

        place() {
            const def = this.getSelectedDef();
            if (!def) return;

            const x = this.hover.x;
            const y = this.hover.y;
            const w = def.size.w;
            const h = def.size.h;

            if (!this.canPlaceAt(x, y, w, h)) {
                this.toast(`Non licet: locus occupatus (${w}x${h}).`, 'error');
                return;
            }

            const id = uuid();
            const placedAt = Date.now();

            // Building object compatible with current renderer + save requirements.
            const building = {
                id,
                type: def.type,
                latinName: def.latinName,
                englishName: def.englishName,
                x,
                y,
                width: w,
                height: h,
                origin: { x, y },
                size: { w, h },
                rotation: 0,
                placedAt,
                name: def.latinName,
                color: def.color
            };

            if (typeof this.world.addPlacedBuilding === 'function') {
                this.world.addPlacedBuilding(building);
            } else {
                this.world.buildings.push(building);
            }

            if (typeof this.world.occupyBuildingFootprint === 'function') {
                this.world.occupyBuildingFootprint(building);
            }

            this.onSave();
            this.renderer.requestRender();
        }

        demolish() {
            const id = this.getBuildingIdAt(this.hover.x, this.hover.y);
            if (!id) {
                this.toast('Nihil hic est ad demoliri.', 'info');
                return;
            }

            if (typeof this.world.removePlacedBuildingById === 'function') {
                this.world.removePlacedBuildingById(id);
            }

            this.onSave();
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
                ? 'Demoliri'
                : (this.selectedType ? this.catalog.get(this.selectedType)?.latinName : '—');

            const def = this.getSelectedDef();
            const footprint = this.demolishMode
                ? (() => {
                    const id = this.getBuildingIdAt(this.hover.x, this.hover.y);
                    const b = id ? this.getBuildingById(id) : null;
                    return b ? `${b.width}x${b.height}` : '—';
                })()
                : (def ? `${def.size.w}x${def.size.h}` : '—');

            if (this.ui.status) {
                this.ui.status.textContent = `Tool: ${selectedLabel} | Footprint: ${footprint} | Hover: [${this.hover.x}, ${this.hover.y}]`;
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
