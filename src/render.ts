// 전투 화면 렌더링 — 모든 그래픽은 코드로 그린다 (외부 에셋 없음)
import { drawCatLook } from './catdraw';
import { CONFIG } from './data/config';
import { ENEMIES, type EnemyKind } from './data/enemies';
import type { Area } from './data/stages';
import type { Game, Unit } from './game';
import { BAR_Y, PAUSE_BUTTONS, buttonKey, type Button, type Rect } from './ui';

type Ctx = CanvasRenderingContext2D;
const W = CONFIG.width;
const H = CONFIG.height;
const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

export interface RewardView {
  coins: number;
  tuna: number;
  heroShards: number;
  firstClear: boolean;
  newStars: number;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center', outline = true): void {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.lineWidth = Math.max(3, size / 5);
    ctx.strokeStyle = 'rgba(40,20,40,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ellipse(ctx, x, y, r, r, fill);
}

// ───────────────────────── 배경 ─────────────────────────

const THEMES: Record<Area, { wallTop: string; wallBottom: string; dot: string; floorTop: string; floorBottom: string; tiles: boolean }> = {
  entrance: { wallTop: '#e6f7ef', wallBottom: '#cdeedd', dot: 'rgba(255,255,255,0.6)', floorTop: '#c9b39a', floorBottom: '#a8917a', tiles: true },
  living: { wallTop: '#ffe9f0', wallBottom: '#ffd6e4', dot: 'rgba(255,255,255,0.55)', floorTop: '#d9a874', floorBottom: '#b98653', tiles: false },
  kitchen: { wallTop: '#fff5d6', wallBottom: '#ffe9ad', dot: 'rgba(255,255,255,0.7)', floorTop: '#e7e1d8', floorBottom: '#c9c1b5', tiles: true },
  attic: { wallTop: '#d9c3a5', wallBottom: '#bfa27c', dot: 'rgba(90,60,30,0.15)', floorTop: '#9c7550', floorBottom: '#7a5737', tiles: false },
};

function drawBackground(ctx: Ctx, t: number, area: Area): void {
  const th = THEMES[area];
  const g = ctx.createLinearGradient(0, 0, 0, 330);
  g.addColorStop(0, th.wallTop);
  g.addColorStop(1, th.wallBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 330);
  ctx.fillStyle = th.dot;
  for (let y = 30; y < 320; y += 44) {
    for (let x = (y / 44) % 2 ? 20 : 42; x < W; x += 44) {
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 창문
  roundRect(ctx, 420, 70, 140, 110, 10);
  ctx.fillStyle = area === 'attic' ? '#2c3e66' : '#9ed8ff';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#fff6ea';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(490, 70); ctx.lineTo(490, 180);
  ctx.moveTo(420, 125); ctx.lineTo(560, 125);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.rect(424, 74, 132, 102);
  ctx.clip();
  if (area === 'attic') {
    circle(ctx, 520, 100, 14, '#fff6c2');
    for (const [sx, sy] of [[440, 90], [470, 150], [540, 160], [455, 120]]) circle(ctx, sx, sy, 1.5, '#fff');
  } else {
    const cx = 430 + ((t * 8) % 160);
    circle(ctx, cx, 100, 12, '#fff');
    circle(ctx, cx + 14, 96, 15, '#fff');
    circle(ctx, cx + 28, 102, 10, '#fff');
  }
  ctx.restore();
  // 선반
  ctx.fillStyle = '#c99a6b';
  ctx.fillRect(640, 150, 160, 10);
  ellipse(ctx, 690, 140, 22, 10, '#7fc6ff');
  ctx.beginPath(); ctx.moveTo(708, 140); ctx.lineTo(722, 130); ctx.lineTo(722, 150); ctx.fill();
  circle(ctx, 678, 137, 2.5, '#333');
  roundRect(ctx, 740, 118, 26, 32, 4); ctx.fillStyle = '#ffb36b'; ctx.fill();
  text(ctx, '츄르', 753, 134, 10, '#fff', 'center', false);

  // 걸레받이
  ctx.fillStyle = '#f7f0e6';
  ctx.fillRect(0, 312, W, 20);
  ctx.fillStyle = '#e4d6c4';
  ctx.fillRect(0, 330, W, 3);
  // 바닥
  const fg = ctx.createLinearGradient(0, 333, 0, BAR_Y);
  fg.addColorStop(0, th.floorTop);
  fg.addColorStop(1, th.floorBottom);
  ctx.fillStyle = fg;
  ctx.fillRect(0, 333, W, BAR_Y - 333);
  ctx.strokeStyle = 'rgba(90,60,30,0.2)';
  ctx.lineWidth = 2;
  for (let y = 355; y < BAR_Y; y += 24) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    const step = th.tiles ? 48 : 120;
    const off = (y / 24) % 2 && !th.tiles ? 0 : th.tiles ? 0 : 60;
    for (let x = off; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 22); ctx.stroke();
    }
  }
}

