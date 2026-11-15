// 세로형 전투 화면 렌더링 — 모든 그래픽은 코드로 그린다 (외부 에셋 없음)
import { drawCatBackToon, drawCatFaceToon, drawCatLookToon, drawToon, heart, IDLE_POSE } from './catdraw';
import { drawFaceArtCircle, getArt } from './art';
import { RARITY_COLOR, type CatLook } from './data/cats';
import { CONFIG } from './data/config';
import type { EnemyDef } from './data/enemies';
import type { Area } from './data/stages';
import { GENERIC } from './data/weapons';
import type { Card, Decal, Enemy, Game, Member } from './game';
import { CHOICE_BUTTONS, HUD_BUTTONS, PAUSE_BUTTONS, buttonKey, type Rect } from './ui';

type Ctx = CanvasRenderingContext2D;
const W = CONFIG.width;
const FONT = '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

export interface RewardView { coins: number; tuna: number; heroShards: number; firstClear: boolean; newStars: number; }

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
    ctx.lineWidth = Math.max(3, size / 4.5);
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


function wrap(ctx: Ctx, s: string, maxW: number, size: number): string[] {
  ctx.font = `bold ${size}px ${FONT}`;
  const lines: string[] = [];
  let cur = '';
  for (const ch of s) {
    if (ctx.measureText(cur + ch).width > maxW && cur) {
      lines.push(cur.trim());
      cur = ch;
    } else cur += ch;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

/** 얼굴 그림(사진)이 있으면 원 안에 그리고, 없으면 코드로 그린 얼굴 */
function iconFace(ctx: Ctx, id: string, cx: number, cy: number, r: number, fallback: () => void): void {
  const art = getArt(id, 'face');
  if (art) drawFaceArtCircle(ctx, id, art, cx, cy, r);
  else fallback();
}

function drawFaceAt(ctx: Ctx, look: CatLook, x: number, y: number, R: number, t: number): void {
  ctx.save();
  ctx.translate(x, y);
  drawCatFaceToon(ctx, `hud${Math.round(R)}`, { ...look, accessory: look.accessory === 'heart' ? undefined : look.accessory }, R, t, Math.max(1, R * 0.08));
  ctx.restore();
}


// ───────────────────────── 배경 (위에서 내려다본 방 바닥) ─────────────────────────

const FLOORS: Record<Area, { a: string; b: string; tile: boolean; line: string; wall: string }> = {
  entrance: { a: '#d8d2c8', b: '#cbc4b8', tile: true, line: 'rgba(120,100,80,0.18)', wall: '#cdeedd' },
  living: { a: '#d9a874', b: '#cf9c66', tile: false, line: 'rgba(110,60,20,0.22)', wall: '#ffd6e4' },
  kitchen: { a: '#f4efe4', b: '#e6dcc6', tile: true, line: 'rgba(150,120,80,0.2)', wall: '#ffe9ad' },
  attic: { a: '#8f6a48', b: '#836041', tile: false, line: 'rgba(40,20,5,0.3)', wall: '#bfa27c' },
};

function drawField(ctx: Ctx, area: Area, t: number): void {
  const f = FLOORS[area];
  ctx.fillStyle = f.a;
  ctx.fillRect(0, 0, W, CONFIG.height);
  if (f.tile) {
    ctx.fillStyle = f.b;
    for (let y = 0; y < CONFIG.height; y += 60) for (let x = (y / 60) % 2 ? 0 : 60; x < W; x += 120) ctx.fillRect(x, y, 60, 60);
  } else {
    ctx.strokeStyle = f.line;
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 54) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CONFIG.height); ctx.stroke();
      for (let y = ((x / 54) % 3) * 70; y < CONFIG.height; y += 210) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 54, y); ctx.stroke(); }
    }
  }
  // 소품
  ctx.save();
  ctx.globalAlpha = 0.5;
  if (area === 'living') {
    ellipse(ctx, W / 2, 430, 210, 150, '#f6b8c8');
    ctx.strokeStyle = '#fff6';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(W / 2, 430, 180, 125, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (area === 'entrance') {
    roundRect(ctx, 150, 420, 240, 150, 16); ctx.fillStyle = '#9fc8b0'; ctx.fill();
    ellipse(ctx, 60, 300, 22, 40, '#ff8fa8'); ellipse(ctx, 96, 306, 22, 40, '#ff8fa8');
  } else if (area === 'kitchen') {
    ellipse(ctx, 430, 340, 46, 46, '#ffffff'); ellipse(ctx, 430, 340, 34, 34, '#ffd27a');
    roundRect(ctx, 0, 130, 34, 600, 6); ctx.fillStyle = '#c9b38f'; ctx.fill();
    roundRect(ctx, W - 34, 130, 34, 600, 6); ctx.fill();
  } else {
    for (const [x, y] of [[40, 220], [470, 360], [30, 560]]) {
      roundRect(ctx, x - 30, y - 30, 60, 60, 4); ctx.fillStyle = '#b98653'; ctx.fill();
      ctx.fillStyle = '#d9b48a'; ctx.fillRect(x - 30, y - 4, 60, 8);
    }
    const g = ctx.createRadialGradient(W / 2, 200, 10, W / 2, 200, 300);
    g.addColorStop(0, 'rgba(255,240,180,0.25)'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, CONFIG.height);
  }
  ctx.restore();

  // 위쪽 벽과 침입 구멍
  ctx.fillStyle = f.wall;
  ctx.fillRect(0, 0, W, CONFIG.fieldTop - 18);
  ctx.fillStyle = '#f7f0e6';
  ctx.fillRect(0, CONFIG.fieldTop - 22, W, 10);
  for (const hx of [90, 270, 450]) {
    ctx.fillStyle = '#2a1a22';
    ctx.beginPath(); ctx.ellipse(hx, CONFIG.fieldTop - 12, 34, 22, 0, Math.PI, 0); ctx.fill();
    const blink = Math.sin(t * 2 + hx) > 0.9 ? 0.2 : 1;
    ellipse(ctx, hx - 8, CONFIG.fieldTop - 22, 3, 3 * blink, '#ffdf5e');
    ellipse(ctx, hx + 8, CONFIG.fieldTop - 22, 3, 3 * blink, '#ffdf5e');
  }
  // 바리케이드 뒤쪽 (집 안)
  const g = ctx.createLinearGradient(0, CONFIG.barricadeY, 0, CONFIG.height);
  g.addColorStop(0, '#fff1e0'); g.addColorStop(1, '#f2d9c0');
  ctx.fillStyle = g;
  ctx.fillRect(0, CONFIG.barricadeY + 20, W, CONFIG.height - CONFIG.barricadeY - 20);
}

function drawDecals(ctx: Ctx, decals: Decal[]): void {
  for (const d of decals) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (12 - d.t) / 3);
    ctx.fillStyle = d.color;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = d.r * (0.7 + 0.35 * Math.sin(d.seed + i * 2.3));
      const px = d.x + Math.cos(a) * rr;
      const py = d.y + Math.sin(a) * rr * 0.75;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = d.seed + i * 2.1;
      circle(ctx, d.x + Math.cos(a) * d.r * 1.4, d.y + Math.sin(a) * d.r, d.r * 0.18, d.color);
    }
    ctx.restore();
  }
}

