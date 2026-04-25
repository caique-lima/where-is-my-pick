# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local development

No build step. Serve from the repo root with any static file server — browsers block ES module imports over `file://`:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Push to `main`. The GitHub Actions workflow (`.github/workflows/deploy.yml`) deploys automatically via the GitHub Pages artifact pipeline. No build step needed — the repo root is the artifact.

## Architecture

This is a zero-dependency, browser-only static app. All logic runs client-side; there is no backend or bundler.

**Three.js** is loaded from a CDN import map defined in `index.html`:
```html
<script type="importmap">{ "imports": { "three": "...", "three/addons/": "..." } }</script>
```
This lets `js/*.js` use bare `import ... from 'three'` without a bundler.

### Data flow

```
UI controls (index.html)
  → main.js reads values
  → pickGeometry.js: createPickShape() → THREE.Shape (2D bezier outline)
                     createPickGeometry() → THREE.ExtrudeGeometry (3D mesh)
  → Three.js renders the mesh in a WebGL canvas
  → STLExporter serialises the mesh to binary STL on download
```

### `js/pickGeometry.js`

Contains all pick shape math. Each shape (`standard`, `jazz`, `triangle`, `teardrop`) is a private function that builds a `THREE.Shape` using bezier and arc paths in millimetre units. `createPickGeometry` wraps the shape in `ExtrudeGeometry` with a proportional bevel. Coordinates are in mm — the exported STL is directly sliceable without unit conversion.

### `js/main.js`

Owns the Three.js scene (renderer, camera, lights, `OrbitControls`), wires all UI events, and triggers `rebuildPick()` on any control change. The single `MeshStandardMaterial` is mutated in place for color changes to avoid disposing/recreating it.

## Adding a new pick shape

1. Add a private shape function in `pickGeometry.js` following the `shape*(hw, hh, ts)` signature (`hw`/`hh` = half-width/height in mm, `ts` = tip sharpness 0–1).
2. Add its `case` to the `switch` in `createPickShape`.
3. Add a `<button data-shape="yourname">` inside `#shape-selector` in `index.html` — the UI wiring in `main.js` is automatic.
