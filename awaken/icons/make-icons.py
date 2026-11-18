# Writes the icon SVG sources (run from awaken/: python3 icons/make-icons.py), then render them to PNG: icon.svg (rounded, for "any") and icon-maskable.svg (full bleed, art inside the safe zone)
def art(scale):
    # the System window and its corner brackets, centered on 256,256; strokes are thick enough to read at 48 px
    return f'''<g transform="translate(256 256) scale({scale}) translate(-256 -256)">
    <g filter="url(#glow)" fill="none" stroke="#9be3ff" stroke-linecap="round">
      <rect x="150" y="150" width="212" height="212" rx="16" stroke-width="22"/>
      <path d="M256 200v82" stroke-width="36"/>
      <path d="M256 324v2" stroke-width="38"/>
    </g>
    <g stroke="#45b0ff" stroke-width="14" fill="none" stroke-linecap="square">
      <path d="M104 152v-48h48"/>
      <path d="M408 360v48h-48"/>
    </g>
  </g>'''
def svg(rx, scale):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0" stop-color="#0d2a52"/>
      <stop offset=".55" stop-color="#06142a"/>
      <stop offset="1" stop-color="#03060d"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="512" height="512"{f' rx="{rx}"' if rx else ''} fill="url(#bg)"/>
  {art(scale)}
</svg>
'''
open('icons/icon.svg','w').write(svg(112, 1))
# Android crops maskable icons to the middle 80% circle; the brackets' outer corners must stay inside it
open('icons/icon-maskable.svg','w').write(svg(0, .78))
open('icons/icon-apple.svg','w').write(svg(0, .9))
