import './style.css';
import { CONFIG } from './data/config';
import { STAGES } from './data/stages';
import { Game, buildDeck } from './game';
import { Menu } from './menu';
import { applyResult } from './meta/rewards';
import { loadSave, writeSave, type SaveData } from './meta/save';
import { render, type RewardView } from './render';
import { PAUSE_BUTTONS, buildButtons, buttonKey, hit, type Button } from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let save: SaveData = loadSave();
let game: Game | null = null;
let buttons: Button[] = [];
let reward: RewardView | null = null;

const menu = new Menu(save, startBattle);

function startBattle(stageId: string): void {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return;
  const { hero, deck } = buildDeck(save.cats, save.deck);
  game = new Game(stage, deck, hero);
  buttons = buildButtons(deck.map((d) => d.def.id));
  reward = null;
  menu.hide();
  canvas.hidden = false;
  resize();
}

function endBattle(): void {
  game = null;
  canvas.hidden = true;
  menu.show(save);
}

function onBattleFinished(g: Game): void {
  const r = applyResult(save, g.stage, g.result!, Math.max(0, g.waveIndex));
  writeSave(save);
  reward = r;
}

// ───────────── 화면 스케일 / 회전 ─────────────
let scale = 1;
let offX = 0;
let offY = 0;
let dpr = 1;
let portrait = false;

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  // 세로 화면이면 전투 화면을 90° 돌려서 긴 변을 가로로 사용
  portrait = h > w;
  const vw = portrait ? h : w;
  const vh = portrait ? w : h;
  scale = Math.min(vw / CONFIG.width, vh / CONFIG.height);
  offX = (vw - CONFIG.width * scale) / 2;
  offY = (vh - CONFIG.height * scale) / 2;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

function toLogical(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const sx = e.clientX - rect.left;
  const sy = e.clientY - rect.top;
  if (portrait) return { x: (sy - offX) / scale, y: (rect.width - offY - sx) / scale };
  return { x: (sx - offX) / scale, y: (sy - offY) / scale };
}

// ───────────── 입력 ─────────────
let pressed: string | null = null;

function press(g: Game, b: Button): void {
  switch (b.id.type) {
    case 'cat': g.summon(b.id.id); break;
    case 'hero': g.useHeroSkill(); break;
    case 'wallet': g.upgradeWallet(); break;
    case 'pause': g.paused = !g.paused; break;
    case 'speed': g.speed = g.speed === 1 ? 2 : 1; break;
    case 'resume': g.paused = false; break;
    case 'quit': endBattle(); break;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const g = game;
  if (!g) return;
  if (g.phase !== 'playing') {
    if (reward) endBattle();
    return;
  }
  const { x, y } = toLogical(e);
  const list = g.paused ? [...PAUSE_BUTTONS, ...buttons.filter((b) => b.id.type === 'pause')] : buttons;
  for (const b of list) {
    if (hit(b.rect, x, y)) {
      pressed = buttonKey(b.id);
      press(g, b);
      return;
    }
  }
});
const release = (): void => { pressed = null; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const g = game;
  if (!g) return;
  if (g.phase !== 'playing') {
    if ((e.key === 'Enter' || e.key === ' ') && reward) endBattle();
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= g.deck.length) g.summon(g.deck[n - 1].def.id);
  else if (e.key === 'q' || e.key === 'Q') g.useHeroSkill();
  else if (e.key === 'w' || e.key === 'W') g.upgradeWallet();
  else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') g.paused = !g.paused;
  else if (e.key === 'f' || e.key === 'F') g.speed = g.speed === 1 ? 2 : 1;
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game && game.phase === 'playing') game.paused = true;
});

// ───────────── 루프 ─────────────
let last = performance.now();
let elapsed = 0;
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  elapsed += Math.min(dt, 0.1);
  const g = game;
  if (g) {
    g.update(dt);
    if (g.phase !== 'playing' && !reward) onBattleFinished(g);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b1d2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (portrait) {
      const s = dpr * scale;
      ctx.setTransform(0, s, -s, 0, canvas.width - dpr * offY, dpr * offX);
    } else {
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CONFIG.width, CONFIG.height);
    ctx.clip();
    render(ctx, g, buttons, elapsed, pressed, reward);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.hidden = true;
menu.show(save);

// 디버그/테스트용 훅
Object.assign(window as object, {
  __catwar: {
    get game() { return game; },
    get save() { return save; },
    setSave(s: SaveData) { save = s; writeSave(save); menu.show(save); },
    start: startBattle,
  },
});
