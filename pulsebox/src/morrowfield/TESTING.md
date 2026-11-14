# Verification report

Date: November 10, 2026. Version: Morrowfield 1.4.

## Automated checks

The version 1.4 combined run passed **123 tests with 0 failures**: 26 world-state, 3 globe, 6 building-layout, 5 model, 3 building-expansion, 5 world-expansion, 14 project-store, 8 project-lifecycle UI, 15 Worker/API, 36 runtime integration checks, and 2 thumbnail-image checks. The final run used two test-file workers and completed in approximately 43 seconds.

The suite is organized around these behaviors:

- Terrain sculpting, falloff, height limits, interpolation, flattening, and material painting.
- Flat empty starts; all seven presets; local jungle/sand/snow painting; deterministic starting data.
- Contained ponds, rejection of escaping fills, atomic pond stamping, shoreline geometry, and basin drainage.
- Ocean sea levels, raised dry land, sea-aware resident safety, and expansion without a basin record for the ocean.
- Expansion through 128, 192, 256, 384, 512, 768, and 1024 m while preserving coordinates, objects, paint, water, and history.
- Undo/redo transactions; optional legacy settings; invalid imports; lossless Float32/Uint8 packed saves and legacy numeric-array compatibility.
- Eight region definitions, real globe relief, front-facing marker picking, nearest-region surface picking, transformed parents, cloud animation, and disposal.
- Connected road rows; fitted fence lengths; freehand/corner geometry, rotation, scale, and layout limits.
- All 675 catalog models producing finite, nonempty geometry; articulated limbs, shared geometry, and matching road-junction seams.
- Browser-library persistence, quota failures, account-scoped caching, pending changes, conflicts, retries, and deletion behavior.
- Worker authentication requirements, account isolation, revision checks, same-origin writes, malformed data rejection, project limits, static asset responses, and byte-preserving asset bundling.
- DOM integration for controls, searching, camera/sculpt isolation, touch event sequences, placement, arrangement, water, resident containment, save/import/export, projects, and region navigation.

The DOM harness uses real Three.js geometry, matrices, projection, and raycasting with LinkeDOM and mocked WebGLRenderer/PMREM/canvas output. It does not render pixels or compile shaders. The cloud/API tests use controlled request identities and storage doubles; they do not replace a live signed-in deployment check. The final release result should distinguish mocked API checks from any hosted account round trip actually performed.

The 1.4 expansion adds exactly 540 models, sixty in each of nine sections, while retaining all 135 previous catalog entries. Checks cover distinct world-space geometry, placement bounds, shared static resources, live animation pivots and body/limb scale, all 540 types surviving packed saves and cloud validation, fitted new fence lengths, complete 675-item browsing through progressive loading, category filters, and placement of new homes and wildlife. The complete-picture scrolling layout remains in place.

Storage checks cover a roughly 53.4 MiB project containing all eight packed 1,024 m regions. It uploads in eight bounded pieces, commits atomically, streams back into the existing project format, and preserves every region. Checks also cover unchanged-region reuse, failed uploads and retry, revision conflicts, account isolation, strict manifest validation, region-body cancellation, transfer timeouts, and obsolete data cleanup after replacement/deletion with a 24-hour reader grace period. These are controlled API/storage tests; production Worker memory and slow-network browser behavior were not measured.

## Preview-image verification

All 675 bundled PNG previews are generated from actual model geometry at 432 × 316, using a per-image indexed palette. Checks verify checksums, dimensions, matching IDs, distinct decoded images, visible shaded content, total download size below 8 MiB, and deterministic cottage regeneration. The pre-expansion 135 pictures were converted to compact palettes without changing their framing. Initial catalog cards contain pictures before the first animation frame; progressive browsing and the Animals controls reach the full collection.

Visual sample review covered new houses, towers, botanical dome, people with umbrella/guitar/bread accessories, mangrove, water lily, armillary, woven fence, stone arch gate, aviary, red panda, moose, rhinoceros, barn owl, toucan, peacock, manta, octopus, seahorse, mosaic paving, boardwalk, and tram junctions. Review corrected an umbrella/head intersection, dome interior visibility, rhino horns, moose tail, peacock markings, flower contrast, and road pattern/track continuity. Only affected pictures were regenerated. This inspection concerns the CPU-rendered model previews, not a live WebGL scene.

Large-region checks cover 1,024 m defaults, legacy expansion preserving every prior grid cell, objects and water, packed round trips, bounded undo memory, local smoothing, 256 rendered terrain chunks and 524,288 terrain triangles, distant sculpt refresh, matching sidewall heights, broad camera limits, and expansion undo. The terrain simulation still uses 1 m cells; large terrain meshes sample every 2 m. Minimap work is bounded by its 160 × 120 pixels.


## Verification limits

Actual rendered-game inspection, GPU/shader compatibility, frame-rate measurements, real-browser pointer/touch behavior, and mobile screenshots remain incomplete. The built-in browser runtime and standalone browser processes failed at startup in the build environment. No rendered-game visual-QA or device-performance pass is claimed for version 1.4; the thumbnail review above uses the CPU preview renderer.

The region cap of 1,024 × 1,024 m, 3,000 objects per region, eight regions per project, and 30 projects per library are implementation limits. They are not performance guarantees. IndexedDB availability and storage quotas vary by browser. Static hosting supplies device storage; account synchronization requires the hosted Worker, trusted identity gateway, and R2 binding.

The globe is a navigator between finite regions. Tests do not establish continuous whole-planet terrain, complete pedestrian pathfinding, traffic, fluid dynamics, or an ecosystem simulation, because those systems are not implemented.

## Reproduce

```sh
npm install
npm test
npm start
```

The final full-suite command was `node --test --test-concurrency=2 tests/*.test.mjs`.

For the focused engine/globe suite without dependency installation:

```sh
node --test tests/world-state.test.mjs tests/planet.test.mjs
```

For the hosted build artifact:

```sh
node scripts/build-worker.mjs
```

The generated Worker is `dist/server/index.js`. `npm start` serves the static edition at `http://127.0.0.1:4173`; it does not emulate authenticated cloud storage.

Final real-device checks should inspect: the default grassland; all globe destinations; ocean shorelines and floating foundations; large-region navigation and flight; held terrain strokes; biome brushes; pond stamps; fitted freehand and corner fences; scaled object movement/duplication; habitat containment; all catalog thumbnails; project autosave, restart, and region preservation; account conflict/retry behavior; whole-project export/import; and touch gestures on a phone or tablet. Inspect shadows, tall buildings, clouds, transparent water, and UI panels at actual rendering resolution.
