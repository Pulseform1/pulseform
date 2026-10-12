// Ninth Bell (3D) — game rules, calendar, social links and the UI layered over the 3D scenes.
import {ELEMENTS, EL_NAME, SKILLS, PERSONAS, ALLIES, LINKS, ENEMIES, BOSSES, ITEMS, SOCIAL, SOCIAL_NEXT,
  LAST_DAY, SAVE_KEY, WEEKDAYS, PARTY, COLORS} from './data.js';

// ───────────────────────── DOM HELPERS ─────────────────────────
const $ = id=>document.getElementById(id);
const $screen=$('screen'), $hud=$('hud'), $bhud=$('bhud'), $modal=$('modal');
function h(tag, props, ...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(props||{})){
    if(v==null || v===false) continue;
    if(k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if(k==='class') e.className=v;
    else if(k==='style') e.style.cssText=v;
    else if(k==='disabled') e.disabled=!!v;
    else e.setAttribute(k,v);
  }
  for(const c of kids.flat()){ if(c==null||c===false) continue; e.append(c.nodeType?c:document.createTextNode(String(c))); }
  return e;
}
const btn = (label, fn, opts={}) => h('button', {class:'big '+(opts.cls||''), onclick:fn, disabled:opts.disabled}, label);
const slant = t=>h('div',{class:'slant'},h('span',null,t));
const bar = (v,m,cls='')=>h('div',{class:'bar '+cls},h('i',{style:`width:${Math.max(0,Math.min(100,v/m*100))}%`}));
const rand = (a,b)=>a+Math.random()*(b-a);
const pick = arr=>arr[Math.floor(Math.random()*arr.length)];

let world=null;
function setMode(m){ $screen.hidden=m!=='menu'; $hud.hidden=m!=='tower'; $bhud.hidden=m!=='battle'; }
function show(...nodes){
  setMode('menu'); closeModal();
  $screen.replaceChildren(h('div',{class:'sheet'},...nodes)); $screen.scrollTop=0;
}
function backdrop(id='mc'){ if(!world) return; world.hub.set(S?S.time:'evening', id); world.setView(world.hub); }
function modal(...nodes){ $modal.replaceChildren(h('div',{class:'panel modalbox'},...nodes)); $modal.hidden=false; }
function closeModal(){ $modal.hidden=true; $modal.classList.remove('low'); $modal.replaceChildren(); }

// ───────────────────────── STATE ─────────────────────────
let S=null, B=null, D=null;
function newGame(){
  S={day:1, time:'day', lv:1, xp:0, yen:1000,
    stats:{courage:1,knowledge:1,charm:1}, statPts:{courage:0,knowledge:0,charm:0},
    links:{}, personas:['lantern','mistral'], active:'lantern',
    items:{medicine:3, soul:1, bead:0}, hp:{}, sp:{}, known:{}, bossesBeaten:0, cleared:false};
  for(const k in LINKS) S.links[k]={rank:0, pts:0};
  restoreParty();
}
const maxHP = id=>80 + S.lv*10 + (ALLIES[id]?.hpBonus||0);
const maxSP = id=>30 + S.lv*5 + (id==='mc' ? S.stats.knowledge*6 : 0);
function restoreParty(){ for(const id of PARTY){ S.hp[id]=maxHP(id); S.sp[id]=maxSP(id); } }
const weekday = ()=>(S.day-1)%7;
function dateLabel(){ const d=new Date(2026,3,6+S.day-1); return `${d.getMonth()+1}/${d.getDate()}`; }
const linkRank = id=>S.links[id].rank;
const memberName = id=>id==='mc' ? 'You' : ALLIES[id].name;
const does = (id, verb)=>id==='mc' ? verb.slice(0,-1) : verb;   // "You attack" / "Rin attacks"
function memberStats(id){
  if(id==='mc'){ const p=PERSONAS[S.active]; return {str:p.str+S.lv, mag:p.mag+S.lv, weak:p.weak, res:p.res, skills:p.skills}; }
  const a=ALLIES[id], r=linkRank(id);
  return {str:a.str+S.lv+(a.str>a.mag?r:0), mag:a.mag+S.lv+(a.mag>a.str?r:0), weak:a.weak, res:a.res,
    skills:a.learn.filter(([,lv])=>lv<=S.lv).map(([k])=>k)};
}
function gainSocial(k, n){
  S.statPts[k]+=n; const msgs=[];
  while(S.stats[k]<5 && S.statPts[k]>=SOCIAL_NEXT[S.stats[k]]){
    S.statPts[k]-=SOCIAL_NEXT[S.stats[k]]; S.stats[k]++; msgs.push(`${SOCIAL[k]} rose to rank ${S.stats[k]}!`);
  }
  return msgs;
}
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); return true; }catch(e){ return false; } }
function loadSave(){ try{ const raw=localStorage.getItem(SAVE_KEY); return raw?JSON.parse(raw):null; }catch(e){ return null; } }

