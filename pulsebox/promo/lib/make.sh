#!/usr/bin/env bash
# Build one promo video:  bash lib/make.sh VIDEO_DIR [voice|sheet|video]
# Needs: a Python venv with kokoro-onnx, faster-whisper, soundfile, scipy (VENV, default ~/.cache/kvenv);
# the Kokoro model in KOKORO_DIR (default ~/.cache/kokoro, downloaded on first run); node + playwright; ffmpeg.
set -euo pipefail
LIB="$(cd "$(dirname "$0")" && pwd)"; D="$(cd "$1" && pwd)"; STEP="${2:-video}"
export KOKORO_DIR="${KOKORO_DIR:-$HOME/.cache/kokoro}"; VENV="${VENV:-$HOME/.cache/kvenv}"
if [ ! -f "$KOKORO_DIR/voices-v1.0.bin" ]; then mkdir -p "$KOKORO_DIR"; for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  curl -sL -o "$KOKORO_DIR/$f" "https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/$f"; done; fi
if [ ! -x "$VENV/bin/python" ]; then python3 -m venv "$VENV"; "$VENV/bin/pip" install -q kokoro-onnx faster-whisper soundfile scipy; fi
"$VENV/bin/python" "$LIB/voice.py" "$D"
[ "$STEP" = voice ] && exit 0
if [ "$STEP" = sheet ]; then shift 2; node "$LIB/render.js" "$D" sheet "$@"; exit 0; fi
FR="${FRAMES_DIR:-$D/.frames}"; rm -rf "$FR"; mkdir -p "$FR"
N=$(python3 -c "import json;t=json.load(open('$D/timeline.json'));print(round(t['end']*t['fps']))"); H=$((N/2))
node "$LIB/render.js" "$D" frames "$FR" 0 $H & node "$LIB/render.js" "$D" frames "$FR" $H $N & wait
"$VENV/bin/python" "$LIB/mix.py" "$D"
mkdir -p "$D/out"; NAME="$(basename "$D")"
ffmpeg -v error -y -framerate 30 -i "$FR/f%05d.jpg" -i "$D/mix.wav" -af "loudnorm=I=-14:TP=-1.5:LRA=11" -ar 48000 \
  -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 192k -shortest "$D/out/pulsebox-$NAME.mp4"
rm -rf "$FR"; echo "done: $D/out/pulsebox-$NAME.mp4"