function drawHole(ctx: Ctx, t: number): void {
  const x = CONFIG.holeX + 20;
  // 벽 아래 쥐구멍
  ctx.fillStyle = '#e4d6c4';
  ctx.beginPath();
  ctx.ellipse(x, 336, 52, 70, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#2a1a22';
  ctx.beginPath();
  ctx.ellipse(x, 336, 42, 60, 0, Math.PI, 0);
  ctx.fill();
  // 금 간 벽
  ctx.strokeStyle = '#8b6b6b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 40, 270); ctx.lineTo(x - 55, 250); ctx.lineTo(x - 48, 232); ctx.lineTo(x - 66, 210);
  ctx.moveTo(x + 38, 280); ctx.lineTo(x + 52, 262); ctx.lineTo(x + 46, 240);
  ctx.stroke();
  // 어둠 속 눈빛
  const blink = Math.sin(t * 2.3) > 0.92 ? 0.2 : 1;
  ctx.fillStyle = '#ffdf5e';
  ellipse(ctx, x - 10, 305, 3.5, 3.5 * blink, '#ffdf5e');
  ellipse(ctx, x + 6, 305, 3.5, 3.5 * blink, '#ffdf5e');
  ellipse(ctx, x + 18, 318, 2.5, 2.5 * blink, '#ff8a8a');
  ellipse(ctx, x + 26, 318, 2.5, 2.5 * blink, '#ff8a8a');
}

function drawGirl(ctx: Ctx, cx: number, cy: number, mood: number, t: number): void {
  // mood: 1=행복, 0=울음
  const bob = Math.sin(t * 2) * 1.5;
  cy += bob;
  // 머리카락(뒤)
  circle(ctx, cx - 22, cy + 6, 10, '#6b3b2a');
  circle(ctx, cx + 22, cy + 6, 10, '#6b3b2a');
  circle(ctx, cx, cy, 22, '#6b3b2a');
  // 얼굴
  circle(ctx, cx, cy + 4, 18, '#ffe2cf');
  // 앞머리
  ctx.fillStyle = '#6b3b2a';
  ctx.beginPath();
  ctx.ellipse(cx, cy - 8, 20, 11, 0, Math.PI, 0);
  ctx.fill();
  // 리본
  ctx.fillStyle = '#ff5f9e';
  ctx.beginPath();
  ctx.moveTo(cx + 14, cy - 18); ctx.lineTo(cx + 4, cy - 26); ctx.lineTo(cx + 4, cy - 10); ctx.closePath();
  ctx.moveTo(cx + 14, cy - 18); ctx.lineTo(cx + 26, cy - 28); ctx.lineTo(cx + 24, cy - 10); ctx.closePath();
  ctx.fill();
  circle(ctx, cx + 14, cy - 18, 3.5, '#ff2f7e');
  // 볼터치
  ellipse(ctx, cx - 11, cy + 10, 4, 2.5, 'rgba(255,120,150,0.55)');
  ellipse(ctx, cx + 11, cy + 10, 4, 2.5, 'rgba(255,120,150,0.55)');
  // 눈 / 입
  ctx.strokeStyle = '#3a2020';
  ctx.fillStyle = '#3a2020';
  ctx.lineWidth = 2;
  if (mood > 0.6) {
    ctx.beginPath(); ctx.arc(cx - 7, cy + 4, 3, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 7, cy + 4, 3, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 11, 4, 0, Math.PI); ctx.stroke();
  } else if (mood > 0.25) {
    circle(ctx, cx - 7, cy + 3, 2.5, '#3a2020');
    circle(ctx, cx + 7, cy + 3, 2.5, '#3a2020');
    ctx.beginPath(); ctx.moveTo(cx - 4, cy + 13); ctx.quadraticCurveTo(cx, cy + 10, cx + 4, cy + 13); ctx.stroke();
    // 땀
    ellipse(ctx, cx + 18, cy - 2, 2.5, 4, '#8fd3ff');
  } else {
    ctx.beginPath(); ctx.moveTo(cx - 10, cy + 2); ctx.lineTo(cx - 4, cy + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 10, cy + 2); ctx.lineTo(cx + 4, cy + 5); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 15, 4, Math.PI, 0); ctx.stroke();
    const tear = (t * 40) % 14;
    ellipse(ctx, cx - 8, cy + 8 + tear, 2, 3, '#8fd3ff');
    ellipse(ctx, cx + 8, cy + 8 + tear, 2, 3, '#8fd3ff');
  }
}

