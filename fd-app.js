/* Fueld UI. Plain JS, no build step. Data in localStorage ('fueld.v2'). Engine: fd-engine.js */
(function () {
  'use strict';
  var D = window.FD_DATA, E = window.FD;
  var APP = window.FD_APP_NAME || 'Fueld';
  var KEY = 'fueld.v2';
  var WORKER = 'https://twilight-dew-e570.jacobdsiler.workers.dev/gemini';
  var MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'];
  var EMOJI = ['🧔', '👩', '👦', '👧', '🧒', '👶', '👴', '👵', '🦸', '🦊', '🐻', '🐱'];
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var QUICK_FOODS = [
    { name: 'Chicken Breast (100g cooked)', protein: 31, calories: 165, carbs: 0, fat: 3.6 }, { name: 'Eggs (1 large)', protein: 6, calories: 72, carbs: 0.4, fat: 5 },
    { name: 'Greek Yogurt (1 cup)', protein: 20, calories: 130, carbs: 9, fat: 0.7 }, { name: 'Protein Shake', protein: 25, calories: 150, carbs: 5, fat: 2 },
    { name: 'Salmon (100g)', protein: 25, calories: 208, carbs: 0, fat: 13 }, { name: 'Tuna (100g)', protein: 30, calories: 132, carbs: 0, fat: 1 },
    { name: 'Cottage Cheese (1 cup)', protein: 28, calories: 206, carbs: 6, fat: 9 }, { name: 'Beef Mince 10% (100g)', protein: 26, calories: 176, carbs: 0, fat: 10 },
    { name: 'Whey Protein (1 scoop)', protein: 24, calories: 120, carbs: 3, fat: 2 }, { name: 'Rice (1 cup cooked)', protein: 4, calories: 206, carbs: 45, fat: 0.4 },
    { name: 'Potato (medium)', protein: 4, calories: 160, carbs: 37, fat: 0.2 }, { name: 'Oatmeal (1 cup cooked)', protein: 6, calories: 166, carbs: 28, fat: 3.6 },
    { name: 'Banana (medium)', protein: 1.3, calories: 105, carbs: 27, fat: 0.4 }, { name: 'Milk (250 ml)', protein: 8, calories: 150, carbs: 12, fat: 8 },
    { name: 'Bread slice (wholemeal)', protein: 4, calories: 90, carbs: 15, fat: 1.2 }, { name: 'Peanut butter (1 tbsp)', protein: 4, calories: 95, carbs: 3, fat: 8 }
  ].map(function (f) { f.source = 'Built-in'; return f; });

  // ---------- storage ----------
  function fresh() { return { v: 2, active: null, profiles: [], logs: {}, weights: {}, workouts: {}, plan: null, planOpts: {}, include: {}, shop: {}, notif: { enabled: false, meals: [{ id: 1, name: 'Breakfast', time: '08:00', enabled: true }, { id: 2, name: 'Lunch', time: '12:30', enabled: true }, { id: 3, name: 'Dinner', time: '18:30', enabled: true }, { id: 4, name: 'Post-workout', time: '20:00', enabled: false }] } }; }
  function load() { try { var s = localStorage.getItem(KEY); if (s) { var d = JSON.parse(s); var f = fresh(); for (var k in f) if (d[k] === undefined) d[k] = f[k]; return d; } } catch (e) {} return fresh(); }
  var DB = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} }

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pct(v, max) { return max ? Math.min(v / max * 100, 100).toFixed(1) + '%' : '0%'; }
  function uid() { return 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36); }
  function P() { for (var i = 0; i < DB.profiles.length; i++) if (DB.profiles[i].id === DB.active) return DB.profiles[i]; return DB.profiles[0] || null; }
  function prof(id) { for (var i = 0; i < DB.profiles.length; i++) if (DB.profiles[i].id === id) return DB.profiles[i]; return null; }
  function T(p) { p = p || P(); if (!p) return null; try { var t = E.calcTargets(p); return t && t.mode !== 'unsupported' ? t : t; } catch (e) { return null; } }
  function today() { return E.todayKey(); }
  function logOf(pid, d) { return ((DB.logs[pid] || {})[d || today()]) || []; }
  function pushLog(pid, item) { DB.logs[pid] = DB.logs[pid] || {}; var d = today(); DB.logs[pid][d] = DB.logs[pid][d] || []; DB.logs[pid][d].push(item); save(); }
  function totals(arr) { var t = { protein: 0, calories: 0, carbs: 0, fat: 0 }; arr.forEach(function (i) { t.protein += +i.protein || 0; t.calories += +i.calories || 0; t.carbs += +i.carbs || 0; t.fat += +i.fat || 0; }); return t; }
  function kgToUnit(kg, p) { return p && p.units === 'imperial' ? Math.round(E.kgToLb(kg) * 10) / 10 : Math.round(kg * 10) / 10; }
  function wUnit(p) { return p && p.units === 'imperial' ? 'lb' : 'kg'; }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200); }
  function weekKey(d) { d = d || new Date(); var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return E.todayKey(x); }
  function members() {
    return DB.profiles.filter(function (p) { return DB.include[p.id] !== false; }).map(function (p) { return { id: p.id, name: p.name, emoji: p.emoji, targets: T(p) }; })
      .filter(function (m) { return m.targets && m.targets.mode !== 'unsupported' && m.targets.kcal; });
  }

  // ---------- transient UI state ----------
  var UI = { tab: 'today', logMode: 'search', meal: 'Breakfast', results: QUICK_FOODS, sel: null, qty: 1, searchTimer: null, status: '', query: '',
    edit: null, draft: null, planDay: (new Date().getDay() + 6) % 7, openRecipe: null, shopView: false, sess: null, timer: null,
    scan: { b64: null, mime: null, items: [], step: 'upload', err: '' }, coach: '', coachBusy: false, notifTimers: [] };

  // ---------- shell ----------
  var TABS = [['today', '📊 Today'], ['log', '🍗 Log'], ['meals', '🍽️ Meals'], ['train', '🏋️ Train'], ['progress', '📈 Progress'], ['me', '👪 Family'], ['coach', '🤖 Coach']];
  function renderShell() {
    $('tabs').innerHTML = TABS.map(function (t) { return '<button class="tab-btn' + (UI.tab === t[0] ? ' active' : '') + '" data-act="tab" data-v="' + t[0] + '">' + t[1] + '</button>'; }).join('');
    var sel = '<select id="profSel" class="prof-sel" aria-label="Active person">' + DB.profiles.map(function (p) { return '<option value="' + p.id + '"' + (P() && P().id === p.id ? ' selected' : '') + '>' + esc((p.emoji || '🙂') + ' ' + p.name) + '</option>'; }).join('') + '<option value="__new">＋ Add person</option></select>';
    $('profSelWrap').innerHTML = DB.profiles.length ? sel : '';
    renderBars();
  }
  function renderBars() {
    var p = P(), t = T(p), box = $('barsSection');
    if (!p || !t || t.mode === 'unsupported' || !t.kcal) { box.style.display = 'none'; $('headerProtein').style.display = 'none'; return; }
    var tot = totals(logOf(p.id)), child = t.mode === 'child';
    box.style.display = ''; $('headerProtein').style.display = '';
    $('headerProteinNum').textContent = Math.round(tot.protein) + 'g';
    $('headerProteinLabel').textContent = 'of ' + t.protein + 'g protein';
    function row(label, color, v, max, unit, cls) { return '<div class="bar-row ' + (cls || '') + '"><div class="bar-meta"><span style="color:' + color + '">' + label + '</span><span>' + Math.round(v) + ' / ' + max + unit + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + pct(v, max) + ';background:' + color + '"></div></div></div>'; }
    box.innerHTML = row(child ? 'Energy (guide)' : 'Calories', '#f97316', tot.calories, t.kcal, ' kcal', 'bar-cal') + row('Protein', '#fb923c', tot.protein, t.protein, 'g') +
      (child ? '' : row('Carbs', '#3b82f6', tot.carbs, t.carbs, 'g') + row('Fat', '#a855f7', tot.fat, t.fat, 'g'));
  }
  function setTab(t) { UI.tab = t; render(); window.scrollTo(0, 0); }
  function render() {
    renderShell();
    var views = { today: vToday, log: vLog, meals: vMeals, train: vTrain, progress: vProgress, me: vMe, coach: vCoach };
    var el = $('view');
    if (!DB.profiles.length && UI.tab !== 'me' && UI.tab !== 'coach') { UI.tab = 'me'; renderShell(); }
    el.innerHTML = views[UI.tab]();
    if (UI.tab === 'log') afterLog();
  }

  // ---------- TODAY ----------
  function nextSession(p) {
    var rt = E.generateRoutine(p), wk = weekKey(), done = (DB.workouts[p.id] || []).filter(function (w) { return w.d >= wk; }).length;
    return { rt: rt, done: done, idx: done % rt.sessions.length, complete: done >= rt.sessions.length };
  }
  function vToday() {
    var p = P(); if (!p) return welcome();
    var t = T(p); if (!t) return '<div class="card">Finish your profile in <b>Family</b> to see targets.</div>';
    if (t.mode === 'unsupported') return '<div class="card">' + esc(t.warnings[0]) + '</div>';
    var arr = logOf(p.id), tot = totals(arr), h = '';
    var rem = t.protein - tot.protein, child = t.mode === 'child';
    h += '<div class="card callout" style="' + (rem <= 0 ? 'background:#14532d' : '') + '"><div class="big" style="color:' + (rem > 0 ? '#f97316' : '#4ade80') + '">' + (rem > 0 ? Math.round(rem) + 'g' : '✅') + '</div><div class="muted">' + (rem > 0 ? 'protein still to go today' : 'Protein goal reached!') + '</div></div>';
    if (child) h += '<div class="note">🌱 Growing bodies: these numbers are a friendly guide, not a diet. Offer regular meals and snacks, protein at each, and lots of play.</div>';
    // today's plan
    var plan = DB.plan;
    if (plan && plan.days && plan.days[UI.planDay === undefined ? 0 : (new Date().getDay() + 6) % 7]) {
      var di = (new Date().getDay() + 6) % 7, day = plan.days[di], ms = members(), fac = ms.length ? E.dayFactors(day, ms) : {}, f = fac[p.id] || 1;
      h += '<div class="section-label">Family menu today · your portion ×' + f + '</div><div class="card">' + E.SLOTS.map(function (s) {
        var rec = E.recipeById(day[s]), m = E.recipeMacros(rec, f);
        return '<div class="meal-food"><span class="slot-tag">' + s + '</span><span style="flex:1">' + esc(rec.name) + '</span><span class="meal-food-macros">' + m.kcal + ' kcal · ' + m.protein + 'g</span></div>';
      }).join('') + '<button class="btn-secondary" data-act="logDay" data-v="' + di + '" style="margin-top:8px">Log the whole day for ' + esc(p.name) + '</button></div>';
    } else {
      h += '<div class="card"><b>Plan the family\'s week</b><div class="muted" style="margin:4px 0 8px">One menu for everyone with portion sizes scaled to each person.</div><button class="btn-primary" data-act="tab" data-v="meals">Open meal planner</button></div>';
    }
    // today's workout
    if (!child || true) {
      var ns = nextSession(p), s = ns.rt.sessions[ns.idx];
      h += '<div class="section-label">' + (child ? 'Move today' : 'Training') + '</div><div class="card">' +
        (child ? '<b>Active play first</b><div class="muted" style="margin:4px 0 8px">Aim for 60 min of play, plus a family circuit 2-3 times a week.</div><button class="btn-secondary" data-act="tab" data-v="train">Family circuits</button>' :
          '<b>' + (ns.complete ? 'Week complete 🎉' : 'Next up: ' + esc(s.name)) + '</b><div class="muted" style="margin:4px 0 8px">' + ns.done + ' of ' + ns.rt.sessions.length + ' sessions this week · ~' + s.minutes + ' min</div><button class="btn-primary" data-act="sessOpen" data-v="' + ns.idx + '">' + (ns.complete ? 'Train anyway' : 'Start workout') + '</button>') + '</div>';
    }
    // log
    if (!arr.length) h += '<div class="empty"><div class="empty-icon">🍽️</div><div class="empty-text">Nothing logged yet today.<br>Use Log or Scan, or log from the menu above.</div></div>';
    else {
      var order = [], seen = {}; arr.forEach(function (i) { if (!seen[i.meal]) { seen[i.meal] = 1; order.push(i.meal); } });
      h += '<div class="section-label">Today\'s food log</div>' + order.map(function (name) {
        var its = arr.filter(function (i) { return i.meal === name; }), mt = totals(its);
        return '<div class="meal-card"><div class="meal-card-header"><span class="meal-card-name">' + esc(name) + '</span><span class="meal-card-macros">' + Math.round(mt.protein) + 'g pro · ' + Math.round(mt.calories) + ' cal<br>' + Math.round(mt.carbs) + 'g carbs · ' + Math.round(mt.fat) + 'g fat</span></div>' +
          its.map(function (i) { return '<div class="meal-food"><span style="flex:1">' + esc(i.name) + '</span><span class="meal-food-macros">' + i.protein + 'g pro · ' + i.calories + ' cal</span><button class="btn-remove" data-act="delLog" data-v="' + i.id + '" aria-label="Remove">✕</button></div>'; }).join('') + '</div>';
      }).join('');
    }
    h += '<div class="muted tiny" style="margin-top:14px">💤 Sleep goal: ' + t.sleep[0] + '-' + t.sleep[1] + ' h · 💧 ~' + t.waterL + ' L water</div>';
    return h;
  }
  function welcome() {
    return '<div class="empty"><div class="empty-icon">⚡</div><div style="font-size:1.1rem;font-weight:700;margin-bottom:6px">Welcome to ' + APP + '</div><div class="empty-text">Science-based nutrition and training for the whole family.<br>Start by adding yourself - you can add everyone else after.</div><button class="btn-primary" data-act="profAdd" style="width:auto;padding:12px 28px">Add the first person</button></div>';
  }

  // ---------- LOG (search / scan / custom) ----------
  function vLog() {
    var h = '<div class="seg">' + [['search', '🔍 Search'], ['scan', '📸 Scan'], ['custom', '✏️ Custom']].map(function (m) { return '<button class="' + (UI.logMode === m[0] ? 'on' : '') + '" data-act="logMode" data-v="' + m[0] + '">' + m[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="section-label">Add food for ' + esc(P() ? P().name : '') + ' to…</div><div class="meal-pills">' + MEALS.map(function (m) { return '<button class="meal-pill' + (m === UI.meal ? ' active' : '') + '" data-act="mealPick" data-v="' + m + '">' + m + '</button>'; }).join('') + '</div>';
    if (UI.logMode === 'search') {
      h += '<div class="search-wrap"><input class="search-input" id="foodSearch" placeholder="🔍 Search any food..." value="' + esc(UI.query) + '" autocomplete="off"/></div><div id="searchStatus">' + UI.status + '</div><div class="food-list" id="foodList"></div><div id="foodSelected"></div>';
    } else if (UI.logMode === 'scan') h += vScan();
    else h += '<div class="card"><div class="section-label">Quick custom entry</div><input class="inp" id="cName" placeholder="Name (e.g. Mum\'s lasagne slice)"/><div class="grid4" style="margin-top:8px"><div><input class="inp c" id="cKcal" type="number" inputmode="decimal" placeholder="kcal"/><div class="tiny muted c">Calories</div></div><div><input class="inp c" id="cPro" type="number" inputmode="decimal" placeholder="g"/><div class="tiny muted c">Protein</div></div><div><input class="inp c" id="cCarb" type="number" inputmode="decimal" placeholder="g"/><div class="tiny muted c">Carbs</div></div><div><input class="inp c" id="cFat" type="number" inputmode="decimal" placeholder="g"/><div class="tiny muted c">Fat</div></div></div><button class="btn-primary" data-act="customAdd" style="margin-top:10px">Add to ' + esc(UI.meal) + '</button></div>';
    return h;
  }
  function recentFoods() {
    var p = P(), seen = {}, out = [];
    if (!p) return out;
    var days = Object.keys(DB.logs[p.id] || {}).sort().reverse();
    days.forEach(function (d) { DB.logs[p.id][d].slice().reverse().forEach(function (i) { var k = i.name.toLowerCase(); if (!seen[k] && out.length < 8 && i.source !== 'Plan') { seen[k] = 1; out.push({ name: i.name, protein: i.protein, calories: i.calories, carbs: i.carbs, fat: i.fat, source: 'Recent' }); } }); });
    return out;
  }
  function afterLog() {
    if (UI.logMode !== 'search') return;
    var inp = $('foodSearch');
    if (inp) inp.addEventListener('input', function () { onSearch(inp.value); });
    if (!UI.query && UI.results === QUICK_FOODS) { var rc = recentFoods(); UI.results = rc.concat(QUICK_FOODS); }
    drawFoodList();
  }
  function drawFoodList() {
    var items = UI.results, box = $('foodList'); if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="search-status">No results yet...</div>'; $('foodSelected').innerHTML = ''; return; }
    box.innerHTML = items.map(function (f, i) { return '<button class="food-item' + (UI.sel === i ? ' selected' : '') + '" data-act="foodSel" data-v="' + i + '"><span>' + esc(f.name) + '</span><div class="food-item-right"><div class="food-item-protein">' + f.protein + 'g pro · ' + f.calories + ' cal</div><div class="food-item-source">' + esc(f.source) + '</div></div></button>'; }).join('');
    drawSelected();
  }
  function drawSelected() {
    var box = $('foodSelected'); if (!box) return;
    if (UI.sel == null || !UI.results[UI.sel]) { box.innerHTML = ''; return; }
    var f = UI.results[UI.sel], q = UI.qty;
    box.innerHTML = '<div class="card" style="margin-top:8px"><div style="font-size:.85rem;font-weight:600">' + esc(f.name) + '</div><div class="tiny muted" style="margin-bottom:10px">Source: ' + esc(f.source) + '</div><div class="servings-row"><span class="muted">Servings:</span><button class="btn-icon" data-act="qty" data-v="-0.5">−</button><span class="servings-val">' + q + '</span><button class="btn-icon" data-act="qty" data-v="0.5">+</button></div><div class="macro-grid"><div class="macro-box"><div class="macro-box-val" style="color:#f97316">' + (f.protein * q).toFixed(1) + 'g</div><div class="macro-box-label">Protein</div></div><div class="macro-box"><div class="macro-box-val" style="color:#ef4444">' + (f.calories * q).toFixed(0) + '</div><div class="macro-box-label">Cal</div></div><div class="macro-box"><div class="macro-box-val" style="color:#3b82f6">' + (f.carbs * q).toFixed(1) + 'g</div><div class="macro-box-label">Carbs</div></div><div class="macro-box"><div class="macro-box-val" style="color:#a855f7">' + (f.fat * q).toFixed(1) + 'g</div><div class="macro-box-label">Fat</div></div></div><button class="btn-primary" data-act="addFood">Add to ' + esc(UI.meal) + '</button></div>';
  }
  function setStatus(msg, stage) {
    var badge = { off: '<span class="search-stage stage-off">Open Food Facts</span><br>', usda: '<span class="search-stage stage-usda">USDA FoodData</span><br>', ai: '<span class="search-stage stage-ai">Gemini AI</span><br>' }[stage] || '';
    UI.status = msg ? '<div class="search-status">' + badge + msg + '</div>' : ''; var s = $('searchStatus'); if (s) s.innerHTML = UI.status;
  }
  function onSearch(v) {
    UI.query = v; clearTimeout(UI.searchTimer);
    if (!v) { UI.results = recentFoods().concat(QUICK_FOODS); UI.sel = null; setStatus(''); drawFoodList(); return; }
    UI.searchTimer = setTimeout(function () { doSearch(v); }, 500);
  }
  function setResults(list) { UI.results = list; UI.sel = null; UI.qty = 1; drawFoodList(); }
  async function doSearch(q) {
    setStatus('🔍 Searching Open Food Facts...', 'off');
    var valid = [];
    try {
      var r = await fetch('https://world.openfoodfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(q) + '&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments'), d = await r.json();
      (d.products || []).forEach(function (p) { var n = p.nutriments || {}; if (p.product_name && n.proteins_100g !== undefined && (n['energy-kcal_100g'] || n['energy-kcal'])) valid.push({ name: p.product_name.slice(0, 50) + ' (100g)', protein: Math.round((n.proteins_100g || 0) * 10) / 10, calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0), carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10, fat: Math.round((n.fat_100g || 0) * 10) / 10, source: 'Open Food Facts' }); });
      if (valid.length >= 2) { setResults(valid); setStatus(''); return; }
    } catch (e) {}
    setStatus('🌾 Searching USDA database...', 'usda');
    try {
      var r2 = await fetch('https://api.nal.usda.gov/fdc/v1/foods/search?query=' + encodeURIComponent(q) + '&pageSize=8&api_key=DEMO_KEY'), d2 = await r2.json(), v2 = [];
      (d2.foods || []).forEach(function (f) { var ns = f.foodNutrients || []; function g(nm) { for (var j = 0; j < ns.length; j++) if (ns[j].nutrientName && ns[j].nutrientName.toLowerCase().indexOf(nm) > -1) return Math.round((ns[j].value || 0) * 10) / 10; return 0; } var it = { name: (f.description || '').slice(0, 50) + ' (100g)', protein: g('protein'), calories: g('energy'), carbs: g('carbohydrate'), fat: g('total lipid'), source: 'USDA' }; if (it.calories > 0 || it.protein > 0) v2.push(it); });
      if (v2.length) { setResults(v2); setStatus(''); return; }
    } catch (e) {}
    setStatus('🤖 Asking Gemini AI...', 'ai');
    try {
      var prompt = 'Return nutrition facts per 100g for: "' + q + '". Respond ONLY with a JSON array of 1-3 objects with fields: name, protein, calories, carbs, fat (numbers). No markdown.';
      var r3 = await fetch(WORKER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt }) }), d3 = await r3.json();
      if (d3.error) throw new Error(d3.error);
      var items = JSON.parse(d3.text.replace(/```json|```/g, '').trim()), v3 = [];
      items.forEach(function (i) { if (i.name && (i.calories > 0 || i.protein > 0)) { i.source = 'Gemini AI'; v3.push(i); } });
      if (v3.length) { setResults(v3); setStatus(''); return; }
    } catch (e) {}
    setResults([]); setStatus('😕 Nothing found. Try a different search term, or use Custom.');
  }
  function addFoodSel() {
    var f = UI.results[UI.sel], p = P(); if (!f || !p) return; var q = UI.qty;
    pushLog(p.id, { id: Date.now(), name: f.name, source: f.source, protein: +(f.protein * q).toFixed(1), calories: +(f.calories * q).toFixed(0), carbs: +(f.carbs * q).toFixed(1), fat: +(f.fat * q).toFixed(1), meal: UI.meal });
    UI.sel = null; UI.qty = 1; UI.query = ''; UI.results = QUICK_FOODS; toast('Added to ' + UI.meal); setTab('today');
  }
  // scan
  function vScan() {
    var s = UI.scan, h = '';
    if (s.step === 'upload') {
      h += '<div class="scan-drop" data-act="scanPick"><div class="scan-drop-icon">📸</div><div class="scan-drop-label">Tap to photograph your meal</div><div class="scan-drop-sub">Place a coin next to your food for better portion estimates</div></div><input type="file" id="scanFile" accept="image/*" style="display:none"/>' +
        (s.b64 ? '<img class="scan-preview" src="data:' + s.mime + ';base64,' + s.b64 + '"/>' : '') + (s.err ? '<div class="errbox">' + esc(s.err) + '</div>' : '') +
        '<button class="btn-primary" data-act="scanRun"' + (s.b64 ? '' : ' disabled') + '>✨ Analyse Food</button><div class="note" style="margin-top:10px">💡 <b>Use any coin as a scale reference.</b> ' + APP + ' recognises coins from 20+ countries. No coin? A fork or credit card also helps.</div>';
    } else if (s.step === 'thinking') h += '<div class="scan-thinking"><div style="font-size:2rem">🔍</div><div style="font-weight:600">Analysing your food...</div><div class="muted tiny">Identifying items and estimating macros</div></div>';
    else {
      h += '<div class="note">⚠️ These are <b>AI estimates</b> - edit any values before logging. Tap ✕ to remove items you didn\'t eat.</div>' + s.items.map(function (it) {
        var cc = it.confidence === 'high' ? '#4ade80' : it.confidence === 'medium' ? '#fbbf24' : '#f87171';
        return '<div class="scan-item-card"><div class="scan-item-header"><input class="scan-item-name-input" data-scan="name" data-id="' + it._id + '" value="' + esc(it.name) + '"/><span class="tiny" style="color:' + cc + ';white-space:nowrap">' + esc(it.confidence || 'low') + '</span><button class="btn-remove" data-act="scanDel" data-v="' + it._id + '">✕</button></div><div class="grid4">' +
          [['protein', 'Protein g', '#f97316'], ['calories', 'Cal', '#ef4444'], ['carbs', 'Carbs g', '#3b82f6'], ['fat', 'Fat g', '#a855f7']].map(function (m) { return '<div><input class="scan-macro-input" type="number" data-scan="' + m[0] + '" data-id="' + it._id + '" value="' + it[m[0]] + '" min="0" step="0.1"/><div class="scan-macro-label" style="color:' + m[2] + '">' + m[1] + '</div></div>'; }).join('') + '</div></div>';
      }).join('') + '<button class="btn-secondary" data-act="scanAdd" style="margin-bottom:8px">＋ Add another item</button><button class="btn-primary" data-act="scanSave">✅ Save to ' + esc(UI.meal) + '</button><button class="btn-secondary" data-act="scanReset" style="margin-top:8px">← Re-scan</button>';
    }
    return h;
  }
  async function scanRun() {
    var s = UI.scan; if (!s.b64) return; s.step = 'thinking'; render();
    var coin = 'COIN SIZE REFERENCE (diameter mm) - use whichever coin is visible:\nEurozone: 1c=16.25 2c=18.75 5c=21.25 10c=19.75 20c=22.25 50c=24.25 EUR1=23.25 EUR2=25.75\nUK: 1p=20.3 2p=25.9 5p=18.0 10p=24.5 20p=21.4 50p=27.3 GBP1=23.43 GBP2=28.4\nUSA: penny=19.05 nickel=21.21 dime=17.91 quarter=24.26 half-dollar=30.61 dollar=26.5\nCanada: 1c=19.05 5c=21.2 10c=18.03 25c=23.88 $1=26.5 $2=28.0\nAustralia: 5c=19.41 10c=23.6 20c=28.52 50c=31.65 $1=25.0 $2=20.5\nSwitzerland: 5c=17.15 10c=19.15 20c=21.05 50c=18.0 Fr1=23.2 Fr2=27.4 Fr5=31.45\nJapan: 1yen=20.0 5yen=22.0 10yen=23.5 50yen=21.0 100yen=22.6 500yen=26.5\nIndia: 50p=19.0 Rs1=21.93 Rs2=23.0 Rs5=23.0 Rs10=27.0\nMexico: 10c=17.0 20c=19.0 50c=22.0 $1=21.0 $2=23.0 $5=25.5 $10=28.0\nSouth Africa: 5c=17.0 10c=16.0 20c=19.0 50c=22.0 R1=20.0 R2=23.0 R5=26.0\nNorway: kr1=21.0 kr5=26.0 kr10=24.0 kr20=27.5\nSweden: kr1=19.5 kr2=22.5 kr5=23.75 kr10=20.5\nIf coin not listed, use your best knowledge of its size.\nIf no coin visible, estimate using plate size, cutlery, or hands if present.\n';
    var prompt = coin + 'Analyse this food photo and identify every food item visible. Use any coin as a size reference.\n\nReturn ONLY a valid JSON array - no markdown, no explanation.\nEach object: {"name":"Food with estimated portion e.g. Grilled chicken ~160g (EUR1 ref)","protein":number,"calories":number,"carbs":number,"fat":number,"confidence":"high"|"medium"|"low"}\n\nRules:\n- Name the coin spotted e.g. "(quarter ref)" or "(EUR2 ref)"\n- confidence: high=coin-calibrated or packaged label, medium=estimated by eye, low=no reference\n- Round all numbers to 1 decimal place\n- If no food detected return []\n- Return ONLY the JSON array.';
    try {
      var r = await fetch(WORKER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt, images: [{ data: s.b64, mimeType: s.mime }] }) }), d = await r.json();
      if (d.error) throw new Error(d.error);
      var items = JSON.parse(d.text.replace(/```json|```/g, '').trim());
      if (!Array.isArray(items) || !items.length) throw new Error('No food detected. Try a clearer photo.');
      s.items = items.map(function (it, i) { it._id = Date.now() + i; return it; }); s.step = 'review'; s.err = '';
    } catch (e) { s.step = 'upload'; s.err = '⚠️ ' + (e.message || 'Scan failed. Try a clearer photo.'); }
    render();
  }
  function scanSave() {
    var p = P(); if (!p) return;
    UI.scan.items.forEach(function (it, i) { if (!String(it.name).trim()) return; pushLog(p.id, { id: Date.now() + i, name: it.name, source: 'Smart Scan', protein: +(+it.protein || 0).toFixed(1), calories: +(+it.calories || 0).toFixed(0), carbs: +(+it.carbs || 0).toFixed(1), fat: +(+it.fat || 0).toFixed(1), meal: UI.meal }); });
    UI.scan = { b64: null, mime: null, items: [], step: 'upload', err: '' }; toast('Saved to log'); setTab('today');
  }

  // ---------- MEALS ----------
  function recipeCostLabel(c) { return '€€€'.slice(0, c); }
  function vMeals() {
    var ms = members(), h = '';
    if (!DB.profiles.length) return welcome();
    h += '<div class="section-label">Who is eating?</div><div class="pills-wrap" style="margin-bottom:12px">' + DB.profiles.map(function (p) { var on = DB.include[p.id] !== false; return '<button class="chip' + (on ? ' on' : '') + '" data-act="memberToggle" data-v="' + p.id + '">' + esc((p.emoji || '🙂') + ' ' + p.name) + '</button>'; }).join('') + '</div>';
    h += '<div class="pills-wrap" style="margin-bottom:12px"><button class="chip' + (DB.planOpts.budget ? ' on' : '') + '" data-act="planOpt" data-v="budget">💶 Budget-friendly</button><button class="chip' + (DB.planOpts.veg ? ' on' : '') + '" data-act="planOpt" data-v="veg">🥦 Vegetarian</button></div>';
    h += '<div class="row2"><button class="btn-primary" data-act="planNew">' + (DB.plan ? '🔄 New week' : '✨ Plan my week') + '</button>' + (DB.plan ? '<button class="btn-secondary" data-act="planShuffle">Reshuffle unlocked</button>' : '') + '</div>';
    if (!ms.length) return h + '<div class="note" style="margin-top:12px">Add at least one person with a completed profile in <b>Family</b>.</div>';
    if (!DB.plan) return h + '<div class="note" style="margin-top:12px">One menu for the whole family. ' + APP + ' scales each person\'s portions to their calorie target and builds a combined shopping list. Lock meals you love, swap the ones you don\'t.</div>';
    h += '<div class="seg" style="margin-top:14px"><button class="' + (!UI.shopView ? 'on' : '') + '" data-act="shopView" data-v="0">📅 Menu</button><button class="' + (UI.shopView ? 'on' : '') + '" data-act="shopView" data-v="1">🛒 Shopping list</button></div>';
    if (UI.shopView) return h + vShop(ms);
    h += '<div class="meal-pills">' + DAYS.map(function (d, i) { return '<button class="meal-pill' + (UI.planDay === i ? ' active' : '') + '" data-act="planDay" data-v="' + i + '">' + d + '</button>'; }).join('') + '</div>';
    var di = UI.planDay, day = DB.plan.days[di], fac = E.dayFactors(day, ms), me = P(), mf = fac[me && me.id] || 1;
    E.SLOTS.forEach(function (s) {
      var rec = E.recipeById(day[s]), mac = E.recipeMacros(rec), locked = day.locked && day.locked[s], key = di + s, open = UI.openRecipe === key;
      h += '<div class="card"><div class="slot-head"><span class="slot-tag">' + s + '</span><span class="muted tiny">' + recipeCostLabel(rec.cost) + (rec.veg ? ' · 🌱' : '') + ' · ' + mac.kcal + ' kcal / ' + mac.protein + 'g at ×1</span></div>' +
        '<div style="font-weight:700;margin:2px 0 6px">' + esc(rec.name) + '</div><div class="portions">' + ms.map(function (m) { return '<span class="chip sm">' + esc(m.emoji || '🙂') + ' ' + esc(m.name) + ' ×' + fac[m.id] + '</span>'; }).join('') + '</div>' +
        '<div class="row3"><button class="btn-pill" data-act="lockSlot" data-v="' + s + '">' + (locked ? '🔒 Locked' : '🔓 Lock') + '</button><button class="btn-pill" data-act="swapSlot" data-v="' + s + '">🔁 Swap</button><button class="btn-pill" data-act="openRecipe" data-v="' + key + '">' + (open ? '▴ Hide' : '▾ Recipe') + '</button></div>';
      if (open) {
        var mm = E.recipeMacros(rec, mf);
        h += '<div class="card-dark"><div class="tiny muted" style="margin-bottom:6px">For ' + esc(me ? me.name : '') + ' (×' + mf + '): ' + mm.kcal + ' kcal · ' + mm.protein + 'g P · ' + mm.carbs + 'g C · ' + mm.fat + 'g F</div><ul class="ing">' + Object.keys(rec.ings).map(function (id) { var i = D.INGREDIENTS[id], g = rec.ings[id] * mf, amt = i.unit ? (Math.round(g / i.unitG * 2) / 2) + ' ' + i.unit + (g / i.unitG > 1 ? 's' : '') : Math.round(g) + ' g'; return '<li>' + amt + ' ' + esc(i.name) + '</li>'; }).join('') + '</ul><div style="font-size:.78rem;line-height:1.5;margin-top:6px">' + esc(rec.method) + '</div><button class="btn-secondary" data-act="logSlot" data-v="' + s + '" style="margin-top:8px">Log for ' + esc(me ? me.name : '') + '</button></div>';
      }
      h += '</div>';
    });
    h += '<div class="section-label">Day check</div><div class="card">' + ms.map(function (m) {
      var tt = E.dayTotals(day, m, fac[m.id]), gap = m.targets.protein - tt.protein;
      return '<div class="meal-food"><span style="flex:1">' + esc((m.emoji || '🙂') + ' ' + m.name) + '</span><span class="meal-food-macros">' + tt.kcal + '/' + m.targets.kcal + ' kcal · ' + tt.protein + '/' + m.targets.protein + 'g protein</span></div>' + (gap > 15 && m.targets.mode !== 'child' ? '<div class="tiny" style="color:#fbbf24;padding:2px 0 6px">+' + Math.round(gap) + 'g protein short: add Greek yoghurt, cottage cheese, a shake or an extra egg.</div>' : '');
    }).join('') + '</div><button class="btn-secondary" data-act="logDay" data-v="' + di + '">Log this whole day for ' + esc(me ? me.name : '') + '</button>';
    return h;
  }
  function vShop(ms) {
    var sl = E.shoppingList(DB.plan, ms), h = '<div class="muted tiny" style="margin:8px 0">Covers all 7 days for ' + ms.map(function (m) { return esc(m.name); }).join(', ') + '. Tick as you shop.</div>';
    Object.keys(sl).sort().forEach(function (a) {
      h += '<div class="section-label" style="margin-top:12px">' + esc(a) + '</div><div class="card" style="padding:4px 12px">' + sl[a].map(function (it) { return '<label class="shop-row"><input type="checkbox" data-shop="' + it.id + '"' + (DB.shop[it.id] ? ' checked' : '') + '/><span style="flex:1' + (DB.shop[it.id] ? ';text-decoration:line-through;opacity:.5' : '') + '">' + esc(it.name) + '</span><b>' + esc(it.label) + '</b></label>'; }).join('') + '</div>';
    });
    return h + '<div class="row2" style="margin-top:12px"><button class="btn-secondary" data-act="shopCopy">📋 Copy / share</button><button class="btn-secondary" data-act="shopClear">Clear ticks</button></div>';
  }
  function planOptsFor() { return { budget: !!DB.planOpts.budget, veg: !!DB.planOpts.veg }; }
  function logRecipe(p, rec, slot, f) {
    var m = E.recipeMacros(rec, f);
    pushLog(p.id, { id: Date.now() + Math.floor(Math.random() * 1000), name: rec.name + (f !== 1 ? ' (×' + f + ')' : ''), source: 'Plan', protein: m.protein, calories: m.kcal, carbs: m.carbs, fat: m.fat, meal: slot.charAt(0).toUpperCase() + slot.slice(1) });
  }

  // ---------- TRAIN ----------
  var ENV = { gym: '🏢 Gym', db: '🏠 Home dumbbells', bw: '🤸 No equipment' };
  function lastPerf(pid, exId) { var w = DB.workouts[pid] || []; for (var i = w.length - 1; i >= 0; i--) for (var j = 0; j < w[i].ex.length; j++) if (w[i].ex[j].id === exId) return w[i].ex[j].sets; return null; }
  function vTrain() {
    var p = P(); if (!p) return welcome();
    if (UI.sess != null) return vWorkout(p);
    var h = '';
    if (UI.timer) h += '<div class="card" id="tmr"></div>';
    var rt = E.generateRoutine(p), child = rt.youth;
    if (!child) {
      h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><div><b>' + esc(p.name) + '\'s plan</b><div class="muted tiny">' + rt.days + ' days/week · ' + (ENV[rt.env] || '') + ' · ' + ['Beginner', 'Intermediate', 'Advanced'][rt.level] + '</div></div><button class="btn-pill" data-act="profEdit" data-v="' + p.id + '">Change</button></div></div>';
    } else h += '<div class="note">💪 Kids and teens: play first! Strength work is light, supervised and technique-first. Family circuits below are the easiest way to get everyone moving together.</div>';
    h += '<div class="section-label">' + (child ? 'Light strength (optional)' : 'Your sessions') + '</div>';
    rt.sessions.forEach(function (s, i) {
      h += '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><b>Day ' + s.dayNum + ' · ' + esc(s.name) + '</b><span class="muted tiny">~' + s.minutes + ' min</span></div><div class="tiny muted" style="margin:6px 0 8px;line-height:1.6">' + s.exercises.map(function (e) { return esc(e.name) + ' ' + e.sets + '×' + e.reps; }).join(' · ') + '</div><button class="btn-primary" data-act="sessOpen" data-v="' + i + '" style="padding:9px">Start</button></div>';
    });
    h += '<div class="section-label">Weekly hard sets per muscle</div><div class="card">' + Object.keys(rt.weekly).map(function (m) { var w = rt.weekly[m]; return '<div class="bar-row"><div class="bar-meta"><span>' + D.MUSCLE_LABEL[m] + '</span><span>' + w.direct + ' direct' + (w.total > w.direct ? ' · ' + w.total + ' incl. indirect' : '') + '</span></div><div class="bar-track"><div class="bar-fill" style="width:' + pct(w.total, 20) + ';background:#f97316"></div></div></div>'; }).join('') + '</div>';
    h += '<div class="card">' + rt.notes.map(function (n) { return '<div class="tiny" style="margin-bottom:6px;line-height:1.5">• ' + esc(n) + '</div>'; }).join('') + '</div>';
    h += '<div class="section-label">👨‍👩‍👧‍👦 Family circuits</div>' + D.CIRCUITS.map(function (c) {
      return '<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><b>' + esc(c.name) + '</b><span class="muted tiny">' + c.rounds + ' rounds · ' + c.work + 's on / ' + c.rest + 's off</span></div><div class="tiny muted" style="margin:6px 0 8px">' + c.stations.map(function (s) { return esc(s[0]); }).join(' · ') + '</div><button class="btn-secondary" data-act="circStart" data-v="' + c.id + '">▶ Start together</button></div>';
    }).join('');
    var hist = (DB.workouts[p.id] || []).slice(-5).reverse();
    if (hist.length) h += '<div class="section-label">Recent workouts</div><div class="card">' + hist.map(function (w) { return '<div class="meal-food"><span style="flex:1">' + esc(w.name) + '</span><span class="meal-food-macros">' + esc(w.d) + ' · ' + w.ex.length + ' exercises</span></div>'; }).join('') + '</div>';
    return h;
  }
  function vWorkout(p) {
    var rt = E.generateRoutine(p), s = rt.sessions[UI.sess], u = wUnit(p);
    var h = '<button class="btn-pill" data-act="sessClose">← Back</button><div style="font-size:1.1rem;font-weight:700;margin:10px 0 2px">' + esc(s.name) + '</div><div class="muted tiny" style="margin-bottom:10px">Warm up 5-8 min (light cardio, then 1-2 lighter sets of your first lift). Rest as listed.</div>';
    s.exercises.forEach(function (e, ei) {
      var last = lastPerf(p.id, e.id), hint = E.progressionHint(last, e.reps, u);
      h += '<div class="card"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + (ei + 1) + '. ' + esc(e.name) + '</b><span class="tiny muted" style="white-space:nowrap">' + e.sets + ' × ' + e.reps + '</span></div><div class="tiny muted" style="margin:3px 0 6px">Stop with ' + e.rir + ' reps in reserve · rest ' + e.rest + '</div>' + (e.cue ? '<div class="tiny" style="color:#94a3b8;margin-bottom:6px">💡 ' + esc(e.cue) + '</div>' : '') + (hint ? '<div class="tiny" style="color:#4ade80;margin-bottom:6px">' + esc(hint) + '</div>' : '');
      for (var k = 0; k < e.sets; k++) {
        var ls = last && last[k] ? last[k] : null;
        h += '<div class="setrow"><span class="muted tiny" style="width:34px">Set ' + (k + 1) + '</span><input class="inp c" type="number" inputmode="decimal" id="w_' + ei + '_' + k + '" placeholder="' + (ls && ls.w ? ls.w : u) + '"/><span class="muted">×</span><input class="inp c" type="number" inputmode="numeric" id="r_' + ei + '_' + k + '" placeholder="' + (ls && ls.r ? ls.r : 'reps') + '"/></div>';
      }
      h += '</div>';
    });
    return h + '<button class="btn-primary" data-act="sessSave">✅ Finish & save workout</button>';
  }
  function sessSave() {
    var p = P(), rt = E.generateRoutine(p), s = rt.sessions[UI.sess], out = [];
    s.exercises.forEach(function (e, ei) {
      var sets = [];
      for (var k = 0; k < e.sets; k++) { var w = $('w_' + ei + '_' + k), r = $('r_' + ei + '_' + k); if (w && r && (w.value || r.value)) sets.push({ w: +w.value || 0, r: +r.value || 0 }); }
      if (sets.length) out.push({ id: e.id, name: e.name, sets: sets });
    });
    if (!out.length) { toast('Enter at least one set first'); return; }
    DB.workouts[p.id] = (DB.workouts[p.id] || []).concat([{ d: today(), name: s.name, ex: out }]).slice(-80);
    save(); UI.sess = null; toast('Workout saved 💪'); render();
  }
  // circuit timer
  function circStart(id) {
    var c = D.CIRCUITS.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    circStop(true);
    UI.timer = { c: c, i: 0, round: 1, phase: 'ready', left: 5 };
    UI.timer.h = setInterval(tick, 1000); render(); drawTimer();
  }
  function circStop(silent) { if (UI.timer) { clearInterval(UI.timer.h); UI.timer = null; if (!silent) render(); } }
  function tick() {
    var t = UI.timer; if (!t) return; t.left--;
    if (t.left <= 0) {
      var c = t.c;
      if (t.phase === 'ready') { t.phase = 'work'; t.left = c.work; }
      else if (t.phase === 'work') {
        var lastStation = t.i === c.stations.length - 1;
        if (lastStation && t.round === c.rounds) { clearInterval(t.h); t.phase = 'done'; t.left = 0; }
        else { t.phase = 'rest'; t.left = c.rest; }
      } else if (t.phase === 'rest') {
        if (t.i === c.stations.length - 1) { t.i = 0; t.round++; } else t.i++;
        t.phase = 'work'; t.left = c.work;
      }
      try { if (navigator.vibrate) navigator.vibrate(150); } catch (e) {}
    }
    drawTimer();
  }
  function drawTimer() {
    var t = UI.timer, box = $('tmr'); if (!t || !box) return;
    var c = t.c, st = c.stations[t.i] || c.stations[0];
    if (t.phase === 'done') { box.innerHTML = '<div style="text-align:center"><div style="font-size:2rem">🎉</div><b>Circuit complete - great job, team!</b><button class="btn-secondary" data-act="circStop" style="margin-top:10px">Close</button></div>'; return; }
    var next = c.stations[(t.i + 1) % c.stations.length];
    box.innerHTML = '<div class="tiny muted">' + esc(c.name) + ' · round ' + t.round + '/' + c.rounds + ' · station ' + (t.i + 1) + '/' + c.stations.length + '</div><div class="tmr-phase ' + t.phase + '">' + (t.phase === 'ready' ? 'GET READY' : t.phase === 'work' ? 'GO!' : 'REST') + '</div><div class="tmr-num">' + t.left + '</div><div style="text-align:center;font-weight:700">' + esc(t.phase === 'rest' ? 'Next: ' + next[0] : st[0]) + '</div><div class="tiny muted" style="text-align:center;margin:2px 0 8px">' + esc(t.phase === 'rest' ? next[1] : st[1]) + '</div><button class="btn-secondary" data-act="circStop">■ Stop</button>';
  }

  // ---------- PROGRESS ----------
  function vProgress() {
    var p = P(); if (!p) return welcome();
    var t = T(p), child = t && t.mode === 'child', h = '';
    if (!child) {
      var ws = (DB.weights[p.id] || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }), u = wUnit(p);
      h += '<div class="section-label">Weigh-in</div><div class="card"><div class="muted tiny" style="margin-bottom:8px">Weigh yourself first thing, a few mornings a week. ' + APP + ' tracks the 7-day average, which smooths out water and salt noise.</div><div class="row2"><input class="inp" id="wIn" type="number" inputmode="decimal" placeholder="Weight (' + u + ')"/><button class="btn-primary" data-act="weightAdd" style="width:auto;padding:0 18px">Add</button></div></div>';
      if (ws.length) {
        h += '<div class="card">' + weightChart(ws, p) + '<div class="tiny muted" style="margin-top:6px">Latest: <b style="color:#fff">' + kgToUnit(ws[ws.length - 1].kg, p) + ' ' + u + '</b> on ' + ws[ws.length - 1].d + '</div></div>';
      }
      var adv = t ? E.trendAdvice(ws, t) : null;
      if (adv) h += '<div class="card" style="border:1px solid ' + (adv.status === 'adjust' ? '#f97316' : '#334155') + '"><b>' + (adv.status === 'adjust' ? '🎯 Time to adjust' : adv.status === 'ok' ? '✅ Trend check' : '📊 Trend check') + '</b><div style="font-size:.82rem;margin:6px 0;line-height:1.5">' + esc(adv.message) + '</div>' + (adv.status === 'adjust' ? '<button class="btn-primary" data-act="applyAdvice" data-v="' + adv.delta + '">Apply ' + (adv.delta > 0 ? '+' : '') + adv.delta + ' kcal/day</button>' : '') + (p.kcalAdjust ? '<div class="tiny muted" style="margin-top:6px">Current manual adjustment: ' + (p.kcalAdjust > 0 ? '+' : '') + p.kcalAdjust + ' kcal <button class="btn-pill" data-act="resetAdjust">reset</button></div>' : '') + '</div>';
    } else h += '<div class="note">🌱 ' + APP + ' does not chart weight for children. Growth is best tracked with your GP or health visitor. Here we just celebrate consistency.</div>';
    // 7 day nutrition
    if (t && t.kcal) {
      var days = [], k = new Date(); for (var i = 6; i >= 0; i--) { var d = new Date(k.getFullYear(), k.getMonth(), k.getDate() - i); days.push(E.todayKey(d)); }
      h += '<div class="section-label">Last 7 days</div><div class="card">' + days.map(function (d) { var tt = totals(logOf(p.id, d)); return '<div class="bar-row"><div class="bar-meta"><span>' + d.slice(5) + '</span><span>' + Math.round(tt.calories) + ' kcal · ' + Math.round(tt.protein) + 'g protein</span></div><div class="bar-track"><div class="bar-fill" style="width:' + pct(tt.calories, t.kcal) + ';background:linear-gradient(90deg,#f97316,#ef4444)"></div></div></div>'; }).join('') + '</div>';
      var wk = weekKey(), n = (DB.workouts[p.id] || []).filter(function (w) { return w.d >= wk; }).length;
      h += '<div class="card"><b>🏋️ ' + n + '</b> workout' + (n === 1 ? '' : 's') + ' logged this week</div>';
    }
    return h;
  }
  function weightChart(ws, p) {
    var pts = ws.slice(-30), W = 340, H = 120, pad = 22;
    var vs = pts.map(function (x) { return kgToUnit(x.kg, p); }), mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs); if (mx - mn < 1) { mx += 0.5; mn -= 0.5; }
    var xy = pts.map(function (x, i) { return [pad + (pts.length === 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (pts.length - 1)), H - pad - (vs[i] - mn) / (mx - mn) * (H - 2 * pad)]; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Weight trend"><polyline fill="none" stroke="#f97316" stroke-width="2.5" points="' + xy.map(function (a) { return a[0].toFixed(1) + ',' + a[1].toFixed(1); }).join(' ') + '"/>' + xy.map(function (a) { return '<circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="3" fill="#f97316"/>'; }).join('') + '<text x="4" y="14" fill="#94a3b8" font-size="10">' + mx.toFixed(1) + '</text><text x="4" y="' + (H - 6) + '" fill="#94a3b8" font-size="10">' + mn.toFixed(1) + '</text></svg>';
  }

  // ---------- FAMILY / PROFILES ----------
  function newDraft() { return { id: null, name: '', emoji: EMOJI[0], sex: 'm', age: '', heightCm: '', weightKg: '', activity: 'moderate', goal: 'maintain', pace: 'standard', leanness: 'average', experience: 'beginner', days: 3, equipment: 'gym', units: 'metric', goalWeightKg: '', special: false, kcalAdjust: 0 }; }
  function vMe() {
    var h = '';
    if (UI.edit) return vForm();
    h += '<div class="section-label">Your family</div>';
    if (!DB.profiles.length) h += welcome();
    DB.profiles.forEach(function (p) {
      var t = T(p), active = P() && P().id === p.id;
      h += '<div class="card person' + (active ? ' active' : '') + '"><div style="display:flex;align-items:center;gap:10px"><div style="font-size:1.8rem">' + esc(p.emoji || '🙂') + '</div><div style="flex:1"><b>' + esc(p.name) + '</b>' + (active ? ' <span class="tiny" style="color:#f97316">active</span>' : '') + '<div class="tiny muted">' + p.age + ' y · ' + kgToUnit(p.weightKg, p) + ' ' + wUnit(p) + (t && t.kcal ? ' · ' + t.kcal + ' kcal · ' + t.protein + 'g protein' : '') + '</div></div></div><div class="row3" style="margin-top:8px">' + (active ? '' : '<button class="btn-pill" data-act="profUse" data-v="' + p.id + '">Switch to</button>') + '<button class="btn-pill" data-act="profEdit" data-v="' + p.id + '">Edit</button></div></div>';
    });
    if (DB.profiles.length) h += '<button class="btn-secondary" data-act="profAdd">＋ Add person</button>';
    var p = P(), t = p && T(p);
    if (p && t) {
      if (t.mode === 'unsupported') h += '<div class="note">' + esc(t.warnings[0]) + '</div>';
      else {
        h += '<div class="section-label" style="margin-top:18px">' + esc(p.name) + '\'s plan · ' + esc(t.goalLabel) + '</div><div class="card"><div class="targets">' +
          [['🔴 Calories', t.kcal + ' kcal', t.mode === 'child' ? 'Growth-inclusive guide' : (t.deltaKcal ? (t.deltaKcal > 0 ? '+' : '') + t.deltaKcal + ' vs maintenance (' + t.tdee + ')' : 'Maintenance (' + t.tdee + ')')], ['🟠 Protein', t.protein + ' g', t.mode === 'child' ? 'Per RDA for age' : t.proteinPerKg + ' g per kg bodyweight'], ['🔵 Carbs', t.carbs + ' g', 'Fuel for training & play'], ['🟣 Fat', t.fat + ' g', 'Hormones & vitamins'], ['🌾 Fibre', t.fiber + ' g', '14 g per 1000 kcal'], ['💧 Water', t.waterL + ' L', 'Plus more when active'], ['💤 Sleep', t.sleep[0] + '-' + t.sleep[1] + ' h', 'Recovery & growth hormone']].map(function (r) { return '<div class="trow"><div><div class="row-label">' + r[0] + '</div><div class="row-sub">' + r[2] + '</div></div><div class="row-val">' + r[1] + '</div></div>'; }).join('') + '</div>' +
          (t.weeklyKg ? '<div class="tiny" style="margin-top:8px;line-height:1.5">🎯 Expected change: <b>' + (t.weeklyKg > 0 ? '+' : '') + kgToUnit(t.weeklyKg, p) + ' ' + wUnit(p) + '/week</b> (' + (t.weeklyRatePct > 0 ? '+' : '') + t.weeklyRatePct + '% bodyweight)' + (t.weeksToGoal ? ' → goal in about <b>' + t.weeksToGoal + ' weeks</b>' : '') + '</div>' : '') +
          t.warnings.map(function (w) { return '<div class="tiny" style="color:#fbbf24;margin-top:6px">⚠️ ' + esc(w) + '</div>'; }).join('') + t.notes.map(function (n) { return '<div class="tiny muted" style="margin-top:6px;line-height:1.5">' + esc(n) + '</div>'; }).join('') + '</div>';
      }
    }
    h += vReminders() + vScience() + vData();
    return h;
  }
  function vForm() {
    var d = UI.draft, child = d.age !== '' && +d.age < 18, imp = d.units === 'imperial', hi = d.heightCm ? E.cmToFtIn(+d.heightCm) : { ft: '', inch: '' };
    function sel(f, opts, val) { return '<select class="inp" data-f="' + f + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(val) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
    function seg(k, opts, val) { return '<div class="seg">' + opts.map(function (o) { return '<button type="button" class="' + (String(val) === String(o[0]) ? 'on' : '') + '" data-act="draftSet" data-k="' + k + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
    var h = '<div class="section-label">' + (d.id ? 'Edit person' : 'Add person') + '</div><div class="card">';
    h += '<label class="lbl">Name</label><input class="inp" data-f="name" value="' + esc(d.name) + '" placeholder="e.g. Dad, Emma" maxlength="20"/>';
    h += '<label class="lbl">Avatar</label><div class="pills-wrap">' + EMOJI.map(function (e) { return '<button type="button" class="chip' + (d.emoji === e ? ' on' : '') + '" data-act="draftSet" data-k="emoji" data-v="' + e + '">' + e + '</button>'; }).join('') + '</div>';
    h += '<label class="lbl">Sex (for energy equations)</label>' + seg('sex', [['m', 'Male'], ['f', 'Female']], d.sex);
    h += '<label class="lbl">Age</label><input class="inp" data-f="age" data-rerender="1" type="number" inputmode="numeric" value="' + esc(d.age) + '" placeholder="years"/>';
    h += '<label class="lbl">Units</label>' + seg('units', [['metric', 'kg / cm'], ['imperial', 'lb / ft-in']], d.units);
    h += '<label class="lbl">Height</label>' + (imp ? '<div class="row2"><input class="inp" data-f="ft" type="number" inputmode="numeric" value="' + hi.ft + '" placeholder="ft"/><input class="inp" data-f="in" type="number" inputmode="decimal" value="' + hi.inch + '" placeholder="in"/></div>' : '<input class="inp" data-f="cm" type="number" inputmode="decimal" value="' + esc(d.heightCm) + '" placeholder="cm"/>');
    h += '<label class="lbl">Weight (' + (imp ? 'lb' : 'kg') + ')</label><input class="inp" data-f="weight" type="number" inputmode="decimal" value="' + (d.weightKg ? kgToUnit(+d.weightKg, d) : '') + '" placeholder="' + (imp ? 'lb' : 'kg') + '"/>';
    h += '<label class="lbl">Typical activity</label>' + sel('activity', [['sedentary', 'Mostly sitting'], ['light', 'Light (some walking, 1-2 workouts)'], ['moderate', 'Moderate (on feet, 3-4 workouts)'], ['very', 'Very active (physical job + training)']], d.activity);
    if (!child && d.age !== '') {
      h += '<label class="lbl">Goal</label>' + seg('goal', [['build', '💪 Build'], ['cut', '🔥 Lose fat'], ['maintain', '⚖️ Maintain']], d.goal);
      if (d.goal === 'cut') h += '<label class="lbl">Pace</label>' + seg('pace', [['gentle', 'Gentle 0.25%/wk'], ['standard', 'Standard 0.5%/wk']], d.pace);
      h += '<label class="lbl">How lean are you?</label>' + sel('leanness', [['lean', 'Lean (men <15% / women <25% body fat)'], ['average', 'Average'], ['higher', 'Carrying more (men >20% / women >30%)']], d.leanness);
      h += '<label class="lbl">Goal weight (optional, ' + (imp ? 'lb' : 'kg') + ')</label><input class="inp" data-f="goalw" type="number" inputmode="decimal" value="' + (d.goalWeightKg ? kgToUnit(+d.goalWeightKg, d) : '') + '" placeholder="optional"/>';
      if (d.sex === 'f') h += '<label class="check"><input type="checkbox" data-f="special"' + (d.special ? ' checked' : '') + '/> Pregnant or breastfeeding (no weight-loss targets)</label>';
      h += '<label class="lbl">Training experience</label>' + sel('experience', [['beginner', 'Beginner (< 1 year consistent)'], ['intermediate', 'Intermediate (1-3 years)'], ['advanced', 'Advanced (3+ years)']], d.experience);
      h += '<label class="lbl">Training days per week</label>' + sel('days', [[2, '2 days'], [3, '3 days'], [4, '4 days'], [5, '5 days'], [6, '6 days']], d.days);
      h += '<label class="lbl">Equipment</label>' + sel('equipment', [['gym', 'Full gym'], ['db', 'Home: dumbbells'], ['bw', 'No equipment']], d.equipment);
    } else if (child) {
      h += '<div class="note" style="margin-top:12px">🌱 For children Fueld gives a growth-friendly energy guide and active-play ideas. No dieting, weight loss or gym targets.</div>';
      h += '<label class="lbl">Light strength days per week (optional)</label>' + sel('days', [[2, '2 days'], [3, '3 days']], Math.min(+d.days || 2, 3)) + '<label class="lbl">Equipment</label>' + sel('equipment', [['bw', 'No equipment'], ['db', 'Light dumbbells']], d.equipment === 'db' ? 'db' : 'bw');
    }
    h += '<div id="formErr" class="errbox" style="display:none"></div><div class="row2" style="margin-top:14px"><button class="btn-primary" data-act="profSave">Save</button><button class="btn-secondary" data-act="profCancel">Cancel</button></div>';
    if (d.id && DB.profiles.length > 0) h += '<button class="btn-remove" data-act="profDelete" style="margin-top:14px;font-size:.8rem">Delete this person and their data</button>';
    return h + '</div>';
  }
  function setField(el) {
    var d = UI.draft, f = el.dataset.f, v = el.type === 'checkbox' ? el.checked : el.value;
    if (f === 'name') d.name = v;
    else if (f === 'age') d.age = v === '' ? '' : Math.max(0, Math.round(+v));
    else if (f === 'cm') d.heightCm = v === '' ? '' : +v;
    else if (f === 'ft' || f === 'in') { var ft = f === 'ft' ? +v : (d.heightCm ? E.cmToFtIn(+d.heightCm).ft : 0), inch = f === 'in' ? +v : (d.heightCm ? E.cmToFtIn(+d.heightCm).inch : 0); d.heightCm = E.ftInToCm(ft, inch); }
    else if (f === 'weight') d.weightKg = v === '' ? '' : (d.units === 'imperial' ? E.lbToKg(+v) : +v);
    else if (f === 'goalw') d.goalWeightKg = v === '' ? '' : (d.units === 'imperial' ? E.lbToKg(+v) : +v);
    else if (f === 'days') d.days = +v;
    else d[f] = v;
  }
  function profSave() {
    var d = UI.draft, err = null;
    if (!String(d.name).trim()) err = 'Please enter a name.';
    else if (!(+d.age >= 3 && +d.age <= 110)) err = 'Age must be between 3 and 110 (Fueld does not calculate targets for under-3s).';
    else if (!(+d.heightCm >= 80 && +d.heightCm <= 250)) err = 'Please enter a realistic height.';
    else if (!(+d.weightKg >= 10 && +d.weightKg <= 300)) err = 'Please enter a realistic weight.';
    if (err) { var b = $('formErr'); b.textContent = err; b.style.display = 'block'; return; }
    var out = JSON.parse(JSON.stringify(d)); out.name = String(out.name).trim(); out.age = +out.age; out.heightCm = +out.heightCm; out.weightKg = Math.round(+out.weightKg * 10) / 10;
    if (out.goalWeightKg === '' || isNaN(+out.goalWeightKg)) delete out.goalWeightKg; else out.goalWeightKg = +out.goalWeightKg;
    if (out.age < 18) { out.goal = 'maintain'; out.special = false; if (out.equipment !== 'db') out.equipment = 'bw'; out.days = Math.min(+out.days || 2, 3); }
    if (!out.id) { out.id = uid(); DB.profiles.push(out); DB.active = out.id; }
    else { var old = prof(out.id); if (old.goal !== out.goal) out.kcalAdjust = 0; for (var i = 0; i < DB.profiles.length; i++) if (DB.profiles[i].id === out.id) DB.profiles[i] = out; }
    // record weight in the weight log when it changed
    var wl = DB.weights[out.id] = DB.weights[out.id] || [];
    if (out.age >= 18 && (!wl.length || Math.abs(wl[wl.length - 1].kg - out.weightKg) > 0.05)) { var dk = today(); wl = wl.filter(function (x) { return x.d !== dk; }); wl.push({ d: dk, kg: out.weightKg }); DB.weights[out.id] = wl; }
    DB.plan = DB.plan; save(); UI.edit = null; UI.draft = null; toast('Saved'); setTab('me');
  }

  // ---------- REMINDERS ----------
  function vReminders() {
    var perm = permState(), n = DB.notif, st = '';
    if (perm === 'granted') st = '<div class="notif-status granted">✅ Notifications allowed</div>';
    else if (perm === 'denied') st = '<div class="notif-status denied">🚫 Blocked in browser settings (site settings → notifications → allow)</div>';
    else if (perm === 'unsupported') st = '<div class="notif-status denied">⚠️ Not supported here</div>';
    else st = '<div class="notif-status default">Tap the switch - you\'ll be asked to allow</div>';
    var h = '<details class="fold"><summary>🔔 Meal reminders</summary><div class="card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div><b style="font-size:.85rem">Notifications</b><div class="tiny muted">Remind us to log meals (app must be open)</div></div><label class="toggle"><input type="checkbox" data-nt="master"' + (n.enabled ? ' checked' : '') + (perm === 'denied' || perm === 'unsupported' ? ' disabled' : '') + '/><div class="toggle-track"></div><div class="toggle-thumb"></div></label></div>' + st;
    if (n.enabled) h += n.meals.map(function (m) { return '<div class="notif-row"><div style="flex:1"><div class="notif-label">' + esc(m.name) + '</div><input type="time" class="time-input" data-nt="time" data-id="' + m.id + '" value="' + m.time + '"/></div><label class="toggle"><input type="checkbox" data-nt="on" data-id="' + m.id + '"' + (m.enabled ? ' checked' : '') + '/><div class="toggle-track"></div><div class="toggle-thumb"></div></label><button class="btn-remove" data-act="notifDel" data-v="' + m.id + '" style="margin-left:8px">✕</button></div>'; }).join('') + '<div class="row2" style="margin-top:10px"><button class="btn-secondary" data-act="notifAdd">＋ Add</button><button class="btn-secondary" data-act="notifTest">🔔 Test</button></div>';
    return h + '</div></details>';
  }
  function nativeLN() { try { var C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.LocalNotifications ? C.Plugins.LocalNotifications : null; } catch (e) { return null; } }
  function permState() { if (nativeLN()) return UI.nativePerm || 'default'; return ('Notification' in window) ? Notification.permission : 'unsupported'; }
  async function askPerm() {
    var ln = nativeLN();
    if (ln) { try { var r = await ln.requestPermissions(); UI.nativePerm = r.display === 'granted' ? 'granted' : 'denied'; } catch (e) { UI.nativePerm = 'denied'; } return UI.nativePerm; }
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  }
  async function scheduleNative(ln) {
    try {
      var pend = await ln.getPending(); if (pend.notifications && pend.notifications.length) await ln.cancel({ notifications: pend.notifications });
      if (!DB.notif.enabled || UI.nativePerm !== 'granted') return;
      var list = [];
      DB.notif.meals.forEach(function (m, i) { if (!m.enabled) return; var pr = m.time.split(':'); list.push({ id: 1000 + i, title: '⚡ ' + m.name + ' time!', body: 'Time to log ' + m.name + ' in ' + APP + '.', schedule: { on: { hour: +pr[0], minute: +pr[1] }, allowWhileIdle: true }, smallIcon: 'ic_stat_notify' }); });
      if (list.length) await ln.schedule({ notifications: list });
    } catch (e) {}
  }
  function clearTimers() { UI.notifTimers.forEach(function (t) { clearTimeout(t); clearInterval(t); }); UI.notifTimers = []; }
  function schedule() {
    clearTimers();
    var ln = nativeLN(); if (ln) { scheduleNative(ln); return; }
    if (!DB.notif.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    var now = new Date();
    DB.notif.meals.forEach(function (m) {
      if (!m.enabled) return; var pr = m.time.split(':'), nx = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +pr[0], +pr[1], 0, 0);
      if (nx <= now) nx.setDate(nx.getDate() + 1);
      UI.notifTimers.push(setTimeout(function () { fire(m.name); UI.notifTimers.push(setInterval(function () { fire(m.name); }, 86400000)); }, nx - now));
    });
  }
  function fire(name) {
    var ln = nativeLN();
    if (ln) { try { ln.schedule({ notifications: [{ id: 999, title: '⚡ ' + name + ' time!', body: 'Reminders are working.', schedule: { at: new Date(Date.now() + 1500) }, smallIcon: 'ic_stat_notify' }] }); } catch (e) {} return; }
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    var p = P(), t = p && T(p), tot = p ? totals(logOf(p.id)) : null;
    var body = t && t.protein ? 'Time to log ' + name + '! ' + Math.round(tot.protein) + 'g of ' + t.protein + 'g protein so far today.' : 'Time for ' + name + '! Open ' + APP + ' to log it.';
    try { new Notification('⚡ ' + name + ' time!', { body: body }); } catch (e) {}
  }

  // ---------- SCIENCE / DATA ----------
  function vScience() {
    var items = [
      ['🥩 Protein', 'About 1.6 g per kg bodyweight (0.7 g/lb) is the low end for maximising muscle growth; benefits level off around 1.6-2.2 g/kg. ' + APP + ' uses 1.6 to maintain, 1.8 to build, and 2.0-2.2 when losing fat to protect muscle. Spread it over 3-5 meals.'],
      ['⚖️ Calories & pace', 'Muscle gain is slow, so the surplus is small (about 0.15-0.4% bodyweight per week depending on experience). Fat loss is capped at 0.5% bodyweight per week (0.25% gentle) to protect muscle. If you carry more body fat (over ~20% men / ~30% women) a small deficit with heavy training and high protein lets you recomp. Weigh-ins feed back and nudge your calories every 2 weeks.'],
      ['🏋️ Training volume & frequency', 'Studies of drug-tested pros averaged about 12 hard sets per muscle per week. Lower volume (5-12 sets) works best taken to or near failure; higher volume (12-20 sets) works best stopping 1-3 reps short. Splitting sets across at least two days a week tends to speed growth. Beginners should master basic movement patterns first; more advanced lifters benefit from individualised and specialised exercises.'],
      ['🍌 Around training', 'About 1.5-2 hours before: a meal with slow carbs and protein (e.g. oats + yoghurt). Closer to the session: faster carbs like a banana if you need a boost. Afterwards: protein plus carbs at your next normal meal is plenty - there is no magic 30-minute window.'],
      ['💊 Creatine & supplements', 'Supplements are optional. Creatine monohydrate (3-5 g/day) gives a small, consistent boost, partly through extra water in muscle; response varies. Adults only, and check with your doctor first if you have kidney issues. Food first.'],
      ['💤 Sleep', 'Sleep supports growth hormone, testosterone and recovery. Adults 7-9 h, 6-12 y olds 9-12 h, teens 8-10 h. Dark cool room, eye mask or earplugs, regular bed time, and short naps if you are behind.'],
      ['🌱 Kids & teens', 'Children never get weight-loss or surplus targets. Energy needs come from the IOM estimated-requirement equations which include growth. Aim for 60 min of daily active play, family circuits, and a positive relationship with food.']
    ];
    return '<details class="fold"><summary>🔬 The science behind the numbers</summary><div class="card">' + items.map(function (i) { return '<div style="margin-bottom:12px"><b style="font-size:.85rem">' + i[0] + '</b><div class="tiny" style="line-height:1.55;color:#cbd5e1;margin-top:3px">' + esc(i[1]) + '</div></div>'; }).join('') +
      '<div class="tiny muted" style="line-height:1.5">Inspired by evidence-based fitness educators such as Jeremy Ethier (<a href="https://www.youtube.com/watch?v=ehQ_5TThkRI" target="_blank" rel="noopener" style="color:#60a5fa">The Fastest Way to Gain 20 lbs of Muscle</a>) and ATHLEAN-X, plus the ISSN position stands and Morton et al. 2018. ' + APP + ' is not affiliated with them. General education only, not medical advice - speak to your GP before big changes, especially with health conditions, pregnancy, or for children.</div></div></details>';
  }
  function vData() {
    return '<details class="fold"><summary>💾 Your data</summary><div class="card"><div class="tiny muted" style="margin-bottom:8px">Everything is stored on this device only. Export a backup before clearing browser data or switching phones.</div><div class="row2"><button class="btn-secondary" data-act="dataExport">⬇ Export backup</button><button class="btn-secondary" data-act="dataImport">⬆ Import backup</button></div><input type="file" id="importFile" accept="application/json" style="display:none"/><button class="btn-remove" data-act="dataReset" style="margin-top:12px">Erase everything on this device</button></div></details>';
  }

  // ---------- COACH ----------
  function vCoach() {
    var p = P(), t = p && T(p);
    var qs = ['What should I eat before and after training?', 'Easy high-protein family dinners on a budget?', 'How do I get my kids to eat more protein?', 'I am short on protein today, quick fixes?', 'Do I need creatine?', 'Tips to sleep better?'];
    return '<div class="section-label">Ask your coach</div><div class="quick-prompts">' + qs.map(function (q, i) { return '<button class="quick-btn" data-act="coachQ" data-v="' + i + '">' + esc(q.replace(/\?$/, '')) + '?</button>'; }).join('') + '</div><div class="coach-input-row"><input class="coach-input" id="coachInput" type="text" placeholder="Ask about nutrition, training, sleep..." /><button class="ask-btn" data-act="coachAsk"' + (UI.coachBusy ? ' disabled' : '') + '>' + (UI.coachBusy ? '…' : 'Ask') + '</button></div><div id="coachResponse">' + UI.coach + '</div>' +
      (t && t.kcal ? '<div class="card-dark"><div class="tiny muted">Coach knows: ' + esc(p.name) + ', ' + p.age + ' y, ' + kgToUnit(p.weightKg, p) + ' ' + wUnit(p) + ', ' + esc(t.goalLabel) + ', ' + t.kcal + ' kcal, ' + t.protein + ' g protein</div></div>' : '') + '<div class="tiny muted" style="margin-top:12px">AI coach: general education, not medical advice.</div>';
  }
  async function coachAsk(q) {
    q = (q || ($('coachInput') && $('coachInput').value) || '').trim(); if (!q || UI.coachBusy) return;
    var p = P(), t = p && T(p), tot = p ? totals(logOf(p.id)) : null;
    var ctx = p && t && t.kcal ? 'Person: ' + p.name + ', ' + p.age + ' years, ' + p.weightKg + ' kg, ' + p.heightCm + ' cm, goal: ' + t.goalLabel + '. Targets: ' + t.kcal + ' kcal, ' + t.protein + ' g protein. Today so far: ' + Math.round(tot.protein) + ' g protein, ' + Math.round(tot.calories) + ' kcal. Family members: ' + DB.profiles.length + '.' : '';
    var sys = 'You are ' + APP + '\'s concise, practical, evidence-based nutrition and training coach for busy families (including a large homeschooling family on a budget). ' + ctx + ' Ground answers in current sports-nutrition and exercise science. Short, direct, actionable; bullet points when listing; max 150 words. If the person is under 18 never advise dieting or weight loss; recommend a GP or paediatrician for medical or growth concerns. You are not a doctor.';
    UI.coachBusy = true; UI.coach = '<div class="thinking">Coach is thinking...</div>'; render();
    try {
      var r = await fetch(WORKER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: q }] }], systemInstruction: sys }) }), d = await r.json();
      UI.coach = d.error ? '<div class="coach-response-box"><div class="coach-label" style="color:#ef4444">❌ Error</div><div class="coach-text">' + esc(d.error) + '</div></div>' : '<div class="coach-response-box"><div class="coach-label">🤖 Coach says:</div><div class="coach-text">' + esc(d.text || 'No response.') + '</div></div>';
    } catch (e) { UI.coach = '<div class="coach-response-box"><div class="coach-label" style="color:#ef4444">❌ Network error</div><div class="coach-text">Check your connection and try again.</div></div>'; }
    UI.coachBusy = false; render();
  }

  // ---------- events ----------
  var ACT = {
    tab: function (b) { setTab(b.dataset.v); },
    profAdd: function () { UI.edit = 'new'; UI.draft = newDraft(); setTab('me'); },
    profEdit: function (b) { var p = prof(b.dataset.v); UI.edit = p.id; UI.draft = JSON.parse(JSON.stringify(p)); setTab('me'); },
    profUse: function (b) { DB.active = b.dataset.v; save(); render(); },
    profCancel: function () { UI.edit = null; UI.draft = null; render(); },
    profSave: profSave,
    profDelete: function () { var d = UI.draft; if (!window.confirm('Delete ' + d.name + ' and all their logs?')) return; DB.profiles = DB.profiles.filter(function (p) { return p.id !== d.id; }); delete DB.logs[d.id]; delete DB.weights[d.id]; delete DB.workouts[d.id]; if (DB.active === d.id) DB.active = DB.profiles[0] ? DB.profiles[0].id : null; save(); UI.edit = null; UI.draft = null; render(); },
    draftSet: function (b) { var k = b.dataset.k, v = b.dataset.v; UI.draft[k] = v; if (k === 'goal' && v !== 'cut') {} render(); },
    logMode: function (b) { UI.logMode = b.dataset.v; render(); },
    mealPick: function (b) { UI.meal = b.dataset.v; render(); },
    foodSel: function (b) { var i = +b.dataset.v; UI.sel = UI.sel === i ? null : i; UI.qty = 1; drawFoodList(); },
    qty: function (b) { UI.qty = Math.max(0.5, UI.qty + +b.dataset.v); drawSelected(); },
    addFood: addFoodSel,
    customAdd: function () { var n = $('cName').value.trim(); if (!n) { toast('Give it a name'); return; } pushLog(P().id, { id: Date.now(), name: n, source: 'Custom', calories: +$('cKcal').value || 0, protein: +$('cPro').value || 0, carbs: +$('cCarb').value || 0, fat: +$('cFat').value || 0, meal: UI.meal }); toast('Added'); setTab('today'); },
    delLog: function (b) { var p = P(), d = today(), id = Number(b.dataset.v); DB.logs[p.id][d] = DB.logs[p.id][d].filter(function (i) { return i.id !== id; }); save(); render(); },
    scanPick: function () { var f = $('scanFile'); if (f) f.click(); },
    scanRun: scanRun,
    scanReset: function () { UI.scan = { b64: null, mime: null, items: [], step: 'upload', err: '' }; render(); },
    scanAdd: function () { UI.scan.items.push({ _id: Date.now(), name: 'Custom item', protein: 0, calories: 0, carbs: 0, fat: 0, confidence: 'low' }); render(); },
    scanDel: function (b) { var id = Number(b.dataset.v); UI.scan.items = UI.scan.items.filter(function (x) { return x._id !== id; }); render(); },
    scanSave: scanSave,
    memberToggle: function (b) { DB.include[b.dataset.v] = DB.include[b.dataset.v] === false; save(); render(); },
    planOpt: function (b) { DB.planOpts[b.dataset.v] = !DB.planOpts[b.dataset.v]; save(); render(); },
    planNew: function () { var ms = members(); if (!ms.length) { toast('Add a person first'); return; } DB.plan = E.planWeek(ms, planOptsFor(), null); DB.shop = {}; save(); UI.planDay = (new Date().getDay() + 6) % 7; UI.shopView = false; render(); },
    planShuffle: function () { var ms = members(); DB.plan = E.planWeek(ms, planOptsFor(), DB.plan); DB.shop = {}; save(); render(); },
    planDay: function (b) { UI.planDay = +b.dataset.v; render(); },
    shopView: function (b) { UI.shopView = b.dataset.v === '1'; render(); },
    lockSlot: function (b) { var day = DB.plan.days[UI.planDay]; day.locked = day.locked || {}; day.locked[b.dataset.v] = !day.locked[b.dataset.v]; save(); render(); },
    swapSlot: function (b) {
      var s = b.dataset.v, day = DB.plan.days[UI.planDay], o = planOptsFor();
      var pool = D.RECIPES.filter(function (r) { return r.meal === s && r.id !== day[s] && (!o.veg || r.veg) && (!o.budget || r.cost <= 2); });
      if (!pool.length) { toast('No other options with these filters'); return; }
      day[s] = pool[Math.floor(Math.random() * pool.length)].id; DB.shop = {}; save(); render();
    },
    openRecipe: function (b) { UI.openRecipe = UI.openRecipe === b.dataset.v ? null : b.dataset.v; render(); },
    logSlot: function (b) { var p = P(), s = b.dataset.v, day = DB.plan.days[UI.planDay], f = E.dayFactors(day, members())[p.id] || 1; logRecipe(p, E.recipeById(day[s]), s, f); toast('Logged for ' + p.name); },
    logDay: function (b) { var p = P(), di = +b.dataset.v, day = DB.plan.days[di], ms = members(), f = (ms.length ? E.dayFactors(day, ms)[p.id] : 1) || 1; E.SLOTS.forEach(function (s) { logRecipe(p, E.recipeById(day[s]), s, f); }); toast('Day logged for ' + p.name); setTab('today'); },
    shopCopy: function () { var sl = E.shoppingList(DB.plan, members()), txt = APP + ' shopping list\n'; Object.keys(sl).sort().forEach(function (a) { txt += '\n' + a + '\n' + sl[a].map(function (i) { return '☐ ' + i.name + ' - ' + i.label; }).join('\n') + '\n'; }); if (navigator.share) navigator.share({ title: APP + ' shopping list', text: txt }).catch(function () {}); else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { toast('List copied'); }); else toast('Copy not supported here'); },
    shopClear: function () { DB.shop = {}; save(); render(); },
    sessOpen: function (b) { UI.sess = +b.dataset.v; UI.tab = 'train'; render(); window.scrollTo(0, 0); },
    sessClose: function () { UI.sess = null; render(); },
    sessSave: sessSave,
    circStart: function (b) { circStart(b.dataset.v); window.scrollTo(0, 0); },
    circStop: function () { circStop(); },
    weightAdd: function () { var v = parseFloat($('wIn').value), p = P(); if (!(v > 0)) { toast('Enter your weight'); return; } var kg = p.units === 'imperial' ? E.lbToKg(v) : v; if (kg < 20 || kg > 300) { toast('That does not look right'); return; } var wl = (DB.weights[p.id] = DB.weights[p.id] || []).filter(function (x) { return x.d !== today(); }); wl.push({ d: today(), kg: Math.round(kg * 10) / 10 }); DB.weights[p.id] = wl; p.weightKg = Math.round(kg * 10) / 10; save(); toast('Weight saved'); render(); },
    applyAdvice: function (b) { var p = P(); p.kcalAdjust = (+p.kcalAdjust || 0) + +b.dataset.v; save(); toast('Calories adjusted'); render(); },
    resetAdjust: function () { P().kcalAdjust = 0; save(); render(); },
    notifDel: function (b) { var id = +b.dataset.v; DB.notif.meals = DB.notif.meals.filter(function (m) { return m.id !== id; }); save(); schedule(); render(); },
    notifAdd: function () { DB.notif.meals.push({ id: Date.now(), name: 'Snack', time: '15:00', enabled: true }); save(); schedule(); render(); },
    notifTest: function () { if (permState() !== 'granted') { toast('Enable notifications first'); return; } fire('Test Meal'); },
    dataExport: function () { var blob = new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fueld-backup-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove(); },
    dataImport: function () { $('importFile').click(); },
    dataReset: function () { if (window.confirm('Erase ALL Fueld data on this device? This cannot be undone.')) { DB = fresh(); save(); UI.edit = null; render(); } },
    coachAsk: function () { coachAsk(); },
    coachQ: function (b) { var qs = ['What should I eat before and after training?', 'Easy high-protein family dinners on a budget?', 'How do I get my kids to eat more protein?', 'I am short on protein today, quick fixes?', 'Do I need creatine?', 'Tips to sleep better?']; coachAsk(qs[+b.dataset.v]); }
  };
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (b && ACT[b.dataset.act]) { e.preventDefault(); ACT[b.dataset.act](b, e); } });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.f && UI.draft && !t.dataset.rerender && t.tagName === 'INPUT' && t.type !== 'checkbox') setField(t);
    if (t.dataset && t.dataset.scan) { var it = UI.scan.items.filter(function (x) { return x._id === +t.dataset.id; })[0]; if (it) it[t.dataset.scan] = t.dataset.scan === 'name' ? t.value : (parseFloat(t.value) || 0); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'profSel') { if (t.value === '__new') { ACT.profAdd(); } else { DB.active = t.value; save(); render(); } return; }
    if (t.dataset && t.dataset.f && UI.draft) { setField(t); if (t.tagName === 'SELECT' || t.dataset.rerender || t.type === 'checkbox') render(); return; }
    if (t.dataset && t.dataset.shop) { if (t.checked) DB.shop[t.dataset.shop] = true; else delete DB.shop[t.dataset.shop]; save(); render(); return; }
    if (t.id === 'scanFile') { var f = t.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function (ev) { UI.scan.mime = f.type || 'image/jpeg'; UI.scan.b64 = String(ev.target.result).split(',')[1]; UI.scan.err = ''; render(); }; rd.readAsDataURL(f); return; }
    if (t.id === 'importFile') { var f2 = t.files[0]; if (!f2) return; var r2 = new FileReader(); r2.onload = function (ev) { try { var d = JSON.parse(ev.target.result); if (!d.profiles) throw 0; DB = d; var fr = fresh(); for (var k in fr) if (DB[k] === undefined) DB[k] = fr[k]; save(); toast('Backup restored'); render(); } catch (x) { toast('That file is not a Fueld backup'); } }; r2.readAsText(f2); return; }
    if (t.dataset && t.dataset.nt) {
      var kind = t.dataset.nt;
      if (kind === 'master') {
        (async function () {
          if (t.checked) { var pm = await askPerm(); if (pm === 'unsupported') { t.checked = false; return; } if (pm !== 'granted') { t.checked = false; DB.notif.enabled = false; save(); render(); return; } DB.notif.enabled = true; } else DB.notif.enabled = false;
          save(); schedule(); render();
        })();
      } else { var m = DB.notif.meals.filter(function (x) { return x.id === +t.dataset.id; })[0]; if (m) { if (kind === 'time') m.time = t.value; else m.enabled = t.checked; save(); schedule(); } }
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.id === 'coachInput') coachAsk(); });

  window.addEventListener('DOMContentLoaded', function () {
    document.title = APP;
    if (!DB.active && DB.profiles[0]) DB.active = DB.profiles[0].id;
    if (!DB.profiles.length) UI.tab = 'today';
    render();
    var ln0 = nativeLN();
    if (ln0) { ln0.checkPermissions().then(function (r) { UI.nativePerm = r.display === 'granted' ? 'granted' : r.display === 'denied' ? 'denied' : 'default'; schedule(); }).catch(function () { schedule(); }); } else schedule();
    if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) { navigator.serviceWorker.register('sw.js').catch(function () {}); }
  });
  window.FD_UI = { DB: function () { return DB; }, render: render, ACT: ACT, UI: UI };
})();
