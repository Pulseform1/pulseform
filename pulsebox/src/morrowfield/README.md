# Morrowfield 1.4

Build a miniature world, then explore its neighboring landscapes through a 3D globe. Morrowfield includes 675 original procedural miniatures, terrain sculpting, oceans and ponds, wildlife, people, free-form fences, and a saved-project library. All creative tools and catalog items are unlocked.

New regions have four times the area of the previous 512 m regions. Faster flight, broad zoom, and minimap jumps help explore the larger space. Terrain editing retains its 1 m simulation grid; regions above 512 m render terrain every 2 m to keep geometry bounded.

The globe navigates **eight separate, finite building regions, each up to 1,024 × 1,024 m**. It is not a continuous editable Earth or an infinite world. See `TESTING.md` for the checks performed and the remaining rendered-browser verification.

## Play and host

There are two delivery modes:

| Edition | Hosting | Project storage |
|---|---|---|
| Static production ZIP | Any static website or local HTTP server | Device library, normally IndexedDB; JSON export/import |
| Hosted Sites edition | Worker with bundled assets, Sites identity, and an R2 `BUCKET` binding | Account-scoped cloud library plus a browser cache |

The current hosted Site is **private**. The cloud API supports account-scoped projects; that does not make the site public or grant another person access. The static ZIP remains independently hostable and has no account backend.

For your gaming website, extract the static production ZIP and upload its contents to a folder such as `/games/morrowfield/`. Open `/games/morrowfield/index.html`. Preserve the relative paths of all JavaScript, CSS, and `vendor/` files. When using the source checkout instead, upload the browser files under `dist/`, excluding its generated `server/` directory. Serve `.js` files with a JavaScript MIME type.

No package installation or compilation is needed to run the static game. Three.js is bundled locally; assets do not load from a CDN. Local development can use:

```sh
cd morrowfield
npm start
```

Open `http://127.0.0.1:4173`. Alternatively, run `python3 -m http.server 4173` inside `dist/`. Opening `index.html` through `file://` is unsupported because the game uses JavaScript modules.

To embed the static game:

```html
<iframe
  src="/games/morrowfield/index.html"
  title="Morrowfield world builder"
  style="width:100%;height:760px;border:0;border-radius:16px"
  allow="fullscreen"
></iframe>
```

A recent WebGL-capable browser is required. Give the frame enough height for the tools and library. Choose **Low** graphics quality on less powerful devices. Browser storage belongs to the website origin and browser profile; moving hosts does not move the device library.

## Start building

1. Begin in empty, flat grassland. Choose **Raise**, then hold and drag across the ground. No double-click is required. Adjust brush size and strength below the scene.
2. Choose **Build** to open buildings and fences. Each card shows a picture of the actual model before selection. Search for a cottage, place its preview, and rotate it with `R`. Placement **Options** includes object size, snapping, and site leveling.
3. Choose **Pond**, adjust radius and depth, and click once to carve and fill a bowl. For a custom basin, use **Lower**, then **Water** at a level below the rim.
4. Choose **Planet** to orbit the globe and enter another region. Each region retains its own terrain and placed objects within the project.
5. Watch the save status. Edited projects autosave after a short idle period; **Save world** requests an immediate save. Open **My projects** to reopen, copy, create, or delete projects. Export JSON for a portable backup.

The eight globe destinations are Meadowlands, Sahara, Emerald rainforest, Azure ocean, Alpine highlands, Golden savanna, Island sea, and Sunlit sands. Rainforest starts with trees, and Island sea starts with two raised islands. New regions are created on first visit. The ordinary meadow start stays empty.

World setup also offers seven terrain presets: grassland, desert, pond meadow, highlands, jungle floor, coastal sands, and ocean. Choosing a new preset creates a fresh project; it does not erase the other projects in the library. Imported older regions may be 128, 192, 256, 384, 512, or 768 m wide. The expand button beside the minimap grows an existing region to 1,024 m while preserving its center, terrain, water, and objects; one Undo restores the prior extent.

## Controls