function drawHouse(ctx: Ctx, game: Game, t: number): void {
  const right = CONFIG.houseX;
  const shake = game.houseFlash > 0 ? (Math.random() - 0.5) * 4 : 0;
  ctx.save();
  ctx.translate(shake, 0);
  // 지붕
  ctx.fillStyle = '#ff7f9f';
  ctx.beginPath();
  ctx.moveTo(-10, 170); ctx.lineTo(right / 2 + 2, 92); ctx.lineTo(right + 18, 170); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff9fb7';
  ctx.fillRect(right / 2 - 34, 94, 0, 0);
  // 굴뚝
  ctx.fillStyle = '#d65f7f';
  ctx.fillRect(18, 100, 16, 40);
  // 벽
  roundRect(ctx, 4, 166, right - 4, 254, 6);
  ctx.fillStyle = game.houseFlash > 0 ? '#ffd0d0' : '#fff4dd';
  ctx.fill();
  ctx.strokeStyle = '#e8c9a0';
  ctx.lineWidth = 3;
  ctx.stroke();
  // 창문(여자아이)
  roundRect(ctx, 20, 186, 84, 74, 10);
  ctx.fillStyle = '#bfe6ff';
  ctx.fill();
  ctx.save();
  roundRect(ctx, 20, 186, 84, 74, 10);
  ctx.clip();
  drawGirl(ctx, 62, 230, game.houseHp / game.maxHouseHp, t);
  ctx.restore();
  roundRect(ctx, 20, 186, 84, 74, 10);
  ctx.strokeStyle = '#c98f5a';
  ctx.lineWidth = 5;
  ctx.stroke();
  // 커튼
  ctx.fillStyle = 'rgba(255,140,170,0.8)';
  ctx.beginPath(); ctx.moveTo(22, 188); ctx.quadraticCurveTo(34, 220, 24, 258); ctx.lineTo(22, 258); ctx.fill();
  ctx.beginPath(); ctx.moveTo(102, 188); ctx.quadraticCurveTo(90, 220, 100, 258); ctx.lineTo(102, 258); ctx.fill();
  // 문
  roundRect(ctx, 40, 300, 46, 120, 20);
  ctx.fillStyle = '#c98f5a';
  ctx.fill();
  circle(ctx, 76, 362, 4, '#ffd84d');
  // 고양이 문(펫도어)
  roundRect(ctx, 50, 386, 26, 30, 8);
  ctx.fillStyle = '#9b6a3f';
  ctx.fill();
  ctx.restore();

  // 집 체력바
  const ratio = Math.max(0, game.houseHp / game.maxHouseHp);
  roundRect(ctx, 14, 14, 270, 26, 13);
  ctx.fillStyle = 'rgba(40,20,40,0.6)';
  ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, 17, 17, 264 * ratio, 20, 10);
    ctx.fillStyle = ratio > 0.5 ? '#6fd67a' : ratio > 0.25 ? '#ffc94d' : '#ff6b6b';
    ctx.fill();
  }
  text(ctx, `🏠 집 ${Math.ceil(game.houseHp)} / ${game.maxHouseHp}`, 150, 28, 14, '#fff');
}

// ───────────────────────── 유닛 ─────────────────────────

