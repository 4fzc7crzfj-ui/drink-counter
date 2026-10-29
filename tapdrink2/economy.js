/* Tap Drink 2 — pure game rules. No DOM, no network. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.TapDrinkEconomy = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var RATE = 1.15;
  var OFFLINE_CAP_SECONDS = 8 * 60 * 60;

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

  function findProducer(id) {
    for (var i = 0; i < PRODUCERS.length; i++) if (PRODUCERS[i].id === id) return PRODUCERS[i];
    return null;
  }

  function findUpgrade(id) {
    for (var i = 0; i < UPGRADES.length; i++) if (UPGRADES[i].id === id) return UPGRADES[i];
    return null;
  }

  function pos(n) {
    n = +n;
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  function freshState(now) {
    return {
      v: 1,
      schooners: 0,
      total: 0,
      taps: 0,
      producers: {},
      upgrades: {},
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
    var prod = raw.producers || {};
    for (var i = 0; i < PRODUCERS.length; i++) {
      var id = PRODUCERS[i].id;
      var n = Math.floor(pos(prod[id]));
      if (n > 0) s.producers[id] = Math.min(n, 1000000);
    }
    var up = raw.upgrades || {};
    for (var j = 0; j < UPGRADES.length; j++) {
      var uid = UPGRADES[j].id;
      if (up[uid]) s.upgrades[uid] = true;
    }
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

  function globalMult(state) {
    var m = 1;
    if (state.upgrades.happy) m *= 2;
    if (state.upgrades.festival) m *= 2;
    if (state.upgrades.empire) m *= 2;
    return m;
  }

  function passivePerSecond(state) {
    var s = 0;
    for (var i = 0; i < PRODUCERS.length; i++) {
      var p = PRODUCERS[i];
      s += (state.producers[p.id] || 0) * p.rate;
    }
    return s * globalMult(state);
  }

  function tapValue(state) {
    var t = 1;
    if (state.upgrades.heavy) t += 2;
    if (state.upgrades.bigger) t *= 2;
    if (state.upgrades.head) t *= 2;
    t *= globalMult(state);
    if (state.upgrades.golden) t += passivePerSecond(state) * 0.1;
    return t;
  }

  function tap(state) {
    var gain = tapValue(state);
    state.schooners += gain;
    state.total += gain;
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
    var gain = passivePerSecond(state) * capped;
    if (gain > 0) {
      state.schooners += gain;
      state.total += gain;
    }
    return { gain: gain, capped: capped, elapsed: Math.max(0, elapsed) };
  }

  function canAfford(have, cost) {
    return isFinite(cost) && have + 1e-4 >= cost;
  }

  function tryBuyProducer(state, id, mode) {
    var p = findProducer(id);
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
    var u = findUpgrade(id);
    if (!u || state.upgrades[id]) return { ok: false, cost: u ? u.cost : Infinity };
    if (!canAfford(state.schooners, u.cost)) return { ok: false, cost: u.cost };
    state.schooners = Math.max(0, state.schooners - u.cost);
    state.upgrades[id] = true;
    return { ok: true, cost: u.cost };
  }

  function quoteProducer(state, id, mode) {
    var p = findProducer(id);
    if (!p) return null;
    var owned = state.producers[id] || 0;
    var qty = mode === 10 ? 10 : 1;
    var cost = bulkCost(p.base, owned, qty);
    var mult = globalMult(state);
    return {
      qty: qty,
      cost: cost,
      owned: owned,
      each: p.rate,
      total: p.rate * owned * mult,
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
    for (i = 0; i < PRODUCERS.length; i++) {
      var p = PRODUCERS[i];
      if (canAfford(state.schooners, bulkCost(p.base, state.producers[p.id] || 0, 1))) n++;
    }
    return n;
  }

  return {
    RATE: RATE,
    OFFLINE_CAP_SECONDS: OFFLINE_CAP_SECONDS,
    PRODUCERS: PRODUCERS,
    UPGRADES: UPGRADES,
    freshState: freshState,
    sanitize: sanitize,
    bulkCost: bulkCost,
    globalMult: globalMult,
    passivePerSecond: passivePerSecond,
    tapValue: tapValue,
    tap: tap,
    applyElapsed: applyElapsed,
    tryBuyProducer: tryBuyProducer,
    tryBuyUpgrade: tryBuyUpgrade,
    quoteProducer: quoteProducer,
    affordableCount: affordableCount
  };
});
