# Optional GLB furniture assets

The scene ships with enhanced procedural furniture by default. To swap in GLB models later, place Draco-compressed assets here and wire them through `src/scene/furniture/model-loader.ts`.

Suggested filenames:

- `desk.glb`
- `chair.glb`
- `monitor.glb`
- `conference-table.glb`
- `lounge-sofa.glb`
- `lab-bench.glb`

Keep the total bundle under ~500KB for fast plugin loads.
