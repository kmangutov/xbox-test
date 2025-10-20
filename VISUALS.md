# Visual Detail & Customization PRD

## Goal

Improve **road and terrain realism** while ensuring the system stays lightweight and debuggable. In parallel, evolve the **car customization UI** from static rendering to interactive editing.

---

## Part I — Terrain & Road Marking Improvements

### **Stage 1 — Core Visual Differentiation (MVP)**

Focus: clarity + testability

* **Roads:**

  * Add **center dashed lines** and **edge shoulders** via a simple deterministic grid pattern.
  * Store marking parameters (width, dash length, spacing) in `constants.js`.
  * Create a toggle key (`M`) for enabling/disabling markings for debugging.
* **Grass:**

  * Use small **randomized discolored rectangles** for patch variation.
  * Deterministic pseudo-random noise based on tile coordinates ensures reproducible visuals.
* **Mud:**

  * Replace grid-based tiles with **radius-based circles** of darker brown tones.
  * Overlap circles with soft edges (alpha ≈ 0.3) to form irregular mud patches.
* **Testing:**

  * Add “Terrain Debug Mode” that overlays tile indices, road/mud boundaries, and active speed multiplier.
  * Ensure identical output given the same random seed.

### **Stage 2 — Texture & Transition Refinement**

Focus: realism + blending

* Add **gradient transitions** between terrain types (grass ↔ mud ↔ road).
* Introduce **texture layers** (tiny perlin-like noise or semi-transparent patterns).
* Optional **“paint mode” UI** in debug panel: click to re-seed grass/mud at cursor for quick iteration.
* Visual validation: screenshots compared under fixed seeds and scroll offsets.

### **Stage 3 — Decorative & Dynamic Enhancements**

Focus: depth + polish

* Add **scenery overlays** (gravel edges, puddles, dust trails).
* Dynamic decals (tire marks persisting briefly).
* Configurable environment themes (e.g., desert / forest palette presets).

---

## Part II — Car Customization UI

### **Stage 1 — Basic Renderer**

* Create `editor.html` with a canvas preview.
* Load car JSON and render with `GraphicsManager.drawCar()`.
* Show part list; clicking highlights a part’s bounding box.
* **Goal:** Verify geometry and positioning visually before gameplay.

### **Stage 2 — Interactive Controls**

* Add sliders for each part’s:

  * `x`, `y`, `width`, `height`
  * `color` (with color picker)
* Live update canvas on change.
* “Export JSON” button regenerates the car config.

### **Stage 3 — Visual Flair Options**

* Add **decal layers** (flames, stripes, logos).
* Accessory toggles: horns, exhaust types, wheel styles.
* Allow saving multiple presets.

---

## Development Approach

| Stage | Validation                    | Debug Tools                          |
| ----- | ----------------------------- | ------------------------------------ |
| 1     | Visual parity across sessions | Marking toggle, terrain grid overlay |
| 2     | Smooth transitions            | Paint mode, screenshot diff          |
| 3     | Aesthetic playtesting         | Asset toggle panel                   |

All stages maintain deterministic rendering under fixed seeds and constant frame rates for easy iteration.