function drawStatus(ctx: Ctx, u: Unit): void {
  const top = u.y - u.f.size * 2.1;
  if (u.stunT > 0) {
    for (let i = 0; i < 3; i++) {
      const a = u.animT * 5 + (i * Math.PI * 2) / 3;
      text(ctx, '★', u.x + Math.cos(a) * 14, top - 4 + Math.sin(a) * 4, 10, '#ffe14d', 'center', false);
    }
  }
  if (u.slowT > 0) {
    ctx.strokeStyle = 'rgba(140,220,255,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(u.x, u.y, u.f.size * 1.1, u.f.size * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (u.buffT > 0 || u.auraAtk > 0) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(u.animT * 8);
    ellipse(ctx, u.x, u.y, u.f.size * 1.3, u.f.size * 0.38, u.buffT > 0 ? '#ffb84d' : '#ffe9a8');
    ctx.restore();
  }
  if (u.skillFx > 0 && u.f.skill) {
    ctx.save();
    ctx.globalAlpha = u.skillFx / 0.6;
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(u.x, u.y - u.f.size * 0.8, u.f.size * (1.6 - u.skillFx), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawUnit(ctx: Ctx, u: Unit): void {
  const f = u.f;
  const groundY = f.flying ? u.y + 62 : u.y;
  ellipse(ctx, u.x, groundY + 2, f.size * (f.flying ? 0.6 : 1.1), f.size * 0.25, 'rgba(60,30,10,0.25)');
  if (!u.dead) drawStatus(ctx, u);

  ctx.save();
  ctx.translate(u.x, u.y);
  if (u.dead) {
    const k = u.deathT / 0.6;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.translate(0, -k * 20);
    ctx.rotate((u.side === 'cat' ? -1 : 1) * k * 0.8);
  }
  if (u.side === 'cat' && f.look) {
    drawCatLook(ctx, f.look, f.size, {
      t: u.animT, walking: !u.attacking && u.stunT <= 0, attacking: u.attacking, swing: f.projectile ? 0 : u.swing, stride: f.speed / 7,
    });
  } else {
    drawEnemy(ctx, u);
  }
  ctx.restore();

  if (u.hitFlash > 0 && !u.dead) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ellipse(ctx, u.x, u.y - f.size * 0.7, f.size * 1.2, f.size * 0.9, '#ffffff');
    ctx.restore();
  }

  if (!u.dead && (u.hp < u.maxHp || f.hero || f.boss)) {
    const w = Math.max(24, f.size * 1.8);
    const y = u.y - f.size * 2 - 8;
    ctx.fillStyle = 'rgba(30,15,30,0.6)';
    ctx.fillRect(u.x - w / 2, y, w, 5);
    ctx.fillStyle = u.side === 'cat' ? (f.hero ? '#ffd84d' : '#6fd67a') : '#ff6b6b';
    ctx.fillRect(u.x - w / 2, y, (w * u.hp) / u.maxHp, 5);
    if (f.hero) text(ctx, '치즈', u.x, y - 9, 11, '#ffe98a');
  }
}

function drawEnemy(ctx: Ctx, u: Unit): void {
  const d = ENEMIES[u.f.key as EnemyKind];
  const s = d.size;
  const t = u.animT;
  const lunge = u.swing * 5;
  ctx.scale(-1, 1);
  ctx.translate(lunge, 0);

  switch (d.id) {
    case 'mouse':
    case 'ratking': {
      const bob = u.attacking ? 0 : Math.abs(Math.sin(t * 10)) * 2;
      ctx.translate(0, -bob);
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = s * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.9, -s * 0.4);
      ctx.quadraticCurveTo(-s * 1.8, -s * 0.2 + Math.sin(t * 6) * 5, -s * 2, -s * 0.9);
      ctx.stroke();
      ellipse(ctx, 0, -s * 0.55, s, s * 0.6, d.color);
      circle(ctx, s * 0.55, -s * 1.15, s * 0.42, d.color);
      circle(ctx, s * 0.55, -s * 1.15, s * 0.28, d.accent);
      ellipse(ctx, s * 0.95, -s * 0.65, s * 0.5, s * 0.38, d.color);
      circle(ctx, s * 1.42, -s * 0.66, s * 0.11, '#ff6f91');
      ellipse(ctx, s * 1.0, -s * 0.78, s * 0.08, s * 0.12, '#1e1420');
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s * 1.3, -s * 0.6); ctx.lineTo(s * 1.7, -s * 0.5);
      ctx.moveTo(s * 1.3, -s * 0.64); ctx.lineTo(s * 1.72, -s * 0.7);
      ctx.stroke();
      if (d.id === 'ratking') {
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath();
        const cx = s * 0.6;
        const cy = -s * 1.45;
        ctx.moveTo(cx - s * 0.4, cy); ctx.lineTo(cx - s * 0.45, cy - s * 0.45); ctx.lineTo(cx - s * 0.2, cy - s * 0.2);
        ctx.lineTo(cx, cy - s * 0.55); ctx.lineTo(cx + s * 0.2, cy - s * 0.2); ctx.lineTo(cx + s * 0.45, cy - s * 0.45);
        ctx.lineTo(cx + s * 0.4, cy); ctx.closePath(); ctx.fill();
        circle(ctx, cx, cy - s * 0.15, s * 0.07, '#e8384f');
        // 화난 눈썹
        ctx.strokeStyle = '#1e1420';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(s * 0.85, -s * 0.95); ctx.lineTo(s * 1.15, -s * 0.85); ctx.stroke();
      }
      break;
    }
    case 'roach': {
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const ph = Math.sin(t * 22 + i * 2) * 3;
        ctx.beginPath();
        ctx.moveTo(-s * 0.4 + i * s * 0.4, -s * 0.3);
        ctx.lineTo(-s * 0.6 + i * s * 0.4 + ph, 0);
        ctx.stroke();
      }
      ellipse(ctx, 0, -s * 0.45, s * 1.1, s * 0.48, d.color);
      ctx.strokeStyle = d.accent;
      ctx.beginPath(); ctx.moveTo(-s * 1.0, -s * 0.45); ctx.lineTo(s * 0.5, -s * 0.45); ctx.stroke();
      ellipse(ctx, s * 0.95, -s * 0.45, s * 0.32, s * 0.28, d.accent);
      circle(ctx, s * 1.05, -s * 0.55, 2, '#fff');
      ctx.beginPath();
      ctx.moveTo(s * 1.1, -s * 0.6); ctx.quadraticCurveTo(s * 1.8, -s * 1.6, s * 2.2, -s * (1.3 + Math.sin(t * 9) * 0.2));
      ctx.moveTo(s * 1.1, -s * 0.6); ctx.quadraticCurveTo(s * 1.6, -s * 1.8, s * 1.6, -s * (2 + Math.cos(t * 9) * 0.2));
      ctx.stroke();
      break;
    }
    case 'ant': {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const ph = Math.sin(t * 20 + i * 2) * 2.5;
        ctx.beginPath(); ctx.moveTo(i * s * 0.3 - s * 0.1, -s * 0.6); ctx.lineTo(i * s * 0.3 - s * 0.3 + ph, 0); ctx.stroke();
      }
      circle(ctx, -s * 0.8, -s * 0.7, s * 0.55, d.color);
      circle(ctx, 0, -s * 0.7, s * 0.35, d.color);
      circle(ctx, s * 0.7, -s * 0.85, s * 0.45, d.color);
      circle(ctx, s * 0.85, -s * 0.95, s * 0.12, '#fff');
      ctx.beginPath(); ctx.moveTo(s * 0.9, -s * 1.2); ctx.lineTo(s * 1.3, -s * 1.8); ctx.stroke();
      circle(ctx, -s * 0.8, -s * 0.85, s * 0.15, d.accent);
      break;
    }
    case 'mosquito': {
      const hover = Math.sin(t * 5) * 5;
      ctx.translate(0, hover);
      const flap = Math.sin(t * 50) * 0.5;
      ctx.fillStyle = 'rgba(220,240,255,0.7)';
      ctx.beginPath(); ctx.ellipse(-s * 0.2, -s * 0.8, s * 0.9, s * 0.35, -0.6 + flap, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-s * 0.5, -s * 0.7, s * 0.8, s * 0.3, -1.1 - flap, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(i * s * 0.25 - s * 0.2, -s * 0.2); ctx.lineTo(i * s * 0.35 - s * 0.6, s * 0.6); ctx.stroke();
      }
      ellipse(ctx, -s * 0.6, -s * 0.2, s * 0.9, s * 0.25, d.color, 0.25);
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(-s * 0.9 + i * 0.35 * s, -s * 0.4); ctx.lineTo(-s * 0.85 + i * 0.35 * s, -s * 0.02); ctx.stroke();
      }
      circle(ctx, s * 0.45, -s * 0.3, s * 0.35, d.color);
      circle(ctx, s * 0.55, -s * 0.38, s * 0.14, '#e05b5b');
      ctx.strokeStyle = '#2a2030';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(s * 0.75, -s * 0.2); ctx.lineTo(s * 1.6, s * 0.1); ctx.stroke();
      // 그림자
      ctx.translate(0, -hover);
      break;
    }
    case 'spider': {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const ph = u.attacking ? 0 : Math.sin(t * 12 + i) * 3;
        for (const dir of [-1, 1]) {
          const bx = (i - 1.5) * s * 0.25;
          ctx.beginPath();
          ctx.moveTo(bx, -s * 0.7);
          ctx.lineTo(bx + dir * s * (0.6 + i * 0.1) + ph, -s * 1.3);
          ctx.lineTo(bx + dir * s * (0.9 + i * 0.15) + ph, 0);
          ctx.stroke();
        }
      }
      circle(ctx, -s * 0.35, -s * 0.8, s * 0.7, d.color);
      circle(ctx, -s * 0.35, -s * 0.85, s * 0.28, d.accent);
      circle(ctx, s * 0.45, -s * 0.65, s * 0.45, d.color);
      for (const [ex, ey] of [[0.55, -0.8], [0.75, -0.75], [0.6, -0.6], [0.8, -0.58]] as const) {
        circle(ctx, s * ex, s * ey, s * 0.08, '#ff5f6d');
      }
      break;
    }
  }
}

