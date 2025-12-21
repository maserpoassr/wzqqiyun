# User Guide

## Rapfi AI 五子棋 - Gomoku AI Game

Welcome to the strongest open-source Gomoku AI game! This guide will help you get started.

---

## Game Rules

### Objective
Be the first to get **five pieces in a row** (horizontal, vertical, or diagonal).

### Basic Rules
1. **Black plays first** - You control the black pieces
2. **Alternate turns** - After you place a piece, the AI (white) responds
3. **Win condition** - First to connect 5 pieces in a line wins
4. **Draw** - If the board fills up with no winner, it's a draw

### Board
- Standard 15×15 grid
- Click any empty intersection to place your piece

---

## How to Play

### Auto-Play Mode (Default)

1. **Start a game** - The board is ready when you load the page
2. **Make your move** - Click any empty cell to place a black piece
3. **Wait for AI** - The AI will think and respond with a white piece
4. **Continue** - Keep playing until someone wins or it's a draw
5. **New game** - Click the 📄 (new file) button to start over

### What You'll See

- **"AI thinking..."** - Animated indicator while AI calculates
- **Real-time metrics** - Depth, Nodes, Speed during AI thinking
- **Turn indicator** - Shows whose turn it is
- **Move count** - Number of moves played
- **Win popup** - Appears when the game ends

---

## Manual Analysis Mode

For advanced users who want to analyze positions:

1. **Toggle off Auto-Play** - Click the toggle switch
2. **Analysis buttons appear**:
   - ▶️ Play - Start AI analysis
   - ⏹️ Stop - Stop current analysis
   - ⚖️ Balance - Two-step balanced move analysis
3. **View results** - Depth, Eval, Nodes, Speed, Best line
4. **Preview moves** - Click moves in the best line to preview

---

## Controls

### Button Bar

| Icon | Function |
|------|----------|
| 📄 | New Game - Reset the board |
| ⏮️ | Go to beginning |
| ◀️ | Undo one move |
| ▶️ | Redo one move |
| ⏭️ | Go to end |
| 🔄 | Auto-Play toggle |
| 📷 | Screenshot/GIF |
| ℹ️ | Toggle move numbers |
| 🔁 | Rotate board |
| ↔️ | Flip board |
| ↕️ | Move board |
| ❓ | Game rules |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| ← | Undo move |
| → | Redo move |
| Home | Go to beginning |
| End | Go to end |
| Space | Start/Stop analysis |
| B | One-step balance |
| Shift+B | Two-step balance |

---

## Mobile Usage Tips

### Best Experience
- **Landscape mode** - Rotate your phone for a larger board
- **Portrait hint** - A tip will appear suggesting landscape mode

### Touch Controls
- **Tap** - Place a piece on the board
- **Buttons** - All buttons are touch-friendly (48px minimum)

### Supported Devices
- iPhone (Safari)
- Android (Chrome)
- iPad/Android tablets
- Any modern mobile browser

### PWA Installation
You can install the app to your home screen:
1. Open in Safari (iOS) or Chrome (Android)
2. Tap Share → "Add to Home Screen"
3. Launch from your home screen like a native app

---

## AI Strength

### About Rapfi AI
Rapfi is the **strongest open-source Gomoku engine**, using:
- Neural network evaluation (NNUE)
- Multi-threaded search (when supported)
- SIMD optimization (when supported)

### WASM Variants (Auto-Selected)
1. **rapfi-multi-simd128** - Fastest (multi-threaded + SIMD)
2. **rapfi-multi** - Fast (multi-threaded)
3. **rapfi-single-simd128** - Good (single-threaded + SIMD)
4. **rapfi-single** - Fallback (single-threaded)

Your browser automatically selects the best variant.

### Two-Step Balanced Move
In auto-play mode, the AI uses "Two-step Balanced Move" search:
- Considers both its move AND your likely response
- Produces stronger, more strategic play
- Takes longer on complex positions

---

## Troubleshooting

### AI Not Responding

**Symptoms:** Clicking doesn't trigger AI response

**Solutions:**
1. Check if game has ended (look for win popup)
2. Ensure Auto-Play mode is ON (toggle switch)
3. Wait for current AI thinking to complete
4. Refresh the page if stuck

### WASM Loading Error

**Symptoms:** "AI engine error" or blank screen

**Solutions:**
1. Refresh the page
2. Clear browser cache
3. Try a different browser
4. Check internet connection

### Slow AI Response

**Symptoms:** AI takes very long to respond

**Explanations:**
- Complex positions require deeper search
- First move may take longer (engine initialization)
- Low-end devices use slower WASM variant

**Solutions:**
1. Wait for the search to complete
2. Use a more powerful device
3. Try a different browser (Chrome often fastest)

### Touch Not Working

**Symptoms:** Taps don't register on mobile

**Solutions:**
1. Tap directly on board intersections
2. Avoid double-tapping (triggers zoom prevention)
3. Ensure you're tapping empty cells
4. Try landscape mode for larger touch targets

### Board Too Small

**Symptoms:** Hard to see or tap on mobile

**Solutions:**
1. Rotate to landscape mode
2. Use a tablet for better experience
3. Zoom in browser (may affect touch accuracy)

---

## FAQ

### Q: Can I play as white?
A: In auto-play mode, you always play black (first move). In manual mode, you can place pieces for either side.

### Q: How strong is the AI?
A: Rapfi is one of the strongest Gomoku engines. It will beat most human players.

### Q: Can I adjust AI difficulty?
A: In auto-play mode, AI always plays at full strength. Manual mode allows different search options.

### Q: Does it work offline?
A: After initial load, the game works offline. WASM engine runs entirely in your browser.

### Q: Is my game data saved?
A: Games are not saved between sessions. Use the screenshot feature to save positions.

### Q: Can I share a position?
A: The URL updates with your position. Copy and share the URL to share a position.

---

## Tips for Beginners

1. **Control the center** - The center of the board is strategically important
2. **Build multiple threats** - Create positions where you threaten to win in multiple ways
3. **Block the AI** - Watch for AI's potential winning lines and block them
4. **Think ahead** - Consider how the AI might respond to your moves
5. **Learn from losses** - Use manual analysis mode to understand where you went wrong

---

## Credits

- **Rapfi Engine** - Open-source Gomoku AI engine
- **Vue.js** - Frontend framework
- **VUX** - Mobile UI components

Enjoy playing! 🎮