function header(){
  const left=LAST_DAY-S.day;
  return h('div',{class:'panel hdr'},
    h('div',null,
      h('div',{class:'date'}, dateLabel(), h('small',null, WEEKDAYS[weekday()]+' · '+(S.time==='day'?'After School':'Evening'))),
      h('div',{class:'moon small'}, left>0?`🌕 Full moon in ${left} day${left>1?'s':''}`:'🌕 The moon is full tonight')),
    h('div',{class:'small dim',style:'text-align:right'}, `Lv ${S.lv} · ¥${S.yen.toLocaleString()}`, h('br'),
      Object.keys(SOCIAL).map(k=>`${SOCIAL[k][0]}${S.stats[k]}`).join(' · ')));
}

// ───────────────────────── TITLE / INTRO ─────────────────────────
function titleScreen(){
  S=S||null; backdrop('mc');
  const existing=loadSave();
  show(h('div',{class:'title'},
    h('h1',{class:'logo'},'NINTH BELL'),
    h('p',{class:'dim'},'When the bell tolls nine at midnight, the Tower rises.'),
    h('div',{class:'menu'},
      existing && btn('Continue', ()=>{ S=existing; hub(); }, {cls:'hot'}),
      btn('New Game', ()=>{ newGame(); intro(); }, {cls:existing?'':'hot'}),
      btn('How to play', howTo),
      h('a',{class:'small dim',href:'classic.html'},'Play the classic 2D version'))));
}
function howTo(){
  show(h('div',{class:'panel'}, slant('How to play'),
    h('ul',null,
      h('li',null,'You have 30 days. On the 30th night the Pale Monarch awakens at the top of the Tower.'),
      h('li',null,'After school: spend time with friends (Social Links) or raise Courage, Knowledge and Charm.'),
      h('li',null,'Evening: explore the Tower. Move with WASD or the arrow keys (on a phone, drag the left side of the screen). Drag the screen or press Q/E to turn the camera.'),
      h('li',null,'Strike a Shadow first (Space or ⚔) for a Player Advantage. If one catches you from behind, the enemy strikes first.'),
      h('li',null,'In battle, hit WEAKNESSES or land CRITICALS to knock enemies down and get ONE MORE action. Knock them all down for an ALL-OUT ATTACK.'),
      h('li',null,'Social Link ranks unlock new Personas. Switch Personas mid-battle to exploit weaknesses.'),
      h('li',null,'If you fall, it\'s game over.')),
    btn('Back', titleScreen)));
}
function intro(){
  dialogue({name:'???', color:'#B66BFF', initial:'?'},
    ['Welcome, newcomer. You arrive at Kurogane High on a quiet April day.',
     'At midnight a bell tolls nine times — and a Tower climbs out of the school grounds.',
     'Inside, a mask forms on your face. A voice answers: "I am Lantern. I am thou."',
     'Rin and Kaito saw it too. In thirty days the moon will be full, and something will wake at the top.'],
    ()=>{ save(); hub(); });
}

// ───────────────────────── DIALOGUE ─────────────────────────
function dialogue(who, lines, done, choices, modelId){
  backdrop(modelId && world?.chars[modelId] ? modelId : 'mc');
  let i=0;
  const render=()=>{
    const last=i===lines.length-1;
    setMode('menu');
    $screen.replaceChildren(h('div',{class:'dialogue'},
      h('div',{class:'namebox',style:`--c:${who.color}`}, who.name),
      h('div',{class:'speech'}, lines[i]),
      h('div',{class:'choices'},
        last && choices ? choices.map(([t,v])=>btn(t,()=>done(v)))
          : btn(last?'▶':'▶ Next', ()=>{ if(last) done(); else { i++; render(); } }))));
  };
  render();
}

