// Pulseform party server: introduces two players so their devices can connect.
// No game data passes through it once the players are connected.
const { PeerServer } = require('peer');

const port = Number(process.env.PORT) || 9000;
PeerServer({
  port,
  host: process.env.HOST || '0.0.0.0', // IPv4; some hosts have no IPv6
  path: '/',
  proxied: true,          // most hosts (Render, Railway, Fly) sit behind a proxy
  allow_discovery: false, // don't let anyone list who is online
});
console.log(`Pulseform party server listening on port ${port}`);
