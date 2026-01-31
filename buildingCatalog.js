// Building catalog: definitions for buildable items.
// Loaded as a plain script (no bundler). Exposes window.BuildingCatalog.

(function () {
    const BUILDING_TYPES = {
        via: {
            type: 'via',
            latinName: 'Via',
            englishName: 'Road',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#b8b8b8'
        },
        domus: {
            type: 'domus',
            latinName: 'Domus',
            englishName: 'House',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#c97b63'
        },
        insula: {
            type: 'insula',
            latinName: 'Insula',
            englishName: 'Apartment block',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#9a6b3f'
        },
        pistrinum: {
            type: 'pistrinum',
            latinName: 'Pistrinum',
            englishName: 'Bakery',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#d7a34b'
        }
    };

    function get(type) {
        return BUILDING_TYPES[type] || null;
    }

    function list() {
        return Object.values(BUILDING_TYPES);
    }

    window.BuildingCatalog = {
        get,
        list
    };
})();