function drawBarricade(ctx: Ctx, game: Game, t: number): void {
  const ratio = game.hp / game.maxHp;
  const y = CONFIG.barricadeY - 6;
  const items = ['cushion', 'box', 'books', 'cushion', 'box', 'cushion', 'books', 'box', 'cushion'];
  const w = W / items.length;
  ctx.save();
  if (game.hitFlash > 0) ctx.translate((Math.random() - 0.5) * 3, 0);
  items.forEach((kind, i) => {
    const x = i * w;
    const jitter = Math.sin(i * 7.3) * 4;
    if (kind === 'cushion') {
      const col = ['#ff9fb7', '#a6d8ff', '#ffe08a'][i % 3];
      roundRect(ctx, x + 1, y - 4 + jitter, w - 2, 56, 18); ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = '#0002'; ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, x + w / 2, y + 24 + jitter, 5, '#fff8');
      ctx.strokeStyle = '#fff6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 10, y + 24 + jitter); ctx.lineTo(x + w - 10, y + 24 + jitter); ctx.stroke();
    } else if (kind === 'box') {
      roundRect(ctx, x + 2, y - 14 + jitter, w - 4, 66, 3); ctx.fillStyle = '#c8925a'; ctx.fill();
      ctx.fillStyle = '#b37d47'; ctx.fillRect(x + 2, y - 14 + jitter, w - 4, 12);
      ctx.fillStyle = '#e8c79a'; ctx.fillRect(x + w / 2 - 5, y - 14 + jitter, 10, 66);
      ctx.strokeStyle = '#8a5a2a55'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y - 14 + jitter, w - 4, 66);
    } else {
      ['#6aa0ff', '#ff7a7a', '#7ad99a'].forEach((c, j) => {
        roundRect(ctx, x + 3 + j * 2, y + 34 - j * 17 + jitter, w - 8 - j * 3, 16, 3); ctx.fillStyle = c; ctx.fill();
        ctx.fillStyle = '#fff8'; ctx.fillRect(x + 6 + j * 2, y + 38 - j * 17 + jitter, 3, 8);
      });
    }
  });
  if (game.squad.some((m) => m.level > 0 && m.weapon.kind === 'guard')) {
    for (const px of [W * 0.25, W * 0.5, W * 0.75]) {
      roundRect(ctx, px - 11, y - 34, 22, 84, 5);
      ctx.fillStyle = '#3b2228'; ctx.fill();
      roundRect(ctx, px - 9, y - 32, 18, 80, 4);
      ctx.fillStyle = '#e2c38f'; ctx.fill();
      ctx.strokeStyle = '#b8935a';
      ctx.lineWidth = 1.5;
      for (let yy = y - 28; yy < y + 46; yy += 5) { ctx.beginPath(); ctx.moveTo(px - 9, yy); ctx.lineTo(px + 9, yy + 2); ctx.stroke(); }
      ellipse(ctx, px, y - 36, 14, 6, '#3b2228');
      ellipse(ctx, px, y - 37, 12, 4.5, '#9fd8a0');
    }
  }
  // 손상 표시
  if (ratio < 0.6) {
    ctx.strokeStyle = 'rgba(60,30,20,0.55)';
    ctx.lineWidth = 2;
    const n = Math.round((0.6 - ratio) * 20);
    for (let i = 0; i < n; i++) {
      const x = (i * 97) % W + 10;
      ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 8, y + 18); ctx.lineTo(x + 2, y + 30); ctx.stroke();
    }
  }
  if (game.hitFlash > 0) { ctx.fillStyle = 'rgba(255,60,60,0.25)'; ctx.fillRect(0, y - 14, W, 66); }
  ctx.restore();
  void t;
}

// ───────────────────────── 적 (위에서 본 모습, 아래로 이동) ─────────────────────────

// 적 그림을 애니메이션 프레임별로 한 번만 만화 스타일로 그려두고 재사용한다
const enemySprites = new Map<string, { c: HTMLCanvasElement; box: { x: number; y: number; w: number; h: number } }>();

function enemySprite(ctx: Ctx, d: EnemyDef, frame: number) {
  const tr = ctx.getTransform();
  const k = Math.min(4, Math.max(1, Math.round(Math.hypot(tr.a, tr.b) * 2) / 2));
  const key = `${d.id}:${frame}:${k}`;
  let sp = enemySprites.get(key);
  if (sp) return sp;
  const s = d.size;
  const box = { x: -s * 2.4, y: -s * 2.5, w: s * 4.8, h: s * 5.1 };
  const c = document.createElement('canvas');
  c.width = Math.ceil(box.w * k + 8);
  c.height = Math.ceil(box.h * k + 8);
  const cc = c.getContext('2d')!;
  cc.setTransform(k, 0, 0, k, -box.x * k, -box.y * k);
  const period = (Math.PI * 2) / Math.max(1, d.speed / 4);
  const t = frame >= 6 ? 0 : (frame / 6) * period;
  drawToon(cc, 'enemy-build', box, (g) => drawEnemyBody(g, d, t, frame < 6), { width: Math.max(1.1, s * 0.09), outline: '#2b1a22' });
  sp = { c, box: { x: box.x, y: box.y, w: c.width / k, h: c.height / k } };
  enemySprites.set(key, sp);
  return sp;
}

