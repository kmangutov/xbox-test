Toddler Racing — Product Plan (HTML Game)
Platform & Inputs

Platform: HTML5 game, runs on desktop and mobile (GitHub Pages).

Inputs Supported:

Keyboard (arrow keys)

Gamepad (Xbox / generic controller)

Touch overlay (mobile joystick + pedals UI)

Stage 0 — Prototype Feel

Goal: Build the basic motion and feedback loop so the toddler can steer and see motion.

Focus

Car is stationary at screen center.

Background terrain moves in opposite direction to simulate driving.

No collision or map borders yet.

Graphics

Very simple geometric shapes (drawn directly in JS).

Car = rectangle with color.

Ground = alternating green (grass) and gray (road).

Obstacles = circles (trees) and squares (rocks).

Outcome

Visual motion works.

Steering and acceleration feel responsive.

Toddler can recognize when the car is “moving” and “turning.”

Stage 1 — World Structure

Goal: Add terrain variation, map layout, and persistent movement.

Focus

Basic physics tuning (speed, turning, slowdown on grass).

Infinite or looping world using tiled terrain segments.

Terrain types affect car motion slightly (road vs grass vs mud).

Graphics

Introduce structured assets via JSON descriptors.

Define car color and shape presets.

Define tile types (road, grass, mud).

Continue using flat color blocks for simplicity.

Terrain & Objects

Add trees and rocks as static decorations.

Car can drive “through” them — visual only.

Outcome

Feels like a world rather than a blank screen.

Toddler starts to recognize “where to drive.”

Stage 2 — Character & World Personality

Goal: Add recognizable visuals and sound — make it fun and alive.

Focus

Add SVG or illustrated graphics for:

Cars (truck, sports car, bus, etc.)

Trees, rocks, road tiles.

Gentle engine sounds, horn, and ambient background music.

Menu to choose car and color.

Optional AI car moving nearby for a “race” feeling.

Graphics Pipeline

Graphics imported from SVG or JSON-based asset packs.

Consistent bright and friendly color palette.

Outcome

Game becomes visually engaging.

Different terrains and cars are easy to distinguish.

Play sessions feel rewarding (sound, color, motion).