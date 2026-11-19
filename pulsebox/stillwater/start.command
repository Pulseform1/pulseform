#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
node_bin="$(command -v node 2>/dev/null)"
if [[ -z "$node_bin" ]]; then
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node /Users/hudsonjudebraddock/.local/opt/node/bin/node; do
    if [[ -x "$candidate" ]]; then node_bin="$candidate"; break; fi
  done
fi
if [[ -z "$node_bin" ]]; then
  print 'Install Node.js 22 or newer, then open this launcher again.'
  read '?Press Return to close.'
  exit 1
fi
if [[ ! -d node_modules/three || ! -d node_modules/ws ]]; then
  npm_cli="$(dirname -- "$node_bin")/../lib/node_modules/npm/bin/npm-cli.js"
  if [[ -f "$npm_cli" ]]; then
    "$node_bin" "$npm_cli" ci --no-audit --no-fund || exit 1
  else
    print 'Run npm ci in this folder to install the two dependencies, then reopen this launcher.'
    read '?Press Return to close.'
    exit 1
  fi
fi
print 'Open http://127.0.0.1:4173 in your browser. Keep this window open.'
"$node_bin" server.mjs
