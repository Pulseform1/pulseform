// Pulsebox fit (see fit.css): sizes the game area to the frame, turns the side panel into a drawer on small screens
// and moves the buttons a touch player needs (listed in DOCK) onto the game.
(() => {
  document.body.dataset.game = GAME_ID;
  if (window.parent !== window) document.body.classList.add('embedded');
  const vp = document.querySelector('.viewport'), stage = vp.parentElement, side = document.querySelector('.sidebar'), acts = document.querySelector('.actions');
  const menu = document.createElement('button'); menu.id = 'pbMenu'; menu.textContent = '☰ Menu'; menu.setAttribute('aria-label', 'Open the game panel'); acts.appendChild(menu);
  menu.onclick = () => document.body.classList.toggle('menu');
  document.addEventListener('pointerdown', e => { if (document.body.classList.contains('menu') && !side.contains(e.target) && e.target !== menu) document.body.classList.remove('menu'); }, true);
  const dock = document.createElement('div'); dock.className = 'pb-dock'; vp.appendChild(dock);
  const items = DOCK.map(id => document.getElementById(id)).filter(Boolean).map(el => ({ el, mark: el.parentNode.insertBefore(document.createComment('dock'), el) }));
  let docked = false;
  function fit() {
    const compact = innerWidth < 980 || innerHeight < 540; document.body.classList.toggle('compact', compact); if (!compact) document.body.classList.remove('menu');
    if (compact !== docked) { docked = compact; for (const it of items) { if (compact) dock.appendChild(it.el); else it.mark.parentNode.insertBefore(it.el, it.mark.nextSibling); } }
    if (document.fullscreenElement === vp) { vp.style.width = vp.style.height = ''; return; }
    vp.style.width = vp.style.height = '0px';   // let the stage take its own size first
    const r = stage.getBoundingClientRect(), k = Math.max(.05, Math.min(r.width / 1000, r.height / 650));
    vp.style.width = Math.floor(1000 * k) + 'px'; vp.style.height = Math.floor(650 * k) + 'px';
    document.body.classList.toggle('tiny', 1000 * k < 600);
  }
  addEventListener('resize', fit); document.addEventListener('fullscreenchange', fit); addEventListener('orientationchange', () => setTimeout(fit, 250));
  fit(); setTimeout(fit, 60);
})();
