# Pulseform party server

Online parties need a small server that introduces the two players. By default the game uses the free
public PeerJS server (`0.peerjs.com`). Running your own means the game no longer depends on that domain.
That helps on networks that block it, as long as your server's address is allowed.

GitHub Pages only serves files, so this server has to run on a host that runs Node.js
(Render, Railway, Fly.io, or any VPS). The free tiers are enough.

## Deploy (Render example)

1. On render.com, create a **Web Service** from this repository.
2. Set **Root directory** to `party-server`, **Build command** to `npm install`, **Start command** to `npm start`.
3. When it's live, copy its address, for example `pulseform-party.onrender.com`.

## Point the game at it

At the top of `index.html`, set:

```js
window.PULSEFORM_PEER = { host: "pulseform-party.onrender.com", port: 443, path: "/", secure: true };
```

Both players must be on a copy of the game with the same setting.

## Test it without changing the file

Add this to the game's address:
`?peerhost=pulseform-party.onrender.com&peerport=443&peersecure=1`

## On school networks

A school filter (such as Linewize) still has to allow your server's address, and it has to allow
peer-to-peer (WebRTC) connections, or relay servers on port 443 (`iceServers` in the setting above).
The simplest fix is to ask the school's IT team to allow the game's address and this server.
