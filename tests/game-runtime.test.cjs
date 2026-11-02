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
    "\nwindow.__gameTest={startGame,shoot,renderWorld,lineBlocked,weaponSpecs,worldThemes:WORLD_THEMES,get player(){return player},get bots(){return bots},get pickups(){return pickups},get flashlightOn(){return flashlightOn}};})();",
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

test("all game modes create their configured bot counts and keep bots on M4A1", () => {
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

test("each mode uses a distinct world palette", () => {
  const { game } = createGame();
  const palettes = Object.values(game.worldThemes)
    .map(theme => JSON.stringify([theme.sky, theme.floor, theme.wall]));
  assert.equal(new Set(palettes).size, 6);
});

test("Hardcore offers every weapon, applies hard difficulty, and places other weapons once", () => {
  const { game, elements } = createGame();
  const options = [...html.matchAll(/<option>([^<]+)<\/option>/g)].map(([, name]) => name);
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
