// Building catalog: definitions for buildable items.
// Loaded as a plain script (no bundler). Exposes window.BuildingCatalog.

(function () {
    const BUILDING_TYPES = {
        via: {
            type: 'via',
            kind: 'road',
            category: 'roads',
            latinName: 'Via',
            englishName: 'Road (dirt)',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#b8b8b8',
            cost: 1,
            bridge: {
                latinName: 'Pons',
                englishName: 'Bridge',
                color: '#9aa3ad',
                cost: 8
            }
        },
        via_lapidea: {
            type: 'via_lapidea',
            kind: 'road',
            category: 'roads',
            latinName: 'Via lapidea',
            englishName: 'Paved road',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#a0a0a0',
            cost: 3,
            bridge: {
                latinName: 'Pons',
                englishName: 'Bridge',
                color: '#9aa3ad',
                cost: 10
            }
        },
        domus: {
            type: 'domus',
            kind: 'building',
            category: 'buildings',
            latinName: 'Domus',
            englishName: 'House block',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#c97b63',
            cost: 10
        },
        forum: {
            type: 'forum',
            kind: 'building',
            category: 'landmarks',
            latinName: 'Forum',
            englishName: 'Forum (civic center/marketplace)',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#d7a34b',
            cost: 30
        },
        pons: {
            type: 'pons',
            kind: 'road',
            category: 'roads',
            latinName: 'Pons',
            englishName: 'Bridge',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#9aa3ad',
            cost: 25
        },

        // ZONES (paint, not placed buildings)
        zona_habitationis: {
            type: 'zona_habitationis',
            kind: 'zone',
            category: 'zones',
            zoneType: 'housing',
            latinName: 'Habitatio',
            englishName: 'Housing zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(201, 123, 99, 0.35)',
            cost: 0
        },
        zona_mercatus: {
            type: 'zona_mercatus',
            kind: 'zone',
            category: 'zones',
            zoneType: 'market',
            latinName: 'Mercatus',
            englishName: 'Market zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(215, 163, 75, 0.35)',
            cost: 0
        },
        zona_officinarum: {
            type: 'zona_officinarum',
            kind: 'zone',
            category: 'zones',
            zoneType: 'workshops',
            latinName: 'Officinae',
            englishName: 'Workshops/industry zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(160, 160, 160, 0.28)',
            cost: 0
        },
        zona_civica: {
            type: 'zona_civica',
            kind: 'zone',
            category: 'zones',
            zoneType: 'civic',
            latinName: 'Civica',
            englishName: 'Civic zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(120, 170, 255, 0.25)',
            cost: 0
        },
        zona_ludorum: {
            type: 'zona_ludorum',
            kind: 'zone',
            category: 'zones',
            zoneType: 'entertainment',
            latinName: 'Ludi',
            englishName: 'Entertainment zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(255, 215, 0, 0.22)',
            cost: 0
        },
        zona_sacra: {
            type: 'zona_sacra',
            kind: 'zone',
            category: 'zones',
            zoneType: 'sacred',
            latinName: 'Sacra',
            englishName: 'Sacred zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(170, 120, 255, 0.22)',
            cost: 0
        },
        zona_agri: {
            type: 'zona_agri',
            kind: 'zone',
            category: 'zones',
            zoneType: 'farms',
            latinName: 'Ager',
            englishName: 'Fields/farms zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(144, 238, 144, 0.22)',
            cost: 0
        },
        zona_portus: {
            type: 'zona_portus',
            kind: 'zone',
            category: 'zones',
            zoneType: 'port',
            latinName: 'Portus',
            englishName: 'Waterfront/port zone',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: 'rgba(70, 130, 180, 0.22)',
            cost: 0
        },

        // Services / landmarks (minimum fun set)
        puteus: {
            type: 'puteus',
            kind: 'building',
            category: 'services',
            latinName: 'Puteus',
            englishName: 'Well / cistern',
            size: { w: 1, h: 1 },
            rotation: 0,
            color: '#6aa2d6',
            cost: 12
        },
        cloaca: {
            type: 'cloaca',
            kind: 'building',
            category: 'services',
            latinName: 'Cloaca',
            englishName: 'Drainage / sewer',
            size: { w: 2, h: 1 },
            rotation: 0,
            color: '#6b5b4b',
            cost: 18
        },
        vigiles: {
            type: 'vigiles',
            kind: 'building',
            category: 'services',
            latinName: 'Vigiles',
            englishName: 'Fire watch',
            size: { w: 2, h: 1 },
            rotation: 0,
            color: '#c05a5a',
            cost: 20
        },
        murus: {
            type: 'murus',
            kind: 'building',
            category: 'services',
            latinName: 'Murus',
            englishName: 'Walls (early)',
            size: { w: 3, h: 1 },
            rotation: 0,
            color: '#8b8b8b',
            cost: 35
        },
        curia: {
            type: 'curia',
            kind: 'building',
            category: 'civic',
            latinName: 'Curia',
            englishName: 'Council house',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#bca36a',
            cost: 28
        },
        horrea: {
            type: 'horrea',
            kind: 'building',
            category: 'services',
            latinName: 'Horrea',
            englishName: 'Granary',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#c6b17a',
            cost: 26
        },
        portus: {
            type: 'portus',
            kind: 'building',
            category: 'services',
            latinName: 'Portus',
            englishName: 'Docks / port',
            size: { w: 2, h: 2 },
            rotation: 0,
            color: '#3c7fb1',
            cost: 40
        },
        aquaeductus: {
            type: 'aquaeductus',
            kind: 'building',
            category: 'landmarks',
            latinName: 'Aquaeductus',
            englishName: 'Aqueduct',
            size: { w: 3, h: 2 },
            rotation: 0,
            color: '#a9c4d8',
            cost: 70
        },
        thermae: {
            type: 'thermae',
            kind: 'building',
            category: 'landmarks',
            latinName: 'Thermae',
            englishName: 'Baths',
            size: { w: 3, h: 3 },
            rotation: 0,
            color: '#d3d3d3',
            cost: 85
        },
        circus: {
            type: 'circus',
            kind: 'building',
            category: 'landmarks',
            latinName: 'Circus',
            englishName: 'Circus (major spectacles)',
            size: { w: 4, h: 2 },
            rotation: 0,
            color: '#d28b4b',
            cost: 95
        },
        amphitheatrum: {
            type: 'amphitheatrum',
            kind: 'building',
            category: 'landmarks',
            latinName: 'Amphitheatrum',
            englishName: 'Amphitheater',
            size: { w: 3, h: 3 },
            rotation: 0,
            color: '#a88f7a',
            cost: 110
        },
        templum_maius: {
            type: 'templum_maius',
            kind: 'building',
            category: 'landmarks',
            latinName: 'Templum maius',
            englishName: 'Great temple',
            size: { w: 3, h: 3 },
            rotation: 0,
            color: '#b889ff',
            cost: 95
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