// ───────────────────────── UI ─────────────────────────

function drawButtonBase(ctx: Ctx, r: Rect, enabled: boolean, base: string): void {
  roundRect(ctx, r.x, r.y + 4, r.w, r.h, 14);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  roundRect(ctx, r.x, r.y, r.w, r.h, 14);
  ctx.fillStyle = enabled ? base : '#8a8090';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = enabled ? '#fff8' : '#fff3';
  ctx.stroke();
}

function cooldownOverlay(ctx: Ctx, r: Rect, k: number, label: string): void {
  ctx.save();
  roundRect(ctx, r.x, r.y, r.w, r.h, 14);
  ctx.clip();
  ctx.fillStyle = 'rgba(30,15,30,0.55)';
  ctx.fillRect(r.x, r.y + r.h * (1 - k), r.w, r.h * k);
  ctx.restore();
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2, 24, '#fff');
}

function pulseBorder(ctx: Ctx, r: Rect, t: number): void {
  const pulse = (Math.sin(t * 6) + 1) / 2;
  roundRect(ctx, r.x, r.y, r.w, r.h, 14);
  ctx.strokeStyle = `rgba(255,255,200,${0.3 + pulse * 0.5})`;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function catIcon(ctx: Ctx, u: { look: NonNullable<Unit['f']['look']>; size: number }, x: number, y: number, px: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  const k = px / u.size;
  ctx.scale(k, k);
  drawCatLook(ctx, u.look, u.size, { t, walking: false, attacking: false, swing: 0, stride: 5 });
  ctx.restore();
}

function drawBar(ctx: Ctx, game: Game, buttons: Button[], pressed: string | null): void {
  ctx.fillStyle = '#4a2f3f';
  ctx.fillRect(0, BAR_Y, W, H - BAR_Y);
  ctx.fillStyle = '#6b4458';
  ctx.fillRect(0, BAR_Y, W, 4);

  for (const b of buttons) {
    const r = b.rect;
    ctx.save();
    if (pressed === buttonKey(b.id)) ctx.translate(0, 3);
    switch (b.id.type) {
      case 'cat': {
        const id = b.id.id;
        const e = game.deck.find((d) => d.def.id === id)!;
        const cd = game.cooldowns[id] ?? 0;
        const affordable = game.churu >= e.def.cost;
        drawButtonBase(ctx, r, affordable && cd <= 0, '#ffb3c8');
        catIcon(ctx, { look: e.def.look, size: e.fighter.size }, r.x + 24, r.y + 72, 19, 0);
        text(ctx, e.def.name, r.x + r.w - 10, r.y + 20, 16, '#fff', 'right');
        text(ctx, `Lv.${e.owned.level} ${'★'.repeat(e.owned.stars)}`, r.x + r.w - 10, r.y + 41, 11, '#ffe98a', 'right');
        roundRect(ctx, r.x + 72, r.y + 54, 72, 22, 11);
        ctx.fillStyle = affordable ? '#ffd84d' : '#5a4a50';
        ctx.fill();
        text(ctx, `🐟 ${e.def.cost}`, r.x + 108, r.y + 65, 14, affordable ? '#5a3a10' : '#ccc', 'center', false);
        text(ctx, `${b.id.slot + 1}`, r.x + 12, r.y + 12, 11, '#fff');
        if (cd > 0) cooldownOverlay(ctx, r, cd / e.def.cooldown, cd.toFixed(1));
        else if (game.canSummon(id)) pulseBorder(ctx, r, game.time);
        break;
      }
      case 'hero': {
        const s = game.heroSkill;
        const heroDead = !game.hero || game.hero.dead;
        const ready = game.canUseHeroSkill();
        drawButtonBase(ctx, r, ready, '#ffcf5a');
        catIcon(ctx, { look: game.heroEntry.def.look, size: game.heroEntry.fighter.size }, r.x + 24, r.y + 72, 19, game.time);
        text(ctx, '꾹꾹이 응원', r.x + r.w - 8, r.y + 22, 14, '#fff', 'right');
        text(ctx, `Lv.${game.heroEntry.owned.level} ${'★'.repeat(game.heroEntry.owned.stars)}`, r.x + r.w - 8, r.y + 42, 10, '#fff7d0', 'right');
        text(ctx, '스킬 (Q)', r.x + r.w - 8, r.y + 64, 13, '#fff', 'right');
        if (heroDead) cooldownOverlay(ctx, r, Math.max(0, game.heroRespawn) / 15, `부활 ${Math.max(0, game.heroRespawn).toFixed(0)}`);
        else if (game.heroSkillCd > 0) cooldownOverlay(ctx, r, game.heroSkillCd / s.cd, game.heroSkillCd.toFixed(0));
        else if (ready) pulseBorder(ctx, r, game.time);
        break;
      }
      case 'wallet': {
        const cost = game.walletUpgradeCost;
        const can = cost !== null && game.churu >= cost;
        drawButtonBase(ctx, r, can, '#8fcf7a');
        text(ctx, `🐟 ${Math.floor(game.churu)} / ${game.churuCap}`, r.x + r.w / 2, r.y + 20, 16, '#ffe98a');
        roundRect(ctx, r.x + 10, r.y + 34, r.w - 20, 10, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fill();
        roundRect(ctx, r.x + 10, r.y + 34, Math.max(10, (r.w - 20) * (game.churu / game.churuCap)), 10, 5);
        ctx.fillStyle = '#ffd84d';
        ctx.fill();
        text(ctx, `지갑 Lv.${game.walletLevel}`, r.x + r.w / 2, r.y + 56, 13, '#fff');
        text(ctx, cost === null ? 'MAX' : `업그레이드 🐟${cost} (W)`, r.x + r.w / 2, r.y + 73, 11, '#fff');
        break;
      }
      case 'pause':
        drawButtonBase(ctx, r, true, '#9b7bd6');
        text(ctx, game.paused ? '▶' : 'Ⅱ', r.x + r.w / 2, r.y + r.h / 2, 18, '#fff');
        break;
      case 'speed':
        drawButtonBase(ctx, r, true, game.speed > 1 ? '#ff9f43' : '#9b7bd6');
        text(ctx, `x${game.speed}`, r.x + r.w / 2, r.y + r.h / 2, 16, '#fff');
        break;
    }
    ctx.restore();
  }
}

function drawHud(ctx: Ctx, game: Game): void {
  const waveNo = Math.max(0, game.waveIndex + 1);
  roundRect(ctx, W / 2 - 150, 12, 300, 32, 16);
  ctx.fillStyle = 'rgba(40,20,40,0.6)';
  ctx.fill();
  text(ctx, `${game.stage.no}스테이지 · WAVE ${waveNo}/${game.stage.waves.length} · 🐾 ${game.kills}`, W / 2, 28, 15, '#fff');

  if (game.rallyFx > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.rallyFx) * 0.25;
    ctx.fillStyle = '#ffcf5a';
    ctx.fillRect(0, 0, W, BAR_Y);
    ctx.restore();
  }

  if (game.banner && game.banner.t > 0) {
    const a = Math.min(1, game.banner.t * 2);
    ctx.save();
    ctx.globalAlpha = a;
    roundRect(ctx, W / 2 - 240, 110, 480, 56, 28);
    ctx.fillStyle = 'rgba(255,95,158,0.9)';
    ctx.fill();
    text(ctx, game.banner.text, W / 2, 138, 22, '#fff');
    ctx.restore();
  }
}

function drawOverlay(ctx: Ctx, game: Game, t: number, reward: RewardView | null, pressed: string | null): void {
  if (game.phase === 'playing' && !game.paused) return;
  ctx.fillStyle = 'rgba(40,20,40,0.65)';
  ctx.fillRect(0, 0, W, H);
  const pulse = 0.6 + 0.4 * Math.sin(t * 4);

  if (game.phase === 'playing' && game.paused) {
    text(ctx, '일시정지', W / 2, 200, 48, '#fff');
    for (const b of PAUSE_BUTTONS) {
      const r = b.rect;
      ctx.save();
      if (pressed === buttonKey(b.id)) ctx.translate(0, 3);
      drawButtonBase(ctx, r, true, b.id.type === 'quit' ? '#c06080' : '#8fcf7a');
      text(ctx, b.id.type === 'quit' ? '포기하고 나가기' : '계속하기', r.x + r.w / 2, r.y + r.h / 2, 20, '#fff');
      ctx.restore();
    }
    return;
  }

  const res = game.result!;
  if (res.victory) {
    text(ctx, '승리! 🎉', W / 2, 120, 60, '#ffe98a');
    for (let i = 0; i < 3; i++) {
      const on = i < res.stars;
      text(ctx, '★', W / 2 - 70 + i * 70, 195, on ? 56 : 46, on ? '#ffd84d' : '#6b5a66');
    }
  } else {
    text(ctx, '패배...', W / 2, 130, 60, '#ff8a8a');
    text(ctx, '고양이들을 레벨업하거나 편성을 바꿔서 다시 도전해요!', W / 2, 195, 18, '#fff');
  }
  text(ctx, `처치 ${res.kills} · 집 체력 ${Math.ceil(game.houseHp)}/${game.maxHouseHp} · ${res.time.toFixed(0)}초`, W / 2, 245, 16, '#ffd6e4');

  if (reward) {
    roundRect(ctx, W / 2 - 220, 270, 440, 90, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    text(ctx, reward.firstClear ? '첫 클리어 보상' : '보상', W / 2, 290, 15, '#ffe98a');
    const parts = [`🪙 ${reward.coins}`];
    if (reward.tuna > 0) parts.push(`🥫 ${reward.tuna}`);
    if (reward.heroShards > 0) parts.push(`치즈 조각 +${reward.heroShards}`);
    text(ctx, parts.join('    '), W / 2, 325, 24, '#fff');
  }
  ctx.save();
  ctx.globalAlpha = pulse;
  text(ctx, '터치해서 로비로', W / 2, 400, 24, '#fff');
  ctx.restore();
}

export function render(ctx: Ctx, game: Game, buttons: Button[], t: number, pressed: string | null, reward: RewardView | null): void {
  drawBackground(ctx, t, game.stage.area);
  drawHole(ctx, t);
  drawHouse(ctx, game, t);

  const sorted = [...game.units].sort((a, b) => (a.f.flying ? 1 : 0) - (b.f.flying ? 1 : 0) || a.y - b.y);
  for (const u of sorted) drawUnit(ctx, u);

  for (const p of game.projectiles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    circle(ctx, 0, 0, p.radius * (p.crit ? 1.4 : 1), p.color);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.6, 0.3, 2.6); ctx.stroke();
    ctx.restore();
  }
  for (const p of game.particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    circle(ctx, p.x, p.y, p.r, p.color);
  }
  ctx.globalAlpha = 1;
  for (const f of game.floats) {
    ctx.globalAlpha = Math.min(1, f.t * 2);
    text(ctx, f.text, f.x, f.y, f.size, f.color);
  }
  ctx.globalAlpha = 1;

  drawHud(ctx, game);
  drawBar(ctx, game, buttons, pressed);
  drawOverlay(ctx, game, t, reward, pressed);
}
