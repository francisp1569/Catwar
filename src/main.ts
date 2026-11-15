import { CAT_ORDER, CONFIG } from './data';
import { Game } from './game';
import { render } from './render';
import { buildButtons, hit, type Button } from './ui';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const game = new Game();
const buttons: Button[] = buildButtons();

// 논리 해상도(960x540)를 화면에 맞춰 레터박스로 확대/축소
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
  // 세로 화면이면 게임을 90° 돌려서 긴 변을 가로로 사용 (H5 가로형 게임의 일반적인 방식)
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
  if (portrait) {
    // setTransform의 역변환: 화면 x = w - offY - s*ly, 화면 y = offX + s*lx
    return { x: (sy - offX) / scale, y: (rect.width - offY - sx) / scale };
  }
  return { x: (sx - offX) / scale, y: (sy - offY) / scale };
}

let pressed: string | null = null;

function press(b: Button): void {
  switch (b.id.type) {
    case 'cat': game.summon(b.id.kind); break;
    case 'wallet': game.upgradeWallet(); break;
    case 'pause': game.paused = !game.paused; break;
    case 'speed': game.speed = game.speed === 1 ? 2 : 1; break;
  }
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (game.phase !== 'playing') {
    game.start();
    return;
  }
  const { x, y } = toLogical(e);
  for (const b of buttons) {
    if (hit(b.rect, x, y)) {
      // 일시정지 중에는 일시정지 버튼만 동작
      if (game.paused && b.id.type !== 'pause') return;
      pressed = JSON.stringify(b.id);
      press(b);
      return;
    }
  }
  if (game.paused) game.paused = false;
});
const release = (): void => { pressed = null; };
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (game.phase !== 'playing') {
    if (e.key === 'Enter' || e.key === ' ') game.start();
    return;
  }
  const n = Number(e.key);
  if (n >= 1 && n <= CAT_ORDER.length) game.summon(CAT_ORDER[n - 1]);
  else if (e.key === 'w' || e.key === 'W') game.upgradeWallet();
  else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') game.paused = !game.paused;
  else if (e.key === 'f' || e.key === 'F') game.speed = game.speed === 1 ? 2 : 1;
});

// 탭이 숨겨지면 자동 일시정지
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === 'playing') game.paused = true;
});

let last = performance.now();
let elapsed = 0;
function frame(now: number): void {
  const dt = (now - last) / 1000;
  last = now;
  elapsed += Math.min(dt, 0.1);
  game.update(dt);

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
  render(ctx, game, buttons, elapsed, pressed, portrait);
  ctx.restore();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// 디버그/테스트용
(window as unknown as { __game: Game }).__game = game;
