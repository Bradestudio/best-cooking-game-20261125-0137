// The game's rules and state, with no drawing and no browser in it.
// A shift lasts SHIFT_SECONDS: orders arrive on the board, each with a patience
// bar; the chef grabs ingredients from the pantry, preps them at the board
// (chop) or the stove (cook), builds the dish on the plate, and rings the
// serve bell when the plate matches an order. A served dish pays its price
// plus a speed bonus; an expired order costs a star. Three stars lost ends
// the shift early. step() advances one fixed step and returns what happened
// as bit flags, so the caller can react without the world knowing about
// screens or sound. Nothing here allocates after createWorld returns.
import {
  DISHES, DISH_BY_ID, FIELD, HAND_SIZE, INGREDIENTS, ING_BY_ID,
  MAX_ORDERS, ORDER_FIRST_DELAY, ORDER_GAP, ORDER_PATIENCE,
  SHIFT_SECONDS, START_STARS, STEP, ZONES,
} from './config.js';

export const EVENT_SERVED = 1;
export const EVENT_EXPIRED = 2;
export const EVENT_OVER = 4;
export const EVENT_PREPPED = 8;

let nextOrderUid = 1;

function sortedKey(ids) {
  return [...ids].sort().join('+');
}
function dishForPlate(ids) {
  const key = sortedKey(ids);
  for (const dish of DISHES) if (sortedKey(dish.recipe) === key) return dish;
  return null;
}
function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    coins: 0,
    served: 0,
    expired: 0,
    stars: START_STARS,
    combo: 0,
    bestCombo: 0,
    over: false,
    // The chef: x/y on the playfield, a walk target, and a queued action that
    // runs when the chef arrives.
    chef: { x: 640, y: 380, tx: 640, ty: 380, pending: null },
    hands: [], // { id, done } carried, in grab order; done once prepped (or never needed)
    plate: [], // ingredient ids on the plate, in placed order
    board: null, // { ing, t, total } chopping in progress
    stove: null, // { ing, t, total } cooking in progress
    boardDone: null, // prepped ingredient id waiting on the board
    stoveDone: null, // prepped ingredient id waiting on the stove
    orders: [], // { uid, dish, patience, max, state: 'open'|'served'|'expired' }
    orderTimer: ORDER_FIRST_DELAY,
    flash: '', // last feedback message ('served', 'wrong', 'expired', ...)
    flashT: 0,
    lastServedDish: null,
    lastEarned: 0,
  };

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.coins = 0;
    state.served = 0;
    state.expired = 0;
    state.stars = START_STARS;
    state.combo = 0;
    state.bestCombo = 0;
    state.over = false;
    state.chef.x = 640; state.chef.y = 380; state.chef.tx = 640; state.chef.ty = 380;
    state.chef.pending = null;
    state.hands.length = 0;
    state.plate.length = 0;
    state.board = null; state.stove = null;
    state.boardDone = null; state.stoveDone = null;
    state.orders.length = 0;
    state.orderTimer = ORDER_FIRST_DELAY;
    state.flash = ''; state.flashT = 0;
    state.lastServedDish = null; state.lastEarned = 0;
  }

  function spawnOrder() {
    if (state.orders.filter((o) => o.state === 'open').length >= MAX_ORDERS) return;
    const dish = DISHES[Math.floor(random() * DISHES.length)];
    state.orders.push({ uid: nextOrderUid, dish, patience: ORDER_PATIENCE, max: ORDER_PATIENCE, state: 'open' });
    nextOrderUid += 1;
  }

  function setFlash(kind) {
    state.flash = kind;
    state.flashT = 1.6;
  }

  /** Grab a raw ingredient from its pantry bin (hands hold HAND_SIZE). */
  function grab(ingId) {
    if (state.over || state.hands.length >= HAND_SIZE) return false;
    if (!ING_BY_ID[ingId]) return false;
    state.hands.push({ id: ingId, done: ING_BY_ID[ingId].prep === 'none' });
    return true;
  }

  /** Start prepping the carried ingredient at a station, or collect a finished one. */
  function useStation(kind) {
    if (state.over) return false;
    if (kind === 'board') {
      if (state.boardDone) { // collect the chopped ingredient
        if (state.hands.length >= HAND_SIZE) return false;
        state.hands.push({ id: state.boardDone, done: true });
        state.boardDone = null;
        return true;
      }
      if (state.board) return false;
      const idx = state.hands.findIndex((h) => !h.done && ING_BY_ID[h.id].prep === 'chop');
      if (idx < 0) return false;
      const id = state.hands.splice(idx, 1)[0].id;
      state.board = { ing: id, t: 0, total: ING_BY_ID[id].prepSeconds };
      return true;
    }
    if (state.stoveDone) {
      if (state.hands.length >= HAND_SIZE) return false;
      state.hands.push({ id: state.stoveDone, done: true });
      state.stoveDone = null;
      return true;
    }
    if (state.stove) return false;
    const idx = state.hands.findIndex((h) => !h.done && ING_BY_ID[h.id].prep === 'cook');
    if (idx < 0) return false;
    const id = state.hands.splice(idx, 1)[0].id;
    state.stove = { ing: id, t: 0, total: ING_BY_ID[id].prepSeconds };
    return true;
  }

  /** Move a carried ingredient onto the plate. Ready ('none') ingredients go straight on. */
  function placeOnPlate() {
    if (state.over || state.plate.length >= 3) return false;
    const idx = state.hands.findIndex((h) => h.done);
    if (idx < 0) return false; // raw items that need prep cannot be plated
    state.plate.push(state.hands.splice(idx, 1)[0].id);
    return true;
  }

  /** Ring the serve bell: the plate must match an open order exactly. */
  function serve() {
    if (state.over || state.plate.length === 0) return false;
    const dish = dishForPlate(state.plate);
    if (!dish) { setFlash('wrong'); return false; }
    const order = state.orders.find((o) => o.state === 'open' && o.dish.id === dish.id);
    if (!order) { setFlash('wrong'); return false; }
    const speedBonus = Math.round((order.patience / order.max) * 12);
    const earned = dish.price + speedBonus;
    state.coins += earned;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.lastServedDish = dish;
    state.lastEarned = earned;
    order.state = 'served';
    state.plate.length = 0;
    setFlash('served');
    return true;
  }

  /** Click a point on the playfield: walk there and queue what to do on arrival. */
  function clickAt(x, y) {
    if (state.over) return 'none';
    const point = { x, y, width: 1, height: 1 };
    for (const bin of ZONES.bins) {
      if (overlaps(point, bin)) {
        state.chef.tx = bin.x + bin.w / 2; state.chef.ty = bin.y + bin.h + 26;
        state.chef.pending = { kind: 'grab', id: bin.id };
        return 'grab';
      }
    }
    if (overlaps(point, ZONES.board)) {
      state.chef.tx = ZONES.board.x + ZONES.board.w / 2; state.chef.ty = ZONES.board.y + ZONES.board.h + 26;
      state.chef.pending = { kind: 'station', id: 'board' };
      return 'station';
    }
    if (overlaps(point, ZONES.stove)) {
      state.chef.tx = ZONES.stove.x + ZONES.stove.w / 2; state.chef.ty = ZONES.stove.y + ZONES.stove.h + 26;
      state.chef.pending = { kind: 'station', id: 'stove' };
      return 'station';
    }
    if (overlaps(point, ZONES.plate)) {
      state.chef.tx = ZONES.plate.x + ZONES.plate.w / 2; state.chef.ty = ZONES.plate.y + ZONES.plate.h + 26;
      state.chef.pending = { kind: 'plate' };
      return 'plate';
    }
    if (overlaps(point, ZONES.serve)) {
      state.chef.tx = ZONES.serve.x + ZONES.serve.w / 2; state.chef.ty = ZONES.serve.y + ZONES.serve.h + 26;
      state.chef.pending = { kind: 'serve' };
      return 'serve';
    }
    state.chef.tx = Math.min(FIELD.width - 30, Math.max(30, x));
    state.chef.ty = Math.min(640, Math.max(120, y));
    state.chef.pending = null;
    return 'walk';
  }

  /** Keyboard shortcut: grab by number, C chop, F cook, Space plate-or-serve. */
  function keyAction(code) {
    if (state.over) return false;
    if (code >= 'Digit1' && code <= 'Digit6') return grab(INGREDIENTS[Number(code.slice(5)) - 1].id);
    if (code === 'KeyC') return useStation('board');
    if (code === 'KeyF') return useStation('stove');
    if (code === 'Space') {
      if (state.plate.length > 0 && dishForPlate(state.plate)) return serve();
      return placeOnPlate();
    }
    return false;
  }

  /** One fixed step. `walk` is -1/0/1 from the arrow keys. Returns event flags. */
  function step(dt, walk, harmless) {
    let events = 0;
    if (state.flashT > 0) state.flashT = Math.max(0, state.flashT - dt);
    // The chef walks toward the target; a queued action fires on arrival.
    const chef = state.chef;
    const dx = chef.tx - chef.x;
    const dy = chef.ty - chef.y;
    const dist = Math.hypot(dx, dy);
    const speed = 420;
    if (dist > 4) {
      const move = Math.min(dist, speed * dt);
      chef.x += (dx / dist) * move;
      chef.y += (dy / dist) * move;
    } else if (chef.pending) {
      const p = chef.pending;
      chef.pending = null;
      if (p.kind === 'grab') grab(p.id);
      else if (p.kind === 'station') useStation(p.id);
      else if (p.kind === 'plate') placeOnPlate();
      else if (p.kind === 'serve') {
        if (serve()) events |= EVENT_SERVED;
      }
    }
    if (walk !== 0) {
      chef.x = Math.min(FIELD.width - 40, Math.max(40, chef.x + walk * 380 * dt));
      chef.tx = chef.x; chef.ty = chef.y; chef.pending = null;
    }
    if (harmless) return events;
    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    // Prep stations advance.
    if (state.board) {
      state.board.t += dt;
      if (state.board.t >= state.board.total) {
        state.boardDone = state.board.ing;
        state.board = null;
        events |= EVENT_PREPPED;
      }
    }
    if (state.stove) {
      state.stove.t += dt;
      if (state.stove.t >= state.stove.total) {
        state.stoveDone = state.stove.ing;
        state.stove = null;
        events |= EVENT_PREPPED;
      }
    }
    // Orders arrive and their patience runs out.
    state.orderTimer -= dt;
    if (state.orderTimer <= 0) {
      spawnOrder();
      state.orderTimer = ORDER_GAP;
    }
    for (const order of state.orders) {
      if (order.state !== 'open') continue;
      order.patience -= dt;
      if (order.patience <= 0) {
        order.patience = 0;
        order.state = 'expired';
        state.expired += 1;
        state.stars -= 1;
        state.combo = 0;
        setFlash('expired');
        events |= EVENT_EXPIRED;
      }
    }
    if ((state.timeLeft <= 0 || state.stars <= 0) && !state.over) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  return { state, reset, step, grab, useStation, placeOnPlate, serve, clickAt, keyAction, dishForPlate };
}
