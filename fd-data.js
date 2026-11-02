/* Fueld data: ingredients, recipes, exercises, family circuits. Pure data, no DOM.
   Per-100g macros are typical values (USDA / Irish CoFID style); edit freely. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FD_DATA = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // id: [name, kcal, protein, carbs, fat (per 100g), aisle, unitName, unitGrams]
  var ING = {
    chicken:   ['Chicken breast (raw)', 120, 22.5, 0, 2.6, 'Meat & fish'],
    beefmince: ['Beef mince 10% (raw)', 176, 20, 0, 10, 'Meat & fish'],
    turkey:    ['Turkey mince (raw)', 148, 20, 0, 7, 'Meat & fish'],
    salmon:    ['Salmon fillet', 208, 20, 0, 13, 'Meat & fish'],
    whitefish: ['White fish (frozen)', 82, 18, 0, 0.7, 'Meat & fish'],
    tuna:      ['Tuna in water (tin)', 116, 26, 0, 1, 'Tins & dry', 'tin', 120],
    eggs:      ['Eggs', 143, 12.6, 0.7, 9.5, 'Dairy & eggs', 'egg', 50],
    milk:      ['Milk', 61, 3.2, 4.8, 3.3, 'Dairy & eggs'],
    yoghurt:   ['Greek yoghurt (low-fat)', 73, 10, 4, 2, 'Dairy & eggs'],
    cottage:   ['Cottage cheese', 98, 11, 3.4, 4.3, 'Dairy & eggs'],
    cheese:    ['Cheddar', 402, 25, 1.3, 33, 'Dairy & eggs'],
    oats:      ['Porridge oats', 379, 13, 68, 6.5, 'Tins & dry'],
    rice:      ['Rice (dry)', 360, 7, 80, 0.6, 'Tins & dry'],
    pasta:     ['Pasta (dry)', 371, 13, 75, 1.5, 'Tins & dry'],
    flour:     ['Plain flour', 364, 10, 76, 1, 'Tins & dry'],
    lentils:   ['Red lentils (dry)', 352, 24, 60, 1.1, 'Tins & dry'],
    chickpeas: ['Chickpeas (tin, drained)', 130, 7.5, 20, 2.5, 'Tins & dry'],
    beans:     ['Kidney/black beans (tin, drained)', 110, 7, 18, 0.5, 'Tins & dry'],
    tomatoes:  ['Chopped tomatoes (tin)', 21, 1, 4, 0.1, 'Tins & dry'],
    sweetcorn: ['Sweetcorn (tin)', 86, 3, 19, 1.4, 'Tins & dry'],
    pb:        ['Peanut butter', 588, 25, 20, 50, 'Tins & dry'],
    oil:       ['Olive / rapeseed oil', 884, 0, 0, 100, 'Tins & dry'],
    bread:     ['Wholemeal bread', 247, 13, 41, 3.4, 'Bakery', 'slice', 35],
    wrap:      ['Tortilla wraps', 310, 8, 52, 7, 'Bakery', 'wrap', 60],
    potatoes:  ['Potatoes', 77, 2, 17, 0.1, 'Fruit & veg'],
    onion:     ['Onion', 40, 1.1, 9, 0.1, 'Fruit & veg'],
    carrot:    ['Carrots', 41, 0.9, 10, 0.2, 'Fruit & veg'],
    broccoli:  ['Broccoli', 34, 2.8, 7, 0.4, 'Fruit & veg'],
    spinach:   ['Spinach', 23, 2.9, 3.6, 0.4, 'Fruit & veg'],
    pepper:    ['Bell pepper', 31, 1, 6, 0.3, 'Fruit & veg'],
    frozenveg: ['Frozen mixed veg', 55, 3.5, 8.5, 0.7, 'Freezer'],
    berries:   ['Frozen berries', 45, 0.7, 10, 0.3, 'Freezer'],
    banana:    ['Banana', 89, 1.1, 23, 0.3, 'Fruit & veg', 'banana', 120],
    apple:     ['Apple', 52, 0.3, 14, 0.2, 'Fruit & veg', 'apple', 180]
  };
  var INGREDIENTS = {};
  Object.keys(ING).forEach(function (id) {
    var a = ING[id];
    INGREDIENTS[id] = { id: id, name: a[0], k: a[1], p: a[2], c: a[3], f: a[4], aisle: a[5], unit: a[6] || null, unitG: a[7] || null };
  });

  // Recipes: ingredients are grams for ONE ADULT-SIZED SERVING (1.0x). cost 1-3 (low-high). veg = vegetarian.
  function R(id, name, meal, cost, veg, ings, method, tags) {
    return { id: id, name: name, meal: meal, cost: cost, veg: veg, ings: ings, method: method, tags: tags || [] };
  }
  var RECIPES = [
    // breakfasts
    R('b_oats', 'Protein porridge', 'breakfast', 1, true, { oats: 60, milk: 250, banana: 100, pb: 10 },
      'Simmer oats in the milk 4-5 min, stir in peanut butter, top with sliced banana.', ['kid', 'quick']),
    R('b_eggtoast', 'Scrambled eggs on toast', 'breakfast', 1, true, { eggs: 150, bread: 70, oil: 4, spinach: 20 },
      'Scramble eggs in a little oil, fold through spinach, serve on toast.', ['kid', 'quick']),
    R('b_yoghurt', 'Greek yoghurt, berries & oats', 'breakfast', 2, true, { yoghurt: 200, berries: 80, oats: 35 },
      'Spoon yoghurt into bowls, top with berries and raw or toasted oats.', ['kid', 'quick']),
    R('b_wrap', 'Egg & cheese breakfast wrap', 'breakfast', 1, true, { eggs: 100, wrap: 60, cheese: 20, pepper: 30 },
      'Scramble eggs with diced pepper, roll in a warm wrap with grated cheese.', ['kid', 'quick']),
    R('b_pbtoast', 'Peanut butter banana toast + milk', 'breakfast', 1, true, { bread: 70, pb: 20, banana: 120, milk: 200 },
      'Spread peanut butter on toast, add sliced banana, serve with a glass of milk.', ['kid', 'quick']),
    // lunches
    R('l_tunapasta', 'Tuna pasta salad', 'lunch', 1, false, { pasta: 80, tuna: 80, sweetcorn: 40, pepper: 30, oil: 5 },
      'Cook pasta, cool under cold water, mix with tuna, sweetcorn, diced pepper and oil.', ['kid', 'batch']),
    R('l_chickenrice', 'Chicken & rice bowl', 'lunch', 2, false, { chicken: 120, rice: 70, broccoli: 80, oil: 5 },
      'Cook rice. Pan-fry sliced chicken 6-8 min, steam broccoli, serve together.', ['batch']),
    R('l_lentilsoup', 'Red lentil soup + bread', 'lunch', 1, true, { lentils: 60, carrot: 60, onion: 40, tomatoes: 100, bread: 70 },
      'Soften onion and carrot, add lentils, tomatoes and 600 ml water, simmer 20 min, blend if you like. Serve with bread.', ['batch', 'kid']),
    R('l_quesadilla', 'Bean & cheese quesadilla', 'lunch', 1, true, { wrap: 120, beans: 80, cheese: 30, pepper: 30 },
      'Fill wraps with beans, cheese and pepper, fold and toast in a dry pan until crisp.', ['kid', 'quick']),
    R('l_friedrice', 'Egg fried rice', 'lunch', 1, true, { rice: 70, eggs: 100, frozenveg: 80, oil: 8 },
      'Use cold cooked rice. Fry veg, push aside, scramble eggs, mix everything together.', ['kid', 'quick']),
    // dinners
    R('d_stirfry', 'Chicken stir-fry with rice', 'dinner', 2, false, { chicken: 140, rice: 75, frozenveg: 120, oil: 8 },
      'Cook rice. Stir-fry sliced chicken 6 min, add veg and a splash of soy or stock, serve over rice.', ['quick', 'kid']),
    R('d_bolognese', 'Beef & lentil bolognese', 'dinner', 1, false, { beefmince: 80, lentils: 20, tomatoes: 150, onion: 40, carrot: 40, pasta: 85 },
      'Brown the mince with onion and carrot, add lentils and tomatoes, simmer 25 min. Serve on pasta. Lentils stretch the meat cheaply.', ['kid', 'batch']),
    R('d_chilli', 'Turkey bean chilli with rice', 'dinner', 1, false, { turkey: 100, beans: 80, tomatoes: 150, onion: 40, rice: 65, pepper: 40 },
      'Brown turkey with onion, add beans, tomatoes and pepper, simmer 25 min, spice to taste (mild for kids). Serve with rice.', ['batch', 'kid']),
    R('d_salmon', 'Baked salmon, potatoes & broccoli', 'dinner', 3, false, { salmon: 130, potatoes: 250, broccoli: 100, oil: 5 },
      'Roast potato wedges 30 min, add salmon for the last 12 min, steam the broccoli.', []),
    R('d_sheetpan', 'Sheet-pan chicken & potatoes', 'dinner', 2, false, { chicken: 150, potatoes: 250, carrot: 80, oil: 8 },
      'Toss everything in oil and seasoning, roast at 200C for 35-40 min.', ['kid', 'batch']),
    R('d_curry', 'Chickpea & spinach curry with rice', 'dinner', 1, true, { chickpeas: 120, tomatoes: 120, spinach: 50, onion: 40, rice: 70, oil: 6 },
      'Soften onion with curry spices, add chickpeas and tomatoes, simmer 15 min, wilt in spinach. Serve with rice.', ['batch']),
    R('d_fishwedges', 'Fish & wedges with peas', 'dinner', 2, false, { whitefish: 150, potatoes: 250, frozenveg: 80, oil: 8 },
      'Roast wedges 30 min, bake the fish 12-15 min, boil the veg.', ['kid']),
    R('d_pastabake', 'Cheesy chicken pasta bake', 'dinner', 2, false, { chicken: 110, pasta: 85, tomatoes: 120, cheese: 30, broccoli: 60 },
      'Cook pasta and chicken pieces, mix with tomatoes and broccoli, top with cheese, bake 20 min at 190C.', ['kid', 'batch']),
    R('d_frittata', 'Veg & potato frittata', 'dinner', 1, true, { eggs: 150, potatoes: 200, onion: 30, pepper: 40, cheese: 20, oil: 6 },
      'Fry sliced par-boiled potato and veg, pour over beaten eggs, add cheese, finish under the grill.', ['kid', 'quick']),
    // snacks
    R('s_applepb', 'Apple & peanut butter', 'snack', 1, true, { apple: 180, pb: 20 }, 'Slice the apple and dip.', ['kid', 'quick']),
    R('s_yoghurtberry', 'Yoghurt & berries', 'snack', 2, true, { yoghurt: 170, berries: 60 }, 'Spoon together.', ['kid', 'quick']),
    R('s_cottagebanana', 'Cottage cheese & banana', 'snack', 1, true, { cottage: 150, banana: 120 }, 'Bowl of cottage cheese with sliced banana.', ['quick']),
    R('s_eggscarrot', 'Boiled eggs & carrot sticks', 'snack', 1, true, { eggs: 100, carrot: 80 }, 'Boil eggs 9 min, serve with carrot sticks.', ['kid', 'quick']),
    R('s_cheesetoast', 'Cheese on toast', 'snack', 1, true, { bread: 70, cheese: 25 }, 'Grill until bubbling.', ['kid', 'quick'])
  ];

  // Exercises. m = primary muscle, s = secondary muscles (half credit), t = c(ompound)/i(solation),
  // eq = environments it works in: gym | db (dumbbells at home) | bw (no equipment). lv = [min,max] experience (0 beginner,1 intermediate,2 advanced).
  function X(id, n, m, s, t, eq, lv, reps, cue) { return { id: id, n: n, m: m, s: s, t: t, eq: eq, lv: lv || [0, 2], reps: reps || null, cue: cue || '' }; }
  var EXERCISES = [
    // chest
    X('bench', 'Barbell bench press', 'chest', ['triceps', 'shoulders'], 'c', ['gym'], [1, 2], null, 'Shoulder blades pinched back, touch lower chest, drive up.'),
    X('db_press', 'Dumbbell bench press', 'chest', ['triceps', 'shoulders'], 'c', ['gym', 'db'], [0, 2], null, 'Floor press works if you have no bench.'),
    X('incline_db', 'Incline dumbbell press', 'chest', ['shoulders', 'triceps'], 'c', ['gym', 'db'], [0, 2], null, 'Bench at about 30 degrees.'),
    X('pushup', 'Push-up', 'chest', ['triceps', 'shoulders'], 'c', ['gym', 'db', 'bw'], [0, 2], [6, 15], 'Straight line head to heels; chest to the floor.'),
    X('inc_pushup', 'Incline push-up (hands on a bench/counter)', 'chest', ['triceps', 'shoulders'], 'c', ['bw'], [0, 0], [8, 15], 'Lower the incline as you get stronger.'),
    X('feet_pushup', 'Feet-elevated push-up', 'chest', ['shoulders', 'triceps'], 'c', ['bw'], [1, 2], [6, 15], 'Feet on a chair; harder, hits upper chest.'),
    X('cable_fly', 'Cable fly', 'chest', [], 'i', ['gym'], [0, 2], [10, 15], 'Soft elbows, squeeze hands together.'),
    X('db_fly', 'Dumbbell fly', 'chest', [], 'i', ['db', 'gym'], [0, 2], [10, 15], 'Wide arc, stop when you feel a stretch.'),
    // back
    X('latpull', 'Lat pulldown', 'back', ['biceps'], 'c', ['gym'], [0, 2], [8, 12], 'Pull elbows down to your ribs.'),
    X('bbrow', 'Barbell row', 'back', ['biceps'], 'c', ['gym'], [1, 2], [6, 10], 'Hinge, flat back, pull to lower ribs.'),
    X('cablerow', 'Seated cable row', 'back', ['biceps'], 'c', ['gym'], [0, 2], [8, 12], 'Pause with shoulder blades squeezed.'),
    X('dbrow', 'One-arm dumbbell row', 'back', ['biceps'], 'c', ['gym', 'db'], [0, 2], [8, 12], 'Brace on a bench or chair, elbow to hip.'),
    X('pullup', 'Pull-up / chin-up', 'back', ['biceps'], 'c', ['gym', 'bw'], [1, 2], [5, 12], 'Full hang to chin over bar.'),
    X('invrow', 'Inverted row (sturdy table or low bar)', 'back', ['biceps'], 'c', ['bw'], [0, 2], [6, 15], 'Body straight, pull chest to the edge.'),
    // shoulders
    X('dbohp', 'Dumbbell shoulder press', 'shoulders', ['triceps'], 'c', ['gym', 'db'], [0, 2], [8, 12], 'Ribs down, press straight overhead.'),
    X('bbohp', 'Barbell overhead press', 'shoulders', ['triceps'], 'c', ['gym'], [1, 2], [5, 8], 'Squeeze glutes, bar path close to face.'),
    X('latraise', 'Lateral raise', 'shoulders', [], 'i', ['gym', 'db'], [0, 2], [10, 20], 'Lead with elbows, stop at shoulder height.'),
    X('cablelat', 'Cable lateral raise', 'shoulders', [], 'i', ['gym'], [0, 2], [10, 20], 'Constant tension through the whole arc.'),
    X('reardelt', 'Rear-delt fly (bent over)', 'shoulders', ['back'], 'i', ['gym', 'db'], [0, 2], [12, 20], 'Chest low, sweep arms out wide.'),
    X('pike', 'Pike push-up', 'shoulders', ['triceps'], 'c', ['bw'], [0, 2], [5, 12], 'Hips high, head moves between hands.'),
    X('bplat', 'Backpack lateral raise', 'shoulders', [], 'i', ['bw'], [0, 2], [12, 20], 'Load a backpack with books; raise to shoulder height.'),
    // biceps
    X('dbcurl', 'Dumbbell curl', 'biceps', [], 'i', ['gym', 'db'], [0, 2], [8, 14], 'No swinging; control the way down.'),
    X('cablecurl', 'Cable curl', 'biceps', [], 'i', ['gym'], [0, 2], [10, 15], 'Elbows pinned to your sides.'),
    X('hammer', 'Hammer curl', 'biceps', [], 'i', ['gym', 'db'], [0, 2], [8, 14], 'Neutral grip, hits the forearm too.'),
    X('bpcurl', 'Backpack curl', 'biceps', [], 'i', ['bw'], [0, 2], [10, 20], 'Heavy backpack held by the handles.'),
    X('chinup', 'Chin-up (underhand)', 'biceps', ['back'], 'c', ['bw', 'gym'], [1, 2], [5, 12], 'Underhand grip, full range.'),
    // triceps
    X('pushdown', 'Triceps pushdown', 'triceps', [], 'i', ['gym'], [0, 2], [10, 15], 'Elbows locked at your sides.'),
    X('ohext', 'Overhead triceps extension', 'triceps', [], 'i', ['gym', 'db'], [0, 2], [10, 15], 'Deep stretch behind the head.'),
    X('skull', 'Lying dumbbell triceps extension', 'triceps', [], 'i', ['db', 'gym'], [0, 2], [10, 15], 'Lower to forehead height, elbows still.'),
    X('closepush', 'Close-grip push-up', 'triceps', ['chest'], 'c', ['bw'], [0, 2], [6, 15], 'Hands under shoulders, elbows brush ribs.'),
    X('dips', 'Bench / chair dips', 'triceps', ['chest'], 'c', ['bw', 'gym'], [0, 2], [8, 15], 'Shoulders down, only go as deep as is comfortable.'),
    // quads
    X('squat', 'Barbell back squat', 'quads', ['glutes'], 'c', ['gym'], [1, 2], [5, 8], 'Brace, knees over toes, hit at least parallel.'),
    X('goblet', 'Goblet squat', 'quads', ['glutes'], 'c', ['gym', 'db'], [0, 2], [8, 12], 'Hold a dumbbell at your chest, sit between your hips.'),
    X('legpress', 'Leg press', 'quads', ['glutes'], 'c', ['gym'], [0, 2], [8, 12], 'Deep range, do not lock knees hard.'),
    X('bulgarian', 'Split squat (rear foot on a chair)', 'quads', ['glutes'], 'c', ['db', 'gym', 'bw'], [0, 2], [8, 12], 'Hold dumbbells if you have them.'),
    X('bwsquat', 'Bodyweight squat', 'quads', ['glutes'], 'c', ['bw'], [0, 0], [12, 20], 'Slow 3-second lowering.'),
    X('lunge', 'Walking lunge', 'quads', ['glutes'], 'c', ['gym', 'db', 'bw'], [0, 2], [8, 14], 'Long stride, upright torso.'),
    X('legext', 'Leg extension', 'quads', [], 'i', ['gym'], [0, 2], [10, 15], 'Squeeze at the top.'),
    X('stepup', 'Step-up', 'quads', ['glutes'], 'c', ['db', 'bw'], [0, 2], [8, 12], 'Drive through the heel of the top foot.'),
    // hamstrings
    X('rdl', 'Romanian deadlift (barbell)', 'hams', ['glutes', 'back'], 'c', ['gym'], [1, 2], [6, 10], 'Hinge at the hips, soft knees, feel the hamstring stretch.'),
    X('dbrdl', 'Dumbbell Romanian deadlift', 'hams', ['glutes'], 'c', ['gym', 'db'], [0, 2], [8, 12], 'Dumbbells slide down the thighs.'),
    X('legcurl', 'Lying / seated leg curl', 'hams', [], 'i', ['gym'], [0, 2], [10, 15], 'Slow lowering phase.'),
    X('slrdl', 'Single-leg RDL', 'hams', ['glutes'], 'c', ['db', 'bw'], [1, 2], [8, 12], 'Hold a wall or chair for balance if needed.'),
    X('slidecurl', 'Hamstring slider curl (towel on smooth floor)', 'hams', [], 'i', ['bw'], [0, 2], [6, 12], 'Hips up, slide heels out and back.'),
    // glutes
    X('hipthrust', 'Hip thrust', 'glutes', ['hams'], 'c', ['gym'], [0, 2], [8, 12], 'Chin tucked, pause and squeeze at the top.'),
    X('dbthrust', 'Dumbbell hip thrust', 'glutes', ['hams'], 'c', ['db'], [0, 2], [10, 15], 'Shoulders on a sofa or bench.'),
    X('bridge', 'Glute bridge', 'glutes', ['hams'], 'c', ['bw'], [0, 0], [12, 20], 'Pause at the top for 2 seconds.'),
    X('slbridge', 'Single-leg glute bridge', 'glutes', ['hams'], 'c', ['bw'], [1, 2], [8, 15], 'Keep hips level.'),
    // calves
    X('calf', 'Standing calf raise', 'calves', [], 'i', ['gym', 'db'], [0, 2], [10, 20], 'Full stretch at the bottom, pause at the top.'),
    X('slcalf', 'Single-leg calf raise (on a step)', 'calves', [], 'i', ['bw'], [0, 2], [10, 20], 'Slow, full range.'),
    // core
    X('plank', 'Plank', 'core', [], 'i', ['gym', 'db', 'bw'], [0, 2], 'time', 'Ribs down, squeeze glutes. Hold 30-60 s.'),
    X('deadbug', 'Dead bug', 'core', [], 'i', ['gym', 'db', 'bw'], [0, 2], [8, 14], 'Lower back stays flat to the floor.'),
    X('cablecrunch', 'Cable crunch', 'core', [], 'i', ['gym'], [0, 2], [10, 15], 'Curl the ribs to the pelvis.'),
    X('legraise', 'Hanging / lying leg raise', 'core', [], 'i', ['gym', 'bw'], [1, 2], [8, 15], 'No swinging.')
  ];

  var MUSCLE_LABEL = { chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
    quads: 'Quads', hams: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', core: 'Core' };

  // Family circuits anyone can do together (kids included). Work/rest in seconds.
  var CIRCUITS = [
    { id: 'c1', name: 'Zoo Animals', rounds: 3, work: 40, rest: 20, stations: [
      ['Bear crawl', 'Crawl on hands and feet around the room'], ['Frog jumps', 'Squat low and leap forward'],
      ['Crab walk', 'Tummy up, walk on hands and feet'], ['Star jumps', 'Arms and legs wide'],
      ['Penguin squats', 'Squat with arms straight by your sides'], ['Plank hold', 'Tall and still like a log']] },
    { id: 'c2', name: 'Superhero Training', rounds: 3, work: 40, rest: 20, stations: [
      ['Push-ups (knees ok)', 'Chest to the floor'], ['Air squats', 'Sit back like a chair'],
      ['Superman holds', 'Lie on tummy, lift arms and legs'], ['Mountain climbers', 'Run on the spot with hands on floor'],
      ['Reverse lunges', 'Step back, knee down gently'], ['Dead bugs', 'Slow opposite arm and leg']] },
    { id: 'c3', name: 'Living Room Olympics', rounds: 3, work: 45, rest: 15, stations: [
      ['Skater hops', 'Side to side like a speed skater'], ['Wall sit', 'Back against the wall, knees at 90 degrees'],
      ['Burpees (step-back version)', 'Down, back, up, reach'], ['Glute bridges', 'Squeeze at the top'],
      ['High knees', 'Fast feet'], ['Tricep dips on a chair', 'Shoulders down']] },
    { id: 'c4', name: 'Garden Gym', rounds: 4, work: 30, rest: 30, stations: [
      ['Lunges across the lawn', 'Take big steps'], ['Wheelbarrow walk (pairs)', 'One holds legs, one walks on hands'],
      ['Squat jumps', 'Land softly'], ['Bear plank shoulder taps', 'Tap opposite shoulders'],
      ['Sprint to the fence and back', 'All out!']] },
    { id: 'c5', name: 'Mobility & Play', rounds: 2, work: 45, rest: 15, stations: [
      ['World\'s greatest stretch', 'Lunge, twist, reach'], ['Cat-cow', 'Slow spine waves'], ['Deep squat hold', 'Heels down, chest up'],
      ['Hip circles', 'Big slow circles'], ['Arm circles', 'Forward then back'], ['Balance on one leg', 'Eyes closed for a challenge']] }
  ];

  return { INGREDIENTS: INGREDIENTS, RECIPES: RECIPES, EXERCISES: EXERCISES, MUSCLE_LABEL: MUSCLE_LABEL, CIRCUITS: CIRCUITS };
});
