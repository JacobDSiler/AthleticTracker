/* Fueld engine: nutrition targets, routine generator, family meal planner, shopping list.
   Pure functions (no DOM) so they can be unit-tested in Node:  node --test test/ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./fd-data.js'));
  else root.FD = factory(root.FD_DATA);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';
  var E = {};
  var KCAL_PER_KG = 7700;
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r(v, n) { var m = Math.pow(10, n || 0); return Math.round(v * m) / m; }
  E.lbToKg = function (lb) { return lb / 2.20462; };
  E.kgToLb = function (kg) { return kg * 2.20462; };
  E.cmToFtIn = function (cm) { var t = cm / 2.54; return { ft: Math.floor(t / 12), inch: r(t % 12, 1) }; };
  E.ftInToCm = function (ft, inch) { return r((ft * 12 + (inch || 0)) * 2.54, 1); };

  var ACT = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725 };
  var EXP = { beginner: 0, intermediate: 1, advanced: 2 };

  E.isChild = function (p) { return p.age < 18; };

  // ---------------- NUTRITION TARGETS ----------------
  // Adults: Mifflin-St Jeor x activity, then a goal-based rate capped at 0.5% bodyweight/week (Ethier / ACSM-style guidance).
  // Children 3-17: IOM estimated energy requirement (includes growth); no weight-loss or surplus targets, ever.
  E.calcTargets = function (p) {
    var kg = +p.weightKg, cm = +p.heightCm, age = +p.age;
    var out = { mode: 'adult', warnings: [], notes: [] };
    if (!kg || !cm || !age) return null;
    if (age < 3) { return { mode: 'unsupported', warnings: ['Fueld does not calculate targets for under-3s. Follow your health visitor / paediatrician.'], notes: [] }; }
    var male = p.sex === 'm';
    out.waterL = r(Math.max(1.2, kg * 0.035), 1);

    if (age < 18) {
      out.mode = 'child';
      var m = cm / 100, act = p.activity || 'moderate', kcal;
      var idx = { sedentary: 0, light: 1, moderate: 2, very: 3 }[act]; if (idx === undefined) idx = 2;
      if (male) {
        var pa = [1.0, 1.13, 1.26, 1.42][idx];
        kcal = 88.5 - 61.9 * age + pa * (26.7 * kg + 903 * m) + (age < 9 ? 20 : 25);
      } else {
        var pg = [1.0, 1.16, 1.31, 1.56][idx];
        kcal = 135.3 - 30.8 * age + pg * (10 * kg + 934 * m) + (age < 9 ? 20 : 25);
      }
      kcal = Math.round(kcal / 10) * 10;
      var pk = age < 14 ? 0.95 : 0.85;
      var protein = Math.round(pk * kg);
      var fat = Math.round(kcal * 0.30 / 9);
      var carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
      out.kcal = kcal; out.protein = protein; out.fat = fat; out.carbs = carbs;
      out.fiber = Math.round(age + 5);
      out.goalLabel = 'Growing strong';
      out.weeklyKg = 0; out.weeklyRatePct = 0;
      out.sleep = age < 6 ? [10, 13] : age < 13 ? [9, 12] : [8, 10];
      out.notes.push('Growing bodies need fuel. These numbers are a guide, not a rule - never restrict or push weight loss in children. Aim for regular meals, protein at each meal, plenty of colour, and 60+ minutes of active play a day.');
      out.notes.push('Any concern about growth or weight: ask your GP, health visitor or paediatrician.');
      return out;
    }

    var bmr = 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
    var tdee = bmr * (ACT[p.activity] || 1.55);
    var goal = p.goal || 'maintain', lean = p.leanness || 'average', exp = EXP[p.experience] || 0;
    out.bmr = Math.round(bmr); out.tdee = Math.round(tdee);
    var rate = 0, eff = goal; // rate = % bodyweight per week, signed
    if (p.special) { eff = 'maintain'; out.notes.push('Pregnant or breastfeeding: no weight-loss or surplus targets are set. Eat to appetite, prioritise protein, iron and calcium, and follow your midwife/GP.'); }
    else if (goal === 'build') {
      if (lean === 'higher') { eff = 'recomp'; rate = -0.25; out.notes.push('Because you carry more body fat (over ~20% men / ~30% women), Fueld sets a small deficit with high protein and heavy training. You can build muscle and lose fat at the same time (a recomp), which beats a bulk at your starting point.'); }
      else { rate = [0.4, 0.25, 0.15][exp] || 0.25; }
    } else if (goal === 'cut') {
      rate = -(p.pace === 'gentle' ? 0.25 : 0.5);
      if (lean === 'lean') rate = Math.max(rate, -0.3);
    }
    var delta = Math.round(rate / 100 * kg * KCAL_PER_KG / 7);
    var kcal2 = tdee + delta + (+p.kcalAdjust || 0);
    var floor = male ? 1500 : 1200;
    if (kcal2 < floor) { kcal2 = floor; out.warnings.push('Calories were raised to the ' + floor + ' kcal safety floor. Eating less than this is not recommended without medical supervision.'); }
    kcal2 = Math.round(kcal2 / 10) * 10;
    var pkg = { build: 1.8, recomp: 2.0, cut: lean === 'lean' ? 2.2 : 2.0, maintain: 1.6 }[eff] || 1.6;
    var prot = Math.min(Math.round(pkg * kg), Math.round(kcal2 * 0.35 / 4));
    var fat2 = Math.round(Math.max(0.7 * kg, kcal2 * 0.25 / 9));
    var carbs2 = Math.max(0, Math.round((kcal2 - prot * 4 - fat2 * 9) / 4));
    out.kcal = kcal2; out.protein = prot; out.fat = fat2; out.carbs = carbs2;
    out.proteinPerKg = r(prot / kg, 2);
    out.fiber = Math.round(kcal2 / 1000 * 14);
    out.effGoal = eff; out.deltaKcal = kcal2 - Math.round(tdee);
    out.weeklyRatePct = rate; out.weeklyKg = r(rate / 100 * kg, 2);
    out.sleep = [7, 9];
    out.goalLabel = { build: 'Lean muscle gain', recomp: 'Body recomposition', cut: 'Fat loss', maintain: 'Maintain & perform' }[eff];
    if (p.goalWeightKg && out.weeklyKg) {
      var diff = +p.goalWeightKg - kg;
      if (diff * out.weeklyKg > 0) { out.weeksToGoal = Math.ceil(Math.abs(diff / out.weeklyKg)); }
      else if (Math.abs(diff) > 0.4) out.warnings.push('Your goal weight is in the opposite direction to your chosen goal.');
    }
    if (eff === 'build') out.notes.push('Realistic muscle gain is slow: gaining ~20 lb (9 kg) of muscle naturally takes a year or more, and it slows after that. A small surplus keeps fat gain low.');
    return out;
  };

  // Compare 7-day average weight to the previous 7 days and suggest a calorie nudge.
  E.trendAdvice = function (entries, targets) {
    if (!targets || targets.mode !== 'adult' || !entries || entries.length < 6) return { status: 'need-data', message: 'Log your weight on at least 3 days a week for 2 weeks and Fueld will tell you whether to adjust your calories.' };
    var last = entries.slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; });
    var end = new Date(last[last.length - 1].d + 'T12:00:00').getTime(), day = 86400000;
    function avg(from, to) { var s = 0, n = 0; last.forEach(function (e) { var t = new Date(e.d + 'T12:00:00').getTime(); if (t > end - to * day && t <= end - from * day) { s += e.kg; n++; } }); return n >= 3 ? { v: s / n, n: n } : null; }
    var a1 = avg(0, 7), a0 = avg(7, 14);
    if (!a1 || !a0) return { status: 'need-data', message: 'Need at least 3 weigh-ins in each of the last two weeks to see a trend.' };
    var change = a1.v - a0.v, exp = targets.weeklyKg || 0, pctBw = change / a0.v * 100;
    var res = { status: 'ok', change: r(change, 2), expected: exp, delta: 0, message: '' };
    var sign = targets.effGoal;
    if (sign === 'build') {
      if (change < exp * 0.5) { res.delta = 150; res.status = 'adjust'; res.message = 'You are gaining slower than planned (' + r(change, 2) + ' kg/wk vs ' + exp + '). Add about 150 kcal/day.'; }
      else if (change > exp * 2 && pctBw > 0.5) { res.delta = -150; res.status = 'adjust'; res.message = 'You are gaining faster than needed - extra will be mostly fat. Trim about 150 kcal/day.'; }
      else res.message = 'On track: ' + r(change, 2) + ' kg/wk vs ' + exp + ' planned. Keep going.';
    } else if (sign === 'cut' || sign === 'recomp') {
      if (pctBw < -0.9) { res.delta = 200; res.status = 'adjust'; res.message = 'Losing faster than ~0.9% bodyweight/wk risks muscle loss. Add about 200 kcal/day.'; }
      else if (change > exp * 0.5) { res.delta = -150; res.status = 'adjust'; res.message = 'Loss is slower than planned (' + r(change, 2) + ' vs ' + exp + ' kg/wk). Check portion logging first; if accurate, cut about 150 kcal/day.'; }
      else res.message = 'On track: ' + r(change, 2) + ' kg/wk vs ' + exp + ' planned.';
    } else {
      if (pctBw > 0.25) { res.delta = -100; res.status = 'adjust'; res.message = 'Weight is drifting up. Trim about 100 kcal/day if that is not your aim.'; }
      else if (pctBw < -0.25) { res.delta = 100; res.status = 'adjust'; res.message = 'Weight is drifting down. Add about 100 kcal/day if that is not your aim.'; }
      else res.message = 'Stable: weight is holding steady.';
    }
    return res;
  };

  // ---------------- TRAINING ROUTINE ----------------
  var TPL = {
    FA: { name: 'Full body A', m: ['quads', 'chest', 'back', 'glutes', 'shoulders', 'triceps', 'core'] },
    FB: { name: 'Full body B', m: ['hams', 'back', 'chest', 'quads', 'shoulders', 'biceps', 'calves'] },
    FC: { name: 'Full body C', m: ['quads', 'hams', 'chest', 'back', 'shoulders', 'biceps', 'core'] },
    UP: { name: 'Upper body', m: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
    LO: { name: 'Lower body', m: ['quads', 'hams', 'glutes', 'calves', 'core'] },
    PUSH: { name: 'Push', m: ['chest', 'shoulders', 'triceps'] },
    PULL: { name: 'Pull', m: ['back', 'biceps', 'core'] },
    LEGS: { name: 'Legs', m: ['quads', 'hams', 'glutes', 'calves'] }
  };
  var SPLITS = { 2: ['FA', 'FB'], 3: ['FA', 'FB', 'FC'], 4: ['UP', 'LO', 'UP', 'LO'], 5: ['UP', 'LO', 'PUSH', 'PULL', 'LEGS'], 6: ['PUSH', 'PULL', 'LEGS', 'PUSH', 'PULL', 'LEGS'] };
  var TIER = { chest: 0, back: 0, quads: 0, hams: 0, shoulders: 0, biceps: 1, triceps: 1, glutes: 1, calves: 2, core: 2 };
  var BASE = [[9, 13, 16], [6, 8, 10], [4, 6, 8]]; // sets/week per tier by experience level

  function pool(muscle, env, lvl) {
    var all = D.EXERCISES.filter(function (x) { return x.m === muscle && x.eq.indexOf(env) > -1; });
    var f = all.filter(function (x) { return x.lv[0] <= lvl && lvl <= x.lv[1]; });
    return f.length ? f : all;
  }

  E.generateRoutine = function (p) {
    var youth = p.age < 18;
    var lvl = youth ? 0 : (EXP[p.experience] || 0);
    var env = youth ? (p.equipment === 'db' ? 'db' : 'bw') : (p.equipment || 'gym');
    var days = clamp(+p.days || 3, 2, youth ? 3 : 6);
    var seq = SPLITS[days];
    var freq = {};
    seq.forEach(function (k) { TPL[k].m.forEach(function (m) { freq[m] = (freq[m] || 0) + 1; }); });
    var seen = {}, direct = {}, credit = {};
    var sessions = seq.map(function (key, si) {
      var t = TPL[key], exs = [];
      t.m.forEach(function (m) {
        var weekly = BASE[TIER[m]][lvl] * (youth ? 0.45 : 1);
        var cap = youth ? 3 : lvl === 0 ? 4 : 6;
        var per = clamp(Math.round(weekly / freq[m]), 2, cap);
        var pl = pool(m, env, lvl);
        if (!pl.length) return;
        seen[m] = seen[m] || 0;
        var j = seen[m]++;
        var n = per >= 5 && pl.length > 1 ? 2 : 1;
        var split = n === 2 ? [Math.ceil(per / 2), Math.floor(per / 2)] : [per];
        var volWeek = BASE[TIER[m]][lvl];
        for (var k = 0; k < n; k++) {
          var ex = pl[(j + k) % pl.length];
          if (k === 1) {
            var first = exs[exs.length - 1];
            var others = pl.filter(function (z) { return z.id !== first.id; });
            var diff = others.filter(function (z) { return (z.t === 'c') !== first.compound; });
            var cand = diff.length ? diff : others;
            if (!cand.length) continue;
            ex = cand[j % cand.length];
          }
          var sets = split[k];
          var reps = ex.reps === 'time' ? '30-60 s' : (ex.reps || (ex.t === 'c' ? [6, 10] : [10, 15]));
          if (Array.isArray(reps)) {
            if (youth) reps = [8, 15];
            else if (ex.t === 'c' && ex.reps === null && lvl >= 1 && k === 0 && TIER[m] === 0) reps = [5, 8];
            reps = reps[0] + '-' + reps[1];
          }
          var rir = youth ? '3-4' : lvl === 0 ? '2-3' : ex.t === 'c' ? '1-3' : (volWeek <= 12 ? '0-1' : '1-2');
          exs.push({ id: ex.id, name: ex.n, muscle: m, sets: sets, reps: reps, rir: rir, rest: ex.t === 'c' ? '2-3 min' : '60-90 s', cue: ex.cue, compound: ex.t === 'c' });
        }
      });
      // keep sessions realistic: merge tiny second exercises, then trim to ~24 hard sets
      for (var q = exs.length - 1; q > 0; q--) {
        if (exs[q].muscle === exs[q - 1].muscle && exs[q].sets + exs[q - 1].sets <= 4) { exs[q - 1].sets += exs[q].sets; exs.splice(q, 1); }
      }
      var guard = 0;
      while (exs.reduce(function (a, e) { return a + e.sets; }, 0) > (youth ? 14 : 24) && guard++ < 60) {
        var big = null;
        exs.forEach(function (e) { if (e.sets > 2 && (!big || e.sets > big.sets || (e.sets === big.sets && TIER[e.muscle] > TIER[big.muscle]))) big = e; });
        if (big) big.sets--; else exs.pop();
      }
      exs.forEach(function (e) {
        direct[e.muscle] = (direct[e.muscle] || 0) + e.sets;
        var x = D.EXERCISES.filter(function (z) { return z.id === e.id; })[0];
        x.s.forEach(function (sm) { credit[sm] = (credit[sm] || 0) + e.sets * 0.5; });
      });
      var totalSets = exs.reduce(function (a, e) { return a + e.sets; }, 0);
      return { id: key + '-' + si, key: key, name: t.name, dayNum: si + 1, exercises: exs, minutes: Math.round(8 + totalSets * 2.4) };
    });
    var weekly = {};
    Object.keys(D.MUSCLE_LABEL).forEach(function (m) { if (direct[m] || credit[m]) weekly[m] = { direct: direct[m] || 0, total: Math.round(((direct[m] || 0) + (credit[m] || 0)) * 2) / 2 }; });
    var notes = [];
    if (youth) {
      notes.push('Youth strength training is safe and healthy when supervised and technique-first. Light loads, no max lifts, stop sets with 3-4 reps in reserve, and keep sports/play as the main activity (60 min/day).');
    } else {
      notes.push('Each muscle is trained about twice a week - splitting sets across at least two days tends to speed growth versus cramming them into one.');
      notes.push(lvl === 0 ? 'Beginner volume (~' + BASE[0][0] + ' hard sets per big muscle per week) is plenty - technique and consistency matter more than volume right now.'
        : 'Aim for roughly ' + BASE[0][lvl] + ' hard sets per big muscle per week. Lower-volume plans (5-12 sets) work best taken close to failure; higher-volume plans (12-20 sets) work best stopping 1-3 reps short.');
      notes.push('Progression: double progression. When you reach the top of the rep range on every set with clean form, add the smallest weight jump and go back to the bottom of the range.');
      notes.push('Every 6-8 weeks (or when you feel run down) take a deload week: same exercises, half the sets.');
    }
    return { sessions: sessions, weekly: weekly, notes: notes, env: env, days: days, level: lvl, youth: youth };
  };

  // Suggest next weight for an exercise from the last logged performance.
  E.progressionHint = function (lastSets, repsRange, unit) {
    if (!lastSets || !lastSets.length) return '';
    var hi = +String(repsRange).split('-')[1] || 0; if (!hi) return '';
    var allTop = lastSets.every(function (s) { return +s.r >= hi; });
    var w = Math.max.apply(null, lastSets.map(function (s) { return +s.w || 0; }));
    if (!w) return allTop ? 'Add reps or make it harder.' : '';
    var jump = unit === 'lb' ? 5 : 2.5;
    return allTop ? 'Hit the top of the range last time - try ' + (w + jump) + ' ' + unit + ' today.' : 'Last time: ' + w + ' ' + unit + '. Beat your reps first.';
  };

  // ---------------- MEALS ----------------
  E.recipeMacros = function (rec, f) {
    f = f || 1;
    var t = { k: 0, p: 0, c: 0, f: 0 };
    Object.keys(rec.ings).forEach(function (id) {
      var i = D.INGREDIENTS[id], g = rec.ings[id] * f / 100;
      t.k += i.k * g; t.p += i.p * g; t.c += i.c * g; t.f += i.f * g;
    });
    return { kcal: Math.round(t.k), protein: Math.round(t.p), carbs: Math.round(t.c), fat: Math.round(t.f) };
  };
  E.recipeById = function (id) { for (var i = 0; i < D.RECIPES.length; i++) if (D.RECIPES[i].id === id) return D.RECIPES[i]; return null; };
  var SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
  E.SLOTS = SLOTS;
  function pick(a, rng) { return a[Math.floor(rng() * a.length)]; }

  // members: [{id, name, targets}]; opts: {budget, veg, days (7)}; prev: existing plan (keeps locked slots)
  E.planWeek = function (members, opts, prev, rng) {
    rng = rng || Math.random; opts = opts || {};
    var list = D.RECIPES.filter(function (x) { return (!opts.veg || x.veg) && (!opts.budget || x.cost <= 2); });
    var bySlot = {}; SLOTS.forEach(function (s) { bySlot[s] = list.filter(function (x) { return x.meal === s; }); if (!bySlot[s].length) bySlot[s] = D.RECIPES.filter(function (x) { return x.meal === s; }); });
    var tk = 0, tp = 0;
    members.forEach(function (m) { tk += m.targets.kcal; tp += m.targets.protein; });
    var want = tk ? tp / tk : 0.07;
    var used = { breakfast: {}, lunch: {}, dinner: {}, snack: {} };
    var days = [];
    for (var d = 0; d < (opts.days || 7); d++) {
      var locked = (prev && prev.days && prev.days[d] && prev.days[d].locked) || {};
      var pd = prev && prev.days && prev.days[d];
      var best = null, bestScore = 1e9;
      for (var t = 0; t < 60; t++) {
        var combo = {}, score = 0, K = 0, P = 0;
        SLOTS.forEach(function (s) {
          var id = locked[s] && pd ? pd[s] : pick(bySlot[s], rng).id;
          combo[s] = id;
          var rec = E.recipeById(id), mac = E.recipeMacros(rec);
          K += mac.kcal; P += mac.protein;
          score += (used[s][id] || 0) * { breakfast: 6, lunch: 10, dinner: 50, snack: 4 }[s];
          if (d > 0 && days[d - 1][s] === id) score += 100;
          score += rec.cost * (opts.budget ? 3 : 0.5);
        });
        score += Math.abs(P / K - want) * 1500;
        if (score < bestScore) { bestScore = score; best = combo; }
      }
      SLOTS.forEach(function (s) { used[s][best[s]] = (used[s][best[s]] || 0) + 1; });
      best.locked = {}; Object.keys(locked).forEach(function (k) { if (locked[k]) best.locked[k] = true; });
      days.push(best);
    }
    return { days: days, opts: opts, created: Date.now() };
  };

  // Portion multiplier for each member on a day (all meals scaled together), rounded to quarters.
  E.dayFactors = function (day, members) {
    var K = 0;
    SLOTS.forEach(function (s) { K += E.recipeMacros(E.recipeById(day[s])).kcal; });
    var out = {};
    members.forEach(function (m) { out[m.id] = clamp(Math.round(m.targets.kcal / K * 4) / 4, 0.25, 2.5); });
    return out;
  };
  E.dayTotals = function (day, member, factor) {
    var t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    SLOTS.forEach(function (s) { var m = E.recipeMacros(E.recipeById(day[s]), factor); t.kcal += m.kcal; t.protein += m.protein; t.carbs += m.carbs; t.fat += m.fat; });
    return t;
  };

  E.shoppingList = function (plan, members) {
    var tot = {};
    plan.days.forEach(function (day) {
      var fac = E.dayFactors(day, members);
      SLOTS.forEach(function (s) {
        var rec = E.recipeById(day[s]);
        members.forEach(function (m) {
          Object.keys(rec.ings).forEach(function (id) { tot[id] = (tot[id] || 0) + rec.ings[id] * fac[m.id]; });
        });
      });
    });
    var aisles = {};
    Object.keys(tot).forEach(function (id) {
      var i = D.INGREDIENTS[id], g = tot[id], label;
      if (i.unit) { var n = Math.ceil(g / i.unitG); label = n + ' ' + i.unit + (n === 1 ? '' : 's'); }
      else if (g >= 1000) label = r(g / 1000, 1) + ' kg';
      else label = (g < 100 ? Math.ceil(g / 10) * 10 : Math.ceil(g / 25) * 25) + ' g';
      (aisles[i.aisle] = aisles[i.aisle] || []).push({ id: id, name: i.name, label: label, grams: Math.round(g) });
    });
    Object.keys(aisles).forEach(function (a) { aisles[a].sort(function (x, y) { return x.name < y.name ? -1 : 1; }); });
    return aisles;
  };

  // Gentle fix-up suggestion if the day's protein falls well short of a member's target.
  E.proteinGap = function (day, member, factor) {
    var t = E.dayTotals(day, member, factor);
    return member.targets.protein - t.protein;
  };

  E.todayKey = function (d) { d = d || new Date(); var m = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd; };
  return E;
});
