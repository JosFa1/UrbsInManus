# Quick Start Guide

## 🚀 Testing the Game Right Now

### Option 1: Open Directly
1. Navigate to `/home/josfa/UrbsInManus/`
2. Open `index.html` in your browser
3. Start playing!

### Option 2: Local Server (Recommended)
```bash
cd /home/josfa/UrbsInManus
python3 -m http.server 8080
```
Then open: http://localhost:8080

## 🎮 First Time Playing

1. **Read the Tutorial** - Don't skip it! It explains everything
2. **Start with Roads** - Click "Via" and drag to build roads
3. **Build an Aqueduct** - Required for water fountains
4. **Add Housing** - Insula (cheap) or Domus (expensive)
5. **Place Fountains** - Near housing, along roads
6. **Build Markets** - For food (Macellum or Pistrinum)
7. **Watch it Grow** - People will move in automatically

## 🎯 Testing New Features

### Test Free Placement
- Click any building type
- Move mouse over canvas
- Notice green/red preview showing if you can build
- Buildings snap to invisible grid but can go anywhere

### Test Drag-to-Build
- Click "Via" (road)
- Click and hold mouse button
- Drag across canvas
- Multiple roads placed in one motion!

### Test Undo/Redo
- Build something
- Click pause button (⏸)
- Notice undo (↶) and redo (↷) buttons appear
- Click undo - building removed, money refunded
- Click redo - building returns

### Test Persistence
- Build a few buildings
- Refresh the page (F5)
- Game loads exactly where you left off
- Check localStorage in browser dev tools to see saved data

### Test Different Building Sizes
- Try placing different buildings
- Notice size differences:
  - Roads: tiny 1x1
  - Houses: medium 2x2
  - Baths: large 4x3
  - Forum: huge 4x4
  - Amphitheater: massive 5x4

## 🐛 What to Look For

### Expected Behavior
- ✅ Green outline when placement is valid
- ✅ Red outline when placement is invalid (overlapping or out of bounds)
- ✅ Dragging roads creates multiple tiles
- ✅ Undo/redo buttons only visible when paused
- ✅ Game saves automatically
- ✅ Restart button asks for confirmation
- ✅ Tutorial explains everything clearly

### Known Limitations
- Graphics are colored rectangles (until you add PNGs)
- No animations yet
- Pathfinding is simplified (distance-based)
- Max 50 undo steps

## 📝 Quick Controls Reference

| Action | Control |
|--------|---------|
| Select building | Click button in left panel |
| Place building | Click on canvas |
| Place multiple | Click and drag (roads only) |
| Cancel selection | Click same button again |
| Demolish | Select "Demolish" tool, click building |
| Pause/Resume | Click ⏸ Pause or ▶ Resume |
| Change speed | Click 1x, 2x, or 4x |
| Undo (when paused) | Click ↶ Undo |
| Redo (when paused) | Click ↷ Redo |
| Restart | Click 🔄 Restart City |
| View Census | Click "Census Urbis" button |
| View Glossary | Click "Glossarium" button |
| View Help | Click "Auxilium" button |

## 💡 Tips for Testing

1. **Test the tutorial first** - Make sure explanations are clear
2. **Try building quickly** - Use drag for roads, test responsiveness
3. **Intentionally make mistakes** - Then use undo to fix them
4. **Refresh multiple times** - Verify persistence works
5. **Try invalid placements** - Check that red outline appears
6. **Build different size buildings** - See how they fit together
7. **Check mobile** - While not optimized, should still function

## 🎨 Adding Graphics (Later)

When you're ready to add custom graphics:

1. Create PNG files following sizes in `ASSETS_LIST.txt`
2. Place in `/graphics/buildings/`, `/graphics/ui/`, etc.
3. Use exact filenames from `FILENAMES.txt`
4. Refresh game - graphics load automatically!
5. If missing, game falls back to colored rectangles

## ❓ Troubleshooting

**Game won't load:**
- Check browser console (F12) for errors
- Make sure you're opening from a web server (not file://)
- Try clearing localStorage and refreshing

**Undo/redo buttons not showing:**
- Make sure game is paused
- Check if any buildings have been placed (history needs actions)

**Buildings won't place:**
- Check if you have enough Aes (money)
- Look for red outline (indicates invalid placement)
- Some buildings need roads nearby

**Game not saving:**
- Check if localStorage is enabled in browser
- Private/incognito mode may not persist
- Check browser storage quota

## 🎉 You're Ready!

The game is fully functional with all requested improvements. Enjoy building your Roman city!

For detailed documentation, see:
- `README.md` - Complete game documentation
- `ASSETS_LIST.txt` - Graphics specifications
- `IMPROVEMENTS.md` - Technical details of changes