function drawEnemyBody(ctx: Ctx, d: EnemyDef, t: number, moving: boolean): void {
  const s = d.size;
  const leg = moving ? Math.sin(t * (d.speed / 4)) : 0;

  switch (d.id) {
    case 'mouse':
    case 'ratking': {
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = s * 0.13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.9);
      ctx.quadraticCurveTo(Math.sin(t * 5) * s * 0.8, -s * 1.6, Math.sin(t * 5 + 1) * s * 0.4, -s * 2.1);
      ctx.stroke();
      for (const dx of [-1, 1]) {
        ellipse(ctx, dx * s * 0.55, -s * 0.3 + leg * dx * 3, s * 0.18, s * 0.12, d.accent);
        ellipse(ctx, dx * s * 0.5, s * 0.45 - leg * dx * 3, s * 0.16, s * 0.11, d.accent);
      }
      ellipse(ctx, 0, 0, s * 0.68, s * 0.95, d.color);
      ellipse(ctx, -s * 0.45, s * 0.45, s * 0.34, s * 0.34, d.color);
      ellipse(ctx, s * 0.45, s * 0.45, s * 0.34, s * 0.34, d.color);
      ellipse(ctx, -s * 0.45, s * 0.45, s * 0.22, s * 0.22, d.accent);
      ellipse(ctx, s * 0.45, s * 0.45, s * 0.22, s * 0.22, d.accent);
      ellipse(ctx, 0, s * 0.8, s * 0.42, s * 0.48, d.color);
      ellipse(ctx, -s * 0.17, s * 0.85, s * 0.08, s * 0.1, '#1e1420');
      ellipse(ctx, s * 0.17, s * 0.85, s * 0.08, s * 0.1, '#1e1420');
      ellipse(ctx, 0, s * 1.22, s * 0.1, s * 0.08, '#ff6f91');
      ctx.strokeStyle = '#5558';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 1.15); ctx.lineTo(-s * 0.6, s * 1.25);
      ctx.moveTo(s * 0.12, s * 1.15); ctx.lineTo(s * 0.6, s * 1.25);
      ctx.stroke();
      if (d.id === 'ratking') {
        ctx.fillStyle = '#ffd84d';
        const cy = s * 0.42;
        ctx.beginPath();
        ctx.moveTo(-s * 0.35, cy); ctx.lineTo(-s * 0.4, cy - s * 0.35); ctx.lineTo(-s * 0.18, cy - s * 0.15);
        ctx.lineTo(0, cy - s * 0.45); ctx.lineTo(s * 0.18, cy - s * 0.15); ctx.lineTo(s * 0.4, cy - s * 0.35);
        ctx.lineTo(s * 0.35, cy); ctx.closePath(); ctx.fill();
        circle(ctx, 0, cy - s * 0.12, s * 0.06, '#e8384f');
        ctx.strokeStyle = '#1e1420';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, s * 0.68); ctx.lineTo(-s * 0.08, s * 0.76);
        ctx.moveTo(s * 0.3, s * 0.68); ctx.lineTo(s * 0.08, s * 0.76);
        ctx.stroke();
      }
      break;
    }
    case 'roach': {
      ctx.strokeStyle = d.accent;
      ctx.lineWidth = 1.6;
      for (let i = -1; i <= 1; i++) {
        for (const dx of [-1, 1]) {
          const ph = leg * (i % 2 ? 1 : -1) * dx * 4;
          ctx.beginPath(); ctx.moveTo(dx * s * 0.4, i * s * 0.4); ctx.lineTo(dx * s * 1.0, i * s * 0.55 + ph); ctx.stroke();
        }
      }
      ellipse(ctx, 0, 0, s * 0.62, s * 1.05, d.color);
      ctx.beginPath(); ctx.moveTo(0, -s * 0.95); ctx.lineTo(0, s * 0.5); ctx.stroke();
      ellipse(ctx, 0, s * 0.85, s * 0.36, s * 0.3, d.accent);
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, s * 1.05); ctx.quadraticCurveTo(-s * 0.9, s * 1.6, -s * (0.8 + Math.sin(t * 9) * 0.2), s * 2.2);
      ctx.moveTo(s * 0.15, s * 1.05); ctx.quadraticCurveTo(s * 0.9, s * 1.6, s * (0.8 + Math.cos(t * 9) * 0.2), s * 2.2);
      ctx.stroke();
      break;
    }
    case 'ant': {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1.4;
      for (let i = -1; i <= 1; i++) {
        for (const dx of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(0, i * s * 0.25); ctx.lineTo(dx * s * 1.0, i * s * 0.5 + leg * dx * 2); ctx.stroke();
        }
      }
      circle(ctx, 0, -s * 0.75, s * 0.58, d.color);
      circle(ctx, 0, 0, s * 0.36, d.color);
      circle(ctx, 0, s * 0.68, s * 0.46, d.color);
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s * 1.0); ctx.lineTo(-s * 0.6, s * 1.6);
      ctx.moveTo(s * 0.2, s * 1.0); ctx.lineTo(s * 0.6, s * 1.6);
      ctx.stroke();
      circle(ctx, 0, -s * 0.85, s * 0.17, d.accent);
      break;
    }
    case 'mosquito': {
      const flap = Math.sin(t * 50) * 0.35;
      ctx.fillStyle = 'rgba(220,240,255,0.65)';
      ctx.beginPath(); ctx.ellipse(-s * 0.8, -s * 0.1, s * 0.85, s * 0.32, -0.3 + flap, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(s * 0.8, -s * 0.1, s * 0.85, s * 0.32, 0.3 - flap, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 1;
      for (const dx of [-1, 1]) for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(0, -s * 0.2 + i * s * 0.2); ctx.lineTo(dx * s * 1.1, -s * 0.6 + i * s * 0.7); ctx.stroke();
      }
      ellipse(ctx, 0, -s * 0.5, s * 0.22, s * 0.75, d.color);
      ctx.strokeStyle = d.accent; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-s * 0.2, -s * 0.9 + i * s * 0.25); ctx.lineTo(s * 0.2, -s * 0.9 + i * s * 0.25); ctx.stroke(); }
      circle(ctx, 0, s * 0.35, s * 0.3, d.color);
      circle(ctx, -s * 0.12, s * 0.42, s * 0.1, '#e05b5b');
      circle(ctx, s * 0.12, s * 0.42, s * 0.1, '#e05b5b');
      ctx.strokeStyle = '#2a2030'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, s * 0.6); ctx.lineTo(0, s * 1.5); ctx.stroke();
      break;
    }
    case 'spider': {
      ctx.strokeStyle = d.color;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 4; i++) {
        for (const dx of [-1, 1]) {
          const a = (-0.6 + i * 0.42) + (moving ? Math.sin(t * 10 + i) * 0.12 : 0);
          const kx = Math.cos(a) * s * 1.0 * dx;
          const ky = Math.sin(a) * s * 1.0;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(kx, ky - s * 0.3);
          ctx.lineTo(kx * 1.6, ky * 1.5 + s * 0.2);
          ctx.stroke();
        }
      }
      circle(ctx, 0, -s * 0.55, s * 0.75, d.color);
      circle(ctx, 0, -s * 0.6, s * 0.3, d.accent);
      circle(ctx, 0, s * 0.35, s * 0.48, d.color);
      for (const [ex, ey] of [[-0.18, 0.55], [0.18, 0.55], [-0.3, 0.42], [0.3, 0.42]] as const) circle(ctx, s * ex, s * ey, s * 0.08, '#ff5f6d');
      break;
    }
  }
}


