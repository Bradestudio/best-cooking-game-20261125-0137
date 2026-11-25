// Dapur Kilat — Warung Rush: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 180;
export const MAX_ORDERS = 3;
export const ORDER_PATIENCE = 48;
export const ORDER_FIRST_DELAY = 6;
export const ORDER_GAP = 16;
export const HAND_SIZE = 3;
export const START_STARS = 3;

// Ingredients: id, name, emoji glyph, prep station needed ('none' | 'chop' | 'cook'),
// prep seconds, and the pantry bin colour.
export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', glyph: '🍚', prep: 'none', prepSeconds: 0, color: '#f5efe0' },
  { id: 'mie', name: 'Mie', glyph: '🍜', prep: 'cook', prepSeconds: 3, color: '#f6c453' },
  { id: 'ayam', name: 'Ayam', glyph: '🍗', prep: 'cook', prepSeconds: 4, color: '#e08a5a' },
  { id: 'sayur', name: 'Sayur', glyph: '🥬', prep: 'chop', prepSeconds: 2, color: '#7bc96f' },
  { id: 'telur', name: 'Telur', glyph: '🥚', prep: 'cook', prepSeconds: 3, color: '#f9e08a' },
  { id: 'sambal', name: 'Sambal', glyph: '🌶️', prep: 'none', prepSeconds: 0, color: '#e5534b' },
];
export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));

// Dishes: id, name, price in coins, and the ingredient ids on the plate.
export const DISHES = [
  { id: 'nasgor', name: 'Nasi Goreng', price: 28, recipe: ['nasi', 'telur', 'sambal'] },
  { id: 'mieayam', name: 'Mie Ayam', price: 32, recipe: ['mie', 'ayam', 'sayur'] },
  { id: 'ayamgeprek', name: 'Ayam Geprek', price: 36, recipe: ['ayam', 'sambal', 'nasi'] },
  { id: 'nasitelur', name: 'Nasi Telur', price: 22, recipe: ['nasi', 'telur', 'sayur'] },
  { id: 'miegoreng', name: 'Mie Goreng', price: 30, recipe: ['mie', 'telur', 'sayur'] },
];
export const DISH_BY_ID = Object.fromEntries(DISHES.map((d) => [d.id, d]));

// Clickable zones on the 1280x720 playfield.
export const ZONES = {
  // Pantry bins along the left wall.
  bins: INGREDIENTS.map((ing, i) => ({ id: ing.id, x: 24, y: 150 + i * 86, w: 110, h: 76 })),
  board: { x: 300, y: 470, w: 190, h: 120 }, // chopping board
  stove: { x: 520, y: 470, w: 190, h: 120 }, // wok stove
  plate: { x: 770, y: 470, w: 190, h: 120 }, // plating counter
  serve: { x: 1010, y: 150, w: 240, h: 130 }, // serve window + bell
  start: { x: 440, y: 520, w: 400, h: 64 }, // title-screen start button
  again: { x: 440, y: 520, w: 400, h: 64 }, // game-over restart button
};

export const PALETTE = {
  backdrop: '#241a12',
  wall: '#3d2b1f',
  wallTop: '#4a3524',
  floor: '#6b4a2f',
  floorLine: '#5a3d26',
  counter: '#8a5a33',
  counterTop: '#b07a45',
  board: '#d9a066',
  stove: '#3a3f4a',
  flame: '#ff9f1c',
  flame2: '#ff5e3a',
  plate: '#f5f1e6',
  ticket: '#fff8e1',
  ticketEdge: '#e8c97a',
  text: '#fff6e8',
  dark: '#2b1d12',
  muted: '#c9a582',
  gold: '#f2c94c',
  green: '#7bc96f',
  red: '#e5534b',
  panel: 'rgba(20,12,6,0.72)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'dapur-kilat.best';
