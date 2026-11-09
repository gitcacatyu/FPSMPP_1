const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, "index.html must contain the game script");
const script = scriptMatch[1];

function createGame() {
  const elements = new Map();
  for (const [, id] of html.matchAll(/id="([^"]+)"/g)) {
    const classes = new Set();
    elements.set(id, {
      id,
      value: id === "gameMode" ? "normal" : id === "difficulty" ? "normal" : "PISTOLA",
      checked: true,
      hidden: false,
      textContent: "",
      innerHTML: "",
      style: {},
      listeners: {},
      dataset: {},
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        toggle(name, force) {
          if (force === undefined) force = !classes.has(name);
          if (force) classes.add(name);
          else classes.delete(name);
        },
        contains(name) { return classes.has(name); },
      },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      setAttribute(name, value) { this[name] = value; },
      requestPointerLock() {},
      requestFullscreen() { return Promise.resolve(); },
    });
  }

  const canvasContext = () => new Proxy({
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
  }, {
    get(target, key) { return key in target ? target[key] : () => {}; },
    set(target, key, value) { target[key] = value; return true; },
  });
  elements.get("screen").getContext = canvasContext;
  elements.get("minimap").getContext = canvasContext;

  const cards = [...html.matchAll(/<button type="button" class="mode-card" data-mode="([^"]+)"/g)]
    .map(([, mode]) => ({
      dataset: { mode },
      listeners: {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      setAttribute(name, value) { this[name] = value; },
    }));
  const math = Object.create(Math);
  let seed = 123456;
  math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const document = {
    fullscreenElement: null,
    getElementById(id) {
      assert.ok(elements.has(id), `missing DOM element: ${id}`);
      return elements.get(id);
    },
    createElement(tagName) {
      assert.equal(tagName, "canvas");
      return { getContext: canvasContext };
    },
    querySelectorAll() { return cards; },
    addEventListener(name, callback) { this[`on${name}`] = callback; },
    exitPointerLock() {},
  };
  const window = { addEventListener() {} };
  const instrumentedScript = script.replace(
    /\n\}\)\(\);\s*$/,
    "\nwindow.__gameTest={startGame,shoot,update,endGame,damagePlayer,damageBot,renderWorld,lineBlocked,weaponSpecs,worldThemes:WORLD_THEMES,get player(){return player},get bots(){return bots},get targets(){return targets},get explosions(){return explosions},get incomingShots(){return incomingShots},get pickups(){return pickups},get playerTeam(){return playerTeam},get playerLeadsTeam(){return playerLeadsTeam},get currentMode(){return currentMode},get teamScores(){return teamScores},get playerStats(){return playerStats},get zoneTimer(){return zoneTimer},get flashlightOn(){return flashlightOn}};})();",
  );
  assert.notEqual(instrumentedScript, script, "game test hook must be attached");
  vm.runInNewContext(instrumentedScript, {
    document,
    window,
    console: { warn() {} },
    Math: math,
    Float32Array,
    Int32Array,
    Set,
    Map,
    Array,
    Object,
    Number,
    Infinity,
    performance: { now: () => 2000 },
    requestAnimationFrame() {},
    setTimeout() {},
    devicePixelRatio: 1,
  }, { timeout: 20000 });
  elements.get("soundToggle").listeners.change({ target: { checked: false } });
  return { game: window.__gameTest, document, elements };
}

test("existing game modes create their configured bot counts and keep bots on M4A1", () => {
  const { game, elements } = createGame();
  const modes = {
    normal: 18,
    aim: 25,
    machinegun: 15,
    shotgun: 14,
    knife: 10,
    hardcore: 20,
  };

  for (const [mode, botCount] of Object.entries(modes)) {
    elements.get("gameMode").value = mode;
    game.startGame();
    assert.equal(game.bots.length, botCount, `${mode} bot count`);
    assert.ok(game.bots.every(bot => bot.weapon === "M4A1"), `${mode} bot weapons`);
    game.renderWorld(1000);
  }
});

test("Pistoleiros limits the available weapons and bot loadouts to pistols", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "pistoleiros";
  game.startGame();

  assert.equal(game.bots.length, 18);
  assert.equal(game.player.ammo, game.weaponSpecs.PISTOLA.mag);
  assert.equal(game.player.reserve, game.weaponSpecs.PISTOLA.mag * 4);
  assert.ok(game.bots.every(bot => ["PISTOLA", "REVOLVER", "GLOCK", "PISTOLA 38"].includes(bot.weapon)));
  assert.equal(
    [...game.pickups.filter(item => game.weaponSpecs[item.type]).map(item => item.type)].sort().join(","),
    ["GLOCK", "PISTOLA 38", "REVOLVER"].sort().join(","),
  );
});

