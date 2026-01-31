# PNG Map Loading System

## Overview
The editor mode has been replaced with a PNG-to-map conversion system. This allows you to design maps as lossless PNG pixel art images that are automatically converted to the tile system.

## How It Works

### Color Mapping
PNG pixels are automatically mapped to the closest tile color:

- **Light Green** `#90EE90` → AGER (Grass/Field)
- **Steel Blue** `#4682B4` → FLUMEN (River)
- **Brown** `#8B7355` → COLLIS (Hill/Mountain)
- **Sandy** `#C2B280` → HARENA (Sand)

Each pixel in your PNG is compared against these four colors, and the closest color match determines the tile type.

### Size Handling

- **Too Small:** If your PNG is smaller than 256x144, the remaining area is filled with AGER (grass) tiles
- **Too Large:** If your PNG is larger than 256x144, an error is thrown and the map won't load
- **Optimal Size:** 256x144 pixels (1:1 with the world grid)

### Transparent Pixels
Fully transparent pixels (alpha < 128) are treated as AGER (grass) tiles. This allows you to paint only the areas you need.

## Usage

### Setup
1. Create a PNG image sized 256x144 pixels (or smaller)
2. Use the exact tile colors listed above
3. Save as PNG (ensure it's lossless)

### Configuration
In `game.js`, set the `LOAD_PNG_MAP` option:

```javascript
const DEV_CONFIG = {
    SHOW_FULL_MAP: false,
    SHOW_SAMPLE_BUILDING: true,
    LOAD_PNG_MAP: 'path/to/your/map.png'  // or null for procedural generation
};
```

### Loading
- If `LOAD_PNG_MAP` is `null`, the procedural `configureMap()` function generates a map
- If `LOAD_PNG_MAP` has a path, the PNG loader attempts to load and convert it
- On error, the console logs the error and an alert is shown

## Example Workflow

1. **Create your map image:**
   - Use an image editor (Photoshop, GIMP, Aseprite, etc.)
   - Size: 256x144 pixels
   - Palette: Use only the 4 tile colors (or close approximations)

2. **Place in your project:**
   ```
   UrbsInManus/
   ├── game.js
   ├── index.html
   ├── styles.css
   └── maps/
       └── my_map.png
   ```

3. **Configure in game.js:**
   ```javascript
   LOAD_PNG_MAP: 'maps/my_map.png'
   ```

4. **Test:**
   - Open index.html in a browser
   - Check the console for loading status
   - The map should render with your PNG design

## Color Quantization Details

The system uses Euclidean distance in RGB space to find the closest tile color:

```
distance = √[(R₁-R₂)² + (G₁-G₂)² + (B₁-B₂)²]
```

This means:
- **Near-perfect matches** will map to the intended tile type
- **Slightly off colors** will still map correctly due to distance calculation
- **Artwork with gradients** may produce unexpected results (quantize your colors first!)

## Tips for Best Results

1. **Use a pixel art editor** (Aseprite, Piskel, Pyxel Edit) for precise pixel-level control
2. **Snap colors to the exact tile colors** - don't use gradients or anti-aliasing
3. **Test your PNG first** before adding complex game logic
4. **Start small** (e.g., 64x64) to verify the conversion is working
5. **Use layers** to organize your map design before flattening to PNG

## Debugging

If your PNG doesn't load:
1. Check the browser console for error messages
2. Verify the file path is correct and relative to index.html
3. Ensure the PNG is readable (check browser CORS settings)
4. Verify PNG dimensions don't exceed 256x144
5. Make sure colors are close to the expected tile colors

## Future Enhancements

Potential improvements to this system:
- Custom tile palettes
- Multiple PNG layers for different features
- Bulk conversion tools
- Map preview before applying
- Color adjustment/remapping UI
