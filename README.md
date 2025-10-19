# Toddler Racing Game

A fun, toddler-friendly racing game built with HTML5 Canvas. Drive a monster truck through different terrains with keyboard, gamepad, or touch controls!

## Features

- **Multiple Input Methods**: Keyboard, Xbox/generic gamepad, and touch controls
- **Terrain Effects**: Different surfaces (road, grass, mud) affect speed and handling
- **Tire Tracks**: Lingering tire tracks on grass that fade over time
- **Top-down Monster Truck**: Detailed vehicle graphics with proper rotation
- **Mobile Optimized**: Landscape mode with touch controls

## Controls

### Keyboard
- Arrow Keys / WASD: Steer and accelerate
- Up/W: Accelerate
- Down/S: Brake
- Left/A: Turn left
- Right/D: Turn right

### Gamepad (Xbox/Generic)
- Left Stick: Steer and accelerate
- Works with standard gamepad mapping

### Touch (Mobile)
- Touch controls appear on mobile devices
- Left/Right arrows: Steer
- Car button: Accelerate

## GitHub Pages Deployment

This game is designed to run entirely as static files on GitHub Pages.

### Setup Instructions

1. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select the `gh-pages` branch
   - Choose `/ (root)` as the folder
   - Click "Save"

2. **Access Your Game**:
   - After a few minutes, your game will be available at:
   - `https://[your-username].github.io/[repository-name]/`

3. **Update the Game**:
   - Make changes on the `gh-pages` branch
   - Commit and push to GitHub
   - Changes will be live within a few minutes

### Local Development

To test locally, you need a local web server due to CORS restrictions on `fetch()`:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Project Structure

```
.
├── index.html           # Main game page
├── assets/
│   ├── cars.json       # Car sprite definitions
│   ├── terrain.json    # Terrain and object definitions
│   └── config.json     # Game physics and configuration
└── js/
    ├── game.js         # Main game loop and logic
    ├── graphics.js     # Rendering engine
    └── input.js        # Input handling (keyboard/gamepad/touch)
```

## Customization

### Add New Cars
Edit `assets/cars.json` to add new vehicle types with custom parts and colors.

### Adjust Physics
Modify `assets/config.json` to change:
- Max speed
- Acceleration
- Turn speed
- Terrain multipliers

### Change Map Layout
Edit the terrain generation logic in `js/graphics.js` (`drawTerrainGrid` function).

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Full support (landscape mode recommended)

## License

This project is open source and available for educational purposes.
