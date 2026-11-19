# Multiplayer service

`npm start` serves the game and its WebSocket endpoint from the same origin, by default at `http://127.0.0.1:4173`. Node 22 or newer is required. The browser does not need an API key.

For a trusted local network, start in a macOS/Linux shell with `HOST=0.0.0.0 npm start` (Windows PowerShell: `$env:HOST="0.0.0.0"; npm start`), then use the computer's actual LAN address from each device. A localhost URL cannot be opened from someone else's computer. For internet play, deploy this Node service behind a HTTPS/WSS-capable reverse proxy and serve the game from that origin. No live website is modified by these files. A static upload alone does not host multiplayer.

Rooms are temporary in-memory sessions, limited to four players (one for solo). An empty room is removed after about 30 seconds. Disconnected identity records remain for up to two minutes while other players stay connected. Server restarts discard all rooms. Invite codes are six hexadecimal characters, and reconnection tokens are private per-player values; never place a reconnection token in an invite URL.

## Protocol

Connect to `/ws` on the game's origin. Messages are JSON objects with a `type` field.

Client actions:

- `create`: matching `worldVersion` (`abyss-18`), `name`, `mode` (`solo` or `party`), `difficulty` (`chill`, `normal`, `nightmare`).
- `join`: matching `worldVersion`, `code`, `name`, optional private `token` for reconnecting the same identity.
- `ready`: `ready` boolean, during the party lobby.
- `difficulty`: host-only lobby choice.
- `begin`: host opens party voting when everyone is ready.
- `vote`: `monsterId` from the current cards.
- `start`: solo confirmation after selecting a creature. Party voting starts the run when all votes arrive or the timer expires.
- `input`: current player `lifeId`, increasing integer `seq`, normalized `forward` and `strafe`, `yaw`, `pitch`, held `jump`, held `sprint`. Send input at 30–60 Hz and false on key release. Positions and damage are never client-authoritative.
- `respawn`: current `lifeId`; returns only that dead player to the last checkpoint after the scare delay. An old-life request is ignored.
- `restart`: active runs require all connected players to vote; on the result screen the host can restart immediately.
- `pause`: `paused` boolean, supported only during solo play. Party menus never pause shared simulation.
- `leave`: leave the current room without closing the socket.
- `ping`: receive a `pong` with server time.

Server messages:

- `welcome`: `id`, private reconnection `token`, and `code`.
- `lobby`: `room` containing phase, members, readiness, host, difficulty, cards, votes, faced/offered roster, round, seed, deadline, and restart votes. Phases are `lobby`, `voting`, `playing`, and `results`.
- `start`: seed, difficulty, selected creature, players, and full simulation `state`. Also sent when joining or reconnecting to an ongoing run; a fallen or late-joining player may respawn at the recorded starting/checkpoint deck.
- `state`: an authoritative simulation snapshot, normally 20 times per second. Includes `worldVersion`, current `time`, player input acknowledgments/life/checkpoint records, `platformStates`, 100 resident `monsters`, bounded active-population metadata and deduplicated gameplay events.
- `error`: readable `message`.
- `left`: explicit room exit confirmed.

Old loaded clients must refresh before creating or joining after a world-version change; mismatched versions are rejected before membership or simulation begins.

The server runs shared simulation at 60 Hz, processes landings before monster attacks through that simulation, and stops stale movement input after 400 milliseconds. The client should predict local movement and reconcile to acknowledged server snapshots. Prediction must clone `platformStates` and advance the shared world time once for every replayed/current controller tick. Platform definitions are immutable; rotation and sink phases derive from shared timestamps. Clear pending inputs on a new `lifeId`. Opening a menu must send released movement inputs. A solo menu can also send the explicit pause action; it never stops the party.

All-dead parties remain in the playing phase so each connected explorer can respawn independently. Checkpoints belong to each player; returning to one does not reset sinking tiles under surviving friends. The resident population has 100 stable UID records in ten selected rooms (including connected players’ current/checkpoint rooms); distant residents sleep and only nearby hunters receive full navigation updates. The featured lobby choice remains `monsterId`; per-player presentation uses the relevant resident, and death events include the actual killer archetype and UID.

## Rotation and voting

Twenty-one archetypes are shuffled into a bag. Each retry draws exactly three distinct cards, preserving leftovers at bag boundaries and filling from the next bag without a duplicate in the hand. The first seven hands offer all twenty-one; only the creature actually selected is added to `faced`. New bags prioritize unencountered creatures. A tied vote favors the host's vote when that vote is tied, otherwise the server chooses among the tied leaders.

## Boundaries

The service validates input, caps WebSocket payloads, validates browser origins, limits connections and message/room/join rates, and disconnects persistently slow clients. Existing website bot protections should remain in place. Production abuse protection, TLS, process supervision, resource limits, and any persistent account system belong to deployment infrastructure. Do not bypass site protections to connect this service.

`npm test` includes real multi-client WebSocket tests as well as simulation tests. Local networking tests do not establish internet latency or production capacity.

## Local capture diagnostics

`POST /capture-diagnostics` accepts only the bounded capture schema from a same-origin loopback page with `X-Stillwater-Capture: 1`. A local tool can read it with `GET` and that header; remote hosts and cross-origin writes are rejected. The64-record buffer expires after15 minutes and is memory-only. It stores API/activation/focus/frame/result/error/capture booleans and timestamps, never gameplay inputs or personal identifiers. This endpoint is disabled by its loopback boundary for remote visitors and is not needed for gameplay.