| Action | Mouse / keyboard | Touchscreen |
|---|---|---|
| Orbit a region | **Explore**, then drag; right-drag also orbits while building | **Explore**, then one-finger drag |
| Pan a region | Shift-drag or middle-button drag | Two-finger drag |
| Zoom | Wheel or + / − | Pinch in a region; + / − also work in planet view |
| Sculpt or paint | Select a terrain tool, then hold and drag | Select a tool, then hold and drag |
| Place | Pick an item, then click its preview location | Pick an item, then tap a location |
| Draw road/path rows | Pick a straight segment, enable **Draw line**, then drag and release | Enable **Draw line**, then hold and drag |
| Draw fences | Choose **Draw freely**, **Straight line**, or **Click corners** | Use the same modes with drag or taps |
| Finish a corner fence | **Finish** leaves it open; **Close loop** joins the ends | Tap **Finish** or **Close loop** |
| Rotate | `R` right; `Q` left while placing; `R` rotates the selection | Placement rotation buttons or selected-object Rotate |
| Object size | Placement **Options → Object size** | Same control |
| Select / arrange | Select tool; Move, Duplicate, Rotate, Focus, or Delete | Select tool and the same controls |
| Remove selected object | `Delete` or the trash button | Trash button |
| Free flight | **Fly**; `WASD` move, `Q/E` descend/climb, Shift boosts speed | Fly and the on-screen movement controls |
| Planet navigation | **Planet**, drag to orbit, click a marker or region card | **Planet**, drag and tap a region card or marker |
| Undo / redo | `Ctrl/⌘ Z` / `Ctrl/⌘ Shift Z`, or top-bar arrows | Top-bar arrows |
| Save | **Save world** or `Ctrl/⌘ S` | **Save world** |
| Terrain shortcuts | `1` Raise, `2` Lower, `3` Smooth, `4` Flatten, `5` Paint, `6` Water | Tool dock |
| Explore / select / build | `C` / `V` / `B` | Tool dock |
| Search | `/` opens and focuses the library | Tap Search |
| Cancel / explore | `Esc` or `Space` | Select Explore |
| Jump within a region | Click the minimap | Tap the minimap |

Editing tools and camera mode are separate. Rotation uses 45° steps. Straight roads use snapping matched to their scaled 6 m segment length; turn snapping off for angled rows. Junctions, plazas, and parking courts are placed individually. One undo removes a completed row or fence gesture. History keeps up to 32 edits within a shared 64 MiB terrain budget; large 1,024 m regions retain about 12 terrain snapshots.

Fences follow freehand traces or clicked corners and fit their last span rather than overshooting it. Fence records store their length in local meters before uniform scale. The prebuilt enclosure supplies habitat feedback; custom fences supply collision barriers. Gates remain closed decorative barriers, without an opening animation.

The world menu includes naming, daylight, a building grid (2 m on smaller regions, 4 m on large regions), animation pause, graphics quality, and import/export. Pause freezes the living animation clock while editing and camera controls remain available.

## Terrain, ocean, and residents

Raise, lower, smooth, flatten, or paint grass, soil, sand, stone, snow, and jungle ground. Flattening follows the height at the start of the stroke. Local biome painting changes the ground surface inside the brush without replacing the region or its objects.

Pond water fills a connected, enclosed basin and is clipped to its shoreline. A fill that escapes the region boundary is rejected. Breaking a basin open drains it. Ocean regions instead have a sea level of 0 m above a −4 m seabed; raising terrain above the surface creates land. Sea water is separate from the region's bounded pond records. These are level water surfaces with animated rendering, not fluid dynamics.

In an ocean region, **Floating foundation** permits buildings and roads on simple platforms. Turn it off to require dry-ground placement. People and land residents can stand and wander on connected decks; they avoid stepping into open water. Floating platforms do not provide a full pedestrian navigation network.

Choose the **Animals** paw button beside Build to open land animals, birds, and fish together. The prominent **Buildings** and **Animals** buttons at the top of the library switch between their sections. Animal and building cards show pre-rendered pictures immediately, without a second graphics context. On shorter screens, the library scrolls as one panel so its controls cannot trap a picture in a small clipped area.

The latest collection adds **540 models: 60 in each of nine main sections**. Choose **New additions** to browse the entire new collection, or check **New only** while browsing a category. **New buildings** shows the latest 60 buildings; Homes, Shops, Towers, Civic, Industry, and Landmarks also include the previous collections. The category row and New only control fit in the existing library header, preserving the full-picture scrolling layout.