// ───────────────────────── HUB / CALENDAR ─────────────────────────
function linkAvailable(id){
  const L=LINKS[id];
  if(!L.days.includes(weekday())) return {ok:false, why:'Not around today'};
  if(L.req && S.stats[L.req[0]]<L.req[1]) return {ok:false, why:`Needs ${SOCIAL[L.req[0]]} ${L.req[1]}`};
  return {ok:true};
}
function hub(note){
  if(S.cleared) return ending();
  if(S.day===LAST_DAY && S.time==='evening') return finalNight();
  backdrop('mc');
  const kids=[header()];
  if(note) kids.push(h('div',{class:'panel flash'}, ...[].concat(note).map(n=>h('div',null,n))));
  const opt=(label,sub,fn,dis)=>h('button',{onclick:fn,disabled:dis},label,h('br'),h('span',{class:'small dim'},sub));
  if(S.time==='day'){
    kids.push(h('div',{class:'panel'}, slant('Social Links'),
      h('div',{class:'grid'}, Object.keys(LINKS).map(id=>{
        const L=LINKS[id], av=linkAvailable(id), r=S.links[id].rank;
        return h('button',{onclick:()=>hangout(id), disabled:!av.ok},
          h('b',{style:`color:${L.color}`},L.name), h('br'),
          h('span',{class:'small dim'},`${L.arcana} · `), h('span',{class:'pips small'},'★'.repeat(r)+'☆'.repeat(5-r)),
          h('br'), h('span',{class:'small dim'}, av.ok?L.blurb:av.why));
      }))));
    kids.push(h('div',{class:'panel'}, slant('Around Town'),
      h('div',{class:'grid'},
        opt('📚 Library','Knowledge ↑',()=>activity('You hit the books until closing.',{knowledge:2})),
        opt('☕ Café shift','Charm ↑ · +¥1,500',()=>activity('Smiling at customers for four hours pays off.',{charm:2},1500)),
        opt('🏫 Rooftop dare','Courage ↑',()=>activity('You stand at the edge of the roof and don\'t flinch.',{courage:2})))));
  } else {
    kids.push(h('div',{class:'panel'}, slant('Tonight'),
      btn('🗼 Enter the Tower', enterTower, {cls:'hot'}),
      h('div',{class:'grid'},
        opt('✏️ Study at desk','Knowledge ↑',()=>activity('You study at your desk until the bell nearly tolls.',{knowledge:2})),
        opt('🕹️ Arcade','Courage ↑ · −¥300',()=>activity('You beat the horror game\'s final boss.',{courage:2},-300), S.yen<300),
        opt('🛏️ Sleep early','Nothing happens',()=>activity('You turn in early.',{})))));
  }
  kids.push(h('div',{class:'panel row'},
    h('button',{onclick:shop},'🏪 Gen\'s Shop'),
    h('button',{onclick:statusScreen},'🎭 Status & Personas'),
    h('button',{onclick:()=>hub(save()?'Game saved.':'Saving is unavailable in this browser.')},'💾 Save'),
    h('button',{onclick:titleScreen},'⏏ Title')));
  show(...kids);
}
function passTime(notes){
  notes=[].concat(notes||[]);
  if(S.time==='day') S.time='evening';
  else { S.time='day'; S.day++; restoreParty(); notes.push('A new day begins. Your party is fully rested.'); save(); }
  hub(notes);
}
function activity(text, gains, yen=0){
  S.yen+=yen; const notes=[text];
  for(const k in gains) notes.push(...gainSocial(k, gains[k]));
  if(yen>0) notes.push(`Earned ¥${yen.toLocaleString()}.`);
  passTime(notes);
}
function hangout(id){
  const L=LINKS[id], st=S.links[id], who={name:L.name, color:L.color};
  if(st.rank>=5) return dialogue(who, ['You spend a relaxed afternoon together. Your bond is as strong as it gets.'], ()=>passTime([]), null, id);
  const sc=L.scenes[st.rank];
  dialogue(who, sc.lines, v=>{
    const notes=[];
    if(st.rank===0){ st.rank=1; notes.push(`New Social Link: ${L.arcana} — ${L.name}!`); }
    else {
      st.pts += v + (S.stats.charm>=3?1:0);
      if(v>=2) notes.push(`${L.name} seems happy with your answer.`);
      if(st.pts>=3){ st.pts=0; st.rank++; notes.push(`★ ${L.arcana} rank up! (Rank ${st.rank})`); }
      else notes.push('You feel your bond deepening…');
    }
    const p=L.unlock[st.rank];
    if(p && !S.personas.includes(p)){ S.personas.push(p); notes.push(`🎭 New Persona unlocked: ${PERSONAS[p].name} (${PERSONAS[p].arcana})!`); }
    passTime(notes);
  }, sc.choices, id);
}

// ───────────────────────── SHOP / STATUS ─────────────────────────
const priceOf = k=>Math.round(ITEMS[k].price*(1-0.08*linkRank('gen')));
function shop(note){
  show(header(), h('div',{class:'panel'}, slant('Gen\'s Shop'),
    note && h('p',{class:'toast'}, note),
    h('p',{class:'dim small'}, linkRank('gen')>0?`Hermit rank ${linkRank('gen')} discount: ${linkRank('gen')*8}%`:'Rank up with Old Gen for discounts.'),
    Object.keys(ITEMS).map(k=>h('div',{class:'row shoprow'},
      h('div',null, h('b',null,ITEMS[k].name), ` ×${S.items[k]}`, h('br'), h('span',{class:'small dim'},ITEMS[k].desc)),
      h('button',{disabled:S.yen<priceOf(k), onclick:()=>{ S.yen-=priceOf(k); S.items[k]++; shop(`Bought ${ITEMS[k].name}.`); }}, `¥${priceOf(k)}`))),
    btn('Leave', ()=>hub())));
}
function affRow(weak,res,nul=[]){
  return h('div',{class:'aff'}, ELEMENTS.map(e=>{
    const c=weak.includes(e)?'w':nul.includes(e)?'n':res.includes(e)?'r':'';
    const t=weak.includes(e)?'Wk':nul.includes(e)?'Nul':res.includes(e)?'Res':'–';
    return h('span',{class:c},`${EL_NAME[e]} ${t}`);
  }));
}
function statusScreen(){
  show(header(),
    h('div',{class:'panel'}, slant('Party'),
      h('div',{class:'grid'}, PARTY.map(id=>{
        const m=memberStats(id);
        return h('div',{class:'card'}, h('b',null,memberName(id)),
          h('div',{class:'small dim'},`HP ${S.hp[id]}/${maxHP(id)} · SP ${S.sp[id]}/${maxSP(id)}`),
          h('div',{class:'small'},`St ${m.str} · Ma ${m.mag}`),
          h('div',{class:'small dim'}, m.skills.map(k=>SKILLS[k].name).join(', ')));
      })),
      h('p',{class:'small dim'},`Level ${S.lv} · XP ${S.xp}/${S.lv*25}`)),
    h('div',{class:'panel'}, slant('Personas'), h('p',{class:'small dim'},'Choose which Persona you start battles with.'),
      h('div',{class:'grid'}, S.personas.map(k=>{
        const p=PERSONAS[k];
        return h('button',{class:k===S.active?'card active':'card', onclick:()=>{ S.active=k; statusScreen(); }},
          h('b',null,p.name), h('span',{class:'small dim'},` ${p.arcana}`),
          h('div',{class:'small'},`St ${p.str+S.lv} · Ma ${p.mag+S.lv}`),
          h('div',{class:'small dim'}, p.skills.map(s=>SKILLS[s].name).join(', ')), affRow(p.weak,p.res));
      }))),
    h('div',{class:'panel'}, slant('Social Stats'),
      Object.keys(SOCIAL).map(k=>h('div',{class:'stat'}, SOCIAL[k], h('span',{class:'pips'},'★'.repeat(S.stats[k])+'☆'.repeat(5-S.stats[k]))))),
    btn('Back', ()=>hub()));
}

