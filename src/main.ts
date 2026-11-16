import './style.css';
import { loadArt, loadWorldArt } from './art';
import { sound } from './audio';
import { CONFIG, applyLayout } from './data/config';
import { STAGES } from './data/stages';
import { Game, buildSquad } from './game';
import { Menu } from './menu';
import { bonuses } from './meta/items';
import { applyResult } from './meta/rewards';
import { loadSave, writeSave, type SaveData } from './meta/save';
import { render, type RewardView } from './render';
import { CHOICE_BUTTONS, HUD_BUTTONS, PAUSE_BUTTONS, RESULT_BUTTONS, buttonKey, hit, layoutButtons, type Button } from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let save: SaveData = loadSave();
let game: Game | null = null;
let reward: RewardView | null = null;

const menu = new Menu(save, startBattle);

function startBattle(stageId: string): void {
  const stage = STAGES.find((s) => s.id === stageId);
  if (!stage) return;
  applyLayout(window.innerWidth, window.innerHeight);
  layoutButtons(CONFIG.height);
  save.selectedStage = stage.id;
  game = new Game(stage, buildSquad(save.cats), bonuses(save), save.seen);
  reward = null;
  menu.hide();
  canvas.hidden = false;
  resize();
  sound.music('battle');
}

/** 승리 → 다음 스테이지, 패배 → 같은 스테이지 다시 */
function afterResult(g: Game): void {
  const lv = reward && (reward as { levelUp?: [number, number] | null }).levelUp;
  const next = g.result?.victory ? STAGES.find((s) => s.no === g.stage.no + 1) : null;
  const target = next ?? g.stage;
  pressed = null;
  startBattle(target.id);
  if (lv) setTimeout(() => sound.play('levelup'), 200);
}

function endBattle(): void {
  const lv = reward && (reward as { levelUp?: [number, number] | null }).levelUp;
  const lt = reward ? (reward as { levelTuna?: number }).levelTuna ?? 0 : 0;
  game = null;
  canvas.hidden = true;
  menu.show(save);
  sound.music('lobby');
  // 로비로 돌아오는 터치가 모달 바깥 클릭으로 이어져 바로 닫히지 않게 조금 뒤에 띄운다
  if (lv) setTimeout(() => menu.celebrateLevel(lv[1], lt), 400);
}

// ───────────── 화면 스케일 (세로 540x960을 화면에 맞춤) ─────────────
let scale = 1;
let offX = 0;
let offY = 0;
let dpr = 1;

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  scale = Math.min(w / CONFIG.width, h / CONFIG.height);
  offX = (w - CONFIG.width * scale) / 2;
  offY = (h - CONFIG.height * scale) / 2;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 100));
resize();

function toLogical(e: PointerEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left - offX) / scale, y: (e.clientY - rect.top - offY) / scale };
}

// ───────────── 입력 ─────────────
let pressed: string | null = null;

function cycleSpeed(g: Game): void {
  g.speed = g.speed === 1 ? 1.5 : g.speed === 1.5 ? 2 : 1;
}

function press(g: Game, b: Button): void {
  switch (b.id.type) {
    case 'pause': g.paused = !g.paused; break;
    case 'speed': cycleSpeed(g); break;
    case 'rally': g.useRally(); break;
    case 'card': g.pick(b.id.index); break;
    case 'reroll': g.reroll(); break;
    case 'resume': g.paused = false; break;
    case 'quit': endBattle(); break;
    case 'sound': { const on = !(sound.sfxOn || sound.musicOn); sound.setSfx(on); sound.setMusic(on); break; }
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const g = game;
  if (!g) return;
  if (g.phase !== 'playing') {
    if (!reward) return;
    const p = toLogical(e);
    for (const b of RESULT_BUTTONS) {
      if (!hit(b.rect, p.x, p.y)) continue;
      pressed = buttonKey(b.id);
      if (b.id.type === 'lobby') endBattle();
      else afterResult(g);
      return;
    }
    return;
  }
  if (g.pickAnim) return;
  const { x, y } = toLogical(e);
  let list: Button[];
  if (g.choice) list = CHOICE_BUTTONS.filter((b) => b.id.type !== 'card' || b.id.index < g.choice!.length);
  else if (g.paused) list = PAUSE_BUTTONS;
  else list = HUD_BUTTONS;
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
    if (!reward) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') afterResult(g);
    else if (e.key === 'Escape') endBattle();
    return;
  }
  if (g.pickAnim) return;
  if (g.choice) {
    const n = Number(e.key);
    if (n >= 1 && n <= g.choice.length) g.pick(n - 1);
    else if (e.key === 'r' || e.key === 'R') g.reroll();
    return;
  }
  if (e.key === 'q' || e.key === 'Q' || e.key === ' ') g.useRally();
  else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') g.paused = !g.paused;
  else if (e.key === 'f' || e.key === 'F') cycleSpeed(g);
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
    for (const ev of g.events) sound.play(ev);
    g.events.length = 0;
    if (g.phase !== 'playing' && !reward) {
      reward = applyResult(save, g.stage, g.result!);
      // 승리하면 로비에서도 다음 스테이지가 선택되어 있게
      if (g.result!.victory) {
        const next = STAGES.find((s) => s.no === g.stage.no + 1);
        if (next) save.selectedStage = next.id;
      }
      writeSave(save);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b1d2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, CONFIG.width, CONFIG.height);
    ctx.clip();
    render(ctx, g, elapsed, pressed, reward);
    ctx.restore();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.hidden = true;
menu.show(save);
sound.music('lobby');
// 브라우저 정책: 첫 터치/키 입력 때 소리를 켠다
// 브라우저마다 '사용자 동작'으로 인정하는 이벤트가 달라서 여러 개에 건다 (구형 iOS는 touchend/click만 인정)
for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const) document.addEventListener(ev, () => sound.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) sound.wake(); });
window.addEventListener('pageshow', () => sound.wake());
window.addEventListener('focus', () => sound.wake());
void Promise.all([loadArt(), loadWorldArt()]).then(() => setTimeout(() => menu.refresh(), 300));

// 디버그/테스트용 훅
Object.assign(window as object, {
  __catwar: {
    get game() { return game; },
    get save() { return save; },
    setSave(s: SaveData) { save = s; writeSave(save); menu.show(save); },
    start: startBattle,
    sound,
  },
});