function drawEnemy(ctx: Ctx, e: Enemy): void {
  const d = e.def;
  const s = d.size;
  const t = e.animT;
  const moving = !e.attacking && e.stunT <= 0;
  ctx.save();
  ctx.translate(e.x, e.y);
  ellipse(ctx, d.flying ? 6 : 0, d.flying ? s * 1.4 : s * 0.4, s * 0.9, s * 0.45, 'rgba(40,20,10,0.22)');
  if (e.dead) {
    const k = e.deathT / 0.45;
    ctx.globalAlpha = Math.max(0, 1 - k);
    ctx.scale(1 + k * 0.4, 1 - k * 0.5);
  }
  if (e.attacking && !e.dead) ctx.translate(0, Math.sin(t * 18) * 2);
  const frame = moving ? Math.floor(((t * (d.speed / 4)) / (Math.PI * 2)) * 6) % 6 : 6;
  const spr = enemySprite(ctx, d, frame);
  ctx.drawImage(spr.c, spr.box.x, spr.box.y, spr.box.w, spr.box.h);
  ctx.restore();

  if (!e.dead) {
    if (e.stunT > 0) for (let i = 0; i < 3; i++) {
      const a = e.animT * 5 + (i * Math.PI * 2) / 3;
      text(ctx, '★', e.x + Math.cos(a) * s * 0.9, e.y - s * 1.2 + Math.sin(a) * 4, 10, '#ffe14d', 'center', false);
    }
    if (e.slowT > 0) {
      heart(ctx, e.x + Math.sin(e.animT * 4) * s * 0.6, e.y - s * 1.5, 9);
    }
    if (e.hitFlash > 0) {
      ctx.save(); ctx.globalAlpha = 0.6; circle(ctx, e.x, e.y + s * 0.1, s * 1.05, '#ff3b4e'); ctx.globalAlpha = 0.5; circle(ctx, e.x, e.y, s * 0.6, '#ffd0d5'); ctx.restore();
    }
    if (e.hp < e.maxHp && !e.def.boss) {
      const w = Math.max(20, s * 1.8);
      ctx.fillStyle = 'rgba(30,15,30,0.6)';
      ctx.fillRect(e.x - w / 2, e.y - s * 1.35 - 5, w, 4);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(e.x - w / 2, e.y - s * 1.35 - 5, (w * e.hp) / e.maxHp, 4);
    }
  }
}

// ───────────────────────── 고양이 부대 ─────────────────────────

function drawSquad(ctx: Ctx, game: Game, t: number): void {
  const order = [...game.squad].sort((a, b) => a.y - b.y);
  for (const m of order) {
    const sleeping = m.level === 0;
    const s = m.slot === 0 ? 40 : 33;
    ellipse(ctx, m.x, m.y + 2, s * 1.0, s * 0.3, 'rgba(60,30,10,0.2)');
    if (m.wakeFx > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, m.wakeFx);
      const g = ctx.createRadialGradient(m.x, m.y - s, 4, m.x, m.y - s, s * 2.4);
      g.addColorStop(0, 'rgba(255,240,150,0.9)'); g.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(m.x - s * 2.5, m.y - s * 3.5, s * 5, s * 5);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(m.x, m.y);
    if (sleeping) ctx.globalAlpha = 0.7;
    const art = getArt(m.def.id, 'back');
    if (art) {
      const h = s * 3.4;
      const w = (art.naturalWidth / art.naturalHeight) * h;
      ctx.drawImage(art, -w / 2, -h + s * 0.15 - m.swing * 4, w, h);
    } else {
      drawCatBackToon(ctx, `sq${m.slot}`, m.def.look, s, t + m.slot, { sleep: sleeping, swing: m.swing });
    }
    ctx.restore();
    if (!sleeping && m.swing > 0.6) {
      const fy = m.y - s * 2.6;
      ctx.save();
      ctx.globalAlpha = (m.swing - 0.6) * 2.5;
      const g = ctx.createRadialGradient(m.x + s * 0.3, fy, 2, m.x + s * 0.3, fy, s * 0.9);
      g.addColorStop(0, '#fffbe0'); g.addColorStop(0.4, m.weapon.color); g.addColorStop(1, 'rgba(255,200,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(m.x + s * 0.3, fy, s * 0.9, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    if (!sleeping && m.weapon.fx === 'notes') {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.5 + i / 3) % 1;
        ctx.save();
        ctx.globalAlpha = 1 - k;
        text(ctx, i % 2 ? '♪' : '♫', m.x - 20 + i * 20 + Math.sin(t * 3 + i) * 6, m.y - s * 2.6 - k * 50, 16, ['#ff8fb4', '#ffd84d', '#9fd8ff'][i], 'center');
        ctx.restore();
      }
    }
    if (sleeping) {
      const k = (t * 0.6 + m.slot * 0.3) % 1;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      text(ctx, 'z', m.x + 14 + k * 10, m.y - s * 2.2 - k * 22, 12 + k * 6, '#ffffff');
      ctx.restore();
    } else if (m.slot !== 0) {
      text(ctx, `Lv.${m.level}`, m.x, m.y + 12, 12, '#fff7d0');
    }
  }
  if (game.rallyT > 0) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 10);
    ctx.fillStyle = '#ffcf5a';
    ctx.fillRect(0, CONFIG.barricadeY + 40, W, CONFIG.height - CONFIG.barricadeY);
    ctx.restore();
  }
}

// ───────────────────────── 투사체 / 효과 ─────────────────────────

