/* Flag Master: a flag flies in on its pole and waves; pick the country from four before its fuse runs out.
   Three lives, streaks, the continent and capital after every answer. Hard uses look-alike flags as the choices. */
// @data countries
(() => {
  const { h, pick, shuffle, sample } = Edu, FL = COUNTRIES.filter(c => c.flag), get = n => COUNTRIES.find(c => c.name === n);
  const EASY = ['France', 'Italy', 'Germany', 'United Kingdom', 'United States', 'Canada', 'Japan', 'China', 'Brazil', 'India', 'Switzerland', 'Greece', 'Sweden',
    'South Korea', 'Turkey', 'Australia', 'Argentina', 'Jamaica', 'Ukraine', 'Ireland', 'Vietnam', 'Denmark', 'Finland', 'Chile', 'Nigeria', 'Russia', 'Netherlands', 'Pakistan', 'Israel', 'Cuba'];
  // look-alike families: in Hard the other choices come from the flag's family
  const LOOK = [['Romania', 'Chad', 'Belgium', 'Mali', 'Guinea'], ['Indonesia', 'Monaco', 'Poland', 'Singapore'], ['Ireland', "Côte d'Ivoire", 'Italy', 'Nigeria'],
    ['India', 'Niger', "Côte d'Ivoire", 'Ireland'], ['Netherlands', 'Luxembourg', 'Russia', 'France'], ['Australia', 'New Zealand', 'United Kingdom', 'Chile'],
    ['Norway', 'Iceland', 'Denmark', 'Finland', 'Sweden'], ['Qatar', 'Bahrain', 'Latvia', 'Austria'], ['Japan', 'Bangladesh', 'Palau', 'Laos'],
    ['Senegal', 'Mali', 'Cameroon', 'Guinea', 'Ghana'], ['Austria', 'Latvia', 'Peru', 'Canada'], ['Kuwait', 'United Arab Emirates', 'Czechia', 'Bahamas'],
    ['Cuba', 'Czechia', 'Bahamas', 'Panama', 'Chile'], ['Tunisia', 'Turkey', 'Singapore', 'Algeria', 'Pakistan'], ['Sierra Leone', 'Gabon', 'Bulgaria', 'Hungary', 'Lithuania'],
    ['Thailand', 'Laos', 'Netherlands', 'Russia'], ['Colombia', 'Romania', 'Mauritius', 'Lithuania', 'Gabon'], ['Ukraine', 'Poland', 'Indonesia', 'Monaco', 'Sweden'],
    ['Vietnam', 'China', 'Morocco', 'Somalia', 'Myanmar'], ['Ghana', 'Myanmar', 'Senegal', 'Cameroon', 'Lithuania'], ['Israel', 'Greece', 'Finland', 'Argentina', 'Somalia'],
    ['Jamaica', 'Trinidad and Tobago', 'Tanzania', 'Bahamas'], ['United States', 'Chile', 'Cuba', 'Panama'], ['South Korea', 'Japan', 'Israel', 'Switzerland'],
    ['Canada', 'Peru', 'Switzerland', 'Austria', 'Denmark'], ['Brazil', 'Jamaica', 'Gabon', 'Bahamas'], ['Madagascar', 'Benin', 'Poland', 'Czechia', 'Monaco'],
    ['Estonia', 'Botswana', 'Germany', 'Belgium'], ['Argentina', 'Somalia', 'Botswana', 'Greece', 'Israel'], ['Turkey', 'Tunisia', 'Pakistan', 'Algeria']];
  const TIPS = [[['Romania', 'Chad'], "Chad and Romania have almost the same flag; Chad's blue is a darker indigo."],
    [['Indonesia', 'Monaco'], "Indonesia and Monaco are both red over white; Monaco's flag is squarer (4:5), Indonesia's longer (2:3)."],
    [['Poland', 'Indonesia', 'Monaco'], 'Poland is the other way up: white over red.'],
    [['Ireland', "Côte d'Ivoire"], "Ireland has green next to the pole; Côte d'Ivoire has orange next to the pole."],
    [['Italy', 'Ireland', "Côte d'Ivoire"], 'Italy is green, white and red; Ireland and Côte d’Ivoire use orange instead of red.'],
    [['India', 'Niger'], 'India has a navy-blue wheel in the middle; Niger has an orange disc and a squarer flag.'],
    [['Netherlands', 'Luxembourg'], "Luxembourg's blue is a light sky blue; the Netherlands' blue is dark."],
    [['Netherlands', 'Russia'], 'The Netherlands is red, white, blue from the top; Russia is white, blue, red.'],
    [['Norway', 'Iceland'], 'Norway is red with a blue cross; Iceland is blue with a red cross.'],
    [['Finland', 'Sweden'], 'Finland has a blue cross on white; Sweden a yellow cross on blue.'],
    [['Denmark', 'Norway'], 'Denmark has a plain white cross on red; Norway adds a blue cross inside it.'],
    [['Australia', 'New Zealand'], 'Australia has white stars, including a big seven-pointed one; New Zealand has four red stars.'],
    [['Qatar', 'Bahrain'], 'Qatar is maroon with nine white points; Bahrain is red with five.'],
    [['Senegal', 'Mali'], "Senegal has a green star in the middle; Mali's flag has no star."],
    [['Guinea', 'Mali'], 'Guinea is red, yellow, green from the pole; Mali is green, yellow, red.'],
    [['Senegal', 'Cameroon'], 'Senegal is green, yellow, red with a green star; Cameroon is green, red, yellow with a yellow star.'],
    [['Japan', 'Bangladesh'], 'Japan has a red disc on white; Bangladesh a red disc on green.'],
    [['Austria', 'Latvia'], 'Austria is bright red with an equal white stripe; Latvia is dark red with a narrow white stripe.'],
    [['Hungary', 'Bulgaria'], 'Hungary is red, white, green from the top; Bulgaria is white, green, red.'],
    [['Gabon', 'Sierra Leone'], 'Gabon is green, yellow, blue; Sierra Leone is green, white, blue.'],
    [['Tunisia', 'Turkey'], "Turkey's crescent and star sit on the red; Tunisia's sit inside a white disc."],
    [['Vietnam', 'China'], 'Vietnam has one big yellow star; China has one big and four small ones.'],
    [['Cuba', 'Bahamas'], 'Cuba has a red triangle and blue stripes; the Bahamas a black triangle and aquamarine and gold.'],
    [['Kuwait', 'United Arab Emirates'], 'Kuwait has a black shape at the pole; the United Arab Emirates a red stripe.'],
    [['Colombia', 'Romania'], "Colombia's stripes lie flat, with yellow taking up the top half."]];
  const LV = [
    { name: 'Easy', desc: 'Famous flags, very different choices. 12 seconds a flag.', n: 12, t: 12 },
    { name: 'Medium', desc: 'All 80 flags, choices from the same continent. 9 seconds.', n: 15, t: 9 },
    { name: 'Hard', desc: 'Look-alike flags: Chad or Romania? Norway or Iceland? 8 seconds.', n: 15, t: 8 }
  ];
  const CSS = `.fm-sky{position:relative;flex:1;width:100%;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden}
.fm-cloud{position:absolute;height:22px;border-radius:20px;background:rgba(255,255,255,.07);animation:fmcl linear infinite}
@keyframes fmcl{from{transform:translateX(-160px)}to{transform:translateX(1400px)}}
.fm-mast{position:relative;display:flex;align-items:flex-start;padding-top:10px}
.fm-pole{width:7px;border-radius:4px;background:linear-gradient(90deg,#9aa3b8,#eef1f8 40%,#6b7388);position:relative;margin-right:-1px}
.fm-pole:before{content:'';position:absolute;top:-10px;left:-4px;width:15px;height:15px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff7c2,#ffd23f 50%,#b88a00)}
.fm-flag{position:relative;filter:drop-shadow(0 8px 14px rgba(0,0,0,.45));animation:fmin .55s cubic-bezier(.2,1.3,.4,1) both}
.fm-flag.out{animation:fmout .45s ease-in forwards}.fm-flag.bad{animation:shake .35s}
@keyframes fmin{from{transform:translateX(70vw) rotate(10deg);opacity:0}}@keyframes fmout{to{transform:translateY(-140%) rotate(-8deg);opacity:0}}
.fm-sl{position:absolute;top:0;height:100%;overflow:hidden;animation:fmw 1.5s ease-in-out infinite}
.fm-sl>div{position:absolute;top:0;height:100%}
@keyframes fmw{0%,100%{transform:translateY(calc(var(--a)*-1));filter:brightness(1.07)}50%{transform:translateY(var(--a));filter:brightness(.86)}}
.fm-fuse{width:min(100%,380px);height:8px;border-radius:6px;background:var(--bg2);border:1px solid var(--edge);overflow:hidden;margin-top:8px}
.fm-fuse i{display:block;height:100%;background:linear-gradient(90deg,var(--c2),var(--c));transform-origin:left}
.fm-info{min-height:44px;margin-top:6px;text-align:center;font-weight:700;color:var(--muted);max-width:560px;font-size:clamp(13px,2vw,16px)}
.fm-info b{color:var(--text)}.fm-info .tip{display:block;color:var(--gold);font-size:13px;margin-top:2px}
.fm-play .opts{margin-top:6px}.fm-play .opt{min-height:clamp(50px,8vh,72px);font-size:clamp(15px,2.6vw,22px)}`;
  Edu.game({
    id: 'flag-master', levels: LV,
    how: ['A flag flies in on the pole. Pick its country from the four choices: click, tap, or press 1 to 4.',
      'Answer before the fuse under the flag burns down. Faster answers score more.',
      'A wrong answer or running out of time costs one of your three lives.',
      'After each flag you see its continent and capital. Get through every flag to clear the level.'],
    start(c) {
      if (!document.getElementById('fm-css')) document.head.append(h('style', { id: 'fm-css', text: CSS }));
      const L = c.L, sky = h('div', { class: 'fm-sky' }), fuse = h('div', { class: 'fm-fuse' }, h('i')), info = h('div', { class: 'fm-info' }), area = h('div', { style: { width: '100%', display: 'flex', justifyContent: 'center' } });
      for (let i = 0; i < 4; i++) sky.append(h('div', { class: 'fm-cloud', style: { top: (8 + i * 22) + '%', width: (60 + i * 25) + 'px', animationDuration: (26 + i * 9) + 's', animationDelay: -(i * 7) + 's' } }));
      c.el.classList.add('fm-play'); c.el.append(sky, fuse, info, area);
      c.lives(3); c.k = 0; c.seen = new Set(); c.missed = []; c.facts = [];
      const pool = c.level === 0 ? EASY.map(get) : FL;
      const groupsOf = n => LOOK.filter(g => g.includes(n));
      function options(t) {
        let others;
        if (c.level === 0) { const near = new Set(groupsOf(t.name).flat()); others = sample(pool.filter(x => !near.has(x.name)), 3); }
        else if (c.level === 1) { others = sample(FL.filter(x => x !== t && x.ct === t.ct), 2); others.push(pick(FL.filter(x => x !== t && !others.includes(x)))); }
        else { const g = pick(groupsOf(t.name)); others = sample(g.filter(n => n !== t.name), 3).map(get);
          while (others.length < 3) { const x = pick(FL); if (x !== t && !others.includes(x)) others.push(x); } }
        return shuffle([t, ...others]);
      }
      function drawFlag(t) {
        const r = sky.getBoundingClientRect(), ratio = t.flag[0] / t.flag[1];
        let fh = Math.min(r.height - 34, 210, (Math.min(r.width, 520) - 40) / ratio), fw = fh * ratio;
        const mast = h('div', { class: 'fm-mast' }), pole = h('div', { class: 'fm-pole', style: { height: (fh + 70) + 'px' } }),
          fl = h('div', { class: 'fm-flag', style: { width: fw + 'px', height: fh + 'px' } }), N = 12;
        for (let i = 0; i < N; i++) fl.append(h('div', { class: 'fm-sl', style: { left: (i * fw / N) + 'px', width: (fw / N + 1) + 'px', animationDelay: -(i * .11) + 's', '--a': (i / N * Math.max(3, fh * .045)).toFixed(1) + 'px' } },
          h('div', { style: { left: -(i * fw / N) + 'px', width: fw + 'px' }, html: flagSVG(t.flag) })));
        mast.append(pole, fl); [...sky.querySelectorAll('.fm-mast')].forEach(m => m.remove()); sky.append(mast); c.flagEl = fl;
      }
      const tipFor = (a, b) => (TIPS.find(([n]) => n.includes(a) && n.includes(b)) || TIPS.find(([n]) => n[0] === a) || [])[1];
      const finish = () => {
        const won = c.lives_ > 0, learnt = [...new Set(c.missed)].slice(0, 3);
        for (const f of shuffle(c.facts)) if (learnt.length < 4 && !learnt.includes(f)) learnt.push(f);
        c.end({ won, title: won ? 'Flags mastered!' : 'Out of lives', msg: won ? `You named ${c.k} flags.` : 'Each wrong flag costs a life. Try again: the tips below help.', stats: { Flags: c.k + ' / ' + L.n }, learnt });
      };
      function next() {
        if (c.k >= L.n || c.lives_ <= 0) return finish();
        let t, tries = 0; do t = pick(c.level === 2 ? FL.filter(x => groupsOf(x.name).length) : pool); while (c.seen.has(t.name) && ++tries < 50); c.seen.add(t.name);
        c.t = t; c.opts = options(t); c.left = L.t; c.busy = false; info.innerHTML = '&nbsp;'; area.innerHTML = '';
        drawFlag(t); c.hud({ flag: (c.k + 1) + ' / ' + L.n });
        c.ch = c.choices(area, c.opts.map(o => o.name), i => answer(i), { cols: 2 });
      }
      function answer(i) {
        if (c.busy) return; c.busy = true; c.ch.lock(); const t = c.t, ok = i >= 0 && c.opts[i] === t, ci = c.opts.indexOf(t);
        const b = c.ch.btns[i >= 0 ? i : ci].getBoundingClientRect(), s = c.el.getBoundingClientRect(), x = b.left - s.left + b.width / 2, y = b.top - s.top;
        const fact = `${t.name}: ${ctName(t)}${t.cap ? ', capital ' + t.cap : ''}.`; c.facts.push(fact); c.k++;
        info.innerHTML = ''; info.append(h('b', { text: (ok ? '✓ ' : '✗ ') + t.name }), ' · ' + ctName(t) + (t.cap ? ' · capital ' + t.cap : ''));
        if (ok) { c.ch.mark(i, true); c.right(10 + Math.round(10 * c.left / L.t), x, y); c.flagEl.classList.add('out'); c.after(750, next); }
        else { if (i >= 0) c.ch.mark(i, false); c.ch.mark(ci, true); c.wrong(x, y, i < 0 ? "Time's up!" : 'Not this one'); c.lose(); c.flagEl.classList.add('bad');
          const tip = tipFor(t.name, i >= 0 ? c.opts[i].name : ''); if (tip) { info.append(h('span', { class: 'tip', text: tip })); c.missed.push(tip); } else c.missed.push(fact);
          c.after(tip ? 1700 : 1200, next); }
      }
      c.loop(dt => { if (c.busy || !c.t) return; c.left -= dt * Edu.SPEED; fuse.firstChild.style.transform = `scaleX(${Math.max(0, c.left / L.t)})`; if (c.left <= 0) answer(-1); });
      c.after(60, next);
    },
    bot(c) { if (c.ch && !c.busy) c.ch.btns[c.opts.indexOf(c.t)].click(); },
    miss(c) { if (c.ch && !c.busy) c.ch.btns[c.opts.findIndex(o => o !== c.t)].click(); }
  });
})();
