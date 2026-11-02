import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../fd-engine.js');
const D = require('../fd-data.js');

const dad = { id: 'dad', name: 'Dad', sex: 'm', age: 35, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'build', leanness: 'average', experience: 'beginner', days: 3, equipment: 'gym' };
const mum = { id: 'mum', name: 'Mum', sex: 'f', age: 34, heightCm: 165, weightKg: 65, activity: 'light', goal: 'cut', leanness: 'average', pace: 'standard', experience: 'beginner', days: 3, equipment: 'db' };
const kid = { id: 'kid', name: 'Kid', sex: 'f', age: 9, heightCm: 135, weightKg: 30, activity: 'active', goal: 'maintain', experience: 'beginner', days: 2, equipment: 'bw' };

test('adult build targets are sane', () => {
  const t = E.calcTargets(dad);
  assert.equal(t.bmr, 1755);               // 800+1125-175+5
  assert.ok(t.kcal > t.tdee && t.kcal - t.tdee < 400);
  assert.ok(t.protein >= 1.6 * 80 && t.protein <= 2.2 * 80);
  assert.ok(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal) < 30);
});
test('cut never goes below floor and caps rate at 0.5%/wk', () => {
  const t = E.calcTargets(mum);
  assert.ok(t.kcal >= 1200); assert.ok(t.weeklyRatePct >= -0.5);
  const tiny = E.calcTargets({ ...mum, weightKg: 45, heightCm: 150, age: 60, activity: 'sedentary' });
  assert.ok(tiny.kcal >= 1200);
});
test('higher body fat + build becomes recomp (small deficit)', () => {
  const t = E.calcTargets({ ...dad, leanness: 'higher' });
  assert.equal(t.effGoal, 'recomp'); assert.ok(t.deltaKcal < 0);
});
test('children never get a deficit or weight goal', () => {
  const t = E.calcTargets({ ...kid, goal: 'cut' });
  assert.equal(t.mode, 'child'); assert.equal(t.weeklyKg, 0);
  assert.ok(t.kcal > 1500 && t.kcal < 2400);
});
test('pregnant/breastfeeding forced to maintain', () => {
  const t = E.calcTargets({ ...mum, special: true });
  assert.equal(t.effGoal, 'maintain');
});
test('routines for every days/equipment/level combination', () => {
  for (const eq of ['gym', 'db', 'bw']) for (const lv of ['beginner', 'intermediate', 'advanced']) for (const days of [2, 3, 4, 5, 6]) {
    const rt = E.generateRoutine({ ...dad, equipment: eq, experience: lv, days });
    assert.equal(rt.sessions.length, days);
    for (const s of rt.sessions) {
      assert.ok(s.exercises.length >= 3 && s.exercises.length <= 12, `${eq} ${lv} ${days} ${s.name} -> ${s.exercises.length}`);
      for (const ex of s.exercises) { const x = D.EXERCISES.find(e => e.id === ex.id); assert.ok(x.eq.includes(eq), `${ex.name} not for ${eq}`); }
    }
  }
});
test('bodyweight routine is truly equipment-free and kids get light volume', () => {
  const rt = E.generateRoutine({ ...kid });
  assert.ok(rt.youth); assert.ok(rt.sessions.length <= 3);
  rt.sessions.forEach(s => s.exercises.forEach(x => assert.ok(x.sets <= 3)));
});
test('major muscles are hit at least twice a week on 3+ days', () => {
  const rt = E.generateRoutine({ ...dad, days: 4, experience: 'intermediate' });
  const count = {}; rt.sessions.forEach(s => new Set(s.exercises.map(e => e.muscle)).forEach(m => count[m] = (count[m] || 0) + 1));
  for (const m of ['chest', 'back', 'quads', 'hams']) assert.ok(count[m] >= 2, m);
});
test('recipe macros add up and every recipe is sensible', () => {
  for (const r of D.RECIPES) {
    const m = E.recipeMacros(r);
    assert.ok(m.kcal > 150 && m.kcal < 1100, r.id + ' ' + m.kcal);
    for (const id of Object.keys(r.ings)) assert.ok(D.INGREDIENTS[id], 'unknown ingredient ' + id);
  }
});
test('meal plan: 7 days, scaled portions land near each target; shopping list non-empty', () => {
  const ms = [dad, mum, kid].map(p => ({ id: p.id, name: p.name, targets: E.calcTargets(p) }));
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const plan = E.planWeek(ms, {}, null, rng);
  assert.equal(plan.days.length, 7);
  for (const day of plan.days) {
    const f = E.dayFactors(day, ms);
    for (const m of ms) { const t = E.dayTotals(day, m, f[m.id]); assert.ok(Math.abs(t.kcal - m.targets.kcal) / m.targets.kcal < 0.2, `${m.id} ${t.kcal} vs ${m.targets.kcal}`); }
  }
  assert.equal(new Set(plan.days.map(d => d.dinner)).size >= 5, true);
  const sl = E.shoppingList(plan, ms); assert.ok(Object.keys(sl).length >= 3);
  const veg = E.planWeek(ms, { veg: true }, null, rng);
  veg.days.forEach(d => ['breakfast', 'lunch', 'dinner', 'snack'].forEach(s => assert.ok(E.recipeById(d[s]).veg)));
});
test('locked slots survive a re-plan', () => {
  const ms = [dad].map(p => ({ id: p.id, name: p.name, targets: E.calcTargets(p) }));
  const plan = E.planWeek(ms, {}, null);
  plan.days[2].locked.dinner = true;
  const again = E.planWeek(ms, {}, plan);
  assert.equal(again.days[2].dinner, plan.days[2].dinner);
});
test('trend advice nudges calories', () => {
  const t = E.calcTargets(dad);
  const e = []; const base = new Date('2026-10-01T12:00:00');
  for (let i = 0; i < 14; i++) { const d = new Date(base.getTime() + i * 86400000); e.push({ d: d.toISOString().slice(0, 10), kg: 80.0 }); }
  const a = E.trendAdvice(e, t);
  assert.equal(a.status, 'adjust'); assert.equal(a.delta, 150);
});
