# Urbs in Manus - Roman City Simulator

A historically-grounded city simulation game where you plan and manage a Roman city.

## 🎮 How to Play

1. Open `index.html` in a web browser
2. Read the in-depth tutorial explaining Roman terms and city planning
3. Start building your city!

## ✨ Key Features

### Enhanced Tutorial
- Detailed explanations of Latin terms with pronunciation
- Step-by-step guidance through building your first city
- Historical context for each building type
- Clear explanations of game mechanics and Roman urban planning

### Free Placement System
- **No grid constraints** - place buildings anywhere on the map
- **Drag to build** - hold mouse button and drag to place multiple roads
- **Visual feedback** - green outline when placement is valid, red when invalid
- **Variable building sizes** - from 1x1 roads to 5x4 amphitheaters
- **Smart collision detection** - prevents overlapping buildings

### Undo/Redo System
- When game is paused, undo/redo buttons appear
- Undo any building placement or demolition
- Redo actions you've undone
- History limited to last 50 actions

### Data Persistence
- Game automatically saves to browser localStorage
- Progress preserved across browser refreshes
- Resume your city exactly where you left off
- Version compatibility checking

### User-Friendly Improvements
- **Restart button** - start a fresh city anytime
- **Detailed tooltips** - hover over buildings for full information
- **Better feedback** - clear alerts for events and problems
- **Pronunciation guides** - learn how to say Latin words correctly
- **Historical notes** - understand the real Roman context

## 📁 Graphics Assets

See `ASSETS_LIST.txt` for complete list of required graphics.

Graphics should be placed in:
```
/graphics/
  buildings/
    via.png
    insula.png
    domus.png
    [etc...]
  ui/
    cursor-normal.png
    icon-water.png
    [etc...]
  terrain/
    terrain-grass.png
    overlay-green.png
    [etc...]
```

Currently the game uses colored rectangles as placeholders. Replace with your custom graphics!

## 🏗️ Building Sizes Reference

| Building | Size | Pixels |
|----------|------|--------|
| Via (Road) | 1x1 | 48x48 |
| Insula | 2x2 | 96x96 |
| Domus | 2x2 | 96x96 |
| Pistrinum | 1x1 | 48x48 |
| Fons | 1x1 | 48x48 |
| Latrina | 1x1 | 48x48 |
| Tabernae | 2x1 | 96x48 |
| Macellum | 3x2 | 144x96 |
| Horrea | 2x3 | 96x144 |
| Aquaeductus | 1x3 | 48x144 |
| Officina | 2x2 | 96x96 |
| Templum | 3x3 | 144x144 |
| Thermae | 4x3 | 192x144 |
| Basilica | 4x3 | 192x144 |
| Theatrum | 4x3 | 192x144 |
| Forum | 4x4 | 192x192 |
| Amphitheatrum | 5x4 | 240x192 |

## 🎯 Win Condition

Reach **500 population** with **Order above 50** for **5 consecutive days**

## 💡 Tips for Success

1. **Start with roads** - everything connects via roads (Via)
2. **Build aqueduct first** - required for fountains to work
3. **Space out services** - place fountains, markets, and baths throughout the city
4. **Balance housing types** - Insula for density, Domus for wealthy citizens
5. **Use pause mode** - plan your city layout without time pressure
6. **Check Census regularly** - monitor coverage and happiness every 7 days
7. **Prevent unrest** - build temples and civic buildings to maintain order

## 📚 Latin Pronunciation Guide

- **Via** (VEE-ah) - Road
- **Insula** (IN-soo-lah) - Apartment block
- **Domus** (DOH-moos) - House
- **Aquaeductus** (ah-kweh-DUKE-toos) - Aqueduct
- **Fons** (FONZ) - Fountain
- **Macellum** (mah-CHEL-loom) - Market
- **Pistrinum** (pis-TREE-noom) - Bakery
- **Horrea** (HOR-ray-ah) - Granary
- **Thermae** (THER-my) - Baths
- **Templum** (TEM-ploom) - Temple

## 🔧 Technical Details

- Pure HTML, CSS, and JavaScript - no build tools required
- Canvas-based rendering
- localStorage for data persistence
- Optimized pathfinding and coverage calculations
- Event-driven architecture

## 📖 Historical Accuracy

This simulation is based on authentic Roman urban planning:
- Aqueducts brought water to cities
- Public baths were social and hygiene centers
- Insulae housed most urban residents
- Markets (macellum) were essential for food distribution
- The Census was a real Roman institution
- Forums and basilicas were civic centers

The game simplifies these systems for gameplay while maintaining historical authenticity.

## 🎨 Customization

To add custom graphics:
1. Create PNG images according to sizes in ASSETS_LIST.txt
2. Place in `/graphics/` folder structure
3. Images will automatically load (with fallback to colored rectangles)

Recommended art style: Isometric 2D or top-down 2.5D perspective

## 🐛 Known Limitations

- Graphics are placeholder colored rectangles until you add custom assets
- Pathfinding is simplified (distance-based rather than true road pathfinding)
- Maximum 50 undo history steps
- Game saves to localStorage (cleared if browser cache is cleared)

## 📜 License

Educational project - feel free to modify and extend!
