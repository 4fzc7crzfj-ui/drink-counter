/* Tap Drink 2 — pure game rules. No DOM, no network. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TapDrinkEconomy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var RATE = 1.15;
  var OFFLINE_CAP_SECONDS = 8 * 60 * 60;
  var FRENZY_MS = 30000;
  var FRENZY_MULT = 7;
  var TOKEN_RATE = 0.05;

  var PRODUCERS = [
    { id: 'tap', name: 'Bar Tap', icon: '🚰', desc: 'A lone tap, dripping gold.', base: 15, rate: 0.1 },
    { id: 'tender', name: 'Bartender', icon: '🍻', desc: 'Pulls schooners while you look away.', base: 100, rate: 1 },
    { id: 'keg', name: 'Keg Room', icon: '🛢️', desc: 'Cold kegs, lined up and ready.', base: 1100, rate: 8 },
    { id: 'brewery', name: 'Brewery', icon: '🏭', desc: 'The mash tun never clocks off.', base: 12000, rate: 47 },
    { id: 'chain', name: 'Pub Chain', icon: '🏘️', desc: 'A schooner on every corner.', base: 130000, rate: 260 },
    { id: 'factory', name: 'Beer Factory', icon: '⚙️', desc: 'Foam, at industrial scale.', base: 1400000, rate: 1400 }
  ];

  var UPGRADES = [
    { id: 'bigger', name: 'Bigger Glass', icon: '🥃', desc: 'Schooners per tap ×2.', cost: 100 },
    { id: 'heavy', name: 'Heavy Pour', icon: '🍺', desc: '+2 each tap, before multipliers.', cost: 500 },
    { id: 'happy', name: 'Happy Hour', icon: '🎉', desc: 'All income ×2.', cost: 2500 },
    { id: 'golden', name: 'Golden Tap', icon: '✨', desc: 'Each tap also pours 10% of your per second.', cost: 20000 },
    { id: 'head', name: 'Perfect Head', icon: '🫧', desc: 'Schooners per tap ×2.', cost: 100000 },
    { id: 'festival', name: 'Schooner Festival', icon: '🎪', desc: 'All income ×2.', cost: 1000000 },
    { id: 'empire', name: 'Beer Empire', icon: '👑', desc: 'All income ×2.', cost: 25000000 }
  ];

  var LEVELS = [
    { id: 'gold', name: 'Gold Tap', icon: '🌟', desc: 'Each level adds 15% to every tap. No cap.', base: 50000000 },
    { id: 'diamond', name: 'Diamond Schooner', icon: '💎', desc: 'Each level adds 8% to all income. No cap.', base: 250000000 }
  ];

  var VENUES = [
    { id: 'pub', name: 'The Local', icon: '🍺', desc: 'Home base. No bonus.', cost: 0, channel: 'all', amount: 1 },
    { id: 'rsl', name: 'RSL', icon: '🎖️', desc: 'All income ×1.15.', cost: 5000000, channel: 'all', amount: 1.15 },
    { id: 'garden', name: 'Beer Garden', icon: '🌿', desc: 'Passive pouring ×1.25.', cost: 25000000, channel: 'passive', amount: 1.25 },
    { id: 'oktober', name: 'Oktoberfest', icon: '🥨', desc: 'Taps ×1.3.', cost: 100000000, channel: 'tap', amount: 1.3 },
    { id: 'moon', name: 'Brewery on the Moon', icon: '🌙', desc: 'All income ×1.4.', cost: 1000000000, channel: 'all', amount: 1.4 }
  ];

  var SKINS = [
    { id: 'schooner', name: 'Schooner', icon: '🍺', desc: 'The classic glass.', cost: 0 },
    { id: 'pint', name: 'Pint', icon: '🍻', desc: 'A taller, darker pour.', cost: 250000 },
    { id: 'jug', name: 'Jug', icon: '🫙', desc: 'Wide, foamy, generous.', cost: 2500000 },
    { id: 'goon', name: 'Goon Sack', icon: '🧃', desc: 'Silver bladder. Still counts.', cost: 10000000 },
    { id: 'keg', name: 'Golden Keg', icon: '🏆', desc: 'The whole keg, gilded.', cost: 100000000 }
  ];

  var ACHIEVEMENTS = [
    { id: 'first', name: 'First Pour', desc: 'Tap the schooner.', icon: '🍺' },
    { id: 'century', name: 'Regular', desc: 'Tap 100 times.', icon: '💯' },
    { id: 'wrist', name: 'Sore Wrist', desc: 'Tap 1,000 times.', icon: '🤲' },
    { id: 'pour', name: 'Pour Decisions', desc: 'Pour 1,000,000 schooners.', icon: '🏆' },
    { id: 'night', name: '3am Tap', desc: 'Tap between 3 and 4 in the morning.', icon: '🌙' },
    { id: 'last', name: 'Last Call', desc: 'Prestige once.', icon: '🎟️' },
    { id: 'gold', name: 'Golden Shower', desc: 'Catch a Golden Shower.', icon: '✨' },
    { id: 'club', name: 'Member', desc: 'Unlock a venue.', icon: '🏠' },
    { id: 'streak', name: 'On a Roll', desc: 'Reach a 20-tap combo.', icon: '🔥' },
    { id: 'hour', name: 'Right on Time', desc: 'Tap during Happy Hour.', icon: '⏰' },
    { id: 'daily', name: 'Showed Up', desc: 'Finish a daily challenge.', icon: '📅' },
    { id: 'moon', name: 'One Small Sip', desc: 'Unlock Brewery on the Moon.', icon: '🌕' }
  ];

  var CHALLENGES = [
    { id: 'tap5000', name: 'Speed pour', desc: 'Tap 5,000 schooners in 10 minutes.', type: 'tapEarn', goal: 5000, limit: 600, reward: 50000 },
    { id: 'taps500', name: 'Wrist day', desc: 'Tap 500 times today.', type: 'taps', goal: 500, reward: 25000 },
    { id: 'combo25', name: 'Hot streak', desc: 'Reach a 20-tap combo.', type: 'combo', goal: 20, reward: 30000 },
    { id: 'earn100k', name: 'Big round', desc: 'Earn 100,000 schooners today.', type: 'earn', goal: 100000, reward: 40000 },
    { id: 'buy10', name: 'Staff up', desc: 'Buy 10 cellar items today.', type: 'buys', goal: 10, reward: 20000 },
    { id: 'golden', name: 'Golden Shower', desc: 'Catch a Golden Shower.', type: 'golden', goal: 1, reward: 60000 }
  ];

  function findBy(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function pos(n) {
    n = +n;
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  function freshState(now) {
    return {
      v: 2,
      schooners: 0,
      total: 0,
      run: 0,
      taps: 0,
      producers: {},
      upgrades: {},
      levels: { gold: 0, diamond: 0 },
      tokens: 0,
      prestiges: 0,
      venues: { pub: true },
      venue: 'pub',
      skins: { schooner: true },
      skin: 'schooner',
      achievements: {},
      bestCombo: 0,
      goldens: 0,
      tappedHappy: false,
      dailies: 0,
      frenzyUntil: 0,
      daily: null,
      t: now || Date.now(),
      sound: false
    };
  }

  function sanitize(raw, now) {
    var s = freshState(now);
    if (!raw || typeof raw !== 'object') return s;
    s.schooners = pos(raw.schooners);
    s.total = pos(raw.total);
    s.taps = Math.floor(pos(raw.taps));
    s.t = pos(raw.t) || s.t;
    s.sound = raw.sound === true;
    s.run = raw.run == null ? s.total : pos(raw.run);
    s.tokens = Math.floor(pos(raw.tokens));
    s.prestiges = Math.floor(pos(raw.prestiges));
    s.bestCombo = Math.floor(pos(raw.bestCombo));
    s.goldens = Math.floor(pos(raw.goldens));
    s.tappedHappy = raw.tappedHappy === true;
    s.dailies = Math.floor(pos(raw.dailies));
    s.frenzyUntil = pos(raw.frenzyUntil);
    var prod = raw.producers || {};
    var i;
    for (i = 0; i < PRODUCERS.length; i++) {
      var id = PRODUCERS[i].id;
      var n = Math.floor(pos(prod[id]));
      if (n > 0) s.producers[id] = Math.min(n, 1000000);
    }
    var up = raw.upgrades || {};
    for (i = 0; i < UPGRADES.length; i++) {
      var uid = UPGRADES[i].id;
      if (up[uid]) s.upgrades[uid] = true;
    }
    var levels = raw.levels || {};
    s.levels.gold = Math.min(1000000, Math.floor(pos(levels.gold)));
    s.levels.diamond = Math.min(1000000, Math.floor(pos(levels.diamond)));
    var venues = raw.venues || {};
    for (i = 0; i < VENUES.length; i++) {
      if (VENUES[i].cost === 0 || venues[VENUES[i].id]) s.venues[VENUES[i].id] = true;
    }
    s.venues.pub = true;
    s.venue = s.venues[raw.venue] ? raw.venue : 'pub';
    var skins = raw.skins || {};
    for (i = 0; i < SKINS.length; i++) {
      if (SKINS[i].cost === 0 || skins[SKINS[i].id]) s.skins[SKINS[i].id] = true;
    }
    s.skins.schooner = true;
    s.skin = s.skins[raw.skin] ? raw.skin : 'schooner';
    var ach = raw.achievements || {};
    for (i = 0; i < ACHIEVEMENTS.length; i++) {
      if (ach[ACHIEVEMENTS[i].id]) s.achievements[ACHIEVEMENTS[i].id] = true;
    }
    if (raw.daily && typeof raw.daily === 'object' && raw.daily.day && raw.daily.id) {
      s.daily = {
        day: String(raw.daily.day),
        id: String(raw.daily.id),
        progress: pos(raw.daily.progress),
        started: pos(raw.daily.started),
        done: raw.daily.done === true,
        claimed: raw.daily.claimed === true
      };
    }
    s.v = 2;
    return s;
  }

  function bulkCost(base, owned, qty) {
    owned = Math.floor(Number(owned));
    qty = Math.floor(Number(qty));
    if (!(base > 0) || qty < 1 || owned < 0 || owned > 1000000 || qty > 1000000) return Infinity;
    var sum = base * Math.pow(RATE, owned) * (Math.pow(RATE, qty) - 1) / (RATE - 1);
    if (!isFinite(sum) || sum <= 0) return Infinity;
    return Math.max(1, Math.ceil(sum - 1e-6));
  }

  function canAfford(have, cost) {
    return isFinite(cost) && have + 1e-4 >= cost;
  }

  function grant(state, gain) {
    if (!(gain > 0)) return;
    state.schooners += gain;
    state.total += gain;
    state.run += gain;
  }

  function happyHourHour(date) {
    var d = date || new Date();
    var key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return key % 24;
  }

  function inHappyHour(date) {
    var d = date || new Date();
    return d.getHours() === happyHourHour(d);
  }

  function venueById(id) { return findBy(VENUES, id); }

  function venueFactor(state, channel) {
    var v = venueById(state.venue);
    if (!v || v.amount === 1) return 1;
    if (v.channel === 'all' || v.channel === channel) return v.amount;
    return 1;
  }

  function tokenMult(state) {
    return 1 + (state.tokens || 0) * TOKEN_RATE;
  }

  function globalMult(state, opts) {
    opts = opts || {};
    var now = opts.now || Date.now();
    var m = 1;
    if (state.upgrades.happy) m *= 2;
    if (state.upgrades.festival) m *= 2;
    if (state.upgrades.empire) m *= 2;
    m *= tokenMult(state);
    m *= 1 + (state.levels.diamond || 0) * 0.08;
    var v = venueById(state.venue);
    if (v && v.channel === 'all' && v.amount > 1) m *= v.amount;
    if (!opts.steady) {
      if (inHappyHour(new Date(now))) m *= 2;
      if ((state.frenzyUntil || 0) > now) m *= FRENZY_MULT;
    }
    return m;
  }

  function passivePerSecond(state, opts) {
    var s = 0;
    for (var i = 0; i < PRODUCERS.length; i++) {
      var p = PRODUCERS[i];
      s += (state.producers[p.id] || 0) * p.rate;
    }
    return s * globalMult(state, opts) * (venueFactor(state, 'passive') === 1 || (venueById(state.venue) || {}).channel === 'all' ? 1 : venueFactor(state, 'passive'));
  }

  function comboMultiplier(combo) {
    combo = Math.max(0, Math.floor(combo || 0));
    if (combo < 2) return 1;
    return 1 + Math.min(combo, 60) * 0.05;
  }

  function tapValue(state, combo, opts) {
    opts = opts || {};
    var t = 1;
    if (state.upgrades.heavy) t += 2;
    if (state.upgrades.bigger) t *= 2;
    if (state.upgrades.head) t *= 2;
    t *= 1 + (state.levels.gold || 0) * 0.15;
    t *= globalMult(state, opts);
    var v = venueById(state.venue);
    if (v && v.channel === 'tap') t *= v.amount;
    if (state.upgrades.golden) t += passivePerSecond(state, opts) * 0.1;
    t *= comboMultiplier(combo);
    return t;
  }

  function tap(state, combo, opts) {
    var gain = tapValue(state, combo, opts);
    grant(state, gain);
    state.taps += 1;
    return gain;
  }

  function cappedSeconds(elapsed) {
    if (!isFinite(elapsed) || elapsed <= 0) return 0;
    return Math.min(elapsed, OFFLINE_CAP_SECONDS);
  }

  function applyElapsed(state, elapsedSeconds) {
    var elapsed = isFinite(elapsedSeconds) ? elapsedSeconds : 0;
    var capped = cappedSeconds(elapsed);
    var gain = passivePerSecond(state, { steady: true }) * capped;
    grant(state, gain);
    return { gain: gain, capped: capped, elapsed: Math.max(0, elapsed) };
  }

  function tryBuyProducer(state, id, mode) {
    var p = findBy(PRODUCERS, id);
    if (!p) return { ok: false, cost: Infinity, qty: 0 };
    var owned = state.producers[id] || 0;
    var qty = mode === 10 ? 10 : 1;
    var cost = bulkCost(p.base, owned, qty);
    if (!canAfford(state.schooners, cost)) return { ok: false, cost: cost, qty: qty };
    state.schooners = Math.max(0, state.schooners - cost);
    state.producers[id] = owned + qty;
    return { ok: true, cost: cost, qty: qty };
  }

  function tryBuyUpgrade(state, id) {
    var u = findBy(UPGRADES, id);
    if (!u || state.upgrades[id]) return { ok: false, cost: u ? u.cost : Infinity };
    if (!canAfford(state.schooners, u.cost)) return { ok: false, cost: u.cost };
    state.schooners = Math.max(0, state.schooners - u.cost);
    state.upgrades[id] = true;
    return { ok: true, cost: u.cost };
  }

  function levelCost(id, level) {
    var def = findBy(LEVELS, id);
    if (!def) return Infinity;
    return bulkCost(def.base, level || 0, 1);
  }

  function tryBuyLevel(state, id) {
    var def = findBy(LEVELS, id);
    if (!def) return { ok: false, cost: Infinity };
    var lv = state.levels[id] || 0;
    var cost = levelCost(id, lv);
    if (!canAfford(state.schooners, cost)) return { ok: false, cost: cost };
    state.schooners = Math.max(0, state.schooners - cost);
    state.levels[id] = lv + 1;
    return { ok: true, cost: cost, level: lv + 1 };
  }

  function tryBuyVenue(state, id) {
    var v = venueById(id);
    if (!v) return { ok: false, cost: Infinity };
    if (state.venues[id]) {
      state.venue = id;
      return { ok: true, cost: 0, equipped: true };
    }
    if (!canAfford(state.schooners, v.cost)) return { ok: false, cost: v.cost };
    state.schooners = Math.max(0, state.schooners - v.cost);
    state.venues[id] = true;
    state.venue = id;
    return { ok: true, cost: v.cost };
  }

  function tryBuySkin(state, id) {
    var skin = findBy(SKINS, id);
    if (!skin) return { ok: false, cost: Infinity };
    if (state.skins[id]) {
      state.skin = id;
      return { ok: true, cost: 0, equipped: true };
    }
    if (!canAfford(state.schooners, skin.cost)) return { ok: false, cost: skin.cost };
    state.schooners = Math.max(0, state.schooners - skin.cost);
    state.skins[id] = true;
    state.skin = id;
    return { ok: true, cost: skin.cost };
  }

  function tokensFromRun(run) {
    if (!(run >= 1000000)) return 0;
    return Math.floor(Math.sqrt(run / 1000000));
  }

  function prestige(state) {
    var gain = tokensFromRun(state.run);
    if (gain < 1) return { ok: false, gain: 0 };
    state.tokens += gain;
    state.prestiges += 1;
    state.schooners = 0;
    state.run = 0;
    state.producers = {};
    state.upgrades = {};
    state.levels = { gold: 0, diamond: 0 };
    state.frenzyUntil = 0;
    return { ok: true, gain: gain, mult: tokenMult(state) };
  }

  function quoteProducer(state, id, mode) {
    var p = findBy(PRODUCERS, id);
    if (!p) return null;
    var owned = state.producers[id] || 0;
    var qty = mode === 10 ? 10 : 1;
    var cost = bulkCost(p.base, owned, qty);
    var live = globalMult(state) * ((venueById(state.venue) || {}).channel === 'passive' ? venueFactor(state, 'passive') : 1);
    return {
      qty: qty,
      cost: cost,
      owned: owned,
      each: p.rate,
      total: p.rate * owned * live,
      afford: canAfford(state.schooners, cost)
    };
  }

  function affordableCount(state) {
    var n = 0;
    var i;
    for (i = 0; i < UPGRADES.length; i++) {
      var u = UPGRADES[i];
      if (!state.upgrades[u.id] && canAfford(state.schooners, u.cost)) n++;
    }
    for (i = 0; i < LEVELS.length; i++) {
      if (canAfford(state.schooners, levelCost(LEVELS[i].id, state.levels[LEVELS[i].id] || 0))) n++;
    }
    for (i = 0; i < PRODUCERS.length; i++) {
      var p = PRODUCERS[i];
      if (canAfford(state.schooners, bulkCost(p.base, state.producers[p.id] || 0, 1))) n++;
    }
    for (i = 0; i < VENUES.length; i++) {
      if (!state.venues[VENUES[i].id] && canAfford(state.schooners, VENUES[i].cost)) n++;
    }
    for (i = 0; i < SKINS.length; i++) {
      if (!state.skins[SKINS[i].id] && canAfford(state.schooners, SKINS[i].cost)) n++;
    }
    return n;
  }

  function dayKey(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function challengeFor(date) {
    var d = date || new Date();
    var key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    return CHALLENGES[key % CHALLENGES.length];
  }

  function ensureDaily(state, date) {
    var d = date || new Date();
    var key = dayKey(d);
    var ch = challengeFor(d);
    if (!state.daily || state.daily.day !== key) {
      state.daily = { day: key, id: ch.id, progress: 0, started: 0, done: false, claimed: false };
    }
    return findBy(CHALLENGES, state.daily.id) || ch;
  }

  function noteDaily(state, type, amount, now) {
    var ch = ensureDaily(state, new Date(now || Date.now()));
    if (!state.daily || state.daily.done || state.daily.claimed || ch.type !== type) return false;
    if (ch.limit) {
      if (!state.daily.started) return false;
      if ((now || Date.now()) - state.daily.started > ch.limit * 1000) return false;
    }
    if (type === 'combo') state.daily.progress = Math.max(state.daily.progress, amount);
    else state.daily.progress += amount;
    if (state.daily.progress >= ch.goal) {
      state.daily.progress = ch.goal;
      state.daily.done = true;
    }
    return state.daily.done;
  }

  function startDaily(state, now) {
    var ch = ensureDaily(state, new Date(now || Date.now()));
    if (!ch.limit || state.daily.done) return state.daily;
    state.daily.started = now || Date.now();
    state.daily.progress = 0;
    return state.daily;
  }

  function claimDaily(state, now) {
    var ch = ensureDaily(state, new Date(now || Date.now()));
    if (!state.daily.done || state.daily.claimed) return { ok: false, reward: 0 };
    state.schooners += ch.reward;
    state.daily.claimed = true;
    state.dailies += 1;
    return { ok: true, reward: ch.reward };
  }

  function syncAchievements(state, ctx) {
    ctx = ctx || {};
    var earned = [];
    function give(id, ok) {
      if (!ok || state.achievements[id]) return;
      state.achievements[id] = true;
      earned.push(id);
    }
    give('first', state.taps >= 1);
    give('century', state.taps >= 100);
    give('wrist', state.taps >= 1000);
    give('pour', state.total >= 1000000);
    give('night', ctx.hour === 3);
    give('last', state.prestiges >= 1);
    give('gold', state.goldens >= 1);
    give('club', !!(state.venues.rsl || state.venues.garden || state.venues.oktober || state.venues.moon));
    give('streak', state.bestCombo >= 20);
    give('hour', state.tappedHappy === true);
    give('daily', state.dailies >= 1);
    give('moon', !!state.venues.moon);
    return earned;
  }

  function achievementById(id) { return findBy(ACHIEVEMENTS, id); }

  return {
    RATE: RATE,
    OFFLINE_CAP_SECONDS: OFFLINE_CAP_SECONDS,
    FRENZY_MS: FRENZY_MS,
    FRENZY_MULT: FRENZY_MULT,
    PRODUCERS: PRODUCERS,
    UPGRADES: UPGRADES,
    LEVELS: LEVELS,
    VENUES: VENUES,
    SKINS: SKINS,
    ACHIEVEMENTS: ACHIEVEMENTS,
    CHALLENGES: CHALLENGES,
    freshState: freshState,
    sanitize: sanitize,
    bulkCost: bulkCost,
    globalMult: globalMult,
    passivePerSecond: passivePerSecond,
    tapValue: tapValue,
    comboMultiplier: comboMultiplier,
    tap: tap,
    applyElapsed: applyElapsed,
    tryBuyProducer: tryBuyProducer,
    tryBuyUpgrade: tryBuyUpgrade,
    tryBuyLevel: tryBuyLevel,
    tryBuyVenue: tryBuyVenue,
    tryBuySkin: tryBuySkin,
    levelCost: levelCost,
    tokensFromRun: tokensFromRun,
    tokenMult: tokenMult,
    prestige: prestige,
    quoteProducer: quoteProducer,
    affordableCount: affordableCount,
    happyHourHour: happyHourHour,
    inHappyHour: inHappyHour,
    ensureDaily: ensureDaily,
    noteDaily: noteDaily,
    startDaily: startDaily,
    claimDaily: claimDaily,
    syncAchievements: syncAchievements,
    achievementById: achievementById,
    dayKey: dayKey
  };
});