test("Bazooca mode locks the player to the bazooka with 15 bots", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "bazooka";
  game.startGame();

  assert.equal(game.bots.length, 15);
  assert.equal(game.player.weapon, "BAZUCA");
  assert.equal(game.player.ammo, 1);
  assert.equal(game.player.reserve, 14);
  assert.equal(game.currentMode.locked, true);
  assert.equal(game.pickups.filter(item => game.weaponSpecs[item.type]).length, 0);
});

test("Bazooka blast damages multiple bots in its radius", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "bazooka";
  game.startGame();
  const pair = findOpenPair(game, 6);
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  const direction = game.player.angle + Math.PI / 2;
  const first = game.bots[0], second = game.bots[1];
  for (const bot of game.bots) bot.alive = false;
  Object.assign(first, pair.target, { alive: true, health: 100 });
  Object.assign(second, {
    x: pair.target.x + Math.cos(direction) * .8,
    y: pair.target.y + Math.sin(direction) * .8,
    alive: true,
    health: 100,
  });

  game.shoot();

  assert.equal(first.alive, false);
  assert.equal(second.alive, false);
  assert.equal(game.explosions.length, 1);
});

test("team mode assigns 20 bots to each side and supports choosing the blue team", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("playerTeam").value = "blue";
  game.startGame();

  assert.equal(game.bots.length, 40);
  assert.equal(game.bots.filter(bot => bot.team === "red").length, 20);
  assert.equal(game.bots.filter(bot => bot.team === "blue").length, 20);
  assert.equal(game.playerTeam, "blue");
  assert.equal(game.player.team, "blue");
  assert.equal(game.bots.filter(bot => bot.isCpuPlayer).length, 1);
  const cpu = game.bots.find(bot => bot.isCpuPlayer);
  assert.equal(cpu.team, "red");
  assert.equal(cpu.health, 120);
  assert.equal(cpu.maxHealth, 120);
  assert.equal(cpu.armor, 100);
  assert.equal(cpu.maxArmor, 100);
  assert.equal(cpu.cpuWeapons.length, 1);
  assert.match(elements.get("activeModeName").textContent, /AZUL/);
});

test("team mode assigns its CPU player to the opposing side in both match types", () => {
  for (const matchType of ["elimination", "timed"]) {
    const { game, elements } = createGame();
    elements.get("gameMode").value = "teams";
    elements.get("playerTeam").value = "red";
    elements.get("teamMatchType").value = matchType;
    game.startGame();

    const cpuPlayers = game.bots.filter(bot => bot.isCpuPlayer);
    assert.equal(cpuPlayers.length, 1);
    assert.equal(cpuPlayers[0].team, "blue");
  }
});

test("team mode scatters every weapon, including the player's starting weapon", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  game.startGame();

  const scatteredWeapons = game.pickups
    .filter(pickup => game.weaponSpecs[pickup.type])
    .map(pickup => pickup.type);
  assert.deepEqual([...scatteredWeapons].sort(), Object.keys(game.weaponSpecs).sort());
  assert.equal(new Set(scatteredWeapons).size, scatteredWeapons.length);
});

test("team CPU picks up weapons, armor, and medical kits without removing them", () => {
  for (const type of ["AWM", "COLETE", "KIT MÉDICO"]) {
    const { game, elements } = createGame();
    elements.get("gameMode").value = "teams";
    elements.get("teamMatchType").value = "timed";
    game.startGame();
    const cpu = game.bots.find(bot => bot.isCpuPlayer);
    const pickup = game.pickups.find(item => item.type === type);
    assert.ok(cpu);
    assert.ok(pickup, `${type} should be available on the team map`);
    game.pickups = [pickup];
    for (const bot of game.bots) {
      if (bot !== cpu) bot.alive = false;
    }
    cpu.x = pickup.x;
    cpu.y = pickup.y;
    if (type === "KIT MÉDICO") cpu.health = 50;
    if (type === "COLETE") cpu.armor = 0;
    game.player.deadAt = 100000;

    game.update(.05, 2000);

    assert.ok(game.pickups.includes(pickup), `${type} remains available to the player`);
    assert.ok(cpu.collectedPickups.has(pickup));
    if (type === "AWM") {
      assert.equal(cpu.weapon, "AWM");
      assert.ok(cpu.cpuWeapons.includes("AWM"));
    } else if (type === "KIT MÉDICO") {
      assert.equal(cpu.health, 90);
    } else {
      assert.equal(cpu.armor, 100);
      game.damageBot(cpu, 100, 2100);
      assert.equal(cpu.armor, 35, "the collected vest absorbs damage");
      assert.equal(cpu.health, 85);
    }
  }
});