| Section | Total items | New in 1.4 |
|---|---:|---:|
| Buildings | 141 | 60 |
| Plants | 72 | 60 |
| Land animals | 72 | 60 |
| Birds | 61 | 60 |
| Aquatic | 61 | 60 |
| People | 63 | 60 |
| Roads | 67 | 60 |
| Zoo and fences | 67 | 60 |
| Decorations | 71 | 60 |

The Animals button combines all 194 land animals, birds, and aquatic animals. Use Land animals, Birds, or Aquatic to narrow that collection. Buildings also includes fences and habitat structures. All 675 items have pictures of their actual geometry; compact indexed PNGs retain 432 × 316 resolution and load lazily as you scroll. The library starts with 60 cards; use **Show 60 more** or search for a name to reach the rest without rebuilding hundreds of cards on each click.

The 60 new roads cover ten surface styles, each with a straight segment, corner, T junction, crossroads, walkway, and square. The 30 new fence/gate styles support freehand, straight, and corner drawing with fitted spans. New houses, civic buildings, and towers support rotation, scaling, floating foundations, and saved projects. New people have articulated limbs and role-specific accessories. Wildlife uses varied modeled body shapes, appendages, and markings. Larger aquatic animals require sufficient depth, reported when placing them.


Animals wander and rest, avoid obstacles and unsuitable terrain, and can be attracted to feeders or troughs. The walker, jogger, and gardener use simple wandering with occasional path attraction. Birds circle and flap; fish stay in water. Trees, grass, and windmill sails animate. Vehicles are parked props. This is lightweight local behavior, without destination routing, traffic, breeding, predation, or a complete ecosystem.

## Projects, autosave, and recovery

**My projects** contains the project library. A project holds up to eight region snapshots and its active region. Saving includes terrain, surface paint, objects and fence lengths, basin water, sea level, name, biome/preset, daylight, grid, pause, and quality settings. Movement is transient: resident placement anchors are saved, and wandering starts again after restoration or scene rebuilding.

Edits schedule autosave after approximately 2.5 seconds without further edits. **Save world** saves immediately. Wait for a saved status before closing the tab. Startup reopens the latest available project. New projects are independent library entries; use **Save as new** for a copy. The library supports up to 30 projects, each up to 128 MB.

In the static edition, storage is device-only. IndexedDB is used when available, with a smaller-capacity localStorage fallback. Clearing site data, private browsing restrictions, storage quotas, or changing browser profiles can remove or prevent device saves. A static host may return no `/api/session`; the game then stays in device mode.

In the hosted edition, the Sites gateway authenticates the user, and the Worker stores project data under a separate R2 prefix for that account. A browser cache retains local changes when cloud requests fail; the status reports pending synchronization. Conflicting cloud revisions are rejected rather than silently overwritten. Keep the local draft or export it, then reload the latest version or save a separate project. Device-mode and account-scoped libraries are separate; signing in does not automatically merge unrelated device projects. Starting fully offline may open device mode rather than expose an account cache whose identity could not be verified. Cloud sign-in and synchronization require network access.

Projects larger than 16 MiB upload regions separately, each limited to 24 MiB, then commit the complete project together. An interrupted upload keeps the last completed cloud revision intact. Unchanged region data can be reused; the next save only uploads changed regions. The logical project limit is 128 MiB, sufficient for all eight packed 1,024 m regions. Older single-object saves remain readable. Obsolete region data becomes eligible for cleanup after 24 hours and is reclaimed in bounded batches on later account requests.

An unsuccessful save is reported as unsuccessful; a successful cloud save can still report that an offline browser copy was unavailable. Do not treat **sync pending** as a completed cloud backup. The static ZIP cannot supply account sign-in or R2 storage by itself.

**Export world file** exports the whole current project once the project system is ready. **Import a world** accepts both project exports and older single-region world files. Project terrain uses the lossless `f32-u8-base64` encoding: little-endian Float32 heights and Uint8 material IDs. The legacy numeric-array world format is still accepted. Imports validate sizes, values, transforms, IDs, water boundaries, and settings before use. Project import is limited to 128 MB. Earlier `morrowfield.world.v1` browser saves are recoverable into the new library; keep an exported copy when migrating hosts or accounts.

## Hosted backend and source build

