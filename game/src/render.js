// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Canvas shapes and text only — no images,
// no network, no font files. Text that holds a number is rebuilt only when
// the number changes, so a frame allocates nothing.
import { FIELD, FONT, ING_BY_ID, PALETTE, SHIFT_SECONDS, ZONES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) { value = next; text = prefix + next; }
    return text;
  };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const coinsLabel = cachedLabel('🪙 ');
  const servedLabel = cachedLabel('Saji ');
  const timerLabel = cachedLabel('');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = 'bold') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(value, x, y);
  }
  function rrect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  }
  function panel(x, y, w, h, fill, stroke) {
    rrect(x, y, w, h, 14);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }

  function drawRoom() {
    // Wall, floor, and the long back counter the stations sit on.
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, 0, FIELD.width, 130);
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 130, FIELD.width, 60);
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 190, FIELD.width, FIELD.height - 190);
    ctx.strokeStyle = PALETTE.floorLine;
    ctx.lineWidth = 3;
    for (let y = 250; y < FIELD.height; y += 70) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.width, y); ctx.stroke();
    }
    // Hanging lamps and a menu poster on the wall.
    for (const lx of [220, 640, 1060]) {
      ctx.strokeStyle = '#1a120a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, 42); ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath(); ctx.arc(lx, 52, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(242,201,76,0.25)';
      ctx.beginPath(); ctx.arc(lx, 52, 30, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawBins(state) {
    text('PANTRY — klik bahan (1–6)', 24, 138, 13, PALETTE.muted);
    ZONES.bins.forEach((bin, i) => {
      const ing = ING_BY_ID[bin.id];
      const held = state.hands.filter((h) => h.id === ing.id).length;
      panel(bin.x, bin.y, bin.w, bin.h, ing.color, held > 0 ? PALETTE.gold : '#7a5c33');
      if (held > 0) { ctx.lineWidth = 4; ctx.strokeStyle = PALETTE.gold; rrect(bin.x, bin.y, bin.w, bin.h, 14); ctx.stroke(); }
      text(ing.glyph, bin.x + bin.w / 2, bin.y + 26, 30, PALETTE.dark, 'center');
      text(ing.name, bin.x + bin.w / 2, bin.y + 58, 14, PALETTE.dark, 'center');
      text(`${i + 1}`, bin.x + 10, bin.y + 12, 12, '#7a5c33');
      if (held > 0) {
        ctx.fillStyle = PALETTE.red;
        ctx.beginPath(); ctx.arc(bin.x + bin.w - 12, bin.y + 12, 11, 0, Math.PI * 2); ctx.fill();
        text(String(held), bin.x + bin.w - 12, bin.y + 12, 13, '#fff', 'center');
      }
    });
  }

  function drawStation(state, zone, title, hint, busy, done, glyph) {
    panel(zone.x, zone.y, zone.w, zone.h, PALETTE.counter, '#5a3d26');
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(zone.x + 6, zone.y + 6, zone.w - 12, 16);
    text(title, zone.x + zone.w / 2, zone.y + 44, 17, PALETTE.text, 'center');
    if (busy) {
      const p = Math.min(1, busy.t / busy.total);
      text(ING_BY_ID[busy.ing].glyph, zone.x + zone.w / 2, zone.y + 76, 34, PALETTE.dark, 'center');
      ctx.fillStyle = '#241a12';
      ctx.fillRect(zone.x + 20, zone.y + 100, zone.w - 40, 10);
      ctx.fillStyle = PALETTE.green;
      ctx.fillRect(zone.x + 20, zone.y + 100, (zone.w - 40) * p, 10);
    } else if (done) {
      text(ING_BY_ID[done].glyph + ' ✓', zone.x + zone.w / 2, zone.y + 76, 34, PALETTE.dark, 'center');
      text('klik untuk ambil', zone.x + zone.w / 2, zone.y + 104, 12, PALETTE.gold, 'center');
    } else {
      text(glyph, zone.x + zone.w / 2, zone.y + 76, 34, PALETTE.dark, 'center');
      text(hint, zone.x + zone.w / 2, zone.y + 104, 12, PALETTE.muted, 'center');
    }
  }

  function drawPlate(state) {
    const zone = ZONES.plate;
    panel(zone.x, zone.y, zone.w, zone.h, PALETTE.counter, '#5a3d26');
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(zone.x + 6, zone.y + 6, zone.w - 12, 16);
    text('PIRING SAJI', zone.x + zone.w / 2, zone.y + 40, 16, PALETTE.text, 'center');
    // The plate itself.
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath(); ctx.ellipse(zone.x + zone.w / 2, zone.y + 82, 62, 26, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9b896'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(zone.x + zone.w / 2, zone.y + 82, 62, 26, 0, 0, Math.PI * 2); ctx.stroke();
    state.plate.forEach((id, i) => {
      text(ING_BY_ID[id].glyph, zone.x + 52 + i * 42, zone.y + 78, 30, PALETTE.dark, 'center');
    });
    if (state.plate.length === 0) text('kosong — klik bahan siap saji', zone.x + zone.w / 2, zone.y + 108, 11, PALETTE.muted, 'center');
  }

  function drawServe(state) {
    const zone = ZONES.serve;
    panel(zone.x, zone.y, zone.w, zone.h, '#5a2e22', '#3a1d12');
    text('🔔  JENDELA SAJI', zone.x + zone.w / 2, zone.y + 26, 16, PALETTE.text, 'center');
    text('klik lonceng / Spasi', zone.x + zone.w / 2, zone.y + 48, 12, PALETTE.muted, 'center');
    // The bell and the pass-through shelf.
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(zone.x + zone.w / 2, zone.y + 88, 26, Math.PI, 0); ctx.fill();
    ctx.fillRect(zone.x + zone.w / 2 - 32, zone.y + 88, 64, 8);
    ctx.beginPath(); ctx.arc(zone.x + zone.w / 2 + 30, zone.y + 100, 5, 0, Math.PI * 2); ctx.fill();
    const ready = state.plate.length > 0;
    text(ready ? 'PIRING SIAP! ✓' : '—', zone.x + zone.w / 2, zone.y + 122, 13, ready ? PALETTE.green : PALETTE.muted, 'center');
  }

  function drawOrders(state) {
    // Order board: top-right tickets with dish, recipe icons and patience bar.
    panel(1010, 300, 246, 150, PALETTE.ticket, PALETTE.ticketEdge);
    text('📋 ORDER BOARD', 1133, 322, 15, PALETTE.dark, 'center');
    const open = state.orders.filter((o) => o.state === 'open');
    if (open.length === 0) {
      text('Belum ada pesanan…', 1133, 372, 14, '#7a5c33', 'center');
      text('siapkan bahan dulu!', 1133, 396, 14, '#7a5c33', 'center');
      return;
    }
    open.slice(0, 3).forEach((order, i) => {
      const y = 344 + i * 36;
      const p = Math.max(0, order.patience / order.max);
      text(order.dish.name, 1024, y, 14, PALETTE.dark);
      order.dish.recipe.forEach((id, j) => text(ING_BY_ID[id].glyph, 1180 + j * 24, y, 16, PALETTE.dark, 'center'));
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(1024, y + 12, 150, 7);
      ctx.fillStyle = p > 0.5 ? PALETTE.green : p > 0.25 ? '#f6c453' : PALETTE.red;
      ctx.fillRect(1024, y + 12, 150 * p, 7);
      text(`${Math.ceil(order.patience)}s`, 1180, y + 16, 11, PALETTE.dark);
    });
  }

  function drawChef(state) {
    const c = state.chef;
    // Shadow, body, apron, head and toque.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y + 26, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2f2f2';
    rrect(c.x - 20, c.y - 6, 40, 34, 10); ctx.fill();
    ctx.fillStyle = '#3a7bd5';
    ctx.fillRect(c.x - 20, c.y + 8, 40, 20);
    ctx.fillStyle = '#f6c89f';
    ctx.beginPath(); ctx.arc(c.x, c.y - 16, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(c.x - 8, c.y - 28, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x + 8, c.y - 28, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x, c.y - 32, 10, 0, Math.PI * 2); ctx.fill();
    // Hands: carried ingredients float above the chef.
    state.hands.forEach((h, i) => {
      text(ING_BY_ID[h.id].glyph, c.x - 24 + i * 24, c.y - 48, 22, PALETTE.dark, 'center');
    });
  }

  function drawHud(state) {
    panel(160, 8, 900, 44, PALETTE.panel, 'rgba(255,255,255,0.12)');
    const mm = Math.floor(state.timeLeft / 60);
    const ss = String(Math.floor(state.timeLeft % 60)).padStart(2, '0');
    const urgent = state.timeLeft <= 30;
    text(`⏱ ${mm}:${ss}`, 200, 30, 24, urgent ? PALETTE.red : PALETTE.text);
    text(coinsLabel(state.coins), 380, 30, 20, PALETTE.gold);
    text(servedLabel(state.served), 520, 30, 20, PALETTE.text);
    text(`⭐`.repeat(Math.max(0, state.stars)) + `☆`.repeat(Math.max(0, 3 - state.stars)), 640, 30, 20, PALETTE.gold);
    text(state.combo >= 2 ? `🔥 COMBO x${state.combo}` : '', 800, 30, 18, '#ff9f1c');
    text(`Shift ${SHIFT_SECONDS / 60} mnt`, 990, 30, 14, PALETTE.muted, 'center');
    if (state.flashT > 0) {
      const msg = state.flash === 'served'
        ? `✅ ${state.lastServedDish ? state.lastServedDish.name : 'Pesanan'} tersaji! +${state.lastEarned} koin`
        : state.flash === 'wrong' ? '❌ Piring tidak cocok dengan pesanan!'
        : '⌛ Pesanan hangus! −1 ⭐';
      text(msg, 640, 66, 20, state.flash === 'served' ? PALETTE.green : PALETTE.red, 'center');
    }
  }

  function drawTitle(state, best) {
    drawRoom();
    drawBins(state);
    drawStation(state, ZONES.board, 'TALENAN', 'C = cincang', null, null, '🔪');
    drawStation(state, ZONES.stove, 'KOMPOR', 'F = masak', null, null, '🔥');
    drawPlate(state);
    drawServe(state);
    drawOrders(state);
    ctx.fillStyle = 'rgba(20,12,6,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(340, 120, 600, 400, '#2b1d12', PALETTE.gold);
    text('🍜 DAPUR KILAT', 640, 180, 46, PALETTE.gold, 'center');
    text('WARUNG RUSH — masak, sajikan, jangan sampai hangus!', 640, 228, 18, PALETTE.text, 'center');
    text('Pesanan datang di order board. Ambil bahan di pantry,', 640, 290, 16, PALETTE.muted, 'center');
    text('cincang di talenan (C), masak di kompor (F), susun di piring,', 640, 316, 16, PALETTE.muted, 'center');
    text('lalu bunyikan lonceng di jendela saji. Shift 3 menit!', 640, 342, 16, PALETTE.muted, 'center');
    text('🖱️ Klik stasiun untuk jalan & beraksi  •  1–6 ambil bahan', 640, 388, 14, PALETTE.text, 'center');
    text('Spasi sajikan  •  P jeda', 640, 412, 14, PALETTE.text, 'center');
    panel(ZONES.start.x, ZONES.start.y, ZONES.start.w, ZONES.start.h, PALETTE.gold, '#c89b2a');
    text('▶  MULAI SHIFT', 640, ZONES.start.y + 32, 22, PALETTE.dark, 'center');
    if (best > 0) text(`Rekor koin: ${best}`, 640, 610, 15, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    drawRoom();
    ctx.fillStyle = 'rgba(20,12,6,0.8)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    panel(340, 110, 600, 430, '#2b1d12', PALETTE.gold);
    text(state.stars > 0 ? '🎉 SHIFT SELESAI!' : '💥 WARUNG TUTUP!', 640, 170, 40, PALETTE.gold, 'center');
    text(`⭐`.repeat(Math.max(0, state.stars)) + `☆`.repeat(Math.max(0, 3 - state.stars)), 640, 224, 34, PALETTE.gold, 'center');
    text(`Koin: ${state.coins}   •   Pesanan tersaji: ${state.served}   •   Hangus: ${state.expired}`, 640, 290, 18, PALETTE.text, 'center');
    text(`Combo terbaik: x${state.bestCombo}    •    Rekor koin: ${best}`, 640, 326, 16, PALETTE.muted, 'center');
    const verdict = state.served >= 8 ? 'Koki legendaris! Warungmu ramai terus. 🏆'
      : state.served >= 5 ? 'Koki andalan — pelanggan puas, dompet tebal. 👏'
      : state.served >= 2 ? 'Lumayan! Latihan lagi, timing adalah segalanya. 💪'
      : 'Shift berat… coba lagi, resepnya sudah di tanganmu. 🍜';
    text(verdict, 640, 380, 16, PALETTE.text, 'center');
    panel(ZONES.again.x, ZONES.again.y, ZONES.again.w, ZONES.again.h, PALETTE.gold, '#c89b2a');
    text('↻  MASAK LAGI', 640, ZONES.again.y + 32, 22, PALETTE.dark, 'center');
    text('Klik / tekan Enter', 640, 600, 14, PALETTE.muted, 'center');
  }

  function draw(state, screen, best) {
    resize();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) { drawTitle(state, best); return; }
    if (screen === SCREEN_OVER) { drawOver(state, best); return; }
    drawRoom();
    drawBins(state);
    drawStation(state, ZONES.board, 'TALENAN 🔪', 'C = cincang', state.board, state.boardDone, '🔪');
    drawStation(state, ZONES.stove, 'KOMPOR', 'F = masak', state.stove, state.stoveDone, '🔥');
    drawPlate(state);
    drawServe(state);
    drawOrders(state);
    drawChef(state);
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(20,12,6,0.7)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text('⏸ JEDA', 640, 330, 52, PALETTE.text, 'center');
      text('Tekan P / Esc untuk lanjut', 640, 390, 18, PALETTE.muted, 'center');
    }
  }

  return { draw };
}