test("team CPU can collect a fifth weapon by replacing a slot and keeps four total", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const cpu = game.bots.find(bot => bot.isCpuPlayer);
  const pickup = game.pickups.find(item => item.type === "BAZUCA");
  for (const bot of game.bots) {
    if (bot !== cpu) bot.alive = false;
  }
  cpu.cpuWeapons = ["PISTOLA", "M4A1", "AK-47", "FACA"];
  cpu.x = pickup.x;
  cpu.y = pickup.y;
  game.pickups = [pickup];
  game.player.deadAt = 100000;

  game.update(.05, 2000);

  assert.equal(cpu.cpuWeapons.length, 4);
  assert.ok(cpu.cpuWeapons.includes("BAZUCA"));
  assert.ok(!cpu.cpuWeapons.includes("FACA"));
  assert.equal(cpu.weapon, "BAZUCA");
  assert.ok(game.pickups.includes(pickup));
});

test("team CPU navigates toward available weapons when no enemies are nearby", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const cpu = game.bots.find(bot => bot.isCpuPlayer);
  const pickup = game.pickups.find(item => item.type === "AWM");
  const pair = findOpenPair(game, 2);
  for (const bot of game.bots) {
    if (bot !== cpu) bot.alive = false;
  }
  game.pickups = [pickup];
  Object.assign(cpu, pair.start);
  Object.assign(pickup, pair.target);
  game.player.deadAt = 100000;

  for (let now = 2000; now <= 2500; now += 50) game.update(.05, now);

  assert.ok(cpu.cpuWeapons.includes("AWM"));
  assert.ok(game.pickups.includes(pickup));
});

test("team CPU chooses AWM and fires at a visible opponent from sniper range", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("playerTeam").value = "blue";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const cpu = game.bots.find(bot => bot.isCpuPlayer);
  for (const bot of game.bots) {
    if (bot !== cpu) bot.alive = false;
  }
  const pair = findOpenPair(game, 32);
  Object.assign(cpu, pair.start, { weapon: "M4A1", cpuWeapons: ["M4A1", "AWM"], cooldown: -1 });
  Object.assign(game.player, pair.target, { team: "blue", deadAt: null, health: 100 });
  cpu.angle = Math.atan2(game.player.y - cpu.y, game.player.x - cpu.x);

  game.update(.05, 2000);

  assert.equal(cpu.weapon, "AWM");
  assert.ok(game.incomingShots.length > 0, "the CPU should fire while the player is beyond standard bot range");
});

test("player's team follows the player by default and can be told not to", () => {
  for (const followPlayer of [true, false]) {
    const { game, elements } = createGame();
    elements.get("gameMode").value = "teams";
    elements.get("teamMatchType").value = "timed";
    elements.get("teamFollowPlayer").checked = followPlayer;
    game.startGame();
    const follower = game.bots.find(bot => bot.team === game.playerTeam);
    const cpu = game.bots.find(bot => bot.isCpuPlayer);
    for (const bot of game.bots) {
      if (bot !== follower) bot.alive = false;
    }
    const pair = findOpenPair(game, 8);
    Object.assign(game.player, pair.start, { deadAt: null });
    Object.assign(follower, pair.target, {
      angle: Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x),
      moveTimer: 10,
    });
    game.pickups = [];
    assert.equal(game.playerLeadsTeam, followPlayer);
    const initialDistance = Math.hypot(follower.x - game.player.x, follower.y - game.player.y);

    game.update(.05, 2000);

    const distance = Math.hypot(follower.x - game.player.x, follower.y - game.player.y);
    assert.equal(distance < initialDistance, followPlayer);
    assert.ok(cpu);
  }
});

