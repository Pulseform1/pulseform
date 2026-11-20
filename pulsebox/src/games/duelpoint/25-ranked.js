  /* ---------- 25 ranked: tiers, divisions and rank points ----------
     Eight tiers, the first seven in three divisions; every division is 100 rank points (RP), so a rank is one number, its
     "rank value" (RV): tier and division in the hundreds, RP below. Win and you gain RP, lose and you drop; cross 100 and you
     rank up, fall below 0 and you rank down (to 80-odd of the division below). The top tier, Zenith, has no ceiling.
     Each team size (1v1 to 5v5) has a rank of its own. The first five ranked matches at a size are placements: they move a
     hidden skill number (MMR) fast, then your rank is set from it. After that your rank drifts toward your MMR: well above
     your rank, you gain more and lose less; below it, the other way round.
     What a match pays depends on how strong the other side was against your rank (bots by their level, people by their rank:
     beat bots above your rank and you climb fast, below it and you barely move), how wide the score was, and a little on how
     you played (your combat score against everyone's). */
  const TIERS = [
    { n: 'Spark', col: '#b3aca2' }, { n: 'Flint', col: '#d08b58' }, { n: 'Steel', col: '#c3d0dc' }, { n: 'Cobalt', col: '#5b97ff' },
    { n: 'Quartz', col: '#f5a8dc' }, { n: 'Onyx', col: '#9a8cff' }, { n: 'Ember', col: '#ff8a45' }, { n: 'Zenith', col: '#ffe066' }];
  const DIVS = 3, PLACE_N = 5, TOP = (TIERS.length - 1) * DIVS, MMR0 = 700;   // TOP: the index of Zenith, the one undivided tier
  const rankOf = rv => {
    rv = Math.max(0, rv | 0); const i = Math.min(TOP, Math.floor(rv / 100)), t = Math.min(TIERS.length - 1, Math.floor(i / DIVS));
    return { i, t, d: t === TIERS.length - 1 ? 0 : i % DIVS, rp: i >= TOP ? rv - TOP * 100 : rv % 100, T: TIERS[t], top: t === TIERS.length - 1 };
  };
  const rankLabel = rv => { const r = rankOf(rv); return r.T.n + (r.top ? '' : ' ' + ['I', 'II', 'III'][r.d]); };
  // the bot level that matches a rank: Spark and Flint face Recruits, Steel and Cobalt Veterans, Quartz and Onyx Elites, Ember and Zenith Legends
  const botLevelFor = rv => Math.max(0, Math.min(3, Math.floor(rankOf(rv).t / 2)));
  // a bot level as a rank value (the middle of its two tiers), so bots and people can be weighed together
  const botRV = lvl => (6 * cl(lvl | 0, 0, 3) + 3) * 100;
  const RQ = ['1', '2', '3', '4', '5'];
  function rankedOf(size) {
    STATS.ranked = STATS.ranked || {}; const k = String(teamSize(size));
    return STATS.ranked[k] || (STATS.ranked[k] = { rv: 0, mmr: MMR0, n: 0, w: 0, peak: 0 });
  }
  const placed = S => S.n >= PLACE_N;
  // how strong you count as at a size: your rank once placed, your MMR while placing
  const rankStrength = size => { const S = rankedOf(size); return placed(S) ? S.rv : S.mmr; };
  // every size's strength, for the party (the host picks the size after you join)
  const rankStrengths = () => Object.fromEntries(RQ.map(k => [k, Math.round(rankStrength(+k))]));
  /* a ranked match is over: o = { won, opp (the other side's strength as a rank value), margin (rounds between the teams),
     perf (0..1, how your combat score compares: .5 is an average showing) }. Changes STATS and says what happened. */
  function rankedResult(size, o) {
    const S = rankedOf(size), was = placed(S), self = was ? S.rv : S.mmr, gap = cl((o.opp - self) / 300, -3, 3), m = cl(o.margin | 0, 0, 6), pf = cl(o.perf == null ? .5 : o.perf, 0, 1) - .5;
    let d = o.won ? 18 + 7 * gap + 1.5 * m + 8 * pf : -(15 - 6 * gap + 1.2 * m) + 8 * pf;
    if (was) d += cl((S.mmr - S.rv) / 300, -1, 1) * 5;   // drifting toward where your skill says you belong
    d = Math.round(o.won ? cl(d, 4, 50) : cl(d, -40, -2));
    const before = S.rv; S.mmr = cl(S.mmr + d * (was ? 1.2 : 3), 0, 3200); S.n++; if (o.won) S.w++;
    let after = before, justPlaced = false;
    if (was) after = Math.max(0, before + d);
    else if (placed(S)) { justPlaced = true; after = Math.round(cl(S.mmr - 100, 0, 1900) / 10) * 10; }   // the reveal: a little under the MMR, so the climb is yours
    S.rv = after; S.peak = Math.max(S.peak || 0, after);
    const rb = rankOf(before), ra = rankOf(after);
    return { size: teamSize(size), d, before, after, placing: !was && !justPlaced, justPlaced, n: S.n, up: was && ra.i > rb.i, down: was && ra.i < rb.i, won: !!o.won };
  }
  // the match history: the last twenty, newest first
  function logMatch(e) { STATS.hist = STATS.hist || []; STATS.hist.unshift(e); if (STATS.hist.length > 20) STATS.hist.length = 20; }