The hosted source includes `worker/index.js`. It serves the bundled browser files and `/api/session` plus authenticated `/api/projects` routes. It requires the Sites gateway identity boundary and an R2 binding named `BUCKET`; the tracked `.openai/hosting.json` selects that binding. The current Site identity and private audience belong to this deployment.

Generate the Worker artifact from the current browser source with:

```sh
node scripts/build-worker.mjs
```

The script writes `dist/server/index.js`, embedding the static files, including the bundled thumbnail PNGs. Regenerate model pictures after changing the catalog art with `npm run thumbnails`; the renderer uses the actual Three.js model geometry and needs no browser or extra packages. It requires no frontend compiler or npm package installation. The source checkout's local `npm start` server serves the static edition and does not emulate cloud authentication or R2.

For a custom account-enabled deployment, provide an equivalent trusted authentication gateway and R2 binding. The Worker expects identity supplied by that gateway; do not expose a deployment that trusts identity headers sent directly by arbitrary clients. The downloadable static edition is the simplest option for an existing gaming website that does not need the hosted account library.

## Limits and verification

- The globe is a region navigator. Each of its eight build areas is finite; movement between them is a region switch, with no continuous global terrain streaming.
- Each region supports up to 1,024 m per side, 3,000 placed objects, and 64 bounded pond/lake records. The ocean surface is separate. Maximum-size performance has not been established across devices.
- Terrain uses a 1 m height grid. Rendering chunks grow from 16 m to 32 m and then 64 m; regions above 512 m sample the grid every 2 m, keeping the largest map at 256 chunks. Static details are merged, repeated objects are instanced, and supported distant trees use simpler geometry. Quality settings reduce shadows, pixel density, and ambient grass.
- Animals and people share an active simulation cap of 120 in Beautiful/Balanced and 40 in Low, with distance limits. Additional residents remain placed but are not all simulated at once.
- Custom closed fences can contain residents through collision; automatic custom-habitat recognition, operable gates, complete pedestrian navigation, vehicles in motion, building interiors, multiplayer, weather, erosion, and flowing rivers are future additions.
- Rendered-game inspection, real GPU/shader compatibility, mobile screenshots, and frame-rate benchmarking remain outstanding because browser startup failed in the build environment. Automated geometry and DOM tests do not replace that verification.

## Source layout and tests

```text
dist/
  index.html, styles.css     Responsive interface
  app.js                     Scene, controls, residents, and integration
  world-state.js             Terrain, water, history, regions, packed saves
  building-tools.js          Road rows and fitted free-form fence paths
  planet-view.js             Procedural globe, markers, and surface picking
  project-ui.js              Project/region lifecycle and autosave controls
  project-store.js           Browser library and revision-aware cloud sync
  models.js, model-lod.js    Original catalog and distant tree geometry
  building-kit.js            Shared architectural primitives
  buildings-*.js             Sixty homes, city buildings, and civic places
  expansion-*.js             540 additional models in nine sections
  world-expansion.js         Shared expansion catalog and model factories
  placement-types.js         Fence and road segment definitions
  thumbnails/                Ready-made pictures of every catalog model
  vendor/                    Bundled Three.js and license
worker/index.js              Hosted asset server and account project API
scripts/build-worker.mjs     Bundles browser assets into the Worker
scripts/render-thumbnails.mjs Renders model preview PNGs without WebGL
scripts/thumbnail-png.mjs    Compact palette PNG encoding and verification
tests/                      Engine, layout, models, globe, store, API, DOM checks
server.mjs                  Optional static development server
.openai/hosting.json         Current Sites identity and R2 configuration
```

Run `npm install` and `npm test` for the complete suite; installation is needed only for the development DOM test dependency. Engine and globe tests run without installation:

```sh
node --test tests/world-state.test.mjs tests/planet.test.mjs
```

`WorldState.createPreset()`, `biomeBrush()`, `stampPond()`, and `serializePacked()` expose the world model. `createPlanetView()` supplies the globe, and `planLine()`/`planFence()` generate preview and placement layouts. `window.Morrowfield` provides an inspection surface. Direct world mutations should use a history checkpoint and rebuild the scene afterward.

See `TESTING.md` for verification details and `CREDITS.md` for licenses. Keep the bundled Three.js notice when redistributing the game.