test("opposing CPU's squad follows its CPU leader when idle", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const cpu = game.bots.find(bot => bot.isCpuPlayer);
  const follower = game.bots.find(bot => bot.team === cpu.team && bot !== cpu);
  for (const bot of game.bots) {
    if (bot !== cpu && bot !== follower) bot.alive = false;
  }
  const pair = findOpenPair(game, 8);
  Object.assign(cpu, pair.start);
  Object.assign(follower, pair.target, { angle: Math.PI });
  game.pickups = [];
  game.player.deadAt = 100000;

  game.update(.05, 2000);

  assert.ok(Math.hypot(follower.x - cpu.x, follower.y - cpu.y) < 8);
});

test("team mode prevents the player from damaging an allied bot", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  game.startGame();
  const ally = game.bots[0];
  for (const bot of game.bots) bot.alive = false;
  ally.alive = true;
  ally.team = game.playerTeam;
  ally.x = game.player.x + Math.cos(game.player.angle) * 6;
  ally.y = game.player.y + Math.sin(game.player.angle) * 6;

  game.shoot();

  assert.equal(ally.health, 100);
});

test("team bots do not attack allies and can fire on the opposing team", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  game.startGame();
  for (const bot of game.bots) bot.alive = false;
  const ally = game.bots[0], enemy = game.bots[20];
  Object.assign(ally, {
    x: game.player.x + Math.cos(game.player.angle) * 5,
    y: game.player.y + Math.sin(game.player.angle) * 5,
    team: game.playerTeam,
    alive: true,
    cooldown: -1,
  });
  game.update(.05, 2000);
  assert.equal(game.player.health, 100, "friendly bots must not target their teammate");

  ally.alive = false;
  const pair = findOpenPair(game, 5);
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  Object.assign(enemy, {
    x: pair.target.x,
    y: pair.target.y,
    team: game.playerTeam === "red" ? "blue" : "red",
    alive: true,
    cooldown: -1,
    weapon: "M4A1",
  });
  enemy.angle = game.player.angle + Math.PI;
  assert.equal(game.lineBlocked(game.player, enemy), false);
  game.update(.05, 2100);
  assert.ok(game.incomingShots.length > 0, "enemy bots should fire at the player");
});

test("timed team match gives both sides unlimited respawns and lasts five minutes", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  assert.equal(game.currentMode.timed, true);
  assert.equal(game.zoneTimer, 300);
  for (const bot of game.bots) bot.cooldown = 100;
  game.bots[0].alive = false;
  game.bots[0].health = 0;
  game.bots[0].deathAt = 0;
  game.player.health = 0;
  game.player.deadAt = 500;

  game.update(.05, 1300);

  assert.equal(game.player.deadAt, 500, "player remains in the death animation");
  assert.equal(game.bots[0].alive, true, "bots respawn after dying");
  assert.equal(game.bots[0].health, 100);

  game.update(.05, 1800);
  assert.equal(game.player.deadAt, null, "player respawns after the death animation");
  assert.equal(game.player.health, game.player.maxHealth);
});

test("timed team match awards eliminations to the player's team", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const enemy = game.bots[20];
  for (const bot of game.bots) bot.alive = false;
  const pair = findOpenPair(game, 5);
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  Object.assign(enemy, pair.target, {
    team: "blue",
    alive: true,
    health: 10,
    armor: 0,
  });
  game.player.weapon = "M4A1";
  game.player.ammo = game.weaponSpecs.M4A1.mag;

  game.shoot();

  assert.equal(enemy.alive, false);
  assert.equal(game.teamScores.red, 1);
});

test("timed team match ends after five minutes and awards the side with more eliminations", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  game.teamScores.red = 7;
  game.teamScores.blue = 9;

  game.update(300, 10000);

  assert.match(elements.get("endTitle").textContent, /AZUL/);
  assert.match(elements.get("endMessage").textContent, /Vermelho 7 × 9 Azul/);
});

test("team match end screen shows the player's eliminations, deaths, accuracy, and K/D", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const enemy = game.bots[20];
  for (const bot of game.bots) bot.alive = false;
  const pair = findOpenPair(game, 5);
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  Object.assign(enemy, pair.target, { team: "blue", alive: true, health: 10, armor: 0 });
  game.player.weapon = "M4A1";
  game.player.ammo = game.weaponSpecs.M4A1.mag;

  game.shoot();
  game.damagePlayer(1000, { team: "blue" }, 2100);
  game.endGame(true);

  assert.equal(game.playerStats.kills, 1);
  assert.equal(game.playerStats.deaths, 1);
  assert.equal(game.playerStats.shots, 1);
  assert.equal(game.playerStats.hits, 1);
  assert.equal(elements.get("playerStats").hidden, false);
  assert.equal(elements.get("statsKills").textContent, 1);
  assert.equal(elements.get("statsDeaths").textContent, 1);
  assert.equal(elements.get("statsAccuracy").textContent, "100%");
  assert.equal(elements.get("statsKdr").textContent, "1.00");
});