// ───────────────────────── THE TOWER ─────────────────────────
function enterTower(){ D={floor:S.bossesBeaten>=1?6:1}; buildFloor(); }
function buildFloor(){
  const f=D.floor;
  world.tower.build(f, {
    arena: f===5, bossName:'Gatekeeper', bossCleared: f===5 && S.bossesBeaten>=1,
    sealed: f===9 && S.day<LAST_DAY,
    callbacks:{onEncounter, onStairs, onChest},
  });
  world.setView(world.tower); setMode('tower'); closeModal(); renderHud();
  towerMsg(f===5 && S.bossesBeaten<1 ? 'Floor 5 — something enormous waits here.' : `Floor ${f}`);
}
function towerMsg(t){
  const el=$('towermsg'); el.textContent=t; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function renderHud(){
  $('floorlabel').replaceChildren(h('b',null,`THE TOWER · ${D.floor}F`), h('div',{class:'small dim'},`${dateLabel()} ${WEEKDAYS[weekday()]} · Lv ${S.lv}`));
  $('hudparty').replaceChildren(...PARTY.map(id=>h('div',{class:'mini'+(S.hp[id]<=0?' ko':'')},
    h('b',{style:`color:${COLORS[id]}`},memberName(id)), bar(S.hp[id],maxHP(id)), bar(S.sp[id],maxSP(id),'sp'))));
}
function onEncounter(shadow, adv, isBoss){
  const enemies = isBoss ? [spawn(BOSSES[D.floor], D.floor)] : makeEncounter(D.floor);
  startBattle(enemies, isBoss?null:adv, ()=>{
    if(isBoss){ S.bossesBeaten=1; save(); buildFloor(); towerMsg('The Gatekeeper crumbles. The way up is open.'); return; }
    world.tower.removeShadow(shadow);
    world.setView(world.tower); world.tower.resume(); setMode('tower'); renderHud();
  });
}
function onStairs(sealed){
  if(sealed){
    modal(h('p',null,'A sealed door. Something sleeps beyond it — it will wake on the night of the full moon.'),
      btn('Step back', ()=>{ closeModal(); world.tower.resume(); }));
    return;
  }
  modal(h('p',null,`Climb to floor ${D.floor+1}?`),
    btn('⬆ Climb', ()=>{ D.floor++; buildFloor(); }, {cls:'hot'}),
    btn('Not yet', ()=>{ closeModal(); world.tower.resume(); }));
}
function onChest(){
  let msg;
  if(Math.random()<.5){ const y=Math.round(rand(80,180)*D.floor); S.yen+=y; msg=`Found ¥${y}!`; }
  else { const k=pick(['medicine','medicine','soul','bead']); S.items[k]++; msg=`Found a ${ITEMS[k].name}!`; }
  towerMsg(msg);
}
function towerItems(){
  world.tower.pause();
  const avail=Object.keys(ITEMS).filter(k=>S.items[k]>0);
  const close=()=>{ closeModal(); world.tower.resume(); renderHud(); };
  modal(slant('Items'),
    avail.length ? avail.map(k=>btn(`${ITEMS[k].name} ×${S.items[k]} — ${ITEMS[k].desc}`, ()=>{
      modal(slant(`Use ${ITEMS[k].name} on…`), PARTY.map(id=>btn(`${memberName(id)} — HP ${S.hp[id]}/${maxHP(id)} · SP ${S.sp[id]}/${maxSP(id)}`, ()=>{
        const m={hp:S.hp[id],max:maxHP(id),sp:S.sp[id],maxsp:maxSP(id)};
        if(!ITEMS[k].use(m)){ towerMsg('It would have no effect.'); return close(); }
        ITEMS[k].fx(m); S.hp[id]=m.hp; S.sp[id]=m.sp; S.items[k]--; towerMsg(`Used ${ITEMS[k].name} on ${memberName(id)}.`); close();
      })), btn('Cancel', close));
    })) : h('p',{class:'dim'},'No items.'),
    btn('Close', close));
}
function leaveTower(){
  world.tower.pause();
  modal(h('p',null,'Leave the Tower? This ends the night.'),
    btn('🚪 Leave', ()=>{ D=null; closeModal(); passTime(['You slip out of the Tower before dawn.']); }, {cls:'hot'}),
    btn('Stay', ()=>{ closeModal(); world.tower.resume(); }));
}
$('btnItems').onclick=towerItems; $('btnLeave').onclick=leaveTower; $('btnStrike').onclick=()=>world?.tower.strike();

function spawn(def, floor){
  const sc=def.boss?1:1+0.3*(floor-1), hp=Math.round(def.hp*sc);
  return {...def, hp, max:hp, str:def.str+(def.boss?0:floor*1.2), mag:def.mag+(def.boss?0:floor*1.2),
    xp:Math.round(def.xp*sc), yen:Math.round(def.yen*sc), down:false};
}
function makeEncounter(floor){
  const pool=ENEMIES.filter(e=>floor>=e.f[0] && floor<=e.f[1]);
  const n = floor<3 ? (Math.random()<.5?1:2) : 1+Math.floor(Math.random()*3);
  const out=[]; for(let i=0;i<n;i++) out.push(spawn(pick(pool),floor));
  const counts={}; out.forEach(e=>{counts[e.name]=(counts[e.name]||0)+1;});
  const seen={}; out.forEach(e=>{ if(counts[e.name]>1){ seen[e.name]=(seen[e.name]||0)+1; e.base=e.name; e.name+=' '+'ABC'[seen[e.name]-1]; } });
  return out;
}
function finalNight(){
  dialogue({name:'The Ninth Bell', color:'#FFD23F'},
    ['The moon hangs full and white. The bell tolls nine times… then a tenth.',
     'The sealed door at the top of the Tower swings open.',
     'Rin grips your shoulder. Kaito forces a grin. There is no turning back.'],
    ()=>startBattle([spawn(BOSSES[10],10)], null, ()=>{ S.cleared=true; save(); ending(); }));
}
function ending(){
  backdrop('mc');
  show(h('div',{class:'title'}, h('h1',{class:'logo',style:'font-size:40px'},'THE BELL IS SILENT'),
    h('div',{class:'panel',style:'text-align:left'},
      h('p',null,'The Pale Monarch shatters into moonlight. When you open your eyes, it is morning, and the Tower is gone.'),
      h('p',null,'Rin is already arguing with Kaito about who landed the final blow. Mira is waiting at the gate. Gen has tea ready.'),
      h('p',{class:'dim small'},`Finished at level ${S.lv} on day ${S.day}.`),
      Object.keys(LINKS).map(id=>h('div',{class:'small'},`${LINKS[id].name}: rank ${S.links[id].rank}`))),
    btn('Back to title', ()=>{ try{localStorage.removeItem(SAVE_KEY);}catch(e){} S=null; titleScreen(); }, {cls:'hot'})));
}

// ───────────────────────── BATTLE ─────────────────────────
const stage = ()=>world.stage;
const ekey = e=>'e'+e.idx;
const actorId = ()=>PARTY[B.turn];
const aliveEnemies = ()=>B.enemies.filter(e=>e.hp>0);
const aliveParty = ()=>PARTY.filter(id=>B.p[id].hp>0);
function blog(t){ B.log.push(t); const el=$('blog'); el.textContent=t; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }

function startBattle(enemies, adv, onWin){
  closeModal();
  enemies.forEach((e,i)=>{ e.idx=i; e.key=e.base||e.name; e.look=e.base||e.name; if(!S.known[e.key]) S.known[e.key]={}; });
  const p={};
  for(const id of PARTY) p[id]={id, hp:S.hp[id], max:maxHP(id), sp:S.sp[id], maxsp:maxSP(id), down:false, guard:false};
  B={enemies, p, turn:-1, phase:'busy', pending:null, switched:false, onWin, log:[], skipEnemy:adv==='player'};
  world.setView(stage()); stage().enter(PARTY, enemies); setMode('battle');
  document.body.classList.add('transition'); setTimeout(()=>document.body.classList.remove('transition'), 600);
  renderBattleUI();
  blog(enemies.some(e=>e.boss) ? `${enemies[0].name} blocks the way!` : `Shadows appear: ${enemies.map(e=>e.name).join(', ')}!`);
  (async()=>{
    await world.wait(.8);
    if(adv==='player') await world.banner('PLAYER ADVANTAGE!','adv');
    if(adv==='enemy'){ await world.banner('ENEMY ADVANTAGE!','eadv'); return enemyPhase(); }
    nextActor();
  })();
}

function hit(srcStat, target, el, pow, isParty, critBonus=0){
  const aff = isParty ? memberStats(target.id) : target;
  const weak=aff.weak.includes(el), nul=(aff.nul||[]).includes(el), res=aff.res.includes(el);
  if(!isParty) S.known[target.key][el] = weak?'w':nul?'n':res?'r':'-';
  if(nul) return {dmg:0, tag:'NULL', knock:false};
  let mult=1, tag='';
  if(weak){ mult=1.5; tag='WEAK!'; }
  else if(res){ mult=.5; tag='resist'; }
  else if(el==='phys' && Math.random()<.08+critBonus){ mult=1.6; tag='CRITICAL!'; }
  if(target.guard){ mult*=.5; if(tag!=='resist') tag=''; }
  const dmg=Math.max(1, Math.round(pow*(1+srcStat/15)*rand(.9,1.1)*mult));
  target.hp-=dmg;
  const knock=(tag==='WEAK!'||tag==='CRITICAL!') && !target.down && target.hp>0;
  if(knock) target.down=true;
  return {dmg, tag, knock, dead:target.hp<=0};
}
const fmt = (name, r)=>`${name} ${r.tag==='NULL'?'nullifies it':'−'+r.dmg}${r.tag&&r.tag!=='NULL'?' '+r.tag:''}${r.knock?' ⬇DOWN':''}${r.dead?' ✖':''}`;

async function nextActor(){
  if(checkEnd()) return;
  B.switched=false;
  while(true){
    B.turn++;
    if(B.turn>=PARTY.length) return enemyPhase();
    const m=B.p[actorId()];
    if(m.hp<=0) continue;
    if(m.guard){ m.guard=false; stage().setGuard(m.id,false); }
    if(m.down){ m.down=false; blog(`${memberName(m.id)} ${does(m.id,'gets')} back up.`); await stage().getUp(m.id); continue; }
    break;
  }
  stage().focus(actorId()); B.phase='cmd'; renderBattleUI();
}
function cardFor(id){
  if(id==='mc'){ const p=PERSONAS[S.active]; return {title:p.name, sub:p.arcana, color:COLORS.mc}; }
  return {title:memberName(id), sub:LINKS[id]?.arcana||'', color:COLORS[id]};
}
async function doSkill(id, key, target){
  const sk=SKILLS[key], m=B.p[id], st=memberStats(id);
  if(sk.hp) m.hp-=sk.hp; if(sk.sp) m.sp-=sk.sp;
  renderBattleUI();
  if(sk.heal){
    const amt=Math.round(sk.heal*(1+st.mag/30));
    const tg = sk.target==='allies' ? aliveParty() : [target];
    tg.forEach(t=>{ B.p[t].hp=Math.min(B.p[t].max, B.p[t].hp+amt); });
    blog(`${memberName(id)} ${does(id,'casts')} ${sk.name}: +${amt} HP${tg.length>1?' to all':' to '+memberName(target)}.`);
    await stage().heal(id, tg.map(t=>({key:t, r:{heal:amt}})), cardFor(id));
    return false;
  }
  const stat = sk.el==='phys'?st.str:st.mag;
  const tg = sk.target==='all' ? aliveEnemies() : [target];
  const results = tg.map(e=>({e, key:ekey(e), r:hit(stat, e, sk.el, sk.pow, false, id==='mc'?S.stats.courage*.03:0)}));
  blog(`${memberName(id)} ${does(id,'uses')} ${sk.name}! ${results.map(x=>fmt(x.e.name,x.r)).join(' · ')}`);
  if(sk.el==='phys') await stage().attack(id, results); else await stage().cast(id, sk.el, results, cardFor(id));
  return results.some(x=>x.r.knock);
}
async function resolve(target){
  const id=actorId(), P=B.pending; B.pending=null;
  B.phase='busy'; stage().setTargeting(null); renderBattleUI();
  let more=false;
  if(P.type==='attack'){
    const r=hit(memberStats(id).str, target, 'phys', 15, false, id==='mc'?S.stats.courage*.03:0);
    blog(`${memberName(id)} ${does(id,'attacks')}! ${fmt(target.name, r)}`);
    await stage().attack(id, [{key:ekey(target), r}]);
    more=r.knock;
  } else if(P.type==='skill'){
    more=await doSkill(id, P.key, target);
  } else if(P.type==='item'){
    const m=B.p[target], it=ITEMS[P.key];
    if(!it.use(m)){ blog('It would have no effect.'); B.phase='cmd'; return renderBattleUI(); }
    const before=m.hp, wasKO=m.hp<=0; it.fx(m); S.items[P.key]--;
    blog(`${memberName(id)} ${does(id,'uses')} ${it.name} on ${memberName(target)}.`);
    await stage().heal(id, [{key:target, r:{heal:Math.max(0,m.hp-Math.max(0,before))||'SP'}, revive:wasKO}], null);
  }
  renderBattleUI();
  afterPartyAction(more);
}
async function afterPartyAction(more){
  if(checkEnd()) return;
  const alive=aliveEnemies();
  if(alive.length && alive.every(e=>e.down)){
    await world.cutIn(memberName(actorId()), COLORS[actorId()], 'ALL DOWN!');
    B.phase='allout'; stage().overview(); return renderBattleUI();
  }
  if(more){
    blog(`★ ONE MORE! ${memberName(actorId())} ${does(actorId(),'acts')} again.`);
    await world.cutIn(memberName(actorId()), COLORS[actorId()]);
    B.phase='cmd'; B.switched=false; stage().focus(actorId()); return renderBattleUI();
  }
  nextActor();
}
async function allOut(){
  B.phase='busy'; renderBattleUI();
  const power=aliveParty().reduce((a,id)=>a+memberStats(id).str+memberStats(id).mag, 0);
  const results=aliveEnemies().map(e=>{ const dmg=Math.round((40+power*2.2)*rand(.9,1.1)); e.hp-=dmg; e.down=false; return {e, key:ekey(e), r:{dmg, tag:'', dead:e.hp<=0}}; });
  blog(`💥 ALL-OUT ATTACK! ${results.map(x=>`${x.e.name} −${x.r.dmg}${x.r.dead?' ✖':''}`).join(' · ')}`);
  results.forEach(x=>{ if(!x.r.dead) stage().getUp(x.key); });
  await stage().allOut(results);
  nextActor();
}
async function enemyPhase(){
  B.phase='busy'; renderBattleUI(); stage().overview();
  if(B.skipEnemy){ B.skipEnemy=false; }
  else for(const e of B.enemies){
    if(e.hp<=0) continue;
    if(e.down){ e.down=false; blog(`${e.name} gets back up.`); await stage().getUp(ekey(e)); continue; }
    for(let a=0;a<(e.acts||1);a++){
      const targets=aliveParty(); if(!targets.length) break;
      const [name,el,pow,tt]=pick(e.skills);
      const tg = tt==='all'?targets:[pick(targets)];
      const results=tg.map(id=>({key:id, r:hit(el==='phys'?e.str:e.mag, B.p[id], el, pow, true)}));
      blog(`${e.name} uses ${name}! ${results.map(x=>fmt(memberName(x.key),x.r).replace(' ✖',' ✖ KO')).join(' · ')}`);
      if(el==='phys') await stage().attack(ekey(e), results); else await stage().cast(ekey(e), el, results);
      renderBattleUI();
      if(B.p.mc.hp<=0) break;
    }
    if(B.p.mc.hp<=0) break;
  }
  if(checkEnd()) return;
  B.turn=-1; nextActor();
}
function checkEnd(){
  if(B.phase==='over') return true;
  if(B.p.mc.hp<=0){ B.phase='over'; renderBattleUI(); (async()=>{ blog('Your light goes out…'); await stage().defeat(); stage().exit(); gameOver(); })(); return true; }
  if(!aliveEnemies().length){ B.phase='over'; renderBattleUI(); victory(); return true; }
  return false;
}
function writeBack(){ for(const id of PARTY){ S.hp[id]=Math.max(0,B.p[id].hp); S.sp[id]=B.p[id].sp; } }
async function victory(){
  writeBack();
  const xp=B.enemies.reduce((a,e)=>a+e.xp,0), yen=B.enemies.reduce((a,e)=>a+e.yen,0);
  S.xp+=xp; S.yen+=yen;
  const notes=[`+${xp} XP · +¥${yen}`];
  while(S.xp>=S.lv*25){
    S.xp-=S.lv*25; S.lv++;
    for(const id of PARTY) S.hp[id]=Math.min(maxHP(id), S.hp[id]+10);
    notes.push(`⬆ LEVEL UP! Party reached level ${S.lv}.`);
    for(const id in ALLIES) for(const [k,lv] of ALLIES[id].learn) if(lv===S.lv) notes.push(`${ALLIES[id].name} learned ${SKILLS[k].name}!`);
  }
  if(Math.random()<.15){ const k=pick(['medicine','soul']); S.items[k]++; notes.push(`Dropped: ${ITEMS[k].name}.`); }
  const onWin=B.onWin, final=B.enemies.some(e=>e.final);
  blog('VICTORY!');
  await world.banner('VICTORY','win',1000);
  await stage().victory();
  stage().exit(); B=null;
  if(final) return onWin();
  modal(h('div',{class:'toast'},'VICTORY'), notes.map(n=>h('div',null,n)), btn('Continue', ()=>{ closeModal(); onWin(); }, {cls:'hot'}));
  $modal.classList.add('low');   // keep the victory pose visible
}
function gameOver(){
  B=null; D=null;
  backdrop('mc');
  show(h('div',{class:'title'}, h('h1',{class:'logo',style:'font-size:44px'},'GAME OVER'),
    h('p',{class:'dim'},'Your light goes out. Without you, the others cannot go on.'),
    h('div',{class:'menu'},
      btn('Load last save', ()=>{ const s=loadSave(); if(s){ S=s; hub('You wake with a start. Was it a dream?'); } else titleScreen(); }, {cls:'hot'}),
      btn('Title', titleScreen))));
}

// ── battle input ──
function cmd(type){
  const id=actorId();
  if(type==='attack'){ B.pending={type:'attack'}; B.phase='target'; }
  else if(type==='skill') B.phase='skills';
  else if(type==='persona') B.phase='persona';
  else if(type==='item') B.phase='items';
  else if(type==='guard'){
    B.p[id].guard=true; stage().setGuard(id,true); blog(`${memberName(id)} ${does(id,'braces')} for impact.`);
    B.phase='busy'; renderBattleUI(); return nextActor();
  }
  renderBattleUI();
}
function chooseSkill(key){
  const sk=SKILLS[key]; B.pending={type:'skill', key};
  if(sk.target==='all'||sk.target==='allies') return resolve(null);
  B.phase = sk.target==='ally' ? 'allyTarget' : 'target'; renderBattleUI();
}
const knownAff = e=>{
  const k=S.known[e.key]||{};
  return '<div class="aff">'+ELEMENTS.map(el=>{ const v=k[el]; const c=v==='w'?'w':v==='r'?'r':v==='n'?'n':''; return `<span class="${c}">${EL_NAME[el]} ${v==='w'?'Wk':v==='r'?'Res':v==='n'?'Nul':v==='-'?'–':'?'}</span>`; }).join('')+'</div>';
};
function renderBattleUI(){
  if(!B) return;
  const id=actorId(), phase=B.phase;
  $('bparty').replaceChildren(...PARTY.map(pid=>{
    const m=B.p[pid];
    return h('div',{class:'pcard'+(pid===id&&phase!=='busy'?' active':'')+(m.hp<=0?' ko':''), style:`--c:${COLORS[pid]}`},
      h('div',{class:'pname'}, memberName(pid), m.down&&m.hp>0?h('i',{class:'down'},'DOWN'):null, m.guard?h('i',{class:'grd'},'GUARD'):null,
        pid==='mc'?h('span',{class:'small dim'},' '+PERSONAS[S.active].name):null),
      h('div',{class:'nums'}, h('span',null,`HP ${Math.max(0,m.hp)}`), h('span',{class:'sp'},`SP ${m.sp}`)),
      bar(m.hp,m.max), bar(m.sp,m.maxsp,'sp'));
  }));
  const back=h('button',{class:'cbtn back',onclick:()=>{ B.phase='cmd'; B.pending=null; stage().setTargeting(null); renderBattleUI(); }},'↩ Back');
  const cb=(label,fn,dis,sub)=>h('button',{class:'cbtn',onclick:fn,disabled:dis},label, sub?h('span',{class:'sub'},sub):null);
  let kids=[];
  if(phase==='cmd'){
    kids=[h('div',{class:'turn',style:`--c:${COLORS[id]}`}, id==='mc'?'Your turn':`${memberName(id)}'s turn`),
      cb('⚔️ Attack',()=>cmd('attack')),
      cb('✨ Skill',()=>cmd('skill')),
      id==='mc' && cb('🎭 Persona',()=>cmd('persona'), B.switched||S.personas.length<2),
      cb('🎒 Item',()=>cmd('item'), !Object.values(S.items).some(n=>n>0)),
      cb('🛡️ Guard',()=>cmd('guard'))];
  } else if(phase==='skills'){
    const st=memberStats(id), m=B.p[id];
    kids=[...st.skills.map(k=>{
      const sk=SKILLS[k], cost=sk.hp?`${sk.hp} HP`:`${sk.sp} SP`, can=sk.hp?m.hp>sk.hp:m.sp>=sk.sp;
      return cb(sk.name,()=>chooseSkill(k),!can,`${sk.heal?'Heal':EL_NAME[sk.el]} · ${sk.target==='all'?'all foes':sk.target==='allies'?'party':sk.target==='ally'?'ally':'1 foe'} · ${cost}`);
    }), back];
  } else if(phase==='persona'){
    kids=[...S.personas.map(k=>{ const p=PERSONAS[k];
      return cb(p.name, async()=>{ S.active=k; B.switched=true; blog(`You summon ${p.name}!`); B.phase='busy'; renderBattleUI(); await world.banner(p.name.toUpperCase(),'persona',700); B.phase='cmd'; renderBattleUI(); },
        k===S.active, `${p.arcana} · ${p.skills.map(s=>SKILLS[s].name).join(', ')}`); }), back];
  } else if(phase==='items'){
    kids=[...Object.keys(ITEMS).filter(k=>S.items[k]>0).map(k=>cb(`${ITEMS[k].name} ×${S.items[k]}`,()=>{ B.pending={type:'item',key:k}; B.phase='allyTarget'; renderBattleUI(); },false,ITEMS[k].desc)), back];
  } else if(phase==='target'){
    stage().setTargeting(e=>{ if(B.phase==='target' && e.hp>0) resolve(e); }, knownAff);
    kids=[h('div',{class:'turn'},'Choose a target'), ...aliveEnemies().map(e=>cb(e.name,()=>resolve(e))), back];
  } else if(phase==='allyTarget'){
    kids=[h('div',{class:'turn'},'Choose an ally'), ...PARTY.map(pid=>cb(memberName(pid),()=>resolve(pid), B.pending.type==='skill'&&B.p[pid].hp<=0)), back];
  } else if(phase==='allout'){
    kids=[h('div',{class:'turn hotturn'},'All enemies are down!'), h('button',{class:'cbtn allout',onclick:allOut},'💥 ALL-OUT ATTACK!'), cb('Hold back',()=>{ B.phase='busy'; renderBattleUI(); nextActor(); })];
  }
  $('cmd').replaceChildren(...kids.filter(Boolean));
  document.documentElement.style.setProperty('--cmdh', $('cmd').offsetHeight+'px');   // portrait layout stacks the party above the menu
}

// ───────────────────────── BOOT ─────────────────────────
(async()=>{
  const fill=$('loadfill'), label=$('loadlabel');
  try{
    world = await import('./world.js');
    await world.loadAll((k,l)=>{ fill.style.width=(k*100)+'%'; label.textContent=l; });
  }catch(err){
    console.error(err);
    $('loading').replaceChildren(h('div',{class:'panel',style:'max-width:420px'},
      h('h2',null,'3D mode couldn\'t start'),
      h('p',{class:'dim'},'Your browser or device may not support WebGL, or the game files failed to load.'),
      h('p',{class:'small dim'}, String(err?.message||err)),
      h('a',{class:'big hot button',href:'classic.html'},'Play the classic 2D version')));
    return;
  }
  $('loading').hidden=true;
  window.__game={get S(){return S;}, get B(){return B;}, world, testBattle:(f)=>{ if(f) D.floor=f; onEncounter({}, null, false); }, testBoss:()=>{ D.floor=5; onEncounter({}, null, true); }};   // test hooks
  titleScreen();
})();
