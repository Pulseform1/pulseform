#!/bin/zsh
# Run start.command first and keep its Terminal window open.
game_url='http://127.0.0.1:4173/?v=18&look=capture'
if [[ -d '/Applications/Google Chrome.app' ]]; then
  /usr/bin/open -a '/Applications/Google Chrome.app' "$game_url"
else
  /usr/bin/open -a Safari "$game_url"
fi