function drawShots(ctx: Ctx, game: Game): void {
  for (const s of game.shots) {
    if (s.kind === 'roll') {
      // 캣휠
      const R = s.radius;
      ctx.save();
      ctx.translate(s.x, s.y);
      ellipse(ctx, 0, R * 0.95, R * 0.9, R * 0.22, 'rgba(60,30,10,0.25)');
      ctx.lineWidth = R * 0.2;
      ctx.strokeStyle = '#3b2228';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = R * 0.14;
      ctx.strokeStyle = '#d9a46a';
      ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.35;
      circle(ctx, 0, 0, R * 0.9, '#fff3e0');
      ctx.globalAlpha = 1;
      ctx.rotate(-s.spin * 0.6);
      ctx.strokeStyle = '#a8743f';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i++) { const a2 = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a2) * R * 0.9, Math.sin(a2) * R * 0.9); ctx.stroke(); }
      ctx.strokeStyle = '#f4a24c';
      ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) { const a2 = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.arc(0, 0, R, a2, a2 + 0.15); ctx.stroke(); }
      circle(ctx, 0, 0, R * 0.22, '#3b2228');
      circle(ctx, 0, 0, R * 0.17, '#ffcf5a');
      ctx.restore();
      continue;
    }
    if (s.kind === 'web') {
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(s.x, s.y - 30); ctx.lineTo(s.x, s.y); ctx.stroke();
      circle(ctx, s.x, s.y, s.radius, '#ffffff');
      continue;
    }
    const a = Math.atan2(s.vy, s.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(a);
    ctx.globalAlpha = 0.3;
    ellipse(ctx, -s.radius * 1.8, 0, s.radius * 2.2, s.radius * 0.6, s.color);
    ctx.globalAlpha = 1;
    if (s.style === 'paw') {
      // 젤리 발바닥
      ctx.rotate(Math.PI / 2);
      const r = s.radius * 1.5;
      ellipse(ctx, 0, r * 0.25, r * 0.62, r * 0.5, '#3b2228');
      ellipse(ctx, 0, r * 0.25, r * 0.52, r * 0.4, '#ffd9c2');
      ellipse(ctx, 0, r * 0.3, r * 0.3, r * 0.22, '#ff8fab');
      for (const [dx, dy] of [[-0.48, -0.3], [-0.17, -0.6], [0.17, -0.6], [0.48, -0.3]] as const) {
        ellipse(ctx, dx * r, dy * r, r * 0.2, r * 0.24, '#3b2228');
        ellipse(ctx, dx * r, dy * r, r * 0.15, r * 0.18, '#ff8fab');
      }
    } else if (s.style === 'yarn') {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-s.radius, 0); ctx.quadraticCurveTo(-s.radius * 3, s.radius * Math.sin(s.spin), -s.radius * 5, 0); ctx.stroke();
      circle(ctx, 0, 0, s.radius + 1.5, '#3b2228');
      circle(ctx, 0, 0, s.radius, s.color);
      ctx.strokeStyle = '#ffffffaa';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, s.radius * 0.75, s.spin + i * 2.1, s.spin + i * 2.1 + 1.4); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-s.radius * 0.7, -s.radius * 0.5); ctx.lineTo(s.radius * 0.7, s.radius * 0.5); ctx.stroke();
    } else {
      // 할퀴기 (///)
      ctx.globalAlpha = 0.45;
      circle(ctx, 0, 0, s.radius * 1.5, s.color);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      for (const dy of [-1, 0, 1]) {
        ctx.beginPath(); ctx.moveTo(-s.radius * 0.9, dy * s.radius * 0.75 - s.radius * 0.5); ctx.lineTo(s.radius * 0.9, dy * s.radius * 0.75 + s.radius * 0.5); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function pawPrint(ctx: Ctx, x: number, y: number, r: number, color: string): void {
  ellipse(ctx, x, y + r * 0.2, r * 0.55, r * 0.45, color);
  for (const [dx, dy] of [[-0.55, -0.35], [-0.2, -0.65], [0.2, -0.65], [0.55, -0.35]] as const) ellipse(ctx, x + dx * r, y + dy * r, r * 0.2, r * 0.24, color);
}

function drawFields(ctx: Ctx, game: Game, t: number): void {
  for (const f of game.fields) {
    const a = Math.min(1, f.t * 4, (f.life - f.t) * 2);
    ctx.save();
    ctx.globalAlpha = a * 0.22;
    circle(ctx, f.x, f.y, f.r, '#ff9fd0');
    ctx.globalAlpha = a * 0.7;
    ctx.strokeStyle = '#ffd0ec';
    ctx.setLineDash([6, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, t, t + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    // 낚싯줄 + 깃털
    const bob = Math.sin(t * 6) * 8;
    const fx = f.x + Math.sin(t * 2.3) * 10;
    const fy = f.y + bob;
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#4a3a40';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(f.sx, f.sy); ctx.quadraticCurveTo((f.sx + fx) / 2 + 30, Math.min(f.sy, fy) - 80, fx, fy - 18); ctx.stroke();
    ctx.translate(fx, fy);
    ctx.rotate(Math.sin(t * 8) * 0.4);
    for (const [col, ang] of [['#ff6fae', -0.5], ['#ffd84d', 0], ['#6fd0ff', 0.5]] as const) {
      ctx.save();
      ctx.rotate(ang);
      ellipse(ctx, 0, 0, 5, 16, '#3b2228');
      ellipse(ctx, 0, 0, 4, 14.5, col);
      ctx.restore();
    }
    circle(ctx, 0, -14, 5, '#3b2228');
    circle(ctx, 0, -14, 4, '#fff');
    ctx.restore();
  }
  for (const s of game.slams) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#ff5a5a';
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * (0.6 + s.delay * 0.8), 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

function drawFx(ctx: Ctx, game: Game): void {
  for (const f of game.fx) {
    const k = f.t / f.life;
    ctx.save();
    ctx.globalAlpha = 1 - k;
    switch (f.kind) {
      case 'beam': {
        // 레이저 포인터
        ctx.globalAlpha = (1 - k) * 0.35;
        ctx.fillStyle = '#ff2d55';
        ctx.fillRect(f.x - f.r / 2, 0, f.r, f.y);
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ff6b81';
        ctx.fillRect(f.x - 4, 0, 8, f.y);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(f.x - 1.5, 0, 3, f.y);
        const dy = f.y * (1 - k);
        const g = ctx.createRadialGradient(f.x, dy, 1, f.x, dy, 18);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#ff2d55'); g.addColorStop(1, 'rgba(255,45,85,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, dy, 18, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'slam':
        pawPrint(ctx, f.x, f.y, f.r * 0.9, 'rgba(120,80,45,0.75)');
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.8 + k * 0.6), 0, Math.PI * 2); ctx.stroke();
        break;
      case 'quake':
        ctx.strokeStyle = '#ffe9b0';
        ctx.lineWidth = 10 * (1 - k) + 2;
        ctx.beginPath(); ctx.ellipse(f.x, f.y, W * 0.7 * (0.4 + k * 0.6), f.r * (0.4 + k * 0.6), 0, Math.PI, 0); ctx.stroke();
        break;
      case 'snipe': {
        // 방울공
        const kk = Math.min(1, (f.t / f.life) * 3);
        ctx.globalAlpha = 0.5 * (1 - k);
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2!, f.y2!); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        const bx = f.x + (f.x2! - f.x) * kk;
        const by = f.y + (f.y2! - f.y) * kk - Math.sin(kk * Math.PI) * 40;
        circle(ctx, bx, by, 9, '#3b2228');
        circle(ctx, bx, by, 7.5, '#ffd84d');
        ctx.fillStyle = '#3b2228';
        ctx.fillRect(bx - 4, by + 1, 8, 1.5);
        circle(ctx, bx, by + 4, 1.6, '#3b2228');
        circle(ctx, bx - 2.5, by - 3, 2, '#fff8');
        if (kk >= 1) { ctx.globalAlpha = 1 - k; circle(ctx, f.x2!, f.y2!, 10 + k * 18, 'rgba(255,240,150,0.5)'); }
        break;
      }
      case 'dash': {
        // 우다다 할퀴기: 줄을 따라 큰 발톱 자국
        ctx.globalAlpha = (1 - k) * 0.25;
        ctx.fillStyle = '#3a2e2a';
        ctx.fillRect(f.x - f.r / 2, f.y2!, f.r, f.y - f.y2!);
        ctx.globalAlpha = 1 - k;
        ctx.lineCap = 'round';
        const reach = (f.y - f.y2!) * Math.min(1, k * 2.5);
        for (const dx of [-0.32, 0, 0.32]) {
          ctx.strokeStyle = '#3b2228';
          ctx.lineWidth = 9;
          ctx.beginPath(); ctx.moveTo(f.x + dx * f.r - 8, f.y); ctx.quadraticCurveTo(f.x + dx * f.r + 12, f.y - reach / 2, f.x + dx * f.r - 4, f.y - reach); ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(f.x + dx * f.r - 8, f.y); ctx.quadraticCurveTo(f.x + dx * f.r + 12, f.y - reach / 2, f.x + dx * f.r - 4, f.y - reach); ctx.stroke();
        }
        break;
      }
      case 'heal':
        for (let i = 0; i < 10; i++) text(ctx, '+', (i + 0.5) * (W / 10), f.y - k * 30 - (i % 2) * 8, 18, f.color, 'center', false);
        break;
      case 'thorns':
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.4; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * f.r * 1.5, f.y + Math.sin(a) * f.r * 1.5); ctx.stroke(); }
        break;
    }
    ctx.restore();
  }
}

// ───────────────────────── HUD ─────────────────────────

function drawButtonBase(ctx: Ctx, r: Rect, enabled: boolean, base: string, radius = 14): void {
  roundRect(ctx, r.x, r.y + 4, r.w, r.h, radius);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fill();
  roundRect(ctx, r.x, r.y, r.w, r.h, radius);
  ctx.fillStyle = enabled ? base : '#8a8090';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = enabled ? '#fff8' : '#fff3';
  ctx.stroke();
}

function fmtTime(sec: number): string {
  const s = Math.ceil(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function drawHud(ctx: Ctx, game: Game, t: number, pressed: string | null): void {
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, 'rgba(30,15,30,0.85)'); g.addColorStop(1, 'rgba(30,15,30,0.4)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 64);
  roundRect(ctx, 60, 14, 78, 32, 16); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
  text(ctx, game.time >= game.stage.duration ? 'BOSS' : fmtTime(game.timeLeft), 99, 30, 17, game.timeLeft < 15 ? '#ff8a8a' : '#fff');
  text(ctx, `St.${game.stage.no} · ${game.stage.name}`, 306, 30, 17, '#fff');
  // 진행 바
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(10, 56, W - 20, 6);
  ctx.fillStyle = '#ffcf5a';
  ctx.fillRect(10, 56, (W - 20) * game.progress, 6);

  for (const b of HUD_BUTTONS) {
    const r = b.rect;
    ctx.save();
    if (pressed === buttonKey(b.id)) ctx.translate(0, 3);
    if (b.id.type === 'pause') {
      drawButtonBase(ctx, r, true, '#9b7bd6');
      text(ctx, 'Ⅱ', r.x + r.w / 2, r.y + r.h / 2, 18, '#fff');
    } else if (b.id.type === 'speed') {
      drawButtonBase(ctx, r, true, game.speed > 1 ? '#ff9f43' : '#9b7bd6');
      text(ctx, `x${game.speed}`, r.x + r.w / 2, r.y + r.h / 2, 15, '#fff');
    } else if (b.id.type === 'rally') {
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      const ready = game.canRally();
      circle(ctx, cx, cy + 3, r.w / 2, 'rgba(0,0,0,0.3)');
      circle(ctx, cx, cy, r.w / 2, ready ? '#ffcf5a' : '#8a8090');
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r.w / 2 - 3, 0, Math.PI * 2); ctx.clip();
      iconFace(ctx, game.hero.def.id, cx, cy, r.w / 2 - 3, () => drawFaceAt(ctx, game.hero.def.look, cx, cy + 4, 20, t));
      if (game.rallyCd > 0) {
        ctx.fillStyle = 'rgba(30,15,30,0.6)';
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r.w / 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (game.rallyCd / game.heroRally.cd));
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.lineWidth = 3;
      ctx.strokeStyle = ready ? `rgba(255,255,220,${0.6 + 0.4 * Math.sin(t * 6)})` : '#fff4';
      ctx.beginPath(); ctx.arc(cx, cy, r.w / 2, 0, Math.PI * 2); ctx.stroke();
      text(ctx, game.rallyCd > 0 ? `${Math.ceil(game.rallyCd)}` : '응원!', cx, r.y + r.h + 4, 13, '#fff');
    }
    ctx.restore();
  }

  // 레벨 / 경험치
  roundRect(ctx, 10, 72, 170, 46, 10);
  ctx.fillStyle = 'rgba(140,40,60,0.85)';
  ctx.fill();
  ctx.save();
  roundRect(ctx, 12, 74, 44, 42, 8); ctx.clip();
  ctx.fillStyle = '#ffe1c2'; ctx.fillRect(12, 74, 44, 42);
  iconFace(ctx, game.hero.def.id, 34, 95, 22, () => drawFaceAt(ctx, game.hero.def.look, 34, 100, 15, t));
  ctx.restore();
  text(ctx, `Lv.${game.level}`, 62, 88, 15, '#fff', 'left');
  text(ctx, `${game.xp}/${game.xpNeed}`, 172, 88, 12, '#ffe0e8', 'right');
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(62, 102, 110, 8);
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(62, 102, (110 * game.xp) / game.xpNeed, 8);

  // 왼쪽: 깨어난 고양이 스킬 목록
  const active = game.squad.filter((m) => m.level > 0);
  active.forEach((m, i) => drawSkillChip(ctx, m, 12, 130 + i * 58, t));
  const gens = (Object.keys(game.generic) as (keyof typeof game.generic)[]).filter((k) => k !== 'snack' && game.generic[k] > 0);
  gens.forEach((k, i) => {
    const y = 130 + (active.length + i) * 58;
    circle(ctx, 36, y + 22, 22, 'rgba(30,15,30,0.7)');
    text(ctx, GENERIC[k].icon, 36, y + 22, 20, '#fff', 'center', false);
    text(ctx, `${game.generic[k]}`, 52, y + 38, 12, '#ffe98a');
  });

  // 보스 체력
  const boss = game.enemies.find((e) => e.def.boss && !e.dead);
  if (boss) {
    roundRect(ctx, 120, 126, 300, 18, 9); ctx.fillStyle = 'rgba(30,15,30,0.75)'; ctx.fill();
    roundRect(ctx, 122, 128, 296 * (boss.hp / boss.maxHp), 14, 7); ctx.fillStyle = '#ff5a6e'; ctx.fill();
    text(ctx, `👑 ${boss.def.name}`, W / 2, 135, 12, '#fff');
  }

  // 하단 바리케이드 체력
  const ratio = Math.max(0, game.hp / game.maxHp);
  roundRect(ctx, 62, CONFIG.height - 38, 420, 24, 12); ctx.fillStyle = 'rgba(40,20,40,0.7)'; ctx.fill();
  if (ratio > 0) {
    roundRect(ctx, 64, CONFIG.height - 36, 416 * ratio, 20, 10);
    ctx.fillStyle = ratio > 0.5 ? '#6fd67a' : ratio > 0.25 ? '#ffc94d' : '#ff6b6b';
    ctx.fill();
  }
  text(ctx, `🛡 ${Math.ceil(game.hp)} / ${game.maxHp}`, W / 2, CONFIG.height - 26, 13, '#fff');
  ctx.save();
  ctx.beginPath(); ctx.arc(34, CONFIG.height - 28, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#bfe6ff'; ctx.fill();
  ctx.clip();
  ctx.translate(34, CONFIG.height - 24);
  ctx.scale(0.7, 0.7);
  drawGirl(ctx, 0, 0, ratio, t);
  ctx.restore();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(34, CONFIG.height - 28, 24, 0, Math.PI * 2); ctx.stroke();

  if (game.banner && game.banner.t > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.banner.t * 2);
    const bw = Math.min(W - 30, 60 + game.banner.text.length * 18);
    roundRect(ctx, W / 2 - bw / 2, 180, bw, 48, 24);
    ctx.fillStyle = 'rgba(255,95,158,0.92)';
    ctx.fill();
    text(ctx, game.banner.text, W / 2, 204, 19, '#fff');
    ctx.restore();
  }
}

function drawSkillChip(ctx: Ctx, m: Member, x: number, y: number, t: number): void {
  const col = RARITY_COLOR[m.def.rarity];
  circle(ctx, x + 24, y + 22, 24, col);
  ctx.save();
  ctx.beginPath(); ctx.arc(x + 24, y + 22, 21, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#3d2a40'; ctx.fillRect(x, y, 48, 48);
  iconFace(ctx, m.def.id, x + 24, y + 22, 21, () => drawFaceAt(ctx, m.def.look, x + 24, y + 28, 14, t));
  ctx.restore();
  circle(ctx, x + 42, y + 38, 10, '#2a1a22');
  text(ctx, `${m.level}`, x + 42, y + 38, 12, '#ffe98a', 'center', false);
}

// ───────────────────────── 스킬 선택 / 오버레이 ─────────────────────────

function cardInfo(game: Game, c: Card) {
  if (c.type === 'cat') {
    const m = game.squad[c.slot];
    return { title: m.def.skillName, sub: m.def.name, desc: m.weapon.desc[c.next - 1], badge: c.next === 1 ? 'NEW' : `Lv.${c.next}`, color: RARITY_COLOR[m.def.rarity], look: m.def.look as CatLook | null, icon: m.weapon.icon };
  }
  const g = GENERIC[c.id];
  return { title: g.name, sub: c.id === 'snack' ? '회복' : `${game.generic[c.id] + 1}단계`, desc: g.desc, badge: '강화', color: '#7ad99a', look: null as CatLook | null, icon: g.icon };
}

function drawChoice(ctx: Ctx, game: Game, t: number, pressed: string | null): void {
  const off = (CONFIG.height - 960) / 2;
  ctx.fillStyle = 'rgba(25,12,25,0.78)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, 'rgba(160,100,20,0)'); band.addColorStop(0.5, 'rgba(200,140,40,0.95)'); band.addColorStop(1, 'rgba(160,100,20,0)');
  ctx.fillStyle = band;
  ctx.fillRect(0, 128 + off, W, 46);
  ctx.fillStyle = '#ffdc7a';
  ctx.fillRect(0, 128 + off, W, 2); ctx.fillRect(0, 172 + off, W, 2);
  text(ctx, '스킬 선택', W / 2, 151 + off, 26, '#fff');
  if (game.pendingLevels > 1) text(ctx, `남은 선택 ${game.pendingLevels}`, W / 2, 112 + off, 14, '#ffe98a');

  const pa = game.pickAnim;
  const cards = pa ? [] : game.choice ?? [];
  cards.forEach((c, i) => {
    const r = CHOICE_BUTTONS[i].rect;
    ctx.save();
    if (pressed === `card:${i}`) ctx.translate(0, 4);
    drawCard(ctx, game, c, r, t, 1);
    ctx.restore();
  });

  if (pa) {
    // 고른 카드가 가운데로 커지는 연출
    const k = 1 - pa.t / 0.7;
    const from = CHOICE_BUTTONS[pa.index].rect;
    const ease = 1 - Math.pow(1 - Math.min(1, k * 2.2), 3);
    const sc = 1 + 0.35 * ease;
    const cx = from.x + from.w / 2 + (W / 2 - from.x - from.w / 2) * ease;
    const cy = from.y + from.h / 2;
    ctx.save();
    ctx.globalAlpha = k > 0.8 ? (1 - k) * 5 : 1;
    ctx.translate(cx, cy);
    ctx.scale(sc, sc);
    const glow = ctx.createRadialGradient(0, 0, 20, 0, 0, 260);
    glow.addColorStop(0, 'rgba(255,230,150,0.55)'); glow.addColorStop(1, 'rgba(255,230,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-260, -260, 520, 520);
    drawCard(ctx, game, pa.card, { x: -from.w / 2, y: -from.h / 2, w: from.w, h: from.h }, t, 1);
    ctx.restore();
    return;
  }

  const rb = CHOICE_BUTTONS[3].rect;
  text(ctx, `이번 전투 갱신 횟수: ${game.rerolls}/${CONFIG.rerolls}`, W / 2, rb.y - 16, 13, '#d9c9d6');
  ctx.save();
  if (pressed === 'reroll') ctx.translate(0, 3);
  drawButtonBase(ctx, rb, game.rerolls > 0, '#3d8fe0', 31);
  ctx.strokeStyle = '#ffffff55';
  ctx.lineWidth = 6;
  for (const dx of [26, 44]) { ctx.beginPath(); ctx.moveTo(rb.x + dx, rb.y + rb.h - 6); ctx.lineTo(rb.x + dx + 18, rb.y + 6); ctx.stroke(); }
  for (const dx of [rb.w - 62, rb.w - 44]) { ctx.beginPath(); ctx.moveTo(rb.x + dx, rb.y + rb.h - 6); ctx.lineTo(rb.x + dx + 18, rb.y + 6); ctx.stroke(); }
  text(ctx, '🔄 스킬 갱신', rb.x + rb.w / 2, rb.y + rb.h / 2, 21, '#fff');
  ctx.restore();
}

function drawCard(ctx: Ctx, game: Game, c: Card, r: Rect, t: number, _glow: number): void {
  const info = cardInfo(game, c);
  // 카드 위로 튀어나오는 캐릭터
  if (info.look) {
    ctx.save();
    const g = ctx.createRadialGradient(r.x + r.w / 2, r.y - 10, 10, r.x + r.w / 2, r.y - 10, 110);
    g.addColorStop(0, info.color + 'aa'); g.addColorStop(1, info.color + '00');
    ctx.fillStyle = g;
    ctx.fillRect(r.x - 30, r.y - 130, r.w + 60, 200);
    const art = c.type === 'cat' ? getArt(game.squad[c.slot].def.id, 'card') : null;
    if (art) {
      const h = 150;
      const w = (art.naturalWidth / art.naturalHeight) * h;
      ctx.drawImage(art, r.x + r.w / 2 - w / 2, r.y + 40 - h, w, h);
    } else {
      ctx.translate(r.x + r.w / 2 - 14, r.y + 40);
      ctx.scale(2.9, 2.9);
      drawCatLookToon(ctx, 'card', info.look, 20, { ...IDLE_POSE, t, attacking: true, swing: 0 }, 1.1);
    }
    ctx.restore();
  } else {
    text(ctx, info.icon, r.x + r.w / 2, r.y - 30, 72, '#fff', 'center', false);
  }
  // 카드 본체 (왼쪽 위가 잘린 종이 카드)
  const cut = 54;
  const shape = () => {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y + cut);
    ctx.lineTo(r.x + cut, r.y);
    ctx.lineTo(r.x + r.w, r.y);
    ctx.lineTo(r.x + r.w, r.y + r.h);
    ctx.lineTo(r.x, r.y + r.h);
    ctx.closePath();
  };
  ctx.save();
  ctx.translate(0, 6); shape(); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
  ctx.restore();
  shape();
  ctx.fillStyle = '#fbf6ef';
  ctx.fill();
  ctx.save();
  shape(); ctx.clip();
  const top = ctx.createLinearGradient(0, r.y, 0, r.y + 96);
  top.addColorStop(0, info.color); top.addColorStop(1, '#fbf6ef');
  ctx.fillStyle = top;
  ctx.fillRect(r.x, r.y, r.w, 96);
  ctx.restore();
  // 스킬 아이콘
  const ix = r.x + r.w - 42;
  const iy = r.y + 48;
  circle(ctx, ix, iy, 34, '#2a1a22');
  const ig = ctx.createRadialGradient(ix - 8, iy - 10, 4, ix, iy, 32);
  ig.addColorStop(0, '#ffffff'); ig.addColorStop(1, info.color);
  circle(ctx, ix, iy, 30, '#000');
  ctx.fillStyle = ig;
  ctx.beginPath(); ctx.arc(ix, iy, 30, 0, Math.PI * 2); ctx.fill();
  text(ctx, info.icon, ix, iy + 1, 30, '#fff', 'center', false);
  if (c.type === 'cat' && c.next > 1) {
    circle(ctx, ix + 24, iy + 24, 12, '#1d3b22');
    text(ctx, `${c.next}`, ix + 24, iy + 24, 14, '#ffffff', 'center', false);
  }
  // 배지
  if (info.badge === 'NEW' || info.badge === '강화') {
    const bx = r.x - 6;
    const by = r.y + 84;
    ctx.fillStyle = info.badge === 'NEW' ? '#ffcf3a' : '#7ad99a';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 70, by); ctx.lineTo(bx + 84, by + 13); ctx.lineTo(bx + 70, by + 26); ctx.lineTo(bx, by + 26); ctx.closePath(); ctx.fill();
    text(ctx, info.badge, bx + 36, by + 13, 16, info.badge === 'NEW' ? '#7a3a00' : '#1d3b22', 'center', false);
  }
  // 이름 띠
  ctx.fillStyle = '#5a2c1c';
  ctx.fillRect(r.x, r.y + 112, r.w, 50);
  ctx.fillStyle = '#7a4430';
  ctx.fillRect(r.x, r.y + 112, r.w, 3);
  text(ctx, info.title, r.x + r.w / 2, r.y + 131, 17, '#fff', 'center', false);
  text(ctx, info.sub, r.x + r.w / 2, r.y + 151, 11, '#ffd9a8', 'center', false);
  const lines = wrap(ctx, info.desc, r.w - 18, 14);
  lines.slice(0, 5).forEach((ln, i) => text(ctx, ln, r.x + r.w / 2, r.y + 186 + i * 21, 14, '#4a3a40', 'center', false));
}

function drawPause(ctx: Ctx, pressed: string | null): void {
  ctx.fillStyle = 'rgba(25,12,25,0.7)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  text(ctx, '일시정지', W / 2, 340 + (CONFIG.height - 960) / 2, 44, '#fff');
  for (const b of PAUSE_BUTTONS) {
    const r = b.rect;
    ctx.save();
    if (pressed === buttonKey(b.id)) ctx.translate(0, 3);
    drawButtonBase(ctx, r, true, b.id.type === 'quit' ? '#c06080' : '#8fcf7a');
    text(ctx, b.id.type === 'quit' ? '포기하고 나가기' : '계속하기', r.x + r.w / 2, r.y + r.h / 2, 20, '#fff');
    ctx.restore();
  }
}

function drawResult(ctx: Ctx, game: Game, t: number, reward: RewardView | null): void {
  ctx.fillStyle = 'rgba(25,12,25,0.72)';
  ctx.fillRect(0, 0, W, CONFIG.height);
  ctx.save();
  ctx.translate(0, (CONFIG.height - 960) / 2);
  const res = game.result!;
  if (res.victory) {
    text(ctx, '승리! 🎉', W / 2, 270, 56, '#ffe98a');
    for (let i = 0; i < 3; i++) {
      const on = i < res.stars;
      text(ctx, '★', W / 2 - 80 + i * 80, 350, on ? 60 : 48, on ? '#ffd84d' : '#6b5a66');
    }
  } else {
    text(ctx, '패배...', W / 2, 280, 56, '#ff8a8a');
    text(ctx, '고양이를 키우거나 편성을 바꿔서 다시 도전!', W / 2, 345, 17, '#fff');
  }
  text(ctx, `처치 ${res.kills} · 레벨 ${game.level} · ${Math.round(res.progress * 100)}% 진행`, W / 2, 410, 16, '#ffd6e4');
  if (reward) {
    roundRect(ctx, 50, 440, W - 100, 100, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    text(ctx, reward.firstClear ? '첫 클리어 보상' : '보상', W / 2, 464, 15, '#ffe98a');
    const parts = [`🪙 ${reward.coins}`];
    if (reward.tuna > 0) parts.push(`🥫 ${reward.tuna}`);
    if (reward.heroShards > 0) parts.push(`치즈 조각 +${reward.heroShards}`);
    text(ctx, parts.join('   '), W / 2, 505, 22, '#fff');
  }
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
  text(ctx, '터치해서 로비로', W / 2, 600, 24, '#fff');
  ctx.restore();
  ctx.restore();
}

export function render(ctx: Ctx, game: Game, t: number, pressed: string | null, reward: RewardView | null): void {
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * game.shake * 2, (Math.random() - 0.5) * 8 * game.shake * 2);
  drawField(ctx, game.stage.area, t);
  drawDecals(ctx, game.decals);
  drawFields(ctx, game, t);
  const sorted = [...game.enemies].sort((a, b) => (a.def.flying ? 1 : 0) - (b.def.flying ? 1 : 0) || a.y - b.y);
  for (const e of sorted) drawEnemy(ctx, e);
  drawBarricade(ctx, game, t);
  drawSquad(ctx, game, t);
  drawShots(ctx, game);
  drawFx(ctx, game);
  for (const p of game.particles) {
    ctx.globalAlpha = 1 - p.t / p.life;
    circle(ctx, p.x, p.y, p.r, p.color);
  }
  ctx.globalAlpha = 1;
  for (const f of game.floats) {
    ctx.globalAlpha = Math.min(1, f.t * 2.5);
    text(ctx, f.text, f.x, f.y, f.size, f.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  drawHud(ctx, game, t, pressed);
  if (game.phase !== 'playing') drawResult(ctx, game, t, reward);
  else if (game.choice || game.pickAnim) drawChoice(ctx, game, t, pressed);
  else if (game.paused) drawPause(ctx, pressed);
}
