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
            color: '#b8b8b8',
            cost: 1
        },
        domus: {
            type: 'domus',
            latinName: 'Domus',
            englishName: 'House',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#c97b63',
            cost: 10
        },
        forum: {
            type: 'forum',
            latinName: 'Forum',
            englishName: 'Market',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#d7a34b',
            cost: 30
        },
        pons: {
            type: 'pons',
            latinName: 'Pons',
            englishName: 'Bridge',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#9aa3ad',
            cost: 25
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