test("team bazooka accuracy counts at most one hit per rocket", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "teams";
  elements.get("teamMatchType").value = "timed";
  game.startGame();
  const enemy = game.bots[20];
  const nearbyEnemy = game.bots[21];
  for (const bot of game.bots) bot.alive = false;
  const pair = findOpenPair(game, 5);
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  Object.assign(enemy, pair.target, { team: "blue", alive: true, health: 1000 });
  Object.assign(nearbyEnemy, { x: enemy.x + 0.5, y: enemy.y, team: "blue", alive: true, health: 1000 });
  game.player.weapon = "BAZUCA";
  game.player.ammo = 1;

  game.shoot();

  assert.equal(game.playerStats.shots, 1);
  assert.equal(game.playerStats.hits, 1);
});

test("training presets configure targets, bot weapons, and passive bots", () => {
  const { game, elements } = createGame();
  const presets = [
    ["sniping", 0, 8, 0],
    ["machinegun", 0, 8, 8],
    ["normal", 5, 8, 0],
    ["knife", 10, 8, 0],
    ["pistoleirando", 10, 8, 8],
    ["peibaaa", 10, 12, 6],
  ];

  elements.get("gameMode").value = "training";
  for (const [option, bots, targets, movingTargets] of presets) {
    elements.get("trainingOption").value = option;
    game.startGame();
    assert.equal(game.bots.length, bots, `${option} bot count`);
    assert.equal(game.targets.length, targets, `${option} target count`);
    assert.equal(game.targets.filter(target => target.moving).length, movingTargets, `${option} moving targets`);
  }
  elements.get("trainingOption").value = "knife";
  game.startGame();
  assert.equal(game.player.ammo, Infinity);
  assert.ok(game.bots.every(bot => bot.weapon === "FACA" && bot.passive));
  elements.get("trainingOption").value = "pistoleirando";
  game.startGame();
  assert.ok(game.bots.every(bot => bot.weapon === "FACA" && !bot.passive));
  elements.get("trainingOption").value = "peibaaa";
  game.startGame();
  assert.equal(game.player.weapon, "ESCOPETA");
  assert.ok(game.bots.every(bot => bot.weapon === "PISTOLA"));
  assert.equal(
    [...game.pickups.filter(item => game.weaponSpecs[item.type]).map(item => item.type)].sort().join(","),
    ["M1014", "CALIBRE 12", "DOIS CANOS"].sort().join(","),
  );
});

test("each game mode uses a distinct world palette", () => {
  const { game } = createGame();
  const palettes = Object.values(game.worldThemes)
    .map(theme => JSON.stringify([theme.sky, theme.floor, theme.wall]));
  assert.equal(new Set(palettes).size, 10);
});

test("Hardcore offers every weapon, applies hard difficulty, and places other weapons once", () => {
  const { game, elements } = createGame();
  const loadout = html.match(/<select id="hardcoreWeapon">([\s\S]*?)<\/select>/)[1];
  const options = [...loadout.matchAll(/<option>([^<]+)<\/option>/g)].map(([, name]) => name);
  const weaponNames = Object.keys(game.weaponSpecs);

  assert.deepEqual(options, weaponNames, "Hardcore list includes every weapon type");
  elements.get("gameMode").value = "hardcore";
  elements.get("difficulty").value = "easy";

  for (const weapon of weaponNames) {
    elements.get("hardcoreWeapon").value = weapon;
    game.startGame();
    assert.equal(game.player.weapon, weapon, `${weapon} selected loadout`);
    assert.equal(game.bots.length, 20);
    assert.equal(game.player.health, 85, "Hardcore forces veteran difficulty");
    assert.equal(game.player.armor, 100);
    const placedWeapons = game.pickups
      .filter(pickup => game.weaponSpecs[pickup.type])
      .map(pickup => pickup.type);
    assert.equal(new Set(placedWeapons).size, placedWeapons.length, "weapon pickups are unique");
    assert.equal(placedWeapons.length, weaponNames.length - 1, "all other weapons are placed");
    assert.ok(!placedWeapons.includes(weapon), "the selected weapon is not duplicated as loot");
  }
});

