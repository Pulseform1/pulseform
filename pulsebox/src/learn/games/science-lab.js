/* Science Lab: a lab bench that alternates quick quiz questions with small hands-on experiments: heat water and see its
   state, predict float or sink, test conductors, find the circuit that works, mix coloured light, pick up things with a
   magnet, build a food chain. Three lives; every station cleared moves you along the bench. */
(() => {
  const { h, pick, shuffle, sample } = Edu;
  const LV = [
    { name: 'Easy', desc: 'Water, floating, conductors, light and food chains. 8 stations, 15 s questions.', n: 4, qt: 15, exps: ['water', 'float', 'conduct', 'light', 'chain'] },
    { name: 'Medium', desc: 'Adds magnets and building colours of light. 10 stations, 12 s questions.', n: 5, qt: 12, exps: ['water', 'float', 'magnet', 'light', 'chain', 'conduct'] },
    { name: 'Hard', desc: 'Fahrenheit, which circuit works, harder questions. 10 stations, 10 s questions.', n: 5, qt: 10, exps: ['water', 'circuit', 'magnet', 'light', 'chain', 'float'] }];
  // [level, question, right answer, wrong answers...]
  const Q = [
    [0, 'Which part of a plant takes in water from the soil?', 'Roots', 'Petals', 'Flowers', 'Seeds'],
    [0, 'Plants make their own food using energy from…', 'The Sun', 'The soil', 'The Moon', 'Rocks'],
    [0, 'Which organ pumps blood around your body?', 'The heart', 'The lungs', 'The stomach', 'The brain'],
    [0, 'Which organs do you breathe with?', 'The lungs', 'The kidneys', 'The heart', 'The liver'],
    [0, 'A push or a pull is called a…', 'Force', 'Liquid', 'Sound', 'Gas'],
    [0, 'What pulls things down toward the ground?', 'Gravity', 'Magnetism', 'Friction', 'Wind'],
    [0, 'Which of these is a liquid at room temperature?', 'Milk', 'Ice', 'Stone', 'Wood'],
    [0, 'Mixing red and yellow paint makes…', 'Orange', 'Green', 'Purple', 'Blue'],
    [0, 'Mixing blue and yellow paint makes…', 'Green', 'Orange', 'Red', 'Pink'],
    [0, 'Most food chains start with…', 'A green plant', 'A lion', 'A hawk', 'A shark'],
    [0, 'Which animal eats only plants?', 'Rabbit', 'Lion', 'Shark', 'Owl'],
    [0, 'How many legs does an insect have?', '6', '8', '4', '10'],
    [0, 'Which of these is NOT a living thing?', 'A rock', 'A tree', 'A mushroom', 'A worm'],
    [0, 'Which material is attracted to a magnet?', 'Iron', 'Plastic', 'Wood', 'Glass'],
    [0, 'What do we call water when it freezes solid?', 'Ice', 'Steam', 'Mist', 'Rain'],
    [1, 'Which gas do plants take in from the air to make food?', 'Carbon dioxide', 'Oxygen', 'Helium', 'Hydrogen'],
    [1, 'Which gas do plants give out in sunlight?', 'Oxygen', 'Carbon dioxide', 'Helium', 'Neon'],
    [1, 'Plants making food from sunlight is called…', 'Photosynthesis', 'Evaporation', 'Digestion', 'Condensation'],
    [1, 'Water vapor cooling into liquid water is called…', 'Condensation', 'Evaporation', 'Melting', 'Freezing'],
    [1, 'A puddle drying up in the sun is an example of…', 'Evaporation', 'Condensation', 'Freezing', 'Melting'],
    [1, 'Which force slows down a box sliding across the floor?', 'Friction', 'Gravity', 'Magnetism', 'Upthrust'],
    [1, 'Which blood vessels carry blood away from the heart?', 'Arteries', 'Veins', 'Nerves', 'Tendons'],
    [1, 'Which part of the skeleton protects the brain?', 'The skull', 'The ribs', 'The spine', 'The pelvis'],
    [1, 'An animal that eats only other animals is a…', 'Carnivore', 'Herbivore', 'Producer', 'Decomposer'],
    [1, 'Which material is a good conductor of electricity?', 'Copper', 'Plastic', 'Rubber', 'Wood'],
    [1, 'Which of these animals is a mammal?', 'Whale', 'Shark', 'Salmon', 'Crocodile'],
    [1, 'Two magnets with north pole facing north pole will…', 'Push apart', 'Pull together', 'Get hotter', 'Lose their magnetism'],
    [1, 'Mixing red and green light gives…', 'Yellow', 'Brown', 'Purple', 'Blue'],
    [1, 'Sound travels fastest through…', 'Steel', 'Water', 'Air', 'Empty space'],
    [1, 'What does the stomach do?', 'Helps digest food', 'Pumps blood', 'Takes in oxygen', 'Controls the body'],
    [1, 'Which state of matter keeps its own shape?', 'Solid', 'Liquid', 'Gas', 'None of them'],
    [2, 'How many bones are in an adult human skeleton?', '206', '186', '226', '306'],
    [2, 'What is the largest organ of the human body?', 'The skin', 'The liver', 'The brain', 'The lungs'],
    [2, 'Which blood cells help fight infection?', 'White blood cells', 'Red blood cells', 'Platelets', 'Nerve cells'],
    [2, 'In which part of a plant cell does photosynthesis happen?', 'Chloroplasts', 'Nucleus', 'Cell wall', 'Vacuole'],
    [2, 'At sea level, water boils at…', '212 °F', '100 °F', '32 °F', '180 °F'],
    [2, 'Mixing red, green and blue light together gives…', 'White', 'Black', 'Brown', 'Gray'],
    [2, 'Mixing green and blue light gives…', 'Cyan', 'Yellow', 'Magenta', 'Brown'],
    [2, 'Mixing red and blue light gives…', 'Magenta', 'Cyan', 'Yellow', 'Green'],
    [2, 'What unit is force measured in?', 'Newtons', 'Joules', 'Watts', 'Volts'],
    [2, 'Which gas makes up most of the air?', 'Nitrogen', 'Oxygen', 'Carbon dioxide', 'Argon'],
    [2, 'Ice floats on water because ice is…', 'Less dense than water', 'Denser than water', 'Magnetic', 'A different substance'],
    [2, 'A solid turning straight into a gas (like dry ice) is called…', 'Sublimation', 'Condensation', 'Melting', 'Freezing'],
    [2, 'An organism that makes its own food is a…', 'Producer', 'Consumer', 'Decomposer', 'Predator'],
    [2, 'Fungi and bacteria that break down dead plants and animals are…', 'Decomposers', 'Producers', 'Predators', 'Herbivores'],
    [2, 'Which part of the eye controls how much light gets in?', 'The iris', 'The lens', 'The retina', 'The optic nerve'],
    [2, 'Light travels at about…', '300,000 km per second', '300 km per second', '3,000 km per second', '30 km per second'],
    [2, 'A ramp is which simple machine?', 'Inclined plane', 'Lever', 'Pulley', 'Wheel and axle'],
    [2, 'What is the main job of red blood cells?', 'Carry oxygen', 'Fight germs', 'Help blood clot', 'Carry nerve signals'],
    [2, 'Which of these is a renewable energy source?', 'Wind', 'Coal', 'Oil', 'Natural gas']];
  // objects: name, look (css), and for float tests whether it floats, for conductor/magnet tests whether it conducts / is magnetic
  const OB = {
    'Wooden block': ['#b07a42', '34px', '22px', '4px', 1, 0, 0], 'Cork': ['#d9a86c', '20px', '26px', '6px', 1, 0, 0], 'Ice cube': ['#cfefff', '26px', '26px', '5px', 1, 0, 0],
    'Apple': ['radial-gradient(circle at 35% 35%,#ff8a80,#d32f2f)', '28px', '28px', '50%', 1, 0, 0], 'Ping-pong ball': ['#fff', '22px', '22px', '50%', 1, 0, 0],
    'Iron nail': ['#8a93a6', '40px', '6px', '2px', 0, 1, 1], 'Stone': ['#7d7a75', '30px', '22px', '45%', 0, 0, 0], 'Coin': ['radial-gradient(circle,#f3d27a,#b8892b)', '24px', '24px', '50%', 0, 1, 0],
    'Glass marble': ['radial-gradient(circle at 35% 35%,#d7f3ff,#2f8fd8)', '20px', '20px', '50%', 0, 0, 0], 'Metal spoon': ['#c3c9d6', '40px', '10px', '6px', 0, 1, 0],
    'Copper wire': ['#c8743a', '40px', '5px', '3px', 0, 1, 0], 'Steel paperclip': ['#aab3c4', '30px', '12px', '6px', 0, 1, 1], 'Aluminum foil': ['#dfe3ea', '30px', '20px', '3px', 0, 1, 0],
    'Iron filings': ['radial-gradient(circle,#555 30%,#888 31%)', '30px', '16px', '40%', 0, 1, 1], 'Plastic ruler': ['#ffcf3d', '44px', '10px', '2px', 0, 0, 0],
    'Rubber band': ['#ff8f3d', '26px', '26px', '50%', 0, 0, 0], 'Wooden stick': ['#c08a50', '44px', '7px', '3px', 1, 0, 0], 'Plastic spoon': ['#7ad0ff', '40px', '10px', '6px', 0, 0, 0],
    'Rubber eraser': ['#ff7aa8', '30px', '16px', '4px', 0, 0, 0], 'Aluminum can': ['#d0d6e0', '20px', '34px', '4px', 0, 1, 0], 'Gold ring': ['radial-gradient(circle,transparent 45%,#f2c94c 47%)', '24px', '24px', '50%', 0, 1, 0],
    'Paper': ['#f4f4f0', '28px', '34px', '2px', 0, 0, 0] };
  const FLOATS = ['Wooden block', 'Cork', 'Ice cube', 'Apple', 'Ping-pong ball'], SINKS = ['Iron nail', 'Stone', 'Coin', 'Glass marble', 'Metal spoon'];
  const COND = ['Iron nail', 'Copper wire', 'Steel paperclip', 'Aluminum foil', 'Metal spoon'], INS = ['Plastic ruler', 'Rubber band', 'Wooden stick', 'Glass marble', 'Paper', 'Rubber eraser'];
  const MAG = ['Iron nail', 'Steel paperclip', 'Iron filings'], NONMAG = ['Aluminum can', 'Copper wire', 'Plastic spoon', 'Wooden block', 'Rubber eraser', 'Glass marble', 'Gold ring'];
  const CHAINS = [['🌿 Grass', '🐇 Rabbit', '🦊 Fox'], ['🌾 Seeds', '🐭 Mouse', '🦉 Owl'], ['🌿 Grass', '🦓 Zebra', '🦁 Lion'], ['🍃 Leaves', '🐌 Snail', '🐦 Thrush'],
    ['🌿 Grass', '🦗 Grasshopper', '🐸 Frog', '🐍 Snake'], ['🍃 Leaves', '🐛 Caterpillar', '🐦 Small bird', 'Hawk'], ['Algae', '🦐 Krill', '🐧 Penguin', 'Leopard seal']];
  const LIGHT = { Yellow: 'RG', Magenta: 'RB', Cyan: 'GB', White: 'RGB' }, LAMP = { R: ['Red', '#ff0000'], G: ['Green', '#00ff00'], B: ['Blue', '#0000ff'] };
  const FACT = { water: 'Water freezes at 0 °C (32 °F) and boils at 100 °C (212 °F) at sea level.', float: 'Things less dense than water (wood, cork, ice) float; denser things (iron, stone, glass) sink.',
    conduct: 'Metals such as copper, iron and aluminum conduct electricity; plastic, rubber, wood and glass are insulators.',
    circuit: 'A bulb lights only in a complete loop: a battery, unbroken wires and a closed switch.',
    light: 'Colored light adds up: red + green = yellow, red + blue = magenta, green + blue = cyan, all three = white.',
    magnet: 'Magnets attract iron and steel. Aluminum, copper, gold, plastic, wood and glass are not attracted.',
    chain: 'In a food chain the arrow means "is eaten by". Chains start with a producer, usually a green plant.' };
  const CSS = `.sl-st{display:flex;align-items:center;gap:8px;margin-bottom:6px;font:800 13px var(--body);letter-spacing:.1em;text-transform:uppercase;color:var(--c)}
.sl-lab{background-image:linear-gradient(rgba(122,240,208,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(122,240,208,.05) 1px,transparent 1px);background-size:26px 26px}
.sl-lab:after{content:'';position:absolute;left:0;right:0;bottom:0;height:16px;background:linear-gradient(#5b4632,#2f241a);border-top:2px solid #7a5f43}
.sl-track{display:flex;gap:5px;align-items:center;margin-bottom:8px}.sl-track i{width:16px;height:16px;border-radius:50%;background:var(--panel2);border:2px solid var(--edge);transition:background .3s}
.sl-track i.x{border-radius:4px 4px 8px 8px}.sl-track i.d{background:var(--ok);border-color:var(--ok)}.sl-track i.c{border-color:var(--c);animation:pulse 1s infinite;box-shadow:0 0 10px var(--c)}
.sl-bench{width:100%;flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;justify-content:center;animation:rise .35s ease both}
.sl-task{font:700 clamp(17px,3.2vw,26px) var(--display);text-align:center;max-width:680px;margin-bottom:8px}
.sl-note{min-height:40px;color:var(--muted);text-align:center;font-weight:700;max-width:620px;margin-top:8px;font-size:clamp(13px,2vw,16px)}
.sl-fuse{width:min(100%,420px);height:7px;border-radius:6px;background:var(--bg2);overflow:hidden;margin:4px 0 2px}.sl-fuse i{display:block;height:100%;background:linear-gradient(90deg,var(--c2),var(--c));transform-origin:left}
.sl-row{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:center;margin-top:10px}
.sl-ob{display:inline-block;flex:none;box-shadow:inset 0 -3px 0 rgba(0,0,0,.25),0 2px 6px rgba(0,0,0,.35)}
.sl-pick{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:84px;min-height:64px;padding:6px 8px;border-radius:14px;background:var(--panel2);border:2px solid var(--edge);font:700 13px var(--body);transition:transform .3s,opacity .3s,border-color .2s}
.sl-pick:hover{border-color:var(--c)}.sl-pick.no{animation:shake .35s;border-color:var(--no);opacity:.45;pointer-events:none}.sl-pick.ok{border-color:var(--ok)}
.sl-beaker{position:relative;width:110px;height:130px;border:4px solid #cfe3f5;border-top:0;border-radius:0 0 22px 22px;overflow:hidden;background:rgba(255,255,255,.04)}
.sl-liq{position:absolute;left:0;right:0;bottom:0;height:70%;background:linear-gradient(#5ab0ff,#2563c9);transition:height .8s,background .6s,border-radius .6s}
.sl-liq.ice{height:62%;left:12px;right:12px;bottom:6px;border-radius:6px;background:linear-gradient(135deg,#f4fbff,#a9dcff 60%,#e6f6ff)}
.sl-liq.water{animation:slw 1.4s ease-in-out infinite}.sl-liq.steam{height:38%}
@keyframes slw{50%{transform:skewY(2deg)}}
.sl-bub{position:absolute;bottom:4px;width:8px;height:8px;border-radius:50%;border:2px solid rgba(255,255,255,.8);animation:slb 1s linear infinite}
@keyframes slb{to{transform:translateY(-60px);opacity:0}}
.sl-puff{position:absolute;top:-20px;width:26px;height:26px;border-radius:50%;background:rgba(235,240,250,.55);filter:blur(3px);animation:slp 1.6s ease-out infinite}
@keyframes slp{from{transform:translateY(20px) scale(.5);opacity:.9}to{transform:translateY(-50px) scale(1.4);opacity:0}}
.sl-therm{position:relative;width:18px;height:150px;border-radius:9px;background:#e9eef7;border:2px solid #9aa3b8;margin-left:22px}
.sl-therm i{position:absolute;left:3px;right:3px;bottom:3px;border-radius:6px;background:#ff4d5e;transition:height .2s}
.sl-flame{width:60px;height:calc(var(--f,0) * 34px + 4px);margin:4px auto 0;border-radius:50% 50% 20% 20%;background:radial-gradient(circle at 50% 90%,#fff3a0,#ff9f1c 50%,#ff4d5e);transition:height .3s;animation:slfl .25s ease-in-out infinite alternate}
.sl-flame.cold{background:radial-gradient(circle,#bfe9ff,#3a8bd8);animation:none;border-radius:8px}
@keyframes slfl{to{transform:scaleX(.88) scaleY(1.06)}}
.sl-range{width:min(100%,360px);height:44px;accent-color:var(--c)}
.sl-tank{position:relative;width:min(100%,380px);height:170px;border:3px solid #9fc6e8;border-top:0;border-radius:0 0 16px 16px;overflow:hidden}
.sl-tank:before{content:'';position:absolute;left:0;right:0;bottom:0;height:66%;background:linear-gradient(rgba(90,176,255,.55),rgba(37,99,201,.8))}
.sl-drop{position:absolute;top:8px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:2px;font:700 12px var(--body);transition:top .9s cubic-bezier(.3,.1,.4,1),left .5s}
.sl-drop.bob{animation:slbob 1.6s ease-in-out infinite}@keyframes slbob{50%{margin-top:4px}}
.sl-wall{position:relative;width:min(100%,340px);height:190px;border-radius:18px;background:#05060a;overflow:hidden;isolation:isolate;border:1px solid var(--edge)}
.sl-beam{position:absolute;width:118px;height:118px;border-radius:50%;mix-blend-mode:screen;opacity:0;transform:scale(.6);transition:opacity .45s,transform .45s}
.sl-beam.on{opacity:1;transform:none}
.sl-beam:not(.on){opacity:1;transform:none;background:transparent!important;border:2px dashed rgba(255,255,255,.13)}
.sl-lamp{width:64px;height:64px;border-radius:50%;border:3px solid var(--edge);background:var(--panel2);font:800 13px var(--body);transition:box-shadow .2s,background .2s}
.sl-lamp.on{background:var(--k);color:#000;box-shadow:0 0 22px var(--k)}
.sl-magnet{position:absolute;top:0;width:64px;height:54px;border:16px solid #e53935;border-top:0;border-radius:0 0 30px 30px;transition:transform .35s ease-in-out;z-index:2}
.sl-magnet:before,.sl-magnet:after{content:'';position:absolute;bottom:-14px;width:14px;height:10px;background:#cfd6e3}.sl-magnet:before{left:-14px}.sl-magnet:after{right:-14px}
.sl-chain{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;min-height:58px;padding:8px;border-radius:14px;border:2px dashed var(--edge);width:min(100%,700px)}
.sl-chain span{padding:8px 10px;border-radius:12px;background:color-mix(in srgb,var(--ok) 22%,var(--panel2));border:2px solid var(--ok);font:700 15px var(--display);animation:pop .3s both}
.sl-chain b{color:var(--c);font-size:18px}
.sl-glow{filter:drop-shadow(0 0 10px #ffe066)}`;

  // a circuit as SVG: kind 'ok' | 'open' | 'gap' | 'nobat' (lit = the bulb glows); gapObj: a label in a gap for the conductor test
  function circuit(kind, lit, w = 150) {
    const wire = '#cfd6e3', bulb = lit ? '#ffe066' : '#3a4256', parts = [];
    const L = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${wire}" stroke-width="3" stroke-linecap="round"/>`;
    parts.push(L(20, 20, 51, 20), L(69, 20, 100, 20), L(100, 20, 100, 38));
    parts.push((kind === 'open' ? L(100, 40, 113, 53) : L(100, 40, 100, 58)) + `<circle cx="100" cy="40" r="3" fill="${wire}"/><circle cx="100" cy="58" r="3" fill="${wire}"/>`);
    parts.push(L(100, 58, 100, 72), kind === 'gap' ? L(100, 72, 72, 72) + L(52, 72, 20, 72) : L(100, 72, 20, 72));
    parts.push(kind === 'nobat' ? L(20, 72, 20, 20) : L(20, 72, 20, 50) + L(20, 42, 20, 20) + `<line x1="10" y1="42" x2="30" y2="42" stroke="#ff9f1c" stroke-width="3"/><line x1="14" y1="50" x2="26" y2="50" stroke="#ff9f1c" stroke-width="6"/><text x="34" y="40" font-size="9" fill="#ff9f1c" font-family="Arial">+</text>`);
    parts.push(`<g class="${lit ? 'sl-glow' : ''}"><circle cx="60" cy="18" r="9" fill="${bulb}" stroke="${wire}" stroke-width="2"/><path d="M55 20q2.5-6 5 0q2.5-6 5 0" fill="none" stroke="${lit ? '#b8860b' : '#9aa3b8'}" stroke-width="1.5"/></g>`);
    return h('div', { style: { width: w + 'px', maxWidth: '100%' }, html: `<svg viewBox="0 0 120 86" style="width:100%;display:block">${parts.join('')}</svg>` });
  }
  const lc = s => s[0].toLowerCase() + s.slice(1);
  const obj = (name, big) => { const o = OB[name], k = big ? 1.4 : 1; return h('span', { class: 'sl-ob', style: { background: o[0], width: `calc(${o[1]} * ${k})`, height: `calc(${o[2]} * ${k})`, borderRadius: o[3] } }); };

  Edu.game({
    id: 'science-lab', levels: LV,
    how: ['Work your way along the lab bench: quick quiz questions and hands-on experiments take turns.',
      'Quiz: pick the answer (click, tap or keys 1 to 4) before the fuse burns down.',
      'Experiments: follow the task, e.g. set the burner, choose the lamps, tap the objects, then test. Keys R, G, B and Enter work for the lamps.',
      'Each mistake costs one of your three lives. Clear every station to finish the level.'],
    start(c) {
      if (!document.getElementById('sl-css')) document.head.append(h('style', { id: 'sl-css', text: CSS }));
      const L = c.L, total = L.n * 2, stations = [], exps = sample(L.exps, L.n);
      for (let i = 0; i < L.n; i++) stations.push('quiz', exps[i]);
      const qpool = shuffle(Q.filter(q => c.level === 0 ? q[0] === 0 : c.level === 1 ? q[0] <= 1 : q[0] >= 1).sort((a, b) => (b[0] === c.level) - (a[0] === c.level)).slice(0, 12));
      c.lives(3); c.k = 0; c.learn = []; c.missed = [];
      c.key(e => c.stKey && c.stKey(e)); c.loop(dt => c.tick && c.tick(dt));
      const head = h('div', { class: 'sl-st' }), bench = h('div', { class: 'sl-bench' }), track = h('div', { class: 'sl-track', 'aria-hidden': 'true' }, stations.map(k => h('i', { class: k === 'quiz' ? '' : 'x' })));
      c.el.classList.add('sl-lab'); c.el.append(track, head, bench);
      const at = el => { const r = el.getBoundingClientRect(), s = c.el.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top]; };
      const good = (el, pts = 10) => { c.right(pts + c.level * 5, ...at(el)); };
      const bad = (el, msg, fact) => { c.wrong(...at(el), 'Not quite'); if (fact) c.missed.push(fact); if (msg) note.textContent = msg; return c.lose() > 0; };
      let note;
      const over = () => { const won = c.lives_ > 0, learnt = [...new Set(c.missed)].slice(0, 3); for (const f of shuffle(c.learn)) if (learnt.length < 4 && !learnt.includes(f)) learnt.push(f);
        c.end({ won, title: won ? 'Lab complete!' : 'Lab closed: out of lives', msg: won ? 'Every station on the bench is done.' : 'Each mistake costs a life. Read the notes and try again.', stats: { Stations: c.k + ' / ' + total }, learnt }); };
      const done = (ms = 700) => { c.botMove = c.missMove = null; c.after(ms, () => { c.k++; next(); }); };
      const dead = () => { c.botMove = c.missMove = null; c.after(900, over); };
      function next() {
        if (c.k >= total) return over();
        const kind = stations[c.k]; bench.innerHTML = ''; bench.style.animation = 'none'; void bench.offsetWidth; bench.style.animation = '';
        head.textContent = (kind === 'quiz' ? '🔬 Quick quiz' : '🧪 Experiment') + ` · station ${c.k + 1} of ${total}`; c.hud({ station: (c.k + 1) + ' / ' + total }); [...track.children].forEach((d, i) => d.className = (stations[i] === 'quiz' ? '' : 'x ') + (i < c.k ? 'd' : i === c.k ? 'c' : ''));
        note = h('div', { class: 'sl-note', 'aria-live': 'polite' }); c.botMove = c.missMove = c.stKey = c.tick = null;
        if (kind !== 'quiz') c.learn.push(FACT[kind]);
        EXP[kind](); bench.append(note);
      }
      const task = t => bench.append(h('div', { class: 'sl-task', text: t }));
      const EXP = {
        quiz() {
          const q = qpool.pop() || pick(Q), opts = shuffle(q.slice(2)), fuse = h('div', { class: 'sl-fuse' }, h('i')); let left = L.qt, busy = false;
          task(q[1]); bench.append(fuse); const area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } }); bench.append(area);
          const ch = c.choices(area, opts, i => answer(i), { cols: 2 });
          function answer(i) { if (busy) return; busy = true; ch.lock(); const ri = opts.indexOf(q[2]);
            if (i === ri) { ch.mark(i, true); good(ch.btns[i]); done(); }
            else { if (i >= 0) ch.mark(i, false); ch.mark(ri, true); const fact = q[1].replace(/…$/, '') + ' ' + q[2] + '.'; note.textContent = 'Answer: ' + q[2];
              if (bad(ch.btns[i >= 0 ? i : ri], null, fact)) done(1300); else dead(); } }
          c.tick = dt => { if (busy) return; left -= dt * Edu.SPEED; fuse.firstChild.style.transform = `scaleX(${Math.max(0, left / L.qt)})`; if (left <= 0) { note.textContent = "Time's up!"; answer(-1); } };
          c.botMove = () => ch.btns[opts.indexOf(q[2])].click(); c.missMove = () => ch.btns[opts.findIndex(o => o !== q[2])].click();
        },
        water() {
          const F = c.level === 2, u = F ? '°F' : '°C', lo = F ? 2 : -25, st = F ? 20 : 10, hi = F ? 242 : 125, want = pick(['ice', 'water', 'steam']);
          const names = { ice: 'solid ICE', water: 'liquid WATER', steam: 'STEAM (a gas)' }, state = t => t < (F ? 32 : 0) ? 'ice' : t > (F ? 212 : 100) ? 'steam' : 'water';
          task(`Set the temperature so the water becomes ${names[want]}, then press Test.`);
          const liq = h('div', { class: 'sl-liq water' }), beaker = h('div', { class: 'sl-beaker' }, liq), merc = h('i'), flame = h('div', { class: 'sl-flame' });
          const range = h('input', { type: 'range', min: lo, max: hi, step: st, value: F ? 82 : 25, class: 'sl-range', 'aria-label': 'Temperature', 'data-own': '1' }), read = h('b', { style: { font: '700 22px var(--display)', minWidth: '90px', textAlign: 'center' } });
          const test = h('button', { class: 'btn go', type: 'button', text: '🔥 Test' });
          const show = () => { const t = +range.value, p = (t - lo) / (hi - lo); read.textContent = t + ' ' + u; merc.style.height = (8 + p * 88) + '%'; flame.style.setProperty('--f', Math.abs(p - .3) * 2); flame.classList.toggle('cold', t < (F ? 32 : 0)); };
          bench.append(h('div', { class: 'sl-row', style: { alignItems: 'flex-end' } }, h('div', {}, beaker, flame), h('div', { class: 'sl-therm' }, merc)), h('div', { class: 'sl-row' }, range, read), h('div', { class: 'sl-row' }, test));
          show(); c.on(range, 'input', show); let busy = false;
          const run = () => { if (busy) return; busy = true; range.disabled = true; test.disabled = true; const t = +range.value, s = state(t);
            liq.className = 'sl-liq ' + s; beaker.querySelectorAll('.sl-bub,.sl-puff').forEach(e => e.remove());
            if (s === 'steam') for (let i = 0; i < 6; i++) beaker.append(h('div', { class: i % 2 ? 'sl-puff' : 'sl-bub', style: { left: (10 + i * 15) + 'px', animationDelay: (i * .2) + 's' } }));
            const what = `At ${t} ${u} water is ${s === 'ice' ? 'solid ice' : s === 'steam' ? 'boiling into steam' : 'a liquid'}.`;
            c.after(650, () => { if (s === want) { note.textContent = '✓ ' + what; good(test, 15); done(900); } else if (bad(test, '✗ ' + what + (F ? ' Ice melts at 32 °F; water boils at 212 °F.' : ' Ice melts at 0 °C; water boils at 100 °C.'), FACT.water)) done(1600); else dead(); }); };
          test.onclick = run; c.stKey = e => { const d = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
            if (d && document.activeElement !== range && !busy) { e.preventDefault(); range.value = +range.value + d * st; show(); }
            else if (e.key === 'Enter' && document.activeElement !== test) { e.preventDefault(); run(); } };
          const target = { ice: lo, water: F ? 82 : 25, steam: hi }[want];
          c.botMove = () => { if (+range.value !== target) { range.value = target; show(); } else run(); };
          c.missMove = () => { range.value = want === 'ice' ? hi : lo; show(); run(); };
        },
        float() {
          const n = c.level === 0 ? 3 : 4, list = shuffle([...sample(FLOATS, 2), ...sample(SINKS, 2), pick([...FLOATS, ...SINKS])]).filter((x, i, a) => a.indexOf(x) === i).slice(0, n);
          task('Will it float or sink in water? Predict, then watch it drop.');
          const tank = h('div', { class: 'sl-tank' }), area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } }); bench.append(tank, area);
          let k = 0, cur, ch, busy;
          const step = () => { if (k >= list.length) return done(500); const name = list[k]; busy = false;
            cur = h('div', { class: 'sl-drop' }, obj(name, true), h('span', { text: name })); tank.append(cur); area.innerHTML = '';
            ch = c.choices(area, ['⬆ Floats', '⬇ Sinks'], i => answer(i), { cols: 2 }); };
          const answer = i => { if (busy) return; busy = true; ch.lock(); const name = list[k], fl = OB[name][4], right = (i === 0) === !!fl, el = cur;
            el.style.left = (14 + (k * 24) % 72) + '%'; const oh = el.firstChild.offsetHeight; el.style.top = (fl ? 58 - oh / 2 : 166 - el.offsetHeight) + 'px'; if (fl) c.after(900, () => el.classList.add('bob'));
            c.after(700, () => { const msg = `The ${lc(name)} ${fl ? 'floats' : 'sinks'}: it is ${fl ? 'less dense' : 'denser'} than water.`;
              k++; if (right) { ch.mark(i, true); good(ch.btns[i]); note.textContent = '✓ ' + msg; c.after(350, step); }
              else { ch.mark(i, false); if (bad(ch.btns[i], '✗ ' + msg, msg)) c.after(1100, step); else dead(); } }); };
          step();
          c.botMove = () => { if (!busy) ch.btns[OB[list[k]][4] ? 0 : 1].click(); }; c.missMove = () => { if (!busy) ch.btns[OB[list[k]][4] ? 1 : 0].click(); };
        },
        conduct() {
          const need = c.level === 0 ? 1 : 2, items = shuffle([...sample(COND, need), ...sample(INS, c.level === 0 ? 3 : 3)]); let found = 0;
          task(need > 1 ? 'Find BOTH things that let electricity flow and light the bulb. Tap one to clip it into the gap.' : 'Which object lets electricity flow and lights the bulb? Tap it to clip it into the gap.');
          const holder = h('div'), gap = h('div', { style: { minHeight: '22px', font: '700 14px var(--body)', color: 'var(--muted)', textAlign: 'center' }, text: 'gap: (empty)' });
          const draw = lit => { holder.innerHTML = ''; holder.append(circuit('gap', lit, 210)); }; draw(false);
          const tray = h('div', { class: 'sl-row' }); bench.append(holder, gap, tray);
          const btns = items.map(name => h('button', { class: 'sl-pick', type: 'button', onclick: () => tryIt(name, b(name)) }, obj(name, true), name)), b = n => btns[items.indexOf(n)];
          tray.append(...btns); let busy = false;
          function tryIt(name, el) { if (busy || el.classList.contains('ok')) return; busy = true; const ok = !!OB[name][5]; gap.textContent = 'gap: ' + name; draw(ok);
            c.after(450, () => { busy = false;
              if (ok) { el.classList.add('ok'); found++; note.textContent = `✓ The ${lc(name)} conducts electricity: the bulb lights up!`; good(el); if (found >= need) done(900); else c.after(700, () => { draw(false); gap.textContent = 'gap: (empty)'; }); }
              else { el.classList.add('no'); draw(false); if (!bad(el, `✗ The ${lc(name)} is an insulator: no electricity flows.`, FACT.conduct)) dead(); } }); }
          c.botMove = () => { const n = items.find(x => OB[x][5] && !b(x).classList.contains('ok')); if (n && !busy) b(n).click(); };
          c.missMove = () => { const n = items.find(x => !OB[x][5]); if (n && !busy) b(n).click(); };
        },
        circuit() {
          const kinds = shuffle(['ok', 'open', 'gap', 'nobat']); let busy = false;
          task('Which circuit will light the bulb?'); const area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } }); bench.append(area);
          const ch = c.choices(area, kinds.map(k => circuit(k, false, 140)), i => { if (busy) return; busy = true; ch.lock(); const ri = kinds.indexOf('ok');
            ch.btns[ri].replaceChild(circuit('ok', true, 140), ch.btns[ri].lastChild);
            const why = { open: 'the switch is open', gap: 'there is a break in the wire', nobat: 'there is no battery' };
            if (i === ri) { ch.mark(i, true); note.textContent = '✓ A complete loop with a battery and a closed switch: it lights!'; good(ch.btns[i], 15); done(1000); }
            else { ch.mark(i, false); ch.mark(ri, true); if (bad(ch.btns[i], `✗ That one cannot light: ${why[kinds[i]]}.`, FACT.circuit)) done(1600); else dead(); } }, { cols: 4 });
          c.botMove = () => ch.btns[kinds.indexOf('ok')].click(); c.missMove = () => ch.btns[kinds.findIndex(k => k !== 'ok')].click();
        },
        light() {
          const keys = Object.keys(LIGHT).filter(k => c.level === 2 || k !== 'White'), want = pick(keys), mix = LIGHT[want];
          const wall = h('div', { class: 'sl-wall' }), pos = { R: [76, 8], G: [146, 8], B: [111, 66] }, beams = {};
          for (const k in LAMP) { beams[k] = h('div', { class: 'sl-beam', style: { left: `calc(50% - 170px + ${pos[k][0]}px)`, top: pos[k][1] + 'px', background: LAMP[k][1] } }); wall.append(beams[k]); }
          const shine = set => { for (const k in beams) beams[k].classList.toggle('on', set.includes(k)); };
          if (c.level === 0) {
            task(`What color do you see where ${LAMP[mix[0]][0].toLowerCase()} and ${LAMP[mix[1]][0].toLowerCase()} light overlap?`); bench.append(wall);
            const opts = shuffle([want, ...sample(['Brown', 'Purple', 'Orange', 'Black', 'Pink'], 3)]), area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } }); bench.append(area);
            const ch = c.choices(area, opts, i => { ch.lock(); shine(mix); const ri = opts.indexOf(want), msg = `${LAMP[mix[0]][0]} + ${LAMP[mix[1]][0].toLowerCase()} light = ${want.toLowerCase()}.`;
              if (i === ri) { ch.mark(i, true); note.textContent = '✓ ' + msg; good(ch.btns[i]); done(1200); } else { ch.mark(i, false); ch.mark(ri, true); if (bad(ch.btns[i], '✗ ' + msg, FACT.light)) done(1700); else dead(); } }, { cols: 2 });
            c.botMove = () => ch.btns[opts.indexOf(want)].click(); c.missMove = () => ch.btns[opts.findIndex(o => o !== want)].click(); return;
          }
          task(`Switch on the right lamps to make ${want.toUpperCase()} light, then press Shine.`); bench.append(wall);
          const on = new Set(), lamps = {}, row = h('div', { class: 'sl-row' }), go = h('button', { class: 'btn go', type: 'button', text: '💡 Shine' }); let busy = false;
          const tog = k => { if (busy) return; on.has(k) ? on.delete(k) : on.add(k); lamps[k].classList.toggle('on', on.has(k)); Edu.sfx.click(); };
          for (const k in LAMP) { lamps[k] = h('button', { class: 'sl-lamp', type: 'button', '--k': LAMP[k][1], text: LAMP[k][0], onclick: () => tog(k) }); row.append(lamps[k]); }
          bench.append(row, h('div', { class: 'sl-row' }, go));
          const run = () => { if (busy || !on.size) return; busy = true; go.disabled = true; const got = [...'RGB'].filter(k => on.has(k)).join(''); shine(got);
            const name = Object.keys(LIGHT).find(k => LIGHT[k] === got) || (got.length === 1 ? LAMP[got][0] : '');
            c.after(600, () => { if (got === mix) { note.textContent = `✓ ${[...mix].map(k => LAMP[k][0]).join(' + ')} = ${want.toLowerCase()}!`; good(go, 15); done(1000); }
              else if (bad(go, `✗ That makes ${name.toLowerCase()} light. ${want} = ${[...mix].map(k => LAMP[k][0].toLowerCase()).join(' + ')}.`, FACT.light)) done(1800); else dead(); }); };
          go.onclick = run; c.stKey = (e => { const k = e.key.toUpperCase(); if (LAMP[k] && e.key.length === 1) tog(k); else if (e.key === 'Enter' && (document.activeElement || {}).tagName !== 'BUTTON') { e.preventDefault(); run(); } });
          c.botMove = () => { const k = [...'RGB'].find(k => mix.includes(k) !== on.has(k)); if (k) tog(k); else run(); };
          c.missMove = () => { for (const k of 'RGB') if (mix.includes(k) === on.has(k)) { if (!mix.includes(k)) tog(k); } run(); };
        },
        magnet() {
          const need = c.level === 2 ? pick([2, 3]) : 2, items = shuffle([...sample(MAG, need), ...sample(NONMAG, 5 - need)]); let found = 0, busy = false;
          task(`Which objects will the magnet pick up? Find all ${need}.`);
          const zone = h('div', { style: { position: 'relative', width: 'min(100%,560px)', height: '74px' } }), mag = h('div', { class: 'sl-magnet', style: { left: 'calc(50% - 32px)' } }); zone.append(mag);
          const tray = h('div', { class: 'sl-row' }), btns = items.map(n => h('button', { class: 'sl-pick', type: 'button', onclick: () => grab(n) }, obj(n, true), n)); tray.append(...btns); bench.append(zone, tray);
          function grab(n) { const el = btns[items.indexOf(n)]; if (busy || el.classList.contains('ok')) return; busy = true;
            const zr = zone.getBoundingClientRect(), r = el.getBoundingClientRect(), dx = r.left + r.width / 2 - (zr.left + zr.width / 2), dy = r.top - zr.top - 40;
            mag.style.transform = `translate(${dx}px, ${Math.max(0, dy)}px)`;
            c.after(380, () => { const ok = !!OB[n][6];
              if (ok) { el.classList.add('ok'); el.style.transform = 'translateY(-12px) scale(.9)'; found++; note.textContent = `✓ The magnet picks up the ${lc(n)}: ${/Steel/.test(n) ? 'steel is mostly iron' : 'iron is magnetic'}.`; good(el); }
              else { el.classList.add('no'); if (!bad(el, `✗ The ${lc(n)} is not magnetic.`, FACT.magnet)) return dead(); }
              mag.style.transform = ''; c.after(350, () => { busy = false; if (found >= need) done(500); }); }); }
          c.botMove = () => { const n = items.find(x => OB[x][6] && !btns[items.indexOf(x)].classList.contains('ok')); if (n && !busy) grab(n); };
          c.missMove = () => { if (!busy) grab(items.find(x => !OB[x][6])); };
        },
        chain() {
          const pool = CHAINS.filter(ch => c.level === 0 ? ch.length === 3 : c.level === 2 ? ch.length === 4 : true), chain = pick(pool), cards = shuffle(chain); let k = 0, busy = false;
          task('Build the food chain: tap the living things in order, starting with the one that makes its own food.');
          const line = h('div', { class: 'sl-chain' }), row = h('div', { class: 'sl-row' }); bench.append(line, row);
          const btns = cards.map(n => h('button', { class: 'sl-pick', type: 'button', style: { fontSize: '15px', minWidth: '110px' }, text: n, onclick: () => tapIt(n) })); row.append(...btns);
          function tapIt(n) { const el = btns[cards.indexOf(n)]; if (busy || el.classList.contains('ok')) return;
            if (n === chain[k]) { el.classList.add('ok'); el.style.opacity = '.35'; if (k) line.append(h('b', { text: '→' })); line.append(h('span', { text: n })); k++; good(el, 8);
              if (k === chain.length) { busy = true; note.textContent = '✓ ' + chain.map(x => x.replace(/^[^\w]+ /, '')).join(' → ') + '. The arrow means "is eaten by".'; done(1200); } }
            else { el.classList.remove('no'); void el.offsetWidth; el.classList.add('no'); c.after(500, () => el.classList.remove('no'));
              if (!bad(el, k ? `✗ Not yet: what eats the ${chain[k - 1].replace(/^[^\w]+ /, '').toLowerCase()}?` : '✗ Start with the producer: the plant (or algae) that makes its own food.', FACT.chain)) dead(); } }
          c.botMove = () => { if (!busy) tapIt(chain[k]); }; c.missMove = () => { if (!busy) tapIt(cards.find(x => x !== chain[k])); };
        }
      };
      next();
    },
    bot(c) { c.botMove && c.botMove(); },
    miss(c) { c.missMove && c.missMove(); }
  });
})();
