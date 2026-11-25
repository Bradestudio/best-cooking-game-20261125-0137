// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (serve what matches, grab what the earliest open
// order still needs, prep it, plate it), so every frame is what a short game
// really looks like and the same seed always gives the same frame.
import { ING_BY_ID, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = STEP;

/** The earliest open order, or null while the board is empty. */
function targetOrder(state) {
  return state.orders.find((o) => o.state === 'open') ?? null;
}

/**
 * One autopilot decision per step. `holdServe` keeps a finished plate on the
 * counter (the serve scene) instead of ringing the bell.
 */
function autopilot(world, holdServe) {
  const state = world.state;
  if (state.over) return;
  const order = targetOrder(state);
  if (!order) return;
  const dish = order.dish;
  // A finished plate that matches an order is served — unless held for the shot.
  if (state.plate.length === dish.recipe.length && world.dishForPlate(state.plate)?.id === dish.id) {
    if (!holdServe) world.serve();
    return;
  }
  // Count how many of each recipe ingredient are already spoken for.
  const have = {};
  for (const id of state.plate) have[id] = (have[id] ?? 0) + 1;
  for (const h of state.hands) have[h.id] = (have[h.id] ?? 0) + 1;
  if (state.board) have[state.board.ing] = (have[state.board.ing] ?? 0) + 1;
  if (state.stove) have[state.stove.ing] = (have[state.stove.ing] ?? 0) + 1;
  if (state.boardDone) have[state.boardDone] = (have[state.boardDone] ?? 0) + 1;
  if (state.stoveDone) have[state.stoveDone] = (have[state.stoveDone] ?? 0) + 1;
  // Plate a ready ingredient already in hand.
  const readyIdx = state.hands.findIndex((h) => h.done && dish.recipe.includes(h.id) && state.plate.filter((p) => p === h.id).length < dish.recipe.filter((r) => r === h.id).length);
  if (readyIdx >= 0 && state.plate.length < 3) { world.placeOnPlate(); return; }
  // Collect a finished prep, or start prepping what is in hand.
  if (state.boardDone && dish.recipe.includes(state.boardDone)) { world.useStation('board'); return; }
  if (state.stoveDone && dish.recipe.includes(state.stoveDone)) { world.useStation('stove'); return; }
  if (state.hands.some((h) => !h.done && ING_BY_ID[h.id].prep === 'chop')) { world.useStation('board'); return; }
  if (state.hands.some((h) => !h.done && ING_BY_ID[h.id].prep === 'cook')) { world.useStation('stove'); return; }
  // Grab the next recipe ingredient not yet spoken for.
  if (state.hands.length < 3) {
    for (const id of dish.recipe) {
      const need = dish.recipe.filter((r) => r === id).length;
      if ((have[id] ?? 0) < need) { world.grab(id); return; }
    }
  }
}

/** Advance the world `seconds` long, one autopilot decision per step. */
function runFor(world, seconds, holdServe, stopWhen) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    autopilot(world, holdServe);
    if (world.step(SAMPLE, 0, false) & EVENT_OVER) break;
    if (stopWhen && stopWhen(world.state)) break;
  }
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    for (let i = 0; i < 5 / SAMPLE; i += 1) world.step(SAMPLE, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Mid-assembly: serve a dish or two first so the shift feels alive, then
    // stop the moment the next plate holds two of its three ingredients.
    runFor(world, 25, false, null);
    runFor(world, 90, true, (s) => s.plate.length === 2);
    // Hold the missing third ingredient in hand when the chef's hands are empty.
    const order = targetOrder(world.state);
    if (order && world.state.hands.length === 0) {
      for (const id of order.dish.recipe) {
        if (!world.state.plate.includes(id)) { world.grab(id); break; }
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'serve') {
    // A full plate that matches an open order, chef waiting at the serve window.
    runFor(world, 120, true, (s) => {
      const order = targetOrder(s);
      return order && s.plate.length === 3 && world.dishForPlate(s.plate)?.id === order.dish.id;
    });
    world.state.chef.x = 975; world.state.chef.y = 360;
    world.state.chef.tx = 975; world.state.chef.ty = 360;
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  // end: play the whole shift out with the autopilot, then show the report.
  runFor(world, 200, false, (s) => s.over);
  return { screen: SCREEN_OVER, best: world.state.coins };
}