function findBlockedPair(game) {
  for (let y = 2; y < 45; y++) {
    for (let x = 2; x < 45; x++) {
      const start = { x: x + 0.5, y: y + 0.5 };
      for (let distance = 4; distance <= 20; distance += 0.5) {
        for (let angle = -0.8; angle <= 0.8; angle += 0.08) {
          const target = {
            x: start.x + distance * Math.cos(angle),
            y: start.y + distance * Math.sin(angle),
          };
          if (target.x > 1 && target.y > 1 && target.x < 47 && target.y < 47
            && game.lineBlocked(start, target)) {
            return { start, target };
          }
        }
      }
    }
  }
  throw new Error("no blocked path found");
}

test("AWM shots penetrate walls", () => {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "training";
  elements.get("trainingOption").value = "sniping";
  game.startGame();
  const pair = findBlockedPair(game);
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  game.player.weapon = "AWM";
  game.player.ammo = game.weaponSpecs.AWM.mag;
  const bot = {
    ...pair.target,
    angle: game.player.angle + Math.PI,
    health: 100,
    alive: true,
    deathAt: null,
    deathDirection: 1,
    hitUntil: 0,
    id: 0,
    weapon: "FACA",
  };
  game.bots.push(bot);

  assert.equal(game.lineBlocked(game.player, bot), true);
  game.shoot();
  assert.equal(bot.alive, false);
});

test("Hardcore flashlight starts on, toggles with L, and renders", () => {
  const { game, document, elements } = createGame();
  elements.get("gameMode").value = "hardcore";
  game.startGame();
  assert.equal(game.flashlightOn, true);
  assert.match(elements.get("flashlightStatus").textContent, /LIGADA/);
  game.renderWorld(2200);

  document.onkeydown({ key: "l", repeat: false, preventDefault() {} });
  assert.equal(game.flashlightOn, false);
  assert.match(elements.get("flashlightStatus").textContent, /DESLIGADA/);
  game.renderWorld(2300);

  document.onkeydown({ key: "l", repeat: false, preventDefault() {} });
  assert.equal(game.flashlightOn, true);
});

function findOpenPair(game, distance) {
  for (let y = 2; y < 45; y++) {
    for (let x = 2; x < 45; x++) {
      for (let angle = -0.7; angle <= 0.7; angle += 0.1) {
        const start = { x: x + 0.5, y: y + 0.5 };
        const target = {
          x: start.x + distance * Math.cos(angle),
          y: start.y + distance * Math.sin(angle),
        };
        if (target.x > 1 && target.y > 1 && target.x < 47 && target.y < 47
          && !game.lineBlocked(start, target)) {
          return { start, target };
        }
      }
    }
  }
  throw new Error(`no open path at distance ${distance}`);
}

function shotgunDamage(weapon, distance) {
  const { game, elements } = createGame();
  elements.get("gameMode").value = "shotgun";
  game.startGame();
  const target = game.bots[0];
  const pair = findOpenPair(game, distance);
  for (const bot of game.bots) {
    if (bot !== target) bot.alive = false;
  }
  game.player.x = pair.start.x;
  game.player.y = pair.start.y;
  game.player.angle = Math.atan2(pair.target.y - pair.start.y, pair.target.x - pair.start.x);
  game.player.weapon = weapon;
  game.player.ammo = game.weaponSpecs[weapon].mag;
  target.x = pair.target.x;
  target.y = pair.target.y;
  target.health = 1000;
  game.shoot();
  return 1000 - target.health;
}

test("all shotguns hit beyond close range and apply distance damage falloff", () => {
  for (const weapon of ["ESCOPETA", "M1014", "CALIBRE 12", "DOIS CANOS"]) {
    const spec = createGame().game.weaponSpecs[weapon];
    assert.ok(spec.range >= 16, `${weapon} extended range`);
    const closeDamage = shotgunDamage(weapon, 3.5);
    const longDamage = shotgunDamage(weapon, 12);
    assert.ok(closeDamage > longDamage, `${weapon} loses damage over distance`);
    assert.ok(longDamage > 0, `${weapon} still hits at long range`);
  }
});
